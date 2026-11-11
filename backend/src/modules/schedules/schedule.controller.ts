import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { scheduleService } from './schedule.service.js'

const EvidenceFormatSchema = z.enum([
  'PDF_DOCUMENT',
  'REPOSITORY_LINK',
  'DESIGN_FILE',
  'DEMO_VIDEO',
  'TEST_REPORT',
  'PRESENTATION_SLIDES',
  'SUMMARY_NOTE',
])

const TemplateActivitySchema = z.object({
  sequenceNumber: z.number().int().min(1),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(4).max(600),
  suggestedDurationDays: z.number().int().min(1).max(120),
  isMandatory: z.boolean().default(true),
  requiredDeliverables: z.string().trim().min(3).max(500),
  evidenceTypes: z.array(EvidenceFormatSchema).min(1),
  weeklyUpdateRequired: z.boolean().default(true),
  studentUpdateInstructions: z.string().trim().min(3).max(500),
  submissionMode: z.enum(['TEAM_SHARED', 'INDIVIDUAL']).optional().default('TEAM_SHARED'),
})

const CalendarConfigSchema = z.object({
  timezone: z.string().trim().default('UTC_DATE_ONLY'),
  projectStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1),
  holidays: z
    .array(
      z.object({
        date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
        label: z.string().trim().min(1).max(100),
      })
    )
    .default([]),
})

const ScheduledActivitySchema = z.object({
  activityId: z.string().trim().min(1),
  sequenceNumber: z.number().int().min(1),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(4).max(600),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  deadline: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  isMandatory: z.boolean().default(true),
  requiredSubmissionDescription: z.string().trim().min(3).max(500),
  acceptedEvidenceFormats: z.array(EvidenceFormatSchema).min(1),
  weeklyUpdateRequired: z.boolean().default(true),
  studentUpdateInstructions: z.string().trim().min(3).max(500),
  submissionMode: z.enum(['TEAM_SHARED', 'INDIVIDUAL']).optional().default('TEAM_SHARED'),
  activityStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
  facultyReviewStatus: z
    .enum(['NOT_REVIEWED', 'PENDING', 'APPROVED', 'REVISION_REQUIRED'])
    .default('NOT_REVIEWED'),
})

const createTemplateSchema = z.object({
  code: z.string().trim().min(3).max(60),
  name: z.string().trim().min(3).max(150),
  description: z.string().trim().min(5).max(600),
  targetDurationWeeks: z.number().int().min(1).max(52),
  changelog: z.string().trim().min(3).max(300),
  activities: z.array(TemplateActivitySchema).min(1),
})

const addTemplateVersionSchema = z.object({
  changelog: z.string().trim().min(3).max(300),
  activities: z.array(TemplateActivitySchema).min(1),
})

const suggestDatesSchema = z.object({
  templateId: z.string().trim().min(1),
  templateVersion: z.number().int().min(1).optional(),
  calendarConfig: CalendarConfigSchema,
})

const initializeScheduleSchema = z.object({
  projectId: z.string().trim().optional(),
  newProject: z
    .object({
      title: z.string().trim().min(3).max(180),
      department: z.string().trim().min(2).max(120),
      academicYear: z.string().trim().min(4).max(30),
      problemStatement: z.string().trim().max(1000).optional(),
    })
    .optional(),
  templateId: z.string().trim().min(1),
  templateVersion: z.number().int().min(1).optional(),
  facultyGuideId: z.string().trim().optional(),
  assignedStudents: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        isTeamLeader: z.boolean().optional(),
      })
    )
    .min(1),
  calendarConfig: CalendarConfigSchema,
  activities: z.array(ScheduledActivitySchema).optional(),
})

const updateDraftSchema = z.object({
  calendarConfig: CalendarConfigSchema.optional(),
  activities: z.array(ScheduledActivitySchema).optional(),
  assignedStudents: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        isTeamLeader: z.boolean().optional(),
      })
    )
    .min(1)
    .optional(),
})

const modifyPublishedSchema = z.object({
  reason: z.string().trim().min(5, 'Provide a brief reason for modifying a published schedule').max(400),
  calendarConfig: CalendarConfigSchema.optional(),
  activities: z.array(ScheduledActivitySchema).min(1),
})

export const ScheduleController = {
  async listTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await scheduleService.listTemplates()
      res.json({ success: true, data: templates })
    } catch (err) {
      next(err)
    }
  },

  async getTemplateVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.getTemplateVersions(String(req.params.templateId))
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTemplateSchema.parse(req.body)
      const created = await scheduleService.createTemplate(req.user!, parsed)
      res.status(201).json({ success: true, data: created })
    } catch (err) {
      next(err)
    }
  },

  async addTemplateVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = addTemplateVersionSchema.parse(req.body)
      const created = await scheduleService.addTemplateVersion(
        req.user!,
        String(req.params.templateId),
        parsed.changelog,
        parsed.activities
      )
      res.status(201).json({ success: true, data: created })
    } catch (err) {
      next(err)
    }
  },

  async getInitializationOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scheduleService.getInitializationOptions(req.user!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async suggestDates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = suggestDatesSchema.parse(req.body)
      const data = await scheduleService.suggestDates(req.user!, parsed)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async initializeSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = initializeScheduleSchema.parse(req.body)
      const result = await scheduleService.initializeSchedule(req.user!, parsed)
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async updateDraftSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateDraftSchema.parse(req.body)
      const result = await scheduleService.updateDraftSchedule(
        req.user!,
        String(req.params.scheduleId),
        parsed
      )
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async publishSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.publishSchedule(req.user!, String(req.params.scheduleId))
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async modifyPublishedSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = modifyPublishedSchema.parse(req.body)
      const result = await scheduleService.modifyPublishedSchedule(
        req.user!,
        String(req.params.scheduleId),
        parsed
      )
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async listMySchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scheduleService.listSchedulesForUser(req.user!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getScheduleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scheduleService.getScheduleById(req.user!, String(req.params.scheduleId))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  async getScheduleHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scheduleService.getScheduleHistory(req.user!, String(req.params.scheduleId))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
}
