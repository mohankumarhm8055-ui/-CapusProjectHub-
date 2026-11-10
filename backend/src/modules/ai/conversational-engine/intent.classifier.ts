import { StudentIntent, IConversationContext } from './context.types.js'
import { ideaAnalyzer } from './idea.analyzer.js'

export class IntentClassifier {
  /**
   * Classifies student message intent using text, active repository memory, and stage
   */
  classifyIntent(message: string, context: IConversationContext): StudentIntent {
    const lower = message.toLowerCase().trim()

    // 0. Return to Earlier Project Discussion (if student previously pitched another idea)
    if (
      (context.previousProjectIdeas && context.previousProjectIdeas.length > 0) &&
      (lower.includes('go back to') ||
        lower.includes('return to') ||
        lower.includes('revisit') ||
        lower.includes('back to the attendance') ||
        lower.includes('earlier project') ||
        lower.includes('previous idea we discussed'))
    ) {
      return 'RETURN_TO_PRIOR_PROJECT'
    }

    // 0a. Midway Idea Switch / Pivot (exclude language/tech/constraint corrections)
    const isConstraintCorrection =
      lower.startsWith('correction:') ||
      lower.includes('switch to kannada') ||
      lower.includes('switch to hindi') ||
      lower.includes('switch to english') ||
      lower.includes('switch language') ||
      /\binstead of (?:mongodb|mysql|postgresql|react|python|flask|express)\b/i.test(lower)

    if (
      !isConstraintCorrection &&
      (lower.includes('instead') ||
        lower.includes('change my idea') ||
        lower.includes('changed my mind') ||
        lower.includes('switch to') ||
        lower.includes('forget that') ||
        lower.includes('new project idea') ||
        lower.includes('different idea'))
    ) {
      return 'IDEA_CHANGE_PIVOT'
    }

    // 0b. Restricted / Private Record Access Requests (zero-leakage guard)
    if (
      lower.includes('private email') ||
      lower.includes('personal email') ||
      lower.includes('phone number') ||
      lower.includes('contact number') ||
      lower.includes('rejection reason') ||
      lower.includes('internal feedback') ||
      lower.includes('faculty rejection') ||
      lower.includes('unapproved draft') ||
      lower.includes('private draft') ||
      lower.includes('restricted project')
    ) {
      return 'RESTRICTED_INFO_INQUIRY'
    }

    // 1. Comparison Inquiry (Trello, Jira, Google Drive, WhatsApp, etc.)
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

    // 1g-b. Structured Multi-Project Comparison & Existing vs Proposed Analysis
    const extracted = ideaAnalyzer.extractProposedImprovements(message)
    if (
      lower.includes('compare with previous projects') ||
      lower.includes('compare multiple projects') ||
      lower.includes('compare across repository') ||
      lower.includes('compare existing') ||
      lower.includes('compare my proposed') ||
      lower.includes('compare our proposed') ||
      lower.includes('across our existing college') ||
      (lower.includes('compare ') && lower.includes(' vs ') && lower.includes('repository')) ||
      lower.includes('structured comparison') ||
      lower.includes('12-dimension comparison') ||
      lower.includes('research gap analysis') ||
      lower.includes('identify research gaps') ||
      lower.includes('how does our idea differentiate') ||
      lower.includes('how does my idea differentiate') ||
      lower.includes('which features differentiate') ||
      (lower.includes('project management') && extracted.improvements.length > 0 && !lower.startsWith('what '))
    ) {
      return 'MULTI_PROJECT_COMPARISON'
    }

    // 1h. Repository Follow-up Inquiries (Batch, Stack, Improvements, Originality)
    if (
      lower.includes('which batch') ||
      lower.includes('what batch') ||
      lower.includes('which cohort') ||
      lower.includes('who developed that') ||
      lower.includes('who built that') ||
      lower.includes('when was it built') ||
      (lower.includes('batch') && (lower.includes('project') || lower.includes('previous') || lower.includes('matching') || lower.includes('senior')))
    ) {
      return 'REPOSITORY_BATCH_INQUIRY'
    }

    if (
      (lower.includes('tech stack') ||
        lower.includes('technology stack') ||
        lower.includes('technologies') ||
        lower.includes('framework')) &&
      (lower.includes('previous') ||
        lower.includes('earlier') ||
        lower.includes('did they use') ||
        lower.includes('matching') ||
        Boolean(context.matchedRepositoryProject)) &&
      !lower.includes('campusprojecthub')
    ) {
      return 'REPOSITORY_TECH_INQUIRY'
    }

    if (
      lower.includes('what can be improved') ||
      lower.includes('what could be improved') ||
      lower.includes('how can we improve') ||
      lower.includes('what improvements') ||
      lower.includes('gaps in the previous') ||
      lower.includes('limitations of the previous') ||
      lower.includes('documented hurdles') ||
      lower.includes('make our implementation technically novel') ||
      (lower.includes('improve') && (lower.includes('previous') || Boolean(context.matchedRepositoryProject)))
    ) {
      return 'REPOSITORY_IMPROVEMENTS_INQUIRY'
    }

    if (
      lower.includes('is my idea original') ||
      lower.includes('is this idea original') ||
      lower.includes('is this original') ||
      lower.includes('already exist') ||
      lower.includes('is it a duplicate') ||
      lower.includes('is this duplicate') ||
      lower.includes('plagiarism') ||
      lower.includes('originality')
    ) {
      return 'REPOSITORY_ORIGINALITY_INQUIRY'
    }

    // 1i. College Scope Affirmation
    if (
      lower.includes('specifically for college') ||
      lower.includes('for college students') ||
      lower.includes('college students and faculty') ||
      ((lower.startsWith('yes') || lower.includes('yeah') || lower.includes('correct') || lower.includes('agree')) &&
        (lower.includes('college') ||
          lower.includes('students') ||
          lower.includes('academic') ||
          lower.includes('university') ||
          context.currentProjectIdea?.includes('College') ||
          context.currentDiscussionStage === 'DISCOVERY_REFERENCE_INTRODUCED'))
    ) {
      return 'COLLEGE_SCOPE_AFFIRMATION'
    }

    // 2. General Feature Addition / Evaluation (works for ANY proposed feature in multi-turn chat!)
    const isBuildingWholeProject =
      lower.includes('build a ') ||
      lower.includes('create a ') ||
      lower.includes('develop a ') ||
      lower.includes('project on ') ||
      lower.includes('project idea') ||
      lower.includes('portal') ||
      lower.includes('platform') ||
      lower.includes('system') ||
      lower.includes('application')

    const asksAboutAddingFeature =
      lower.includes('want to add') ||
      lower.includes('also want to add') ||
      lower.includes('can i add') ||
      lower.includes('can we add') ||
      lower.includes('should i add') ||
      lower.includes('should we add') ||
      lower.includes('should i include') ||
      lower.includes('should we include') ||
      lower.includes('should i implement') ||
      lower.includes('should we implement') ||
      lower.includes('what about adding') ||
      lower.includes('is it worth adding') ||
      lower.includes('is it good to add') ||
      lower.includes('incorporate ') ||
      lower.includes('feasibility of')

    if (
      asksAboutAddingFeature ||
      (Boolean(context.currentProjectIdea) &&
        !isBuildingWholeProject &&
        (lower.includes('facial recognition') ||
          lower.includes('face recognition') ||
          lower.includes('biometric') ||
          lower.includes('blockchain') ||
          lower.includes('chatbot') ||
          lower.includes('webrtc')))
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

    // 4a. Adaptive Conceptual Teaching (English + Hinglish/Kanglish question forms)
    const isConceptQuestion =
      lower.includes('semantic search') ||
      lower.includes('embedding') ||
      lower.includes('jwt') ||
      lower.includes('database index') ||
      lower.includes('cosine similarity')
    const asksConceptualMeaning =
      lower.includes("don't understand") ||
      lower.includes('do not understand') ||
      lower.includes('kya hai') ||
      lower.includes('samjhao') ||
      lower.includes('arthavagilla') ||
      lower.includes('hege kelasa') ||
      lower.includes('explain ') ||
      lower.includes('what is ') ||
      lower.includes('how does ')

    if (
      (isConceptQuestion && asksConceptualMeaning) ||
      lower.includes("don't understand") ||
      lower.includes('do not understand') ||
      lower.includes('simpler explanation') ||
      lower.includes('explain simply') ||
      lower.includes('explain in simpler') ||
      lower.includes('deeper technical detail') ||
      lower.includes('more technical depth') ||
      lower.includes('how can i use it in my project') ||
      lower.includes('use it in my project repository') ||
      (lower.includes('is it necessary') && Boolean(context.lastTopicCovered))
    ) {
      return 'CONCEPT_TEACHING'
    }

    // 4b. Progression / Next Step
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

    // 6. Constraint / Parameter Reply or Assumption Correction in active conversation
    if (
      (context.currentProjectIdea || context.lastTopicCovered) &&
      (/\b\d+\s*(?:members?|students?|weeks?|months?|people)\b/i.test(lower) ||
        lower.includes('beginner') ||
        lower.includes('intermediate') ||
        lower.includes('advanced') ||
        lower.includes('hardware') ||
        lower.includes('laptop only') ||
        lower.includes('no gpu') ||
        lower.includes('dataset') ||
        lower.includes('implement ') && lower.includes('first') ||
        (context.currentDiscussionStage === 'STRUCTURED_COMPARISON_PRESENTED' &&
          (lower.includes('task allocation') || lower.includes('progress prediction') || lower.includes('start with '))) ||
        lower.startsWith('correction:') ||
        lower.includes('update constraints') ||
        lower.includes('switch to kannada') ||
        lower.includes('switch language') ||
        lower.includes('switch to hindi') ||
        lower.includes('switch to english')) &&
      !lower.includes('want to build') &&
      !lower.includes('want to develop')
    ) {
      return 'CLARIFICATION_OR_PARAM'
    }

    // 7. Project Discovery (Full pitch, incomplete pitch, bare title, or tech-only probe)
    const techOnly = ideaAnalyzer.isTechnologyOnlyInput(message)
    const looksLikeQuestion =
      lower.includes('?') ||
      lower.startsWith('what ') ||
      lower.startsWith('how ') ||
      lower.startsWith('why ') ||
      lower.startsWith('explain ')
    const isGreeting = ['hi', 'hello', 'hey'].includes(lower)

    if (
      techOnly.isTechOnly ||
      lower.includes('i have a mini-project idea') ||
      lower.includes('i have a project idea') ||
      lower.includes('i have idea') ||
      lower.includes('have an idea') ||
      lower.includes('idea for ') ||
      lower.includes('have a mini-project idea') ||
      lower.includes('have a project idea') ||
      lower.includes('mini-project idea') ||
      lower.includes('project idea') ||
      lower.includes('idea about') ||
      lower.includes('want to develop') ||
      lower.includes('want to build') ||
      lower.includes('want to create') ||
      lower.includes('are developing') ||
      lower.includes('is developing') ||
      lower.includes('building') ||
      lower.includes('developing') ||
      lower.includes('planning to create') ||
      lower.includes('planning to build') ||
      lower.includes('college project management') ||
      lower.includes('project management system') ||
      lower.includes('attendance') ||
      lower.includes('healthcare') ||
      lower.includes('hospital management') ||
      /\b(?:hostel|hostl|complaint|grievance|warden|parking|portal|tracking system)\b/i.test(lower) ||
      (!looksLikeQuestion && !isGreeting && !context.currentProjectIdea && lower.split(/\s+/).length >= 2) ||
      (context.currentProjectIdea && (lower.includes('my idea') || lower.includes('our project')))
    ) {
      return 'PROJECT_DISCOVERY'
    }

    return 'GENERAL_MENTORING'
  }
}

export const intentClassifier = new IntentClassifier()
