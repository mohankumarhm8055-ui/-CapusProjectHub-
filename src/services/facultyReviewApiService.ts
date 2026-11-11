import type {
  ActivitySubmission,
  ActivitySubmissionRevision,
  ActivitySubmissionStatus,
} from './activitySubmissionApiService'
import type { AssignedStudent, ScheduledActivity } from './scheduleApiService'
import { extractApiErrorMessage, getApiBaseUrl, getApiHeaders } from './sessionService'
import type {
  WeeklyFacultyReviewAction,
  WeeklyProgressReport,
  WeeklyWorkspaceSummary,
} from './weeklyReportApiService'

const getBase = () => `${getApiBaseUrl()}/api/faculty-review`

export type IndependentScheduleStatus = 'UPCOMING' | 'ACTIVE' | 'OVERDUE' | 'CLOSED'

export type ReviewDashboardBucket =
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'

export interface SubmissionReviewDecision {
  decisionId: string
  revisionNumber: number
  outcome: 'UNDER_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'FEEDBACK_ADDED'
  comment: string
  correctionInstructions?: string
  facultyId: string
  facultyName: string
  facultyRole: string
  createdAt: string
}

export interface FacultyDashboardItem {
  submission: ActivitySubmission & { reviewHistory?: SubmissionReviewDecision[] }
  bucket: ReviewDashboardBucket
  scheduleStatus: IndependentScheduleStatus
  projectTitle: string
  department: string
  academicYear: string
  assignedStudents: AssignedStudent[]
  originalDeadline: string
  startDate: string
  submittedDateIso: string
}

export interface FacultyReviewDashboardResponse {
  items: FacultyDashboardItem[]
  grouped: {
    pendingReview: FacultyDashboardItem[]
    underReview: FacultyDashboardItem[]
    changesRequested: FacultyDashboardItem[]
    resubmitted: FacultyDashboardItem[]
    approved: FacultyDashboardItem[]
    rejected: FacultyDashboardItem[]
  }
  weeklyWorkspaces: WeeklyWorkspaceSummary[]
  filterOptions: {
    projects: Array<{
      scheduleId: string
      projectId: string
      projectTitle: string
      assignedStudents: AssignedStudent[]
    }>
    activities: Array<{
      activityId: string
      sequenceNumber: number
      title: string
    }>
  }
}

export interface SubmissionReviewDetailResponse {
  project: {
    projectId: string
    projectTitle: string
    description: string
    department: string
    academicYear: string
    scheduleId: string
    facultyGuideName: string
    assignedStudents: AssignedStudent[]
  }
  activity: ScheduledActivity
  scheduleStatus: IndependentScheduleStatus
  reviewStatus: ActivitySubmissionStatus
  submission: ActivitySubmission & { reviewHistory?: SubmissionReviewDecision[] }
  revisions: Array<
    ActivitySubmissionRevision & {
      facultyReviewOutcome?: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
      correctionInstructions?: string
    }
  >
  reviewHistory: SubmissionReviewDecision[]
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, res.status, fallback))
  }
  return json.data as T
}

export const facultyReviewApiService = {
  async getDashboard(filters?: {
    scheduleId?: string
    projectId?: string
    activityId?: string
    status?: string
    submissionDate?: string
    teamSearch?: string
  }): Promise<FacultyReviewDashboardResponse> {
    const query = new URLSearchParams()
    if (filters?.scheduleId) query.set('scheduleId', filters.scheduleId)
    if (filters?.projectId) query.set('projectId', filters.projectId)
    if (filters?.activityId) query.set('activityId', filters.activityId)
    if (filters?.status && filters.status !== 'ALL') query.set('status', filters.status)
    if (filters?.submissionDate) query.set('submissionDate', filters.submissionDate)
    if (filters?.teamSearch) query.set('teamSearch', filters.teamSearch)

    const res = await fetch(`${getBase()}/dashboard?${query.toString()}`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load faculty review workspace')
  },

  async getSubmissionDetail(submissionId: string): Promise<SubmissionReviewDetailResponse> {
    const res = await fetch(`${getBase()}/submissions/${submissionId}`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load submission details')
  },

  async submitDecision(
    submissionId: string,
    payload: {
      outcome: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
      feedback: string
      correctionInstructions?: string
    }
  ): Promise<ActivitySubmission> {
    const res = await fetch(`${getBase()}/submissions/${submissionId}/decision`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseJson(res, 'Failed to record review decision')
  },

  async addFeedback(
    submissionId: string,
    payload: { comment: string; correctionInstructions?: string }
  ): Promise<ActivitySubmission> {
    const res = await fetch(`${getBase()}/submissions/${submissionId}/feedback`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseJson(res, 'Failed to save faculty feedback')
  },

  async reviewWeeklyReport(
    reportId: string,
    payload: { action: WeeklyFacultyReviewAction; comment: string }
  ): Promise<WeeklyProgressReport> {
    const res = await fetch(`${getBase()}/weekly-reports/${reportId}/review`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseJson(res, 'Failed to submit weekly report review')
  },
}
