import type {
  EvidenceCategory,
  EvidenceFileMeta,
  EvidenceLink,
} from './activitySubmissionApiService'
import type { ProjectSchedule } from './scheduleApiService'
import { extractApiErrorMessage, getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/weekly-reports`

export type WeeklyReportStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CLARIFICATION_REQUESTED'
  | 'FINALIZED'
  | 'OVERDUE'

export type WeeklyReminderSignal =
  | 'NONE'
  | 'APPROACHING_DEADLINE'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'CLARIFICATION_REQUESTED'

export interface WeeklyReportingPeriod {
  weekNumber: number
  teamId: string
  scheduleId: string
  projectId: string
  reportingPeriodStart: string
  reportingPeriodEnd: string
  reportingDeadline: string
  workingDaysCount: number
  overlappingActivities: Array<{
    activityId: string
    sequenceNumber: number
    title: string
    deadline: string
    weeklyUpdateRequired: boolean
  }>
}

export interface WeeklyIndividualContribution {
  contributionId: string
  studentId: string
  studentName: string
  usnOrEmployeeId?: string
  isTeamLeader?: boolean
  workPerformed: string
  relatedActivityId?: string
  relatedActivityTitle?: string
  supportingEvidenceNote?: string
  evidenceLinks: EvidenceLink[]
  evidenceFiles: EvidenceFileMeta[]
  verificationLabel: 'STUDENT_REPORTED'
  updatedAt: string
}

export interface WeeklyReportRevision {
  revisionNumber: number
  submittedByStudentId: string
  submittedByStudentName: string
  submittedAt: string
  submittedDateIso: string
  isLateSubmission: boolean
  lateByDays: number
  workCompleted: string
  workInProgress: string
  challengesOrBlockers: string
  planForNextWeek: string
  supportingEvidenceNotes: string
  evidenceFiles: EvidenceFileMeta[]
  evidenceLinks: EvidenceLink[]
  contributionsSnapshot: WeeklyIndividualContribution[]
}

export type WeeklyFacultyReviewAction =
  | 'COMMENT'
  | 'MARK_UNDER_REVIEW'
  | 'REQUEST_CLARIFICATION'
  | 'FINALIZE'

export interface WeeklyReportFacultyComment {
  commentId: string
  facultyId: string
  facultyName: string
  action: WeeklyFacultyReviewAction
  comment: string
  targetRevisionNumber?: number
  createdAt: string
}

export interface WeeklyProgressReport {
  id: string
  projectId: string
  scheduleId: string
  teamId: string
  weekNumber: number
  reportingPeriodStart: string
  reportingPeriodEnd: string
  reportingDeadline: string
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CLARIFICATION_REQUESTED' | 'FINALIZED'
  workCompleted: string
  workInProgress: string
  challengesOrBlockers: string
  planForNextWeek: string
  supportingEvidenceNotes: string
  evidenceFiles: EvidenceFileMeta[]
  evidenceLinks: EvidenceLink[]
  contributions: WeeklyIndividualContribution[]
  submittedAt?: string
  lastSubmittedAt?: string
  submittedByStudentId?: string
  submittedByStudentName?: string
  isLateSubmission: boolean
  lateByDays: number
  latestRevisionNumber: number
  revisions: WeeklyReportRevision[]
  facultyComments: WeeklyReportFacultyComment[]
  finalizedAt?: string
  finalizedByFacultyId?: string
  finalizedByFacultyName?: string
}

export interface EnrichedWeeklyPeriod {
  period: WeeklyReportingPeriod
  report: WeeklyProgressReport | null
  effectiveStatus: WeeklyReportStatus
  daysUntilDeadline: number
  isOverdueNow: boolean
  isPendingSubmission: boolean
  reminderSignal: WeeklyReminderSignal
  isCurrentWeek: boolean
}

export interface WeeklyWorkspaceSummary {
  schedule: ProjectSchedule
  teamId: string
  currentWeekNumber: number | null
  weeks: EnrichedWeeklyPeriod[]
  pendingWeeksCount: number
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, res.status, fallback))
  }
  return json.data as T
}

function buildReportFormData(params: {
  workCompleted: string
  workInProgress: string
  challengesOrBlockers: string
  planForNextWeek: string
  supportingEvidenceNotes: string
  links: EvidenceLink[]
  files: Array<{ file: File; category: EvidenceCategory }>
  retainFileIds?: string[]
}): FormData {
  const formData = new FormData()
  formData.append('workCompleted', params.workCompleted)
  formData.append('workInProgress', params.workInProgress)
  formData.append('challengesOrBlockers', params.challengesOrBlockers)
  formData.append('planForNextWeek', params.planForNextWeek)
  formData.append('supportingEvidenceNotes', params.supportingEvidenceNotes)
  formData.append('links', JSON.stringify(params.links))
  formData.append(
    'evidenceCategories',
    JSON.stringify(params.files.map((item) => item.category))
  )
  if (params.retainFileIds !== undefined) {
    formData.append('retainFileIds', JSON.stringify(params.retainFileIds))
  }
  for (const item of params.files) {
    formData.append('files', item.file)
  }
  return formData
}

export const weeklyReportApiService = {
  async listWorkspaces(): Promise<WeeklyWorkspaceSummary[]> {
    const res = await fetch(`${getBase()}/workspaces`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load weekly reporting workspaces')
  },

  async getProjectReports(scheduleId: string): Promise<WeeklyWorkspaceSummary> {
    const res = await fetch(`${getBase()}/projects/${scheduleId}`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load project weekly reports')
  },

  async saveDraft(
    scheduleId: string,
    weekNumber: number,
    params: {
      workCompleted: string
      workInProgress: string
      challengesOrBlockers: string
      planForNextWeek: string
      supportingEvidenceNotes: string
      links: EvidenceLink[]
      files: Array<{ file: File; category: EvidenceCategory }>
      retainFileIds?: string[]
    }
  ): Promise<WeeklyProgressReport> {
    const res = await fetch(`${getBase()}/projects/${scheduleId}/weeks/${weekNumber}/draft`, {
      method: 'PUT',
      headers: getApiHeaders({}, false),
      body: buildReportFormData(params),
    })
    return parseJson(res, 'Failed to save weekly report draft')
  },

  async submitReport(
    scheduleId: string,
    weekNumber: number,
    params: {
      workCompleted: string
      workInProgress: string
      challengesOrBlockers: string
      planForNextWeek: string
      supportingEvidenceNotes: string
      links: EvidenceLink[]
      files: Array<{ file: File; category: EvidenceCategory }>
      retainFileIds?: string[]
    }
  ): Promise<WeeklyProgressReport> {
    const res = await fetch(`${getBase()}/projects/${scheduleId}/weeks/${weekNumber}/submit`, {
      method: 'POST',
      headers: getApiHeaders({}, false),
      body: buildReportFormData(params),
    })
    return parseJson(res, 'Failed to submit weekly report')
  },

  async upsertContribution(
    scheduleId: string,
    weekNumber: number,
    params: {
      workPerformed: string
      relatedActivityId?: string
      supportingEvidenceNote?: string
      links: EvidenceLink[]
      files: Array<{ file: File; category: EvidenceCategory }>
    }
  ): Promise<WeeklyProgressReport> {
    const formData = new FormData()
    formData.append('workPerformed', params.workPerformed)
    if (params.relatedActivityId) formData.append('relatedActivityId', params.relatedActivityId)
    if (params.supportingEvidenceNote) {
      formData.append('supportingEvidenceNote', params.supportingEvidenceNote)
    }
    formData.append('links', JSON.stringify(params.links))
    formData.append(
      'evidenceCategories',
      JSON.stringify(params.files.map((item) => item.category))
    )
    for (const item of params.files) {
      formData.append('files', item.file)
    }

    const res = await fetch(
      `${getBase()}/projects/${scheduleId}/weeks/${weekNumber}/contributions`,
      {
        method: 'POST',
        headers: getApiHeaders({}, false),
        body: formData,
      }
    )
    return parseJson(res, 'Failed to save individual contribution entry')
  },

  async reviewReport(
    reportId: string,
    payload: { action: WeeklyFacultyReviewAction; comment: string }
  ): Promise<WeeklyProgressReport> {
    const res = await fetch(`${getBase()}/${reportId}/review`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseJson(res, 'Failed to submit faculty review action')
  },

  async fetchPrivateFileBlob(fileId: string, download = false): Promise<Blob> {
    const query = download ? '?download=true' : ''
    const res = await fetch(`${getBase()}/files/${fileId}${query}`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(extractApiErrorMessage(json, res.status, 'Failed to load private file'))
    }
    return res.blob()
  },
}
