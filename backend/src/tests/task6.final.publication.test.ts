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
import { ProjectRepository, MongoProjectModel } from '../modules/repository/project.model.js'
import { AuditLogRepository } from '../modules/repository/auditLog.model.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task6_final_pub_test'

describe('TASK 6 — Final Project Completion & Controlled Publication E2E Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const origAllowFallback = process.env.ALLOW_INMEMORY_FALLBACK
  const origStorageDir = process.env.EVIDENCE_STORAGE_DIR
  const tempEvidenceDir = path.join(os.tmpdir(), `cph_task6_evidence_${Date.now()}`)

  let adminUser: TestAuthSession
  let faculty1: TestAuthSession
  let faculty2: TestAuthSession
  let studentLead1: TestAuthSession
  let studentMember1: TestAuthSession
  let student2: TestAuthSession

  let scheduleId = ''
  let projectId = ''
  let mandatoryActIds: string[] = []
  let optionalActId = ''
  let activityFileId = ''

  let reportPdfFileId = ''
  let archDiagramFileId = ''
  let screenshot1FileId = ''
  let screenshot2FileId = ''
  let presentationFileId = ''

  const VALID_PDF_BYTES = Buffer.from('%PDF-1.4\n% Task 6 Final Capstone Report PDF\n%%EOF\n')
  const VALID_PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
    0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ])

  const BASE_METADATA = {
    title: 'Solar Microgrid Predictive Fault Isolation & Telemetry Suite',
    abstract:
      'An academic engineering platform monitoring rooftop solar inverters and isolating microgrid feeder faults using edge telemetry.',
    problemStatement:
      'Campus solar microgrids lack synchronized feeder telemetry and structured preventive fault isolation logs.',
    objectives: [
      'Capture inverter voltage and phase frequency metrics across feeders.',
      'Automate operator fault alert escalation with historical diagnostics.',
    ],
    proposedSolution:
      'Deploy MQTT edge collectors connected to a structured fault classification API and campus dashboard.',
    modules: [
      { name: 'Telemetry Ingestor', description: 'Parses feeder inverter packets over TLS MQTT.' },
      { name: 'Fault Diagnostic Engine', description: 'Detects over-voltage and islanding anomalies.' },
    ],
    technologyStack: [
      { name: 'TypeScript', category: 'Language' },
      { name: 'Express', category: 'Backend' },
      { name: 'MongoDB', category: 'Database' },
    ],
    architectureDescription:
      'Three-tier ingestion pipeline separating telemetry collection, rule evaluation, and faculty reporting.',
    challenges: ['Handling noisy inverter sensor bursts during cloud transients.'],
    learningOutcomes: ['Mastered IEEE microgrid protection thresholds and persistent audit trails.'],
    futureEnhancements: ['Add battery storage charge scheduling across academic blocks.'],
    references: ['IEEE Std 1547-2018 Interconnection Standard'],
    academicYear: '2026–27',
    batch: '2023–2027',
    semester: '6th Semester',
    department: 'Electrical & Electronics Engineering',
    category: 'Smart Energy',
    githubUrl: 'https://github.com/campusprojecthub/solar-microgrid-suite',
    demoUrl: 'https://demo.campusprojecthub.edu/solar-microgrid',
  }

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

  async function submitFinalMultipart(
    reqPath: string,
    method: 'PUT' | 'POST',
    headers: Record<string, string>,
    params: {
      metadata: typeof BASE_METADATA
      retainFileIds?: string[]
      uploads?: Array<{ slot: string; name: string; mime: string; bytes: Buffer }>
    }
  ) {
    const formData = new FormData()
    formData.append('metadata', JSON.stringify(params.metadata))
    formData.append('retainFileIds', JSON.stringify(params.retainFileIds || []))
    const uploads = params.uploads || []
    formData.append('fileSlots', JSON.stringify(uploads.map((u) => u.slot)))
    formData.append('evidenceCategories', JSON.stringify(uploads.map((u) => u.slot)))
    for (const u of uploads) {
      formData.append('files', new Blob([new Uint8Array(u.bytes)], { type: u.mime }), u.name)
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

    adminUser = await createAuthenticatedTestUser({
      label: 't6-admin',
      role: 'admin',
      fullName: 'Dr. Rameshwar Iyer (Admin)',
      department: 'Computer Science & Engineering',
    })
    faculty1 = await createAuthenticatedTestUser({
      label: 't6-faculty1',
      role: 'faculty',
      fullName: 'Dr. Anand Kulkarni',
      department: 'Electrical & Electronics Engineering',
    })
    faculty2 = await createAuthenticatedTestUser({
      label: 't6-faculty2',
      role: 'faculty',
      fullName: 'Prof. Veena Murthy',
      department: 'Computer Science & Engineering',
    })
    studentLead1 = await createAuthenticatedTestUser({
      label: 't6-lead1',
      role: 'student',
      fullName: 'Karthik Shenoy',
      department: 'Electrical & Electronics Engineering',
    })
    studentMember1 = await createAuthenticatedTestUser({
      label: 't6-member1',
      role: 'student',
      fullName: 'Nandini Patil',
      department: 'Electrical & Electronics Engineering',
    })
    student2 = await createAuthenticatedTestUser({
      label: 't6-outsider',
      role: 'student',
      fullName: 'Rohan Deshmukh',
      department: 'Computer Science & Engineering',
    })

    const app = createApp()
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    const addr = server.address() as any
    baseUrl = `http://127.0.0.1:${addr.port}`

    const tplRes = await apiJson('/api/schedules/templates', { headers: faculty1.headers })
    const stdTpl = tplRes.payload.data.find((t: any) => t.code === 'STANDARD_MINI_PROJECT_8W')
    const todayIso = new Date().toISOString().slice(0, 10)

    const sInit = await apiJson('/api/schedules', {
      method: 'POST',
      headers: faculty1.headers,
      body: {
        newProject: {
          title: 'Solar Microgrid Predictive Fault Isolation',
          department: 'Electrical & Electronics Engineering',
          academicYear: '2026–27',
        },
        templateId: stdTpl.id,
        assignedStudents: [
          { studentId: studentLead1.id, isTeamLeader: true },
          { studentId: studentMember1.id, isTeamLeader: false },
        ],
        calendarConfig: {
          timezone: 'UTC_DATE_ONLY',
          projectStartDate: todayIso,
          workingDays: [1, 2, 3, 4, 5],
          holidays: [],
        },
      },
    })
    assert.equal(sInit.status, 201)
    scheduleId = sInit.payload.data.schedule.id
    projectId = sInit.payload.data.schedule.projectId

    // Keep 2 mandatory activities + 1 optional activity so we explicitly test optional non-blocking!
    const templateActs = sInit.payload.data.schedule.activities
    const trimmedActs = [
      { ...templateActs[0], isMandatory: true },
      { ...templateActs[1], isMandatory: true },
      { ...templateActs[2], title: 'Optional Hardware Enclosure Notes', isMandatory: false },
    ]
    await ProjectScheduleRepository.update(scheduleId, { activities: trimmedActs })

    const sPub = await apiJson(`/api/schedules/${scheduleId}/publish`, {
      method: 'POST',
      headers: faculty1.headers,
    })
    assert.equal(sPub.status, 200)
    mandatoryActIds = [trimmedActs[0].activityId, trimmedActs[1].activityId]
    optionalActId = trimmedActs[2].activityId

    // Approve ONLY first mandatory activity right now (leave 2nd unapproved & weekly report pending)
    const fd1 = new FormData()
    fd1.append('description', 'Mandatory activity 1 evidence PDF.')
    fd1.append('evidenceCategories', JSON.stringify(['PDF_DOCUMENT']))
    fd1.append(
      'files',
      new Blob([new Uint8Array(VALID_PDF_BYTES)], { type: 'application/pdf' }),
      'act1-scope.pdf'
    )
    const act1SubRes = await fetch(
      `${baseUrl}/api/activity-submissions/workspaces/${scheduleId}/activities/${mandatoryActIds[0]}/submit`,
      { method: 'POST', headers: studentLead1.headers, body: fd1 }
    )
    assert.equal(act1SubRes.status, 201)
    const act1Payload = (await act1SubRes.json()) as any
    activityFileId = act1Payload.data.revision.evidenceFiles[0].fileId

    const approve1 = await apiJson(
      `/api/faculty-review/submissions/${act1Payload.data.submission.id}/decision`,
      {
        method: 'POST',
        headers: faculty1.headers,
        body: { outcome: 'APPROVED', feedback: 'Approved milestone 1.' },
      }
    )
    assert.equal(approve1.status, 200)
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

  it('1. Blocks final submission when mandatory activity or weekly report is pending; allows when ONLY optional activity is unapproved', async () => {
    // Initially mandatoryAct #2 and Week 1 report are incomplete -> 409 COMPLETION_INELIGIBLE
    const blockedRes = await submitFinalMultipart(
      `/api/final-lifecycle/projects/${scheduleId}/submit`,
      'POST',
      studentLead1.headers,
      {
        metadata: BASE_METADATA,
        uploads: [
          { slot: 'FINAL_REPORT', name: 'final-report.pdf', mime: 'application/pdf', bytes: VALID_PDF_BYTES },
          { slot: 'ARCHITECTURE_DIAGRAM', name: 'arch.png', mime: 'image/png', bytes: VALID_PNG_BYTES },
          { slot: 'SCREENSHOT', name: 'screen1.png', mime: 'image/png', bytes: VALID_PNG_BYTES },
        ],
      }
    )
    assert.equal(blockedRes.status, 409)
    assert.equal(blockedRes.payload.error.code, 'COMPLETION_INELIGIBLE')

    // Now approve mandatoryAct #2 (leave optionalActId NOT_STARTED!)
    const fd2 = new FormData()
    fd2.append('description', 'Mandatory activity 2 base paper review and SRS evidence PDF.')
    fd2.append('evidenceCategories', JSON.stringify(['PDF_DOCUMENT']))
    fd2.append(
      'files',
      new Blob([new Uint8Array(VALID_PDF_BYTES)], { type: 'application/pdf' }),
      'act2-base-paper.pdf'
    )
    fd2.append(
      'links',
      JSON.stringify([
        { url: 'https://github.com/campusprojecthub/solar-srs', linkType: 'DOCUMENTATION_URL', label: 'SRS Spec' },
      ])
    )
    const act2SubRes = await fetch(
      `${baseUrl}/api/activity-submissions/workspaces/${scheduleId}/activities/${mandatoryActIds[1]}/submit`,
      { method: 'POST', headers: studentMember1.headers, body: fd2 }
    )
    const act2Payload = (await act2SubRes.json().catch(() => ({}))) as any
    assert.equal(act2SubRes.status, 201, JSON.stringify(act2Payload))
    const approve2 = await apiJson(
      `/api/faculty-review/submissions/${act2Payload.data.submission.id}/decision`,
      {
        method: 'POST',
        headers: faculty1.headers,
        body: { outcome: 'APPROVED', feedback: 'Approved milestone 2.' },
      }
    )
    assert.equal(approve2.status, 200)

    // Verify optional activity is still untouched (NOT_STARTED / NOT_REVIEWED)
    const sched = await ProjectScheduleRepository.findById(scheduleId)
    const optAct = sched!.activities.find((a) => a.activityId === optionalActId)
    assert.equal(optAct?.activityStatus, 'NOT_STARTED')
    assert.equal(optAct?.facultyReviewStatus, 'NOT_REVIEWED')

    // Submit Week 1 weekly report
    const wrForm = new FormData()
    wrForm.append('workCompleted', 'Completed feeder telemetry calibration and edge rule tests.')
    wrForm.append('workInProgress', 'Finalizing capstone documentation.')
    wrForm.append('challengesOrBlockers', 'None remaining.')
    wrForm.append('planForNextWeek', 'Submit final capstone package for faculty review.')
    wrForm.append('supportingEvidenceNotes', 'Attached feeder calibration telemetry logs.')
    const wrRes = await fetch(
      `${baseUrl}/api/weekly-reports/projects/${scheduleId}/weeks/1/submit`,
      { method: 'POST', headers: studentLead1.headers, body: wrForm }
    )
    assert.equal(wrRes.status, 201)

    // Verify eligibility endpoint passes even though optional activity has NO submission!
    const detailRes = await apiJson(`/api/final-lifecycle/projects/${scheduleId}`, {
      headers: studentLead1.headers,
    })
    assert.equal(detailRes.status, 200)
    assert.equal(detailRes.payload.data.eligibility.metrics.mandatoryActivitiesApproved, 2)
    assert.equal(detailRes.payload.data.eligibility.metrics.mandatoryActivitiesTotal, 2)
    assert.equal(detailRes.payload.data.eligibility.metrics.optionalActivitiesTotal, 1)
  })

  it('2. Admin updates configurable deliverable rules cleanly and non-admins receive 403', async () => {
    const forbiddenCfg = await apiJson('/api/final-lifecycle/config', {
      method: 'PUT',
      headers: faculty1.headers,
      body: { minimumWeeklyReportsRequired: 1 },
    })
    assert.equal(forbiddenCfg.status, 403)

    const adminCfg = await apiJson('/api/final-lifecycle/config', {
      method: 'PUT',
      headers: adminUser.headers,
      body: {
        mandatoryDeliverables: {
          finalReport: true,
          presentation: false,
          sourceCodeOrGithub: true,
          architectureDiagram: true,
          screenshots: true,
          demoLinkOrVideo: false,
        },
        minimumWeeklyReportsRequired: 1,
      },
    })
    assert.equal(adminCfg.status, 200)
    assert.equal(adminCfg.payload.data.mandatoryDeliverables.presentation, false)
  })

  it('3. Student saves Final Draft and submits Revision #1 for Faculty Final Review with private file slots', async () => {
    const draftRes = await submitFinalMultipart(
      `/api/final-lifecycle/projects/${scheduleId}/draft`,
      'PUT',
      studentLead1.headers,
      {
        metadata: BASE_METADATA,
        uploads: [
          { slot: 'FINAL_REPORT', name: 'microgrid-final-report.pdf', mime: 'application/pdf', bytes: VALID_PDF_BYTES },
          { slot: 'PRESENTATION', name: 'defense-deck.pdf', mime: 'application/pdf', bytes: VALID_PDF_BYTES },
          { slot: 'ARCHITECTURE_DIAGRAM', name: 'microgrid-arch.png', mime: 'image/png', bytes: VALID_PNG_BYTES },
          { slot: 'SCREENSHOT', name: 'dashboard-main.png', mime: 'image/png', bytes: VALID_PNG_BYTES },
          { slot: 'SCREENSHOT', name: 'internal-debug-view.png', mime: 'image/png', bytes: VALID_PNG_BYTES },
        ],
      }
    )
    assert.equal(draftRes.status, 200)
    assert.equal(draftRes.payload.data.status, 'NOT_READY')

    const draftObj = draftRes.payload.data.draftSubmission
    reportPdfFileId = draftObj.finalReportFiles[0].fileId
    presentationFileId = draftObj.presentationFiles[0].fileId
    archDiagramFileId = draftObj.architectureDiagramFiles[0].fileId
    screenshot1FileId = draftObj.screenshotFiles[0].fileId
    screenshot2FileId = draftObj.screenshotFiles[1].fileId

    const submitRes = await submitFinalMultipart(
      `/api/final-lifecycle/projects/${scheduleId}/submit`,
      'POST',
      studentLead1.headers,
      {
        metadata: BASE_METADATA,
        retainFileIds: [
          reportPdfFileId,
          presentationFileId,
          archDiagramFileId,
          screenshot1FileId,
          screenshot2FileId,
        ],
      }
    )
    assert.equal(submitRes.status, 201)
    assert.equal(submitRes.payload.data.lifecycle.status, 'FINAL_REVIEW_PENDING')
    assert.equal(submitRes.payload.data.snapshot.revisionNumber, 1)

    const facultyNotifsRes = await apiJson('/api/notifications', { headers: faculty1.headers })
    assert.equal(facultyNotifsRes.status, 200)
    assert.equal(
      facultyNotifsRes.payload.data.items.some(
        (n: any) => n.type === 'FINAL_REVIEW_REQUESTED' && n.data?.scheduleId === scheduleId
      ),
      true
    )
  })

  it('4. Enforces authorization & supports Faculty Correction Loop preserving Revision #1 and #2', async () => {
    const studentApproveAttempt = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/final-review`,
      {
        method: 'POST',
        headers: studentLead1.headers,
        body: { action: 'APPROVE_COMPLETION', comment: 'Self approval' },
      }
    )
    assert.equal(studentApproveAttempt.status, 403)

    const otherFacultyAttempt = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/final-review`,
      {
        method: 'POST',
        headers: faculty2.headers,
        body: { action: 'APPROVE_COMPLETION', comment: 'Unassigned faculty' },
      }
    )
    assert.equal(otherFacultyAttempt.status, 403)

    // Faculty 1 requests final corrections
    const reqCorr = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/final-review`,
      {
        method: 'POST',
        headers: faculty1.headers,
        body: {
          action: 'REQUEST_CORRECTIONS',
          comment: 'Clarify IEEE 1547 islanding trip latency inside the proposed solution summary.',
        },
      }
    )
    assert.equal(reqCorr.status, 200)
    assert.equal(reqCorr.payload.data.status, 'CORRECTIONS_REQUIRED')

    const studentNotifsRes = await apiJson('/api/notifications', { headers: studentMember1.headers })
    assert.equal(studentNotifsRes.status, 200)
    assert.equal(
      studentNotifsRes.payload.data.items.some(
        (n: any) => n.type === 'FINAL_CORRECTIONS_REQUIRED' && n.data?.scheduleId === scheduleId
      ),
      true
    )

    // Student submits corrected Revision #2
    const rev2Res = await submitFinalMultipart(
      `/api/final-lifecycle/projects/${scheduleId}/submit`,
      'POST',
      studentMember1.headers,
      {
        metadata: {
          ...BASE_METADATA,
          proposedSolution:
            'Deploy MQTT edge collectors with deterministic sub-200ms IEEE 1547 feeder islanding trip alerts.',
        },
        retainFileIds: [
          reportPdfFileId,
          presentationFileId,
          archDiagramFileId,
          screenshot1FileId,
          screenshot2FileId,
        ],
      }
    )
    assert.equal(rev2Res.status, 201)
    assert.equal(rev2Res.payload.data.lifecycle.status, 'FINAL_REVIEW_PENDING')
    assert.equal(rev2Res.payload.data.lifecycle.finalSubmissionRevisions.length, 2)
  })

  it('5. Approves Final Completion explicitly while keeping repository entry NOT PUBLISHED', async () => {
    const approveRes = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/final-review`,
      {
        method: 'POST',
        headers: faculty1.headers,
        body: {
          action: 'APPROVE_COMPLETION',
          comment: 'All technical milestones, final report, and defense corrections verified.',
        },
      }
    )
    assert.equal(approveRes.status, 200)
    assert.equal(approveRes.payload.data.status, 'COMPLETION_APPROVED')

    // Critical boundary: project MUST remain hidden from public discovery & outsider view until explicitly published!
    const existingRepoProj = await ProjectRepository.findById(projectId)
    assert.equal(existingRepoProj?.publicationStatus, 'NOT_PUBLISHED')

    const searchBeforePublish = await apiJson('/api/repository/search?q=Solar', {
      headers: student2.headers,
    })
    assert.equal(searchBeforePublish.status, 200)
    assert.equal(
      searchBeforePublish.payload.data.some((p: any) => p.id === projectId),
      false
    )

    const outsiderView = await apiJson(`/api/repository/projects/${projectId}`, {
      headers: student2.headers,
    })
    assert.equal(outsiderView.status, 403)
  })

  it('6. Faculty curates Publication Draft and explicitly publishes the EXACT existing Project without duplicates', async () => {
    const countBefore = await MongoProjectModel.countDocuments()

    const draftSave = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/publication-draft`,
      {
        method: 'PUT',
        headers: faculty1.headers,
        body: {
          title: 'Solar Microgrid Predictive Fault Isolation Suite (Verified)',
          abstract: BASE_METADATA.abstract,
          academicYear: BASE_METADATA.academicYear,
          batch: BASE_METADATA.batch,
          department: BASE_METADATA.department,
          selectedScreenshotFileIds: [screenshot1FileId], // Intentionally omit screenshot2FileId!
          selectedArchitectureDiagramFileId: archDiagramFileId,
          selectedFinalReportFileId: reportPdfFileId,
          notifyReady: true,
        },
      }
    )
    assert.equal(draftSave.status, 200)
    assert.equal(draftSave.payload.data.status, 'PUBLICATION_DRAFT')

    // Student cannot call publish (403)
    const studentPubAttempt = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/publish`,
      { method: 'POST', headers: studentLead1.headers }
    )
    assert.equal(studentPubAttempt.status, 403)

    // Faculty explicitly publishes
    const publishRes = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/publish`,
      { method: 'POST', headers: faculty1.headers }
    )
    assert.equal(publishRes.status, 200)
    assert.equal(publishRes.payload.data.lifecycle.status, 'PUBLISHED')
    assert.equal(publishRes.payload.data.projectId, projectId)

    // Zero duplicate project records created!
    const countAfter = await MongoProjectModel.countDocuments()
    assert.equal(countAfter, countBefore)

    // Re-publishing while already published returns 409 conflict
    const dupPub = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/publish`,
      { method: 'POST', headers: faculty1.headers }
    )
    assert.equal(dupPub.status, 409)
  })

  it('7. Discovers published project in Repository Search & Details without leaking private info or unselected files', async () => {
    const searchRes = await apiJson('/api/repository/search?q=Solar', {
      headers: student2.headers,
    })
    assert.equal(searchRes.status, 200)
    const hit = searchRes.payload.data.find((p: any) => p.id === projectId)
    assert.ok(hit, 'Published project must appear in main CampusProjectHub repository search')
    assert.equal(hit.facultyGuide.officialEmail, undefined)
    assert.equal(hit.publishedAssetFileIds, undefined)

    const detailRes = await apiJson(`/api/repository/projects/${projectId}`, {
      headers: student2.headers,
    })
    assert.equal(detailRes.status, 200)
    const pubProj = detailRes.payload.data
    assert.equal(pubProj.title, 'Solar Microgrid Predictive Fault Isolation Suite (Verified)')
    assert.equal(pubProj.screenshots.length, 1)
    assert.equal(
      pubProj.screenshots[0].url,
      `/api/final-lifecycle/published-files/${projectId}/${screenshot1FileId}`
    )
    assert.equal(
      pubProj.reportDocuments[0].fileUrl,
      `/api/final-lifecycle/published-files/${projectId}/${reportPdfFileId}`
    )
    assert.equal(pubProj.facultyGuide.officialEmail, undefined)
    assert.equal(pubProj.facultyFeedback, undefined)
    assert.equal(pubProj.unpublishedReason, undefined)

    // Curated public assets stream cleanly with 200
    const imgRes = await fetch(
      `${baseUrl}/api/final-lifecycle/published-files/${projectId}/${screenshot1FileId}`,
      { headers: student2.headers }
    )
    assert.equal(imgRes.status, 200)
    const pdfRes = await fetch(
      `${baseUrl}/api/final-lifecycle/published-files/${projectId}/${reportPdfFileId}`,
      { headers: student2.headers }
    )
    assert.equal(pdfRes.status, 200)

    // Unselected screenshot, internal presentation slides, and private activity files MUST return 403!
    const blockedUnselectedImg = await fetch(
      `${baseUrl}/api/final-lifecycle/published-files/${projectId}/${screenshot2FileId}`,
      { headers: student2.headers }
    )
    assert.equal(blockedUnselectedImg.status, 403)

    const blockedSlides = await fetch(
      `${baseUrl}/api/final-lifecycle/published-files/${projectId}/${presentationFileId}`,
      { headers: student2.headers }
    )
    assert.equal(blockedSlides.status, 403)

    const blockedRawPrivate = await fetch(
      `${baseUrl}/api/final-lifecycle/files/${presentationFileId}`,
      { headers: student2.headers }
    )
    assert.equal(blockedRawPrivate.status, 403)

    const blockedActivityFile = await fetch(
      `${baseUrl}/api/activity-submissions/files/${activityFileId}`,
      { headers: student2.headers }
    )
    assert.equal(blockedActivityFile.status, 403)
  })

  it('8. Unpublishes and Archives with audit trail, hiding immediately and surviving MongoDB reconnect', async () => {
    const unpubRes = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/unpublish`,
      {
        method: 'POST',
        headers: faculty1.headers,
        body: { reason: 'Updating bibliography citation formatting before semester archive showcase.' },
      }
    )
    assert.equal(unpubRes.status, 200)
    assert.equal(unpubRes.payload.data.status, 'UNPUBLISHED')

    // Immediately disappears from repository search, detail, and published file endpoint
    const searchAfterUnpub = await apiJson('/api/repository/search?q=Solar', {
      headers: student2.headers,
    })
    assert.equal(
      searchAfterUnpub.payload.data.some((p: any) => p.id === projectId),
      false
    )
    const assetAfterUnpub = await fetch(
      `${baseUrl}/api/final-lifecycle/published-files/${projectId}/${screenshot1FileId}`,
      { headers: student2.headers }
    )
    assert.equal(assetAfterUnpub.status, 403)

    // Archive project cleanly
    const archiveRes = await apiJson(
      `/api/final-lifecycle/projects/${scheduleId}/archive`,
      {
        method: 'POST',
        headers: faculty1.headers,
        body: { reason: 'Semester complete; permanently archived in institutional records.' },
      }
    )
    assert.equal(archiveRes.status, 200)
    assert.equal(archiveRes.payload.data.status, 'ARCHIVED')

    const logs = await AuditLogRepository.findByProject(projectId)
    const actions = logs.map((l) => l.action)
    assert.ok(actions.includes('FINAL_COMPLETION_APPROVED'))
    assert.ok(actions.includes('PROJECT_PUBLISHED'))
    assert.ok(actions.includes('PROJECT_UNPUBLISHED'))
    assert.ok(actions.includes('PROJECT_ARCHIVED'))

    // Persistence verification across full MongoDB disconnect & reconnect
    await disconnectDatabase()
    await connectDatabase(TEST_MONGO_URI)

    const reloaded = await apiJson(`/api/final-lifecycle/projects/${scheduleId}`, {
      headers: faculty1.headers,
    })
    assert.equal(reloaded.status, 200)
    assert.equal(reloaded.payload.data.lifecycle.status, 'ARCHIVED')
    assert.equal(reloaded.payload.data.lifecycle.finalSubmissionRevisions.length, 2)
    assert.ok(reloaded.payload.data.lifecycle.auditHistory.length >= 6)
  })
})
