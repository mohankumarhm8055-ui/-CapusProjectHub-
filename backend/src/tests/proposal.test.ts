import test, { describe, before, after } from 'node:test'
import assert from 'node:assert'
import { Server } from 'http'
import { createApp } from '../app.js'
import { inMemoryProposalStore } from '../modules/proposals/proposal.model.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

describe('AI Academic Proposal Generator Test Suite (CampusProjectHub)', () => {
  let server: Server
  let baseUrl: string
  const PORT = 5058
  let student1: TestAuthSession
  let student2: TestAuthSession

  before(async () => {
    inMemoryProposalStore.clear()
    student1 = await createAuthenticatedTestUser({
      label: 'prop-student-1',
      role: 'student',
      fullName: 'Proposal Student Alpha',
    })
    student2 = await createAuthenticatedTestUser({
      label: 'prop-student-2',
      role: 'student',
      fullName: 'Proposal Student Bravo',
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://127.0.0.1:${PORT}`
        resolve()
      })
    })
  })

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  test('1. POST /api/proposals/generate - Generates 15-section proposal grounded in CampusProjectHub', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub: AI-Powered Academic Project Management Platform',
        documentType: 'MINI_PROJECT_PROPOSAL',
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.projectTitle, 'CampusProjectHub: AI-Powered Academic Project Management Platform')
    assert.strictEqual(json.data.documentType, 'MINI_PROJECT_PROPOSAL')
    assert.strictEqual(json.data.sections.length, 15)

    const sectionIds = json.data.sections.map((s: any) => s.sectionId)
    assert.ok(sectionIds.includes('abstract'))
    assert.ok(sectionIds.includes('problem-statement'))
    assert.ok(sectionIds.includes('objectives'))
    assert.ok(sectionIds.includes('proposed-features'))
    assert.ok(sectionIds.includes('system-architecture'))
    assert.ok(sectionIds.includes('technology-stack'))
    assert.ok(sectionIds.includes('timeline-milestones'))
    assert.ok(sectionIds.includes('references'))
  })

  test('2. Grounded integrity - Explicitly excludes rejected features (Real-Time Voice WebRTC) with trade-off rationale', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub',
      }),
    })

    const json = await res.json()
    const featuresSection = json.data.sections.find((s: any) => s.sectionId === 'proposed-features')
    assert.ok(featuresSection)

    assert.ok(featuresSection.content.includes('[EXCLUDED] Real-Time AI Voice Interaction (WebRTC)'))
    assert.ok(featuresSection.content.includes('eliminates microphone viva failure risk'))
  })

  test('3. PATCH /api/proposals/:id/sections/:sectionId - Updates section while preserving others and marking manual edit', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    const updatedContent = '1. Establish automated project similarity indexing.\n2. Enable real-time student team collaboration.'
    const patchRes = await fetch(`${baseUrl}/api/proposals/${propId}/sections/objectives`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ content: updatedContent }),
    })

    assert.strictEqual(patchRes.status, 200)
    const patchJson = await patchRes.json()
    const updatedSec = patchJson.data.sections.find((s: any) => s.sectionId === 'objectives')
    assert.strictEqual(updatedSec.content, updatedContent)
    assert.strictEqual(updatedSec.isManuallyEdited, true)
    assert.strictEqual(updatedSec.lastModifiedBy, 'student')

    const abstractSec = patchJson.data.sections.find((s: any) => s.sectionId === 'abstract')
    assert.ok(abstractSec.content.length > 100)
    assert.strictEqual(abstractSec.isManuallyEdited, false)
  })

  test('4. POST /api/proposals/:id/sections/:sectionId/improve - Returns AI revision preview without overwriting', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    const improveRes = await fetch(`${baseUrl}/api/proposals/${propId}/sections/abstract/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ action: 'improve-clarity' }),
    })

    assert.strictEqual(improveRes.status, 200)
    const improveJson = await improveRes.json()
    assert.strictEqual(improveJson.success, true)
    assert.strictEqual(improveJson.data.sectionId, 'abstract')
    assert.ok(improveJson.data.proposedContent)
    assert.ok(improveJson.data.revisionRationale)

    const getRes = await fetch(`${baseUrl}/api/proposals/${propId}`, {
      headers: student1.headers,
    })
    const currentProp = (await getRes.json()).data
    const currentAbstract = currentProp.sections.find((s: any) => s.sectionId === 'abstract')
    assert.strictEqual(currentAbstract.isManuallyEdited, false)
  })

  test('5. POST /api/proposals/:id/versions & restore - Version creation and non-destructive restoration', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    await fetch(`${baseUrl}/api/proposals/${propId}/sections/title`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ content: 'CampusProjectHub — Revised Title v2' }),
    })

    const verRes = await fetch(`${baseUrl}/api/proposals/${propId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ revisionSummary: 'Updated title for guide review.' }),
    })

    assert.strictEqual(verRes.status, 201)
    const verJson = await verRes.json()
    assert.strictEqual(verJson.data.activeVersionNumber, 2)
    assert.strictEqual(verJson.data.versions.length, 2)

    const restoreRes = await fetch(`${baseUrl}/api/proposals/${propId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ versionNumber: 1 }),
    })

    assert.strictEqual(restoreRes.status, 200)
    const restoreJson = await restoreRes.json()
    assert.strictEqual(restoreJson.data.activeVersionNumber, 3)
    const titleSec = restoreJson.data.sections.find((s: any) => s.sectionId === 'title')
    assert.strictEqual(titleSec.content, 'CampusProjectHub')
  })

  test('6. POST /api/proposals/:id/readiness - 9-criterion transparent advisory assessment', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    const auditRes = await fetch(`${baseUrl}/api/proposals/${propId}/readiness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
    })

    assert.strictEqual(auditRes.status, 200)
    const auditJson = await auditRes.json()
    const audit = auditJson.data
    assert.ok(['READY_FOR_FACULTY_REVIEW', 'ALMOST_READY'].includes(audit.overallRating))
    assert.strictEqual(audit.problemClarity.status, 'PASS')
    assert.strictEqual(audit.objectiveAlignment.status, 'PASS')
    assert.strictEqual(audit.scopeConsistency.status, 'PASS')
    assert.strictEqual(audit.featureCompleteness.status, 'PASS')
    assert.strictEqual(audit.technicalFeasibility.status, 'PASS')
    assert.strictEqual(audit.requiredSectionCompleteness.status, 'PASS')
  })

  test('7. Document Types - Supports PROJECT_SYNOPSIS with concise 9 sections', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub Synopsis',
        documentType: 'PROJECT_SYNOPSIS',
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.data.documentType, 'PROJECT_SYNOPSIS')
    assert.strictEqual(json.data.sections.length, 9)
  })

  test('8. Real DOCX export - Returns valid PK Zip header buffer', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    const exportRes = await fetch(`${baseUrl}/api/proposals/${propId}/export?format=docx`, {
      headers: student1.headers,
    })

    assert.strictEqual(exportRes.status, 200)
    assert.ok(
      exportRes.headers
        .get('content-type')
        ?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    )
    const arrayBuffer = await exportRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    assert.ok(buffer.length > 1000)
    assert.strictEqual(buffer[0], 0x50)
    assert.strictEqual(buffer[1], 0x4b)
    assert.strictEqual(buffer[2], 0x03)
    assert.strictEqual(buffer[3], 0x04)
  })

  test('9. Real PDF export - Returns valid %PDF- header buffer', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    const exportRes = await fetch(`${baseUrl}/api/proposals/${propId}/export?format=pdf`, {
      headers: student1.headers,
    })

    assert.strictEqual(exportRes.status, 200)
    assert.ok(exportRes.headers.get('content-type')?.includes('application/pdf'))
    const arrayBuffer = await exportRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    assert.ok(buffer.length > 500)
    const header = buffer.subarray(0, 5).toString('ascii')
    assert.strictEqual(header, '%PDF-')
  })

  test('10. Faculty Submission Workflow - Submits proposal and transitions status to SUBMITTED', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub' }),
    })
    const propId = (await genRes.json()).data.id

    const submitRes = await fetch(`${baseUrl}/api/proposals/${propId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        facultyGuideName: 'Dr. H. M. Chandrashekar',
        comments: 'Ready for departmental review and synopsis viva.',
      }),
    })

    assert.strictEqual(submitRes.status, 200)
    const submitJson = await submitRes.json()
    assert.strictEqual(submitJson.data.submission.status, 'SUBMITTED')
    assert.strictEqual(submitJson.data.submission.facultyGuideName, 'Dr. H. M. Chandrashekar')
    assert.ok(submitJson.data.submission.submittedAt)
  })

  test('11. Security Authorization - Student 2 cannot access or modify Student 1 proposal', async () => {
    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ projectTitle: 'CampusProjectHub Alpha' }),
    })
    const propId = (await genRes.json()).data.id

    const unauthGetRes = await fetch(`${baseUrl}/api/proposals/${propId}`, {
      headers: student2.headers,
    })
    assert.strictEqual(unauthGetRes.status, 403)

    const unauthPatchRes = await fetch(`${baseUrl}/api/proposals/${propId}/sections/title`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student2.headers,
      },
      body: JSON.stringify({ content: 'Malicious title modification' }),
    })
    assert.strictEqual(unauthPatchRes.status, 403)
  })
})
