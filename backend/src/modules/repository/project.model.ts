import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'

export type SourceType = 'ADMIN_IMPORTED_HISTORICAL' | 'STUDENT_SUBMISSION'

export type ReviewStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'

export type VerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED_HISTORICAL'
  | 'FACULTY_APPROVED'

export type RepositoryPublicationStatus =
  | 'NOT_PUBLISHED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'ARCHIVED'

export interface IProjectModule {
  name: string
  description: string
  features?: string[]
}

export interface ITechnologyItem {
  name: string
  category?: string
}

export interface ITeamMember {
  studentId?: string
  name: string
  role?: string
  department?: string
  email?: string
  isLeader?: boolean
  isAvailableForMentoring?: boolean
}

export interface IFacultyGuide {
  name: string
  designation?: string
  department?: string
  officialEmail?: string
}

export interface IScreenshot {
  url: string
  caption?: string
}

export interface IReportDocument {
  title: string
  fileUrl: string
  fileType?: string
  verified?: boolean
  extractedText?: string
}

export interface IChangeRequest {
  requestedAt: Date
  requestedBy: string
  notes: string
}

export interface IProject {
  id: string
  title: string
  slug: string
  abstract: string
  introduction?: string
  problemStatement: string
  objectives: string[]
  existingSystem?: string
  proposedSystem?: string
  solution?: string
  proposedSolution?: string
  scope?: string
  category?: string
  features: string[]
  modules: IProjectModule[]
  architecture?: {
    description?: string
    diagramUrl?: string
  }
  technologyStack: ITechnologyItem[]
  methodology?: string
  limitations?: string[]
  challenges?: string[]
  learningOutcomes?: string[]
  futureEnhancements?: string[]
  references?: string[]
  academicYear: string
  batch?: string
  semester?: string
  department: string
  collegeId: string
  teamId?: string
  teamMembers: ITeamMember[]
  facultyGuide: IFacultyGuide
  screenshots: IScreenshot[]
  reportDocuments: IReportDocument[]
  demoUrl?: string
  githubUrl?: string
  documentationUrl?: string
  videoUrl?: string
  sourceType: SourceType
  reviewStatus: ReviewStatus
  verificationStatus: VerificationStatus
  publicationStatus?: RepositoryPublicationStatus
  sourceScheduleId?: string
  publishedBy?: string
  publishedAt?: Date
  unpublishedReason?: string
  publishedAssetFileIds?: string[]
  uploadedBy: string
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  changeRequests?: IChangeRequest[]
  embedding?: number[]
  createdAt: Date
  updatedAt: Date
}

export interface ProjectDocument extends Document, Omit<IProject, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ProjectSchema = new Schema<ProjectDocument>(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, trim: true, index: true },
    abstract: { type: String, required: true, trim: true },
    introduction: { type: String, trim: true },
    problemStatement: { type: String, required: true, trim: true },
    objectives: [{ type: String, trim: true }],
    existingSystem: { type: String, trim: true },
    proposedSystem: { type: String, trim: true },
    solution: { type: String, trim: true },
    proposedSolution: { type: String, trim: true },
    scope: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    features: [{ type: String, trim: true }],
    modules: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        features: [{ type: String }],
      },
    ],
    architecture: {
      description: { type: String },
      diagramUrl: { type: String },
    },
    technologyStack: [
      {
        name: { type: String, required: true },
        category: { type: String },
      },
    ],
    methodology: { type: String },
    limitations: [{ type: String }],
    challenges: [{ type: String }],
    learningOutcomes: [{ type: String }],
    futureEnhancements: [{ type: String }],
    references: [{ type: String }],
    academicYear: { type: String, required: true, index: true },
    batch: { type: String },
    semester: { type: String },
    department: { type: String, required: true, index: true },
    collegeId: { type: String, required: true, index: true, default: 'rvce-main' },
    teamId: { type: String },
    teamMembers: [
      {
        studentId: { type: String },
        name: { type: String, required: true },
        role: { type: String },
        department: { type: String },
        email: { type: String },
        isLeader: { type: Boolean, default: false },
        isAvailableForMentoring: { type: Boolean, default: false },
      },
    ],
    facultyGuide: {
      name: { type: String, required: true },
      designation: { type: String },
      department: { type: String },
      officialEmail: { type: String },
    },
    screenshots: [
      {
        url: { type: String, required: true },
        caption: { type: String },
      },
    ],
    reportDocuments: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String },
        verified: { type: Boolean, default: false },
        extractedText: { type: String },
      },
    ],
    demoUrl: { type: String },
    githubUrl: { type: String },
    documentationUrl: { type: String },
    videoUrl: { type: String },
    sourceType: {
      type: String,
      enum: ['ADMIN_IMPORTED_HISTORICAL', 'STUDENT_SUBMISSION'],
      required: true,
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
      required: true,
      default: 'DRAFT',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'VERIFIED_HISTORICAL', 'FACULTY_APPROVED'],
      required: true,
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    publicationStatus: {
      type: String,
      enum: ['NOT_PUBLISHED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
      index: true,
    },
    sourceScheduleId: { type: String, index: true },
    publishedBy: { type: String },
    publishedAt: { type: Date },
    unpublishedReason: { type: String },
    publishedAssetFileIds: [{ type: String }],
    uploadedBy: { type: String, required: true },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    changeRequests: [
      {
        requestedAt: { type: Date, default: Date.now },
        requestedBy: { type: String, required: true },
        notes: { type: String, required: true },
      },
    ],
    embedding: [{ type: Number }],
  },
  {
    timestamps: true,
  }
)

// Compound and text indexes for fast search
ProjectSchema.index({ collegeId: 1, department: 1, academicYear: 1 })
ProjectSchema.index({ reviewStatus: 1, verificationStatus: 1 })
ProjectSchema.index(
  {
    title: 'text',
    abstract: 'text',
    problemStatement: 'text',
    features: 'text',
    'modules.name': 'text',
    'modules.description': 'text',
    'technologyStack.name': 'text',
  },
  {
    weights: {
      title: 10,
      features: 5,
      problemStatement: 4,
      abstract: 3,
      'technologyStack.name': 2,
    },
    name: 'ProjectTextIndex',
  }
)

export const MongoProjectModel = mongoose.model<ProjectDocument>('Project', ProjectSchema)

// In-Memory Repository Store
class InMemoryProjectStore {
  private items = new Map<string, IProject>()

  async create(data: Omit<IProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<IProject> {
    const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date()
    const proj: IProject = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.items.set(id, proj)
    return proj
  }

  async findById(id: string): Promise<IProject | null> {
    return this.items.get(id) || null
  }

  async find(filter: (p: IProject) => boolean): Promise<IProject[]> {
    return Array.from(this.items.values()).filter(filter)
  }

  async update(id: string, updates: Partial<IProject>): Promise<IProject | null> {
    const item = this.items.get(id)
    if (!item) return null
    const updated: IProject = {
      ...item,
      ...updates,
      updatedAt: new Date(),
    }
    this.items.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id)
  }

  async count(): Promise<number> {
    return this.items.size
  }

  async clear(): Promise<void> {
    this.items.clear()
  }
}

export const inMemoryProjectStore = new InMemoryProjectStore()

export function mapProjectDoc(doc: any): IProject {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    title: doc.title,
    slug: doc.slug,
    abstract: doc.abstract,
    introduction: doc.introduction,
    problemStatement: doc.problemStatement,
    objectives: doc.objectives || [],
    existingSystem: doc.existingSystem,
    proposedSystem: doc.proposedSystem,
    solution: doc.solution,
    proposedSolution: doc.proposedSolution || doc.solution || doc.proposedSystem,
    scope: doc.scope,
    category: doc.category,
    features: doc.features || [],
    modules: doc.modules || [],
    architecture: doc.architecture,
    technologyStack: doc.technologyStack || [],
    methodology: doc.methodology,
    limitations: doc.limitations || [],
    challenges: doc.challenges || [],
    learningOutcomes: doc.learningOutcomes || [],
    futureEnhancements: doc.futureEnhancements || [],
    references: doc.references || [],
    academicYear: doc.academicYear,
    batch: doc.batch,
    semester: doc.semester,
    department: doc.department,
    collegeId: doc.collegeId,
    teamId: doc.teamId,
    teamMembers: doc.teamMembers || [],
    facultyGuide: doc.facultyGuide,
    screenshots: doc.screenshots || [],
    reportDocuments: doc.reportDocuments || [],
    demoUrl: doc.demoUrl,
    githubUrl: doc.githubUrl,
    documentationUrl: doc.documentationUrl,
    videoUrl: doc.videoUrl,
    sourceType: doc.sourceType,
    reviewStatus: doc.reviewStatus,
    verificationStatus: doc.verificationStatus,
    publicationStatus: doc.publicationStatus,
    sourceScheduleId: doc.sourceScheduleId,
    publishedBy: doc.publishedBy,
    publishedAt: doc.publishedAt,
    unpublishedReason: doc.unpublishedReason,
    publishedAssetFileIds: doc.publishedAssetFileIds || [],
    uploadedBy: doc.uploadedBy,
    approvedBy: doc.approvedBy,
    approvedAt: doc.approvedAt,
    rejectionReason: doc.rejectionReason,
    changeRequests: doc.changeRequests,
    embedding: doc.embedding,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const ProjectRepository = {
  async create(data: Omit<IProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<IProject> {
    if (isMongoConnected()) {
      const doc = await MongoProjectModel.create(data)
      return mapProjectDoc(doc)
    }
    assertPersistenceAvailable('project repository')
    return inMemoryProjectStore.create(data)
  },

  async findById(id: string): Promise<IProject | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoProjectModel.findById(id)
      if (!doc) return null
      return mapProjectDoc(doc)
    }
    assertPersistenceAvailable('project repository')
    return inMemoryProjectStore.findById(id)
  },

  async update(id: string, updates: Partial<IProject>): Promise<IProject | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoProjectModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      )
      if (!doc) return null
      return mapProjectDoc(doc)
    }
    assertPersistenceAvailable('project repository')
    return inMemoryProjectStore.update(id, updates)
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return false
      const res = await MongoProjectModel.findByIdAndDelete(id)
      return !!res
    }
    assertPersistenceAvailable('project repository')
    return inMemoryProjectStore.delete(id)
  },

  async getAllAccessible(collegeId?: string): Promise<IProject[]> {
    if (isMongoConnected()) {
      const filter: any = {
        publicationStatus: { $nin: ['NOT_PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'] },
        $or: [
          { verificationStatus: 'VERIFIED_HISTORICAL' },
          { verificationStatus: 'FACULTY_APPROVED', reviewStatus: 'APPROVED' },
        ],
      }
      if (collegeId) filter.collegeId = collegeId
      const docs = await MongoProjectModel.find(filter).sort({ createdAt: -1 })
      return docs.map(mapProjectDoc)
    }
    assertPersistenceAvailable('project repository')
    return inMemoryProjectStore.find((p) => {
      const blocked =
        p.publicationStatus === 'NOT_PUBLISHED' ||
        p.publicationStatus === 'UNPUBLISHED' ||
        p.publicationStatus === 'ARCHIVED'
      const verified =
        !blocked &&
        (p.verificationStatus === 'VERIFIED_HISTORICAL' ||
          (p.verificationStatus === 'FACULTY_APPROVED' && p.reviewStatus === 'APPROVED'))
      return verified && (!collegeId || p.collegeId === collegeId)
    })
  },

  async findByTitleExact(title: string): Promise<IProject | null> {
    if (isMongoConnected()) {
      const doc = await MongoProjectModel.findOne({
        title: { $regex: new RegExp(`^${title.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      })
      if (!doc) return null
      return mapProjectDoc(doc)
    }
    assertPersistenceAvailable('project repository')
    const target = title.trim().toLowerCase()
    const matches = await inMemoryProjectStore.find((p: IProject) => p.title.trim().toLowerCase() === target)
    return matches[0] || null
  },
}
