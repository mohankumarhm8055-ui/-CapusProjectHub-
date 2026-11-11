import type { ActivitySubmissionMode } from '../schedules/schedule.types.js'

export type ActivitySubmissionStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'

export type SubmissionDecisionOutcome =
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'FEEDBACK_ADDED'

export interface ISubmissionReviewDecision {
  decisionId: string
  revisionNumber: number
  outcome: SubmissionDecisionOutcome
  comment: string
  correctionInstructions?: string
  facultyId: string
  facultyName: string
  facultyRole: string
  createdAt: Date
}

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

export interface IEvidenceFileMeta {
  fileId: string
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
  sha256: string
  evidenceCategory: EvidenceCategory
  uploadedByStudentId: string
  uploadedByStudentName: string
  uploadedAt: Date
}

export interface IEvidenceLink {
  url: string
  linkType: EvidenceLinkType
  label: string
}

export interface IActivitySubmission {
  id: string
  projectId: string
  scheduleId: string
  activityId: string
  activitySequenceNumber: number
  activityTitle: string
  submissionScope: ActivitySubmissionMode
  submissionKey: string // 'TEAM' for TEAM_SHARED or studentId for INDIVIDUAL
  ownerStudentId?: string
  createdByStudentId: string
  createdByStudentName: string
  lastSubmittedByStudentId: string
  lastSubmittedByStudentName: string
  latestRevisionNumber: number
  status: ActivitySubmissionStatus
  isLate: boolean
  lateByDays: number
  firstSubmittedAt: Date
  lastSubmittedAt: Date
  latestFacultyFeedback?: string
  reviewedByFacultyId?: string
  reviewedByFacultyName?: string
  reviewedAt?: Date
  reviewHistory?: ISubmissionReviewDecision[]
  createdAt: Date
  updatedAt: Date
}

export interface IActivitySubmissionRevision {
  id: string
  submissionId: string
  projectId: string
  scheduleId: string
  activityId: string
  revisionNumber: number
  submittedByStudentId: string
  submittedByStudentName: string
  submittedByIsTeamLeader: boolean
  submissionDescription: string
  evidenceFiles: IEvidenceFileMeta[]
  evidenceLinks: IEvidenceLink[]
  statusAtSubmission: 'SUBMITTED' | 'RESUBMITTED'
  submittedAt: Date
  submittedDateIso: string
  deadlineAtSubmission: string
  isLate: boolean
  lateByDays: number
  facultyReviewOutcome?: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
  facultyFeedback?: string
  correctionInstructions?: string
  reviewedByFacultyId?: string
  reviewedByFacultyName?: string
  reviewedAt?: Date
  createdAt: Date
}

export interface IEvidenceFileRecord {
  id: string
  fileId: string
  storageKey: string
  projectId: string
  scheduleId: string
  activityId: string
  submissionId: string
  revisionNumber: number
  sourceKind?: 'ACTIVITY_SUBMISSION' | 'WEEKLY_REPORT' | 'FINAL_DELIVERABLE'
  submissionScope: ActivitySubmissionMode
  ownerStudentId?: string
  originalName: string
  mimeType: string
  sizeBytes: number
  sha256: string
  evidenceCategory: EvidenceCategory
  uploadedByStudentId: string
  uploadedAt: Date
}
