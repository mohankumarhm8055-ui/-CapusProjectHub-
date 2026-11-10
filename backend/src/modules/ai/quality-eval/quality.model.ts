import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../../config/db.js'
import type { EvalRunReport } from './quality.types.js'

export interface EvalRunDocument extends Document, Omit<EvalRunReport, 'id'> {
  _id: mongoose.Types.ObjectId
}

const EvalRunSchema = new Schema<EvalRunDocument>(
  {
    datasetVersion: { type: String, required: true, index: true },
    label: { type: String },
    promptConfigTag: { type: String, required: true, index: true },
    providerName: { type: String, required: true },
    privacyRedacted: { type: Boolean, default: true },
    overallPassed: { type: Boolean, required: true, index: true },
    casesTotal: { type: Number, required: true },
    casesPassed: { type: Number, required: true },
    casesFailed: { type: Number, required: true },
    turnsTotal: { type: Number, required: true },
    turnsPassed: { type: Number, required: true },
    turnsFailed: { type: Number, required: true },
    rulesTotal: { type: Number, required: true },
    rulesPassed: { type: Number, required: true },
    rulesFailed: { type: Number, required: true },
    dimensionSummaries: { type: Schema.Types.Mixed, default: [] },
    performance: { type: Schema.Types.Mixed, required: true },
    majorFailures: { type: Schema.Types.Mixed, default: [] },
    cases: { type: Schema.Types.Mixed, default: [] },
  },
  {
    timestamps: true,
  }
)

EvalRunSchema.index({ createdAt: -1 })

export const MongoEvalRunModel =
  mongoose.models.AIEvalRun || mongoose.model<EvalRunDocument>('AIEvalRun', EvalRunSchema)

export const inMemoryEvalRunStore: EvalRunReport[] = []

function mapDoc(doc: EvalRunDocument): EvalRunReport {
  return {
    id: doc._id.toString(),
    datasetVersion: doc.datasetVersion,
    label: doc.label,
    promptConfigTag: doc.promptConfigTag,
    providerName: doc.providerName,
    privacyRedacted: true,
    createdAt: doc.createdAt,
    overallPassed: doc.overallPassed,
    casesTotal: doc.casesTotal,
    casesPassed: doc.casesPassed,
    casesFailed: doc.casesFailed,
    turnsTotal: doc.turnsTotal,
    turnsPassed: doc.turnsPassed,
    turnsFailed: doc.turnsFailed,
    rulesTotal: doc.rulesTotal,
    rulesPassed: doc.rulesPassed,
    rulesFailed: doc.rulesFailed,
    dimensionSummaries: doc.dimensionSummaries || [],
    performance: doc.performance,
    majorFailures: doc.majorFailures || [],
    cases: doc.cases || [],
  }
}

export const EvalRunRepository = {
  async create(report: Omit<EvalRunReport, 'id' | 'createdAt'>): Promise<EvalRunReport> {
    if (isMongoConnected()) {
      const doc = new MongoEvalRunModel(report)
      const saved = await doc.save()
      return mapDoc(saved)
    }

    assertPersistenceAvailable('AI evaluation reports')
    const saved: EvalRunReport = {
      ...report,
      id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
    }
    inMemoryEvalRunStore.unshift(saved)
    return saved
  },

  async findById(id: string): Promise<EvalRunReport | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null
      const doc = await MongoEvalRunModel.findById(id)
      return doc ? mapDoc(doc) : null
    }

    assertPersistenceAvailable('AI evaluation reports')
    return inMemoryEvalRunStore.find((r) => r.id === id) || null
  },

  async listRecent(limit = 20): Promise<Array<Omit<EvalRunReport, 'cases'>>> {
    if (isMongoConnected()) {
      const docs = await MongoEvalRunModel.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-cases')
      return docs.map((d: any) => {
        const mapped = mapDoc(d)
        const { cases: _c, ...summary } = mapped
        return summary
      })
    }

    assertPersistenceAvailable('AI evaluation reports')
    return inMemoryEvalRunStore.slice(0, limit).map(({ cases: _c, ...summary }) => summary)
  },
}
