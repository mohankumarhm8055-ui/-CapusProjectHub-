import crypto from 'node:crypto'
import type { AuthUser } from '../../middleware/auth.middleware.js'
import {
  MAX_EVIDENCE_FILES_PER_SUBMISSION,
  persistPrivateEvidenceFile,
  readPrivateEvidenceFile,
  validateEvidenceFile,
  type ValidatedUploadInput,
} from '../activity-submissions/evidence.storage.js'
import { ActivitySubmissionRepository } from '../activity-submissions/submission.model.js'
import type { IEvidenceFileMeta } from '../activity-submissions/submission.types.js'
import { academicNotificationService } from '../notifications/notification.service.js'
import { AuditLogRepository } from '../repository/auditLog.model.js'
import { ProjectRepository } from '../repository/project.model.js'
import { formatUtcDate } from '../schedules/calendar.utils.js'
import { ProjectScheduleRepository } from '../schedules/schedule.model.js'
import type { IProjectSchedule } from '../schedules/schedule.types.js'
import { WeeklyReportRepository } from '../weekly-reports/weeklyReport.model.js'
import { evaluateCompletionEligibility } from './lifecycle.eligibility.js'
import {
  FinalDeliverableConfigRepository,
  FinalLifecycleRepository,
} from './lifecycle.model.js'
import type {
  FinalLifecycleStatus,
  IFinalDeliverableConfig,
  IFinalMetadataPayload,
  IFinalProjectLifecycle,
  IFinalSubmissionSnapshot,
  IPublicationDraft,
} from './lifecycle.types.js'

export type FinalFileSlot =
  | 'FINAL_REPORT'
  | 'PRESENTATION'
  | 'ARCHITECTURE_DIAGRAM'
  | 'SCREENSHOT'
  | 'SUPPORTING'

function httpError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

function assertValidOptionalUrl(url: string | undefined, label: string): string | undefined {
  if (!url || !url.trim()) return undefined
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    throw httpError(400, 'INVALID_URL', `Invalid ${label} URL: "${url}".`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw httpError(400, 'UNSAFE_URL', `${label} URL must start with http:// or https://.`)
  }
  return parsed.toString()
}

function buildDefaultPublicationDraft(
  schedule: IProjectSchedule,
  snapshot: IFinalSubmissionSnapshot,
  facultyId: string
): IPublicationDraft {
  const m = snapshot.metadata
  return {
    title: m.title,
    abstract: m.abstract,
    academicYear: m.academicYear || schedule.academicYear,
    batch: m.batch,
    department: m.department || schedule.department,
    semester: m.semester,
    category: m.category || schedule.department,
    problemStatement: m.problemStatement,
    objectives: [...m.objectives],
    proposedSolution: m.proposedSolution,
    modules: m.modules.map((mod) => ({ ...mod })),
    technologyStack: m.technologyStack.map((t) => ({ ...t })),
    architectureDescription: m.architectureDescription,
    learningOutcomes: [...m.learningOutcomes],
    challenges: [...m.challenges],
    futureEnhancements: [...m.futureEnhancements],
    references: [...m.references],
    selectedScreenshotFileIds: snapshot.screenshotFiles.map((f) => f.fileId),
    selectedArchitectureDiagramFileId: snapshot.architectureDiagramFiles[0]?.fileId,
    selectedFinalReportFileId: snapshot.finalReportFiles[0]?.fileId,
    githubUrl: m.githubUrl,
    demoUrl: m.demoUrl,
    videoUrl: m.videoUrl,
    documentationUrl: m.documentationUrl,
    teamMembers: schedule.assignedStudents.map((st) => ({
      studentId: st.studentId,
      name: st.fullName,
      role: st.isTeamLeader ? 'Team Lead' : 'Contributor',
      department: st.department || schedule.department,
      isLeader: st.isTeamLeader === true,
    })),
    facultyGuide: {
      name: schedule.facultyGuideName,
      designation: 'Faculty Guide',
      department: schedule.department,
    },
    updatedByFacultyId: facultyId,
    updatedAt: new Date(),
  }
}

export class FinalLifecycleService {
  private async loadAuthorizedSchedule(
    actor: AuthUser,
    scheduleId: string
  ): Promise<IProjectSchedule> {
    const schedule = await ProjectScheduleRepository.findById(scheduleId)
    if (!schedule) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Academic project schedule was not found.')
    }
    if (actor.role === 'admin') return schedule
    if (actor.role === 'faculty') {
      if (schedule.facultyGuideId !== actor.id && schedule.createdByFacultyId !== actor.id) {
        throw httpError(
          403,
          'FORBIDDEN',
          'You can only review or publish final projects assigned to you.'
        )
      }
      return schedule
    }
    if (schedule.status !== 'PUBLISHED' || !schedule.assignedStudentIds.includes(actor.id)) {
      throw httpError(
        403,
        'FORBIDDEN',
        'You are not authorized to access final completion records for this project.'
      )
    }
    return schedule
  }

  private async ensureLifecycleRecord(schedule: IProjectSchedule): Promise<IFinalProjectLifecycle> {
    const existing = await FinalLifecycleRepository.findByScheduleId(schedule.id)
    if (existing) return existing
    return FinalLifecycleRepository.create({
      scheduleId: schedule.id,
      projectId: schedule.projectId,
      status: 'NOT_READY',
      latestRevisionNumber: 0,
      finalSubmissionRevisions: [],
      facultyFeedback: [],
      auditHistory: [],
    })
  }

  async getDeliverableConfig(): Promise<IFinalDeliverableConfig> {
    return FinalDeliverableConfigRepository.getOrInitGlobal()
  }

  async updateDeliverableConfig(
    actor: AuthUser,
    updates: Partial<
      Pick<
        IFinalDeliverableConfig,
        | 'mandatoryDeliverables'
        | 'requireStartedWeeklyReportsSubmitted'
        | 'requireAllWeeklyReportsSubmitted'
        | 'minimumWeeklyReportsRequired'
      >
    >
  ): Promise<IFinalDeliverableConfig> {
    if (actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Only administrators can modify final deliverable rules.')
    }
    return FinalDeliverableConfigRepository.updateGlobal(updates, actor.id)
  }

  async listAuthorizedProjects(actor: AuthUser) {
    let schedules: IProjectSchedule[] = []
    if (actor.role === 'admin') {
      schedules = (await ProjectScheduleRepository.listAll()).filter((s) => s.status === 'PUBLISHED')
    } else if (actor.role === 'faculty') {
      schedules = (await ProjectScheduleRepository.listByFaculty(actor.id)).filter(
        (s) => s.status === 'PUBLISHED'
      )
    } else {
      schedules = await ProjectScheduleRepository.listPublishedForStudent(actor.id)
    }

    const [lifecycles, config] = await Promise.all([
      FinalLifecycleRepository.listByScheduleIds(schedules.map((s) => s.id)),
      this.getDeliverableConfig(),
    ])
    const bySched = new Map(lifecycles.map((l) => [l.scheduleId, l]))

    return Promise.all(
      schedules.map(async (schedule) => {
        const lc = bySched.get(schedule.id)
        const [submissions, weeklyReports] = await Promise.all([
          ActivitySubmissionRepository.listBySchedule(schedule.id),
          WeeklyReportRepository.listBySchedule(schedule.id),
        ])
        const latestRev =
          lc?.finalSubmissionRevisions[lc.finalSubmissionRevisions.length - 1] ||
          lc?.draftSubmission ||
          null
        const eligibility = evaluateCompletionEligibility({
          schedule,
          submissions,
          weeklyReports,
          config,
          deliverables: latestRev,
        })

        return {
          schedule,
          lifecycleStatus: (lc?.status || 'NOT_READY') as FinalLifecycleStatus,
          latestRevisionNumber: lc?.latestRevisionNumber || 0,
          eligibility,
        }
      })
    )
  }

  async getProjectLifecycleDetail(actor: AuthUser, scheduleId: string) {
    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    if (schedule.status !== 'PUBLISHED') {
      throw httpError(
        400,
        'SCHEDULE_NOT_PUBLISHED',
        'Final completion opens once the official academic schedule is published.'
      )
    }

    const [lifecycle, submissions, weeklyReports, project, config] = await Promise.all([
      this.ensureLifecycleRecord(schedule),
      ActivitySubmissionRepository.listBySchedule(schedule.id),
      WeeklyReportRepository.listBySchedule(schedule.id),
      ProjectRepository.findById(schedule.projectId),
      this.getDeliverableConfig(),
    ])

    const activeDeliverables =
      lifecycle.draftSubmission ||
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1] ||
      null

    const eligibility = evaluateCompletionEligibility({
      schedule,
      submissions,
      weeklyReports,
      config,
      deliverables: activeDeliverables,
    })

    // Auto-prepare default publicationDraft preview structure in response when completion is approved
    const latestSubmittedRev =
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1]
    const effectivePublicationDraft =
      lifecycle.publicationDraft ||
      (latestSubmittedRev &&
      ['COMPLETION_APPROVED', 'PUBLICATION_DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'].includes(
        lifecycle.status
      )
        ? buildDefaultPublicationDraft(schedule, latestSubmittedRev, schedule.facultyGuideId)
        : undefined)

    return {
      schedule,
      projectRepositoryRecord: project
        ? {
            id: project.id,
            title: project.title,
            publicationStatus: project.publicationStatus || 'NOT_PUBLISHED',
            reviewStatus: project.reviewStatus,
            verificationStatus: project.verificationStatus,
            publishedAt: project.publishedAt,
          }
        : null,
      deliverableConfig: config,
      lifecycle,
      effectivePublicationDraft,
      eligibility,
      activitySubmissions: submissions,
      weeklyReports,
    }
  }

  private sanitizeMetadata(
    raw: IFinalMetadataPayload,
    schedule: IProjectSchedule
  ): IFinalMetadataPayload {
    return {
      title: (raw.title || schedule.projectTitle).trim(),
      abstract: (raw.abstract || '').trim(),
      problemStatement: (raw.problemStatement || '').trim(),
      objectives: (raw.objectives || []).map((s) => s.trim()).filter(Boolean),
      proposedSolution: (raw.proposedSolution || '').trim(),
      modules: (raw.modules || [])
        .map((m) => ({
          name: (m.name || '').trim(),
          description: (m.description || '').trim(),
          features: m.features || [],
        }))
        .filter((m) => m.name.length > 0),
      technologyStack: (raw.technologyStack || [])
        .map((t) => ({ name: (t.name || '').trim(), category: t.category?.trim() }))
        .filter((t) => t.name.length > 0),
      architectureDescription: raw.architectureDescription?.trim() || undefined,
      challenges: (raw.challenges || []).map((s) => s.trim()).filter(Boolean),
      learningOutcomes: (raw.learningOutcomes || []).map((s) => s.trim()).filter(Boolean),
      futureEnhancements: (raw.futureEnhancements || []).map((s) => s.trim()).filter(Boolean),
      references: (raw.references || []).map((s) => s.trim()).filter(Boolean),
      academicYear: (raw.academicYear || schedule.academicYear).trim(),
      batch: raw.batch?.trim() || undefined,
      semester: raw.semester?.trim() || undefined,
      department: (raw.department || schedule.department).trim(),
      category: raw.category?.trim() || schedule.department,
      githubUrl: assertValidOptionalUrl(raw.githubUrl, 'GitHub'),
      demoUrl: assertValidOptionalUrl(raw.demoUrl, 'Demo'),
      videoUrl: assertValidOptionalUrl(raw.videoUrl, 'Video'),
      documentationUrl: assertValidOptionalUrl(raw.documentationUrl, 'Documentation'),
    }
  }

  private async validateAndStoreSlotFiles(params: {
    schedule: IProjectSchedule
    lifecycleId: string
    revisionNumber: number
    studentId: string
    studentName: string
    uploads: Array<{ input: ValidatedUploadInput; slot: FinalFileSlot }>
    priorDraftOrSnapshot?: {
      finalReportFiles?: IEvidenceFileMeta[]
      presentationFiles?: IEvidenceFileMeta[]
      architectureDiagramFiles?: IEvidenceFileMeta[]
      screenshotFiles?: IEvidenceFileMeta[]
      supportingFiles?: IEvidenceFileMeta[]
    } | null
    retainFileIds?: string[]
  }) {
    if (params.uploads.length > MAX_EVIDENCE_FILES_PER_SUBMISSION * 2) {
      throw httpError(
        400,
        'TOO_MANY_FILES',
        `At most ${MAX_EVIDENCE_FILES_PER_SUBMISSION * 2} final files can be uploaded per request.`
      )
    }

    for (const u of params.uploads) {
      validateEvidenceFile(u.input)
    }

    const retainSet = params.retainFileIds ? new Set(params.retainFileIds) : null
    const filterRetained = (arr?: IEvidenceFileMeta[]) => {
      if (!arr) return []
      return retainSet ? arr.filter((f) => retainSet.has(f.fileId)) : [...arr]
    }

    const buckets: Record<FinalFileSlot, IEvidenceFileMeta[]> = {
      FINAL_REPORT: filterRetained(params.priorDraftOrSnapshot?.finalReportFiles),
      PRESENTATION: filterRetained(params.priorDraftOrSnapshot?.presentationFiles),
      ARCHITECTURE_DIAGRAM: filterRetained(params.priorDraftOrSnapshot?.architectureDiagramFiles),
      SCREENSHOT: filterRetained(params.priorDraftOrSnapshot?.screenshotFiles),
      SUPPORTING: filterRetained(params.priorDraftOrSnapshot?.supportingFiles),
    }

    const newlyStored: IEvidenceFileMeta[] = []
    for (const item of params.uploads) {
      const meta = await persistPrivateEvidenceFile({
        projectId: params.schedule.projectId,
        studentId: params.studentId,
        studentName: params.studentName,
        file: item.input,
      })
      buckets[item.slot].push(meta)
      newlyStored.push(meta)
    }

    if (newlyStored.length > 0) {
      await ActivitySubmissionRepository.registerFileRecords(
        newlyStored.map((m) => ({
          fileId: m.fileId,
          storageKey: m.storageKey,
          projectId: params.schedule.projectId,
          scheduleId: params.schedule.id,
          activityId: `FINAL_REV_${params.revisionNumber}`,
          submissionId: params.lifecycleId,
          revisionNumber: params.revisionNumber,
          sourceKind: 'FINAL_DELIVERABLE',
          submissionScope: 'TEAM_SHARED',
          originalName: m.originalName,
          mimeType: m.mimeType,
          sizeBytes: m.sizeBytes,
          sha256: m.sha256,
          evidenceCategory: m.evidenceCategory,
          uploadedByStudentId: params.studentId,
          uploadedAt: m.uploadedAt,
        }))
      )
    }

    return buckets
  }

  private assertStudentEditableState(status: FinalLifecycleStatus): void {
    if (status === 'FINAL_REVIEW_PENDING') {
      throw httpError(
        409,
        'FINAL_REVIEW_IN_PROGRESS',
        'Final submission is pending faculty review. Edits unlock if faculty requests corrections.'
      )
    }
    if (
      ['COMPLETION_APPROVED', 'PUBLICATION_DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'].includes(
        status
      )
    ) {
      throw httpError(
        409,
        'FINAL_COMPLETION_LOCKED',
        'Final completion has already been approved and cannot be altered by students.'
      )
    }
  }

  async saveFinalDraft(
    actor: AuthUser,
    scheduleId: string,
    input: {
      metadata: IFinalMetadataPayload
      uploads: Array<{ input: ValidatedUploadInput; slot: FinalFileSlot }>
      retainFileIds?: string[]
    }
  ): Promise<IFinalProjectLifecycle> {
    if (actor.role !== 'student') {
      throw httpError(403, 'FORBIDDEN', 'Only assigned project students can save final deliverables.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const lifecycle = await this.ensureLifecycleRecord(schedule)
    this.assertStudentEditableState(lifecycle.status)

    const metadata = this.sanitizeMetadata(input.metadata, schedule)
    const studentName = actor.fullName || 'Student'
    const baseSource =
      lifecycle.draftSubmission ||
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1] ||
      null

    const buckets = await this.validateAndStoreSlotFiles({
      schedule,
      lifecycleId: lifecycle.id,
      revisionNumber: lifecycle.latestRevisionNumber,
      studentId: actor.id,
      studentName,
      uploads: input.uploads,
      priorDraftOrSnapshot: baseSource,
      retainFileIds: input.retainFileIds,
    })

    const now = new Date()
    const draftSubmission = {
      submittedByStudentId: actor.id,
      submittedByStudentName: studentName,
      updatedByStudentId: actor.id,
      updatedByStudentName: studentName,
      updatedAt: now,
      metadata,
      finalReportFiles: buckets.FINAL_REPORT,
      presentationFiles: buckets.PRESENTATION,
      architectureDiagramFiles: buckets.ARCHITECTURE_DIAGRAM,
      screenshotFiles: buckets.SCREENSHOT,
      supportingFiles: buckets.SUPPORTING,
    }

    return (await FinalLifecycleRepository.update(lifecycle.id, {
      draftSubmission,
      auditHistory: [
        ...lifecycle.auditHistory,
        {
          entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
          action: 'FINAL_DRAFT_SAVED',
          actorId: actor.id,
          actorName: studentName,
          actorRole: actor.role,
          previousStatus: lifecycle.status,
          newStatus: lifecycle.status,
          comment: 'Saved final project deliverables draft.',
          timestamp: now,
        },
      ],
    }))!
  }

  async submitForFinalReview(
    actor: AuthUser,
    scheduleId: string,
    input: {
      metadata: IFinalMetadataPayload
      uploads: Array<{ input: ValidatedUploadInput; slot: FinalFileSlot }>
      retainFileIds?: string[]
    }
  ) {
    if (actor.role !== 'student') {
      throw httpError(403, 'FORBIDDEN', 'Only assigned project students can submit final deliverables.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const lifecycle = await this.ensureLifecycleRecord(schedule)
    this.assertStudentEditableState(lifecycle.status)

    const metadata = this.sanitizeMetadata(input.metadata, schedule)
    const studentName = actor.fullName || 'Student'
    const nextRevisionNumber = lifecycle.latestRevisionNumber + 1
    const baseSource =
      lifecycle.draftSubmission ||
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1] ||
      null

    const buckets = await this.validateAndStoreSlotFiles({
      schedule,
      lifecycleId: lifecycle.id,
      revisionNumber: nextRevisionNumber,
      studentId: actor.id,
      studentName,
      uploads: input.uploads,
      priorDraftOrSnapshot: baseSource,
      retainFileIds: input.retainFileIds,
    })

    const [submissions, weeklyReports, config] = await Promise.all([
      ActivitySubmissionRepository.listBySchedule(schedule.id),
      WeeklyReportRepository.listBySchedule(schedule.id),
      this.getDeliverableConfig(),
    ])

    const candidate = {
      metadata,
      finalReportFiles: buckets.FINAL_REPORT,
      presentationFiles: buckets.PRESENTATION,
      architectureDiagramFiles: buckets.ARCHITECTURE_DIAGRAM,
      screenshotFiles: buckets.SCREENSHOT,
    }

    const eligibility = evaluateCompletionEligibility({
      schedule,
      submissions,
      weeklyReports,
      config,
      deliverables: candidate,
    })

    if (!eligibility.eligibleForFinalReview) {
      throw Object.assign(
        httpError(
          409,
          'COMPLETION_INELIGIBLE',
          `Project is not yet eligible for final review: ${eligibility.blockingReasons.join('; ')}`
        ),
        { details: eligibility }
      )
    }

    const now = new Date()
    const wasCorrections = lifecycle.status === 'CORRECTIONS_REQUIRED'
    const snapshot: IFinalSubmissionSnapshot = {
      revisionNumber: nextRevisionNumber,
      submittedByStudentId: actor.id,
      submittedByStudentName: studentName,
      submittedAt: now,
      isFinalReviewRequest: true,
      metadata,
      finalReportFiles: buckets.FINAL_REPORT,
      presentationFiles: buckets.PRESENTATION,
      architectureDiagramFiles: buckets.ARCHITECTURE_DIAGRAM,
      screenshotFiles: buckets.SCREENSHOT,
      supportingFiles: buckets.SUPPORTING,
    }

    const updated = (await FinalLifecycleRepository.update(lifecycle.id, {
      status: 'FINAL_REVIEW_PENDING',
      latestRevisionNumber: nextRevisionNumber,
      draftSubmission: undefined,
      finalSubmissionRevisions: [...lifecycle.finalSubmissionRevisions, snapshot],
      auditHistory: [
        ...lifecycle.auditHistory,
        {
          entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
          action: 'FINAL_SUBMITTED_FOR_REVIEW',
          actorId: actor.id,
          actorName: studentName,
          actorRole: actor.role,
          previousStatus: lifecycle.status,
          newStatus: 'FINAL_REVIEW_PENDING',
          revisionNumber: nextRevisionNumber,
          comment: wasCorrections
            ? `Resubmitted corrected final deliverables (Rev #${nextRevisionNumber}).`
            : `Submitted final project deliverables for faculty review (Rev #${nextRevisionNumber}).`,
          timestamp: now,
        },
      ],
    }))!

    // Notify assigned faculty guide + assigned students with deterministic deduplication keys per revision
    await academicNotificationService
      .dispatchAcademicNotification({
        recipientId: schedule.facultyGuideId,
        type: 'FINAL_REVIEW_REQUESTED',
        category: 'PUBLICATION',
        title: wasCorrections
          ? `Final Corrections Resubmitted: ${schedule.projectTitle}`
          : `Final Submission Received: ${schedule.projectTitle}`,
        message: `${studentName} ${
          wasCorrections ? 'resubmitted final corrections' : 'submitted final deliverables'
        } (Rev #${nextRevisionNumber}) for completion review.`,
        actionUrl: `/faculty-final-review/${schedule.id}`,
        deduplicationKey: `fin:${schedule.facultyGuideId}:${schedule.id}:REV:${nextRevisionNumber}`,
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        projectTitle: schedule.projectTitle,
        entityType: 'SUBMISSION',
        entityId: updated.id,
        sendOptionalEmail: true,
      })
      .catch(() => {})

    await Promise.all(
      schedule.assignedStudentIds.map((studentId) =>
        academicNotificationService
          .dispatchAcademicNotification({
            recipientId: studentId,
            type: 'FINAL_REVIEW_REQUESTED',
            category: 'PUBLICATION',
            title: `Final Review Requested: ${schedule.projectTitle}`,
            message: `${studentName} submitted Revision #${nextRevisionNumber} for faculty final completion review.`,
            actionUrl: `/final-completion/${schedule.id}`,
            deduplicationKey: `fin:${studentId}:${schedule.id}:REV:${nextRevisionNumber}`,
            scheduleId: schedule.id,
            projectId: schedule.projectId,
            projectTitle: schedule.projectTitle,
            entityType: 'SUBMISSION',
            entityId: updated.id,
          })
          .catch(() => {})
      )
    )

    return { lifecycle: updated, snapshot, eligibility }
  }

  async performFinalReview(
    actor: AuthUser,
    scheduleId: string,
    input: {
      action: 'ADD_FEEDBACK' | 'REQUEST_CORRECTIONS' | 'APPROVE_COMPLETION'
      comment: string
    }
  ): Promise<IFinalProjectLifecycle> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned faculty guides or administrators can review final project completion.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const lifecycle = await this.ensureLifecycleRecord(schedule)
    const latestSnapshot =
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1] || null

    if (!latestSnapshot) {
      throw httpError(
        409,
        'NO_FINAL_SUBMISSION',
        'Students must submit final project deliverables before faculty can review or approve completion.'
      )
    }

    const cleanComment = input.comment.trim()
    if (input.action === 'REQUEST_CORRECTIONS' && cleanComment.length < 5) {
      throw httpError(
        400,
        'FEEDBACK_REQUIRED',
        'Provide clear final correction instructions (at least 5 characters).'
      )
    }
    if (input.action === 'ADD_FEEDBACK' && cleanComment.length < 4) {
      throw httpError(400, 'FEEDBACK_REQUIRED', 'Feedback comment must be at least 4 characters.')
    }

    const now = new Date()
    const facultyName = actor.fullName || 'Faculty Guide'

    if (input.action === 'APPROVE_COMPLETION') {
      if (
        ['COMPLETION_APPROVED', 'PUBLICATION_DRAFT', 'PUBLISHED'].includes(lifecycle.status)
      ) {
        throw httpError(409, 'ALREADY_APPROVED', 'Final project completion is already approved.')
      }

      const [submissions, weeklyReports, config] = await Promise.all([
        ActivitySubmissionRepository.listBySchedule(schedule.id),
        WeeklyReportRepository.listBySchedule(schedule.id),
        this.getDeliverableConfig(),
      ])

      const eligibility = evaluateCompletionEligibility({
        schedule,
        submissions,
        weeklyReports,
        config,
        deliverables: latestSnapshot,
      })

      if (!eligibility.eligibleForFinalReview) {
        throw httpError(
          409,
          'COMPLETION_INELIGIBLE',
          `Cannot approve completion with incomplete requirements: ${eligibility.blockingReasons.join('; ')}`
        )
      }

      const defaultPubDraft =
        lifecycle.publicationDraft ||
        buildDefaultPublicationDraft(schedule, latestSnapshot, actor.id)

      const updated = (await FinalLifecycleRepository.update(lifecycle.id, {
        status: 'COMPLETION_APPROVED',
        completionApprovedAt: now,
        completionApprovedByFacultyId: actor.id,
        completionApprovedByFacultyName: facultyName,
        publicationDraft: defaultPubDraft,
        facultyFeedback: [
          ...lifecycle.facultyFeedback,
          {
            feedbackId: `fff-${crypto.randomUUID().slice(0, 8)}`,
            facultyId: actor.id,
            facultyName,
            action: 'APPROVE_COMPLETION',
            comment: cleanComment || 'Final academic project completion approved.',
            revisionNumber: lifecycle.latestRevisionNumber,
            createdAt: now,
          },
        ],
        auditHistory: [
          ...lifecycle.auditHistory,
          {
            entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
            action: 'FINAL_COMPLETION_APPROVED',
            actorId: actor.id,
            actorName: facultyName,
            actorRole: actor.role,
            previousStatus: lifecycle.status,
            newStatus: 'COMPLETION_APPROVED',
            revisionNumber: lifecycle.latestRevisionNumber,
            comment: cleanComment || 'Explicitly approved final completion (not yet published).',
            timestamp: now,
          },
        ],
      }))!

      // Ensure linked Project record stays non-public ('NOT_PUBLISHED') until explicit faculty publish
      await ProjectRepository.update(schedule.projectId, {
        sourceScheduleId: schedule.id,
        publicationStatus: 'NOT_PUBLISHED',
      })

      await AuditLogRepository.record({
        projectId: schedule.projectId,
        action: 'FINAL_COMPLETION_APPROVED',
        actorId: actor.id,
        actorRole: actor.role,
        actorName: facultyName,
        previousStatus: lifecycle.status,
        newStatus: 'COMPLETION_APPROVED',
        notes: cleanComment || 'Approved final academic completion cleanly without auto-publishing.',
      })

      await Promise.all(
        schedule.assignedStudentIds.map((studentId) =>
          academicNotificationService
            .dispatchAcademicNotification({
              recipientId: studentId,
              type: 'FINAL_COMPLETION_APPROVED',
              category: 'PUBLICATION',
              title: `Project Completion Approved: ${schedule.projectTitle}`,
              message: `${facultyName} approved final completion for "${schedule.projectTitle}". Repository publication remains under faculty review.`,
              actionUrl: `/final-completion/${schedule.id}`,
              deduplicationKey: `fin:${studentId}:${schedule.id}:COMPLETION_APPROVED:v${lifecycle.latestRevisionNumber}`,
              scheduleId: schedule.id,
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              sendOptionalEmail: true,
            })
            .catch(() => {})
        )
      )

      return updated
    }

    const nextStatus =
      input.action === 'REQUEST_CORRECTIONS' ? 'CORRECTIONS_REQUIRED' : lifecycle.status

    const updated = (await FinalLifecycleRepository.update(lifecycle.id, {
      status: nextStatus,
      facultyFeedback: [
        ...lifecycle.facultyFeedback,
        {
          feedbackId: `fff-${crypto.randomUUID().slice(0, 8)}`,
          facultyId: actor.id,
          facultyName,
          action: input.action,
          comment: cleanComment,
          revisionNumber: lifecycle.latestRevisionNumber,
          createdAt: now,
        },
      ],
      auditHistory: [
        ...lifecycle.auditHistory,
        {
          entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
          action:
            input.action === 'REQUEST_CORRECTIONS'
              ? 'FINAL_CORRECTIONS_REQUESTED'
              : 'FINAL_FEEDBACK_ADDED',
          actorId: actor.id,
          actorName: facultyName,
          actorRole: actor.role,
          previousStatus: lifecycle.status,
          newStatus: nextStatus,
          revisionNumber: lifecycle.latestRevisionNumber,
          comment: cleanComment,
          timestamp: now,
        },
      ],
    }))!

    if (input.action === 'REQUEST_CORRECTIONS') {
      await Promise.all(
        schedule.assignedStudentIds.map((studentId) =>
          academicNotificationService
            .dispatchAcademicNotification({
              recipientId: studentId,
              type: 'FINAL_CORRECTIONS_REQUIRED',
              category: 'PUBLICATION',
              title: `Final Corrections Required: ${schedule.projectTitle}`,
              message: `${facultyName} requested final corrections on Revision #${lifecycle.latestRevisionNumber}. Open Final Completion to review instructions.`,
              actionUrl: `/final-completion/${schedule.id}`,
              scheduleId: schedule.id,
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              sendOptionalEmail: true,
            })
            .catch(() => {})
        )
      )
    }

    return updated
  }

  async savePublicationDraft(
    actor: AuthUser,
    scheduleId: string,
    draftInput: Partial<Omit<IPublicationDraft, 'updatedByFacultyId' | 'updatedAt'>> & {
      notifyReady?: boolean
    }
  ): Promise<IFinalProjectLifecycle> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned faculty guides or administrators can prepare repository publication drafts.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const lifecycle = await this.ensureLifecycleRecord(schedule)

    if (
      ![
        'COMPLETION_APPROVED',
        'PUBLICATION_DRAFT',
        'UNPUBLISHED',
        'PUBLISHED',
      ].includes(lifecycle.status)
    ) {
      throw httpError(
        409,
        'COMPLETION_NOT_APPROVED',
        'Final academic project completion must be approved before preparing repository publication.'
      )
    }

    const latestSnap =
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1]
    const baseDraft: IPublicationDraft =
      lifecycle.publicationDraft ||
      (latestSnap
        ? buildDefaultPublicationDraft(schedule, latestSnap, actor.id)
        : {
            title: schedule.projectTitle,
            abstract: '',
            academicYear: schedule.academicYear,
            department: schedule.department,
            problemStatement: '',
            objectives: [],
            proposedSolution: '',
            modules: [],
            technologyStack: [],
            learningOutcomes: [],
            challenges: [],
            futureEnhancements: [],
            references: [],
            selectedScreenshotFileIds: [],
            teamMembers: [],
            facultyGuide: { name: schedule.facultyGuideName, department: schedule.department },
            updatedByFacultyId: actor.id,
            updatedAt: new Date(),
          })

    const allAllowedFileIds = new Set<string>([
      ...(latestSnap?.finalReportFiles.map((f) => f.fileId) || []),
      ...(latestSnap?.architectureDiagramFiles.map((f) => f.fileId) || []),
      ...(latestSnap?.screenshotFiles.map((f) => f.fileId) || []),
      ...(latestSnap?.presentationFiles.map((f) => f.fileId) || []),
      ...(latestSnap?.supportingFiles.map((f) => f.fileId) || []),
    ])

    const filterAllowed = (fid?: string) => (fid && allAllowedFileIds.has(fid) ? fid : undefined)

    const now = new Date()
    const cleanDraft: IPublicationDraft = {
      title: (draftInput.title ?? baseDraft.title).trim(),
      abstract: (draftInput.abstract ?? baseDraft.abstract).trim(),
      academicYear: (draftInput.academicYear ?? baseDraft.academicYear).trim(),
      batch: (draftInput.batch ?? baseDraft.batch)?.trim() || undefined,
      department: (draftInput.department ?? baseDraft.department).trim(),
      semester: (draftInput.semester ?? baseDraft.semester)?.trim() || undefined,
      category: (draftInput.category ?? baseDraft.category)?.trim() || baseDraft.department,
      problemStatement: (draftInput.problemStatement ?? baseDraft.problemStatement).trim(),
      objectives: (draftInput.objectives ?? baseDraft.objectives).map((s) => s.trim()).filter(Boolean),
      proposedSolution: (draftInput.proposedSolution ?? baseDraft.proposedSolution).trim(),
      modules: draftInput.modules ?? baseDraft.modules,
      technologyStack: draftInput.technologyStack ?? baseDraft.technologyStack,
      architectureDescription:
        (draftInput.architectureDescription ?? baseDraft.architectureDescription)?.trim() || undefined,
      learningOutcomes: (draftInput.learningOutcomes ?? baseDraft.learningOutcomes)
        .map((s) => s.trim())
        .filter(Boolean),
      challenges: (draftInput.challenges ?? baseDraft.challenges).map((s) => s.trim()).filter(Boolean),
      futureEnhancements: (draftInput.futureEnhancements ?? baseDraft.futureEnhancements)
        .map((s) => s.trim())
        .filter(Boolean),
      references: (draftInput.references ?? baseDraft.references).map((s) => s.trim()).filter(Boolean),
      selectedScreenshotFileIds: (
        draftInput.selectedScreenshotFileIds ?? baseDraft.selectedScreenshotFileIds
      ).filter((id) => allAllowedFileIds.has(id)),
      selectedArchitectureDiagramFileId: filterAllowed(
        draftInput.selectedArchitectureDiagramFileId ?? baseDraft.selectedArchitectureDiagramFileId
      ),
      selectedFinalReportFileId: filterAllowed(
        draftInput.selectedFinalReportFileId ?? baseDraft.selectedFinalReportFileId
      ),
      githubUrl: assertValidOptionalUrl(draftInput.githubUrl ?? baseDraft.githubUrl, 'GitHub'),
      demoUrl: assertValidOptionalUrl(draftInput.demoUrl ?? baseDraft.demoUrl, 'Demo'),
      videoUrl: assertValidOptionalUrl(draftInput.videoUrl ?? baseDraft.videoUrl, 'Video'),
      documentationUrl: assertValidOptionalUrl(
        draftInput.documentationUrl ?? baseDraft.documentationUrl,
        'Documentation'
      ),
      // Privacy guard: retain only public attribution fields
      teamMembers: (draftInput.teamMembers ?? baseDraft.teamMembers).map((m) => ({
        studentId: m.studentId,
        name: m.name.trim(),
        role: m.role?.trim() || 'Contributor',
        department: m.department?.trim() || schedule.department,
        isLeader: m.isLeader === true,
      })),
      facultyGuide: {
        name: draftInput.facultyGuide?.name?.trim() || baseDraft.facultyGuide.name || schedule.facultyGuideName,
        designation:
          draftInput.facultyGuide?.designation?.trim() || baseDraft.facultyGuide.designation || 'Faculty Guide',
        department:
          draftInput.facultyGuide?.department?.trim() || baseDraft.facultyGuide.department || schedule.department,
      },
      updatedByFacultyId: actor.id,
      updatedAt: now,
    }

    const nextStatus: FinalLifecycleStatus =
      lifecycle.status === 'PUBLISHED' ? 'PUBLISHED' : 'PUBLICATION_DRAFT'

    const updated = (await FinalLifecycleRepository.update(lifecycle.id, {
      status: nextStatus,
      publicationDraft: cleanDraft,
      auditHistory: [
        ...lifecycle.auditHistory,
        {
          entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
          action: 'PUBLICATION_DRAFT_SAVED',
          actorId: actor.id,
          actorName: actor.fullName || 'Faculty Guide',
          actorRole: actor.role,
          previousStatus: lifecycle.status,
          newStatus: nextStatus,
          comment: 'Prepared repository publication draft preview.',
          timestamp: now,
        },
      ],
    }))!

    await AuditLogRepository.record({
      projectId: schedule.projectId,
      action: 'PUBLICATION_DRAFT_SAVED',
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.fullName || 'Faculty Guide',
      previousStatus: lifecycle.status,
      newStatus: nextStatus,
      notes: 'Prepared curated public repository draft.',
    })

    if (draftInput.notifyReady) {
      await academicNotificationService
        .dispatchAcademicNotification({
          recipientId: schedule.facultyGuideId,
          type: 'PUBLICATION_DRAFT_READY',
          category: 'PUBLICATION',
          title: `Publication Draft Ready: ${cleanDraft.title}`,
          message: `Publication preview draft for "${cleanDraft.title}" is saved and ready for explicit publication.`,
          actionUrl: `/faculty-final-review/${schedule.id}`,
          scheduleId: schedule.id,
          projectId: schedule.projectId,
          projectTitle: cleanDraft.title,
        })
        .catch(() => {})
    }

    return updated
  }

  async publishToRepository(
    actor: AuthUser,
    scheduleId: string
  ): Promise<{ lifecycle: IFinalProjectLifecycle; projectId: string }> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only authorized faculty guides or administrators can publish projects to the repository.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const lifecycle = await this.ensureLifecycleRecord(schedule)

    if (lifecycle.status === 'PUBLISHED') {
      throw httpError(
        409,
        'ALREADY_PUBLISHED',
        'This project is already published in the CampusProjectHub repository.'
      )
    }

    if (
      ![
        'COMPLETION_APPROVED',
        'PUBLICATION_DRAFT',
        'UNPUBLISHED',
      ].includes(lifecycle.status)
    ) {
      throw httpError(
        409,
        'COMPLETION_NOT_APPROVED',
        'Approve final academic completion before publishing to the repository.'
      )
    }

    const latestSnap =
      lifecycle.finalSubmissionRevisions[lifecycle.finalSubmissionRevisions.length - 1]
    if (!latestSnap) {
      throw httpError(409, 'NO_FINAL_SUBMISSION', 'Final submission record is missing.')
    }

    const draft =
      lifecycle.publicationDraft ||
      buildDefaultPublicationDraft(schedule, latestSnap, actor.id)

    const existingProject = await ProjectRepository.findById(schedule.projectId)
    if (!existingProject) {
      throw httpError(404, 'PROJECT_NOT_FOUND', 'Linked CampusProjectHub project record not found.')
    }

    const allFiles = [
      ...latestSnap.finalReportFiles,
      ...latestSnap.architectureDiagramFiles,
      ...latestSnap.screenshotFiles,
      ...latestSnap.presentationFiles,
      ...latestSnap.supportingFiles,
    ]
    const findFile = (id?: string) => allFiles.find((f) => f.fileId === id)

    const publishedAssetFileIds: string[] = []
    const screenshots = (draft.selectedScreenshotFileIds || [])
      .map((fid) => {
        const meta = findFile(fid)
        if (!meta) return null
        publishedAssetFileIds.push(fid)
        return {
          url: `/api/final-lifecycle/published-files/${existingProject.id}/${fid}`,
          caption: meta.originalName,
        }
      })
      .filter((x): x is { url: string; caption: string } => x !== null)

    let diagramUrl = existingProject.architecture?.diagramUrl
    if (draft.selectedArchitectureDiagramFileId) {
      const diagMeta = findFile(draft.selectedArchitectureDiagramFileId)
      if (diagMeta) {
        publishedAssetFileIds.push(diagMeta.fileId)
        diagramUrl = `/api/final-lifecycle/published-files/${existingProject.id}/${diagMeta.fileId}`
      }
    }

    const reportDocuments = []
    if (draft.selectedFinalReportFileId) {
      const repMeta = findFile(draft.selectedFinalReportFileId)
      if (repMeta) {
        publishedAssetFileIds.push(repMeta.fileId)
        reportDocuments.push({
          title: `${draft.title} — Approved Final Report`,
          fileUrl: `/api/final-lifecycle/published-files/${existingProject.id}/${repMeta.fileId}`,
          fileType: repMeta.mimeType === 'application/pdf' ? 'PDF' : 'DOCX',
          verified: true,
        })
      }
    }

    const now = new Date()
    const facultyName = actor.fullName || schedule.facultyGuideName || 'Faculty Guide'

    // Update the EXISTING Project record cleanly (never creates a duplicate Project!)
    await ProjectRepository.update(existingProject.id, {
      title: draft.title,
      abstract: draft.abstract,
      problemStatement: draft.problemStatement,
      objectives: draft.objectives,
      solution: draft.proposedSolution,
      proposedSolution: draft.proposedSolution,
      proposedSystem: draft.proposedSolution,
      modules: draft.modules,
      architecture: {
        description: draft.architectureDescription || existingProject.architecture?.description,
        diagramUrl,
      },
      technologyStack: draft.technologyStack,
      challenges: draft.challenges,
      learningOutcomes: draft.learningOutcomes,
      futureEnhancements: draft.futureEnhancements,
      references: draft.references,
      academicYear: draft.academicYear,
      batch: draft.batch,
      semester: draft.semester,
      department: draft.department,
      category: draft.category || draft.department,
      teamId: `team:${schedule.id}`,
      teamMembers: draft.teamMembers.map((m) => ({
        studentId: m.studentId,
        name: m.name,
        role: m.role,
        department: m.department,
        isLeader: m.isLeader === true,
      })),
      facultyGuide: {
        name: draft.facultyGuide.name,
        designation: draft.facultyGuide.designation,
        department: draft.facultyGuide.department,
      },
      screenshots: screenshots.length > 0 ? screenshots : existingProject.screenshots,
      reportDocuments:
        reportDocuments.length > 0 ? reportDocuments : existingProject.reportDocuments,
      githubUrl: draft.githubUrl,
      demoUrl: draft.demoUrl,
      videoUrl: draft.videoUrl,
      documentationUrl: draft.documentationUrl,
      sourceType: 'STUDENT_SUBMISSION',
      reviewStatus: 'APPROVED',
      verificationStatus: 'FACULTY_APPROVED',
      publicationStatus: 'PUBLISHED',
      sourceScheduleId: schedule.id,
      approvedBy: actor.id,
      approvedAt: lifecycle.completionApprovedAt || now,
      publishedBy: actor.id,
      publishedAt: now,
      unpublishedReason: undefined,
      publishedAssetFileIds: Array.from(new Set(publishedAssetFileIds)),
    })

    const updated = (await FinalLifecycleRepository.update(lifecycle.id, {
      status: 'PUBLISHED',
      publicationDraft: draft,
      publishedAt: now,
      publishedByFacultyId: actor.id,
      publishedByFacultyName: facultyName,
      auditHistory: [
        ...lifecycle.auditHistory,
        {
          entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
          action: 'PROJECT_PUBLISHED',
          actorId: actor.id,
          actorName: facultyName,
          actorRole: actor.role,
          previousStatus: lifecycle.status,
          newStatus: 'PUBLISHED',
          comment: 'Explicitly published verified project to main CampusProjectHub repository.',
          timestamp: now,
        },
      ],
    }))!

    await AuditLogRepository.record({
      projectId: existingProject.id,
      action: 'PROJECT_PUBLISHED',
      actorId: actor.id,
      actorRole: actor.role,
      actorName: facultyName,
      previousStatus: existingProject.publicationStatus || 'NOT_PUBLISHED',
      newStatus: 'PUBLISHED',
      notes: 'Published verified lifecycle project into CampusProjectHub repository.',
    })

    await Promise.all(
      schedule.assignedStudentIds.map((studentId) =>
        academicNotificationService
          .dispatchAcademicNotification({
            recipientId: studentId,
            type: 'PROJECT_PUBLISHED',
            category: 'PUBLICATION',
            title: `Project Published to Repository: ${draft.title}`,
            message: `${facultyName} published "${draft.title}" to the official CampusProjectHub academic repository.`,
            actionUrl: `/projects/${existingProject.id}`,
            deduplicationKey: `fin:${studentId}:${schedule.id}:PUBLISHED:${formatUtcDate(now)}:${updated.auditHistory.length}`,
            scheduleId: schedule.id,
            projectId: existingProject.id,
            projectTitle: draft.title,
            sendOptionalEmail: true,
          })
          .catch(() => {})
      )
    )

    return { lifecycle: updated, projectId: existingProject.id }
  }

  async unpublishOrArchive(
    actor: AuthUser,
    scheduleId: string,
    mode: 'UNPUBLISH' | 'ARCHIVE',
    reason: string
  ): Promise<IFinalProjectLifecycle> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only authorized faculty guides or administrators can unpublish or archive repository records.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const lifecycle = await this.ensureLifecycleRecord(schedule)
    const cleanReason = reason.trim()
    if (cleanReason.length < 5) {
      throw httpError(
        400,
        'REASON_REQUIRED',
        'Provide a clear audit reason (at least 5 characters).'
      )
    }

    const now = new Date()
    const facultyName = actor.fullName || 'Faculty Guide'
    const nextStatus: FinalLifecycleStatus = mode === 'ARCHIVE' ? 'ARCHIVED' : 'UNPUBLISHED'
    const nextRepoPubStatus = mode === 'ARCHIVE' ? 'ARCHIVED' : 'UNPUBLISHED'

    await ProjectRepository.update(schedule.projectId, {
      publicationStatus: nextRepoPubStatus,
      unpublishedReason: cleanReason,
    })

    const updated = (await FinalLifecycleRepository.update(lifecycle.id, {
      status: nextStatus,
      ...(mode === 'ARCHIVE'
        ? { archivedAt: now, archivedReason: cleanReason }
        : { unpublishedAt: now, unpublishedReason: cleanReason }),
      auditHistory: [
        ...lifecycle.auditHistory,
        {
          entryId: `aud-${crypto.randomUUID().slice(0, 8)}`,
          action: mode === 'ARCHIVE' ? 'PROJECT_ARCHIVED' : 'PROJECT_UNPUBLISHED',
          actorId: actor.id,
          actorName: facultyName,
          actorRole: actor.role,
          previousStatus: lifecycle.status,
          newStatus: nextStatus,
          comment: cleanReason,
          timestamp: now,
        },
      ],
    }))!

    await AuditLogRepository.record({
      projectId: schedule.projectId,
      action: mode === 'ARCHIVE' ? 'PROJECT_ARCHIVED' : 'PROJECT_UNPUBLISHED',
      actorId: actor.id,
      actorRole: actor.role,
      actorName: facultyName,
      previousStatus: lifecycle.status,
      newStatus: nextStatus,
      notes: cleanReason,
    })

    return updated
  }

  /**
   * Authorized internal file access for the team & faculty guide during final review.
   */
  async authorizeAndReadLifecycleFile(actor: AuthUser, fileId: string) {
    const fileRecord = await ActivitySubmissionRepository.findFileRecordByFileId(fileId)
    if (!fileRecord) {
      throw httpError(404, 'FILE_NOT_FOUND', 'Requested file was not found.')
    }
    await this.loadAuthorizedSchedule(actor, fileRecord.scheduleId)
    const buffer = await readPrivateEvidenceFile(fileRecord.storageKey)
    return { record: fileRecord, buffer }
  }

  /**
   * Public-repository asset access strictly limited to explicitly approved & published
   * screenshot, architecture diagram, and final report fileIds on a PUBLISHED Project.
   */
  async authorizeAndReadPublishedAsset(projectId: string, fileId: string) {
    const project = await ProjectRepository.findById(projectId)
    if (!project) {
      throw httpError(404, 'PROJECT_NOT_FOUND', 'Project was not found.')
    }
    if (
      project.publicationStatus !== 'PUBLISHED' ||
      project.verificationStatus !== 'FACULTY_APPROVED' ||
      project.reviewStatus !== 'APPROVED'
    ) {
      throw httpError(
        403,
        'FORBIDDEN',
        'Repository assets are accessible only while the project is actively published.'
      )
    }

    if (!project.publishedAssetFileIds || !project.publishedAssetFileIds.includes(fileId)) {
      throw httpError(
        403,
        'FORBIDDEN',
        'This document was not approved for public repository access.'
      )
    }

    const fileRecord = await ActivitySubmissionRepository.findFileRecordByFileId(fileId)
    if (!fileRecord || fileRecord.projectId !== project.id) {
      throw httpError(404, 'FILE_NOT_FOUND', 'Published project asset file was not found.')
    }

    const buffer = await readPrivateEvidenceFile(fileRecord.storageKey)
    return { record: fileRecord, buffer }
  }
}

export const finalLifecycleService = new FinalLifecycleService()
