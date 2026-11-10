import { ProjectRepository, IProject, VerificationStatus } from './project.model.js'
import { AuditLogRepository } from './auditLog.model.js'
import { repositorySearchService } from './repository.search.service.js'

export interface BulkIngestItem {
  title: string
  abstract: string
  problemStatement: string
  academicYear: string
  department: string
  technologyStack?: string[]
  facultyGuideName?: string
  studentNames?: string[]
  studentEmails?: string[]
  githubUrl?: string
  reportDocumentUrl?: string
  screenshotUrl?: string
}

export interface IngestValidationResult {
  title: string
  isDuplicateRisk: boolean
  matchedExistingTitle?: string
  similarityScore?: number
}

export interface CsvValidationSummary {
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  validRecords: BulkIngestItem[]
  invalidRecords: Array<{ rowNumber: number; reason: string; rawRow: string }>
  duplicateRecords: Array<{ rowNumber: number; title: string; existingYear?: string }>
}

export class RepositoryIngestionService {
  /**
   * Admin: Ingest a historical project manually
   */
  async ingestHistoricalProject(
    adminId: string,
    data: Omit<IProject, 'id' | 'sourceType' | 'createdAt' | 'updatedAt'>
  ): Promise<IProject> {
    const slug = data.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

    const project = await ProjectRepository.create({
      ...data,
      slug,
      sourceType: 'ADMIN_IMPORTED_HISTORICAL',
      reviewStatus: 'APPROVED',
      // Admin import requires explicit verification step or defaults to PENDING_VERIFICATION
      verificationStatus: data.verificationStatus || 'PENDING_VERIFICATION',
      uploadedBy: adminId,
    })

    await AuditLogRepository.record({
      projectId: project.id,
      action: 'PROJECT_INGESTED',
      actorId: adminId,
      actorRole: 'admin',
      notes: `Historical project ingested via admin portal: ${project.title}`,
    })

    return project
  }

  /**
   * Admin: Mark an imported record as officially VERIFIED_HISTORICAL
   */
  async verifyHistoricalRecord(
    adminId: string,
    projectId: string,
    verificationNotes?: string,
    targetStatus: VerificationStatus = 'VERIFIED_HISTORICAL'
  ): Promise<IProject> {
    const project = await ProjectRepository.findById(projectId)
    if (!project) throw new Error('Project not found')
    if (project.sourceType !== 'ADMIN_IMPORTED_HISTORICAL') {
      throw new Error('Only historical admin-imported records can receive VERIFIED_HISTORICAL status')
    }

    const updated = await ProjectRepository.update(projectId, {
      verificationStatus: targetStatus,
      approvedBy: adminId,
      approvedAt: new Date(),
    })
    if (!updated) throw new Error('Failed to update project status')

    await AuditLogRepository.record({
      projectId,
      action: 'VERIFIED_HISTORICAL',
      actorId: adminId,
      actorRole: 'admin',
      previousStatus: project.verificationStatus,
      newStatus: targetStatus,
      notes: verificationNotes || 'Administrator verified historical authenticity.',
    })

    return updated
  }

  /**
   * Bulk Ingestion validation & duplicate detection
   */
  async validateBulkMetadata(items: BulkIngestItem[], collegeId = 'rvce-main'): Promise<IngestValidationResult[]> {
    const results: IngestValidationResult[] = []

    for (const item of items) {
      const matches = await repositorySearchService.compareStudentIdea(
        item.title,
        item.problemStatement,
        item.technologyStack,
        collegeId
      )

      const highestMatch = matches[0]
      const isDuplicateRisk = !!highestMatch && highestMatch.score >= 0.75

      results.push({
        title: item.title,
        isDuplicateRisk,
        matchedExistingTitle: isDuplicateRisk ? highestMatch.project.title : undefined,
        similarityScore: highestMatch ? highestMatch.score : 0,
      })
    }

    return results
  }

  /**
   * Ingest bulk validated metadata items
   */
  async ingestBulk(adminId: string, items: BulkIngestItem[], collegeId = 'rvce-main'): Promise<{ ingestedCount: number; duplicatesDetected: number }> {
    let ingestedCount = 0
    let duplicatesDetected = 0

    for (const item of items) {
      const slug = item.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

      const reportDocs = item.reportDocumentUrl
        ? [{ title: 'Archived Project Dossier', fileUrl: item.reportDocumentUrl, verified: true }]
        : []
      const screenshots = item.screenshotUrl
        ? [{ url: item.screenshotUrl, caption: 'Historical system artifact' }]
        : []

      const project = await ProjectRepository.create({
        title: item.title,
        slug,
        abstract: item.abstract,
        problemStatement: item.problemStatement,
        objectives: [],
        features: [],
        modules: [],
        technologyStack: (item.technologyStack || []).map((t) => ({ name: t })),
        academicYear: item.academicYear,
        department: item.department,
        collegeId,
        teamMembers: (item.studentNames || []).map((name, idx) => ({
          name,
          role: idx === 0 ? 'Project Lead' : 'Team Member',
          email: item.studentEmails?.[idx],
        })),
        facultyGuide: {
          name: item.facultyGuideName || 'Department Faculty',
        },
        screenshots,
        reportDocuments: reportDocs,
        githubUrl: item.githubUrl,
        sourceType: 'ADMIN_IMPORTED_HISTORICAL',
        reviewStatus: 'APPROVED',
        verificationStatus: 'PENDING_VERIFICATION',
        uploadedBy: adminId,
      })

      ingestedCount++

      await AuditLogRepository.record({
        projectId: project.id,
        action: 'PROJECT_INGESTED',
        actorId: adminId,
        actorRole: 'admin',
        notes: `Bulk batch imported: ${project.title}`,
      })
    }

    return { ingestedCount, duplicatesDetected }
  }

  /**
   * Parse CSV content and validate for required fields & duplicates
   */
  async parseAndValidateCsv(csvContent: string): Promise<CsvValidationSummary> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length < 2) {
      return {
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        duplicateCount: 0,
        validRecords: [],
        invalidRecords: [{ rowNumber: 1, reason: 'CSV must contain a header line and at least one data row', rawRow: '' }],
        duplicateRecords: [],
      }
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const titleIdx = header.findIndex((h) => h.includes('title'))
    const abstractIdx = header.findIndex((h) => h.includes('abstract') || h.includes('desc'))
    const problemIdx = header.findIndex((h) => h.includes('problem'))
    const yearIdx = header.findIndex((h) => h.includes('year'))
    const deptIdx = header.findIndex((h) => h.includes('dept') || h.includes('department'))
    const techIdx = header.findIndex((h) => h.includes('tech'))
    const facultyIdx = header.findIndex((h) => h.includes('faculty') || h.includes('mentor') || h.includes('guide'))
    const githubIdx = header.findIndex((h) => h.includes('github') || h.includes('repo'))
    const reportIdx = header.findIndex((h) => h.includes('report') || h.includes('doc'))

    const validRecords: BulkIngestItem[] = []
    const invalidRecords: Array<{ rowNumber: number; reason: string; rawRow: string }> = []
    const duplicateRecords: Array<{ rowNumber: number; title: string; existingYear?: string }> = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = line.match(/(?:[^\s,"]+|"[^"]*")+/g) || line.split(',')
      const cleanCols = cols.map((c) => c.trim().replace(/^"|"$/g, ''))

      const title = titleIdx >= 0 ? cleanCols[titleIdx] : cleanCols[0]
      const abstract = abstractIdx >= 0 ? cleanCols[abstractIdx] : cleanCols[1]
      const problem = problemIdx >= 0 ? cleanCols[problemIdx] : (abstract || 'Historical problem record')
      const academicYear = yearIdx >= 0 ? cleanCols[yearIdx] : '2023-2024'
      const department = deptIdx >= 0 ? cleanCols[deptIdx] : 'Computer Science and Engineering'
      const rawTech = techIdx >= 0 ? cleanCols[techIdx] : ''
      const faculty = facultyIdx >= 0 ? cleanCols[facultyIdx] : 'Department Faculty'
      const githubUrl = githubIdx >= 0 ? cleanCols[githubIdx] : undefined
      const reportUrl = reportIdx >= 0 ? cleanCols[reportIdx] : undefined

      if (!title || title.trim().length < 3) {
        invalidRecords.push({ rowNumber: i + 1, reason: 'Title is missing or under 3 characters', rawRow: line })
        continue
      }
      if (!abstract || abstract.trim().length < 5) {
        invalidRecords.push({ rowNumber: i + 1, reason: 'Abstract is missing or under 5 characters', rawRow: line })
        continue
      }

      const existing = await ProjectRepository.findByTitleExact(title)
      if (existing) {
        duplicateRecords.push({ rowNumber: i + 1, title, existingYear: existing.academicYear })
        continue
      }

      const techStack = rawTech
        ? rawTech.split(';').map((t) => t.trim()).filter((t) => t.length > 0)
        : []

      validRecords.push({
        title: title.trim(),
        abstract: abstract.trim(),
        problemStatement: problem.trim(),
        academicYear: academicYear.trim(),
        department: department.trim(),
        technologyStack: techStack,
        facultyGuideName: faculty.trim(),
        githubUrl,
        reportDocumentUrl: reportUrl,
      })
    }

    return {
      totalRows: lines.length - 1,
      validCount: validRecords.length,
      invalidCount: invalidRecords.length,
      duplicateCount: duplicateRecords.length,
      validRecords,
      invalidRecords,
      duplicateRecords,
    }
  }
}

export const repositoryIngestionService = new RepositoryIngestionService()
