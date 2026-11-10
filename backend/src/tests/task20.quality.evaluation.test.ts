import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { Server } from 'http'
import { createApp } from '../app.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { inMemoryProjectStore } from '../modules/repository/project.model.js'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import { inMemoryEvalRunStore } from '../modules/ai/quality-eval/quality.model.js'
import { QUALITY_DIMENSIONS } from '../modules/ai/quality-eval/quality.types.js'
import { aiQualityEvaluator, redactSensitiveText } from '../modules/ai/quality-eval/quality.evaluator.js'
import { repositorySearchService } from '../modules/repository/repository.search.service.js'
import { aiService } from '../modules/ai/ai.service.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 20 — AI Response Quality Evaluation Engine Suite', () => {
  let server: Server
  let baseUrl: string
  let student: TestAuthSession
  let faculty: TestAuthSession
  let admin: TestAuthSession
  let primaryRunId = ''

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()

    student = await createAuthenticatedTestUser({
      label: 't20-student',
      role: 'student',
      fullName: 'Task20 Student',
    })
    faculty = await createAuthenticatedTestUser({
      label: 't20-faculty',
      role: 'faculty',
      fullName: 'Task20 Faculty',
    })
    admin = await createAuthenticatedTestUser({
      label: 't20-admin',
      role: 'admin',
      fullName: 'Task20 Admin',
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number }
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
  })

  after(async () => {
    await inMemoryProjectStore.clear()
    await inMemoryConversationStore.clear()
    await inMemoryMessageStore.clear()
    inMemoryEvalRunStore.length = 0
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. RBAC guards block public & student callers from administrative evaluation endpoints', async () => {
    const unauth = await fetch(`${baseUrl}/api/ai/quality-eval/dataset`)
    assert.strictEqual(unauth.status, 401)

    const studentAttempt = await fetch(`${baseUrl}/api/ai/quality-eval/dataset`, {
      headers: student.headers,
    })
    assert.strictEqual(studentAttempt.status, 403)

    const facultyOverview = await fetch(`${baseUrl}/api/ai/quality-eval/dataset`, {
      headers: faculty.headers,
    })
    assert.strictEqual(facultyOverview.status, 200)
    const overviewJson = await facultyOverview.json()
    assert.strictEqual(overviewJson.data.dimensions.length, QUALITY_DIMENSIONS.length)
    assert.ok(overviewJson.data.totalCases >= 14)
  })

  test('2. Full benchmark evaluation run passes across all 14 dataset cases & 10 dimensions', async () => {
    const res = await fetch(`${baseUrl}/api/ai/quality-eval/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...admin.headers },
      body: JSON.stringify({
        label: 'Baseline Task 19 Verification Run',
        promptConfigTag: 'task19-v1',
        persist: true,
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)

    const report = json.data
    primaryRunId = report.id

    assert.strictEqual(report.privacyRedacted, true)
    assert.strictEqual(report.overallPassed, true, `Unexpected failures: ${JSON.stringify(report.majorFailures)}`)
    assert.strictEqual(report.casesFailed, 0)
    assert.strictEqual(report.rulesFailed, 0)
    assert.strictEqual(report.dimensionSummaries.length, 10)
    assert.strictEqual(report.performance.failedRetrievalCount, 1) // CASE-14 simulated outage
    assert.ok(report.performance.duplicateSearchesAvoided >= 1)
    assert.ok(report.performance.totalRetrievedRecords >= 5)
    assert.strictEqual(report.performance.providerErrorCount, 0)
  })

  test('3. Phase 4 report lists explicit per-turn fields and Phase 5 lists persisted runs cleanly', async () => {
    const listRes = await fetch(`${baseUrl}/api/ai/quality-eval/runs`, {
      headers: faculty.headers,
    })
    assert.strictEqual(listRes.status, 200)
    const listJson = await listRes.json()
    assert.ok(listJson.data.length >= 1)
    assert.strictEqual(listJson.data[0].cases, undefined) // list omits verbose turn payloads

    const detailRes = await fetch(`${baseUrl}/api/ai/quality-eval/runs/${primaryRunId}`, {
      headers: faculty.headers,
    })
    assert.strictEqual(detailRes.status, 200)
    const detail = (await detailRes.json()).data

    const outageCase = detail.cases.find((c: any) => c.caseId === 'CASE-14-RETRIEVAL-OUTAGE')
    assert.ok(outageCase)
    assert.strictEqual(outageCase.passed, true)
    assert.strictEqual(outageCase.turns[0].metrics.retrievalFailed, true)
    assert.ok(outageCase.turns[0].generatedResponse.includes('Repository Retrieval Notice'))
  })

  test('4. Synthetic regression & improvement detection compares two runs accurately', async () => {
    const baseline = await aiQualityEvaluator.evaluateDataset({
      label: 'Regression Check Baseline',
      persist: true,
    })

    // Simulate a broken candidate run where 1 case fails due to fabricated percentage
    const candidate = structuredClone(baseline)
    candidate.id = `candidate-reg-${Date.now()}`
    const targetCase = candidate.cases[0]
    const ruleToFail = targetCase.turns[0].ruleResults.find((r) => r.ruleId === 'NO_INVENTED_PERCENTAGES')!
    ruleToFail.passed = false
    ruleToFail.failureReason = 'Simulated regression: emitted "85% original".'
    targetCase.turns[0].passed = false
    targetCase.passed = false
    candidate.rulesPassed -= 1
    candidate.rulesFailed += 1
    candidate.casesPassed -= 1
    candidate.casesFailed += 1

    const diff = aiQualityEvaluator.compareRuns(baseline, candidate)
    assert.strictEqual(diff.regressions.length, 1)
    assert.strictEqual(diff.regressions[0].ruleId, 'NO_INVENTED_PERCENTAGES')
    assert.strictEqual(diff.newlyIntroducedFailureCases.length, 1)
    assert.strictEqual(diff.newlyIntroducedFailureCases[0], targetCase.caseId)
    assert.strictEqual(diff.rulesDelta, -1)

    // And comparing broken candidate -> fixed baseline shows improvement!
    const recoveryDiff = aiQualityEvaluator.compareRuns(candidate, baseline)
    assert.strictEqual(recoveryDiff.regressions.length, 0)
    assert.strictEqual(recoveryDiff.improvements.length, 1)
    assert.strictEqual(recoveryDiff.rulesDelta, 1)
  })

  test('5. Privacy redactor removes emails and 10+ digit phone numbers while keeping academic years', () => {
    const raw =
      'Student jane.doe@college.edu from 2023-2024 called +91 9876543210 about project 2025-26.'
    const sanitized = redactSensitiveText(raw)
    assert.ok(sanitized.includes('[REDACTED_EMAIL]'))
    assert.ok(sanitized.includes('[REDACTED_PHONE]'))
    assert.ok(sanitized.includes('2023-2024'))
    assert.ok(sanitized.includes('2025-26'))
    assert.ok(!sanitized.includes('jane.doe@college.edu'))
    assert.ok(!sanitized.includes('9876543210'))
  })

  test('6. AIService executes repository search at most once per mentor turn (zero duplicate searches)', async () => {
    let searchCalls = 0
    const origCompare = repositorySearchService.compareStudentIdea.bind(repositorySearchService)
    repositorySearchService.compareStudentIdea = async (...args) => {
      searchCalls += 1
      return origCompare(...args)
    }

    try {
      const conv = await conversationService.createConversation(student.user.id, 'Single-Search Telemetry Check')
      const assistantMsg = await aiService.generateMentorResponse(
        conv.id,
        student.user.id,
        'Smart Attendance Management System'
      )

      assert.strictEqual(searchCalls, 1, `Expected 1 repository search call, observed ${searchCalls}`)
      assert.strictEqual((assistantMsg.providerMetadata?.retrievedRecordsCount || 0) >= 1, true)
      assert.strictEqual(typeof assistantMsg.providerMetadata?.responseLatencyMs, 'number')
    } finally {
      repositorySearchService.compareStudentIdea = origCompare
    }
  })
})
