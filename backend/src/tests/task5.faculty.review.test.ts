import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { ProjectScheduleRepository } from '../modules/schedules/schedule.model.js'
import { seedScheduleTemplates } from '../modules/schedules/schedule.seeder.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task5_faculty_review_test'

describe('TASK 5 — Faculty Review and Approval Workspace E2E Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK
  const origStorageDir = process.env.EVIDENCE_STORAGE_DIR
  const tempEvidenceDir = path.join(os.tmpdir(), `cph_task5_evidence_${Date.now()}`)

  let faculty1: TestAuthSession
  let faculty2: TestAuthSession
  let studentLead1: TestAuthSession
  let studentMember1: TestAuthSession
  let student2: TestAuthSession

  let schedule1Id = ''
  let schedule2Id = ''
  let act1Id = '' // Multi-revision Changes Requested -> Approved
  let act2Id = '' // Past deadline Late submission -> Approved
  let act3Id = '' // Rejected with reason

  let sub1Id = ''
  let sub2LateId = ''
  let sub3RejectId = ''
  let sub1PdfFileId = ''

  const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n% Task 5 Reviewed PDF Evidence\n%%EOF\n')

  async function apiJson(
    reqPath: string,
    opts: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
  ) {
    const res = await fetch(`${baseUrl}${reqPath}`, {
      method: opts.method || 'GET',
      headers: {
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    const payload = (await res.json().catch(() => ({}))) as any
    return { status: res.status, payload }
  }

  async function submitMultipart(
    reqPath: string,
    headers: Record<string, string>,
    description: string,
    fileBytes?: Buffer
  ) {
    const formData = new FormData()
    formData.append('description', description)
    formData.append(
      'links',
      JSON.stringify([
        { url: 'https://github.com/campusprojecthub/review-test', linkType: 'GITHUB_REPOSITORY', label: 'Repo' },
      ])
    )
    if (fileBytes) {
      formData.append('evidenceCategories', JSON.stringify(['PDF_DOCUMENT']))
      formData.append('files', new Blob([new Uint8Array(fileBytes)], { type: 'application/pdf' }), 'evidence.pdf')
    }
    const res = await fetch(`${baseUrl}${reqPath}`, { method: 'POST', headers, body: formData })
    const payload = (await res.json().catch(() => ({}))) as any
    return { status: res.status, payload }
  }

  before(async () => {
    delete process.env.ALLOW_INMEMORY_FALLBACK
    process.env.EVIDENCE_STORAGE_DIR = tempEvidenceDir
    await connectDatabase(TEST_MONGO_URI)
    const { default: mongoose } = await import('mongoose')
    await mongoose.connection.db!.dropDatabase()
    await seedScheduleTemplates()

    faculty1 = await createAuthenticatedTestUser({
      label: 't5-faculty1',
      role: 'faculty',
      fullName: 'Dr. Kavya Rao',
    })
    faculty2 = await createAuthenticatedTestUser({
      label: 't5-faculty2',
      role: 'faculty',
      fullName: 'Prof. Sanjay Kulkarni',
    })
    studentLead1 = await createAuthenticatedTestUser({
      label: 't5-lead1',
      role: 'student',
      fullName: 'Meenakshi Iyer',
    })
    studentMember1 = await createAuthenticatedTestUser({
      label: 't5-member1',
      role: 'student',
      fullName: 'Siddharth Rao',
    })
    student2 = await createAuthenticatedTestUser({
      label: 't5-student2',
      role: 'student',
      fullName: 'Devika Nair',
    })

    delete process.env.ALLOW_INMEMORY_FALLBACK

    const app = createApp()
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    const addr = server.address() as any
    baseUrl = `http://127.0.0.1:${addr.port}`

    const tplRes = await apiJson('/api/schedules/templates', { headers: faculty1.headers })
    const stdTpl = tplRes.payload.data.find((t: any) => t.code === 'STANDARD_MINI_PROJECT_8W')

    // Schedule 1 (Faculty 1 -> Team 1)
    const s1Init = await apiJson('/api/schedules', {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        newProject: {
          title: 'Campus Smart Parking Occupancy System',
          department: 'Computer Science & Engineering',
          academicYear: '2026–27',
        },
        templateId: stdTpl.id,
        assignedStudents: [
          { studentId: studentLead1.id, isTeamLeader: true },
          { studentId: studentMember1.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-06-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    schedule1Id = s1Init.payload.data.schedule.id

    // Act 1 upcoming deadline (2026-12-30), Act 2 overdue deadline (2026-06-10), Act 3 upcoming (2026-12-31)
    const customActs1 = s1Init.payload.data.schedule.activities.map((a: any, idx: number) => {
      if (idx === 0) return { ...a, startDate: '2026-11-01', deadline: '2026-12-30' }
      if (idx === 1) return { ...a, startDate: '2026-06-01', deadline: '2026-06-10' }
      if (idx === 2) return { ...a, startDate: '2026-11-01', deadline: '2026-12-31' }
      return { ...a, startDate: '2026-11-15', deadline: '2026-12-31' }
    })
    await ProjectScheduleRepository.update(schedule1Id, { activities: customActs1 })
    const s1Pub = await apiJson(`/api/schedules/${schedule1Id}/publish`, {
      method: 'POST',
      headers: faculty1.headers,
    })
    assert.equal(s1Pub.status, 200)
    act1Id = s1Pub.payload.data.schedule.activities[0].activityId
    act2Id = s1Pub.payload.data.schedule.activities[1].activityId
    act3Id = s1Pub.payload.data.schedule.activities[2].activityId

    // Schedule 2 (Faculty 2 -> Student 2)
    const s2Init = await apiJson('/api/schedules', {
      method: 'POST',
      headers: faculty2.headers,
      body: {
        newProject: {
          title: 'College Library Crowd Estimator',
          department: 'Information Science',
          academicYear: '2026–27',
        },
        templateId: stdTpl.id,
        assignedStudents: [{ studentId: student2.id, isTeamLeader: true }],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-11-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    schedule2Id = s2Init.payload.data.schedule.id
    await apiJson(`/api/schedules/${schedule2Id}/publish`, {
      method: 'POST',
      headers: faculty2.headers,
    })
    const f2ActId = s2Init.payload.data.schedule.activities[0].activityId
    await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule2Id}/activities/${f2ActId}/submit`,
      student2.headers,
      'Faculty 2 student submission'
    )
  })

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()))
    }
    const { default: mongoose } = await import('mongoose')
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.dropDatabase()
    }
    await disconnectDatabase()
    await fs.rm(tempEvidenceDir, { recursive: true, force: true }).catch(() => {})

    if (origAllowFallback !== undefined) {
      process.env.ALLOW_INMEMORY_FALLBACK = origAllowFallback
    } else {
      delete process.env.ALLOW_INMEMORY_FALLBACK
    }
    if (origStorageDir !== undefined) {
      process.env.EVIDENCE_STORAGE_DIR = origStorageDir
    } else {
      delete process.env.EVIDENCE_STORAGE_DIR
    }
  })

  it('1. Enforces Faculty assigned-project isolation, Student 403 block, Dashboard buckets & filters', async () => {
    // Student submits Act 1 with PDF evidence
    const sub1 = await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule1Id}/activities/${act1Id}/submit`,
      studentLead1.headers,
      'Submitted Rev #1 scope & title justification PDF.',
      VALID_PDF_BYTES
    )
    assert.equal(sub1.status, 201)
    sub1Id = sub1.payload.data.submission.id
    sub1PdfFileId = sub1.payload.data.revision.evidenceFiles[0].fileId

    // Students are strictly blocked (403) from faculty review dashboard and decisions
    const studentDash = await apiJson('/api/faculty-review/dashboard', { headers: studentLead1.headers })
    assert.equal(studentDash.status, 403)

    const studentSelfApprove = await apiJson(`/api/faculty-review/submissions/${sub1Id}/decision`, {
      method: 'POST',
      headers: studentLead1.headers,
      body: { outcome: 'APPROVED', feedback: 'Self approval attempt' },
    })
    assert.equal(studentSelfApprove.status, 403)

    // Faculty 1 sees ONLY Project 1 submissions (NOT Faculty 2's project)
    const f1Dash = await apiJson('/api/faculty-review/dashboard', { headers: faculty1.headers })
    assert.equal(f1Dash.status, 200)
    assert.equal(f1Dash.payload.data.grouped.pendingReview.length, 1)
    assert.equal(f1Dash.payload.data.items[0].submission.id, sub1Id)
    assert.equal(
      f1Dash.payload.data.items.some((i: any) => i.submission.scheduleId === schedule2Id),
      false
    )

    // Faculty 2 CANNOT inspect Faculty 1's submission detail or submit decision (403)
    const f2Inspect = await apiJson(`/api/faculty-review/submissions/${sub1Id}`, {
      headers: faculty2.headers,
    })
    assert.equal(f2Inspect.status, 403)

    // Filter by status & teamSearch works cleanly
    const filtered = await apiJson(
      `/api/faculty-review/dashboard?status=PENDING_REVIEW&activityId=${act1Id}&teamSearch=Meenakshi`,
      { headers: faculty1.headers }
    )
    assert.equal(filtered.status, 200)
    assert.equal(filtered.payload.data.items.length, 1)
  })

  it('2. Supports Under Review, Changes Requested (required feedback), Multiple Revisions, Feedback Only & Final Approval preserving full audit history', async () => {
    // 1. Inspect detail + private PDF download by assigned Faculty 1
    const detail1 = await apiJson(`/api/faculty-review/submissions/${sub1Id}`, {
      headers: faculty1.headers,
    })
    assert.equal(detail1.status, 200)
    assert.equal(detail1.payload.data.project.projectTitle, 'Campus Smart Parking Occupancy System')
    assert.equal(detail1.payload.data.revisions.length, 1)
    const pdfRes = await fetch(`${baseUrl}/api/activity-submissions/files/${sub1PdfFileId}`, {
      headers: faculty1.headers,
    })
    assert.equal(pdfRes.status, 200)

    // 2. Mark UNDER_REVIEW
    const underReview = await apiJson(`/api/faculty-review/submissions/${sub1Id}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: { outcome: 'UNDER_REVIEW', feedback: 'Review started by faculty guide.' },
    })
    assert.equal(underReview.status, 200)
    assert.equal(underReview.payload.data.status, 'UNDER_REVIEW')

    // 3. CHANGES_REQUESTED without reason fails 400; with reason + correctionInstructions succeeds
    const emptyReason = await apiJson(`/api/faculty-review/submissions/${sub1Id}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: { outcome: 'CHANGES_REQUESTED', feedback: '' },
    })
    assert.equal(emptyReason.status, 400)

    const chg1 = await apiJson(`/api/faculty-review/submissions/${sub1Id}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        outcome: 'CHANGES_REQUESTED',
        feedback: 'Clarify parking bay sensor hardware cost assumptions.',
        correctionInstructions: 'Update Section 2 PDF with hardware BOM table.',
      },
    })
    assert.equal(chg1.status, 200)

    // 4. Revision #2 Resubmitted -> Add Feedback Only -> Changes Requested #2 -> Revision #3 Resubmitted -> Approved
    const rev2 = await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule1Id}/activities/${act1Id}/resubmit`,
      studentMember1.headers,
      'Rev #2: Added initial BOM table.'
    )
    assert.equal(rev2.status, 201)
    assert.equal(rev2.payload.data.submission.status, 'RESUBMITTED')

    const feedbackOnly = await apiJson(`/api/faculty-review/submissions/${sub1Id}/feedback`, {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        comment: 'Good BOM breakdown; please also include night-lighting calibration details.',
        correctionInstructions: 'Add calibration table in Rev #3.',
      },
    })
    assert.equal(feedbackOnly.status, 200)
    assert.equal(feedbackOnly.payload.data.status, 'RESUBMITTED') // Status preserved!

    const chg2 = await apiJson(`/api/faculty-review/submissions/${sub1Id}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        outcome: 'CHANGES_REQUESTED',
        feedback: 'Add night-lighting calibration details before approval.',
      },
    })
    assert.equal(chg2.status, 200)

    const rev3 = await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule1Id}/activities/${act1Id}/resubmit`,
      studentLead1.headers,
      'Rev #3: Complete BOM and night-lighting calibration specs.'
    )
    assert.equal(rev3.status, 201)

    const approved = await apiJson(`/api/faculty-review/submissions/${sub1Id}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: { outcome: 'APPROVED', feedback: 'Comprehensive specifications verified and approved.' },
    })
    assert.equal(approved.status, 200)
    assert.equal(approved.payload.data.status, 'APPROVED')

    // Verify all 3 revisions & all 6 review audit entries preserved cleanly
    const finalDetail = await apiJson(`/api/faculty-review/submissions/${sub1Id}`, {
      headers: faculty1.headers,
    })
    assert.equal(finalDetail.payload.data.revisions.length, 3)
    assert.equal(finalDetail.payload.data.reviewHistory.length, 5)

    // Verify student received CHANGES_REQUESTED, FEEDBACK_ADDED, and APPROVED alerts
    const leadNotifs = await apiJson('/api/notifications?category=REVIEW&limit=30', {
      headers: studentLead1.headers,
    })
    const notifTypes = leadNotifs.payload.data.items.map((n: any) => n.type)
    assert.ok(notifTypes.includes('SUBMISSION_CHANGES_REQUESTED'))
    assert.ok(notifTypes.includes('SUBMISSION_FEEDBACK_ADDED'))
    assert.ok(notifTypes.includes('SUBMISSION_APPROVED'))
  })

  it('3. Enforces REJECTED decision with required reason, preserves record & history, and notifies students', async () => {
    const sub3 = await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule1Id}/activities/${act3Id}/submit`,
      studentLead1.headers,
      'Submitted incomplete unrelated architecture outline.'
    )
    assert.equal(sub3.status, 201)
    sub3RejectId = sub3.payload.data.submission.id

    // Empty rejection reason fails 400
    const missingReason = await apiJson(`/api/faculty-review/submissions/${sub3RejectId}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: { outcome: 'REJECTED', feedback: 'no' },
    })
    assert.equal(missingReason.status, 400)

    const rejRes = await apiJson(`/api/faculty-review/submissions/${sub3RejectId}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        outcome: 'REJECTED',
        feedback: 'Submission references an unrelated domain and lacks required system architecture.',
      },
    })
    assert.equal(rejRes.status, 200)
    assert.equal(rejRes.payload.data.status, 'REJECTED')

    // Rejected submission cannot be directly resubmitted by students (409) & remains visible in Rejected queue
    const blockResub = await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule1Id}/activities/${act3Id}/resubmit`,
      studentLead1.headers,
      'Attempt resubmitting rejected submission'
    )
    assert.equal(blockResub.status, 409)

    const rejectedDash = await apiJson('/api/faculty-review/dashboard?status=REJECTED', {
      headers: faculty1.headers,
    })
    assert.equal(rejectedDash.payload.data.items.length, 1)
    assert.equal(rejectedDash.payload.data.items[0].submission.id, sub3RejectId)

    const studentNotifs = await apiJson('/api/notifications?category=REVIEW&limit=30', {
      headers: studentMember1.headers,
    })
    assert.ok(studentNotifs.payload.data.items.some((n: any) => n.type === 'SUBMISSION_REJECTED'))
  })

  it('4. Allows Late/Overdue submission to be reviewed & approved cleanly while separating schedule status from review status', async () => {
    const lateSub = await submitMultipart(
      `/api/activity-submissions/workspaces/${schedule1Id}/activities/${act2Id}/submit`,
      studentMember1.headers,
      'Submitted late base paper comparison after 2026-06-10 deadline.'
    )
    assert.equal(lateSub.status, 201)
    sub2LateId = lateSub.payload.data.submission.id
    assert.equal(lateSub.payload.data.submission.isLate, true)

    // Before approval: Schedule Status is OVERDUE while Review Status is SUBMITTED
    const preDetail = await apiJson(`/api/faculty-review/submissions/${sub2LateId}`, {
      headers: faculty1.headers,
    })
    assert.equal(preDetail.payload.data.scheduleStatus, 'OVERDUE')
    assert.equal(preDetail.payload.data.reviewStatus, 'SUBMITTED')

    // Faculty approves late submission -> Review Status becomes APPROVED, Schedule Status CLOSED, late flag intact
    const approveLate = await apiJson(`/api/faculty-review/submissions/${sub2LateId}/decision`, {
      method: 'POST',
      headers: faculty1.headers,
      body: { outcome: 'APPROVED', feedback: 'Approved despite late submission.' },
    })
    assert.equal(approveLate.status, 200)
    assert.equal(approveLate.payload.data.status, 'APPROVED')
    assert.equal(approveLate.payload.data.isLate, true)
  })

  it('5. Integrates Weekly Report review without auto-approving activities and persists everything across MongoDB restart', async () => {
    // Student submits Week 1 weekly report
    const wkSub = await apiJson(`/api/weekly-reports/projects/${schedule1Id}/weeks/1/submit`, {
      method: 'POST',
      headers: studentLead1.headers,
      body: {
        workCompleted: 'Completed Week 1 sensor calibration research.',
        workInProgress: 'Drafting API schemas.',
        challengesOrBlockers: 'None.',
        planForNextWeek: 'Submit remaining milestones.',
        supportingEvidenceNotes: 'Repository linked.',
        links: [{ url: 'https://github.com/cph/parking-w1', linkType: 'GITHUB_REPOSITORY', label: 'Repo' }],
      },
    })
    assert.equal(wkSub.status, 201)
    const reportId = wkSub.payload.data.id

    // Faculty requests clarification, student submits clarification response -> Faculty notified cleanly
    await apiJson(`/api/faculty-review/weekly-reports/${reportId}/review`, {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        action: 'REQUEST_CLARIFICATION',
        comment: 'Specify microcontroller pin mapping in Week 1 summary.',
      },
    })

    const clarifResp = await apiJson(`/api/weekly-reports/projects/${schedule1Id}/weeks/1/submit`, {
      method: 'POST',
      headers: studentLead1.headers,
      body: {
        workCompleted: 'Added ESP32 ultrasonic sensor pin mapping table.',
        workInProgress: 'Drafting API schemas.',
        challengesOrBlockers: 'None.',
        planForNextWeek: 'Proceed to database schema.',
        supportingEvidenceNotes: 'Updated branch.',
        links: [{ url: 'https://github.com/cph/parking-w1', linkType: 'GITHUB_REPOSITORY', label: 'Repo' }],
      },
    })
    assert.equal(clarifResp.status, 201)

    const f1Notifs = await apiJson('/api/notifications?category=WEEKLY_REPORT&limit=20', {
      headers: faculty1.headers,
    })
    assert.ok(
      f1Notifs.payload.data.items.some((n: any) =>
        String(n.title).includes('Clarification Response Submitted')
      )
    )

    // Faculty finalizes Week 1 weekly report -> Act 4 remains NOT_STARTED / NOT_REVIEWED
    const finalizeWk = await apiJson(`/api/faculty-review/weekly-reports/${reportId}/review`, {
      method: 'POST',
      headers: faculty1.headers,
      body: { action: 'FINALIZE', comment: 'Week 1 progress report finalized.' },
    })
    assert.equal(finalizeWk.status, 200)
    assert.equal(finalizeWk.payload.data.status, 'FINALIZED')

    // MongoDB disconnect & reconnect verification
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const [persistedDetail, persistedSched] = await Promise.all([
      apiJson(`/api/faculty-review/submissions/${sub1Id}`, { headers: faculty1.headers }),
      ProjectScheduleRepository.findById(schedule1Id),
    ])
    assert.equal(persistedDetail.status, 200)
    assert.equal(persistedDetail.payload.data.revisions.length, 3)
    assert.equal(persistedDetail.payload.data.reviewHistory.length, 5)
    assert.equal(persistedSched!.activities[3].activityStatus, 'NOT_STARTED')
    assert.equal(persistedSched!.activities[3].facultyReviewStatus, 'NOT_REVIEWED')
  })
})
