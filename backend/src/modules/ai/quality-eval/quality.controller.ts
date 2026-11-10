import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { QUALITY_DIMENSIONS } from './quality.types.js'
import {
  EVALUATION_DATASET_VERSION,
  QUALITY_EVALUATION_DATASET,
} from './quality.dataset.js'
import { aiQualityEvaluator } from './quality.evaluator.js'
import { EvalRunRepository } from './quality.model.js'

const runEvalSchema = z.object({
  label: z.string().trim().max(120).optional(),
  promptConfigTag: z.string().trim().max(60).optional(),
  categories: z.array(z.string().trim()).optional(),
  includeAdvisoryJudge: z.boolean().optional().default(false),
  persist: z.boolean().optional().default(true),
})

const compareRunsSchema = z.object({
  baselineRunId: z.string().trim().min(1),
  candidateRunId: z.string().trim().min(1),
})

export const QualityEvalController = {
  /**
   * GET /api/ai/quality-eval/dataset
   */
  getDatasetOverview(_req: Request, res: Response): void {
    res.json({
      success: true,
      data: {
        datasetVersion: EVALUATION_DATASET_VERSION,
        dimensions: QUALITY_DIMENSIONS,
        totalCases: QUALITY_EVALUATION_DATASET.length,
        totalTurns: QUALITY_EVALUATION_DATASET.reduce((sum, c) => sum + c.turns.length, 0),
        cases: QUALITY_EVALUATION_DATASET.map((c) => ({
          caseId: c.caseId,
          title: c.title,
          category: c.category,
          recordBasis: c.recordBasis,
          labelNotice: c.labelNotice,
          turnsCount: c.turns.length,
        })),
      },
    })
  },

  /**
   * POST /api/ai/quality-eval/run
   */
  async runEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = runEvalSchema.parse(req.body || {})
      const report = await aiQualityEvaluator.evaluateDataset(parsed)
      res.status(201).json({
        success: true,
        data: report,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/quality-eval/runs
   */
  async listRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
      const runs = await EvalRunRepository.listRecent(limit)
      res.json({
        success: true,
        data: runs,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/ai/quality-eval/runs/:runId
   */
  async getRunById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const run = await EvalRunRepository.findById(String(req.params.runId))
      if (!run) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Evaluation run not found.' },
        })
        return
      }
      res.json({
        success: true,
        data: run,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/ai/quality-eval/compare
   */
  async compareRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { baselineRunId, candidateRunId } = compareRunsSchema.parse(req.body || {})
      const [baseline, candidate] = await Promise.all([
        EvalRunRepository.findById(baselineRunId),
        EvalRunRepository.findById(candidateRunId),
      ])

      if (!baseline || !candidate) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Baseline or candidate evaluation run not found.' },
        })
        return
      }

      const comparison = aiQualityEvaluator.compareRuns(baseline, candidate)
      res.json({
        success: true,
        data: comparison,
      })
    } catch (err) {
      next(err)
    }
  },
}
