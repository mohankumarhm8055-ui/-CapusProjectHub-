import type { IEvidenceFileMeta } from '../activity-submissions/submission.types.js'
import type { IProjectModule, ITechnologyItem } from '../repository/project.model.js'

export type FinalLifecycleStatus =
  | 'NOT_READY'
  | 'FINAL_REVIEW_PENDING'
  | 'CORRECTIONS_REQUIRED'
  | 'COMPLETION_APPROVED'
  | 'PUBLICATION_DRAFT'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'ARCHIVED'

export interface IFinalDeliverableConfig {
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
  updatedAt: Date
}

export interface IFinalMetadataPayload {
  title: string
  abstract: string
  problemStatement: string
  objectives: string[]
  proposedSolution: string
  modules: IProjectModule[]
  technologyStack: ITechnologyItem[]
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

export interface IFinalSubmissionSnapshot {
  revisionNumber: number
  submittedByStudentId: string
  submittedByStudentName: string
  submittedAt: Date
  isFinalReviewRequest: boolean
  metadata: IFinalMetadataPayload
  finalReportFiles: IEvidenceFileMeta[]
  presentationFiles: IEvidenceFileMeta[]
  architectureDiagramFiles: IEvidenceFileMeta[]
  screenshotFiles: IEvidenceFileMeta[]
  supportingFiles: IEvidenceFileMeta[]
}

export interface IFinalFacultyFeedback {
  feedbackId: string
  facultyId: string
  facultyName: string
  action: 'ADD_FEEDBACK' | 'REQUEST_CORRECTIONS' | 'APPROVE_COMPLETION'
  comment: string
  revisionNumber: number
  createdAt: Date
}

export interface IPublicationDraft {
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
  modules: IProjectModule[]
  technologyStack: ITechnologyItem[]
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
  updatedByFacultyId: string
  updatedAt: Date
}

export interface IFinalLifecycleAuditEntry {
  entryId: string
  action:
    | 'FINAL_DRAFT_SAVED'
    | 'FINAL_SUBMITTED_FOR_REVIEW'
    | 'FINAL_FEEDBACK_ADDED'
    | 'FINAL_CORRECTIONS_REQUESTED'
    | 'FINAL_COMPLETION_APPROVED'
    | 'PUBLICATION_DRAFT_SAVED'
    | 'PROJECT_PUBLISHED'
    | 'PROJECT_UNPUBLISHED'
    | 'PROJECT_ARCHIVED'
  actorId: string
  actorName: string
  actorRole: string
  previousStatus: FinalLifecycleStatus
  newStatus: FinalLifecycleStatus
  comment?: string
  revisionNumber?: number
  timestamp: Date
}

export interface IFinalProjectLifecycle {
  id: string
  scheduleId: string
  projectId: string
  status: FinalLifecycleStatus
  latestRevisionNumber: number
  draftSubmission?: Omit<IFinalSubmissionSnapshot, 'revisionNumber' | 'submittedAt' | 'isFinalReviewRequest'> & {
    updatedByStudentId: string
    updatedByStudentName: string
    updatedAt: Date
  }
  finalSubmissionRevisions: IFinalSubmissionSnapshot[]
  facultyFeedback: IFinalFacultyFeedback[]
  completionApprovedAt?: Date
  completionApprovedByFacultyId?: string
  completionApprovedByFacultyName?: string
  publicationDraft?: IPublicationDraft
  publishedAt?: Date
  publishedByFacultyId?: string
  publishedByFacultyName?: string
  unpublishedAt?: Date
  unpublishedReason?: string
  archivedAt?: Date
  archivedReason?: string
  auditHistory: IFinalLifecycleAuditEntry[]
  createdAt: Date
  updatedAt: Date
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
