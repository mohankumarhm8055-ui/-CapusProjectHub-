import {
  QUALITY_DIMENSIONS,
  EvalCaseDefinition,
  EvalCaseReport,
  EvalTurnReport,
  EvalRunReport,
  DeterministicRuleResult,
  DimensionSummary,
  EvalPerformanceMetrics,
  RegressionComparisonReport,
  RegressionDiffItem,
  RetrievedRecordSnapshot,
  AdvisoryJudgeResult,
} from './quality.types.js'
import {
  EVALUATION_DATASET_VERSION,
  QUALITY_EVALUATION_DATASET,
} from './quality.dataset.js'
import { EvalRunRepository } from './quality.model.js'
import { conversationalEngine } from '../conversational-engine/conversational.engine.js'
import { conversationService } from '../conversation.service.js'
import { repositorySearchService } from '../../repository/repository.search.service.js'
import { seedRepository } from '../../repository/repository.seeder.js'
import { getAIProvider } from '../ai.provider.js'

const EMAIL_REDACTION_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REDACTION_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/g

export function redactSensitiveText(text: string): string {
  if (!text) return ''
  return text
    .replace(EMAIL_REDACTION_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REDACTION_REGEX, (match) => {
      // Preserve academic years like 2023-2024 or dates like 2025-11-20; mask phone-like sequences >= 8 digits
      const digits = match.replace(/\D/g, '')
      return digits.length >= 10 ? '[REDACTED_PHONE]' : match
    })
}

export interface RunEvaluationOptions {
  label?: string
  promptConfigTag?: string
  categories?: string[]
  includeAdvisoryJudge?: boolean
  persist?: boolean
  dataset?: EvalCaseDefinition[]
}

export class AIResponseQualityEvaluator {
  /**
   * Evaluates the full dataset (or filtered categories) deterministically across all 10 quality dimensions.
   * Ensures repository retrieval is measured accurately, avoids duplicate LLM/search calls, and redacts any PII.
   */
  async evaluateDataset(options: RunEvaluationOptions = {}): Promise<EvalRunReport> {
    await seedRepository()

    const datasetSource = options.dataset || QUALITY_EVALUATION_DATASET
    const selectedCases =
      options.categories && options.categories.length > 0
        ? datasetSource.filter((c) => options.categories!.includes(c.category))
        : datasetSource

    const provider = getAIProvider()
    const evalOwnerId = `eval-harness-${Date.now()}`
    const caseReports: EvalCaseReport[] = []

    const responseLatencies: number[] = []
    const retrievalLatencies: number[] = []
    let totalRetrievedRecords = 0
    let failedRetrievalCount = 0
    let providerErrorCount = 0
    let totalTokensUsed = 0
    let duplicateSearchesAvoided = 0

    for (const testCase of selectedCases) {
      const conv = await conversationService.createConversation(
        evalOwnerId,
        `[EVAL] ${testCase.caseId}`
      )
      const turnReports: EvalTurnReport[] = []

      for (const turn of testCase.turns) {
        await conversationService.addMessage(conv.id, evalOwnerId, 'user', turn.userPrompt)
        const history = await conversationService.getConversationMessages(conv.id, evalOwnerId)

        const originalCompare = repositorySearchService.compareStudentIdea.bind(repositorySearchService)
        if (turn.simulateRetrievalFailure) {
          repositorySearchService.compareStudentIdea = async () => {
            throw new Error('Simulated repository database outage for Phase 3 check')
          }
        }

        const turnStart = Date.now()
        let turnResult: any
        let providerError: string | undefined
        let generatedResponse = ''
        let tokensUsed: number | undefined

        try {
          turnResult = await conversationalEngine.processTurn(
            conv.id,
            evalOwnerId,
            turn.userPrompt,
            history
          )

          // Reuse retrievedMatches from conversationalEngine without invoking a duplicate repository search!
          if (turnResult.retrievalTelemetry?.executed) {
            duplicateSearchesAvoided += 1
          }

          if (provider.name === 'mock') {
            generatedResponse = turnResult.responseMarkdown
          } else {
            // Optional live provider call only if non-mock LLM is active in this environment
            const aiRes = await provider.generateResponse({
              messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
              systemPrompt: `[MENTOR_ANALYSIS_AND_DRAFT_EVIDENCE]\n${turnResult.responseMarkdown}`,
              temperature: 0.35,
              maxTokens: 2048,
            })
            generatedResponse = aiRes.content
            tokensUsed = aiRes.tokensUsed
            if (tokensUsed) totalTokensUsed += tokensUsed
          }
        } catch (err: any) {
          providerError = err?.message || 'Unexpected mentor execution failure'
          providerErrorCount += 1
        } finally {
          if (turn.simulateRetrievalFailure) {
            repositorySearchService.compareStudentIdea = originalCompare
          }
        }

        const responseLatencyMs = Date.now() - turnStart
        responseLatencies.push(responseLatencyMs)

        await conversationService.addMessage(
          conv.id,
          evalOwnerId,
          'assistant',
          generatedResponse || providerError || 'Evaluation error',
          providerError ? 'failed' : 'completed'
        )

        const retrievalTelemetry = turnResult?.retrievalTelemetry || {
          executed: false,
          latencyMs: 0,
          retrievedCount: 0,
          retrievedProjectIds: [],
          retrievedProjectTitles: [],
          failed: false,
        }

        if (retrievalTelemetry.executed) {
          retrievalLatencies.push(retrievalTelemetry.latencyMs)
          totalRetrievedRecords += retrievalTelemetry.retrievedCount
        }
        if (retrievalTelemetry.failed) {
          failedRetrievalCount += 1
        }

        const retrievedSnapshots: RetrievedRecordSnapshot[] = (turnResult?.retrievedMatches || []).map(
          (m: any) => ({
            projectId: m.project.id,
            title: m.project.title,
            academicYear: m.project.academicYear,
            batch: m.project.batch,
            classification: m.academicClassification || m.classification,
          })
        )

        const ruleResults = this.evaluateTurnDeterministically(
          turn.userPrompt,
          generatedResponse,
          turnResult?.intent || 'GENERAL_MENTORING',
          retrievedSnapshots,
          retrievalTelemetry,
          turn.expectation,
          providerError
        )

        let advisoryJudge: AdvisoryJudgeResult | undefined
        if (options.includeAdvisoryJudge && provider.name !== 'mock') {
          advisoryJudge = await this.runAdvisoryJudge(
            provider,
            turn.userPrompt,
            generatedResponse,
            turn.expectation.expectedBehaviorSummary
          )
        }

        const failedCriteria = ruleResults.filter((r) => !r.passed)
        const passed = failedCriteria.length === 0

        turnReports.push({
          turnNumber: turn.turnNumber,
          userQuestion: redactSensitiveText(turn.userPrompt),
          detectedIntent: turnResult?.intent || 'GENERAL_MENTORING',
          retrievedProjectRecords: retrievedSnapshots,
          generatedResponse: redactSensitiveText(generatedResponse),
          expectedBehavior: turn.expectation.expectedBehaviorSummary,
          actualBehavior: passed
            ? `Satisfied all ${ruleResults.length} deterministic checks (intent=${turnResult?.intent}, retrieved=${retrievedSnapshots.length}).`
            : `Failed ${failedCriteria.length}/${ruleResults.length} check(s): ${failedCriteria.map((f) => f.ruleId).join(', ')}.`,
          passed,
          failedCriteria,
          ruleResults,
          explanationOfFailures: failedCriteria
            .map((f) => f.failureReason || f.description)
            .filter(Boolean),
          suggestedImprovements: failedCriteria
            .map((f) => f.suggestedImprovement)
            .filter((s): s is string => Boolean(s)),
          metrics: {
            responseLatencyMs,
            retrievalLatencyMs: retrievalTelemetry.latencyMs,
            retrievedRecordsCount: retrievalTelemetry.retrievedCount,
            retrievalFailed: retrievalTelemetry.failed,
            tokensUsed,
            providerError,
          },
          advisoryJudge,
        })
      }

      // Clean up temporary evaluation conversation so test workspace does not accumulate noise
      await conversationService.deleteConversation(conv.id, evalOwnerId).catch(() => {})

      caseReports.push({
        caseId: testCase.caseId,
        title: testCase.title,
        category: testCase.category,
        recordBasis: testCase.recordBasis,
        passed: turnReports.every((t) => t.passed),
        turns: turnReports,
      })
    }

    const allTurns = caseReports.flatMap((c) => c.turns)
    const allRules = allTurns.flatMap((t) => t.ruleResults)
    const rulesPassed = allRules.filter((r) => r.passed).length
    const rulesFailed = allRules.length - rulesPassed

    const dimensionSummaries: DimensionSummary[] = QUALITY_DIMENSIONS.map((dim) => {
      const dimRules = allRules.filter((r) => r.dimension === dim.id)
      const passedCount = dimRules.filter((r) => r.passed).length
      const failedCount = dimRules.length - passedCount
      return {
        dimension: dim.id,
        label: dim.label,
        checksTotal: dimRules.length,
        checksPassed: passedCount,
        checksFailed: failedCount,
        passRatePercent: dimRules.length > 0 ? Math.round((passedCount / dimRules.length) * 100) : 100,
      }
    })

    const majorFailures = caseReports.flatMap((c) =>
      c.turns.flatMap((t) =>
        t.failedCriteria.map((f) => ({
          caseId: c.caseId,
          turnNumber: t.turnNumber,
          dimension: f.dimension,
          ruleId: f.ruleId,
          explanation: f.failureReason || f.evidence,
          suggestedImprovement: f.suggestedImprovement || 'Review prompt/retrieval grounding for this dimension.',
        }))
      )
    )

    const performance: EvalPerformanceMetrics = {
      totalTurnsEvaluated: allTurns.length,
      avgResponseLatencyMs:
        responseLatencies.length > 0
          ? Math.round((responseLatencies.reduce((a, b) => a + b, 0) / responseLatencies.length) * 100) / 100
          : 0,
      maxResponseLatencyMs: responseLatencies.length > 0 ? Math.max(...responseLatencies) : 0,
      avgRetrievalLatencyMs:
        retrievalLatencies.length > 0
          ? Math.round((retrievalLatencies.reduce((a, b) => a + b, 0) / retrievalLatencies.length) * 100) / 100
          : 0,
      totalRetrievedRecords,
      failedRetrievalCount,
      providerErrorCount,
      totalTokensUsed,
      duplicateSearchesAvoided,
    }

    const reportBody: Omit<EvalRunReport, 'id' | 'createdAt'> = {
      datasetVersion: EVALUATION_DATASET_VERSION,
      label: options.label,
      promptConfigTag: options.promptConfigTag || 'task19-v1',
      providerName: provider.name,
      privacyRedacted: true,
      overallPassed: rulesFailed === 0 && providerErrorCount === 0,
      casesTotal: caseReports.length,
      casesPassed: caseReports.filter((c) => c.passed).length,
      casesFailed: caseReports.filter((c) => !c.passed).length,
      turnsTotal: allTurns.length,
      turnsPassed: allTurns.filter((t) => t.passed).length,
      turnsFailed: allTurns.filter((t) => !t.passed).length,
      rulesTotal: allRules.length,
      rulesPassed,
      rulesFailed,
      dimensionSummaries,
      performance,
      majorFailures,
      cases: caseReports,
    }

    if (options.persist === false) {
      return {
        ...reportBody,
        id: `ephemeral-${Date.now()}`,
        createdAt: new Date(),
      }
    }

    return EvalRunRepository.create(reportBody)
  }

  /**
   * Deterministic factual, retrieval, continuity, privacy, and structural evaluation rules.
   */
  evaluateTurnDeterministically(
    userPrompt: string,
    response: string,
    detectedIntent: string,
    retrievedRecords: RetrievedRecordSnapshot[],
    retrievalTelemetry: { executed: boolean; failed: boolean },
    expectation: EvalCaseDefinition['turns'][number]['expectation'],
    providerError?: string
  ): DeterministicRuleResult[] {
    const results: DeterministicRuleResult[] = []

    // Dimension 1: Intent Understanding
    if (expectation.expectedIntents && expectation.expectedIntents.length > 0) {
      const ok = !providerError && expectation.expectedIntents.includes(detectedIntent as any)
      results.push({
        ruleId: 'INTENT_MATCH',
        dimension: 'intentUnderstanding',
        description: `Classify turn intent as one of [${expectation.expectedIntents.join(', ')}]`,
        passed: ok,
        evidence: providerError ? `Provider error: ${providerError}` : `Detected intent: ${detectedIntent}`,
        failureReason: ok
          ? undefined
          : `Expected intent in [${expectation.expectedIntents.join(', ')}], got "${detectedIntent}".`,
        suggestedImprovement: ok
          ? undefined
          : 'Refine IntentClassifier keyword/context guards for this phrasing pattern.',
      })
    }

    // Dimension 2: Repository Investigation
    if (expectation.mustSearchRepository) {
      const ok = retrievalTelemetry.executed
      results.push({
        ruleId: 'REPOSITORY_SEARCH_EXECUTED',
        dimension: 'repositoryInvestigation',
        description: 'Execute accessible college repository search before answering',
        passed: ok,
        evidence: ok
          ? `Repository searched (retrieved ${retrievedRecords.length} match(es))`
          : 'Repository search did not execute',
        failureReason: ok ? undefined : 'Response was generated without running repository search.',
        suggestedImprovement: ok
          ? undefined
          : 'Route project-discovery turns to repositorySearchService.compareStudentIdea before generation.',
      })
    }

    if (expectation.expectedRetrievedTitles && expectation.expectedRetrievedTitles.length > 0) {
      const foundTitles = retrievedRecords.map((r) => r.title)
      const missing = expectation.expectedRetrievedTitles.filter(
        (t) => !foundTitles.some((f) => f.toLowerCase().includes(t.toLowerCase()))
      )
      const ok = missing.length === 0
      results.push({
        ruleId: 'EXPECTED_RECORD_RETRIEVED',
        dimension: 'repositoryInvestigation',
        description: `Retrieve matching record(s): ${expectation.expectedRetrievedTitles.join(', ')}`,
        passed: ok,
        evidence: `Retrieved titles: [${foundTitles.join('; ')}]`,
        failureReason: ok ? undefined : `Missing expected record(s): ${missing.join(', ')}`,
        suggestedImprovement: ok
          ? undefined
          : 'Expand domain synonyms or token normalization in compareStudentIdea.',
      })
    }

    // Dimension 3: Evidence Accuracy & Retrieval Failure Honesty
    if (expectation.mustDiscloseRetrievalFailure) {
      const disclosed =
        /cannot confirm whether matching|repository search could not be completed|retrieval unavailable/i.test(
          response
        )
      const liedZeroMatch = response.includes('No sufficiently similar project found')
      const ok = disclosed && !liedZeroMatch
      results.push({
        ruleId: 'RETRIEVAL_OUTAGE_HONESTY',
        dimension: 'evidenceAccuracy',
        description: 'Disclose retrieval outage honestly without claiming zero repository matches',
        passed: ok,
        evidence: ok
          ? 'Disclosed retrieval outage cleanly.'
          : `disclosed=${disclosed}, falseZeroMatchClaim=${liedZeroMatch}`,
        failureReason: ok
          ? undefined
          : 'Failed to disclose repository search failure or falsely claimed no similar projects exist.',
        suggestedImprovement: ok
          ? undefined
          : 'Check retrievalFailed flag explicitly and warn the student before giving novelty advice.',
      })
    }

    if (expectation.forbidInventedPercentages) {
      const hasFakePct =
        /\b\d+\s*%\s*(?:original|similarity|confidence|match|overlap|unique)\b/i.test(response) ||
        /(?:confidence|similarity|originality)\s*[:-]?\s*\d+\s*%/i.test(response)
      const ok = !hasFakePct
      results.push({
        ruleId: 'NO_INVENTED_PERCENTAGES',
        dimension: 'evidenceAccuracy',
        description: 'Never fabricate arbitrary similarity or originality percentages',
        passed: ok,
        evidence: ok ? 'Zero invented percentage metrics found.' : 'Detected prohibited percentage claim.',
        failureReason: ok ? undefined : 'Mentor emitted an arbitrary originality/confidence percentage.',
        suggestedImprovement: ok
          ? undefined
          : 'Remove numeric percentage scoring from repository context and mentor output.',
      })
    }

    if (expectation.mustProtectRestrictedData) {
      const hasLeakedEmail = EMAIL_REDACTION_REGEX.test(response)
      EMAIL_REDACTION_REGEX.lastIndex = 0
      const ok = !hasLeakedEmail
      results.push({
        ruleId: 'PRIVACY_ACCESS_CONTROL',
        dimension: 'evidenceAccuracy',
        description: 'Block private student contacts, unapproved drafts, and confidential review notes',
        passed: ok,
        evidence: ok ? 'Restricted data boundary upheld.' : 'Detected email-like PII in response.',
        failureReason: ok ? undefined : 'Private student contact leaked in response.',
        suggestedImprovement: ok
          ? undefined
          : 'Enforce APPROVED public serializer projection and restrict private fields.',
      })
    }

    if (expectation.expectedIncludes && expectation.expectedIncludes.length > 0) {
      const missing = expectation.expectedIncludes.filter((needle) => !response.includes(needle))
      const ok = missing.length === 0
      results.push({
        ruleId: 'GROUNDED_FACTS_PRESENT',
        dimension: 'similarityReasoning',
        description: `Include required grounded elements (${expectation.expectedIncludes.length} checks)`,
        passed: ok,
        evidence: ok ? 'All required grounded elements present.' : `Missing: ${missing.join(' | ')}`,
        failureReason: ok ? undefined : `Response omitted required grounded detail(s): ${missing.join(', ')}`,
        suggestedImprovement: ok
          ? undefined
          : 'Ensure handler surfaces full dossier metadata, differences, and explicit unknown markers.',
      })
    }

    if (expectation.expectedIncludesAny && expectation.expectedIncludesAny.length > 0) {
      const failedGroups = expectation.expectedIncludesAny.filter(
        (group) => !group.some((opt) => response.includes(opt))
      )
      const ok = failedGroups.length === 0
      results.push({
        ruleId: 'HONEST_CLASSIFICATION_PRESENT',
        dimension: 'honestEvaluation',
        description: 'Produce expected academic critique / honesty classification',
        passed: ok,
        evidence: ok
          ? 'Expected honest evaluation marker present.'
          : `Unmatched option group: ${failedGroups.map((g) => g.join('/')).join('; ')}`,
        failureReason: ok ? undefined : 'Missing explicit critical classification (e.g. Risky/Unnecessary).',
        suggestedImprovement: ok
          ? undefined
          : 'Tighten IdeaAnalyzer classification rules for impractical/unnecessary additions.',
      })
    }

    if (expectation.forbiddenIncludes && expectation.forbiddenIncludes.length > 0) {
      const leaked = expectation.forbiddenIncludes.filter((f) => response.includes(f))
      const ok = leaked.length === 0
      results.push({
        ruleId: 'FORBIDDEN_CONTENT_ABSENT',
        dimension: 'technicalCorrectness',
        description: 'Avoid stale context leakage, false claims, or restricted snippets',
        passed: ok,
        evidence: ok ? 'Zero forbidden strings present.' : `Found forbidden string(s): ${leaked.join(', ')}`,
        failureReason: ok ? undefined : `Contaminated or fabricated text detected: ${leaked.join(', ')}`,
        suggestedImprovement: ok
          ? undefined
          : 'Clear stale context on pivot or tighten output filtering.',
      })
    }

    // Dimension 7: Conversation Continuity (avoid repeating answered questions)
    if (expectation.forbidRepeatedQuestionPatterns && expectation.forbidRepeatedQuestionPatterns.length > 0) {
      const lowerResp = response.toLowerCase()
      const repeated = expectation.forbidRepeatedQuestionPatterns.filter((pat) => lowerResp.includes(pat))
      const ok = repeated.length === 0
      results.push({
        ruleId: 'NO_REPEATED_QUESTIONS',
        dimension: 'conversationContinuity',
        description: 'Do not re-ask questions the student already answered',
        passed: ok,
        evidence: ok ? 'Tracked answered constraints without repeating.' : `Repeated: ${repeated.join(', ')}`,
        failureReason: ok ? undefined : `Repeated already-answered question(s): ${repeated.join(', ')}`,
        suggestedImprovement: ok
          ? undefined
          : 'Record answered keys in explicitlyProvidedConstraints and skip them in pickNextUnaskedQuestion.',
      })
    }

    // Dimension 8: Question Quality
    if (expectation.maxQuestionMarks !== undefined) {
      const qCount = (response.match(/\?/g) || []).length
      const ok = qCount <= expectation.maxQuestionMarks
      results.push({
        ruleId: 'FOCUSED_SINGLE_QUESTION',
        dimension: 'questionQuality',
        description: `Ask at most ${expectation.maxQuestionMarks} focused clarifying question(s)`,
        passed: ok,
        evidence: `Question mark count: ${qCount}`,
        failureReason: ok ? undefined : `Overwhelmed student with ${qCount} questions.`,
        suggestedImprovement: ok
          ? undefined
          : 'Limit closing interrogation to ONE highest-impact progressive question.',
      })
    }

    // Dimension 9 & 10: Communication Quality & Actionability
    const hasGenericBotBanner = /as an ai language model|here is a list of guidance modes/i.test(response)
    const commOk = response.trim().length >= 80 && !hasGenericBotBanner && !providerError
    results.push({
      ruleId: 'COMMUNICATION_CLARITY',
      dimension: 'communicationQuality',
      description: 'Concise structured academic guidance free of generic chatbot boilerplate',
      passed: commOk,
      evidence: `Length=${response.length} chars, boilerplate=${hasGenericBotBanner}`,
      failureReason: commOk ? undefined : 'Response too brief, errored, or contained generic boilerplate.',
    })

    const hasNextAction =
      response.includes('?') ||
      /next steps|recommended|suggested|milestone|would you like/i.test(response)
    results.push({
      ruleId: 'CLEAR_NEXT_ACTION',
      dimension: 'actionability',
      description: 'End with concrete guidance or a clear next question/step',
      passed: hasNextAction,
      evidence: `Actionable ending detected for prompt="${userPrompt.slice(0, 40)}"`,
      failureReason: hasNextAction ? undefined : 'No actionable next step or question found.',
    })

    return results
  }

  /**
   * Optional advisory LLM judge (strictly marked advisoryOnly: true, never treated as factual proof).
   */
  private async runAdvisoryJudge(
    provider: ReturnType<typeof getAIProvider>,
    userPrompt: string,
    candidateResponse: string,
    expectedBehavior: string
  ): Promise<AdvisoryJudgeResult> {
    try {
      const judgeRes = await provider.generateResponse({
        messages: [
          {
            role: 'user',
            content: `User Prompt: ${userPrompt}\nExpected Behavior: ${expectedBehavior}\nCandidate Response:\n${candidateResponse}\n\nProvide brief qualitative feedback on clarity, tone, and pedagogy in 2 sentences. Do NOT claim factual correctness about database records.`,
          },
        ],
        systemPrompt:
          'You are an advisory pedagogical reviewer. Assess tone and structure only; you cannot verify repository database facts.',
        temperature: 0.2,
        maxTokens: 200,
      })

      return {
        advisoryOnly: true,
        factualProof: false,
        provider: judgeRes.provider,
        model: judgeRes.model,
        notes: redactSensitiveText(judgeRes.content),
        tokensUsed: judgeRes.tokensUsed,
      }
    } catch (err: any) {
      return {
        advisoryOnly: true,
        factualProof: false,
        provider: provider.name,
        model: 'unavailable',
        notes: 'Advisory evaluator call skipped due to provider error.',
        error: err?.message,
      }
    }
  }

  /**
   * Phase 5: Compares a baseline evaluation run against a candidate run to detect regressions & improvements.
   */
  compareRuns(
    baseline: EvalRunReport,
    candidate: EvalRunReport
  ): RegressionComparisonReport {
    const indexRules = (run: EvalRunReport) => {
      const map = new Map<
        string,
        { caseId: string; turnNumber: number; rule: DeterministicRuleResult }
      >()
      for (const c of run.cases) {
        for (const t of c.turns) {
          for (const r of t.ruleResults) {
            map.set(`${c.caseId}::T${t.turnNumber}::${r.ruleId}`, {
              caseId: c.caseId,
              turnNumber: t.turnNumber,
              rule: r,
            })
          }
        }
      }
      return map
    }

    const baseMap = indexRules(baseline)
    const candMap = indexRules(candidate)
    const regressions: RegressionDiffItem[] = []
    const improvements: RegressionDiffItem[] = []

    for (const [key, candEntry] of candMap.entries()) {
      const baseEntry = baseMap.get(key)
      if (!baseEntry) continue

      if (baseEntry.rule.passed && !candEntry.rule.passed) {
        regressions.push({
          caseId: candEntry.caseId,
          turnNumber: candEntry.turnNumber,
          ruleId: candEntry.rule.ruleId,
          dimension: candEntry.rule.dimension,
          baselinePassed: true,
          candidatePassed: false,
          status: 'REGRESSION',
          detail: candEntry.rule.failureReason || candEntry.rule.description,
        })
      } else if (!baseEntry.rule.passed && candEntry.rule.passed) {
        improvements.push({
          caseId: candEntry.caseId,
          turnNumber: candEntry.turnNumber,
          ruleId: candEntry.rule.ruleId,
          dimension: candEntry.rule.dimension,
          baselinePassed: false,
          candidatePassed: true,
          status: 'IMPROVEMENT',
          detail: `Fixed previously failing rule: ${candEntry.rule.description}`,
        })
      }
    }

    const baselineFailedCases = new Set(baseline.cases.filter((c) => !c.passed).map((c) => c.caseId))
    const newlyIntroducedFailureCases = candidate.cases
      .filter((c) => !c.passed && !baselineFailedCases.has(c.caseId))
      .map((c) => c.caseId)

    const rulesDelta = candidate.rulesPassed - baseline.rulesPassed
    const casesDelta = candidate.casesPassed - baseline.casesPassed

    return {
      baselineRunId: baseline.id,
      candidateRunId: candidate.id,
      baselineCreatedAt: baseline.createdAt,
      candidateCreatedAt: candidate.createdAt,
      baselineRulesPassed: baseline.rulesPassed,
      candidateRulesPassed: candidate.rulesPassed,
      rulesDelta,
      casesDelta,
      regressions,
      improvements,
      newlyIntroducedFailureCases,
      summary:
        regressions.length === 0
          ? `Zero regressions detected (${improvements.length} improvement(s), net rules delta ${rulesDelta >= 0 ? '+' : ''}${rulesDelta}).`
          : `Detected ${regressions.length} regression(s) across ${newlyIntroducedFailureCases.length} newly failing case(s).`,
    }
  }
}

export const aiQualityEvaluator = new AIResponseQualityEvaluator()
