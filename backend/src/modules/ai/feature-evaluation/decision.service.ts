import {
  DecisionStatus,
  EvaluationRepository,
  IEvaluationRecord,
  IStudentDecision,
} from './evaluation.model.js'

export interface RecordDecisionDTO {
  featureId: string
  decision: DecisionStatus
  modifiedScope?: string
  notes?: string
}

export class DecisionService {
  /**
   * Records or updates a student decision on an evaluated feature
   */
  async recordDecision(
    evaluationId: string,
    ownerId: string,
    dto: RecordDecisionDTO
  ): Promise<IEvaluationRecord> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')

    const targetFeature = evaluation.features.find((f) => f.featureId === dto.featureId)
    if (!targetFeature) throw new Error(`Feature "${dto.featureId}" not found in this evaluation`)

    // Formulate trade-off explanation
    let tradeoffNotes = dto.notes || ''
    if (dto.decision === 'REJECTED') {
      tradeoffNotes = this.formulateRejectionTradeoff(targetFeature.name, targetFeature.classification)
    } else if (dto.decision === 'MODIFIED') {
      tradeoffNotes = `Modified scope: "${dto.modifiedScope || 'Scope adjusted by student'}". Implementation complexity reduced.`
    } else {
      tradeoffNotes = 'Feature accepted into final implementation scope.'
    }

    const decisionEntry: IStudentDecision = {
      featureId: dto.featureId,
      decision: dto.decision,
      modifiedScope: dto.modifiedScope,
      tradeoffNotes,
      updatedAt: new Date(),
    }

    const existingIndex = evaluation.decisions.findIndex((d) => d.featureId === dto.featureId)
    const updatedDecisions = [...evaluation.decisions]
    if (existingIndex >= 0) {
      updatedDecisions[existingIndex] = decisionEntry
    } else {
      updatedDecisions.push(decisionEntry)
    }

    const updated = await EvaluationRepository.update(evaluationId, {
      decisions: updatedDecisions,
    })

    if (!updated) throw new Error('Failed to update decision in repository')
    return updated
  }

  /**
   * Preserves previous decisions across evaluation regenerations
   */
  mergeDecisions(
    previousDecisions: IStudentDecision[],
    newDecisions: IStudentDecision[]
  ): IStudentDecision[] {
    const map = new Map<string, IStudentDecision>()
    for (const d of previousDecisions) {
      map.set(d.featureId, d)
    }
    for (const d of newDecisions) {
      map.set(d.featureId, d)
    }
    return Array.from(map.values())
  }

  /**
   * Generates educational explanation of trade-offs when a feature is rejected
   */
  private formulateRejectionTradeoff(name: string, classification: string): string {
    const n = name.toLowerCase()

    if (n.includes('similarity')) {
      return 'Trade-off: Excluding AI Similarity Analysis saves approximately 3 weeks of development effort, but shifts duplicate identification onto manual faculty keyword searches during proposal review.'
    }
    if (n.includes('voice')) {
      return 'Trade-off: Excluding Real-Time Voice WebRTC saves 6 weeks of high-risk socket engineering, eliminates microphone viva failure risk, and allows your team to focus 100% on core academic deliverables.'
    }
    if (n.includes('docx') || n.includes('template')) {
      return 'Trade-off: Excluding programmatic DOCX generation saves 3 weeks of XML styling logic. Students will export standard markdown or copy-paste into college Word templates manually.'
    }
    if (n.includes('proposal generation')) {
      return 'Trade-off: Excluding automated proposal generation requires students to manually synthesize IEEE problem statements and functional requirements.'
    }
    if (classification === 'ESSENTIAL') {
      return `Warning: Excluding "${name}" (an Essential capability) directly impacts the core foundation of CampusProjectHub. Faculty examiners may question how the platform operates without it.`
    }

    return `Trade-off: Excluding "${name}" streamlines project scope, reducing semester delivery risk while focusing on higher-priority deliverables.`
  }
}

export const decisionService = new DecisionService()
