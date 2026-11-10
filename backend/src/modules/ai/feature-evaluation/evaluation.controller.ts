import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { contextEngine } from './context.engine.js'
import { evaluationEngine } from './evaluation.engine.js'
import { decisionService } from './decision.service.js'
import { scopeGenerator } from './scope.generator.js'
import { EvaluationRepository, IProjectConstraints } from './evaluation.model.js'
import { repositorySearchService } from '../../repository/repository.search.service.js'
import { contextManager } from '../conversational-engine/context.manager.js'

// Validation Schemas
const initiateEvaluationSchema = z.object({
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  projectTitle: z.string().trim().optional(),
  problemStatement: z.string().trim().optional(),
  coreObjectives: z.array(z.string()).optional(),
  existingFeatures: z.array(z.string()).optional(),
  proposedFeatures: z.array(z.string()).optional(),
  constraints: z
    .object({
      teamSize: z.number().int().min(1).max(10).optional(),
      technicalExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      developmentWeeks: z.number().int().min(2).max(52).optional(),
      semesterDeadline: z.string().optional(),
      languagesAndFrameworks: z.array(z.string()).optional(),
      hardwareResources: z.array(z.string()).optional(),
      budget: z.string().optional(),
      academicRequirements: z.string().optional(),
    })
    .optional(),
  conversationSnippet: z.string().optional(),
})

const recordDecisionSchema = z.object({
  featureId: z.string().trim().min(1, 'Feature ID is required'),
  decision: z.enum(['ACCEPTED', 'REJECTED', 'MODIFIED']),
  modifiedScope: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const reassessSchema = z.object({
  constraints: z
    .object({
      teamSize: z.number().int().min(1).max(10).optional(),
      technicalExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      developmentWeeks: z.number().int().min(2).max(52).optional(),
      semesterDeadline: z.string().optional(),
      languagesAndFrameworks: z.array(z.string()).optional(),
      hardwareResources: z.array(z.string()).optional(),
      budget: z.string().optional(),
      academicRequirements: z.string().optional(),
    })
    .optional(),
  proposedFeatures: z.array(z.string()).optional(),
})

const updateScopeSchema = z.object({
  title: z.string().trim().optional(),
  problemStatement: z.string().trim().optional(),
  coreObjectives: z.array(z.string()).optional(),
  essentialFeatures: z.array(z.string()).optional(),
  acceptedRecommendedFeatures: z.array(z.string()).optional(),
  acceptedOptionalFeatures: z.array(z.string()).optional(),
  technologyStack: z.array(z.string()).optional(),
  knownRisks: z.array(z.string()).optional(),
  explicitAssumptions: z.array(z.string()).optional(),
})

export const EvaluationController = {
  /**
   * POST /api/ai/evaluations
   * Run 7-dimensional feature evaluation
   */
  async createEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const parsed = initiateEvaluationSchema.parse(req.body)

      // 0. Enrich from conversation context if linked to an AI Mentor conversation
      let enrichedInput: any = { ...parsed }
      if (parsed.conversationId) {
        try {
          const convContext = await contextManager.getOrCreateContext(parsed.conversationId, ownerId)
          if (!enrichedInput.projectTitle && convContext.currentProjectIdea) {
            enrichedInput.projectTitle = convContext.currentProjectIdea
          }
          if ((!enrichedInput.proposedFeatures || enrichedInput.proposedFeatures.length === 0) && convContext.proposedFeatures?.length > 0) {
            enrichedInput.proposedFeatures = convContext.proposedFeatures
          }
          if ((!enrichedInput.coreObjectives || enrichedInput.coreObjectives.length === 0) && convContext.studentObjectives?.length > 0) {
            enrichedInput.coreObjectives = convContext.studentObjectives
          }
          enrichedInput.constraints = {
            ...(convContext.teamSize ? { teamSize: convContext.teamSize } : {}),
            ...(convContext.technicalExperience ? { technicalExperience: convContext.technicalExperience } : {}),
            ...(convContext.preferredTechnologies?.length ? { languagesAndFrameworks: convContext.preferredTechnologies } : {}),
            ...(parsed.constraints || {}),
          }
        } catch {
          // Ignore if conversation doesn't exist or belongs to another context; proceed with provided payload
        }
      }

      // 1. Resolve context
      const context = contextEngine.resolveContext(enrichedInput, parsed.conversationSnippet)

      // 2. Run 7-dimensional evaluation engine
      const { evaluatedFeatures, overallFeasibility } = evaluationEngine.evaluateProject(context)

      // 3. Query Repository Intelligence (Task 8 integration)
      let repositoryComparison: any = null
      try {
        const repoMatches = await repositorySearchService.compareStudentIdea(
          context.projectTitle,
          context.problemStatement,
          context.constraints.languagesAndFrameworks
        )

        const significantMatches = repoMatches.filter((m) => m.classification !== 'INDEPENDENT_WORK')
        if (significantMatches.length > 0) {
          repositoryComparison = {
            hasMatches: true,
            matches: significantMatches.map((m) => ({
              title: m.project.title,
              academicYear: m.project.academicYear,
              department: m.project.department,
              classification: m.classification,
              overlapScore: m.score,
              documentedSimilarities: m.analysis.similaritiesWithIdea,
              documentedDifferences: m.analysis.differencesWithIdea,
              possibleImprovements: m.analysis.improvementOpportunities,
              academicCritique: m.academicCritique,
            })),
            notice:
              'Repository Note: Project similarities indicate domain precedents and benchmarks for learning. Similarity is never treated as proof of plagiarism in CampusProjectHub.',
          }
        } else {
          repositoryComparison = {
            hasMatches: false,
            matches: [],
            notice:
              'College repository comparison completed: No conflicting historical projects found with significant concept overlap.',
          }
        }
      } catch (repoErr) {
        repositoryComparison = {
          hasMatches: false,
          matches: [],
          notice:
            'College repository comparison temporarily unavailable; evaluation completed using core engineering criteria.',
        }
      }

      // 4. Persist evaluation record (version 1)
      const evaluation = await EvaluationRepository.create({
        ownerId,
        projectId: parsed.projectId,
        conversationId: parsed.conversationId,
        projectTitle: context.projectTitle,
        problemStatement: context.problemStatement,
        coreObjectives: context.coreObjectives,
        version: 1,
        constraints: context.constraints,
        overallFeasibility,
        features: evaluatedFeatures,
        decisions: [],
        repositoryComparison,
      })

      if (parsed.conversationId) {
        try {
          await contextManager.updateContext(parsed.conversationId, ownerId, {
            activeEvaluationId: evaluation.id,
          })
        } catch {
          // Non-blocking
        }
      }

      res.status(201).json({
        success: true,
        data: evaluation,
        assumptions: context.assumptions,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/evaluations/:id
   */
  async getEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)

      const evaluation = await EvaluationRepository.findById(id)
      if (!evaluation) {
        res.status(404).json({ success: false, error: { message: 'Evaluation not found' } })
        return
      }

      if (evaluation.ownerId !== ownerId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: { message: 'Forbidden: You do not own this evaluation' } })
        return
      }

      res.json({
        success: true,
        data: evaluation,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/evaluations/conversation/:conversationId
   */
  async getLatestByConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const conversationId = String(req.params.conversationId)
      const evaluation = await EvaluationRepository.findLatestByConversation(conversationId)

      if (!evaluation) {
        res.status(404).json({ success: false, error: { message: 'No evaluation found for this conversation' } })
        return
      }

      if (evaluation.ownerId !== ownerId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: { message: 'Forbidden: You do not own this evaluation' } })
        return
      }

      res.json({
        success: true,
        data: evaluation,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PATCH /api/ai/evaluations/:id/decisions
   * Record student decision: ACCEPT, REJECT, or MODIFY
   */
  async recordDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const parsed = recordDecisionSchema.parse(req.body)

      const updated = await decisionService.recordDecision(id, ownerId, parsed)

      res.json({
        success: true,
        message: `Decision "${parsed.decision}" recorded for feature "${parsed.featureId}"`,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/:id/reassess
   * Reassess features after constraint changes while strictly preserving prior student decisions
   */
  async reassessEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const parsed = reassessSchema.parse(req.body)

      const existing = await EvaluationRepository.findById(id)
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Evaluation not found' } })
        return
      }

      if (existing.ownerId !== ownerId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden: You do not own this evaluation' } })
        return
      }

      // Merge updated constraints
      const updatedConstraints: IProjectConstraints = {
        ...existing.constraints,
        ...(parsed.constraints || {}),
      }

      const featureNamesToEvaluate = parsed.proposedFeatures || existing.features.map((f) => f.name)

      // Re-evaluate
      const context = contextEngine.resolveContext({
        projectTitle: existing.projectTitle,
        problemStatement: existing.problemStatement || existing.finalScope?.problemStatement,
        coreObjectives: existing.coreObjectives || existing.finalScope?.coreObjectives,
        proposedFeatures: featureNamesToEvaluate,
        constraints: updatedConstraints,
      })

      const { evaluatedFeatures, overallFeasibility } = evaluationEngine.evaluateProject(context)

      // Preserve student decisions
      const preservedDecisions = existing.decisions

      const updatedRecord = await EvaluationRepository.update(id, {
        version: existing.version + 1,
        constraints: updatedConstraints,
        features: evaluatedFeatures,
        overallFeasibility,
        decisions: preservedDecisions,
      })

      res.json({
        success: true,
        message: `Evaluation updated to version ${existing.version + 1} with preserved decisions`,
        data: updatedRecord,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/:id/generate-scope
   * Compile final implementation scope from accepted decisions
   */
  async generateScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)

      const updated = await scopeGenerator.generateScope(id, ownerId)

      res.json({
        success: true,
        message: 'Final project scope generated successfully',
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PATCH /api/ai/evaluations/:id/scope
   * Student custom edit on final scope
   */
  async updateScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const parsed = updateScopeSchema.parse(req.body)

      const updated = await scopeGenerator.updateScope(id, ownerId, parsed as any)

      res.json({
        success: true,
        message: 'Final project scope updated',
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/evaluate-feature
   * Standalone natural-language feature evaluation
   */
  async evaluateFeatureStandalone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { featureName, constraints, projectContext, conversationHistory } = req.body
      if (!featureName || typeof featureName !== 'string' || featureName.trim().length === 0) {
        res.status(400).json({ success: false, error: { message: 'Feature name is required' } })
        return
      }

      const evaluatedFeature = evaluationEngine.evaluateSingleFeature(
        featureName.trim(),
        constraints,
        projectContext
      )

      const followUp = contextEngine.getNextFollowUpQuestion(
        { constraints, ...projectContext },
        conversationHistory || featureName
      )

      res.json({
        success: true,
        data: {
          feature: evaluatedFeature,
          followUpQuestion: followUp,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/:id/scope/versions
   * Create an explicit new immutable scope version
   */
  async createScopeVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const changeSummary = req.body.changeSummary || 'Scope version snapshot'

      const updated = await scopeGenerator.createScopeVersion(id, ownerId, changeSummary)
      res.status(201).json({
        success: true,
        message: 'New scope version created successfully',
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/evaluations/:id/scope/versions
   * List all historical scope versions
   */
  async listScopeVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)

      const evaluation = await EvaluationRepository.findById(id)
      if (!evaluation) {
        res.status(404).json({ success: false, error: { message: 'Evaluation not found' } })
        return
      }

      if (evaluation.ownerId !== ownerId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      res.json({
        success: true,
        data: evaluation.scopeVersions || [],
        auditHistory: evaluation.scopeAuditHistory || [],
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/evaluations/:id/scope/versions/:version
   */
  async getScopeVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const version = Number(req.params.version)

      const evaluation = await EvaluationRepository.findById(id)
      if (!evaluation) {
        res.status(404).json({ success: false, error: { message: 'Evaluation not found' } })
        return
      }

      if (evaluation.ownerId !== ownerId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const versionRecord = evaluation.scopeVersions?.find((v) => v.version === version)
      if (!versionRecord) {
        res.status(404).json({ success: false, error: { message: `Scope version ${version} not found` } })
        return
      }

      res.json({
        success: true,
        data: versionRecord,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/:id/scope/versions/:version/restore
   * Restore a previous version as the active scope
   */
  async restoreScopeVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const version = Number(req.params.version)

      const updated = await scopeGenerator.restoreScopeVersion(id, ownerId, version)
      res.json({
        success: true,
        message: `Scope version ${version} restored successfully`,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/:id/scope/compare
   * Compare two scope versions and produce diff analysis
   */
  async compareScopeVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)
      const versionA = Number(req.body.versionA)
      const versionB = Number(req.body.versionB)

      if (!versionA || !versionB) {
        res.status(400).json({ success: false, error: { message: 'versionA and versionB numbers are required' } })
        return
      }

      const comparison = await scopeGenerator.compareScopeVersions(id, ownerId, versionA, versionB)
      res.json({
        success: true,
        data: comparison,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/evaluations/:id/scope/finalize
   * Explicit student confirmation to finalize scope for academic review
   */
  async finalizeScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id
      const id = String(req.params.id)

      const updated = await scopeGenerator.finalizeScope(id, ownerId)
      res.json({
        success: true,
        message: 'Project scope finalized successfully for faculty review',
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  },
}
