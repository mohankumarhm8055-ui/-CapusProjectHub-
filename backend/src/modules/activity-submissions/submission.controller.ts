import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { z } from 'zod'
import {
  MAX_EVIDENCE_FILES_PER_SUBMISSION,
  MAX_EVIDENCE_FILE_BYTES,
  type ValidatedUploadInput,
} from './evidence.storage.js'
import { activitySubmissionService } from './submission.service.js'
import type { EvidenceCategory, IEvidenceLink } from './submission.types.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EVIDENCE_FILE_BYTES,
    files: MAX_EVIDENCE_FILES_PER_SUBMISSION,
  },
})

export const evidenceUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Pass JSON payloads directly through while handling multipart/form-data file streams via multer
  if (!req.is('multipart/form-data')) {
    next()
    return
  }
  upload.array('files', MAX_EVIDENCE_FILES_PER_SUBMISSION)(req, res, (err: any) => {
    if (!err) {
      next()
      return
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(
          Object.assign(new Error('File exceeds the 10 MB maximum file size limit.'), {
            statusCode: 400,
            code: 'FILE_TOO_LARGE',
          })
        )
        return
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        next(
          Object.assign(
            new Error(`At most ${MAX_EVIDENCE_FILES_PER_SUBMISSION} files may be attached per submission.`),
            { statusCode: 400, code: 'TOO_MANY_FILES' }
          )
        )
        return
      }
    }
    next(
      Object.assign(new Error(err?.message || 'Invalid file upload request.'), {
        statusCode: 400,
        code: 'UPLOAD_ERROR',
      })
    )
  })
}

const EvidenceLinkSchema = z.object({
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

const SubmissionBodySchema = z.object({
  description: z.string().trim().min(5, 'Provide a brief submission description (at least 5 characters).').max(2000),
  links: z.array(EvidenceLinkSchema).optional().default([]),
  evidenceCategories: z.array(z.string()).optional().default([]),
})

const ReviewTransitionSchema = z.object({
  outcome: z.enum(['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']),
  feedback: z.string().trim().max(2000).default(''),
  correctionInstructions: z.string().trim().max(2000).optional(),
})

function parseMultipartOrJsonBody(req: Request): {
  description: string
  links: IEvidenceLink[]
  files: ValidatedUploadInput[]
} {
  let rawLinks = req.body?.links
  if (typeof rawLinks === 'string') {
    try {
      rawLinks = rawLinks.trim() ? JSON.parse(rawLinks) : []
    } catch {
      throw Object.assign(new Error('Invalid JSON in links field.'), {
        statusCode: 400,
        code: 'INVALID_LINKS_JSON',
      })
    }
  }

  let rawCategories = req.body?.evidenceCategories
  if (typeof rawCategories === 'string') {
    try {
      rawCategories = rawCategories.trim() ? JSON.parse(rawCategories) : []
    } catch {
      rawCategories = []
    }
  }

  const parsed = SubmissionBodySchema.parse({
    description: req.body?.description ?? '',
    links: rawLinks ?? [],
    evidenceCategories: Array.isArray(rawCategories) ? rawCategories : [],
  })

  const multerFiles = (req.files as Express.Multer.File[] | undefined) || []
  const files: ValidatedUploadInput[] = multerFiles.map((f, idx) => ({
    originalName: f.originalname,
    declaredMimeType: f.mimetype,
    buffer: f.buffer,
    evidenceCategory: parsed.evidenceCategories[idx] as EvidenceCategory | undefined,
  }))

  return {
    description: parsed.description,
    links: parsed.links,
    files,
  }
}

export const ActivitySubmissionController = {
  async listWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await activitySubmissionService.listAuthorizedWorkspaces(req.user!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await activitySubmissionService.getWorkspaceDetail(
        req.user!,
        String(req.params.scheduleId)
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getActivityDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await activitySubmissionService.getActivityDetail(
        req.user!,
        String(req.params.scheduleId),
        String(req.params.activityId)
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async submitInitial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = parseMultipartOrJsonBody(req)
      const result = await activitySubmissionService.submitInitialEvidence(
        req.user!,
        String(req.params.scheduleId),
        String(req.params.activityId),
        input
      )
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async resubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = parseMultipartOrJsonBody(req)
      const result = await activitySubmissionService.resubmitRevisedEvidence(
        req.user!,
        String(req.params.scheduleId),
        String(req.params.activityId),
        input
      )
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async transitionReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ReviewTransitionSchema.parse(req.body)
      if (
        (parsed.outcome === 'CHANGES_REQUESTED' || parsed.outcome === 'REJECTED') &&
        parsed.feedback.trim().length < 5
      ) {
        throw Object.assign(
          new Error(
            parsed.outcome === 'REJECTED'
              ? 'Provide a clear rejection reason (at least 5 characters).'
              : 'Provide faculty feedback (at least 5 characters) when requesting changes.'
          ),
          { statusCode: 400, code: 'FEEDBACK_REQUIRED' }
        )
      }
      const updated = await activitySubmissionService.transitionSubmissionReviewStatus(
        req.user!,
        String(req.params.submissionId),
        parsed
      )
      res.json({ success: true, data: updated })
    } catch (err) {
      next(err)
    }
  },

  async downloadEvidenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { record, buffer } = await activitySubmissionService.authorizeAndReadEvidenceFile(
        req.user!,
        String(req.params.fileId)
      )
      const isDownload = req.query.download === 'true'
      const dispositionType = isDownload ? 'attachment' : 'inline'
      const cleanName = record.originalName.replace(/"/g, '')

      res.setHeader('Content-Type', record.mimeType)
      res.setHeader('Content-Length', String(buffer.length))
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${cleanName}"`)
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.send(buffer)
    } catch (err) {
      next(err)
    }
  },
}
