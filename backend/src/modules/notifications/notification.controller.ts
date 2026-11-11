import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { NotificationCategory } from '../connections/connection.types.js'
import { academicNotificationService } from './notification.service.js'
import { reminderEngineService } from './reminder.engine.js'

const UpdatePreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  activityReminders: z.boolean().optional(),
  weeklyReportReminders: z.boolean().optional(),
  submissionUpdates: z.boolean().optional(),
  reviewUpdates: z.boolean().optional(),
  scheduleUpdates: z.boolean().optional(),
})

const UpdateReminderPolicySchema = z.object({
  activityDaysBefore: z.array(z.number().int().min(0).max(30)).optional(),
  activityOverdueEnabled: z.boolean().optional(),
  activityOverdueGraceDays: z.number().int().min(1).max(30).optional(),
  weeklyReportDaysBefore: z.array(z.number().int().min(0).max(14)).optional(),
  weeklyReportOverdueEnabled: z.boolean().optional(),
  schedulerIntervalMinutes: z.number().int().min(1).max(1440).optional(),
})

const ManualRunSchema = z.object({
  referenceDateIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional(),
})

export const NotificationController = {
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1
      const limit = req.query.limit ? Number(req.query.limit) : 15
      const unreadOnly = req.query.unreadOnly === 'true'
      const category = req.query.category
        ? (String(req.query.category) as NotificationCategory)
        : undefined

      const data = await academicNotificationService.listNotifications(req.user!, {
        page,
        limit,
        unreadOnly,
        category,
      })
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unreadCount = await academicNotificationService.getUnreadCount(req.user!)
      res.json({ success: true, data: { unreadCount } })
    } catch (err) {
      next(err)
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await academicNotificationService.markAsRead(req.user!, String(req.params.id))
      res.json({ success: true, data: { read: true } })
    } catch (err) {
      next(err)
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedCount = await academicNotificationService.markAllAsRead(req.user!)
      res.json({ success: true, data: { updatedCount } })
    } catch (err) {
      next(err)
    }
  },

  async clearHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clearedCount = await academicNotificationService.clearHistory(req.user!)
      res.json({ success: true, data: { clearedCount } })
    } catch (err) {
      next(err)
    }
  },

  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prefs = await academicNotificationService.getUserPreferences(req.user!)
      res.json({ success: true, data: prefs })
    } catch (err) {
      next(err)
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = UpdatePreferencesSchema.parse(req.body)
      const prefs = await academicNotificationService.updateUserPreferences(req.user!, parsed)
      res.json({ success: true, data: prefs })
    } catch (err) {
      next(err)
    }
  },

  async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await academicNotificationService.getReminderPolicy()
      res.json({ success: true, data: policy })
    } catch (err) {
      next(err)
    }
  },

  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = UpdateReminderPolicySchema.parse(req.body)
      const policy = await academicNotificationService.updateReminderPolicy(req.user!, parsed)
      res.json({ success: true, data: policy })
    } catch (err) {
      next(err)
    }
  },

  async getDeliveryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await academicNotificationService.getDeliveryStatus(req.user!)
      res.json({ success: true, data: status })
    } catch (err) {
      next(err)
    }
  },

  async runRemindersNow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ManualRunSchema.parse(req.body || {})
      const result = await reminderEngineService.runDueCycle({
        referenceDateIso: parsed.referenceDateIso,
        triggerSource: 'MANUAL',
      })
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },
}
