export type VoiceSessionState =
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

export interface VoiceTranscriptTurn {
  id: string
  speaker: 'student' | 'mentor'
  text: string
  timestamp: string
  language?: string
}

export interface IVoiceSession {
  id: string
  ownerId: string
  conversationId: string
  state: VoiceSessionState
  language: SpokenLanguage
  createdAt: Date
  updatedAt: Date
  lastActivityAt: Date
  transcriptTurns: VoiceTranscriptTurn[]
  currentAudioUrl?: string
  lastInterruptionAt?: Date
}

export interface TranscribeRequest {
  audioBase64?: string
  language?: SpokenLanguage
  mimeType?: string
}

export interface TranscribeResponse {
  text: string
  detectedLanguage: SpokenLanguage
  confidence: number
  preservedTechnicalTerms: string[]
}

export interface SynthesizeRequest {
  text: string
  language?: SpokenLanguage
  speed?: 0.75 | 1 | 1.25 | 1.5
  voiceGender?: 'female' | 'male'
}

export interface SynthesizeResponse {
  audioUrl: string
  audioFormat: string
  durationSeconds: number
  language: SpokenLanguage
  speed: number
  cached: boolean
  voiceId?: string
  voiceName?: string
  voiceGender?: 'female' | 'male'
}
