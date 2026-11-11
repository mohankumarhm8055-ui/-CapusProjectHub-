import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import { ScheduleController } from './schedule.controller.js'

const router = Router()

router.use(authenticate)

// Template catalog & versions
router.get('/templates', ScheduleController.listTemplates)
router.get('/templates/:templateId/versions', ScheduleController.getTemplateVersions)
router.post('/templates', requireRole('admin'), ScheduleController.createTemplate)
router.post('/templates/:templateId/versions', requireRole('admin'), ScheduleController.addTemplateVersion)

// Faculty / Admin schedule initialization & date suggestions
router.get(
  '/initialization-options',
  requireRole('faculty', 'admin'),
  ScheduleController.getInitializationOptions
)
router.post('/suggest-dates', requireRole('faculty', 'admin'), ScheduleController.suggestDates)
router.post('/', requireRole('faculty', 'admin'), ScheduleController.initializeSchedule)

// Role-scoped schedule retrieval
router.get('/my', ScheduleController.listMySchedules)
router.get('/:scheduleId', ScheduleController.getScheduleById)
router.get('/:scheduleId/history', ScheduleController.getScheduleHistory)

// Faculty / Admin lifecycle modifications (students strictly blocked with 403)
router.put('/:scheduleId', requireRole('faculty', 'admin'), ScheduleController.updateDraftSchedule)
router.post('/:scheduleId/publish', requireRole('faculty', 'admin'), ScheduleController.publishSchedule)
router.patch(
  '/:scheduleId/published',
  requireRole('faculty', 'admin'),
  ScheduleController.modifyPublishedSchedule
)

export default router
