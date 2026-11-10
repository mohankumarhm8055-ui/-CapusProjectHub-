import type { StudentIntent } from '../conversational-engine/context.types.js'

export type QualityDimensionId =
  | 'intentUnderstanding'
  | 'repositoryInvestigation'
  | 'evidenceAccuracy'
  | 'similarityReasoning'
  | 'technicalCorrectness'
  | 'honestEvaluation'
  | 'conversationContinuity'
  | 'questionQuality'
  | 'communicationQuality'
  | 'actionability'

export interface QualityDimensionDefinition {
  id: QualityDimensionId
  label: string
  description: string
}

export const QUALITY_DIMENSIONS: QualityDimensionDefinition[] = [
  {
    id: 'intentUnderstanding',
    label: 'Intent Understanding',
    description: "Understands the student's actual question, stage, or project concept.",
  },
  {
    id: 'repositoryInvestigation',
    label: 'Repository Investigation',
    description: 'Searches accessible college repository records before advising on project ideas.',
  },
  {
    id: 'evidenceAccuracy',
    label: 'Evidence Accuracy',
    description: 'Supports claims strictly with retrieved documentation; never fabricates missing metadata.',
  },
  {
    id: 'similarityReasoning',
    label: 'Similarity Reasoning',
    description: 'Distinguishes exact duplicates, conceptual parallels, related features, and stack-only overlap.',
  },
  {
    id: 'technicalCorrectness',
    label: 'Technical Correctness',
    description: 'Provides sound architecture, stack, feasibility, and implementation guidance.',
  },
  {
    id: 'honestEvaluation',
    label: 'Honest Evaluation',
    description: 'Challenges unnecessary, risky, or unrealistic features instead of agreeing blindly.',
  },
  {
    id: 'conversationContinuity',
    label: 'Conversation Continuity',
    description: 'Maintains multi-turn memory, respects idea pivots, and avoids repeating answered questions.',
  },
  {
    id: 'questionQuality',
    label: 'Question Quality',
    description: 'Asks at most one focused, progressive, unasked follow-up question rather than generic lists.',
  },
  {
    id: 'communicationQuality',
    label: 'Communication Quality',
    description: 'Clear, constructive, direct, appropriately structured Markdown calibrated to skill level.',
  },
  {
    id: 'actionability',
    label: 'Actionability',
    description: 'Gives concrete next steps or decisions the student can take immediately.',
  },
]

export type DatasetScenarioCategory =
  | 'EXACT_MATCH'
  | 'SIMILAR_DIFFERENT_TITLE'
  | 'RELATED_DIFFERENT_IMPLEMENTATION'
  | 'NO_MATCH'
  | 'INCOMPLETE_DESCRIPTION'
  | 'UNNECESSARY_FEATURE'
  | 'UNREALISTIC_SCOPE'
  | 'TECH_SELECTION'
  | 'RESEARCH_GAPS'
  | 'FOLLOW_UP_CONTINUITY'
  | 'IDEA_DIRECTION_CHANGE'
  | 'MISSING_DOCUMENTATION'
  | 'UNAUTHORIZED_INFO'
  | 'RETRIEVAL_OUTAGE'

export interface EvalTurnExpectation {
  expectedIntents?: StudentIntent[]
  mustSearchRepository?: boolean
  expectedRetrievedTitles?: string[]
  mustNotRetrievePrivateTitles?: string[]
  expectedIncludes?: string[]
  expectedIncludesAny?: string[][]
  forbiddenIncludes?: string[]
  forbidInventedPercentages?: boolean
  forbidRepeatedQuestionPatterns?: string[]
  mustDiscloseRetrievalFailure?: boolean
  mustProtectRestrictedData?: boolean
  maxQuestionMarks?: number
  expectedBehaviorSummary: string
}

export interface EvalTurnDefinition {
  turnNumber: number
  userPrompt: string
  simulateRetrievalFailure?: boolean
  expectation: EvalTurnExpectation
}

export interface EvalCaseDefinition {
  caseId: string
  title: string
  category: DatasetScenarioCategory
  recordBasis: 'APPROVED_SEEDED_RECORD' | 'HYPOTHETICAL_TEST_SCENARIO'
  labelNotice?: string
  turns: EvalTurnDefinition[]
}

export interface DeterministicRuleResult {
  ruleId: string
  dimension: QualityDimensionId
  description: string
  passed: boolean
  evidence: string
  failureReason?: string
  suggestedImprovement?: string
}

export interface AdvisoryJudgeResult {
  advisoryOnly: true
  factualProof: false
  provider: string
  model: string
  notes: string
  tokensUsed?: number
  error?: string
}

export interface RetrievedRecordSnapshot {
  projectId: string
  title: string
  academicYear: string
  batch?: string
  classification?: string
}

export interface EvalTurnReport {
  turnNumber: number
  userQuestion: string
  detectedIntent: StudentIntent
  retrievedProjectRecords: RetrievedRecordSnapshot[]
  generatedResponse: string
  expectedBehavior: string
  actualBehavior: string
  passed: boolean
  failedCriteria: DeterministicRuleResult[]
  ruleResults: DeterministicRuleResult[]
  explanationOfFailures: string[]
  suggestedImprovements: string[]
  metrics: {
    responseLatencyMs: number
    retrievalLatencyMs: number
    retrievedRecordsCount: number
    retrievalFailed: boolean
    tokensUsed?: number
    providerError?: string
  }
  advisoryJudge?: AdvisoryJudgeResult
}

export interface EvalCaseReport {
  caseId: string
  title: string
  category: DatasetScenarioCategory
  recordBasis: 'APPROVED_SEEDED_RECORD' | 'HYPOTHETICAL_TEST_SCENARIO'
  passed: boolean
  turns: EvalTurnReport[]
}

export interface DimensionSummary {
  dimension: QualityDimensionId
  label: string
  checksTotal: number
  checksPassed: number
  checksFailed: number
  passRatePercent: number
}

export interface EvalPerformanceMetrics {
  totalTurnsEvaluated: number
  avgResponseLatencyMs: number
  maxResponseLatencyMs: number
  avgRetrievalLatencyMs: number
  totalRetrievedRecords: number
  failedRetrievalCount: number
  providerErrorCount: number
  totalTokensUsed: number
  duplicateSearchesAvoided: number
}

export interface EvalRunReport {
  id: string
  datasetVersion: string
  label?: string
  promptConfigTag: string
  providerName: string
  privacyRedacted: true
  createdAt: Date
  overallPassed: boolean
  casesTotal: number
  casesPassed: number
  casesFailed: number
  turnsTotal: number
  turnsPassed: number
  turnsFailed: number
  rulesTotal: number
  rulesPassed: number
  rulesFailed: number
  dimensionSummaries: DimensionSummary[]
  performance: EvalPerformanceMetrics
  majorFailures: Array<{
    caseId: string
    turnNumber: number
    dimension: QualityDimensionId
    ruleId: string
    explanation: string
    suggestedImprovement: string
  }>
  cases: EvalCaseReport[]
}

export interface RegressionDiffItem {
  caseId: string
  turnNumber: number
  ruleId: string
  dimension: QualityDimensionId
  baselinePassed: boolean
  candidatePassed: boolean
  status: 'REGRESSION' | 'IMPROVEMENT' | 'UNCHANGED_FAIL'
  detail: string
}

export interface RegressionComparisonReport {
  baselineRunId: string
  candidateRunId: string
  baselineCreatedAt: Date
  candidateCreatedAt: Date
  baselineRulesPassed: number
  candidateRulesPassed: number
  rulesDelta: number
  casesDelta: number
  regressions: RegressionDiffItem[]
  improvements: RegressionDiffItem[]
  newlyIntroducedFailureCases: string[]
  summary: string
}
