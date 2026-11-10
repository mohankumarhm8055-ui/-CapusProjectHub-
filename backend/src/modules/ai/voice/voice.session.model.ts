import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../../config/db.js'
import { IVoiceSession, VoiceSessionState, SpokenLanguage, VoiceTranscriptTurn } from './voice.types.js'

export interface VoiceSessionDocument extends Document, Omit<IVoiceSession, 'id'> {
  _id: mongoose.Types.ObjectId
}

const VALID_TRANSITIONS: Record<VoiceSessionState, VoiceSessionState[]> = {
  idle: ['connecting', 'ended', 'error'],
  connecting: ['listening', 'reconnecting', 'ended', 'error'],
  listening: ['processing', 'interrupted', 'reconnecting', 'ended', 'error'],
  processing: ['speaking', 'listening', 'interrupted', 'reconnecting', 'ended', 'error'],
  speaking: ['interrupted', 'listening', 'reconnecting', 'ended', 'error'],
  interrupted: ['listening', 'ended', 'error'],
  reconnecting: ['listening', 'ended', 'error'],
  ended: [],
  error: ['reconnecting', 'listening', 'ended'],
}

export function isValidStateTransition(from: VoiceSessionState, to: VoiceSessionState): boolean {
  if (from === to) return true
  const allowed = VALID_TRANSITIONS[from] || []
  return allowed.includes(to)
}

const VoiceSessionSchema = new Schema<VoiceSessionDocument>(
  {
    ownerId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    state: {
      type: String,
      required: true,
      enum: ['idle', 'connecting', 'listening', 'processing', 'speaking', 'interrupted', 'reconnecting', 'ended', 'error'],
      default: 'connecting',
    },
    language: {
      type: String,
      required: true,
      enum: ['auto', 'en', 'kn', 'hi'],
      default: 'auto',
    },
    lastActivityAt: { type: Date, default: Date.now },
    transcriptTurns: [
      {
        turnId: { type: String, required: true },
        speaker: { type: String, required: true, enum: ['user', 'assistant'] },
        text: { type: String, required: true },
        timestamp: { type: String, required: true },
        language: { type: String, required: true },
        durationMs: { type: Number },
        audioUrl: { type: String },
        interrupted: { type: Boolean, default: false },
      },
    ],
    currentAudioUrl: { type: String },
    lastInterruptionAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

VoiceSessionSchema.index({ ownerId: 1, conversationId: 1, state: 1 })

export const MongoVoiceSessionModel = mongoose.model<VoiceSessionDocument>(
  'VoiceSession',
  VoiceSessionSchema
)

// In-Memory Fallback Store
class InMemoryVoiceSessionStore {
  private items = new Map<string, IVoiceSession>()

  async create(data: {
    ownerId: string
    conversationId: string
    language?: SpokenLanguage
  }): Promise<IVoiceSession> {
    const id = `vsession-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date()
    const session: IVoiceSession = {
      id,
      ownerId: data.ownerId,
      conversationId: data.conversationId,
      state: 'connecting',
      language: data.language || 'auto',
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      transcriptTurns: [],
    }
    this.items.set(id, session)
    return session
  }

  async findById(id: string): Promise<IVoiceSession | null> {
    return this.items.get(id) || null
  }

  async findActiveByConversation(conversationId: string, ownerId: string): Promise<IVoiceSession | null> {
    const active = Array.from(this.items.values()).find(
      (s) =>
        s.conversationId === conversationId &&
        s.ownerId === ownerId &&
        s.state !== 'ended' &&
        s.state !== 'error'
    )
    return active || null
  }

  async update(id: string, updates: Partial<IVoiceSession>): Promise<IVoiceSession | null> {
    const item = this.items.get(id)
    if (!item) return null

    if (updates.state && !isValidStateTransition(item.state, updates.state)) {
      throw new Error(`Invalid voice state transition from '${item.state}' to '${updates.state}'`)
    }

    const updated: IVoiceSession = {
      ...item,
      ...updates,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
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

export const inMemoryVoiceSessionStore = new InMemoryVoiceSessionStore()

export const VoiceSessionRepository = {
  async create(ownerId: string, conversationId: string, language: SpokenLanguage = 'auto'): Promise<IVoiceSession> {
    if (isMongoConnected()) {
      const doc = await MongoVoiceSessionModel.create({
        ownerId,
        conversationId,
        language,
        state: 'connecting',
      })
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        conversationId: doc.conversationId,
        state: doc.state,
        language: doc.language,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastActivityAt: doc.lastActivityAt,
        transcriptTurns: doc.transcriptTurns || [],
        currentAudioUrl: doc.currentAudioUrl,
        lastInterruptionAt: doc.lastInterruptionAt,
      }
    }
    assertPersistenceAvailable()
    return inMemoryVoiceSessionStore.create({ ownerId, conversationId, language })
  },

  async findById(id: string): Promise<IVoiceSession | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoVoiceSessionModel.findById(id)
      if (!doc) return null
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        conversationId: doc.conversationId,
        state: doc.state,
        language: doc.language,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastActivityAt: doc.lastActivityAt,
        transcriptTurns: doc.transcriptTurns || [],
        currentAudioUrl: doc.currentAudioUrl,
        lastInterruptionAt: doc.lastInterruptionAt,
      }
    }
    assertPersistenceAvailable()
    return inMemoryVoiceSessionStore.findById(id)
  },

  async findActiveByConversation(conversationId: string, ownerId: string): Promise<IVoiceSession | null> {
    if (isMongoConnected()) {
      const doc = await MongoVoiceSessionModel.findOne({
        conversationId,
        ownerId,
        state: { $nin: ['ended', 'error'] },
      }).sort({ updatedAt: -1 })
      if (!doc) return null
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        conversationId: doc.conversationId,
        state: doc.state,
        language: doc.language,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastActivityAt: doc.lastActivityAt,
        transcriptTurns: doc.transcriptTurns || [],
        currentAudioUrl: doc.currentAudioUrl,
        lastInterruptionAt: doc.lastInterruptionAt,
      }
    }
    assertPersistenceAvailable()
    return inMemoryVoiceSessionStore.findActiveByConversation(conversationId, ownerId)
  },

  async update(id: string, updates: Partial<IVoiceSession>): Promise<IVoiceSession | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const current = await MongoVoiceSessionModel.findById(id)
      if (!current) return null

      if (updates.state && !isValidStateTransition(current.state, updates.state)) {
        throw new Error(`Invalid voice state transition from '${current.state}' to '${updates.state}'`)
      }

      const doc = await MongoVoiceSessionModel.findByIdAndUpdate(
        id,
        {
          ...updates,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        },
        { new: true }
      )
      if (!doc) return null
      return {
        id: doc._id.toString(),
        ownerId: doc.ownerId,
        conversationId: doc.conversationId,
        state: doc.state,
        language: doc.language,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastActivityAt: doc.lastActivityAt,
        transcriptTurns: doc.transcriptTurns || [],
        currentAudioUrl: doc.currentAudioUrl,
        lastInterruptionAt: doc.lastInterruptionAt,
      }
    }
    assertPersistenceAvailable()
    return inMemoryVoiceSessionStore.update(id, updates)
  },

  async addTurn(id: string, turn: VoiceTranscriptTurn): Promise<IVoiceSession | null> {
    const session = await this.findById(id)
    if (!session) return null
    const turns = [...session.transcriptTurns, turn]
    return this.update(id, { transcriptTurns: turns })
  },
}
