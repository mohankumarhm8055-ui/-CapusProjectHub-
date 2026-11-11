import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import type {
  IFinalDeliverableConfig,
  IFinalProjectLifecycle,
} from './lifecycle.types.js'

// ==========================================
// 1. Institutional Final Deliverable Config
// ==========================================

export interface FinalDeliverableConfigDocument
  extends Document,
    Omit<IFinalDeliverableConfig, 'id'> {
  _id: mongoose.Types.ObjectId
}

const FinalDeliverableConfigSchema = new Schema<FinalDeliverableConfigDocument>(
  {
    configKey: { type: String, required: true, unique: true, default: 'GLOBAL' },
    mandatoryDeliverables: {
      finalReport: { type: Boolean, default: true },
      presentation: { type: Boolean, default: false },
      sourceCodeOrGithub: { type: Boolean, default: true },
      architectureDiagram: { type: Boolean, default: false },
      screenshots: { type: Boolean, default: false },
      demoLinkOrVideo: { type: Boolean, default: false },
    },
    requireStartedWeeklyReportsSubmitted: { type: Boolean, default: true },
    requireAllWeeklyReportsSubmitted: { type: Boolean, default: false },
    minimumWeeklyReportsRequired: { type: Number, default: 1, min: 0, max: 60 },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

export const MongoFinalDeliverableConfigModel =
  mongoose.models.FinalDeliverableConfig ||
  mongoose.model<FinalDeliverableConfigDocument>(
    'FinalDeliverableConfig',
    FinalDeliverableConfigSchema
  )

// ==========================================
// 2. Final Project Lifecycle Record
// ==========================================

export interface FinalProjectLifecycleDocument
  extends Document,
    Omit<IFinalProjectLifecycle, 'id'> {
  _id: mongoose.Types.ObjectId
}

const FinalProjectLifecycleSchema = new Schema<FinalProjectLifecycleDocument>(
  {
    scheduleId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: [
        'NOT_READY',
        'FINAL_REVIEW_PENDING',
        'CORRECTIONS_REQUIRED',
        'COMPLETION_APPROVED',
        'PUBLICATION_DRAFT',
        'PUBLISHED',
        'UNPUBLISHED',
        'ARCHIVED',
      ],
      default: 'NOT_READY',
      index: true,
    },
    latestRevisionNumber: { type: Number, default: 0, min: 0 },
    draftSubmission: { type: Schema.Types.Mixed },
    finalSubmissionRevisions: { type: [Schema.Types.Mixed] as any, default: [] },
    facultyFeedback: { type: [Schema.Types.Mixed] as any, default: [] },
    completionApprovedAt: { type: Date },
    completionApprovedByFacultyId: { type: String },
    completionApprovedByFacultyName: { type: String },
    publicationDraft: { type: Schema.Types.Mixed },
    publishedAt: { type: Date },
    publishedByFacultyId: { type: String },
    publishedByFacultyName: { type: String },
    unpublishedAt: { type: Date },
    unpublishedReason: { type: String },
    archivedAt: { type: Date },
    archivedReason: { type: String },
    auditHistory: { type: [Schema.Types.Mixed] as any, default: [] },
  },
  { timestamps: true }
)

export const MongoFinalProjectLifecycleModel =
  mongoose.models.FinalProjectLifecycle ||
  mongoose.model<FinalProjectLifecycleDocument>(
    'FinalProjectLifecycle',
    FinalProjectLifecycleSchema
  )

// ==========================================
// 3. Repositories
// ==========================================

const inMemoryConfig: IFinalDeliverableConfig = {
  id: 'fdc-global',
  configKey: 'GLOBAL',
  mandatoryDeliverables: {
    finalReport: true,
    presentation: false,
    sourceCodeOrGithub: true,
    architectureDiagram: false,
    screenshots: false,
    demoLinkOrVideo: false,
  },
  requireStartedWeeklyReportsSubmitted: true,
  requireAllWeeklyReportsSubmitted: false,
  minimumWeeklyReportsRequired: 1,
  updatedAt: new Date(),
}

const inMemoryLifecycleStore: IFinalProjectLifecycle[] = []

function mapConfigDoc(doc: any): IFinalDeliverableConfig {
  return {
    id: doc._id.toString(),
    configKey: 'GLOBAL',
    mandatoryDeliverables: doc.mandatoryDeliverables,
    requireStartedWeeklyReportsSubmitted: doc.requireStartedWeeklyReportsSubmitted,
    requireAllWeeklyReportsSubmitted: doc.requireAllWeeklyReportsSubmitted,
    minimumWeeklyReportsRequired: doc.minimumWeeklyReportsRequired,
    updatedBy: doc.updatedBy,
    updatedAt: doc.updatedAt,
  }
}

function mapLifecycleDoc(doc: any): IFinalProjectLifecycle {
  return {
    id: doc._id.toString(),
    scheduleId: doc.scheduleId,
    projectId: doc.projectId,
    status: doc.status,
    latestRevisionNumber: doc.latestRevisionNumber || 0,
    draftSubmission: doc.draftSubmission,
    finalSubmissionRevisions: doc.finalSubmissionRevisions || [],
    facultyFeedback: doc.facultyFeedback || [],
    completionApprovedAt: doc.completionApprovedAt,
    completionApprovedByFacultyId: doc.completionApprovedByFacultyId,
    completionApprovedByFacultyName: doc.completionApprovedByFacultyName,
    publicationDraft: doc.publicationDraft,
    publishedAt: doc.publishedAt,
    publishedByFacultyId: doc.publishedByFacultyId,
    publishedByFacultyName: doc.publishedByFacultyName,
    unpublishedAt: doc.unpublishedAt,
    unpublishedReason: doc.unpublishedReason,
    archivedAt: doc.archivedAt,
    archivedReason: doc.archivedReason,
    auditHistory: doc.auditHistory || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const FinalDeliverableConfigRepository = {
  async getOrInitGlobal(): Promise<IFinalDeliverableConfig> {
    if (isMongoConnected()) {
      const doc = await MongoFinalDeliverableConfigModel.findOneAndUpdate(
        { configKey: 'GLOBAL' },
        {
          $setOnInsert: {
            configKey: 'GLOBAL',
            mandatoryDeliverables: {
              finalReport: true,
              presentation: false,
              sourceCodeOrGithub: true,
              architectureDiagram: false,
              screenshots: false,
              demoLinkOrVideo: false,
            },
            requireStartedWeeklyReportsSubmitted: true,
            requireAllWeeklyReportsSubmitted: false,
            minimumWeeklyReportsRequired: 1,
          },
        },
        { upsert: true, new: true }
      )
      return mapConfigDoc(doc)
    }
    assertPersistenceAvailable('final deliverable configuration')
    return inMemoryConfig
  },

  async updateGlobal(
    updates: Partial<
      Pick<
        IFinalDeliverableConfig,
        | 'mandatoryDeliverables'
        | 'requireStartedWeeklyReportsSubmitted'
        | 'requireAllWeeklyReportsSubmitted'
        | 'minimumWeeklyReportsRequired'
      >
    >,
    updatedBy: string
  ): Promise<IFinalDeliverableConfig> {
    if (isMongoConnected()) {
      await this.getOrInitGlobal()
      const doc = await MongoFinalDeliverableConfigModel.findOneAndUpdate(
        { configKey: 'GLOBAL' },
        { $set: { ...updates, updatedBy } },
        { new: true }
      )
      return mapConfigDoc(doc)
    }
    assertPersistenceAvailable('final deliverable configuration')
    Object.assign(inMemoryConfig, updates, { updatedBy, updatedAt: new Date() })
    return inMemoryConfig
  },
}

export const FinalLifecycleRepository = {
  async findByScheduleId(scheduleId: string): Promise<IFinalProjectLifecycle | null> {
    if (isMongoConnected()) {
      const doc = await MongoFinalProjectLifecycleModel.findOne({ scheduleId })
      return doc ? mapLifecycleDoc(doc) : null
    }
    assertPersistenceAvailable('final project lifecycle')
    return inMemoryLifecycleStore.find((l) => l.scheduleId === scheduleId) || null
  },

  async findByProjectId(projectId: string): Promise<IFinalProjectLifecycle | null> {
    if (isMongoConnected()) {
      const doc = await MongoFinalProjectLifecycleModel.findOne({ projectId })
      return doc ? mapLifecycleDoc(doc) : null
    }
    assertPersistenceAvailable('final project lifecycle')
    return inMemoryLifecycleStore.find((l) => l.projectId === projectId) || null
  },

  async listByScheduleIds(scheduleIds: string[]): Promise<IFinalProjectLifecycle[]> {
    if (scheduleIds.length === 0) return []
    if (isMongoConnected()) {
      const docs = await MongoFinalProjectLifecycleModel.find({
        scheduleId: { $in: scheduleIds },
      }).sort({ updatedAt: -1 })
      return docs.map(mapLifecycleDoc)
    }
    assertPersistenceAvailable('final project lifecycle')
    return inMemoryLifecycleStore.filter((l) => scheduleIds.includes(l.scheduleId))
  },

  async create(
    data: Omit<IFinalProjectLifecycle, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IFinalProjectLifecycle> {
    if (isMongoConnected()) {
      const doc = await MongoFinalProjectLifecycleModel.create(data)
      return mapLifecycleDoc(doc)
    }
    assertPersistenceAvailable('final project lifecycle')
    const now = new Date()
    const created: IFinalProjectLifecycle = {
      ...data,
      id: `fpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }
    inMemoryLifecycleStore.push(created)
    return created
  },

  async update(
    id: string,
    updates: Partial<IFinalProjectLifecycle>
  ): Promise<IFinalProjectLifecycle | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoFinalProjectLifecycleModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      )
      return doc ? mapLifecycleDoc(doc) : null
    }
    assertPersistenceAvailable('final project lifecycle')
    const idx = inMemoryLifecycleStore.findIndex((l) => l.id === id)
    if (idx === -1) return null
    inMemoryLifecycleStore[idx] = {
      ...inMemoryLifecycleStore[idx],
      ...updates,
      updatedAt: new Date(),
    }
    return inMemoryLifecycleStore[idx]
  },
}
