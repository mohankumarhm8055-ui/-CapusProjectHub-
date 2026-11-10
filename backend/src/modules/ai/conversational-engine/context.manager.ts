import { ConversationRepository } from '../conversation.model.js'
import { IConversationContext } from './context.types.js'
import { ideaAnalyzer } from './idea.analyzer.js'
import { LearningProfileRepository } from '../personalization/learningProfile.model.js'
import { adaptiveTeachingEngine } from '../personalization/teaching.adapter.js'

export class ContextManager {
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

    const userProfile = await LearningProfileRepository.findForUser(ownerId).catch(() => null)
    const explicitConstraints: string[] = []
    if (userProfile?.defaultConstraints?.teamSize) explicitConstraints.push('teamSize')
    if (userProfile?.defaultConstraints?.durationWeeks) explicitConstraints.push('developmentWeeks')

    const defaultContext: IConversationContext = {
      conversationId,
      mode: 'GENERAL_MENTORING',
      studentObjectives: [],
      proposedFeatures: [],
      acceptedRecommendations: [],
      rejectedRecommendations: [],
      technicalExperience: userProfile?.explanationLevel || 'intermediate',
      teamSize: userProfile?.defaultConstraints?.teamSize,
      developmentWeeks: userProfile?.defaultConstraints?.durationWeeks,
      availableDevelopmentTime: userProfile?.defaultConstraints?.durationWeeks
        ? `${userProfile.defaultConstraints.durationWeeks} weeks`
        : undefined,
      budget: userProfile?.defaultConstraints?.budget,
      hardwareRequirements: userProfile?.defaultConstraints?.hardwareAvailable,
      availableDatasets: userProfile?.defaultConstraints?.availableDatasets,
      academicRequirements: userProfile?.defaultConstraints?.academicRequirement,
      explanationStyle: userProfile?.explanationStyle || 'step_by_step',
      languagePreference: userProfile?.preferredLanguage || 'auto',
      explicitlyProvidedConstraints: explicitConstraints,
      askedQuestionKeys: [],
      unansweredQuestions: [],
      preferredTechnologies: userProfile?.familiarTools || [],
      previousProjectIdeas: [],
      currentDiscussionStage: 'INITIAL',
      topicsDiscussed: [],
      introSectionIndex: 0,
    }

    await ConversationRepository.update(conversationId, { context: defaultContext })
    return defaultContext
  }

  /**
   * Allows student owner to explicitly correct or update remembered conversation context.
   */
  async correctContext(
    conversationId: string,
    ownerId: string,
    corrections: Partial<IConversationContext>
  ): Promise<IConversationContext> {
    const current = await this.getOrCreateContext(conversationId, ownerId)
    const updated: IConversationContext = {
      ...current,
      ...corrections,
      conversationId: current.conversationId,
      topicsDiscussed: corrections.topicsDiscussed || current.topicsDiscussed,
      preferredTechnologies: corrections.preferredTechnologies || current.preferredTechnologies,
      explicitlyProvidedConstraints: Array.from(
        new Set([
          ...(current.explicitlyProvidedConstraints || []),
          ...(corrections.explicitlyProvidedConstraints || []),
        ])
      ),
    }
    await ConversationRepository.update(conversationId, { context: updated })
    return updated
  }

  /**
   * Resets conversation context cleanly back to defaults for the owner.
   */
  async clearContext(conversationId: string, ownerId: string): Promise<IConversationContext> {
    const conv = await ConversationRepository.findById(conversationId)
    if (!conv || conv.ownerId !== ownerId) {
      throw new Error('Forbidden: You do not have permission to clear this conversation context')
    }
    await ConversationRepository.update(conversationId, { context: undefined })
    return this.getOrCreateContext(conversationId, ownerId)
  }

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
        new Set([...(current.topicsDiscussed || []), ...(updates.topicsDiscussed || [])])
      ),
      studentObjectives: Array.from(
        new Set([...(current.studentObjectives || []), ...(updates.studentObjectives || [])])
      ),
      proposedFeatures: Array.from(
        new Set([...(current.proposedFeatures || []), ...(updates.proposedFeatures || [])])
      ),
      preferredTechnologies: Array.from(
        new Set([...(current.preferredTechnologies || []), ...(updates.preferredTechnologies || [])])
      ),
      acceptedRecommendations: Array.from(
        new Set([...(current.acceptedRecommendations || []), ...(updates.acceptedRecommendations || [])])
      ),
      rejectedRecommendations: Array.from(
        new Set([...(current.rejectedRecommendations || []), ...(updates.rejectedRecommendations || [])])
      ),
      explicitlyProvidedConstraints: Array.from(
        new Set([
          ...(current.explicitlyProvidedConstraints || []),
          ...(updates.explicitlyProvidedConstraints || []),
        ])
      ),
      askedQuestionKeys: Array.from(
        new Set([...(current.askedQuestionKeys || []), ...(updates.askedQuestionKeys || [])])
      ),
    }

    await ConversationRepository.update(conversationId, { context: merged })
    return merged
  }

  /**
   * Analyzes student message to extract structured context signals & midway idea pivots
   */
  extractContextFromMessage(
    message: string,
    current: IConversationContext
  ): Partial<IConversationContext> {
    const lower = message.toLowerCase().trim()
    const extracted: Partial<IConversationContext> = {}
    const newlyProvidedConstraints: string[] = []

    // 1. Detect Experience Level
    if (
      lower.includes('beginner') ||
      lower.includes('freshman') ||
      lower.includes('new to programming') ||
      lower.includes('first time building') ||
      lower.includes('2nd year')
    ) {
      extracted.technicalExperience = 'beginner'
      newlyProvidedConstraints.push('experience')
    } else if (
      lower.includes('advanced') ||
      lower.includes('senior engineer') ||
      lower.includes('production experience') ||
      lower.includes('experienced team')
    ) {
      extracted.technicalExperience = 'advanced'
      newlyProvidedConstraints.push('experience')
    } else if (
      lower.includes('intermediate') ||
      lower.includes('3rd year') ||
      lower.includes('have built some projects')
    ) {
      extracted.technicalExperience = 'intermediate'
      newlyProvidedConstraints.push('experience')
    }

    // 2. Detect Team Size
    const teamMatch =
      lower.match(/team of (\d+)/) ||
      lower.match(/(\d+)\s*(?:members?|students?|people|developers?)/) ||
      lower.match(/group of (\d+)/)
    if (teamMatch) {
      extracted.teamSize = parseInt(teamMatch[1], 10)
      newlyProvidedConstraints.push('teamSize')
    } else if (
      lower.includes('solo project') ||
      lower.includes('working alone') ||
      lower.includes('individual project')
    ) {
      extracted.teamSize = 1
      newlyProvidedConstraints.push('teamSize')
    } else if (
      lower.includes('pair project') ||
      lower.includes('with a partner') ||
      lower.includes('2 of us')
    ) {
      extracted.teamSize = 2
      newlyProvidedConstraints.push('teamSize')
    }

    // 3. Detect Timeline (weeks or months)
    const weeksMatch = lower.match(/(\d+)\s*weeks?/)
    const monthsMatch = lower.match(/(\d+)\s*months?/)
    if (weeksMatch) {
      extracted.developmentWeeks = parseInt(weeksMatch[1], 10)
      extracted.availableDevelopmentTime = `${extracted.developmentWeeks} weeks`
      newlyProvidedConstraints.push('developmentWeeks')
    } else if (monthsMatch) {
      const weeks = parseInt(monthsMatch[1], 10) * 4
      extracted.developmentWeeks = weeks
      extracted.availableDevelopmentTime = `${weeks} weeks`
      newlyProvidedConstraints.push('developmentWeeks')
    }

    // 4. Detect Budget, Hardware, Datasets, Language Switch & Academic Constraints
    if (lower.includes('zero budget') || lower.includes('no budget') || lower.includes('free tier') || lower.includes('open source only')) {
      extracted.budget = 'Zero budget / free open-source tooling'
      newlyProvidedConstraints.push('budget')
    }
    if (lower.includes('laptop only') || lower.includes('no gpu') || lower.includes('basic hardware') || lower.includes('raspberry pi')) {
      extracted.hardwareRequirements = lower.includes('raspberry pi')
        ? 'Raspberry Pi / edge hardware'
        : 'Standard student laptop (CPU only / no dedicated GPU)'
      newlyProvidedConstraints.push('hardware')
    }
    if (lower.includes('no dataset') || lower.includes('kaggle dataset') || lower.includes('public dataset') || lower.includes('custom dataset')) {
      extracted.availableDatasets = lower.includes('no dataset')
        ? 'No pre-labeled dataset yet'
        : lower.includes('kaggle') || lower.includes('public dataset')
        ? 'Public benchmark dataset available'
        : 'Custom / college dataset'
      newlyProvidedConstraints.push('datasets')
    }
    if (lower.includes('mini project') || lower.includes('mini-project') || lower.includes('final year') || lower.includes('vtu')) {
      extracted.academicRequirements = lower.includes('final year')
        ? 'Final-year capstone evaluation'
        : 'Semester mini-project evaluation'
      newlyProvidedConstraints.push('academicRequirements')
    }
    const langInfo = adaptiveTeachingEngine.detectMessageLanguage(message)
    if (langInfo.explicitSwitch) {
      extracted.languagePreference = langInfo.explicitSwitch
    }
    // Depth adjustment phrases update session experience level immediately
    if (/\b(?:simpler|explain simply|less jargon|basic explanation)\b/i.test(lower)) {
      extracted.technicalExperience = 'beginner'
      newlyProvidedConstraints.push('experience')
    } else if (/\b(?:deeper technical detail|more technical depth|advanced detail)\b/i.test(lower)) {
      extracted.technicalExperience = 'advanced'
      newlyProvidedConstraints.push('experience')
    }

    if (newlyProvidedConstraints.length > 0) {
      extracted.explicitlyProvidedConstraints = newlyProvidedConstraints
    }

    // 5. Detect Preferred Technologies
    const techCatalog = [
      'react',
      'typescript',
      'javascript',
      'node',
      'nodejs',
      'python',
      'fastapi',
      'flask',
      'django',
      'mongodb',
      'postgresql',
      'mysql',
      'docker',
      'flutter',
      'pytorch',
      'tensorflow',
      'express',
      'tailwind',
      'webrtc',
      'redis',
      'opencv',
      'nextjs',
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

    // 6. Detect Project Category
    if (lower.includes('hospital') || lower.includes('medical') || lower.includes('health') || lower.includes('patient') || lower.includes('disease')) {
      extracted.projectCategory = 'Healthcare Informatics'
    } else if (lower.includes('academic') || lower.includes('college') || lower.includes('student') || lower.includes('campus') || lower.includes('attendance')) {
      extracted.projectCategory = 'Academic Systems'
    } else if (lower.includes('waste') || lower.includes('recycling') || lower.includes('environment') || lower.includes('solar') || lower.includes('water')) {
      extracted.projectCategory = 'Sustainability & Civic Systems'
    } else if (lower.includes('finance') || lower.includes('bank') || lower.includes('fraud') || lower.includes('payment')) {
      extracted.projectCategory = 'FinTech & Security'
    } else if (lower.includes('sensor') || lower.includes('iot') || lower.includes('arduino') || lower.includes('raspberry')) {
      extracted.projectCategory = 'Internet of Things (IoT)'
    } else if (lower.includes('detection') || lower.includes('classifier') || lower.includes('model') || lower.includes('llm') || lower.includes('nlp')) {
      extracted.projectCategory = 'Artificial Intelligence & Machine Learning'
    }

    // 7. Detect Midway Idea Switch / Change (preserve prior project on stack so student can revisit it later!)
    const isConstraintCorrection =
      lower.startsWith('correction:') ||
      Boolean(langInfo.explicitSwitch) ||
      /\binstead of (?:mongodb|mysql|postgresql|react|python|flask|express)\b/i.test(lower)

    const isIdeaPivot =
      !isConstraintCorrection &&
      (lower.includes('instead') ||
        lower.includes('change my idea') ||
        lower.includes('changed my mind') ||
        lower.includes('switch to') ||
        lower.includes('forget that') ||
        lower.includes('new project idea') ||
        lower.includes('different idea'))

    // 8. Detect Project Idea Definition (full sentence OR short bare title)
    const techOnlyCheck = ideaAnalyzer.isTechnologyOnlyInput(message)
    const ideaPatterns = [
      /(?:instead(?: of [^,]+)?,?\s*(?:i want to|let's|we want to)?\s*(?:build|develop|create)|switch to|new project idea:?|i want to (?:develop|build|create)|we are (?:a team of \d+ )?(?:developing|building|creating)|(?:developing|building|creating)|my (?:project )?idea is|planning to build|working on)\s+(?:an?|the)?\s*([^.!?\n]+)/i,
    ]

    let extractedIdeaText: string | undefined
    for (const pattern of ideaPatterns) {
      const match = message.match(pattern)
      if (match && match[1] && match[1].trim().length > 4) {
        let idea = match[1].trim()
        idea = idea
          .replace(/\s+(?:using|with)\s+(?:python|react|node|flutter|mongodb|docker|fastapi)[\s\w,]*$/i, '')
          .trim()
        if (!['project', 'something', 'website', 'system'].includes(idea.toLowerCase()) && idea.length > 3) {
          extractedIdeaText = idea
          break
        }
      }
    }

    // Bare short title pitch when not asking a question / CampusProjectHub self-intro / tech-only
    const looksLikeQuestion =
      lower.includes('?') ||
      lower.startsWith('what ') ||
      lower.startsWith('how ') ||
      lower.startsWith('why ') ||
      lower.startsWith('which ') ||
      lower.startsWith('can ') ||
      lower.startsWith('is ') ||
      lower.startsWith('tell me') ||
      lower.startsWith('explain ')
    const isSimpleGreeting = ['hi', 'hello', 'hey', 'yes', 'no', 'ok', 'sure', 'next', 'continue'].includes(lower)

    if (
      !extractedIdeaText &&
      !techOnlyCheck.isTechOnly &&
      !looksLikeQuestion &&
      !isSimpleGreeting &&
      !lower.includes('campusprojecthub') &&
      message.trim().split(/\s+/).length >= 2 &&
      message.trim().split(/\s+/).length <= 12 &&
      (!current.currentProjectIdea || isIdeaPivot)
    ) {
      extractedIdeaText = ideaAnalyzer.extractCleanTitle(message)
    }

    if (extractedIdeaText) {
      const changed =
        !current.currentProjectIdea ||
        isIdeaPivot ||
        current.currentProjectIdea.toLowerCase() !== extractedIdeaText.toLowerCase()

      if (changed) {
        if (current.currentProjectIdea) {
          const historyStack = [...(current.previousProjectIdeas || [])]
          if (!historyStack.some((h) => h.title.toLowerCase() === current.currentProjectIdea!.toLowerCase())) {
            historyStack.push({
              title: current.currentProjectIdea,
              category: current.projectCategory,
              matchedRepositoryProject: current.matchedRepositoryProject,
            })
          }
          extracted.previousProjectIdeas = historyStack
        }
        extracted.currentProjectIdea = extractedIdeaText
        extracted.mode = 'PROJECT_DISCOVERY'
        extracted.currentDiscussionStage = isIdeaPivot ? 'DISCOVERY_IDEA_PIVOT' : 'DISCOVERY_IDEA_ENTERED'
        if (isIdeaPivot || (current.currentProjectIdea && current.currentProjectIdea.toLowerCase() !== extractedIdeaText.toLowerCase())) {
          extracted.matchedRepositoryProject = undefined
          extracted.matchedRepositoryProjects = []
          extracted.activeIdeaAnalysis = undefined
        }
      }
    }

    // 9. Detect Explicit Mode Switches
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

    // 10. Detect Feature Rejections / Acceptances
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
