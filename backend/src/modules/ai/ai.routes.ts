import { Router } from 'express'
import { AIController } from './ai.controller.js'
import evaluationRoutes from './feature-evaluation/evaluation.routes.js'
import voiceRoutes from './voice/voice.routes.js'
import qualityEvalRoutes from './quality-eval/quality.routes.js'
import comparisonRoutes from './comparison/comparison.routes.js'
import { authenticate } from '../../middleware/auth.middleware.js'
import { aiRateLimiter } from '../../middleware/rateLimit.js'

const router = Router()

// Public status check
router.get('/status', AIController.getStatus)

// Public Master Knowledge Base endpoints
router.get('/knowledge', AIController.getKnowledgeIndex)
router.get('/knowledge/:docId', AIController.getKnowledgeDoc)

// Feature Evaluation Sub-routes
router.use('/evaluations', evaluationRoutes)

// Voice Intelligence Sub-routes
router.use('/voice', voiceRoutes)

// Response Quality Evaluation Sub-routes (Faculty & Admin only)
router.use('/quality-eval', qualityEvalRoutes)

// Structured Project Comparison & Research Gap Sub-routes
router.use('/comparisons', comparisonRoutes)

// Authenticated AI Conversation endpoints
router.use(authenticate)
router.use(aiRateLimiter)

// Personalization Learning Profile endpoints (strictly owner-scoped via req.user.id)
router.get('/learning-profile', AIController.getLearningProfile)
router.patch('/learning-profile', AIController.updateLearningProfile)
router.delete('/learning-profile', AIController.resetLearningProfile)

router.post('/conversations', AIController.createConversation)
router.get('/conversations', AIController.listConversations)
router.get('/conversations/:conversationId', AIController.getConversation)
router.get('/conversations/:conversationId/context', AIController.getConversationContext)
router.patch('/conversations/:conversationId/context', AIController.updateConversationContext)
router.delete('/conversations/:conversationId/context', AIController.clearConversationContext)
router.patch('/conversations/:conversationId', AIController.renameConversation)
router.delete('/conversations/:conversationId', AIController.deleteConversation)

router.post('/conversations/:conversationId/messages', AIController.sendMessage)
router.post('/conversations/:conversationId/messages/:messageId/feedback', AIController.submitMessageFeedback)
router.get('/conversations/:conversationId/feedback', AIController.listConversationFeedback)

export default router
