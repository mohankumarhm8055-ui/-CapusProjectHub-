import { getAIProvider, SYSTEM_MENTOR_PROMPT } from './ai.provider.js'
import { conversationService } from './conversation.service.js'
import { IMessage } from './message.model.js'
import { AIMessagePayload, IAIProvider } from './ai.types.js'
import { repositorySearchService } from '../repository/repository.search.service.js'
import { knowledgeService } from './knowledge/knowledge.service.js'
import { conversationalEngine } from './conversational-engine/conversational.engine.js'

export class AIService {
  private provider: IAIProvider

  constructor(customProvider?: IAIProvider) {
    this.provider = customProvider || getAIProvider()
  }

  setProvider(provider: IAIProvider) {
    this.provider = provider
  }

  getProviderName(): string {
    return this.provider.name
  }

  /**
   * Builds repository context if user query or active conversation idea relates to repository work
   */
  private async buildRepositoryContext(userPrompt: string, fallbackIdea?: string): Promise<string> {
    try {
      let matches = await repositorySearchService.compareStudentIdea(userPrompt, userPrompt, [], 'rvce-main')
      if (matches.length === 0 && fallbackIdea && fallbackIdea.trim().length >= 3) {
        matches = await repositorySearchService.compareStudentIdea(fallbackIdea, fallbackIdea, [], 'rvce-main')
      }
      if (matches.length === 0) return ''

      const top = matches[0]
      const missing = top.sourceAttribution.missingDetails.length > 0
        ? top.sourceAttribution.missingDetails.join(', ')
        : 'None noted'

      return `\n\n[COLLEGE REPOSITORY INTELLIGENCE DETECTED]
Matched Historical Record: "${top.project.title}"
- Source Link: /explore-projects/${top.project.id}
- Academic Year: ${top.project.academicYear}
- Department: ${top.project.department}
- Verification Status: ${top.sourceAttribution.verificationStatus}
- Similarity Classification: ${top.classification} (Confidence: ${Math.round(top.score * 100)}%)
- Documented Features: ${top.project.features.slice(0, 4).join(', ')}
- Documented Tech Stack: ${top.project.technologyStack.map((t) => t.name).join(', ')}
- Source Attribution: [Confirmed from Project Documentation: ${top.sourceAttribution.confirmedFromDocumentation ? 'Yes' : 'Pending verification'}]
- Missing Details in Record: [Not Available in Documented Record: ${missing}]
- Academic Critique Directive: Explicitly cite this previous project, its academic year, department, and source link. State what is confirmed from documentation vs missing. Never imply plagiarism, and explain similarity limitations clearly.`
    } catch {
      return ''
    }
  }

  private buildConversationStateSummary(context?: any): string {
    if (!context) return ''
    const parts: string[] = []
    if (context.currentProjectIdea) parts.push(`Active Project Idea: ${context.currentProjectIdea}`)
    if (context.projectCategory) parts.push(`Category: ${context.projectCategory}`)
    if (context.teamSize) parts.push(`Team Size: ${context.teamSize}`)
    if (context.technicalExperience) parts.push(`Experience: ${context.technicalExperience}`)
    if (context.preferredTechnologies?.length) {
      parts.push(`Technologies: ${context.preferredTechnologies.join(', ')}`)
    }
    if (context.matchedRepositoryProject?.title) {
      parts.push(`Matched Repository Benchmark: ${context.matchedRepositoryProject.title}`)
    }
    if (parts.length === 0) return ''
    return `\n\n[ACTIVE STUDENT PROJECT CONTEXT]\n${parts.join('\n')}`
  }

  /**
   * Generates a non-streaming academic mentor response and persists it
   */
  async generateMentorResponse(
    conversationId: string,
    ownerId: string,
    userPrompt: string
  ): Promise<IMessage> {
    // 1. Add user message
    await conversationService.addMessage(conversationId, ownerId, 'user', userPrompt)

    // 2. Fetch conversation history for full context
    const history = await conversationService.getConversationMessages(conversationId, ownerId)

    // 3. Process turn with Conversational Intelligence Engine
    const turnResult = await conversationalEngine.processTurn(
      conversationId,
      ownerId,
      userPrompt,
      history
    )

    // Check repository intelligence and master knowledge base
    const repoContext = await this.buildRepositoryContext(userPrompt, turnResult.updatedContext?.currentProjectIdea)
    const knowledgeContext = knowledgeService.queryKnowledge(userPrompt)
    const stateSummary = this.buildConversationStateSummary(turnResult.updatedContext)
    let effectiveSystemPrompt = SYSTEM_MENTOR_PROMPT
    if (stateSummary) effectiveSystemPrompt += stateSummary
    if (repoContext) effectiveSystemPrompt += `\n${repoContext}`
    if (knowledgeContext) effectiveSystemPrompt += `\n\n${knowledgeContext}`
    effectiveSystemPrompt += `\n\n[CONVERSATIONAL_ENGINE_RESPONSE]\n${turnResult.responseMarkdown}`

    // Format for AI provider (keep last 12 messages)
    const formattedMessages: AIMessagePayload[] = history.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 4. Call AI provider
    const aiRes = await this.provider.generateResponse({
      messages: formattedMessages,
      systemPrompt: effectiveSystemPrompt,
      temperature: 0.7,
    })

    // 5. Save and return assistant message
    return conversationService.addMessage(
      conversationId,
      ownerId,
      'assistant',
      aiRes.content,
      'completed',
      {
        provider: aiRes.provider,
        model: aiRes.model,
        tokensUsed: aiRes.tokensUsed,
      }
    )
  }

  /**
   * Generates a streaming response using Server-Sent Events (SSE)
   */
  async streamMentorResponse(
    conversationId: string,
    ownerId: string,
    userPrompt: string,
    callbacks: {
      onToken: (token: string) => void
      onDone: (assistantMessage: IMessage) => void
      onError: (err: Error) => void
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
    // 1. Persist user message
    await conversationService.addMessage(conversationId, ownerId, 'user', userPrompt)

    // 2. Fetch context
    const history = await conversationService.getConversationMessages(conversationId, ownerId)

    // 3. Process turn with Conversational Intelligence Engine
    const turnResult = await conversationalEngine.processTurn(
      conversationId,
      ownerId,
      userPrompt,
      history
    )

    const repoContext = await this.buildRepositoryContext(userPrompt, turnResult.updatedContext?.currentProjectIdea)
    const knowledgeContext = knowledgeService.queryKnowledge(userPrompt)
    const stateSummary = this.buildConversationStateSummary(turnResult.updatedContext)
    let effectiveSystemPrompt = SYSTEM_MENTOR_PROMPT
    if (stateSummary) effectiveSystemPrompt += stateSummary
    if (repoContext) effectiveSystemPrompt += `\n${repoContext}`
    if (knowledgeContext) effectiveSystemPrompt += `\n\n${knowledgeContext}`
    effectiveSystemPrompt += `\n\n[CONVERSATIONAL_ENGINE_RESPONSE]\n${turnResult.responseMarkdown}`

    const formattedMessages: AIMessagePayload[] = history.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 3. Stream from provider
    await this.provider.streamResponse(
      {
        messages: formattedMessages,
        systemPrompt: effectiveSystemPrompt,
        temperature: 0.7,
        abortSignal,
      },
      {
        onToken: callbacks.onToken,
        onComplete: async (fullText, metadata) => {
          try {
            const assistantMsg = await conversationService.addMessage(
              conversationId,
              ownerId,
              'assistant',
              fullText,
              abortSignal?.aborted ? 'interrupted' : 'completed',
              metadata
            )
            callbacks.onDone(assistantMsg)
          } catch (err: any) {
            callbacks.onError(err)
          }
        },
        onError: callbacks.onError,
      }
    )
  }
}

export const aiService = new AIService()
