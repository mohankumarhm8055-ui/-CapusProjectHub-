import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { ValidatedUploadInput } from '../activity-submissions/evidence.storage.js'
import type { EvidenceCategory } from '../activity-submissions/submission.types.js'
import {
  finalLifecycleService,
  type FinalFileSlot,
} from './lifecycle.service.js'
import type { IFinalMetadataPayload } from './lifecycle.types.js'

const DeliverableConfigUpdateSchema = z.object({
  mandatoryDeliverables: z
    .object({
      finalReport: z.boolean(),
      presentation: z.boolean(),
      sourceCodeOrGithub: z.boolean(),
      architectureDiagram: z.boolean(),
      screenshots: z.boolean(),
      demoLinkOrVideo: z.boolean(),
    })
    .optional(),
  requireStartedWeeklyReportsSubmitted: z.boolean().optional(),
  requireAllWeeklyReportsSubmitted: z.boolean().optional(),
  minimumWeeklyReportsRequired: z.number().int().min(0).max(60).optional(),
})

const FinalReviewActionSchema = z.object({
  action: z.enum(['ADD_FEEDBACK', 'REQUEST_CORRECTIONS', 'APPROVE_COMPLETION']),
  comment: z.string().trim().max(3000).optional().default(''),
})

const ReasonSchema = z.object({
  reason: z.string().trim().min(5, 'Provide a clear reason (at least 5 characters).').max(1000),
})

const PublicationDraftSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  abstract: z.string().trim().min(10).max(5000).optional(),
  academicYear: z.string().trim().min(4).max(30).optional(),
  batch: z.string().trim().max(40).optional(),
  department: z.string().trim().min(2).max(120).optional(),
  semester: z.string().trim().max(40).optional(),
  category: z.string().trim().max(120).optional(),
  problemStatement: z.string().trim().min(10).max(5000).optional(),
  objectives: z.array(z.string()).optional(),
  proposedSolution: z.string().trim().min(5).max(5000).optional(),
  modules: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        description: z.string().trim().min(1),
        features: z.array(z.string()).optional(),
      })
    )
    .optional(),
  technologyStack: z
    .array(z.object({ name: z.string().trim().min(1), category: z.string().optional() }))
    .optional(),
  architectureDescription: z.string().trim().max(5000).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional(),
  futureEnhancements: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  selectedScreenshotFileIds: z.array(z.string()).optional(),
  selectedArchitectureDiagramFileId: z.string().optional(),
  selectedFinalReportFileId: z.string().optional(),
  githubUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  documentationUrl: z.string().optional(),
  teamMembers: z
    .array(
      z.object({
        studentId: z.string().optional(),
        name: z.string().trim().min(1),
        role: z.string().optional(),
        department: z.string().optional(),
        isLeader: z.boolean().optional(),
      })
    )
    .optional(),
  facultyGuide: z
    .object({
      name: z.string().trim().min(1),
      designation: z.string().optional(),
      department: z.string().optional(),
    })
    .optional(),
  notifyReady: z.boolean().optional(),
})

function parseJsonBodyField(raw: unknown, fallback: any) {
  if (raw === undefined || raw === null) return fallback
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return fallback
    try {
      return JSON.parse(trimmed)
    } catch {
      throw Object.assign(new Error('Invalid JSON payload in multipart field.'), {
        statusCode: 400,
        code: 'INVALID_JSON',
      })
    }
  }
  return raw
}

function extractMultipartFinalSubmission(req: Request): {
  metadata: IFinalMetadataPayload
  uploads: Array<{ input: ValidatedUploadInput; slot: FinalFileSlot }>
  retainFileIds?: string[]
} {
  const metadata = parseJsonBodyField(req.body?.metadata, req.body?.metadata || {}) as IFinalMetadataPayload
  const slots: FinalFileSlot[] = parseJsonBodyField(req.body?.fileSlots, [])
  const categories: string[] = parseJsonBodyField(req.body?.evidenceCategories, [])
  const retainFileIds =
    req.body?.retainFileIds !== undefined
      ? parseJsonBodyField(req.body.retainFileIds, [])
      : undefined

  const multerFiles = (req.files as Express.Multer.File[] | undefined) || []
  const uploads = multerFiles.map((f, idx) => ({
    slot: (slots[idx] || 'SUPPORTING') as FinalFileSlot,
    input: {
      originalName: f.originalname,
      declaredMimeType: f.mimetype,
      buffer: f.buffer,
      evidenceCategory: categories[idx] as EvidenceCategory | undefined,
    },
  }))

  return { metadata, uploads, retainFileIds }
}

export const FinalLifecycleController = {
  async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await finalLifecycleService.getDeliverableConfig()
      res.json({ success: true, data: config })
    } catch (err) {
      next(err)
    }
  },

  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = DeliverableConfigUpdateSchema.parse(req.body)
      const config = await finalLifecycleService.updateDeliverableConfig(req.user!, parsed)
      res.json({ success: true, data: config })
    } catch (err) {
      next(err)
    }
  },

  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await finalLifecycleService.listAuthorizedProjects(req.user!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getProjectDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await finalLifecycleService.getProjectLifecycleDetail(
        req.user!,
        String(req.params.scheduleId)
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = extractMultipartFinalSubmission(req)
      const data = await finalLifecycleService.saveFinalDraft(
        req.user!,
        String(req.params.scheduleId),
        input
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async submitForFinalReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = extractMultipartFinalSubmission(req)
      const data = await finalLifecycleService.submitForFinalReview(
        req.user!,
        String(req.params.scheduleId),
        input
      )
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async finalReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = FinalReviewActionSchema.parse(req.body)
      const data = await finalLifecycleService.performFinalReview(
        req.user!,
        String(req.params.scheduleId),
        parsed
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async savePublicationDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = PublicationDraftSchema.parse(req.body)
      const data = await finalLifecycleService.savePublicationDraft(
        req.user!,
        String(req.params.scheduleId),
        parsed
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async publishProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await finalLifecycleService.publishToRepository(
        req.user!,
        String(req.params.scheduleId)
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async unpublishProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ReasonSchema.parse(req.body)
      const data = await finalLifecycleService.unpublishOrArchive(
        req.user!,
        String(req.params.scheduleId),
        'UNPUBLISH',
        parsed.reason
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async archiveProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ReasonSchema.parse(req.body)
      const data = await finalLifecycleService.unpublishOrArchive(
        req.user!,
        String(req.params.scheduleId),
        'ARCHIVE',
        parsed.reason
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async downloadInternalFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { record, buffer } = await finalLifecycleService.authorizeAndReadLifecycleFile(
        req.user!,
        String(req.params.fileId)
      )
      const isDownload = req.query.download === 'true'
      res.setHeader('Content-Type', record.mimeType)
      res.setHeader('Content-Length', String(buffer.length))
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${record.originalName.replace(/"/g, '')}"`
      )
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.send(buffer)
    } catch (err) {
      next(err)
    }
  },

  async downloadPublishedAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { record, buffer } = await finalLifecycleService.authorizeAndReadPublishedAsset(
        String(req.params.projectId),
        String(req.params.fileId)
      )
      const isDownload = req.query.download === 'true'
      res.setHeader('Content-Type', record.mimeType)
      res.setHeader('Content-Length', String(buffer.length))
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${record.originalName.replace(/"/g, '')}"`
      )
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.send(buffer)
    } catch (err) {
      next(err)
    }
  },
}
