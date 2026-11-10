import { IProjectConstraints } from './evaluation.model.js'

export interface CollectedProjectContext {
  projectTitle: string
  problemStatement: string
  coreObjectives: string[]
  existingFeatures: string[]
  proposedFeatures: string[]
  constraints: IProjectConstraints
  assumptions: string[]
}

export class ContextEngine {
  /**
   * Resolves full project context, merging provided data with conversation history and realistic defaults
   */
  resolveContext(
    provided?: Partial<CollectedProjectContext>,
    conversationSnippet?: string
  ): CollectedProjectContext {
    const assumptions: string[] = []

    // 1. Project Title & Problem Statement
    const projectTitle = provided?.projectTitle || 'CampusProjectHub'
    const isCPH = projectTitle.toLowerCase().includes('campusprojecthub')
    let problemStatement = provided?.problemStatement
    if (!problemStatement) {
      if (isCPH) {
        problemStatement =
          'College students face fragmented project management, duplicate redundant capstones, and lack honest pedagogical feedback before high-stakes faculty reviews.'
        assumptions.push('Defaulted to standard CampusProjectHub academic problem statement.')
      } else {
        problemStatement = `Students and end-users require a reliable, structured software implementation for "${projectTitle}" that addresses documented workflow gaps within realistic semester constraints.`
        assumptions.push(`Synthesized initial problem formulation grounded in "${projectTitle}".`)
      }
    }

    // 2. Core Objectives
    let coreObjectives = provided?.coreObjectives
    if (!coreObjectives || coreObjectives.length === 0) {
      if (isCPH) {
        coreObjectives = [
          'Centralize academic capstone milestones and student team accountability.',
          'Prevent accidental project duplication using repository similarity intelligence.',
          'Provide constructive, honest AI feature evaluation to optimize semester scope.',
          'Standardize faculty review workflows with transparent rubric criteria.',
        ]
        assumptions.push('Loaded standard CampusProjectHub core academic objectives.')
      } else {
        coreObjectives = [
          `Design and implement the core architecture for ${projectTitle} within semester timeline constraints.`,
          'Ensure clear separation between data persistence, domain logic, and user interface layers.',
          'Validate core features with automated tests and verifiable academic evaluation metrics.',
        ]
        assumptions.push(`Synthesized measurable academic objectives for "${projectTitle}".`)
      }
    }

    // 3. Existing Features
    const existingFeatures = provided?.existingFeatures || [
      'Student project management',
      'Team collaboration',
      'College project repository',
    ]

    // 4. Proposed Features to evaluate
    let proposedFeatures = provided?.proposedFeatures
    if (!proposedFeatures || proposedFeatures.length === 0) {
      // Check if conversation mentions specific features
      const text = (conversationSnippet || '').toLowerCase()
      const detected: string[] = []

      if (text.includes('similarity') || text.includes('duplicate')) {
        detected.push('AI project similarity detection')
      }
      if (text.includes('feature evaluation') || text.includes('feasibility')) {
        detected.push('AI feature evaluation')
      }
      if (text.includes('proposal generation') || text.includes('proposal')) {
        detected.push('Academic proposal generation')
      }
      if (text.includes('docx') || text.includes('template')) {
        detected.push('College-specific DOCX templates')
      }
      if (text.includes('faculty review') || text.includes('approval')) {
        detected.push('Faculty review and approval')
      }
      if (text.includes('voice') || text.includes('webrtc')) {
        detected.push('Real-time AI voice interaction')
      }

      proposedFeatures = detected.length > 0
        ? detected
        : [
            'Student project management',
            'Team collaboration',
            'College project repository',
            'AI project similarity detection',
            'AI feature evaluation',
            'Academic proposal generation',
            'College-specific DOCX templates',
            'Faculty review and approval',
            'Real-time AI voice interaction',
          ]
    }

    // 5. Constraints resolution
    const constraints: IProjectConstraints = {
      teamSize: provided?.constraints?.teamSize || 3,
      technicalExperience: provided?.constraints?.technicalExperience || 'intermediate',
      developmentWeeks: provided?.constraints?.developmentWeeks || 12,
      semesterDeadline: provided?.constraints?.semesterDeadline || '12 Weeks (Single Academic Semester)',
      languagesAndFrameworks: provided?.constraints?.languagesAndFrameworks || [
        'TypeScript',
        'React',
        'Tailwind CSS',
        'Node.js',
        'Express',
        'MongoDB',
      ],
      hardwareResources: provided?.constraints?.hardwareResources || ['Standard Student Laptops (CPU execution)'],
      budget: provided?.constraints?.budget || 'Zero Budget / Free Tier & Open-Source Tools',
      academicRequirements:
        provided?.constraints?.academicRequirements ||
        'University Capstone Rubric: Working Software, IEEE-style Documentation, Viva Defense',
    }

    if (!provided?.constraints?.teamSize) {
      assumptions.push('Assumed standard undergraduate capstone team size of 3 students.')
    }
    if (!provided?.constraints?.developmentWeeks) {
      assumptions.push('Assumed standard 12-week semester development timeline.')
    }
    if (!provided?.constraints?.technicalExperience) {
      assumptions.push('Assumed intermediate full-stack engineering proficiency (TypeScript/React/Node.js).')
    }

    return {
      projectTitle,
      problemStatement,
      coreObjectives,
      existingFeatures,
      proposedFeatures,
      constraints,
      assumptions,
    }
  }

  /**
   * Identifies missing context and returns the single next most relevant follow-up question
   */
  getNextFollowUpQuestion(
    provided?: Partial<CollectedProjectContext>,
    conversationHistory?: string
  ): { questionKey: string; questionText: string } | null {
    const text = (conversationHistory || '').toLowerCase()

    // 1. Objectives
    if (
      (!provided?.coreObjectives || provided.coreObjectives.length === 0) &&
      !text.includes('objective') &&
      !text.includes('aim')
    ) {
      return {
        questionKey: 'OBJECTIVE',
        questionText: 'What is the primary academic objective and intended outcome of your project?',
      }
    }

    // 2. Problem Statement
    if (
      !provided?.problemStatement &&
      !text.includes('problem') &&
      !text.includes('issue') &&
      !text.includes('pain point')
    ) {
      return {
        questionKey: 'PROBLEM_STATEMENT',
        questionText: 'What specific problem or institutional workflow gap are you trying to solve?',
      }
    }

    // 3. Team Size
    if (
      !provided?.constraints?.teamSize &&
      !text.includes('team of') &&
      !text.includes('team size') &&
      !text.includes('members')
    ) {
      return {
        questionKey: 'TEAM_SIZE',
        questionText: 'How many students are working together on your project team?',
      }
    }

    // 4. Technical Skills
    if (
      !provided?.constraints?.technicalExperience &&
      !text.includes('beginner') &&
      !text.includes('intermediate') &&
      !text.includes('advanced') &&
      !text.includes('experience')
    ) {
      return {
        questionKey: 'TECHNICAL_EXPERIENCE',
        questionText: "What is your team's technical experience level (beginner, intermediate, or advanced)?",
      }
    }

    // 5. Available Development Time
    if (
      !provided?.constraints?.developmentWeeks &&
      !text.includes('week') &&
      !text.includes('month') &&
      !text.includes('deadline') &&
      !text.includes('timeline')
    ) {
      return {
        questionKey: 'DEVELOPMENT_TIME',
        questionText: 'How many weeks do you have available before your final semester viva submission?',
      }
    }

    // 6. Technologies
    if (
      (!provided?.constraints?.languagesAndFrameworks ||
        provided.constraints.languagesAndFrameworks.length === 0) &&
      !text.includes('stack') &&
      !text.includes('react') &&
      !text.includes('python') &&
      !text.includes('node')
    ) {
      return {
        questionKey: 'TECHNOLOGIES',
        questionText: 'What programming languages, frameworks, and databases do you plan to build with?',
      }
    }

    return null
  }
}

export const contextEngine = new ContextEngine()
