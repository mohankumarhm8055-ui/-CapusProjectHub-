import crypto from 'node:crypto'
import type { AuthUser } from '../../middleware/auth.middleware.js'
import { ProjectRepository } from '../repository/project.model.js'
import { academicNotificationService } from '../notifications/notification.service.js'
import { formatUtcDate, parseUtcNoon } from '../schedules/calendar.utils.js'
import { ProjectScheduleRepository } from '../schedules/schedule.model.js'
import type { IProjectSchedule, IScheduledActivity } from '../schedules/schedule.types.js'
import {
  MAX_EVIDENCE_FILES_PER_SUBMISSION,
  persistPrivateEvidenceFile,
  readPrivateEvidenceFile,
  validateEvidenceFile,
  type ValidatedUploadInput,
} from './evidence.storage.js'
import { ActivitySubmissionRepository } from './submission.model.js'
import type {
  ActivitySubmissionStatus,
  ActivityTimingStatus,
  IActivitySubmission,
  IActivitySubmissionRevision,
  IEvidenceFileMeta,
  IEvidenceLink,
} from './submission.types.js'

function httpError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

function diffCalendarDays(laterIso: string, earlierIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((parseUtcNoon(laterIso).getTime() - parseUtcNoon(earlierIso).getTime()) / msPerDay)
}

function validateEvidenceLinks(links: IEvidenceLink[]): IEvidenceLink[] {
  const cleaned: IEvidenceLink[] = []
  for (const item of links) {
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

export function computeActivityTiming(
  activity: IScheduledActivity,
  submission: IActivitySubmission | null,
  todayIso = formatUtcDate(new Date())
): {
  timingStatus: ActivityTimingStatus
  daysRemaining: number
  isOverdueNow: boolean
  isLateSubmission: boolean
  lateByDays: number
} {
  const daysRemaining = diffCalendarDays(activity.deadline, todayIso)
  const isOverdueNow = daysRemaining < 0

  if (submission) {
    return {
      timingStatus: submission.isLate ? 'SUBMITTED_LATE' : 'SUBMITTED_ON_TIME',
      daysRemaining,
      isOverdueNow,
      isLateSubmission: submission.isLate,
      lateByDays: submission.lateByDays,
    }
  }

  let timingStatus: ActivityTimingStatus = 'UPCOMING'
  if (daysRemaining < 0) timingStatus = 'OVERDUE'
  else if (daysRemaining === 0) timingStatus = 'DUE_TODAY'

  return {
    timingStatus,
    daysRemaining,
    isOverdueNow,
    isLateSubmission: false,
    lateByDays: isOverdueNow ? Math.abs(daysRemaining) : 0,
  }
}

export interface ActivityTrackerSummaryItem {
  activity: IScheduledActivity
  submissionMode: 'TEAM_SHARED' | 'INDIVIDUAL'
  submissionStatus: ActivitySubmissionStatus
  timingStatus: ActivityTimingStatus
  daysRemaining: number
  isOverdueNow: boolean
  isLateSubmission: boolean
  lateByDays: number
  latestSubmission: IActivitySubmission | null
}

export class ActivitySubmissionService {
  private async loadAuthorizedSchedule(
    actor: AuthUser,
    scheduleId: string
  ): Promise<IProjectSchedule> {
    const schedule = await ProjectScheduleRepository.findById(scheduleId)
    if (!schedule) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Academic project schedule was not found.')
    }

    if (actor.role === 'admin') {
      return schedule
    }

    if (actor.role === 'faculty') {
      if (schedule.facultyGuideId !== actor.id && schedule.createdByFacultyId !== actor.id) {
        throw httpError(403, 'FORBIDDEN', 'You do not have permission to access this project schedule.')
      }
      return schedule
    }

    // Student access strictly limited to PUBLISHED schedules assigned to their account
    if (schedule.status !== 'PUBLISHED' || !schedule.assignedStudentIds.includes(actor.id)) {
      throw httpError(
        403,
        'FORBIDDEN',
        'You are not authorized to access activities or submissions for this project.'
      )
    }
    return schedule
  }

  private resolveSubmissionKey(activity: IScheduledActivity, studentId: string): {
    submissionScope: 'TEAM_SHARED' | 'INDIVIDUAL'
    submissionKey: string
  } {
    const scope = activity.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED'
    return {
      submissionScope: scope,
      submissionKey: scope === 'INDIVIDUAL' ? studentId : 'TEAM',
    }
  }

  private findRelevantSubmission(
    submissions: IActivitySubmission[],
    activity: IScheduledActivity,
    actor: AuthUser
  ): IActivitySubmission | null {
    const scope = activity.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED'
    if (scope === 'TEAM_SHARED') {
      return (
        submissions.find(
          (s) => s.activityId === activity.activityId && s.submissionKey === 'TEAM'
        ) || null
      )
    }
    if (actor.role === 'student') {
      return (
        submissions.find(
          (s) => s.activityId === activity.activityId && s.submissionKey === actor.id
        ) || null
      )
    }
    // Faculty/admin summary view: return latest matching individual submission when looking at list
    return (
      submissions
        .filter((s) => s.activityId === activity.activityId)
        .sort((a, b) => b.lastSubmittedAt.getTime() - a.lastSubmittedAt.getTime())[0] || null
    )
  }

  async listAuthorizedWorkspaces(actor: AuthUser) {
    let schedules: IProjectSchedule[] = []
    if (actor.role === 'admin') {
      schedules = await ProjectScheduleRepository.listAll()
    } else if (actor.role === 'faculty') {
      schedules = await ProjectScheduleRepository.listByFaculty(actor.id)
    } else {
      schedules = await ProjectScheduleRepository.listPublishedForStudent(actor.id)
    }

    const todayIso = formatUtcDate(new Date())

    return Promise.all(
      schedules.map(async (schedule) => {
        const [project, submissions] = await Promise.all([
          ProjectRepository.findById(schedule.projectId),
          ActivitySubmissionRepository.listBySchedule(schedule.id),
        ])

        const activities: ActivityTrackerSummaryItem[] = [...schedule.activities]
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
          .map((activity) => {
            const sub = this.findRelevantSubmission(submissions, activity, actor)
            const timing = computeActivityTiming(activity, sub, todayIso)
            return {
              activity,
              submissionMode: activity.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED',
              submissionStatus: sub ? sub.status : 'NOT_SUBMITTED',
              timingStatus: timing.timingStatus,
              daysRemaining: timing.daysRemaining,
              isOverdueNow: timing.isOverdueNow,
              isLateSubmission: timing.isLateSubmission,
              lateByDays: timing.lateByDays,
              latestSubmission: sub,
            }
          })

        return {
          schedule,
          projectDescription:
            project?.abstract ||
            project?.problemStatement ||
            `Faculty-guided academic project "${schedule.projectTitle}".`,
          activities,
        }
      })
    )
  }

  async getWorkspaceDetail(actor: AuthUser, scheduleId: string) {
    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const [project, submissions] = await Promise.all([
      ProjectRepository.findById(schedule.projectId),
      ActivitySubmissionRepository.listBySchedule(schedule.id),
    ])

    const todayIso = formatUtcDate(new Date())
    const activities: ActivityTrackerSummaryItem[] = [...schedule.activities]
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((activity) => {
        const sub = this.findRelevantSubmission(submissions, activity, actor)
        const timing = computeActivityTiming(activity, sub, todayIso)
        return {
          activity,
          submissionMode: activity.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED',
          submissionStatus: sub ? sub.status : 'NOT_SUBMITTED',
          timingStatus: timing.timingStatus,
          daysRemaining: timing.daysRemaining,
          isOverdueNow: timing.isOverdueNow,
          isLateSubmission: timing.isLateSubmission,
          lateByDays: timing.lateByDays,
          latestSubmission: sub,
        }
      })

    return {
      schedule,
      projectDescription:
        project?.abstract ||
        project?.problemStatement ||
        `Faculty-guided academic project "${schedule.projectTitle}".`,
      activities,
    }
  }

  async getActivityDetail(actor: AuthUser, scheduleId: string, activityId: string) {
    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const activity = schedule.activities.find((a) => a.activityId === activityId)
    if (!activity) {
      throw httpError(404, 'ACTIVITY_NOT_FOUND', 'Scheduled activity was not found in this schedule.')
    }

    const [project, allScheduleSubmissions] = await Promise.all([
      ProjectRepository.findById(schedule.projectId),
      ActivitySubmissionRepository.listBySchedule(schedule.id),
    ])

    const relevant = this.findRelevantSubmission(allScheduleSubmissions, activity, actor)
    const revisions = relevant
      ? await ActivitySubmissionRepository.listRevisions(relevant.id)
      : []

    const todayIso = formatUtcDate(new Date())
    const timing = computeActivityTiming(activity, relevant, todayIso)
    const submissionMode = activity.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED'
    const submissionStatus: ActivitySubmissionStatus = relevant ? relevant.status : 'NOT_SUBMITTED'

    const isStudent = actor.role === 'student'
    const canSubmitInitial = isStudent && !relevant
    const canResubmit = isStudent && relevant !== null && relevant.status === 'CHANGES_REQUESTED'

    // If faculty/admin views an INDIVIDUAL activity, return all students' submissions list too
    const individualSubmissions =
      actor.role !== 'student' && submissionMode === 'INDIVIDUAL'
        ? allScheduleSubmissions.filter((s) => s.activityId === activity.activityId)
        : undefined

    return {
      schedule: {
        id: schedule.id,
        projectId: schedule.projectId,
        projectTitle: schedule.projectTitle,
        department: schedule.department,
        academicYear: schedule.academicYear,
        templateName: schedule.templateName,
        templateVersion: schedule.templateVersion,
        facultyGuideId: schedule.facultyGuideId,
        facultyGuideName: schedule.facultyGuideName,
        assignedStudents: schedule.assignedStudents,
        status: schedule.status,
      },
      projectDescription:
        project?.abstract ||
        project?.problemStatement ||
        `Faculty-guided academic project "${schedule.projectTitle}".`,
      activity,
      submissionMode,
      submissionStatus,
      timingStatus: timing.timingStatus,
      daysRemaining: timing.daysRemaining,
      isOverdueNow: timing.isOverdueNow,
      isLateSubmission: timing.isLateSubmission,
      lateByDays: timing.lateByDays,
      submission: relevant,
      revisions,
      individualSubmissions,
      permissions: {
        canSubmitInitial,
        canResubmit,
        canModifyOfficialSchedule: false,
      },
    }
  }

  private validateIncomingFiles(files: ValidatedUploadInput[]): void {
    if (files.length > MAX_EVIDENCE_FILES_PER_SUBMISSION) {
      throw httpError(
        400,
        'TOO_MANY_FILES',
        `A single submission accepts at most ${MAX_EVIDENCE_FILES_PER_SUBMISSION} files.`
      )
    }
    for (const file of files) {
      validateEvidenceFile(file)
    }
  }

  private async storeUploadedFiles(params: {
    schedule: IProjectSchedule
    activity: IScheduledActivity
    submissionId: string
    revisionNumber: number
    submissionScope: 'TEAM_SHARED' | 'INDIVIDUAL'
    ownerStudentId?: string
    studentId: string
    studentName: string
    files: ValidatedUploadInput[]
  }): Promise<IEvidenceFileMeta[]> {
    if (params.files.length > MAX_EVIDENCE_FILES_PER_SUBMISSION) {
      throw httpError(
        400,
        'TOO_MANY_FILES',
        `A single submission accepts at most ${MAX_EVIDENCE_FILES_PER_SUBMISSION} files.`
      )
    }

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

    if (metas.length > 0) {
      await ActivitySubmissionRepository.registerFileRecords(
        metas.map((m) => ({
          fileId: m.fileId,
          storageKey: m.storageKey,
          projectId: params.schedule.projectId,
          scheduleId: params.schedule.id,
          activityId: params.activity.activityId,
          submissionId: params.submissionId,
          revisionNumber: params.revisionNumber,
          submissionScope: params.submissionScope,
          ownerStudentId: params.ownerStudentId,
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

    return metas
  }

  private async syncScheduleActivityState(
    schedule: IProjectSchedule,
    activityId: string,
    activityStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
    facultyReviewStatus: 'NOT_REVIEWED' | 'PENDING' | 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED'
  ): Promise<void> {
    const nextActivities = schedule.activities.map((a) =>
      a.activityId === activityId
        ? { ...a, activityStatus, facultyReviewStatus }
        : a
    )
    await ProjectScheduleRepository.update(schedule.id, { activities: nextActivities })
  }

  async submitInitialEvidence(
    actor: AuthUser,
    scheduleId: string,
    activityId: string,
    input: {
      description: string
      links: IEvidenceLink[]
      files: ValidatedUploadInput[]
    }
  ): Promise<{ submission: IActivitySubmission; revision: IActivitySubmissionRevision }> {
    if (actor.role !== 'student') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned project students can submit activity evidence.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const activity = schedule.activities.find((a) => a.activityId === activityId)
    if (!activity) {
      throw httpError(404, 'ACTIVITY_NOT_FOUND', 'Scheduled activity was not found.')
    }

    const cleanedLinks = validateEvidenceLinks(input.links || [])
    if (input.files.length === 0 && cleanedLinks.length === 0) {
      throw httpError(
        400,
        'EVIDENCE_REQUIRED',
        'Attach at least one valid evidence file or supporting reference URL.'
      )
    }
    this.validateIncomingFiles(input.files)

    const { submissionScope, submissionKey } = this.resolveSubmissionKey(activity, actor.id)
    const existing = await ActivitySubmissionRepository.findByKey(
      schedule.id,
      activity.activityId,
      submissionKey
    )

    if (existing) {
      const hint =
        existing.status === 'CHANGES_REQUESTED'
          ? `Submission #${existing.latestRevisionNumber} has faculty feedback. Use resubmit to submit a corrected revision.`
          : submissionScope === 'TEAM_SHARED'
          ? `Team evidence was already submitted by ${existing.lastSubmittedByStudentName}. Duplicate initial submissions are prevented.`
          : 'You have already submitted evidence for this activity.'
      throw httpError(409, 'DUPLICATE_SUBMISSION', hint)
    }

    const teamMeta = schedule.assignedStudents.find((s) => s.studentId === actor.id)
    const studentName = actor.fullName || teamMeta?.fullName || 'Student'
    const now = new Date()
    const submittedDateIso = formatUtcDate(now)
    const dayDiff = diffCalendarDays(submittedDateIso, activity.deadline)
    const isLate = dayDiff > 0
    const lateByDays = isLate ? dayDiff : 0

    let createdSubmission: IActivitySubmission
    try {
      createdSubmission = await ActivitySubmissionRepository.create({
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        activityId: activity.activityId,
        activitySequenceNumber: activity.sequenceNumber,
        activityTitle: activity.title,
        submissionScope,
        submissionKey,
        ownerStudentId: submissionScope === 'INDIVIDUAL' ? actor.id : undefined,
        createdByStudentId: actor.id,
        createdByStudentName: studentName,
        lastSubmittedByStudentId: actor.id,
        lastSubmittedByStudentName: studentName,
        latestRevisionNumber: 1,
        status: 'SUBMITTED',
        isLate,
        lateByDays,
        firstSubmittedAt: now,
        lastSubmittedAt: now,
      })
    } catch (err: any) {
      if (err?.code === 11000) {
        throw httpError(
          409,
          'DUPLICATE_SUBMISSION',
          'Evidence has already been submitted for this activity.'
        )
      }
      throw err
    }

    const storedFiles = await this.storeUploadedFiles({
      schedule,
      activity,
      submissionId: createdSubmission.id,
      revisionNumber: 1,
      submissionScope,
      ownerStudentId: submissionScope === 'INDIVIDUAL' ? actor.id : undefined,
      studentId: actor.id,
      studentName,
      files: input.files,
    })

    const revision = await ActivitySubmissionRepository.createRevision({
      submissionId: createdSubmission.id,
      projectId: schedule.projectId,
      scheduleId: schedule.id,
      activityId: activity.activityId,
      revisionNumber: 1,
      submittedByStudentId: actor.id,
      submittedByStudentName: studentName,
      submittedByIsTeamLeader: teamMeta?.isTeamLeader === true,
      submissionDescription: input.description.trim(),
      evidenceFiles: storedFiles,
      evidenceLinks: cleanedLinks,
      statusAtSubmission: 'SUBMITTED',
      submittedAt: now,
      submittedDateIso,
      deadlineAtSubmission: activity.deadline,
      isLate,
      lateByDays,
    })

    await this.syncScheduleActivityState(schedule, activity.activityId, 'IN_PROGRESS', 'PENDING')

    // Notify only assigned faculty guide (never expose private document contents)
    await academicNotificationService
      .dispatchAcademicNotification({
        recipientId: schedule.facultyGuideId,
        type: 'ACTIVITY_SUBMISSION_RECEIVED',
        category: 'SUBMISSION',
        title: `Submission Received: ${activity.title}`,
        message: `${studentName} submitted Revision #1 for "${activity.title}" (${schedule.projectTitle}).${isLate ? ` Submitted ${lateByDays} day(s) after deadline.` : ''}`,
        actionUrl: `/activity-tracker/${schedule.id}/activities/${activity.activityId}`,
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        projectTitle: schedule.projectTitle,
        entityType: 'SUBMISSION',
        entityId: createdSubmission.id,
        sendOptionalEmail: true,
        data: {
          projectId: schedule.projectId,
          projectTitle: schedule.projectTitle,
          scheduleId: schedule.id,
          activityId: activity.activityId,
          submissionId: createdSubmission.id,
          senderId: actor.id,
          senderName: studentName,
        },
      })
      .catch(() => {})

    return { submission: createdSubmission, revision }
  }

  async resubmitRevisedEvidence(
    actor: AuthUser,
    scheduleId: string,
    activityId: string,
    input: {
      description: string
      links: IEvidenceLink[]
      files: ValidatedUploadInput[]
    }
  ): Promise<{ submission: IActivitySubmission; revision: IActivitySubmissionRevision }> {
    if (actor.role !== 'student') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned project students can resubmit activity evidence.'
      )
    }

    const schedule = await this.loadAuthorizedSchedule(actor, scheduleId)
    const activity = schedule.activities.find((a) => a.activityId === activityId)
    if (!activity) {
      throw httpError(404, 'ACTIVITY_NOT_FOUND', 'Scheduled activity was not found.')
    }

    const { submissionScope, submissionKey } = this.resolveSubmissionKey(activity, actor.id)
    const existing = await ActivitySubmissionRepository.findByKey(
      schedule.id,
      activity.activityId,
      submissionKey
    )

    if (!existing) {
      throw httpError(
        404,
        'SUBMISSION_NOT_FOUND',
        'No initial submission exists for this activity yet. Submit initial evidence first.'
      )
    }

    if (submissionScope === 'INDIVIDUAL' && existing.ownerStudentId !== actor.id) {
      throw httpError(403, 'FORBIDDEN', 'You can only resubmit your own individual submission.')
    }

    if (existing.status === 'APPROVED') {
      throw httpError(409, 'ALREADY_APPROVED', 'Approved submissions cannot be modified.')
    }

    if (existing.status === 'REJECTED') {
      throw httpError(
        409,
        'SUBMISSION_REJECTED',
        'Rejected submissions cannot be resubmitted directly. Contact your assigned faculty guide.'
      )
    }

    if (existing.status !== 'CHANGES_REQUESTED') {
      throw httpError(
        409,
        'RESUBMISSION_NOT_REQUESTED',
        `Resubmission is allowed only when faculty requests changes (current status: ${existing.status}).`
      )
    }

    const cleanedLinks = validateEvidenceLinks(input.links || [])
    if (input.files.length === 0 && cleanedLinks.length === 0) {
      throw httpError(
        400,
        'EVIDENCE_REQUIRED',
        'Attach at least one revised evidence file or supporting reference URL.'
      )
    }
    this.validateIncomingFiles(input.files)

    const nextRevisionNumber = existing.latestRevisionNumber + 1
    const teamMeta = schedule.assignedStudents.find((s) => s.studentId === actor.id)
    const studentName = actor.fullName || teamMeta?.fullName || 'Student'
    const now = new Date()
    const submittedDateIso = formatUtcDate(now)
    const dayDiff = diffCalendarDays(submittedDateIso, activity.deadline)
    const isLate = dayDiff > 0
    const lateByDays = isLate ? dayDiff : 0

    const storedFiles = await this.storeUploadedFiles({
      schedule,
      activity,
      submissionId: existing.id,
      revisionNumber: nextRevisionNumber,
      submissionScope,
      ownerStudentId: existing.ownerStudentId,
      studentId: actor.id,
      studentName,
      files: input.files,
    })

    const revision = await ActivitySubmissionRepository.createRevision({
      submissionId: existing.id,
      projectId: schedule.projectId,
      scheduleId: schedule.id,
      activityId: activity.activityId,
      revisionNumber: nextRevisionNumber,
      submittedByStudentId: actor.id,
      submittedByStudentName: studentName,
      submittedByIsTeamLeader: teamMeta?.isTeamLeader === true,
      submissionDescription: input.description.trim(),
      evidenceFiles: storedFiles,
      evidenceLinks: cleanedLinks,
      statusAtSubmission: 'RESUBMITTED',
      submittedAt: now,
      submittedDateIso,
      deadlineAtSubmission: activity.deadline,
      isLate,
      lateByDays,
    })

    const updated = await ActivitySubmissionRepository.update(existing.id, {
      latestRevisionNumber: nextRevisionNumber,
      status: 'RESUBMITTED',
      lastSubmittedByStudentId: actor.id,
      lastSubmittedByStudentName: studentName,
      lastSubmittedAt: now,
      isLate,
      lateByDays,
    })

    await this.syncScheduleActivityState(schedule, activity.activityId, 'IN_PROGRESS', 'PENDING')

    await academicNotificationService
      .dispatchAcademicNotification({
        recipientId: schedule.facultyGuideId,
        type: 'ACTIVITY_SUBMISSION_RECEIVED',
        category: 'SUBMISSION',
        title: `Revised Submission (Rev #${nextRevisionNumber}): ${activity.title}`,
        message: `${studentName} uploaded Revision #${nextRevisionNumber} for "${activity.title}" (${schedule.projectTitle}) for faculty review.`,
        actionUrl: `/activity-tracker/${schedule.id}/activities/${activity.activityId}`,
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        projectTitle: schedule.projectTitle,
        entityType: 'SUBMISSION',
        entityId: existing.id,
        sendOptionalEmail: true,
        data: {
          projectId: schedule.projectId,
          projectTitle: schedule.projectTitle,
          scheduleId: schedule.id,
          activityId: activity.activityId,
          submissionId: existing.id,
          senderId: actor.id,
          senderName: studentName,
        },
      })
      .catch(() => {})

    return { submission: updated!, revision }
  }

  /**
   * Minimal assigned-faculty state transition hook for review lifecycle verification
   * (UNDER_REVIEW / CHANGES_REQUESTED / APPROVED). Preserves full revision history.
   */
  async transitionSubmissionReviewStatus(
    actor: AuthUser,
    submissionId: string,
    input: {
      outcome: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
      feedback: string
      correctionInstructions?: string
    }
  ): Promise<IActivitySubmission> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only the assigned faculty guide or administrator can review activity submissions.'
      )
    }

    const submission = await ActivitySubmissionRepository.findById(submissionId)
    if (!submission) {
      throw httpError(404, 'SUBMISSION_NOT_FOUND', 'Activity submission not found.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, submission.scheduleId)

    if (
      (input.outcome === 'CHANGES_REQUESTED' || input.outcome === 'REJECTED') &&
      input.feedback.trim().length < 5
    ) {
      throw httpError(
        400,
        'FEEDBACK_REQUIRED',
        input.outcome === 'REJECTED'
          ? 'Provide a clear rejection reason (at least 5 characters).'
          : 'Provide faculty feedback (at least 5 characters) explaining what must be corrected.'
      )
    }

    const now = new Date()
    const reviewerName = actor.fullName || 'Faculty Guide'
    const cleanFeedback = input.feedback.trim()
    const cleanInstructions = input.correctionInstructions?.trim() || undefined

    await ActivitySubmissionRepository.updateRevisionReview(
      submission.id,
      submission.latestRevisionNumber,
      {
        facultyReviewOutcome: input.outcome,
        facultyFeedback: cleanFeedback,
        correctionInstructions: cleanInstructions,
        reviewedByFacultyId: actor.id,
        reviewedByFacultyName: reviewerName,
        reviewedAt: now,
      }
    )

    const decisionRecord = {
      decisionId: `dec-${crypto.randomUUID().slice(0, 8)}`,
      revisionNumber: submission.latestRevisionNumber,
      outcome: input.outcome,
      comment: cleanFeedback || `Marked ${input.outcome.replace(/_/g, ' ')}.`,
      correctionInstructions: cleanInstructions,
      facultyId: actor.id,
      facultyName: reviewerName,
      facultyRole: actor.role,
      createdAt: now,
    }

    const updated = await ActivitySubmissionRepository.update(submission.id, {
      status: input.outcome,
      latestFacultyFeedback: cleanFeedback || submission.latestFacultyFeedback,
      reviewedByFacultyId: actor.id,
      reviewedByFacultyName: reviewerName,
      reviewedAt: now,
      reviewHistory: [...(submission.reviewHistory || []), decisionRecord],
    })

    const nextActStatus = input.outcome === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS'
    const nextReviewStatus =
      input.outcome === 'APPROVED'
        ? 'APPROVED'
        : input.outcome === 'REJECTED'
        ? 'REJECTED'
        : input.outcome === 'CHANGES_REQUESTED'
        ? 'REVISION_REQUIRED'
        : 'PENDING'

    await this.syncScheduleActivityState(
      schedule,
      submission.activityId,
      nextActStatus,
      nextReviewStatus
    )

    // Notify ONLY the owning student (for INDIVIDUAL) or assigned team members (for TEAM_SHARED)
    const recipients =
      submission.submissionScope === 'INDIVIDUAL' && submission.ownerStudentId
        ? [submission.ownerStudentId]
        : schedule.assignedStudentIds

    const reviewNotifType =
      input.outcome === 'APPROVED'
        ? 'SUBMISSION_APPROVED'
        : input.outcome === 'REJECTED'
        ? 'SUBMISSION_REJECTED'
        : input.outcome === 'CHANGES_REQUESTED'
        ? 'SUBMISSION_CHANGES_REQUESTED'
        : 'ACTIVITY_SENT_FOR_REVIEW'

    const reviewTitle =
      input.outcome === 'APPROVED'
        ? `Submission Approved: ${submission.activityTitle}`
        : input.outcome === 'REJECTED'
        ? `Submission Rejected: ${submission.activityTitle}`
        : input.outcome === 'CHANGES_REQUESTED'
        ? `Changes Requested: ${submission.activityTitle}`
        : `Submission Under Review: ${submission.activityTitle}`

    const reviewMessage =
      input.outcome === 'APPROVED'
        ? `${reviewerName} approved your submission (Rev #${submission.latestRevisionNumber}) for "${submission.activityTitle}" (${schedule.projectTitle}).`
        : input.outcome === 'REJECTED'
        ? `${reviewerName} rejected submission Rev #${submission.latestRevisionNumber} for "${submission.activityTitle}" (${schedule.projectTitle}). Open the activity to view the recorded reason.`
        : input.outcome === 'CHANGES_REQUESTED'
        ? `${reviewerName} requested revisions on "${submission.activityTitle}" (${schedule.projectTitle}). Open the activity to view feedback.`
        : `${reviewerName} marked "${submission.activityTitle}" (${schedule.projectTitle}) under faculty review.`

    await Promise.all(
      recipients.map((studentId) =>
        academicNotificationService
          .dispatchAcademicNotification({
            recipientId: studentId,
            type: reviewNotifType,
            category: 'REVIEW',
            title: reviewTitle,
            message: reviewMessage,
            actionUrl: `/activity-tracker/${schedule.id}/activities/${submission.activityId}`,
            scheduleId: schedule.id,
            projectId: schedule.projectId,
            projectTitle: schedule.projectTitle,
            entityType: 'SUBMISSION',
            entityId: submission.id,
            sendOptionalEmail: input.outcome !== 'UNDER_REVIEW',
            data: {
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              scheduleId: schedule.id,
              activityId: submission.activityId,
              submissionId: submission.id,
              senderId: actor.id,
              senderName: reviewerName,
            },
          })
          .catch(() => {})
      )
    )

    return updated!
  }

  async addFeedbackWithoutDecision(
    actor: AuthUser,
    submissionId: string,
    input: { comment: string; correctionInstructions?: string }
  ): Promise<IActivitySubmission> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only the assigned faculty guide or administrator can add review feedback.'
      )
    }

    const submission = await ActivitySubmissionRepository.findById(submissionId)
    if (!submission) {
      throw httpError(404, 'SUBMISSION_NOT_FOUND', 'Activity submission not found.')
    }

    const schedule = await this.loadAuthorizedSchedule(actor, submission.scheduleId)
    const now = new Date()
    const reviewerName = actor.fullName || 'Faculty Guide'
    const cleanComment = input.comment.trim()

    const decisionRecord = {
      decisionId: `fbk-${crypto.randomUUID().slice(0, 8)}`,
      revisionNumber: submission.latestRevisionNumber,
      outcome: 'FEEDBACK_ADDED' as const,
      comment: cleanComment,
      correctionInstructions: input.correctionInstructions?.trim() || undefined,
      facultyId: actor.id,
      facultyName: reviewerName,
      facultyRole: actor.role,
      createdAt: now,
    }

    const updated = await ActivitySubmissionRepository.update(submission.id, {
      latestFacultyFeedback: cleanComment,
      reviewedByFacultyId: actor.id,
      reviewedByFacultyName: reviewerName,
      reviewedAt: now,
      reviewHistory: [...(submission.reviewHistory || []), decisionRecord],
    })

    const recipients =
      submission.submissionScope === 'INDIVIDUAL' && submission.ownerStudentId
        ? [submission.ownerStudentId]
        : schedule.assignedStudentIds

    await Promise.all(
      recipients.map((studentId) =>
        academicNotificationService
          .dispatchAcademicNotification({
            recipientId: studentId,
            type: 'SUBMISSION_FEEDBACK_ADDED',
            category: 'REVIEW',
            title: `Faculty Feedback Added: ${submission.activityTitle}`,
            message: `${reviewerName} added feedback on "${submission.activityTitle}" (${schedule.projectTitle}).`,
            actionUrl: `/activity-tracker/${schedule.id}/activities/${submission.activityId}`,
            scheduleId: schedule.id,
            projectId: schedule.projectId,
            projectTitle: schedule.projectTitle,
            entityType: 'SUBMISSION',
            entityId: submission.id,
            sendOptionalEmail: false,
            data: {
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              scheduleId: schedule.id,
              activityId: submission.activityId,
              submissionId: submission.id,
              senderId: actor.id,
              senderName: reviewerName,
            },
          })
          .catch(() => {})
      )
    )

    return updated!
  }

  async authorizeAndReadEvidenceFile(actor: AuthUser, fileId: string) {
    const fileRecord = await ActivitySubmissionRepository.findFileRecordByFileId(fileId)
    if (!fileRecord) {
      throw httpError(404, 'FILE_NOT_FOUND', 'Requested evidence file was not found.')
    }

    await this.loadAuthorizedSchedule(actor, fileRecord.scheduleId)

    // For INDIVIDUAL activities, restrict students to their own uploaded file only
    if (
      actor.role === 'student' &&
      fileRecord.submissionScope === 'INDIVIDUAL' &&
      fileRecord.ownerStudentId &&
      fileRecord.ownerStudentId !== actor.id
    ) {
      throw httpError(
        403,
        'FORBIDDEN',
        'Individual activity files can only be viewed by their submitting student or faculty guide.'
      )
    }

    const buffer = await readPrivateEvidenceFile(fileRecord.storageKey)
    return { record: fileRecord, buffer }
  }
}

export const activitySubmissionService = new ActivitySubmissionService()
