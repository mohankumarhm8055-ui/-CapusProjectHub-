import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { ProjectRepository } from '../modules/repository/project.model.js'
import { seedScheduleTemplates } from '../modules/schedules/schedule.seeder.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task1_schedule_test'

const EXPECTED_TEN_ACTIVITIES = [
  'Project Title Selection',
  'Base Paper Selection',
  'Existing System Analysis',
  'Technology Finalization',
  'UI/UX Design',
  'System Architecture and Database Design',
  'Initial Development',
  'Testing and Validation',
  'Documentation',
  'Final Demonstration and Submission',
]

describe('TASK 1 — Academic Schedule Manager & Template Initialization E2E Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK

  let adminUser: TestAuthSession
  let faculty1: TestAuthSession
  let faculty2: TestAuthSession
  let teamLeaderStudent: TestAuthSession
  let teamMemberStudent: TestAuthSession
  let outsiderStudent: TestAuthSession

  let existingProjectId = ''
  let standardTemplateId = ''
  let draftScheduleId = ''
  let publishedScheduleId = ''

  async function apiJson(
    path: string,
    opts: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
  ) {
    const res = await fetch(`${baseUrl}${path}`, {
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

  before(async () => {
    delete process.env.ALLOW_INMEMORY_FALLBACK
    await connectDatabase(TEST_MONGO_URI)
    const { default: mongoose } = await import('mongoose')
    await mongoose.connection.db!.dropDatabase()

    await seedScheduleTemplates()

    adminUser = await createAuthenticatedTestUser({
      label: 'sched-admin',
      role: 'admin',
      fullName: 'Registrar Admin',
    })
    faculty1 = await createAuthenticatedTestUser({
      label: 'sched-faculty1',
      role: 'faculty',
      fullName: 'Dr. Kavitha Rao',
    })
    faculty2 = await createAuthenticatedTestUser({
      label: 'sched-faculty2',
      role: 'faculty',
      fullName: 'Prof. Arvind Menon',
    })
    teamLeaderStudent = await createAuthenticatedTestUser({
      label: 'sched-lead',
      role: 'student',
      fullName: 'Ananya Verma (Team Lead)',
    })
    teamMemberStudent = await createAuthenticatedTestUser({
      label: 'sched-member',
      role: 'student',
      fullName: 'Karthik Nair',
    })
    outsiderStudent = await createAuthenticatedTestUser({
      label: 'sched-outsider',
      role: 'student',
      fullName: 'Unassigned Student',
    })

    // Ensure strict MongoDB persistence without in-memory fallback for all schedule operations
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const existingProject = await ProjectRepository.create({
      title: 'Smart Campus Energy Telemetry Mini Project',
      slug: `smart-campus-energy-${Date.now()}`,
      abstract: 'Real-time classroom energy telemetry and anomaly alerting.',
      problemStatement: 'Hostel and lab blocks waste idle HVAC power after class hours.',
      objectives: ['Measure feeder load', 'Alert lab coordinators on idle load'],
      features: ['Feeder Dashboard'],
      modules: [{ name: 'Telemetry Ingest', description: 'Collects meter packets' }],
      technologyStack: [{ name: 'React' }, { name: 'Node.js' }, { name: 'MongoDB' }],
      academicYear: '2025–26',
      department: 'Computer Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [
        { name: teamLeaderStudent.user.fullName, isLeader: true, studentId: teamLeaderStudent.id },
        { name: teamMemberStudent.user.fullName, isLeader: false, studentId: teamMemberStudent.id },
      ],
      facultyGuide: { name: faculty1.user.fullName, department: 'Computer Science & Engineering' },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION',
      reviewStatus: 'DRAFT',
      verificationStatus: 'PENDING_VERIFICATION',
      uploadedBy: faculty1.id,
    })
    existingProjectId = existingProject.id

    const app = createApp()
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    const addr = server.address() as any
    baseUrl = `http://127.0.0.1:${addr.port}`
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
    if (origAllowFallback !== undefined) {
      process.env.ALLOW_INMEMORY_FALLBACK = origAllowFallback
    } else {
      delete process.env.ALLOW_INMEMORY_FALLBACK
    }
  })

  it('1. Seeds "Standard Mini Project — 8 Week Plan" idempotently with all 10 reusable activities and zero hardcoded calendar dates', async () => {
    // Re-run seeder to guarantee idempotency
    await seedScheduleTemplates()

    const { status, payload } = await apiJson('/api/schedules/templates', {
      headers: faculty1.headers,
    })
    assert.equal(status, 200)
    assert.equal(payload.success, true)

    const standard = payload.data.find((t: any) => t.code === 'STANDARD_MINI_PROJECT_8W')
    assert.ok(standard, 'Standard Mini Project — 8 Week Plan must exist')
    assert.equal(standard.name, 'Standard Mini Project — 8 Week Plan')
    assert.equal(standard.targetDurationWeeks, 8)
    assert.equal(standard.activeVersion, 1)

    standardTemplateId = standard.id
    const activities = standard.latestVersion.activities
    assert.equal(activities.length, 10)
    assert.deepEqual(
      activities.map((a: any) => a.title),
      EXPECTED_TEN_ACTIVITIES
    )

    // Total suggested duration across 10 activities = 40 working days (8 weeks * 5 days)
    const totalDays = activities.reduce((sum: number, a: any) => sum + a.suggestedDurationDays, 0)
    assert.equal(totalDays, 40)

    // No hardcoded calendar dates on templates
    for (const act of activities) {
      assert.equal(act.startDate, undefined)
      assert.equal(act.deadline, undefined)
      assert.ok(Array.isArray(act.evidenceTypes) && act.evidenceTypes.length >= 1)
    }
  })

  it('2. Calculates working-day suggested dates skipping weekends and institutional holidays sequentially', async () => {
    // Start Monday 2026-06-01, working days Mon-Fri ([1..5]), with Holiday on Wed 2026-06-03
    const { status, payload } = await apiJson('/api/schedules/suggest-dates', {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        templateId: standardTemplateId,
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-06-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [{ date: '2026-06-03', label: 'Foundation Day Holiday' }],
        },
      },
    })
    assert.equal(status, 200)
    const activities = payload.data.activities
    assert.equal(activities.length, 10)

    // Activity 1: Project Title Selection has suggestedDurationDays = 3
    // Mon Jun 01 (day 1), Tue Jun 02 (day 2), Wed Jun 03 SKIPPED (holiday), Thu Jun 04 (day 3) -> deadline 2026-06-04
    assert.equal(activities[0].sequenceNumber, 1)
    assert.equal(activities[0].startDate, '2026-06-01')
    assert.equal(activities[0].deadline, '2026-06-04')

    // Activity 2: Base Paper Selection (duration 3) starts next working day Fri Jun 05, skips Sat Jun 06 & Sun Jun 07, continues Mon Jun 08 & Tue Jun 09
    assert.equal(activities[1].sequenceNumber, 2)
    assert.equal(activities[1].startDate, '2026-06-05')
    assert.equal(activities[1].deadline, '2026-06-09')

    // Chronological order across all 10 milestones and never landing on holiday or weekend
    for (let i = 0; i < activities.length; i++) {
      assert.equal(activities[i].sequenceNumber, i + 1)
      assert.ok(activities[i].startDate <= activities[i].deadline)
      assert.notEqual(activities[i].startDate, '2026-06-03')
      assert.notEqual(activities[i].deadline, '2026-06-03')
      if (i > 0) {
        assert.ok(activities[i].startDate > activities[i - 1].deadline)
      }
    }
  })

  it('3. Blocks Students and Team Leaders (403) from initializing or modifying schedules and enforces Faculty ownership', async () => {
    const attemptLead = await apiJson('/api/schedules', {
      method: 'POST',
      headers: teamLeaderStudent.headers,
      body: {
        projectId: existingProjectId,
        templateId: standardTemplateId,
        assignedStudents: [{ studentId: teamLeaderStudent.id, isTeamLeader: true }],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-06-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    assert.equal(attemptLead.status, 403)

    const attemptStudentOptions = await apiJson('/api/schedules/initialization-options', {
      headers: teamMemberStudent.headers,
    })
    assert.equal(attemptStudentOptions.status, 403)
  })

  it('4. Faculty initializes a Draft schedule from existing project and edits a deadline with explicit non-working-day warning without silent auto-shift', async () => {
    // Initialize draft schedule
    const initRes = await apiJson('/api/schedules', {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        projectId: existingProjectId,
        templateId: standardTemplateId,
        assignedStudents: [
          { studentId: teamLeaderStudent.id, isTeamLeader: true },
          { studentId: teamMemberStudent.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-06-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [{ date: '2026-06-03', label: 'Foundation Day Holiday' }],
        },
      },
    })
    assert.equal(initRes.status, 201)
    assert.equal(initRes.payload.data.schedule.status, 'DRAFT')
    draftScheduleId = initRes.payload.data.schedule.id

    // Draft schedule must NOT be accessible to assigned students yet (403)
    const draftReadByStudent = await apiJson(`/api/schedules/${draftScheduleId}`, {
      headers: teamLeaderStudent.headers,
    })
    assert.equal(draftReadByStudent.status, 403)

    // Invalid date ordering (startDate > deadline) must fail 400
    const badActivities = JSON.parse(JSON.stringify(initRes.payload.data.schedule.activities))
    badActivities[0].startDate = '2026-06-10'
    badActivities[0].deadline = '2026-06-02'
    const invalidRangeRes = await apiJson(`/api/schedules/${draftScheduleId}`, {
      method: 'PUT',
      headers: faculty1.headers,
      body: { activities: badActivities },
    })
    assert.equal(invalidRangeRes.status, 400)

    // Faculty intentionally places Activity 1 deadline on Sunday 2026-06-07:
    // system MUST save faculty's exact date without silently shifting AND return explicit warning
    const weekendActivities = JSON.parse(JSON.stringify(initRes.payload.data.schedule.activities))
    weekendActivities[0].deadline = '2026-06-07'
    const warnRes = await apiJson(`/api/schedules/${draftScheduleId}`, {
      method: 'PUT',
      headers: faculty1.headers,
      body: { activities: weekendActivities },
    })
    assert.equal(warnRes.status, 200)
    assert.equal(warnRes.payload.data.schedule.activities[0].deadline, '2026-06-07')
    assert.ok(
      warnRes.payload.data.warnings.some(
        (w: any) => w.activityId === weekendActivities[0].activityId && w.date === '2026-06-07'
      ),
      'Must emit non-working-day warning without silently overriding faculty deadline'
    )

    // Cross-faculty isolation: Faculty 2 cannot edit or publish Faculty 1's schedule
    const otherFacultyAttempt = await apiJson(`/api/schedules/${draftScheduleId}/publish`, {
      method: 'POST',
      headers: faculty2.headers,
    })
    assert.equal(otherFacultyAttempt.status, 403)
  })

  it('5. Faculty initializes a new project schedule, publishes it, preserves initial baseline snapshot, notifies students, and grants read-only access to assigned students only', async () => {
    // Also supports initializing a brand-new academic project during setup
    const initNewRes = await apiJson('/api/schedules', {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        newProject: {
          title: 'Campus Smart Attendance & Lab Tracker',
          department: 'Computer Science & Engineering',
          academicYear: '2025–26',
          problemStatement: 'Track laboratory hardware utilization with verifiable sessions.',
        },
        templateId: standardTemplateId,
        assignedStudents: [
          { studentId: teamLeaderStudent.id, isTeamLeader: true },
          { studentId: teamMemberStudent.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-06-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [{ date: '2026-06-03', label: 'Foundation Day Holiday' }],
        },
      },
    })
    assert.equal(initNewRes.status, 201)
    publishedScheduleId = initNewRes.payload.data.schedule.id

    // Publish official schedule
    const pubRes = await apiJson(`/api/schedules/${publishedScheduleId}/publish`, {
      method: 'POST',
      headers: faculty1.headers,
    })
    assert.equal(pubRes.status, 200)
    const published = pubRes.payload.data.schedule
    assert.equal(published.status, 'PUBLISHED')
    assert.equal(published.version, 1)
    assert.ok(published.publishedAt)
    assert.ok(published.initialPublishedSnapshot)
    assert.equal(published.initialPublishedSnapshot.version, 1)
    assert.equal(published.initialPublishedSnapshot.activities.length, 10)

    // Assigned students (Team Lead + Member) see ONLY published schedules (not draftScheduleId)
    const leadListRes = await apiJson('/api/schedules/my', {
      headers: teamLeaderStudent.headers,
    })
    assert.equal(leadListRes.status, 200)
    const idsForStudent = leadListRes.payload.data.map((s: any) => s.id)
    assert.ok(idsForStudent.includes(publishedScheduleId))
    assert.ok(!idsForStudent.includes(draftScheduleId), 'Draft schedules must never appear to students')

    // Assigned team member can view published details
    const memberRead = await apiJson(`/api/schedules/${publishedScheduleId}`, {
      headers: teamMemberStudent.headers,
    })
    assert.equal(memberRead.status, 200)
    assert.equal(memberRead.payload.data.activities.length, 10)

    // Outsider student is strictly blocked (403)
    const outsiderRead = await apiJson(`/api/schedules/${publishedScheduleId}`, {
      headers: outsiderStudent.headers,
    })
    assert.equal(outsiderRead.status, 403)

    // Team Leader cannot modify published schedule (403)
    const teamLeadPatch = await apiJson(`/api/schedules/${publishedScheduleId}/published`, {
      method: 'PATCH',
      headers: teamLeaderStudent.headers,
      body: {
        reason: 'Student trying to extend deadline',
        activities: published.activities,
      },
    })
    assert.equal(teamLeadPatch.status, 403)

    // Verify notification delivered on publication
    const notifRes = await apiJson('/api/connections/notifications', {
      headers: teamMemberStudent.headers,
    })
    assert.equal(notifRes.status, 200)
    assert.ok(
      notifRes.payload.data.some((n: any) => n.type === 'SCHEDULE_PUBLISHED'),
      'Assigned students must receive SCHEDULE_PUBLISHED notification'
    )
  })

  it('6. Records versioned post-publish deadline change with reason, keeps initialPublishedSnapshot untouched, and notifies team', async () => {
    const currentRes = await apiJson(`/api/schedules/${publishedScheduleId}`, {
      headers: faculty1.headers,
    })
    const current = currentRes.payload.data
    const originalAct3Deadline = current.activities[2].deadline

    // Updating a published schedule without sufficient reason fails Zod validation (400)
    const noReasonRes = await apiJson(`/api/schedules/${publishedScheduleId}/published`, {
      method: 'PATCH',
      headers: faculty1.headers,
      body: {
        reason: 'ok',
        activities: current.activities,
      },
    })
    assert.equal(noReasonRes.status, 400)

    // Extend Activity 3 deadline with formal academic reason
    const updatedActivities = JSON.parse(JSON.stringify(current.activities))
    updatedActivities[2].deadline = '2026-06-22'
    const patchRes = await apiJson(`/api/schedules/${publishedScheduleId}/published`, {
      method: 'PATCH',
      headers: faculty1.headers,
      body: {
        reason: 'Extended Existing System Analysis deadline due to midterm lab schedule.',
        activities: updatedActivities,
      },
    })
    assert.equal(patchRes.status, 200)
    const revised = patchRes.payload.data.schedule
    assert.equal(revised.version, 2)
    assert.equal(revised.activities[2].deadline, '2026-06-22')
    // Initial snapshot must remain untouched!
    assert.equal(revised.initialPublishedSnapshot.activities[2].deadline, originalAct3Deadline)

    // Check immutable change history
    const histRes = await apiJson(`/api/schedules/${publishedScheduleId}/history`, {
      headers: teamLeaderStudent.headers,
    })
    assert.equal(histRes.status, 200)
    const deadlineChange = histRes.payload.data.find((h: any) => h.changeType === 'DEADLINE_UPDATED')
    assert.ok(deadlineChange, 'Change history must log DEADLINE_UPDATED')
    assert.equal(deadlineChange.versionNumber, 2)
    assert.equal(deadlineChange.previousValue, originalAct3Deadline)
    assert.equal(deadlineChange.newValue, '2026-06-22')
    assert.match(deadlineChange.reason, /midterm lab schedule/)

    // Student notifications include SCHEDULE_DEADLINE_UPDATED
    const notifRes = await apiJson('/api/connections/notifications', {
      headers: teamLeaderStudent.headers,
    })
    assert.equal(notifRes.status, 200)
    assert.ok(
      notifRes.payload.data.some((n: any) => n.type === 'SCHEDULE_DEADLINE_UPDATED'),
      'Assigned students must receive SCHEDULE_DEADLINE_UPDATED notification'
    )
  })

  it('7. Enforces Admin-only template versioning and keeps existing published schedules pinned to v1', async () => {
    const tplRes = await apiJson(`/api/schedules/templates/${standardTemplateId}/versions`, {
      headers: adminUser.headers,
    })
    assert.equal(tplRes.status, 200)
    const v1Activities = tplRes.payload.data.versions[0].activities

    // Faculty cannot create new template version (403)
    const facultyVerAttempt = await apiJson(`/api/schedules/templates/${standardTemplateId}/versions`, {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        changelog: 'Unauthorized faculty template edit',
        activities: v1Activities,
      },
    })
    assert.equal(facultyVerAttempt.status, 403)

    // Admin creates template v2 with 5 days for Activity 1
    const v2Activities = JSON.parse(JSON.stringify(v1Activities))
    v2Activities[0].suggestedDurationDays = 5
    const adminVerRes = await apiJson(`/api/schedules/templates/${standardTemplateId}/versions`, {
      method: 'POST',
      headers: adminUser.headers,
      body: {
        changelog: 'Adjusted Activity 1 suggested window from 3 to 5 working days',
        activities: v2Activities,
      },
    })
    assert.equal(adminVerRes.status, 201)
    assert.equal(adminVerRes.payload.data.template.activeVersion, 2)
    assert.equal(adminVerRes.payload.data.version.version, 2)

    // Existing published schedule stays pinned to templateVersion 1
    const schedRes = await apiJson(`/api/schedules/${publishedScheduleId}`, {
      headers: faculty1.headers,
    })
    assert.equal(schedRes.status, 200)
    assert.equal(schedRes.payload.data.templateVersion, 1)
  })

  it('8. Persists published schedule, versions, and change history in MongoDB across DB disconnect & reconnect', async () => {
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const [schedRes, histRes, tplRes] = await Promise.all([
      apiJson(`/api/schedules/${publishedScheduleId}`, { headers: teamMemberStudent.headers }),
      apiJson(`/api/schedules/${publishedScheduleId}/history`, { headers: teamMemberStudent.headers }),
      apiJson(`/api/schedules/templates/${standardTemplateId}/versions`, { headers: faculty1.headers }),
    ])

    assert.equal(schedRes.status, 200)
    assert.equal(schedRes.payload.data.version, 2)
    assert.equal(schedRes.payload.data.activities[2].deadline, '2026-06-22')
    assert.equal(histRes.status, 200)
    assert.ok(histRes.payload.data.length >= 2)
    assert.equal(tplRes.status, 200)
    assert.equal(tplRes.payload.data.template.activeVersion, 2)
  })
})
