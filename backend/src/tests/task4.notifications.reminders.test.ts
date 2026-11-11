import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { setEmailTransportForTesting } from '../modules/notifications/notification.delivery.js'
import {
  reminderEngineService,
  resolveScheduleDateIso,
} from '../modules/notifications/reminder.engine.js'
import { ProjectScheduleRepository } from '../modules/schedules/schedule.model.js'
import { seedScheduleTemplates } from '../modules/schedules/schedule.seeder.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task4_notifications_test'

describe('TASK 4 — Academic Deadline Alerts & Notification Engine E2E Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK

  let adminUser: TestAuthSession
  let facultyGuide: TestAuthSession
  let otherFaculty: TestAuthSession
  let teamLeader: TestAuthSession
  let teamMember: TestAuthSession
  let outsiderStudent: TestAuthSession

  let scheduleId = ''
  let act1Id = '' // TEAM_SHARED deadline 2026-08-10
  let act2Id = '' // INDIVIDUAL deadline 2026-08-14
  let act3Id = '' // TEAM_SHARED already approved deadline 2026-08-20
  let teamMemberSubmittedSubmissionId = ''

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

  before(async () => {
    delete process.env.ALLOW_INMEMORY_FALLBACK
    await connectDatabase(TEST_MONGO_URI)
    const { default: mongoose } = await import('mongoose')
    await mongoose.connection.db!.dropDatabase()
    await seedScheduleTemplates()

    adminUser = await createAuthenticatedTestUser({
      label: 't4-admin',
      role: 'admin',
      fullName: 'Academic Registrar',
    })
    facultyGuide = await createAuthenticatedTestUser({
      label: 't4-faculty',
      role: 'faculty',
      fullName: 'Dr. Kavitha Iyer',
    })
    otherFaculty = await createAuthenticatedTestUser({
      label: 't4-other-faculty',
      role: 'faculty',
      fullName: 'Prof. Mahesh Shenoy',
    })
    teamLeader = await createAuthenticatedTestUser({
      label: 't4-lead',
      role: 'student',
      fullName: 'Asha Krishnan',
    })
    teamMember = await createAuthenticatedTestUser({
      label: 't4-member',
      role: 'student',
      fullName: 'Vikram Desai',
    })
    outsiderStudent = await createAuthenticatedTestUser({
      label: 't4-outsider',
      role: 'student',
      fullName: 'Ritu Kapoor',
    })

    delete process.env.ALLOW_INMEMORY_FALLBACK

    const app = createApp()
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    const addr = server.address() as any
    baseUrl = `http://127.0.0.1:${addr.port}`

    const tplRes = await apiJson('/api/schedules/templates', { headers: facultyGuide.headers })
    const stdTpl = tplRes.payload.data.find((t: any) => t.code === 'STANDARD_MINI_PROJECT_8W')

    const initRes = await apiJson('/api/schedules', {
      method: 'POST',
      headers: facultyGuide.headers,
      body: {
        newProject: {
          title: 'Campus Smart Energy Grid Predictor',
          department: 'Computer Science & Engineering',
          academicYear: '2026–27',
        },
        templateId: stdTpl.id,
        assignedStudents: [
          { studentId: teamLeader.id, isTeamLeader: true },
          { studentId: teamMember.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'Asia/Kolkata',
          projectStartDate: '2026-08-03', // Monday -> Week 1 ends Friday 2026-08-07
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    assert.equal(initRes.status, 201)
    scheduleId = initRes.payload.data.schedule.id

    // Configure predictable deadlines for testing 3d, 1d, 0d, overdue, individual, & approved rules
    const activities = initRes.payload.data.schedule.activities.map((a: any, idx: number) => {
      if (idx === 0) return { ...a, startDate: '2026-08-03', deadline: '2026-08-10', submissionMode: 'TEAM_SHARED' }
      if (idx === 1) return { ...a, startDate: '2026-08-11', deadline: '2026-08-14', submissionMode: 'INDIVIDUAL' }
      if (idx === 2) return { ...a, startDate: '2026-08-15', deadline: '2026-08-20', submissionMode: 'TEAM_SHARED' }
      return { ...a, startDate: '2026-08-21', deadline: '2026-09-25' }
    })

    await ProjectScheduleRepository.update(scheduleId, { activities })
    const pubRes = await apiJson(`/api/schedules/${scheduleId}/publish`, {
      method: 'POST',
      headers: facultyGuide.headers,
    })
    assert.equal(pubRes.status, 200)

    const pubActs = pubRes.payload.data.schedule.activities
    act1Id = pubActs[0].activityId
    act2Id = pubActs[1].activityId
    act3Id = pubActs[2].activityId

    // Approve Activity #3 upfront to verify smart rule skips reminders on already-approved activities
    const subAct3 = await apiJson(
      `/api/activity-submissions/workspaces/${scheduleId}/activities/${act3Id}/submit`,
      {
        method: 'POST',
        headers: teamLeader.headers,
        body: {
          description: 'Early approved activity submission',
          links: [{ url: 'https://github.com/cph/approved-act3', linkType: 'GITHUB_REPOSITORY', label: 'Repo' }],
        },
      }
    )
    assert.equal(subAct3.status, 201)
    const approveAct3 = await apiJson(
      `/api/activity-submissions/${subAct3.payload.data.submission.id}/review`,
      {
        method: 'POST',
        headers: facultyGuide.headers,
        body: { outcome: 'APPROVED', feedback: 'Approved upfront.' },
      }
    )
    assert.equal(approveAct3.status, 200)
  })

  after(async () => {
    setEmailTransportForTesting(null)
    reminderEngineService.stopScheduler()
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

  it('1. Correctly resolves schedule timezone date boundaries (UTC vs Asia/Kolkata)', () => {
    const utcEvening = new Date('2026-08-09T20:30:00Z') // Still Aug 9 in UTC, already Aug 10 (02:00 IST) in Asia/Kolkata
    assert.equal(resolveScheduleDateIso('UTC_DATE_ONLY', utcEvening), '2026-08-09')
    assert.equal(resolveScheduleDateIso('Asia/Kolkata', utcEvening), '2026-08-10')
  })

  it('2. Dispatches 3-days-before, due-tomorrow, due-today, overdue, and weekly report reminders with strict deduplication', async () => {
    // 2026-08-07 is 3 days before Act 1 (2026-08-10) AND due-today for Week 1 weekly report (2026-08-07)!
    const runAug07 = await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-07' },
    })
    assert.equal(runAug07.status, 200)
    assert.ok(runAug07.payload.data.dispatchedCount >= 4)

    // Immediate re-run on the SAME date must be 100% deduplicated (dispatchedCount === 0)
    const runAug07Repeat = await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-07' },
    })
    assert.equal(runAug07Repeat.status, 200)
    assert.equal(runAug07Repeat.payload.data.dispatchedCount, 0)

    // 2026-08-09: Due tomorrow for Act 1 (2026-08-10) AND Overdue for Week 1 report
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-09' },
    })

    // 2026-08-10: Due today for Act 1 (2026-08-10)
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-10' },
    })

    // 2026-08-11: Overdue for Act 1 (2026-08-10) AND 3 days before Act 2 (2026-08-14)
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-11' },
    })

    // Repeated overdue run on 2026-08-12 must NOT send a second overdue notification for Act 1 v1
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-12' },
    })

    // Verify all expected reminder types arrived cleanly for teamLeader and ZERO leaked to outsiderStudent
    const [leadNotifs, outsiderNotifs] = await Promise.all([
      apiJson('/api/notifications?limit=50', { headers: teamLeader.headers }),
      apiJson('/api/notifications?limit=50', { headers: outsiderStudent.headers }),
    ])
    assert.equal(leadNotifs.status, 200)
    assert.equal(outsiderNotifs.payload.data.totalCount, 0)

    const types = leadNotifs.payload.data.items.map((n: any) => n.type)
    assert.ok(types.includes('ACTIVITY_DEADLINE_UPCOMING'))
    assert.ok(types.includes('ACTIVITY_DUE_TOMORROW'))
    assert.ok(types.includes('ACTIVITY_DUE_TODAY'))
    assert.equal(
      types.filter((t: string) => t === 'ACTIVITY_OVERDUE').length,
      1,
      'Must trigger exactly ONE overdue notification per deadline version'
    )
    assert.ok(types.includes('WEEKLY_REPORT_DUE'))
    assert.ok(types.includes('WEEKLY_REPORT_OVERDUE'))

    // Approved Activity #3 (2026-08-20) must NEVER receive deadline reminders (run on 2026-08-17 & 2026-08-20)
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-17' },
    })
    const checkAct3 = await apiJson('/api/notifications?limit=50', { headers: teamLeader.headers })
    assert.equal(
      checkAct3.payload.data.items.some((n: any) => n.data?.activityId === act3Id && n.category === 'ACTIVITY'),
      false,
      'Already approved Activity #3 must receive zero deadline reminders'
    )
  })

  it('3. Respects Individual submission smart skip rule & sends Submission + Faculty Correction/Approval alerts', async () => {
    // Team Leader submits Individual Activity #2 BEFORE 2026-08-14 due date
    const subAct2 = await apiJson(
      `/api/activity-submissions/workspaces/${scheduleId}/activities/${act2Id}/submit`,
      {
        method: 'POST',
        headers: teamLeader.headers,
        body: {
          description: 'Team leader individual architecture analysis submitted.',
          links: [{ url: 'https://github.com/cph/act2-lead', linkType: 'GITHUB_REPOSITORY', label: 'PR' }],
        },
      }
    )
    assert.equal(subAct2.status, 201)

    // Team Member also submits Act 2 so we can test faculty correction + approval notification scoping
    const subAct2Member = await apiJson(
      `/api/activity-submissions/workspaces/${scheduleId}/activities/${act2Id}/submit`,
      {
        method: 'POST',
        headers: teamMember.headers,
        body: {
          description: 'Team member individual architecture draft.',
          links: [{ url: 'https://github.com/cph/act2-member', linkType: 'GITHUB_REPOSITORY', label: 'PR' }],
        },
      }
    )
    assert.equal(subAct2Member.status, 201)
    teamMemberSubmittedSubmissionId = subAct2Member.payload.data.submission.id

    // Verify ONLY assigned facultyGuide received ACTIVITY_SUBMISSION_RECEIVED (otherFaculty got 0)
    const [guideNotifs, otherFacNotifs] = await Promise.all([
      apiJson('/api/notifications?category=SUBMISSION&limit=20', { headers: facultyGuide.headers }),
      apiJson('/api/notifications?limit=20', { headers: otherFaculty.headers }),
    ])
    assert.ok(guideNotifs.payload.data.items.some((n: any) => n.type === 'ACTIVITY_SUBMISSION_RECEIVED'))
    assert.equal(otherFacNotifs.payload.data.totalCount, 0)

    // Run reminder check on 2026-08-14 (due today for Act 2): BOTH students submitted, so ZERO due-today alerts for Act 2!
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-14' },
    })
    const leadAfterAct2 = await apiJson('/api/notifications?limit=50', { headers: teamLeader.headers })
    assert.equal(
      leadAfterAct2.payload.data.items.some(
        (n: any) => n.data?.activityId === act2Id && n.type === 'ACTIVITY_DUE_TODAY'
      ),
      false,
      'Submitted student must not receive due-today submission reminder'
    )

    // Faculty requests changes on Team Member's INDIVIDUAL submission -> notifies Team Member ONLY (not Team Leader!)
    const reqChanges = await apiJson(
      `/api/activity-submissions/${teamMemberSubmittedSubmissionId}/review`,
      {
        method: 'POST',
        headers: facultyGuide.headers,
        body: { outcome: 'CHANGES_REQUESTED', feedback: 'Include sequence diagram in Section 2.' },
      }
    )
    assert.equal(reqChanges.status, 200)

    const [memberNotifs, leadNotifsAfterReview] = await Promise.all([
      apiJson('/api/notifications?category=REVIEW&limit=20', { headers: teamMember.headers }),
      apiJson('/api/notifications?category=REVIEW&limit=20', { headers: teamLeader.headers }),
    ])
    assert.ok(
      memberNotifs.payload.data.items.some(
        (n: any) => n.type === 'SUBMISSION_CHANGES_REQUESTED' && n.data?.submissionId === teamMemberSubmittedSubmissionId
      )
    )
    assert.equal(
      leadNotifsAfterReview.payload.data.items.some(
        (n: any) => n.data?.submissionId === teamMemberSubmittedSubmissionId
      ),
      false
    )

    // Team Member resubmits, Faculty approves -> SUBMISSION_APPROVED delivered
    await apiJson(
      `/api/activity-submissions/workspaces/${scheduleId}/activities/${act2Id}/resubmit`,
      {
        method: 'POST',
        headers: teamMember.headers,
        body: {
          description: 'Added sequence diagram cleanly.',
          links: [{ url: 'https://github.com/cph/act2-member-v2', linkType: 'GITHUB_REPOSITORY', label: 'PR v2' }],
        },
      }
    )
    await apiJson(`/api/activity-submissions/${teamMemberSubmittedSubmissionId}/review`, {
      method: 'POST',
      headers: facultyGuide.headers,
      body: { outcome: 'APPROVED', feedback: 'Approved cleanly.' },
    })
    const memberFinal = await apiJson('/api/notifications?category=REVIEW&limit=20', {
      headers: teamMember.headers,
    })
    assert.ok(memberFinal.payload.data.items.some((n: any) => n.type === 'SUBMISSION_APPROVED'))
  })

  it('4. Revised deadline initiates fresh reminder cycle without duplicating prior deadline alerts', async () => {
    const curSched = await apiJson(`/api/schedules/${scheduleId}`, { headers: facultyGuide.headers })
    const updatedActs = JSON.parse(JSON.stringify(curSched.payload.data.activities))
    updatedActs[0].deadline = '2026-08-18' // Revised Activity #1 deadline (v2)

    const patchRes = await apiJson(`/api/schedules/${scheduleId}/published`, {
      method: 'PATCH',
      headers: facultyGuide.headers,
      body: {
        reason: 'Extended Activity #1 deadline to Aug 18 after semester orientation.',
        activities: updatedActs,
      },
    })
    assert.equal(patchRes.status, 200)

    // Run reminder check for NEW deadline (2026-08-18 is due today -> sends v2 DUE_TODAY without duplicating v1)
    const runAug18 = await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-18' },
    })
    assert.equal(runAug18.status, 200)

    const leadNotifs = await apiJson('/api/notifications?limit=50', { headers: teamLeader.headers })
    const v2DueToday = leadNotifs.payload.data.items.filter(
      (n: any) =>
        n.data?.activityId === act1Id &&
        n.type === 'ACTIVITY_DUE_TODAY' &&
        n.deadlineVersion === 2
    )
    assert.equal(v2DueToday.length, 1, 'Revised deadline version 2 triggers its own clean reminder')
    assert.ok(
      leadNotifs.payload.data.items.some((n: any) => n.type === 'SCHEDULE_DEADLINE_UPDATED')
    )
  })

  it('5. Supports optional email delivery hook, records delivery failure safely, enforces Admin config, & honors user preferences', async () => {
    // Student cannot edit institutional reminder policy (403)
    const nonAdminCfg = await apiJson('/api/notifications/config', {
      method: 'PUT',
      headers: teamLeader.headers,
      body: { activityDaysBefore: [5, 2, 0] },
    })
    assert.equal(nonAdminCfg.status, 403)

    // Admin updates configurable reminder intervals (adds 5 days before)
    const adminCfg = await apiJson('/api/notifications/config', {
      method: 'PUT',
      headers: adminUser.headers,
      body: { activityDaysBefore: [5, 3, 1, 0] },
    })
    assert.equal(adminCfg.status, 200)
    assert.deepEqual(adminCfg.payload.data.activityDaysBefore, [5, 3, 1, 0])

    // Test optional email transport & temporary delivery failure resilience
    let deliveredEmails = 0
    setEmailTransportForTesting(async () => {
      deliveredEmails++
      throw new Error('Simulated transient SMTP timeout')
    })

    // Trigger weekly report submission -> in-app succeeds and records email failure without crashing
    const wk1Sub = await apiJson(
      `/api/weekly-reports/projects/${scheduleId}/weeks/1/submit`,
      {
        method: 'POST',
        headers: teamLeader.headers,
        body: {
          workCompleted: 'Completed Week 1 schedule & data pipeline setup.',
          workInProgress: 'Grid forecasting model.',
          challengesOrBlockers: 'None.',
          planForNextWeek: 'Baseline benchmark comparison.',
          supportingEvidenceNotes: 'Linked repository.',
          links: [{ url: 'https://github.com/cph/grid-w1', linkType: 'GITHUB_REPOSITORY', label: 'Repo' }],
        },
      }
    )
    assert.equal(wk1Sub.status, 201)
    assert.equal(deliveredEmails, 1)

    setEmailTransportForTesting(null)
    const statusRes = await apiJson('/api/notifications/delivery-status', { headers: facultyGuide.headers })
    assert.equal(statusRes.status, 200)
    assert.equal(statusRes.payload.data.emailChannel.configured, false)

    // Team Member disables weeklyReportReminders preference
    const prefUpdate = await apiJson('/api/notifications/preferences', {
      method: 'PUT',
      headers: teamMember.headers,
      body: { weeklyReportReminders: false },
    })
    assert.equal(prefUpdate.status, 200)
    assert.equal(prefUpdate.payload.data.weeklyReportReminders, false)

    // Trigger approaching Week 3 reminder (Week 3 deadline is 2026-08-21 -> 2 days before is 2026-08-19)
    await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-19' },
    })

    const [leadW3, memberW3] = await Promise.all([
      apiJson('/api/notifications?category=WEEKLY_REPORT&limit=30', { headers: teamLeader.headers }),
      apiJson('/api/notifications?category=WEEKLY_REPORT&limit=30', { headers: teamMember.headers }),
    ])
    assert.ok(leadW3.payload.data.items.some((n: any) => n.data?.weekNumber === 3))
    assert.equal(
      memberW3.payload.data.items.some((n: any) => n.data?.weekNumber === 3),
      false,
      'Opted-out teamMember must not receive Week 3 weekly report reminder'
    )
  })

  it('6. Enforces notification ownership, pagination, mark read/all/clear, and survives MongoDB restart without re-spamming cleared alerts', async () => {
    const page1 = await apiJson('/api/notifications?page=1&limit=2', { headers: teamLeader.headers })
    assert.equal(page1.status, 200)
    assert.equal(page1.payload.data.items.length, 2)
    assert.equal(page1.payload.data.hasMore, true)

    const targetNotifId = page1.payload.data.items[0].id

    // Team Member CANNOT mark Team Leader's notification read (403)
    const crossRead = await apiJson(`/api/notifications/${targetNotifId}/read`, {
      method: 'PATCH',
      headers: teamMember.headers,
    })
    assert.equal(crossRead.status, 403)

    // Team Leader marks single read, marks all read, and clears history
    const singleRead = await apiJson(`/api/notifications/${targetNotifId}/read`, {
      method: 'PATCH',
      headers: teamLeader.headers,
    })
    assert.equal(singleRead.status, 200)

    const allRead = await apiJson('/api/notifications/read-all', {
      method: 'PATCH',
      headers: teamLeader.headers,
    })
    assert.equal(allRead.status, 200)

    const unreadCheck = await apiJson('/api/notifications/unread-count', {
      headers: teamLeader.headers,
    })
    assert.equal(unreadCheck.payload.data.unreadCount, 0)

    const clearRes = await apiJson('/api/notifications', {
      method: 'DELETE',
      headers: teamLeader.headers,
    })
    assert.equal(clearRes.status, 200)
    assert.ok(clearRes.payload.data.clearedCount > 0)

    // Simulate backend + MongoDB restart, then re-run reminder engine on same date ->
    // previously cleared alerts MUST NOT be re-created (NotificationDispatchLog persists!)
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const postRestartRun = await apiJson('/api/notifications/reminders/run', {
      method: 'POST',
      headers: adminUser.headers,
      body: { referenceDateIso: '2026-08-18' },
    })
    assert.equal(postRestartRun.status, 200)
    assert.equal(postRestartRun.payload.data.dispatchedCount, 0)

    const clearedListCheck = await apiJson('/api/notifications', { headers: teamLeader.headers })
    assert.equal(clearedListCheck.payload.data.totalCount, 0)
  })
})
