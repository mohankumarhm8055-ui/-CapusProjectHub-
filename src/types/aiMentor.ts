export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  status?: 'pending' | 'completed' | 'failed' | 'interrupted'
  suggestedFollowUps?: string[]
  codeSnippet?: {
    language: string
    code: string
  }
}

export type ConversationGroup = 'Today' | 'Yesterday' | 'Previous 7 Days'

export interface Conversation {
  id: string
  title: string
  updatedAt: string
  createdAt: string
  group: ConversationGroup
  messages: ChatMessage[]
}

export interface SuggestionCard {
  id: string
  title: string
  description: string
  iconName: 'Compass' | 'Sparkles' | 'CheckSquare' | 'BookOpen'
  category: string
  prompt: string
  badgeText: string
}

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'ended'
  | 'error'

export type SpokenLanguage = 'auto' | 'en' | 'kn' | 'hi'

export type AudioPlaybackSpeed = 0.75 | 1 | 1.25 | 1.5

export interface VoiceTranscriptTurn {
  id: string
  speaker: 'student' | 'mentor'
  text: string
  timestamp: string
  language?: string
}

export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced'
export type ExplanationStyle = 'step_by_step' | 'concise' | 'architecture_first' | 'example_driven'

export interface MentorSettings {
  personality: 'strict-examiner' | 'supportive-guide' | 'technical-architect'
  academicLevel: 'undergraduate' | 'postgraduate' | 'diploma'
  citationFormat: 'ieee' | 'acm' | 'apa'
  enforceAcademicIntegrity: boolean
  explanationLevel?: ExplanationLevel
  explanationStyle?: ExplanationStyle
  teamSize?: number
  durationWeeks?: number
  voiceLanguage?: SpokenLanguage
  defaultPlaybackSpeed?: AudioPlaybackSpeed
  enableVoiceInterruption?: boolean
}
