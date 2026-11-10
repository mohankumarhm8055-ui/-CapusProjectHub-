export interface AIMessagePayload {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void | Promise<void>
  onComplete: (fullText: string, metadata?: Record<string, any>) => void | Promise<void>
  onError: (error: Error) => void | Promise<void>
}

export interface GenerateOptions {
  messages: AIMessagePayload[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  abortSignal?: AbortSignal
}

export interface AIProviderResponse {
  content: string
  model: string
  provider: string
  tokensUsed?: number
}

export interface IAIProvider {
  name: string
  isAvailable(): boolean
  generateResponse(options: GenerateOptions): Promise<AIProviderResponse>
  streamResponse(options: GenerateOptions, callbacks: StreamCallbacks): Promise<void>
}
