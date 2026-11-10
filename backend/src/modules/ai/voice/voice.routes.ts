import { Router } from 'express'
import { VoiceController } from './voice.controller.js'
import { authenticate } from '../../../middleware/auth.middleware.js'
import { aiRateLimiter } from '../../../middleware/rateLimit.js'

const router = Router()

// Public / Lightweight STT & TTS utility endpoints
router.post('/transcribe', VoiceController.transcribeAudio)
router.post('/synthesize', VoiceController.synthesizeSpeech)

// Authenticated Voice Session endpoints
router.use(authenticate)
router.use(aiRateLimiter)

router.post('/sessions', VoiceController.startSession)
router.get('/sessions/:sessionId', VoiceController.getSession)
router.post('/sessions/:sessionId/interact', VoiceController.processVoiceTurn)
router.post('/sessions/:sessionId/interrupt', VoiceController.handleInterruption)
router.post('/sessions/:sessionId/end', VoiceController.endSession)

export default router
