import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { ProjectRepository } from '../modules/repository/project.model.js'
import { createAuthenticatedTestUser } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task26_test'

describe('TASK 26 — Intelligent Existing Project vs Proposed Project Comparison Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK
  let studentToken = ''

  before(async () => {
    delete process.env.ALLOW_INMEMORY_FALLBACK
    await connectDatabase(TEST_MONGO_URI)
    const { default: mongoose } = await import('mongoose')
    await mongoose.connection.db!.dropDatabase()
    await seedRepository()

    // Seed a second approved attendance record for Scenario 8 (multiple matches)
    await ProjectRepository.create({
      title: 'QR-Based Classroom Attendance & Session Roster',
      slug: `t26-qr-attendance-${Date.now()}`,
      abstract: 'Expiring QR classroom attendance portal with CSV export.',
      problemStatement: 'Manual roll calls waste lecture minutes and suffer proxy check-ins.',
      objectives: ['Automate check-ins using expiring QR session tokens'],
      features: ['Expiring QR session check-ins', 'CSV faculty attendance export'],
      modules: [{ name: 'QR Session Generator', description: 'Short-lived HMAC QR generator.' }],
      technologyStack: [{ name: 'React' }, { name: 'Node.js' }, { name: 'MongoDB' }],
      academicYear: '2024–25',
      department: 'Computer Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [{ name: 'Ananya Rao', role: 'Full Stack Lead', isAvailableForMentoring: true }],
      facultyGuide: { name: 'Dr. Kavitha S', department: 'Computer Science & Engineering' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'ADMIN_IMPORTED_HISTORICAL',
      reviewStatus: 'APPROVED',
      verificationStatus: 'VERIFIED_HISTORICAL',
      uploadedBy: 'admin-registrar',
    })

    // Seed restricted unapproved record (must never leak)
    await ProjectRepository.create({
      title: 'Restricted Unapproved Project Management Draft',
      slug: `t26-restricted-${Date.now()}`,
      abstract: 'Confidential rejected draft.',
      problemStatement: 'Internal draft.',
      objectives: ['Secret'],
      features: ['Hidden feature'],
      modules: [],
      technologyStack: [{ name: 'Java' }],
      academicYear: '2025–26',
      department: 'CSE',
      collegeId: 'rvce-main',
      reviewStatus: 'REJECTED',
      verificationStatus: 'PENDING_VERIFICATION',
      rejectionReason: 'CONFIDENTIAL_T26_DO_NOT_LEAK',
      teamMembers: [{ name: 'Hidden Author', email: 'hidden-t26@college.edu' }],
      facultyGuide: { name: 'Dr. Hidden', department: 'CSE' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION',
      uploadedBy: 'other-student',
    })

    const user = await createAuthenticatedTestUser({
      label: 'task26-student',
      role: 'student',
      fullName: 'Task 26 Student',
    })
    delete process.env.ALLOW_INMEMORY_FALLBACK
    studentToken = user.token

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as { port: number }
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
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

  async function chatTurn(convId: string, content: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ content, stream: false }),
    })
    assert.equal(res.status, 200)
    const json = (await res.json()) as any
    return json.data.content
  }

  async function createConv(title: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ title }),
    })
    assert.equal(res.status, 201)
    return ((await res.json()) as any).data.id
  }

  async function compareApi(body: Record<string, any>) {
    const res = await fetch(`${baseUrl}/api/ai/comparisons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify(body),
    })
    assert.equal(res.status, 201)
    return ((await res.json()) as any).data
  }

  it('1 & 7. Canonical Task 26 chat workflow: Existing Project Management vs AI Task Allocation & Progress Prediction + Follow-Up', async () => {
    const convId = await createConv('Task 26 Canonical Flow')
    const reply = await chatTurn(
      convId,
      'I want to develop an Academic Project Management System with AI-based task allocation and automatic project progress prediction.'
    )

    assert.ok(reply.includes('Academic Project Management & Workflow Tracking Portal'))
    assert.ok(reply.includes('| Area | Existing Project | Student\'s Proposed Project |'))
    assert.ok(reply.includes('Plain-Language Actual Difference Breakdown'))
    assert.ok(reply.includes('AI-based task allocation'))
    assert.ok(reply.includes('Automatic project progress prediction'))
    assert.ok(reply.includes('**Genuinely Additional Features**: AI-based task allocation'))
    assert.ok(reply.includes('**Modifications of Existing Functionality**: Automatic project progress prediction'))
    assert.ok(reply.includes('Meaningful Contribution Assessment'))
    assert.ok(reply.includes('Recommended Realistic Scope'))
    assert.ok(reply.includes('Which of these proposed improvements do you want your team to implement first?'))
    assert.ok(!reply.includes('CONFIDENTIAL_T26_DO_NOT_LEAK'))

    // Follow-up conversation continuity when student selects first improvement
    const followUpReply = await chatTurn(convId, 'We want to implement AI-based task allocation first')
    assert.ok(followUpReply.includes('prioritizing'))
    assert.ok(followUpReply.toLowerCase().includes('task allocation'))
    assert.ok(followUpReply.toLowerCase().includes('confirm'))
  })

  it('2 & 3. Existing project with already-implemented features vs partially overlapping features', async () => {
    const overlapSession = await compareApi({
      title: 'Smart Attendance Management System',
      description: 'Classroom attendance portal with face verification and offline QR check-in.',
      features: [
        'Contactless classroom multi-face verification',
        'Anti-spoofing liveness detection EAR blink',
        'Offline queued QR check-in sync',
      ],
      constraints: { teamSize: 3, developmentWeeks: 8, technicalExperience: 'intermediate' },
    })

    const assessments = overlapSession.report.I_featureFeasibilityAssessment.featureAssessments
    const alreadyFace = assessments.find((f: any) => f.featureName.includes('multi-face'))
    const newOffline = assessments.find((f: any) => f.featureName.includes('Offline'))

    assert.equal(alreadyFace.alreadyPresentInPrevious, true)
    assert.equal(newOffline.alreadyPresentInPrevious, false)
    assert.ok(overlapSession.report.actualDifferenceBreakdown.alreadyPresent.some((s: string) => s.includes('multi-face')))
    assert.ok(overlapSession.report.actualDifferenceBreakdown.genuinelyAdditional.some((s: string) => s.includes('Offline')))
  })

  it('4. Existing project with undocumented features explicitly marks Not documented instead of assuming absence', async () => {
    const sess = await compareApi({
      title: 'Academic Project Management System',
      description: 'Adding AI task assignment over earlier college workflow portal.',
      features: ['AI-based task allocation'],
    })

    const rows = sess.report.existingVsProposedTable
    const taskRow = rows.find((r: any) => r.area.includes('Task allocation'))
    const aiRow = rows.find((r: any) => r.area === 'AI capabilities')
    assert.ok(taskRow.existingProject.includes('Not documented'))
    assert.ok(aiRow.existingProject.includes('Not documented'))
  })

  it('5. Student proposes unnecessary hype features -> classified Unnecessary & postponed in scope', async () => {
    const sess = await compareApi({
      title: 'Academic Project Management System',
      description: 'Project portal with blockchain ledger and chatbot.',
      features: ['Blockchain smart contract ledger', 'AI chatbot assistant', 'Task deadline alerts'],
      constraints: { teamSize: 2, developmentWeeks: 6, technicalExperience: 'beginner' },
    })

    const assessments = sess.report.I_featureFeasibilityAssessment.featureAssessments
    const chain = assessments.find((f: any) => f.featureName.includes('Blockchain'))
    const bot = assessments.find((f: any) => f.featureName.includes('chatbot'))
    const alerts = assessments.find((f: any) => f.featureName.includes('alerts'))

    assert.equal(chain.academicClassification, 'Unnecessary')
    assert.equal(bot.academicClassification, 'Unnecessary')
    assert.equal(alerts.academicClassification, 'Recommended')
    assert.ok(sess.report.scopeRecommendation.postpone.some((p: string) => p.includes('Blockchain')))
  })

  it('6. Student changes proposed direction mid-conversation and compares against new baseline', async () => {
    const convId = await createConv('Direction Pivot Comparison')
    const r1 = await chatTurn(
      convId,
      'I want to develop an Academic Project Management System with AI-based task allocation.'
    )
    assert.ok(r1.includes('Academic Project Management'))

    const r2 = await chatTurn(
      convId,
      'Actually instead of that, switch to Smart Attendance Management System with rotating QR tokens'
    )
    assert.ok(r2.includes('Smart Attendance Management System'))
  })

  it('7b & 8. No existing match yields honest novelty disclaimer; Multiple existing matches synthesize cleanly', async () => {
    const noMatch = await compareApi({
      title: 'Deep Ocean Hydrophone Seismic Correlator',
      description: 'Real-time underwater acoustic seafloor tremor classification.',
      features: ['Wavelet noise filtering'],
    })
    assert.equal(noMatch.report.B_relevantPreviousProjects.length, 0)
    assert.ok(noMatch.report.noveltyDisclaimer.includes('does not prove global academic novelty'))

    const multiMatch = await compareApi({
      title: 'Smart Attendance System',
      description: 'Classroom attendance system comparing QR vs face check-ins.',
      features: ['Offline queued attendance check-in'],
    })
    assert.ok(multiMatch.report.B_relevantPreviousProjects.length >= 2)
    assert.ok(!multiMatch.report.renderedMarkdown.includes('CONFIDENTIAL_T26_DO_NOT_LEAK'))
    assert.ok(!multiMatch.report.renderedMarkdown.includes('hidden-t26@college.edu'))
  })
})
