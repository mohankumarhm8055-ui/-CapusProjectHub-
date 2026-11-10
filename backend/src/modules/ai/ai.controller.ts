import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { conversationService } from './conversation.service.js'
import { aiService } from './ai.service.js'
import { knowledgeService } from './knowledge/knowledge.service.js'
import { contextManager } from './conversational-engine/context.manager.js'
import { LearningProfileRepository } from './personalization/learningProfile.model.js'
import { MessageFeedbackRepository } from './messageFeedback.model.js'

const messageFeedbackSchema = z.object({
  rating: z.enum(['helpful', 'needs_improvement']),
  category: z.enum([
    'HELPFUL_RESPONSE',
    'INCORRECT_INFORMATION',
    'IRRELEVANT_RESPONSE',
    'CONFUSING_EXPLANATION',
    'MISSING_PROJECT_INFO',
  ]),
  comment: z.string().trim().max(300).optional(),
})

// Input validation schemas
const createConversationSchema = z.object({
  title: z.string().trim().max(100).optional(),
})

const renameConversationSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(100),
})

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message exceeds 4000 characters limit'),
  stream: z.boolean().optional().default(true),
})

const updateLearningProfileSchema = z.object({
  explanationLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  programmingExperience: z.enum(['none', 'basic', 'moderate', 'strong']).optional(),
  knownLanguages: z.array(z.string().trim().max(40)).max(25).optional(),
  technicalInterests: z.array(z.string().trim().max(60)).max(25).optional(),
  familiarTools: z.array(z.string().trim().max(40)).max(30).optional(),
  projectExperience: z.enum(['first_project', 'one_or_two', 'multiple']).optional(),
  preferredLanguage: z.enum(['auto', 'en', 'kn', 'hi']).optional(),
  explanationStyle: z
    .enum(['step_by_step', 'concise', 'architecture_first', 'example_driven'])
    .optional(),
  defaultConstraints: z
    .object({
      teamSize: z.number().int().min(1).max(12).optional(),
      durationWeeks: z.number().int().min(1).max(52).optional(),
      hardwareAvailable: z.string().trim().max(120).optional(),
      budget: z.string().trim().max(120).optional(),
      academicRequirement: z.string().trim().max(120).optional(),
      availableDatasets: z.string().trim().max(120).optional(),
    })
    .optional(),
})

const correctContextSchema = z.object({
  currentProjectIdea: z.string().trim().max(150).optional(),
  technicalExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  teamSize: z.number().int().min(1).max(12).optional(),
  developmentWeeks: z.number().int().min(1).max(52).optional(),
  budget: z.string().trim().max(120).optional(),
  hardwareRequirements: z.string().trim().max(120).optional(),
  availableDatasets: z.string().trim().max(120).optional(),
  academicRequirements: z.string().trim().max(120).optional(),
  languagePreference: z.enum(['auto', 'en', 'kn', 'hi']).optional(),
  explanationStyle: z.enum(['step_by_step', 'concise', 'architecture_first', 'example_driven']).optional(),
  preferredTechnologies: z.array(z.string().trim().max(40)).max(20).optional(),
})

export const AIController = {
  /**
   * POST /api/ai/conversations
   */
  async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const parsed = createConversationSchema.parse(req.body)

      const conversation = await conversationService.createConversation(ownerId, parsed.title)

      res.status(201).json({
        success: true,
        data: conversation,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/conversations
   */
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversations = await conversationService.listUserConversations(ownerId)

      res.json({
        success: true,
        data: conversations,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/conversations/:conversationId
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)

      const conversation = await conversationService.getConversation(conversationId, ownerId)
      const messages = await conversationService.getConversationMessages(conversationId, ownerId)

      res.json({
        success: true,
        data: {
          conversation,
          messages,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/conversations/:conversationId/context
   * Retrieves structured conversation memory context
   */
  async getConversationContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)

      await conversationService.getConversation(conversationId, ownerId)
      const context = await contextManager.getOrCreateContext(conversationId, ownerId)

      res.json({
        success: true,
        data: context,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PATCH /api/ai/conversations/:conversationId/context
   * Allows student owner to correct remembered assumptions
   */
  async updateConversationContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      const parsed = correctContextSchema.parse(req.body || {})
      const updated = await contextManager.correctContext(conversationId, ownerId, parsed)
      res.json({
        success: true,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * DELETE /api/ai/conversations/:conversationId/context
   * Resets conversation context cleanly for the authenticated owner
   */
  async clearConversationContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      const reset = await contextManager.clearContext(conversationId, ownerId)
      res.json({
        success: true,
        data: reset,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/learning-profile
   */
  async getLearningProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await LearningProfileRepository.getOrCreateForUser(req.user!.id)
      res.json({
        success: true,
        data: profile,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PATCH /api/ai/learning-profile
   */
  async updateLearningProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateLearningProfileSchema.parse(req.body || {})
      const updated = await LearningProfileRepository.updateForUser(req.user!.id, parsed)
      res.json({
        success: true,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * DELETE /api/ai/learning-profile
   */
  async resetLearningProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reset = await LearningProfileRepository.resetForUser(req.user!.id)
      res.json({
        success: true,
        data: reset,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PATCH /api/ai/conversations/:conversationId
   */
  async renameConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      const parsed = renameConversationSchema.parse(req.body)

      const updated = await conversationService.renameConversation(conversationId, ownerId, parsed.title)

      res.json({
        success: true,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * DELETE /api/ai/conversations/:conversationId
   */
  async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)

      await conversationService.deleteConversation(conversationId, ownerId)

      res.json({
        success: true,
        message: 'Conversation and messages deleted successfully',
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/conversations/:conversationId/messages
   * Supports both Server-Sent Events (SSE) streaming and standard JSON fallback
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      const parsed = sendMessageSchema.parse(req.body)

      // Verify conversation exists and belongs to user
      await conversationService.getConversation(conversationId, ownerId)

      const wantsStream = parsed.stream !== false && req.headers.accept?.includes('text/event-stream') !== false

      if (!wantsStream) {
        // Non-streaming fallback
        const assistantMessage = await aiService.generateMentorResponse(
          conversationId,
          ownerId,
          parsed.content
        )

        res.json({
          success: true,
          data: assistantMessage,
        })
        return
      }

      // Setup Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders?.()

      const abortController = new AbortController()

      req.on('close', () => {
        abortController.abort()
      })

      // Send initial acknowledgement
      res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`)

      await aiService.streamMentorResponse(
        conversationId,
        ownerId,
        parsed.content,
        {
          onToken: (token) => {
            res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
          },
          onDone: (assistantMessage) => {
            res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMessage })}\n\n`)
            res.end()
          },
          onError: (err) => {
            res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
            res.end()
          },
        },
        abortController.signal
      )
    } catch (err) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: (err as any).message })}\n\n`)
        res.end()
      } else {
        next(err)
      }
    }
  },

  /**
   * GET /api/ai/status
   * Reports backend AI provider readiness and configuration
   */
  async getStatus(_req: Request, res: Response): Promise<void> {
    const { getDatabaseStatus } = await import('../../config/db.js')
    res.json({
      success: true,
      data: {
        identity: 'AI Project Mentor — Your Honest Academic Project Guide',
        activeProvider: aiService.getProviderName(),
        database: getDatabaseStatus(),
        streamingSupported: true,
        multilingual: ['en', 'kn', 'hi'],
        repositoryIntelligence: 'active',
        featureEvaluationEngine: 'active',
        proposalGenerator: 'active',
        masterKnowledgeBase: 'active',
        voiceIntelligence: 'active',
        supportedVoiceLanguages: ['en', 'kn', 'hi'],
        knowledgeDocsCount: 23,
      },
    })
  },

  /**
   * GET /api/ai/knowledge
   * Lists all available Master Knowledge Base documents and metadata
   */
  async getKnowledgeIndex(_req: Request, res: Response): Promise<void> {
    const docs = knowledgeService.listKnowledgeDocs()
    res.json({
      success: true,
      data: {
        totalDocs: docs.length,
        version: '1.0.0',
        system: 'CampusProjectHub Master Knowledge Base',
        documents: docs,
      },
    })
  },

  /**
   * GET /api/ai/knowledge/:docId
   * Retrieves full content of an academic knowledge document
   */
  async getKnowledgeDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const docParam = req.params.docId
      const docId = Array.isArray(docParam) ? docParam[0] : (docParam as string) || ''
      const content = knowledgeService.readKnowledgeDoc(docId)

      if (!content) {
        res.status(404).json({
          success: false,
          error: {
            code: 'KNOWLEDGE_DOC_NOT_FOUND',
            message: `Knowledge document '${docId}' was not found in the master registry.`,
          },
        })
        return
      }

      res.json({
        success: true,
        data: {
          docId,
          content,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/conversations/:conversationId/messages/:messageId/feedback
   * Optional lightweight student feedback (not automatically used as training data)
   */
  async submitMessageFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      const messageId = String(req.params.messageId)
      await conversationService.getConversation(conversationId, ownerId)
      const parsed = messageFeedbackSchema.parse(req.body)

      const saved = await MessageFeedbackRepository.upsert({
        conversationId,
        messageId,
        ownerId,
        rating: parsed.rating,
        category: parsed.category,
        comment: parsed.comment,
      })

      res.status(201).json({
        success: true,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/conversations/:conversationId/feedback
   */
  async listConversationFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      await conversationService.getConversation(conversationId, ownerId)
      const list = await MessageFeedbackRepository.listByConversation(conversationId, ownerId)
      res.json({
        success: true,
        data: list,
      })
    } catch (err) {
      next(err)
    }
  },
}
