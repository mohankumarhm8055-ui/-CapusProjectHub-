import { extractApiErrorMessage, getApiBaseUrl, getApiHeaders } from './sessionService'
import type {
  AssignedStudent,
  ProjectSchedule,
  ScheduledActivity,
} from './scheduleApiService'

const getBase = () => `${getApiBaseUrl()}/api/activity-submissions`

export type ActivitySubmissionStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'

export type ActivityTimingStatus =
  | 'UPCOMING'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'SUBMITTED_ON_TIME'
  | 'SUBMITTED_LATE'

export type EvidenceCategory =
  | 'PDF_DOCUMENT'
  | 'DOCX_DOCUMENT'
  | 'UI_UX_SCREENSHOT'
  | 'ARCHITECTURE_DIAGRAM'
  | 'IMAGE_EVIDENCE'
  | 'SUPPORTING_DOCUMENT'
  | 'OTHER'

export type EvidenceLinkType =
  | 'GITHUB_REPOSITORY'
  | 'DEMO_URL'
  | 'RESEARCH_PAPER'
  | 'DOCUMENTATION_URL'
  | 'DESIGN_LINK'
  | 'OTHER'

export interface EvidenceFileMeta {
  fileId: string
  originalName: string
  mimeType: string
  sizeBytes: number
  evidenceCategory: EvidenceCategory
  uploadedByStudentId: string
  uploadedByStudentName: string
  uploadedAt: string
}

export interface EvidenceLink {
  url: string
  linkType: EvidenceLinkType
  label: string
}

export interface ActivitySubmission {
  id: string
  projectId: string
  scheduleId: string
  activityId: string
  activitySequenceNumber: number
  activityTitle: string
  submissionScope: 'TEAM_SHARED' | 'INDIVIDUAL'
  submissionKey: string
  ownerStudentId?: string
  createdByStudentId: string
  createdByStudentName: string
  lastSubmittedByStudentId: string
  lastSubmittedByStudentName: string
  latestRevisionNumber: number
  status: ActivitySubmissionStatus
  isLate: boolean
  lateByDays: number
  firstSubmittedAt: string
  lastSubmittedAt: string
  latestFacultyFeedback?: string
  reviewedByFacultyId?: string
  reviewedByFacultyName?: string
  reviewedAt?: string
}

export interface ActivitySubmissionRevision {
  id: string
  submissionId: string
  revisionNumber: number
  submittedByStudentId: string
  submittedByStudentName: string
  submittedByIsTeamLeader: boolean
  submissionDescription: string
  evidenceFiles: EvidenceFileMeta[]
  evidenceLinks: EvidenceLink[]
  statusAtSubmission: 'SUBMITTED' | 'RESUBMITTED'
  submittedAt: string
  submittedDateIso: string
  deadlineAtSubmission: string
  isLate: boolean
  lateByDays: number
  facultyReviewOutcome?: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED'
  facultyFeedback?: string
  reviewedByFacultyId?: string
  reviewedByFacultyName?: string
  reviewedAt?: string
}

export interface ActivitySummaryItem {
  activity: ScheduledActivity
  submissionMode: 'TEAM_SHARED' | 'INDIVIDUAL'
  submissionStatus: ActivitySubmissionStatus
  timingStatus: ActivityTimingStatus
  daysRemaining: number
  isOverdueNow: boolean
  isLateSubmission: boolean
  lateByDays: number
  latestSubmission: ActivitySubmission | null
}

export interface AuthorizedWorkspace {
  schedule: ProjectSchedule
  projectDescription: string
  activities: ActivitySummaryItem[]
}

export interface ActivityDetailResponse {
  schedule: {
    id: string
    projectId: string
    projectTitle: string
    department: string
    academicYear: string
    templateName: string
    templateVersion: number
    facultyGuideId: string
    facultyGuideName: string
    assignedStudents: AssignedStudent[]
    status: string
  }
  projectDescription: string
  activity: ScheduledActivity
  submissionMode: 'TEAM_SHARED' | 'INDIVIDUAL'
  submissionStatus: ActivitySubmissionStatus
  timingStatus: ActivityTimingStatus
  daysRemaining: number
  isOverdueNow: boolean
  isLateSubmission: boolean
  lateByDays: number
  submission: ActivitySubmission | null
  revisions: ActivitySubmissionRevision[]
  individualSubmissions?: ActivitySubmission[]
  permissions: {
    canSubmitInitial: boolean
    canResubmit: boolean
    canModifyOfficialSchedule: boolean
  }
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, res.status, fallback))
  }
  return json.data as T
}

function buildSubmissionFormData(params: {
  description: string
  links: EvidenceLink[]
  files: Array<{ file: File; category: EvidenceCategory }>
}): FormData {
  const formData = new FormData()
  formData.append('description', params.description)
  formData.append('links', JSON.stringify(params.links))
  formData.append(
    'evidenceCategories',
    JSON.stringify(params.files.map((item) => item.category))
  )
  for (const item of params.files) {
    formData.append('files', item.file)
  }
  return formData
}

export const activitySubmissionApiService = {
  async listWorkspaces(): Promise<AuthorizedWorkspace[]> {
    const res = await fetch(`${getBase()}/workspaces`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load student project workspaces')
  },

  async getWorkspace(scheduleId: string): Promise<AuthorizedWorkspace> {
    const res = await fetch(`${getBase()}/workspaces/${scheduleId}`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load project workspace')
  },

  async getActivityDetail(scheduleId: string, activityId: string): Promise<ActivityDetailResponse> {
    const res = await fetch(`${getBase()}/workspaces/${scheduleId}/activities/${activityId}`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load scheduled activity details')
  },

  async submitEvidence(
    scheduleId: string,
    activityId: string,
    params: {
      description: string
      links: EvidenceLink[]
      files: Array<{ file: File; category: EvidenceCategory }>
    }
  ): Promise<{ submission: ActivitySubmission; revision: ActivitySubmissionRevision }> {
    const formData = buildSubmissionFormData(params)
    const res = await fetch(`${getBase()}/workspaces/${scheduleId}/activities/${activityId}/submit`, {
      method: 'POST',
      headers: getApiHeaders({}, false),
      body: formData,
    })
    return parseJson(res, 'Failed to submit activity evidence')
  },

  async resubmitEvidence(
    scheduleId: string,
    activityId: string,
    params: {
      description: string
      links: EvidenceLink[]
      files: Array<{ file: File; category: EvidenceCategory }>
    }
  ): Promise<{ submission: ActivitySubmission; revision: ActivitySubmissionRevision }> {
    const formData = buildSubmissionFormData(params)
    const res = await fetch(`${getBase()}/workspaces/${scheduleId}/activities/${activityId}/resubmit`, {
      method: 'POST',
      headers: getApiHeaders({}, false),
      body: formData,
    })
    return parseJson(res, 'Failed to resubmit revised evidence')
  },

  /**
   * Downloads or previews an authenticated private file without public static URLs.
   */
  async fetchPrivateFileBlob(fileId: string, download = false): Promise<Blob> {
    const query = download ? '?download=true' : ''
    const res = await fetch(`${getBase()}/files/${fileId}${query}`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(extractApiErrorMessage(json, res.status, 'Failed to retrieve evidence file'))
    }
    return res.blob()
  },
}
