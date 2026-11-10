export type ConversationMode =
  | 'PROJECT_DISCOVERY'
  | 'CAMPUSPROJECTHUB_INTRO'
  | 'GENERAL_MENTORING'

export type StudentIntent =
  | 'PROJECT_DISCOVERY'
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
  | 'GENERAL_MENTORING'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

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
  availableDevelopmentTime?: string
  preferredTechnologies: string[]
  languagePreference?: string
  currentDiscussionStage: string
  lastTopicCovered?: string
  topicsDiscussed: string[]
  introSectionIndex: number // 0 to 14 for 15 progressive sections of Mode B
  activeEvaluationId?: string
  activeProposalId?: string
  matchedRepositoryProject?: {
    projectId?: string
    sourceUrl?: string
    title: string
    academicYear: string
    department: string
    similarityClassification: string
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
}

export interface ConversationalTurnResult {
  intent: StudentIntent
  mode: ConversationMode
  responseMarkdown: string
  suggestedFollowUps: string[]
  updatedContext: IConversationContext
}
