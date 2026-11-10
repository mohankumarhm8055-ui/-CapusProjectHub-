import { ConversationRepository } from '../conversation.model.js'
import {
  IConversationContext,
  ExperienceLevel,
  ConversationMode,
} from './context.types.js'

export class ContextManager {
  /**
   * Initializes or fetches existing structured context for a conversation
   */
  async getOrCreateContext(
    conversationId: string,
    ownerId: string
  ): Promise<IConversationContext> {
    const conv = await ConversationRepository.findById(conversationId)
    if (!conv || conv.ownerId !== ownerId) {
      throw new Error('Forbidden: You do not have permission to access this conversation context')
    }

    if (conv.context) {
      return conv.context
    }

    const defaultContext: IConversationContext = {
      conversationId,
      mode: 'GENERAL_MENTORING',
      studentObjectives: [],
      proposedFeatures: [],
      acceptedRecommendations: [],
      rejectedRecommendations: [],
      technicalExperience: 'intermediate',
      preferredTechnologies: [],
      currentDiscussionStage: 'INITIAL',
      topicsDiscussed: [],
      introSectionIndex: 0,
    }

    await ConversationRepository.update(conversationId, { context: defaultContext })
    return defaultContext
  }

  /**
   * Updates conversation context in database
   */
  async updateContext(
    conversationId: string,
    ownerId: string,
    updates: Partial<IConversationContext>
  ): Promise<IConversationContext> {
    const current = await this.getOrCreateContext(conversationId, ownerId)

    const merged: IConversationContext = {
      ...current,
      ...updates,
      topicsDiscussed: Array.from(
        new Set([...current.topicsDiscussed, ...(updates.topicsDiscussed || [])])
      ),
      studentObjectives: Array.from(
        new Set([...current.studentObjectives, ...(updates.studentObjectives || [])])
      ),
      proposedFeatures: Array.from(
        new Set([...current.proposedFeatures, ...(updates.proposedFeatures || [])])
      ),
      preferredTechnologies: Array.from(
        new Set([...current.preferredTechnologies, ...(updates.preferredTechnologies || [])])
      ),
      acceptedRecommendations: Array.from(
        new Set([...current.acceptedRecommendations, ...(updates.acceptedRecommendations || [])])
      ),
      rejectedRecommendations: Array.from(
        new Set([...current.rejectedRecommendations, ...(updates.rejectedRecommendations || [])])
      ),
    }

    await ConversationRepository.update(conversationId, { context: merged })
    return merged
  }

  /**
   * Analyzes student message to extract structured context signals
   */
  extractContextFromMessage(
    message: string,
    current: IConversationContext
  ): Partial<IConversationContext> {
    const lower = message.toLowerCase()
    const extracted: Partial<IConversationContext> = {}

    // 1. Detect Experience Level
    if (
      lower.includes('beginner') ||
      lower.includes('freshman') ||
      lower.includes('new to programming') ||
      lower.includes('first time building') ||
      lower.includes('2nd year')
    ) {
      extracted.technicalExperience = 'beginner'
    } else if (
      lower.includes('advanced') ||
      lower.includes('senior engineer') ||
      lower.includes('production experience') ||
      lower.includes('experienced team')
    ) {
      extracted.technicalExperience = 'advanced'
    } else if (lower.includes('intermediate') || lower.includes('3rd year') || lower.includes('have built some projects')) {
      extracted.technicalExperience = 'intermediate'
    }

    // 2. Detect Team Size
    const teamMatch =
      lower.match(/team of (\d+)/) ||
      lower.match(/(\d+) members?/) ||
      lower.match(/group of (\d+)/)
    if (teamMatch) {
      extracted.teamSize = parseInt(teamMatch[1], 10)
    } else if (lower.includes('solo project') || lower.includes('working alone') || lower.includes('individual project')) {
      extracted.teamSize = 1
    } else if (lower.includes('pair project') || lower.includes('with a partner') || lower.includes('2 of us')) {
      extracted.teamSize = 2
    }

    // 3. Detect Preferred Technologies
    const techCatalog = [
      'react',
      'typescript',
      'node',
      'nodejs',
      'python',
      'fastapi',
      'flask',
      'django',
      'mongodb',
      'postgresql',
      'docker',
      'flutter',
      'pytorch',
      'tensorflow',
      'express',
      'tailwind',
      'webrtc',
      'redis',
    ]
    const detectedTech: string[] = []
    for (const tech of techCatalog) {
      const regex = new RegExp(`\\b${tech}\\b`, 'i')
      if (regex.test(lower)) {
        detectedTech.push(tech.charAt(0).toUpperCase() + tech.slice(1))
      }
    }
    if (detectedTech.length > 0) {
      extracted.preferredTechnologies = detectedTech
    }

    // 4. Detect Project Category
    if (lower.includes('hospital') || lower.includes('medical') || lower.includes('health') || lower.includes('patient')) {
      extracted.projectCategory = 'Healthcare Informatics'
    } else if (lower.includes('academic') || lower.includes('college') || lower.includes('student') || lower.includes('campus') || lower.includes('attendance')) {
      extracted.projectCategory = 'Academic Systems'
    } else if (lower.includes('finance') || lower.includes('bank') || lower.includes('fraud') || lower.includes('payment')) {
      extracted.projectCategory = 'FinTech & Security'
    } else if (lower.includes('sensor') || lower.includes('iot') || lower.includes('arduino') || lower.includes('raspberry')) {
      extracted.projectCategory = 'Internet of Things (IoT)'
    } else if (lower.includes('detection') || lower.includes('classifier') || lower.includes('model') || lower.includes('llm') || lower.includes('nlp')) {
      extracted.projectCategory = 'Artificial Intelligence & Machine Learning'
    }

    // 5. Detect Project Idea Definition
    const ideaPatterns = [
      /(?:i want to (?:develop|build|create)|we are (?:a team of \d+ )?(?:developing|building|creating)|(?:developing|building|creating)|my (?:project )?idea is|planning to build|working on)\s+(?:an?|the)?\s*([^.!?\n]+)/i,
    ]
    for (const pattern of ideaPatterns) {
      const match = message.match(pattern)
      if (match && match[1] && match[1].trim().length > 5) {
        let idea = match[1].trim()
        // Strip trailing tech declarations if present e.g. "with Python and React"
        idea = idea.replace(/\s+(?:using|with)\s+(?:python|react|node|flutter|mongodb|docker|fastapi)[\s\w,]*$/i, '').trim()
        // Ignore generic statements like "project" or "something"
        if (!['project', 'something', 'website', 'system'].includes(idea.toLowerCase()) && idea.length > 3) {
          extracted.currentProjectIdea = idea
          extracted.mode = 'PROJECT_DISCOVERY'
          extracted.currentDiscussionStage = 'DISCOVERY_IDEA_ENTERED'
          break
        }
      }
    }

    // 6. Detect Explicit Mode Switches
    if (
      lower.includes('tell me about campusprojecthub') ||
      lower.includes('explain campusprojecthub') ||
      lower.includes('what is campusprojecthub') ||
      lower.includes('introduce campusprojecthub')
    ) {
      extracted.mode = 'CAMPUSPROJECTHUB_INTRO'
      extracted.currentDiscussionStage = 'INTRO_STEP_1'
      extracted.introSectionIndex = 0
    }

    // 7. Detect Feature Rejections / Acceptances
    if (lower.includes('drop the voice') || lower.includes('reject voice') || lower.includes("let's not do voice") || lower.includes('remove webrtc')) {
      extracted.rejectedRecommendations = ['Real-time WebRTC Voice Interaction']
    }
    if (lower.includes('accept deterministic') || lower.includes('use docx') || lower.includes('keep proposal generator')) {
      extracted.acceptedRecommendations = ['Deterministic IEEE 830 Proposal Generator']
    }

    return extracted
  }
}

export const contextManager = new ContextManager()
