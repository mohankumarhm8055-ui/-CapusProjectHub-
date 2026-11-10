import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import { ITemplateMetadata } from './proposal.model.js'
import { COLLEGE_TEMPLATES } from './proposal.engine.js'

export interface CollegeTemplateDocument extends Document, ITemplateMetadata {
  isActive: boolean
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const CollegeTemplateSchema = new Schema<CollegeTemplateDocument>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    templateVersion: { type: String, required: true, default: '1.0.0' },
    templateName: { type: String, required: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: String, required: true },
    documentType: {
      type: String,
      enum: [
        'MINI_PROJECT_PROPOSAL',
        'PROJECT_SYNOPSIS',
        'PROJECT_REPORT',
        'PROJECT_ABSTRACT',
        'REVIEW_REPORT',
        'PRESENTATION_OUTLINE',
      ],
      required: true,
      index: true,
    },
    mandatorySectionIds: [{ type: String }],
    optionalSectionIds: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String },
  },
  {
    timestamps: true,
    collection: 'college_templates',
  }
)

export const MongoCollegeTemplateModel =
  mongoose.models.CollegeTemplate ||
  mongoose.model<CollegeTemplateDocument>('CollegeTemplate', CollegeTemplateSchema)

class InMemoryCollegeTemplateStore {
  private templates = new Map<string, ITemplateMetadata & { isActive: boolean }>()

  constructor() {
    for (const tpl of COLLEGE_TEMPLATES) {
      this.templates.set(tpl.templateId, { ...tpl, isActive: true })
    }
  }

  async listAll(): Promise<ITemplateMetadata[]> {
    return Array.from(this.templates.values())
      .filter((t) => t.isActive !== false)
      .map(({ isActive: _active, ...rest }) => JSON.parse(JSON.stringify(rest)))
  }

  async findByTemplateId(templateId: string): Promise<ITemplateMetadata | null> {
    const found = this.templates.get(templateId)
    if (!found || found.isActive === false) return null
    const { isActive: _active, ...rest } = found
    return JSON.parse(JSON.stringify(rest))
  }

  async upsert(template: ITemplateMetadata): Promise<ITemplateMetadata> {
    this.templates.set(template.templateId, { ...template, isActive: true })
    return JSON.parse(JSON.stringify(template))
  }

  async delete(templateId: string): Promise<boolean> {
    return this.templates.delete(templateId)
  }
}

export const inMemoryTemplateStore = new InMemoryCollegeTemplateStore()

function mapTemplateDoc(doc: any): ITemplateMetadata {
  return {
    templateId: doc.templateId,
    templateVersion: doc.templateVersion || '1.0.0',
    templateName: doc.templateName,
    college: doc.college,
    department: doc.department,
    academicYear: doc.academicYear,
    semester: doc.semester,
    documentType: doc.documentType,
    mandatorySectionIds: doc.mandatorySectionIds || [],
    optionalSectionIds: doc.optionalSectionIds || [],
  }
}

export const CollegeTemplateRepository = {
  async listAll(): Promise<ITemplateMetadata[]> {
    if (isMongoConnected()) {
      const docs = await MongoCollegeTemplateModel.find({ isActive: { $ne: false } })
        .sort({ createdAt: 1 })
        .lean()
        .exec()
      return docs.map(mapTemplateDoc)
    }
    assertPersistenceAvailable('college templates')
    return inMemoryTemplateStore.listAll()
  },

  async findByTemplateId(templateId: string): Promise<ITemplateMetadata | null> {
    if (isMongoConnected()) {
      const doc = await MongoCollegeTemplateModel.findOne({
        templateId,
        isActive: { $ne: false },
      })
        .lean()
        .exec()
      return doc ? mapTemplateDoc(doc) : null
    }
    assertPersistenceAvailable('college templates')
    return inMemoryTemplateStore.findByTemplateId(templateId)
  },

  async upsert(
    template: ITemplateMetadata,
    createdBy?: string
  ): Promise<ITemplateMetadata> {
    if (isMongoConnected()) {
      const doc = await MongoCollegeTemplateModel.findOneAndUpdate(
        { templateId: template.templateId },
        {
          $set: {
            ...template,
            isActive: true,
            ...(createdBy ? { createdBy } : {}),
          },
        },
        { upsert: true, new: true }
      )
        .lean()
        .exec()
      return mapTemplateDoc(doc)
    }
    assertPersistenceAvailable('college templates')
    return inMemoryTemplateStore.upsert(template)
  },

  async delete(templateId: string): Promise<boolean> {
    if (isMongoConnected()) {
      const res = await MongoCollegeTemplateModel.deleteOne({ templateId }).exec()
      return res.deletedCount > 0
    }
    assertPersistenceAvailable('college templates')
    return inMemoryTemplateStore.delete(templateId)
  },
}

export async function seedCollegeTemplates(): Promise<void> {
  if (!isMongoConnected()) {
    return
  }

  for (const tpl of COLLEGE_TEMPLATES) {
    await MongoCollegeTemplateModel.updateOne(
      { templateId: tpl.templateId },
      { $setOnInsert: { ...tpl, isActive: true, createdBy: 'system-seed' } },
      { upsert: true }
    ).exec()
  }
}
