import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { createApp } from '../app.js'
import { Server } from 'http'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

describe('AI Project Mentor Backend API Test Suite', () => {
  let server: Server
  let baseUrl: string
  const port = 5055
  let student1: TestAuthSession
  let student2: TestAuthSession

  before(async () => {
    student1 = await createAuthenticatedTestUser({
      label: 'ai-student-101',
      role: 'student',
      fullName: 'Student 101',
    })
    student2 = await createAuthenticatedTestUser({
      label: 'ai-student-202',
      role: 'student',
      fullName: 'Student 202',
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
    await inMemoryConversationStore.clear()
    await inMemoryMessageStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. GET /api/ai/status should return system identity and streaming capability', async () => {
    const res = await fetch(`${baseUrl}/api/ai/status`)
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.identity, 'AI Project Mentor — Your Honest Academic Project Guide')
    assert.strictEqual(json.data.streamingSupported, true)
    assert.strictEqual(json.data.repositoryIntelligence, 'active')
  })

  test('2. POST /api/ai/conversations should create a conversation for authenticated student', async () => {
    const res = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ title: 'Capstone Feasibility Discussion' }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.title, 'Capstone Feasibility Discussion')
    assert.strictEqual(json.data.ownerId, student1.id)
    assert.ok(json.data.id)
  })

  test('3. GET /api/ai/conversations should list only conversations belonging to the student', async () => {
    const res1 = await fetch(`${baseUrl}/api/ai/conversations`, {
      headers: student1.headers,
    })
    const json1 = await res1.json()
    assert.strictEqual(json1.success, true)
    assert.ok(json1.data.length >= 1)
    assert.strictEqual(json1.data[0].ownerId, student1.id)

    const res2 = await fetch(`${baseUrl}/api/ai/conversations`, {
      headers: student2.headers,
    })
    const json2 = await res2.json()
    assert.strictEqual(json2.success, true)
    assert.strictEqual(json2.data.length, 0)
  })

  test('4. Conversation Ownership: Student 202 cannot read or modify Student 101 conversation', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ title: 'Private Research' }),
    })
    const { data: conv } = await createRes.json()

    const getRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}`, {
      headers: student2.headers,
    })
    assert.strictEqual(getRes.status, 403)

    const patchRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student2.headers,
      },
      body: JSON.stringify({ title: 'Hacked Title' }),
    })
    assert.strictEqual(patchRes.status, 403)
  })

  test('5. POST /api/ai/conversations/:id/messages (Non-Streaming) generates educational response', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({}),
    })
    const { data: conv } = await createRes.json()

    const msgRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        content: 'Is an automated attendance system with face recognition feasible for our semester project?',
        stream: false,
      }),
    })

    assert.strictEqual(msgRes.status, 200)
    const json = await msgRes.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.role, 'assistant')
    assert.ok(json.data.content.includes('Academic'))
    assert.ok(json.data.content.includes('repository search intelligence is'))

    const listRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}`, {
      headers: student1.headers,
    })
    const listJson = await listRes.json()
    assert.strictEqual(listJson.data.messages.length, 2)
  })

  test('6. POST /api/ai/conversations/:id/messages (SSE Streaming) streams tokens in real-time', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ title: 'Streaming Test' }),
    })
    const { data: conv } = await createRes.json()

    const streamRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        content: 'Can you critique our system architecture?',
        stream: true,
      }),
    })

    assert.strictEqual(streamRes.status, 200)
    assert.ok(streamRes.headers.get('content-type')?.includes('text/event-stream'))

    const text = await streamRes.text()
    assert.ok(text.includes('data: {"type":"start"}'))
    assert.ok(text.includes('data: {"type":"token"'))
    assert.ok(text.includes('data: {"type":"done"'))
  })

  test('7. Validation error on empty message', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({}),
    })
    const { data: conv } = await createRes.json()

    const badRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ content: '   ' }),
    })

    assert.strictEqual(badRes.status, 400) // Zod validation failure cleanly returns 400 Bad Request
  })

  test('8. PATCH and DELETE conversation', async () => {
    const createRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ title: 'Old Title' }),
    })
    const { data: conv } = await createRes.json()

    const renameRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ title: 'Renamed Title' }),
    })
    const renameJson = await renameRes.json()
    assert.strictEqual(renameJson.data.title, 'Renamed Title')

    const deleteRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}`, {
      method: 'DELETE',
      headers: student1.headers,
    })
    assert.strictEqual(deleteRes.status, 200)

    const verifyRes = await fetch(`${baseUrl}/api/ai/conversations/${conv.id}`, {
      headers: student1.headers,
    })
    assert.strictEqual(verifyRes.status, 404)
  })
})
