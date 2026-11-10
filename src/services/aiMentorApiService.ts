import type { Conversation, ChatMessage } from '../types/aiMentor'
import { getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/ai`

export interface ConversationContextData {
  conversationId: string
  mode: 'PROJECT_DISCOVERY' | 'CAMPUSPROJECTHUB_INTRO' | 'GENERAL_MENTORING'
  currentProjectIdea?: string
  projectCategory?: string
  studentObjectives: string[]
  proposedFeatures: string[]
  acceptedRecommendations: string[]
  rejectedRecommendations: string[]
  technicalExperience: 'beginner' | 'intermediate' | 'advanced'
  teamSize?: number
  availableDevelopmentTime?: string
  preferredTechnologies: string[]
  currentDiscussionStage: string
  lastTopicCovered?: string
  topicsDiscussed: string[]
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

export interface BackendStatus {
  connected: boolean
  isAvailable: boolean
  identity?: string
  activeProvider?: string
  streamingSupported?: boolean
  multilingual?: string[]
  database?: {
    connected: boolean
    mode: 'mongodb' | 'in-memory-dev-fallback' | 'unavailable'
    persistent: boolean
    lastError?: string
  }
}

export const aiMentorApiService = {
  /**
   * Check backend AI service health and active provider
   */
  async checkStatus(): Promise<BackendStatus> {
    try {
      const res = await fetch(`${getBase()}/status`, {
        signal: AbortSignal.timeout(2500),
      })
      if (!res.ok) return { connected: false, isAvailable: false }
      const json = await res.json()
      if (json.success && json.data) {
        return {
          connected: true,
          isAvailable: true,
          identity: json.data.identity,
          activeProvider: json.data.activeProvider,
          streamingSupported: json.data.streamingSupported,
          multilingual: json.data.multilingual,
          database: json.data.database,
        }
      }
      return { connected: false, isAvailable: false }
    } catch {
      return { connected: false, isAvailable: false }
    }
  },

  /**
   * List all conversations for the current student
   */
  async listConversations(): Promise<Conversation[]> {
    const res = await fetch(`${getBase()}/conversations`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      throw new Error(`Failed to load conversations (${res.status})`)
    }
    const json = await res.json()
    const rawList = json.data || []

    return rawList.map((item: any) => {
      const createdAtDate = new Date(item.createdAt)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - createdAtDate.getTime()) / (1000 * 3600 * 24))

      let group: Conversation['group'] = 'Today'
      if (diffDays === 1) group = 'Yesterday'
      else if (diffDays > 1) group = 'Previous 7 Days'

      return {
        id: item.id,
        title: item.title,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        group,
        messages: [],
      }
    })
  },

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<Conversation> {
    const res = await fetch(`${getBase()}/conversations`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ title }),
    })

    if (!res.ok) {
      throw new Error(`Failed to create conversation (${res.status})`)
    }
    const json = await res.json()
    const item = json.data

    return {
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: 'Just now',
      group: 'Today',
      messages: [],
    }
  },

  /**
   * Get single conversation with full message history
   */
  async getConversation(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
    const res = await fetch(`${getBase()}/conversations/${id}`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      throw new Error(`Failed to get conversation (${res.status})`)
    }
    const json = await res.json()
    const { conversation, messages } = json.data

    const formattedMessages: ChatMessage[] = (messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: m.status,
    }))

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: 'Just now',
        group: 'Today',
        messages: formattedMessages,
      },
      messages: formattedMessages,
    }
  },

  /**
   * Get structured conversation context (project idea, matched repo, tech, evaluation/proposal links)
   */
  async getConversationContext(id: string): Promise<ConversationContextData | null> {
    const res = await fetch(`${getBase()}/conversations/${id}/context`, {
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data || null
  },

  /**
   * Rename conversation
   */
  async renameConversation(id: string, newTitle: string): Promise<void> {
    const res = await fetch(`${getBase()}/conversations/${id}`, {
      method: 'PATCH',
      headers: getApiHeaders(),
      body: JSON.stringify({ title: newTitle }),
    })
    if (!res.ok) {
      throw new Error(`Failed to rename conversation (${res.status})`)
    }
  },

  /**
   * Delete conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${getBase()}/conversations/${id}`, {
      method: 'DELETE',
      headers: getApiHeaders({}, false),
    })
    if (!res.ok) {
      throw new Error(`Failed to delete conversation (${res.status})`)
    }
  },

  /**
   * Send user message and stream assistant response via Server-Sent Events (SSE)
   */
  async streamMessage(
    conversationId: string,
    content: string,
    callbacks: {
      onToken: (token: string) => void
      onDone: (assistantMsg: ChatMessage) => void
      onError: (err: Error) => void
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      const res = await fetch(`${getBase()}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: getApiHeaders({ Accept: 'text/event-stream' }),
        body: JSON.stringify({ content, stream: true }),
        signal: abortSignal,
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson?.error?.message || `Failed to stream message (${res.status})`)
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by response')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.substring(6).trim()
            if (!raw) continue
            try {
              const event = JSON.parse(raw)
              if (event.type === 'token' && event.token) {
                callbacks.onToken(event.token)
              } else if (event.type === 'done' && event.message) {
                const m = event.message
                callbacks.onDone({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                })
              } else if (event.type === 'error') {
                callbacks.onError(new Error(event.error))
              }
            } catch {
              // Ignore malformed partial SSE chunk
            }
          }
        }
      }
    } catch (err: any) {
      callbacks.onError(err)
    }
  },

  /**
   * Fetch authenticated student's optional personalization learning profile
   */
  async getLearningProfile(): Promise<any | null> {
    try {
      const res = await fetch(`${getBase()}/learning-profile`, {
        headers: getApiHeaders({}, false),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data || null
    } catch {
      return null
    }
  },

  /**
   * Update authenticated student's personalization preferences & constraints
   */
  async updateLearningProfile(updates: {
    explanationLevel?: 'beginner' | 'intermediate' | 'advanced'
    explanationStyle?: 'step_by_step' | 'concise' | 'architecture_first' | 'example_driven'
    preferredLanguage?: 'auto' | 'en' | 'kn' | 'hi'
    defaultConstraints?: {
      teamSize?: number
      durationWeeks?: number
    }
  }): Promise<any | null> {
    try {
      const res = await fetch(`${getBase()}/learning-profile`, {
        method: 'PATCH',
        headers: getApiHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data || null
    } catch {
      return null
    }
  },

  /**
   * Optional lightweight student feedback on an AI Mentor message
   */
  async submitMessageFeedback(
    conversationId: string,
    messageId: string,
    payload: {
      rating: 'helpful' | 'needs_improvement'
      category:
        | 'HELPFUL_RESPONSE'
        | 'INCORRECT_INFORMATION'
        | 'IRRELEVANT_RESPONSE'
        | 'CONFUSING_EXPLANATION'
        | 'MISSING_PROJECT_INFO'
      comment?: string
    }
  ): Promise<any | null> {
    try {
      const res = await fetch(
        `${getBase()}/conversations/${conversationId}/messages/${messageId}/feedback`,
        {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) return null
      const json = await res.json()
      return json.data || null
    } catch {
      return null
    }
  },

  /**
   * Load student's saved feedback entries for a conversation
   */
  async getConversationFeedback(conversationId: string): Promise<Record<string, any>> {
    try {
      const res = await fetch(`${getBase()}/conversations/${conversationId}/feedback`, {
        headers: getApiHeaders({}, false),
      })
      if (!res.ok) return {}
      const json = await res.json()
      const map: Record<string, any> = {}
      for (const item of json.data || []) {
        map[item.messageId] = item
      }
      return map
    } catch {
      return {}
    }
  },
}
