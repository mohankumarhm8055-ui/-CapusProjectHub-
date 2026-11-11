import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import { NotificationController } from './notification.controller.js'

const router = Router()

router.use(authenticate)

// User Notification Centre (ownership-enforced)
router.get('/', NotificationController.listNotifications)
router.get('/unread-count', NotificationController.getUnreadCount)
router.patch('/read-all', NotificationController.markAllRead)
router.patch('/:id/read', NotificationController.markRead)
router.delete('/', NotificationController.clearHistory)

// User Notification Preferences
router.get('/preferences', NotificationController.getPreferences)
router.put('/preferences', NotificationController.updatePreferences)

// Institutional Reminder Engine Configuration & Diagnostics
router.get('/config', NotificationController.getConfig)
router.put('/config', requireRole('admin'), NotificationController.updateConfig)
router.get('/delivery-status', requireRole('faculty', 'admin'), NotificationController.getDeliveryStatus)
router.post(
  '/reminders/run',
  requireRole('faculty', 'admin'),
  NotificationController.runRemindersNow
)

export default router
