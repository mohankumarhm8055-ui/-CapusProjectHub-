import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { createApp } from '../app.js'
import { Server } from 'http'
import { inMemoryEvaluationStore } from '../modules/ai/feature-evaluation/evaluation.model.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

describe('AI Feature Evaluation Engine Test Suite (CampusProjectHub)', () => {
  let server: Server
  let baseUrl: string
  const port = 5057
  let student1: TestAuthSession
  let student2: TestAuthSession

  before(async () => {
    student1 = await createAuthenticatedTestUser({
      label: 'eval-student-1',
      role: 'student',
      fullName: 'Evaluation Student Alpha',
    })
    student2 = await createAuthenticatedTestUser({
      label: 'eval-student-2',
      role: 'student',
      fullName: 'Evaluation Student Bravo',
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
    await inMemoryEvaluationStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. POST /api/ai/evaluations - Evaluates CampusProjectHub across 7 dimensions with 4 classifications', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub',
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
    assert.ok(json.data.id)
    assert.strictEqual(json.data.projectTitle, 'CampusProjectHub')
    assert.strictEqual(json.data.version, 1)

    const classifications = new Set(json.data.features.map((f: any) => f.classification))
    assert.ok(classifications.has('ESSENTIAL'), 'Must contain ESSENTIAL features')
    assert.ok(classifications.has('RECOMMENDED'), 'Must contain RECOMMENDED features')
    assert.ok(classifications.has('OPTIONAL'), 'Must contain OPTIONAL features')
    assert.ok(classifications.has('UNNECESSARY'), 'Must contain UNNECESSARY features')

    const firstFeature = json.data.features[0]
    assert.ok(firstFeature.dimensions.problemRelevance.rationale)
    assert.ok(firstFeature.dimensions.userValue.rationale)
    assert.ok(firstFeature.dimensions.originality.rationale)
    assert.ok(firstFeature.dimensions.technicalFeasibility.rationale)
    assert.ok(firstFeature.dimensions.complexity.rationale)
    assert.ok(firstFeature.dimensions.resourceRequirements.rationale)
    assert.ok(firstFeature.dimensions.timeSuitability.rationale)

    assert.ok(
      ['FEASIBLE_INITIAL', 'FEASIBLE_REDUCED_SCOPE'].includes(json.data.overallFeasibility.rating)
    )
  })

  test('2. Missing project context populates explicit assumptions without blocking the student', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({}),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.projectTitle, 'CampusProjectHub')
    assert.strictEqual(json.data.constraints.teamSize, 3)
    assert.strictEqual(json.data.constraints.developmentWeeks, 12)
    assert.ok(json.assumptions.length >= 2, 'Assumptions must be explicitly tracked')
  })

  test('3. Beginner vs. Experienced team constraint impacts feasibility ratings', async () => {
    const beginnerRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub',
        constraints: {
          teamSize: 1,
          technicalExperience: 'beginner',
          developmentWeeks: 4,
        },
      }),
    })

    const beginnerJson = await beginnerRes.json()
    assert.ok(
      ['FEASIBLE_REDUCED_SCOPE', 'NOT_FEASIBLE'].includes(beginnerJson.data.overallFeasibility.rating)
    )

    const advRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub',
        proposedFeatures: [
          'Academic project management',
          'Student team collaboration',
          'College project repository',
          'AI project similarity detection',
        ],
        constraints: {
          teamSize: 4,
          technicalExperience: 'advanced',
          developmentWeeks: 16,
        },
      }),
    })

    const advJson = await advRes.json()
    assert.strictEqual(advJson.data.overallFeasibility.rating, 'FEASIBLE_INITIAL')
  })

  test('4. Real-Time AI Voice Interaction is classified as UNNECESSARY with a simpler alternative', async () => {
    const res = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub',
        proposedFeatures: ['Real-time AI voice interaction', 'Student project management'],
      }),
    })

    const json = await res.json()
    const voiceFeature = json.data.features.find((f: any) => f.name.toLowerCase().includes('voice'))
    assert.ok(voiceFeature)
    assert.strictEqual(voiceFeature.classification, 'UNNECESSARY')
    assert.strictEqual(voiceFeature.dimensions.complexity.level, 'CRITICAL')
    assert.ok(voiceFeature.simplerAlternative)
    assert.ok(voiceFeature.potentialRisks.length > 0)
  })

  test('5. Student Decisions (Accept, Reject, Modify) and Rejection Trade-off explanation', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const evalRecord = (await createRes.json()).data
    const evalId = evalRecord.id

    const rejectRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        featureId: 'real-time-ai-voice-interaction',
        decision: 'REJECTED',
      }),
    })

    assert.strictEqual(rejectRes.status, 200)
    const rejectJson = await rejectRes.json()
    const voiceDecision = rejectJson.data.decisions.find(
      (d: any) => d.featureId === 'real-time-ai-voice-interaction'
    )
    assert.strictEqual(voiceDecision.decision, 'REJECTED')
    assert.ok(voiceDecision.tradeoffNotes.includes('Trade-off:'))

    const modifyRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        featureId: 'college-specific-docx-templates',
        decision: 'MODIFIED',
        modifiedScope: 'Standard Markdown Export with VTU heading structure instead of complex binary DOCX styles.',
      }),
    })

    assert.strictEqual(modifyRes.status, 200)
    const modifyJson = await modifyRes.json()
    const modDecision = modifyJson.data.decisions.find(
      (d: any) => d.featureId === 'college-specific-docx-templates'
    )
    assert.strictEqual(modDecision.decision, 'MODIFIED')
    assert.ok(modDecision.modifiedScope.includes('Markdown Export'))
  })

  test('6. Reassessment preserves prior student decisions (Rejected features are NOT re-added)', async () => {
    const evalId = (
      await (
        await fetch(`${baseUrl}/api/ai/evaluations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...student1.headers,
          },
          body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
        })
      ).json()
    ).data.id

    await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        featureId: 'ai-project-similarity-detection',
        decision: 'REJECTED',
      }),
    })

    const reassessRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/reassess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        constraints: { developmentWeeks: 16 },
      }),
    })

    assert.strictEqual(reassessRes.status, 200)
    const reassessJson = await reassessRes.json()
    assert.strictEqual(reassessJson.data.version, 2)
    assert.strictEqual(reassessJson.data.constraints.developmentWeeks, 16)

    const preservedDecision = reassessJson.data.decisions.find(
      (d: any) => d.featureId === 'ai-project-similarity-detection'
    )
    assert.ok(preservedDecision)
    assert.strictEqual(preservedDecision.decision, 'REJECTED')
  })

  test('7. POST /api/ai/evaluations/:id/generate-scope & PATCH scope - Final scope consistency', async () => {
    const evalId = (
      await (
        await fetch(`${baseUrl}/api/ai/evaluations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...student1.headers,
          },
          body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
        })
      ).json()
    ).data.id

    await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        featureId: 'real-time-ai-voice-interaction',
        decision: 'REJECTED',
      }),
    })

    const genRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/generate-scope`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
    })

    assert.strictEqual(genRes.status, 200)
    const genJson = await genRes.json()
    const scope = genJson.data.finalScope

    assert.ok(scope)
    assert.strictEqual(scope.status, 'SAVED')
    assert.ok(scope.essentialFeatures.length >= 3)
    assert.ok(scope.excludedFeatures.some((e: any) => e.featureName.toLowerCase().includes('voice')))
    assert.ok(!scope.essentialFeatures.some((f: string) => f.toLowerCase().includes('voice')))

    const updateRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/scope`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        title: 'CampusProjectHub — Custom Student Thesis Scope',
      }),
    })

    assert.strictEqual(updateRes.status, 200)
    const updateJson = await updateRes.json()
    assert.strictEqual(updateJson.data.finalScope.title, 'CampusProjectHub — Custom Student Thesis Scope')
  })

  test('8. Security Authorization - Student 2 cannot modify or access Student 1 evaluation', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const evalId = (await createRes.json()).data.id

    const unauthGetRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}`, {
      headers: student2.headers,
    })
    assert.strictEqual(unauthGetRes.status, 403)

    const unauthDecisionRes = await fetch(`${baseUrl}/api/ai/evaluations/${evalId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student2.headers,
      },
      body: JSON.stringify({
        featureId: 'student-project-management',
        decision: 'REJECTED',
      }),
    })
    assert.strictEqual(unauthDecisionRes.status, 403)
  })

  test('9. Invalid structured payload validation resilience', async () => {
    const invalidRes = await fetch(`${baseUrl}/api/ai/evaluations/eval-fake-id/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        featureId: '',
        decision: 'INVALID_STATUS',
      }),
    })

    assert.ok(invalidRes.status >= 400)
  })
})
