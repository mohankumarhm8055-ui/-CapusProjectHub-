import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { ValidatedUploadInput } from '../activity-submissions/evidence.storage.js'
import type { EvidenceCategory, IEvidenceLink } from '../activity-submissions/submission.types.js'
import { weeklyReportService } from './weeklyReport.service.js'

const LinkSchema = z.object({
  url: z.string().trim().min(4),
  linkType: z
    .enum([
      'GITHUB_REPOSITORY',
      'DEMO_URL',
      'RESEARCH_PAPER',
      'DOCUMENTATION_URL',
      'DESIGN_LINK',
      'OTHER',
    ])
    .optional()
    .default('OTHER'),
  label: z.string().trim().max(120).optional().default(''),
})

const ReportSectionsBodySchema = z.object({
  workCompleted: z.string().max(5000).optional().default(''),
  workInProgress: z.string().max(5000).optional().default(''),
  challengesOrBlockers: z.string().max(5000).optional().default(''),
  planForNextWeek: z.string().max(5000).optional().default(''),
  supportingEvidenceNotes: z.string().max(5000).optional().default(''),
  links: z.array(LinkSchema).optional().default([]),
  evidenceCategories: z.array(z.string()).optional().default([]),
  retainFileIds: z.array(z.string()).optional(),
})

const ContributionBodySchema = z.object({
  workPerformed: z.string().trim().min(4, 'Describe the work performed (at least 4 characters).').max(3000),
  relatedActivityId: z.string().trim().optional(),
  supportingEvidenceNote: z.string().trim().max(2000).optional(),
  links: z.array(LinkSchema).optional().default([]),
  evidenceCategories: z.array(z.string()).optional().default([]),
})

const FacultyReviewBodySchema = z.object({
  action: z.enum(['COMMENT', 'MARK_UNDER_REVIEW', 'REQUEST_CLARIFICATION', 'FINALIZE']),
  comment: z.string().trim().max(3000).optional().default(''),
})

function parseJsonArrayField(raw: unknown, fieldName: string): any[] | undefined {
  if (raw === undefined) return undefined
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      throw Object.assign(new Error(`Invalid JSON in ${fieldName} field.`), {
        statusCode: 400,
        code: 'INVALID_JSON_FIELD',
      })
    }
  }
  return Array.isArray(raw) ? raw : []
}

function extractUploadedFiles(req: Request, categories: string[]): ValidatedUploadInput[] {
  const multerFiles = (req.files as Express.Multer.File[] | undefined) || []
  return multerFiles.map((f, idx) => ({
    originalName: f.originalname,
    declaredMimeType: f.mimetype,
    buffer: f.buffer,
    evidenceCategory: categories[idx] as EvidenceCategory | undefined,
  }))
}

export const WeeklyReportController = {
  async listWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await weeklyReportService.listAuthorizedWorkspaces(req.user!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getProjectReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await weeklyReportService.getProjectWeeklyReports(
        req.user!,
        String(req.params.scheduleId)
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getWeekDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const weekNumber = Number(req.params.weekNumber)
      if (!Number.isInteger(weekNumber) || weekNumber < 1) {
        res.status(400).json({ success: false, error: { message: 'Invalid week number.' } })
        return
      }
      const data = await weeklyReportService.getWeekReportDetail(
        req.user!,
        String(req.params.scheduleId),
        weekNumber
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const weekNumber = Number(req.params.weekNumber)
      const parsed = ReportSectionsBodySchema.parse({
        workCompleted: req.body?.workCompleted ?? '',
        workInProgress: req.body?.workInProgress ?? '',
        challengesOrBlockers: req.body?.challengesOrBlockers ?? '',
        planForNextWeek: req.body?.planForNextWeek ?? '',
        supportingEvidenceNotes: req.body?.supportingEvidenceNotes ?? '',
        links: parseJsonArrayField(req.body?.links, 'links') ?? [],
        evidenceCategories: parseJsonArrayField(req.body?.evidenceCategories, 'evidenceCategories') ?? [],
        retainFileIds: parseJsonArrayField(req.body?.retainFileIds, 'retainFileIds'),
      })
      const files = extractUploadedFiles(req, parsed.evidenceCategories)
      const data = await weeklyReportService.saveDraft(
        req.user!,
        String(req.params.scheduleId),
        weekNumber,
        { ...parsed, links: parsed.links as IEvidenceLink[], files }
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async upsertContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const weekNumber = Number(req.params.weekNumber)
      const parsed = ContributionBodySchema.parse({
        workPerformed: req.body?.workPerformed ?? '',
        relatedActivityId: req.body?.relatedActivityId || undefined,
        supportingEvidenceNote: req.body?.supportingEvidenceNote || undefined,
        links: parseJsonArrayField(req.body?.links, 'links') ?? [],
        evidenceCategories: parseJsonArrayField(req.body?.evidenceCategories, 'evidenceCategories') ?? [],
      })
      const files = extractUploadedFiles(req, parsed.evidenceCategories)
      const data = await weeklyReportService.upsertIndividualContribution(
        req.user!,
        String(req.params.scheduleId),
        weekNumber,
        { ...parsed, links: parsed.links as IEvidenceLink[], files }
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async submitReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const weekNumber = Number(req.params.weekNumber)
      const parsed = ReportSectionsBodySchema.parse({
        workCompleted: req.body?.workCompleted ?? '',
        workInProgress: req.body?.workInProgress ?? '',
        challengesOrBlockers: req.body?.challengesOrBlockers ?? '',
        planForNextWeek: req.body?.planForNextWeek ?? '',
        supportingEvidenceNotes: req.body?.supportingEvidenceNotes ?? '',
        links: parseJsonArrayField(req.body?.links, 'links') ?? [],
        evidenceCategories: parseJsonArrayField(req.body?.evidenceCategories, 'evidenceCategories') ?? [],
        retainFileIds: parseJsonArrayField(req.body?.retainFileIds, 'retainFileIds'),
      })
      const files = extractUploadedFiles(req, parsed.evidenceCategories)
      const data = await weeklyReportService.submitWeeklyReport(
        req.user!,
        String(req.params.scheduleId),
        weekNumber,
        { ...parsed, links: parsed.links as IEvidenceLink[], files }
      )
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async reviewReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = FacultyReviewBodySchema.parse(req.body)
      const data = await weeklyReportService.reviewWeeklyReport(
        req.user!,
        String(req.params.reportId),
        parsed
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async listReminderCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await weeklyReportService.listReminderCandidates(req.user!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { record, buffer } = await weeklyReportService.authorizeAndReadWeeklyFile(
        req.user!,
        String(req.params.fileId)
      )
      const isDownload = req.query.download === 'true'
      const disposition = isDownload ? 'attachment' : 'inline'
      const cleanName = record.originalName.replace(/"/g, '')

      res.setHeader('Content-Type', record.mimeType)
      res.setHeader('Content-Length', String(buffer.length))
      res.setHeader('Content-Disposition', `${disposition}; filename="${cleanName}"`)
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.send(buffer)
    } catch (err) {
      next(err)
    }
  },
}
