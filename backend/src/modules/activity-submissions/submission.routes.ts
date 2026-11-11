import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import {
  ActivitySubmissionController,
  evidenceUploadMiddleware,
} from './submission.controller.js'

const router = Router()

router.use(authenticate)

// Student & Faculty authorized activity tracker workspace
router.get('/workspaces', ActivitySubmissionController.listWorkspaces)
router.get('/workspaces/:scheduleId', ActivitySubmissionController.getWorkspace)
router.get(
  '/workspaces/:scheduleId/activities/:activityId',
  ActivitySubmissionController.getActivityDetail
)

// Authenticated evidence submission & revision resubmission (supports multipart/form-data + JSON links)
router.post(
  '/workspaces/:scheduleId/activities/:activityId/submit',
  requireRole('student'),
  evidenceUploadMiddleware,
  ActivitySubmissionController.submitInitial
)
router.post(
  '/workspaces/:scheduleId/activities/:activityId/resubmit',
  requireRole('student'),
  evidenceUploadMiddleware,
  ActivitySubmissionController.resubmit
)

// Authorized assigned-faculty state transition hook (no public UI dashboard per Task 2 scope)
router.post(
  '/:submissionId/review',
  requireRole('faculty', 'admin'),
  ActivitySubmissionController.transitionReview
)

// Authenticated private file retrieval (never publicly static-served)
router.get('/files/:fileId', ActivitySubmissionController.downloadEvidenceFile)

export default router
