import {
  EvaluationRepository,
  IEvaluationRecord,
  IFinalScope,
  IScopeVersion,
} from './evaluation.model.js'

export class ScopeGenerator {
  /**
   * Compiles structured project scope based on evaluated features and student decisions
   */
  async generateScope(evaluationId: string, ownerId: string): Promise<IEvaluationRecord> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')

    const decisionMap = new Map<string, string>()
    for (const d of evaluation.decisions) {
      decisionMap.set(d.featureId, d.decision)
    }

    const essentialFeatures: string[] = []
    const acceptedRecommended: string[] = []
    const acceptedOptional: string[] = []
    const excludedFeatures: Array<{ featureName: string; reason: string }> = []

    for (const feat of evaluation.features) {
      const decision = decisionMap.get(feat.featureId)

      if (decision === 'REJECTED') {
        const rejectionEntry = evaluation.decisions.find((d) => d.featureId === feat.featureId)
        excludedFeatures.push({
          featureName: feat.name,
          reason: rejectionEntry?.tradeoffNotes || feat.recommendation || 'Excluded by student to protect semester delivery timeline.',
        })
        continue
      }

      // If rejected by recommendation (e.g. UNNECESSARY) and not explicitly accepted
      if (feat.classification === 'UNNECESSARY' && decision !== 'ACCEPTED') {
        excludedFeatures.push({
          featureName: feat.name,
          reason: 'Excluded by feature evaluation engine: disproportionate complexity without sufficient academic return for mini-project.',
        })
        continue
      }

      const displayName = decision === 'MODIFIED'
        ? `${feat.name} (Scope Adjusted: ${evaluation.decisions.find((d) => d.featureId === feat.featureId)?.modifiedScope})`
        : feat.name

      if (feat.classification === 'ESSENTIAL') {
        essentialFeatures.push(displayName)
      } else if (feat.classification === 'RECOMMENDED') {
        acceptedRecommended.push(displayName)
      } else {
        acceptedOptional.push(displayName)
      }
    }

    // Milestones synthesis fitting available weeks
    const availableWeeks = evaluation.constraints.developmentWeeks || 12
    const phase1Weeks = Math.max(3, Math.round(availableWeeks * 0.3))
    const phase2Weeks = Math.max(4, Math.round(availableWeeks * 0.45))
    const phase3Weeks = Math.max(2, availableWeeks - (phase1Weeks + phase2Weeks))

    const isCPH = evaluation.projectTitle.toLowerCase().includes('campusprojecthub')
    const resolvedProblemStatement =
      evaluation.finalScope?.problemStatement ||
      evaluation.problemStatement ||
      (isCPH
        ? 'College students face fragmented project management, duplicate redundant capstones, and lack honest pedagogical feedback before high-stakes faculty reviews.'
        : `Students and target users require a reliable, well-scoped academic implementation of "${evaluation.projectTitle}" that balances functional depth with realistic semester constraints.`)

    const resolvedObjectives =
      evaluation.finalScope?.coreObjectives && evaluation.finalScope.coreObjectives.length > 0
        ? evaluation.finalScope.coreObjectives
        : evaluation.coreObjectives && evaluation.coreObjectives.length > 0
        ? evaluation.coreObjectives
        : isCPH
        ? [
            'Centralize academic capstone milestones and student team accountability.',
            'Prevent accidental project duplication using repository similarity intelligence.',
            'Provide constructive, honest AI feature evaluation to optimize semester scope.',
            'Standardize faculty review workflows with transparent rubric criteria.',
          ]
        : [
            `Deliver essential core workflows for ${evaluation.projectTitle} within ${availableWeeks} weeks.`,
            'Maintain strict separation of concerns, input validation, and role-based access control.',
            'Validate implementation with end-to-end tests and defend engineering trade-offs in viva.',
          ]

    const finalScope: IFinalScope = {
      title: `${evaluation.projectTitle} — Final Academic Implementation Scope`,
      problemStatement: resolvedProblemStatement,
      coreObjectives: resolvedObjectives,
      essentialFeatures,
      acceptedRecommendedFeatures: acceptedRecommended,
      acceptedOptionalFeatures: acceptedOptional,
      excludedFeatures,
      technologyStack: evaluation.constraints.languagesAndFrameworks,
      majorDependencies: isCPH
        ? [
            'React 18 + Tailwind CSS frontend interface',
            'Node.js + Express REST API server',
            'MongoDB / Mongoose persistence with compound text indexes',
            'AI Provider Layer (Gemini / High-Fidelity Mock with streaming SSE)',
          ]
        : [
            ...evaluation.constraints.languagesAndFrameworks.map((t) => `${t} runtime & core packages`),
            ...(evaluation.constraints.hardwareResources || []),
          ],
      implementationMilestones: isCPH
        ? [
            {
              milestone: 'Phase 1: Foundation & Data Architecture',
              durationWeeks: phase1Weeks,
              deliverables: [
                'Setup canonical project schema (33+ fields) with text indexes',
                'Implement student team registration, role assignment, and project workspace',
                'Establish college repository discovery with student privacy contact masking',
              ],
            },
            {
              milestone: 'Phase 2: Intelligence Engine & Core Workflows',
              durationWeeks: phase2Weeks,
              deliverables: [
                'Deploy AI Project Similarity Engine with character/token n-gram containment',
                'Integrate AI Feature Evaluation Engine with 7-dimensional pedagogical auditing',
                'Build full-page AI Project Mentor workspace with streaming SSE',
              ],
            },
            {
              milestone: 'Phase 3: Faculty Review, Governance & Defense Prep',
              durationWeeks: phase3Weeks,
              deliverables: [
                'Implement formal Faculty Review Workflow (Approve, Reject, Request Changes)',
                'Generate final structured academic scope export',
                'Conduct end-to-end integration tests and prepare viva defense demo scripts',
              ],
            },
          ]
        : [
            {
              milestone: 'Phase 1: Requirements, Schema & Core Foundation',
              durationWeeks: phase1Weeks,
              deliverables: [
                `Finalize data models and core API endpoints for ${evaluation.projectTitle}`,
                ...essentialFeatures.slice(0, 2).map((f) => `Implement baseline: ${f}`),
              ],
            },
            {
              milestone: 'Phase 2: Core Logic & Recommended Capabilities',
              durationWeeks: phase2Weeks,
              deliverables: [
                ...essentialFeatures.slice(2).map((f) => `Complete core capability: ${f}`),
                ...(acceptedRecommended.length > 0
                  ? acceptedRecommended.slice(0, 2).map((f) => `Integrate enhancement: ${f}`)
                  : [`Complete integration and error handling for ${evaluation.projectTitle}`]),
              ],
            },
            {
              milestone: 'Phase 3: Testing, Academic Proposal & Defense Prep',
              durationWeeks: phase3Weeks,
              deliverables: [
                'Execute integration tests and verify permission boundaries',
                'Generate IEEE 830 academic proposal from finalized scope',
                'Prepare live demonstration and viva defense documentation',
              ],
            },
          ],
      knownRisks: isCPH
        ? [
            'Underestimating data modeling complexity for historical repository ingestion.',
            'Treating shared technology frameworks as duplicate project ideas (mitigated by Similarity != Plagiarism rules).',
            'Prematurely implementing high-risk real-time voice features (mitigated by student-confirmed exclusion).',
          ]
        : [
            `Scope creep exceeding ${availableWeeks}-week semester timeline (mitigated by explicit feature exclusions).`,
            'Integration bottlenecks across frontend, backend, and persistence layers.',
            ...(excludedFeatures.length > 0
              ? [`Deferred high-risk features (${excludedFeatures.map((e) => e.featureName).slice(0, 2).join(', ')}) documented with trade-off defense.`]
              : []),
          ],
      explicitAssumptions: [
        `Development window: ${availableWeeks} calendar weeks.`,
        `Team capacity: ${evaluation.constraints.teamSize} developers with ${evaluation.constraints.technicalExperience} experience.`,
        ...(evaluation.constraints.academicRequirements
          ? [`Academic requirement: ${evaluation.constraints.academicRequirements}`]
          : []),
        'All tools and libraries utilized are open-source with zero external subscription costs.',
      ],
      status: 'SAVED',
    }

    // Auto-create Version 1 snapshot if none exists
    const initialVersion: IScopeVersion = {
      version: 1,
      scope: finalScope,
      overallFeasibility: evaluation.overallFeasibility,
      changeSummary: 'Initial scope generated from feature evaluation and student decisions.',
      changedBy: ownerId,
      createdAt: new Date(),
      isFinalized: false,
    }

    const scopeVersions = evaluation.scopeVersions && evaluation.scopeVersions.length > 0
      ? evaluation.scopeVersions
      : [initialVersion]

    const scopeAuditHistory = evaluation.scopeAuditHistory || []
    scopeAuditHistory.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      action: 'VERSION_CREATED',
      actor: ownerId,
      details: 'Scope generated and saved as Version 1.',
    })

    const updated = await EvaluationRepository.update(evaluationId, {
      finalScope,
      scopeVersions,
      scopeAuditHistory,
    })

    if (!updated) throw new Error('Failed to save final scope')
    return updated
  }

  /**
   * Updates an existing final scope (student custom edits)
   */
  async updateScope(
    evaluationId: string,
    ownerId: string,
    updates: Partial<IFinalScope>
  ): Promise<IEvaluationRecord> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')
    if (!evaluation.finalScope) throw new Error('No final scope has been generated for this evaluation yet')

    const mergedScope: IFinalScope = {
      ...evaluation.finalScope,
      ...updates,
      status: 'SAVED',
    }

    const auditHistory = evaluation.scopeAuditHistory || []
    auditHistory.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      action: 'SCOPE_EDITED',
      actor: ownerId,
      details: `Scope manually updated by student (${Object.keys(updates).join(', ')}).`,
    })

    const updated = await EvaluationRepository.update(evaluationId, {
      finalScope: mergedScope,
      scopeAuditHistory: auditHistory,
    })

    if (!updated) throw new Error('Failed to update scope')
    return updated
  }

  /**
   * Creates an explicit new immutable scope version
   */
  async createScopeVersion(
    evaluationId: string,
    ownerId: string,
    changeSummary: string
  ): Promise<IEvaluationRecord> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')
    if (!evaluation.finalScope) throw new Error('Cannot version scope before generating initial scope')

    const currentVersions = evaluation.scopeVersions || []
    const newVersionNum = currentVersions.length + 1

    const newVersion: IScopeVersion = {
      version: newVersionNum,
      scope: JSON.parse(JSON.stringify(evaluation.finalScope)),
      overallFeasibility: JSON.parse(JSON.stringify(evaluation.overallFeasibility)),
      changeSummary: changeSummary || `Scope Version ${newVersionNum}`,
      changedBy: ownerId,
      createdAt: new Date(),
      isFinalized: evaluation.isFinalized || false,
    }

    const auditHistory = evaluation.scopeAuditHistory || []
    auditHistory.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      action: 'VERSION_CREATED',
      actor: ownerId,
      details: `Created Scope Version ${newVersionNum}: ${changeSummary}`,
    })

    const updated = await EvaluationRepository.update(evaluationId, {
      version: newVersionNum,
      scopeVersions: [...currentVersions, newVersion],
      scopeAuditHistory: auditHistory,
    })

    if (!updated) throw new Error('Failed to create scope version')
    return updated
  }

  /**
   * Restores a previously saved scope version as the active scope
   */
  async restoreScopeVersion(
    evaluationId: string,
    ownerId: string,
    versionNumber: number
  ): Promise<IEvaluationRecord> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')

    const targetVersion = evaluation.scopeVersions?.find((v) => v.version === versionNumber)
    if (!targetVersion) {
      throw new Error(`Scope version ${versionNumber} not found`)
    }

    const auditHistory = evaluation.scopeAuditHistory || []
    auditHistory.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      action: 'VERSION_RESTORED',
      actor: ownerId,
      details: `Restored Scope Version ${versionNumber} to active project scope.`,
    })

    const updated = await EvaluationRepository.update(evaluationId, {
      finalScope: JSON.parse(JSON.stringify(targetVersion.scope)),
      overallFeasibility: JSON.parse(JSON.stringify(targetVersion.overallFeasibility)),
      scopeAuditHistory: auditHistory,
    })

    if (!updated) throw new Error('Failed to restore scope version')
    return updated
  }

  /**
   * Compares two scope versions and produces a structured difference analysis
   */
  async compareScopeVersions(
    evaluationId: string,
    ownerId: string,
    versionA: number,
    versionB: number
  ): Promise<{
    versionA: number
    versionB: number
    addedEssentialFeatures: string[]
    removedEssentialFeatures: string[]
    addedRecommendedFeatures: string[]
    removedRecommendedFeatures: string[]
    excludedFeaturesDiff: { added: string[]; removed: string[] }
    feasibilityDiff: { from: string; to: string }
  }> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')

    const vA = evaluation.scopeVersions?.find((v) => v.version === versionA)
    const vB = evaluation.scopeVersions?.find((v) => v.version === versionB)

    if (!vA || !vB) throw new Error(`One or both scope versions (${versionA}, ${versionB}) not found`)

    const essentialA = new Set(vA.scope.essentialFeatures || [])
    const essentialB = new Set(vB.scope.essentialFeatures || [])

    const recA = new Set(vA.scope.acceptedRecommendedFeatures || [])
    const recB = new Set(vB.scope.acceptedRecommendedFeatures || [])

    const exclA = new Set(vA.scope.excludedFeatures?.map((f) => f.featureName) || [])
    const exclB = new Set(vB.scope.excludedFeatures?.map((f) => f.featureName) || [])

    return {
      versionA,
      versionB,
      addedEssentialFeatures: Array.from(essentialB).filter((x) => !essentialA.has(x)),
      removedEssentialFeatures: Array.from(essentialA).filter((x) => !essentialB.has(x)),
      addedRecommendedFeatures: Array.from(recB).filter((x) => !recA.has(x)),
      removedRecommendedFeatures: Array.from(recA).filter((x) => !recB.has(x)),
      excludedFeaturesDiff: {
        added: Array.from(exclB).filter((x) => !exclA.has(x)),
        removed: Array.from(exclA).filter((x) => !exclB.has(x)),
      },
      feasibilityDiff: {
        from: vA.overallFeasibility?.rating || 'UNKNOWN',
        to: vB.overallFeasibility?.rating || 'UNKNOWN',
      },
    }
  }

  /**
   * Explicit student confirmation to finalize active project scope
   */
  async finalizeScope(evaluationId: string, ownerId: string): Promise<IEvaluationRecord> {
    const evaluation = await EvaluationRepository.findById(evaluationId)
    if (!evaluation) throw new Error('Evaluation record not found')
    if (evaluation.ownerId !== ownerId) throw new Error('Forbidden: You do not own this evaluation')
    if (!evaluation.finalScope) throw new Error('Cannot finalize scope: No scope has been generated yet')

    const auditHistory = evaluation.scopeAuditHistory || []
    auditHistory.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      action: 'SCOPE_FINALIZED',
      actor: ownerId,
      details: 'Student explicitly confirmed and finalized project scope for academic review.',
    })

    const updated = await EvaluationRepository.update(evaluationId, {
      isFinalized: true,
      finalizedAt: new Date(),
      finalizedBy: ownerId,
      scopeAuditHistory: auditHistory,
    })

    if (!updated) throw new Error('Failed to finalize scope')
    return updated
  }
}

export const scopeGenerator = new ScopeGenerator()
