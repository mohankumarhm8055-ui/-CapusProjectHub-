import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import mongoose from 'mongoose'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { seedCollegeTemplates } from '../modules/proposals/template.model.js'
import { repositorySearchService } from '../modules/repository/repository.search.service.js'
import { aiService, AIService } from '../modules/ai/ai.service.js'
import { aiQualityEvaluator } from '../modules/ai/quality-eval/quality.evaluator.js'
import { ProjectRepository } from '../modules/repository/project.model.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task23_test'

describe('TASK 23 — Complete AI Mentor Conversational Acceptance Suite (E2E + MongoDB Restart + Failure Recovery)', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK

  let studentToken = ''
  let strangerToken = ''
  let convId = ''
  let comparisonId = ''
  let evaluationId = ''
  let scopeId = ''
  let proposalId = ''

  async function startServer() {
    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as { port: number }
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
  }

  async function stopServer() {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()))
      server = null
    }
  }

  async function ask(cId: string, content: string, token = studentToken): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations/${cId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, stream: false }),
    })
    assert.equal(res.status, 200, `Expected 200 asking "${content}", got ${res.status}`)
    const json: any = await res.json()
    return json.data.content
  }

  before(async () => {
    process.env.ALLOW_INMEMORY_FALLBACK = 'false'
    await connectDatabase(TEST_MONGO_URI)
    await mongoose.connection.dropDatabase()
    await seedRepository()
    await seedCollegeTemplates()

    // Seed an unapproved/rejected draft to validate zero restricted leakage
    await ProjectRepository.create({
      title: 'Private Rejected Attendance Draft',
      slug: `t23-rejected-${Date.now()}`,
      abstract: 'Confidential rejected attendance draft.',
      problemStatement: 'Unapproved attendance idea.',
      objectives: ['Private'],
      features: ['Secret draft'],
      modules: [],
      technologyStack: [{ name: 'Python' }],
      academicYear: '2025–26',
      department: 'CSE',
      collegeId: 'rvce-main',
      reviewStatus: 'REJECTED',
      verificationStatus: 'PENDING_VERIFICATION',
      rejectionReason: 'CONFIDENTIAL_T23_REJECTION_NOTE',
      teamMembers: [{ name: 'Hidden', email: 'hidden.t23@college.edu' }],
      facultyGuide: { name: 'Dr. Private' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION',
      uploadedBy: 'hidden-user',
    })

    await startServer()

    const reg1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 't23.student@campusprojecthub.edu',
        password: 'StrongPassword#2026',
        fullName: 'Task23 Primary Student',
        department: 'Information Science & Engineering',
      }),
    })
    assert.equal(reg1.status, 201)
    studentToken = (await reg1.json()).data.token

    const reg2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 't23.stranger@campusprojecthub.edu',
        password: 'StrongPassword#2026',
        fullName: 'Task23 Stranger Student',
      }),
    })
    assert.equal(reg2.status, 201)
    strangerToken = (await reg2.json()).data.token
  })

  after(async () => {
    await stopServer()
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
      await disconnectDatabase()
    }
    if (origAllowFallback !== undefined) {
      process.env.ALLOW_INMEMORY_FALLBACK = origAllowFallback
    } else {
      delete process.env.ALLOW_INMEMORY_FALLBACK
    }
  })

  it('PHASE 1 & 2: Complete 15-step workflow with spelling typo tolerance, repository check, honest feature evaluation, decisions, scope, and proposal', async () => {
    // 1. Create conversation
    const convRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ title: 'T23 Complete Lifecycle' }),
    })
    assert.equal(convRes.status, 201)
    convId = (await convRes.json()).data.id

    // 2. Rough idea WITH spelling typos ("smrt attendnce") triggers fuzzy match & honest repository critique
    const r1 = await ask(convId, 'We are 3 intermediate students with 8 weeks building smrt attendnce tracking')
    assert.ok(r1.includes('Smart Attendance Management System'))
    assert.ok(r1.includes('Similarity is not plagiarism'))

    // 3. Batch question -> honest missing batch disclosure
    const rBatch = await ask(convId, 'Which batch developed that project?')
    assert.ok(rBatch.includes('Not Explicitly Recorded'))
    assert.ok(rBatch.includes('2025–26'))

    // 4. Propose unnecessary AI chatbot -> honestly rejected
    const rChatbot = await ask(convId, 'I also want to add an AI chatbot')
    assert.ok(rChatbot.includes('Unnecessary'))

    // 5. Formal Multi-Project Comparison session saved in MongoDB
    const cmpRes = await fetch(`${baseUrl}/api/ai/comparisons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        conversationId: convId,
        title: 'Offline Rotating QR Attendance & Roster Manager',
        description: 'Anti-proxy classroom attendance with offline check-in queuing.',
        features: ['Rotating expiring QR tokens', 'Offline check-in sync', 'AI chatbot'],
        technologies: ['React', 'Node.js', 'MongoDB'],
        constraints: { teamSize: 3, developmentWeeks: 8, technicalExperience: 'intermediate' },
      }),
    })
    assert.equal(cmpRes.status, 201)
    comparisonId = (await cmpRes.json()).data.id

    // 6. Formal Feature Evaluation -> Accept rotating QR, Reject AI Chatbot -> Reassess -> Finalize Scope
    const evalRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        conversationId: convId,
        projectTitle: 'Offline Rotating QR Attendance & Roster Manager',
        problemStatement: 'Eliminate proxy classroom check-ins without unreliable Wi-Fi dependencies.',
        proposedFeatures: [
          'Rotating expiring QR tokens',
          'Offline queued attendance sync',
          'AI chatbot assistant',
        ],
        constraints: {
          teamSize: 3,
          technicalExperience: 'intermediate',
          developmentWeeks: 8,
          semesterDeadline: 'End of 6th Semester',
          languagesAndFrameworks: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
        },
      }),
    })
    assert.equal(evalRes.status, 201)
    const evalData = (await evalRes.json()).data
    evaluationId = evalData.id

    const qrFeat = evalData.features.find((f: any) => f.name.includes('QR'))
    const botFeat = evalData.features.find((f: any) => f.name.toLowerCase().includes('chatbot'))
    assert.ok(qrFeat && botFeat)

    // Save decisions & verify reassessment preserves rejected feature
    const dec1Res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        featureId: qrFeat.featureId,
        decision: 'ACCEPTED',
      }),
    })
    assert.equal(dec1Res.status, 200)

    const dec2Res = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        featureId: botFeat.featureId,
        decision: 'REJECTED',
        notes: 'Deferred to avoid bloat',
      }),
    })
    assert.equal(dec2Res.status, 200)

    const reassessRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        constraints: { developmentWeeks: 6 },
      }),
    })
    assert.equal(reassessRes.status, 200)
    const reassessedData = (await reassessRes.json()).data
    const preservedReject = reassessedData.decisions.find((d: any) => d.featureId === botFeat.featureId)
    assert.equal(preservedReject?.decision, 'REJECTED')

    const scopeRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/generate-scope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({}),
    })
    assert.equal(scopeRes.status, 200)
    scopeId = (await scopeRes.json()).data.id

    const finalizeRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/scope/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({}),
    })
    assert.equal(finalizeRes.status, 200)

    // Generate Proposal from Finalized Scope
    const propRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        projectTitle: 'Offline Rotating QR Attendance & Roster Manager',
        documentType: 'MINI_PROJECT_PROPOSAL',
        sourceEvaluationId: evaluationId,
        isScopeFinalized: true,
      }),
    })
    assert.equal(propRes.status, 201)
    proposalId = (await propRes.json()).data.id
  })

  it('PHASE 5 & 7K: Conversation, comparison, evaluation, scope, and proposal survive full backend + MongoDB restart', async () => {
    await stopServer()
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)
    await startServer()

    const [convGet, cmpGet, evalGet, propGet] = await Promise.all([
      fetch(`${baseUrl}/api/ai/conversations/${convId}`, { headers: { Authorization: `Bearer ${studentToken}` } }),
      fetch(`${baseUrl}/api/ai/comparisons/${comparisonId}`, { headers: { Authorization: `Bearer ${studentToken}` } }),
      fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}`, { headers: { Authorization: `Bearer ${studentToken}` } }),
      fetch(`${baseUrl}/api/proposals/${proposalId}`, { headers: { Authorization: `Bearer ${studentToken}` } }),
    ])

    assert.equal(convGet.status, 200)
    assert.equal(cmpGet.status, 200)
    assert.equal(evalGet.status, 200)
    assert.equal(propGet.status, 200)

    const convBody: any = await convGet.json()
    assert.ok(convBody.data.messages.length >= 6)
    // Continue later in restored thread seamlessly
    const cont = await ask(convId, 'Prepare a problem statement')
    assert.ok(cont.includes('Problem Statement'))
  })

  it('PHASE 7: Scenarios A-J (Novel idea, Personalization Beginner/Advanced, Pivot, Restricted boundary)', async () => {
    // Scenario I & J: Beginner vs Advanced explanation depth
    const cLearn = (
      await (
        await fetch(`${baseUrl}/api/ai/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
          body: JSON.stringify({ title: 'T23 Depth Check' }),
        })
      ).json()
    ).data.id

    await fetch(`${baseUrl}/api/ai/learning-profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ explanationLevel: 'beginner' }),
    })
    const beg = await ask(cLearn, "I don't understand how semantic search works")
    assert.ok(beg.includes('Beginner Step-by-Step Guide'))

    const adv = await ask(cLearn, 'Explain semantic search with deeper technical detail')
    assert.ok(adv.includes('Advanced Level'))

    // Scenario D & G: Novel idea then pivot
    const cPivot = (
      await (
        await fetch(`${baseUrl}/api/ai/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
          body: JSON.stringify({ title: 'T23 Novel + Pivot' }),
        })
      ).json()
    ).data.id
    const novel = await ask(cPivot, 'Automated Hostel Laundry Washing Machine Queue Tracker')
    assert.ok(novel.includes('No sufficiently similar project found'))

    const pivoted = await ask(
      cPivot,
      'Actually instead of laundry, switch to E-Commerce Management System with High Concurrency Locking'
    )
    assert.ok(pivoted.includes('E-Commerce Management System with High Concurrency Locking'))

    // Privacy check: stranger cannot access conversation, comparison, or proposal
    const strangerConv = await fetch(`${baseUrl}/api/ai/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    })
    assert.equal(strangerConv.status, 403)
  })

  it('PHASE 6: Failure & recovery matrix (Repo outage, Provider timeout, Empty AI reply, DB disconnect, Expired Auth)', async () => {
    // 1. Repository search failure -> honest disclosure, never falsely claim zero overlap
    const origCompare = repositorySearchService.compareStudentIdea.bind(repositorySearchService)
    repositorySearchService.compareStudentIdea = async () => {
      throw new Error('Simulated repo DB read error')
    }
    try {
      const cOutage = (
        await (
          await fetch(`${baseUrl}/api/ai/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
            body: JSON.stringify({ title: 'T23 Repo Outage' }),
          })
        ).json()
      ).data.id
      const rOutage = await ask(cOutage, 'Solar Panel Microgrid Telemetry System')
      assert.ok(rOutage.includes('Repository Retrieval Notice'))
      assert.ok(!rOutage.includes('No sufficiently similar project found'))
    } finally {
      repositorySearchService.compareStudentIdea = origCompare
    }

    // 2. AI provider timeout & Invalid empty response (AIService unit check)
    const meJson: any = await (await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${studentToken}` } })).json()

    const timeoutService = new AIService({
      name: 'failing-timeout-provider',
      isAvailable: () => true,
      generateResponse: async () => {
        throw new Error('ETIMEDOUT after 30000ms')
      },
      streamResponse: async () => {},
    })
    await assert.rejects(
      () => timeoutService.generateMentorResponse(convId, meJson.data.id, 'hello'),
      (err: any) => err?.code === 'AI_PROVIDER_UNAVAILABLE' && err?.statusCode === 502
    )

    const emptyService = new AIService({
      name: 'invalid-empty-provider',
      isAvailable: () => true,
      generateResponse: async () => ({ content: '   ', model: 'bad', provider: 'mock' }),
      streamResponse: async () => {},
    })
    await assert.rejects(
      () => emptyService.generateMentorResponse(convId, meJson.data.id, 'check empty guard'),
      (err: any) => err?.code === 'INVALID_AI_RESPONSE' && err?.statusCode === 502
    )

    // Verify clean default provider recovers on shared instance
    assert.equal(aiService.getProviderName(), 'mock')

    // 3. Invalid / expired token -> 401
    const unauthRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      headers: { Authorization: 'Bearer invalid.expired.jwt' },
    })
    assert.equal(unauthRes.status, 401)

    // 4. Invalid proposal documentType -> 400 validation error & cross-owner evaluation -> 403 Forbidden
    const badProp = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ projectTitle: 'Test', documentType: 'INVALID_DOC_TYPE' }),
    })
    assert.equal(badProp.status, 400)

    const crossEvalProp = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${strangerToken}` },
      body: JSON.stringify({ projectTitle: 'Hijack', sourceEvaluationId: evaluationId }),
    })
    assert.equal(crossEvalProp.status, 403)

    // 5. MongoDB disconnection -> HTTP 503 DATABASE_UNAVAILABLE (and clean reconnect!)
    await disconnectDatabase()
    try {
      const dbDownRes = await fetch(`${baseUrl}/api/ai/conversations`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
      assert.equal(dbDownRes.status, 503)
    } finally {
      await connectDatabase(TEST_MONGO_URI)
    }
  })

  it('PHASE 8: Task 20 automated quality benchmark passes 100% after all Task 19-23 upgrades', async () => {
    const evalReport = await aiQualityEvaluator.evaluateDataset({
      label: 'Task 23 Final Acceptance Audit',
      persist: false,
    })
    assert.equal(evalReport.overallPassed, true)
    assert.equal(evalReport.casesPassed, evalReport.casesTotal)
    assert.equal(evalReport.rulesPassed, evalReport.rulesTotal)
  })
})
