import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../app.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { formatUtcDate } from '../modules/schedules/calendar.utils.js'
import { ProjectScheduleRepository } from '../modules/schedules/schedule.model.js'
import { seedScheduleTemplates } from '../modules/schedules/schedule.seeder.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task3_weekly_test'

describe('TASK 3 — Weekly Student Progress Reporting E2E Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK
  const origStorageDir = process.env.EVIDENCE_STORAGE_DIR
  const tempEvidenceDir = path.join(os.tmpdir(), `cph_task3_evidence_${Date.now()}`)

  let facultyGuide: TestAuthSession
  let otherFaculty: TestAuthSession
  let teamLeader: TestAuthSession
  let teamMember: TestAuthSession
  let outsiderStudent: TestAuthSession

  let wedStartScheduleId = ''
  let activeDeadlineScheduleId = ''
  let week1PdfFileId = ''
  let week1ReportId = ''

  const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n% Weekly Evidence Doc\n%%EOF\n')
  const VALID_PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ])

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
    method: 'POST' | 'PUT',
    headers: Record<string, string>,
    fields: Record<string, unknown>,
    files: Array<{ name: string; mime: string; bytes: Buffer }> = []
  ) {
    const formData = new FormData()
    for (const [k, v] of Object.entries(fields)) {
      formData.append(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
    for (const f of files) {
      formData.append('files', new Blob([new Uint8Array(f.bytes)], { type: f.mime }), f.name)
    }
    const res = await fetch(`${baseUrl}${reqPath}`, { method, headers, body: formData })
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

    facultyGuide = await createAuthenticatedTestUser({
      label: 't3-faculty-guide',
      role: 'faculty',
      fullName: 'Dr. Ramesh Bhat',
    })
    otherFaculty = await createAuthenticatedTestUser({
      label: 't3-other-faculty',
      role: 'faculty',
      fullName: 'Prof. Sunita Hegde',
    })
    teamLeader = await createAuthenticatedTestUser({
      label: 't3-lead',
      role: 'student',
      fullName: 'Aarav Kulkarni',
    })
    teamMember = await createAuthenticatedTestUser({
      label: 't3-member',
      role: 'student',
      fullName: 'Divya Menon',
    })
    outsiderStudent = await createAuthenticatedTestUser({
      label: 't3-outsider',
      role: 'student',
      fullName: 'Nikhil Rao',
    })

    delete process.env.ALLOW_INMEMORY_FALLBACK

    const app = createApp()
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    const addr = server.address() as any
    baseUrl = `http://127.0.0.1:${addr.port}`

    const tplRes = await apiJson('/api/schedules/templates', { headers: facultyGuide.headers })
    const stdTpl = tplRes.payload.data.find((t: any) => t.code === 'STANDARD_MINI_PROJECT_8W')

    // 1. Wednesday-start project (2026-07-01, holiday on Fri 2026-07-03, Mon-Fri working days)
    const wedInit = await apiJson('/api/schedules', {
      method: 'POST',
      headers: facultyGuide.headers,
      body: {
        newProject: {
          title: 'Smart Library Book Circulation Analytics',
          department: 'Computer Science & Engineering',
          academicYear: '2026–27',
        },
        templateId: stdTpl.id,
        assignedStudents: [
          { studentId: teamLeader.id, isTeamLeader: true },
          { studentId: teamMember.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-07-01', // Wednesday!
          workingDays: [1, 2, 3, 4, 5],
          holidays: [{ date: '2026-07-03', label: 'Founders Day Holiday' }],
        },
      },
    })
    wedStartScheduleId = wedInit.payload.data.schedule.id
    const wedPub = await apiJson(`/api/schedules/${wedStartScheduleId}/publish`, {
      method: 'POST',
      headers: facultyGuide.headers,
    })
    assert.equal(wedPub.status, 200)

    // 2. Active semester schedule starting around today (2026-11-10) so Week 1 is current & upcoming/on-time
    const todayIso = formatUtcDate(new Date())
    const activeInit = await apiJson('/api/schedules', {
      method: 'POST',
      headers: facultyGuide.headers,
      body: {
        newProject: {
          title: 'Campus Lab Equipment Booking & Maintenance Portal',
          department: 'Computer Science & Engineering',
          academicYear: '2026–27',
        },
        templateId: stdTpl.id,
        assignedStudents: [
          { studentId: teamLeader.id, isTeamLeader: true },
          { studentId: teamMember.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: todayIso,
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    activeDeadlineScheduleId = activeInit.payload.data.schedule.id
    const actPub = await apiJson(`/api/schedules/${activeDeadlineScheduleId}/publish`, {
      method: 'POST',
      headers: facultyGuide.headers,
    })
    assert.equal(actPub.status, 200)
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

  it('1. Generates calendar-aligned weekly periods honoring Wednesday start, weekends, and institutional holidays', async () => {
    const res = await apiJson(`/api/weekly-reports/projects/${wedStartScheduleId}`, {
      headers: teamLeader.headers,
    })
    assert.equal(res.status, 200)
    const weeks = res.payload.data.weeks
    assert.equal(weeks.length, 8)

    // Week 1 starts Wed 2026-07-01. Working days Mon-Fri with Fri 2026-07-03 as Holiday:
    // Working days in Week 1 = Wed Jul 01 (1), Thu Jul 02 (2), [Fri Jul 03 Holiday], [Sat/Sun], Mon Jul 06 (3), Tue Jul 07 (4), Wed Jul 08 (5)
    assert.equal(weeks[0].period.weekNumber, 1)
    assert.equal(weeks[0].period.reportingPeriodStart, '2026-07-01')
    assert.equal(weeks[0].period.reportingPeriodEnd, '2026-07-08')
    assert.equal(weeks[0].period.reportingDeadline, '2026-07-08')
    assert.equal(weeks[0].period.workingDaysCount, 5)
    assert.ok(weeks[0].period.overlappingActivities.length >= 1)

    // Past weeks in Jul 2026 without reports are identified cleanly as OVERDUE
    assert.equal(weeks[0].effectiveStatus, 'OVERDUE')
    assert.equal(weeks[0].reminderSignal, 'OVERDUE')
  })

  it('2. Supports team draft saving and separate Student-Reported individual contributions from multiple team members', async () => {
    // Save Week 1 Draft on active schedule with PDF upload
    const draftRes = await submitMultipart(
      `/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1/draft`,
      'PUT',
      teamLeader.headers,
      {
        workCompleted: 'Draft: Finalized problem scope and reviewed prior college systems.',
        workInProgress: 'Drafting database schema.',
        challengesOrBlockers: 'None so far.',
        planForNextWeek: 'Complete ER diagram and UI mockups.',
        supportingEvidenceNotes: 'Attached initial scope PDF.',
        links: [
          {
            url: 'https://github.com/campusprojecthub/lab-portal',
            linkType: 'GITHUB_REPOSITORY',
            label: 'Lab Portal Repo',
          },
        ],
        evidenceCategories: ['PDF_DOCUMENT'],
      },
      [{ name: 'week1-notes.pdf', mime: 'application/pdf', bytes: VALID_PDF_BYTES }]
    )
    assert.equal(draftRes.status, 200)
    assert.equal(draftRes.payload.data.status, 'DRAFT')
    assert.equal(draftRes.payload.data.evidenceFiles.length, 1)
    week1PdfFileId = draftRes.payload.data.evidenceFiles[0].fileId

    // Team Leader adds individual contribution entry
    const sched = await ProjectScheduleRepository.findById(activeDeadlineScheduleId)
    const firstActivityId = sched!.activities[0].activityId

    const leadContrib = await submitMultipart(
      `/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1/contributions`,
      'POST',
      teamLeader.headers,
      {
        workPerformed: 'Prepared system proposal matrix and repository comparison notes.',
        relatedActivityId: firstActivityId,
        supportingEvidenceNote: 'Uploaded title approval summary PDF.',
      }
    )
    assert.equal(leadContrib.status, 200)
    assert.equal(leadContrib.payload.data.contributions.length, 1)
    assert.equal(leadContrib.payload.data.contributions[0].verificationLabel, 'STUDENT_REPORTED')

    // Team Member adds their OWN individual contribution without overwriting Team Leader's entry
    const memberContrib = await submitMultipart(
      `/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1/contributions`,
      'POST',
      teamMember.headers,
      {
        workPerformed: 'Designed relational schema tables for lab equipment bookings.',
        supportingEvidenceNote: 'Initial ERD commit pushed to branch.',
      }
    )
    assert.equal(memberContrib.status, 200)
    assert.equal(memberContrib.payload.data.contributions.length, 2)
    assert.equal(memberContrib.payload.data.contributions[0].studentId, teamLeader.id)
    assert.equal(memberContrib.payload.data.contributions[1].studentId, teamMember.id)
  })

  it('3. Submits shared team weekly report cleanly, blocks duplicate re-submit while locked, and secures evidence files', async () => {
    const subRes = await submitMultipart(
      `/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1/submit`,
      'POST',
      teamMember.headers,
      {
        workCompleted: 'Finalized project title scope, ER model, and lab equipment booking API endpoints.',
        workInProgress: 'Frontend reservation calendar form validation.',
        challengesOrBlockers: 'Waiting for lab coordinator slot rules.',
        planForNextWeek: 'Complete reservation booking UI and unit tests.',
        supportingEvidenceNotes: 'Attached schema screenshot alongside draft PDF.',
        links: [
          {
            url: 'https://github.com/campusprojecthub/lab-portal/pull/1',
            linkType: 'GITHUB_REPOSITORY',
            label: 'PR #1 Schema & Endpoints',
          },
        ],
        retainFileIds: [week1PdfFileId],
        evidenceCategories: ['UI_UX_SCREENSHOT'],
      },
      [{ name: 'schema-preview.png', mime: 'image/png', bytes: VALID_PNG_BYTES }]
    )
    assert.equal(subRes.status, 201)
    const report = subRes.payload.data
    week1ReportId = report.id
    assert.equal(report.status, 'SUBMITTED')
    assert.equal(report.latestRevisionNumber, 1)
    assert.equal(report.isLateSubmission, false)
    assert.ok(report.submittedAt)
    assert.equal(report.evidenceFiles.length, 2)
    assert.equal(report.revisions.length, 1)

    // Team Leader cannot overwrite/re-submit while status is SUBMITTED (409)
    const dupSubmit = await submitMultipart(
      `/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1/submit`,
      'POST',
      teamLeader.headers,
      {
        workCompleted: 'Duplicate attempt',
        workInProgress: 'None',
        challengesOrBlockers: 'None',
        planForNextWeek: 'None',
        supportingEvidenceNotes: 'None',
      }
    )
    assert.equal(dupSubmit.status, 409)

    // Authorized team member & faculty CAN read private weekly file; outsider CANNOT (403)
    const [leadFileRes, facFileRes, outsiderFileRes] = await Promise.all([
      fetch(`${baseUrl}/api/weekly-reports/files/${week1PdfFileId}`, { headers: teamLeader.headers }),
      fetch(`${baseUrl}/api/weekly-reports/files/${week1PdfFileId}`, { headers: facultyGuide.headers }),
      fetch(`${baseUrl}/api/weekly-reports/files/${week1PdfFileId}`, { headers: outsiderStudent.headers }),
    ])
    assert.equal(leadFileRes.status, 200)
    assert.equal(facFileRes.status, 200)
    assert.equal(outsiderFileRes.status, 403)
    const buf = Buffer.from(await leadFileRes.arrayBuffer())
    assert.equal(buf.equals(VALID_PDF_BYTES), true)
  })

  it('4. Supports Faculty review, clarification request, student resubmission preserving history, and Finalize without auto-approving activities', async () => {
    // Non-assigned faculty & students blocked (403)
    const otherFacAttempt = await apiJson(`/api/weekly-reports/${week1ReportId}/review`, {
      method: 'POST',
      headers: otherFaculty.headers,
      body: { action: 'FINALIZE', comment: 'Unauthorized faculty attempt' },
    })
    assert.equal(otherFacAttempt.status, 403)

    const studentReviewAttempt = await apiJson(`/api/weekly-reports/${week1ReportId}/review`, {
      method: 'POST',
      headers: teamLeader.headers,
      body: { action: 'FINALIZE', comment: 'Self-finalize attempt' },
    })
    assert.equal(studentReviewAttempt.status, 403)

    // Assigned faculty marks UNDER_REVIEW, then requests clarification
    const underReviewRes = await apiJson(`/api/weekly-reports/${week1ReportId}/review`, {
      method: 'POST',
      headers: facultyGuide.headers,
      body: { action: 'MARK_UNDER_REVIEW', comment: 'Reviewing Week 1 deliverables.' },
    })
    assert.equal(underReviewRes.status, 200)
    assert.equal(underReviewRes.payload.data.status, 'UNDER_REVIEW')

    const clarifyRes = await apiJson(`/api/weekly-reports/${week1ReportId}/review`, {
      method: 'POST',
      headers: facultyGuide.headers,
      body: {
        action: 'REQUEST_CLARIFICATION',
        comment: 'Please clarify which lab coordinator constraints remain unresolved in Section C.',
      },
    })
    assert.equal(clarifyRes.status, 200)
    assert.equal(clarifyRes.payload.data.status, 'CLARIFICATION_REQUESTED')

    // Verify reminder-candidates surfaces CLARIFICATION_REQUESTED cleanly
    const remRes = await apiJson('/api/weekly-reports/reminder-candidates', {
      headers: facultyGuide.headers,
    })
    assert.equal(remRes.status, 200)
    assert.ok(
      remRes.payload.data.some(
        (c: any) =>
          c.scheduleId === activeDeadlineScheduleId &&
          c.weekNumber === 1 &&
          c.reminderSignal === 'CLARIFICATION_REQUESTED'
      )
    )

    // Student submits updated report (Revision #2) preserving Revision #1 and faculty comments
    const resubRes = await submitMultipart(
      `/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1/submit`,
      'POST',
      teamLeader.headers,
      {
        workCompleted: 'Updated Week 1 summary with coordinator approval rule notes.',
        workInProgress: 'Calendar component implementation.',
        challengesOrBlockers: 'Resolved after coordinator sync on slot caps.',
        planForNextWeek: 'Complete booking validation tests.',
        supportingEvidenceNotes: 'Retained prior PDF + screenshot evidence.',
        retainFileIds: [week1PdfFileId],
      }
    )
    assert.equal(resubRes.status, 201)
    assert.equal(resubRes.payload.data.status, 'SUBMITTED')
    assert.equal(resubRes.payload.data.latestRevisionNumber, 2)
    assert.equal(resubRes.payload.data.revisions.length, 2)
    assert.equal(resubRes.payload.data.facultyComments.length, 2)

    // Faculty finalizes the report
    const finalizeRes = await apiJson(`/api/weekly-reports/${week1ReportId}/review`, {
      method: 'POST',
      headers: facultyGuide.headers,
      body: { action: 'FINALIZE', comment: 'Week 1 progress report verified and finalized.' },
    })
    assert.equal(finalizeRes.status, 200)
    assert.equal(finalizeRes.payload.data.status, 'FINALIZED')

    // Scheduled activities must remain formally uncompleted/unreviewed (separate workflow!)
    const schedAfter = await ProjectScheduleRepository.findById(activeDeadlineScheduleId)
    assert.equal(schedAfter!.activities[0].activityStatus, 'NOT_STARTED')
    assert.equal(schedAfter!.activities[0].facultyReviewStatus, 'NOT_REVIEWED')
  })

  it('5. Handles late weekly report submission cleanly while keeping history and persists across MongoDB restart', async () => {
    const lateSubmit = await submitMultipart(
      `/api/weekly-reports/projects/${wedStartScheduleId}/weeks/1/submit`,
      'POST',
      teamLeader.headers,
      {
        workCompleted: 'Retrospective late submission for Week 1 library analytics.',
        workInProgress: 'Ingestion scripts.',
        challengesOrBlockers: 'Late exam week schedule.',
        planForNextWeek: 'Submit Week 2 update.',
        supportingEvidenceNotes: 'Added reference link.',
        links: [
          {
            url: 'https://github.com/campusprojecthub/library-analytics',
            linkType: 'GITHUB_REPOSITORY',
            label: 'Analytics Repo',
          },
        ],
      }
    )
    assert.equal(lateSubmit.status, 201)
    assert.equal(lateSubmit.payload.data.isLateSubmission, true)
    assert.ok(lateSubmit.payload.data.lateByDays > 0)

    // Outsider student strictly blocked from viewing project reports
    const outsiderRead = await apiJson(`/api/weekly-reports/projects/${activeDeadlineScheduleId}`, {
      headers: outsiderStudent.headers,
    })
    assert.equal(outsiderRead.status, 403)

    // Disconnect and reconnect MongoDB to verify zero in-memory dependency
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const [detailAfterReconnect, fileAfterReconnect] = await Promise.all([
      apiJson(`/api/weekly-reports/projects/${activeDeadlineScheduleId}/weeks/1`, {
        headers: teamMember.headers,
      }),
      fetch(`${baseUrl}/api/weekly-reports/files/${week1PdfFileId}`, { headers: teamMember.headers }),
    ])

    assert.equal(detailAfterReconnect.status, 200)
    assert.equal(detailAfterReconnect.payload.data.effectiveStatus, 'FINALIZED')
    assert.equal(detailAfterReconnect.payload.data.report.revisions.length, 2)
    assert.equal(detailAfterReconnect.payload.data.report.contributions.length, 2)
    assert.equal(detailAfterReconnect.payload.data.report.facultyComments.length, 3)
    assert.equal(fileAfterReconnect.status, 200)
  })
})
