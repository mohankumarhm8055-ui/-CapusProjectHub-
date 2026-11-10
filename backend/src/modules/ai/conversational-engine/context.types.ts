import type { StructuredIdeaAnalysis } from './idea.analyzer.js'

export type ConversationMode =
  | 'PROJECT_DISCOVERY'
  | 'CAMPUSPROJECTHUB_INTRO'
  | 'GENERAL_MENTORING'

export type StudentIntent =
  | 'PROJECT_DISCOVERY'
  | 'IDEA_CHANGE_PIVOT'
  | 'CAMPUSPROJECTHUB_INTRO'
  | 'FEATURE_EVALUATION'
  | 'COMPARISON_INQUIRY'
  | 'TECHNICAL_EXPLANATION'
  | 'PROGRESSION_NEXT'
  | 'CLARIFICATION_OR_PARAM'
  | 'SENIOR_CONNECTION_INQUIRY'
  | 'PROPOSAL_GENERATION_INQUIRY'
  | 'PROJECT_SUITABILITY'
  | 'DISADVANTAGES_INQUIRY'
  | 'AI_NECESSITY_INQUIRY'
  | 'SCOPE_REDUCTION'
  | 'DOCUMENTATION_INQUIRY'
  | 'COLLEGE_SCOPE_AFFIRMATION'
  | 'FACULTY_EXPLANATION'
  | 'REPOSITORY_BATCH_INQUIRY'
  | 'REPOSITORY_TECH_INQUIRY'
  | 'REPOSITORY_IMPROVEMENTS_INQUIRY'
  | 'REPOSITORY_ORIGINALITY_INQUIRY'
  | 'RESTRICTED_INFO_INQUIRY'
  | 'CONCEPT_TEACHING'
  | 'RETURN_TO_PRIOR_PROJECT'
  | 'MULTI_PROJECT_COMPARISON'
  | 'GENERAL_MENTORING'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface MatchedRepoSummary {
  projectId?: string
  sourceUrl?: string
  title: string
  academicYear: string
  batch?: string
  semester?: string
  department: string
  similarityClassification: string
  academicClassification?: string
  overlapScore: number
  confirmedDetails: string[]
  missingDetails: string[]
  authors?: Array<{
    studentId?: string
    name: string
    role?: string
    isAvailableForMentoring: boolean
  }>
}

export interface IConversationContext {
  conversationId: string
  mode: ConversationMode
  currentProjectIdea?: string
  projectCategory?: string
  studentObjectives: string[]
  proposedFeatures: string[]
  acceptedRecommendations: string[]
  rejectedRecommendations: string[]
  technicalExperience: ExperienceLevel
  teamSize?: number
  developmentWeeks?: number
  availableDevelopmentTime?: string
  budget?: string
  hardwareRequirements?: string
  availableDatasets?: string
  academicRequirements?: string
  explanationStyle?: string
  explicitlyProvidedConstraints?: string[]
  askedQuestionKeys?: string[]
  unansweredQuestions?: string[]
  preferredTechnologies: string[]
  languagePreference?: string
  currentDiscussionStage: string
  lastTopicCovered?: string
  topicsDiscussed: string[]
  introSectionIndex: number // 0 to 14 for 15 progressive sections of Mode B
  activeEvaluationId?: string
  activeProposalId?: string
  activeComparisonSessionId?: string
  activeIdeaAnalysis?: StructuredIdeaAnalysis
  matchedRepositoryProject?: MatchedRepoSummary
  matchedRepositoryProjects?: MatchedRepoSummary[]
  previousProjectIdeas?: Array<{
    title: string
    category?: string
    matchedRepositoryProject?: MatchedRepoSummary
  }>
}

export interface RetrievalTelemetry {
  executed: boolean
  latencyMs: number
  retrievedCount: number
  retrievedProjectIds: string[]
  retrievedProjectTitles: string[]
  failed: boolean
  error?: string
  reusedCachedMatches?: boolean
}

export interface ConversationalTurnResult {
  intent: StudentIntent
  mode: ConversationMode
  responseMarkdown: string
  suggestedFollowUps: string[]
  updatedContext: IConversationContext
  retrievalTelemetry?: RetrievalTelemetry
  retrievedMatches?: any[]
}
