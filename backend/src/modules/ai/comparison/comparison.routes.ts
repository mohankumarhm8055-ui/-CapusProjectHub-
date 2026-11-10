import { Router } from 'express'
import { ComparisonController } from './comparison.controller.js'
import { authenticate } from '../../../middleware/auth.middleware.js'
import { aiRateLimiter } from '../../../middleware/rateLimit.js'

const router = Router()

router.use(authenticate)
router.use(aiRateLimiter)

router.post('/', ComparisonController.createComparison)
router.get('/', ComparisonController.listComparisons)
router.get('/:id', ComparisonController.getComparisonById)
router.patch('/:id', ComparisonController.updateComparison)

export default router
