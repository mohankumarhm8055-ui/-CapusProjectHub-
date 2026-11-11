import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { facultyReviewService } from './facultyReview.service.js'

const DecisionSchema = z.object({
  outcome: z.enum(['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']),
  feedback: z.string().trim().max(3000).default(''),
  correctionInstructions: z.string().trim().max(2000).optional(),
})

const FeedbackSchema = z.object({
  comment: z.string().trim().min(4, 'Provide structured feedback (at least 4 characters).').max(3000),
  correctionInstructions: z.string().trim().max(2000).optional(),
})

const WeeklyReviewSchema = z.object({
  action: z.enum(['COMMENT', 'MARK_UNDER_REVIEW', 'REQUEST_CLARIFICATION', 'FINALIZE']),
  comment: z.string().trim().max(3000).optional().default(''),
})

export const FacultyReviewController = {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await facultyReviewService.getDashboard(req.user!, {
        scheduleId: req.query.scheduleId ? String(req.query.scheduleId) : undefined,
        projectId: req.query.projectId ? String(req.query.projectId) : undefined,
        activityId: req.query.activityId ? String(req.query.activityId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        submissionDate: req.query.submissionDate ? String(req.query.submissionDate) : undefined,
        teamSearch: req.query.teamSearch ? String(req.query.teamSearch) : undefined,
      })
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getSubmissionDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await facultyReviewService.getSubmissionReviewDetail(
        req.user!,
        String(req.params.submissionId)
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async submitDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = DecisionSchema.parse(req.body)
      const data = await facultyReviewService.recordDecision(
        req.user!,
        String(req.params.submissionId),
        parsed
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async addFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = FeedbackSchema.parse(req.body)
      const data = await facultyReviewService.addFeedback(
        req.user!,
        String(req.params.submissionId),
        parsed
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async reviewWeeklyReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = WeeklyReviewSchema.parse(req.body)
      const data = await facultyReviewService.reviewWeeklyReport(
        req.user!,
        String(req.params.reportId),
        parsed
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
}
