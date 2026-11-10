import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { Server } from 'http'
import { createApp } from '../app.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { ProjectRepository, inMemoryProjectStore } from '../modules/repository/project.model.js'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import { inMemoryComparisonSessionStore } from '../modules/ai/comparison/comparison.model.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 22 — Advanced Project Comparison & Research Gap Intelligence Suite', () => {
  let server: Server
  let baseUrl: string
  let student1: TestAuthSession
  let student2: TestAuthSession
  let savedSessionId = ''

  async function runComparisonAPI(body: Record<string, any>, session = student1) {
    const res = await fetch(`${baseUrl}/api/ai/comparisons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...session.headers },
      body: JSON.stringify(body),
    })
    assert.strictEqual(res.status, 201)
    return (await res.json()).data
  }

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()

    // Add a second distinct verified attendance record to test Multi-Project Collective Synthesis (Scenario 2)
    await ProjectRepository.create({
      title: 'QR-Based Classroom Attendance & Roster Tracker',
      slug: `qr-attendance-tracker-${Date.now()}`,
      abstract:
        'A lightweight rotating QR attendance check-in web app for lectures with faculty roster export.',
      problemStatement:
        'Classroom attendance calls waste 10 minutes per class and suffer from paper proxy sheets.',
      objectives: ['Automate classroom attendance check-ins with expiring QR tokens'],
      features: [
        'Expiring QR attendance session codes',
        'CSV faculty roster attendance export',
      ],
      modules: [
        {
          name: 'Rotating QR Token Engine',
          description: 'Generates 20-second signed HMAC QR payloads for classroom projectors.',
        },
      ],
      technologyStack: [
        { name: 'React', category: 'Frontend' },
        { name: 'Express', category: 'Backend' },
        { name: 'MongoDB', category: 'Database' },
      ],
      limitations: ['Requires projector visibility from back rows of large halls'],
      futureEnhancements: ['Add offline queued attendance sync during Wi-Fi dropouts'],
      academicYear: '2024–25',
      department: 'Computer Science and Engineering',
      collegeId: 'rvce-main',
      teamMembers: [
        {
          studentId: 'senior-qr-1',
          name: 'Ananya Rao',
          role: 'Full Stack Lead',
          isAvailableForMentoring: true,
        },
      ],
      facultyGuide: { name: 'Dr. Kavitha S', department: 'Computer Science and Engineering' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'ADMIN_IMPORTED_HISTORICAL',
      reviewStatus: 'APPROVED',
      verificationStatus: 'VERIFIED_HISTORICAL',
      uploadedBy: 'admin-registrar',
    })

    // Seed an unapproved/rejected record to verify restricted privacy exclusion (Scenario 14)
    await ProjectRepository.create({
      title: 'Secret Unapproved Biometric Attendance Draft',
      slug: `secret-unapproved-draft-${Date.now()}`,
      abstract: 'Private unapproved attendance draft with confidential review notes.',
      problemStatement: 'Attendance automation confidential draft.',
      objectives: ['Private objective'],
      features: ['Hidden feature'],
      modules: [],
      technologyStack: [{ name: 'Python' }],
      academicYear: '2025–26',
      department: 'Computer Science and Engineering',
      collegeId: 'rvce-main',
      reviewStatus: 'REJECTED',
      verificationStatus: 'PENDING_VERIFICATION',
      rejectionReason: 'CONFIDENTIAL_REJECTION_DO_NOT_EXPOSE',
      teamMembers: [{ name: 'Secret Student', email: 'private-secret@college.edu' }],
      facultyGuide: { name: 'Dr. Hidden', department: 'CSE' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION',
      uploadedBy: 'other-student',
    })

    student1 = await createAuthenticatedTestUser({
      label: 't22-student-1',
      role: 'student',
      fullName: 'Task22 Student One',
    })
    student2 = await createAuthenticatedTestUser({
      label: 't22-student-2',
      role: 'student',
      fullName: 'Task22 Student Two',
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
    inMemoryComparisonSessionStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1, 2, 5, 14. Exact & multiple attendance matches build 12-dimension comparison, collective synthesis & exclude restricted drafts', async () => {
    const session = await runComparisonAPI({
      title: 'Smart Classroom Attendance Portal',
      description:
        'Automate classroom attendance taking using expiring BLE beacons and offline check-in queuing.',
      features: ['Offline queued attendance sync during Wi-Fi drops', 'Faculty attendance dashboard'],
      technologies: ['React', 'Node.js', 'MongoDB'],
    })

    savedSessionId = session.id
    const r = session.report

    // Matches multiple verified attendance records (FaceNet + QR), NEVER the rejected draft!
    assert.ok(r.B_relevantPreviousProjects.length >= 2)
    assert.ok(
      r.B_relevantPreviousProjects.every(
        (b: any) => !b.title.includes('Secret Unapproved')
      )
    )

    // Scenario 7: missing batch is strictly reported, never invented
    assert.ok(
      r.B_relevantPreviousProjects.every(
        (b: any) => b.batch === 'Not recorded in repository metadata'
      )
    )

    // Scenario 1/2: 12 comparison dimensions rendered for each project
    assert.strictEqual(r.C_projectByProjectComparisons[0].dimensions.length, 12)
    assert.ok(r.collectiveSynthesis.differentImplementationStrategies.length >= 2)
    assert.ok(r.collectiveSynthesis.sharedTechnologies.includes('React'))

    // Sections A-K rendered in Markdown with source links & disclaimer
    assert.ok(r.renderedMarkdown.includes('**A. Proposed Project:**'))
    assert.ok(r.renderedMarkdown.includes('**G. Research Gaps'))
    assert.ok(r.renderedMarkdown.includes('**J. Suggested Project Contribution:**'))
    assert.ok(r.renderedMarkdown.includes('**K. Next Question for You:**'))
    assert.ok(r.renderedMarkdown.includes('/explore-projects/'))
    assert.ok(!r.renderedMarkdown.includes('CONFIDENTIAL_REJECTION_DO_NOT_EXPOSE'))
    assert.ok(!r.renderedMarkdown.includes('private-secret@college.edu'))
  })

  test('3, 4, 9. Same domain different problem & shared tech stack do NOT falsely duplicate, and novel idea gives novelty disclaimer', async () => {
    const session = await runComparisonAPI({
      title: 'Deep Ocean Seismic Sensor Telemetry',
      description: 'Acoustic anomaly logging for offshore seafloor sensor arrays.',
      technologies: ['React', 'Node.js', 'MongoDB'],
    })

    const r = session.report
    assert.strictEqual(r.B_relevantPreviousProjects.length, 0)
    assert.ok(r.noveltyDisclaimer.includes('does not prove global academic novelty'))
    assert.ok(
      r.E_meaningfulDifferences.some((d: string) =>
        d.includes('implementation overlap only')
      )
    )
  })

  test('6, 8. Incomplete documentation & missing limitations are separated strictly from AI hypotheses', async () => {
    const session = await runComparisonAPI({
      title: 'Smart Learning Platform & Course Recommender',
      description: 'Adaptive personalized course recommendation engine for CS prerequisites.',
      technologies: ['Next.js', 'Neo4j'],
    })

    const r = session.report
    const cmp = r.C_projectByProjectComparisons.find((c: any) =>
      c.title.includes('Smart Learning Platform')
    )
    assert.ok(cmp)

    const limDim = cmp.dimensions.find((d: any) => d.dimension === 'Documented limitations')
    assert.strictEqual(limDim.relationship, 'Not documented')

    const aiHyps = r.G_potentialResearchGaps.filter(
      (g: any) => g.sourceBasis === 'AI_IMPROVEMENT_HYPOTHESIS'
    )
    assert.ok(aiHyps.length >= 2)
    assert.ok(r.renderedMarkdown.includes('AI-Generated Improvement Hypotheses'))
  })

  test('10, 11, 12. Differentiation & Feasibility reject superficial swaps and tight-timeline hype while validating real contributions', async () => {
    const session = await runComparisonAPI({
      title: 'Anti-Proxy Attendance & Queue Check-In',
      description: 'Rotating token classroom attendance verification portal.',
      features: [
        'Rewrite React in Vue with dark mode toggle',
        'Anti-proxy rotating cryptographic token with offline sync',
        'Full-duplex WebRTC video and custom blockchain ledger',
      ],
      constraints: {
        teamSize: 2,
        developmentWeeks: 4,
        technicalExperience: 'beginner',
      },
    })

    const assessments = session.report.I_featureFeasibilityAssessment.featureAssessments
    const superficial = assessments.find((a: any) => a.featureName.includes('Rewrite React'))
    const meaningful = assessments.find((a: any) => a.featureName.includes('Anti-proxy'))
    const unrealistic = assessments.find((a: any) => a.featureName.includes('WebRTC'))

    assert.strictEqual(superficial.justTechnologyReplacement, true)
    assert.strictEqual(superficial.classification, 'Optional enhancement')
    assert.strictEqual(meaningful.classification, 'Meaningful improvement')
    assert.strictEqual(unrealistic.classification, 'Unnecessary feature')
    assert.strictEqual(
      session.report.I_featureFeasibilityAssessment.feasibility.overallFeasibility,
      'High Risk Within Current Constraints'
    )
  })

  test('13, 14, 15. Revisit comparison on scope change, persist decisions, and enforce strict ownership isolation', async () => {
    // Student 2 blocked from viewing or modifying Student 1's saved comparison session
    const unauthGet = await fetch(`${baseUrl}/api/ai/comparisons/${savedSessionId}`, {
      headers: student2.headers,
    })
    assert.strictEqual(unauthGet.status, 403)

    // Student 1 revisits & changes scope + records decision + locks final contribution statement
    const patchRes = await fetch(`${baseUrl}/api/ai/comparisons/${savedSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...student1.headers },
      body: JSON.stringify({
        title: 'E-Commerce Management System with High Concurrency Locking',
        description: 'Optimistic concurrency checkout locking engine with Redis TTL.',
        studentDecisions: [
          {
            improvementTitle: 'Atomic conditional stock locking benchmark',
            decision: 'ACCEPTED',
            notes: 'Core evaluation metric for viva',
          },
        ],
        finalContributionStatement:
          'Verified zero negative inventory under 5,000 simulated concurrent checkouts.',
      }),
    })
    assert.strictEqual(patchRes.status, 200)
    const updated = (await patchRes.json()).data
    assert.strictEqual(updated.version, 2)
    assert.ok(
      updated.report.B_relevantPreviousProjects.some((p: any) =>
        p.title.includes('E-Commerce Management System')
      )
    )
    assert.strictEqual(
      updated.finalContributionStatement,
      'Verified zero negative inventory under 5,000 simulated concurrent checkouts.'
    )

    // Retrieve persisted comparison session cleanly
    const getRes = await fetch(`${baseUrl}/api/ai/comparisons/${savedSessionId}`, {
      headers: student1.headers,
    })
    assert.strictEqual(getRes.status, 200)
    const fetched = (await getRes.json()).data
    assert.strictEqual(fetched.version, 2)
    assert.strictEqual(fetched.studentDecisions.length, 1)
  })

  test('16. Interactive chat comparison runs multi-project analysis & avoids repeating full matrix in follow-up', async () => {
    const convRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...student1.headers },
      body: JSON.stringify({ title: 'Interactive Research Gap Dialogue' }),
    })
    const convId = (await convRes.json()).data.id

    // Turn 1: Full Sections A-K structured comparison
    const r1Res = await fetch(`${baseUrl}/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...student1.headers },
      body: JSON.stringify({
        content: 'Compare multiple projects for Smart Attendance and identify research gaps',
        stream: false,
      }),
    })
    assert.strictEqual(r1Res.status, 200)
    const r1 = (await r1Res.json()).data.content
    assert.ok(r1.includes('Project-by-Project Comparison (12 Dimensions)'))
    assert.ok(r1.includes('QR-Based Classroom Attendance'))

    // Turn 2: Follow-up comparison request inside same stage does NOT dump duplicate 12-row tables again
    const r2Res = await fetch(`${baseUrl}/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...student1.headers },
      body: JSON.stringify({
        content: 'How does our idea differentiate across previous projects?',
        stream: false,
      }),
    })
    assert.strictEqual(r2Res.status, 200)
    const r2 = (await r2Res.json()).data.content
    assert.ok(!r2.includes('Project-by-Project Comparison (12 Dimensions)'))
    assert.ok(r2.includes('Key Opportunity'))
  })
})
