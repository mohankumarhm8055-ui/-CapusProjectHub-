import { Router } from 'express'
import { AIController } from './ai.controller.js'
import evaluationRoutes from './feature-evaluation/evaluation.routes.js'
import voiceRoutes from './voice/voice.routes.js'
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

// Authenticated AI Conversation endpoints
router.use(authenticate)
router.use(aiRateLimiter)

router.post('/conversations', AIController.createConversation)
router.get('/conversations', AIController.listConversations)
router.get('/conversations/:conversationId', AIController.getConversation)
router.get('/conversations/:conversationId/context', AIController.getConversationContext)
router.patch('/conversations/:conversationId', AIController.renameConversation)
router.delete('/conversations/:conversationId', AIController.deleteConversation)

router.post('/conversations/:conversationId/messages', AIController.sendMessage)

export default router
