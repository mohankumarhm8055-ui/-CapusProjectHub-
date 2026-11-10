import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { createApp } from '../app.js'
import { Server } from 'http'
import {
  inMemoryProfileStore,
  inMemoryConnectionStore,
  inMemoryMessageStore,
  inMemoryNotificationStore,
} from '../modules/connections/connection.model.js'
import { intentClassifier } from '../modules/ai/conversational-engine/intent.classifier.js'
import { conversationalEngine } from '../modules/ai/conversational-engine/conversational.engine.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

describe('TASK 9 — Senior-Junior Connection Intelligence Test Suite', () => {
  let server: Server
  let baseUrl: string
  const port = 5058

  let juniorSam: TestAuthSession
  let seniorAlex: TestAuthSession
  let seniorPriya: TestAuthSession
  let hackerUser: TestAuthSession

  before(async () => {
    inMemoryProfileStore.clear()
    inMemoryConnectionStore.clear()
    inMemoryMessageStore.clear()
    inMemoryNotificationStore.clear()

    juniorSam = await createAuthenticatedTestUser({
      label: 'sam-lee',
      role: 'student',
      fullName: 'Sam Lee',
    })
    seniorAlex = await createAuthenticatedTestUser({
      label: 'alex-chen',
      role: 'student',
      fullName: 'Alex Chen',
    })
    seniorPriya = await createAuthenticatedTestUser({
      label: 'priya-patel',
      role: 'student',
      fullName: 'Priya Patel',
    })
    hackerUser = await createAuthenticatedTestUser({
      label: 'hacker-imposter',
      role: 'student',
      fullName: 'Hacker Imposter',
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => {
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })

    // Configure Alex & Priya mentor profiles via their authenticated /profile/me endpoints
    await fetch(`${baseUrl}/api/connections/profile/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...seniorAlex.headers },
      body: JSON.stringify({
        displayName: 'Alex Chen',
        department: 'Computer Science and Engineering',
        isAvailableForMentoring: true,
        skills: ['React', 'Node.js', 'MongoDB', 'System Design'],
        email: 'alex.chen@campusprojecthub.edu',
        phone: '+1 (555) 234-5678',
      }),
    })

    await fetch(`${baseUrl}/api/connections/profile/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...seniorPriya.headers },
      body: JSON.stringify({
        displayName: 'Priya Patel',
        department: 'Computer Science and Engineering',
        isAvailableForMentoring: true,
        skills: ['Python', 'FastAPI', 'PyTorch', 'Jaccard Similarity'],
      }),
    })
  })

  after(async () => {
    inMemoryProfileStore.clear()
    inMemoryConnectionStore.clear()
    inMemoryMessageStore.clear()
    inMemoryNotificationStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. Profile retrieval respects strict default privacy for public view', async () => {
    const res = await fetch(`${baseUrl}/api/connections/profile/${seniorAlex.id}`, {
      headers: juniorSam.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.displayName, 'Alex Chen')
    assert.strictEqual(json.data.isAvailableForMentoring, true)
    assert.ok(Array.isArray(json.data.skills))
    assert.strictEqual(json.data.email, undefined)
    assert.strictEqual(json.data.phone, undefined)
  })

  test('2. Senior retrieving own profile receives complete contact data', async () => {
    const res = await fetch(`${baseUrl}/api/connections/profile/me`, {
      headers: seniorAlex.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.displayName, 'Alex Chen')
    assert.strictEqual(json.data.email, 'alex.chen@campusprojecthub.edu')
    assert.strictEqual(json.data.phone, '+1 (555) 234-5678')
  })

  test('3. Student can update mentorship availability and skills profile', async () => {
    const res = await fetch(`${baseUrl}/api/connections/profile/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        displayName: 'Sam Lee',
        department: 'Information Science',
        isAvailableForMentoring: true,
        skills: ['TypeScript', 'GraphQL', 'Docker'],
        bio: 'Interested in mentoring freshmen in web architecture.',
      }),
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.displayName, 'Sam Lee')
    assert.strictEqual(json.data.isAvailableForMentoring, true)
    assert.deepStrictEqual(json.data.skills, ['TypeScript', 'GraphQL', 'Docker'])
  })

  let activeRequestId: string

  test('4. Junior submits valid connection request in PENDING status', async () => {
    const res = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        projectId: 'proj_cph_academic_01',
        projectTitle: 'CampusProjectHub Capstone',
        seniorId: seniorAlex.id,
        seniorName: 'Alex Chen',
        purpose: 'UNDERSTAND_ARCHITECTURE',
        note: 'Hello Alex, our team is studying your microservices and SSE design for our semester capstone. Would love 15 minutes of guidance on database schemas.',
      }),
    })
    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.status, 'PENDING')
    assert.strictEqual(json.data.juniorId, juniorSam.id)
    assert.strictEqual(json.data.seniorId, seniorAlex.id)
    assert.strictEqual(json.data.purpose, 'UNDERSTAND_ARCHITECTURE')
    activeRequestId = json.data.id
    assert.ok(activeRequestId)
  })

  test('5. Self-connection request is strictly prohibited', async () => {
    const res = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...seniorAlex.headers,
      },
      body: JSON.stringify({
        projectId: 'proj_cph_academic_01',
        projectTitle: 'CampusProjectHub Capstone',
        seniorId: seniorAlex.id,
        seniorName: 'Alex Chen',
        purpose: 'SEEK_MENTORSHIP',
        note: 'Attempting to mentor myself for testing purposes.',
      }),
    })
    assert.strictEqual(res.status, 400)
    const json = await res.json()
    assert.strictEqual(json.success, false)
    assert.strictEqual(json.error.code, 'SELF_CONNECTION_PROHIBITED')
  })

  test('6. Request to unavailable senior is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        projectId: 'proj_robotics_02',
        projectTitle: 'Autonomous Campus Shuttle',
        seniorId: 'senior-marcus-vance',
        seniorName: 'Marcus Vance',
        purpose: 'LEARN_TECH_STACK',
        note: 'Interested in LiDAR sensor fusion and SLAM algorithm details.',
      }),
    })
    assert.strictEqual(res.status, 400)
    const json = await res.json()
    assert.strictEqual(json.success, false)
    assert.strictEqual(json.error.code, 'MENTOR_UNAVAILABLE')
  })

  test('7. Duplicate PENDING request for same senior and project is rejected (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        projectId: 'proj_cph_academic_01',
        projectTitle: 'CampusProjectHub Capstone',
        seniorId: seniorAlex.id,
        seniorName: 'Alex Chen',
        purpose: 'DISCUSS_EXTENSION',
        note: 'Sending a duplicate request before the first one is resolved.',
      }),
    })
    assert.strictEqual(res.status, 409)
    const json = await res.json()
    assert.strictEqual(json.success, false)
    assert.strictEqual(json.error.code, 'DUPLICATE_PENDING_REQUEST')
  })

  test('8. Messaging is locked while connection is in PENDING state', async () => {
    const res = await fetch(`${baseUrl}/api/connections/${activeRequestId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        content: 'Hi Alex, are you available today?',
      }),
    })
    assert.strictEqual(res.status, 403)
    const json = await res.json()
    assert.strictEqual(json.success, false)
    assert.strictEqual(json.error.code, 'COMMUNICATION_LOCKED')
  })

  test('9. Unauthorized user cannot accept senior request', async () => {
    const res = await fetch(`${baseUrl}/api/connections/${activeRequestId}/accept`, {
      method: 'PATCH',
      headers: hackerUser.headers,
    })
    assert.strictEqual(res.status, 403)
    const json = await res.json()
    assert.strictEqual(json.success, false)
  })

  test('10. Senior accepts request -> transitions to ACCEPTED', async () => {
    const res = await fetch(`${baseUrl}/api/connections/${activeRequestId}/accept`, {
      method: 'PATCH',
      headers: seniorAlex.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.status, 'ACCEPTED')
  })

  let sentMessageId: string

  test('11. Direct messaging is enabled when connection is ACCEPTED', async () => {
    const res1 = await fetch(`${baseUrl}/api/connections/${activeRequestId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        senderName: 'Sam Lee',
        content: 'Hi Alex! Thank you for accepting my request. Could you clarify how you handle proposal versioning?',
      }),
    })
    assert.strictEqual(res1.status, 201)
    const json1 = await res1.json()
    assert.strictEqual(json1.success, true)
    assert.strictEqual(json1.data.senderId, juniorSam.id)
    assert.strictEqual(json1.data.senderRole, 'junior')
    sentMessageId = json1.data.id

    const res2 = await fetch(`${baseUrl}/api/connections/${activeRequestId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...seniorAlex.headers,
      },
      body: JSON.stringify({
        senderName: 'Alex Chen',
        content: 'Glad to help Sam! We store proposal versions as immutable snapshots with changelog diffs in MongoDB.',
      }),
    })
    assert.strictEqual(res2.status, 201)
  })

  test('12. Both participants can retrieve messages in chronological order and mark as read', async () => {
    const res = await fetch(`${baseUrl}/api/connections/${activeRequestId}/messages`, {
      headers: seniorAlex.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.length, 2)
    assert.strictEqual(json.data[0].id, sentMessageId)

    const readRes = await fetch(`${baseUrl}/api/connections/${activeRequestId}/messages/read`, {
      method: 'PATCH',
      headers: seniorAlex.headers,
    })
    assert.strictEqual(readRes.status, 200)
    const readJson = await readRes.json()
    assert.strictEqual(readJson.success, true)
    assert.strictEqual(readJson.markedCount, 1)
  })

  test('13. Notifications are generated and can be retrieved & marked as read', async () => {
    const res = await fetch(`${baseUrl}/api/connections/notifications`, {
      headers: seniorAlex.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.length >= 2)
    assert.ok(json.data.some((n: any) => n.type === 'CONNECTION_REQUEST_RECEIVED'))
    assert.ok(json.data.some((n: any) => n.type === 'NEW_MESSAGE_RECEIVED'))

    const markRes = await fetch(`${baseUrl}/api/connections/notifications/read-all`, {
      method: 'PATCH',
      headers: seniorAlex.headers,
    })
    assert.strictEqual(markRes.status, 200)
    const markJson = await markRes.json()
    assert.strictEqual(markJson.success, true)
    assert.ok(markJson.markedCount >= 2)
  })

  test('14. Junior can cancel their own PENDING request', async () => {
    const createRes = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        projectId: 'proj_cph_academic_01',
        projectTitle: 'CampusProjectHub Capstone',
        seniorId: seniorPriya.id,
        seniorName: 'Priya Patel',
        purpose: 'LEARN_TECH_STACK',
        note: 'Hi Priya, I want to ask about your Jaccard similarity implementation.',
      }),
    })
    assert.strictEqual(createRes.status, 201)
    const createJson = await createRes.json()
    const priyaRequestId = createJson.data.id

    const cancelRes = await fetch(`${baseUrl}/api/connections/${priyaRequestId}/cancel`, {
      method: 'PATCH',
      headers: juniorSam.headers,
    })
    assert.strictEqual(cancelRes.status, 200)
    const cancelJson = await cancelRes.json()
    assert.strictEqual(cancelJson.success, true)
    assert.strictEqual(cancelJson.data.status, 'CANCELLED')
  })

  test('15. Senior can decline a PENDING request with reason', async () => {
    const createRes = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        projectId: 'proj_cph_academic_01',
        projectTitle: 'CampusProjectHub Capstone',
        seniorId: seniorPriya.id,
        seniorName: 'Priya Patel',
        purpose: 'ACCESS_DOCUMENTATION',
        note: 'Requesting access to supplementary dataset files.',
      }),
    })
    assert.strictEqual(createRes.status, 201)
    const createJson = await createRes.json()
    const reqId = createJson.data.id

    const declineRes = await fetch(`${baseUrl}/api/connections/${reqId}/decline`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...seniorPriya.headers,
      },
      body: JSON.stringify({
        reason: 'Currently occupied with final term deliverables.',
      }),
    })
    assert.strictEqual(declineRes.status, 200)
    const declineJson = await declineRes.json()
    assert.strictEqual(declineJson.success, true)
    assert.strictEqual(declineJson.data.status, 'DECLINED')
    assert.strictEqual(declineJson.data.declinedReason, 'Currently occupied with final term deliverables.')
  })

  test('16. Blocking connection transitions to BLOCKED and prohibits further messaging', async () => {
    const blockRes = await fetch(`${baseUrl}/api/connections/${activeRequestId}/block`, {
      method: 'PATCH',
      headers: seniorAlex.headers,
    })
    assert.strictEqual(blockRes.status, 200)
    const blockJson = await blockRes.json()
    assert.strictEqual(blockJson.data.status, 'BLOCKED')

    const msgRes = await fetch(`${baseUrl}/api/connections/${activeRequestId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...juniorSam.headers,
      },
      body: JSON.stringify({
        content: 'Can you still help me?',
      }),
    })
    assert.strictEqual(msgRes.status, 403)
    const msgJson = await msgRes.json()
    assert.strictEqual(msgJson.error.code, 'COMMUNICATION_LOCKED')
  })

  test('17. AI Mentor classifies student inquiry as SENIOR_CONNECTION_INQUIRY', () => {
    const intent1 = intentClassifier.classifyIntent('Can I connect with the seniors who made CampusProjectHub?', {
      conversationId: 'test_c1',
      mode: 'CAMPUSPROJECTHUB_INTRO',
      studentObjectives: [],
      proposedFeatures: [],
      acceptedRecommendations: [],
      rejectedRecommendations: [],
      technicalExperience: 'intermediate',
      preferredTechnologies: [],
      currentDiscussionStage: 'GENERAL',
      topicsDiscussed: [],
      introSectionIndex: 0,
    })
    assert.strictEqual(intent1, 'SENIOR_CONNECTION_INQUIRY')

    const intent2 = intentClassifier.classifyIntent('How do I request mentorship from the authors?', {
      conversationId: 'test_c2',
      mode: 'GENERAL_MENTORING',
      studentObjectives: [],
      proposedFeatures: [],
      acceptedRecommendations: [],
      rejectedRecommendations: [],
      technicalExperience: 'intermediate',
      preferredTechnologies: [],
      currentDiscussionStage: 'GENERAL',
      topicsDiscussed: [],
      introSectionIndex: 0,
    })
    assert.strictEqual(intent2, 'SENIOR_CONNECTION_INQUIRY')
  })

  test('18. AI Mentor responds with guidance, draft request note, and strict privacy protection', async () => {
    const conv = await conversationService.createConversation('student-tester', 'Mentorship Inquiry Consultation')
    const turn = await conversationalEngine.processTurn(
      conv.id,
      'student-tester',
      'Can I connect with the seniors who made CampusProjectHub?'
    )

    assert.strictEqual(turn.intent, 'SENIOR_CONNECTION_INQUIRY')
    assert.ok(turn.responseMarkdown.includes('Senior-Junior') || turn.responseMarkdown.includes('Senior–Junior'))
    assert.ok(turn.responseMarkdown.includes('Alex Chen'))
    assert.ok(turn.responseMarkdown.includes('Priya Patel'))
    assert.ok(turn.responseMarkdown.includes('Academic Etiquette & Guidelines'))
    assert.ok(turn.responseMarkdown.includes('Structured Request Draft'))
    assert.ok(turn.responseMarkdown.includes('Privacy Protection'))
    assert.ok(turn.responseMarkdown.includes('cannot send connection requests on your behalf'))
    assert.ok(turn.responseMarkdown.includes('Request Guidance'))
    assert.ok(Array.isArray(turn.suggestedFollowUps))
  })
})
