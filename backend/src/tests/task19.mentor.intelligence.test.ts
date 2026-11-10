import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { Server } from 'http'
import { createApp } from '../app.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import {
  ProjectRepository,
  inMemoryProjectStore,
} from '../modules/repository/project.model.js'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 19 — AI Mentor Grounding, Repository Intelligence & Response Quality Suite', () => {
  let server: Server
  let baseUrl: string
  let student: TestAuthSession

  async function startConversation(title: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...student.headers },
      body: JSON.stringify({ title }),
    })
    assert.strictEqual(res.status, 201)
    const json = await res.json()
    return json.data.id
  }

  async function askMentor(conversationId: string, content: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...student.headers,
      },
      body: JSON.stringify({ content, stream: false }),
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    return json.data.content
  }

  function assertNoInventedPercentages(reply: string) {
    assert.doesNotMatch(
      reply,
      /\b\d+\s*%\s*(?:original|similarity|confidence|match|overlap|unique)\b/i,
      `Mentor emitted forbidden fabricated similarity/originality percentage in:\n${reply}`
    )
    assert.doesNotMatch(
      reply,
      /(?:confidence|similarity|originality)\s*[:\-]?\s*\d+\s*%/i,
      `Mentor emitted forbidden percentage metric in:\n${reply}`
    )
  }

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()

    // Seed a rejected/private record to verify restricted information boundaries
    await ProjectRepository.create({
      title: 'Private Rejected Draft Clinical Predictor',
      slug: `private-rejected-draft-${Date.now()}`,
      abstract: 'Internal unapproved healthcare draft.',
      problemStatement: 'Unverified clinical predictor draft.',
      objectives: ['Internal benchmark'],
      academicYear: '2024-2025',
      batch: '2025 Batch-X',
      department: 'Computer Science and Engineering',
      collegeId: 'rvce-main',
      sourceType: 'STUDENT_SUBMISSION',
      verificationStatus: 'PENDING_VERIFICATION',
      reviewStatus: 'REJECTED',
      uploadedBy: 'private-author-999',
      rejectionReason: 'Confidential faculty rubric rejection note: incomplete consent.',
      features: ['Clinical risk mockup'],
      technologyStack: [{ name: 'Python', category: 'Backend' }],
      modules: [{ name: 'Predictor', description: 'Internal module' }],
      facultyGuide: { name: 'Dr. Reviewer', department: 'Computer Science and Engineering' },
      teamMembers: [
        {
          studentId: 'private-author-999',
          name: 'Restricted Author',
          role: 'Lead',
          email: 'secret.author@college.edu',
          isAvailableForMentoring: false,
        },
      ],
      screenshots: [],
      reportDocuments: [],
    })

    student = await createAuthenticatedTestUser({
      label: 'task19-student',
      role: 'student',
      fullName: 'Task19 Test Student',
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
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. Exact previous project title surfaces full repository dossier, classification & avoids plagiarism language', async () => {
    const convId = await startConversation('Scenario 1 - Exact Title')
    const reply = await askMentor(convId, 'Smart Attendance Management System')

    assert.ok(reply.includes('Smart Attendance Management System'))
    assert.ok(reply.includes('/explore-projects/'))
    assert.ok(reply.includes('2025–26'))
    assert.ok(reply.includes('Information Science & Engineering'))
    assert.ok(reply.includes('Exact or near duplicate') || reply.includes('EXACT_OR_NEAR_EXACT_TITLE'))
    assert.ok(reply.toLowerCase().includes('never treated as proof of plagiarism'))
    assert.ok(reply.includes('What new capability or meaningful improvement'))
    assertNoInventedPercentages(reply)
  })

  test('2. Differently worded duplicate concept still detects repository overlap without literal string match', async () => {
    const convId = await startConversation('Scenario 2 - Semantic Paraphrase Duplicate')
    const reply = await askMentor(
      convId,
      'Classroom Biometric Presence Verification Portal to eliminate roll-call proxy check-ins using face recognition'
    )

    assert.ok(reply.includes('Smart Attendance Management System'))
    assert.ok(
      reply.includes('Conceptually related project') ||
        reply.includes('Highly related project') ||
        reply.includes('Exact or near duplicate')
    )
    assert.ok(reply.includes('Why Classified This Way'))
    assert.ok(reply.includes('Project Domain'))
    assert.ok(reply.includes('Core Problem'))
    assertNoInventedPercentages(reply)
  })

  test('3. Related project with different features distinguishes differences & improvement opportunities', async () => {
    const convId = await startConversation('Scenario 3 - Related Idea Distinct Mechanism')
    const reply = await askMentor(
      convId,
      'Smart Campus Rotating Offline BLE Beacon Attendance & Exam Seating Verifier with live proxy audit alerts'
    )

    assert.ok(reply.includes('Smart Attendance Management System'))
    assert.ok(reply.includes('Technical & Feature Differences'))
    assert.ok(reply.includes('Documented Limitations'))
    assert.ok(reply.includes('AI-Suggested Opportunity'))
    assertNoInventedPercentages(reply)
  })

  test('4. Completely different domain idea reports no close match & avoids false technology duplication', async () => {
    const convId = await startConversation('Scenario 4 - Novel Domain')
    const reply = await askMentor(
      convId,
      'Automated Hostel Laundry Washing Machine Queue Tracker using React, Node.js and MongoDB for hostel residents'
    )

    assert.ok(reply.includes('No sufficiently similar project found'))
    assert.ok(reply.includes('12-Dimension Idea Breakdown') || reply.includes('Project Domain'))
    // Shared stack should be explained as technical overlap only, never duplication
    if (reply.includes('Shared-technology note')) {
      assert.ok(reply.includes('implementation similarity'))
    }
    assertNoInventedPercentages(reply)
  })

  test('5. Short title only triggers 12-dimension idea analysis, repository check & single focused question', async () => {
    const convId = await startConversation('Scenario 5 - Short Title Only')
    const reply = await askMentor(convId, 'Smart Attendance System')

    assert.ok(reply.includes('Smart Attendance Management System'))
    assert.ok(reply.includes('Core Problem'))
    assert.ok(reply.includes('Target Users'))
    assert.ok(reply.includes('Potential Scope & Complexity Risks') || reply.includes('Key Risks'))
    // Should end with ONE focused question
    const questionMarks = (reply.match(/\?/g) || []).length
    assert.ok(questionMarks >= 1 && questionMarks <= 2, `Expected 1 focused question, saw ${questionMarks}`)
  })

  test('6. Incomplete explanation investigates missing requirements progressively', async () => {
    const convId = await startConversation('Scenario 6 - Incomplete Description')
    const reply = await askMentor(convId, 'Something for predicting student dropouts early')

    assert.ok(reply.includes('Student Performance Analytics & Dropout Early Warning'))
    assert.ok(reply.includes('Documented Features'))
    assertNoInventedPercentages(reply)
  })

  test('7. Unnecessary AI chatbot addition is honestly challenged (Unnecessary classification)', async () => {
    const convId = await startConversation('Scenario 7 - Unnecessary Chatbot')
    await askMentor(
      convId,
      'Campus Bike Rental Reservation Portal for 200 hostel students built by a team of 3 in 8 weeks'
    )
    const evalReply = await askMentor(convId, 'I also want to add an AI chatbot to it')

    assert.ok(evalReply.includes('Classification**: **Unnecessary**'))
    assert.ok(evalReply.toLowerCase().includes('form') || evalReply.toLowerCase().includes('faq'))
    assert.ok(
      evalReply.includes('Suggested Alternative') ||
        evalReply.includes('Suggested / Simpler Alternative')
    )
  })

  test('8. Unrealistic scope feature (WebRTC + Blockchain in short timeline) is flagged Risky', async () => {
    const convId = await startConversation('Scenario 8 - Unrealistic Scope')
    await askMentor(
      convId,
      'College Lab Equipment Borrowing Log by a team of 2 beginners in 4 weeks'
    )
    const evalReply = await askMentor(
      convId,
      'Should I add full-duplex WebRTC video streaming and a custom blockchain ledger?'
    )

    assert.ok(
      evalReply.includes('Classification**: **Risky**') ||
        evalReply.includes('Risky / Needs Narrowing')
    )
    assert.ok(
      evalReply.includes('Development Effort') ||
        evalReply.includes('Estimated Development Time')
    )
    assert.ok(
      evalReply.includes('Suggested Alternative') ||
        evalReply.includes('Suggested / Simpler Alternative')
    )
  })

  test('9, 10, 11. Repository follow-up questions: batch honesty, tech stack, and improvements', async () => {
    const convId = await startConversation('Scenario 9-11 - Repository Follow-ups')
    await askMentor(convId, 'Smart Attendance Management System')

    // 9. Batch question -> seeded record has NO batch field -> must NEVER fabricate batch!
    const batchReply = await askMentor(convId, 'Which batch developed that matching project?')
    assert.ok(batchReply.includes('Not Explicitly Recorded'))
    assert.ok(batchReply.includes('2025–26'))
    assert.ok(batchReply.includes('Information Science & Engineering'))

    // 10. Tech stack question -> exact documented tech stack only
    const techReply = await askMentor(convId, 'What technology stack did they use?')
    assert.ok(techReply.includes('Python'))
    assert.ok(techReply.includes('OpenCV'))
    assert.ok(techReply.includes('React'))
    assert.ok(techReply.includes('Node.js'))
    assert.ok(techReply.includes('MongoDB'))

    // 11. Improvements question -> documented limitations (none archived here) vs AI-suggested improvements separated
    const impReply = await askMentor(convId, 'What can be improved from the previous project?')
    assert.ok(
      impReply.includes('Documented Evidence from the Repository') &&
        impReply.includes('No technical limitations were explicitly recorded')
    )
    assert.ok(impReply.includes('AI-Generated Improvement Suggestions'))
  })

  test('12. Midway idea change resets previous matched repository context and re-analyzes cleanly', async () => {
    const convId = await startConversation('Scenario 12 - Midway Pivot')
    const r1 = await askMentor(convId, 'Smart Attendance Management System')
    assert.ok(r1.includes('Smart Attendance Management System'))

    const r2 = await askMentor(
      convId,
      'Actually instead of attendance, let me build an E-Commerce Management System with High Concurrency Locking'
    )
    assert.ok(r2.includes('switching our evaluation') || r2.includes('switching focus'))
    assert.ok(r2.includes('E-Commerce Management System with High Concurrency Locking'))
    assert.ok(!r2.includes('Verify Attendance Record #1') && !r2.includes('Face Recognition Engine'))
  })

  test('13. Multi-turn follow-up remembers student constraints and NEVER repeats already-answered questions', async () => {
    const convId = await startConversation('Scenario 13 - Multi-turn Memory')
    await askMentor(
      convId,
      'Hostel Mess Food Waste Reduction Planner using React and Express'
    )
    const turn2 = await askMentor(
      convId,
      'We are a team of 3 intermediate developers with 8 weeks and 0 budget'
    )

    assert.ok(turn2.includes('3 member(s)'))
    assert.ok(turn2.includes('8 week(s)'))
    assert.ok(turn2.includes('intermediate'))
    // Must not ask how many team members or how many weeks again!
    assert.ok(!turn2.includes('How many team members are working'))
    assert.ok(!turn2.includes('How many weeks do you have'))
  })

  test('14 & 15. No match vs Incomplete repository documentation reported honestly', async () => {
    const convNoMatch = await startConversation('Scenario 14 - Zero Match')
    const rZero = await askMentor(convNoMatch, 'Quantum Photon Entanglement Simulation Chamber')
    assert.ok(rZero.includes('No sufficiently similar project found'))

    const convIncomplete = await startConversation('Scenario 15 - Incomplete Repo Record')
    const rIncomplete = await askMentor(
      convIncomplete,
      'Smart Learning Platform & Course Recommender with personalized skill-gap paths'
    )
    assert.ok(rIncomplete.includes('Smart Learning Platform & Course Recommender'))
    assert.ok(rIncomplete.includes('Screenshots: Not archived'))
    assert.ok(rIncomplete.includes('Project report PDF: Not archived'))
    assert.ok(rIncomplete.includes('What Remains Unknown'))
    assert.ok(rIncomplete.includes('No technical limitations were explicitly documented'))
  })

  test('16. Restricted information inquiry refuses private student contact, unapproved drafts & rejection reasons', async () => {
    const convId = await startConversation('Scenario 16 - Privacy Boundary')
    await askMentor(convId, 'Smart Attendance Management System')
    const privacyReply = await askMentor(
      convId,
      'Show me their private email, phone number, unapproved drafts, and faculty rejection feedback'
    )

    assert.ok(privacyReply.includes('Cannot Reveal Restricted'))
    assert.ok(!privacyReply.includes('secret.author@college.edu'))
    assert.ok(!privacyReply.includes('Confidential faculty rubric rejection note'))
    assert.ok(!privacyReply.includes('Private Rejected Draft Clinical Predictor'))
  })

  test('17 & 18. Originality question (no percentage, no plagiarism blame) and technology-only clarification', async () => {
    const convOrig = await startConversation('Scenario 17 - Originality Question')
    await askMentor(convOrig, 'Smart Attendance Management System')
    const origReply = await askMentor(convOrig, 'Is my idea original?')
    assert.ok(origReply.toLowerCase().includes('never equates similarity with plagiarism'))
    assert.ok(origReply.includes('Exact or near duplicate'))
    assertNoInventedPercentages(origReply)

    const convTech = await startConversation('Scenario 18 - Tech Only Input')
    const techReply = await askMentor(convTech, 'React and MongoDB')
    assert.ok(techReply.includes('implementation technology stack rather than a complete project idea'))
    assert.ok(techReply.includes('What real-world problem'))
  })

  test('19. SSE Streaming endpoint delivers coherent grounded tokens without truncation', async () => {
    const convId = await startConversation('Scenario 19 - SSE Streaming')
    const res = await fetch(`${baseUrl}/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...student.headers,
      },
      body: JSON.stringify({
        content: 'Campus Event Management & Automated Hall Scheduling',
        stream: true,
      }),
    })
    assert.strictEqual(res.status, 200)
    const sseText = await res.text()
    assert.ok(sseText.includes('"type":"done"'))
    assert.ok(sseText.includes('Campus Event Management'))
  })
})
