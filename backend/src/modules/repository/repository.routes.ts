import { Router } from 'express'
import { RepositoryController } from './repository.controller.js'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import { aiRateLimiter } from '../../middleware/rateLimit.js'

const router = Router()

// Public / Authenticated search & comparison endpoints
router.use(authenticate)

// Search & Inspection
router.get('/search', RepositoryController.searchProjects)
router.get('/projects', RepositoryController.searchProjects)
router.get('/projects/:id', RepositoryController.getProjectById)

// AI Idea Comparison against repository
router.post('/compare', aiRateLimiter, RepositoryController.compareIdea)

// Admin ingestion & verification
router.post('/admin/import', requireRole('admin'), RepositoryController.ingestHistorical)
router.post('/admin/ingest', requireRole('admin'), RepositoryController.ingestHistorical)
router.post('/admin/import/csv', requireRole('admin'), RepositoryController.importCsv)
router.post('/admin/import/batch', requireRole('admin'), RepositoryController.importBatch)
router.post('/admin/verify/:id', requireRole('admin'), RepositoryController.verifyHistorical)

// Student submission workflow
router.post('/submissions/draft', RepositoryController.createStudentDraft)
router.post('/student/draft', RepositoryController.createStudentDraft)
router.put('/submissions/:id', RepositoryController.updateStudentSubmission)
router.patch('/submissions/:id', RepositoryController.updateStudentSubmission)
router.put('/student/edit/:id', RepositoryController.updateStudentSubmission)
router.post('/submissions/:id/submit', RepositoryController.submitForReview)
router.post('/student/submit/:id', RepositoryController.submitForReview)

// Faculty review workflow
router.post('/submissions/:id/review', requireRole('faculty', 'admin'), RepositoryController.reviewSubmission)
router.post('/faculty/review/:id', requireRole('faculty', 'admin'), RepositoryController.reviewSubmission)

// Audit trail
router.get('/audit/:projectId', RepositoryController.getAuditTrail)

export default router
