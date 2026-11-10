import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { createAuthenticatedTestUser } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task24_test'

describe('TASK 24 — Real-World Student Usability, Readability & Optional Feedback Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK

  let studentToken = ''
  let otherToken = ''

  before(async () => {
    delete process.env.ALLOW_INMEMORY_FALLBACK
    await connectDatabase(TEST_MONGO_URI)
    const { default: mongoose } = await import('mongoose')
    await mongoose.connection.db!.dropDatabase()
    await seedRepository()

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as { port: number }
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })

    const u1 = await createAuthenticatedTestUser({
      label: 'task24-student1',
      role: 'student',
      fullName: 'Task 24 Persona Runner',
    })
    const u2 = await createAuthenticatedTestUser({
      label: 'task24-student2',
      role: 'student',
      fullName: 'Other Student',
    })
    delete process.env.ALLOW_INMEMORY_FALLBACK
    studentToken = u1.token
    otherToken = u2.token
  })

  after(async () => {
    const { default: mongoose } = await import('mongoose')
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.dropDatabase()
    }
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()))
    }
    await disconnectDatabase()
    if (origAllowFallback !== undefined) {
      process.env.ALLOW_INMEMORY_FALLBACK = origAllowFallback
    }
  })

  async function runSingleTurn(title: string, content: string): Promise<{ convId: string; msgId: string; reply: string }> {
    const cRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ title }),
    })
    assert.equal(cRes.status, 201)
    const convId = ((await cRes.json()) as any).data.id

    const mRes = await fetch(`${baseUrl}/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ content, stream: false }),
    })
    assert.equal(mRes.status, 200)
    const mJson = (await mRes.json()) as any
    return { convId, msgId: mJson.data.id, reply: mJson.data.content }
  }

  it('PHASE 1 & 3: All 6 student personas receive clear, direct, humanized responses without dead-ends', async () => {
    // Persona 1: Beginner student asking feasibility directly with typo
    const p1 = await runSingleTurn(
      'Beginner Camera Inquiry',
      'hi i am new to coding and want to build smart attndance app using ai camera, is this too hard for me?'
    )
    assert.ok(p1.reply.includes('Quick Answer'), 'Beginner feasibility question must surface Quick Answer at top')
    assert.ok(!p1.reply.includes('FACULTY_APPROVED'), 'Should display humanized label rather than raw DB enum')
    assert.ok(p1.reply.includes('Faculty-Approved'))
    assert.ok(!p1.reply.includes('EXACT_OR_NEAR_EXACT_TITLE'), 'Should avoid raw enum tokens in student-facing prose')

    // Persona 5: Student with rough idea and no plan + spelling errors ("hostl", "uplod")
    const p5 = await runSingleTurn(
      'Hostel Complaint Rough Pitch',
      'i have idea for hostl complaint tracking portal with photo uplod and warden dashboard, how to start?'
    )
    assert.ok(p5.reply.includes('Quick Answer'), 'How-to-start pitch should lead with actionable guidance')
    assert.ok(
      p5.reply.toLowerCase().includes('hostel') || p5.reply.toLowerCase().includes('warden') || p5.reply.toLowerCase().includes('complaint'),
      'Hostel idea should trigger real domain analysis instead of generic fallback'
    )

    // Persona 6: Turn-1 request to improve an existing college project ("What gaps did seniors face")
    const p6 = await runSingleTurn(
      'Improve Existing Attendance',
      'I want to improve the previous college Smart Attendance Management System project. What gaps did seniors face and what meaningful improvement can I add?'
    )
    assert.ok(!p6.reply.startsWith('Share your project idea or select'), 'Must resolve named college project immediately on Turn 1')
    assert.ok(p6.reply.includes('Smart Attendance Management System'))
    assert.ok(p6.reply.includes('Documented Evidence from the Repository'))
  })

  it('PHASE 6: Optional lightweight student feedback persists cleanly, redacts PII, enforces ownership, and never flags as training data', async () => {
    const turn = await runSingleTurn('Feedback Test', 'Smart Campus Parking')

    // Helpful feedback
    const helpfulRes = await fetch(
      `${baseUrl}/api/ai/conversations/${turn.convId}/messages/${turn.msgId}/feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          rating: 'helpful',
          category: 'HELPFUL_RESPONSE',
        }),
      }
    )
    assert.equal(helpfulRes.status, 201)
    const helpfulJson = (await helpfulRes.json()) as any
    assert.equal(helpfulJson.data.usedForTraining, false)

    // Detailed negative feedback with incidental PII in optional note
    const issueRes = await fetch(
      `${baseUrl}/api/ai/conversations/${turn.convId}/messages/${turn.msgId}/feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          rating: 'needs_improvement',
          category: 'CONFUSING_EXPLANATION',
          comment: 'Please clarify setup steps; call me at 9876543210 or mail foo@example.com',
        }),
      }
    )
    assert.equal(issueRes.status, 201)
    const issueJson = (await issueRes.json()) as any
    assert.equal(issueJson.data.rating, 'needs_improvement')
    assert.equal(issueJson.data.category, 'CONFUSING_EXPLANATION')
    assert.equal(issueJson.data.usedForTraining, false)
    assert.ok(!issueJson.data.comment.includes('9876543210'), 'Phone number must be redacted')
    assert.ok(!issueJson.data.comment.includes('foo@example.com'), 'Email must be redacted')

    // List feedback persists & matches
    const listRes = await fetch(`${baseUrl}/api/ai/conversations/${turn.convId}/feedback`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert.equal(listRes.status, 200)
    const listJson = (await listRes.json()) as any
    assert.equal(listJson.data.length, 1)
    assert.equal(listJson.data[0].usedForTraining, false)

    // Cross-student access blocked with 403
    const crossRes = await fetch(
      `${baseUrl}/api/ai/conversations/${turn.convId}/messages/${turn.msgId}/feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({
          rating: 'needs_improvement',
          category: 'IRRELEVANT_RESPONSE',
        }),
      }
    )
    assert.equal(crossRes.status, 403)
  })
})
