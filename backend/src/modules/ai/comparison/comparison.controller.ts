import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { ComparisonSessionRepository } from './comparison.model.js'
import { researchGapService } from './gap.analyzer.js'
import { conversationService } from '../conversation.service.js'
import { contextManager } from '../conversational-engine/context.manager.js'

const createComparisonSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(3).max(4000),
  features: z.array(z.string().trim()).optional().default([]),
  technologies: z.array(z.string().trim()).optional().default([]),
  targetUsers: z.string().trim().max(300).optional(),
  objectives: z.array(z.string().trim()).optional(),
  conversationId: z.string().trim().optional(),
  constraints: z
    .object({
      teamSize: z.number().int().min(1).max(12).optional(),
      developmentWeeks: z.number().int().min(1).max(52).optional(),
      technicalExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      hardware: z.string().trim().max(120).optional(),
      datasets: z.string().trim().max(120).optional(),
      budget: z.string().trim().max(120).optional(),
    })
    .optional(),
})

const updateComparisonSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().min(3).max(4000).optional(),
  features: z.array(z.string().trim()).optional(),
  technologies: z.array(z.string().trim()).optional(),
  constraints: z
    .object({
      teamSize: z.number().int().min(1).max(12).optional(),
      developmentWeeks: z.number().int().min(1).max(52).optional(),
      technicalExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      hardware: z.string().trim().max(120).optional(),
      datasets: z.string().trim().max(120).optional(),
      budget: z.string().trim().max(120).optional(),
    })
    .optional(),
  studentDecisions: z
    .array(
      z.object({
        gapId: z.string().optional(),
        improvementTitle: z.string().trim().min(1),
        decision: z.enum(['ACCEPTED', 'DEFERRED', 'REJECTED']),
        notes: z.string().trim().max(500).optional(),
      })
    )
    .optional(),
  finalContributionStatement: z.string().trim().max(1200).optional(),
})

export const ComparisonController = {
  /**
   * POST /api/ai/comparisons
   */
  async createComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const parsed = createComparisonSchema.parse(req.body || {})

      if (parsed.conversationId) {
        // Strictly enforce conversation ownership if linking
        await conversationService.getConversation(parsed.conversationId, ownerId)
      }

      const { report, retrievedMatches } = await researchGapService.analyzeAndCompare({
        title: parsed.title,
        description: parsed.description,
        features: parsed.features,
        technologies: parsed.technologies,
        targetUsers: parsed.targetUsers,
        objectives: parsed.objectives,
        constraints: parsed.constraints,
      })

      const session = await ComparisonSessionRepository.create({
        ownerId,
        conversationId: parsed.conversationId,
        proposedTitle: report.A_proposedProject.title,
        proposedDescription: parsed.description,
        proposedFeatures: parsed.features,
        proposedTechnologies: parsed.technologies,
        constraintsSnapshot: parsed.constraints || {},
        retrievedProjectIds: retrievedMatches.map((m) => m.project.id),
        report,
        studentDecisions: [],
        finalContributionStatement: report.J_suggestedProjectContribution,
        version: 1,
      })

      if (parsed.conversationId) {
        await contextManager
          .updateContext(parsed.conversationId, ownerId, {
            lastTopicCovered: `Project Comparison Session ${session.id}`,
            topicsDiscussed: [`Structured Comparison: ${session.proposedTitle}`],
          })
          .catch(() => {})
      }

      res.status(201).json({
        success: true,
        data: session,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/comparisons
   */
  async listComparisons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await ComparisonSessionRepository.listByOwner(req.user!.id)
      res.json({
        success: true,
        data: sessions,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/comparisons/:id
   */
  async getComparisonById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await ComparisonSessionRepository.findById(String(req.params.id))
      if (!session) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Comparison session not found.' },
        })
        return
      }
      if (session.ownerId !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Forbidden: You do not have permission to view this comparison session.',
          },
        })
        return
      }

      res.json({
        success: true,
        data: session,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PATCH /api/ai/comparisons/:id
   * Revisit comparison, re-run analysis when scope changes, or save student decisions / final contribution
   */
  async updateComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await ComparisonSessionRepository.findById(String(req.params.id))
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Comparison session not found.' },
        })
        return
      }
      if (existing.ownerId !== req.user!.id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Forbidden: You do not own this comparison session.',
          },
        })
        return
      }

      const parsed = updateComparisonSchema.parse(req.body || {})
      const scopeChanged = Boolean(
        parsed.title || parsed.description || parsed.features || parsed.technologies || parsed.constraints
      )

      const nextTitle = parsed.title || existing.proposedTitle
      const nextDescription = parsed.description || existing.proposedDescription
      const nextFeatures = parsed.features || existing.proposedFeatures
      const nextTech = parsed.technologies || existing.proposedTechnologies
      const nextConstraints = parsed.constraints
        ? { ...existing.constraintsSnapshot, ...parsed.constraints }
        : existing.constraintsSnapshot

      let nextReport = existing.report
      let nextRetrievedIds = existing.retrievedProjectIds
      let nextVersion = existing.version

      if (scopeChanged) {
        const refreshed = await researchGapService.analyzeAndCompare({
          title: nextTitle,
          description: nextDescription,
          features: nextFeatures,
          technologies: nextTech,
          constraints: nextConstraints,
        })
        nextReport = refreshed.report
        nextRetrievedIds = refreshed.retrievedMatches.map((m) => m.project.id)
        nextVersion = existing.version + 1
      }

      const nextDecisions = parsed.studentDecisions
        ? parsed.studentDecisions.map((d) => ({ ...d, decidedAt: new Date() }))
        : existing.studentDecisions

      const updated = await ComparisonSessionRepository.update(existing.id, {
        proposedTitle: nextTitle,
        proposedDescription: nextDescription,
        proposedFeatures: nextFeatures,
        proposedTechnologies: nextTech,
        constraintsSnapshot: nextConstraints,
        retrievedProjectIds: nextRetrievedIds,
        report: nextReport,
        studentDecisions: nextDecisions,
        finalContributionStatement:
          parsed.finalContributionStatement !== undefined
            ? parsed.finalContributionStatement
            : scopeChanged
            ? nextReport.J_suggestedProjectContribution
            : existing.finalContributionStatement,
        version: nextVersion,
      })

      res.json({
        success: true,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },
}
