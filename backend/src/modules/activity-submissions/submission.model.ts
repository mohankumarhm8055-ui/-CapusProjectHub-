import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import type {
  IActivitySubmission,
  IActivitySubmissionRevision,
  IEvidenceFileMeta,
  IEvidenceFileRecord,
  IEvidenceLink,
  ISubmissionReviewDecision,
} from './submission.types.js'

// ==========================================
// 1. Sub-schemas
// ==========================================

const EvidenceFileMetaSchema = new Schema<IEvidenceFileMeta>(
  {
    fileId: { type: String, required: true },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    sha256: { type: String, required: true },
    evidenceCategory: {
      type: String,
      enum: [
        'PDF_DOCUMENT',
        'DOCX_DOCUMENT',
        'UI_UX_SCREENSHOT',
        'ARCHITECTURE_DIAGRAM',
        'IMAGE_EVIDENCE',
        'SUPPORTING_DOCUMENT',
        'OTHER',
      ],
      default: 'OTHER',
    },
    uploadedByStudentId: { type: String, required: true },
    uploadedByStudentName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const EvidenceLinkSchema = new Schema<IEvidenceLink>(
  {
    url: { type: String, required: true, trim: true },
    linkType: {
      type: String,
      enum: [
        'GITHUB_REPOSITORY',
        'DEMO_URL',
        'RESEARCH_PAPER',
        'DOCUMENTATION_URL',
        'DESIGN_LINK',
        'OTHER',
      ],
      default: 'OTHER',
    },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const SubmissionReviewDecisionSchema = new Schema<ISubmissionReviewDecision>(
  {
    decisionId: { type: String, required: true },
    revisionNumber: { type: Number, required: true, min: 1 },
    outcome: {
      type: String,
      enum: ['UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'FEEDBACK_ADDED'],
      required: true,
    },
    comment: { type: String, default: '' },
    correctionInstructions: { type: String },
    facultyId: { type: String, required: true },
    facultyName: { type: String, required: true },
    facultyRole: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

// ==========================================
// 2. Mongoose Schemas & Models
// ==========================================

export interface ActivitySubmissionDocument
  extends Document,
    Omit<IActivitySubmission, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ActivitySubmissionSchema = new Schema<ActivitySubmissionDocument>(
  {
    projectId: { type: String, required: true, index: true },
    scheduleId: { type: String, required: true, index: true },
    activityId: { type: String, required: true, index: true },
    activitySequenceNumber: { type: Number, required: true, min: 1 },
    activityTitle: { type: String, required: true, trim: true },
    submissionScope: {
      type: String,
      enum: ['TEAM_SHARED', 'INDIVIDUAL'],
      default: 'TEAM_SHARED',
    },
    submissionKey: { type: String, required: true },
    ownerStudentId: { type: String, index: true },
    createdByStudentId: { type: String, required: true },
    createdByStudentName: { type: String, required: true, trim: true },
    lastSubmittedByStudentId: { type: String, required: true },
    lastSubmittedByStudentName: { type: String, required: true, trim: true },
    latestRevisionNumber: { type: Number, required: true, min: 1, default: 1 },
    status: {
      type: String,
      enum: [
        'NOT_SUBMITTED',
        'SUBMITTED',
        'UNDER_REVIEW',
        'CHANGES_REQUESTED',
        'RESUBMITTED',
        'APPROVED',
        'REJECTED',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    isLate: { type: Boolean, default: false },
    lateByDays: { type: Number, default: 0, min: 0 },
    firstSubmittedAt: { type: Date, required: true },
    lastSubmittedAt: { type: Date, required: true },
    latestFacultyFeedback: { type: String, trim: true },
    reviewedByFacultyId: { type: String },
    reviewedByFacultyName: { type: String, trim: true },
    reviewedAt: { type: Date },
    reviewHistory: { type: [SubmissionReviewDecisionSchema], default: [] },
  },
  { timestamps: true }
)

// Enforces accidental duplicate prevention atomically in MongoDB
ActivitySubmissionSchema.index(
  { scheduleId: 1, activityId: 1, submissionKey: 1 },
  { unique: true }
)

export const MongoActivitySubmissionModel =
  mongoose.models.ActivitySubmission ||
  mongoose.model<ActivitySubmissionDocument>('ActivitySubmission', ActivitySubmissionSchema)

export interface ActivitySubmissionRevisionDocument
  extends Document,
    Omit<IActivitySubmissionRevision, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ActivitySubmissionRevisionSchema = new Schema<ActivitySubmissionRevisionDocument>(
  {
    submissionId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    scheduleId: { type: String, required: true, index: true },
    activityId: { type: String, required: true, index: true },
    revisionNumber: { type: Number, required: true, min: 1 },
    submittedByStudentId: { type: String, required: true },
    submittedByStudentName: { type: String, required: true, trim: true },
    submittedByIsTeamLeader: { type: Boolean, default: false },
    submissionDescription: { type: String, required: true, trim: true },
    evidenceFiles: { type: [EvidenceFileMetaSchema], default: [] },
    evidenceLinks: { type: [EvidenceLinkSchema], default: [] },
    statusAtSubmission: {
      type: String,
      enum: ['SUBMITTED', 'RESUBMITTED'],
      required: true,
    },
    submittedAt: { type: Date, required: true },
    submittedDateIso: { type: String, required: true },
    deadlineAtSubmission: { type: String, required: true },
    isLate: { type: Boolean, default: false },
    lateByDays: { type: Number, default: 0, min: 0 },
    facultyReviewOutcome: {
      type: String,
      enum: ['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
    },
    facultyFeedback: { type: String, trim: true },
    correctionInstructions: { type: String, trim: true },
    reviewedByFacultyId: { type: String },
    reviewedByFacultyName: { type: String, trim: true },
    reviewedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

ActivitySubmissionRevisionSchema.index(
  { submissionId: 1, revisionNumber: 1 },
  { unique: true }
)

export const MongoActivitySubmissionRevisionModel =
  mongoose.models.ActivitySubmissionRevision ||
  mongoose.model<ActivitySubmissionRevisionDocument>(
    'ActivitySubmissionRevision',
    ActivitySubmissionRevisionSchema
  )

export interface EvidenceFileRecordDocument
  extends Document,
    Omit<IEvidenceFileRecord, 'id'> {
  _id: mongoose.Types.ObjectId
}

const EvidenceFileRecordSchema = new Schema<EvidenceFileRecordDocument>(
  {
    fileId: { type: String, required: true, unique: true, index: true },
    storageKey: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    scheduleId: { type: String, required: true, index: true },
    activityId: { type: String, required: true },
    submissionId: { type: String, required: true, index: true },
    revisionNumber: { type: Number, required: true },
    sourceKind: {
      type: String,
      enum: ['ACTIVITY_SUBMISSION', 'WEEKLY_REPORT', 'FINAL_DELIVERABLE'],
      default: 'ACTIVITY_SUBMISSION',
    },
    submissionScope: {
      type: String,
      enum: ['TEAM_SHARED', 'INDIVIDUAL'],
      default: 'TEAM_SHARED',
    },
    ownerStudentId: { type: String },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    evidenceCategory: { type: String, required: true },
    uploadedByStudentId: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

export const MongoEvidenceFileRecordModel =
  mongoose.models.EvidenceFileRecord ||
  mongoose.model<EvidenceFileRecordDocument>('EvidenceFileRecord', EvidenceFileRecordSchema)

// ==========================================
// 3. Mappers & Repositories
// ==========================================

function mapSubmission(doc: ActivitySubmissionDocument): IActivitySubmission {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId,
    scheduleId: doc.scheduleId,
    activityId: doc.activityId,
    activitySequenceNumber: doc.activitySequenceNumber,
    activityTitle: doc.activityTitle,
    submissionScope: doc.submissionScope,
    submissionKey: doc.submissionKey,
    ownerStudentId: doc.ownerStudentId,
    createdByStudentId: doc.createdByStudentId,
    createdByStudentName: doc.createdByStudentName,
    lastSubmittedByStudentId: doc.lastSubmittedByStudentId,
    lastSubmittedByStudentName: doc.lastSubmittedByStudentName,
    latestRevisionNumber: doc.latestRevisionNumber,
    status: doc.status,
    isLate: doc.isLate,
    lateByDays: doc.lateByDays,
    firstSubmittedAt: doc.firstSubmittedAt,
    lastSubmittedAt: doc.lastSubmittedAt,
    latestFacultyFeedback: doc.latestFacultyFeedback,
    reviewedByFacultyId: doc.reviewedByFacultyId,
    reviewedByFacultyName: doc.reviewedByFacultyName,
    reviewedAt: doc.reviewedAt,
    reviewHistory: doc.reviewHistory || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function mapRevision(doc: ActivitySubmissionRevisionDocument): IActivitySubmissionRevision {
  return {
    id: doc._id.toString(),
    submissionId: doc.submissionId,
    projectId: doc.projectId,
    scheduleId: doc.scheduleId,
    activityId: doc.activityId,
    revisionNumber: doc.revisionNumber,
    submittedByStudentId: doc.submittedByStudentId,
    submittedByStudentName: doc.submittedByStudentName,
    submittedByIsTeamLeader: doc.submittedByIsTeamLeader,
    submissionDescription: doc.submissionDescription,
    evidenceFiles: doc.evidenceFiles || [],
    evidenceLinks: doc.evidenceLinks || [],
    statusAtSubmission: doc.statusAtSubmission,
    submittedAt: doc.submittedAt,
    submittedDateIso: doc.submittedDateIso,
    deadlineAtSubmission: doc.deadlineAtSubmission,
    isLate: doc.isLate,
    lateByDays: doc.lateByDays,
    facultyReviewOutcome: doc.facultyReviewOutcome,
    facultyFeedback: doc.facultyFeedback,
    correctionInstructions: doc.correctionInstructions,
    reviewedByFacultyId: doc.reviewedByFacultyId,
    reviewedByFacultyName: doc.reviewedByFacultyName,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
  }
}

function mapFileRecord(doc: EvidenceFileRecordDocument): IEvidenceFileRecord {
  return {
    id: doc._id.toString(),
    fileId: doc.fileId,
    storageKey: doc.storageKey,
    projectId: doc.projectId,
    scheduleId: doc.scheduleId,
    activityId: doc.activityId,
    submissionId: doc.submissionId,
    revisionNumber: doc.revisionNumber,
    sourceKind: doc.sourceKind || 'ACTIVITY_SUBMISSION',
    submissionScope: doc.submissionScope,
    ownerStudentId: doc.ownerStudentId,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sha256: doc.sha256,
    evidenceCategory: doc.evidenceCategory,
    uploadedByStudentId: doc.uploadedByStudentId,
    uploadedAt: doc.uploadedAt,
  }
}

export const inMemorySubmissionStore: IActivitySubmission[] = []
export const inMemoryRevisionStore: IActivitySubmissionRevision[] = []
export const inMemoryEvidenceFileStore: IEvidenceFileRecord[] = []

export const ActivitySubmissionRepository = {
  async listBySchedule(scheduleId: string): Promise<IActivitySubmission[]> {
    if (isMongoConnected()) {
      const docs = await MongoActivitySubmissionModel.find({ scheduleId }).sort({
        activitySequenceNumber: 1,
        createdAt: 1,
      })
      return docs.map(mapSubmission)
    }
    assertPersistenceAvailable('activity submissions')
    return inMemorySubmissionStore
      .filter((s) => s.scheduleId === scheduleId)
      .sort((a, b) => a.activitySequenceNumber - b.activitySequenceNumber)
  },

  async listBySchedules(scheduleIds: string[]): Promise<IActivitySubmission[]> {
    if (scheduleIds.length === 0) return []
    if (isMongoConnected()) {
      const docs = await MongoActivitySubmissionModel.find({
        scheduleId: { $in: scheduleIds },
      }).sort({ lastSubmittedAt: -1 })
      return docs.map(mapSubmission)
    }
    assertPersistenceAvailable('activity submissions')
    return inMemorySubmissionStore
      .filter((s) => scheduleIds.includes(s.scheduleId))
      .sort((a, b) => b.lastSubmittedAt.getTime() - a.lastSubmittedAt.getTime())
  },

  async findByKey(
    scheduleId: string,
    activityId: string,
    submissionKey: string
  ): Promise<IActivitySubmission | null> {
    if (isMongoConnected()) {
      const doc = await MongoActivitySubmissionModel.findOne({
        scheduleId,
        activityId,
        submissionKey,
      })
      return doc ? mapSubmission(doc) : null
    }
    assertPersistenceAvailable('activity submissions')
    return (
      inMemorySubmissionStore.find(
        (s) =>
          s.scheduleId === scheduleId &&
          s.activityId === activityId &&
          s.submissionKey === submissionKey
      ) || null
    )
  },

  async findById(id: string): Promise<IActivitySubmission | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoActivitySubmissionModel.findById(id)
      return doc ? mapSubmission(doc) : null
    }
    assertPersistenceAvailable('activity submissions')
    return inMemorySubmissionStore.find((s) => s.id === id) || null
  },

  async create(
    data: Omit<IActivitySubmission, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IActivitySubmission> {
    if (isMongoConnected()) {
      const doc = await MongoActivitySubmissionModel.create(data)
      return mapSubmission(doc)
    }
    assertPersistenceAvailable('activity submissions')
    const duplicate = inMemorySubmissionStore.find(
      (s) =>
        s.scheduleId === data.scheduleId &&
        s.activityId === data.activityId &&
        s.submissionKey === data.submissionKey
    )
    if (duplicate) {
      throw Object.assign(new Error('Duplicate submission'), { code: 11000 })
    }
    const now = new Date()
    const created: IActivitySubmission = {
      ...data,
      id: `asub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }
    inMemorySubmissionStore.push(created)
    return created
  },

  async update(
    id: string,
    updates: Partial<IActivitySubmission>
  ): Promise<IActivitySubmission | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoActivitySubmissionModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      )
      return doc ? mapSubmission(doc) : null
    }
    assertPersistenceAvailable('activity submissions')
    const idx = inMemorySubmissionStore.findIndex((s) => s.id === id)
    if (idx === -1) return null
    inMemorySubmissionStore[idx] = {
      ...inMemorySubmissionStore[idx],
      ...updates,
      updatedAt: new Date(),
    }
    return inMemorySubmissionStore[idx]
  },

  async createRevision(
    data: Omit<IActivitySubmissionRevision, 'id' | 'createdAt'>
  ): Promise<IActivitySubmissionRevision> {
    if (isMongoConnected()) {
      const doc = await MongoActivitySubmissionRevisionModel.create(data)
      return mapRevision(doc)
    }
    assertPersistenceAvailable('activity submission revisions')
    const created: IActivitySubmissionRevision = {
      ...data,
      id: `arev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
    }
    inMemoryRevisionStore.push(created)
    return created
  },

  async listRevisions(submissionId: string): Promise<IActivitySubmissionRevision[]> {
    if (isMongoConnected()) {
      const docs = await MongoActivitySubmissionRevisionModel.find({ submissionId }).sort({
        revisionNumber: -1,
      })
      return docs.map(mapRevision)
    }
    assertPersistenceAvailable('activity submission revisions')
    return inMemoryRevisionStore
      .filter((r) => r.submissionId === submissionId)
      .sort((a, b) => b.revisionNumber - a.revisionNumber)
  },

  async updateRevisionReview(
    submissionId: string,
    revisionNumber: number,
    review: {
      facultyReviewOutcome: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
      facultyFeedback: string
      correctionInstructions?: string
      reviewedByFacultyId: string
      reviewedByFacultyName: string
      reviewedAt: Date
    }
  ): Promise<IActivitySubmissionRevision | null> {
    if (isMongoConnected()) {
      const doc = await MongoActivitySubmissionRevisionModel.findOneAndUpdate(
        { submissionId, revisionNumber },
        { $set: review },
        { new: true }
      )
      return doc ? mapRevision(doc) : null
    }
    assertPersistenceAvailable('activity submission revisions')
    const idx = inMemoryRevisionStore.findIndex(
      (r) => r.submissionId === submissionId && r.revisionNumber === revisionNumber
    )
    if (idx === -1) return null
    inMemoryRevisionStore[idx] = { ...inMemoryRevisionStore[idx], ...review }
    return inMemoryRevisionStore[idx]
  },

  async registerFileRecords(
    records: Array<Omit<IEvidenceFileRecord, 'id'>>
  ): Promise<IEvidenceFileRecord[]> {
    if (records.length === 0) return []
    if (isMongoConnected()) {
      const docs = await MongoEvidenceFileRecordModel.insertMany(records)
      return docs.map((d: any) => mapFileRecord(d))
    }
    assertPersistenceAvailable('evidence file records')
    const created = records.map((r, idx) => ({
      ...r,
      id: `efr-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    }))
    inMemoryEvidenceFileStore.push(...created)
    return created
  },

  async findFileRecordByFileId(fileId: string): Promise<IEvidenceFileRecord | null> {
    if (isMongoConnected()) {
      const doc = await MongoEvidenceFileRecordModel.findOne({ fileId })
      return doc ? mapFileRecord(doc) : null
    }
    assertPersistenceAvailable('evidence file records')
    return inMemoryEvidenceFileStore.find((f) => f.fileId === fileId) || null
  },
}
