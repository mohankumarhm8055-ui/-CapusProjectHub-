import { ProjectRepository, IProject, ReviewStatus, VerificationStatus } from './project.model.js'
import { AuditLogRepository } from './auditLog.model.js'

export interface CreateSubmissionDraftDTO {
  title: string
  abstract: string
  problemStatement: string
  department: string
  academicYear: string
  semester?: string
  collegeId?: string
  technologyStack?: string[]
  objectives?: string[]
  features?: string[]
}

export class RepositorySubmissionService {
  /**
   * Step 1: Student creates a project submission draft
   */
  async createDraft(studentId: string, data: CreateSubmissionDraftDTO): Promise<IProject> {
    const slug = data.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

    const project = await ProjectRepository.create({
      title: data.title,
      slug,
      abstract: data.abstract,
      problemStatement: data.problemStatement,
      objectives: data.objectives || [],
      features: data.features || [],
      modules: [],
      technologyStack: (data.technologyStack || []).map((t) => ({ name: t })),
      academicYear: data.academicYear,
      semester: data.semester || '7th Semester',
      department: data.department,
      collegeId: data.collegeId || 'rvce-main',
      teamMembers: [{ name: 'Student Submitter', role: 'Team Lead', isLeader: true }],
      facultyGuide: { name: 'Assigned Faculty Guide' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION',
      reviewStatus: 'DRAFT',
      verificationStatus: 'PENDING_VERIFICATION',
      uploadedBy: studentId,
    })

    await AuditLogRepository.record({
      projectId: project.id,
      action: 'PROJECT_CREATED',
      actorId: studentId,
      actorRole: 'student',
      newStatus: 'DRAFT',
      notes: `Student draft created: ${project.title}`,
    })

    return project
  }

  /**
   * Step 2: Student submits completed project to faculty for review
   */
  async submitToFaculty(projectId: string, studentId: string): Promise<IProject> {
    const project = await ProjectRepository.findById(projectId)
    if (!project) throw new Error('Project not found')
    if (project.uploadedBy !== studentId) {
      throw new Error('Forbidden: Only the project submitter can submit for faculty review')
    }
    if (project.reviewStatus === 'APPROVED') {
      throw new Error('Project is already approved')
    }

    const updated = await ProjectRepository.update(projectId, {
      reviewStatus: 'SUBMITTED',
      verificationStatus: 'PENDING_VERIFICATION',
    })
    if (!updated) throw new Error('Failed to update project status')

    await AuditLogRepository.record({
      projectId,
      action: 'SUBMITTED_TO_FACULTY',
      actorId: studentId,
      actorRole: 'student',
      previousStatus: project.reviewStatus,
      newStatus: 'SUBMITTED',
      notes: 'Submitted for faculty capstone committee review.',
    })

    return updated
  }

  /**
   * Step 2b: Student edits a draft or a submission where changes were requested
   */
  async updateSubmission(
    projectId: string,
    studentId: string,
    updates: Partial<{
      title: string
      abstract: string
      problemStatement: string
      objectives: string[]
      solution: string
      proposedSolution: string
      features: string[]
      modules: any[]
      technologyStack: string[]
      department: string
      academicYear: string
      semester: string
      challenges: string[]
      learningOutcomes: string[]
      futureEnhancements: string[]
      references: string[]
      githubUrl: string
      demoUrl: string
      documentationUrl: string
      videoUrl: string
      screenshots: any[]
      reportDocuments: any[]
    }>
  ): Promise<IProject> {
    const project = await ProjectRepository.findById(projectId)
    if (!project) throw new Error('Project not found')
    if (project.uploadedBy !== studentId) {
      throw new Error('Forbidden: Only the author can edit this project submission')
    }
    if (project.reviewStatus === 'APPROVED') {
      throw new Error('Approved projects cannot be modified without formal revision request')
    }

    const payload: Partial<IProject> = {}
    if (updates.title) {
      payload.title = updates.title
      payload.slug = updates.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    }
    if (updates.abstract) payload.abstract = updates.abstract
    if (updates.problemStatement) payload.problemStatement = updates.problemStatement
    if (updates.objectives) payload.objectives = updates.objectives
    if (updates.solution) payload.solution = updates.solution
    if (updates.proposedSolution) payload.proposedSolution = updates.proposedSolution
    if (updates.features) payload.features = updates.features
    if (updates.modules) payload.modules = updates.modules
    if (updates.technologyStack) {
      payload.technologyStack = updates.technologyStack.map((t) => ({ name: t }))
    }
    if (updates.department) payload.department = updates.department
    if (updates.academicYear) payload.academicYear = updates.academicYear
    if (updates.semester) payload.semester = updates.semester
    if (updates.challenges) payload.challenges = updates.challenges
    if (updates.learningOutcomes) payload.learningOutcomes = updates.learningOutcomes
    if (updates.futureEnhancements) payload.futureEnhancements = updates.futureEnhancements
    if (updates.references) payload.references = updates.references
    if (updates.githubUrl) payload.githubUrl = updates.githubUrl
    if (updates.demoUrl) payload.demoUrl = updates.demoUrl
    if (updates.documentationUrl) payload.documentationUrl = updates.documentationUrl
    if (updates.videoUrl) payload.videoUrl = updates.videoUrl
    if (updates.screenshots) payload.screenshots = updates.screenshots
    if (updates.reportDocuments) payload.reportDocuments = updates.reportDocuments

    const updated = await ProjectRepository.update(projectId, payload)
    if (!updated) throw new Error('Failed to update project submission')

    await AuditLogRepository.record({
      projectId,
      action: 'SUBMISSION_EDITED',
      actorId: studentId,
      actorRole: 'student',
      notes: `Student updated project details while in status: ${project.reviewStatus}`,
    })

    return updated
  }

  /**
   * Step 3: Faculty reviews submission (Approve, Reject, or Request Changes)
   */
  async reviewSubmission(
    projectId: string,
    facultyId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
    notes: string
  ): Promise<IProject> {
    const project = await ProjectRepository.findById(projectId)
    if (!project) throw new Error('Project not found')
    if (project.sourceType !== 'STUDENT_SUBMISSION') {
      throw new Error('Faculty review only applies to student submissions')
    }

    let reviewStatus: ReviewStatus
    let verificationStatus: VerificationStatus = project.verificationStatus
    let approvedAt: Date | undefined
    let approvedBy: string | undefined
    let rejectionReason: string | undefined

    if (decision === 'APPROVE') {
      reviewStatus = 'APPROVED'
      verificationStatus = 'FACULTY_APPROVED'
      approvedAt = new Date()
      approvedBy = facultyId
    } else if (decision === 'REJECT') {
      reviewStatus = 'REJECTED'
      verificationStatus = 'PENDING_VERIFICATION'
      rejectionReason = notes
    } else {
      reviewStatus = 'CHANGES_REQUESTED'
      verificationStatus = 'PENDING_VERIFICATION'
    }

    const changeRequests = project.changeRequests || []
    if (decision === 'REQUEST_CHANGES') {
      changeRequests.push({
        requestedAt: new Date(),
        requestedBy: facultyId,
        notes,
      })
    }

    const updated = await ProjectRepository.update(projectId, {
      reviewStatus,
      verificationStatus,
      approvedAt,
      approvedBy,
      rejectionReason,
      changeRequests,
    })
    if (!updated) throw new Error('Failed to update review status')

    await AuditLogRepository.record({
      projectId,
      action: decision === 'APPROVE' ? 'FACULTY_APPROVED' : decision === 'REJECT' ? 'FACULTY_REJECTED' : 'CHANGES_REQUESTED',
      actorId: facultyId,
      actorRole: 'faculty',
      previousStatus: project.reviewStatus,
      newStatus: reviewStatus,
      notes,
    })

    return updated
  }
}

export const repositorySubmissionService = new RepositorySubmissionService()
