import type { AuthUser } from '../../middleware/auth.middleware.js'
import { ActivitySubmissionRepository } from '../activity-submissions/submission.model.js'
import { activitySubmissionService } from '../activity-submissions/submission.service.js'
import type { IActivitySubmission } from '../activity-submissions/submission.types.js'
import { ProjectRepository } from '../repository/project.model.js'
import { formatUtcDate } from '../schedules/calendar.utils.js'
import { ProjectScheduleRepository } from '../schedules/schedule.model.js'
import type { IProjectSchedule, IScheduledActivity } from '../schedules/schedule.types.js'
import { weeklyReportService } from '../weekly-reports/weeklyReport.service.js'
import type { WeeklyFacultyReviewAction } from '../weekly-reports/weeklyReport.types.js'

export type IndependentScheduleStatus = 'UPCOMING' | 'ACTIVE' | 'OVERDUE' | 'CLOSED'

export type ReviewDashboardBucket =
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'

function httpError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

export function computeIndependentScheduleStatus(
  activity: IScheduledActivity,
  submissionStatus: IActivitySubmission['status'],
  todayIso = formatUtcDate(new Date())
): IndependentScheduleStatus {
  if (submissionStatus === 'APPROVED' && todayIso > activity.deadline) {
    return 'CLOSED'
  }
  if (todayIso < activity.startDate) return 'UPCOMING'
  if (todayIso > activity.deadline) return 'OVERDUE'
  return 'ACTIVE'
}

function mapSubmissionToBucket(status: IActivitySubmission['status']): ReviewDashboardBucket {
  switch (status) {
    case 'UNDER_REVIEW':
      return 'UNDER_REVIEW'
    case 'CHANGES_REQUESTED':
      return 'CHANGES_REQUESTED'
    case 'RESUBMITTED':
      return 'RESUBMITTED'
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    default:
      return 'PENDING_REVIEW'
  }
}

export class FacultyReviewService {
  private async loadAssignedSchedules(actor: AuthUser): Promise<IProjectSchedule[]> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned faculty guides or administrators can access the faculty review workspace.'
      )
    }
    const all =
      actor.role === 'admin'
        ? await ProjectScheduleRepository.listAll()
        : await ProjectScheduleRepository.listByFaculty(actor.id)

    return all.filter((s) => s.status === 'PUBLISHED')
  }

  async getDashboard(
    actor: AuthUser,
    filters: {
      scheduleId?: string
      projectId?: string
      activityId?: string
      status?: string
      submissionDate?: string
      teamSearch?: string
    }
  ) {
    const schedules = await this.loadAssignedSchedules(actor)
    const scheduleById = new Map(schedules.map((s) => [s.id, s]))

    const targetSchedules = schedules.filter((s) => {
      if (filters.scheduleId && s.id !== filters.scheduleId) return false
      if (filters.projectId && s.projectId !== filters.projectId) return false
      return true
    })

    const submissions = await ActivitySubmissionRepository.listBySchedules(
      targetSchedules.map((s) => s.id)
    )

    const todayIso = formatUtcDate(new Date())
    const searchLower = filters.teamSearch?.trim().toLowerCase() || ''

    const enrichedItems = submissions
      .map((sub) => {
        const schedule = scheduleById.get(sub.scheduleId)
        if (!schedule) return null
        const activity = schedule.activities.find((a) => a.activityId === sub.activityId)
        if (!activity) return null

        const bucket = mapSubmissionToBucket(sub.status)
        const scheduleStatus = computeIndependentScheduleStatus(activity, sub.status, todayIso)
        const submittedDateIso = formatUtcDate(new Date(sub.lastSubmittedAt))

        if (filters.activityId && sub.activityId !== filters.activityId) return null
        if (filters.status && filters.status !== 'ALL' && bucket !== filters.status && sub.status !== filters.status) {
          return null
        }
        if (filters.submissionDate && submittedDateIso !== filters.submissionDate) return null
        if (searchLower) {
          const teamMatches = schedule.assignedStudents.some(
            (st) =>
              st.fullName.toLowerCase().includes(searchLower) ||
              (st.usnOrEmployeeId || '').toLowerCase().includes(searchLower)
          )
          const projMatches = schedule.projectTitle.toLowerCase().includes(searchLower)
          if (!teamMatches && !projMatches) return null
        }

        return {
          submission: sub,
          bucket,
          scheduleStatus,
          projectTitle: schedule.projectTitle,
          department: schedule.department,
          academicYear: schedule.academicYear,
          assignedStudents: schedule.assignedStudents,
          originalDeadline: activity.deadline,
          startDate: activity.startDate,
          submittedDateIso,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    const grouped = {
      pendingReview: enrichedItems.filter((i) => i.bucket === 'PENDING_REVIEW'),
      underReview: enrichedItems.filter((i) => i.bucket === 'UNDER_REVIEW'),
      changesRequested: enrichedItems.filter((i) => i.bucket === 'CHANGES_REQUESTED'),
      resubmitted: enrichedItems.filter((i) => i.bucket === 'RESUBMITTED'),
      approved: enrichedItems.filter((i) => i.bucket === 'APPROVED'),
      rejected: enrichedItems.filter((i) => i.bucket === 'REJECTED'),
    }

    const weeklyWorkspaces = await weeklyReportService.listAuthorizedWorkspaces(actor)

    return {
      items: enrichedItems,
      grouped,
      weeklyWorkspaces,
      filterOptions: {
        projects: schedules.map((s) => ({
          scheduleId: s.id,
          projectId: s.projectId,
          projectTitle: s.projectTitle,
          assignedStudents: s.assignedStudents,
        })),
        activities: Array.from(
          new Map(
            schedules.flatMap((s) =>
              s.activities.map((a) => [
                a.activityId,
                { activityId: a.activityId, sequenceNumber: a.sequenceNumber, title: a.title },
              ])
            )
          ).values()
        ).sort((a, b) => a.sequenceNumber - b.sequenceNumber),
      },
    }
  }

  async getSubmissionReviewDetail(actor: AuthUser, submissionId: string) {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only assigned faculty guides or administrators can inspect faculty review details.'
      )
    }

    const submission = await ActivitySubmissionRepository.findById(submissionId)
    if (!submission) {
      throw httpError(404, 'SUBMISSION_NOT_FOUND', 'Activity submission was not found.')
    }

    const schedule = await ProjectScheduleRepository.findById(submission.scheduleId)
    if (!schedule) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Parent project schedule was not found.')
    }

    if (
      actor.role === 'faculty' &&
      schedule.facultyGuideId !== actor.id &&
      schedule.createdByFacultyId !== actor.id
    ) {
      throw httpError(
        403,
        'FORBIDDEN',
        'You can only review submissions for academic projects assigned to you.'
      )
    }

    const activity = schedule.activities.find((a) => a.activityId === submission.activityId)
    if (!activity) {
      throw httpError(404, 'ACTIVITY_NOT_FOUND', 'Scheduled activity was not found.')
    }

    const [project, revisions] = await Promise.all([
      ProjectRepository.findById(schedule.projectId),
      ActivitySubmissionRepository.listRevisions(submission.id),
    ])

    const scheduleStatus = computeIndependentScheduleStatus(activity, submission.status)

    return {
      project: {
        projectId: schedule.projectId,
        projectTitle: schedule.projectTitle,
        description:
          project?.abstract ||
          project?.problemStatement ||
          `Faculty-guided academic project "${schedule.projectTitle}".`,
        department: schedule.department,
        academicYear: schedule.academicYear,
        scheduleId: schedule.id,
        facultyGuideName: schedule.facultyGuideName,
        assignedStudents: schedule.assignedStudents,
      },
      activity,
      scheduleStatus,
      reviewStatus: submission.status,
      submission,
      revisions,
      reviewHistory: [...(submission.reviewHistory || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }
  }

  async recordDecision(
    actor: AuthUser,
    submissionId: string,
    input: {
      outcome: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
      feedback: string
      correctionInstructions?: string
    }
  ) {
    return activitySubmissionService.transitionSubmissionReviewStatus(actor, submissionId, input)
  }

  async addFeedback(
    actor: AuthUser,
    submissionId: string,
    input: { comment: string; correctionInstructions?: string }
  ) {
    return activitySubmissionService.addFeedbackWithoutDecision(actor, submissionId, input)
  }

  async reviewWeeklyReport(
    actor: AuthUser,
    reportId: string,
    input: { action: WeeklyFacultyReviewAction; comment: string }
  ) {
    return weeklyReportService.reviewWeeklyReport(actor, reportId, input)
  }
}

export const facultyReviewService = new FacultyReviewService()
