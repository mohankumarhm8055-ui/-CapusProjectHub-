import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import { evidenceUploadMiddleware } from '../activity-submissions/submission.controller.js'
import { WeeklyReportController } from './weeklyReport.controller.js'

const router = Router()

router.use(authenticate)

// Reminder-readiness evaluation query (read-only metadata for future Task 5 notification engine)
router.get(
  '/reminder-candidates',
  requireRole('faculty', 'admin'),
  WeeklyReportController.listReminderCandidates
)

// Authenticated private file retrieval for weekly report evidence
router.get('/files/:fileId', WeeklyReportController.downloadFile)

// Authorized workspaces & reporting week queries (Student / Faculty / Admin)
router.get('/workspaces', WeeklyReportController.listWorkspaces)
router.get('/projects/:scheduleId', WeeklyReportController.getProjectReports)
router.get('/projects/:scheduleId/weeks/:weekNumber', WeeklyReportController.getWeekDetail)

// Student team draft, individual contribution, and official weekly submission
router.put(
  '/projects/:scheduleId/weeks/:weekNumber/draft',
  requireRole('student'),
  evidenceUploadMiddleware,
  WeeklyReportController.saveDraft
)
router.post(
  '/projects/:scheduleId/weeks/:weekNumber/contributions',
  requireRole('student'),
  evidenceUploadMiddleware,
  WeeklyReportController.upsertContribution
)
router.post(
  '/projects/:scheduleId/weeks/:weekNumber/submit',
  requireRole('student'),
  evidenceUploadMiddleware,
  WeeklyReportController.submitReport
)

// Assigned Faculty / Admin review & clarification / finalization
router.post(
  '/:reportId/review',
  requireRole('faculty', 'admin'),
  WeeklyReportController.reviewReport
)

export default router
