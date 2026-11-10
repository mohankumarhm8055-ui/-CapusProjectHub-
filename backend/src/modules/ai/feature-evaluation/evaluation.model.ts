import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../../config/db.js'

export type FeatureClassification = 'ESSENTIAL' | 'RECOMMENDED' | 'OPTIONAL' | 'UNNECESSARY'

export type DecisionStatus = 'ACCEPTED' | 'REJECTED' | 'MODIFIED'

export type OverallFeasibilityRating =
  | 'FEASIBLE_INITIAL'
  | 'FEASIBLE_REDUCED_SCOPE'
  | 'REQUIRES_RESOURCES_OR_TIME'
  | 'NOT_FEASIBLE'

export interface IProjectConstraints {
  teamSize: number
  technicalExperience: 'beginner' | 'intermediate' | 'advanced'
  developmentWeeks: number
  semesterDeadline: string
  languagesAndFrameworks: string[]
  hardwareResources?: string[]
  budget?: string
  academicRequirements?: string
}

export interface IFeatureDimensions {
  problemRelevance: {
    solvesRealProblem: boolean
    rationale: string
  }
  userValue: {
    primaryBeneficiary: 'student' | 'faculty' | 'both'
    rationale: string
  }
  originality: {
    contributionType: string
    rationale: string
  }
  technicalFeasibility: {
    realisticForTeam: boolean
    rationale: string
  }
  complexity: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    rationale: string
  }
  resourceRequirements: {
    requiredResources: string[]
    rationale: string
  }
  timeSuitability: {
    fitsDeadline: boolean
    estimatedWeeks: number
    rationale: string
  }
}

export interface IEvaluatedFeature {
  featureId: string
  name: string
  classification: FeatureClassification
  dimensions: IFeatureDimensions
  dependencies: string[]
  potentialRisks: string[]
  recommendation: string
  simplerAlternative?: string
  assumptions: string[]
}

export interface IStudentDecision {
  featureId: string
  decision: DecisionStatus
  modifiedScope?: string
  tradeoffNotes?: string
  updatedAt: Date
}

export interface IFinalScope {
  title: string
  problemStatement: string
  coreObjectives: string[]
  essentialFeatures: string[]
  acceptedRecommendedFeatures: string[]
  acceptedOptionalFeatures: string[]
  excludedFeatures: Array<{
    featureName: string
    reason: string
  }>
  technologyStack: string[]
  majorDependencies: string[]
  implementationMilestones: Array<{
    milestone: string
    deliverables: string[]
    durationWeeks: number
  }>
  knownRisks: string[]
  explicitAssumptions: string[]
  status: 'DRAFT' | 'SAVED'
}

export interface IScopeVersion {
  version: number
  scope: IFinalScope
  overallFeasibility: {
    rating: OverallFeasibilityRating
    summary: string
    primaryBottlenecks: string[]
    recommendedReleaseScope: string
  }
  changeSummary: string
  changedBy: string
  createdAt: Date
  isFinalized: boolean
}

export interface IScopeAuditEntry {
  id: string
  timestamp: Date
  action: 'VERSION_CREATED' | 'SCOPE_EDITED' | 'VERSION_RESTORED' | 'SCOPE_FINALIZED' | 'CONSTRAINTS_RE_EVALUATED'
  actor: string
  details: string
}

export interface IEvaluationRecord {
  id: string
  ownerId: string
  projectId?: string
  conversationId?: string
  projectTitle: string
  problemStatement?: string
  coreObjectives?: string[]
  version: number
  constraints: IProjectConstraints
  overallFeasibility: {
    rating: OverallFeasibilityRating
    summary: string
    primaryBottlenecks: string[]
    recommendedReleaseScope: string
  }
  features: IEvaluatedFeature[]
  decisions: IStudentDecision[]
  finalScope?: IFinalScope
  scopeVersions?: IScopeVersion[]
  scopeAuditHistory?: IScopeAuditEntry[]
  isFinalized?: boolean
  finalizedAt?: Date
  finalizedBy?: string
  repositoryComparison?: any
  createdAt: Date
  updatedAt: Date
}

export interface EvaluationDocument extends Document, Omit<IEvaluationRecord, 'id'> {
  _id: mongoose.Types.ObjectId
  externalId?: string
}

const EvaluationSchema = new Schema<EvaluationDocument>(
  {
    externalId: { type: String, unique: true, sparse: true, index: true },
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, index: true },
    conversationId: { type: String, index: true },
    projectTitle: { type: String, required: true, default: 'CampusProjectHub' },
    problemStatement: { type: String },
    coreObjectives: { type: [String], default: [] },
    version: { type: Number, required: true, default: 1 },
    constraints: {
      teamSize: { type: Number, required: true, default: 3 },
      technicalExperience: { type: String, required: true, default: 'intermediate' },
      developmentWeeks: { type: Number, required: true, default: 12 },
      semesterDeadline: { type: String, required: true, default: 'End of Semester' },
      languagesAndFrameworks: { type: [String], default: ['TypeScript', 'React', 'Node.js', 'Express', 'MongoDB'] },
      hardwareResources: { type: [String], default: ['Standard Laptop / Development PC'] },
      budget: { type: String, default: 'Zero-cost / Open-Source Tools' },
      academicRequirements: { type: String, default: 'Mini-Project Rubric: Architecture, Rigor, Working Prototype' },
    },
    overallFeasibility: {
      rating: { type: String, required: true },
      summary: { type: String, required: true },
      primaryBottlenecks: { type: [String], default: [] },
      recommendedReleaseScope: { type: String, required: true },
    },
    features: [
      {
        featureId: { type: String, required: true },
        name: { type: String, required: true },
        classification: { type: String, required: true },
        dimensions: {
          problemRelevance: { solvesRealProblem: Boolean, rationale: String },
          userValue: { primaryBeneficiary: String, rationale: String },
          originality: { contributionType: String, rationale: String },
          technicalFeasibility: { realisticForTeam: Boolean, rationale: String },
          complexity: { level: String, rationale: String },
          resourceRequirements: { requiredResources: [String], rationale: String },
          timeSuitability: { fitsDeadline: Boolean, estimatedWeeks: Number, rationale: String },
        },
        dependencies: [String],
        potentialRisks: [String],
        recommendation: String,
        simplerAlternative: String,
        assumptions: [String],
      },
    ],
    decisions: [
      {
        featureId: { type: String, required: true },
        decision: { type: String, required: true, enum: ['ACCEPTED', 'REJECTED', 'MODIFIED'] },
        modifiedScope: String,
        tradeoffNotes: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    finalScope: {
      title: String,
      problemStatement: String,
      coreObjectives: [String],
      essentialFeatures: [String],
      acceptedRecommendedFeatures: [String],
      acceptedOptionalFeatures: [String],
      excludedFeatures: [{ featureName: String, reason: String }],
      technologyStack: [String],
      majorDependencies: [String],
      implementationMilestones: [
        {
          milestone: String,
          deliverables: [String],
          durationWeeks: Number,
        },
      ],
      knownRisks: [String],
      explicitAssumptions: [String],
      status: { type: String, default: 'DRAFT' },
    },
    scopeVersions: [
      {
        version: { type: Number, required: true },
        scope: Schema.Types.Mixed,
        overallFeasibility: Schema.Types.Mixed,
        changeSummary: String,
        changedBy: String,
        createdAt: { type: Date, default: Date.now },
        isFinalized: { type: Boolean, default: false },
      },
    ],
    scopeAuditHistory: [
      {
        id: String,
        timestamp: { type: Date, default: Date.now },
        action: String,
        actor: String,
        details: String,
      },
    ],
    isFinalized: { type: Boolean, default: false },
    finalizedAt: Date,
    finalizedBy: String,
    repositoryComparison: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
)

EvaluationSchema.index({ ownerId: 1, createdAt: -1 })
EvaluationSchema.index({ conversationId: 1, version: -1 })

export const MongoEvaluationModel = mongoose.model<EvaluationDocument>(
  'FeatureEvaluation',
  EvaluationSchema
)

// In-Memory Evaluation Store for offline/test environments
class InMemoryEvaluationStore {
  private items = new Map<string, IEvaluationRecord>()

  async create(data: Omit<IEvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<IEvaluationRecord> {
    const id = `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date()
    const record: IEvaluationRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.items.set(id, record)
    return record
  }

  async findById(id: string): Promise<IEvaluationRecord | null> {
    return this.items.get(id) || null
  }

  async findByOwner(ownerId: string): Promise<IEvaluationRecord[]> {
    return Array.from(this.items.values())
      .filter((r) => r.ownerId === ownerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async findByConversation(conversationId: string): Promise<IEvaluationRecord[]> {
    return Array.from(this.items.values())
      .filter((r) => r.conversationId === conversationId)
      .sort((a, b) => b.version - a.version)
  }

  async update(id: string, updates: Partial<IEvaluationRecord>): Promise<IEvaluationRecord | null> {
    const existing = this.items.get(id)
    if (!existing) return null
    const updated: IEvaluationRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    }
    this.items.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id)
  }

  async clear(): Promise<void> {
    this.items.clear()
  }

  async save(record: IEvaluationRecord): Promise<IEvaluationRecord> {
    this.items.set(record.id, record)
    return record
  }
}

export const inMemoryEvaluationStore = new InMemoryEvaluationStore()

function mapEvalDoc(doc: any): IEvaluationRecord {
  return {
    id: doc.externalId || doc._id.toString(),
    ownerId: doc.ownerId,
    projectId: doc.projectId,
    conversationId: doc.conversationId,
    projectTitle: doc.projectTitle,
    version: doc.version,
    constraints: doc.constraints,
    overallFeasibility: doc.overallFeasibility as any,
    features: doc.features as any,
    decisions: doc.decisions as any,
    finalScope: doc.finalScope as any,
    scopeVersions: (doc as any).scopeVersions || [],
    scopeAuditHistory: (doc as any).scopeAuditHistory || [],
    isFinalized: (doc as any).isFinalized || false,
    finalizedAt: (doc as any).finalizedAt,
    finalizedBy: (doc as any).finalizedBy,
    repositoryComparison: (doc as any).repositoryComparison,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const EvaluationRepository = {
  async create(data: Omit<IEvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<IEvaluationRecord> {
    if (isMongoConnected()) {
      const doc = await MongoEvaluationModel.create(data)
      return mapEvalDoc(doc)
    }
    assertPersistenceAvailable('feature evaluations')
    return inMemoryEvaluationStore.create(data)
  },

  async findById(id: string): Promise<IEvaluationRecord | null> {
    if (isMongoConnected()) {
      const doc = mongoose.Types.ObjectId.isValid(id)
        ? await MongoEvaluationModel.findOne({ $or: [{ _id: id }, { externalId: id }] })
        : await MongoEvaluationModel.findOne({ externalId: id })
      if (!doc) return null
      return mapEvalDoc(doc)
    }
    assertPersistenceAvailable('feature evaluations')
    return inMemoryEvaluationStore.findById(id)
  },

  async findLatestByConversation(conversationId: string): Promise<IEvaluationRecord | null> {
    if (isMongoConnected()) {
      const doc = await MongoEvaluationModel.findOne({ conversationId }).sort({ version: -1 })
      if (!doc) return null
      return mapEvalDoc(doc)
    }
    assertPersistenceAvailable('feature evaluations')
    const list = await inMemoryEvaluationStore.findByConversation(conversationId)
    return list[0] || null
  },

  async update(id: string, updates: Partial<IEvaluationRecord>): Promise<IEvaluationRecord | null> {
    if (isMongoConnected()) {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { externalId: id }] }
        : { externalId: id }
      const doc = await MongoEvaluationModel.findOneAndUpdate(query, { $set: updates }, { new: true })
      if (!doc) return null
      return mapEvalDoc(doc)
    }
    assertPersistenceAvailable('feature evaluations')
    return inMemoryEvaluationStore.update(id, updates)
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoConnected()) {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { externalId: id }] }
        : { externalId: id }
      const res = await MongoEvaluationModel.findOneAndDelete(query)
      return !!res
    }
    assertPersistenceAvailable('feature evaluations')
    return inMemoryEvaluationStore.delete(id)
  },

  async save(record: IEvaluationRecord): Promise<IEvaluationRecord> {
    if (isMongoConnected()) {
      const { id, ...data } = record
      if (mongoose.Types.ObjectId.isValid(id)) {
        const doc = await MongoEvaluationModel.findByIdAndUpdate(id, { $set: data }, { upsert: true, new: true })
        return mapEvalDoc(doc)
      }
      const doc = await MongoEvaluationModel.findOneAndUpdate(
        { externalId: id },
        { $set: { ...data, externalId: id } },
        { upsert: true, new: true }
      )
      return mapEvalDoc(doc)
    }
    assertPersistenceAvailable('feature evaluations')
    return inMemoryEvaluationStore.save(record)
  },
}
