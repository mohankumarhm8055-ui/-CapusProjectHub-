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
   * Builds repository context using already-retrieved matches from ConversationalEngine (zero duplicate queries)
   * or falls back to single multi-signal retrieval when needed.
   */
  private async buildRepositoryContext(
    userPrompt: string,
    fallbackIdea?: string,
    preferredTechnologies: string[] = [],
    preFetchedMatches?: any[],
    retrievalFailedAlready?: boolean
  ): Promise<{ contextString: string; retrievedCount: number; retrievalLatencyMs: number; failed: boolean }> {
    if (retrievalFailedAlready) {
      return {
        contextString:
          '\n\n[COLLEGE REPOSITORY INTELLIGENCE UNAVAILABLE]\nRepository search failed during this turn. You MUST explicitly tell the student that repository search is unavailable and NEVER claim no matching project exists.',
        retrievedCount: 0,
        retrievalLatencyMs: 0,
        failed: true,
      }
    }

    try {
      let matches = preFetchedMatches
      let latencyMs = 0

      if (!matches) {
        const start = Date.now()
        matches = await repositorySearchService.compareStudentIdea(
          userPrompt,
          userPrompt,
          preferredTechnologies,
          undefined
        )
        if (matches.length === 0 && fallbackIdea && fallbackIdea.trim().length >= 3) {
          matches = await repositorySearchService.compareStudentIdea(
            fallbackIdea,
            fallbackIdea,
            preferredTechnologies,
            undefined
          )
        }
        latencyMs = Date.now() - start
      }

      if (matches.length === 0) {
        return {
          contextString: `\n\n[COLLEGE REPOSITORY INTELLIGENCE DETECTED]\nSearch executed across accessible repository records: No matching prior project found. You may tell the student no close match exists in the accessible repository, without claiming global novelty outside the college archive.`,
          retrievedCount: 0,
          retrievalLatencyMs: latencyMs,
          failed: false,
        }
      }

      const formattedMatches = matches.slice(0, 2).map((top, index) => {
        const p = top.project
        const batchInfo = p.batch || 'Unavailable — not explicitly recorded in repository metadata'
        const semesterInfo = p.semester || 'Not recorded'
        const missing =
          top.sourceAttribution.missingDetails.length > 0
            ? top.sourceAttribution.missingDetails.join(', ')
            : 'None noted'
        const limitations =
          p.limitations && p.limitations.length > 0
            ? p.limitations.join('; ')
            : 'None explicitly documented (do not assume no limitations exist)'
        const futureWork =
          p.futureEnhancements && p.futureEnhancements.length > 0
            ? p.futureEnhancements.join('; ')
            : 'None explicitly documented'

        return `Match #${index + 1}: "${p.title}"
- Source Link: /explore-projects/${p.id}
- Academic Year: ${p.academicYear} | Batch: ${batchInfo} | Semester: ${semesterInfo}
- Department: ${p.department}
- Verification Status: ${top.sourceAttribution.verificationStatus} (${top.sourceAttribution.sourceType})
- Academic Similarity Classification: ${top.academicClassification} (${top.classification})
- Classification Reason: ${top.classificationReason}
- Documented Problem: ${p.problemStatement}
- Documented Solution: ${top.analysis.documentedSolution}
- Documented Features: ${p.features.join('; ') || 'Not listed'}
- Documented Modules: ${p.modules.map((m: any) => `${m.name}: ${m.description}`).join('; ') || 'Not listed'}
- Documented Tech Stack: ${p.technologyStack.map((t: any) => t.name).join(', ') || 'Not listed'}
- Documented Limitations: ${limitations}
- Documented Future Enhancements: ${futureWork}
- GitHub Link: ${p.githubUrl || 'Not archived'}
- Reports Archived: ${p.reportDocuments.length > 0 ? p.reportDocuments.map((d: any) => d.title).join(', ') : 'Not archived'}
- Screenshots Archived: ${p.screenshots.length > 0 ? `${p.screenshots.length} available` : 'Not archived'}
- Missing Details in Documented Record: ${missing}`
      })

      return {
        contextString: `\n\n[COLLEGE REPOSITORY INTELLIGENCE DETECTED]
${formattedMatches.join('\n\n')}
- Grounding Directive: Cite only confirmed facts above. Never invent missing fields (such as batch, links, or metrics) and NEVER emit arbitrary similarity or originality percentages. Never equate overlap with plagiarism.`,
        retrievedCount: matches.length,
        retrievalLatencyMs: latencyMs,
        failed: false,
      }
    } catch {
      return {
        contextString:
          '\n\n[COLLEGE REPOSITORY INTELLIGENCE UNAVAILABLE]\nRepository search threw an unexpected error. Explicitly disclose that retrieval failed.',
        retrievedCount: 0,
        retrievalLatencyMs: 0,
        failed: true,
      }
    }
  }

  private buildConversationStateSummary(context?: any): string {
    if (!context) return ''
    const parts: string[] = []
    if (context.currentProjectIdea) parts.push(`Active Project Idea: ${context.currentProjectIdea}`)
    if (context.projectCategory) parts.push(`Domain: ${context.projectCategory}`)

    // Explicit Confirmed Constraints vs Pending Assumptions
    const confirmedList = new Set(context.explicitlyProvidedConstraints || [])
    parts.push(
      `Learning Depth: ${context.technicalExperience || 'intermediate'} (${confirmedList.has('experience') ? 'Confirmed by student' : 'Profile/Default'})`
    )
    if (context.explanationStyle) parts.push(`Explanation Style: ${context.explanationStyle}`)
    if (context.languagePreference && context.languagePreference !== 'auto') {
      parts.push(`Preferred Communication Language: ${context.languagePreference}`)
    }
    if (context.teamSize) {
      parts.push(`Team Size: ${context.teamSize} (${confirmedList.has('teamSize') ? 'Confirmed' : 'Profile default'})`)
    }
    if (context.developmentWeeks) {
      parts.push(`Timeline: ${context.developmentWeeks} weeks (${confirmedList.has('developmentWeeks') ? 'Confirmed' : 'Profile default'})`)
    }
    if (context.budget) parts.push(`Budget: ${context.budget}`)
    if (context.hardwareRequirements) parts.push(`Hardware: ${context.hardwareRequirements}`)
    if (context.availableDatasets) parts.push(`Datasets: ${context.availableDatasets}`)
    if (context.academicRequirements) parts.push(`Academic Requirement: ${context.academicRequirements}`)
    if (context.preferredTechnologies?.length) {
      parts.push(`Known/Preferred Technologies: ${context.preferredTechnologies.join(', ')}`)
    }
    if (context.acceptedRecommendations?.length) {
      parts.push(`Accepted Recommendations: ${context.acceptedRecommendations.join(', ')}`)
    }
    if (context.rejectedRecommendations?.length) {
      parts.push(`Rejected Features: ${context.rejectedRecommendations.join(', ')}`)
    }
    if (context.previousProjectIdeas?.length) {
      parts.push(`Prior Ideas Discussed: ${context.previousProjectIdeas.map((p: any) => p.title).join(', ')}`)
    }
    if (context.askedQuestionKeys?.length) {
      parts.push(`Questions Already Asked (DO NOT REPEAT): ${context.askedQuestionKeys.join(', ')}`)
    }
    if (context.matchedRepositoryProject?.title) {
      parts.push(
        `Matched Repository Benchmark: ${context.matchedRepositoryProject.title} (${context.matchedRepositoryProject.sourceUrl || 'link unavailable'})`
      )
    }
    if (context.activeIdeaAnalysis) {
      const a = context.activeIdeaAnalysis
      parts.push(
        `12-Dim Idea Summary: Problem="${a.coreProblem}" | Users="${(a.targetUsers || []).join(', ')}" | Solution="${a.proposedSolution}"`
      )
    }
    if (parts.length === 0) return ''
    return `\n\n[ACTIVE STUDENT PROJECT & LEARNING CONTEXT]\n${parts.join('\n')}`
  }

  /**
   * Builds the grounded system prompt, repository context, and conversation history window
   * without duplicating repository queries when ConversationalEngine already retrieved matches.
   */
  private async preparePromptContext(
    conversationId: string,
    ownerId: string,
    userPrompt: string,
    history: IMessage[]
  ): Promise<{
    effectiveSystemPrompt: string
    formattedMessages: AIMessagePayload[]
    telemetry: {
      retrievalLatencyMs: number
      retrievedRecordsCount: number
      retrievalFailed: boolean
    }
  }> {
    const turnResult = await conversationalEngine.processTurn(
      conversationId,
      ownerId,
      userPrompt,
      history
    )

    let repoContext = ''
    let retrievalLatencyMs = turnResult.retrievalTelemetry?.latencyMs || 0
    let retrievedRecordsCount = turnResult.retrievalTelemetry?.retrievedCount || 0
    let retrievalFailed = turnResult.retrievalTelemetry?.failed || false

    if (this.provider.name !== 'mock' || turnResult.retrievalTelemetry?.failed) {
      const repoResult = await this.buildRepositoryContext(
        userPrompt,
        turnResult.updatedContext?.currentProjectIdea,
        turnResult.updatedContext?.preferredTechnologies || [],
        turnResult.retrievedMatches,
        turnResult.retrievalTelemetry?.failed
      )
      repoContext = repoResult.contextString
      retrievalLatencyMs = Math.max(retrievalLatencyMs, repoResult.retrievalLatencyMs)
      retrievedRecordsCount = Math.max(retrievedRecordsCount, repoResult.retrievedCount)
      retrievalFailed = retrievalFailed || repoResult.failed
    }

    const knowledgeContext = knowledgeService.queryKnowledge(userPrompt)
    const stateSummary = this.buildConversationStateSummary(turnResult.updatedContext)

    let effectiveSystemPrompt = SYSTEM_MENTOR_PROMPT
    if (stateSummary) effectiveSystemPrompt += stateSummary
    if (repoContext) effectiveSystemPrompt += `\n${repoContext}`
    if (knowledgeContext) effectiveSystemPrompt += `\n\n${knowledgeContext}`

    const level = turnResult.updatedContext?.technicalExperience || 'intermediate'
    const langPref = turnResult.updatedContext?.languagePreference || 'auto'

    if (this.provider.name === 'mock') {
      effectiveSystemPrompt += `\n\n[CONVERSATIONAL_ENGINE_RESPONSE]\n${turnResult.responseMarkdown}`
    } else {
      effectiveSystemPrompt += `\n\n[ADAPTIVE_TEACHING_DIRECTIVE]\nAdapt explanation depth cleanly for a **${level}** student without reducing technical accuracy. Language preference: ${langPref} (preserve English programming keywords, library names, and API names untranslated).\n\n[MENTOR_ANALYSIS_AND_DRAFT_EVIDENCE]\n${turnResult.responseMarkdown}\n\nRespond like a thoughtful academic mentor grounded strictly in the verified facts above. Keep source attribution explicit, ask at most one unasked follow-up question, and never fabricate missing details or percentage scores.`
    }

    // Selective recent window (6 turns) backed by structured summary above rather than sending full raw history
    const formattedMessages: AIMessagePayload[] = history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    return {
      effectiveSystemPrompt,
      formattedMessages,
      telemetry: { retrievalLatencyMs, retrievedRecordsCount, retrievalFailed },
    }
  }

  /**
   * Generates a non-streaming academic mentor response and persists it
   */
  async generateMentorResponse(
    conversationId: string,
    ownerId: string,
    userPrompt: string
  ): Promise<IMessage> {
    const startTime = Date.now()
    await conversationService.addMessage(conversationId, ownerId, 'user', userPrompt)
    const history = await conversationService.getConversationMessages(conversationId, ownerId)

    const { effectiveSystemPrompt, formattedMessages, telemetry } = await this.preparePromptContext(
      conversationId,
      ownerId,
      userPrompt,
      history
    )

    let aiRes
    try {
      aiRes = await this.provider.generateResponse({
        messages: formattedMessages,
        systemPrompt: effectiveSystemPrompt,
        temperature: this.provider.name === 'mock' ? 0.7 : 0.35,
        maxTokens: 3072,
      })
    } catch (providerErr: any) {
      const err: any = new Error(
        `AI provider request failed (${providerErr?.message || 'timeout or upstream error'}). Please retry shortly.`
      )
      err.statusCode = 502
      err.code = 'AI_PROVIDER_UNAVAILABLE'
      throw err
    }

    if (!aiRes || typeof aiRes.content !== 'string' || !aiRes.content.trim()) {
      const err: any = new Error(
        'AI provider returned an empty or invalid response. No fabricated answer was saved.'
      )
      err.statusCode = 502
      err.code = 'INVALID_AI_RESPONSE'
      throw err
    }

    const responseLatencyMs = Date.now() - startTime

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
        responseLatencyMs,
        retrievalLatencyMs: telemetry.retrievalLatencyMs,
        retrievedRecordsCount: telemetry.retrievedRecordsCount,
        retrievalFailed: telemetry.retrievalFailed,
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
    const startTime = Date.now()
    await conversationService.addMessage(conversationId, ownerId, 'user', userPrompt)
    const history = await conversationService.getConversationMessages(conversationId, ownerId)

    const { effectiveSystemPrompt, formattedMessages, telemetry } = await this.preparePromptContext(
      conversationId,
      ownerId,
      userPrompt,
      history
    )

    await this.provider.streamResponse(
      {
        messages: formattedMessages,
        systemPrompt: effectiveSystemPrompt,
        temperature: this.provider.name === 'mock' ? 0.7 : 0.35,
        maxTokens: 3072,
        abortSignal,
      },
      {
        onToken: callbacks.onToken,
        onComplete: async (fullText, metadata) => {
          try {
            if (!abortSignal?.aborted && (!fullText || !fullText.trim())) {
              callbacks.onError(new Error('AI provider returned an empty response stream.'))
              return
            }
            const assistantMsg = await conversationService.addMessage(
              conversationId,
              ownerId,
              'assistant',
              fullText,
              abortSignal?.aborted ? 'interrupted' : 'completed',
              {
                ...metadata,
                responseLatencyMs: Date.now() - startTime,
                retrievalLatencyMs: telemetry.retrievalLatencyMs,
                retrievedRecordsCount: telemetry.retrievedRecordsCount,
                retrievalFailed: telemetry.retrievalFailed,
              }
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
