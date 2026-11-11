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

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task2_submission_test'

describe('TASK 2 — Student Activity Tracker & Evidence Submission E2E Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK
  const origStorageDir = process.env.EVIDENCE_STORAGE_DIR
  const tempEvidenceDir = path.join(os.tmpdir(), `cph_task2_evidence_${Date.now()}`)

  let facultyGuide: TestAuthSession
  let otherFaculty: TestAuthSession
  let teamLeader: TestAuthSession
  let teamMember: TestAuthSession
  let outsiderStudent: TestAuthSession

  let publishedScheduleId = ''
  let draftScheduleId = ''
  let onTimeActivityId = ''
  let lateActivityId = ''
  let individualActivityId = ''

  let sharedPdfFileId = ''
  let sharedSubmissionId = ''
  let teamLeaderIndividualFileId = ''

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
    params: {
      description: string
      links?: Array<{ url: string; linkType: string; label: string }>
      files?: Array<{ name: string; mime: string; bytes: Buffer; category?: string }>
    }
  ) {
    const formData = new FormData()
    formData.append('description', params.description)
    formData.append('links', JSON.stringify(params.links || []))
    formData.append(
      'evidenceCategories',
      JSON.stringify((params.files || []).map((f) => f.category || 'PDF_DOCUMENT'))
    )
    for (const f of params.files || []) {
      formData.append('files', new Blob([new Uint8Array(f.bytes)], { type: f.mime }), f.name)
    }
    const res = await fetch(`${baseUrl}${reqPath}`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const payload = (await res.json().catch(() => ({}))) as any
    return { status: res.status, payload }
  }

  const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')
  const VALID_PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ])

  before(async () => {
    delete process.env.ALLOW_INMEMORY_FALLBACK
    process.env.EVIDENCE_STORAGE_DIR = tempEvidenceDir
    await connectDatabase(TEST_MONGO_URI)
    const { default: mongoose } = await import('mongoose')
    await mongoose.connection.db!.dropDatabase()

    await seedScheduleTemplates()

    facultyGuide = await createAuthenticatedTestUser({
      label: 't2-faculty-guide',
      role: 'faculty',
      fullName: 'Dr. Meera Kulkarni',
    })
    otherFaculty = await createAuthenticatedTestUser({
      label: 't2-other-faculty',
      role: 'faculty',
      fullName: 'Prof. Vikram Joshi',
    })
    teamLeader = await createAuthenticatedTestUser({
      label: 't2-lead',
      role: 'student',
      fullName: 'Rohan Sharma',
    })
    teamMember = await createAuthenticatedTestUser({
      label: 't2-member',
      role: 'student',
      fullName: 'Priya Nair',
    })
    outsiderStudent = await createAuthenticatedTestUser({
      label: 't2-outsider',
      role: 'student',
      fullName: 'Sneha Patel',
    })

    // Enforce strict MongoDB persistence without fallback
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const app = createApp()
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    const addr = server.address() as any
    baseUrl = `http://127.0.0.1:${addr.port}`

    const tplRes = await apiJson('/api/schedules/templates', { headers: facultyGuide.headers })
    const stdTemplate = tplRes.payload.data.find((t: any) => t.code === 'STANDARD_MINI_PROJECT_8W')

    // Create a DRAFT schedule (must stay hidden from students)
    const draftInit = await apiJson('/api/schedules', {
      method: 'POST',
      headers: facultyGuide.headers,
      body: {
        newProject: {
          title: 'Unpublished Draft Project',
          department: 'Computer Science & Engineering',
          academicYear: '2026–27',
        },
        templateId: stdTemplate.id,
        assignedStudents: [{ studentId: teamLeader.id, isTeamLeader: true }],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-12-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    draftScheduleId = draftInit.payload.data.schedule.id

    // Create & publish main Task 2 test schedule containing:
    // - Activity 1 (TEAM_SHARED, future deadline 2026-12-30 -> On Time)
    // - Activity 2 (TEAM_SHARED, past deadline 2026-06-04 -> Late submission testing)
    // - Activity 3 (INDIVIDUAL, future deadline 2026-12-31 -> Individual submission permission testing)
    const pubInit = await apiJson('/api/schedules', {
      method: 'POST',
      headers: facultyGuide.headers,
      body: {
        newProject: {
          title: 'Campus Academic Integrity & Citation Analyzer',
          department: 'Computer Science & Engineering',
          academicYear: '2026–27',
          problemStatement: 'Verify bibliography references across student project reports.',
        },
        templateId: stdTemplate.id,
        assignedStudents: [
          { studentId: teamLeader.id, isTeamLeader: true },
          { studentId: teamMember.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: '2026-06-01',
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    publishedScheduleId = pubInit.payload.data.schedule.id

    const customActivities = pubInit.payload.data.schedule.activities.map((a: any, idx: number) => {
      if (idx === 0) {
        return { ...a, startDate: '2026-11-01', deadline: '2026-12-30', submissionMode: 'TEAM_SHARED' }
      }
      if (idx === 1) {
        return { ...a, startDate: '2026-06-01', deadline: '2026-06-04', submissionMode: 'TEAM_SHARED' }
      }
      if (idx === 2) {
        return { ...a, startDate: '2026-11-01', deadline: '2026-12-31', submissionMode: 'INDIVIDUAL' }
      }
      return { ...a, startDate: '2026-11-15', deadline: '2026-12-31' }
    })

    await ProjectScheduleRepository.update(publishedScheduleId, { activities: customActivities })
    const pubRes = await apiJson(`/api/schedules/${publishedScheduleId}/publish`, {
      method: 'POST',
      headers: facultyGuide.headers,
    })
    assert.equal(pubRes.status, 200)

    const acts = pubRes.payload.data.schedule.activities
    onTimeActivityId = acts[0].activityId
    lateActivityId = acts[1].activityId
    individualActivityId = acts[2].activityId
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

  it('1. Student workspace displays ONLY authorized published projects and complete activity details', async () => {
    const wsRes = await apiJson('/api/activity-submissions/workspaces', {
      headers: teamMember.headers,
    })
    assert.equal(wsRes.status, 200)
    const ids = wsRes.payload.data.map((w: any) => w.schedule.id)
    assert.ok(ids.includes(publishedScheduleId))
    assert.ok(!ids.includes(draftScheduleId), 'Draft schedules must stay hidden from students')

    // Outsider student sees zero team schedules and receives 403 on direct access
    const outsiderList = await apiJson('/api/activity-submissions/workspaces', {
      headers: outsiderStudent.headers,
    })
    assert.equal(outsiderList.status, 200)
    assert.equal(outsiderList.payload.data.length, 0)

    const outsiderDetail = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}`,
      { headers: outsiderStudent.headers }
    )
    assert.equal(outsiderDetail.status, 403)

    // Activity details expose instructions, deliverables, formats, status, and read-only lock
    const actRes = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}`,
      { headers: teamMember.headers }
    )
    assert.equal(actRes.status, 200)
    assert.equal(actRes.payload.data.submissionStatus, 'NOT_SUBMITTED')
    assert.equal(actRes.payload.data.permissions.canSubmitInitial, true)
    assert.equal(actRes.payload.data.permissions.canModifyOfficialSchedule, false)
    assert.ok(actRes.payload.data.activity.requiredSubmissionDescription.length > 0)
    assert.ok(Array.isArray(actRes.payload.data.activity.acceptedEvidenceFormats))
  })

  it('2. Rejects invalid, spoofed, and empty evidence files cleanly with 400 Bad Request', async () => {
    // Disallowed executable extension
    const exeRes = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}/submit`,
      teamLeader.headers,
      {
        description: 'Attempt uploading disallowed script file',
        files: [
          {
            name: 'payload.exe',
            mime: 'application/octet-stream',
            bytes: Buffer.from('MZ fake executable'),
          },
        ],
      }
    )
    assert.equal(exeRes.status, 400)

    // Spoofed PDF filename containing plain text (invalid %PDF- magic bytes)
    const spoofRes = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}/submit`,
      teamLeader.headers,
      {
        description: 'Attempt uploading spoofed PDF file',
        files: [
          {
            name: 'fake-report.pdf',
            mime: 'application/pdf',
            bytes: Buffer.from('NOT A REAL PDF HEADER'),
          },
        ],
      }
    )
    assert.equal(spoofRes.status, 400)

    // Empty 0-byte PDF
    const emptyRes = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}/submit`,
      teamLeader.headers,
      {
        description: 'Attempt uploading empty PDF file',
        files: [
          {
            name: 'empty.pdf',
            mime: 'application/pdf',
            bytes: Buffer.alloc(0),
          },
        ],
      }
    )
    assert.equal(emptyRes.status, 400)
  })

  it('3. Uploads real PDF + PNG evidence to private storage, shares across team, prevents duplicate submission, and blocks public/unauthenticated file access', async () => {
    const subRes = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}/submit`,
      teamLeader.headers,
      {
        description: 'Submitted approved topic summary PDF, UI wireframe screenshot, and GitHub repo.',
        links: [
          {
            url: 'https://github.com/campusprojecthub/citation-analyzer',
            linkType: 'GITHUB_REPOSITORY',
            label: 'Project Repository',
          },
        ],
        files: [
          {
            name: 'title-approval.pdf',
            mime: 'application/pdf',
            bytes: VALID_PDF_BYTES,
            category: 'PDF_DOCUMENT',
          },
          {
            name: 'wireframe.png',
            mime: 'image/png',
            bytes: VALID_PNG_BYTES,
            category: 'UI_UX_SCREENSHOT',
          },
        ],
      }
    )
    assert.equal(subRes.status, 201)
    assert.equal(subRes.payload.data.submission.status, 'SUBMITTED')
    assert.equal(subRes.payload.data.submission.latestRevisionNumber, 1)
    assert.equal(subRes.payload.data.revision.isLate, false)
    assert.equal(subRes.payload.data.revision.evidenceFiles.length, 2)

    sharedSubmissionId = subRes.payload.data.submission.id
    sharedPdfFileId = subRes.payload.data.revision.evidenceFiles[0].fileId

    // Team Member sees shared team submission and can download the private PDF
    const memberView = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}`,
      { headers: teamMember.headers }
    )
    assert.equal(memberView.status, 200)
    assert.equal(memberView.payload.data.submissionStatus, 'SUBMITTED')
    assert.equal(memberView.payload.data.permissions.canSubmitInitial, false)
    assert.equal(
      memberView.payload.data.submission.createdByStudentName,
      teamLeader.user.fullName
    )

    const fileFetchByMember = await fetch(
      `${baseUrl}/api/activity-submissions/files/${sharedPdfFileId}`,
      { headers: teamMember.headers }
    )
    assert.equal(fileFetchByMember.status, 200)
    assert.equal(fileFetchByMember.headers.get('x-content-type-options'), 'nosniff')
    const downloadedBuf = Buffer.from(await fileFetchByMember.arrayBuffer())
    assert.equal(downloadedBuf.equals(VALID_PDF_BYTES), true)

    // Duplicate initial submission by Team Member MUST be rejected with 409 Conflict
    const dupRes = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}/submit`,
      teamMember.headers,
      {
        description: 'Duplicate accidental team submission attempt',
        links: [
          {
            url: 'https://github.com/campusprojecthub/duplicate',
            linkType: 'GITHUB_REPOSITORY',
            label: 'Dup Repo',
          },
        ],
      }
    )
    assert.equal(dupRes.status, 409)

    // Unauthenticated & Outsider Student file access strictly blocked (401 / 403)
    const noAuthFile = await fetch(`${baseUrl}/api/activity-submissions/files/${sharedPdfFileId}`)
    assert.equal(noAuthFile.status, 401)

    const outsiderFile = await fetch(
      `${baseUrl}/api/activity-submissions/files/${sharedPdfFileId}`,
      { headers: outsiderStudent.headers }
    )
    assert.equal(outsiderFile.status, 403)

    // Direct public URL path probing returns non-200 (never publicly static-served)
    const staticProbe = await fetch(`${baseUrl}/storage/private-evidence/${sharedPdfFileId}.pdf`)
    assert.notEqual(staticProbe.status, 200)
  })

  it('4. Preserves complete revision history across Faculty CHANGES_REQUESTED -> Student Resubmit -> Approved', async () => {
    // Non-assigned faculty and students cannot trigger faculty review state transitions
    const nonGuideReview = await apiJson(
      `/api/activity-submissions/${sharedSubmissionId}/review`,
      {
        method: 'POST',
        headers: otherFaculty.headers,
        body: { outcome: 'CHANGES_REQUESTED', feedback: 'Unauthorized faculty review' },
      }
    )
    assert.equal(nonGuideReview.status, 403)

    const studentReviewAttempt = await apiJson(
      `/api/activity-submissions/${sharedSubmissionId}/review`,
      {
        method: 'POST',
        headers: teamLeader.headers,
        body: { outcome: 'APPROVED', feedback: 'Self approval attempt' },
      }
    )
    assert.equal(studentReviewAttempt.status, 403)

    // Assigned faculty guide requests corrections
    const changesRes = await apiJson(
      `/api/activity-submissions/${sharedSubmissionId}/review`,
      {
        method: 'POST',
        headers: facultyGuide.headers,
        body: {
          outcome: 'CHANGES_REQUESTED',
          feedback: 'Please add system scope boundary diagram in PDF and update wireframe labels.',
        },
      }
    )
    assert.equal(changesRes.status, 200)
    assert.equal(changesRes.payload.data.status, 'CHANGES_REQUESTED')

    // Student sees faculty feedback and resubmit enabled
    const detailAfterChanges = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}`,
      { headers: teamMember.headers }
    )
    assert.equal(detailAfterChanges.status, 200)
    assert.equal(detailAfterChanges.payload.data.permissions.canResubmit, true)
    assert.match(detailAfterChanges.payload.data.submission.latestFacultyFeedback, /wireframe labels/)

    // Team Member submits Revision #2 cleanly
    const resubmitRes = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}/resubmit`,
      teamMember.headers,
      {
        description: 'Added labeled architecture & wireframe diagram PDF as Revision #2.',
        files: [
          {
            name: 'updated-wireframe-v2.pdf',
            mime: 'application/pdf',
            bytes: Buffer.from('%PDF-1.4\n% Revision 2 updated diagram\n%%EOF\n'),
            category: 'ARCHITECTURE_DIAGRAM',
          },
        ],
      }
    )
    assert.equal(resubmitRes.status, 201)
    assert.equal(resubmitRes.payload.data.submission.status, 'RESUBMITTED')
    assert.equal(resubmitRes.payload.data.submission.latestRevisionNumber, 2)

    // Approve final revision
    const approveRes = await apiJson(
      `/api/activity-submissions/${sharedSubmissionId}/review`,
      {
        method: 'POST',
        headers: facultyGuide.headers,
        body: { outcome: 'APPROVED', feedback: 'Approved after verification.' },
      }
    )
    assert.equal(approveRes.status, 200)
    assert.equal(approveRes.payload.data.status, 'APPROVED')

    // Both Revision #1 and Revision #2 remain intact in immutable revision history
    const detailFinal = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}`,
      { headers: teamLeader.headers }
    )
    assert.equal(detailFinal.status, 200)
    assert.equal(detailFinal.payload.data.revisions.length, 2)
    assert.equal(detailFinal.payload.data.revisions[0].revisionNumber, 2)
    assert.equal(detailFinal.payload.data.revisions[1].revisionNumber, 1)
    assert.equal(detailFinal.payload.data.revisions[1].evidenceFiles[0].fileId, sharedPdfFileId)
  })

  it('5. Enforces Individual submission isolation when activity specifies INDIVIDUAL submissionMode', async () => {
    const leadSubmit = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${individualActivityId}/submit`,
      teamLeader.headers,
      {
        description: 'Team Leader individual literature review paper summary.',
        files: [
          {
            name: 'rohan-individual.pdf',
            mime: 'application/pdf',
            bytes: VALID_PDF_BYTES,
          },
        ],
      }
    )
    assert.equal(leadSubmit.status, 201)
    teamLeaderIndividualFileId = leadSubmit.payload.data.revision.evidenceFiles[0].fileId

    // Team Member still sees NOT_SUBMITTED for their own individual requirement & can submit independently
    const memberCheck = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${individualActivityId}`,
      { headers: teamMember.headers }
    )
    assert.equal(memberCheck.status, 200)
    assert.equal(memberCheck.payload.data.submissionMode, 'INDIVIDUAL')
    assert.equal(memberCheck.payload.data.submissionStatus, 'NOT_SUBMITTED')
    assert.equal(memberCheck.payload.data.permissions.canSubmitInitial, true)

    // Team Member cannot read Team Leader's private individual file (403)
    const crossFileAttempt = await fetch(
      `${baseUrl}/api/activity-submissions/files/${teamLeaderIndividualFileId}`,
      { headers: teamMember.headers }
    )
    assert.equal(crossFileAttempt.status, 403)

    // Assigned Faculty Guide CAN read Team Leader's individual file (200)
    const facultyFileRead = await fetch(
      `${baseUrl}/api/activity-submissions/files/${teamLeaderIndividualFileId}`,
      { headers: facultyGuide.headers }
    )
    assert.equal(facultyFileRead.status, 200)

    // Team Member submits their own individual work cleanly
    const memberSubmit = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${individualActivityId}/submit`,
      teamMember.headers,
      {
        description: 'Priya individual comparative paper matrix.',
        links: [
          {
            url: 'https://ieeexplore.ieee.org/document/999999',
            linkType: 'RESEARCH_PAPER',
            label: 'IEEE Base Paper',
          },
        ],
      }
    )
    assert.equal(memberSubmit.status, 201)
  })

  it('6. Records late submissions separately from submission approval status without erasing late history', async () => {
    const lateSubmit = await submitMultipart(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${lateActivityId}/submit`,
      teamLeader.headers,
      {
        description: 'Late base paper selection submission after 2026-06-04 deadline.',
        links: [
          {
            url: 'https://arxiv.org/abs/2401.00001',
            linkType: 'RESEARCH_PAPER',
            label: 'Base Paper',
          },
        ],
      }
    )
    assert.equal(lateSubmit.status, 201)
    assert.equal(lateSubmit.payload.data.submission.isLate, true)
    assert.ok(lateSubmit.payload.data.submission.lateByDays > 0)

    // Faculty later approves the late submission
    const lateApprove = await apiJson(
      `/api/activity-submissions/${lateSubmit.payload.data.submission.id}/review`,
      {
        method: 'POST',
        headers: facultyGuide.headers,
        body: { outcome: 'APPROVED', feedback: 'Accepted late with explanation.' },
      }
    )
    assert.equal(lateApprove.status, 200)

    // Verify submissionStatus is APPROVED while timingStatus permanently records SUBMITTED_LATE
    const finalLateDetail = await apiJson(
      `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${lateActivityId}`,
      { headers: teamMember.headers }
    )
    assert.equal(finalLateDetail.status, 200)
    assert.equal(finalLateDetail.payload.data.submissionStatus, 'APPROVED')
    assert.equal(finalLateDetail.payload.data.timingStatus, 'SUBMITTED_LATE')
    assert.equal(finalLateDetail.payload.data.isLateSubmission, true)
    assert.equal(finalLateDetail.payload.data.revisions[0].isLate, true)
  })

  it('7. Persists submissions, revision history, and private file retrieval across MongoDB disconnect & reconnect', async () => {
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)
    delete process.env.ALLOW_INMEMORY_FALLBACK

    const [detailRes, fileRes] = await Promise.all([
      apiJson(
        `/api/activity-submissions/workspaces/${publishedScheduleId}/activities/${onTimeActivityId}`,
        { headers: teamMember.headers }
      ),
      fetch(`${baseUrl}/api/activity-submissions/files/${sharedPdfFileId}`, {
        headers: teamMember.headers,
      }),
    ])

    assert.equal(detailRes.status, 200)
    assert.equal(detailRes.payload.data.submissionStatus, 'APPROVED')
    assert.equal(detailRes.payload.data.revisions.length, 2)
    assert.equal(fileRes.status, 200)
    const buf = Buffer.from(await fileRes.arrayBuffer())
    assert.equal(buf.equals(VALID_PDF_BYTES), true)
  })
})
