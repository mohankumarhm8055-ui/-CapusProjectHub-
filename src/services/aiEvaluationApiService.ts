export type FeatureClassification = 'ESSENTIAL' | 'RECOMMENDED' | 'OPTIONAL' | 'UNNECESSARY'
export type DecisionStatus = 'ACCEPTED' | 'REJECTED' | 'MODIFIED'
export type OverallFeasibilityRating =
  | 'FEASIBLE_INITIAL'
  | 'FEASIBLE_REDUCED_SCOPE'
  | 'REQUIRES_RESOURCES_OR_TIME'
  | 'NOT_FEASIBLE'

export interface ProjectConstraints {
  teamSize: number
  technicalExperience: 'beginner' | 'intermediate' | 'advanced'
  developmentWeeks: number
  semesterDeadline: string
  languagesAndFrameworks: string[]
  hardwareResources?: string[]
  budget?: string
  academicRequirements?: string
}

export interface FeatureDimensions {
  problemRelevance: {
    solvesRealProblem: boolean
    rationale: string
  }
  userValue: {
    primaryBeneficiary: 'student' | 'faculty' | 'both'
    rationale: string
  }
  originality: {
    contributionType: string
    rationale: string
  }
  technicalFeasibility: {
    realisticForTeam: boolean
    rationale: string
  }
  complexity: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    rationale: string
  }
  resourceRequirements: {
    requiredResources: string[]
    rationale: string
  }
  timeSuitability: {
    fitsDeadline: boolean
    estimatedWeeks: number
    rationale: string
  }
}

export interface EvaluatedFeature {
  featureId: string
  name: string
  classification: FeatureClassification
  dimensions: FeatureDimensions
  dependencies: string[]
  potentialRisks: string[]
  recommendation: string
  simplerAlternative?: string
  assumptions: string[]
}

export interface StudentDecision {
  featureId: string
  decision: DecisionStatus
  modifiedScope?: string
  tradeoffNotes?: string
  updatedAt: string
}

export interface FinalScope {
  title: string
  problemStatement: string
  coreObjectives: string[]
  essentialFeatures: string[]
  acceptedRecommendedFeatures: string[]
  acceptedOptionalFeatures: string[]
  excludedFeatures: Array<{
    featureName: string
    reason: string
  }>
  technologyStack: string[]
  majorDependencies: string[]
  implementationMilestones: Array<{
    milestone: string
    deliverables: string[]
    durationWeeks: number
  }>
  knownRisks: string[]
  explicitAssumptions: string[]
  status: 'DRAFT' | 'SAVED'
}

export interface ScopeVersion {
  version: number
  scope: FinalScope
  overallFeasibility: {
    rating: OverallFeasibilityRating
    summary: string
    primaryBottlenecks: string[]
    recommendedReleaseScope: string
  }
  changeSummary: string
  changedBy: string
  createdAt: string
  isFinalized: boolean
}

export interface ScopeAuditEntry {
  id: string
  timestamp: string
  action: string
  actor: string
  details: string
}

export interface EvaluationRecord {
  id: string
  ownerId: string
  projectId?: string
  conversationId?: string
  projectTitle: string
  version: number
  constraints: ProjectConstraints
  overallFeasibility: {
    rating: OverallFeasibilityRating
    summary: string
    primaryBottlenecks: string[]
    recommendedReleaseScope: string
  }
  features: EvaluatedFeature[]
  decisions: StudentDecision[]
  finalScope?: FinalScope
  scopeVersions?: ScopeVersion[]
  scopeAuditHistory?: ScopeAuditEntry[]
  isFinalized?: boolean
  finalizedAt?: string
  repositoryComparison?: any
  createdAt: string
  updatedAt: string
}

import { getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/ai/evaluations`

export const aiEvaluationApiService = {
  /**
   * Run 7-dimensional feature evaluation
   */
  async createEvaluation(payload: {
    projectTitle?: string
    problemStatement?: string
    proposedFeatures?: string[]
    constraints?: Partial<ProjectConstraints>
    conversationId?: string
  }): Promise<EvaluationRecord> {
    const res = await fetch(getBase(), {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${res.status}: Failed to initiate feature evaluation`)
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Fetch evaluation by ID
   */
  async getEvaluation(id: string): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${id}`, {
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      throw new Error(`Failed to load evaluation ${id}`)
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Fetch latest evaluation associated with a conversation (returns null if none)
   */
  async getLatestByConversation(conversationId: string): Promise<EvaluationRecord | null> {
    const res = await fetch(`${getBase()}/conversation/${conversationId}`, {
      headers: getApiHeaders({}, false),
    })
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Failed to load conversation evaluation (${res.status})`)
    }
    const json = await res.json()
    return json.data || null
  },

  /**
   * Record student decision: ACCEPT, REJECT, or MODIFY
   */
  async recordDecision(
    evaluationId: string,
    featureId: string,
    decision: DecisionStatus,
    modifiedScope?: string,
    notes?: string
  ): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify({
        featureId,
        decision,
        modifiedScope,
        notes,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to record decision')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Reassess evaluation with updated constraints
   */
  async reassess(
    evaluationId: string,
    constraints: Partial<ProjectConstraints>,
    proposedFeatures?: string[]
  ): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/reassess`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ constraints, proposedFeatures }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to reassess evaluation')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Generate final scope from accepted decisions
   */
  async generateFinalScope(evaluationId: string): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/generate-scope`, {
      method: 'POST',
      headers: getApiHeaders(),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to generate final scope')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Student custom edit on final scope
   */
  async updateFinalScope(evaluationId: string, updates: Partial<FinalScope>): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/scope`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify(updates),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to update scope')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Standalone natural-language feature evaluation
   */
  async evaluateSingleFeature(
    featureName: string,
    constraints?: Partial<ProjectConstraints>,
    projectContext?: any
  ): Promise<{ feature: EvaluatedFeature; followUpQuestion?: { questionKey: string; questionText: string } | null }> {
    const res = await fetch(`${getBase()}/evaluate-feature`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ featureName, constraints, projectContext }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to evaluate feature')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Create explicit scope version
   */
  async createScopeVersion(evaluationId: string, changeSummary: string): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/scope/versions`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ changeSummary }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to create scope version')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * List scope versions
   */
  async listScopeVersions(evaluationId: string): Promise<{ versions: ScopeVersion[]; auditHistory: ScopeAuditEntry[] }> {
    const res = await fetch(`${getBase()}/${evaluationId}/scope/versions`, {
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      throw new Error('Failed to list scope versions')
    }

    const json = await res.json()
    return { versions: json.data || [], auditHistory: json.auditHistory || [] }
  },

  /**
   * Restore scope version
   */
  async restoreScopeVersion(evaluationId: string, version: number): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/scope/versions/${version}/restore`, {
      method: 'POST',
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to restore scope version')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Compare two scope versions
   */
  async compareScopeVersions(
    evaluationId: string,
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
    const res = await fetch(`${getBase()}/${evaluationId}/scope/compare`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ versionA, versionB }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to compare scope versions')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Explicit student confirmation to finalize scope
   */
  async finalizeScope(evaluationId: string): Promise<EvaluationRecord> {
    const res = await fetch(`${getBase()}/${evaluationId}/scope/finalize`, {
      method: 'POST',
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to finalize scope')
    }

    const json = await res.json()
    return json.data
  },
}
