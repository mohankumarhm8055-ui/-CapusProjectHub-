import { extractApiErrorMessage, getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/schedules`

export type EvidenceFormat =
  | 'PDF_DOCUMENT'
  | 'REPOSITORY_LINK'
  | 'DESIGN_FILE'
  | 'DEMO_VIDEO'
  | 'TEST_REPORT'
  | 'PRESENTATION_SLIDES'
  | 'SUMMARY_NOTE'

export interface TemplateActivityDefault {
  sequenceNumber: number
  title: string
  description: string
  suggestedDurationDays: number
  isMandatory: boolean
  requiredDeliverables: string
  evidenceTypes: EvidenceFormat[]
  weeklyUpdateRequired: boolean
  studentUpdateInstructions: string
}

export interface ScheduleTemplateVersion {
  id: string
  templateId: string
  templateCode: string
  version: number
  changelog: string
  activities: TemplateActivityDefault[]
  createdBy: string
  createdAt: string
}

export interface ScheduleTemplate {
  id: string
  code: string
  name: string
  description: string
  targetDurationWeeks: number
  activeVersion: number
  isActive: boolean
  latestVersion?: ScheduleTemplateVersion
}

export interface HolidayEntry {
  date: string
  label: string
}

export interface AcademicCalendarConfig {
  timezone: string
  projectStartDate: string
  workingDays: number[]
  holidays: HolidayEntry[]
}

export interface AssignedStudent {
  studentId: string
  fullName: string
  department?: string
  usnOrEmployeeId?: string
  isTeamLeader?: boolean
}

export interface ScheduledActivity {
  activityId: string
  sequenceNumber: number
  title: string
  description: string
  startDate: string
  deadline: string
  isMandatory: boolean
  requiredSubmissionDescription: string
  acceptedEvidenceFormats: EvidenceFormat[]
  weeklyUpdateRequired: boolean
  studentUpdateInstructions: string
  activityStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  facultyReviewStatus: 'NOT_REVIEWED' | 'PENDING' | 'APPROVED' | 'REVISION_REQUIRED'
}

export interface ProjectSchedule {
  id: string
  projectId: string
  projectTitle: string
  department: string
  academicYear: string
  templateId: string
  templateCode: string
  templateName: string
  templateVersion: number
  facultyGuideId: string
  facultyGuideName: string
  createdByFacultyId: string
  assignedStudentIds: string[]
  assignedStudents: AssignedStudent[]
  status: 'DRAFT' | 'PUBLISHED'
  version: number
  calendarConfig: AcademicCalendarConfig
  activities: ScheduledActivity[]
  initialPublishedSnapshot?: {
    version: number
    publishedAt: string
    calendarConfig: AcademicCalendarConfig
    activities: ScheduledActivity[]
  }
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ScheduleChangeHistoryEntry {
  id: string
  scheduleId: string
  versionNumber: number
  changeType: string
  changedByName: string
  changedByRole: string
  activityTitle?: string
  field: string
  previousValue: string
  newValue: string
  reason: string
  createdAt: string
}

export interface ScheduleDateWarning {
  activityId?: string
  sequenceNumber?: number
  activityTitle?: string
  field: 'startDate' | 'deadline'
  date: string
  reason: string
}

export interface InitializationOptions {
  projects: Array<{
    id: string
    title: string
    department: string
    academicYear: string
    facultyGuideName?: string
  }>
  students: Array<{
    studentId: string
    fullName: string
    department?: string
    usnOrEmployeeId?: string
  }>
  facultyGuides: Array<{
    facultyId: string
    fullName: string
    department?: string
    designation?: string
  }>
  templates: ScheduleTemplate[]
}

async function parseResponse<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, res.status, fallback))
  }
  return json.data as T
}

export const scheduleApiService = {
  async listTemplates(): Promise<ScheduleTemplate[]> {
    const res = await fetch(`${getBase()}/templates`, {
      headers: getApiHeaders({}, false),
    })
    return parseResponse(res, 'Failed to load schedule templates')
  },

  async createTemplate(payload: {
    code: string
    name: string
    description: string
    targetDurationWeeks: number
    changelog: string
    activities: TemplateActivityDefault[]
  }): Promise<{ template: ScheduleTemplate; version: ScheduleTemplateVersion }> {
    const res = await fetch(`${getBase()}/templates`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseResponse(res, 'Failed to create schedule template')
  },

  async addTemplateVersion(
    templateId: string,
    payload: { changelog: string; activities: TemplateActivityDefault[] }
  ): Promise<{ template: ScheduleTemplate; version: ScheduleTemplateVersion }> {
    const res = await fetch(`${getBase()}/templates/${templateId}/versions`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseResponse(res, 'Failed to add template version')
  },

  async getInitializationOptions(): Promise<InitializationOptions> {
    const res = await fetch(`${getBase()}/initialization-options`, {
      headers: getApiHeaders({}, false),
    })
    return parseResponse(res, 'Failed to load schedule initialization options')
  },

  async suggestDates(payload: {
    templateId: string
    templateVersion?: number
    calendarConfig: AcademicCalendarConfig
  }): Promise<{
    template: ScheduleTemplate
    version: ScheduleTemplateVersion
    activities: ScheduledActivity[]
    warnings: ScheduleDateWarning[]
  }> {
    const res = await fetch(`${getBase()}/suggest-dates`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseResponse(res, 'Failed to calculate suggested schedule dates')
  },

  async listMySchedules(): Promise<ProjectSchedule[]> {
    const res = await fetch(`${getBase()}/my`, {
      headers: getApiHeaders({}, false),
    })
    return parseResponse(res, 'Failed to load academic schedules')
  },

  async getScheduleById(scheduleId: string): Promise<ProjectSchedule> {
    const res = await fetch(`${getBase()}/${scheduleId}`, {
      headers: getApiHeaders({}, false),
    })
    return parseResponse(res, 'Failed to load schedule details')
  },

  async getScheduleHistory(scheduleId: string): Promise<ScheduleChangeHistoryEntry[]> {
    const res = await fetch(`${getBase()}/${scheduleId}/history`, {
      headers: getApiHeaders({}, false),
    })
    return parseResponse(res, 'Failed to load schedule revision history')
  },

  async initializeSchedule(payload: {
    projectId?: string
    newProject?: {
      title: string
      department: string
      academicYear: string
      problemStatement?: string
    }
    templateId: string
    templateVersion?: number
    facultyGuideId?: string
    assignedStudents: Array<{ studentId: string; isTeamLeader?: boolean }>
    calendarConfig: AcademicCalendarConfig
    activities?: ScheduledActivity[]
  }): Promise<{ schedule: ProjectSchedule; warnings: ScheduleDateWarning[] }> {
    const res = await fetch(getBase(), {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseResponse(res, 'Failed to initialize project schedule')
  },

  async updateDraftSchedule(
    scheduleId: string,
    payload: {
      calendarConfig?: AcademicCalendarConfig
      activities?: ScheduledActivity[]
      assignedStudents?: Array<{ studentId: string; isTeamLeader?: boolean }>
    }
  ): Promise<{ schedule: ProjectSchedule; warnings: ScheduleDateWarning[] }> {
    const res = await fetch(`${getBase()}/${scheduleId}`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseResponse(res, 'Failed to update draft schedule')
  },

  async publishSchedule(
    scheduleId: string
  ): Promise<{ schedule: ProjectSchedule; warnings: ScheduleDateWarning[] }> {
    const res = await fetch(`${getBase()}/${scheduleId}/publish`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({}),
    })
    return parseResponse(res, 'Failed to publish schedule')
  },

  async modifyPublishedSchedule(
    scheduleId: string,
    payload: {
      reason: string
      calendarConfig?: AcademicCalendarConfig
      activities: ScheduledActivity[]
    }
  ): Promise<{
    schedule: ProjectSchedule
    historyEntries: ScheduleChangeHistoryEntry[]
    warnings: ScheduleDateWarning[]
  }> {
    const res = await fetch(`${getBase()}/${scheduleId}/published`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify(payload),
    })
    return parseResponse(res, 'Failed to update published schedule')
  },
}
