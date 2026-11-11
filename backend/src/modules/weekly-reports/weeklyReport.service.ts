import crypto from 'node:crypto'
import type { AuthUser } from '../../middleware/auth.middleware.js'
import { academicNotificationService } from '../notifications/notification.service.js'
import {
  MAX_EVIDENCE_FILES_PER_SUBMISSION,
  persistPrivateEvidenceFile,
  readPrivateEvidenceFile,
  validateEvidenceFile,
  type ValidatedUploadInput,
} from '../activity-submissions/evidence.storage.js'
import { ActivitySubmissionRepository } from '../activity-submissions/submission.model.js'
import type { IEvidenceFileMeta, IEvidenceLink } from '../activity-submissions/submission.types.js'
import { formatUtcDate } from '../schedules/calendar.utils.js'
import { ProjectScheduleRepository } from '../schedules/schedule.model.js'
import type { IProjectSchedule } from '../schedules/schedule.types.js'
import {
  diffIsoDays,
  evaluatePeriodState,
  generateWeeklyReportingPeriods,
} from './weeklyReport.calendar.js'
import { WeeklyReportRepository } from './weeklyReport.model.js'
import type {
  IWeeklyIndividualContribution,
  IWeeklyProgressReport,
  IWeeklyReportingPeriod,
  WeeklyFacultyReviewAction,
  WeeklyReminderSignal,
  WeeklyReportStatus,
} from './weeklyReport.types.js'

function httpError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

function validateLinks(links: IEvidenceLink[]): IEvidenceLink[] {
  const cleaned: IEvidenceLink[] = []
  for (const item of links || []) {
    let parsed: URL
    try {
      parsed = new URL(item.url.trim())
    } catch {
      throw httpError(400, 'INVALID_EVIDENCE_URL', `Invalid evidence URL: "${item.url}".`)
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw httpError(
        400,
        'UNSAFE_EVIDENCE_URL',
        `Evidence links must use http:// or https:// protocol: "${item.url}".`
      )
    }
    cleaned.push({
      url: parsed.toString(),
      linkType: item.linkType || 'OTHER',
      label: item.label?.trim() || parsed.hostname,
    })
  }
  return cleaned
}

function validateUploadFiles(files: ValidatedUploadInput[]): void {
  if (files.length > MAX_EVIDENCE_FILES_PER_SUBMISSION) {
    throw httpError(
      400,
      'TOO_MANY_FILES',
      `A single upload accepts at most ${MAX_EVIDENCE_FILES_PER_SUBMISSION} files.`
    )
  }
  for (const f of files) {
    validateEvidenceFile(f)
  }
}

export interface EnrichedWeeklyPeriod {
  period: IWeeklyReportingPeriod
  report: IWeeklyProgressReport | null
  effectiveStatus: WeeklyReportStatus
  daysUntilDeadline: number
  isOverdueNow: boolean
  isPendingSubmission: boolean
  reminderSignal: WeeklyReminderSignal
  isCurrentWeek: boolean
}

export class WeeklyReportService {
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
        throw httpError(403, 'FORBIDDEN', 'You do not have permission to access this faculty project.')
      }
      return schedule
    }

    if (schedule.status !== 'PUBLISHED' || !schedule.assignedStudentIds.includes(actor.id)) {
      throw httpError(
        403,
        'FORBIDDEN',
        'You are not authorized to access weekly reports for this project.'
      )
    }
    return schedule
  }

  private async storeWeeklyFiles(params: {
    schedule: IProjectSchedule
    reportId: string
    weekNumber: number
    revisionNumber: number
    studentId: string
    studentName: string
    files: ValidatedUploadInput[]
  }): Promise<IEvidenceFileMeta[]> {
    if (params.files.length === 0) return []
    const metas: IEvidenceFileMeta[] = []
    for (const file of params.files) {
      const meta = await persistPrivateEvidenceFile({
        projectId: params.schedule.projectId,
        studentId: params.studentId,
        studentName: params.studentName,
        file,
      })
      metas.push(meta)
    }

    await ActivitySubmissionRepository.registerFileRecords(
      metas.map((m) => ({
        fileId: m.fileId,
        storageKey: m.storageKey,
        projectId: params.schedule.projectId,
        scheduleId: params.schedule.id,
        activityId: `WEEKLY_REPORT_W${params.weekNumber}`,
        submissionId: params.reportId,
        revisionNumber: params.revisionNumber,
        sourceKind: 'WEEKLY_REPORT',
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

    return metas
  }

  private buildWorkspaceSummary(
    schedule: IProjectSchedule,
    reports: IWeeklyProgressReport[],
    todayIso = formatUtcDate(new Date())
  ) {
    const periods = generateWeeklyReportingPeriods(schedule)
    const reportByWeek = new Map(reports.map((r) => [r.weekNumber, r]))

    let currentWeekNumber: number | null = null
    for (const p of periods) {
      if (p.reportingPeriodStart <= todayIso && todayIso <= p.reportingPeriodEnd) {
        currentWeekNumber = p.weekNumber
        break
      }
    }
    if (currentWeekNumber === null && periods.length > 0) {
      if (todayIso < periods[0].reportingPeriodStart) {
        currentWeekNumber = periods[0].weekNumber
      } else {
        currentWeekNumber = periods[periods.length - 1].weekNumber
      }
    }

    const weeks: EnrichedWeeklyPeriod[] = periods.map((period) => {
      const report = reportByWeek.get(period.weekNumber) || null
      const evaluated = evaluatePeriodState(period, report, todayIso)
      return {
        period,
        report,
        ...evaluated,
        isCurrentWeek: period.weekNumber === currentWeekNumber,
      }
    })

    return {
      schedule,
      teamId: `team:${schedule.id}`,
      currentWeekNumber,
      weeks,
      pendingWeeksCount: weeks.filter((w) => w.isPendingSubmission).length,
    }
  }

  async listAuthorizedWorkspaces(actor: AuthUser) {
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

    const todayIso = formatUtcDate(new Date())
    return Promise.all(
      schedules.map(async (schedule) => {
        const reports = await WeeklyReportRepository.listBySchedule(schedule.id)
        return this.buildWorkspaceSummary(schedule, reports, todayIso)
      })
    )
  }

  async getProjectWeeklyReports(actor: AuthUser, scheduleId: string) {
    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    if (schedule.status !== 'PUBLISHED') {
      throw httpError(
        400,
        'SCHEDULE_NOT_PUBLISHED',
        'Weekly reporting periods become active once the official academic schedule is published.'
      )
    }
    const reports = await WeeklyReportRepository.listBySchedule(schedule.id)
    return this.buildWorkspaceSummary(schedule, reports)
  }

  async getWeekReportDetail(actor: AuthUser, scheduleId: string, weekNumber: number) {
    const workspace = await this.getProjectWeeklyReports(actor, scheduleId)
    const weekEntry = workspace.weeks.find((w) => w.period.weekNumber === weekNumber)
    if (!weekEntry) {
      throw httpError(404, 'REPORT_PERIOD_NOT_FOUND', `Reporting Week #${weekNumber} was not found.`)
    }
    return {
      schedule: workspace.schedule,
      teamId: workspace.teamId,
      ...weekEntry,
    }
  }

  private assertEditableByStudent(report: IWeeklyProgressReport | null): void {
    if (!report) return
    if (report.status === 'FINALIZED') {
      throw httpError(
        409,
        'REPORT_FINALIZED',
        'Finalized weekly reports cannot be edited unless faculty requests clarification.'
      )
    }
    if (report.status === 'SUBMITTED' || report.status === 'UNDER_REVIEW') {
      throw httpError(
        409,
        'REPORT_LOCKED_FOR_REVIEW',
        `Report is currently ${report.status.replace(/_/g, ' ')}. Edits unlock if faculty requests clarification.`
      )
    }
  }

  async saveDraft(
    actor: AuthUser,
    scheduleId: string,
    weekNumber: number,
    input: {
      workCompleted: string
      workInProgress: string
      challengesOrBlockers: string
      planForNextWeek: string
      supportingEvidenceNotes: string
      links: IEvidenceLink[]
      files: ValidatedUploadInput[]
      retainFileIds?: string[]
    }
  ): Promise<IWeeklyProgressReport> {
    if (actor.role !== 'student') {
      throw httpError(403, 'FORBIDDEN', 'Only assigned project students can edit weekly report drafts.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const periods = generateWeeklyReportingPeriods(schedule)
    const period = periods.find((p) => p.weekNumber === weekNumber)
    if (!period) {
      throw httpError(404, 'REPORT_PERIOD_NOT_FOUND', `Reporting Week #${weekNumber} was not found.`)
    }

    const cleanedLinks = validateLinks(input.links || [])
    validateUploadFiles(input.files || [])

    const existing = await WeeklyReportRepository.findByScheduleAndWeek(schedule.id, weekNumber)
    this.assertEditableByStudent(existing)

    const studentName = actor.fullName || 'Student'
    const nextStatus =
      existing?.status === 'CLARIFICATION_REQUESTED' ? 'CLARIFICATION_REQUESTED' : 'DRAFT'

    if (!existing) {
      const created = await WeeklyReportRepository.create({
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        teamId: period.teamId,
        weekNumber: period.weekNumber,
        reportingPeriodStart: period.reportingPeriodStart,
        reportingPeriodEnd: period.reportingPeriodEnd,
        reportingDeadline: period.reportingDeadline,
        status: 'DRAFT',
        workCompleted: input.workCompleted.trim(),
        workInProgress: input.workInProgress.trim(),
        challengesOrBlockers: input.challengesOrBlockers.trim(),
        planForNextWeek: input.planForNextWeek.trim(),
        supportingEvidenceNotes: input.supportingEvidenceNotes.trim(),
        evidenceFiles: [],
        evidenceLinks: cleanedLinks,
        contributions: [],
        isLateSubmission: false,
        lateByDays: 0,
        latestRevisionNumber: 0,
        revisions: [],
        facultyComments: [],
      })

      if (input.files.length > 0) {
        const storedFiles = await this.storeWeeklyFiles({
          schedule,
          reportId: created.id,
          weekNumber,
          revisionNumber: 0,
          studentId: actor.id,
          studentName,
          files: input.files,
        })
        return (await WeeklyReportRepository.update(created.id, { evidenceFiles: storedFiles }))!
      }
      return created
    }

    const retainedFiles =
      input.retainFileIds !== undefined
        ? existing.evidenceFiles.filter((f) => input.retainFileIds!.includes(f.fileId))
        : existing.evidenceFiles

    const uploadedFiles = await this.storeWeeklyFiles({
      schedule,
      reportId: existing.id,
      weekNumber,
      revisionNumber: existing.latestRevisionNumber,
      studentId: actor.id,
      studentName,
      files: input.files,
    })

    return (await WeeklyReportRepository.update(existing.id, {
      status: nextStatus,
      workCompleted: input.workCompleted.trim(),
      workInProgress: input.workInProgress.trim(),
      challengesOrBlockers: input.challengesOrBlockers.trim(),
      planForNextWeek: input.planForNextWeek.trim(),
      supportingEvidenceNotes: input.supportingEvidenceNotes.trim(),
      evidenceLinks: cleanedLinks,
      evidenceFiles: [...retainedFiles, ...uploadedFiles],
    }))!
  }

  async upsertIndividualContribution(
    actor: AuthUser,
    scheduleId: string,
    weekNumber: number,
    input: {
      workPerformed: string
      relatedActivityId?: string
      supportingEvidenceNote?: string
      links: IEvidenceLink[]
      files: ValidatedUploadInput[]
    }
  ): Promise<IWeeklyProgressReport> {
    if (actor.role !== 'student') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned project team members can log individual contributions.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const periods = generateWeeklyReportingPeriods(schedule)
    const period = periods.find((p) => p.weekNumber === weekNumber)
    if (!period) {
      throw httpError(404, 'REPORT_PERIOD_NOT_FOUND', `Reporting Week #${weekNumber} was not found.`)
    }

    const cleanedLinks = validateLinks(input.links || [])
    validateUploadFiles(input.files || [])

    let relatedActivityTitle: string | undefined
    if (input.relatedActivityId) {
      const act = schedule.activities.find((a) => a.activityId === input.relatedActivityId)
      if (!act) {
        throw httpError(400, 'INVALID_ACTIVITY', 'Selected scheduled activity was not found in this schedule.')
      }
      relatedActivityTitle = act.title
    }

    let report = await WeeklyReportRepository.findByScheduleAndWeek(schedule.id, weekNumber)
    this.assertEditableByStudent(report)

    const teamMeta = schedule.assignedStudents.find((s) => s.studentId === actor.id)
    const studentName = actor.fullName || teamMeta?.fullName || 'Student'

    if (!report) {
      report = await WeeklyReportRepository.create({
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        teamId: period.teamId,
        weekNumber: period.weekNumber,
        reportingPeriodStart: period.reportingPeriodStart,
        reportingPeriodEnd: period.reportingPeriodEnd,
        reportingDeadline: period.reportingDeadline,
        status: 'DRAFT',
        workCompleted: '',
        workInProgress: '',
        challengesOrBlockers: '',
        planForNextWeek: '',
        supportingEvidenceNotes: '',
        evidenceFiles: [],
        evidenceLinks: [],
        contributions: [],
        isLateSubmission: false,
        lateByDays: 0,
        latestRevisionNumber: 0,
        revisions: [],
        facultyComments: [],
      })
    }

    const uploadedFiles = await this.storeWeeklyFiles({
      schedule,
      reportId: report.id,
      weekNumber,
      revisionNumber: report.latestRevisionNumber,
      studentId: actor.id,
      studentName,
      files: input.files,
    })

    const existingIndex = report.contributions.findIndex((c) => c.studentId === actor.id)
    const priorFiles = existingIndex !== -1 ? report.contributions[existingIndex].evidenceFiles : []

    const entry: IWeeklyIndividualContribution = {
      contributionId:
        existingIndex !== -1
          ? report.contributions[existingIndex].contributionId
          : `contrib-${crypto.randomUUID().slice(0, 8)}`,
      studentId: actor.id,
      studentName,
      usnOrEmployeeId: teamMeta?.usnOrEmployeeId,
      isTeamLeader: teamMeta?.isTeamLeader === true,
      workPerformed: input.workPerformed.trim(),
      relatedActivityId: input.relatedActivityId || undefined,
      relatedActivityTitle,
      supportingEvidenceNote: input.supportingEvidenceNote?.trim() || undefined,
      evidenceLinks: cleanedLinks,
      evidenceFiles: [...priorFiles, ...uploadedFiles],
      verificationLabel: 'STUDENT_REPORTED',
      updatedAt: new Date(),
    }

    const nextContributions = [...report.contributions]
    if (existingIndex !== -1) {
      nextContributions[existingIndex] = entry
    } else {
      nextContributions.push(entry)
    }

    return (await WeeklyReportRepository.update(report.id, {
      contributions: nextContributions,
    }))!
  }

  async submitWeeklyReport(
    actor: AuthUser,
    scheduleId: string,
    weekNumber: number,
    input: {
      workCompleted: string
      workInProgress: string
      challengesOrBlockers: string
      planForNextWeek: string
      supportingEvidenceNotes: string
      links: IEvidenceLink[]
      files: ValidatedUploadInput[]
      retainFileIds?: string[]
    }
  ): Promise<IWeeklyProgressReport> {
    if (actor.role !== 'student') {
      throw httpError(403, 'FORBIDDEN', 'Only assigned project students can submit weekly progress reports.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const periods = generateWeeklyReportingPeriods(schedule)
    const period = periods.find((p) => p.weekNumber === weekNumber)
    if (!period) {
      throw httpError(404, 'REPORT_PERIOD_NOT_FOUND', `Reporting Week #${weekNumber} was not found.`)
    }

    const cleanedLinks = validateLinks(input.links || [])
    validateUploadFiles(input.files || [])

    const existing = await WeeklyReportRepository.findByScheduleAndWeek(schedule.id, weekNumber)
    this.assertEditableByStudent(existing)

    const workCompleted = input.workCompleted.trim()
    const workInProgress = input.workInProgress.trim()
    const challengesOrBlockers = input.challengesOrBlockers.trim()
    const planForNextWeek = input.planForNextWeek.trim()
    const supportingEvidenceNotes = input.supportingEvidenceNotes.trim()

    if (
      workCompleted.length < 5 ||
      workInProgress.length < 3 ||
      challengesOrBlockers.length < 2 ||
      planForNextWeek.length < 5
    ) {
      throw httpError(
        400,
        'INCOMPLETE_REPORT_SECTIONS',
        'Complete all required weekly report sections (Completed, In Progress, Challenges/Blockers, Plan for Next Week).'
      )
    }

    const retainedFiles =
      existing && input.retainFileIds !== undefined
        ? existing.evidenceFiles.filter((f) => input.retainFileIds!.includes(f.fileId))
        : existing?.evidenceFiles || []

    const teamMeta = schedule.assignedStudents.find((s) => s.studentId === actor.id)
    const studentName = actor.fullName || teamMeta?.fullName || 'Student'
    const now = new Date()
    const submittedDateIso = formatUtcDate(now)
    const lateDays = diffIsoDays(submittedDateIso, period.reportingDeadline)
    const isLateSubmission = lateDays > 0
    const lateByDays = isLateSubmission ? lateDays : 0

    let targetReport = existing
    if (!targetReport) {
      try {
        targetReport = await WeeklyReportRepository.create({
          projectId: schedule.projectId,
          scheduleId: schedule.id,
          teamId: period.teamId,
          weekNumber: period.weekNumber,
          reportingPeriodStart: period.reportingPeriodStart,
          reportingPeriodEnd: period.reportingPeriodEnd,
          reportingDeadline: period.reportingDeadline,
          status: 'DRAFT',
          workCompleted,
          workInProgress,
          challengesOrBlockers,
          planForNextWeek,
          supportingEvidenceNotes,
          evidenceFiles: [],
          evidenceLinks: cleanedLinks,
          contributions: [],
          isLateSubmission: false,
          lateByDays: 0,
          latestRevisionNumber: 0,
          revisions: [],
          facultyComments: [],
        })
      } catch (err: any) {
        if (err?.code === 11000) {
          throw httpError(409, 'DUPLICATE_WEEKLY_REPORT', 'A weekly report for this period already exists.')
        }
        throw err
      }
    }

    const nextRevisionNumber = targetReport.latestRevisionNumber + 1
    const uploadedFiles = await this.storeWeeklyFiles({
      schedule,
      reportId: targetReport.id,
      weekNumber,
      revisionNumber: nextRevisionNumber,
      studentId: actor.id,
      studentName,
      files: input.files,
    })

    const combinedFiles = [...retainedFiles, ...uploadedFiles]
    if (!supportingEvidenceNotes && combinedFiles.length === 0 && cleanedLinks.length === 0) {
      throw httpError(
        400,
        'EVIDENCE_REQUIRED',
        'Provide Section E supporting evidence notes, files, or project links before submitting.'
      )
    }

    const revisionSnapshot = {
      revisionNumber: nextRevisionNumber,
      submittedByStudentId: actor.id,
      submittedByStudentName: studentName,
      submittedAt: now,
      submittedDateIso,
      isLateSubmission,
      lateByDays,
      workCompleted,
      workInProgress,
      challengesOrBlockers,
      planForNextWeek,
      supportingEvidenceNotes,
      evidenceFiles: combinedFiles,
      evidenceLinks: cleanedLinks,
      contributionsSnapshot: JSON.parse(JSON.stringify(targetReport.contributions || [])),
    }

    const wasClarification = targetReport.status === 'CLARIFICATION_REQUESTED'
    const savedReport = (await WeeklyReportRepository.update(targetReport.id, {
      status: 'SUBMITTED',
      workCompleted,
      workInProgress,
      challengesOrBlockers,
      planForNextWeek,
      supportingEvidenceNotes,
      evidenceFiles: combinedFiles,
      evidenceLinks: cleanedLinks,
      submittedAt: targetReport.submittedAt || now,
      lastSubmittedAt: now,
      submittedByStudentId: targetReport.submittedByStudentId || actor.id,
      submittedByStudentName: targetReport.submittedByStudentName || studentName,
      isLateSubmission,
      lateByDays,
      latestRevisionNumber: nextRevisionNumber,
      revisions: [...(targetReport.revisions || []), revisionSnapshot],
      reminderMetadata: {
        lastEvaluatedAt: now,
        lastSignal: 'NONE',
      },
    }))!

    // Notify assigned faculty guide only (no private contents exposed)
    await academicNotificationService
      .dispatchAcademicNotification({
        recipientId: schedule.facultyGuideId,
        type: 'WEEKLY_REPORT_SUBMITTED',
        category: 'WEEKLY_REPORT',
        title: wasClarification
          ? `Clarification Response Submitted: Week ${weekNumber} Report`
          : `Week ${weekNumber} Report Submitted: ${schedule.projectTitle}`,
        message: wasClarification
          ? `${studentName} submitted a clarification response (Rev #${nextRevisionNumber}) for Week ${weekNumber} report (${schedule.projectTitle}).`
          : `${studentName} submitted Week ${weekNumber} progress report (Rev #${nextRevisionNumber})${
              isLateSubmission ? ` (${lateByDays}d after deadline)` : ''
            }.`,
        actionUrl: `/weekly-reports/${schedule.id}`,
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        projectTitle: schedule.projectTitle,
        entityType: 'WEEKLY_REPORT',
        entityId: savedReport.id,
        sendOptionalEmail: true,
        data: {
          projectId: schedule.projectId,
          projectTitle: schedule.projectTitle,
          scheduleId: schedule.id,
          reportId: savedReport.id,
          weekNumber,
          senderId: actor.id,
          senderName: studentName,
        },
      })
      .catch(() => {})

    return savedReport
  }

  async reviewWeeklyReport(
    actor: AuthUser,
    reportId: string,
    input: {
      action: WeeklyFacultyReviewAction
      comment: string
    }
  ): Promise<IWeeklyProgressReport> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned faculty guides or administrators can review weekly progress reports.'
      )
    }

    const report = await WeeklyReportRepository.findById(reportId)
    if (!report) {
      throw httpError(404, 'WEEKLY_REPORT_NOT_FOUND', 'Weekly progress report was not found.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, report.scheduleId)

    if (report.status === 'DRAFT' || report.latestRevisionNumber === 0) {
      throw httpError(
        409,
        'REPORT_NOT_SUBMITTED',
        'Cannot review or finalize a draft weekly report before the team submits it.'
      )
    }

    if (
      (input.action === 'REQUEST_CLARIFICATION' || input.action === 'COMMENT') &&
      input.comment.trim().length < 5
    ) {
      throw httpError(
        400,
        'COMMENT_REQUIRED',
        'Provide clear faculty feedback (at least 5 characters).'
      )
    }

    const now = new Date()
    const facultyName = actor.fullName || 'Faculty Guide'
    const newComment = {
      commentId: `wfc-${crypto.randomUUID().slice(0, 8)}`,
      facultyId: actor.id,
      facultyName,
      action: input.action,
      comment:
        input.comment.trim() ||
        (input.action === 'MARK_UNDER_REVIEW'
          ? 'Marked under faculty review.'
          : 'Weekly progress report reviewed and finalized.'),
      targetRevisionNumber: report.latestRevisionNumber,
      createdAt: now,
    }

    let nextStatus = report.status
    let finalizedAt = report.finalizedAt
    let finalizedByFacultyId = report.finalizedByFacultyId
    let finalizedByFacultyName = report.finalizedByFacultyName

    if (input.action === 'MARK_UNDER_REVIEW') {
      if (report.status === 'FINALIZED') {
        throw httpError(409, 'ALREADY_FINALIZED', 'Finalized reports cannot return to under-review directly; use Request Clarification to reopen.')
      }
      nextStatus = 'UNDER_REVIEW'
    } else if (input.action === 'REQUEST_CLARIFICATION') {
      nextStatus = 'CLARIFICATION_REQUESTED'
    } else if (input.action === 'FINALIZE') {
      nextStatus = 'FINALIZED'
      finalizedAt = now
      finalizedByFacultyId = actor.id
      finalizedByFacultyName = facultyName
    }

    // Weekly report finalization NEVER alters scheduled activity completion or approval!
    const reviewed = (await WeeklyReportRepository.update(report.id, {
      status: nextStatus,
      facultyComments: [...(report.facultyComments || []), newComment],
      finalizedAt,
      finalizedByFacultyId,
      finalizedByFacultyName,
      reminderMetadata: {
        lastEvaluatedAt: now,
        lastSignal: nextStatus === 'CLARIFICATION_REQUESTED' ? 'CLARIFICATION_REQUESTED' : 'NONE',
      },
    }))!

    const notifType =
      input.action === 'REQUEST_CLARIFICATION'
        ? 'WEEKLY_REPORT_CLARIFICATION_REQUESTED'
        : input.action === 'FINALIZE'
        ? 'WEEKLY_REPORT_FINALIZED'
        : input.action === 'MARK_UNDER_REVIEW'
        ? 'ACTIVITY_SENT_FOR_REVIEW'
        : 'SUBMISSION_FEEDBACK_ADDED'

    const title =
      input.action === 'REQUEST_CLARIFICATION'
        ? `Clarification Requested: Week ${report.weekNumber} Report`
        : input.action === 'FINALIZE'
        ? `Week ${report.weekNumber} Report Finalized`
        : `Faculty Feedback on Week ${report.weekNumber} Report`

    const msg =
      input.action === 'REQUEST_CLARIFICATION'
        ? `${facultyName} requested clarification on Week ${report.weekNumber} progress report for ${schedule.projectTitle}.`
        : input.action === 'FINALIZE'
        ? `${facultyName} finalized Week ${report.weekNumber} progress report for ${schedule.projectTitle}.`
        : `${facultyName} added review notes on Week ${report.weekNumber} progress report for ${schedule.projectTitle}.`

    await Promise.all(
      schedule.assignedStudentIds.map((studentId) =>
        academicNotificationService
          .dispatchAcademicNotification({
            recipientId: studentId,
            type: notifType,
            category: 'REVIEW',
            title,
            message: msg,
            actionUrl: `/weekly-reports/${schedule.id}`,
            scheduleId: schedule.id,
            projectId: schedule.projectId,
            projectTitle: schedule.projectTitle,
            entityType: 'WEEKLY_REPORT',
            entityId: report.id,
            sendOptionalEmail: input.action === 'REQUEST_CLARIFICATION' || input.action === 'FINALIZE',
            data: {
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              scheduleId: schedule.id,
              reportId: report.id,
              weekNumber: report.weekNumber,
              senderId: actor.id,
              senderName: facultyName,
            },
          })
          .catch(() => {})
      )
    )

    return reviewed
  }

  /**
   * Prepares actionable reminder state flags for an upcoming notification engine
   * without sending duplicate reminders or running background schedulers in Task 3.
   */
  async listReminderCandidates(actor: AuthUser) {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Reminder candidate queries require faculty or admin role.')
    }
    const workspaces = await this.listAuthorizedWorkspaces(actor)
    const candidates: Array<{
      scheduleId: string
      projectId: string
      projectTitle: string
      teamId: string
      weekNumber: number
      reportingDeadline: string
      effectiveStatus: WeeklyReportStatus
      reminderSignal: WeeklyReminderSignal
      daysUntilDeadline: number
      assignedStudentIds: string[]
    }> = []

    for (const ws of workspaces) {
      for (const w of ws.weeks) {
        if (w.reminderSignal !== 'NONE') {
          candidates.push({
            scheduleId: ws.schedule.id,
            projectId: ws.schedule.projectId,
            projectTitle: ws.schedule.projectTitle,
            teamId: ws.teamId,
            weekNumber: w.period.weekNumber,
            reportingDeadline: w.period.reportingDeadline,
            effectiveStatus: w.effectiveStatus,
            reminderSignal: w.reminderSignal,
            daysUntilDeadline: w.daysUntilDeadline,
            assignedStudentIds: ws.schedule.assignedStudentIds,
          })
        }
      }
    }

    return candidates
  }

  async authorizeAndReadWeeklyFile(actor: AuthUser, fileId: string) {
    const fileRecord = await ActivitySubmissionRepository.findFileRecordByFileId(fileId)
    if (!fileRecord) {
      throw httpError(404, 'FILE_NOT_FOUND', 'Requested evidence file was not found.')
    }
    await this.loadAuthorizedSchedule(actor, fileRecord.scheduleId)
    const buffer = await readPrivateEvidenceFile(fileRecord.storageKey)
    return { record: fileRecord, buffer }
  }
}

export const weeklyReportService = new WeeklyReportService()
