import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../../config/db.js'
import type { IComparisonSession } from './comparison.types.js'

export interface ComparisonSessionDocument extends Document, Omit<IComparisonSession, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ComparisonSessionSchema = new Schema<ComparisonSessionDocument>(
  {
    ownerId: { type: String, required: true, index: true },
    conversationId: { type: String, index: true },
    proposedTitle: { type: String, required: true, trim: true },
    proposedDescription: { type: String, required: true },
    proposedFeatures: { type: [String], default: [] },
    proposedTechnologies: { type: [String], default: [] },
    constraintsSnapshot: { type: Schema.Types.Mixed, default: {} },
    retrievedProjectIds: { type: [String], default: [] },
    report: { type: Schema.Types.Mixed, required: true },
    studentDecisions: { type: Schema.Types.Mixed, default: [] },
    finalContributionStatement: { type: String },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    collection: 'ai_comparison_sessions',
  }
)

ComparisonSessionSchema.index({ ownerId: 1, updatedAt: -1 })

export const MongoComparisonSessionModel =
  mongoose.models.AIComparisonSession ||
  mongoose.model<ComparisonSessionDocument>('AIComparisonSession', ComparisonSessionSchema)

export const inMemoryComparisonSessionStore = new Map<string, IComparisonSession>()

function mapDoc(doc: ComparisonSessionDocument): IComparisonSession {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    conversationId: doc.conversationId,
    proposedTitle: doc.proposedTitle,
    proposedDescription: doc.proposedDescription,
    proposedFeatures: doc.proposedFeatures || [],
    proposedTechnologies: doc.proposedTechnologies || [],
    constraintsSnapshot: doc.constraintsSnapshot || {},
    retrievedProjectIds: doc.retrievedProjectIds || [],
    report: doc.report,
    studentDecisions: doc.studentDecisions || [],
    finalContributionStatement: doc.finalContributionStatement,
    version: doc.version || 1,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const ComparisonSessionRepository = {
  async create(
    data: Omit<IComparisonSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IComparisonSession> {
    if (isMongoConnected()) {
      const doc = await MongoComparisonSessionModel.create(data)
      return mapDoc(doc)
    }

    assertPersistenceAvailable('project comparison sessions')
    const now = new Date()
    const created: IComparisonSession = {
      ...data,
      id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    }
    inMemoryComparisonSessionStore.set(created.id, created)
    return created
  },

  async findById(id: string): Promise<IComparisonSession | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoComparisonSessionModel.findById(id)
      return doc ? mapDoc(doc) : null
    }

    assertPersistenceAvailable('project comparison sessions')
    return inMemoryComparisonSessionStore.get(id) || null
  },

  async listByOwner(ownerId: string, limit = 20): Promise<IComparisonSession[]> {
    if (isMongoConnected()) {
      const docs = await MongoComparisonSessionModel.find({ ownerId })
        .sort({ updatedAt: -1 })
        .limit(limit)
      return docs.map(mapDoc)
    }

    assertPersistenceAvailable('project comparison sessions')
    return Array.from(inMemoryComparisonSessionStore.values())
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
  },

  async update(
    id: string,
    updates: Partial<IComparisonSession>
  ): Promise<IComparisonSession | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoComparisonSessionModel.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      )
      return doc ? mapDoc(doc) : null
    }

    assertPersistenceAvailable('project comparison sessions')
    const existing = inMemoryComparisonSessionStore.get(id)
    if (!existing) return null
    const updated: IComparisonSession = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    }
    inMemoryComparisonSessionStore.set(id, updated)
    return updated
  },
}
