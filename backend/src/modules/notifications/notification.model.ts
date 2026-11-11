import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import { config } from '../../config/env.js'
import {
  MongoNotificationModel,
  inMemoryNotificationStore,
} from '../connections/connection.model.js'
import type {
  INotification,
  NotificationCategory,
} from '../connections/connection.types.js'
import type {
  INotificationDispatchLog,
  IReminderJobRun,
  IReminderPolicyConfig,
  IUserNotificationPreferences,
} from './notification.types.js'

// ==========================================
// 1. Institutional Reminder Policy Schema
// ==========================================

export interface ReminderPolicyDocument
  extends Document,
    Omit<IReminderPolicyConfig, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ReminderPolicySchema = new Schema<ReminderPolicyDocument>(
  {
    configKey: { type: String, required: true, unique: true, default: 'GLOBAL' },
    activityDaysBefore: { type: [Number], default: [3, 1, 0] },
    activityOverdueEnabled: { type: Boolean, default: true },
    activityOverdueGraceDays: { type: Number, default: 1, min: 1, max: 30 },
    weeklyReportDaysBefore: { type: [Number], default: [2, 0] },
    weeklyReportOverdueEnabled: { type: Boolean, default: true },
    schedulerIntervalMinutes: {
      type: Number,
      default: config.REMINDER_INTERVAL_MINUTES,
      min: 1,
      max: 1440,
    },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

export const MongoReminderPolicyModel =
  mongoose.models.ReminderPolicyConfig ||
  mongoose.model<ReminderPolicyDocument>('ReminderPolicyConfig', ReminderPolicySchema)

// ==========================================
// 2. User Notification Preferences Schema
// ==========================================

export interface UserNotificationPrefsDocument
  extends Document,
    Omit<IUserNotificationPreferences, 'id'> {
  _id: mongoose.Types.ObjectId
}

const UserNotificationPrefsSchema = new Schema<UserNotificationPrefsDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    inAppEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    activityReminders: { type: Boolean, default: true },
    weeklyReportReminders: { type: Boolean, default: true },
    submissionUpdates: { type: Boolean, default: true },
    reviewUpdates: { type: Boolean, default: true },
    scheduleUpdates: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const MongoUserNotificationPrefsModel =
  mongoose.models.UserNotificationPreferences ||
  mongoose.model<UserNotificationPrefsDocument>(
    'UserNotificationPreferences',
    UserNotificationPrefsSchema
  )

// ==========================================
// 3. Persistent Deduplication & Dispatch Log Schema
// ==========================================

export interface NotificationDispatchLogDocument
  extends Document,
    Omit<INotificationDispatchLog, 'id'> {
  _id: mongoose.Types.ObjectId
}

const NotificationDispatchLogSchema = new Schema<NotificationDispatchLogDocument>(
  {
    deduplicationKey: { type: String, required: true, unique: true, index: true },
    recipientId: { type: String, required: true, index: true },
    scheduleId: { type: String, required: true, index: true },
    projectId: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['ACTIVITY', 'WEEKLY_REPORT', 'SCHEDULE', 'SUBMISSION'],
      required: true,
    },
    entityId: { type: String, required: true },
    reminderType: { type: String, required: true },
    deadlineVersion: { type: Number, required: true, default: 1 },
    targetDeadline: { type: String, required: true },
    deliveryStatus: {
      type: String,
      enum: ['DELIVERED', 'FAILED', 'SKIPPED_PREFERENCE'],
      default: 'DELIVERED',
    },
    emailStatus: {
      type: String,
      enum: ['NOT_CONFIGURED', 'SKIPPED', 'SENT', 'FAILED'],
      default: 'NOT_CONFIGURED',
    },
    failureCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: Date.now },
    errorMessage: { type: String },
  },
  { timestamps: true }
)

export const MongoNotificationDispatchLogModel =
  mongoose.models.NotificationDispatchLog ||
  mongoose.model<NotificationDispatchLogDocument>(
    'NotificationDispatchLog',
    NotificationDispatchLogSchema
  )

// ==========================================
// 4. Reminder Job Run History Schema
// ==========================================

export interface ReminderJobRunDocument extends Document, Omit<IReminderJobRun, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ReminderJobRunSchema = new Schema<ReminderJobRunDocument>(
  {
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    referenceDateIso: { type: String, required: true },
    triggerSource: {
      type: String,
      enum: ['STARTUP', 'INTERVAL', 'MANUAL'],
      required: true,
    },
    scannedSchedules: { type: Number, default: 0 },
    dispatchedCount: { type: Number, default: 0 },
    dedupedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['RUNNING', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
    },
    errorMessage: { type: String },
  },
  { timestamps: false }
)

ReminderJobRunSchema.index({ startedAt: -1 })

export const MongoReminderJobRunModel =
  mongoose.models.ReminderJobRun ||
  mongoose.model<ReminderJobRunDocument>('ReminderJobRun', ReminderJobRunSchema)

// ==========================================
// 5. Dev/Test Explicit In-Memory Stores + Mappers
// ==========================================

const inMemoryPolicyStore: IReminderPolicyConfig = {
  id: 'policy-global',
  configKey: 'GLOBAL',
  activityDaysBefore: [3, 1, 0],
  activityOverdueEnabled: true,
  activityOverdueGraceDays: 1,
  weeklyReportDaysBefore: [2, 0],
  weeklyReportOverdueEnabled: true,
  schedulerIntervalMinutes: config.REMINDER_INTERVAL_MINUTES,
  updatedAt: new Date(),
}
const inMemoryPrefsStore: Map<string, IUserNotificationPreferences> = new Map()
const inMemoryDispatchLogStore: Map<string, INotificationDispatchLog> = new Map()
const inMemoryJobRunStore: IReminderJobRun[] = []

function mapNotifDoc(d: any): INotification {
  return {
    id: d._id.toString(),
    recipientId: d.recipientId,
    type: d.type,
    category: d.category || 'MENTORSHIP',
    title: d.title,
    message: d.message,
    actionUrl: d.actionUrl,
    deduplicationKey: d.deduplicationKey,
    deadlineVersion: d.deadlineVersion,
    deliveryStatus: d.deliveryStatus || 'DELIVERED',
    emailDeliveryStatus: d.emailDeliveryStatus || 'NOT_CONFIGURED',
    deliveryError: d.deliveryError,
    cleared: Boolean(d.cleared),
    data: d.data || undefined,
    read: Boolean(d.read),
    createdAt: d.createdAt,
  }
}

export const ReminderPolicyRepository = {
  async getOrInitGlobal(): Promise<IReminderPolicyConfig> {
    if (isMongoConnected()) {
      const doc = await MongoReminderPolicyModel.findOneAndUpdate(
        { configKey: 'GLOBAL' },
        {
          $setOnInsert: {
            configKey: 'GLOBAL',
            activityDaysBefore: [3, 1, 0],
            activityOverdueEnabled: true,
            activityOverdueGraceDays: 1,
            weeklyReportDaysBefore: [2, 0],
            weeklyReportOverdueEnabled: true,
            schedulerIntervalMinutes: config.REMINDER_INTERVAL_MINUTES,
          },
        },
        { upsert: true, new: true }
      )
      return {
        id: doc._id.toString(),
        configKey: 'GLOBAL',
        activityDaysBefore: doc.activityDaysBefore,
        activityOverdueEnabled: doc.activityOverdueEnabled,
        activityOverdueGraceDays: doc.activityOverdueGraceDays,
        weeklyReportDaysBefore: doc.weeklyReportDaysBefore,
        weeklyReportOverdueEnabled: doc.weeklyReportOverdueEnabled,
        schedulerIntervalMinutes: doc.schedulerIntervalMinutes,
        updatedBy: doc.updatedBy,
        updatedAt: (doc as any).updatedAt,
      }
    }
    assertPersistenceAvailable('reminder policy configuration')
    return inMemoryPolicyStore
  },

  async updateGlobal(
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
    >,
    updatedBy: string
  ): Promise<IReminderPolicyConfig> {
    if (isMongoConnected()) {
      await this.getOrInitGlobal()
      const doc = await MongoReminderPolicyModel.findOneAndUpdate(
        { configKey: 'GLOBAL' },
        { $set: { ...updates, updatedBy } },
        { new: true }
      )
      return {
        id: doc!._id.toString(),
        configKey: 'GLOBAL',
        activityDaysBefore: doc!.activityDaysBefore,
        activityOverdueEnabled: doc!.activityOverdueEnabled,
        activityOverdueGraceDays: doc!.activityOverdueGraceDays,
        weeklyReportDaysBefore: doc!.weeklyReportDaysBefore,
        weeklyReportOverdueEnabled: doc!.weeklyReportOverdueEnabled,
        schedulerIntervalMinutes: doc!.schedulerIntervalMinutes,
        updatedBy: doc!.updatedBy,
        updatedAt: (doc as any).updatedAt,
      }
    }
    assertPersistenceAvailable('reminder policy configuration')
    Object.assign(inMemoryPolicyStore, updates, { updatedBy, updatedAt: new Date() })
    return inMemoryPolicyStore
  },
}

export const UserNotificationPrefsRepository = {
  async getForUser(userId: string): Promise<IUserNotificationPreferences> {
    if (isMongoConnected()) {
      const doc = await MongoUserNotificationPrefsModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { upsert: true, new: true }
      )
      return {
        id: doc._id.toString(),
        userId: doc.userId,
        inAppEnabled: doc.inAppEnabled,
        emailEnabled: doc.emailEnabled,
        activityReminders: doc.activityReminders,
        weeklyReportReminders: doc.weeklyReportReminders,
        submissionUpdates: doc.submissionUpdates,
        reviewUpdates: doc.reviewUpdates,
        scheduleUpdates: doc.scheduleUpdates,
        updatedAt: (doc as any).updatedAt,
      }
    }
    assertPersistenceAvailable('notification preferences')
    let existing = inMemoryPrefsStore.get(userId)
    if (!existing) {
      existing = {
        id: `npref-${userId}`,
        userId,
        inAppEnabled: true,
        emailEnabled: true,
        activityReminders: true,
        weeklyReportReminders: true,
        submissionUpdates: true,
        reviewUpdates: true,
        scheduleUpdates: true,
        updatedAt: new Date(),
      }
      inMemoryPrefsStore.set(userId, existing)
    }
    return existing
  },

  async updateForUser(
    userId: string,
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
    if (isMongoConnected()) {
      const doc = await MongoUserNotificationPrefsModel.findOneAndUpdate(
        { userId },
        { $set: updates },
        { upsert: true, new: true }
      )
      return {
        id: doc._id.toString(),
        userId: doc.userId,
        inAppEnabled: doc.inAppEnabled,
        emailEnabled: doc.emailEnabled,
        activityReminders: doc.activityReminders,
        weeklyReportReminders: doc.weeklyReportReminders,
        submissionUpdates: doc.submissionUpdates,
        reviewUpdates: doc.reviewUpdates,
        scheduleUpdates: doc.scheduleUpdates,
        updatedAt: (doc as any).updatedAt,
      }
    }
    assertPersistenceAvailable('notification preferences')
    const current = await this.getForUser(userId)
    const next = { ...current, ...updates, updatedAt: new Date() }
    inMemoryPrefsStore.set(userId, next)
    return next
  },
}

export const DispatchLogRepository = {
  async findByKey(deduplicationKey: string): Promise<INotificationDispatchLog | null> {
    if (isMongoConnected()) {
      const doc = await MongoNotificationDispatchLogModel.findOne({ deduplicationKey }).lean<any>()
      if (!doc) return null
      return {
        id: doc._id.toString(),
        deduplicationKey: doc.deduplicationKey,
        recipientId: doc.recipientId,
        scheduleId: doc.scheduleId,
        projectId: doc.projectId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        reminderType: doc.reminderType as any,
        deadlineVersion: doc.deadlineVersion,
        targetDeadline: doc.targetDeadline,
        deliveryStatus: doc.deliveryStatus,
        emailStatus: doc.emailStatus,
        failureCount: doc.failureCount,
        lastAttemptAt: doc.lastAttemptAt,
        errorMessage: doc.errorMessage,
      }
    }
    assertPersistenceAvailable('notification dispatch log')
    return inMemoryDispatchLogStore.get(deduplicationKey) || null
  },

  async upsert(
    entry: Omit<INotificationDispatchLog, 'id'>
  ): Promise<INotificationDispatchLog> {
    if (isMongoConnected()) {
      const doc = await MongoNotificationDispatchLogModel.findOneAndUpdate(
        { deduplicationKey: entry.deduplicationKey },
        { $set: entry },
        { upsert: true, new: true }
      )
      return { ...entry, id: doc._id.toString() }
    }
    assertPersistenceAvailable('notification dispatch log')
    const stored = { ...entry, id: `dlog-${Date.now()}` }
    inMemoryDispatchLogStore.set(entry.deduplicationKey, stored)
    return stored
  },
}

export const ReminderJobRunRepository = {
  async create(entry: Omit<IReminderJobRun, 'id'>): Promise<IReminderJobRun> {
    if (isMongoConnected()) {
      const doc = await MongoReminderJobRunModel.create(entry)
      return { ...entry, id: doc._id.toString() }
    }
    assertPersistenceAvailable('reminder job history')
    const created = { ...entry, id: `jrun-${Date.now()}` }
    inMemoryJobRunStore.unshift(created)
    return created
  },

  async complete(id: string, updates: Partial<IReminderJobRun>): Promise<void> {
    if (isMongoConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await MongoReminderJobRunModel.findByIdAndUpdate(id, { $set: updates })
      }
      return
    }
    assertPersistenceAvailable('reminder job history')
    const idx = inMemoryJobRunStore.findIndex((r) => r.id === id)
    if (idx !== -1) inMemoryJobRunStore[idx] = { ...inMemoryJobRunStore[idx], ...updates }
  },

  async getLatest(): Promise<IReminderJobRun | null> {
    if (isMongoConnected()) {
      const doc = await MongoReminderJobRunModel.findOne({}).sort({ startedAt: -1 }).lean<any>()
      if (!doc) return null
      return {
        id: doc._id.toString(),
        startedAt: doc.startedAt,
        finishedAt: doc.finishedAt,
        referenceDateIso: doc.referenceDateIso,
        triggerSource: doc.triggerSource,
        scannedSchedules: doc.scannedSchedules,
        dispatchedCount: doc.dispatchedCount,
        dedupedCount: doc.dedupedCount,
        failedCount: doc.failedCount,
        status: doc.status,
        errorMessage: doc.errorMessage,
      } as IReminderJobRun
    }
    assertPersistenceAvailable('reminder job history')
    return inMemoryJobRunStore[0] || null
  },
}

export const NotificationCentreRepository = {
  async create(data: Omit<INotification, 'id' | 'createdAt' | 'read'>): Promise<INotification> {
    if (isMongoConnected()) {
      const doc = await MongoNotificationModel.create({ ...data, read: false, cleared: false })
      return mapNotifDoc(doc)
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.create({ ...data, read: false, cleared: false })
  },

  async queryPaginated(params: {
    recipientId: string
    page: number
    limit: number
    unreadOnly?: boolean
    category?: NotificationCategory
  }): Promise<{
    items: INotification[]
    totalCount: number
    unreadCount: number
    page: number
    totalPages: number
    hasMore: boolean
  }> {
    const safePage = Math.max(1, params.page)
    const safeLimit = Math.min(50, Math.max(1, params.limit))
    const skip = (safePage - 1) * safeLimit

    if (isMongoConnected()) {
      const baseFilter: Record<string, any> = {
        recipientId: params.recipientId,
        cleared: { $ne: true },
      }
      if (params.unreadOnly) baseFilter.read = false
      if (params.category) baseFilter.category = params.category

      const [docs, totalCount, unreadCount] = await Promise.all([
        MongoNotificationModel.find(baseFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .lean(),
        MongoNotificationModel.countDocuments(baseFilter),
        MongoNotificationModel.countDocuments({
          recipientId: params.recipientId,
          cleared: { $ne: true },
          read: false,
        }),
      ])

      const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit))
      return {
        items: docs.map(mapNotifDoc),
        totalCount,
        unreadCount,
        page: safePage,
        totalPages,
        hasMore: safePage < totalPages,
      }
    }

    assertPersistenceAvailable('notifications')
    const allForUser = (await inMemoryNotificationStore.findByRecipient(params.recipientId)).filter(
      (n) => !n.cleared
    )
    const unreadCount = allForUser.filter((n) => !n.read).length
    const filtered = allForUser.filter((n) => {
      if (params.unreadOnly && n.read) return false
      if (params.category && (n.category || 'MENTORSHIP') !== params.category) return false
      return true
    })
    const totalCount = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit))
    return {
      items: filtered.slice(skip, skip + safeLimit),
      totalCount,
      unreadCount,
      page: safePage,
      totalPages,
      hasMore: safePage < totalPages,
    }
  },

  async findById(id: string): Promise<INotification | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoNotificationModel.findById(id).lean<any>()
      return doc ? mapNotifDoc(doc) : null
    }
    assertPersistenceAvailable('notifications')
    return null
  },

  async countUnread(recipientId: string): Promise<number> {
    if (isMongoConnected()) {
      return MongoNotificationModel.countDocuments({
        recipientId,
        cleared: { $ne: true },
        read: false,
      })
    }
    assertPersistenceAvailable('notifications')
    const list = await inMemoryNotificationStore.findByRecipient(recipientId)
    return list.filter((n) => !n.cleared && !n.read).length
  },

  async markRead(notificationId: string, recipientId: string): Promise<boolean> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(notificationId)) return false
      const doc = await MongoNotificationModel.findOneAndUpdate(
        { _id: notificationId, recipientId, cleared: { $ne: true } },
        { $set: { read: true } },
        { new: true }
      )
      return !!doc
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.markAsRead(notificationId, recipientId)
  },

  async markAllRead(recipientId: string): Promise<number> {
    if (isMongoConnected()) {
      const res = await MongoNotificationModel.updateMany(
        { recipientId, cleared: { $ne: true }, read: false },
        { $set: { read: true } }
      )
      return res.modifiedCount
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.markAllAsRead(recipientId)
  },

  async clearHistory(recipientId: string): Promise<number> {
    if (isMongoConnected()) {
      const res = await MongoNotificationModel.updateMany(
        { recipientId, cleared: { $ne: true } },
        { $set: { cleared: true, read: true } }
      )
      return res.modifiedCount
    }
    assertPersistenceAvailable('notifications')
    const list = await inMemoryNotificationStore.findByRecipient(recipientId)
    let count = 0
    for (const item of list) {
      if (!item.cleared) {
        item.cleared = true
        item.read = true
        count++
      }
    }
    return count
  },
}
