import { ActivitySubmissionRepository } from '../activity-submissions/submission.model.js'
import { formatUtcDate, parseUtcNoon } from '../schedules/calendar.utils.js'
import { ProjectScheduleRepository } from '../schedules/schedule.model.js'
import type { IProjectSchedule } from '../schedules/schedule.types.js'
import { generateWeeklyReportingPeriods } from '../weekly-reports/weeklyReport.calendar.js'
import { WeeklyReportRepository } from '../weekly-reports/weeklyReport.model.js'
import {
  ReminderJobRunRepository,
  ReminderPolicyRepository,
} from './notification.model.js'
import { academicNotificationService } from './notification.service.js'
import type { NotificationType } from '../connections/connection.types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Resolves a calendar date YYYY-MM-DD in the schedule's configured institutional timezone
 * (falling back cleanly to UTC date-only if 'UTC_DATE_ONLY' or invalid IANA zone).
 */
export function resolveScheduleDateIso(timezone: string | undefined, now = new Date()): string {
  if (!timezone || timezone === 'UTC_DATE_ONLY') {
    return formatUtcDate(now)
  }
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted
    }
  } catch {
    // Invalid timezone identifier -> safe UTC date fallback
  }
  return formatUtcDate(now)
}

function diffIsoDates(targetIso: string, baseIso: string): number {
  return Math.round(
    (parseUtcNoon(targetIso).getTime() - parseUtcNoon(baseIso).getTime()) / MS_PER_DAY
  )
}

function classifyActivityReminder(
  daysRemaining: number,
  activityDaysBefore: number[],
  overdueEnabled: boolean,
  overdueGraceDays: number
): { type: NotificationType; label: string; sendEmail: boolean } | null {
  if (daysRemaining === 0 && activityDaysBefore.includes(0)) {
    return { type: 'ACTIVITY_DUE_TODAY', label: 'Due Today', sendEmail: true }
  }
  if (daysRemaining === 1 && activityDaysBefore.includes(1)) {
    return { type: 'ACTIVITY_DUE_TOMORROW', label: 'Due Tomorrow', sendEmail: true }
  }
  if (daysRemaining > 1 && activityDaysBefore.includes(daysRemaining)) {
    return {
      type: 'ACTIVITY_DEADLINE_UPCOMING',
      label: `Due in ${daysRemaining} days`,
      sendEmail: false,
    }
  }
  if (overdueEnabled && daysRemaining <= -Math.max(1, overdueGraceDays)) {
    return {
      type: 'ACTIVITY_OVERDUE',
      label: `Overdue by ${Math.abs(daysRemaining)} day(s)`,
      sendEmail: true,
    }
  }
  return null
}

function classifyWeeklyReminder(
  daysRemaining: number,
  weeklyDaysBefore: number[],
  overdueEnabled: boolean
): { type: NotificationType; label: string; sendEmail: boolean } | null {
  if (daysRemaining === 0 && weeklyDaysBefore.includes(0)) {
    return { type: 'WEEKLY_REPORT_DUE', label: 'Due Today', sendEmail: true }
  }
  if (daysRemaining > 0 && weeklyDaysBefore.includes(daysRemaining)) {
    return {
      type: 'WEEKLY_REPORT_APPROACHING',
      label: `Due in ${daysRemaining} day(s)`,
      sendEmail: false,
    }
  }
  if (overdueEnabled && daysRemaining <= -1) {
    return {
      type: 'WEEKLY_REPORT_OVERDUE',
      label: `Overdue by ${Math.abs(daysRemaining)} day(s)`,
      sendEmail: true,
    }
  }
  return null
}

export class ReminderEngineService {
  private activeCyclePromise: Promise<any> | null = null
  private intervalTimer: NodeJS.Timeout | null = null
  private startupTimer: NodeJS.Timeout | null = null

  async runDueCycle(params?: {
    referenceDateIso?: string
    referenceNow?: Date
    triggerSource?: 'STARTUP' | 'INTERVAL' | 'MANUAL'
  }) {
    if (this.activeCyclePromise) {
      return this.activeCyclePromise
    }

    this.activeCyclePromise = this.executeCycle(params).finally(() => {
      this.activeCyclePromise = null
    })
    return this.activeCyclePromise
  }

  private async executeCycle(params?: {
    referenceDateIso?: string
    referenceNow?: Date
    triggerSource?: 'STARTUP' | 'INTERVAL' | 'MANUAL'
  }) {
    const policy = await ReminderPolicyRepository.getOrInitGlobal()
    const now = params?.referenceNow || new Date()
    const triggerSource = params?.triggerSource || 'MANUAL'
    const fallbackIso = params?.referenceDateIso || formatUtcDate(now)

    const jobRun = await ReminderJobRunRepository.create({
      startedAt: new Date(),
      referenceDateIso: fallbackIso,
      triggerSource,
      scannedSchedules: 0,
      dispatchedCount: 0,
      dedupedCount: 0,
      failedCount: 0,
      status: 'RUNNING',
    })

    let scannedSchedules = 0
    let dispatchedCount = 0
    let dedupedCount = 0
    let failedCount = 0

    try {
      const allSchedules = await ProjectScheduleRepository.listAll()
      const publishedSchedules = allSchedules.filter((s) => s.status === 'PUBLISHED')
      scannedSchedules = publishedSchedules.length

      for (const schedule of publishedSchedules) {
        const scheduleTodayIso =
          params?.referenceDateIso ||
          resolveScheduleDateIso(schedule.calendarConfig?.timezone, now)

        const counts = await this.evaluateSingleSchedule(schedule, scheduleTodayIso, policy)
        dispatchedCount += counts.dispatchedCount
        dedupedCount += counts.dedupedCount
        failedCount += counts.failedCount
      }

      await ReminderJobRunRepository.complete(jobRun.id, {
        finishedAt: new Date(),
        scannedSchedules,
        dispatchedCount,
        dedupedCount,
        failedCount,
        status: 'COMPLETED',
      })

      return {
        runId: jobRun.id,
        referenceDateIso: fallbackIso,
        scannedSchedules,
        dispatchedCount,
        dedupedCount,
        failedCount,
      }
    } catch (err: any) {
      await ReminderJobRunRepository.complete(jobRun.id, {
        finishedAt: new Date(),
        scannedSchedules,
        dispatchedCount,
        dedupedCount,
        failedCount,
        status: 'FAILED',
        errorMessage: err?.message || 'Reminder cycle failed',
      })
      throw err
    }
  }

  private async evaluateSingleSchedule(
    schedule: IProjectSchedule,
    todayIso: string,
    policy: Awaited<ReturnType<typeof ReminderPolicyRepository.getOrInitGlobal>>
  ) {
    let dispatchedCount = 0
    let dedupedCount = 0
    let failedCount = 0

    const [submissions, weeklyReports] = await Promise.all([
      ActivitySubmissionRepository.listBySchedule(schedule.id),
      WeeklyReportRepository.listBySchedule(schedule.id),
    ])

    // 1. Evaluate Scheduled Activities
    for (const activity of schedule.activities) {
      const daysRemaining = diffIsoDates(activity.deadline, todayIso)
      const reminderMeta = classifyActivityReminder(
        daysRemaining,
        policy.activityDaysBefore,
        policy.activityOverdueEnabled,
        policy.activityOverdueGraceDays
      )
      if (!reminderMeta) continue

      const mode = activity.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED'

      if (mode === 'TEAM_SHARED') {
        const teamSub = submissions.find(
          (s) => s.activityId === activity.activityId && s.submissionKey === 'TEAM'
        )
        // Rule: Never send deadline reminders for approved or currently submitted/under-review work
        if (
          teamSub &&
          (teamSub.status === 'APPROVED' ||
            teamSub.status === 'REJECTED' ||
            teamSub.status === 'SUBMITTED' ||
            teamSub.status === 'UNDER_REVIEW' ||
            teamSub.status === 'RESUBMITTED')
        ) {
          continue
        }

        for (const studentId of schedule.assignedStudentIds) {
          const dedupKey = `rem:${studentId}:${schedule.id}:ACT:${activity.activityId}:${reminderMeta.type}:v${schedule.version}:${activity.deadline}`
          try {
            const res = await academicNotificationService.dispatchAcademicNotification({
              recipientId: studentId,
              type: reminderMeta.type,
              category: 'ACTIVITY',
              title: `Activity ${reminderMeta.label}: ${activity.title}`,
              message: `${schedule.projectTitle} — Activity #${activity.sequenceNumber} ("${activity.title}") deadline is ${activity.deadline}.`,
              actionUrl: `/activity-tracker/${schedule.id}/activities/${activity.activityId}`,
              deduplicationKey: dedupKey,
              deadlineVersion: schedule.version,
              scheduleId: schedule.id,
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              entityType: 'ACTIVITY',
              entityId: activity.activityId,
              targetDeadline: activity.deadline,
              sendOptionalEmail: reminderMeta.sendEmail,
              data: {
                projectId: schedule.projectId,
                projectTitle: schedule.projectTitle,
                scheduleId: schedule.id,
                activityId: activity.activityId,
              },
            })
            if (res.dispatched) dispatchedCount++
            else if (res.deduped) dedupedCount++
          } catch {
            failedCount++
          }
        }
      } else {
        // INDIVIDUAL submission mode: evaluate per assigned student independently
        for (const studentId of schedule.assignedStudentIds) {
          const studentSub = submissions.find(
            (s) => s.activityId === activity.activityId && s.submissionKey === studentId
          )
          if (
            studentSub &&
            (studentSub.status === 'APPROVED' ||
              studentSub.status === 'REJECTED' ||
              studentSub.status === 'SUBMITTED' ||
              studentSub.status === 'UNDER_REVIEW' ||
              studentSub.status === 'RESUBMITTED')
          ) {
            continue
          }

          const dedupKey = `rem:${studentId}:${schedule.id}:ACT:${activity.activityId}:${reminderMeta.type}:v${schedule.version}:${activity.deadline}`
          try {
            const res = await academicNotificationService.dispatchAcademicNotification({
              recipientId: studentId,
              type: reminderMeta.type,
              category: 'ACTIVITY',
              title: `Individual Activity ${reminderMeta.label}: ${activity.title}`,
              message: `${schedule.projectTitle} — Individual submission for Activity #${activity.sequenceNumber} ("${activity.title}") deadline is ${activity.deadline}.`,
              actionUrl: `/activity-tracker/${schedule.id}/activities/${activity.activityId}`,
              deduplicationKey: dedupKey,
              deadlineVersion: schedule.version,
              scheduleId: schedule.id,
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              entityType: 'ACTIVITY',
              entityId: activity.activityId,
              targetDeadline: activity.deadline,
              sendOptionalEmail: reminderMeta.sendEmail,
              data: {
                projectId: schedule.projectId,
                projectTitle: schedule.projectTitle,
                scheduleId: schedule.id,
                activityId: activity.activityId,
              },
            })
            if (res.dispatched) dispatchedCount++
            else if (res.deduped) dedupedCount++
          } catch {
            failedCount++
          }
        }
      }
    }

    // 2. Evaluate Weekly Reporting Periods
    const periods = generateWeeklyReportingPeriods(schedule)
    const reportByWeek = new Map(weeklyReports.map((r) => [r.weekNumber, r]))

    for (const period of periods) {
      const report = reportByWeek.get(period.weekNumber)
      // Rule: Do not send weekly reminders when report is already submitted, under review, or finalized
      if (
        report &&
        (report.status === 'SUBMITTED' ||
          report.status === 'UNDER_REVIEW' ||
          report.status === 'FINALIZED')
      ) {
        continue
      }

      const daysRemaining = diffIsoDates(period.reportingDeadline, todayIso)
      const weeklyMeta = classifyWeeklyReminder(
        daysRemaining,
        policy.weeklyReportDaysBefore,
        policy.weeklyReportOverdueEnabled
      )
      if (!weeklyMeta) continue

      for (const studentId of schedule.assignedStudentIds) {
        const dedupKey = `rem:${studentId}:${schedule.id}:WEEK:${period.weekNumber}:${weeklyMeta.type}:v${schedule.version}:${period.reportingDeadline}`
        try {
          const res = await academicNotificationService.dispatchAcademicNotification({
            recipientId: studentId,
            type: weeklyMeta.type,
            category: 'WEEKLY_REPORT',
            title: `Week ${period.weekNumber} Report ${weeklyMeta.label}`,
            message: `${schedule.projectTitle} — Week ${period.weekNumber} progress report (${period.reportingPeriodStart} to ${period.reportingPeriodEnd}) deadline is ${period.reportingDeadline}.`,
            actionUrl: `/weekly-reports/${schedule.id}`,
            deduplicationKey: dedupKey,
            deadlineVersion: schedule.version,
            scheduleId: schedule.id,
            projectId: schedule.projectId,
            projectTitle: schedule.projectTitle,
            entityType: 'WEEKLY_REPORT',
            entityId: `week-${period.weekNumber}`,
            targetDeadline: period.reportingDeadline,
            sendOptionalEmail: weeklyMeta.sendEmail,
            data: {
              projectId: schedule.projectId,
              projectTitle: schedule.projectTitle,
              scheduleId: schedule.id,
              weekNumber: period.weekNumber,
              reportId: report?.id,
            },
          })
          if (res.dispatched) dispatchedCount++
          else if (res.deduped) dedupedCount++
        } catch {
          failedCount++
        }
      }
    }

    return { dispatchedCount, dedupedCount, failedCount }
  }

  async startScheduler(): Promise<void> {
    this.stopScheduler()
    const policy = await ReminderPolicyRepository.getOrInitGlobal().catch(() => null)
    const intervalMs = Math.max(1, policy?.schedulerIntervalMinutes || 15) * 60 * 1000

    // Safe non-blocking catch-up tick shortly after startup
    this.startupTimer = setTimeout(() => {
      this.runDueCycle({ triggerSource: 'STARTUP' }).catch((err) => {
        console.warn('[ReminderEngine] Startup catch-up skipped/failed:', err?.message)
      })
    }, 5000)
    this.startupTimer.unref()

    this.intervalTimer = setInterval(() => {
      this.runDueCycle({ triggerSource: 'INTERVAL' }).catch((err) => {
        console.warn('[ReminderEngine] Interval cycle failed:', err?.message)
      })
    }, intervalMs)
    this.intervalTimer.unref()
  }

  stopScheduler(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = null
    }
  }
}

export const reminderEngineService = new ReminderEngineService()
