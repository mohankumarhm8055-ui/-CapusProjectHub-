import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import { evidenceUploadMiddleware } from '../activity-submissions/submission.controller.js'
import { FinalLifecycleController } from './lifecycle.controller.js'

const router = Router()

router.use(authenticate)

// Institutional Final Deliverable Config
router.get('/config', FinalLifecycleController.getConfig)
router.put('/config', requireRole('admin'), FinalLifecycleController.updateConfig)

// Controlled Published Repository Asset Streaming (Authorized users viewing PUBLISHED projects)
router.get('/published-files/:projectId/:fileId', FinalLifecycleController.downloadPublishedAsset)

// Authorized Team / Faculty Private Deliverable Streaming
router.get('/files/:fileId', FinalLifecycleController.downloadInternalFile)

// Authorized Final Lifecycle Workspaces
router.get('/projects', FinalLifecycleController.listProjects)
router.get('/projects/:scheduleId', FinalLifecycleController.getProjectDetail)

// Student Final Deliverables & Completion Review Submission
router.put(
  '/projects/:scheduleId/draft',
  requireRole('student'),
  evidenceUploadMiddleware,
  FinalLifecycleController.saveDraft
)
router.post(
  '/projects/:scheduleId/submit',
  requireRole('student'),
  evidenceUploadMiddleware,
  FinalLifecycleController.submitForFinalReview
)

// Assigned Faculty / Admin Completion Approval & Explicit Publication Actions
router.post(
  '/projects/:scheduleId/final-review',
  requireRole('faculty', 'admin'),
  FinalLifecycleController.finalReview
)
router.put(
  '/projects/:scheduleId/publication-draft',
  requireRole('faculty', 'admin'),
  FinalLifecycleController.savePublicationDraft
)
router.post(
  '/projects/:scheduleId/publish',
  requireRole('faculty', 'admin'),
  FinalLifecycleController.publishProject
)
router.post(
  '/projects/:scheduleId/unpublish',
  requireRole('faculty', 'admin'),
  FinalLifecycleController.unpublishProject
)
router.post(
  '/projects/:scheduleId/archive',
  requireRole('faculty', 'admin'),
  FinalLifecycleController.archiveProject
)

export default router
