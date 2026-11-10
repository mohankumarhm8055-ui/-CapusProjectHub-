import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import { IConversationContext } from './conversational-engine/context.types.js'

export interface IConversation {
  id: string
  ownerId: string
  title: string
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  context?: IConversationContext
}

export interface ConversationDocument extends Document, Omit<IConversation, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: 'New Academic Consultation', trim: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    context: { type: Schema.Types.Mixed, default: undefined },
  },
  {
    timestamps: true,
  }
)

ConversationSchema.index({ ownerId: 1, lastMessageAt: -1 })

export const MongoConversationModel = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema
)

// In-Memory Fallback Store (Used when local MongoDB daemon is not running)
class InMemoryConversationStore {
  private items = new Map<string, IConversation>()

  async create(data: { ownerId: string; title?: string }): Promise<IConversation> {
    const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date()
    const conv: IConversation = {
      id,
      ownerId: data.ownerId,
      title: data.title || 'New Academic Consultation',
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    }
    this.items.set(id, conv)
    return conv
  }

  async findByOwner(ownerId: string): Promise<IConversation[]> {
    const list = Array.from(this.items.values()).filter((c) => c.ownerId === ownerId)
    return list.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
  }

  async findById(id: string): Promise<IConversation | null> {
    return this.items.get(id) || null
  }

  async update(id: string, updates: Partial<IConversation>): Promise<IConversation | null> {
    const item = this.items.get(id)
    if (!item) return null
    const updated: IConversation = {
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

  async clear(): Promise<void> {
    this.items.clear()
  }
}

export const inMemoryConversationStore = new InMemoryConversationStore()

export const ConversationRepository = {
  async create(ownerId: string, title?: string): Promise<IConversation> {
    if (isMongoConnected()) {
      const doc = await MongoConversationModel.create({ ownerId, title })
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastMessageAt: doc.lastMessageAt,
        context: (doc as any).context,
      }
    }
    assertPersistenceAvailable()
    return inMemoryConversationStore.create({ ownerId, title })
  },

  async findByOwner(ownerId: string): Promise<IConversation[]> {
    if (isMongoConnected()) {
      const docs = await MongoConversationModel.find({ ownerId }).sort({ lastMessageAt: -1 })
      return docs.map((doc) => ({
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastMessageAt: doc.lastMessageAt,
        context: (doc as any).context,
      }))
    }
    assertPersistenceAvailable()
    return inMemoryConversationStore.findByOwner(ownerId)
  },

  async findById(id: string): Promise<IConversation | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoConversationModel.findById(id)
      if (!doc) return null
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastMessageAt: doc.lastMessageAt,
        context: (doc as any).context,
      }
    }
    assertPersistenceAvailable()
    return inMemoryConversationStore.findById(id)
  },

  async update(id: string, updates: Partial<IConversation>): Promise<IConversation | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoConversationModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      )
      if (!doc) return null
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastMessageAt: doc.lastMessageAt,
        context: (doc as any).context,
      }
    }
    assertPersistenceAvailable()
    return inMemoryConversationStore.update(id, updates)
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return false
      const res = await MongoConversationModel.findByIdAndDelete(id)
      return !!res
    }
    assertPersistenceAvailable()
    return inMemoryConversationStore.delete(id)
  },
}
