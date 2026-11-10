import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { repositorySearchService } from './repository.search.service.js'
import { repositoryIngestionService } from './repository.ingestion.service.js'
import { repositorySubmissionService } from './repository.submission.service.js'
import { ProjectRepository, VerificationStatus, ITeamMember } from './project.model.js'
import { AuditLogRepository } from './auditLog.model.js'
import { connectionService } from '../connections/connection.service.js'

async function sanitizeTeamMembersForPublic(members: ITeamMember[], requesterId?: string) {
  return Promise.all(
    (members || []).map(async (m) => {
      const derivedStudentId =
        m.studentId ||
        (m.name ? `senior-${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : undefined)
      let isAvailable = m.isAvailableForMentoring === true
      if (derivedStudentId) {
        try {
          const prof = await connectionService.getProfile(derivedStudentId, requesterId)
          if (prof) {
            isAvailable = prof.isAvailableForMentoring === true
          }
        } catch {
          // Keep stored availability flag on lookup error
        }
      }
      return {
        studentId: derivedStudentId,
        name: m.name,
        role: m.role,
        department: m.department,
        isLeader: m.isLeader,
        isAvailableForMentoring: isAvailable,
        // email and phone are strictly omitted for zero-leakage privacy
      }
    })
  )
}

// Validation schemas
const compareIdeaSchema = z.object({
  title: z.string().trim().min(3, 'Title is required for comparison'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  technologies: z.array(z.string()).optional().default([]),
  collegeId: z.string().optional().default('rvce-main'),
})

export const RepositoryController = {
  /**
   * GET /api/repository/search & /api/repository/projects
   */
  async searchProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        query,
        department,
        academicYear,
        technology,
        category,
        sourceType,
        verificationStatus,
        collegeId,
        page,
        limit,
        naturalLanguage,
      } = req.query

      const result = await repositorySearchService.searchProjectsPaginated({
        query: query ? String(query) : undefined,
        department: department ? String(department) : undefined,
        academicYear: academicYear ? String(academicYear) : undefined,
        technology: technology ? String(technology) : undefined,
        category: category ? String(category) : undefined,
        sourceType: sourceType ? String(sourceType) : undefined,
        verificationStatus: verificationStatus ? String(verificationStatus) : undefined,
        collegeId: collegeId ? String(collegeId) : 'rvce-main',
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        naturalLanguage: naturalLanguage === 'true',
      })

      // Mask student private contact information for unprivileged callers
      const sanitized = await Promise.all(
        result.projects.map(async (p) => ({
          ...p,
          workflowStatus: p.reviewStatus,
          technologies: p.technologyStack.map((t) => t.name),
          teamMembers: await sanitizeTeamMembersForPublic(p.teamMembers, req.user?.id),
          rejectionReason: undefined,
          changeRequests: undefined,
        }))
      )

      res.json({
        success: true,
        count: sanitized.length,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        data: sanitized,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/repository/projects/:id
   */
  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = String(req.params.id)
      const project = await ProjectRepository.findById(projectId)
      if (!project) {
        res.status(404).json({ success: false, error: { message: 'Project not found' } })
        return
      }

      // Check if project is authorized for viewing (must be verified or owner/faculty)
      const isVerified =
        project.verificationStatus === 'VERIFIED_HISTORICAL' ||
        (project.verificationStatus === 'FACULTY_APPROVED' && project.reviewStatus === 'APPROVED')

      const isOwner = req.user?.id === project.uploadedBy
      const isAdmin = req.user?.role === 'admin'
      const isFacultyAuthorized =
        req.user?.role === 'faculty' && project.reviewStatus !== 'DRAFT'

      if (!isVerified && !isOwner && !isAdmin && !isFacultyAuthorized) {
        res.status(403).json({
          success: false,
          error: { message: 'This project record is under review and not yet publicly accessible' },
        })
        return
      }

      res.json({
        success: true,
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
          teamMembers: await sanitizeTeamMembersForPublic(project.teamMembers, req.user?.id),
          rejectionReason: isOwner || isAdmin || isFacultyAuthorized ? project.rejectionReason : undefined,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/compare
   * AI Idea Comparison against Repository
   */
  async compareIdea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = compareIdeaSchema.parse(req.body)

      const matches = await repositorySearchService.compareStudentIdea(
        parsed.title,
        parsed.description,
        parsed.technologies,
        parsed.collegeId
      )

      const topMatch = matches[0]
      const hasCloseOverlap = matches.length > 0 && topMatch.score >= 0.55

      let summary = 'Unique Concept'
      if (matches.length > 0) {
        if (topMatch.classification === 'EXACT_OR_NEAR_EXACT_TITLE') {
          summary = 'Exact or Near-Exact Title Match'
        } else if (topMatch.classification === 'SIMILAR_PROJECT_CONCEPT') {
          summary = 'Substantial Concept Overlap'
        } else if (topMatch.classification === 'SIMILAR_FEATURE_SET') {
          summary = 'Feature Overlap Detected'
        } else if (topMatch.classification === 'RELATED_TECHNOLOGY_ONLY') {
          summary = 'Unique Concept with Shared Technology Stack'
        }
      }

      res.json({
        success: true,
        proposedTitle: parsed.title,
        matchCount: matches.length,
        hasCloseMatch: hasCloseOverlap,
        data: {
          proposedTitle: parsed.title,
          summary,
          matches: await Promise.all(
            matches.map(async (m) => ({
              classification: m.classification,
              overlapConfidence: m.score,
              documentedFeatures: m.project.features,
              pedagogicalCritique: m.academicCritique,
              matchedProject: {
                ...m.project,
                technologies: m.project.technologyStack.map((t) => t.name),
                teamMembers: await sanitizeTeamMembersForPublic(m.project.teamMembers, req.user?.id),
                rejectionReason: undefined,
              },
              matchedDimensions: m.matchedDimensions,
              sourceAttribution: m.sourceAttribution,
              analysis: m.analysis,
            }))
          ),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/admin/import & /api/repository/admin/ingest
   */
  async ingestHistorical(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Historical archive ingestion requires administrator privileges' },
        })
        return
      }
      const adminId = req.user.id
      const payload = req.body.project || req.body
      const allowDuplicate = req.body.allowDuplicate ?? false

      const title = String(payload.title || '').trim()
      if (!title) {
        res.status(400).json({ success: false, error: { message: 'Project title is required' } })
        return
      }

      // Check duplicate detection
      const existing = await ProjectRepository.findByTitleExact(title)
      if (existing && !allowDuplicate) {
        res.status(409).json({
          success: false,
          duplicateWarning: true,
          error: {
            message: `A project with the title "${title}" already exists in the repository (${existing.academicYear}, ${existing.department}).`,
          },
        })
        return
      }

      const techItems = Array.isArray(payload.technologies)
        ? payload.technologies.map((t: string) => ({ name: t }))
        : Array.isArray(payload.technologyStack)
        ? payload.technologyStack
        : []

      const project = await repositoryIngestionService.ingestHistoricalProject(adminId, {
        title,
        slug: title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
        abstract: payload.abstract || 'Academic project archive record.',
        problemStatement: payload.problemStatement || payload.abstract || 'Problem formulation not archived.',
        objectives: payload.objectives || [],
        features: payload.features || [],
        modules: payload.modules || [],
        technologyStack: techItems,
        academicYear: payload.academicYear || '2023-2024',
        department: payload.department || 'Computer Science and Engineering',
        collegeId: payload.collegeId || 'rvce-main',
        facultyGuide: payload.facultyGuide || { name: payload.mentorFacultyName || 'Assigned Faculty' },
        teamMembers: (payload.teamMembers || []).map((m: any) => ({
          name: m.fullName || m.name || 'Student Researcher',
          role: m.role || 'Team Member',
          department: payload.department,
          email: m.contactEmail,
        })),
        screenshots: [],
        reportDocuments: [],
        reviewStatus: 'APPROVED',
        verificationStatus: 'PENDING_VERIFICATION',
        uploadedBy: adminId,
      })

      res.status(201).json({
        success: true,
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/admin/verify/:id
   */
  async verifyHistorical(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Historical verification requires administrator privileges' },
        })
        return
      }
      const adminId = req.user.id
      const projectId = String(req.params.id)
      const notes = req.body.notes || req.body.verificationNotes || 'Verified historical entry'
      const targetStatus: VerificationStatus = req.body.verificationStatus || 'VERIFIED_HISTORICAL'

      const project = await repositoryIngestionService.verifyHistoricalRecord(adminId, projectId, notes, targetStatus)

      res.json({
        success: true,
        message: 'Project marked as verified historical record',
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/submissions/draft & /api/repository/student/draft
   */
  async createStudentDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.id || 'student-user'
      const payload = req.body

      const techStack: string[] = Array.isArray(payload.technologies)
        ? payload.technologies
        : Array.isArray(payload.technologyStack)
        ? payload.technologyStack
        : []

      const project = await repositorySubmissionService.createDraft(studentId, {
        title: payload.title,
        abstract: payload.abstract,
        problemStatement: payload.problemStatement || payload.abstract,
        department: payload.department || 'Computer Science and Engineering',
        academicYear: payload.academicYear || '2024-2025',
        semester: payload.semester || '7th Semester',
        collegeId: payload.collegeId || 'rvce-main',
        technologyStack: techStack,
        objectives: payload.objectives || [],
        features: payload.features || [],
      })

      res.status(201).json({
        success: true,
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/submissions/:id/submit & /api/repository/student/submit/:id
   */
  async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.id || 'student-user'
      const projectId = String(req.params.id)

      const project = await repositorySubmissionService.submitToFaculty(projectId, studentId)

      res.json({
        success: true,
        message: 'Project submitted to faculty review committee',
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/submissions/:id/review & /api/repository/faculty/review/:id
   */
  async reviewSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Only authorized faculty or admin reviewers can review submissions' },
        })
        return
      }
      const facultyId = req.user?.id || 'faculty-user'
      const projectId = String(req.params.id)
      const decision = req.body.decision
      const notes = req.body.notes || req.body.reviewComments || 'Faculty review decision'

      if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(decision)) {
        res.status(400).json({ success: false, error: { message: 'Invalid faculty decision' } })
        return
      }

      const project = await repositorySubmissionService.reviewSubmission(
        projectId,
        facultyId,
        decision,
        notes
      )

      res.json({
        success: true,
        message: `Project submission ${decision.toLowerCase()}ed successfully`,
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * PUT & PATCH /api/repository/submissions/:id
   * Student edits an existing draft or submission under review
   */
  async updateStudentSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.id || 'student-user'
      const projectId = String(req.params.id)
      const updates = req.body

      const project = await repositorySubmissionService.updateSubmission(projectId, studentId, updates)

      res.json({
        success: true,
        message: 'Project submission updated successfully',
        data: {
          ...project,
          workflowStatus: project.reviewStatus,
          technologies: project.technologyStack.map((t) => t.name),
        },
      })
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        res.status(403).json({ success: false, error: { message: err.message } })
        return
      }
      next(err)
    }
  },

  /**
   * POST /api/repository/admin/import/csv
   * Admin bulk CSV import with validation & duplicate detection
   */
  async importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Bulk CSV import requires administrator privileges' },
        })
        return
      }
      const adminId = req.user.id
      const csvContent = req.body.csv || req.body.content || ''
      const autoIngestValid = req.body.autoIngest ?? true

      if (!csvContent || typeof csvContent !== 'string') {
        res.status(400).json({ success: false, error: { message: 'CSV text content is required' } })
        return
      }

      const summary = await repositoryIngestionService.parseAndValidateCsv(csvContent)

      let ingestedCount = 0
      if (autoIngestValid && summary.validRecords.length > 0) {
        const ingestRes = await repositoryIngestionService.ingestBulk(adminId, summary.validRecords)
        ingestedCount = ingestRes.ingestedCount
      }

      res.status(summary.invalidCount > 0 && summary.validCount === 0 ? 400 : 200).json({
        success: summary.validCount > 0,
        summary: {
          totalRows: summary.totalRows,
          validCount: summary.validCount,
          invalidCount: summary.invalidCount,
          duplicateCount: summary.duplicateCount,
          ingestedCount,
        },
        invalidRecords: summary.invalidRecords,
        duplicateRecords: summary.duplicateRecords,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /api/repository/admin/import/batch
   * Admin batch JSON import
   */
  async importBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Batch import requires administrator privileges' },
        })
        return
      }
      const adminId = req.user.id
      const items = req.body.items || req.body.projects || []

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, error: { message: 'Items array is required for batch import' } })
        return
      }

      const validation = await repositoryIngestionService.validateBulkMetadata(items)
      const validItems = items.filter((_, idx) => !validation[idx]?.isDuplicateRisk)

      const ingestResult = await repositoryIngestionService.ingestBulk(adminId, validItems)

      res.json({
        success: true,
        summary: {
          totalSubmitted: items.length,
          ingestedCount: ingestResult.ingestedCount,
          duplicateCount: validation.filter((v) => v.isDuplicateRisk).length,
        },
        validation,
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * GET /api/repository/audit/:projectId
   */
  async getAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = String(req.params.projectId)
      const project = await ProjectRepository.findById(projectId)
      const isOwner = project && req.user?.id === project.uploadedBy
      const isAdminOrFaculty = req.user?.role === 'faculty' || req.user?.role === 'admin'
      if (project && !isOwner && !isAdminOrFaculty) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Audit trail access restricted to project owner or faculty/admin' },
        })
        return
      }
      const logs = await AuditLogRepository.findByProject(projectId)

      res.json({
        success: true,
        count: logs.length,
        data: logs,
      })
    } catch (err) {
      next(err)
    }
  },
}
