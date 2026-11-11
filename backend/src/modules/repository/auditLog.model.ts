import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'

export type AuditAction =
  | 'PROJECT_CREATED'
  | 'PROJECT_INGESTED'
  | 'STATUS_UPDATED'
  | 'SUBMISSION_EDITED'
  | 'VERIFIED_HISTORICAL'
  | 'SUBMITTED_TO_FACULTY'
  | 'FACULTY_APPROVED'
  | 'FACULTY_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'PROJECT_DELETED'
  | 'FINAL_COMPLETION_APPROVED'
  | 'PUBLICATION_DRAFT_SAVED'
  | 'PROJECT_PUBLISHED'
  | 'PROJECT_UNPUBLISHED'
  | 'PROJECT_ARCHIVED'

export interface IAuditLog {
  id?: string
  projectId: string
  action: AuditAction
  actorId: string
  actorRole: string
  actorName?: string
  previousStatus?: string
  newStatus?: string
  notes?: string
  timestamp: Date
}

export interface AuditLogDocument extends Document, Omit<IAuditLog, 'id'> {
  _id: mongoose.Types.ObjectId
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    projectId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actorName: { type: String },
    previousStatus: { type: String },
    newStatus: { type: String },
    notes: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
)

AuditLogSchema.index({ projectId: 1, timestamp: -1 })

export const MongoAuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema)

class InMemoryAuditLogStore {
  private logs: IAuditLog[] = []

  async record(entry: IAuditLog): Promise<IAuditLog> {
    const item = { ...entry, id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` }
    this.logs.push(item)
    return item
  }

  async findByProject(projectId: string): Promise<IAuditLog[]> {
    return this.logs
      .filter((l) => l.projectId === projectId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  async clear(): Promise<void> {
    this.logs = []
  }
}

export const inMemoryAuditLogStore = new InMemoryAuditLogStore()

export const AuditLogRepository = {
  async record(entry: Omit<IAuditLog, 'id' | 'timestamp'> & { timestamp?: Date }): Promise<IAuditLog> {
    const timestamp = entry.timestamp || new Date()
    const logItem: IAuditLog = { ...entry, timestamp }

    if (isMongoConnected()) {
      const doc = await MongoAuditLogModel.create(logItem)
      return {
        ...logItem,
        id: doc._id.toString(),
      }
    }
    assertPersistenceAvailable()
    return inMemoryAuditLogStore.record(logItem)
  },

  async findByProject(projectId: string): Promise<IAuditLog[]> {
    if (isMongoConnected()) {
      const docs = await MongoAuditLogModel.find({ projectId }).sort({ timestamp: -1 })
      return docs.map((d) => ({
        id: d._id.toString(),
        projectId: d.projectId,
        action: d.action as AuditAction,
        actorId: d.actorId,
        actorRole: d.actorRole,
        actorName: d.actorName,
        previousStatus: d.previousStatus,
        newStatus: d.newStatus,
        notes: d.notes,
        timestamp: d.timestamp,
      }))
    }
    assertPersistenceAvailable()
    return inMemoryAuditLogStore.findByProject(projectId)
  },
}
