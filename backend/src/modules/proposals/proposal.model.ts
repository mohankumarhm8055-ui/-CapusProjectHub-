import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'

export type DocumentType =
  | 'MINI_PROJECT_PROPOSAL'
  | 'PROJECT_SYNOPSIS'
  | 'PROJECT_REPORT'
  | 'PROJECT_ABSTRACT'
  | 'REVIEW_REPORT'
  | 'PRESENTATION_OUTLINE'

export type FacultySubmissionStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'

export type ReadinessRating = 'NEEDS_IMPROVEMENT' | 'ALMOST_READY' | 'READY_FOR_FACULTY_REVIEW'

export interface IProposalSection {
  sectionId: string
  title: string
  content: string
  isMandatory: boolean
  order: number
  wordCount: number
  isManuallyEdited: boolean
  lastModifiedBy: 'ai' | 'student' | 'system'
  missingInfoNote?: string
  updatedAt: string
}

export interface ITemplateMetadata {
  templateId: string
  templateVersion?: string
  templateName: string
  college: string
  department: string
  academicYear: string
  semester: string
  documentType: DocumentType
  mandatorySectionIds: string[]
  optionalSectionIds: string[]
}

export interface IProposalVersionSnapshot {
  versionNumber: number
  sections: IProposalSection[]
  sourceScopeVersion: number
  templateId: string
  revisionSummary: string
  createdBy: string
  createdAt: string
}

export interface IFacultyFeedbackEntry {
  date: string
  facultyId: string
  facultyName?: string
  status: FacultySubmissionStatus
  comments: string
}

export interface IFacultyReviewRecord {
  status: FacultySubmissionStatus
  facultyId?: string
  submittedAt?: string
  facultyGuideName?: string
  facultyComments?: string
  reviewedAt?: string
  feedbackHistory?: IFacultyFeedbackEntry[]
}

export interface IReadinessAuditResult {
  overallRating: ReadinessRating
  problemClarity: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  objectiveAlignment: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  scopeConsistency: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  featureCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  technicalFeasibility: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  architectureConsistency: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  methodologyCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  referenceValidity: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  requiredSectionCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
  actionableSuggestions: string[]
}

export interface IProposal {
  id: string
  studentId: string
  projectTitle: string
  documentType: DocumentType
  sourceEvaluationId?: string
  sourceScopeVersion: number
  isScopeFinalized?: boolean
  scopeStatus?: 'FINALIZED' | 'UNFINALIZED' | 'DRAFT'
  template: ITemplateMetadata
  sections: IProposalSection[]
  versions: IProposalVersionSnapshot[]
  activeVersionNumber: number
  readiness?: IReadinessAuditResult
  submission: IFacultyReviewRecord
  createdAt: string
  updatedAt: string
}

export interface IProposalDoc extends Document, Omit<IProposal, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ProposalSectionSchema = new Schema<IProposalSection>(
  {
    sectionId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true, default: '' },
    isMandatory: { type: Boolean, required: true, default: true },
    order: { type: Number, required: true },
    wordCount: { type: Number, required: true, default: 0 },
    isManuallyEdited: { type: Boolean, required: true, default: false },
    lastModifiedBy: {
      type: String,
      enum: ['ai', 'student', 'system'],
      default: 'ai',
    },
    missingInfoNote: { type: String },
    updatedAt: { type: String, required: true },
  },
  { _id: false }
)

const TemplateMetadataSchema = new Schema<ITemplateMetadata>(
  {
    templateId: { type: String, required: true },
    templateVersion: { type: String, default: '1.0.0' },
    templateName: { type: String, required: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: String, required: true },
    documentType: {
      type: String,
      enum: [
        'MINI_PROJECT_PROPOSAL',
        'PROJECT_SYNOPSIS',
        'PROJECT_REPORT',
        'PROJECT_ABSTRACT',
        'REVIEW_REPORT',
        'PRESENTATION_OUTLINE',
      ],
      required: true,
    },
    mandatorySectionIds: [{ type: String }],
    optionalSectionIds: [{ type: String }],
  },
  { _id: false }
)

const ProposalVersionSnapshotSchema = new Schema<IProposalVersionSnapshot>(
  {
    versionNumber: { type: Number, required: true },
    sections: [ProposalSectionSchema],
    sourceScopeVersion: { type: Number, required: true },
    templateId: { type: String, required: true },
    revisionSummary: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false }
)

const FacultyFeedbackEntrySchema = new Schema<IFacultyFeedbackEntry>(
  {
    date: { type: String, required: true },
    facultyId: { type: String, required: true },
    facultyName: { type: String },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'READY_FOR_REVIEW',
        'SUBMITTED',
        'UNDER_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'REJECTED',
      ],
      required: true,
    },
    comments: { type: String, required: true },
  },
  { _id: false }
)

const FacultyReviewRecordSchema = new Schema<IFacultyReviewRecord>(
  {
    status: {
      type: String,
      enum: [
        'DRAFT',
        'READY_FOR_REVIEW',
        'SUBMITTED',
        'UNDER_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'REJECTED',
      ],
      default: 'DRAFT',
    },
    facultyId: { type: String },
    submittedAt: { type: String },
    facultyGuideName: { type: String },
    facultyComments: { type: String },
    reviewedAt: { type: String },
    feedbackHistory: [FacultyFeedbackEntrySchema],
  },
  { _id: false }
)

const ProposalSchema = new Schema<IProposalDoc>(
  {
    id: { type: String, unique: true, sparse: true, index: true },
    studentId: { type: String, required: true, index: true },
    projectTitle: { type: String, required: true, index: true },
    documentType: {
      type: String,
      enum: [
        'MINI_PROJECT_PROPOSAL',
        'PROJECT_SYNOPSIS',
        'PROJECT_REPORT',
        'PROJECT_ABSTRACT',
        'REVIEW_REPORT',
        'PRESENTATION_OUTLINE',
      ],
      required: true,
      default: 'MINI_PROJECT_PROPOSAL',
    },
    sourceEvaluationId: { type: String, index: true },
    sourceScopeVersion: { type: Number, required: true, default: 1 },
    isScopeFinalized: { type: Boolean, default: false },
    scopeStatus: {
      type: String,
      enum: ['FINALIZED', 'UNFINALIZED', 'DRAFT'],
      default: 'DRAFT',
    },
    template: { type: TemplateMetadataSchema, required: true },
    sections: [ProposalSectionSchema],
    versions: [ProposalVersionSnapshotSchema],
    activeVersionNumber: { type: Number, required: true, default: 1 },
    readiness: { type: Schema.Types.Mixed },
    submission: {
      type: FacultyReviewRecordSchema,
      required: true,
      default: () => ({ status: 'DRAFT', feedbackHistory: [] }),
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    collection: 'academic_proposals',
  }
)

export const MongoProposalModel =
  mongoose.models.AcademicProposal || mongoose.model<IProposalDoc>('AcademicProposal', ProposalSchema)

function mapProposalDoc(doc: any, fallbackId?: string): IProposal {
  const { _id, ...rest } = doc
  return {
    ...rest,
    id: rest.id || (_id ? _id.toString() : fallbackId),
  } as IProposal
}

// Resilient In-Memory Fallback Store
class InMemoryProposalStore {
  private proposals: Map<string, IProposal> = new Map()

  async findById(id: string): Promise<IProposal | null> {
    const item = this.proposals.get(id)
    return item ? JSON.parse(JSON.stringify(item)) : null
  }

  async findByStudentId(studentId: string): Promise<IProposal[]> {
    const items = Array.from(this.proposals.values()).filter((p) => p.studentId === studentId)
    return JSON.parse(JSON.stringify(items))
  }

  async findForFaculty(): Promise<IProposal[]> {
    const items = Array.from(this.proposals.values()).filter(
      (p) => p.submission && p.submission.status !== 'DRAFT'
    )
    return JSON.parse(JSON.stringify(items))
  }

  async save(proposal: IProposal): Promise<IProposal> {
    this.proposals.set(proposal.id, JSON.parse(JSON.stringify(proposal)))
    return JSON.parse(JSON.stringify(proposal))
  }

  async delete(id: string): Promise<boolean> {
    return this.proposals.delete(id)
  }

  async clear(): Promise<void> {
    this.proposals.clear()
  }
}

export const inMemoryProposalStore = new InMemoryProposalStore()

export const proposalRepository = {
  async findById(id: string): Promise<IProposal | null> {
    if (isMongoConnected()) {
      let doc: any = null
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await MongoProposalModel.findById(id).lean().exec()
      }
      if (!doc) {
        doc = await MongoProposalModel.findOne({
          $or: [{ id }, { projectTitle: id }],
        })
          .lean()
          .exec()
      }
      return doc ? mapProposalDoc(doc, id) : null
    }
    assertPersistenceAvailable('proposals')
    return inMemoryProposalStore.findById(id)
  },

  async findByStudentId(studentId: string): Promise<IProposal[]> {
    if (isMongoConnected()) {
      const docs = await MongoProposalModel.find({ studentId }).sort({ updatedAt: -1 }).lean().exec()
      return docs.map((doc: any) => mapProposalDoc(doc))
    }
    assertPersistenceAvailable('proposals')
    return inMemoryProposalStore.findByStudentId(studentId)
  },

  async findForFaculty(): Promise<IProposal[]> {
    if (isMongoConnected()) {
      const docs = await MongoProposalModel.find({
        'submission.status': { $ne: 'DRAFT' },
      })
        .sort({ updatedAt: -1 })
        .lean()
        .exec()
      return docs.map((doc: any) => mapProposalDoc(doc))
    }
    assertPersistenceAvailable('proposals')
    return inMemoryProposalStore.findForFaculty()
  },

  async save(proposal: IProposal): Promise<IProposal> {
    if (isMongoConnected()) {
      const { id, ...dataToSave } = proposal
      const nowIso = new Date().toISOString()
      let doc: any
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await MongoProposalModel.findByIdAndUpdate(
          id,
          { ...dataToSave, id, updatedAt: nowIso },
          { new: true, upsert: true }
        )
          .lean()
          .exec()
      } else {
        doc = await MongoProposalModel.findOneAndUpdate(
          { id },
          { ...dataToSave, id, updatedAt: nowIso },
          { new: true, upsert: true }
        )
          .lean()
          .exec()
      }
      return mapProposalDoc(doc, id)
    }
    assertPersistenceAvailable('proposals')
    return inMemoryProposalStore.save(proposal)
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const res = await MongoProposalModel.findByIdAndDelete(id).exec()
        if (res) return true
      }
      const res = await MongoProposalModel.deleteOne({ id }).exec()
      return res.deletedCount > 0
    }
    assertPersistenceAvailable('proposals')
    return inMemoryProposalStore.delete(id)
  },
}
