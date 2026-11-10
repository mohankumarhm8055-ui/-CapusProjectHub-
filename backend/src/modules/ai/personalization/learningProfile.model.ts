import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../../config/db.js'
import type { ExperienceLevel } from '../conversational-engine/context.types.js'

export type ProgrammingExperience = 'none' | 'basic' | 'moderate' | 'strong'
export type ProjectExperience = 'first_project' | 'one_or_two' | 'multiple'
export type PreferredCommunicationLanguage = 'auto' | 'en' | 'kn' | 'hi'
export type ExplanationStyle =
  | 'step_by_step'
  | 'concise'
  | 'architecture_first'
  | 'example_driven'

export interface IStudentProjectConstraints {
  teamSize?: number
  durationWeeks?: number
  hardwareAvailable?: string
  budget?: string
  academicRequirement?: string
  availableDatasets?: string
}

export interface IStudentLearningProfile {
  id: string
  userId: string
  explanationLevel: ExperienceLevel
  programmingExperience?: ProgrammingExperience
  knownLanguages: string[]
  technicalInterests: string[]
  familiarTools: string[]
  projectExperience?: ProjectExperience
  preferredLanguage: PreferredCommunicationLanguage
  explanationStyle: ExplanationStyle
  defaultConstraints?: IStudentProjectConstraints
  createdAt: Date
  updatedAt: Date
}

export interface StudentLearningProfileDocument
  extends Document,
    Omit<IStudentLearningProfile, 'id'> {
  _id: mongoose.Types.ObjectId
}

const StudentLearningProfileSchema = new Schema<StudentLearningProfileDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    explanationLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    programmingExperience: {
      type: String,
      enum: ['none', 'basic', 'moderate', 'strong'],
    },
    knownLanguages: { type: [String], default: [] },
    technicalInterests: { type: [String], default: [] },
    familiarTools: { type: [String], default: [] },
    projectExperience: {
      type: String,
      enum: ['first_project', 'one_or_two', 'multiple'],
    },
    preferredLanguage: {
      type: String,
      enum: ['auto', 'en', 'kn', 'hi'],
      default: 'auto',
    },
    explanationStyle: {
      type: String,
      enum: ['step_by_step', 'concise', 'architecture_first', 'example_driven'],
      default: 'step_by_step',
    },
    defaultConstraints: {
      teamSize: { type: Number },
      durationWeeks: { type: Number },
      hardwareAvailable: { type: String, trim: true },
      budget: { type: String, trim: true },
      academicRequirement: { type: String, trim: true },
      availableDatasets: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
    collection: 'student_learning_profiles',
  }
)

export const MongoLearningProfileModel =
  mongoose.models.StudentLearningProfile ||
  mongoose.model<StudentLearningProfileDocument>(
    'StudentLearningProfile',
    StudentLearningProfileSchema
  )

export const inMemoryLearningProfileStore = new Map<string, IStudentLearningProfile>()

function buildDefaultProfile(userId: string): Omit<IStudentLearningProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    explanationLevel: 'intermediate',
    knownLanguages: [],
    technicalInterests: [],
    familiarTools: [],
    preferredLanguage: 'auto',
    explanationStyle: 'step_by_step',
  }
}

function mapDoc(doc: StudentLearningProfileDocument): IStudentLearningProfile {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    explanationLevel: doc.explanationLevel || 'intermediate',
    programmingExperience: doc.programmingExperience,
    knownLanguages: doc.knownLanguages || [],
    technicalInterests: doc.technicalInterests || [],
    familiarTools: doc.familiarTools || [],
    projectExperience: doc.projectExperience,
    preferredLanguage: doc.preferredLanguage || 'auto',
    explanationStyle: doc.explanationStyle || 'step_by_step',
    defaultConstraints: doc.defaultConstraints
      ? {
          teamSize: doc.defaultConstraints.teamSize,
          durationWeeks: doc.defaultConstraints.durationWeeks,
          hardwareAvailable: doc.defaultConstraints.hardwareAvailable,
          budget: doc.defaultConstraints.budget,
          academicRequirement: doc.defaultConstraints.academicRequirement,
          availableDatasets: doc.defaultConstraints.availableDatasets,
        }
      : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const LearningProfileRepository = {
  /**
   * Returns existing profile for the authenticated user or builds optional safe defaults
   * without making setup mandatory and never inferring ability from marks/CGPA/department.
   */
  async getOrCreateForUser(userId: string): Promise<IStudentLearningProfile> {
    if (isMongoConnected()) {
      let doc = await MongoLearningProfileModel.findOne({ userId })
      if (!doc) {
        doc = await MongoLearningProfileModel.create(buildDefaultProfile(userId))
      }
      return mapDoc(doc)
    }

    assertPersistenceAvailable('student learning profiles')
    let existing = inMemoryLearningProfileStore.get(userId)
    if (!existing) {
      const now = new Date()
      existing = {
        ...buildDefaultProfile(userId),
        id: `lp-${userId}-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      inMemoryLearningProfileStore.set(userId, existing)
    }
    return existing
  },

  async findForUser(userId: string): Promise<IStudentLearningProfile | null> {
    if (isMongoConnected()) {
      const doc = await MongoLearningProfileModel.findOne({ userId })
      return doc ? mapDoc(doc) : null
    }

    assertPersistenceAvailable('student learning profiles')
    return inMemoryLearningProfileStore.get(userId) || null
  },

  async updateForUser(
    userId: string,
    updates: Partial<Omit<IStudentLearningProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<IStudentLearningProfile> {
    const cleanUpdates: Record<string, any> = {}
    if (updates.explanationLevel) cleanUpdates.explanationLevel = updates.explanationLevel
    if (updates.programmingExperience !== undefined) {
      cleanUpdates.programmingExperience = updates.programmingExperience
    }
    if (updates.knownLanguages !== undefined) cleanUpdates.knownLanguages = updates.knownLanguages
    if (updates.technicalInterests !== undefined) {
      cleanUpdates.technicalInterests = updates.technicalInterests
    }
    if (updates.familiarTools !== undefined) cleanUpdates.familiarTools = updates.familiarTools
    if (updates.projectExperience !== undefined) {
      cleanUpdates.projectExperience = updates.projectExperience
    }
    if (updates.preferredLanguage !== undefined) {
      cleanUpdates.preferredLanguage = updates.preferredLanguage
    }
    if (updates.explanationStyle !== undefined) {
      cleanUpdates.explanationStyle = updates.explanationStyle
    }
    if (updates.defaultConstraints !== undefined) {
      cleanUpdates.defaultConstraints = updates.defaultConstraints
    }

    if (isMongoConnected()) {
      const doc = await MongoLearningProfileModel.findOneAndUpdate(
        { userId },
        {
          $set: cleanUpdates,
          $setOnInsert: { userId },
        },
        { new: true, upsert: true, runValidators: true }
      )
      return mapDoc(doc!)
    }

    assertPersistenceAvailable('student learning profiles')
    const current = await this.getOrCreateForUser(userId)
    const merged: IStudentLearningProfile = {
      ...current,
      ...cleanUpdates,
      defaultConstraints: cleanUpdates.defaultConstraints
        ? { ...(current.defaultConstraints || {}), ...cleanUpdates.defaultConstraints }
        : current.defaultConstraints,
      updatedAt: new Date(),
    }
    inMemoryLearningProfileStore.set(userId, merged)
    return merged
  },

  async resetForUser(userId: string): Promise<IStudentLearningProfile> {
    const defaults = buildDefaultProfile(userId)
    if (isMongoConnected()) {
      const doc = await MongoLearningProfileModel.findOneAndUpdate(
        { userId },
        { $set: defaults },
        { new: true, upsert: true }
      )
      return mapDoc(doc!)
    }

    assertPersistenceAvailable('student learning profiles')
    const now = new Date()
    const reset: IStudentLearningProfile = {
      ...defaults,
      id: `lp-${userId}-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    inMemoryLearningProfileStore.set(userId, reset)
    return reset
  },
}
