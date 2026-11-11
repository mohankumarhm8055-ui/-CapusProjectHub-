import {
  addCalendarDays,
  advanceToWorkingDay,
  advanceWorkingDurationInclusive,
  formatUtcDate,
  isWorkingDay,
  parseUtcNoon,
} from '../schedules/calendar.utils.js'
import type { IProjectSchedule } from '../schedules/schedule.types.js'
import type {
  IWeeklyProgressReport,
  IWeeklyReportingPeriod,
  WeeklyReminderSignal,
  WeeklyReportStatus,
} from './weeklyReport.types.js'

export function diffIsoDays(laterIso: string, earlierIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (parseUtcNoon(laterIso).getTime() - parseUtcNoon(earlierIso).getTime()) / msPerDay
  )
}

/**
 * Generates academic weekly reporting periods strictly from the project's
 * published schedule calendar configuration (start date, working days, holidays).
 * Never hardcodes Monday starts or skips configured institutional calendar constraints.
 */
export function generateWeeklyReportingPeriods(
  schedule: IProjectSchedule
): IWeeklyReportingPeriod[] {
  const { projectStartDate, workingDays, holidays } = schedule.calendarConfig
  const activeWorkingDays = workingDays && workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5]
  const workingDaysPerWeek = Math.max(1, activeWorkingDays.length)

  const activityStarts = schedule.activities.map((a) => a.startDate).sort()
  const activityDeadlines = schedule.activities.map((a) => a.deadline).sort()

  const rawAnchorStart =
    activityStarts.length > 0 && activityStarts[0] < projectStartDate
      ? activityStarts[0]
      : projectStartDate

  const scheduleEnd =
    activityDeadlines.length > 0
      ? activityDeadlines[activityDeadlines.length - 1]
      : addCalendarDays(rawAnchorStart, 55)

  let cursorStart = advanceToWorkingDay(rawAnchorStart, activeWorkingDays, holidays || [])
  const periods: IWeeklyReportingPeriod[] = []
  const teamId = `team:${schedule.id}`

  let weekNumber = 1
  const MAX_WEEKS = 60

  while (cursorStart <= scheduleEnd && weekNumber <= MAX_WEEKS) {
    const periodEnd = advanceWorkingDurationInclusive(
      cursorStart,
      workingDaysPerWeek,
      activeWorkingDays,
      holidays || []
    )

    // Count exact configured working days in [cursorStart..periodEnd]
    let workingDaysCount = 0
    let walk = cursorStart
    while (walk <= periodEnd) {
      if (isWorkingDay(walk, activeWorkingDays, holidays || []).working) {
        workingDaysCount++
      }
      walk = addCalendarDays(walk, 1)
    }

    const overlappingActivities = [...schedule.activities]
      .filter((act) => act.startDate <= periodEnd && act.deadline >= cursorStart)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((act) => ({
        activityId: act.activityId,
        sequenceNumber: act.sequenceNumber,
        title: act.title,
        deadline: act.deadline,
        weeklyUpdateRequired: act.weeklyUpdateRequired,
      }))

    periods.push({
      weekNumber,
      teamId,
      scheduleId: schedule.id,
      projectId: schedule.projectId,
      reportingPeriodStart: cursorStart,
      reportingPeriodEnd: periodEnd,
      reportingDeadline: periodEnd,
      workingDaysCount,
      overlappingActivities,
    })

    cursorStart = advanceToWorkingDay(addCalendarDays(periodEnd, 1), activeWorkingDays, holidays || [])
    weekNumber++
  }

  return periods
}

export function evaluatePeriodState(
  period: IWeeklyReportingPeriod,
  report: IWeeklyProgressReport | null,
  todayIso = formatUtcDate(new Date())
): {
  effectiveStatus: WeeklyReportStatus
  daysUntilDeadline: number
  isOverdueNow: boolean
  isPendingSubmission: boolean
  reminderSignal: WeeklyReminderSignal
} {
  const daysUntilDeadline = diffIsoDays(period.reportingDeadline, todayIso)
  const isOverdueNow = daysUntilDeadline < 0

  if (!report) {
    const effectiveStatus: WeeklyReportStatus = isOverdueNow ? 'OVERDUE' : 'NOT_STARTED'
    let reminderSignal: WeeklyReminderSignal = 'NONE'
    if (isOverdueNow) reminderSignal = 'OVERDUE'
    else if (daysUntilDeadline === 0) reminderSignal = 'DUE_TODAY'
    else if (daysUntilDeadline > 0 && daysUntilDeadline <= 2) reminderSignal = 'APPROACHING_DEADLINE'

    return {
      effectiveStatus,
      daysUntilDeadline,
      isOverdueNow,
      isPendingSubmission: true,
      reminderSignal,
    }
  }

  if (report.status === 'DRAFT') {
    const effectiveStatus: WeeklyReportStatus = isOverdueNow ? 'OVERDUE' : 'DRAFT'
    let reminderSignal: WeeklyReminderSignal = 'NONE'
    if (isOverdueNow) reminderSignal = 'OVERDUE'
    else if (daysUntilDeadline === 0) reminderSignal = 'DUE_TODAY'
    else if (daysUntilDeadline > 0 && daysUntilDeadline <= 2) reminderSignal = 'APPROACHING_DEADLINE'

    return {
      effectiveStatus,
      daysUntilDeadline,
      isOverdueNow,
      isPendingSubmission: true,
      reminderSignal,
    }
  }

  if (report.status === 'CLARIFICATION_REQUESTED') {
    return {
      effectiveStatus: 'CLARIFICATION_REQUESTED',
      daysUntilDeadline,
      isOverdueNow,
      isPendingSubmission: true,
      reminderSignal: 'CLARIFICATION_REQUESTED',
    }
  }

  return {
    effectiveStatus: report.status,
    daysUntilDeadline,
    isOverdueNow: false,
    isPendingSubmission: false,
    reminderSignal: 'NONE',
  }
}
