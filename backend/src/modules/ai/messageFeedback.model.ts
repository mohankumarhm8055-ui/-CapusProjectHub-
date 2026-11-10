import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import { redactSensitiveText } from './quality-eval/quality.evaluator.js'

export type MessageFeedbackRating = 'helpful' | 'needs_improvement'

export type MessageFeedbackCategory =
  | 'HELPFUL_RESPONSE'
  | 'INCORRECT_INFORMATION'
  | 'IRRELEVANT_RESPONSE'
  | 'CONFUSING_EXPLANATION'
  | 'MISSING_PROJECT_INFO'

export interface IMessageFeedback {
  id: string
  conversationId: string
  messageId: string
  ownerId: string
  rating: MessageFeedbackRating
  category: MessageFeedbackCategory
  comment?: string
  usedForTraining: false
  createdAt: Date
  updatedAt: Date
}

export interface MessageFeedbackDocument extends Document {
  conversationId: string
  messageId: string
  ownerId: string
  rating: MessageFeedbackRating
  category: MessageFeedbackCategory
  comment?: string
  usedForTraining: boolean
  createdAt: Date
  updatedAt: Date
}

const MessageFeedbackSchema = new Schema<MessageFeedbackDocument>(
  {
    conversationId: { type: String, required: true, index: true },
    messageId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    rating: {
      type: String,
      enum: ['helpful', 'needs_improvement'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'HELPFUL_RESPONSE',
        'INCORRECT_INFORMATION',
        'IRRELEVANT_RESPONSE',
        'CONFUSING_EXPLANATION',
        'MISSING_PROJECT_INFO',
      ],
      required: true,
    },
    comment: { type: String, maxlength: 300 },
    // Policy guarantee: student feedback is advisory for UX review only, never verified training data
    usedForTraining: { type: Boolean, default: false, immutable: true },
  },
  { timestamps: true }
)

MessageFeedbackSchema.index(
  { conversationId: 1, messageId: 1, ownerId: 1 },
  { unique: true }
)

export const MongoMessageFeedbackModel =
  mongoose.models.AIMessageFeedback ||
  mongoose.model<MessageFeedbackDocument>('AIMessageFeedback', MessageFeedbackSchema)

export const inMemoryMessageFeedbackStore: IMessageFeedback[] = []

function mapDoc(doc: MessageFeedbackDocument): IMessageFeedback {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId,
    messageId: doc.messageId,
    ownerId: doc.ownerId,
    rating: doc.rating,
    category: doc.category,
    comment: doc.comment,
    usedForTraining: false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const MessageFeedbackRepository = {
  async upsert(input: {
    conversationId: string
    messageId: string
    ownerId: string
    rating: MessageFeedbackRating
    category: MessageFeedbackCategory
    comment?: string
  }): Promise<IMessageFeedback> {
    const cleanComment = input.comment?.trim()
      ? redactSensitiveText(input.comment.trim()).slice(0, 300)
      : undefined

    if (isMongoConnected()) {
      const updated = await MongoMessageFeedbackModel.findOneAndUpdate(
        {
          conversationId: input.conversationId,
          messageId: input.messageId,
          ownerId: input.ownerId,
        },
        {
          $set: {
            rating: input.rating,
            category: input.category,
            comment: cleanComment,
            usedForTraining: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      return mapDoc(updated)
    }

    assertPersistenceAvailable('message feedback')

    const existing = inMemoryMessageFeedbackStore.find(
      (f) =>
        f.conversationId === input.conversationId &&
        f.messageId === input.messageId &&
        f.ownerId === input.ownerId
    )
    if (existing) {
      existing.rating = input.rating
      existing.category = input.category
      existing.comment = cleanComment
      existing.updatedAt = new Date()
      return existing
    }

    const created: IMessageFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId: input.conversationId,
      messageId: input.messageId,
      ownerId: input.ownerId,
      rating: input.rating,
      category: input.category,
      comment: cleanComment,
      usedForTraining: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    inMemoryMessageFeedbackStore.push(created)
    return created
  },

  async listByConversation(conversationId: string, ownerId: string): Promise<IMessageFeedback[]> {
    if (isMongoConnected()) {
      const docs = await MongoMessageFeedbackModel.find({ conversationId, ownerId })
      return docs.map(mapDoc)
    }

    assertPersistenceAvailable('message feedback')
    return inMemoryMessageFeedbackStore.filter(
      (f) => f.conversationId === conversationId && f.ownerId === ownerId
    )
  },
}
