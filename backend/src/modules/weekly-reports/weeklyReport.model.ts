import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import type { IEvidenceFileMeta, IEvidenceLink } from '../activity-submissions/submission.types.js'
import type {
  IWeeklyIndividualContribution,
  IWeeklyProgressReport,
  IWeeklyReportFacultyComment,
  IWeeklyReportRevision,
} from './weeklyReport.types.js'

const WeeklyEvidenceFileSchema = new Schema<IEvidenceFileMeta>(
  {
    fileId: { type: String, required: true },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    sha256: { type: String, required: true },
    evidenceCategory: { type: String, default: 'OTHER' },
    uploadedByStudentId: { type: String, required: true },
    uploadedByStudentName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const WeeklyEvidenceLinkSchema = new Schema<IEvidenceLink>(
  {
    url: { type: String, required: true, trim: true },
    linkType: { type: String, default: 'OTHER' },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const IndividualContributionSchema = new Schema<IWeeklyIndividualContribution>(
  {
    contributionId: { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true, trim: true },
    usnOrEmployeeId: { type: String, trim: true },
    isTeamLeader: { type: Boolean, default: false },
    workPerformed: { type: String, required: true, trim: true },
    relatedActivityId: { type: String, trim: true },
    relatedActivityTitle: { type: String, trim: true },
    supportingEvidenceNote: { type: String, trim: true },
    evidenceLinks: { type: [WeeklyEvidenceLinkSchema], default: [] },
    evidenceFiles: { type: [WeeklyEvidenceFileSchema], default: [] },
    verificationLabel: { type: String, enum: ['STUDENT_REPORTED'], default: 'STUDENT_REPORTED' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const WeeklyReportRevisionSchema = new Schema<IWeeklyReportRevision>(
  {
    revisionNumber: { type: Number, required: true, min: 1 },
    submittedByStudentId: { type: String, required: true },
    submittedByStudentName: { type: String, required: true },
    submittedAt: { type: Date, required: true },
    submittedDateIso: { type: String, required: true },
    isLateSubmission: { type: Boolean, default: false },
    lateByDays: { type: Number, default: 0 },
    workCompleted: { type: String, default: '' },
    workInProgress: { type: String, default: '' },
    challengesOrBlockers: { type: String, default: '' },
    planForNextWeek: { type: String, default: '' },
    supportingEvidenceNotes: { type: String, default: '' },
    evidenceFiles: { type: [WeeklyEvidenceFileSchema], default: [] },
    evidenceLinks: { type: [WeeklyEvidenceLinkSchema], default: [] },
    contributionsSnapshot: { type: [IndividualContributionSchema], default: [] },
  },
  { _id: false }
)

const WeeklyFacultyCommentSchema = new Schema<IWeeklyReportFacultyComment>(
  {
    commentId: { type: String, required: true },
    facultyId: { type: String, required: true },
    facultyName: { type: String, required: true, trim: true },
    action: {
      type: String,
      enum: ['COMMENT', 'MARK_UNDER_REVIEW', 'REQUEST_CLARIFICATION', 'FINALIZE'],
      required: true,
    },
    comment: { type: String, required: true, trim: true },
    targetRevisionNumber: { type: Number },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

export interface WeeklyProgressReportDocument
  extends Document,
    Omit<IWeeklyProgressReport, 'id'> {
  _id: mongoose.Types.ObjectId
}

const WeeklyProgressReportSchema = new Schema<WeeklyProgressReportDocument>(
  {
    projectId: { type: String, required: true, index: true },
    scheduleId: { type: String, required: true, index: true },
    teamId: { type: String, required: true, index: true },
    weekNumber: { type: Number, required: true, min: 1 },
    reportingPeriodStart: { type: String, required: true },
    reportingPeriodEnd: { type: String, required: true },
    reportingDeadline: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'FINALIZED'],
      default: 'DRAFT',
      index: true,
    },
    workCompleted: { type: String, default: '' },
    workInProgress: { type: String, default: '' },
    challengesOrBlockers: { type: String, default: '' },
    planForNextWeek: { type: String, default: '' },
    supportingEvidenceNotes: { type: String, default: '' },
    evidenceFiles: { type: [WeeklyEvidenceFileSchema], default: [] },
    evidenceLinks: { type: [WeeklyEvidenceLinkSchema], default: [] },
    contributions: { type: [IndividualContributionSchema], default: [] },
    submittedAt: { type: Date },
    lastSubmittedAt: { type: Date },
    submittedByStudentId: { type: String },
    submittedByStudentName: { type: String },
    isLateSubmission: { type: Boolean, default: false },
    lateByDays: { type: Number, default: 0, min: 0 },
    latestRevisionNumber: { type: Number, default: 0, min: 0 },
    revisions: { type: [WeeklyReportRevisionSchema], default: [] },
    facultyComments: { type: [WeeklyFacultyCommentSchema], default: [] },
    finalizedAt: { type: Date },
    finalizedByFacultyId: { type: String },
    finalizedByFacultyName: { type: String },
    reminderMetadata: {
      lastEvaluatedAt: { type: Date },
      lastSignal: {
        type: String,
        enum: ['NONE', 'APPROACHING_DEADLINE', 'DUE_TODAY', 'OVERDUE', 'CLARIFICATION_REQUESTED'],
        default: 'NONE',
      },
    },
  },
  { timestamps: true }
)

// One shared team report per schedule & reporting week
WeeklyProgressReportSchema.index({ scheduleId: 1, weekNumber: 1 }, { unique: true })

export const MongoWeeklyProgressReportModel =
  mongoose.models.WeeklyProgressReport ||
  mongoose.model<WeeklyProgressReportDocument>(
    'WeeklyProgressReport',
    WeeklyProgressReportSchema
  )

function mapReport(doc: WeeklyProgressReportDocument): IWeeklyProgressReport {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId,
    scheduleId: doc.scheduleId,
    teamId: doc.teamId,
    weekNumber: doc.weekNumber,
    reportingPeriodStart: doc.reportingPeriodStart,
    reportingPeriodEnd: doc.reportingPeriodEnd,
    reportingDeadline: doc.reportingDeadline,
    status: doc.status,
    workCompleted: doc.workCompleted || '',
    workInProgress: doc.workInProgress || '',
    challengesOrBlockers: doc.challengesOrBlockers || '',
    planForNextWeek: doc.planForNextWeek || '',
    supportingEvidenceNotes: doc.supportingEvidenceNotes || '',
    evidenceFiles: doc.evidenceFiles || [],
    evidenceLinks: doc.evidenceLinks || [],
    contributions: doc.contributions || [],
    submittedAt: doc.submittedAt,
    lastSubmittedAt: doc.lastSubmittedAt,
    submittedByStudentId: doc.submittedByStudentId,
    submittedByStudentName: doc.submittedByStudentName,
    isLateSubmission: doc.isLateSubmission,
    lateByDays: doc.lateByDays,
    latestRevisionNumber: doc.latestRevisionNumber,
    revisions: doc.revisions || [],
    facultyComments: doc.facultyComments || [],
    finalizedAt: doc.finalizedAt,
    finalizedByFacultyId: doc.finalizedByFacultyId,
    finalizedByFacultyName: doc.finalizedByFacultyName,
    reminderMetadata: doc.reminderMetadata,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const inMemoryWeeklyReportStore: IWeeklyProgressReport[] = []

export const WeeklyReportRepository = {
  async listBySchedule(scheduleId: string): Promise<IWeeklyProgressReport[]> {
    if (isMongoConnected()) {
      const docs = await MongoWeeklyProgressReportModel.find({ scheduleId }).sort({ weekNumber: 1 })
      return docs.map(mapReport)
    }
    assertPersistenceAvailable('weekly progress reports')
    return inMemoryWeeklyReportStore
      .filter((r) => r.scheduleId === scheduleId)
      .sort((a, b) => a.weekNumber - b.weekNumber)
  },

  async findByScheduleAndWeek(
    scheduleId: string,
    weekNumber: number
  ): Promise<IWeeklyProgressReport | null> {
    if (isMongoConnected()) {
      const doc = await MongoWeeklyProgressReportModel.findOne({ scheduleId, weekNumber })
      return doc ? mapReport(doc) : null
    }
    assertPersistenceAvailable('weekly progress reports')
    return (
      inMemoryWeeklyReportStore.find(
        (r) => r.scheduleId === scheduleId && r.weekNumber === weekNumber
      ) || null
    )
  },

  async findById(id: string): Promise<IWeeklyProgressReport | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoWeeklyProgressReportModel.findById(id)
      return doc ? mapReport(doc) : null
    }
    assertPersistenceAvailable('weekly progress reports')
    return inMemoryWeeklyReportStore.find((r) => r.id === id) || null
  },

  async create(
    data: Omit<IWeeklyProgressReport, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IWeeklyProgressReport> {
    if (isMongoConnected()) {
      const doc = await MongoWeeklyProgressReportModel.create(data)
      return mapReport(doc)
    }
    assertPersistenceAvailable('weekly progress reports')
    const dup = inMemoryWeeklyReportStore.find(
      (r) => r.scheduleId === data.scheduleId && r.weekNumber === data.weekNumber
    )
    if (dup) {
      throw Object.assign(new Error('Duplicate weekly report'), { code: 11000 })
    }
    const now = new Date()
    const created: IWeeklyProgressReport = {
      ...data,
      id: `wrep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }
    inMemoryWeeklyReportStore.push(created)
    return created
  },

  async update(
    id: string,
    updates: Partial<IWeeklyProgressReport>
  ): Promise<IWeeklyProgressReport | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoWeeklyProgressReportModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      )
      return doc ? mapReport(doc) : null
    }
    assertPersistenceAvailable('weekly progress reports')
    const idx = inMemoryWeeklyReportStore.findIndex((r) => r.id === id)
    if (idx === -1) return null
    inMemoryWeeklyReportStore[idx] = {
      ...inMemoryWeeklyReportStore[idx],
      ...updates,
      updatedAt: new Date(),
    }
    return inMemoryWeeklyReportStore[idx]
  },
}
