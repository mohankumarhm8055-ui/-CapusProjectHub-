import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'

export type UserRole = 'student' | 'faculty' | 'admin'

export interface IUser {
  id: string
  email: string
  passwordHash: string
  role: UserRole
  fullName: string
  usnOrEmployeeId?: string
  department?: string
  semesterOrDesignation?: string
  collegeName?: string
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IPublicUser {
  id: string
  email: string
  role: UserRole
  fullName: string
  usnOrEmployeeId?: string
  department?: string
  semesterOrDesignation?: string
  collegeName?: string
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
}

export function toPublicUser(user: IUser): IPublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    usnOrEmployeeId: user.usnOrEmployeeId,
    department: user.department,
    semesterOrDesignation: user.semesterOrDesignation,
    collegeName: user.collegeName,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}

export interface UserDocument extends Document, Omit<IUser, 'id'> {}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'faculty', 'admin'], required: true, default: 'student', index: true },
    fullName: { type: String, required: true, trim: true },
    usnOrEmployeeId: { type: String, trim: true },
    department: { type: String, trim: true },
    semesterOrDesignation: { type: String, trim: true },
    collegeName: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'users',
  }
)

export const MongoUserModel =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema)

class InMemoryUserStore {
  private users = new Map<string, IUser>()

  async create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const email = data.email.toLowerCase().trim()
    for (const u of this.users.values()) {
      if (u.email === email) {
        const err: any = new Error('An account with this email already exists.')
        err.statusCode = 409
        err.code = 'EMAIL_ALREADY_EXISTS'
        throw err
      }
    }
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date()
    const user: IUser = {
      ...data,
      email,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.users.set(id, user)
    return { ...user }
  }

  async findById(id: string): Promise<IUser | null> {
    const user = this.users.get(id)
    return user ? { ...user } : null
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const normalized = email.toLowerCase().trim()
    for (const u of this.users.values()) {
      if (u.email === normalized) return { ...u }
    }
    return null
  }

  async listAll(): Promise<IUser[]> {
    return Array.from(this.users.values()).map((u) => ({ ...u }))
  }

  async updateById(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const existing = this.users.get(id)
    if (!existing) return null
    const updated: IUser = { ...existing, ...updates, id, updatedAt: new Date() }
    this.users.set(id, updated)
    return { ...updated }
  }

  clear() {
    this.users.clear()
  }
}

export const inMemoryUserStore = new InMemoryUserStore()

function mapUserDoc(doc: any): IUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    fullName: doc.fullName,
    usnOrEmployeeId: doc.usnOrEmployeeId,
    department: doc.department,
    semesterOrDesignation: doc.semesterOrDesignation,
    collegeName: doc.collegeName,
    isActive: doc.isActive !== false,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const UserRepository = {
  async create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    if (isMongoConnected()) {
      const normalizedEmail = data.email.toLowerCase().trim()
      const existing = await MongoUserModel.findOne({ email: normalizedEmail }).lean().exec()
      if (existing) {
        const err: any = new Error('An account with this email already exists.')
        err.statusCode = 409
        err.code = 'EMAIL_ALREADY_EXISTS'
        throw err
      }
      const doc = await MongoUserModel.create({ ...data, email: normalizedEmail })
      return mapUserDoc(doc)
    }
    assertPersistenceAvailable('user accounts')
    return inMemoryUserStore.create(data)
  },

  async findById(id: string): Promise<IUser | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoUserModel.findById(id).lean().exec()
      return doc ? mapUserDoc(doc) : null
    }
    assertPersistenceAvailable('user accounts')
    return inMemoryUserStore.findById(id)
  },

  async findByEmail(email: string): Promise<IUser | null> {
    const normalized = email.toLowerCase().trim()
    if (isMongoConnected()) {
      const doc = await MongoUserModel.findOne({ email: normalized }).lean().exec()
      return doc ? mapUserDoc(doc) : null
    }
    assertPersistenceAvailable('user accounts')
    return inMemoryUserStore.findByEmail(normalized)
  },

  async listAll(): Promise<IUser[]> {
    if (isMongoConnected()) {
      const docs = await MongoUserModel.find({}).sort({ createdAt: -1 }).lean().exec()
      return docs.map(mapUserDoc)
    }
    assertPersistenceAvailable('user accounts')
    return inMemoryUserStore.listAll()
  },

  async updateById(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoUserModel.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      )
        .lean()
        .exec()
      return doc ? mapUserDoc(doc) : null
    }
    assertPersistenceAvailable('user accounts')
    return inMemoryUserStore.updateById(id, updates)
  },
}
