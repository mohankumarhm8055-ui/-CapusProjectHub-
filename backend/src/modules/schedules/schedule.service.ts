import { UserRepository } from '../auth/user.model.js'
import type { AuthUser } from '../../middleware/auth.middleware.js'
import { ProjectRepository } from '../repository/project.model.js'
import { academicNotificationService } from '../notifications/notification.service.js'
import {
  buildSuggestedActivitiesFromTemplate,
  inspectScheduleCalendarDates,
} from './calendar.utils.js'
import {
  ProjectScheduleRepository,
  ScheduleChangeHistoryRepository,
  ScheduleTemplateRepository,
} from './schedule.model.js'
import type {
  IAcademicCalendarConfig,
  IAssignedStudent,
  IProjectSchedule,
  IScheduleChangeHistory,
  IScheduledActivity,
  IScheduleTemplate,
  IScheduleTemplateVersion,
  ITemplateActivityDefault,
  ScheduleDateWarning,
} from './schedule.types.js'

function httpError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

export class ScheduleService {
  async listTemplates(): Promise<Array<IScheduleTemplate & { latestVersion?: IScheduleTemplateVersion }>> {
    const templates = await ScheduleTemplateRepository.listTemplates()
    return Promise.all(
      templates.map(async (t) => {
        const latestVersion = await ScheduleTemplateRepository.getVersion(t.id, t.activeVersion)
        return { ...t, latestVersion: latestVersion || undefined }
      })
    )
  }

  async getTemplateVersions(templateId: string): Promise<{
    template: IScheduleTemplate
    versions: IScheduleTemplateVersion[]
  }> {
    const template = await ScheduleTemplateRepository.findById(templateId)
    if (!template) {
      throw httpError(404, 'TEMPLATE_NOT_FOUND', 'Academic schedule template was not found.')
    }
    const versions = await ScheduleTemplateRepository.listVersions(template.id)
    return { template, versions }
  }

  async createTemplate(
    actor: AuthUser,
    input: {
      code: string
      name: string
      description: string
      targetDurationWeeks: number
      changelog: string
      activities: ITemplateActivityDefault[]
    }
  ): Promise<{ template: IScheduleTemplate; version: IScheduleTemplateVersion }> {
    if (actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Only administrators can create reusable schedule templates.')
    }
    const existing = await ScheduleTemplateRepository.findByCode(input.code)
    if (existing) {
      throw httpError(409, 'TEMPLATE_CODE_EXISTS', `Template code '${input.code}' already exists.`)
    }
    const normalized = [...input.activities]
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((a, idx) => ({ ...a, sequenceNumber: idx + 1 }))
    return ScheduleTemplateRepository.createTemplateWithVersion({
      ...input,
      activities: normalized,
      createdBy: actor.id,
    })
  }

  async addTemplateVersion(
    actor: AuthUser,
    templateId: string,
    changelog: string,
    activities: ITemplateActivityDefault[]
  ): Promise<{ template: IScheduleTemplate; version: IScheduleTemplateVersion }> {
    if (actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Only administrators can publish new schedule template versions.')
    }
    const normalized = [...activities]
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((a, idx) => ({ ...a, sequenceNumber: idx + 1 }))
    return ScheduleTemplateRepository.createNewVersion(templateId, changelog, normalized, actor.id)
  }

  async getInitializationOptions(actor: AuthUser) {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Only faculty or administrators can initialize project schedules.')
    }
    const [allProjects, allUsers, templates] = await Promise.all([
      ProjectRepository.getAllAccessible('rvce-main'),
      UserRepository.listAll(),
      this.listTemplates(),
    ])

    const students = allUsers
      .filter((u) => u.role === 'student' && u.isActive)
      .map((u) => ({
        studentId: u.id,
        fullName: u.fullName,
        department: u.department,
        usnOrEmployeeId: u.usnOrEmployeeId,
      }))

    const facultyGuides = allUsers
      .filter((u) => (u.role === 'faculty' || u.role === 'admin') && u.isActive)
      .map((u) => ({
        facultyId: u.id,
        fullName: u.fullName,
        department: u.department,
        designation: u.semesterOrDesignation || 'Faculty Guide',
      }))

    return {
      projects: allProjects.map((p) => ({
        id: p.id,
        title: p.title,
        department: p.department,
        academicYear: p.academicYear,
        facultyGuideName: p.facultyGuide?.name,
        teamMembers: (p.teamMembers || []).map((m) => ({
          studentId: m.studentId,
          name: m.name,
          role: m.role,
          isLeader: m.isLeader,
        })),
      })),
      students,
      facultyGuides,
      templates,
    }
  }

  async suggestDates(
    actor: AuthUser,
    input: {
      templateId: string
      templateVersion?: number
      calendarConfig: IAcademicCalendarConfig
    }
  ): Promise<{
    template: IScheduleTemplate
    version: IScheduleTemplateVersion
    activities: IScheduledActivity[]
    warnings: ScheduleDateWarning[]
  }> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Only faculty or administrators can calculate schedule templates.')
    }
    const template = await ScheduleTemplateRepository.findById(input.templateId)
    if (!template) {
      throw httpError(404, 'TEMPLATE_NOT_FOUND', 'Academic schedule template was not found.')
    }
    const version = await ScheduleTemplateRepository.getVersion(
      template.id,
      input.templateVersion || template.activeVersion
    )
    if (!version) {
      throw httpError(404, 'TEMPLATE_VERSION_NOT_FOUND', 'Requested template version was not found.')
    }

    const calendarCheck = inspectScheduleCalendarDates([], input.calendarConfig)
    if (calendarCheck.errors.length > 0) {
      throw httpError(400, 'INVALID_CALENDAR_CONFIG', calendarCheck.errors.join(' '))
    }

    const activities = buildSuggestedActivitiesFromTemplate(input.calendarConfig, version.activities)
    const { warnings } = inspectScheduleCalendarDates(activities, input.calendarConfig)
    return { template, version, activities, warnings }
  }

  private async resolveAssignedStudents(
    studentEntries: Array<{ studentId: string; isTeamLeader?: boolean }>
  ): Promise<IAssignedStudent[]> {
    const resolved: IAssignedStudent[] = []
    const seen = new Set<string>()
    for (const item of studentEntries) {
      if (!item.studentId || seen.has(item.studentId)) continue
      seen.add(item.studentId)
      const user = await UserRepository.findById(item.studentId)
      if (!user || user.role !== 'student') {
        throw httpError(
          400,
          'INVALID_STUDENT_MEMBER',
          `Assigned team member '${item.studentId}' is not a valid active student account.`
        )
      }
      resolved.push({
        studentId: user.id,
        fullName: user.fullName,
        department: user.department,
        usnOrEmployeeId: user.usnOrEmployeeId,
        isTeamLeader: item.isTeamLeader === true,
      })
    }
    return resolved
  }

  async initializeSchedule(
    actor: AuthUser,
    input: {
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
      calendarConfig: IAcademicCalendarConfig
      activities?: IScheduledActivity[]
    }
  ): Promise<{ schedule: IProjectSchedule; warnings: ScheduleDateWarning[] }> {
    if (actor.role !== 'faculty' && actor.role !== 'admin') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Only authorized faculty or administrators can initialize official project schedules.'
      )
    }

    const template = await ScheduleTemplateRepository.findById(input.templateId)
    if (!template) {
      throw httpError(404, 'TEMPLATE_NOT_FOUND', 'Academic schedule template was not found.')
    }
    const verDoc = await ScheduleTemplateRepository.getVersion(
      template.id,
      input.templateVersion || template.activeVersion
    )
    if (!verDoc) {
      throw httpError(404, 'TEMPLATE_VERSION_NOT_FOUND', 'Requested template version was not found.')
    }

    const assignedStudents = await this.resolveAssignedStudents(input.assignedStudents)
    if (assignedStudents.length === 0) {
      throw httpError(400, 'TEAM_REQUIRED', 'Assign at least one authorized student to the project team.')
    }

    let guideUser = actor
    if (input.facultyGuideId && input.facultyGuideId !== actor.id) {
      if (actor.role !== 'admin') {
        // Faculty may only assign themselves unless admin delegates another faculty guide
        throw httpError(
          403,
          'FORBIDDEN_GUIDE_DELEGATION',
          'Faculty members can initialize schedules for their own guided projects.'
        )
      }
      const targetGuide = await UserRepository.findById(input.facultyGuideId)
      if (!targetGuide || (targetGuide.role !== 'faculty' && targetGuide.role !== 'admin')) {
        throw httpError(400, 'INVALID_FACULTY_GUIDE', 'Selected faculty guide account is invalid.')
      }
      guideUser = {
        id: targetGuide.id,
        role: targetGuide.role,
        fullName: targetGuide.fullName,
        email: targetGuide.email,
      }
    }

    let projectId = input.projectId
    let projectTitle = ''
    let department = ''
    let academicYear = ''

    if (projectId) {
      const existingProject = await ProjectRepository.findById(projectId)
      if (!existingProject) {
        throw httpError(404, 'PROJECT_NOT_FOUND', 'Selected academic project record was not found.')
      }
      projectTitle = existingProject.title
      department = existingProject.department
      academicYear = existingProject.academicYear
    } else if (input.newProject?.title) {
      const createdProj = await ProjectRepository.create({
        title: input.newProject.title.trim(),
        slug: `sched-${input.newProject.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        abstract:
          input.newProject.problemStatement?.trim() ||
          `Initialized academic project "${input.newProject.title.trim()}" under faculty supervision.`,
        problemStatement:
          input.newProject.problemStatement?.trim() ||
          `Structured academic mini-project execution for ${input.newProject.title.trim()}.`,
        objectives: ['Complete structured faculty-scheduled mini-project milestones on timeline.'],
        features: [],
        modules: [],
        technologyStack: [],
        academicYear: input.newProject.academicYear.trim(),
        department: input.newProject.department.trim(),
        collegeId: 'rvce-main',
        teamMembers: assignedStudents.map((s) => ({
          studentId: s.studentId,
          name: s.fullName,
          department: s.department,
          isLeader: s.isTeamLeader,
        })),
        facultyGuide: {
          name: guideUser.fullName || 'Faculty Guide',
          department: input.newProject.department.trim(),
        },
        screenshots: [],
        reportDocuments: [],
        sourceType: 'STUDENT_SUBMISSION',
        reviewStatus: 'DRAFT',
        verificationStatus: 'PENDING_VERIFICATION',
        uploadedBy: actor.id,
      })
      projectId = createdProj.id
      projectTitle = createdProj.title
      department = createdProj.department
      academicYear = createdProj.academicYear
    } else {
      throw httpError(
        400,
        'PROJECT_REQUIRED',
        'Select an existing academic project or provide details to initialize one.'
      )
    }

    const calendarConfig: IAcademicCalendarConfig = {
      timezone: input.calendarConfig.timezone || 'UTC_DATE_ONLY',
      projectStartDate: input.calendarConfig.projectStartDate,
      workingDays: [...input.calendarConfig.workingDays].sort(),
      holidays: input.calendarConfig.holidays || [],
    }

    const calendarOnlyCheck = inspectScheduleCalendarDates([], calendarConfig)
    if (calendarOnlyCheck.errors.length > 0) {
      throw httpError(400, 'INVALID_CALENDAR_CONFIG', calendarOnlyCheck.errors.join(' '))
    }

    const activities =
      input.activities && input.activities.length > 0
        ? input.activities.map((a, idx) => ({
            ...a,
            activityId: a.activityId || `act-${a.sequenceNumber || idx + 1}-${idx + 1}`,
            sequenceNumber: a.sequenceNumber || idx + 1,
            activityStatus: 'NOT_STARTED' as const,
            facultyReviewStatus: 'NOT_REVIEWED' as const,
          }))
        : buildSuggestedActivitiesFromTemplate(calendarConfig, verDoc.activities)

    const { errors, warnings } = inspectScheduleCalendarDates(activities, calendarConfig)
    if (errors.length > 0) {
      throw httpError(400, 'INVALID_SCHEDULE_DATES', errors.join(' '))
    }

    const schedule = await ProjectScheduleRepository.create({
      projectId: projectId!,
      projectTitle,
      department,
      academicYear,
      templateId: template.id,
      templateCode: template.code,
      templateName: template.name,
      templateVersion: verDoc.version,
      facultyGuideId: guideUser.id,
      facultyGuideName: guideUser.fullName || 'Faculty Guide',
      createdByFacultyId: actor.id,
      assignedStudentIds: assignedStudents.map((s) => s.studentId),
      assignedStudents,
      status: 'DRAFT',
      version: 1,
      calendarConfig,
      activities,
    })

    return { schedule, warnings }
  }

  private assertFacultyManagePermission(schedule: IProjectSchedule, actor: AuthUser): void {
    if (actor.role === 'admin') return
    if (actor.role !== 'faculty') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Students and team leaders cannot modify the official academic project schedule.'
      )
    }
    if (schedule.facultyGuideId !== actor.id && schedule.createdByFacultyId !== actor.id) {
      throw httpError(
        403,
        'FORBIDDEN_SCHEDULE_OWNER',
        'You can only manage schedules for projects where you are the assigned faculty guide or creator.'
      )
    }
  }

  async updateDraftSchedule(
    actor: AuthUser,
    scheduleId: string,
    updates: {
      calendarConfig?: IAcademicCalendarConfig
      activities?: IScheduledActivity[]
      assignedStudents?: Array<{ studentId: string; isTeamLeader?: boolean }>
    }
  ): Promise<{ schedule: IProjectSchedule; warnings: ScheduleDateWarning[] }> {
    const existing = await ProjectScheduleRepository.findById(scheduleId)
    if (!existing) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Academic project schedule not found.')
    }
    this.assertFacultyManagePermission(existing, actor)

    if (existing.status === 'PUBLISHED') {
      throw httpError(
        409,
        'SCHEDULE_ALREADY_PUBLISHED',
        'Published schedules cannot be edited silently. Use the versioned published-update endpoint with a change reason.'
      )
    }

    const nextCalendar = updates.calendarConfig
      ? {
          ...updates.calendarConfig,
          workingDays: [...updates.calendarConfig.workingDays].sort(),
        }
      : existing.calendarConfig

    const nextActivities = updates.activities
      ? updates.activities.map((a, idx) => ({
          ...a,
          activityId: a.activityId || `act-${a.sequenceNumber || idx + 1}-${idx + 1}`,
          sequenceNumber: a.sequenceNumber || idx + 1,
          activityStatus: existing.activities.find((e) => e.activityId === a.activityId)?.activityStatus || 'NOT_STARTED',
          facultyReviewStatus:
            existing.activities.find((e) => e.activityId === a.activityId)?.facultyReviewStatus || 'NOT_REVIEWED',
        }))
      : existing.activities

    const { errors, warnings } = inspectScheduleCalendarDates(nextActivities, nextCalendar)
    if (errors.length > 0) {
      throw httpError(400, 'INVALID_SCHEDULE_DATES', errors.join(' '))
    }

    let assignedStudents = existing.assignedStudents
    let assignedStudentIds = existing.assignedStudentIds
    if (updates.assignedStudents) {
      assignedStudents = await this.resolveAssignedStudents(updates.assignedStudents)
      if (assignedStudents.length === 0) {
        throw httpError(400, 'TEAM_REQUIRED', 'Assign at least one authorized student to the project team.')
      }
      assignedStudentIds = assignedStudents.map((s) => s.studentId)
    }

    const updated = await ProjectScheduleRepository.update(existing.id, {
      calendarConfig: nextCalendar,
      activities: nextActivities,
      assignedStudents,
      assignedStudentIds,
    })

    return { schedule: updated!, warnings }
  }

  async publishSchedule(
    actor: AuthUser,
    scheduleId: string
  ): Promise<{ schedule: IProjectSchedule; warnings: ScheduleDateWarning[] }> {
    const existing = await ProjectScheduleRepository.findById(scheduleId)
    if (!existing) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Academic project schedule not found.')
    }
    this.assertFacultyManagePermission(existing, actor)

    if (existing.status === 'PUBLISHED') {
      throw httpError(409, 'ALREADY_PUBLISHED', 'Schedule is already published.')
    }

    const { errors, warnings } = inspectScheduleCalendarDates(existing.activities, existing.calendarConfig)
    if (errors.length > 0) {
      throw httpError(400, 'INVALID_SCHEDULE_DATES', errors.join(' '))
    }
    if (existing.assignedStudentIds.length === 0) {
      throw httpError(400, 'TEAM_REQUIRED', 'Assign authorized student team members before publishing.')
    }

    const publishedAt = new Date()
    const snapshot = {
      version: 1,
      publishedAt,
      publishedBy: actor.id,
      calendarConfig: JSON.parse(JSON.stringify(existing.calendarConfig)),
      activities: JSON.parse(JSON.stringify(existing.activities)),
    }

    const published = await ProjectScheduleRepository.update(existing.id, {
      status: 'PUBLISHED',
      version: 1,
      publishedAt,
      publishedBy: actor.id,
      initialPublishedSnapshot: snapshot,
    })

    await ScheduleChangeHistoryRepository.createMany([
      {
        scheduleId: existing.id,
        projectId: existing.projectId,
        versionNumber: 1,
        changeType: 'INITIAL_PUBLISHED',
        changedById: actor.id,
        changedByName: actor.fullName || 'Faculty Guide',
        changedByRole: actor.role,
        field: 'status',
        previousValue: 'DRAFT',
        newValue: 'PUBLISHED',
        reason: `Published official schedule from "${existing.templateName}" (v${existing.templateVersion}).`,
        notifiedStudentIds: existing.assignedStudentIds,
      },
    ])

    await Promise.all(
      existing.assignedStudentIds.map((studentId) =>
        academicNotificationService.dispatchAcademicNotification({
          recipientId: studentId,
          type: 'SCHEDULE_PUBLISHED',
          category: 'SCHEDULE',
          title: `Academic Schedule Published: ${existing.projectTitle}`,
          message: `${actor.fullName || 'Your faculty guide'} published the official ${existing.templateName} schedule starting ${existing.calendarConfig.projectStartDate}.`,
          actionUrl: `/activity-tracker/${existing.id}`,
          scheduleId: existing.id,
          projectId: existing.projectId,
          projectTitle: existing.projectTitle,
          deadlineVersion: 1,
          sendOptionalEmail: true,
          data: {
            projectId: existing.projectId,
            projectTitle: existing.projectTitle,
            scheduleId: existing.id,
            senderId: actor.id,
            senderName: actor.fullName || 'Faculty Guide',
          },
        })
      )
    )

    return { schedule: published!, warnings }
  }

  /**
   * Controlled modification of a PUBLISHED schedule:
   * - Preserves initialPublishedSnapshot untouched
   * - Increments version
   * - Writes immutable previousValue -> newValue entries in ScheduleChangeHistory
   * - Notifies assigned students
   */
  async modifyPublishedSchedule(
    actor: AuthUser,
    scheduleId: string,
    input: {
      reason: string
      calendarConfig?: IAcademicCalendarConfig
      activities: IScheduledActivity[]
    }
  ): Promise<{ schedule: IProjectSchedule; historyEntries: IScheduleChangeHistory[]; warnings: ScheduleDateWarning[] }> {
    const existing = await ProjectScheduleRepository.findById(scheduleId)
    if (!existing) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Academic project schedule not found.')
    }
    this.assertFacultyManagePermission(existing, actor)

    if (existing.status !== 'PUBLISHED') {
      throw httpError(400, 'NOT_PUBLISHED', 'Use draft update before publishing.')
    }

    const nextCalendar = input.calendarConfig || existing.calendarConfig
    const nextActivities = input.activities.map((a, idx) => ({
      ...a,
      activityId: a.activityId || `act-${a.sequenceNumber || idx + 1}-${idx + 1}`,
      sequenceNumber: a.sequenceNumber || idx + 1,
    }))

    const { errors, warnings } = inspectScheduleCalendarDates(nextActivities, nextCalendar)
    if (errors.length > 0) {
      throw httpError(400, 'INVALID_SCHEDULE_DATES', errors.join(' '))
    }

    const nextVersion = existing.version + 1
    const diffs: Array<Parameters<typeof ScheduleChangeHistoryRepository.createMany>[0][number]> = []

    for (const nextAct of nextActivities) {
      const prevAct = existing.activities.find((a) => a.activityId === nextAct.activityId)
      if (!prevAct) {
        diffs.push({
          scheduleId: existing.id,
          projectId: existing.projectId,
          versionNumber: nextVersion,
          changeType: 'ACTIVITY_UPDATED',
          changedById: actor.id,
          changedByName: actor.fullName || 'Faculty Guide',
          changedByRole: actor.role,
          activityId: nextAct.activityId,
          activityTitle: nextAct.title,
          field: 'activity',
          previousValue: 'Not present',
          newValue: `${nextAct.title} (${nextAct.startDate} to ${nextAct.deadline})`,
          reason: input.reason,
          notifiedStudentIds: existing.assignedStudentIds,
        })
        continue
      }

      if (prevAct.deadline !== nextAct.deadline) {
        diffs.push({
          scheduleId: existing.id,
          projectId: existing.projectId,
          versionNumber: nextVersion,
          changeType: 'DEADLINE_UPDATED',
          changedById: actor.id,
          changedByName: actor.fullName || 'Faculty Guide',
          changedByRole: actor.role,
          activityId: nextAct.activityId,
          activityTitle: nextAct.title,
          field: 'deadline',
          previousValue: prevAct.deadline,
          newValue: nextAct.deadline,
          reason: input.reason,
          notifiedStudentIds: existing.assignedStudentIds,
        })
      }

      if (prevAct.startDate !== nextAct.startDate) {
        diffs.push({
          scheduleId: existing.id,
          projectId: existing.projectId,
          versionNumber: nextVersion,
          changeType: 'ACTIVITY_UPDATED',
          changedById: actor.id,
          changedByName: actor.fullName || 'Faculty Guide',
          changedByRole: actor.role,
          activityId: nextAct.activityId,
          activityTitle: nextAct.title,
          field: 'startDate',
          previousValue: prevAct.startDate,
          newValue: nextAct.startDate,
          reason: input.reason,
          notifiedStudentIds: existing.assignedStudentIds,
        })
      }

      if (prevAct.description !== nextAct.description || prevAct.requiredSubmissionDescription !== nextAct.requiredSubmissionDescription) {
        diffs.push({
          scheduleId: existing.id,
          projectId: existing.projectId,
          versionNumber: nextVersion,
          changeType: 'ACTIVITY_UPDATED',
          changedById: actor.id,
          changedByName: actor.fullName || 'Faculty Guide',
          changedByRole: actor.role,
          activityId: nextAct.activityId,
          activityTitle: nextAct.title,
          field: 'requirements',
          previousValue: prevAct.requiredSubmissionDescription,
          newValue: nextAct.requiredSubmissionDescription,
          reason: input.reason,
          notifiedStudentIds: existing.assignedStudentIds,
        })
      }
    }

    if (diffs.length === 0) {
      throw httpError(400, 'NO_CHANGES_DETECTED', 'No changes were detected compared to the published schedule.')
    }

    const updated = await ProjectScheduleRepository.update(existing.id, {
      version: nextVersion,
      calendarConfig: nextCalendar,
      activities: nextActivities,
    })

    const historyEntries = await ScheduleChangeHistoryRepository.createMany(diffs)

    const summaryText = diffs
      .slice(0, 2)
      .map((d) => `${d.activityTitle || d.field}: ${d.previousValue} -> ${d.newValue}`)
      .join('; ')

    const hasDeadlineChange = diffs.some(
      (d) => d.changeType === 'DEADLINE_UPDATED' || d.field === 'deadline'
    )
    const notifType = hasDeadlineChange
      ? 'SCHEDULE_DEADLINE_UPDATED'
      : 'SCHEDULE_REQUIREMENTS_UPDATED'

    await Promise.all(
      existing.assignedStudentIds.map((studentId) =>
        academicNotificationService.dispatchAcademicNotification({
          recipientId: studentId,
          type: notifType,
          category: 'SCHEDULE',
          title: `Schedule Updated (v${nextVersion}): ${existing.projectTitle}`,
          message: `${actor.fullName || 'Faculty guide'} updated the schedule (${summaryText}). Reason: ${input.reason}`,
          actionUrl: `/activity-tracker/${existing.id}`,
          scheduleId: existing.id,
          projectId: existing.projectId,
          projectTitle: existing.projectTitle,
          deadlineVersion: nextVersion,
          sendOptionalEmail: hasDeadlineChange,
          data: {
            projectId: existing.projectId,
            projectTitle: existing.projectTitle,
            scheduleId: existing.id,
            senderId: actor.id,
            senderName: actor.fullName || 'Faculty Guide',
          },
        })
      )
    )

    return { schedule: updated!, historyEntries, warnings }
  }

  async listSchedulesForUser(actor: AuthUser): Promise<IProjectSchedule[]> {
    if (actor.role === 'admin') {
      return ProjectScheduleRepository.listAll()
    }
    if (actor.role === 'faculty') {
      return ProjectScheduleRepository.listByFaculty(actor.id)
    }
    return ProjectScheduleRepository.listPublishedForStudent(actor.id)
  }

  async getScheduleById(actor: AuthUser, scheduleId: string): Promise<IProjectSchedule> {
    const schedule = await ProjectScheduleRepository.findById(scheduleId)
    if (!schedule) {
      throw httpError(404, 'SCHEDULE_NOT_FOUND', 'Academic project schedule not found.')
    }
    if (actor.role === 'admin') return schedule
    if (actor.role === 'faculty') {
      if (schedule.facultyGuideId !== actor.id && schedule.createdByFacultyId !== actor.id) {
        throw httpError(403, 'FORBIDDEN', 'You do not have access to this faculty schedule.')
      }
      return schedule
    }
    // Student access: ONLY published schedules assigned to this student
    if (schedule.status !== 'PUBLISHED' || !schedule.assignedStudentIds.includes(actor.id)) {
      throw httpError(403, 'FORBIDDEN', 'You do not have permission to view this project schedule.')
    }
    return schedule
  }

  async getScheduleHistory(actor: AuthUser, scheduleId: string): Promise<IScheduleChangeHistory[]> {
    await this.getScheduleById(actor, scheduleId)
    return ScheduleChangeHistoryRepository.listBySchedule(scheduleId)
  }
}

export const scheduleService = new ScheduleService()
