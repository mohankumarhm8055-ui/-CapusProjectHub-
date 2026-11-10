import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app.js'
import { EvaluationRepository } from '../modules/ai/feature-evaluation/evaluation.model.js'
import { conversationalEngine } from '../modules/ai/conversational-engine/conversational.engine.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import { createAuthenticatedTestUser, type TestAuthSession } from './helpers/testAuth.js'

describe('TASK 11 — AI Academic Proposal Generator Comprehensive Test Suite', () => {
  let server: http.Server
  let baseUrl: string
  const PORT = 5064

  let student1: TestAuthSession
  let student2: TestAuthSession
  let faculty1: TestAuthSession

  let finalizedEvaluationId: string
  let unfinalizedEvaluationId: string
  let generatedProposalId: string

  before(async () => {
    student1 = await createAuthenticatedTestUser({
      label: 'acad-student-1',
      role: 'student',
      fullName: 'Academic Student One',
    })
    student2 = await createAuthenticatedTestUser({
      label: 'acad-student-2',
      role: 'student',
      fullName: 'Academic Student Two',
    })
    faculty1 = await createAuthenticatedTestUser({
      label: 'acad-faculty-1',
      role: 'faculty',
      fullName: 'Dr. Ramesh K.',
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://127.0.0.1:${PORT}`
        resolve()
      })
    })

    const finalizedRecord = await EvaluationRepository.save({
      id: 'eval-finalized-test',
      ownerId: student1.id,
      projectTitle: 'CampusProjectHub: AI-Powered Academic Project Management Platform',
      version: 2,
      constraints: {
        teamSize: 4,
        technicalExperience: 'intermediate',
        developmentWeeks: 12,
        semesterDeadline: '2026-12-15',
        languagesAndFrameworks: ['TypeScript', 'React', 'Node.js', 'Express', 'MongoDB'],
      },
      overallFeasibility: {
        rating: 'FEASIBLE_INITIAL',
        summary: 'Feasible academic scope for a 4-person intermediate team.',
        primaryBottlenecks: [],
        recommendedReleaseScope: 'Phase 1 and 2 capabilities',
      },
      features: [],
      decisions: [],
      finalScope: {
        title: 'CampusProjectHub: AI-Powered Academic Project Management Platform',
        problemStatement:
          'Engineering colleges suffer from uncoordinated project tracking and accidental project duplication across academic batches.',
        coreObjectives: [
          'Centralize project repositories with student privacy protection',
          'Detect project duplication using algorithmic containment',
          'Audit capstone feature feasibility with 7-dimensional criteria',
          'Standardize IEEE 830 documentation generation with real export',
        ],
        essentialFeatures: [
          'Centralized Project Repository',
          'Student Collaboration Workspace',
          'Faculty Rubric Approval Workflow',
        ],
        acceptedRecommendedFeatures: [
          'AI-Powered Similarity Detection',
          '7-Dimensional Feature Evaluation Engine',
          'Standard IEEE 830 Proposal Generator',
        ],
        acceptedOptionalFeatures: ['DOCX and PDF Template Exporter'],
        excludedFeatures: [
          {
            featureName: 'Real-Time Voice WebRTC',
            reason: 'Excluded to save 6 weeks of socket maintenance and eliminate live viva microphone failures.',
          },
        ],
        technologyStack: ['TypeScript', 'React 19', 'Node.js', 'Express', 'MongoDB'],
        majorDependencies: ['docx', 'pdfkit', 'mongoose', 'zod'],
        implementationMilestones: [
          {
            milestone: 'Phase 1: Architecture & Repository Indexing',
            deliverables: ['Database schemas', 'Student authentication', 'Repository indexing'],
            durationWeeks: 4,
          },
          {
            milestone: 'Phase 2: Intelligence & Proposal Generator',
            deliverables: ['Similarity engine', '7-dimension matrix', 'IEEE 830 proposal generator'],
            durationWeeks: 5,
          },
          {
            milestone: 'Phase 3: Faculty Review & Defense Prep',
            deliverables: ['Rubric review workflow', 'DOCX/PDF export', 'Viva defense slides'],
            durationWeeks: 3,
          },
        ],
        knownRisks: ['Faculty review turnaround latency during mid-semester examination week'],
        explicitAssumptions: ['Standard 12-week autonomous engineering college capstone semester'],
        status: 'SAVED',
      },
      isFinalized: true,
      finalizedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    finalizedEvaluationId = finalizedRecord.id

    const unfinalizedRecord = await EvaluationRepository.save({
      id: 'eval-unfinalized-test',
      ownerId: student1.id,
      projectTitle: 'Smart Campus Shuttle Tracker',
      version: 1,
      constraints: {
        teamSize: 2,
        technicalExperience: 'beginner',
        developmentWeeks: 8,
        semesterDeadline: '2026-11-30',
        languagesAndFrameworks: ['Python', 'Flask'],
      },
      overallFeasibility: {
        rating: 'FEASIBLE_REDUCED_SCOPE',
        summary: 'Scope requires reduction to fit beginner timeline.',
        primaryBottlenecks: ['GPS hardware sync'],
        recommendedReleaseScope: 'Basic route simulation',
      },
      features: [],
      decisions: [],
      finalScope: {
        title: 'Smart Campus Shuttle Tracker',
        problemStatement: 'Students miss campus shuttles due to unpredictable schedules.',
        coreObjectives: ['Simulate shuttle locations', 'Provide departure notifications'],
        essentialFeatures: ['Route display', 'Shuttle schedule table'],
        acceptedRecommendedFeatures: [],
        acceptedOptionalFeatures: [],
        excludedFeatures: [],
        technologyStack: ['Python', 'Flask', 'SQLite'],
        majorDependencies: ['Flask'],
        implementationMilestones: [
          { milestone: 'Phase 1: Simulation', deliverables: ['Route database'], durationWeeks: 4 },
        ],
        knownRisks: ['No real hardware transponders available'],
        explicitAssumptions: ['Simulation only'],
        status: 'DRAFT',
      },
      isFinalized: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    unfinalizedEvaluationId = unfinalizedRecord.id
  })

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('1. Proposal generation from finalized scope produces confirmed academic proposal', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        sourceEvaluationId: finalizedEvaluationId,
        documentType: 'MINI_PROJECT_PROPOSAL',
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.isScopeFinalized, true)
    assert.strictEqual(json.data.scopeStatus, 'FINALIZED')
    assert.strictEqual(json.data.sourceScopeVersion, 2)
    assert.ok(json.data.projectTitle.includes('CampusProjectHub'))
    generatedProposalId = json.data.id
  })

  it('2. Draft generation from unfinalized scope clearly marks scope as unfinalized', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        sourceEvaluationId: unfinalizedEvaluationId,
        documentType: 'MINI_PROJECT_PROPOSAL',
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.isScopeFinalized, false)
    assert.strictEqual(json.data.scopeStatus, 'UNFINALIZED')

    const scopeSection = json.data.sections.find((s: any) => s.sectionId === 'scope')
    assert.ok(scopeSection, 'Scope section must exist')
    assert.ok(
      scopeSection.content.includes('[PRELIMINARY UNFINALIZED SCOPE DRAFT]'),
      'Must contain explicit unfinalized warning banner'
    )
  })

  it('3. Missing information populates explicit academic assumptions without blocking generation', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'Unlinked Standalone Capstone Proposal',
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.isScopeFinalized, false)
    assert.ok(json.data.sections.length >= 15)
  })

  it('4. All 15 canonical proposal sections are compiled strictly grounded in scope', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}`, {
      headers: student1.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    const sections = json.data.sections

    const expectedSectionIds = [
      'title',
      'abstract',
      'introduction',
      'problem-statement',
      'existing-system',
      'proposed-system',
      'objectives',
      'scope',
      'proposed-features',
      'system-architecture',
      'technology-stack',
      'methodology',
      'expected-outcomes',
      'timeline-milestones',
      'references',
    ]

    for (const sid of expectedSectionIds) {
      const found = sections.find((s: any) => s.sectionId === sid)
      assert.ok(found, `Section "${sid}" must exist in proposal`)
      assert.ok(found.content.length > 20, `Section "${sid}" must contain substantive academic text`)
    }
  })

  it('5. Section-specific regeneration recalculates single section without wiping others', async () => {
    await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/sections/introduction`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        content: 'Custom manual introduction written by student researcher.',
      }),
    })

    await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/sections/methodology`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        content: 'Custom manual methodology text that MUST NOT be overwritten.',
      }),
    })

    const regenRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/sections/introduction/regenerate`,
      {
        method: 'POST',
        headers: student1.headers,
      }
    )

    assert.strictEqual(regenRes.status, 200)
    const regenJson = await regenRes.json()
    const introSec = regenJson.data.sections.find((s: any) => s.sectionId === 'introduction')
    const methodSec = regenJson.data.sections.find((s: any) => s.sectionId === 'methodology')

    assert.strictEqual(introSec.isManuallyEdited, false)
    assert.strictEqual(introSec.lastModifiedBy, 'ai')
    assert.ok(introSec.content.includes('tertiary engineering institutions'))

    assert.strictEqual(methodSec.isManuallyEdited, true)
    assert.strictEqual(methodSec.lastModifiedBy, 'student')
    assert.ok(methodSec.content.includes('Custom manual methodology text'))
  })

  it('6. Preservation of manual edits across section improvements and metadata updates', async () => {
    const improveRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/sections/problem-statement/improve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...student1.headers,
        },
        body: JSON.stringify({ action: 'improve-clarity' }),
      }
    )

    assert.strictEqual(improveRes.status, 200)
    const improveJson = await improveRes.json()
    assert.ok(improveJson.data.proposedContent)

    const propRes = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}`, {
      headers: student1.headers,
    })
    const propJson = await propRes.json()
    const methodSec = propJson.data.sections.find((s: any) => s.sectionId === 'methodology')
    assert.ok(methodSec.content.includes('Custom manual methodology text'))
  })

  it('7. PUT /api/proposals/:id/draft autosaves changes without incrementing version', async () => {
    const autosaveRes = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/draft`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        projectTitle: 'CampusProjectHub: AI-Powered Academic Project Management Platform (Autosaved)',
        sections: [
          {
            sectionId: 'abstract',
            content: 'Autosaved abstract revision content.',
          },
        ],
      }),
    })

    assert.strictEqual(autosaveRes.status, 200)
    const json = await autosaveRes.json()
    assert.strictEqual(json.data.activeVersionNumber, 1, 'Version number should NOT increment on autosave')
    const abstractSec = json.data.sections.find((s: any) => s.sectionId === 'abstract')
    assert.strictEqual(abstractSec.content, 'Autosaved abstract revision content.')
  })

  it('8. Version snapshotting, version comparison diff, and non-destructive restoration', async () => {
    const v2Res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        revisionSummary: 'Added custom methodology and autosaved abstract.',
      }),
    })
    assert.strictEqual(v2Res.status, 201)
    const v2Json = await v2Res.json()
    assert.strictEqual(v2Json.data.activeVersionNumber, 2)

    await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        title: 'Security and Data Privacy Architecture',
        content: 'All student and repository data is encrypted with AES-256 and masked on public endpoints.',
        isMandatory: false,
      }),
    })

    const v3Res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        revisionSummary: 'Integrated security and data privacy architecture section.',
      }),
    })
    assert.strictEqual(v3Res.status, 201)
    const v3Json = await v3Res.json()
    assert.strictEqual(v3Json.data.activeVersionNumber, 3)

    const compareRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/versions/compare`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...student1.headers,
        },
        body: JSON.stringify({ versionA: 2, versionB: 3 }),
      }
    )
    assert.strictEqual(compareRes.status, 200)
    const compareJson = await compareRes.json()
    assert.strictEqual(compareJson.data.versionA, 2)
    assert.strictEqual(compareJson.data.versionB, 3)
    assert.ok(
      compareJson.data.addedSections.includes('Security and Data Privacy Architecture'),
      'Must detect added custom section'
    )

    const restoreRes = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ versionNumber: 1 }),
    })
    assert.strictEqual(restoreRes.status, 200)
    const restoreJson = await restoreRes.json()
    assert.strictEqual(restoreJson.data.activeVersionNumber, 4, 'Restores as new revision v4')
    const secExists = restoreJson.data.sections.some(
      (s: any) => s.title === 'Security and Data Privacy Architecture'
    )
    assert.strictEqual(secExists, false, 'Restored version 1 must not contain section added in v3')
  })

  it('9. Proposal readiness audits all 9 transparent academic criteria with advisory ratings', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/readiness`, {
      method: 'POST',
      headers: student1.headers,
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    const audit = json.data

    assert.ok(
      ['NEEDS_IMPROVEMENT', 'ALMOST_READY', 'READY_FOR_FACULTY_REVIEW'].includes(audit.overallRating)
    )
    assert.ok(audit.problemClarity, 'Criterion 1: Problem Clarity')
    assert.ok(audit.objectiveAlignment, 'Criterion 2: Objective Alignment')
    assert.ok(audit.scopeConsistency, 'Criterion 3: Scope Consistency')
    assert.ok(audit.featureCompleteness, 'Criterion 4: Feature Completeness')
    assert.ok(audit.technicalFeasibility, 'Criterion 5: Technical Feasibility')
    assert.ok(audit.architectureConsistency, 'Criterion 6: Architecture Consistency')
    assert.ok(audit.methodologyCompleteness, 'Criterion 7: Methodology Completeness')
    assert.ok(audit.referenceValidity, 'Criterion 8: Reference Validity')
    assert.ok(audit.requiredSectionCompleteness, 'Criterion 9: Required Section Completeness')
    assert.ok(Array.isArray(audit.actionableSuggestions))
  })

  it('10. PDF export returns formatted document with valid binary %PDF- header', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/export?format=pdf`, {
      headers: student1.headers,
    })

    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf')
    const buffer = await res.arrayBuffer()
    const header = Buffer.from(buffer.slice(0, 5)).toString()
    assert.strictEqual(header, '%PDF-', 'Must contain standard PDF magic byte sequence')
    assert.ok(buffer.byteLength > 2000, 'PDF buffer must contain substantial content')
  })

  it('11. DOCX export returns formatted document with valid binary PK Zip header', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/export?format=docx`, {
      headers: student1.headers,
    })

    assert.strictEqual(res.status, 200)
    assert.strictEqual(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    const buffer = await res.arrayBuffer()
    const magic = Buffer.from(buffer.slice(0, 2)).toString()
    assert.strictEqual(magic, 'PK', 'Must contain standard OpenXML Zip PK magic header')
    assert.ok(buffer.byteLength > 4000, 'DOCX buffer must contain formatted document archive')
  })

  it('12. Faculty submission transitions status to SUBMITTED and logs in submission history', async () => {
    const res = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        facultyGuideName: 'Dr. Ramesh K. (Associate Professor)',
        comments: 'Submitting final proposal for mid-semester review.',
      }),
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.data.submission.status, 'SUBMITTED')
    assert.strictEqual(json.data.submission.facultyGuideName, 'Dr. Ramesh K. (Associate Professor)')
    assert.ok(json.data.submission.feedbackHistory.length >= 1)
  })

  it('13. Faculty review requires faculty privileges and updates status to CHANGES_REQUESTED', async () => {
    const unauthRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/faculty/review`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...student2.headers,
        },
        body: JSON.stringify({
          status: 'APPROVED',
          comments: 'Self-approval attempt',
        }),
      }
    )
    assert.strictEqual(unauthRes.status, 403, 'Unauthorized student cannot review proposal')

    const authRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/faculty/review`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...faculty1.headers,
        },
        body: JSON.stringify({
          status: 'CHANGES_REQUESTED',
          comments: 'Please elaborate on the testing methodology in Section 12.',
          facultyGuideName: 'Dr. Ramesh K.',
        }),
      }
    )

    assert.strictEqual(authRes.status, 200)
    const authJson = await authRes.json()
    assert.strictEqual(authJson.data.submission.status, 'CHANGES_REQUESTED')
    assert.strictEqual(
      authJson.data.submission.facultyComments,
      'Please elaborate on the testing methodology in Section 12.'
    )
  })

  it('14. Student resubmits proposal following CHANGES_REQUESTED feedback', async () => {
    const resubmitRes = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        comments: 'Updated Section 12 with comprehensive unit and integration test strategies.',
      }),
    })

    assert.strictEqual(resubmitRes.status, 200)
    const json = await resubmitRes.json()
    assert.strictEqual(json.data.submission.status, 'SUBMITTED')
    assert.ok(json.data.submission.feedbackHistory.length >= 3)
  })

  it('15. Student 2 cannot access or edit Student 1 proposal (403 Forbidden)', async () => {
    const getRes = await fetch(`${baseUrl}/api/proposals/${generatedProposalId}`, {
      headers: student2.headers,
    })
    assert.strictEqual(getRes.status, 403)

    const patchRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/sections/abstract`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...student2.headers,
        },
        body: JSON.stringify({ content: 'Malicious modification' }),
      }
    )
    assert.strictEqual(patchRes.status, 403)

    const delRes = await fetch(
      `${baseUrl}/api/proposals/${generatedProposalId}/sections/custom-test`,
      {
        method: 'DELETE',
        headers: student2.headers,
      }
    )
    assert.strictEqual(delRes.status, 403)
  })

  it('16. AI Mentor classifies student inquiry as PROPOSAL_GENERATION_INQUIRY and provides guidance', async () => {
    const conv = await conversationService.createConversation(student1.id, 'Proposal Inquiry')
    const result = await conversationalEngine.processTurn(
      conv.id,
      student1.id,
      'Prepare a proposal for my CampusProjectHub project'
    )
    assert.strictEqual(result.intent, 'PROPOSAL_GENERATION_INQUIRY')
    assert.ok(result.responseMarkdown.includes('15 Canonical Sections'))
    assert.ok(result.responseMarkdown.includes('Academic Integrity Notice'))
    assert.ok(result.suggestedFollowUps.includes('Open Proposal Workspace'))
  })
})
