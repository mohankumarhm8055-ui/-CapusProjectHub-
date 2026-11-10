import { StudentIntent, IConversationContext } from './context.types.js'

export class IntentClassifier {
  /**
   * Classifies student message intent based on text, active context, and history
   */
  classifyIntent(message: string, context: IConversationContext): StudentIntent {
    const lower = message.toLowerCase().trim()

    // 1. Comparison Inquiry (Trello, Jira, Google Drive, WhatsApp, what makes different, etc.)
    if (
      lower.includes('different from trello') ||
      lower.includes('compare with trello') ||
      lower.includes('vs trello') ||
      lower.includes('different from jira') ||
      lower.includes('google drive') ||
      lower.includes('why not just use whatsapp') ||
      lower.includes('how is this different from') ||
      lower.includes('what makes campusprojecthub different') ||
      lower.includes('what makes it different') ||
      lower.includes('how does it differentiate') ||
      lower.includes('why campusprojecthub instead of')
    ) {
      return 'COMPARISON_INQUIRY'
    }

    // 1b. Disadvantages & Trade-offs Inquiry
    if (
      lower.includes('what are its disadvantages') ||
      lower.includes('disadvantages') ||
      lower.includes('what are the disadvantages') ||
      lower.includes('drawbacks') ||
      lower.includes('what are the drawbacks') ||
      lower.includes('limitations of campusprojecthub') ||
      lower.includes('what are its limitations') ||
      lower.includes('cons of') ||
      lower.includes('challenges of campusprojecthub')
    ) {
      return 'DISADVANTAGES_INQUIRY'
    }

    // 1c. AI Necessity Inquiry
    if (
      lower.includes('do we really need ai') ||
      lower.includes('do we need ai') ||
      lower.includes('why do we need ai') ||
      lower.includes('is ai necessary') ||
      lower.includes('why use ai') ||
      lower.includes('can we do without ai') ||
      lower.includes('is ai required') ||
      lower.includes('does this really need ai')
    ) {
      return 'AI_NECESSITY_INQUIRY'
    }

    // 1d. Scope Reduction Inquiry
    if (
      lower.includes('can we reduce the scope') ||
      lower.includes('reduce the scope') ||
      lower.includes('reduce scope') ||
      lower.includes('reduce project complexity') ||
      lower.includes('reduce complexity') ||
      lower.includes('how can we reduce project complexity') ||
      lower.includes('how can we reduce complexity') ||
      lower.includes('cut down scope') ||
      lower.includes('simplify the scope') ||
      lower.includes('is the scope too large') ||
      lower.includes('scope is too big') ||
      lower.includes('make it smaller')
    ) {
      return 'SCOPE_REDUCTION'
    }

    // 1e. Project Suitability Inquiry
    if (
      lower.includes('suitable for a mini-project') ||
      lower.includes('suitable for mini-project') ||
      lower.includes('suitable for a mini project') ||
      lower.includes('suitable for mini project') ||
      lower.includes('is this project suitable') ||
      lower.includes('is this suitable for') ||
      lower.includes('good for a mini project') ||
      lower.includes('good for mini-project') ||
      lower.includes('can this be a mini-project') ||
      lower.includes('suitable for final year')
    ) {
      return 'PROJECT_SUITABILITY'
    }

    // 1f. Academic Documentation / Problem Statement Inquiry
    if (
      lower.includes('prepare a problem statement') ||
      lower.includes('draft a problem statement') ||
      lower.includes('write a problem statement') ||
      lower.includes('prepare the problem statement') ||
      lower.includes('formulate a problem statement') ||
      lower.includes('prepare an abstract') ||
      lower.includes('draft an abstract') ||
      lower.includes('prepare objectives')
    ) {
      return 'DOCUMENTATION_INQUIRY'
    }

    // 1g. Explain Project to Faculty Guide Inquiry
    if (
      lower.includes('explain the project to my faculty') ||
      lower.includes('explain the project to faculty') ||
      lower.includes('explain project to my faculty') ||
      lower.includes('explain project to faculty') ||
      lower.includes('explain to my faculty') ||
      lower.includes('explain to faculty') ||
      lower.includes('present to faculty') ||
      lower.includes('explain this to my guide') ||
      lower.includes('explain to guide') ||
      lower.includes('explain to my project guide') ||
      lower.includes('pitch to faculty') ||
      lower.includes('how to explain to faculty') ||
      lower.includes('how to present to faculty')
    ) {
      return 'FACULTY_EXPLANATION'
    }

    // 1g. College Scope Affirmation / Continuation (e.g. "Yes, specifically for college students.")
    if (
      lower.includes('specifically for college') ||
      lower.includes('for college students') ||
      lower.includes('college students and faculty') ||
      ((lower.startsWith('yes') || lower.includes('yeah') || lower.includes('correct') || lower.includes('agree')) &&
        (lower.includes('college') || lower.includes('students') || lower.includes('academic') || lower.includes('university') || context.currentProjectIdea?.includes('College') || context.currentDiscussionStage === 'DISCOVERY_REFERENCE_INTRODUCED'))
    ) {
      return 'COLLEGE_SCOPE_AFFIRMATION'
    }

    // 2. Feature Addition / Feasibility Evaluation
    const isBuildingProject =
      lower.includes('build a ') ||
      lower.includes('create a ') ||
      lower.includes('develop a ') ||
      lower.includes('developing ') ||
      lower.includes('project on ') ||
      lower.includes('project idea')

    const isFeatureAdditionInquiry =
      !isBuildingProject &&
      (lower.includes('add') ||
        lower.includes('include') ||
        lower.includes('incorporate') ||
        lower.includes('feasibility') ||
        lower.includes('should i') ||
        lower.includes('should we') ||
        lower.includes('can i') ||
        lower.includes('can we') ||
        lower.includes('want to add') ||
        lower.includes('is it worth') ||
        lower.includes('what about'))

    if (
      (isFeatureAdditionInquiry &&
        (lower.includes('facial recognition') ||
          lower.includes('face recognition') ||
          lower.includes('biometric') ||
          lower.includes('blockchain'))) ||
      ((lower.includes('can i add') ||
        lower.includes('can we add') ||
        lower.includes('want to add') ||
        lower.includes('should i implement') ||
        lower.includes('should we implement') ||
        lower.includes('should i add') ||
        lower.includes('should we add') ||
        lower.includes('is it possible to add') ||
        lower.includes('feasibility of') ||
        lower.includes('what about adding')) &&
        (lower.includes('task allocation') ||
          lower.includes('blockchain') ||
          lower.includes('voice') ||
          lower.includes('webrtc') ||
          lower.includes('biometric') ||
          lower.includes('ai') ||
          lower.includes('feature')))
    ) {
      return 'FEATURE_EVALUATION'
    }

    // 3. Senior-Junior Mentorship / Contributor Connection Inquiry
    if (
      lower.includes('mentorship') ||
      lower.includes('guidance request') ||
      lower.includes('request guidance') ||
      ((lower.includes('connect') ||
        lower.includes('reach out') ||
        lower.includes('contact') ||
        lower.includes('talk to') ||
        lower.includes('get in touch')) &&
        (lower.includes('senior') ||
          lower.includes('seniors') ||
          lower.includes('author') ||
          lower.includes('authors') ||
          lower.includes('developer') ||
          lower.includes('developers') ||
          lower.includes('creator') ||
          lower.includes('creators') ||
          lower.includes('contributor') ||
          lower.includes('contributors') ||
          lower.includes('team'))) ||
      ((lower.includes('who created') || lower.includes('who built')) &&
        (lower.includes('talk') || lower.includes('contact') || lower.includes('connect') || lower.includes('reach')))
    ) {
      return 'SENIOR_CONNECTION_INQUIRY'
    }

    // 3b. Proposal Generation Inquiry
    if (
      lower.includes('prepare a proposal') ||
      lower.includes('generate proposal') ||
      lower.includes('academic proposal') ||
      lower.includes('create proposal') ||
      lower.includes('draft proposal') ||
      lower.includes('proposal for my') ||
      lower.includes('prepare proposal') ||
      lower.includes('make a proposal') ||
      lower.includes('generate a proposal')
    ) {
      return 'PROPOSAL_GENERATION_INQUIRY'
    }

    // 4. Technical Explanation (Repository Implementation, Algorithms, DB, SSE)
    if (
      lower.includes('how can we implement the project repository') ||
      lower.includes('how can i implement the academic project repository') ||
      lower.includes('how to implement the project repository') ||
      lower.includes('how to implement academic project repository') ||
      lower.includes('implement the project repository') ||
      lower.includes('implement the academic project repository') ||
      lower.includes('implement project repository') ||
      (lower.includes('implement') && lower.includes('repository')) ||
      lower.includes('how does the similarity algorithm work') ||
      lower.includes('explain the jaccard') ||
      lower.includes('how does sse streaming work') ||
      lower.includes('database schema details') ||
      lower.includes('how does docx generation work')
    ) {
      return 'TECHNICAL_EXPLANATION'
    }

    // 4b. Progression / Next Step (In Mode B or sequential review)
    if (
      context.mode === 'CAMPUSPROJECTHUB_INTRO' &&
      (lower.includes('tell me more') ||
        lower.includes('next') ||
        lower.includes('continue') ||
        lower.includes('what else') ||
        lower.includes('what about') ||
        lower === 'yes' ||
        lower === 'sure' ||
        lower === 'ok' ||
        lower === 'proceed')
    ) {
      return 'PROGRESSION_NEXT'
    }

    // 5. Explicit CampusProjectHub Exploration & Modules
    if (
      lower.includes('explain its modules') ||
      lower.includes('explain the modules') ||
      lower.includes('what are its modules') ||
      lower.includes('what are the modules') ||
      lower.includes('what is campusprojecthub') ||
      lower.includes('tell me about campusprojecthub') ||
      lower.includes('explain campusprojecthub') ||
      lower.includes('introduce campusprojecthub') ||
      lower.includes('how does campusprojecthub work') ||
      lower.includes('problem statement') ||
      lower.includes('16 modules') ||
      lower.includes('senior-junior') ||
      lower.includes('senior junior') ||
      lower.includes('architecture') ||
      lower.includes('system architecture') ||
      lower.includes('tech stack') ||
      lower.includes('technology stack') ||
      lower.includes('database design')
    ) {
      return 'CAMPUSPROJECTHUB_INTRO'
    }

    // 6. Project Discovery (When student introduces an idea)
    if (
      lower.includes('i have a mini-project idea') ||
      lower.includes('i have a project idea') ||
      lower.includes('have a mini-project idea') ||
      lower.includes('have a project idea') ||
      lower.includes('mini-project idea') ||
      lower.includes('project idea about') ||
      lower.includes('project idea on') ||
      lower.includes('idea about a project') ||
      lower.includes('idea about') ||
      lower.includes('want to develop') ||
      lower.includes('want to build') ||
      lower.includes('want to create') ||
      lower.includes('are developing') ||
      lower.includes('is developing') ||
      lower.includes('building') ||
      lower.includes('developing') ||
      lower.includes('my project idea is') ||
      lower.includes('our project idea is') ||
      lower.includes('planning to create') ||
      lower.includes('planning to build') ||
      lower.includes('college project management') ||
      lower.includes('project management system') ||
      lower.includes('attendance') ||
      lower.includes('smart attendance') ||
      lower.includes('hospital management') ||
      (context.currentProjectIdea && (lower.includes('my idea') || lower.includes('our project')))
    ) {
      return 'PROJECT_DISCOVERY'
    }

    return 'GENERAL_MENTORING'
  }
}

export const intentClassifier = new IntentClassifier()
