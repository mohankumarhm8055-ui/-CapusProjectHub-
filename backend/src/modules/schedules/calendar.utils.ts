import {
  IAcademicCalendarConfig,
  IHolidayEntry,
  IScheduledActivity,
  ITemplateActivityDefault,
  ScheduleDateWarning,
} from './schedule.types.js'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Validates strict YYYY-MM-DD calendar date format and real calendar existence (e.g., rejects 2026-02-30).
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (!ISO_DATE_RE.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/**
 * Parses YYYY-MM-DD at UTC noon (12:00:00Z) so DST boundaries never shift calendar days.
 */
export function parseUtcNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addCalendarDays(dateStr: string, days: number): string {
  const dt = parseUtcNoon(dateStr)
  dt.setUTCDate(dt.getUTCDate() + days)
  return formatUtcDate(dt)
}

export function getUtcDayOfWeek(dateStr: string): number {
  return parseUtcNoon(dateStr).getUTCDay()
}

export function isWorkingDay(
  dateStr: string,
  workingDays: number[],
  holidays: IHolidayEntry[]
): { working: boolean; reason?: string } {
  const holiday = holidays.find((h) => h.date === dateStr)
  if (holiday) {
    return {
      working: false,
      reason: `Institutional holiday (${holiday.label || 'Non-working day'})`,
    }
  }
  const dow = getUtcDayOfWeek(dateStr)
  if (!workingDays.includes(dow)) {
    return {
      working: false,
      reason: `${DAY_NAMES[dow]} is configured as a non-working day`,
    }
  }
  return { working: true }
}

/**
 * Advances to the next working day on or after `dateStr`.
 */
export function advanceToWorkingDay(
  dateStr: string,
  workingDays: number[],
  holidays: IHolidayEntry[]
): string {
  if (!workingDays.length) {
    throw new Error('At least one working day of the week must be configured.')
  }
  let cursor = dateStr
  let guard = 0
  while (!isWorkingDay(cursor, workingDays, holidays).working) {
    cursor = addCalendarDays(cursor, 1)
    guard++
    if (guard > 400) {
      throw new Error('Unable to locate a working day within 400 calendar days.')
    }
  }
  return cursor
}

/**
 * Counts forward `workingDayCount` working days starting inclusively on a working day.
 * Example: duration=1 starts & ends on the same working day; duration=5 spans 5 working days.
 */
export function advanceWorkingDurationInclusive(
  startWorkingDate: string,
  workingDayCount: number,
  workingDays: number[],
  holidays: IHolidayEntry[]
): string {
  let cursor = advanceToWorkingDay(startWorkingDate, workingDays, holidays)
  let remaining = Math.max(1, workingDayCount) - 1
  let guard = 0

  while (remaining > 0) {
    cursor = addCalendarDays(cursor, 1)
    if (isWorkingDay(cursor, workingDays, holidays).working) {
      remaining--
    }
    guard++
    if (guard > 1000) {
      throw new Error('Exceeded calendar calculation horizon while computing deadline.')
    }
  }
  return cursor
}

/**
 * Generates suggested chronological activity dates from reusable template defaults
 * using the configured project start date, working days, and holidays.
 */
export function buildSuggestedActivitiesFromTemplate(
  calendarConfig: IAcademicCalendarConfig,
  templateActivities: ITemplateActivityDefault[]
): IScheduledActivity[] {
  const { projectStartDate, workingDays, holidays } = calendarConfig
  const sorted = [...templateActivities].sort((a, b) => a.sequenceNumber - b.sequenceNumber)

  let cursorStart = advanceToWorkingDay(projectStartDate, workingDays, holidays)
  const scheduled: IScheduledActivity[] = []

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    const startDate = advanceToWorkingDay(cursorStart, workingDays, holidays)
    const deadline = advanceWorkingDurationInclusive(
      startDate,
      item.suggestedDurationDays,
      workingDays,
      holidays
    )

    scheduled.push({
      activityId: `act-${item.sequenceNumber}-${i + 1}`,
      sequenceNumber: item.sequenceNumber,
      title: item.title,
      description: item.description,
      startDate,
      deadline,
      isMandatory: item.isMandatory,
      requiredSubmissionDescription: item.requiredDeliverables,
      acceptedEvidenceFormats: [...item.evidenceTypes],
      weeklyUpdateRequired: item.weeklyUpdateRequired,
      studentUpdateInstructions: item.studentUpdateInstructions,
      activityStatus: 'NOT_STARTED',
      facultyReviewStatus: 'NOT_REVIEWED',
    })

    // Next activity begins on the next working day after current activity's deadline
    cursorStart = advanceToWorkingDay(addCalendarDays(deadline, 1), workingDays, holidays)
  }

  return scheduled
}

/**
 * Validates hard date invariants and surfaces non-blocking warnings when
 * faculty-configured dates land on weekends or holidays (never silently shifting faculty dates).
 */
export function inspectScheduleCalendarDates(
  activities: Array<Pick<IScheduledActivity, 'activityId' | 'sequenceNumber' | 'title' | 'startDate' | 'deadline'>>,
  calendarConfig: IAcademicCalendarConfig
): { errors: string[]; warnings: ScheduleDateWarning[] } {
  const errors: string[] = []
  const warnings: ScheduleDateWarning[] = []

  if (!isValidIsoDate(calendarConfig.projectStartDate)) {
    errors.push(`Invalid project start date "${calendarConfig.projectStartDate}". Use YYYY-MM-DD.`)
  }
  if (!calendarConfig.workingDays || calendarConfig.workingDays.length === 0) {
    errors.push('At least one working day of the week must be selected.')
  }
  for (const h of calendarConfig.holidays || []) {
    if (!isValidIsoDate(h.date)) {
      errors.push(`Invalid holiday date "${h.date}". Use YYYY-MM-DD.`)
    }
  }

  for (const act of activities) {
    if (!isValidIsoDate(act.startDate)) {
      errors.push(`Activity #${act.sequenceNumber} ("${act.title}") has invalid start date "${act.startDate}".`)
      continue
    }
    if (!isValidIsoDate(act.deadline)) {
      errors.push(`Activity #${act.sequenceNumber} ("${act.title}") has invalid deadline "${act.deadline}".`)
      continue
    }
    if (act.startDate > act.deadline) {
      errors.push(
        `Activity #${act.sequenceNumber} ("${act.title}") start date (${act.startDate}) cannot be after its deadline (${act.deadline}).`
      )
    }
    if (isValidIsoDate(calendarConfig.projectStartDate) && act.deadline < calendarConfig.projectStartDate) {
      errors.push(
        `Activity #${act.sequenceNumber} ("${act.title}") deadline (${act.deadline}) precedes project start date (${calendarConfig.projectStartDate}).`
      )
    }

    if (calendarConfig.workingDays.length > 0) {
      const startCheck = isWorkingDay(act.startDate, calendarConfig.workingDays, calendarConfig.holidays || [])
      if (!startCheck.working) {
        warnings.push({
          activityId: act.activityId,
          sequenceNumber: act.sequenceNumber,
          activityTitle: act.title,
          field: 'startDate',
          date: act.startDate,
          reason: `Start date ${act.startDate}: ${startCheck.reason}`,
        })
      }

      const endCheck = isWorkingDay(act.deadline, calendarConfig.workingDays, calendarConfig.holidays || [])
      if (!endCheck.working) {
        warnings.push({
          activityId: act.activityId,
          sequenceNumber: act.sequenceNumber,
          activityTitle: act.title,
          field: 'deadline',
          date: act.deadline,
          reason: `Deadline ${act.deadline}: ${endCheck.reason}`,
        })
      }
    }
  }

  return { errors, warnings }
}
