import type { IEvidenceFileMeta, IEvidenceLink } from '../activity-submissions/submission.types.js'

export type PersistedWeeklyReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CLARIFICATION_REQUESTED'
  | 'FINALIZED'

export type WeeklyReportStatus = PersistedWeeklyReportStatus | 'NOT_STARTED' | 'OVERDUE'

export type WeeklyReminderSignal =
  | 'NONE'
  | 'APPROACHING_DEADLINE'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'CLARIFICATION_REQUESTED'

export interface IWeeklyReportingPeriod {
  weekNumber: number
  teamId: string
  scheduleId: string
  projectId: string
  reportingPeriodStart: string // YYYY-MM-DD
  reportingPeriodEnd: string // YYYY-MM-DD
  reportingDeadline: string // YYYY-MM-DD (configured working day)
  workingDaysCount: number
  overlappingActivities: Array<{
    activityId: string
    sequenceNumber: number
    title: string
    deadline: string
    weeklyUpdateRequired: boolean
  }>
}

export interface IWeeklyIndividualContribution {
  contributionId: string
  studentId: string
  studentName: string
  usnOrEmployeeId?: string
  isTeamLeader?: boolean
  workPerformed: string
  relatedActivityId?: string
  relatedActivityTitle?: string
  supportingEvidenceNote?: string
  evidenceLinks: IEvidenceLink[]
  evidenceFiles: IEvidenceFileMeta[]
  verificationLabel: 'STUDENT_REPORTED'
  updatedAt: Date
}

export interface IWeeklyReportRevision {
  revisionNumber: number
  submittedByStudentId: string
  submittedByStudentName: string
  submittedAt: Date
  submittedDateIso: string
  isLateSubmission: boolean
  lateByDays: number
  workCompleted: string
  workInProgress: string
  challengesOrBlockers: string
  planForNextWeek: string
  supportingEvidenceNotes: string
  evidenceFiles: IEvidenceFileMeta[]
  evidenceLinks: IEvidenceLink[]
  contributionsSnapshot: IWeeklyIndividualContribution[]
}

export type WeeklyFacultyReviewAction =
  | 'COMMENT'
  | 'MARK_UNDER_REVIEW'
  | 'REQUEST_CLARIFICATION'
  | 'FINALIZE'

export interface IWeeklyReportFacultyComment {
  commentId: string
  facultyId: string
  facultyName: string
  action: WeeklyFacultyReviewAction
  comment: string
  targetRevisionNumber?: number
  createdAt: Date
}

export interface IWeeklyProgressReport {
  id: string
  projectId: string
  scheduleId: string
  teamId: string
  weekNumber: number
  reportingPeriodStart: string
  reportingPeriodEnd: string
  reportingDeadline: string
  status: PersistedWeeklyReportStatus
  workCompleted: string
  workInProgress: string
  challengesOrBlockers: string
  planForNextWeek: string
  supportingEvidenceNotes: string
  evidenceFiles: IEvidenceFileMeta[]
  evidenceLinks: IEvidenceLink[]
  contributions: IWeeklyIndividualContribution[]
  submittedAt?: Date
  lastSubmittedAt?: Date
  submittedByStudentId?: string
  submittedByStudentName?: string
  isLateSubmission: boolean
  lateByDays: number
  latestRevisionNumber: number
  revisions: IWeeklyReportRevision[]
  facultyComments: IWeeklyReportFacultyComment[]
  finalizedAt?: Date
  finalizedByFacultyId?: string
  finalizedByFacultyName?: string
  reminderMetadata?: {
    lastEvaluatedAt?: Date
    lastSignal?: WeeklyReminderSignal
  }
  createdAt: Date
  updatedAt: Date
}
