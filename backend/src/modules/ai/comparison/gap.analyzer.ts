import { repositorySearchService, ProjectMatchResult } from '../../repository/repository.search.service.js'
import { ideaAnalyzer } from '../conversational-engine/idea.analyzer.js'
import { evaluationEngine } from '../feature-evaluation/evaluation.engine.js'
import type { IConversationContext } from '../conversational-engine/context.types.js'
import type {
  AcademicFeatureTier,
  ActualDifferenceBreakdown,
  CollectiveSynthesis,
  ContributionCategoryType,
  DifferentiatedFeatureAssessment,
  DifferentiationClassification,
  DimensionRelation,
  ExistingVsProposedAreaRow,
  FeasibilitySummary,
  IdentifiedResearchGap,
  ProjectByProjectComparison,
  StructuredComparisonReport,
  StructuredDimensionComparison,
} from './comparison.types.js'

export interface AnalyzeComparisonInput {
  title: string
  description: string
  features?: string[]
  technologies?: string[]
  targetUsers?: string
  objectives?: string[]
  constraints?: {
    teamSize?: number
    developmentWeeks?: number
    technicalExperience?: 'beginner' | 'intermediate' | 'advanced'
    hardware?: string
    datasets?: string
    budget?: string
  }
  collegeId?: string
}

export class ResearchGapIntelligenceService {
  /**
   * Executes multi-project discovery, 12-dimension structured comparison, collective synthesis,
   * 8-category research gap analysis, feature differentiation, and feasibility grounding.
   */
  async analyzeAndCompare(input: AnalyzeComparisonInput): Promise<{
    report: StructuredComparisonReport
    retrievedMatches: ProjectMatchResult[]
    retrievalLatencyMs: number
  }> {
    const start = Date.now()
    const cleanTitle = ideaAnalyzer.extractCleanTitle(input.title || input.description)
    const techList = input.technologies || []
    const proposedFeatures = (input.features || []).filter((f) => f.trim().length > 0)

    const allMatches = await repositorySearchService.compareStudentIdea(
      cleanTitle,
      `${input.description} ${proposedFeatures.join(' ')}`,
      techList,
      input.collegeId
    )
    const retrievalLatencyMs = Date.now() - start

    // Prioritize top 3 conceptual matches; isolate tech-only matches so unrelated projects do not overwhelm
    const conceptualMatches = allMatches
      .filter((m) => m.classification !== 'RELATED_TECHNOLOGY_ONLY' && m.classification !== 'INDEPENDENT_WORK')
      .slice(0, 3)

    const techOnlyMatches = allMatches
      .filter((m) => m.classification === 'RELATED_TECHNOLOGY_ONLY')
      .slice(0, 2)

    const fakeContext: IConversationContext = {
      conversationId: 'comparison-analysis',
      mode: 'PROJECT_DISCOVERY',
      currentProjectIdea: cleanTitle,
      studentObjectives: input.objectives || [],
      proposedFeatures,
      acceptedRecommendations: [],
      rejectedRecommendations: [],
      technicalExperience: input.constraints?.technicalExperience || 'intermediate',
      teamSize: input.constraints?.teamSize,
      developmentWeeks: input.constraints?.developmentWeeks,
      budget: input.constraints?.budget,
      hardwareRequirements: input.constraints?.hardware,
      availableDatasets: input.constraints?.datasets,
      preferredTechnologies: techList,
      currentDiscussionStage: 'COMPARISON',
      topicsDiscussed: [],
      introSectionIndex: 0,
    }

    const ideaBreakdown = ideaAnalyzer.analyzeIdea(
      `${cleanTitle}. ${input.description}`,
      fakeContext
    )

    // Phase 2: Project-by-Project 12-Dimension Comparison
    const projectComparisons: ProjectByProjectComparison[] = conceptualMatches.map((m) =>
      this.buildSingleProject12DimensionComparison(input, cleanTitle, ideaBreakdown, m)
    )

    // Phase 3: Collective Synthesis across relevant historical projects
    const collectiveSynthesis = this.buildCollectiveSynthesis(conceptualMatches)

    // Phase 4: Research Gaps (strictly separating verified limitations/future work vs AI hypotheses)
    const researchGaps = this.buildResearchGaps(cleanTitle, conceptualMatches)

    // Phase 5: Feature Differentiation across all candidate features
    const featureAssessments = this.evaluateFeatureDifferentiation(
      proposedFeatures,
      conceptualMatches,
      fakeContext
    )

    // Phase 6: Technical Feasibility connected to existing evaluation engine principles (no invented constraints!)
    const feasibility = this.assessTechnicalFeasibility(
      input,
      proposedFeatures,
      conceptualMatches,
      featureAssessments
    )

    // Build readable Sections A-K
    const B_relevantPreviousProjects = conceptualMatches.map((m) => ({
      projectId: m.project.id,
      title: m.project.title,
      academicYear: m.project.academicYear,
      batch: m.project.batch || 'Not recorded in repository metadata',
      department: m.project.department,
      sourceUrl: `/explore-projects/${m.project.id}`,
      recordBasis: 'APPROVED_COLLEGE_REPOSITORY' as const,
      classification: m.academicClassification,
      missingDocumentation: m.sourceAttribution.missingDetails,
    }))

    const D_commonFunctionality =
      collectiveSynthesis.commonFunctionality.length > 0
        ? collectiveSynthesis.commonFunctionality
        : conceptualMatches.length === 0
        ? ['No prior conceptually matching project was found in the accessible college repository.']
        : ['Shared domain authentication, record logging, and role-based dashboards.']

    const E_meaningfulDifferences = this.buildMeaningfulDifferences(
      cleanTitle,
      proposedFeatures,
      techList,
      conceptualMatches,
      techOnlyMatches
    )

    const F_documentedLimitations = conceptualMatches.map((m) => ({
      projectId: m.project.id,
      projectTitle: m.project.title,
      academicYear: m.project.academicYear,
      limitations:
        m.project.limitations && m.project.limitations.length > 0
          ? m.project.limitations
          : ['No limitations explicitly recorded in archived documentation (absence does not prove none existed).'],
      documentationNote:
        m.sourceAttribution.missingDetails.length > 0
          ? `Missing metadata: ${m.sourceAttribution.missingDetails.join(', ')}`
          : 'Core project documentation archived.',
    }))

    const recommendedImprovements = researchGaps
      .slice(0, 5)
      .map(
        (g) =>
          `[${g.category} — ${g.sourceBasis === 'AI_IMPROVEMENT_HYPOTHESIS' ? 'AI Hypothesis' : 'Documented Basis'}] ${g.proposedImprovement}`
      )

    const suggestedContribution = this.buildSuggestedContribution(
      cleanTitle,
      conceptualMatches,
      featureAssessments,
      researchGaps
    )

    const nextQuestion = this.buildFocusedComparisonQuestion(
      cleanTitle,
      conceptualMatches,
      featureAssessments,
      input.constraints
    )

    const noveltyDisclaimer =
      'Note: Searches cover accessible approved college repository records only; absence of a match here does not prove global academic novelty, and similarity is never proof of plagiarism.'

    const existingVsProposedTable = this.buildExistingVsProposedTable(
      input,
      cleanTitle,
      ideaBreakdown,
      conceptualMatches
    )
    const actualDifferenceBreakdown = this.buildActualDifferenceBreakdown(
      proposedFeatures,
      featureAssessments,
      conceptualMatches,
      existingVsProposedTable
    )
    const contributionAssessment = this.buildContributionClassification(
      cleanTitle,
      featureAssessments,
      actualDifferenceBreakdown,
      conceptualMatches
    )
    const scopeRecommendation = this.buildScopeRecommendation(
      proposedFeatures,
      featureAssessments,
      conceptualMatches
    )

    const partialReport: Omit<StructuredComparisonReport, 'renderedMarkdown'> = {
      A_proposedProject: {
        title: cleanTitle,
        description: input.description,
        problemSummary: ideaBreakdown.coreProblem,
        proposedFeatures:
          proposedFeatures.length > 0 ? proposedFeatures : ideaBreakdown.mainFunctionality.slice(0, 3),
        technologies: techList,
      },
      B_relevantPreviousProjects,
      C_projectByProjectComparisons: projectComparisons,
      D_commonFunctionality,
      E_meaningfulDifferences,
      F_documentedLimitations,
      G_potentialResearchGaps: researchGaps,
      H_recommendedImprovements: recommendedImprovements,
      I_featureFeasibilityAssessment: {
        featureAssessments,
        feasibility,
      },
      J_suggestedProjectContribution: suggestedContribution,
      K_nextQuestionForStudent: nextQuestion,
      existingVsProposedTable,
      actualDifferenceBreakdown,
      contributionAssessment,
      scopeRecommendation,
      collectiveSynthesis,
      noveltyDisclaimer,
    }

    const report: StructuredComparisonReport = {
      ...partialReport,
      renderedMarkdown: this.renderComparisonMarkdown(partialReport, techOnlyMatches),
    }

    return {
      report,
      retrievedMatches: conceptualMatches,
      retrievalLatencyMs,
    }
  }

  private buildSingleProject12DimensionComparison(
    input: AnalyzeComparisonInput,
    cleanTitle: string,
    ideaBreakdown: ReturnType<typeof ideaAnalyzer.analyzeIdea>,
    match: ProjectMatchResult
  ): ProjectByProjectComparison {
    const p = match.project
    const proposedSolution =
      p.proposedSolution || p.solution || p.proposedSystem || p.abstract
    const hasAlgorithmsRecorded =
      /facenet|mtcnn|opencv|random forest|logistic regression|decision tree|collaborative filtering|constraint satisfaction|optimistic|jaccard|cosine/i.test(
        `${p.methodology || ''} ${p.modules.map((m) => m.description).join(' ')} ${p.objectives.join(' ')} ${p.abstract}`
      )

    const studentTechSet = new Set((input.technologies || []).map((t) => t.toLowerCase()))
    const repoTechNames = p.technologyStack.map((t) => t.name)
    const techShared = repoTechNames.filter((t) => studentTechSet.has(t.toLowerCase()))

    const dims: StructuredDimensionComparison[] = [
      {
        dimension: 'Project problem',
        studentAspect: input.description || ideaBreakdown.coreProblem,
        repositoryAspect: p.problemStatement,
        relationship:
          match.classification === 'EXACT_OR_NEAR_EXACT_TITLE'
            ? 'Same'
            : match.matchedDimensions.conceptSimilarity >= 0.35
            ? 'Similar'
            : 'Different',
        evidence: match.classificationReason,
      },
      {
        dimension: 'Target users',
        studentAspect: input.targetUsers || ideaBreakdown.targetUsers.join(', '),
        repositoryAspect: p.scope || `Academic stakeholders (${p.department})`,
        relationship: p.scope ? 'Similar' : 'Not documented',
        evidence: p.scope
          ? `Scope field documented in ${p.title}`
          : 'Explicit target user list not itemized beyond department metadata.',
      },
      {
        dimension: 'Objectives',
        studentAspect:
          input.objectives && input.objectives.length > 0
            ? input.objectives.join('; ')
            : 'Student objectives still being refined',
        repositoryAspect: p.objectives.length > 0 ? p.objectives.join('; ') : 'Not documented',
        relationship: p.objectives.length > 0 ? 'Similar' : 'Not documented',
        evidence:
          p.objectives.length > 0
            ? `${p.objectives.length} documented objective(s) retrieved.`
            : 'Objectives not itemized in archive.',
      },
      {
        dimension: 'Proposed solution',
        studentAspect: ideaBreakdown.proposedSolution,
        repositoryAspect: proposedSolution,
        relationship:
          match.classification === 'EXACT_OR_NEAR_EXACT_TITLE' ? 'Same' : 'Similar',
        evidence: 'Compared student summary with archived abstract/proposedSolution.',
      },
      {
        dimension: 'Functional modules',
        studentAspect: ideaBreakdown.possibleModules.join(', '),
        repositoryAspect:
          p.modules.length > 0
            ? p.modules.map((m) => `${m.name}: ${m.description}`).join(' | ')
            : 'Not documented',
        relationship:
          p.modules.length === 0
            ? 'Not documented'
            : match.classification === 'EXACT_OR_NEAR_EXACT_TITLE'
            ? 'Similar'
            : 'Different',
        evidence:
          p.modules.length > 0
            ? `${p.modules.length} module(s) recorded (${p.modules.map((m) => m.name).join(', ')}).`
            : 'Module breakdown absent in archive (does not imply modules did not exist).',
      },
      {
        dimension: 'Implemented features',
        studentAspect:
          (input.features && input.features.length > 0
            ? input.features.join(', ')
            : 'Not explicitly itemized yet'),
        repositoryAspect:
          p.features.length > 0 ? p.features.join('; ') : 'Not documented',
        relationship:
          p.features.length === 0
            ? 'Not documented'
            : match.matchedDimensions.matchingFeatures.length >= 2
            ? 'Similar'
            : 'Different',
        evidence:
          match.matchedDimensions.matchingFeatures.length > 0
            ? `Shared documented features: ${match.matchedDimensions.matchingFeatures.join(', ')}`
            : 'Proposed feature details differ or were not yet itemized.',
      },
      {
        dimension: 'Technologies',
        studentAspect:
          techShared.length > 0 || (input.technologies && input.technologies.length > 0)
            ? (input.technologies || []).join(', ')
            : 'Not specified by student',
        repositoryAspect: repoTechNames.join(', ') || 'Not documented',
        relationship:
          (input.technologies || []).length === 0
            ? 'Not applicable'
            : techShared.length === repoTechNames.length && repoTechNames.length > 0
            ? 'Same'
            : techShared.length > 0
            ? 'Similar'
            : 'Different',
        evidence:
          techShared.length > 0
            ? `Shared tools: ${techShared.join(', ')}`
            : 'Distinct or unspecified implementation stack.',
      },
      {
        dimension: 'Algorithms',
        studentAspect: `Derived from "${cleanTitle}" technical approach`,
        repositoryAspect: hasAlgorithmsRecorded
          ? p.modules.map((m) => `${m.name}: ${m.description}`).join('; ')
          : 'Not documented',
        relationship: hasAlgorithmsRecorded ? 'Different' : 'Not documented',
        evidence: hasAlgorithmsRecorded
          ? 'Algorithmic references verified in module descriptions/abstract.'
          : 'Exact algorithms were not recorded in repository metadata.',
      },
      {
        dimension: 'Architecture',
        studentAspect: ideaBreakdown.technicalApproach,
        repositoryAspect: p.architecture?.description || 'Not documented',
        relationship: p.architecture?.description ? 'Different' : 'Not documented',
        evidence: p.architecture?.description
          ? `Recorded architecture note: "${p.architecture.description}"`
          : 'System architecture description was omitted from archive.',
      },
      {
        dimension: 'Data sources',
        studentAspect: input.constraints?.datasets || 'Not yet confirmed by student',
        repositoryAspect:
          p.reportDocuments.length > 0
            ? `${p.reportDocuments.length} verified report dossier(s) attached`
            : 'Not documented',
        relationship: p.reportDocuments.length > 0 ? 'Similar' : 'Not documented',
        evidence:
          p.reportDocuments.length > 0
            ? `Archived reports: ${p.reportDocuments.map((d) => d.title).join(', ')}`
            : 'Training/runtime datasets and reports were not archived.',
      },
      {
        dimension: 'Documented limitations',
        studentAspect: 'To be addressed by student contribution',
        repositoryAspect:
          p.limitations && p.limitations.length > 0
            ? p.limitations.join('; ')
            : 'Not documented',
        relationship:
          p.limitations && p.limitations.length > 0 ? 'Different' : 'Not documented',
        evidence:
          p.limitations && p.limitations.length > 0
            ? `Archived ${p.limitations.length} documented limitation(s).`
            : 'No limitations were documented in this record (do not conclude it was limitation-free).',
      },
      {
        dimension: 'Future enhancements',
        studentAspect: 'Candidate opportunity area for extension',
        repositoryAspect:
          p.futureEnhancements && p.futureEnhancements.length > 0
            ? p.futureEnhancements.join('; ')
            : 'Not documented',
        relationship:
          p.futureEnhancements && p.futureEnhancements.length > 0 ? 'Similar' : 'Not documented',
        evidence:
          p.futureEnhancements && p.futureEnhancements.length > 0
            ? `Archived future enhancements recorded.`
            : 'Future work section not recorded in repository metadata.',
      },
    ]

    return {
      projectId: p.id,
      title: p.title,
      academicYear: p.academicYear,
      batch: p.batch || 'Not recorded in repository metadata',
      department: p.department,
      sourceUrl: `/explore-projects/${p.id}`,
      sourceType: p.sourceType,
      verificationStatus: p.verificationStatus,
      classification: match.classification,
      academicClassification: match.academicClassification,
      whySelected: match.classificationReason,
      missingDocumentation: match.sourceAttribution.missingDetails,
      dimensions: dims,
    }
  }

  private buildCollectiveSynthesis(matches: ProjectMatchResult[]): CollectiveSynthesis {
    if (matches.length === 0) {
      return {
        commonFunctionality: [],
        repeatedApproaches: [],
        differentImplementationStrategies: [],
        uniqueFeatures: [],
        sharedTechnologies: [],
        documentedLimitationsSummary: [],
      }
    }

    const techFreq = new Map<string, number>()
    const featurePool: string[] = []
    const approaches: string[] = []
    const limitations: string[] = []

    for (const m of matches) {
      const p = m.project
      for (const t of p.technologyStack) {
        techFreq.set(t.name, (techFreq.get(t.name) || 0) + 1)
      }
      featurePool.push(...p.features.map((f) => `${f} (${p.title})`))
      if (p.architecture?.description) {
        approaches.push(`${p.title}: ${p.architecture.description}`)
      }
      if (p.limitations && p.limitations.length > 0) {
        limitations.push(...p.limitations.map((l) => `[${p.title}] ${l}`))
      }
    }

    const sharedTech = Array.from(techFreq.entries())
      .filter(([, count]) => count >= (matches.length > 1 ? 2 : 1))
      .map(([name]) => name)

    const commonFunctionality = matches.flatMap((m) => m.project.features.slice(0, 2)).slice(0, 5)
    const strategies = matches.map((m) =>
      m.project.architecture?.description
        ? `${m.project.title}: ${m.project.architecture.description}`
        : `${m.project.title}: ${m.project.technologyStack.map((t) => t.name).join(' + ')}`
    )

    return {
      commonFunctionality: Array.from(new Set(commonFunctionality)),
      repeatedApproaches: matches.map(
        (m) => `${m.project.title} (${m.project.academicYear}): ${m.analysis.documentedSolution.slice(0, 120)}...`
      ),
      differentImplementationStrategies: strategies,
      uniqueFeatures: featurePool.slice(0, 6),
      sharedTechnologies: sharedTech,
      documentedLimitationsSummary:
        limitations.length > 0
          ? limitations
          : ['No limitations were explicitly documented across retrieved entries.'],
    }
  }

  private buildResearchGaps(
    proposedTitle: string,
    matches: ProjectMatchResult[]
  ): IdentifiedResearchGap[] {
    const gaps: IdentifiedResearchGap[] = []

    // 1. First surface verified documented limitations & documented future enhancements
    for (const m of matches) {
      const p = m.project
      for (const lim of p.limitations || []) {
        gaps.push({
          gapId: `gap-doc-lim-${p.id}-${gaps.length + 1}`,
          category: 'Technical improvements',
          sourceBasis: 'DOCUMENTED_LIMITATION',
          existingApproach: `${p.title} (${p.academicYear}) baseline implementation`,
          limitationEvidence: `Confirmed from archived repository record (/explore-projects/${p.id}): "${lim}"`,
          proposedImprovement: `Design and validate an explicit mitigation for: ${lim}`,
          expectedUserBenefit: 'Eliminates a known failure mode documented by the prior batch.',
          implementationRequirements: ['Controlled failure-case dataset', 'Automated regression test verifying fix'],
          technicalDependencies: p.technologyStack.slice(0, 2).map((t) => t.name),
          estimatedComplexity: 'Medium',
          risksAndLimitations: ['Requires baseline measurement to prove measurable improvement over prior work.'],
        })
      }
      for (const fw of p.futureEnhancements || []) {
        gaps.push({
          gapId: `gap-doc-fw-${p.id}-${gaps.length + 1}`,
          category: 'Functional gaps',
          sourceBasis: 'DOCUMENTED_FUTURE_ENHANCEMENT',
          existingApproach: `${p.title} (${p.academicYear})`,
          limitationEvidence: `Documented future enhancement note in archive (/explore-projects/${p.id}): "${fw}"`,
          proposedImprovement: fw,
          expectedUserBenefit: 'Completes an unresolved workflow highlighted by previous authors.',
          implementationRequirements: ['Core workflow parity first', 'Scoped acceptance test'],
          technicalDependencies: ['Primary project database & RBAC module'],
          estimatedComplexity: 'Medium',
          risksAndLimitations: ['Only pursue if your team timeline supports testing it end-to-end.'],
        })
      }
    }

    // 2. Bounded AI-generated improvement hypotheses across distinct categories (explicitly labeled as hypotheses!)
    const primaryMatch = matches[0]?.project
    const baselineRef = primaryMatch
      ? `${primaryMatch.title} (${primaryMatch.academicYear})`
      : `typical systems in the "${proposedTitle}" space`

    gaps.push(
      {
        gapId: `gap-hyp-privacy-${gaps.length + 1}`,
        category: 'Security and privacy improvements',
        sourceBasis: 'AI_IMPROVEMENT_HYPOTHESIS',
        existingApproach: baselineRef,
        limitationEvidence:
          'AI hypothesis (not verified in prior limitations): prior abstracts do not document data minimization, token rotation, or consent audit guarantees.',
        proposedImprovement:
          'Replace sensitive biometric or plain identifiers with short-lived rotating tokens, consent tracking, and strict server-side RBAC.',
        expectedUserBenefit: 'Reduces privacy liability and makes departmental approval faster.',
        implementationRequirements: ['Short TTL token endpoint', 'Server-side role authorization middleware'],
        technicalDependencies: ['Express / Node.js auth middleware', 'Indexed session records'],
        estimatedComplexity: 'Low',
        risksAndLimitations: ['Device clock skew when validating sub-minute rotating tokens.'],
      },
      {
        gapId: `gap-hyp-perf-${gaps.length + 1}`,
        category: 'Performance improvements',
        sourceBasis: 'AI_IMPROVEMENT_HYPOTHESIS',
        existingApproach: baselineRef,
        limitationEvidence:
          'AI hypothesis: archived abstracts do not report quantitative latency or concurrency benchmarks under peak classroom/campus load.',
        proposedImprovement:
          'Add repeatable API concurrency/latency benchmarks (e.g. handling offline queuing + batch sync cleanly without race conditions).',
        expectedUserBenefit: 'Ensures smooth response under simultaneous student/faculty usage.',
        implementationRequirements: ['Atomic conditional DB updates or local offline queue', 'Measured p95 latency benchmark script'],
        technicalDependencies: ['MongoDB compound indexes'],
        estimatedComplexity: 'Medium',
        risksAndLimitations: ['Benchmark script must simulate realistic network jitter, not empty trivial calls.'],
      },
      {
        gapId: `gap-hyp-usability-${gaps.length + 1}`,
        category: 'Usability improvements',
        sourceBasis: 'AI_IMPROVEMENT_HYPOTHESIS',
        existingApproach: baselineRef,
        limitationEvidence:
          'AI hypothesis: accessibility and low-bandwidth graceful fallbacks are undocumented in existing repository entries.',
        proposedImprovement:
          'Support keyboard-accessible, low-bandwidth workflows with clear manual fallback overrides for staff during network drops.',
        expectedUserBenefit: 'Prevents workflow deadlocks during real classroom or clinic operations.',
        implementationRequirements: ['Responsive accessible UI controls', 'Audit-logged manual override flow'],
        technicalDependencies: ['Frontend validation', 'Backend audit log table'],
        estimatedComplexity: 'Low',
        risksAndLimitations: ['Manual override paths must still enforce faculty/admin role authorization.'],
      }
    )

    return gaps
  }

  private evaluateFeatureDifferentiation(
    proposedFeatures: string[],
    matches: ProjectMatchResult[],
    context: IConversationContext
  ): DifferentiatedFeatureAssessment[] {
    if (proposedFeatures.length === 0) return []

    return proposedFeatures.map((feat) => {
      const lower = feat.toLowerCase()
      const critique = ideaAnalyzer.evaluateFeatureInConversation(feat, context, matches[0] || null)

      const isTechSwapOnly =
        /\b(?:rewrite in|switch to|use vue|use angular|change color|dark mode|ui redesign|tailwind instead)\b/i.test(
          lower
        )
      const featWords = feat
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 4)
      const matchingExistingFeature = matches.some((m) =>
        m.project.features.some(
          (pf) => featWords.filter((w) => pf.toLowerCase().includes(w)).length >= 2
        )
      )
      const hasExplicitDifferentiator = /\b(?:offline|anti-proxy|cryptographic|benchmark|explainab|privacy|conflict)\b/i.test(
        lower
      )
      const isAlreadyPresent =
        !hasExplicitDifferentiator &&
        (Boolean(critique.alreadyCoveredInMatchedProject) || matchingExistingFeature)

      const solvesDifferent = !isAlreadyPresent && !isTechSwapOnly && critique.classification !== 'Unnecessary'
      const meaningfullyImproves =
        !isTechSwapOnly &&
        critique.classification !== 'Unnecessary' &&
        critique.classification !== 'Risky' &&
        (lower.includes('offline') ||
          lower.includes('rotating') ||
          lower.includes('privacy') ||
          lower.includes('benchmark') ||
          lower.includes('conflict') ||
          lower.includes('explainab') ||
          lower.includes('anti-proxy') ||
          solvesDifferent)

      let classification: DifferentiationClassification = 'Supporting feature'
      if (critique.classification === 'Unnecessary' || critique.classification === 'Risky') {
        classification = 'Unnecessary feature'
      } else if (isTechSwapOnly) {
        classification = 'Optional enhancement'
      } else if (meaningfullyImproves && !isAlreadyPresent) {
        classification = 'Meaningful improvement'
      } else if (!isAlreadyPresent && critique.classification === 'Recommended') {
        classification = 'Core contribution'
      } else if (isAlreadyPresent) {
        classification = 'Supporting feature'
      }

      const honestRationale = isTechSwapOnly
        ? 'Swapping frontend libraries or visual themes alone does not solve a new problem or advance system capability.'
        : isAlreadyPresent
        ? `Already covered in prior repository work (${matches[0]?.project.title || 'archived benchmark'}); treat as baseline parity rather than a novel contribution.`
        : critique.classification === 'Unnecessary' || critique.classification === 'Risky'
        ? `${critique.problemRelevance} ${critique.technicalFeasibility}`
        : `${critique.contributionAndOriginality} ${critique.problemRelevance}`

      const academicClassification: AcademicFeatureTier =
        critique.classification === 'Essential'
          ? 'Essential'
          : critique.classification === 'Recommended'
          ? 'Recommended'
          : critique.classification === 'Unnecessary' || critique.classification === 'Risky' || isTechSwapOnly
          ? 'Unnecessary'
          : 'Optional'

      return {
        featureName: feat,
        alreadyPresentInPrevious: isAlreadyPresent,
        solvesDifferentProblem: solvesDifferent,
        meaningfullyImprovesExisting: meaningfullyImproves,
        justTechnologyReplacement: isTechSwapOnly,
        introducesMeasurableValue: !isTechSwapOnly && critique.classification !== 'Unnecessary',
        necessaryForCore: critique.classification === 'Essential' || critique.classification === 'Recommended',
        feasibleWithinResources: critique.classification !== 'Risky',
        classification,
        academicClassification,
        purpose: critique.problemRelevance,
        problemItSolves: critique.problemRelevance,
        expectedBenefit: critique.userBenefit,
        technicalApproach: critique.simplerAlternative
          ? `${critique.technicalFeasibility} Recommended starter approach: ${critique.simplerAlternative}`
          : critique.technicalFeasibility,
        requiredTechOrData: critique.requiredSkillsAndResources,
        complexity: critique.implementationComplexity,
        miniProjectFeasibility: critique.technicalFeasibility,
        dependenciesAndLimitations: `${critique.dependencies.join('; ')} | Risks: ${critique.risks.join('; ')}`,
        honestRationale,
        simplerAlternative: critique.simplerAlternative,
      }
    })
  }

  private assessTechnicalFeasibility(
    input: AnalyzeComparisonInput,
    proposedFeatures: string[],
    matches: ProjectMatchResult[],
    featureAssessments: DifferentiatedFeatureAssessment[]
  ): FeasibilitySummary {
    const constraints = input.constraints || {}
    const missingItems: string[] = []
    if (!constraints.teamSize) missingItems.push('team size')
    if (!constraints.developmentWeeks) missingItems.push('development timeline (weeks)')
    if (!constraints.technicalExperience) missingItems.push('team experience level')

    // Leverage existing evaluationEngine safely using explicit defaults only when flagged as assumed
    const evalFeatures =
      proposedFeatures.length > 0 ? proposedFeatures.slice(0, 6) : ['Core Workflow & Validation']
    const hasRiskyOrUnnecessary = featureAssessments.some(
      (f) => f.classification === 'Unnecessary feature'
    )

    const engineEval = evaluationEngine.evaluateProject({
      projectTitle: input.title,
      problemStatement: input.description,
      proposedFeatures: evalFeatures,
      constraints: {
        teamSize: constraints.teamSize || 3,
        technicalExperience: constraints.technicalExperience || 'intermediate',
        developmentWeeks: constraints.developmentWeeks || 10,
        semesterDeadline: 'Current Semester',
        languagesAndFrameworks: input.technologies || [],
        hardwareResources: constraints.hardware ? [constraints.hardware] : undefined,
        budget: constraints.budget,
      },
      assumptions: missingItems,
      missingFields: missingItems,
    } as any)

    let overallFeasibility: FeasibilitySummary['overallFeasibility'] = 'Realistic Scope'
    if (
      hasRiskyOrUnnecessary ||
      engineEval.overallFeasibility.rating === 'REQUIRES_RESOURCES_OR_TIME' ||
      engineEval.overallFeasibility.rating === 'NOT_FEASIBLE'
    ) {
      overallFeasibility = 'High Risk Within Current Constraints'
    } else if (
      (constraints.developmentWeeks && constraints.developmentWeeks <= 6) ||
      engineEval.overallFeasibility.rating === 'FEASIBLE_REDUCED_SCOPE'
    ) {
      overallFeasibility = 'Needs Scope Narrowing'
    }

    const recommendedCoreScope = featureAssessments
      .filter(
        (f) => f.classification === 'Core contribution' || f.classification === 'Meaningful improvement'
      )
      .map((f) => f.featureName)

    const simplerAlternatives = featureAssessments
      .map((f) => f.simplerAlternative)
      .filter((s): s is string => Boolean(s))

    return {
      constraintsProvided: {
        teamSize: constraints.teamSize,
        developmentWeeks: constraints.developmentWeeks,
        technicalExperience: constraints.technicalExperience,
        hardware: constraints.hardware,
        datasets: constraints.datasets,
        budget: constraints.budget,
      },
      missingConstraintsNotice:
        missingItems.length > 0
          ? `Constraints not yet specified (${missingItems.join(', ')}) — feasibility evaluated conservatively without inventing missing capacity.`
          : undefined,
      overallFeasibility,
      integrationAndMaintenanceNotes: [
        'Keep core data persistence, RBAC, and validation inside one modular monolith before splitting external services.',
        'Include automated integration tests measuring your primary improvement rather than relying solely on manual UI demos.',
      ],
      recommendedCoreScope:
        recommendedCoreScope.length > 0
          ? recommendedCoreScope
          : ['Reliable end-to-end core workflow with automated test coverage'],
      simplerAlternatives,
    }
  }

  private buildMeaningfulDifferences(
    cleanTitle: string,
    proposedFeatures: string[],
    techList: string[],
    conceptualMatches: ProjectMatchResult[],
    techOnlyMatches: ProjectMatchResult[]
  ): string[] {
    if (conceptualMatches.length === 0) {
      const diffs = [
        `Your proposal ("${cleanTitle}") addresses a domain/problem distinct from all approved records retrieved in the college repository.`,
      ]
      if (techOnlyMatches.length > 0) {
        diffs.push(
          `Shared technologies (${techOnlyMatches[0].matchedDimensions.matchingTechnologies.join(', ')}) with "${techOnlyMatches[0].project.title}" represent implementation overlap only — not conceptual duplication.`
        )
      }
      return diffs
    }

    const diffs: string[] = []
    for (const m of conceptualMatches) {
      diffs.push(...m.analysis.differencesWithIdea)
    }
    if (proposedFeatures.length > 0) {
      diffs.push(`Student-specified focus areas: ${proposedFeatures.join(', ')}`)
    }
    if (techList.length > 0) {
      diffs.push(`Student-proposed stack: ${techList.join(', ')}`)
    }
    return Array.from(new Set(diffs))
  }

  private buildSuggestedContribution(
    cleanTitle: string,
    matches: ProjectMatchResult[],
    featureAssessments: DifferentiatedFeatureAssessment[],
    gaps: IdentifiedResearchGap[]
  ): string {
    const meaningful = featureAssessments.find(
      (f) => f.classification === 'Meaningful improvement' || f.classification === 'Core contribution'
    )
    if (meaningful && matches.length > 0) {
      return `Position "${cleanTitle}" as an engineering extension over "${matches[0].project.title}" centered on **${meaningful.featureName}**, paired with measurable before/after evaluation rather than rebuilding duplicate CRUD screens.`
    }
    if (matches.length > 0 && gaps.length > 0) {
      return `Instead of repeating "${matches[0].project.title}", focus your core contribution on solving "${gaps[0].proposedImprovement}" with clear quantitative validation.`
    }
    return `Define 1–2 measurable evaluation metrics for "${cleanTitle}" proving problem impact beyond standard CRUD operations.`
  }

  private buildFocusedComparisonQuestion(
    cleanTitle: string,
    matches: ProjectMatchResult[],
    featureAssessments: DifferentiatedFeatureAssessment[],
    _constraints?: AnalyzeComparisonInput['constraints']
  ): string {
    if (featureAssessments.length > 0) {
      return 'Which of these proposed improvements do you want your team to implement first?'
    }
    if (matches.length > 0) {
      return `Before recommending a final scope for "${cleanTitle}", what specific limitation or new capability do you want your project to solve that ${matches.length > 1 ? 'these earlier projects' : `"${matches[0].project.title}"`} did not address?`
    }
    return 'To lock feasibility against your semester schedule: how many team members and how many weeks do you have available?'
  }

  private buildExistingVsProposedTable(
    input: AnalyzeComparisonInput,
    cleanTitle: string,
    ideaBreakdown: ReturnType<typeof ideaAnalyzer.analyzeIdea>,
    matches: ProjectMatchResult[]
  ): ExistingVsProposedAreaRow[] {
    const primary = matches[0]?.project
    if (!primary) {
      return [
        {
          area: 'Project purpose',
          existingProject: 'Not documented (no matching prior repository project found)',
          proposedProject: ideaBreakdown.proposedSolution,
          documentationStatus: 'Not documented',
        },
        {
          area: 'Problem addressed',
          existingProject: 'Not documented',
          proposedProject: input.description || ideaBreakdown.coreProblem,
          documentationStatus: 'Proposed Addition',
        },
        {
          area: 'Proposed capabilities',
          existingProject: 'Not documented',
          proposedProject:
            (input.features && input.features.length > 0
              ? input.features.join('; ')
              : ideaBreakdown.mainFunctionality.join('; ')),
          documentationStatus: 'Proposed Addition',
        },
        {
          area: 'Technologies',
          existingProject: 'Not documented',
          proposedProject:
            input.technologies && input.technologies.length > 0
              ? input.technologies.join(', ')
              : 'Not specified yet',
          documentationStatus: 'Not documented',
        },
      ]
    }

    const docCorpus = [
      primary.abstract || '',
      primary.proposedSystem || '',
      primary.solution || '',
      primary.objectives.join(' '),
      primary.features.join(' '),
      primary.modules.map((m) => `${m.name}: ${m.description}`).join(' '),
    ].join(' ')

    const findMatchingSentence = (keywords: RegExp): string | null => {
      const items = [
        ...primary.features,
        ...primary.modules.map((m) => `${m.name}: ${m.description}`),
        ...primary.objectives,
      ]
      const found = items.filter((item) => keywords.test(item))
      return found.length > 0 ? found.join('; ') : null
    }

    const existingTeamMgmt = findMatchingSentence(/\b(team|roster|registration|member|role)\b/i)
    const existingTaskAlloc = findMatchingSentence(/\b(assign|allocation|allocat|workload|distribut)\b/i)
    const existingProgress = findMatchingSentence(/\b(progress|milestone|tracking|percentage|checklist|risk|attendance)\b/i)
    const existingAi = findMatchingSentence(/\b(ai|ml|machine learning|neural|predict|recommend|nlp|opencv|facenet|random forest|logistic)\b/i) ||
      (/\b(ai|ml|machine learning|neural|random forest|xgboost|shap)\b/i.test(docCorpus)
        ? primary.methodology || 'ML pipeline documented in abstract'
        : null)

    const proposedTaskFeature =
      (input.features || []).find((f) => /task|allocat|assign|check-in|workflow/i.test(f)) ||
      (input.features || [])[0] ||
      ideaBreakdown.mainFunctionality[0]
    const proposedProgressFeature =
      (input.features || []).find((f) => /progress|predict|tracking|risk|analytics|monitor/i.test(f)) ||
      ideaBreakdown.mainFunctionality[1] ||
      'Structured workflow & status tracking'
    const proposedAiList = (input.features || []).filter((f) =>
      /\b(ai|ml|predict|smart|intelligent|recommend|vision|nlp)\b/i.test(f)
    )

    return [
      {
        area: 'Project purpose',
        existingProject: primary.proposedSolution || primary.solution || primary.proposedSystem || primary.abstract.slice(0, 140),
        proposedProject: `Extend "${cleanTitle}" beyond baseline workflow (${(input.features || []).join(', ') || 'proposed improvements'})`,
        documentationStatus: 'Documented',
      },
      {
        area: 'Problem addressed',
        existingProject: primary.problemStatement,
        proposedProject: input.description || ideaBreakdown.coreProblem,
        documentationStatus: 'Documented',
      },
      {
        area: 'Team / user management',
        existingProject: existingTeamMgmt || 'Not documented in repository record',
        proposedProject: `Team/role workflow supporting ${(input.features || []).slice(0, 2).join(' & ') || 'core users'}`,
        documentationStatus: existingTeamMgmt ? 'Documented' : 'Not documented',
      },
      {
        area: 'Task allocation / primary workflow',
        existingProject: existingTaskAlloc || 'Not documented in repository record (do not assume absent)',
        proposedProject: proposedTaskFeature || 'Core workflow enhancement',
        documentationStatus: existingTaskAlloc ? 'Documented' : 'Not documented',
      },
      {
        area: 'Progress tracking',
        existingProject: existingProgress || 'Not documented in repository record',
        proposedProject: proposedProgressFeature,
        documentationStatus: existingProgress ? 'Documented' : 'Not documented',
      },
      {
        area: 'Technologies',
        existingProject:
          primary.technologyStack.length > 0
            ? primary.technologyStack.map((t) => t.name).join(', ')
            : 'Not documented',
        proposedProject:
          input.technologies && input.technologies.length > 0
            ? input.technologies.join(', ')
            : 'Not specified yet (to be aligned with team skills)',
        documentationStatus: primary.technologyStack.length > 0 ? 'Documented' : 'Not documented',
      },
      {
        area: 'AI capabilities',
        existingProject: existingAi || 'Not documented in repository abstract/modules',
        proposedProject:
          proposedAiList.length > 0
            ? proposedAiList.join('; ')
            : 'Deterministic non-AI improvements (unless explicitly requested)',
        documentationStatus: existingAi ? 'Documented' : 'Not documented',
      },
    ]
  }

  private buildActualDifferenceBreakdown(
    proposedFeatures: string[],
    featureAssessments: DifferentiatedFeatureAssessment[],
    matches: ProjectMatchResult[],
    tableRows: ExistingVsProposedAreaRow[]
  ): ActualDifferenceBreakdown {
    const primary = matches[0]?.project
    const whatOriginalTeamDeveloped = primary
      ? `[${primary.title}](/explore-projects/${primary.id}) (${primary.academicYear}, ${primary.department}): ${primary.features.slice(0, 4).join('; ') || primary.abstract.slice(0, 140)}`
      : 'No matching historical project was found in accessible college records to establish a prior baseline.'

    const alreadyPresent: string[] = []
    const genuinelyAdditional: string[] = []
    const modificationsOfExisting: string[] = []
    const needsClarificationOrUndocumented: string[] = []

    for (const fa of featureAssessments) {
      const lower = fa.featureName.toLowerCase()
      const matchesDocModification =
        primary &&
        ((lower.includes('progress') && primary.features.some((pf) => /progress|milestone/i.test(pf))) ||
          ((lower.includes('allocat') || lower.includes('assign')) && primary.features.some((pf) => /allocat|assign/i.test(pf))) ||
          (lower.includes('attendance') && primary.features.some((pf) => /attendance/i.test(pf))))

      if (fa.alreadyPresentInPrevious) {
        alreadyPresent.push(fa.featureName)
      } else if (matchesDocModification) {
        modificationsOfExisting.push(
          `${fa.featureName} (upgrades documented baseline capability rather than starting from zero)`
        )
      } else {
        genuinelyAdditional.push(fa.featureName)
      }
    }

    for (const row of tableRows) {
      if (row.documentationStatus === 'Not documented') {
        needsClarificationOrUndocumented.push(
          `${row.area}: Existing documentation does not specify this detail (marked "Not documented").`
        )
      }
    }
    if (proposedFeatures.length === 0) {
      needsClarificationOrUndocumented.push(
        'Specific new capabilities to add have not yet been itemized by the student.'
      )
    }

    return {
      whatOriginalTeamDeveloped,
      whatStudentWantsToAdd: proposedFeatures,
      alreadyPresent,
      genuinelyAdditional,
      modificationsOfExisting,
      needsClarificationOrUndocumented,
    }
  }

  private buildContributionClassification(
    cleanTitle: string,
    featureAssessments: DifferentiatedFeatureAssessment[],
    diff: ActualDifferenceBreakdown,
    matches: ProjectMatchResult[]
  ): { contributionType: ContributionCategoryType; reasoning: string } {
    const hasOnlySwaps =
      featureAssessments.length > 0 && featureAssessments.every((f) => f.justTechnologyReplacement)
    if (hasOnlySwaps) {
      return {
        contributionType: 'A minor UI change with limited academic contribution',
        reasoning:
          'Replacing libraries, color schemes, or visual frameworks without solving a new engineering problem offers weak academic differentiation.',
      }
    }

    if (matches.length === 0) {
      return {
        contributionType: 'A new application of existing technology',
        reasoning: `No conceptually overlapping record was found for "${cleanTitle}" in the accessible college archive; building a verified core workflow with measurable evaluation metrics forms a solid capstone contribution (note: college archive coverage does not prove global novelty).`,
      }
    }

    if (diff.genuinelyAdditional.length > 0 && diff.modificationsOfExisting.length === 0) {
      return {
        contributionType: 'A new module',
        reasoning: `Adds capability (${diff.genuinelyAdditional.join(', ')}) not documented in "${matches[0].project.title}", representing a distinct new functional module atop the baseline domain.`,
      }
    }

    if (diff.modificationsOfExisting.length > 0) {
      return {
        contributionType: 'An enhancement to an existing module',
        reasoning: `Upgrades documented workflows from "${matches[0].project.title}" (${diff.modificationsOfExisting.join('; ')}) while keeping baseline repository/project management workflows intact.`,
      }
    }

    return {
      contributionType: 'A technical improvement',
      reasoning: `Focuses on engineering reliability, performance, or security improvements relative to "${matches[0].project.title}".`,
    }
  }

  private buildScopeRecommendation(
    proposedFeatures: string[],
    featureAssessments: DifferentiatedFeatureAssessment[],
    matches: ProjectMatchResult[]
  ): { mustHave: string[]; optional: string[]; postpone: string[]; confirmationPrompt: string } {
    const mustHave: string[] = [
      matches.length > 0
        ? `Reliable baseline core workflow parity with ${matches[0].project.title} (auth, role access, and primary CRUD records)`
        : 'End-to-end authenticated core workflow with schema validation & database persistence',
    ]
    const optional: string[] = []
    const postpone: string[] = []

    for (const fa of featureAssessments) {
      if (fa.academicClassification === 'Essential' || fa.academicClassification === 'Recommended') {
        mustHave.push(`${fa.featureName} (${fa.simplerAlternative ? 'start with lightweight heuristic/MVP first' : 'core prioritized improvement'})`)
      } else if (fa.academicClassification === 'Optional') {
        optional.push(fa.featureName)
      } else {
        postpone.push(`${fa.featureName} (${fa.honestRationale})`)
      }
    }

    if (proposedFeatures.length === 0) {
      optional.push('1–2 focused measurable enhancements agreed with your faculty guide')
    }

    return {
      mustHave,
      optional,
      postpone,
      confirmationPrompt:
        'Please confirm which improvements you want included before we lock this into your formal project scope or proposal.',
    }
  }

  /**
   * Phase 7 natural conversational overview for multi-project comparison inside AI Mentor chat
   */
  buildInteractiveComparisonIntro(
    report: StructuredComparisonReport,
    includeFullTable = true
  ): string {
    if (includeFullTable) {
      return report.renderedMarkdown
    }

    const matches = report.B_relevantPreviousProjects
    if (matches.length === 0) {
      return `${report.noveltyDisclaimer}\n\nNo conceptually matching records were found in the verified repository for **${report.A_proposedProject.title}**.\n\n**Next Focus**: ${report.K_nextQuestionForStudent}`
    }

    const lines = matches.map(
      (m, idx) =>
        `${idx + 1}. **[${m.title}](${m.sourceUrl})** (${m.academicYear}, ${m.department}) — *${m.classification}*`
    )
    return `I found **${matches.length}** relevant approved record(s) in the CampusProjectHub repository:

${lines.join('\n')}

- **Common Pattern**: ${report.D_commonFunctionality.slice(0, 2).join('; ')}
- **Key Opportunity**: ${report.J_suggestedProjectContribution}

${report.K_nextQuestionForStudent}`
  }

  /**
   * Phase 8 readable Markdown output (Sections A through K)
   */
  renderComparisonMarkdown(
    report: Omit<StructuredComparisonReport, 'renderedMarkdown'>,
    techOnlyMatches: ProjectMatchResult[] = []
  ): string {
    const sectionB =
      report.B_relevantPreviousProjects.length > 0
        ? report.B_relevantPreviousProjects
            .map(
              (b, i) =>
                `${i + 1}. **[${b.title}](${b.sourceUrl})** (\`${b.sourceUrl}\`) — ${b.academicYear} | Batch: ${b.batch} | ${b.department} — **${b.classification}**${
                  b.missingDocumentation.length > 0
                    ? ` *(Missing in archive: ${b.missingDocumentation.join(', ')})*`
                    : ''
                }`
            )
            .join('\n')
        : '*No matching approved college projects found in accessible repository records.*'

    const techStackNote =
      techOnlyMatches.length > 0
        ? `\n*Note (Shared Technologies Only — Not Conceptual Duplicates)*: ${techOnlyMatches
            .map((t) => `**${t.project.title}** shares [${t.matchedDimensions.matchingTechnologies.join(', ')}]`)
            .join('; ')}.`
        : ''

    const sectionC =
      report.C_projectByProjectComparisons.length > 0
        ? report.C_projectByProjectComparisons
            .map((comp) => {
              const rows = comp.dimensions
                .map(
                  (d) =>
                    `| ${d.dimension} | ${d.studentAspect.replace(/\|/g, '/').slice(0, 75)} | ${d.repositoryAspect.replace(/\|/g, '/').slice(0, 75)} | **${d.relationship}** | ${d.evidence.replace(/\|/g, '/').slice(0, 85)} |`
                )
                .join('\n')
              return `#### [${comp.title}](${comp.sourceUrl}) (${comp.academicYear})
> Selection Rationale: ${comp.whySelected}

| Dimension | Proposed Project | Previous Project | Relation | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- |
${rows}`
            })
            .join('\n\n')
        : '*No close prior-art matrix required because no conceptually overlapping repository records were matched.*'

    const sectionF =
      report.F_documentedLimitations.length > 0
        ? report.F_documentedLimitations
            .map(
              (f) =>
                `- **[${f.projectTitle}](/explore-projects/${f.projectId}) (${f.academicYear})**: ${f.limitations.join('; ')} *(${f.documentationNote})*`
            )
            .join('\n')
        : '- No prior overlapping records available for limitation extraction.'

    const docGaps = report.G_potentialResearchGaps.filter(
      (g) => g.sourceBasis !== 'AI_IMPROVEMENT_HYPOTHESIS'
    )
    const hypGaps = report.G_potentialResearchGaps.filter(
      (g) => g.sourceBasis === 'AI_IMPROVEMENT_HYPOTHESIS'
    )

    const formatGap = (g: IdentifiedResearchGap) =>
      `- **${g.category} (${g.estimatedComplexity} Effort)**: ${g.proposedImprovement}\n  - *Evidence*: ${g.limitationEvidence}\n  - *Benefit*: ${g.expectedUserBenefit} | *Dependencies*: ${g.technicalDependencies.join(', ')} | *Risk*: ${g.risksAndLimitations[0]}`

    const sectionI =
      report.I_featureFeasibilityAssessment.featureAssessments.length > 0
        ? report.I_featureFeasibilityAssessment.featureAssessments
            .map(
              (f) =>
                `#### ${f.featureName} — Classification: **${f.academicClassification}** (*${f.classification}*)\n` +
                `- **1. Purpose & Problem Solved**: ${f.problemItSolves}\n` +
                `- **2. Expected Benefit**: ${f.expectedBenefit}\n` +
                `- **3. Technical Approach**: ${f.technicalApproach}\n` +
                `- **4. Required Technologies / Data**: ${f.requiredTechOrData.join(', ')}\n` +
                `- **5. Complexity**: ${f.complexity} | **6. Mini-Project Feasibility**: ${f.miniProjectFeasibility}\n` +
                `- **7. Dependencies & Limitations**: ${f.dependenciesAndLimitations}` +
                (f.simplerAlternative ? `\n- **Practical Starter Alternative**: ${f.simplerAlternative}` : '')
            )
            .join('\n\n')
        : `- Overall Scope Assessment: **${report.I_featureFeasibilityAssessment.feasibility.overallFeasibility}**${
            report.I_featureFeasibilityAssessment.feasibility.missingConstraintsNotice
              ? ` (${report.I_featureFeasibilityAssessment.feasibility.missingConstraintsNotice})`
              : ''
          }`

    const existingVsProposedRows = report.existingVsProposedTable
      .map(
        (r) =>
          `| ${r.area} | ${r.existingProject.replace(/\|/g, '/').slice(0, 95)} | ${r.proposedProject.replace(/\|/g, '/').slice(0, 95)} |`
      )
      .join('\n')

    const diff = report.actualDifferenceBreakdown
    const scopeRec = report.scopeRecommendation

    return `### Structured Project Comparison & Research Gap Analysis

**A. Proposed Project:** **${report.A_proposedProject.title}**
- Core Problem: ${report.A_proposedProject.problemSummary}

**B. Most Relevant Previous College Projects:**
${sectionB}${techStackNote}

#### Existing Project vs. Student's Proposed Project
| Area | Existing Project | Student's Proposed Project |
| :--- | :--- | :--- |
${existingVsProposedRows}

#### Plain-Language Actual Difference Breakdown
- **What the Original Team Developed**: ${diff.whatOriginalTeamDeveloped}
- **What You Want to Add**: ${diff.whatStudentWantsToAdd.length > 0 ? diff.whatStudentWantsToAdd.join('; ') : 'Not itemized yet'}
- **Already Present in Prior Work**: ${diff.alreadyPresent.length > 0 ? diff.alreadyPresent.join('; ') : 'None confirmed in documented features'}
- **Genuinely Additional Features**: ${diff.genuinelyAdditional.length > 0 ? diff.genuinelyAdditional.join('; ') : 'None separated yet'}
- **Modifications of Existing Functionality**: ${diff.modificationsOfExisting.length > 0 ? diff.modificationsOfExisting.join('; ') : 'None'}
- **Needs Clarification / Undocumented Baseline**: ${diff.needsClarificationOrUndocumented.length > 0 ? diff.needsClarificationOrUndocumented.join(' | ') : 'Core comparison fields documented'}

**C. Project-by-Project Comparison (12 Dimensions):**
${sectionC}

**D. Common Functionality Across Prior Work:**
${report.D_commonFunctionality.map((d) => `- ${d}`).join('\n')}

**E. Meaningful Differences:**
${report.E_meaningfulDifferences.map((d) => `- ${d}`).join('\n')}

**F. Documented Limitations (From Verified Records):**
${sectionF}

**G. Research Gaps (Verified Records vs. AI Hypotheses):**
${docGaps.length > 0 ? `**From Repository Documentation:**\n${docGaps.map(formatGap).join('\n')}\n` : '**From Repository Documentation:**\n- No explicit technical limitations/future enhancements archived in retrieved records.\n'}
**AI-Generated Improvement Hypotheses (To Validate With Faculty):**
${hypGaps.map(formatGap).join('\n')}

**H. Recommended Improvements:**
${report.H_recommendedImprovements.map((h) => `- ${h}`).join('\n')}

**I. Detailed Evaluation of Proposed Improvements & Technical Feasibility:**
${sectionI}

#### Meaningful Contribution Assessment
- **Contribution Category**: **${report.contributionAssessment.contributionType}**
- **Reasoning**: ${report.contributionAssessment.reasoning}

#### Recommended Realistic Scope (Confirmation Required Before Locking)
- **Must-Have Features**: ${scopeRec.mustHave.join('; ')}
- **Optional Features**: ${scopeRec.optional.length > 0 ? scopeRec.optional.join('; ') : 'None currently needed'}
- **Features to Postpone**: ${scopeRec.postpone.length > 0 ? scopeRec.postpone.join('; ') : 'None flagged for deferral'}
- *Note*: ${scopeRec.confirmationPrompt}

**J. Suggested Project Contribution:**
${report.J_suggestedProjectContribution}

> ${report.noveltyDisclaimer}

**K. Next Question for You:**
${report.K_nextQuestionForStudent}`
  }
}

export const researchGapService = new ResearchGapIntelligenceService()
