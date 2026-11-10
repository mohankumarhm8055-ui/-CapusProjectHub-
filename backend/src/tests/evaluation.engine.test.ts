import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { createApp } from '../app.js'
import { Server } from 'http'
import { inMemoryEvaluationStore } from '../modules/ai/feature-evaluation/evaluation.model.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { contextEngine } from '../modules/ai/feature-evaluation/context.engine.js'
import { conversationalEngine } from '../modules/ai/conversational-engine/conversational.engine.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 10 — Comprehensive Feature Evaluation Engine & Scope Finalization Test Suite', () => {
  let server: Server
  let baseUrl: string
  const port = 5059
  let evaluationId: string
  let studentLead: TestAuthSession
  let imposterStudent: TestAuthSession

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()
    inMemoryEvaluationStore.clear()

    studentLead = await createAuthenticatedTestUser({
      label: 'eval-engine-lead',
      role: 'student',
      fullName: 'Lead Student 01',
    })
    imposterStudent = await createAuthenticatedTestUser({
      label: 'eval-engine-imposter',
      role: 'student',
      fullName: 'Imposter Student 99',
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => {
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  after(async () => {
    inMemoryEvaluationStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. New project idea evaluation evaluates multiple features', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        projectTitle: 'Smart Campus Shuttle & Attendance Node',
        problemStatement: 'Campus shuttle bus delays and lack of real-time passenger verification.',
        proposedFeatures: [
          'Student project management',
          'Student team collaboration',
          'AI project similarity detection',
          'Facial recognition attendance system',
          'Blockchain ledger for project submissions',
          'Real-time AI voice interaction',
        ],
        constraints: {
          teamSize: 3,
          technicalExperience: 'intermediate',
          developmentWeeks: 12,
        },
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    evaluationId = json.data.id
    assert.ok(evaluationId)
    assert.strictEqual(json.data.projectTitle, 'Smart Campus Shuttle & Attendance Node')
    assert.strictEqual(json.data.features.length, 6)
  })

  test('2. Standalone feature evaluation evaluates individual feature inquiry', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/evaluate-feature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        featureName: 'Facial recognition attendance system',
        constraints: {
          teamSize: 2,
          technicalExperience: 'beginner',
          developmentWeeks: 8,
        },
      }),
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.feature.classification, 'UNNECESSARY')
    assert.ok(json.data.feature.simplerAlternative)
    assert.ok(json.data.feature.simplerAlternative.includes('QR code') || json.data.feature.simplerAlternative.includes('RFID'))
  })

  test('3. Follow-up question engine prompts for missing context one question at a time', () => {
    const q1 = contextEngine.getNextFollowUpQuestion({})
    assert.strictEqual(q1?.questionKey, 'OBJECTIVE')

    const q2 = contextEngine.getNextFollowUpQuestion({ coreObjectives: ['Build system'] })
    assert.strictEqual(q2?.questionKey, 'PROBLEM_STATEMENT')

    const q3 = contextEngine.getNextFollowUpQuestion({
      coreObjectives: ['Build system'],
      problemStatement: 'Manual paperwork is slow',
    })
    assert.strictEqual(q3?.questionKey, 'TEAM_SIZE')

    const qComplete = contextEngine.getNextFollowUpQuestion({
      coreObjectives: ['Build system'],
      problemStatement: 'Manual paperwork is slow',
      constraints: {
        teamSize: 4,
        technicalExperience: 'advanced',
        developmentWeeks: 14,
        semesterDeadline: 'May 2027',
        languagesAndFrameworks: ['TypeScript', 'Python'],
      },
    })
    assert.strictEqual(qComplete, null)
  })

  test('4. Every feature includes all seven evaluation dimensions with explanations', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}`, {
      headers: studentLead.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    const feat = json.data.features[0]

    assert.ok(feat.dimensions.problemRelevance.rationale, 'Dimension 1: problemRelevance')
    assert.ok(feat.dimensions.userValue.rationale, 'Dimension 2: userValue')
    assert.ok(feat.dimensions.originality.rationale, 'Dimension 3: originality')
    assert.ok(feat.dimensions.technicalFeasibility.rationale, 'Dimension 4: technicalFeasibility')
    assert.ok(feat.dimensions.complexity.rationale, 'Dimension 5: complexity')
    assert.ok(feat.dimensions.resourceRequirements.rationale, 'Dimension 6: resourceRequirements')
    assert.ok(feat.dimensions.timeSuitability.rationale, 'Dimension 7: timeSuitability')
  })

  test('5. Features are categorized into the 4 defined recommendation buckets', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}`, {
      headers: studentLead.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    const classifications = json.data.features.map((f: any) => f.classification)

    assert.ok(classifications.includes('ESSENTIAL'), 'Must contain ESSENTIAL')
    assert.ok(classifications.includes('RECOMMENDED'), 'Must contain RECOMMENDED')
    assert.ok(classifications.includes('UNNECESSARY'), 'Must contain UNNECESSARY')
  })

  test('6. Student can ACCEPT, REJECT, and MODIFY proposed features', async () => {
    const acceptRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        featureId: 'student-project-management',
        decision: 'ACCEPTED',
      }),
    })
    assert.strictEqual(acceptRes.status, 200)

    const rejectRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        featureId: 'real-time-ai-voice-interaction',
        decision: 'REJECTED',
        notes: 'Excluded to protect viva demo and prevent WebRTC network lag.',
      }),
    })
    assert.strictEqual(rejectRes.status, 200)
    const rejectJson = await rejectRes.json()
    const voiceDecision = rejectJson.data.decisions.find((d: any) => d.featureId === 'real-time-ai-voice-interaction')
    assert.strictEqual(voiceDecision.decision, 'REJECTED')
    assert.ok(voiceDecision.tradeoffNotes.includes('Trade-off'))

    const modifyRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        featureId: 'ai-project-similarity-detection',
        decision: 'MODIFIED',
        modifiedScope: 'Token Jaccard index with character n-grams, omitting external paid embeddings.',
      }),
    })
    assert.strictEqual(modifyRes.status, 200)
  })

  test('7. Decisions are preserved when re-evaluating under new constraints', async () => {
    const reassessRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/reassess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        constraints: {
          developmentWeeks: 10,
        },
      }),
    })

    assert.strictEqual(reassessRes.status, 200)
    const json = await reassessRes.json()
    assert.strictEqual(json.data.version, 2)

    const voiceDec = json.data.decisions.find((d: any) => d.featureId === 'real-time-ai-voice-interaction')
    assert.strictEqual(voiceDec.decision, 'REJECTED')

    const simDec = json.data.decisions.find((d: any) => d.featureId === 'ai-project-similarity-detection')
    assert.strictEqual(simDec.decision, 'MODIFIED')
  })

  test('8. Compiles structured final scope including excluded features and milestones', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/generate-scope`, {
      method: 'POST',
      headers: studentLead.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.finalScope)
    assert.strictEqual(json.data.finalScope.status, 'SAVED')
    assert.ok(json.data.finalScope.implementationMilestones.length >= 3)
    assert.ok(json.data.finalScope.excludedFeatures.some((e: any) => e.featureName.includes('Voice') || e.featureName.includes('voice')))
  })

  test('9. Overall scope feasibility is calculated with pedagogical justification', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}`, {
      headers: studentLead.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.ok(['FEASIBLE_INITIAL', 'FEASIBLE_REDUCED_SCOPE'].includes(json.data.overallFeasibility.rating))
    assert.ok(json.data.overallFeasibility.summary)
    assert.ok(json.data.overallFeasibility.recommendedReleaseScope)
  })

  test('10. Create new immutable scope version with change summary', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/scope/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        changeSummary: 'Finalized phase 2 deliverables with faculty advisor approval.',
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.scopeVersions.length >= 2)
  })

  test('11. Scope version comparison and version restoration', async () => {
    const compRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/scope/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentLead.headers,
      },
      body: JSON.stringify({
        versionA: 1,
        versionB: 2,
      }),
    })

    assert.strictEqual(compRes.status, 200)
    const compJson = await compRes.json()
    assert.strictEqual(compJson.success, true)
    assert.strictEqual(compJson.data.versionA, 1)
    assert.strictEqual(compJson.data.versionB, 2)
    assert.ok(Array.isArray(compJson.data.addedEssentialFeatures))

    const restoreRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/scope/versions/1/restore`, {
      method: 'POST',
      headers: studentLead.headers,
    })

    assert.strictEqual(restoreRes.status, 200)
    const restoreJson = await restoreRes.json()
    assert.strictEqual(restoreJson.success, true)
  })

  test('12. Explicit student confirmation finalizes project scope', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/scope/finalize`, {
      method: 'POST',
      headers: studentLead.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.isFinalized, true)
    assert.ok(json.data.finalizedAt)
    assert.strictEqual(json.data.finalizedBy, studentLead.id)
  })

  test('13. Repository intelligence comparison is attached and includes similarity != plagiarism disclaimer', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}`, {
      headers: studentLead.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.ok(json.data.repositoryComparison, 'Must include repository comparison')
    assert.ok(
      json.data.repositoryComparison.notice.includes('Similarity is never treated as proof of plagiarism') ||
      json.data.repositoryComparison.notice.includes('similarity')
    )
  })

  test('14. Student 2 cannot access or modify Student 1 evaluation', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}`, {
      headers: imposterStudent.headers,
    })
    assert.strictEqual(res.status, 403)
  })

  test('15. AI Mentor evaluates facial recognition attendance and proposes dynamic QR code alternative', async () => {
    const conv = await conversationService.createConversation(studentLead.id, 'Attendance Feature Consultation')
    const turn = await conversationalEngine.processTurn(
      conv.id,
      studentLead.id,
      'I want to add facial recognition to my attendance project.'
    )

    assert.strictEqual(turn.intent, 'FEATURE_EVALUATION')
    assert.ok(turn.responseMarkdown.includes('Facial Recognition for Attendance'))
    assert.ok(turn.responseMarkdown.includes('UNNECESSARY'))
    assert.ok(turn.responseMarkdown.includes('Privacy, Ethics & Consent'))
    assert.ok(turn.responseMarkdown.includes('QR code') || turn.responseMarkdown.includes('simpler alternative'))
    assert.ok(turn.suggestedFollowUps.length >= 2)
  })
})
