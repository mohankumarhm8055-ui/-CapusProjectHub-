import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { voiceService } from './voice.service.js'

const startSessionSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  language: z.enum(['auto', 'en', 'kn', 'hi']).optional().default('auto'),
})

const interactSchema = z.object({
  speech: z.string().trim().min(1, 'Speech text is required').max(2000),
  language: z.enum(['auto', 'en', 'kn', 'hi']).optional(),
})

const transcribeSchema = z.object({
  audioBase64: z.string().optional(),
  language: z.enum(['auto', 'en', 'kn', 'hi']).optional(),
})

const synthesizeSchema = z.object({
  text: z.string().trim().min(1, 'Text is required').max(5000),
  language: z.enum(['auto', 'en', 'kn', 'hi']).optional(),
  speed: z.union([z.literal(0.75), z.literal(1), z.literal(1.25), z.literal(1.5)]).optional(),
})

export const VoiceController = {
  /**
   * POST /api/ai/voice/sessions
   */
  async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const parsed = startSessionSchema.parse(req.body)
      const session = await voiceService.startSession(ownerId, parsed.conversationId, parsed.language)
      res.status(201).json({
        success: true,
        data: session,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/voice/sessions/:sessionId
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const sessionId = String(req.params.sessionId)
      const session = await voiceService.getSession(sessionId, ownerId)
      res.json({
        success: true,
        data: session,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/voice/sessions/:sessionId/interact
   */
  async processVoiceTurn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const sessionId = String(req.params.sessionId)
      const parsed = interactSchema.parse(req.body)

      const result = await voiceService.processVoiceTurn(
        sessionId,
        ownerId,
        parsed.speech,
        parsed.language
      )

      res.json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/voice/sessions/:sessionId/interrupt
   */
  async handleInterruption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const sessionId = String(req.params.sessionId)
      const session = await voiceService.handleInterruption(sessionId, ownerId)
      res.json({
        success: true,
        data: session,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/voice/sessions/:sessionId/end
   */
  async endSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const sessionId = String(req.params.sessionId)
      const session = await voiceService.endSession(sessionId, ownerId)
      res.json({
        success: true,
        data: session,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/voice/transcribe
   */
  async transcribeAudio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = transcribeSchema.parse(req.body)
      const result = await voiceService.transcribeAudio(parsed)
      res.json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/voice/synthesize
   */
  async synthesizeSpeech(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = synthesizeSchema.parse(req.body)
      const result = await voiceService.synthesizeSpeech(parsed)
      res.json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },
}
