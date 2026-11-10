export type DocumentType =
  | 'MINI_PROJECT_PROPOSAL'
  | 'PROJECT_SYNOPSIS'
  | 'PROJECT_REPORT'
  | 'PROJECT_ABSTRACT'
  | 'REVIEW_REPORT'
  | 'PRESENTATION_OUTLINE'

export type FacultySubmissionStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'

export type ReadinessRating = 'NEEDS_IMPROVEMENT' | 'ALMOST_READY' | 'READY_FOR_FACULTY_REVIEW'

export interface ProposalSection {
  sectionId: string
  title: string
  content: string
  isMandatory: boolean
  order: number
  wordCount: number
  isManuallyEdited: boolean
  lastModifiedBy: 'ai' | 'student' | 'system'
  missingInfoNote?: string
  updatedAt: string
}

export interface TemplateMetadata {
  templateId: string
  templateVersion?: string
  templateName: string
  college: string
  department: string
  academicYear: string
  semester: string
  documentType: DocumentType
  mandatorySectionIds: string[]
  optionalSectionIds: string[]
}

export interface ProposalVersionSnapshot {
  versionNumber: number
  sections: ProposalSection[]
  sourceScopeVersion: number
  templateId: string
  revisionSummary: string
  createdBy: string
  createdAt: string
}

export interface FacultyFeedbackEntry {
  date: string
  facultyId: string
  facultyName?: string
  status: FacultySubmissionStatus
  comments: string
}

export interface FacultyReviewRecord {
  status: FacultySubmissionStatus
  facultyId?: string
  submittedAt?: string
  facultyGuideName?: string
  facultyComments?: string
  reviewedAt?: string
  feedbackHistory?: FacultyFeedbackEntry[]
}

export interface ReadinessAuditResult {
  overallRating: ReadinessRating
  problemClarity: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  objectiveAlignment: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  scopeConsistency: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  featureCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  technicalFeasibility: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  architectureConsistency: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  methodologyCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  referenceValidity: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  requiredSectionCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  actionableSuggestions: string[]
}

export interface ProposalRecord {
  id: string
  studentId: string
  projectTitle: string
  documentType: DocumentType
  sourceEvaluationId?: string
  sourceScopeVersion: number
  isScopeFinalized?: boolean
  scopeStatus?: 'FINALIZED' | 'UNFINALIZED' | 'DRAFT'
  template: TemplateMetadata
  sections: ProposalSection[]
  versions: ProposalVersionSnapshot[]
  activeVersionNumber: number
  readiness?: ReadinessAuditResult
  submission: FacultyReviewRecord
  createdAt: string
  updatedAt: string
}

export interface SectionImprovementResponse {
  sectionId: string
  originalContent: string
  proposedContent: string
  revisionRationale: string
  wordCountDelta: number
  consistencyWarnings?: string[]
}

export interface VersionComparisonResult {
  versionA: number
  versionB: number
  revisionSummaryA: string
  revisionSummaryB: string
  addedSections: string[]
  removedSections: string[]
  modifiedSections: Array<{
    sectionId: string
    title: string
    wordCountA: number
    wordCountB: number
    wordCountDelta: number
    isContentChanged: boolean
  }>
}

import { getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/proposals`

export const aiProposalApiService = {
  /**
   * List assigned/available college proposal templates
   */
  async listTemplates(): Promise<TemplateMetadata[]> {
    const res = await fetch(`${getBase()}/templates`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      throw new Error('Failed to load college proposal templates')
    }
    const json = await res.json()
    return json.data || []
  },

  /**
   * Apply a college template to an existing proposal while preserving manual edits
   */
  async updateTemplate(proposalId: string, templateId: string): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/template`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify({ templateId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to apply college template')
    }
    const json = await res.json()
    return json.data
  },

  /**
   * Generate an academic proposal from project scope
   */
  async generateProposal(payload: {
    projectTitle?: string
    documentType?: DocumentType
    sourceEvaluationId?: string
    templateId?: string
    isScopeFinalized?: boolean
  }): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/generate`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to generate proposal')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Retrieve active student's proposal records
   */
  async listProposals(): Promise<ProposalRecord[]> {
    const res = await fetch(getBase(), {
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      throw new Error('Failed to fetch proposals')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Retrieve a proposal by ID
   */
  async getProposal(proposalId: string): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}`, {
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to fetch proposal')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Autosave draft modifications without incrementing immutable version number
   */
  async saveDraft(
    proposalId: string,
    payload: {
      projectTitle?: string
      sections?: Array<{ sectionId: string; content: string; title?: string }>
    }
  ): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/draft`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Failed to autosave draft')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Update section content
   */
  async updateSection(
    proposalId: string,
    sectionId: string,
    content: string
  ): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/sections/${sectionId}`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      throw new Error('Failed to update section')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Regenerate single specific section from underlying scope
   */
  async regenerateSection(proposalId: string, sectionId: string): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/sections/${sectionId}/regenerate`, {
      method: 'POST',
      headers: getApiHeaders(),
    })

    if (!res.ok) {
      throw new Error('Failed to regenerate section')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Add a custom section
   */
  async addCustomSection(
    proposalId: string,
    data: { title: string; content: string; isMandatory?: boolean }
  ): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/sections`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      throw new Error('Failed to add custom section')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Delete an optional or custom section
   */
  async deleteSection(proposalId: string, sectionId: string): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/sections/${sectionId}`, {
      method: 'DELETE',
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      throw new Error('Failed to delete section')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Reorder proposal sections
   */
  async reorderSections(proposalId: string, sectionIds: string[]): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/sections/reorder`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ sectionIds }),
    })

    if (!res.ok) {
      throw new Error('Failed to reorder sections')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Trigger AI section improvement (clarity, grammar, shorten, expand, etc.)
   */
  async improveSection(
    proposalId: string,
    sectionId: string,
    action:
      | 'improve-clarity'
      | 'correct-grammar'
      | 'clarify-technical'
      | 'shorten'
      | 'expand'
      | 'check-consistency',
    customInstruction?: string
  ): Promise<SectionImprovementResponse> {
    const res = await fetch(`${getBase()}/${proposalId}/sections/${sectionId}/improve`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ action, customInstruction }),
    })

    if (!res.ok) {
      throw new Error('Failed to run AI section improvement')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Snapshot a new named/numbered proposal version
   */
  async createVersion(proposalId: string, revisionSummary: string): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/versions`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ revisionSummary }),
    })

    if (!res.ok) {
      throw new Error('Failed to save proposal version')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Compare two versions
   */
  async compareVersions(
    proposalId: string,
    versionA: number,
    versionB: number
  ): Promise<VersionComparisonResult> {
    const res = await fetch(`${getBase()}/${proposalId}/versions/compare`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ versionA, versionB }),
    })

    if (!res.ok) {
      throw new Error('Failed to compare proposal versions')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Restore a previous version snapshot as a new revision
   */
  async restoreVersion(proposalId: string, versionNumber: number): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/restore`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ versionNumber }),
    })

    if (!res.ok) {
      throw new Error(`Failed to restore version v${versionNumber}`)
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Run 9-criteria readiness advisory assessment
   */
  async getReadiness(proposalId: string): Promise<ReadinessAuditResult> {
    const res = await fetch(`${getBase()}/${proposalId}/readiness`, {
      method: 'POST',
      headers: getApiHeaders({}, false),
    })

    if (!res.ok) {
      throw new Error('Failed to assess proposal readiness')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Submit proposal for formal faculty review
   */
  async submitFaculty(
    proposalId: string,
    facultyGuideName?: string,
    comments?: string
  ): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/submit`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ facultyGuideName, comments }),
    })

    if (!res.ok) {
      throw new Error('Failed to submit proposal to faculty')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Resubmit proposal following CHANGES_REQUESTED
   */
  async resubmitFaculty(proposalId: string, comments?: string): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/resubmit`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ comments }),
    })

    if (!res.ok) {
      throw new Error('Failed to resubmit proposal to faculty')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Faculty review action
   */
  async facultyReview(
    proposalId: string,
    review: {
      status: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
      comments: string
      facultyGuideName?: string
    }
  ): Promise<ProposalRecord> {
    const res = await fetch(`${getBase()}/${proposalId}/faculty/review`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(review),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to review proposal')
    }

    const json = await res.json()
    return json.data
  },

  /**
   * Get direct export URL for DOCX or PDF download
   */
  getExportUrl(proposalId: string, format: 'docx' | 'pdf' = 'docx'): string {
    return `${getBase()}/${proposalId}/export?format=${format}`
  },

  /**
   * Download formatted DOCX or PDF with student session headers
   */
  async downloadExport(
    proposalId: string,
    format: 'docx' | 'pdf' = 'docx',
    filenameBase = 'academic_proposal'
  ): Promise<void> {
    const res = await fetch(`${getBase()}/${proposalId}/export?format=${format}`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Failed to export ${format.toUpperCase()} document`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
