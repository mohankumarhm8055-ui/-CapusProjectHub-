import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import { UserRole } from './user.model.js'

export interface ISessionRecord {
  id: string
  jti: string
  userId: string
  role: UserRole
  expiresAt: Date
  revokedAt?: Date
  userAgent?: string
  createdAt: Date
}

export interface SessionDocument extends Document, Omit<ISessionRecord, 'id'> {}

const SessionSchema = new Schema<SessionDocument>(
  {
    jti: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'auth_sessions',
  }
)

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const MongoSessionModel =
  mongoose.models.AuthSession || mongoose.model<SessionDocument>('AuthSession', SessionSchema)

class InMemorySessionStore {
  private sessions = new Map<string, ISessionRecord>()

  async create(data: Omit<ISessionRecord, 'id' | 'createdAt'>): Promise<ISessionRecord> {
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const record: ISessionRecord = {
      ...data,
      id,
      createdAt: new Date(),
    }
    this.sessions.set(data.jti, record)
    return { ...record }
  }

  async findActiveByJti(jti: string): Promise<ISessionRecord | null> {
    const record = this.sessions.get(jti)
    if (!record) return null
    if (record.revokedAt) return null
    if (record.expiresAt.getTime() <= Date.now()) return null
    return { ...record }
  }

  async revokeByJti(jti: string): Promise<boolean> {
    const record = this.sessions.get(jti)
    if (!record) return false
    record.revokedAt = new Date()
    this.sessions.set(jti, record)
    return true
  }

  async revokeAllForUser(userId: string): Promise<number> {
    let count = 0
    for (const [jti, record] of this.sessions.entries()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = new Date()
        this.sessions.set(jti, record)
        count++
      }
    }
    return count
  }

  clear() {
    this.sessions.clear()
  }
}

export const inMemorySessionStore = new InMemorySessionStore()

function mapSessionDoc(doc: any): ISessionRecord {
  return {
    id: doc._id.toString(),
    jti: doc.jti,
    userId: doc.userId,
    role: doc.role,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt,
  }
}

export const SessionRepository = {
  async create(data: Omit<ISessionRecord, 'id' | 'createdAt'>): Promise<ISessionRecord> {
    if (isMongoConnected()) {
      const doc = await MongoSessionModel.create(data)
      return mapSessionDoc(doc)
    }
    assertPersistenceAvailable('auth sessions')
    return inMemorySessionStore.create(data)
  },

  async findActiveByJti(jti: string): Promise<ISessionRecord | null> {
    if (isMongoConnected()) {
      const doc = await MongoSessionModel.findOne({
        jti,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
        .lean()
        .exec()
      return doc ? mapSessionDoc(doc) : null
    }
    assertPersistenceAvailable('auth sessions')
    return inMemorySessionStore.findActiveByJti(jti)
  },

  async revokeByJti(jti: string): Promise<boolean> {
    if (isMongoConnected()) {
      const res = await MongoSessionModel.findOneAndUpdate(
        { jti, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
        { new: true }
      )
        .lean()
        .exec()
      return !!res
    }
    assertPersistenceAvailable('auth sessions')
    return inMemorySessionStore.revokeByJti(jti)
  },

  async revokeAllForUser(userId: string): Promise<number> {
    if (isMongoConnected()) {
      const res = await MongoSessionModel.updateMany(
        { userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      ).exec()
      return res.modifiedCount
    }
    assertPersistenceAvailable('auth sessions')
    return inMemorySessionStore.revokeAllForUser(userId)
  },
}
