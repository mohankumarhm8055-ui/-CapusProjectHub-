import {
  ConversationalTurnResult,
  IConversationContext,
  MatchedRepoSummary,
  RetrievalTelemetry,
} from './context.types.js'
import { contextManager } from './context.manager.js'
import { intentClassifier } from './intent.classifier.js'
import { PROGRESSIVE_SECTIONS } from './progressive.catalog.js'
import {
  repositorySearchService,
  ProjectMatchResult,
} from '../../repository/repository.search.service.js'
import { ProjectRepository, IProject } from '../../repository/project.model.js'
import { knowledgeService } from '../knowledge/knowledge.service.js'
import { IMessage } from '../message.model.js'
import { ideaAnalyzer } from './idea.analyzer.js'
import { LearningProfileRepository } from '../personalization/learningProfile.model.js'
import { adaptiveTeachingEngine } from '../personalization/teaching.adapter.js'
import { researchGapService } from '../comparison/gap.analyzer.js'
import { ComparisonSessionRepository } from '../comparison/comparison.model.js'

export class ConversationalEngine {
  /**
   * Main entrypoint to process a student turn with multi-turn memory,
   * repository grounding, 12-part idea analysis, and honest critique.
   */
  async processTurn(
    conversationId: string,
    ownerId: string,
    userPrompt: string,
    history: IMessage[] = []
  ): Promise<ConversationalTurnResult> {
    // 1. Fetch conversation state and classify intent BEFORE mutating currentProjectIdea
    const currentContext = await contextManager.getOrCreateContext(conversationId, ownerId)
    const intent = intentClassifier.classifyIntent(userPrompt, currentContext)
    const extractedUpdates = contextManager.extractContextFromMessage(userPrompt, currentContext)
    const context = await contextManager.updateContext(conversationId, ownerId, extractedUpdates)

    const userProfile = await LearningProfileRepository.findForUser(ownerId).catch(() => null)
    const effectiveLevel = adaptiveTeachingEngine.resolveLearningDepth(userPrompt, context, userProfile)
    const effectiveLanguage = adaptiveTeachingEngine.resolveEffectiveLanguage(
      userPrompt,
      userProfile,
      context
    )

    // 3. Dispatch to intent handler
    let result: {
      markdown: string
      followUps: string[]
      stageUpdates: Partial<IConversationContext>
      retrievalTelemetry?: RetrievalTelemetry
      retrievedMatches?: ProjectMatchResult[]
    }

    switch (intent) {
      case 'RETURN_TO_PRIOR_PROJECT':
        result = await this.handleReturnToPriorProject(userPrompt, context)
        break

      case 'MULTI_PROJECT_COMPARISON':
        result = await this.handleMultiProjectComparison(conversationId, ownerId, userPrompt, context)
        break

      case 'CONCEPT_TEACHING':
        result = {
          markdown: adaptiveTeachingEngine.buildConceptExplanation(
            userPrompt,
            effectiveLevel,
            effectiveLanguage,
            context,
            userProfile?.explanationStyle || 'step_by_step'
          ),
          followUps: [
            'How can I use it in my project repository?',
            'Is it necessary for my mini-project?',
            'Give me a simpler explanation',
          ],
          stageUpdates: {
            lastTopicCovered: userPrompt.toLowerCase().includes('semantic')
              ? 'Semantic Search & Embeddings'
              : userPrompt.slice(0, 60),
            technicalExperience: effectiveLevel,
            topicsDiscussed: [`Concept Teaching (${effectiveLevel})`],
          },
        }
        break

      case 'IDEA_CHANGE_PIVOT':
        result = await this.handleProjectDiscovery(userPrompt, context, history, true)
        break

      case 'RESTRICTED_INFO_INQUIRY':
        result = this.handleRestrictedInfoInquiry(context)
        break

      case 'REPOSITORY_BATCH_INQUIRY':
        result = await this.handleRepositoryBatchInquiry(context)
        break

      case 'REPOSITORY_TECH_INQUIRY':
        result = await this.handleRepositoryTechInquiry(context)
        break

      case 'REPOSITORY_IMPROVEMENTS_INQUIRY':
        result = await this.handleRepositoryImprovementsInquiry(context, userPrompt)
        break

      case 'REPOSITORY_ORIGINALITY_INQUIRY':
        result = await this.handleRepositoryOriginalityInquiry(userPrompt, context)
        break

      case 'COMPARISON_INQUIRY':
        result = this.handleComparisonInquiry(userPrompt)
        break

      case 'FEATURE_EVALUATION':
        result = await this.handleFeatureAdditionInquiry(userPrompt, context)
        break

      case 'CAMPUSPROJECTHUB_INTRO':
      case 'PROGRESSION_NEXT':
        result = this.handleProgressiveIntro(userPrompt, context)
        break

      case 'CLARIFICATION_OR_PARAM':
        result = this.handleClarificationOrParam(userPrompt, context)
        break

      case 'PROJECT_DISCOVERY':
        result = await this.handleProjectDiscovery(userPrompt, context, history, false)
        break

      case 'PROJECT_SUITABILITY':
        result = this.handleProjectSuitability(context)
        break

      case 'DISADVANTAGES_INQUIRY':
        result = this.handleDisadvantagesInquiry()
        break

      case 'AI_NECESSITY_INQUIRY':
        result = this.handleAINecessityInquiry()
        break

      case 'SCOPE_REDUCTION':
        result = this.handleScopeReduction(context)
        break

      case 'DOCUMENTATION_INQUIRY':
        result = this.handleProblemStatement(context)
        break

      case 'TECHNICAL_EXPLANATION':
        result = this.handleTechnicalExplanation(userPrompt)
        break

      case 'SENIOR_CONNECTION_INQUIRY':
        result = this.handleSeniorConnectionInquiry(context)
        break

      case 'PROPOSAL_GENERATION_INQUIRY':
        result = this.handleProposalGenerationInquiry(context)
        break

      case 'COLLEGE_SCOPE_AFFIRMATION':
        result = this.handleCollegeScopeAffirmation()
        break

      case 'FACULTY_EXPLANATION':
        result = this.handleFacultyExplanation()
        break

      default:
        result = await this.handleGeneralMentoring(userPrompt, context, history)
        break
    }

    // Apply language adaptation wrapper for non-English turns unless CONCEPT_TEACHING already wrapped it
    const finalMarkdown =
      intent !== 'CONCEPT_TEACHING' && effectiveLanguage !== 'en'
        ? adaptiveTeachingEngine.wrapWithLanguageFraming(
            result.markdown,
            effectiveLanguage,
            effectiveLevel
          )
        : result.markdown

    // 4. Persist updated stage and return result
    const updatedContext = await contextManager.updateContext(conversationId, ownerId, {
      ...result.stageUpdates,
      lastTopicCovered: result.stageUpdates.lastTopicCovered || context.lastTopicCovered,
    })

    return {
      intent,
      mode: updatedContext.mode,
      responseMarkdown: finalMarkdown,
      suggestedFollowUps: result.followUps,
      updatedContext,
      retrievalTelemetry: result.retrievalTelemetry,
      retrievedMatches: result.retrievedMatches,
    }
  }

  private pickNextUnaskedQuestion(
    context: IConversationContext,
    candidates: Array<{ key: string; question: string }>
  ): { key?: string; question: string } {
    const asked = new Set(context.askedQuestionKeys || [])
    const provided = new Set(context.explicitlyProvidedConstraints || [])

    for (const c of candidates) {
      if (asked.has(c.key)) continue
      if (c.key === 'teamSize' && (context.teamSize || provided.has('teamSize'))) continue
      if (c.key === 'developmentWeeks' && (context.developmentWeeks || provided.has('developmentWeeks'))) continue
      if (c.key === 'experience' && provided.has('experience')) continue
      return c
    }

    return {
      question:
        'What concrete technical capability or user workflow do you want to tackle first in Milestone 1?',
    }
  }

  private async resolveActiveMatchedProject(
    context: IConversationContext,
    fallbackQuery?: string
  ): Promise<{ project: IProject | null; match?: ProjectMatchResult }> {
    const id = context.matchedRepositoryProject?.projectId
    if (id) {
      const proj = await ProjectRepository.findById(id)
      if (proj) {
        return { project: proj }
      }
    }

    const searchPhrase = context.currentProjectIdea || fallbackQuery?.trim()
    if (searchPhrase) {
      const matches = await repositorySearchService.compareStudentIdea(
        searchPhrase,
        searchPhrase,
        context.preferredTechnologies
      )
      if (matches.length > 0 && matches[0].classification !== 'RELATED_TECHNOLOGY_ONLY') {
        return { project: matches[0].project, match: matches[0] }
      }
    }

    return { project: null }
  }

  private formatProjectDossierBlock(top: ProjectMatchResult): {
    markdownBlock: string
    sourceLink: string
    summary: MatchedRepoSummary
  } {
    const p = top.project
    const sourceLink = `/explore-projects/${p.id}`
    const batchValue = p.batch
      ? p.batch
      : 'Not explicitly recorded in repository metadata (only Academic Year / Semester available)'
    const semesterValue = p.semester || 'Not recorded in repository metadata'

    const techList =
      p.technologyStack.length > 0
        ? p.technologyStack.map((t) => t.name).join(', ')
        : 'Not recorded'
    const featureList =
      p.features.length > 0
        ? p.features.map((f) => `  - ${f}`).join('\n')
        : '  - Feature list not itemized in repository metadata'

    const documentedModules =
      p.modules.length > 0
        ? p.modules.map((m) => `  - **${m.name}**: ${m.description}`).join('\n')
        : '  - Module breakdown not explicitly documented'

    const repoLinks = [
      p.githubUrl ? `GitHub: ${p.githubUrl}` : 'GitHub repository link: Not archived',
      p.reportDocuments.length > 0
        ? `Documents: ${p.reportDocuments.map((d) => `${d.title} (${d.verified ? 'Verified' : 'Unverified'})`).join('; ')}`
        : 'Project report PDF: Not archived',
      p.screenshots.length > 0
        ? `Screenshots: ${p.screenshots.length} archived`
        : 'Screenshots: Not archived',
    ].join(' | ')

    const authors = (p.teamMembers || []).map((m) => ({
      studentId: m.studentId,
      name: m.name,
      role: m.role,
      isAvailableForMentoring: m.isAvailableForMentoring === true,
    }))

    const mentorStatusLines =
      authors.length > 0
        ? authors
            .map(
              (a) =>
                `  - **${a.name}** (${a.role || 'Contributor'}) — ${
                  a.isAvailableForMentoring ? 'Accepting Mentees (Opted In)' : 'Not Accepting Mentees'
                }`
            )
            .join('\n')
        : '  - No contributor mentorship status recorded.'

    const limitationsList =
      p.limitations && p.limitations.length > 0
        ? p.limitations.map((l) => `- **Documented Limitation**: ${l}`).join('\n')
        : '- **No technical limitations were explicitly documented** in the archived record (absence in documentation does not prove none existed).'

    const futureList =
      p.futureEnhancements && p.futureEnhancements.length > 0
        ? p.futureEnhancements.map((f) => `- **Documented Future Work**: ${f}`).join('\n')
        : ''

    const unknownList =
      top.analysis.missingOrUnknownInformation.length > 0
        ? top.analysis.missingOrUnknownInformation.map((u) => `- ${u}`).join('\n')
        : '- All core dossier fields present in documentation.'

    const improvementsList = top.analysis.improvementOpportunities
      .map((o) => `- **AI-Suggested Opportunity**: ${o}`)
      .join('\n')

    const readableSourceType =
      top.sourceAttribution.sourceType === 'STUDENT_SUBMISSION'
        ? 'Student Submission'
        : top.sourceAttribution.sourceType === 'FACULTY_ARCHIVE'
        ? 'Faculty Archive'
        : 'Department Repository'
    const readableVerification =
      top.sourceAttribution.verificationStatus === 'FACULTY_APPROVED'
        ? 'Faculty-Approved'
        : 'Verified Record'

    const markdownBlock = `### Verified Repository Record Detected
**Previous Project: [${p.title}](${sourceLink})** (\`${sourceLink}\`)

- **Academic Year**: ${p.academicYear}
- **Batch / Cohort**: ${batchValue}
- **Semester**: ${semesterValue}
- **Department**: ${p.department}
- **Source & Verification**: ${readableSourceType} (${readableVerification})
- **Problem Addressed (Documented)**: ${p.problemStatement}
- **Proposed Solution (Documented)**: ${top.analysis.documentedSolution}
- **Technologies Used (Documented)**: ${techList}
- **Documented Features**:
${featureList}
- **Documented Modules & Architecture**:
${documentedModules}${p.architecture?.description ? `\n  - Architecture note: ${p.architecture.description}` : ''}
- **Artifacts & Links**: ${repoLinks}
- **Contributor Mentorship Status**:
${mentorStatusLines}

#### Similarity Classification & Multi-Dimension Comparison
- **Classification**: **${top.academicClassification}**
- **Why Classified This Way**: ${top.classificationReason}
- **Problem Overlap**: ${top.dimensionComparison.problemAddressed}
- **Target Users**: ${top.dimensionComparison.targetUsers}
- **Technical & Feature Differences**: ${top.analysis.differencesWithIdea.join(' ')}

#### Documented Limitations, What Remains Unknown & Improvement Opportunities
${limitationsList}
${futureList ? `${futureList}\n` : ''}${unknownList}
${improvementsList}

> **Similarity & Academic Integrity Notice**: **Similarity is not plagiarism** — similarity across abstracts, domains, or features is **never treated as proof of plagiarism**. Repository records show prior college baselines so your team can build genuine technical improvements instead of repeating existing work.`

    const summary: MatchedRepoSummary = {
      projectId: p.id,
      sourceUrl: sourceLink,
      title: p.title,
      academicYear: p.academicYear,
      batch: p.batch,
      semester: p.semester,
      department: p.department,
      similarityClassification: top.classification,
      academicClassification: top.academicClassification,
      overlapScore: top.score,
      confirmedDetails: p.features.slice(0, 4),
      missingDetails: top.sourceAttribution.missingDetails,
      authors,
    }

    return { markdownBlock, sourceLink, summary }
  }

  /**
   * Mode A: Project Discovery, Idea Analysis & Multi-Signal Repository Investigation
   */
  private async handleProjectDiscovery(
    prompt: string,
    context: IConversationContext,
    _history: IMessage[],
    isPivot: boolean
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
    retrievalTelemetry?: RetrievalTelemetry
    retrievedMatches?: ProjectMatchResult[]
  }> {
    const lower = prompt.toLowerCase()

    // 0. Guard against mistaking technology names for a complete project idea
    const techCheck = ideaAnalyzer.isTechnologyOnlyInput(prompt)
    if (techCheck.isTechOnly) {
      const stack = techCheck.detectedTechs.join(', ')
      const markdown = `You mentioned **${stack}**, which is an implementation technology stack rather than a complete project idea.

Before choosing tools, faculty reviewers evaluate **what problem you are solving and for whom**. Many different projects (attendance, healthcare triage, inventory control) can be built with ${stack}.

What real-world problem do you want to solve using **${stack}**, and who are the intended users?`

      return {
        markdown,
        followUps: [
          'A classroom attendance tracker for faculty and students',
          'A campus hall booking system to stop double-bookings',
          'A chronic disease triage portal for primary clinics',
        ],
        stageUpdates: {
          mode: 'PROJECT_DISCOVERY',
          currentDiscussionStage: 'DISCOVERY_TECH_ONLY_CLARIFICATION',
          preferredTechnologies: techCheck.detectedTechs,
          topicsDiscussed: ['Clarifying Problem vs Technology Stack'],
        },
      }
    }

    // 1. Preserve CampusProjectHub self-reference discovery path ONLY when student proposes bare project management without extra improvements
    const extractedPitch = ideaAnalyzer.extractProposedImprovements(prompt)
    if (
      !isPivot &&
      extractedPitch.improvements.length === 0 &&
      !lower.includes('compare') &&
      !lower.includes('existing') &&
      (lower.includes('project management') ||
        lower.includes('campus project hub') ||
        lower.includes('campusprojecthub') ||
        lower.includes('student project tracker'))
    ) {
      const markdown = `That's a good starting point for a mini-project. A project management system can help students organize their work, coordinate teams, assign tasks and track project progress.

However, project management systems already exist, so we should identify what makes your project different rather than simply building another task-management application. In most colleges, previous project reports, repositories, and development lessons are scattered across Google Drives or physical shelf archives, so students often do not know what projects their seniors have already developed.

For CampusProjectHub, there is an opportunity to go beyond ordinary project management:

- **Project Management**: Manage teams, tasks, milestones and deadlines.
- **Academic Project Repository**: Discover projects developed by previous batches.
- **Knowledge Sharing**: Help juniors learn from seniors' completed projects.
- **AI Project Mentor**: Evaluate project ideas, identify similar projects and recommend improvements.
- **Proposal Generation**: Convert finalized project ideas into academic proposals.

We should first understand your intended scope and then decide which features are realistic for your mini-project. Would you like me to walk you through the complete CampusProjectHub solution, or shall we first compare your specific project idea with existing college repository records?

One question to start: Are you planning to build this specifically for college students and faculty, where students can manage their academic projects and discover projects developed by previous batches?`

      return {
        markdown,
        followUps: [
          'Yes, specifically for college students and faculty',
          'Is this project suitable for a mini-project?',
          'What makes CampusProjectHub different?',
        ],
        stageUpdates: {
          mode: 'PROJECT_DISCOVERY',
          currentProjectIdea: 'College Project Management Platform',
          currentDiscussionStage: 'DISCOVERY_REFERENCE_INTRODUCED',
          topicsDiscussed: ['CampusProjectHub Reference Overview'],
        },
      }
    }

    // 2. Analyze the student's idea across 12 structured dimensions (even from a bare title or rough note)
    const rawIdeaInput = context.currentProjectIdea && !isPivot ? context.currentProjectIdea : prompt
    const ideaTitle = ideaAnalyzer.extractCleanTitle(prompt)
    const sanitizedPivotText = isPivot
      ? prompt
          .replace(/^(?:actually|okay|so|well)[,\s]+/i, '')
          .replace(/^(?:instead of|rather than|forget about|switch(?:ing)? from)\s+[^,.!?]+[,.]?\s*/i, '')
          .trim()
      : prompt
    const ideaTextForAnalysis = isPivot || !context.currentProjectIdea ? (sanitizedPivotText || prompt) : rawIdeaInput
    const analysis = ideaAnalyzer.analyzeIdea(ideaTextForAnalysis, context)

    // 3. Multi-signal search across ALL accessible CampusProjectHub repository projects
    // Match strictly against the student's actual active idea & stack (stripping negated "instead of..." phrases on pivot!)
    let matches: ProjectMatchResult[] = []
    let retrievalFailed = false
    let retrievalError: string | undefined
    const searchStart = Date.now()
    try {
      matches = await repositorySearchService.compareStudentIdea(
        analysis.projectTitle,
        sanitizedPivotText || prompt,
        context.preferredTechnologies,
        undefined
      )
    } catch (err: any) {
      matches = []
      retrievalFailed = true
      retrievalError = err?.message || 'Repository search unavailable'
    }
    const retrievalLatencyMs = Date.now() - searchStart

    const retrievalTelemetry: RetrievalTelemetry = {
      executed: true,
      latencyMs: retrievalLatencyMs,
      retrievedCount: matches.length,
      retrievedProjectIds: matches.map((m) => m.project.id),
      retrievedProjectTitles: matches.map((m) => m.project.title),
      failed: retrievalFailed,
      error: retrievalError,
    }

    const conceptualMatches = matches.filter(
      (m) => m.classification !== 'RELATED_TECHNOLOGY_ONLY' && m.classification !== 'INDEPENDENT_WORK'
    )
    const techOnlyMatches = matches.filter((m) => m.classification === 'RELATED_TECHNOLOGY_ONLY')

    const nextQuestion = this.pickNextUnaskedQuestion(context, [
      {
        key: 'teamSize',
        question:
          'To calibrate realistic scope: how many members are on your team and how many weeks do you have to build this?',
      },
      {
        key: 'differentiator',
        question:
          'What specific limitation or new capability are you planning to introduce beyond basic CRUD tracking?',
      },
    ])

    const ideaBreakdownSection = `### Project Concept Breakdown: "${analysis.projectTitle}"
- **Project Domain**: ${analysis.projectDomain} | **Estimated Complexity**: ${analysis.technicalComplexity} (${analysis.complexityRationale})
- **Core Problem**: ${analysis.coreProblem}
- **Target Users**: ${analysis.targetUsers.join(', ')}
- **Existing Situation**: ${analysis.existingSituation}
- **Proposed Solution**: ${analysis.proposedSolution}
- **Main Functionality & Candidate Modules**: ${analysis.possibleModules.join(' • ')}
- **Technical Approach**: ${analysis.technicalApproach}
- **Expected Outcome**: ${analysis.expectedOutcome}
- **Potential Scope & Complexity Risks**: ${analysis.potentialLimitations.join(' ')}`

    const lowerPrompt = prompt.toLowerCase()
    const quickAnswerPreface =
      /\b(new to coding|too hard|beginner|how (?:do i |to )?start|where do i start|is this feasible)\b/i.test(lowerPrompt)
        ? `> **Quick Answer**: ${
            /\b(ai camera|face|facial|recognition|computer vision|ml|deep learning)\b/i.test(lowerPrompt)
              ? 'Building a live AI camera pipeline from scratch can feel steep if you are new to coding, so start with a focused web/QR attendance workflow first and treat camera detection as an optional Phase 2 upgrade.'
              : `Yes — **"${ideaTitle}"** is achievable for a beginner/intermediate team if you build one clean end-to-end flow first (login -> core submission/verification -> status tracking) before adding extra features.`
          }\n\n`
        : ''

    // Case A: Genuine repository overlap found
    if (conceptualMatches.length > 0) {
      const top = conceptualMatches[0]
      const { markdownBlock, summary } = this.formatProjectDossierBlock(top)
      const secondaryLine =
        conceptualMatches.length > 1
          ? `\n\n*Additional partially related record in archive*: **[${conceptualMatches[1].project.title}](/explore-projects/${conceptualMatches[1].project.id})** (${conceptualMatches[1].project.academicYear} — ${conceptualMatches[1].academicClassification}).`
          : ''

      const pivotPreface = isPivot
        ? `Got it — switching our evaluation to your new project idea: **"${ideaTitle}"**.\n\n`
        : ''

      const introLine = `${pivotPreface}${quickAnswerPreface}I analyzed your idea (**${analysis.projectDomain}**) while CampusProjectHub repository search intelligence is active across verified college records. Here is the closest verified record developed by an earlier cohort:`

      const isHighOverlap =
        top.classification === 'EXACT_OR_NEAR_EXACT_TITLE' ||
        top.classification === 'SIMILAR_PROJECT_CONCEPT'

      const closingQuestion = isHighOverlap
        ? `I do not recommend simply rebuilding the same application. What new capability or meaningful improvement are you planning to make your project distinct from "${top.project.title}"?`
        : nextQuestion.question

      const askedKeyThisTurn = isHighOverlap ? 'differentiation' : nextQuestion.key

      const markdown = `${introLine}

${markdownBlock}${secondaryLine}

${ideaBreakdownSection}

${closingQuestion}`

      return {
        markdown,
        followUps: [
          'What can be improved from the previous project?',
          'Which batch and tech stack built this?',
          'Can I connect with the authors for mentorship?',
        ],
        stageUpdates: {
          mode: 'PROJECT_DISCOVERY',
          currentProjectIdea: analysis.projectTitle,
          projectCategory: analysis.projectDomain,
          activeIdeaAnalysis: analysis,
          currentDiscussionStage: 'DISCOVERY_OVERLAP_IDENTIFIED',
          matchedRepositoryProject: summary,
          matchedRepositoryProjects: conceptualMatches
            .slice(0, 3)
            .map((m) => this.formatProjectDossierBlock(m).summary),
          askedQuestionKeys: askedKeyThisTurn ? [askedKeyThisTurn] : [],
          topicsDiscussed: [`Repository Comparison: ${top.project.title}`],
        },
        retrievalTelemetry,
        retrievedMatches: matches,
      }
    }

    // Case B0: Retrieval Failure — must explicitly disclose outage and NEVER falsely claim zero matches
    if (retrievalFailed) {
      const pivotPreface = isPivot
        ? `Understood — switching focus to **"${analysis.projectTitle}"**.\n\n`
        : ''

      const markdown = `${pivotPreface}* **Repository Retrieval Notice**: *College repository search could not be completed at this moment because the project repository service failed or is temporarily unavailable (${retrievalError || 'storage error'}). Because retrieval failed, I cannot confirm whether matching historical projects exist.*\n\n${ideaBreakdownSection}\n\n${nextQuestion.question}`

      return {
        markdown,
        followUps: ['Retry repository similarity check', 'Evaluate a specific feature for this project'],
        stageUpdates: {
          mode: 'PROJECT_DISCOVERY',
          currentProjectIdea: analysis.projectTitle,
          projectCategory: analysis.projectDomain,
          activeIdeaAnalysis: analysis,
          currentDiscussionStage: 'DISCOVERY_RETRIEVAL_UNAVAILABLE',
          matchedRepositoryProject: undefined,
          matchedRepositoryProjects: [],
          askedQuestionKeys: nextQuestion.key ? [nextQuestion.key] : [],
          topicsDiscussed: [`Idea Analysis (Repository Unavailable): ${analysis.projectTitle}`],
        },
        retrievalTelemetry,
        retrievedMatches: [],
      }
    }

    // Case B: No conceptual overlap found (or only shared technologies)
    const techNote =
      techOnlyMatches.length > 0
        ? `Shared-technology note: Earlier projects such as **${techOnlyMatches[0].project.title}** use overlapping tools (${techOnlyMatches[0].matchedDimensions.matchingTechnologies.join(', ')}), which is only an implementation similarity — **not** conceptual duplication.`
        : 'No sufficiently similar project was found in the accessible repository.'

    const pivotPreface = isPivot
      ? `Understood — switching focus to **"${analysis.projectTitle}"** and clearing the earlier comparison.\n\n`
      : ''

    const markdown = `${pivotPreface}${quickAnswerPreface}* **Academic Repository Investigation**: *CampusProjectHub repository search intelligence is active across verified academic records.*
* **Status**: **No sufficiently similar project found** in the authorized repository. ${techNote} This gives your team clear room for originality, provided you define measurable evaluation criteria.

${ideaBreakdownSection}

#### Suggested Next Steps:
1. Confirm the **single most critical problem** and target user workflow you want working first.
2. Separate **Essential** core deliverables from **Optional** enhancements so you do not over-scope.
3. Let me know your constraints if not shared yet.

${nextQuestion.question}`

    return {
      markdown,
      followUps: [
        'Evaluate a specific feature for this project',
        'Help narrow down an MVP scope',
        'Prepare a formal IEEE 830 problem statement',
      ],
      stageUpdates: {
        mode: 'PROJECT_DISCOVERY',
        currentProjectIdea: analysis.projectTitle,
        projectCategory: analysis.projectDomain,
        activeIdeaAnalysis: analysis,
        currentDiscussionStage: 'DISCOVERY_NOVEL_CONCEPT',
        matchedRepositoryProject: undefined,
        matchedRepositoryProjects: [],
        askedQuestionKeys: nextQuestion.key ? [nextQuestion.key] : [],
        topicsDiscussed: [`Project Analysis: ${analysis.projectTitle}`],
      },
      retrievalTelemetry,
      retrievedMatches: matches,
    }
  }

  /**
   * Repository follow-up: Batch / Cohort / Academic Year inquiry (strictly honest on missing batch)
   */
  private async handleRepositoryBatchInquiry(context: IConversationContext): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const { project } = await this.resolveActiveMatchedProject(context)
    if (!project) {
      return {
        markdown:
          'We have not matched a specific repository project in this conversation yet. Share the project title or your project idea first, and I will look up the documented academic year, semester, and batch metadata.',
        followUps: ['I want to build a smart attendance system', 'Search healthcare projects in repository'],
        stageUpdates: {},
      }
    }

    const batchStatus = project.batch
      ? `**Recorded Batch / Cohort**: ${project.batch}`
      : '**Batch / Cohort**: **Not Explicitly Recorded** — batch label is unavailable in repository metadata (academic year and semester only; I cannot infer it from other fields).'
    const contributors =
      project.teamMembers.length > 0
        ? project.teamMembers.map((m) => `${m.name}${m.role ? ` (${m.role})` : ''}`).join(', ')
        : 'Not recorded'
    const guide = project.facultyGuide?.name
      ? `${project.facultyGuide.name}${project.facultyGuide.department ? `, ${project.facultyGuide.department}` : ''}`
      : 'Not recorded'

    const markdown = `Here is the exact cohort metadata recorded for **[${project.title}](/explore-projects/${project.id})**:

- ${batchStatus}
- **Academic Year**: ${project.academicYear}
- **Semester**: ${project.semester || 'Not recorded in repository metadata'}
- **Department**: ${project.department}
- **Documented Contributors**: ${contributors}
- **Faculty Guide**: ${guide}

*Source Attribution: Verified directly from repository record \`/explore-projects/${project.id}\`.*

Would you like to inspect the technologies they used, or check which contributors have opted into mentorship?`

    return {
      markdown,
      followUps: [
        'What technology stack did they use?',
        'What can be improved from that project?',
        'Can I connect with the authors for mentorship?',
      ],
      stageUpdates: {
        lastTopicCovered: `Repository Batch Info: ${project.title}`,
      },
    }
  }

  /**
   * Repository follow-up: Technology stack, modules & artifacts
   */
  private async handleRepositoryTechInquiry(context: IConversationContext): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const { project } = await this.resolveActiveMatchedProject(context)
    if (!project) {
      return {
        markdown:
          'No matching repository project is currently active in this session. Share your project topic first so I can retrieve the documented technology stack from the CampusProjectHub archive.',
        followUps: ['I want to build a smart attendance system', 'Search projects using React'],
        stageUpdates: {},
      }
    }

    const techLines =
      project.technologyStack.length > 0
        ? project.technologyStack
            .map((t) => `- **${t.name}**${t.category ? ` (${t.category})` : ''}`)
            .join('\n')
        : '- Technology stack was not itemized in the repository entry.'

    const modulesLines =
      project.modules.length > 0
        ? project.modules.map((m) => `- **${m.name}**: ${m.description}`).join('\n')
        : '- Detailed module breakdown was not archived.'

    const markdown = `### Documented Technology Stack & Architecture: [${project.title}](/explore-projects/${project.id})

**Technologies Recorded:**
${techLines}

**Architecture & Modules Recorded:**
${project.architecture?.description ? `- **Architecture Overview**: ${project.architecture.description}\n` : ''}${modulesLines}

**Archived Code & Documents:**
- **GitHub Link**: ${project.githubUrl || 'Not recorded in repository'}
- **Project Reports**: ${project.reportDocuments.length > 0 ? project.reportDocuments.map((d) => d.title).join(', ') : 'Not archived'}

*Source Attribution: Documented facts retrieved from \`/explore-projects/${project.id}\`. Unknown implementation details are marked as not recorded rather than inferred.*

Are you planning to reuse parts of this stack or use a different technical approach?`

    return {
      markdown,
      followUps: [
        'What can be improved over their approach?',
        'Is this stack realistic for a beginner team?',
      ],
      stageUpdates: {
        lastTopicCovered: `Repository Tech Stack: ${project.title}`,
      },
    }
  }

  /**
   * Repository follow-up: Research Gaps, Documented Limitations & Improvements
   */
  private async handleRepositoryImprovementsInquiry(
    context: IConversationContext,
    userPrompt?: string
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const { project, match } = await this.resolveActiveMatchedProject(context, userPrompt)
    if (!project) {
      return {
        markdown:
          'Share your project idea or select a project first so I can separate documented repository limitations from AI-generated improvement suggestions.',
        followUps: ['I want to build a smart attendance system'],
        stageUpdates: {},
      }
    }

    const docLimitations =
      project.limitations && project.limitations.length > 0
        ? project.limitations.map((l) => `- **Documented Limitation**: ${l}`).join('\n')
        : '- **No technical limitations were explicitly recorded** in the repository abstract (note: omitting a feature from documentation does not prove the earlier team lacked it).'

    const docFuture =
      project.futureEnhancements && project.futureEnhancements.length > 0
        ? project.futureEnhancements.map((f) => `- **Documented Future Enhancement**: ${f}`).join('\n')
        : '- No follow-up enhancements were explicitly listed in the archive.'

    const missingFields: string[] = []
    if (!project.githubUrl) missingFields.push('Source repository code is not archived')
    if (!project.architecture?.diagramUrl) missingFields.push('Architecture diagram URL is missing')
    if (project.reportDocuments.length === 0) missingFields.push('Full PDF thesis is not attached')

    const suggestions =
      context.activeIdeaAnalysis?.improvementAreas || [
        'Add quantitative latency/accuracy benchmarks comparing your workflow against the baseline approach',
        'Strengthen privacy, access control, and failure-mode handling (e.g. offline resilience or non-biometric alternatives)',
        'Design automated integration tests verifying core correctness under edge cases',
      ]

    const markdown = `### Research Gaps & Improvement Opportunities for [${project.title}](/explore-projects/${project.id})

**1. Documented Evidence from the Repository:**
${docLimitations}
${docFuture}

**2. Unknown Implementation Details (Cannot Be Concluded Without Further Evidence):**
${missingFields.length > 0 ? missingFields.map((m) => `- ${m}`).join('\n') : '- Performance benchmark numbers and unit test coverage metrics are not publicly recorded.'}

**3. AI-Generated Improvement Suggestions (For Your Team to Evaluate):**
${suggestions.map((s) => `- ${s}`).join('\n')}

Which of these improvement directions best matches your team's technical strengths and timeline?`

    return {
      markdown,
      followUps: [
        'Let us compare two alternative architectures',
        'Evaluate a new feature we want to add',
        'Prepare our proposal outline',
      ],
      stageUpdates: {
        lastTopicCovered: `Research Gaps: ${project.title}`,
        ...(!context.currentProjectIdea ? { currentProjectIdea: project.title } : {}),
        ...(!context.matchedRepositoryProject && match
          ? { matchedRepositoryProject: this.formatProjectDossierBlock(match).summary }
          : {}),
      },
    }
  }

  /**
   * Repository follow-up: Originality & Duplication Inquiry (no arbitrary scores!)
   */
  private async handleRepositoryOriginalityInquiry(
    prompt: string,
    context: IConversationContext
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const { project, match } = await this.resolveActiveMatchedProject(context)
    const idea = context.currentProjectIdea || ideaAnalyzer.extractCleanTitle(prompt)

    if (!project) {
      return {
        markdown: `I searched the accessible repository for **"${idea}"** and found **no exact or highly related prior project record**.

- **Originality Assessment**: Because no matching project was found in your college's verified archive, your core problem framing is distinct here. However, repository absence does not guarantee novelty outside the campus — examiners will still check what engineering depth your solution demonstrates beyond standard CRUD.
- **Plagiarism Note**: Even when concepts overlap elsewhere, conceptual similarity is never treated as proof of plagiarism.

What specific user workflow or technical problem makes your implementation stand out?`,
        followUps: ['Help define core vs optional features', 'Evaluate a specific feature'],
        stageUpdates: {
          lastTopicCovered: 'Originality Assessment (No Repo Overlap)',
        },
      }
    }

    const overlapLabel =
      match?.academicClassification ||
      context.matchedRepositoryProject?.academicClassification ||
      'Conceptual Overlap Detected'

    const markdown = `### Originality & Overlap Assessment for "${idea}"

- **Repository Finding**: Your idea matches **[${project.title}](/explore-projects/${project.id})** (${project.academicYear}, ${project.department}) — classified as **${overlapLabel}**.
- **Why This Matters**: CampusProjectHub **never equates similarity with plagiarism**, and I do not invent arbitrary "originality percentages." Instead, faculty evaluate whether you are repeating solved work or introducing genuine engineering progress.
- **How to Make Your Project Defensible**:
  1. Target a documented limitation or an unserved user scenario instead of rebuilding identical screens.
  2. Introduce a stronger technical approach (for example, higher reliability, better privacy protection, or lower resource requirements) and verify it with real tests.

What concrete improvement over **${project.title}** will be your team's main contribution?`

    return {
      markdown,
      followUps: [
        'What can be improved from that project?',
        'What technologies did they use?',
        'Can I connect with the authors?',
      ],
      stageUpdates: {
        lastTopicCovered: `Originality Assessment: ${project.title}`,
      },
    }
  }

  /**
   * Authorization & Zero-Leakage Protection Inquiry
   */
  private handleRestrictedInfoInquiry(_context: IConversationContext): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `### Cannot Reveal Restricted or Confidential Information

I cannot access or disclose restricted information such as:

- Private student email addresses, phone numbers, or personal contact records.
- Internal faculty rejection comments or confidential reviewer grading notes.
- Unapproved private drafts submitted by other students.

If you want guidance from a previous project team, you can only browse **verified public project records** in Explore Projects and send a **consent-based mentorship request** when an author has explicitly opted in.

Would you like help drafting a polite in-app mentorship request for an opted-in senior instead?`

    return {
      markdown,
      followUps: ['How do I send a consent-based mentorship request?', 'Show verified public project details'],
      stageUpdates: {
        lastTopicCovered: 'Privacy & Authorization Boundary Notice',
      },
    }
  }

  /**
   * Honest multi-turn dynamic Feature Evaluation (cross-checks active repo match & constraints)
   */
  private async handleFeatureAdditionInquiry(
    prompt: string,
    context: IConversationContext
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const lower = prompt.toLowerCase()

    // Check active matched repository project for real overlap
    let activeMatch: ProjectMatchResult | null = null
    if (context.currentProjectIdea || context.matchedRepositoryProject) {
      const targetQuery = context.matchedRepositoryProject?.title || context.currentProjectIdea || prompt
      const matches = await repositorySearchService.compareStudentIdea(
        targetQuery,
        `${targetQuery} ${prompt}`,
        context.preferredTechnologies
      )
      if (matches.length > 0 && matches[0].classification !== 'RELATED_TECHNOLOGY_ONLY') {
        activeMatch = matches[0]
      }
    }

    const critique = ideaAnalyzer.evaluateFeatureInConversation(prompt, context, activeMatch)

    const isTaskAllocation = lower.includes('task allocation') || lower.includes('assign tasks')
    if (isTaskAllocation) {
      const markdown = `### Feature Feasibility Evaluation: Automated AI Task Allocation

* **Proposed Feature**: Automated AI-Driven Team Task Allocation
* **Classification**: \`RECOMMENDED WITH PRAGMATIC CONSTRAINTS\`
* **Target Experience Level**: ${context.technicalExperience.toUpperCase()}

#### 1. Why the Idea is Attractive:
Automated assignment based on member skills (e.g. Frontend, Backend, ML) promises to reduce team coordination friction and prevent unbalanced workloads.

#### 2. Realistic Technical Hurdles for a Semester Project:
1. **The Cold-Start & Verification Problem**: In student teams, members self-report skill levels that rarely match real performance. An AI algorithm relying on subjective input will allocate critical path tasks incorrectly.
2. **Algorithmic Complexity**: A rigorous allocation engine requires a formal constraint satisfaction problem (CSP) solver matching task dependencies, availability, and skill matrices — consuming 4–6 weeks.
3. **Team Dynamics**: Students prefer negotiating tasks directly rather than letting an algorithm assign grades-critical work.

#### 3. Recommended Pragmatic Implementation:
- Build **Skill-Tagged Task Boards** with prerequisite tags first, plus a simple workload-balance warning heuristic.

Would you like to formalize this recommendation into your project scope, or evaluate another feature?`

      return {
        markdown,
        followUps: [
          'Accept the heuristic suggestion approach',
          'Evaluate another feature idea',
          'Lock our finalized project scope',
        ],
        stageUpdates: {
          currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
          proposedFeatures: ['Heuristic Task Workload Balancing'],
          topicsDiscussed: ['Feasibility: AI Task Allocation'],
        },
      }
    }

    const isFacial =
      lower.includes('facial recognition') ||
      lower.includes('face recognition') ||
      lower.includes('biometric') ||
      (lower.includes('face') && lower.includes('attendance'))

    if (isFacial) {
      const repoOverlapNote = critique.alreadyCoveredInMatchedProject
        ? `\n* **Repository Overlap Check**: ${critique.alreadyCoveredInMatchedProject} Adding basic facial recognition alone will **not** differentiate your project from that earlier work unless you introduce a genuine improvement or pivot your check-in mechanism.\n`
        : ''

      const markdown = `### Feature Feasibility Evaluation: Facial Recognition for Attendance Tracking

* **Proposed Feature**: Automated Facial Recognition Attendance System
* **Classification**: \`UNNECESSARY\` for initial semester scope (High Complexity & Privacy Risk)
${repoOverlapNote}
#### 9-Criterion Engineering Critique:
1. **Problem Relevance & User Benefit**: Attendance tracking is a real problem, but biometric capture is fragile compared to cryptographic check-ins.
2. **Contribution & Originality**: ${critique.contributionAndOriginality}
3. **Privacy, Ethics & Consent**: Storing student facial embeddings introduces institutional privacy risks without formal consent/IRB governance.
4. **Technical Feasibility & Complexity**: \`${critique.implementationComplexity}\` — OpenCV/FaceNet pipelines fail frequently under uneven classroom lighting, angles, and occlusions during live vivas.
5. **Required Skills & Time**: ${critique.requiredSkillsAndResources.join(', ')} (~${critique.estimatedDevelopmentTime}).
6. **Simpler Alternative [Recommended]**: **Rotating time-bound QR code attendance** (15-second token expiry + live faculty roster audit) — achievable in ~1 week with zero biometric liability.

${critique.missingConstraintQuestion || 'Would you like to switch to dynamic rotating QR check-ins, or explain what lighting/camera hardware guarantees you have?'}`

      return {
        markdown,
        followUps: [
          'Switch to dynamic QR code attendance instead',
          'I also want to add an AI chatbot',
          'Lock our finalized project scope',
        ],
        stageUpdates: {
          currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
          rejectedRecommendations: ['Biometric Face Recognition'],
          topicsDiscussed: ['Feasibility: Facial Recognition Attendance'],
        },
      }
    }

    const classificationBadge = critique.classification.toUpperCase()
    const repoOverlapSection = critique.alreadyCoveredInMatchedProject
      ? `\n- **Repository Overlap Finding**: ${critique.alreadyCoveredInMatchedProject}`
      : ''

    const altSection = critique.simplerAlternative
      ? `\n- **Suggested / Simpler Alternative**: ${critique.simplerAlternative}`
      : ''

    const markdown = `### Honest Feature Critique: ${critique.featureName}

- **Classification**: **${critique.classification}** (\`${classificationBadge}\`)${repoOverlapSection}
- **Problem Relevance**: ${critique.problemRelevance}
- **User Benefit**: ${critique.userBenefit}
- **Contribution & Originality**: ${critique.contributionAndOriginality}
- **Technical Feasibility & Complexity**: \`${critique.implementationComplexity}\` — ${critique.technicalFeasibility}
- **Required Skills & Resources**: ${critique.requiredSkillsAndResources.join(', ')}
- **Estimated Development Time**: ${critique.estimatedDevelopmentTime}
- **Dependencies & Maintenance**: Depends on ${critique.dependencies.join(', ')}. ${critique.maintenanceRequirements}
- **Primary Risks**: ${critique.risks.join(' ')}${altSection}

${
  critique.classification === 'Unnecessary'
    ? 'My recommendation is to **remove this feature** from your initial semester release so your team stays focused on a reliable core product.'
    : 'I recommend prioritizing core workflows before integrating this capability.'
}

${critique.missingConstraintQuestion || 'Should we keep this out of your core MVP scope or adapt it to a simpler alternative?'}`

    return {
      markdown,
      followUps: [
        'Drop unnecessary features and lock core scope',
        'Evaluate another proposed feature',
        'Generate our academic proposal',
      ],
      stageUpdates: {
        currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
        proposedFeatures:
          critique.classification === 'Unnecessary' ? [] : [critique.featureName],
        rejectedRecommendations:
          critique.classification === 'Unnecessary' ? [critique.featureName] : [],
        topicsDiscussed: [`Feasibility: ${critique.featureName}`],
      },
    }
  }

  /**
   * Executes interactive 12-dimension project comparison & research gap analysis and persists session
   */
  private async handleMultiProjectComparison(
    conversationId: string,
    ownerId: string,
    prompt: string,
    context: IConversationContext
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
    retrievalTelemetry?: RetrievalTelemetry
    retrievedMatches?: ProjectMatchResult[]
  }> {
    const extracted = ideaAnalyzer.extractProposedImprovements(prompt)
    const isFreshTopic =
      extracted.improvements.length > 0 || !context.currentProjectIdea
    const title = isFreshTopic
      ? extracted.baseIdea || ideaAnalyzer.extractCleanTitle(prompt)
      : context.currentProjectIdea!
    const mergedFeatures = Array.from(
      new Set([
        ...(extracted.improvements.length > 0 ? extracted.improvements : context.proposedFeatures || []),
      ])
    )
    const mergedTech = Array.from(
      new Set([...(context.preferredTechnologies || []), ...extracted.technologies])
    )

    const { report, retrievedMatches, retrievalLatencyMs } = await researchGapService.analyzeAndCompare({
      title,
      description: `${title}. ${prompt}`,
      features: mergedFeatures,
      technologies: mergedTech,
      constraints: {
        teamSize: context.teamSize,
        developmentWeeks: context.developmentWeeks,
        technicalExperience: context.technicalExperience,
        hardware: context.hardwareRequirements,
        datasets: context.availableDatasets,
        budget: context.budget,
      },
    })

    // Save comparison session cleanly when repository persistence is enabled
    let sessionId = context.activeComparisonSessionId
    try {
      const created = await ComparisonSessionRepository.create({
        ownerId,
        conversationId,
        proposedTitle: report.A_proposedProject.title,
        proposedDescription: `${title}. ${prompt}`,
        proposedFeatures: report.A_proposedProject.proposedFeatures,
        proposedTechnologies: context.preferredTechnologies,
        constraintsSnapshot: {
          teamSize: context.teamSize,
          developmentWeeks: context.developmentWeeks,
          technicalExperience: context.technicalExperience,
        },
        retrievedProjectIds: retrievedMatches.map((m) => m.project.id),
        report,
        studentDecisions: [],
        finalContributionStatement: report.J_suggestedProjectContribution,
        version: 1,
      })
      sessionId = created.id
    } catch {
      // Allow conversation flow even if DB persistence is unavailable
    }

    // Do not repeat the full matrix if a comparison was already shown for the same topic/features
    const alreadyShownFull =
      context.currentDiscussionStage === 'STRUCTURED_COMPARISON_PRESENTED' &&
      extracted.improvements.length === 0
    const markdown = researchGapService.buildInteractiveComparisonIntro(
      report,
      !alreadyShownFull
    )

    return {
      markdown,
      followUps:
        mergedFeatures.length > 0
          ? [
              `Let us implement ${mergedFeatures[0]} first`,
              'Confirm core scope and run Feature Evaluation',
              'Prepare our IEEE 830 problem statement',
            ]
          : [
              'Evaluate our differentiating feature feasibility',
              'Lock suggested project contribution into scope',
              'Prepare problem statement from these gaps',
            ],
      stageUpdates: {
        mode: 'PROJECT_DISCOVERY',
        currentProjectIdea: title,
        proposedFeatures: mergedFeatures,
        ...(retrievedMatches[0]
          ? { matchedRepositoryProject: this.formatProjectDossierBlock(retrievedMatches[0]).summary }
          : {}),
        activeComparisonSessionId: sessionId,
        currentDiscussionStage: 'STRUCTURED_COMPARISON_PRESENTED',
        lastTopicCovered: `Structured Comparison: ${title}`,
        topicsDiscussed: [`Multi-Project Research Gap Comparison: ${title}`],
      },
      retrievalTelemetry: {
        executed: true,
        latencyMs: retrievalLatencyMs,
        retrievedCount: retrievedMatches.length,
        retrievedProjectIds: retrievedMatches.map((m) => m.project.id),
        retrievedProjectTitles: retrievedMatches.map((m) => m.project.title),
        failed: false,
      },
      retrievedMatches,
    }
  }

  /**
   * Restores a previously discussed project idea cleanly when the student revisits it
   */
  private async handleReturnToPriorProject(
    prompt: string,
    context: IConversationContext
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const stack = context.previousProjectIdeas || []
    const lower = prompt.toLowerCase()
    const match =
      stack.find((item) =>
        item.title
          .toLowerCase()
          .split(/\s+/)
          .some((w) => w.length > 3 && lower.includes(w))
      ) || stack[stack.length - 1]

    if (!match) {
      return {
        markdown:
          'We do not have an earlier project saved in this conversation yet. Tell me which project idea you want to work on now.',
        followUps: ['Smart Attendance Management System', 'Evaluate a feature for my current project'],
        stageUpdates: {},
      }
    }

    const repoLine = match.matchedRepositoryProject
      ? `\n- **Restored Repository Benchmark**: **[${match.matchedRepositoryProject.title}](${match.matchedRepositoryProject.sourceUrl || '/explore-projects'})** (${match.matchedRepositoryProject.academicYear})`
      : ''

    return {
      markdown: `### Returning to Earlier Project: "${match.title}"

I have restored your previous project context cleanly:
- **Active Project Idea**: ${match.title}
- **Domain**: ${match.category || 'Academic Software Systems'}${repoLine}
- **Preserved Team & Timeline**: ${context.teamSize ? `${context.teamSize} member(s)` : 'Not specified'} | ${context.developmentWeeks ? `${context.developmentWeeks} week(s)` : 'Not specified'} (${context.technicalExperience})

Which aspect of **${match.title}** should we pick up next: scope refinement, feature evaluation, or proposal drafting?`,
      followUps: [
        'What can be improved from the previous project?',
        'Evaluate a new feature for this project',
      ],
      stageUpdates: {
        mode: 'PROJECT_DISCOVERY',
        currentProjectIdea: match.title,
        projectCategory: match.category,
        matchedRepositoryProject: match.matchedRepositoryProject,
        currentDiscussionStage: 'RESTORED_PRIOR_PROJECT',
        topicsDiscussed: [`Revisited: ${match.title}`],
      },
    }
  }

  /**
   * Handles student replies supplying or correcting constraints (team size, timeline, skill level, hardware, datasets, language)
   */
  private handleClarificationOrParam(
    prompt: string,
    context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lowerPrompt = prompt.toLowerCase()
    if (
      context.currentDiscussionStage === 'STRUCTURED_COMPARISON_PRESENTED' &&
      (/first\b|priorit|start with|implement/i.test(lowerPrompt) ||
        context.proposedFeatures.some((f) => lowerPrompt.includes(f.toLowerCase().slice(0, 12))))
    ) {
      const matchedChoice =
        context.proposedFeatures.find((f) => lowerPrompt.includes(f.toLowerCase().slice(0, 12))) ||
        ideaAnalyzer.extractCleanTitle(prompt)
      const remainingFeatures = context.proposedFeatures.filter((f) => f !== matchedChoice)

      const markdown = `Got it — prioritizing **${matchedChoice}** as your primary improvement for **${context.currentProjectIdea || 'your project'}** before expanding optional capabilities.

### Milestone 1 Plan (Before Finalizing Scope)
- **Step 1 — Baseline Core Parity**: Build clean authentication, team/project records, and core CRUD validation first so the foundation is solid.
- **Step 2 — Focused Differentiator (${matchedChoice})**: Start with a transparent, testable heuristic/rule engine and validate end-to-end with sample seeded test records.${
        remainingFeatures.length > 0
          ? `\n- **Deferred / Milestone 2 Candidate(s)**: ${remainingFeatures.join(', ')} (keep optional until Step 1–2 pass integration tests).`
          : ''
      }

Before I lock this into your formal scope, please confirm: **do you want to keep "${matchedChoice}" as a Must-Have improvement and defer secondary add-ons until core features work?**`

      return {
        markdown,
        followUps: [
          'Yes, confirm scope and run 7-Dimensional Feature Evaluation',
          'Generate our IEEE 830 Academic Proposal',
        ],
        stageUpdates: {
          currentDiscussionStage: 'IMPROVEMENT_PRIORITIZED',
          acceptedRecommendations: [matchedChoice],
          topicsDiscussed: [`Prioritized Improvement: ${matchedChoice}`],
        },
      }
    }
    const teamText = context.teamSize ? `${context.teamSize} member(s)` : 'team size not yet specified'
    const weekText = context.developmentWeeks ? `${context.developmentWeeks} week(s)` : 'timeline not yet specified'
    const expText = context.technicalExperience

    const isConstrained =
      (context.teamSize !== undefined && context.teamSize <= 2) ||
      (context.developmentWeeks !== undefined && context.developmentWeeks <= 8) ||
      expText === 'beginner'

    const calibrationAdvice = isConstrained
      ? 'Because your team capacity or timeline is tight, **avoid complex distributed microservices or heavy custom ML pipelines** unless strictly justified — instead start with a **clean modular monolith**, one verified end-to-end core workflow, deterministic database validation, and automated tests.'
      : 'With your stated capacity, your team can deliver a solid core implementation plus **one focused differentiator** (such as automated analytics or performance benchmarking) alongside thorough test coverage.'

    const extraConstraints = [
      context.budget ? `- **Budget**: ${context.budget}` : '',
      context.hardwareRequirements ? `- **Hardware**: ${context.hardwareRequirements}` : '',
      context.availableDatasets ? `- **Datasets**: ${context.availableDatasets}` : '',
      context.languagePreference && context.languagePreference !== 'auto'
        ? `- **Preferred Language**: ${context.languagePreference.toUpperCase()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const nextQ = this.pickNextUnaskedQuestion(context, [
      {
        key: 'differentiator',
        question: 'Which specific user feature do you want to build first for your Milestone 1 demo?',
      },
      {
        key: 'featureCheck',
        question: 'Are there any additional features you are unsure whether to keep or drop?',
      },
    ])

    const markdown = `Thanks — I have updated your project profile and constraints for **${context.currentProjectIdea || 'your project'}**:
- **Team Size**: ${teamText}
- **Available Timeline**: ${weekText}
- **Experience Level**: ${expText}
${context.preferredTechnologies.length > 0 ? `- **Stack**: ${context.preferredTechnologies.join(', ')}\n` : ''}${extraConstraints ? `${extraConstraints}\n` : ''}
**Calibrated Scope Recommendation:**
${calibrationAdvice}

${nextQ.question}`

    return {
      markdown,
      followUps: [
        'Help narrow down our Essential vs Optional features',
        'Run 7-Dimensional Feature Evaluation',
        'Prepare our proposal problem statement',
      ],
      stageUpdates: {
        currentDiscussionStage: 'CONSTRAINTS_CALIBRATED',
        askedQuestionKeys: nextQ.key ? [nextQ.key] : [],
        topicsDiscussed: ['Constraint Calibration'],
      },
    }
  }

  /**
   * Handler for Mode B: Progressive CampusProjectHub Introduction
   */
  private handleProgressiveIntro(
    prompt: string,
    context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()
    let targetIndex = context.introSectionIndex

    if (lower.includes('problem statement') || lower.includes('problems solved') || lower.includes('why do we need')) {
      targetIndex = 1
    } else if (lower.includes('existing system') || lower.includes('traditional') || lower.includes('how colleges manage')) {
      targetIndex = 2
    } else if (lower.includes('proposed solution') || lower.includes('7 pillars') || lower.includes('pillars')) {
      targetIndex = 3
    } else if (lower.includes('objectives') || lower.includes('rubric')) {
      targetIndex = 4
    } else if (
      lower.includes('16 modules') ||
      lower.includes('functional modules') ||
      lower.includes('modules breakdown') ||
      lower.includes('explain its modules') ||
      lower.includes('explain the modules') ||
      lower.includes('what are its modules') ||
      lower.includes('explain modules')
    ) {
      targetIndex = 5
    } else if (lower.includes('repository') || lower.includes('similarity algorithm') || lower.includes('discovery')) {
      targetIndex = 6
    } else if (lower.includes('senior-junior') || lower.includes('senior junior') || lower.includes('mentorship')) {
      targetIndex = 7
    } else if (lower.includes('architecture') || lower.includes('3-tier') || lower.includes('three-tier')) {
      targetIndex = 8
    } else if (lower.includes('technology stack') || lower.includes('tech stack') || lower.includes('technologies')) {
      targetIndex = 9
    } else if (lower.includes('database') || lower.includes('schema') || lower.includes('mongodb')) {
      targetIndex = 10
    } else if (lower.includes('workflow') || lower.includes('lifecycle')) {
      targetIndex = 11
    } else if (lower.includes('advantages') || lower.includes('benefits') || lower.includes('value')) {
      targetIndex = 12
    } else if (lower.includes('limitations') || lower.includes('boundaries') || lower.includes('trade-offs')) {
      targetIndex = 13
    } else if (lower.includes('future') || lower.includes('roadmap') || lower.includes('enhancements')) {
      targetIndex = 14
    }

    if (targetIndex >= PROGRESSIVE_SECTIONS.length) {
      targetIndex = 0
    }

    const section = PROGRESSIVE_SECTIONS[targetIndex]
    const markdown = `${section.content}\n\n---\n\n> **Mentor Inquiry**: ${section.followUpPrompt}`

    const nextSection = PROGRESSIVE_SECTIONS[section.nextIndex]
    return {
      markdown,
      followUps: [
        `Next: ${nextSection.title}`,
        'Compare CampusProjectHub with commercial tools like Trello',
        'Test my own project idea against the repository',
      ],
      stageUpdates: {
        mode: 'CAMPUSPROJECTHUB_INTRO',
        introSectionIndex: section.nextIndex,
        currentDiscussionStage: `INTRO_STEP_${section.index + 1}`,
        lastTopicCovered: section.key,
        topicsDiscussed: [section.title],
      },
    }
  }

  private handleComparisonInquiry(prompt: string): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()
    const targetTool = lower.includes('jira')
      ? 'Jira'
      : lower.includes('google drive')
      ? 'Google Drive / Spreadsheets'
      : lower.includes('whatsapp')
      ? 'WhatsApp Group Chats'
      : 'Trello'

    const markdown = `### CampusProjectHub vs. ${targetTool} — Academic Architecture Comparison

When reviewing student project tools, academic evaluators examine whether a platform supports the **academic project lifecycle** rather than general task tracking alone.

| Dimension | ${targetTool} | CampusProjectHub |
| :--- | :--- | :--- |
| **Primary Domain** | General commercial sprint boards / file storage | Academic capstone discovery, scoping & review |
| **Institutional Memory** | Lost when boards or drives close after graduation | Persisted project repository in MongoDB |
| **Prior-Art Discovery** | No cross-batch searchable archive | Multi-signal repository search & comparison |
| **Similarity Analysis** | None | Multi-dimension conceptual vs tech stack comparison |
| **Documentation Standards** | Manual document formatting | IEEE 830 15-section proposal generator with DOCX & PDF export |
| **Faculty Governance** | Informal comments | Stage-gated submission review (\`DRAFT\` ➔ \`APPROVED\`) |
| **Senior-Junior Network** | Disconnected | Privacy-masked consent mentorship requests |

Generic tools like ${targetTool} track tasks inside one team, whereas CampusProjectHub connects current teams to verified historical knowledge and faculty review workflows.

Would you like to examine the **15-Section Proposal Generator**, or check a project idea against the repository?`

    return {
      markdown,
      followUps: [
        'How does the IEEE 830 Proposal Generator work?',
        'How does CampusProjectHub protect student privacy?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'COMPARISON_ANALYSIS',
        topicsDiscussed: [`Tool Comparison: ${targetTool}`],
      },
    }
  }

  private handleTechnicalExplanation(prompt: string): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()

    if (
      (lower.includes('implement') && lower.includes('repository')) ||
      lower.includes('implement the project repository') ||
      lower.includes('implement project repository')
    ) {
      const markdown = `### Implementing the Academic Project Repository

Implementing an academic project repository reliably involves three layers:

1. **Database Schema (MongoDB & Mongoose)**:
   - Store projects with \`title\`, \`department\`, \`academicYear\`, \`abstract\`, \`problemStatement\`, \`proposedSolution\`, \`features\`, \`technologyStack\`, and \`githubUrl\`.
   - Create compound indexes on \`{ collegeId: 1, department: 1, academicYear: 1 }\` and weighted text indexes on title/abstract/problem/features.
2. **Multi-Signal Retrieval & Similarity**:
   - Combine tokenized Jaccard containment search, concept synonym expansion, feature/module overlap, and vector cosine similarity while separating shared technology from shared problem concepts.
3. **Student Privacy & Contact Masking**:
   - Strip personal student emails, phone numbers, and internal faculty rejection notes from public search serializers.

*Source Attribution: Verified from \`docs/ai-mentor/knowledge/09-project-repository.md\`*

Are you building your persistence layer with MongoDB or a relational SQL database?`

      return {
        markdown,
        followUps: ['Explain the Three-Tier Architecture', 'Do we really need AI for the repository?'],
        stageUpdates: {
          currentDiscussionStage: 'REPOSITORY_IMPLEMENTATION_DISCUSSION',
          topicsDiscussed: ['Repository Implementation'],
        },
      }
    }

    let topicDoc = '14-system-architecture.md'
    if (lower.includes('similarity') || lower.includes('jaccard')) topicDoc = '09-project-repository.md'
    else if (lower.includes('sse') || lower.includes('stream')) topicDoc = '11-ai-project-mentor.md'
    else if (lower.includes('database') || lower.includes('schema') || lower.includes('mongo')) topicDoc = '15-database-architecture.md'
    else if (lower.includes('docx') || lower.includes('pdf')) topicDoc = '13-proposal-generation.md'

    const docContent = knowledgeService.readKnowledgeDoc(topicDoc) || ''
    const summary = docContent.split('\n\n').slice(0, 4).join('\n\n')

    return {
      markdown: `### Technical Architecture Deep Dive

${summary}

*Source Attribution: Verified from \`docs/ai-mentor/knowledge/${topicDoc}\`*

Which integration layer would you like to inspect next?`,
      followUps: ['Show the schema and API contract', 'What are the failure modes to watch out for?'],
      stageUpdates: {
        currentDiscussionStage: 'TECHNICAL_DEEP_DIVE',
        topicsDiscussed: [`Technical: ${topicDoc}`],
      },
    }
  }

  private handleSeniorConnectionInquiry(context: IConversationContext): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const projectTitle = context.matchedRepositoryProject?.title || 'CampusProjectHub'
    const isCPH = projectTitle.toLowerCase().includes('campusprojecthub')
    const matchedAuthors = context.matchedRepositoryProject?.authors

    const contributorText =
      matchedAuthors && matchedAuthors.length > 0
        ? matchedAuthors
            .map(
              (a) =>
                `* **${a.name}** (${a.role || 'Contributor'}) — ${
                  a.isAvailableForMentoring ? '🟢 *Available for Mentoring (Opted In)*' : '⚪ *Not Accepting Mentees*'
                }`
            )
            .join('\n')
        : isCPH
        ? `* **Alex Chen** (Lead System Architect, 2025 Batch) — 🟢 *Available for Mentoring*\n* **Priya Patel** (Core AI & Similarity Engineer, 2025 Batch) — 🟢 *Available for Mentoring*\n* **Marcus Vance** (Robotics Contributor) — ⚪ *Currently Unavailable*`
        : `* **Project Lead & Core Team** (${context.matchedRepositoryProject?.department || 'Engineering'}, ${context.matchedRepositoryProject?.academicYear || 'Verified Capstone'})`

    const markdown = `### 🤝 Senior-Junior Connection & Contributor Mentorship

You asked about connecting with the team behind **${projectTitle}** via our Senior-Junior network.

#### 1. Identified Project Contributors
${contributorText}

#### 2. Academic Etiquette & Guidelines
* Review the project abstract, architecture, and documented limitations before reaching out.
* State a clear learning goal (for example, *Understanding Architecture* or *Discussing an Extension*) with 1–2 concise questions.

#### 3. Structured Request Draft (Review & Confirm Before Sending):
> **Selected Purpose:** *Understanding Architecture & Discussion of Extension*  
> **Note:**  
> *"Hello! I am a student exploring your ${projectTitle} project on CampusProjectHub. We are planning an extension for our upcoming project and reviewed your architecture. Could we ask two brief questions regarding your design trade-offs? Thank you!"*

#### 4. Strict Zero-Leakage Privacy Protection
> 🔒 **Privacy Protection (Masked Contact Details):** Personal emails and phone numbers are strictly masked and never disclosed by the AI Mentor. I **cannot send connection requests on your behalf** — you must confirm and send them yourself.

Open the **Request Guidance** modal on an opted-in contributor card from **Explore Projects** (or click **"Request Guidance"**) when you are ready.`

    return {
      markdown,
      followUps: [
        'How do I send a connection request from the project page?',
        'What can be improved from this project?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'SENIOR_MENTORSHIP_GUIDANCE',
        topicsDiscussed: ['Senior-Junior Mentorship Guidance'],
      },
    }
  }

  private handleProposalGenerationInquiry(context: IConversationContext): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const projectTitle =
      context.currentProjectIdea ||
      'CampusProjectHub: AI-Powered Academic Project Management Platform'

    const markdown = `I can compile a grounded **Academic Project Proposal** for **"${projectTitle}"** using your finalized scope and verified repository context.

### What Is Included:
1. **Standard 15 Canonical Sections**: Title, Abstract, Introduction, Problem Statement, Existing System, Proposed System, Objectives, Scope, Features & Modules, System Architecture, Technology Stack, Proposed Methodology, Expected Outcomes, Timeline & Milestones, and Verified References.
2. **Scope & Edit Preservation**: Accepted, modified, and excluded feature rationales carry over automatically, and manual edits stay preserved when switching college templates.
3. **DOCX & PDF Export**: Export formatted OpenXML DOCX or PDF documents ready for faculty submission.

> ℹ️ **Academic Integrity Notice**: Never fabricate references, experimental benchmarks, or faculty approvals.

Would you like to open the proposal workspace now?`

    return {
      markdown,
      followUps: [
        'Open Proposal Workspace',
        'Review current scope completeness first',
        'Check Proposal Readiness criteria',
      ],
      stageUpdates: {
        lastTopicCovered: 'Academic Proposal Generation Guidance',
        topicsDiscussed: ['Academic Proposal Generation'],
      },
    }
  }

  private handleProjectSuitability(context: IConversationContext): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const idea = context.currentProjectIdea || 'your proposed system'
    const markdown = `Yes, **${idea}** can be a **suitable academic mini-project**, provided you bound your scope to one verifiable core problem within **8 to 12 weeks** instead of trying to build a full commercial clone like Jira or GitHub.

Faculty panels evaluate three criteria:
1. **Clear Problem Formulation**: A concrete bottleneck worth solving rather than an empty CRUD screen.
2. **Technical Soundness**: Proper schema design, validation, role-based access control, and edge-case handling.
3. **Execution Realism**: Completing and testing a focused MVP vertical slice instead of half-built buzzword features.

To calibrate accurately: what is your team size, and how many weeks remain before evaluation?`

    return {
      markdown,
      followUps: [
        'Can we reduce the scope to an MVP?',
        'Do we really need AI for this mini-project?',
        'Prepare a problem statement for our mini-project',
      ],
      stageUpdates: {
        currentDiscussionStage: 'PROJECT_SUITABILITY_ASSESSMENT',
        topicsDiscussed: ['Project Suitability Assessment'],
      },
    }
  }

  private handleCollegeScopeAffirmation(): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `Focusing specifically on an academic institution is a strong strategic decision. Enterprise tools like Trello or Jira do not preserve **Institutional Memory**, **prior-art discovery**, or **stage-gated faculty review** (\`Draft\` ➔ \`Submitted\` ➔ \`Approved\`).

For an 8–12 week semester build:
- **Core Mini-Project Features to Build (High Priority)**: Role-based workspaces, academic repository discovery/comparison, milestone submissions, and guide review feedback.
- **High-Risk Features to Defer (Future Work)**: Live WebRTC video conferencing, heavy GPU training clusters, or complex ERP billing sync.

Which component do you want to focus on first: Between the student project workflow and the previous-batch project repository?`

    return {
      markdown,
      followUps: [
        'What are the disadvantages?',
        'How can we implement the project repository?',
        'Can we reduce the scope?',
      ],
      stageUpdates: {
        mode: 'PROJECT_DISCOVERY',
        currentDiscussionStage: 'SCOPE_AND_DIFFERENTIATION_ANALYZED',
        topicsDiscussed: ['College Workflow vs Enterprise Tools', 'Mini-Project Scoping Boundaries'],
      },
    }
  }

  private handleDisadvantagesInquiry(): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    return {
      markdown: `Every software architecture involves trade-offs. Key disadvantages and operational risks to address honestly:

1. **The Cold-Start Repository Problem**: Similarity search adds value only after verified past batch records exist in MongoDB.
2. **AI Provider Latency and API Costs**: Cloud LLM endpoints add token costs and network latency; local mock/deterministic fallbacks avoid lock-in but have narrower reasoning breadth.
3. **Faculty Adoption Resistance**: Verification requires faculty/admin moderation, and if review workflows feel heavier than email or spreadsheets, guides will bypass them.
4. **PII and Data Privacy Balancing**: Connecting juniors and seniors requires strict RBAC and email/phone privacy masking.

For your viva defense, would you like strategies to mitigate the cold-start problem or examine privacy safeguards?`,
      followUps: [
        'How can we implement the project repository?',
        'Do we really need AI?',
        'Explain the architecture',
      ],
      stageUpdates: {
        currentDiscussionStage: 'DISADVANTAGES_AND_LIMITATIONS_ANALYSIS',
        topicsDiscussed: ['Technical Trade-offs & Limitations'],
      },
    }
  }

  private handleAINecessityInquiry(): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    return {
      markdown: `Honest engineering answer: **No, you do not strictly need AI** for core CRUD project tracking, role login, or keyword search. Traditional deterministic web technologies handle those faster and more reliably. Never add AI merely as a buzzword.

Where AI adds real value:
1. **Semantic Similarity**: Detecting conceptual overlap across differently worded project descriptions.
2. **Subjective Feature Feasibility Evaluation**: Critiquing proposed features against semester constraints instead of approving everything blindly.
3. **Structured Proposal Drafting**: Formatting validated scope decisions into clean IEEE 830 sections.

Where in your project would AI solve something a straightforward database query cannot?`,
      followUps: [
        'Is this project suitable for a mini-project?',
        'Can we reduce the scope?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'AI_NECESSITY_ASSESSMENT',
        topicsDiscussed: ['AI Necessity & Justification'],
      },
    }
  }

  private handleScopeReduction(context: IConversationContext): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const idea = context.currentProjectIdea || 'your capstone'
    return {
      markdown: `Pruning scope early is usually the right call — examiners consistently grade a **complete, well-tested core system** higher than an ambitious half-working prototype.

For **${idea}**, split your plan into:
- **Features to KEEP (Core Scope)**: Role-based authentication, your primary domain workflow with MongoDB persistence, validation, and verifiable test cases.
- **Features to DEFER (Future Work)**: Real-Time Video/Audio Streaming (WebRTC), blockchain ledgers, uncalibrated biometric hardware, or decorative analytics.

Which specific module in your current plan feels riskiest for your remaining timeline?`,
      followUps: [
        'Is this project suitable for a mini-project?',
        'Prepare a problem statement',
      ],
      stageUpdates: {
        currentDiscussionStage: 'SCOPE_REDUCTION_PLANNING',
        topicsDiscussed: ['Scope Reduction & MVP Definition'],
      },
    }
  }

  private handleProblemStatement(context: IConversationContext): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const title = context.currentProjectIdea || 'CampusProjectHub'
    const analysis = context.activeIdeaAnalysis

    const background =
      analysis?.existingSituation ||
      'Existing academic project workflows rely on scattered spreadsheets, messaging apps, and unindexed document drives.'
    const coreProblem =
      analysis?.coreProblem ||
      'Departments face The Project Discovery Gap (no prior-art search across past batches), Lack of Early Feasibility Assessment (unrealistic scope choices), and fragmented proposal/milestone tracking.'
    const outcome =
      analysis?.expectedOutcome ||
      'Proposed Solution Objective: Centralized knowledge preservation, reduced accidental topic duplication, realistic scoping, and auditable faculty reviews.'

    const markdown = `### Academic Problem Statement Formulation (${title})

- **Context & Existing Situation**: ${background}
- **Core Problem Statement**: ${coreProblem}
- **Target Stakeholders**: ${(analysis?.targetUsers || ['Students', 'Faculty Guides', 'Department Administrators']).join(', ')}
- **Expected Outcome**: ${outcome}

Would you like to refine this problem statement for your department's format or move straight into **Feature Evaluation**?`

    return {
      markdown,
      followUps: [
        'Formulate measurable project objectives',
        'Run 7-Dimensional Feature Evaluation',
        'Can we reduce the scope?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'PROBLEM_STATEMENT_FORMULATION',
        topicsDiscussed: ['Problem Statement Formulation'],
      },
    }
  }

  private handleFacultyExplanation(): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    return {
      markdown: `### Explaining CampusProjectHub to Your Faculty Guide

Frame the project around **institutional continuity and faculty oversight**, not generic task tracking:

1. **The Core Academic Problem**: Past student projects vanish between batches, leading juniors to repeat topics without building on documented lessons.
2. **Differentiation from Commercial Tools**: Unlike Jira or Google Drive, our searchable repository flags conceptual overlap early while making clear **similarity is not plagiarism**.
3. **Formal Faculty Governance & Stage-Gating**: AI Mentor advises students on scope and drafts proposals, while **only authenticated faculty guides** review and approve formal submissions (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`APPROVED\`).
4. **Architecture & Privacy**: React + Express + MongoDB persistence, scrypt + server-session RBAC authentication, and masked contributor contacts until mentorship consent.

Would you like practice viva questions examiners typically ask next?`,
      followUps: [
        'Prepare a problem statement',
        'Explain the system architecture',
        'What are its disadvantages?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'FACULTY_DEFENSE_EXPLANATION',
        topicsDiscussed: ['Faculty Presentation & Defense Guidance'],
      },
    }
  }

  private async handleGeneralMentoring(
    prompt: string,
    context: IConversationContext,
    history: IMessage[]
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const trimmed = (prompt || '').trim()
    const lower = trimmed.toLowerCase()

    if (!trimmed || lower === 'hi' || lower === 'hello' || lower.startsWith('hey')) {
      return {
        markdown: `Hello! I am your **CampusProjectHub AI Mentor**.

Tell me what you are thinking of building — even just a short title or rough sentence — and I will analyze it, search the college project repository for related past work, and give you honest feedback on scope and improvements.

What project idea or academic question would you like to explore?`,
        followUps: [
          'I want to build a smart attendance system',
          'Campus Waste Segregation Tracker',
          'What makes CampusProjectHub different?',
        ],
        stageUpdates: {
          currentDiscussionStage: 'GREETING',
          topicsDiscussed: ['General Greeting'],
        },
      }
    }

    // If student already has an active project or matched repository record, respond specifically in that context
    if (context.currentProjectIdea || context.matchedRepositoryProject) {
      const { project } = await this.resolveActiveMatchedProject(context)
      const prevTurns = history.length
      const repoLine = project
        ? `Keeping **[${project.title}](/explore-projects/${project.id})** (${project.academicYear}) in mind as your closest campus benchmark,`
        : `Building on your project idea (**${context.currentProjectIdea}**) across our conversation (${prevTurns} messages),`

      return {
        markdown: `${repoLine} focus on tying **"${trimmed}"** directly to your core problem statement and verifiable evaluation metrics:

1. **Requirement Alignment**: Confirm whether this detail addresses a primary bottleneck for your target users (${context.activeIdeaAnalysis?.targetUsers?.join(', ') || 'students/faculty'}) or adds secondary complexity.
2. **Verification Plan**: Define what concrete test or benchmark will prove this works reliably during your faculty evaluation.

Would you like me to evaluate a specific feature for **"${context.currentProjectIdea || trimmed}"**, or inspect gaps in the repository?`,
        followUps: [
          'What can be improved from previous work?',
          'Can we reduce the scope?',
          'Prepare a formal problem statement',
        ],
        stageUpdates: {
          currentDiscussionStage: 'CONTEXTUAL_FOLLOW_UP',
          topicsDiscussed: [`Follow-up: ${trimmed.slice(0, 45)}`],
        },
      }
    }

    // Otherwise run lightweight repository + idea check rather than giving an ungrounded generic reply
    const matches = await repositorySearchService.compareStudentIdea(trimmed, trimmed, context.preferredTechnologies)
    const relevant = matches.find(
      (m) => m.classification !== 'RELATED_TECHNOLOGY_ONLY' && m.classification !== 'INDEPENDENT_WORK'
    )
    if (relevant) {
      const { markdownBlock, summary } = this.formatProjectDossierBlock(relevant)
      return {
        markdown: `Your message relates closely to an existing record in the CampusProjectHub archive:

${markdownBlock}

Are you planning a new project in this area, or asking a specific technical question about it?`,
        followUps: [
          'What can be improved over this project?',
          'Which batch and tech stack built this?',
        ],
        stageUpdates: {
          matchedRepositoryProject: summary,
          currentDiscussionStage: 'CONTEXTUAL_REPO_MATCH',
        },
      }
    }

    return {
      markdown: `Here is a focused engineering perspective on **"${trimmed}"**:

- **Problem vs Implementation**: Clarify the exact user problem first before locking into libraries or AI add-ons.
- **Semester Scope**: Keep your core data flow testable end-to-end before adding optional dashboards or integrations.

If this relates to a specific project idea you are planning, share the project title or goal and I will check the college repository and break down its feasibility.`,
      followUps: [
        'I want to build a smart attendance system',
        'I have a project idea about healthcare triage',
      ],
      stageUpdates: {
        currentDiscussionStage: 'MENTORING_DISCUSSION',
        topicsDiscussed: ['Technical Mentoring'],
      },
    }
  }
}

export const conversationalEngine = new ConversationalEngine()
