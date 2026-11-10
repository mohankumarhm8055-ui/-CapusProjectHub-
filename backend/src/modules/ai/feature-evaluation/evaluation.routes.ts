import { Router } from 'express'
import { EvaluationController } from './evaluation.controller.js'
import { authenticate } from '../../../middleware/auth.middleware.js'
import { aiRateLimiter } from '../../../middleware/rateLimit.js'

const router = Router()

// All evaluation endpoints require authenticated student/faculty session
router.use(authenticate)
router.use(aiRateLimiter)

// Evaluation lifecycles
router.post('/evaluate-feature', EvaluationController.evaluateFeatureStandalone)
router.post('/', EvaluationController.createEvaluation)
router.get('/:id', EvaluationController.getEvaluation)
router.get('/conversation/:conversationId', EvaluationController.getLatestByConversation)

// Student decision controls (Accept, Reject, Modify)
router.patch('/:id/decisions', EvaluationController.recordDecision)

// Reassessment after constraint changes
router.post('/:id/reassess', EvaluationController.reassessEvaluation)

// Final scope compilation & student edits
router.post('/:id/generate-scope', EvaluationController.generateScope)
router.patch('/:id/scope', EvaluationController.updateScope)

// Scope Versioning & Change Management (TASK 10)
router.post('/:id/scope/versions', EvaluationController.createScopeVersion)
router.get('/:id/scope/versions', EvaluationController.listScopeVersions)
router.get('/:id/scope/versions/:version', EvaluationController.getScopeVersion)
router.post('/:id/scope/versions/:version/restore', EvaluationController.restoreScopeVersion)
router.post('/:id/scope/compare', EvaluationController.compareScopeVersions)
router.post('/:id/scope/finalize', EvaluationController.finalizeScope)

export default router
