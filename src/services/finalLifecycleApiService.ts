import { extractApiErrorMessage, getApiBaseUrl, getApiHeaders } from './sessionService'

export type FinalLifecycleStatus =
  | 'NOT_READY'
  | 'FINAL_REVIEW_PENDING'
  | 'CORRECTIONS_REQUIRED'
  | 'COMPLETION_APPROVED'
  | 'PUBLICATION_DRAFT'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'ARCHIVED'

export type DeliverableSlotKind =
  | 'FINAL_REPORT'
  | 'PRESENTATION'
  | 'ARCHITECTURE_DIAGRAM'
  | 'SCREENSHOT'
  | 'SUPPORTING'

export interface EvidenceFileMeta {
  fileId: string
  originalName: string
  mimeType: string
  sizeBytes: number
  storedFileName: string
  evidenceCategory: string
  sourceKind?: string
  uploadedAt: string
  uploadedBy: string
  uploadedByName?: string
  caption?: string
}

export interface ProjectModuleItem {
  name: string
  description: string
}

export interface TechnologyItem {
  name: string
  category?: string
}

export interface FinalDeliverableConfig {
  id: string
  configKey: 'GLOBAL'
  mandatoryDeliverables: {
    finalReport: boolean
    presentation: boolean
    sourceCodeOrGithub: boolean
    architectureDiagram: boolean
    screenshots: boolean
    demoLinkOrVideo: boolean
  }
  requireStartedWeeklyReportsSubmitted: boolean
  requireAllWeeklyReportsSubmitted: boolean
  minimumWeeklyReportsRequired: number
  updatedBy?: string
  updatedAt: string
}

export interface FinalMetadataPayload {
  title: string
  abstract: string
  problemStatement: string
  objectives: string[]
  proposedSolution: string
  modules: ProjectModuleItem[]
  technologyStack: TechnologyItem[]
  architectureDescription?: string
  challenges: string[]
  learningOutcomes: string[]
  futureEnhancements: string[]
  references: string[]
  academicYear: string
  batch?: string
  semester?: string
  department: string
  category?: string
  githubUrl?: string
  demoUrl?: string
  videoUrl?: string
  documentationUrl?: string
}

export interface FinalSubmissionSnapshot {
  revisionNumber: number
  submittedByStudentId: string
  submittedByStudentName: string
  submittedAt: string
  isFinalReviewRequest: boolean
  metadata: FinalMetadataPayload
  finalReportFiles: EvidenceFileMeta[]
  presentationFiles: EvidenceFileMeta[]
  architectureDiagramFiles: EvidenceFileMeta[]
  screenshotFiles: EvidenceFileMeta[]
  supportingFiles: EvidenceFileMeta[]
}

export interface FinalFacultyFeedback {
  feedbackId: string
  facultyId: string
  facultyName: string
  action: 'ADD_FEEDBACK' | 'REQUEST_CORRECTIONS' | 'APPROVE_COMPLETION'
  comment: string
  revisionNumber: number
  createdAt: string
}

export interface PublicationDraftPayload {
  title: string
  abstract: string
  academicYear: string
  batch?: string
  department: string
  semester?: string
  category?: string
  problemStatement: string
  objectives: string[]
  proposedSolution: string
  modules: ProjectModuleItem[]
  technologyStack: TechnologyItem[]
  architectureDescription?: string
  learningOutcomes: string[]
  challenges: string[]
  futureEnhancements: string[]
  references: string[]
  selectedScreenshotFileIds: string[]
  selectedArchitectureDiagramFileId?: string
  selectedFinalReportFileId?: string
  githubUrl?: string
  demoUrl?: string
  videoUrl?: string
  documentationUrl?: string
  teamMembers: Array<{
    studentId?: string
    name: string
    role?: string
    department?: string
    isLeader?: boolean
  }>
  facultyGuide: {
    name: string
    designation?: string
    department?: string
  }
  updatedByFacultyId?: string
  updatedAt?: string
}

export interface FinalLifecycleAuditEntry {
  entryId: string
  action: string
  actorId: string
  actorName: string
  actorRole: string
  previousStatus: FinalLifecycleStatus
  newStatus: FinalLifecycleStatus
  comment?: string
  revisionNumber?: number
  timestamp: string
}

export interface FinalProjectLifecycleRecord {
  id: string
  scheduleId: string
  projectId: string
  status: FinalLifecycleStatus
  latestRevisionNumber: number
  draftSubmission?: {
    submittedByStudentId: string
    submittedByStudentName: string
    updatedAt: string
    metadata: FinalMetadataPayload
    finalReportFiles: EvidenceFileMeta[]
    presentationFiles: EvidenceFileMeta[]
    architectureDiagramFiles: EvidenceFileMeta[]
    screenshotFiles: EvidenceFileMeta[]
    supportingFiles: EvidenceFileMeta[]
  }
  finalSubmissionRevisions: FinalSubmissionSnapshot[]
  facultyFeedback: FinalFacultyFeedback[]
  completionApprovedAt?: string
  completionApprovedByFacultyId?: string
  completionApprovedByFacultyName?: string
  publicationDraft?: PublicationDraftPayload
  publishedAt?: string
  publishedByFacultyId?: string
  publishedByFacultyName?: string
  unpublishedAt?: string
  unpublishedReason?: string
  archivedAt?: string
  archivedReason?: string
  auditHistory: FinalLifecycleAuditEntry[]
  createdAt: string
  updatedAt: string
}

export interface EligibilityChecklistItem {
  key: string
  label: string
  passed: boolean
  required: boolean
  detail: string
}

export interface CompletionEligibilityResult {
  eligibleForFinalReview: boolean
  checklist: EligibilityChecklistItem[]
  blockingReasons: string[]
  metrics: {
    mandatoryActivitiesTotal: number
    mandatoryActivitiesApproved: number
    optionalActivitiesTotal: number
    weeklyReportsSubmitted: number
  }
}

export interface LifecycleScheduleSummary {
  id: string
  projectId: string
  projectTitle: string
  academicYear: string
  semester?: string
  department: string
  batch?: string
  status: string
  facultyGuideId: string
  facultyGuideName: string
  assignedStudentIds: string[]
  assignedStudents: Array<{
    studentId: string
    fullName: string
    department?: string
    isTeamLeader?: boolean
  }>
  activities: Array<{
    activityId: string
    title: string
    sequenceNumber: number
    isMandatory: boolean
    activityStatus: string
    facultyReviewStatus: string
    deadline: string
  }>
}

export interface LifecycleProjectListItem {
  schedule: LifecycleScheduleSummary
  lifecycleStatus: FinalLifecycleStatus
  latestRevisionNumber: number
  eligibility: CompletionEligibilityResult
}

export interface LifecycleProjectDetailResponse {
  schedule: LifecycleScheduleSummary
  projectRepositoryRecord: {
    id: string
    title: string
    publicationStatus: string
    publishedAt?: string
  } | null
  deliverableConfig: FinalDeliverableConfig
  lifecycle: FinalProjectLifecycleRecord
  effectivePublicationDraft: PublicationDraftPayload
  eligibility: CompletionEligibilityResult
  activitySubmissions: Array<{
    id: string
    activityId: string
    activityTitle: string
    status: string
    latestRevisionNumber: number
    submittedAt?: string
  }>
  weeklyReports: Array<{
    id: string
    weekNumber: number
    status: string
    periodStart: string
    periodEnd: string
    submittedAt?: string
    submittedByName?: string
  }>
}

export interface PendingUploadSlot {
  file: File
  slot: DeliverableSlotKind
  evidenceCategory?: string
}

function buildFinalSubmissionFormData(params: {
  metadata: FinalMetadataPayload
  uploads: PendingUploadSlot[]
  retainFileIds: string[]
}): FormData {
  const form = new FormData()
  form.append('metadata', JSON.stringify(params.metadata))
  form.append('retainFileIds', JSON.stringify(params.retainFileIds))
  form.append(
    'fileSlots',
    JSON.stringify(params.uploads.map((u) => u.slot))
  )
  form.append(
    'evidenceCategories',
    JSON.stringify(
      params.uploads.map((u) => u.evidenceCategory || u.slot)
    )
  )
  for (const item of params.uploads) {
    form.append('files', item.file)
  }
  return form
}

async function readErrorAndThrow(response: Response, fallbackMessage: string): Promise<never> {
  const json = await response.json().catch(() => null)
  throw new Error(extractApiErrorMessage(json, response.status, fallbackMessage))
}

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    return readErrorAndThrow(response, fallbackMessage)
  }
  const payload = await response.json()
  return (payload.data ?? payload) as T
}

export const finalLifecycleApiService = {
  async getConfig(): Promise<FinalDeliverableConfig> {
    const res = await fetch(`${getApiBaseUrl()}/api/final-lifecycle/config`, {
      headers: getApiHeaders(),
    })
    return parseJsonOrThrow<FinalDeliverableConfig>(res, 'Failed to fetch deliverable configuration')
  },

  async updateConfig(patch: Partial<FinalDeliverableConfig>): Promise<FinalDeliverableConfig> {
    const res = await fetch(`${getApiBaseUrl()}/api/final-lifecycle/config`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(patch),
    })
    return parseJsonOrThrow<FinalDeliverableConfig>(res, 'Failed to update deliverable configuration')
  },

  async listProjects(): Promise<LifecycleProjectListItem[]> {
    const res = await fetch(`${getApiBaseUrl()}/api/final-lifecycle/projects`, {
      headers: getApiHeaders(),
    })
    return parseJsonOrThrow<LifecycleProjectListItem[]>(res, 'Failed to load project completion records')
  },

  async getProjectDetail(scheduleId: string): Promise<LifecycleProjectDetailResponse> {
    const res = await fetch(`${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}`, {
      headers: getApiHeaders(),
    })
    return parseJsonOrThrow<LifecycleProjectDetailResponse>(res, 'Failed to load final project details')
  },

  async saveDraft(
    scheduleId: string,
    params: { metadata: FinalMetadataPayload; uploads: PendingUploadSlot[]; retainFileIds: string[] }
  ): Promise<FinalProjectLifecycleRecord> {
    const form = buildFinalSubmissionFormData(params)
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/draft`,
      {
        method: 'PUT',
        headers: getApiHeaders({}, false),
        body: form,
      }
    )
    return parseJsonOrThrow<FinalProjectLifecycleRecord>(res, 'Failed to save final draft')
  },

  async submitForFinalReview(
    scheduleId: string,
    params: { metadata: FinalMetadataPayload; uploads: PendingUploadSlot[]; retainFileIds: string[] }
  ): Promise<{
    lifecycle: FinalProjectLifecycleRecord
    snapshot: FinalSubmissionSnapshot
    eligibility: CompletionEligibilityResult
  }> {
    const form = buildFinalSubmissionFormData(params)
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/submit`,
      {
        method: 'POST',
        headers: getApiHeaders({}, false),
        body: form,
      }
    )
    return parseJsonOrThrow(res, 'Project is not eligible for final review')
  },

  async performFinalReview(
    scheduleId: string,
    payload: { action: 'ADD_FEEDBACK' | 'REQUEST_CORRECTIONS' | 'APPROVE_COMPLETION'; comment: string }
  ): Promise<FinalProjectLifecycleRecord> {
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/final-review`,
      {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload),
      }
    )
    return parseJsonOrThrow<FinalProjectLifecycleRecord>(res, 'Failed to record final review action')
  },

  async savePublicationDraft(
    scheduleId: string,
    payload: Partial<PublicationDraftPayload> & { notifyReady?: boolean }
  ): Promise<FinalProjectLifecycleRecord> {
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/publication-draft`,
      {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify(payload),
      }
    )
    return parseJsonOrThrow<FinalProjectLifecycleRecord>(res, 'Failed to save publication draft')
  },

  async publishProject(scheduleId: string): Promise<{ lifecycle: FinalProjectLifecycleRecord; projectId: string }> {
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/publish`,
      {
        method: 'POST',
        headers: getApiHeaders(),
      }
    )
    return parseJsonOrThrow(res, 'Failed to publish project to repository')
  },

  async unpublishProject(scheduleId: string, reason: string): Promise<FinalProjectLifecycleRecord> {
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/unpublish`,
      {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ reason }),
      }
    )
    return parseJsonOrThrow<FinalProjectLifecycleRecord>(res, 'Failed to unpublish project')
  },

  async archiveProject(scheduleId: string, reason: string): Promise<FinalProjectLifecycleRecord> {
    const res = await fetch(
      `${getApiBaseUrl()}/api/final-lifecycle/projects/${encodeURIComponent(scheduleId)}/archive`,
      {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ reason }),
      }
    )
    return parseJsonOrThrow<FinalProjectLifecycleRecord>(res, 'Failed to archive project')
  },

  async fetchPrivateFileBlobUrl(fileId: string, download = false): Promise<string> {
    const query = download ? '?download=true' : ''
    const res = await fetch(`${getApiBaseUrl()}/api/final-lifecycle/files/${encodeURIComponent(fileId)}${query}`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      return readErrorAndThrow(res, 'Failed to load deliverable file')
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },

  async fetchAuthenticatedAssetBlobUrl(relativeOrApiUrl: string, download = false): Promise<string> {
    const base = getApiBaseUrl()
    const cleanPath = relativeOrApiUrl.startsWith('http')
      ? relativeOrApiUrl
      : `${base}${relativeOrApiUrl.startsWith('/') ? '' : '/'}${relativeOrApiUrl}`
    const sep = cleanPath.includes('?') ? '&' : '?'
    const target = download ? `${cleanPath}${sep}download=true` : cleanPath
    const res = await fetch(target, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      return readErrorAndThrow(res, 'Failed to fetch published asset')
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
}
