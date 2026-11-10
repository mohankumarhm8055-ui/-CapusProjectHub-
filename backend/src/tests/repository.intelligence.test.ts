import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { createApp } from '../app.js'
import { Server } from 'http'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { inMemoryProjectStore } from '../modules/repository/project.model.js'
import { inMemoryAuditLogStore } from '../modules/repository/auditLog.model.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 8 — Project Repository Intelligence Comprehensive Test Suite', () => {
  let server: Server
  let baseUrl: string
  const port = 5057
  let adminSession: TestAuthSession
  let facultySession: TestAuthSession
  let studentRahul: TestAuthSession
  let studentStranger: TestAuthSession

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()

    adminSession = await createAuthenticatedTestUser({
      label: 't8-admin',
      role: 'admin',
      fullName: 'Super Admin',
    })
    facultySession = await createAuthenticatedTestUser({
      label: 't8-faculty',
      role: 'faculty',
      fullName: 'Prof. Meera',
    })
    studentRahul = await createAuthenticatedTestUser({
      label: 't8-rahul',
      role: 'student',
      fullName: 'Rahul Student',
    })
    studentStranger = await createAuthenticatedTestUser({
      label: 't8-stranger',
      role: 'student',
      fullName: 'Stranger Student',
    })

    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => {
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  after(async () => {
    await inMemoryProjectStore.clear()
    await inMemoryAuditLogStore.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('1. Admin historical project creation with comprehensive metadata', async () => {
    const res = await fetch(`${baseUrl}/api/repository/admin/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...adminSession.headers,
      },
      body: JSON.stringify({
        project: {
          title: `Smart Irrigation IoT Node ${Date.now()}`,
          abstract: 'Soil moisture telemetry and LoRaWAN automated irrigation controller.',
          problemStatement: 'Water wastage in arid agriculture due to uncalibrated timer irrigation.',
          academicYear: '2023-2024',
          department: 'Electronics and Communication Engineering',
          technologies: ['C++', 'LoRaWAN', 'FreeRTOS', 'Python'],
          objectives: ['Deploy battery-efficient soil probes', 'Automate valve actuation'],
          features: ['LoRa sensor mesh', 'Solar battery management', 'SMS leak alert'],
          mentorFacultyName: 'Dr. Ramesh Rao',
          teamMembers: [{ fullName: 'Siddharth Patel', contactEmail: 'siddharth@college.edu' }],
        },
      }),
    })

    assert.strictEqual(res.status, 201)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.data.sourceType, 'ADMIN_IMPORTED_HISTORICAL')
    assert.strictEqual(json.data.verificationStatus, 'PENDING_VERIFICATION')
    assert.strictEqual(json.data.workflowStatus, 'APPROVED')
  })

  test('2. Historical project import CSV parsing with validation & duplicate detection', async () => {
    const csvData = `Title,Abstract,Problem Statement,Academic Year,Department,Technologies,Faculty Guide
"Smart Waste Segregator 2024","Computer vision edge camera for sorting dry and wet recyclable waste.","Improper segregation at community bins leading to landfill contamination.","2023-2024","Computer Science & Engineering","Python;TensorFlow Lite;Raspberry Pi","Dr. K. Sharma"
"","Invalid row with missing title","Missing data","2023-2024","Computer Science","Python","Faculty"
"AI Healthcare Prediction System","Duplicate of canonical benchmark record","Duplicate problem","2023-2024","Computer Science","Python","Dr. Rao"`

    const res = await fetch(`${baseUrl}/api/repository/admin/import/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...adminSession.headers,
      },
      body: JSON.stringify({ csv: csvData, autoIngest: true }),
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.strictEqual(json.summary.validCount, 1)
    assert.strictEqual(json.summary.invalidCount, 1)
    assert.strictEqual(json.summary.duplicateCount, 1)
    assert.strictEqual(json.summary.ingestedCount, 1)
  })

  test('3 & 4. Student project draft, edit, submit, and faculty changes-requested lifecycle', async () => {
    const draftRes = await fetch(`${baseUrl}/api/repository/submissions/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
      body: JSON.stringify({
        title: 'Decentralized Micro-Credential Verifier',
        abstract: 'Cryptographic diploma verification utilizing zero-knowledge proofs on Polygon.',
        problemStatement: 'Paper certificate forgery and slow credential verification for employers.',
        academicYear: '2024-2025',
        department: 'Information Science and Engineering',
        technologyStack: ['Solidity', 'TypeScript', 'Next.js', 'Ethers.js'],
      }),
    })

    assert.strictEqual(draftRes.status, 201)
    const draftJson = await draftRes.json()
    const projId = draftJson.data.id
    assert.strictEqual(draftJson.data.workflowStatus, 'DRAFT')

    const editRes = await fetch(`${baseUrl}/api/repository/submissions/${projId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
      body: JSON.stringify({
        objectives: ['Deploy ERC-721 Soulbound tokens', 'Build zero-knowledge credential proof'],
        githubUrl: 'https://github.com/student/credential-verifier',
      }),
    })

    assert.strictEqual(editRes.status, 200)
    const editJson = await editRes.json()
    assert.strictEqual(editJson.data.githubUrl, 'https://github.com/student/credential-verifier')

    const submitRes = await fetch(`${baseUrl}/api/repository/submissions/${projId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
    })
    assert.strictEqual(submitRes.status, 200)

    const changeReqRes = await fetch(`${baseUrl}/api/repository/submissions/${projId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...facultySession.headers,
      },
      body: JSON.stringify({
        decision: 'REQUEST_CHANGES',
        notes: 'Include gas cost benchmark analysis in problem statement.',
      }),
    })
    assert.strictEqual(changeReqRes.status, 200)
    const changeJson = await changeReqRes.json()
    assert.strictEqual(changeJson.data.workflowStatus, 'CHANGES_REQUESTED')

    await fetch(`${baseUrl}/api/repository/submissions/${projId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
      body: JSON.stringify({
        problemStatement: 'Paper certificate forgery and prohibitive gas costs of legacy L1 verification.',
      }),
    })
    await fetch(`${baseUrl}/api/repository/submissions/${projId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
    })

    const approveRes = await fetch(`${baseUrl}/api/repository/submissions/${projId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...facultySession.headers,
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        notes: 'Gas benchmarks validated thoroughly on testnet.',
      }),
    })
    assert.strictEqual(approveRes.status, 200)
    const approveJson = await approveRes.json()
    assert.strictEqual(approveJson.data.workflowStatus, 'APPROVED')
    assert.strictEqual(approveJson.data.verificationStatus, 'FACULTY_APPROVED')
  })

  test('5. Search by exact title and free-text keywords returns paginated results', async () => {
    const res = await fetch(`${baseUrl}/api/repository/search?query=Healthcare&page=1&limit=5`, {
      headers: studentRahul.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.length >= 1)
    assert.strictEqual(json.currentPage, 1)
    assert.ok(json.totalCount >= 1)
    assert.ok(json.data.some((p: any) => p.title.includes('Healthcare')))
  })

  test('6. Search by department and technology filtering', async () => {
    const res = await fetch(
      `${baseUrl}/api/repository/search?department=Computer Science and Engineering&technology=Python`,
      { headers: studentRahul.headers }
    )
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.length >= 1)
    for (const p of json.data) {
      assert.ok(p.department.includes('Computer Science'))
      assert.ok(p.technologies.some((t: string) => t.toLowerCase().includes('python')))
    }
  })

  test('7. Natural-language search parses intent ("Projects developed using machine learning")', async () => {
    const res = await fetch(
      `${baseUrl}/api/repository/search?query=Projects developed using machine learning&naturalLanguage=true`,
      { headers: studentRahul.headers }
    )
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.length >= 1)
    const hasMl = json.data.some((p: any) =>
      p.technologies.some((t: string) => t.toLowerCase().includes('machine learning') || t.toLowerCase().includes('scikit')) ||
      p.abstract.toLowerCase().includes('machine learning') ||
      p.title.toLowerCase().includes('ai')
    )
    assert.ok(hasMl, 'Natural language search should identify ML projects')
  })

  test('8. AI Similarity Analysis returns 8-dimension breakdown (features, similarities, differences, improvements)', async () => {
    const res = await fetch(`${baseUrl}/api/repository/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...studentRahul.headers },
      body: JSON.stringify({
        title: 'Automated Clinical Risk Prediction Engine',
        description: 'Predict patient diabetes and heart disease using clinical markers with ensemble classifiers.',
        technologies: ['Python', 'FastAPI', 'React', 'Scikit-learn'],
      }),
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.matches.length >= 1)

    const top = json.data.matches[0]
    assert.ok(top.analysis)
    assert.ok(top.analysis.problemAddressed)
    assert.ok(top.analysis.documentedSolution)
    assert.ok(Array.isArray(top.analysis.documentedFeatures))
    assert.ok(Array.isArray(top.analysis.similaritiesWithIdea))
    assert.ok(Array.isArray(top.analysis.differencesWithIdea))
    assert.ok(Array.isArray(top.analysis.missingOrUnknownInformation))
    assert.ok(Array.isArray(top.analysis.improvementOpportunities))
    assert.ok(top.analysis.improvementOpportunities.length > 0)
  })

  test('9. Matched project returns verifiable source attribution and documentation status', async () => {
    const res = await fetch(`${baseUrl}/api/repository/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...studentRahul.headers },
      body: JSON.stringify({
        title: 'AI Healthcare Diagnostics',
        description: 'Chronic disease risk prediction model using patient vitals.',
        technologies: ['Python'],
      }),
    })

    const json = await res.json()
    const top = json.data.matches[0]
    assert.strictEqual(top.sourceAttribution.sourceType, 'ADMIN_IMPORTED_HISTORICAL')
    assert.strictEqual(top.sourceAttribution.verificationStatus, 'VERIFIED_HISTORICAL')
    assert.strictEqual(top.sourceAttribution.confirmedFromDocumentation, true)
  })

  test('10 & 11. Pending submissions are not exposed in public search', async () => {
    const draftRes = await fetch(`${baseUrl}/api/repository/submissions/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
      body: JSON.stringify({
        title: 'Confidential Quantum Key Distribution Project',
        abstract: 'Experimental optical quantum key distribution setup.',
        problemStatement: 'Eavesdropping vulnerabilities on fiber optic communication channels.',
        academicYear: '2024-2025',
        department: 'Physics',
      }),
    })
    const draftJson = await draftRes.json()
    const confidentialId = draftJson.data.id

    const searchRes = await fetch(`${baseUrl}/api/repository/search?query=Confidential Quantum Key`, {
      headers: studentStranger.headers,
    })
    const searchJson = await searchRes.json()
    const found = searchJson.data.find((p: any) => p.id === confidentialId)
    assert.strictEqual(found, undefined, 'Unapproved pending draft must NOT appear in public repository search')

    const directRes = await fetch(`${baseUrl}/api/repository/projects/${confidentialId}`, {
      headers: studentStranger.headers,
    })
    assert.strictEqual(directRes.status, 403, 'Unapproved project must return 403 Forbidden for non-owners')
  })

  test('12. Private faculty rejection notes are masked from public search callers', async () => {
    const res = await fetch(`${baseUrl}/api/repository/search?query=Decentralized Micro-Credential Verifier`, {
      headers: studentStranger.headers,
    })
    const json = await res.json()
    if (json.data.length > 0) {
      const p = json.data[0]
      assert.strictEqual(p.rejectionReason, undefined, 'Private rejection reason must be masked')
      assert.strictEqual(p.changeRequests, undefined, 'Private faculty change notes must be masked')
    }
  })

  test('13. AI Mentor cites repository, distinguishes facts vs suggestions, and asks follow-up question', async () => {
    const convRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
      body: JSON.stringify({ title: 'Attendance Idea Consultation' }),
    })
    const convJson = await convRes.json()
    const conversationId = convJson.data.id

    const msgRes = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentRahul.headers,
      },
      body: JSON.stringify({
        content: 'I want to develop an AI-based attendance management system.',
        stream: false,
      }),
    })

    assert.strictEqual(msgRes.status, 200)
    const msgJson = await msgRes.json()
    const reply = msgJson.data.content

    assert.ok(
      reply.includes('I found related projects in the available academic repository. Let us compare their documented functionality with your idea.') ||
      reply.includes('available academic repository') ||
      reply.includes('Verified Repository Record'),
      'AI Mentor should introduce repository comparison'
    )
    assert.ok(reply.includes('Documented Features') || reply.includes('Features'), 'AI should list documented features')
    assert.ok(reply.includes('Limitations') || reply.includes('bottlenecks'), 'AI should discuss limitations')
    assert.ok(reply.includes('What Remains Unknown') || reply.includes('Not available in documented record'), 'AI should identify unknown details')
    assert.ok(reply.includes('Opportunities for Meaningful Improvements') || reply.includes('improvement'), 'AI should suggest improvements')
    assert.ok(reply.includes('What specific new capability') || reply.includes('What new capability') || reply.includes('?'), 'AI should ask a follow-up question')
  })
})
