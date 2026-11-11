import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import type {
  IAcademicCalendarConfig,
  IAssignedStudent,
  IProjectSchedule,
  IPublishedBaselineSnapshot,
  IScheduleChangeHistory,
  IScheduleTemplate,
  IScheduleTemplateVersion,
  IScheduledActivity,
  ITemplateActivityDefault,
} from './schedule.types.js'

// ==========================================
// 1. Sub-schemas
// ==========================================

const TemplateActivityDefaultSchema = new Schema<ITemplateActivityDefault>(
  {
    sequenceNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    suggestedDurationDays: { type: Number, required: true, min: 1, max: 120 },
    isMandatory: { type: Boolean, default: true },
    requiredDeliverables: { type: String, required: true, trim: true },
    evidenceTypes: [{ type: String, required: true }],
    weeklyUpdateRequired: { type: Boolean, default: true },
    studentUpdateInstructions: { type: String, required: true, trim: true },
    submissionMode: {
      type: String,
      enum: ['TEAM_SHARED', 'INDIVIDUAL'],
      default: 'TEAM_SHARED',
    },
  },
  { _id: false }
)

const ScheduledActivitySchema = new Schema<IScheduledActivity>(
  {
    activityId: { type: String, required: true },
    sequenceNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    startDate: { type: String, required: true },
    deadline: { type: String, required: true },
    isMandatory: { type: Boolean, default: true },
    requiredSubmissionDescription: { type: String, required: true, trim: true },
    acceptedEvidenceFormats: [{ type: String, required: true }],
    weeklyUpdateRequired: { type: Boolean, default: true },
    studentUpdateInstructions: { type: String, required: true, trim: true },
    submissionMode: {
      type: String,
      enum: ['TEAM_SHARED', 'INDIVIDUAL'],
      default: 'TEAM_SHARED',
    },
    activityStatus: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED',
    },
    facultyReviewStatus: {
      type: String,
      enum: ['NOT_REVIEWED', 'PENDING', 'APPROVED', 'REVISION_REQUIRED', 'REJECTED'],
      default: 'NOT_REVIEWED',
    },
  },
  { _id: false }
)

const CalendarConfigSchema = new Schema<IAcademicCalendarConfig>(
  {
    timezone: { type: String, default: 'UTC_DATE_ONLY' },
    projectStartDate: { type: String, required: true },
    workingDays: [{ type: Number, min: 0, max: 6 }],
    holidays: [
      {
        date: { type: String, required: true },
        label: { type: String, required: true, trim: true },
        _id: false,
      },
    ],
  },
  { _id: false }
)

const AssignedStudentSchema = new Schema<IAssignedStudent>(
  {
    studentId: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    usnOrEmployeeId: { type: String, trim: true },
    isTeamLeader: { type: Boolean, default: false },
  },
  { _id: false }
)

// ==========================================
// 2. Mongoose Documents & Models
// ==========================================

export interface ScheduleTemplateDocument extends Document, Omit<IScheduleTemplate, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ScheduleTemplateSchema = new Schema<ScheduleTemplateDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    targetDurationWeeks: { type: Number, required: true, min: 1, max: 52 },
    activeVersion: { type: Number, required: true, min: 1, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

export const MongoScheduleTemplateModel =
  mongoose.models.ScheduleTemplate ||
  mongoose.model<ScheduleTemplateDocument>('ScheduleTemplate', ScheduleTemplateSchema)

export interface ScheduleTemplateVersionDocument
  extends Document,
    Omit<IScheduleTemplateVersion, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ScheduleTemplateVersionSchema = new Schema<ScheduleTemplateVersionDocument>(
  {
    templateId: { type: String, required: true, index: true },
    templateCode: { type: String, required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    changelog: { type: String, required: true, trim: true },
    activities: { type: [TemplateActivityDefaultSchema], required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

ScheduleTemplateVersionSchema.index({ templateId: 1, version: 1 }, { unique: true })

export const MongoScheduleTemplateVersionModel =
  mongoose.models.ScheduleTemplateVersion ||
  mongoose.model<ScheduleTemplateVersionDocument>(
    'ScheduleTemplateVersion',
    ScheduleTemplateVersionSchema
  )

export interface ProjectScheduleDocument extends Document, Omit<IProjectSchedule, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ProjectScheduleSchema = new Schema<ProjectScheduleDocument>(
  {
    projectId: { type: String, required: true, index: true },
    projectTitle: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    templateId: { type: String, required: true },
    templateCode: { type: String, required: true },
    templateName: { type: String, required: true },
    templateVersion: { type: Number, required: true, min: 1 },
    facultyGuideId: { type: String, required: true, index: true },
    facultyGuideName: { type: String, required: true, trim: true },
    createdByFacultyId: { type: String, required: true, index: true },
    assignedStudentIds: { type: [String], default: [], index: true },
    assignedStudents: { type: [AssignedStudentSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
      index: true,
    },
    version: { type: Number, required: true, min: 1, default: 1 },
    calendarConfig: { type: CalendarConfigSchema, required: true },
    activities: { type: [ScheduledActivitySchema], required: true },
    initialPublishedSnapshot: { type: Schema.Types.Mixed },
    publishedAt: { type: Date },
    publishedBy: { type: String },
  },
  { timestamps: true }
)

ProjectScheduleSchema.index({ assignedStudentIds: 1, status: 1 })
ProjectScheduleSchema.index({ facultyGuideId: 1, status: 1, updatedAt: -1 })

export const MongoProjectScheduleModel =
  mongoose.models.ProjectSchedule ||
  mongoose.model<ProjectScheduleDocument>('ProjectSchedule', ProjectScheduleSchema)

export interface ScheduleChangeHistoryDocument
  extends Document,
    Omit<IScheduleChangeHistory, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ScheduleChangeHistorySchema = new Schema<ScheduleChangeHistoryDocument>(
  {
    scheduleId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    versionNumber: { type: Number, required: true },
    changeType: {
      type: String,
      enum: [
        'INITIAL_PUBLISHED',
        'DEADLINE_UPDATED',
        'ACTIVITY_UPDATED',
        'CALENDAR_UPDATED',
        'TEAM_UPDATED',
      ],
      required: true,
    },
    changedById: { type: String, required: true },
    changedByName: { type: String, required: true },
    changedByRole: { type: String, required: true },
    activityId: { type: String },
    activityTitle: { type: String },
    field: { type: String, required: true },
    previousValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    reason: { type: String, required: true },
    notifiedStudentIds: { type: [String], default: [] },
  },
  { timestamps: true }
)

ScheduleChangeHistorySchema.index({ scheduleId: 1, versionNumber: -1, createdAt: -1 })

export const MongoScheduleChangeHistoryModel =
  mongoose.models.ScheduleChangeHistory ||
  mongoose.model<ScheduleChangeHistoryDocument>(
    'ScheduleChangeHistory',
    ScheduleChangeHistorySchema
  )

// ==========================================
// 3. Mappers
// ==========================================

function mapTemplate(doc: ScheduleTemplateDocument): IScheduleTemplate {
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    description: doc.description,
    targetDurationWeeks: doc.targetDurationWeeks,
    activeVersion: doc.activeVersion,
    isActive: doc.isActive,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function mapTemplateVersion(doc: ScheduleTemplateVersionDocument): IScheduleTemplateVersion {
  return {
    id: doc._id.toString(),
    templateId: doc.templateId,
    templateCode: doc.templateCode,
    version: doc.version,
    changelog: doc.changelog,
    activities: doc.activities,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
  }
}

function mapSchedule(doc: ProjectScheduleDocument): IProjectSchedule {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId,
    projectTitle: doc.projectTitle,
    department: doc.department,
    academicYear: doc.academicYear,
    templateId: doc.templateId,
    templateCode: doc.templateCode,
    templateName: doc.templateName,
    templateVersion: doc.templateVersion,
    facultyGuideId: doc.facultyGuideId,
    facultyGuideName: doc.facultyGuideName,
    createdByFacultyId: doc.createdByFacultyId,
    assignedStudentIds: doc.assignedStudentIds || [],
    assignedStudents: doc.assignedStudents || [],
    status: doc.status,
    version: doc.version,
    calendarConfig: doc.calendarConfig,
    activities: doc.activities || [],
    initialPublishedSnapshot: doc.initialPublishedSnapshot as IPublishedBaselineSnapshot | undefined,
    publishedAt: doc.publishedAt,
    publishedBy: doc.publishedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function mapHistory(doc: ScheduleChangeHistoryDocument): IScheduleChangeHistory {
  return {
    id: doc._id.toString(),
    scheduleId: doc.scheduleId,
    projectId: doc.projectId,
    versionNumber: doc.versionNumber,
    changeType: doc.changeType,
    changedById: doc.changedById,
    changedByName: doc.changedByName,
    changedByRole: doc.changedByRole,
    activityId: doc.activityId,
    activityTitle: doc.activityTitle,
    field: doc.field,
    previousValue: doc.previousValue,
    newValue: doc.newValue,
    reason: doc.reason,
    notifiedStudentIds: doc.notifiedStudentIds || [],
    createdAt: doc.createdAt,
  }
}

// ==========================================
// 4. Explicit Test/Dev In-Memory Fallback Stores
// ==========================================

export const inMemoryScheduleTemplateStore: IScheduleTemplate[] = []
export const inMemoryTemplateVersionStore: IScheduleTemplateVersion[] = []
export const inMemoryProjectScheduleStore: IProjectSchedule[] = []
export const inMemoryScheduleHistoryStore: IScheduleChangeHistory[] = []

// ==========================================
// 5. Repositories
// ==========================================

export const ScheduleTemplateRepository = {
  async listTemplates(): Promise<IScheduleTemplate[]> {
    if (isMongoConnected()) {
      const docs = await MongoScheduleTemplateModel.find({ isActive: true }).sort({ createdAt: 1 })
      return docs.map(mapTemplate)
    }
    assertPersistenceAvailable('schedule templates')
    return inMemoryScheduleTemplateStore.filter((t) => t.isActive)
  },

  async findByCode(code: string): Promise<IScheduleTemplate | null> {
    const clean = code.trim().toUpperCase()
    if (isMongoConnected()) {
      const doc = await MongoScheduleTemplateModel.findOne({ code: clean })
      return doc ? mapTemplate(doc) : null
    }
    assertPersistenceAvailable('schedule templates')
    return inMemoryScheduleTemplateStore.find((t) => t.code === clean) || null
  },

  async findById(id: string): Promise<IScheduleTemplate | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoScheduleTemplateModel.findById(id)
      return doc ? mapTemplate(doc) : null
    }
    assertPersistenceAvailable('schedule templates')
    return inMemoryScheduleTemplateStore.find((t) => t.id === id) || null
  },

  async createTemplateWithVersion(input: {
    code: string
    name: string
    description: string
    targetDurationWeeks: number
    changelog: string
    activities: ITemplateActivityDefault[]
    createdBy: string
  }): Promise<{ template: IScheduleTemplate; version: IScheduleTemplateVersion }> {
    const cleanCode = input.code.trim().toUpperCase()
    if (isMongoConnected()) {
      const tplDoc = await MongoScheduleTemplateModel.create({
        code: cleanCode,
        name: input.name,
        description: input.description,
        targetDurationWeeks: input.targetDurationWeeks,
        activeVersion: 1,
        isActive: true,
        createdBy: input.createdBy,
      })
      const verDoc = await MongoScheduleTemplateVersionModel.create({
        templateId: tplDoc._id.toString(),
        templateCode: cleanCode,
        version: 1,
        changelog: input.changelog,
        activities: input.activities,
        createdBy: input.createdBy,
      })
      return { template: mapTemplate(tplDoc), version: mapTemplateVersion(verDoc) }
    }

    assertPersistenceAvailable('schedule templates')
    const now = new Date()
    const tpl: IScheduleTemplate = {
      id: `stpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: cleanCode,
      name: input.name,
      description: input.description,
      targetDurationWeeks: input.targetDurationWeeks,
      activeVersion: 1,
      isActive: true,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    }
    const ver: IScheduleTemplateVersion = {
      id: `stver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: tpl.id,
      templateCode: cleanCode,
      version: 1,
      changelog: input.changelog,
      activities: input.activities,
      createdBy: input.createdBy,
      createdAt: now,
    }
    inMemoryScheduleTemplateStore.push(tpl)
    inMemoryTemplateVersionStore.push(ver)
    return { template: tpl, version: ver }
  },

  async createNewVersion(
    templateId: string,
    changelog: string,
    activities: ITemplateActivityDefault[],
    createdBy: string
  ): Promise<{ template: IScheduleTemplate; version: IScheduleTemplateVersion }> {
    const tpl = await this.findById(templateId)
    if (!tpl) {
      throw Object.assign(new Error('Schedule template not found'), { statusCode: 404 })
    }
    const nextVersion = tpl.activeVersion + 1

    if (isMongoConnected()) {
      const verDoc = await MongoScheduleTemplateVersionModel.create({
        templateId: tpl.id,
        templateCode: tpl.code,
        version: nextVersion,
        changelog,
        activities,
        createdBy,
      })
      const updatedTpl = await MongoScheduleTemplateModel.findByIdAndUpdate(
        tpl.id,
        { activeVersion: nextVersion },
        { new: true }
      )
      return { template: mapTemplate(updatedTpl!), version: mapTemplateVersion(verDoc) }
    }

    assertPersistenceAvailable('schedule templates')
    const ver: IScheduleTemplateVersion = {
      id: `stver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: tpl.id,
      templateCode: tpl.code,
      version: nextVersion,
      changelog,
      activities,
      createdBy,
      createdAt: new Date(),
    }
    inMemoryTemplateVersionStore.push(ver)
    const idx = inMemoryScheduleTemplateStore.findIndex((t) => t.id === tpl.id)
    if (idx !== -1) {
      inMemoryScheduleTemplateStore[idx] = {
        ...inMemoryScheduleTemplateStore[idx],
        activeVersion: nextVersion,
        updatedAt: new Date(),
      }
    }
    return { template: inMemoryScheduleTemplateStore[idx] || tpl, version: ver }
  },

  async listVersions(templateId: string): Promise<IScheduleTemplateVersion[]> {
    if (isMongoConnected()) {
      const docs = await MongoScheduleTemplateVersionModel.find({ templateId }).sort({ version: -1 })
      return docs.map(mapTemplateVersion)
    }
    assertPersistenceAvailable('schedule templates')
    return inMemoryTemplateVersionStore
      .filter((v) => v.templateId === templateId)
      .sort((a, b) => b.version - a.version)
  },

  async getVersion(templateId: string, versionNumber?: number): Promise<IScheduleTemplateVersion | null> {
    if (isMongoConnected()) {
      const query = versionNumber
        ? { templateId, version: versionNumber }
        : { templateId }
      const doc = await MongoScheduleTemplateVersionModel.findOne(query).sort({ version: -1 })
      return doc ? mapTemplateVersion(doc) : null
    }
    assertPersistenceAvailable('schedule templates')
    const matching = inMemoryTemplateVersionStore
      .filter((v) => v.templateId === templateId && (!versionNumber || v.version === versionNumber))
      .sort((a, b) => b.version - a.version)
    return matching[0] || null
  },
}

export const ProjectScheduleRepository = {
  async create(
    data: Omit<IProjectSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IProjectSchedule> {
    if (isMongoConnected()) {
      const doc = await MongoProjectScheduleModel.create(data)
      return mapSchedule(doc)
    }
    assertPersistenceAvailable('academic schedules')
    const now = new Date()
    const created: IProjectSchedule = {
      ...data,
      id: `psch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }
    inMemoryProjectScheduleStore.push(created)
    return created
  },

  async findById(id: string): Promise<IProjectSchedule | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoProjectScheduleModel.findById(id)
      return doc ? mapSchedule(doc) : null
    }
    assertPersistenceAvailable('academic schedules')
    return inMemoryProjectScheduleStore.find((s) => s.id === id) || null
  },

  async listByFaculty(facultyId: string): Promise<IProjectSchedule[]> {
    if (isMongoConnected()) {
      const docs = await MongoProjectScheduleModel.find({
        $or: [{ facultyGuideId: facultyId }, { createdByFacultyId: facultyId }],
      }).sort({ updatedAt: -1 })
      return docs.map(mapSchedule)
    }
    assertPersistenceAvailable('academic schedules')
    return inMemoryProjectScheduleStore
      .filter((s) => s.facultyGuideId === facultyId || s.createdByFacultyId === facultyId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  async listAll(): Promise<IProjectSchedule[]> {
    if (isMongoConnected()) {
      const docs = await MongoProjectScheduleModel.find({}).sort({ updatedAt: -1 })
      return docs.map(mapSchedule)
    }
    assertPersistenceAvailable('academic schedules')
    return [...inMemoryProjectScheduleStore].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  async listPublishedForStudent(studentId: string): Promise<IProjectSchedule[]> {
    if (isMongoConnected()) {
      const docs = await MongoProjectScheduleModel.find({
        status: 'PUBLISHED',
        assignedStudentIds: studentId,
      }).sort({ publishedAt: -1, updatedAt: -1 })
      return docs.map(mapSchedule)
    }
    assertPersistenceAvailable('academic schedules')
    return inMemoryProjectScheduleStore
      .filter((s) => s.status === 'PUBLISHED' && s.assignedStudentIds.includes(studentId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  async update(id: string, updates: Partial<IProjectSchedule>): Promise<IProjectSchedule | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoProjectScheduleModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      )
      return doc ? mapSchedule(doc) : null
    }
    assertPersistenceAvailable('academic schedules')
    const idx = inMemoryProjectScheduleStore.findIndex((s) => s.id === id)
    if (idx === -1) return null
    inMemoryProjectScheduleStore[idx] = {
      ...inMemoryProjectScheduleStore[idx],
      ...updates,
      updatedAt: new Date(),
    }
    return inMemoryProjectScheduleStore[idx]
  },
}

export const ScheduleChangeHistoryRepository = {
  async createMany(
    entries: Array<Omit<IScheduleChangeHistory, 'id' | 'createdAt'>>
  ): Promise<IScheduleChangeHistory[]> {
    if (entries.length === 0) return []
    if (isMongoConnected()) {
      const docs = await MongoScheduleChangeHistoryModel.insertMany(entries)
      return docs.map((d: any) => mapHistory(d))
    }
    assertPersistenceAvailable('schedule history')
    const now = new Date()
    const created = entries.map((e, i) => ({
      ...e,
      id: `schh-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
    }))
    inMemoryScheduleHistoryStore.push(...created)
    return created
  },

  async listBySchedule(scheduleId: string): Promise<IScheduleChangeHistory[]> {
    if (isMongoConnected()) {
      const docs = await MongoScheduleChangeHistoryModel.find({ scheduleId }).sort({
        versionNumber: -1,
        createdAt: -1,
      })
      return docs.map(mapHistory)
    }
    assertPersistenceAvailable('schedule history')
    return inMemoryScheduleHistoryStore
      .filter((h) => h.scheduleId === scheduleId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
  },
}
