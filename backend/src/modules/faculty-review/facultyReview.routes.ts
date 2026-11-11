import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'
import { FacultyReviewController } from './facultyReview.controller.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('faculty', 'admin'))

router.get('/dashboard', FacultyReviewController.getDashboard)
router.get('/submissions/:submissionId', FacultyReviewController.getSubmissionDetail)
router.post('/submissions/:submissionId/decision', FacultyReviewController.submitDecision)
router.post('/submissions/:submissionId/feedback', FacultyReviewController.addFeedback)
router.post('/weekly-reports/:reportId/review', FacultyReviewController.reviewWeeklyReport)

export default router
