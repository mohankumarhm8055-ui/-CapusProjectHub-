import type {
  INotification,
  NotificationCategory,
  NotificationType,
} from '../connections/connection.types.js'

export interface IReminderPolicyConfig {
  id: string
  configKey: 'GLOBAL'
  activityDaysBefore: number[] // Default [3, 1, 0]
  activityOverdueEnabled: boolean
  activityOverdueGraceDays: number // Default 1 (>= 1 day past deadline)
  weeklyReportDaysBefore: number[] // Default [2, 0]
  weeklyReportOverdueEnabled: boolean
  schedulerIntervalMinutes: number
  updatedBy?: string
  updatedAt: Date
}

export interface IUserNotificationPreferences {
  id: string
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  activityReminders: boolean
  weeklyReportReminders: boolean
  submissionUpdates: boolean
  reviewUpdates: boolean
  scheduleUpdates: boolean
  updatedAt: Date
}

export interface INotificationDispatchLog {
  id: string
  deduplicationKey: string
  recipientId: string
  scheduleId: string
  projectId: string
  entityType: 'ACTIVITY' | 'WEEKLY_REPORT' | 'SCHEDULE' | 'SUBMISSION'
  entityId: string
  reminderType: NotificationType
  deadlineVersion: number
  targetDeadline: string
  deliveryStatus: 'DELIVERED' | 'FAILED' | 'SKIPPED_PREFERENCE'
  emailStatus: 'NOT_CONFIGURED' | 'SKIPPED' | 'SENT' | 'FAILED'
  failureCount: number
  lastAttemptAt: Date
  errorMessage?: string
}

export interface IReminderJobRun {
  id: string
  startedAt: Date
  finishedAt?: Date
  referenceDateIso: string
  triggerSource: 'STARTUP' | 'INTERVAL' | 'MANUAL'
  scannedSchedules: number
  dispatchedCount: number
  dedupedCount: number
  failedCount: number
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string
}

export interface DispatchAcademicNotificationInput {
  recipientId: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  actionUrl?: string
  deduplicationKey?: string
  deadlineVersion?: number
  scheduleId?: string
  projectId?: string
  projectTitle?: string
  entityType?: 'ACTIVITY' | 'WEEKLY_REPORT' | 'SCHEDULE' | 'SUBMISSION'
  entityId?: string
  targetDeadline?: string
  sendOptionalEmail?: boolean
  data?: INotification['data']
}
