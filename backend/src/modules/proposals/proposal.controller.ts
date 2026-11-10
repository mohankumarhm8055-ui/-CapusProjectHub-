import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  proposalRepository,
  DocumentType,
  IProposal,
  FacultySubmissionStatus,
} from './proposal.model.js'
import { proposalEngine, SectionImprovementAction, getTemplateById } from './proposal.engine.js'
import { CollegeTemplateRepository } from './template.model.js'
import { proposalReadinessService } from './proposal.readiness.js'
import { proposalExportService } from './proposal.export.service.js'
import { EvaluationRepository } from '../ai/feature-evaluation/evaluation.model.js'
import { contextManager } from '../ai/conversational-engine/context.manager.js'

// Zod validation schemas
export const GenerateProposalSchema = z.object({
  projectTitle: z.string().optional(),
  documentType: z
    .enum([
      'MINI_PROJECT_PROPOSAL',
      'PROJECT_SYNOPSIS',
      'PROJECT_REPORT',
      'PROJECT_ABSTRACT',
      'REVIEW_REPORT',
      'PRESENTATION_OUTLINE',
    ])
    .optional(),
  sourceEvaluationId: z.string().optional(),
  templateId: z.string().optional(),
  isScopeFinalized: z.boolean().optional(),
})

export const UpdateSectionSchema = z.object({
  content: z.string(),
})

export const ImproveSectionSchema = z.object({
  action: z.enum([
    'improve-clarity',
    'correct-grammar',
    'clarify-technical',
    'shorten',
    'expand',
    'check-consistency',
  ]),
  customInstruction: z.string().optional(),
})

export const AddSectionSchema = z.object({
  title: z.string().min(1, 'Section title is required'),
  content: z.string().default(''),
  isMandatory: z.boolean().optional().default(false),
})

export const ReorderSectionsSchema = z.object({
  sectionIds: z.array(z.string()).min(1, 'sectionIds array is required'),
})

export const SaveDraftSchema = z.object({
  projectTitle: z.string().optional(),
  sections: z
    .array(
      z.object({
        sectionId: z.string(),
        content: z.string(),
        title: z.string().optional(),
      })
    )
    .optional(),
})

export const CreateVersionSchema = z.object({
  revisionSummary: z.string().min(1, 'Revision summary is required'),
})

export const CompareVersionsSchema = z.object({
  versionA: z.number().int().positive(),
  versionB: z.number().int().positive(),
})

export const RestoreVersionSchema = z.object({
  versionNumber: z.number().int().positive(),
})

export const SubmitFacultySchema = z.object({
  facultyGuideName: z.string().optional(),
  comments: z.string().optional(),
  facultyId: z.string().optional(),
})

export const FacultyReviewSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']),
  comments: z.string().min(1, 'Faculty comments are required'),
  facultyGuideName: z.string().optional(),
  facultyId: z.string().optional(),
})

export const ResubmitFacultySchema = z.object({
  comments: z.string().optional(),
})

export class ProposalController {
  private getStudentId(req: Request): string {
    if (!req.user?.id) {
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
    }
    return req.user.id
  }

  private isFacultyOrAdmin(req: Request): boolean {
    return req.user?.role === 'faculty' || req.user?.role === 'admin'
  }

  private canReadProposal(req: Request, proposal: IProposal): boolean {
    if (!req.user) return false
    if (proposal.studentId === req.user.id) return true
    if (req.user.role === 'admin') return true
    if (
      req.user.role === 'faculty' &&
      proposal.submission?.status &&
      proposal.submission.status !== 'DRAFT'
    ) {
      return true
    }
    return false
  }

  /**
   * GET /api/proposals/templates
   */
  listTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await CollegeTemplateRepository.listAll()
      res.json({
        success: true,
        data: templates,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/templates (Admin only)
   */
  adminUpsertTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Only administrators can manage college templates.' },
        })
        return
      }
      const tplSchema = z.object({
        templateId: z.string().min(2),
        templateVersion: z.string().default('1.0.0'),
        templateName: z.string().min(2),
        college: z.string().min(2),
        department: z.string().min(2),
        academicYear: z.string().min(2),
        semester: z.string().min(2),
        documentType: z.enum([
          'MINI_PROJECT_PROPOSAL',
          'PROJECT_SYNOPSIS',
          'PROJECT_REPORT',
          'PROJECT_ABSTRACT',
          'REVIEW_REPORT',
          'PRESENTATION_OUTLINE',
        ]),
        mandatorySectionIds: z.array(z.string()).min(1),
        optionalSectionIds: z.array(z.string()).default([]),
      })
      const body = tplSchema.parse(req.body)
      const saved = await CollegeTemplateRepository.upsert(body, req.user.id)
      res.status(201).json({
        success: true,
        message: `College template "${saved.templateName}" saved.`,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * DELETE /api/proposals/templates/:templateId (Admin only)
   */
  adminDeleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Only administrators can delete college templates.' },
        })
        return
      }
      const deleted = await CollegeTemplateRepository.delete(String(req.params.templateId))
      if (!deleted) {
        res.status(404).json({ success: false, error: { message: 'Template not found' } })
        return
      }
      res.json({ success: true, message: 'College template removed.' })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/generate
   */
  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const body = GenerateProposalSchema.parse(req.body)

      let finalScope
      let evaluationId = body.sourceEvaluationId
      let scopeVersion = 1
      let isScopeFinalized = body.isScopeFinalized === true
      let evalProjectTitle: string | undefined
      let conversationId: string | undefined

      if (evaluationId) {
        const evalRecord = await EvaluationRepository.findById(evaluationId)
        if (evalRecord) {
          if (evalRecord.ownerId !== studentId && !this.isFacultyOrAdmin(req)) {
            res.status(403).json({
              success: false,
              error: { message: 'Forbidden: You do not own the source evaluation.' },
            })
            return
          }
          finalScope = evalRecord.finalScope
          scopeVersion = evalRecord.version
          evalProjectTitle = evalRecord.projectTitle
          conversationId = evalRecord.conversationId
          if (body.isScopeFinalized === undefined) {
            isScopeFinalized = evalRecord.isFinalized === true
          }
        }
      }

      const dbTemplate = body.templateId
        ? await CollegeTemplateRepository.findByTemplateId(body.templateId)
        : null
      const resolvedTemplate = dbTemplate
        ? { ...dbTemplate, documentType: (body.documentType as DocumentType) || dbTemplate.documentType }
        : getTemplateById(body.templateId, body.documentType as DocumentType)

      const proposal = proposalEngine.generateProposalFromScope({
        studentId,
        projectTitle: body.projectTitle || evalProjectTitle,
        documentType: (body.documentType as DocumentType) || resolvedTemplate.documentType,
        template: resolvedTemplate,
        sourceEvaluationId: evaluationId,
        sourceScopeVersion: scopeVersion,
        isScopeFinalized,
        scopeStatus: isScopeFinalized ? 'FINALIZED' : 'UNFINALIZED',
        finalScope,
      })

      // Run initial readiness check
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const saved = await proposalRepository.save(proposal)

      if (conversationId) {
        try {
          await contextManager.updateContext(conversationId, studentId, {
            activeProposalId: saved.id,
          })
        } catch {
          // Non-blocking
        }
      }

      res.status(201).json({
        success: true,
        message: isScopeFinalized
          ? 'Academic proposal generated successfully from confirmed finalized scope.'
          : 'Academic proposal draft generated from unfinalized project scope.',
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/proposals
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const list = this.isFacultyOrAdmin(req)
        ? await proposalRepository.findForFaculty()
        : await proposalRepository.findByStudentId(studentId)

      res.json({
        success: true,
        data: list,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * PATCH /api/proposals/:proposalId/template
   * Applies an assigned college template while preserving manual student edits
   */
  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const templateId = String(req.body?.templateId || '').trim()

      if (!templateId) {
        res.status(400).json({ success: false, error: { message: 'templateId is required' } })
        return
      }

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }
      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const dbTemplate = await CollegeTemplateRepository.findByTemplateId(templateId)
      const selectedTemplate = dbTemplate
        ? { ...dbTemplate, documentType: proposal.documentType || dbTemplate.documentType }
        : getTemplateById(templateId, proposal.documentType)
      proposal.template = selectedTemplate
      proposal.updatedAt = new Date().toISOString()
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const saved = await proposalRepository.save(proposal)
      res.json({
        success: true,
        message: `Applied college template "${selectedTemplate.templateName}" (v${selectedTemplate.templateVersion || '1.0.0'}).`,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/proposals/:proposalId
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({
          success: false,
          error: { message: `Proposal not found with ID: ${proposalId}` },
        })
        return
      }

      if (!this.canReadProposal(req, proposal)) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have permission to view this proposal.' },
        })
        return
      }

      res.json({
        success: true,
        data: proposal,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * PATCH /api/proposals/:proposalId/sections/:sectionId
   */
  updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const sectionId = String(req.params.sectionId)
      const body = UpdateSectionSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const section = proposal.sections.find((s) => s.sectionId === sectionId)
      if (!section) {
        res.status(404).json({ success: false, error: { message: `Section "${sectionId}" not found` } })
        return
      }

      // Update section while preserving other sections
      section.content = body.content
      section.wordCount = proposalEngine.countWords(body.content)
      section.isManuallyEdited = true
      section.lastModifiedBy = 'student'
      section.updatedAt = new Date().toISOString()
      proposal.updatedAt = new Date().toISOString()

      // Re-run readiness assessment
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const updated = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: `Section "${section.title}" updated successfully.`,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/sections/:sectionId/regenerate
   * Regenerates only this section from underlying scope, preserving manual edits to other sections
   */
  regenerateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const sectionId = String(req.params.sectionId)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const sectionIndex = proposal.sections.findIndex((s) => s.sectionId === sectionId)
      if (sectionIndex === -1) {
        res.status(404).json({ success: false, error: { message: `Section "${sectionId}" not found` } })
        return
      }

      let freshScope
      if (proposal.sourceEvaluationId) {
        const evalRecord = await EvaluationRepository.findById(proposal.sourceEvaluationId)
        if (evalRecord) {
          freshScope = evalRecord.finalScope
        }
      }

      const regenerated = proposalEngine.regenerateSingleSection(
        proposal.sections[sectionIndex],
        proposal.projectTitle,
        freshScope,
        proposal.documentType,
        proposal.isScopeFinalized ?? true
      )

      proposal.sections[sectionIndex] = regenerated
      proposal.updatedAt = new Date().toISOString()
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const updated = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: `Section "${regenerated.title}" regenerated successfully from project scope.`,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/sections
   * Adds a custom or optional section
   */
  addSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = AddSectionSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const sectionId = `custom-${slug}-${Date.now().toString(36)}`
      const now = new Date().toISOString()

      const newSection = {
        sectionId,
        title: body.title,
        content: body.content,
        isMandatory: body.isMandatory || false,
        order: proposal.sections.length + 1,
        wordCount: proposalEngine.countWords(body.content),
        isManuallyEdited: true,
        lastModifiedBy: 'student' as const,
        updatedAt: now,
      }

      proposal.sections.push(newSection)
      proposal.updatedAt = now
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const saved = await proposalRepository.save(proposal)

      res.status(201).json({
        success: true,
        message: `Custom section "${body.title}" added successfully.`,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * DELETE /api/proposals/:proposalId/sections/:sectionId
   * Removes an optional or custom section
   */
  deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const sectionId = String(req.params.sectionId)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const sectionIndex = proposal.sections.findIndex((s) => s.sectionId === sectionId)
      if (sectionIndex === -1) {
        res.status(404).json({ success: false, error: { message: `Section "${sectionId}" not found` } })
        return
      }

      proposal.sections.splice(sectionIndex, 1)

      // Re-index orders
      proposal.sections.forEach((sec, idx) => {
        sec.order = idx + 1
      })

      proposal.updatedAt = new Date().toISOString()
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: 'Section removed successfully.',
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/sections/reorder
   */
  reorderSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = ReorderSectionsSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const reordered: typeof proposal.sections = []
      body.sectionIds.forEach((sid, idx) => {
        const found = proposal.sections.find((s) => s.sectionId === sid)
        if (found) {
          found.order = idx + 1
          reordered.push(found)
        }
      })

      // Add any remaining sections that weren't explicitly in the reorder list
      proposal.sections.forEach((s) => {
        if (!reordered.find((r) => r.sectionId === s.sectionId)) {
          s.order = reordered.length + 1
          reordered.push(s)
        }
      })

      proposal.sections = reordered
      proposal.updatedAt = new Date().toISOString()

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: 'Sections reordered successfully.',
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * PUT /api/proposals/:proposalId/draft
   * Autosaves draft changes without forcing an immutable version increment
   */
  saveDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = SaveDraftSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const now = new Date().toISOString()

      if (body.projectTitle) {
        proposal.projectTitle = body.projectTitle
      }

      if (body.sections && body.sections.length > 0) {
        for (const update of body.sections) {
          const match = proposal.sections.find((s) => s.sectionId === update.sectionId)
          if (match) {
            if (update.title) match.title = update.title
            if (match.content !== update.content) {
              match.content = update.content
              match.wordCount = proposalEngine.countWords(update.content)
              match.isManuallyEdited = true
              match.lastModifiedBy = 'student'
              match.updatedAt = now
            }
          }
        }
      }

      proposal.updatedAt = now
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: 'Draft autosaved successfully.',
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/sections/:sectionId/improve
   */
  improveSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const sectionId = String(req.params.sectionId)
      const body = ImproveSectionSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const section = proposal.sections.find((s) => s.sectionId === sectionId)
      if (!section) {
        res.status(404).json({ success: false, error: { message: `Section "${sectionId}" not found` } })
        return
      }

      const improvement = proposalEngine.improveSection(
        section,
        body.action as SectionImprovementAction,
        body.customInstruction
      )

      res.json({
        success: true,
        data: improvement,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/versions
   */
  createVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = CreateVersionSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const nextVersionNumber = proposal.versions.length + 1
      const now = new Date().toISOString()

      proposal.versions.push({
        versionNumber: nextVersionNumber,
        sections: JSON.parse(JSON.stringify(proposal.sections)),
        sourceScopeVersion: proposal.sourceScopeVersion,
        templateId: proposal.template.templateId,
        revisionSummary: body.revisionSummary,
        createdBy: studentId,
        createdAt: now,
      })

      proposal.activeVersionNumber = nextVersionNumber
      proposal.updatedAt = now

      const saved = await proposalRepository.save(proposal)

      res.status(201).json({
        success: true,
        message: `Version v${nextVersionNumber} saved successfully.`,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/versions/compare
   * Compares two versions showing sections and word counts differences
   */
  compareVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = CompareVersionsSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (!this.canReadProposal(req, proposal)) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const verA = proposal.versions.find((v) => v.versionNumber === body.versionA)
      const verB = proposal.versions.find((v) => v.versionNumber === body.versionB)

      if (!verA || !verB) {
        res.status(404).json({
          success: false,
          error: { message: 'One or both version numbers could not be found' },
        })
        return
      }

      const sectionsA = verA.sections
      const sectionsB = verB.sections

      const idsA = new Set(sectionsA.map((s) => s.sectionId))
      const idsB = new Set(sectionsB.map((s) => s.sectionId))

      const addedSections = sectionsB.filter((s) => !idsA.has(s.sectionId)).map((s) => s.title)
      const removedSections = sectionsA.filter((s) => !idsB.has(s.sectionId)).map((s) => s.title)

      const modifiedSections = sectionsB
        .filter((sB) => idsA.has(sB.sectionId))
        .map((sB) => {
          const sA = sectionsA.find((a) => a.sectionId === sB.sectionId)!
          const wordCountDelta = sB.wordCount - sA.wordCount
          const isContentChanged = sA.content !== sB.content
          return {
            sectionId: sB.sectionId,
            title: sB.title,
            wordCountA: sA.wordCount,
            wordCountB: sB.wordCount,
            wordCountDelta,
            isContentChanged,
          }
        })
        .filter((m) => m.isContentChanged)

      res.json({
        success: true,
        data: {
          versionA: body.versionA,
          versionB: body.versionB,
          revisionSummaryA: verA.revisionSummary,
          revisionSummaryB: verB.revisionSummary,
          addedSections,
          removedSections,
          modifiedSections,
        },
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/proposals/:proposalId/versions
   */
  listVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (!this.canReadProposal(req, proposal)) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      res.json({
        success: true,
        data: {
          proposalId: proposal.id,
          activeVersionNumber: proposal.activeVersionNumber,
          versions: proposal.versions,
        },
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/restore
   */
  restoreVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = RestoreVersionSchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const snapshot = proposal.versions.find((v) => v.versionNumber === body.versionNumber)
      if (!snapshot) {
        res.status(404).json({
          success: false,
          error: { message: `Version v${body.versionNumber} not found.` },
        })
        return
      }

      // Restore sections as a new version revision (preserving historical chain)
      const nextVersionNumber = proposal.versions.length + 1
      const now = new Date().toISOString()

      proposal.sections = JSON.parse(JSON.stringify(snapshot.sections))
      proposal.versions.push({
        versionNumber: nextVersionNumber,
        sections: JSON.parse(JSON.stringify(proposal.sections)),
        sourceScopeVersion: snapshot.sourceScopeVersion,
        templateId: snapshot.templateId,
        revisionSummary: `Restored from version v${body.versionNumber}.`,
        createdBy: studentId,
        createdAt: now,
      })

      proposal.activeVersionNumber = nextVersionNumber
      proposal.readiness = proposalReadinessService.assessReadiness(proposal)
      proposal.updatedAt = now

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: `Version v${body.versionNumber} restored as new revision v${nextVersionNumber}.`,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/readiness
   */
  readiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (!this.canReadProposal(req, proposal)) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const audit = proposalReadinessService.assessReadiness(proposal)
      proposal.readiness = audit
      await proposalRepository.save(proposal)

      res.json({
        success: true,
        data: audit,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/proposals/:proposalId/export
   */
  export = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const format = ((req.query.format as string) || 'docx').toLowerCase()

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (!this.canReadProposal(req, proposal)) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const sanitizedTitle = proposal.projectTitle
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40)

      if (format === 'pdf') {
        const pdfBuffer = await proposalExportService.generatePdf(proposal)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${sanitizedTitle}_proposal.pdf"`
        )
        res.send(pdfBuffer)
      } else {
        const docxBuffer = await proposalExportService.generateDocx(proposal)
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${sanitizedTitle}_proposal.docx"`
        )
        res.send(docxBuffer)
      }
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/submit
   */
  submitFaculty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = SubmitFacultySchema.parse(req.body)

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      if (proposal.submission.status === 'SUBMITTED') {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SUBMISSION',
            message: 'Proposal has already been submitted and is awaiting faculty review.',
          },
        })
        return
      }

      const now = new Date().toISOString()
      const facultyComments = body.comments || 'Initial proposal submitted for review.'
      const facultyGuideName = body.facultyGuideName || 'Department Project Coordinator'

      const feedbackHistory = proposal.submission.feedbackHistory || []
      feedbackHistory.push({
        date: now,
        facultyId: studentId,
        facultyName: studentId,
        status: 'SUBMITTED',
        comments: facultyComments,
      })

      proposal.submission = {
        status: 'SUBMITTED',
        facultyId: body.facultyId || 'faculty-guide-default',
        submittedAt: now,
        facultyGuideName,
        facultyComments,
        feedbackHistory,
      }
      proposal.updatedAt = now

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: 'Proposal successfully submitted for faculty review.',
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/faculty/review
   * Authorized faculty reviews and updates submission status with feedback
   */
  facultyReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reviewerId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = FacultyReviewSchema.parse(req.body)

      // Verify caller is an authenticated faculty or admin reviewer
      if (!this.isFacultyOrAdmin(req)) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Only authorized faculty members can review student proposals.' },
        })
        return
      }

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.submission?.status === 'DRAFT') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Cannot review a student draft that has not been submitted.' },
        })
        return
      }

      const now = new Date().toISOString()
      const feedbackHistory = proposal.submission.feedbackHistory || []
      feedbackHistory.push({
        date: now,
        facultyId: reviewerId,
        facultyName: body.facultyGuideName || req.user?.fullName || 'Department Project Coordinator',
        status: body.status,
        comments: body.comments,
      })

      proposal.submission.status = body.status
      proposal.submission.facultyComments = body.comments
      proposal.submission.reviewedAt = now
      if (body.facultyGuideName) {
        proposal.submission.facultyGuideName = body.facultyGuideName
      }
      proposal.submission.feedbackHistory = feedbackHistory
      proposal.updatedAt = now

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: `Proposal review status updated to "${body.status}".`,
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/proposals/:proposalId/resubmit
   * Student revises proposal and resubmits following CHANGES_REQUESTED
   */
  resubmitFaculty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = this.getStudentId(req)
      const proposalId = String(req.params.proposalId)
      const body = ResubmitFacultySchema.parse(req.body || {})

      const proposal = await proposalRepository.findById(proposalId)
      if (!proposal) {
        res.status(404).json({ success: false, error: { message: 'Proposal not found' } })
        return
      }

      if (proposal.studentId !== studentId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden' } })
        return
      }

      const now = new Date().toISOString()
      const feedbackHistory = proposal.submission.feedbackHistory || []
      feedbackHistory.push({
        date: now,
        facultyId: studentId,
        facultyName: studentId,
        status: 'SUBMITTED',
        comments: body.comments || 'Resubmitted with requested revisions.',
      })

      proposal.submission.status = 'SUBMITTED'
      proposal.submission.submittedAt = now
      proposal.submission.facultyComments = body.comments || 'Resubmitted with requested revisions.'
      proposal.submission.feedbackHistory = feedbackHistory
      proposal.updatedAt = now

      const saved = await proposalRepository.save(proposal)

      res.json({
        success: true,
        message: 'Proposal successfully resubmitted for faculty review.',
        data: saved,
      })
    } catch (err) {
      next(err)
    }
  }
}

export const proposalController = new ProposalController()
