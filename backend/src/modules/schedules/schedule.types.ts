export type EvidenceFormat =
  | 'PDF_DOCUMENT'
  | 'REPOSITORY_LINK'
  | 'DESIGN_FILE'
  | 'DEMO_VIDEO'
  | 'TEST_REPORT'
  | 'PRESENTATION_SLIDES'
  | 'SUMMARY_NOTE'

export type ActivitySubmissionMode = 'TEAM_SHARED' | 'INDIVIDUAL'

export type ActivityLifecycleStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export type ActivityFacultyReviewStatus =
  | 'NOT_REVIEWED'
  | 'PENDING'
  | 'APPROVED'
  | 'REVISION_REQUIRED'
  | 'REJECTED'

export type ProjectScheduleStatus = 'DRAFT' | 'PUBLISHED'

export interface ITemplateActivityDefault {
  sequenceNumber: number
  title: string
  description: string
  suggestedDurationDays: number
  isMandatory: boolean
  requiredDeliverables: string
  evidenceTypes: EvidenceFormat[]
  weeklyUpdateRequired: boolean
  studentUpdateInstructions: string
  submissionMode?: ActivitySubmissionMode
}

export interface IScheduleTemplate {
  id: string
  code: string
  name: string
  description: string
  targetDurationWeeks: number
  activeVersion: number
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface IScheduleTemplateVersion {
  id: string
  templateId: string
  templateCode: string
  version: number
  changelog: string
  activities: ITemplateActivityDefault[]
  createdBy: string
  createdAt: Date
}

export interface IHolidayEntry {
  date: string // YYYY-MM-DD
  label: string
}

export interface IAcademicCalendarConfig {
  timezone: string // Date-only normalized strategy ('UTC_DATE_ONLY' / e.g. 'Asia/Kolkata')
  projectStartDate: string // YYYY-MM-DD
  workingDays: number[] // 0=Sun..6=Sat (default [1,2,3,4,5])
  holidays: IHolidayEntry[]
}

export interface IAssignedStudent {
  studentId: string
  fullName: string
  department?: string
  usnOrEmployeeId?: string
  isTeamLeader?: boolean
}

export interface IScheduledActivity {
  activityId: string
  sequenceNumber: number
  title: string
  description: string
  startDate: string // YYYY-MM-DD
  deadline: string // YYYY-MM-DD
  isMandatory: boolean
  requiredSubmissionDescription: string
  acceptedEvidenceFormats: EvidenceFormat[]
  weeklyUpdateRequired: boolean
  studentUpdateInstructions: string
  submissionMode?: ActivitySubmissionMode
  activityStatus: ActivityLifecycleStatus
  facultyReviewStatus: ActivityFacultyReviewStatus
}

export interface IPublishedBaselineSnapshot {
  version: number
  publishedAt: Date
  publishedBy: string
  calendarConfig: IAcademicCalendarConfig
  activities: IScheduledActivity[]
}

export interface IProjectSchedule {
  id: string
  projectId: string
  projectTitle: string
  department: string
  academicYear: string
  templateId: string
  templateCode: string
  templateName: string
  templateVersion: number
  facultyGuideId: string
  facultyGuideName: string
  createdByFacultyId: string
  assignedStudentIds: string[]
  assignedStudents: IAssignedStudent[]
  status: ProjectScheduleStatus
  version: number
  calendarConfig: IAcademicCalendarConfig
  activities: IScheduledActivity[]
  initialPublishedSnapshot?: IPublishedBaselineSnapshot
  publishedAt?: Date
  publishedBy?: string
  createdAt: Date
  updatedAt: Date
}

export type ScheduleChangeType =
  | 'INITIAL_PUBLISHED'
  | 'DEADLINE_UPDATED'
  | 'ACTIVITY_UPDATED'
  | 'CALENDAR_UPDATED'
  | 'TEAM_UPDATED'

export interface IScheduleChangeHistory {
  id: string
  scheduleId: string
  projectId: string
  versionNumber: number
  changeType: ScheduleChangeType
  changedById: string
  changedByName: string
  changedByRole: string
  activityId?: string
  activityTitle?: string
  field: string
  previousValue: string
  newValue: string
  reason: string
  notifiedStudentIds: string[]
  createdAt: Date
}

export interface ScheduleDateWarning {
  activityId?: string
  sequenceNumber?: number
  activityTitle?: string
  field: 'startDate' | 'deadline'
  date: string
  reason: string
}
