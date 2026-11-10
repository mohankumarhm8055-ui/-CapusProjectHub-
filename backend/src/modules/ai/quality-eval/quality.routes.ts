import { Router } from 'express'
import { QualityEvalController } from './quality.controller.js'
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js'

const router = Router()

// Administrative & faculty-only access (prevents exposing evaluation telemetry/reports to students or public)
router.use(authenticate)
router.use(requireRole('faculty', 'admin'))

router.get('/dataset', QualityEvalController.getDatasetOverview)
router.post('/run', QualityEvalController.runEvaluation)
router.get('/runs', QualityEvalController.listRuns)
router.get('/runs/:runId', QualityEvalController.getRunById)
router.post('/compare', QualityEvalController.compareRuns)

export default router
