import type { AuthUser } from '../../middleware/auth.middleware.js'
import { UserRepository } from '../auth/user.model.js'
import type {
  INotification,
  NotificationCategory,
} from '../connections/connection.types.js'
import {
  attemptOptionalEmailDelivery,
  getEmailConfigurationStatus,
} from './notification.delivery.js'
import {
  DispatchLogRepository,
  NotificationCentreRepository,
  ReminderJobRunRepository,
  ReminderPolicyRepository,
  UserNotificationPrefsRepository,
} from './notification.model.js'
import type {
  DispatchAcademicNotificationInput,
  IReminderPolicyConfig,
  IUserNotificationPreferences,
} from './notification.types.js'

const MAX_FAILURE_RETRIES = 3

function httpError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

function isCategoryEnabledByPreference(
  category: NotificationCategory,
  prefs: IUserNotificationPreferences
): boolean {
  if (!prefs.inAppEnabled) return false
  switch (category) {
    case 'ACTIVITY':
      return prefs.activityReminders
    case 'WEEKLY_REPORT':
      return prefs.weeklyReportReminders
    case 'SUBMISSION':
      return prefs.submissionUpdates
    case 'REVIEW':
      return prefs.reviewUpdates
    case 'SCHEDULE':
      return prefs.scheduleUpdates
    default:
      return true
  }
}

export class AcademicNotificationService {
  async listNotifications(
    actor: AuthUser,
    opts: {
      page?: number
      limit?: number
      unreadOnly?: boolean
      category?: NotificationCategory
    }
  ) {
    return NotificationCentreRepository.queryPaginated({
      recipientId: actor.id,
      page: opts.page || 1,
      limit: opts.limit || 15,
      unreadOnly: opts.unreadOnly,
      category: opts.category,
    })
  }

  async getUnreadCount(actor: AuthUser): Promise<number> {
    return NotificationCentreRepository.countUnread(actor.id)
  }

  async markAsRead(actor: AuthUser, notificationId: string): Promise<void> {
    const existing = await NotificationCentreRepository.findById(notificationId)
    if (existing && existing.recipientId !== actor.id) {
      throw httpError(403, 'FORBIDDEN', 'You can only update your own notifications.')
    }
    const updated = await NotificationCentreRepository.markRead(notificationId, actor.id)
    if (!updated) {
      throw httpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.')
    }
  }

  async markAllAsRead(actor: AuthUser): Promise<number> {
    return NotificationCentreRepository.markAllRead(actor.id)
  }

  async clearHistory(actor: AuthUser): Promise<number> {
    return NotificationCentreRepository.clearHistory(actor.id)
  }

  async getUserPreferences(actor: AuthUser): Promise<IUserNotificationPreferences> {
    return UserNotificationPrefsRepository.getForUser(actor.id)
  }

  async updateUserPreferences(
    actor: AuthUser,
    updates: Partial<
      Pick<
        IUserNotificationPreferences,
        | 'inAppEnabled'
        | 'emailEnabled'
        | 'activityReminders'
        | 'weeklyReportReminders'
        | 'submissionUpdates'
        | 'reviewUpdates'
        | 'scheduleUpdates'
      >
    >
  ): Promise<IUserNotificationPreferences> {
    return UserNotificationPrefsRepository.updateForUser(actor.id, updates)
  }

  async getReminderPolicy(): Promise<IReminderPolicyConfig> {
    return ReminderPolicyRepository.getOrInitGlobal()
  }

  async updateReminderPolicy(
    actor: AuthUser,
    updates: Partial<
      Pick<
        IReminderPolicyConfig,
        | 'activityDaysBefore'
        | 'activityOverdueEnabled'
        | 'activityOverdueGraceDays'
        | 'weeklyReportDaysBefore'
        | 'weeklyReportOverdueEnabled'
        | 'schedulerIntervalMinutes'
      >
    >
  ): Promise<IReminderPolicyConfig> {
    if (actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Only administrators can update reminder engine thresholds.')
    }
    return ReminderPolicyRepository.updateGlobal(updates, actor.id)
  }

  async getDeliveryStatus(actor: AuthUser) {
    if (actor.role !== 'admin' && actor.role !== 'faculty') {
      throw httpError(403, 'FORBIDDEN', 'Delivery diagnostics require faculty or admin role.')
    }
    const [emailStatus, latestRun, policy] = await Promise.all([
      Promise.resolve(getEmailConfigurationStatus()),
      ReminderJobRunRepository.getLatest(),
      ReminderPolicyRepository.getOrInitGlobal(),
    ])
    return {
      emailChannel: emailStatus,
      latestReminderRun: latestRun,
      policy,
    }
  }

  /**
   * Central deduplicated dispatcher used across Schedule Manager, Activity Submissions,
   * Weekly Reports, and the Scheduled Reminder Engine.
   */
  async dispatchAcademicNotification(input: DispatchAcademicNotificationInput): Promise<{
    dispatched: boolean
    deduped: boolean
    skippedByPreference: boolean
    notification?: INotification
    emailStatus: 'NOT_CONFIGURED' | 'SKIPPED' | 'SENT' | 'FAILED'
  }> {
    if (input.deduplicationKey) {
      const priorLog = await DispatchLogRepository.findByKey(input.deduplicationKey)
      if (priorLog) {
        if (
          priorLog.deliveryStatus === 'DELIVERED' ||
          priorLog.deliveryStatus === 'SKIPPED_PREFERENCE' ||
          priorLog.failureCount >= MAX_FAILURE_RETRIES
        ) {
          return {
            dispatched: false,
            deduped: true,
            skippedByPreference: false,
            emailStatus: priorLog.emailStatus,
          }
        }
      }
    }

    const prefs = await UserNotificationPrefsRepository.getForUser(input.recipientId)
    if (!isCategoryEnabledByPreference(input.category, prefs)) {
      if (input.deduplicationKey) {
        await DispatchLogRepository.upsert({
          deduplicationKey: input.deduplicationKey,
          recipientId: input.recipientId,
          scheduleId: input.scheduleId || '',
          projectId: input.projectId || '',
          entityType: input.entityType || 'ACTIVITY',
          entityId: input.entityId || '',
          reminderType: input.type,
          deadlineVersion: input.deadlineVersion || 1,
          targetDeadline: input.targetDeadline || '',
          deliveryStatus: 'SKIPPED_PREFERENCE',
          emailStatus: 'SKIPPED',
          failureCount: 0,
          lastAttemptAt: new Date(),
        })
      }
      return {
        dispatched: false,
        deduped: false,
        skippedByPreference: true,
        emailStatus: 'SKIPPED',
      }
    }

    let emailStatus: 'NOT_CONFIGURED' | 'SKIPPED' | 'SENT' | 'FAILED' = 'NOT_CONFIGURED'
    let deliveryError: string | undefined

    if (input.sendOptionalEmail && prefs.emailEnabled) {
      const recipient = await UserRepository.findById(input.recipientId)
      if (recipient?.email) {
        const res = await attemptOptionalEmailDelivery({
          to: recipient.email,
          subject: `[CampusProjectHub] ${input.title}`,
          text: `${input.message}\n\nProject: ${input.projectTitle || input.projectId || ''}`,
        })
        emailStatus = res.status
        deliveryError = res.error
      } else {
        emailStatus = 'SKIPPED'
      }
    } else if (!prefs.emailEnabled) {
      emailStatus = 'SKIPPED'
    }

    try {
      const notification = await NotificationCentreRepository.create({
        recipientId: input.recipientId,
        type: input.type,
        category: input.category,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        deduplicationKey: input.deduplicationKey,
        deadlineVersion: input.deadlineVersion,
        deliveryStatus: 'DELIVERED',
        emailDeliveryStatus: emailStatus,
        deliveryError,
        data: {
          ...input.data,
          projectId: input.projectId || input.data?.projectId,
          projectTitle: input.projectTitle || input.data?.projectTitle,
          scheduleId: input.scheduleId || input.data?.scheduleId,
        },
      })

      if (input.deduplicationKey) {
        await DispatchLogRepository.upsert({
          deduplicationKey: input.deduplicationKey,
          recipientId: input.recipientId,
          scheduleId: input.scheduleId || '',
          projectId: input.projectId || '',
          entityType: input.entityType || 'ACTIVITY',
          entityId: input.entityId || '',
          reminderType: input.type,
          deadlineVersion: input.deadlineVersion || 1,
          targetDeadline: input.targetDeadline || '',
          deliveryStatus: 'DELIVERED',
          emailStatus,
          failureCount: emailStatus === 'FAILED' ? 1 : 0,
          lastAttemptAt: new Date(),
          errorMessage: deliveryError,
        })
      }

      return {
        dispatched: true,
        deduped: false,
        skippedByPreference: false,
        notification,
        emailStatus,
      }
    } catch (err: any) {
      if (err?.code === 11000 && input.deduplicationKey) {
        return {
          dispatched: false,
          deduped: true,
          skippedByPreference: false,
          emailStatus,
        }
      }

      if (input.deduplicationKey) {
        const prior = await DispatchLogRepository.findByKey(input.deduplicationKey)
        await DispatchLogRepository.upsert({
          deduplicationKey: input.deduplicationKey,
          recipientId: input.recipientId,
          scheduleId: input.scheduleId || '',
          projectId: input.projectId || '',
          entityType: input.entityType || 'ACTIVITY',
          entityId: input.entityId || '',
          reminderType: input.type,
          deadlineVersion: input.deadlineVersion || 1,
          targetDeadline: input.targetDeadline || '',
          deliveryStatus: 'FAILED',
          emailStatus: emailStatus === 'SENT' ? 'SENT' : 'FAILED',
          failureCount: (prior?.failureCount || 0) + 1,
          lastAttemptAt: new Date(),
          errorMessage: err?.message || 'Failed to persist notification',
        })
      }
      throw err
    }
  }
}

export const academicNotificationService = new AcademicNotificationService()
