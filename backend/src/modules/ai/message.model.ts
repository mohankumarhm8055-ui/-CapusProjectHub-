import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'

export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'pending' | 'completed' | 'failed' | 'interrupted'

export interface IMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: Date
  providerMetadata?: {
    provider?: string
    model?: string
    tokensUsed?: number
    responseLatencyMs?: number
    retrievalLatencyMs?: number
    retrievedRecordsCount?: number
    retrievalFailed?: boolean
  }
}

export interface MessageDocument extends Document, Omit<IMessage, 'id'> {
  _id: mongoose.Types.ObjectId
}

const MessageSchema = new Schema<MessageDocument>(
  {
    conversationId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'interrupted'],
      default: 'completed',
    },
    providerMetadata: {
      provider: { type: String },
      model: { type: String },
      tokensUsed: { type: Number },
      responseLatencyMs: { type: Number },
      retrievalLatencyMs: { type: Number },
      retrievedRecordsCount: { type: Number },
      retrievalFailed: { type: Boolean },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

MessageSchema.index({ conversationId: 1, createdAt: 1 })

export const MongoMessageModel = mongoose.model<MessageDocument>('Message', MessageSchema)

// In-Memory Fallback Message Store
class InMemoryMessageStore {
  private items: IMessage[] = []

  async create(data: Omit<IMessage, 'id' | 'createdAt'>): Promise<IMessage> {
    const msg: IMessage = {
      ...data,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date(),
    }
    this.items.push(msg)
    return msg
  }

  async findByConversation(conversationId: string): Promise<IMessage[]> {
    return this.items
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async deleteByConversation(conversationId: string): Promise<number> {
    const initialLen = this.items.length
    this.items = this.items.filter((m) => m.conversationId !== conversationId)
    return initialLen - this.items.length
  }

  async updateStatus(id: string, status: MessageStatus, content?: string): Promise<IMessage | null> {
    const item = this.items.find((m) => m.id === id)
    if (!item) return null
    item.status = status
    if (content !== undefined) item.content = content
    return item
  }

  async clear(): Promise<void> {
    this.items = []
  }
}

export const inMemoryMessageStore = new InMemoryMessageStore()

export const MessageRepository = {
  async create(data: Omit<IMessage, 'id' | 'createdAt'>): Promise<IMessage> {
    if (isMongoConnected()) {
      const doc = await MongoMessageModel.create(data)
      return {
        id: doc._id.toString(),
        conversationId: doc.conversationId,
        role: doc.role as MessageRole,
        content: doc.content,
        status: doc.status as MessageStatus,
        createdAt: doc.createdAt,
        providerMetadata: doc.providerMetadata,
      }
    }
    assertPersistenceAvailable()
    return inMemoryMessageStore.create(data)
  },

  async findByConversation(conversationId: string): Promise<IMessage[]> {
    if (isMongoConnected()) {
      const docs = await MongoMessageModel.find({ conversationId }).sort({ createdAt: 1 })
      return docs.map((doc) => ({
        id: doc._id.toString(),
        conversationId: doc.conversationId,
        role: doc.role as MessageRole,
        content: doc.content,
        status: doc.status as MessageStatus,
        createdAt: doc.createdAt,
        providerMetadata: doc.providerMetadata,
      }))
    }
    assertPersistenceAvailable()
    return inMemoryMessageStore.findByConversation(conversationId)
  },

  async deleteByConversation(conversationId: string): Promise<number> {
    if (isMongoConnected()) {
      const res = await MongoMessageModel.deleteMany({ conversationId })
      return res.deletedCount || 0
    }
    assertPersistenceAvailable()
    return inMemoryMessageStore.deleteByConversation(conversationId)
  },

  async updateStatus(id: string, status: MessageStatus, content?: string): Promise<IMessage | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const updateData: any = { status }
      if (content !== undefined) updateData.content = content
      const doc = await MongoMessageModel.findByIdAndUpdate(id, updateData, { new: true })
      if (!doc) return null
      return {
        id: doc._id.toString(),
        conversationId: doc.conversationId,
        role: doc.role as MessageRole,
        content: doc.content,
        status: doc.status as MessageStatus,
        createdAt: doc.createdAt,
        providerMetadata: doc.providerMetadata,
      }
    }
    assertPersistenceAvailable()
    return inMemoryMessageStore.updateStatus(id, status, content)
  },
}
