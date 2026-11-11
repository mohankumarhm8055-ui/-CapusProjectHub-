export type ConnectionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'BLOCKED'

export type MentorshipPurpose =
  | 'UNDERSTAND_PROJECT'
  | 'LEARN_TECH_STACK'
  | 'UNDERSTAND_ARCHITECTURE'
  | 'ACCESS_DOCUMENTATION'
  | 'EXPLORE_ENHANCEMENTS'
  | 'SEEK_MENTORSHIP'
  | 'DISCUSS_EXTENSION'

export const VALID_MENTORSHIP_PURPOSES: MentorshipPurpose[] = [
  'UNDERSTAND_PROJECT',
  'LEARN_TECH_STACK',
  'UNDERSTAND_ARCHITECTURE',
  'ACCESS_DOCUMENTATION',
  'EXPLORE_ENHANCEMENTS',
  'SEEK_MENTORSHIP',
  'DISCUSS_EXTENSION',
]

export interface IStudentProfile {
  studentId: string
  displayName: string
  department: string
  graduationYear: number | string
  isAvailableForMentoring: boolean
  skills: string[]
  bio?: string
  email?: string
  phone?: string
  allowContactMethod?: 'IN_APP_ONLY' | 'EMAIL_ON_ACCEPT'
  activeProjectsCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface IPublicStudentProfile {
  studentId: string
  displayName: string
  department: string
  graduationYear: number | string
  isAvailableForMentoring: boolean
  skills: string[]
  bio?: string
  allowContactMethod?: 'IN_APP_ONLY' | 'EMAIL_ON_ACCEPT'
}

export interface IConnectionRequest {
  id: string
  projectId: string
  projectTitle: string
  juniorId: string
  juniorName: string
  seniorId: string
  seniorName: string
  purpose: MentorshipPurpose
  note: string
  status: ConnectionStatus
  declinedReason?: string
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  closedAt?: Date
  closedBy?: string
}

export interface IMentorshipMessage {
  id: string
  connectionId: string
  senderId: string
  senderName: string
  senderRole: 'junior' | 'senior'
  content: string
  read: boolean
  createdAt: Date
}

export type NotificationType =
  | 'CONNECTION_REQUEST_RECEIVED'
  | 'CONNECTION_REQUEST_ACCEPTED'
  | 'CONNECTION_REQUEST_DECLINED'
  | 'CONNECTION_CANCELLED'
  | 'CONNECTION_BLOCKED'
  | 'NEW_MESSAGE_RECEIVED'
  | 'SCHEDULE_PUBLISHED'
  | 'SCHEDULE_DEADLINE_UPDATED'
  | 'SCHEDULE_REQUIREMENTS_UPDATED'
  | 'ACTIVITY_DEADLINE_UPCOMING'
  | 'ACTIVITY_DUE_TOMORROW'
  | 'ACTIVITY_DUE_TODAY'
  | 'ACTIVITY_OVERDUE'
  | 'ACTIVITY_DEADLINE_REVISED'
  | 'WEEKLY_REPORT_APPROACHING'
  | 'WEEKLY_REPORT_DUE'
  | 'WEEKLY_REPORT_OVERDUE'
  | 'ACTIVITY_SUBMISSION_RECEIVED'
  | 'ACTIVITY_SENT_FOR_REVIEW'
  | 'WEEKLY_REPORT_SUBMITTED'
  | 'SUBMISSION_CHANGES_REQUESTED'
  | 'SUBMISSION_FEEDBACK_ADDED'
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_REJECTED'
  | 'WEEKLY_REPORT_CLARIFICATION_REQUESTED'
  | 'WEEKLY_REPORT_FINALIZED'
  | 'FINAL_REVIEW_REQUESTED'
  | 'FINAL_CORRECTIONS_REQUIRED'
  | 'FINAL_COMPLETION_APPROVED'
  | 'PUBLICATION_DRAFT_READY'
  | 'PROJECT_PUBLISHED'

export type NotificationCategory =
  | 'ACTIVITY'
  | 'WEEKLY_REPORT'
  | 'SUBMISSION'
  | 'REVIEW'
  | 'SCHEDULE'
  | 'PUBLICATION'
  | 'MENTORSHIP'

export interface INotification {
  id: string
  recipientId: string
  type: NotificationType
  category?: NotificationCategory
  title: string
  message: string
  actionUrl?: string
  deduplicationKey?: string
  deadlineVersion?: number
  deliveryStatus?: 'DELIVERED' | 'PENDING' | 'FAILED' | 'SKIPPED_PREFERENCE'
  emailDeliveryStatus?: 'NOT_CONFIGURED' | 'SKIPPED' | 'SENT' | 'FAILED'
  deliveryError?: string
  cleared?: boolean
  data?: {
    connectionId?: string
    projectId?: string
    projectTitle?: string
    scheduleId?: string
    activityId?: string
    reportId?: string
    submissionId?: string
    weekNumber?: number
    senderId?: string
    senderName?: string
  }
  read: boolean
  createdAt: Date
}
