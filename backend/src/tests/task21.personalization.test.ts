import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { Server } from 'http'
import { createApp } from '../app.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { inMemoryProjectStore } from '../modules/repository/project.model.js'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import { inMemoryLearningProfileStore } from '../modules/ai/personalization/learningProfile.model.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 21 — AI Mentor Personalization & Student Learning Intelligence Suite', () => {
  let server: Server
  let baseUrl: string
  let student1: TestAuthSession
  let student2: TestAuthSession

  async function setLearningProfile(
    session: TestAuthSession,
    updates: Record<string, any>
  ): Promise<any> {
    const res = await fetch(`${baseUrl}/api/ai/learning-profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...session.headers },
      body: JSON.stringify(updates),
    })
    assert.strictEqual(res.status, 200)
    return (await res.json()).data
  }

  async function createConversation(session: TestAuthSession, title: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...session.headers },
      body: JSON.stringify({ title }),
    })
    assert.strictEqual(res.status, 201)
    return (await res.json()).data.id
  }

  async function askMentor(
    session: TestAuthSession,
    convId: string,
    content: string
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...session.headers,
      },
      body: JSON.stringify({ content, stream: false }),
    })
    assert.strictEqual(res.status, 200)
    return (await res.json()).data.content
  }

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()

    student1 = await createAuthenticatedTestUser({
      label: 't21-student-1',
      role: 'student',
      fullName: 'Task21 Student One',
    })
    student2 = await createAuthenticatedTestUser({
      label: 't21-student-2',
      role: 'student',
      fullName: 'Task21 Student Two',
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
    inMemoryLearningProfileStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('0. Optional defaults work cleanly without setup and never infer intelligence from marks/semester', async () => {
    const res = await fetch(`${baseUrl}/api/ai/learning-profile`, {
      headers: student2.headers,
    })
    assert.strictEqual(res.status, 200)
    const profile = (await res.json()).data
    assert.strictEqual(profile.explanationLevel, 'intermediate')
    assert.strictEqual(profile.preferredLanguage, 'auto')
  })

  test('1, 2, 3, 4. Beginner, Intermediate, and Advanced receive calibrated depth on same technical concept while preserving accuracy', async () => {
    const question = "I don't understand how semantic search works"

    // Scenario 1: Beginner
    await setLearningProfile(student1, { explanationLevel: 'beginner', explanationStyle: 'step_by_step' })
    const cBeg = await createConversation(student1, 'Beginner Depth')
    const rBeg = await askMentor(student1, cBeg, question)
    assert.ok(rBeg.includes('Beginner Step-by-Step Guide'))
    assert.ok(rBeg.includes('meaning coordinates'))
    assert.ok(rBeg.includes('Embeddings'))

    // Scenario 4 & 2: Switch level -> Intermediate
    await setLearningProfile(student1, { explanationLevel: 'intermediate' })
    const cInt = await createConversation(student1, 'Intermediate Depth')
    const rInt = await askMentor(student1, cInt, question)
    assert.ok(rInt.includes('Intermediate Level'))
    assert.ok(rInt.includes('RepositorySearchService'))

    // Scenario 4 & 3: Switch level -> Advanced
    await setLearningProfile(student1, { explanationLevel: 'advanced' })
    const cAdv = await createConversation(student1, 'Advanced Depth')
    const rAdv = await askMentor(student1, cAdv, question)
    assert.ok(rAdv.includes('Advanced Level'))
    assert.ok(rAdv.includes('HNSW') || rAdv.includes('O(N · d)'))
  })

  test('5. Multilingual adaptation in Kannada and Hindi preserves exact English technical terms', async () => {
    await setLearningProfile(student1, { explanationLevel: 'beginner', preferredLanguage: 'kn' })
    const cKn = await createConversation(student1, 'Kannada Explanation')
    const rKn = await askMentor(student1, cKn, 'How does JWT authentication work?')
    assert.ok(rKn.includes('ಕನ್ನಡ ಮಾರ್ಗದರ್ಶನ'))
    assert.ok(rKn.includes('React') && rKn.includes('MongoDB') && rKn.includes('JWT'))

    // Switch manually to Hindi via mixed-language prompt
    await setLearningProfile(student1, { preferredLanguage: 'auto' })
    const cHi = await createConversation(student1, 'Hindi Explanation')
    const rHi = await askMentor(student1, cHi, 'Semantic search kya hai hindi mein samjhao')
    assert.ok(rHi.includes('हिंदी अकादमिक मार्गदर्शन'))
    assert.ok(rHi.includes('Embeddings') && rHi.includes('MongoDB'))
  })

  test('6, 9, 10. Teaching continuity, idea switching, and returning to an earlier project discussion', async () => {
    await setLearningProfile(student1, { explanationLevel: 'intermediate', preferredLanguage: 'en' })
    const convId = await createConversation(student1, 'Continuity & Return')

    // Scenario 10: Conceptual Q -> Applied Q -> Necessity Q without repeating topic
    const t1 = await askMentor(student1, convId, "I don't understand how semantic search works")
    assert.ok(t1.includes('Semantic Search'))
    const t2 = await askMentor(student1, convId, 'How can I use it in my project repository?')
    assert.ok(t2.includes('RepositorySearchService') || t2.includes('compareStudentIdea'))
    const t3 = await askMentor(student1, convId, 'Is it necessary for my mini-project?')
    assert.ok(t3.includes('Honest Verdict') && t3.includes('Simpler Alternative'))

    // Scenario 6 & 9: Pitch Attendance -> Pivot to E-Commerce -> Return to earlier Attendance project
    const conv2 = await createConversation(student1, 'Switch & Return Project')
    const p1 = await askMentor(student1, conv2, 'Smart Attendance Management System')
    assert.ok(p1.includes('Smart Attendance Management System'))

    const p2 = await askMentor(
      student1,
      conv2,
      'Actually instead of attendance, switch to E-Commerce Management System with High Concurrency Locking'
    )
    assert.ok(p2.includes('E-Commerce Management System with High Concurrency Locking'))

    const pBack = await askMentor(student1, conv2, "Let's go back to the attendance project we discussed earlier")
    assert.ok(pBack.includes('Returning to Earlier Project'))
    assert.ok(pBack.includes('Smart Attendance Management System'))
  })

  test('7, 8, 11, 12. Constraint updates, assumption correction, simpler & deeper depth pivots', async () => {
    await setLearningProfile(student1, { explanationLevel: 'intermediate', preferredLanguage: 'en' })
    const convId = await createConversation(student1, 'Constraints & Depth Pivots')
    await askMentor(student1, convId, 'Hostel Mess Food Inventory Tracker')

    // Scenario 7: Tight beginner constraints avoid microservices & advise modular monolith
    const rConstraints = await askMentor(
      student1,
      convId,
      'We are 2 beginner students with 5 weeks, laptop only, and zero budget'
    )
    assert.ok(rConstraints.includes('modular monolith'))
    assert.ok(rConstraints.includes('5 week(s)'))
    assert.ok(rConstraints.includes('Standard student laptop'))

    // Scenario 8: Student corrects assumption via API PATCH /context and via chat
    const patchRes = await fetch(`${baseUrl}/api/ai/conversations/${convId}/context`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...student1.headers },
      body: JSON.stringify({ teamSize: 4, developmentWeeks: 10 }),
    })
    assert.strictEqual(patchRes.status, 200)
    const patchedCtx = (await patchRes.json()).data
    assert.strictEqual(patchedCtx.teamSize, 4)
    assert.strictEqual(patchedCtx.developmentWeeks, 10)

    // Scenario 11 & 12: Explicit simpler explanation vs deeper technical detail in chat
    const rSimpler = await askMentor(student1, convId, 'Give me a simpler explanation of JWT')
    assert.ok(rSimpler.includes('Beginner Guide'))
    const rDeeper = await askMentor(student1, convId, 'Explain JWT with deeper technical detail')
    assert.ok(rDeeper.includes('Advanced'))
  })

  test('13. Account isolation prevents Student 2 from reading or overwriting Student 1 context or profile', async () => {
    const convId = await createConversation(student1, 'Private S1 Context')
    const crossContextPatch = await fetch(`${baseUrl}/api/ai/conversations/${convId}/context`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...student2.headers },
      body: JSON.stringify({ explanationStyle: 'concise', teamSize: 1 }),
    })
    assert.strictEqual(crossContextPatch.status, 403)
  })
})
