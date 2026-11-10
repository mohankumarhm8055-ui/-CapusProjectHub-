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

describe('CampusProjectHub Repository Intelligence Engine Test Suite', () => {
  let server: Server
  let baseUrl: string
  const port = 5056
  let student1: TestAuthSession
  let faculty1: TestAuthSession
  let admin1: TestAuthSession

  before(async () => {
    enableTestInMemoryFallback()
    await seedRepository()

    student1 = await createAuthenticatedTestUser({
      label: 'repo-student-1',
      role: 'student',
      fullName: 'Jane Doe',
    })
    faculty1 = await createAuthenticatedTestUser({
      label: 'repo-faculty-1',
      role: 'faculty',
      fullName: 'Prof. Anitha Kumar',
    })
    admin1 = await createAuthenticatedTestUser({
      label: 'repo-admin-1',
      role: 'admin',
      fullName: 'Repo Admin',
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

  test('1. GET /api/repository/search - Exact title match returns verified benchmark project', async () => {
    const res = await fetch(`${baseUrl}/api/repository/search?query=AI Healthcare Prediction System`, {
      headers: student1.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.length >= 1)
    const found = json.data.find((p: any) => p.title.toLowerCase().includes('healthcare'))
    assert.ok(found)
    assert.strictEqual(found.verificationStatus, 'VERIFIED_HISTORICAL')
    assert.strictEqual(found.workflowStatus, 'APPROVED')
    assert.ok(Array.isArray(found.technologies))
    assert.ok(found.technologies.includes('Python'))
  })

  test('2. GET /api/repository/search - Department and technology filter narrowing', async () => {
    const res = await fetch(
      `${baseUrl}/api/repository/search?department=Computer Science and Engineering&technology=React`,
      { headers: student1.headers }
    )
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.length >= 1)
    for (const project of json.data) {
      assert.ok(project.department.includes('Computer Science'))
      assert.ok(project.technologies.some((t: string) => t.toLowerCase().includes('react')))
    }
  })

  test('3. POST /api/repository/compare - Concept overlap detection with pedagogical critique', async () => {
    const payload = {
      title: 'AI Healthcare Diagnosis and Disease Prediction Model',
      description: 'A machine learning system for predicting multiple diseases such as diabetes and heart disease using patient clinical metrics.',
      technologies: ['Python', 'Scikit-learn', 'Flask'],
      domain: 'Healthcare / Machine Learning',
    }

    const res = await fetch(`${baseUrl}/api/repository/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...student1.headers },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)
    assert.ok(json.data.matches.length >= 1)

    const topMatch = json.data.matches[0]
    assert.ok(
      ['EXACT_OR_NEAR_EXACT_TITLE', 'SIMILAR_PROJECT_CONCEPT', 'SIMILAR_FEATURE_SET'].includes(topMatch.classification),
      `Expected high similarity classification, got ${topMatch.classification}`
    )
    assert.ok(topMatch.overlapConfidence > 0.4)
    assert.ok(topMatch.documentedFeatures.length > 0)
    assert.ok(topMatch.pedagogicalCritique)
    assert.ok(
      topMatch.pedagogicalCritique.includes('What new capability or meaningful improvement are you planning?') ||
      topMatch.pedagogicalCritique.includes('overlaps')
    )
  })

  test('4. POST /api/repository/compare - Shared technology alone is NOT flagged as duplicate concept', async () => {
    const payload = {
      title: 'Local Supermarket Inventory Tracker',
      description: 'A tool for small store owners to log stock items, scan barcodes, and generate reorder alerts.',
      technologies: ['Python', 'Flask', 'React'],
      domain: 'Retail / Supply Chain',
    }

    const res = await fetch(`${baseUrl}/api/repository/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...student1.headers },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.strictEqual(json.success, true)

    const highMatches = json.data.matches.filter(
      (m: any) => m.classification === 'EXACT_OR_NEAR_EXACT_TITLE' || m.classification === 'SIMILAR_PROJECT_CONCEPT'
    )
    assert.strictEqual(highMatches.length, 0, 'Shared technology alone must NOT classify as SIMILAR_PROJECT_CONCEPT')
    assert.ok(
      json.data.summary.includes('Unique Concept') ||
      json.data.matches.every((m: any) => ['RELATED_TECHNOLOGY_ONLY', 'INDEPENDENT_WORK'].includes(m.classification))
    )
  })

  test('5. POST /api/repository/admin/import - Duplicate title warning and rejection without flag', async () => {
    const res = await fetch(`${baseUrl}/api/repository/admin/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...admin1.headers,
      },
      body: JSON.stringify({
        project: {
          title: 'Smart Attendance Management System',
          abstract: 'Another duplicate attendance system...',
          academicYear: '2024-2025',
          department: 'Computer Science and Engineering',
          technologies: ['Node.js', 'React'],
          mentorFacultyName: 'Dr. Ramesh',
          teamMembers: [{ fullName: 'John Doe', rollNumber: 'CS01' }],
        },
        allowDuplicate: false,
      }),
    })

    assert.strictEqual(res.status, 409)
    const json = await res.json()
    assert.strictEqual(json.success, false)
    assert.ok(json.duplicateWarning)
  })

  test('6. POST /api/repository/admin/import & verify - Successful ingestion & historical verification', async () => {
    const uniqueTitle = `Autonomous Drone Path Planning ${Date.now()}`
    const importRes = await fetch(`${baseUrl}/api/repository/admin/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...admin1.headers,
      },
      body: JSON.stringify({
        project: {
          title: uniqueTitle,
          abstract: 'Obstacle avoidance algorithms for aerial UAVs in GPS-denied indoor environments.',
          academicYear: '2023-2024',
          department: 'Electronics and Communication Engineering',
          technologies: ['ROS2', 'C++', 'Python', 'OpenCV'],
          mentorFacultyName: 'Dr. Suresh Babu',
          teamMembers: [{ fullName: 'Alice Walker', rollNumber: 'EC088', contactEmail: 'alice@college.edu', contactPhone: '+919876543210' }],
        },
      }),
    })

    assert.strictEqual(importRes.status, 201)
    const importJson = await importRes.json()
    const projectId = importJson.data.id

    const verifyRes = await fetch(`${baseUrl}/api/repository/admin/verify/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...admin1.headers,
      },
      body: JSON.stringify({
        verificationStatus: 'VERIFIED_HISTORICAL',
        verificationNotes: 'Archival record validated against department records.',
      }),
    })

    assert.strictEqual(verifyRes.status, 200)
    const verifyJson = await verifyRes.json()
    assert.strictEqual(verifyJson.data.verificationStatus, 'VERIFIED_HISTORICAL')
  })

  test('7. Student submission lifecycle: Draft -> Submit -> Faculty Review (Request Changes -> Approve)', async () => {
    const draftRes = await fetch(`${baseUrl}/api/repository/submissions/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        title: 'Smart Solar Microgrid Energy Allocation System',
        abstract: 'An IoT and RL-based energy routing algorithm for academic campus microgrids.',
        academicYear: '2024-2025',
        department: 'Electrical and Electronics Engineering',
        technologies: ['Python', 'MQTT', 'TensorFlow', 'Raspberry Pi'],
        mentorFacultyName: 'Prof. Anitha Kumar',
        teamMembers: [{ fullName: 'Jane Doe', rollNumber: 'EE101', contactEmail: 'jane@college.edu' }],
      }),
    })

    assert.strictEqual(draftRes.status, 201)
    const draftJson = await draftRes.json()
    assert.strictEqual(draftJson.data.workflowStatus, 'DRAFT')
    const subId = draftJson.data.id

    const submitRes = await fetch(`${baseUrl}/api/repository/submissions/${subId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
    })

    assert.strictEqual(submitRes.status, 200)
    const submitJson = await submitRes.json()
    assert.strictEqual(submitJson.data.workflowStatus, 'SUBMITTED')

    const reqChangesRes = await fetch(`${baseUrl}/api/repository/submissions/${subId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...faculty1.headers,
      },
      body: JSON.stringify({
        decision: 'REQUEST_CHANGES',
        reviewComments: 'Please expand on the hardware inverter interface and battery cycle life protection.',
      }),
    })

    assert.strictEqual(reqChangesRes.status, 200)
    const reqChangesJson = await reqChangesRes.json()
    assert.strictEqual(reqChangesJson.data.workflowStatus, 'CHANGES_REQUESTED')

    const approveRes = await fetch(`${baseUrl}/api/repository/submissions/${subId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...faculty1.headers,
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        reviewComments: 'Hardware specs revised thoroughly. Approved for final evaluation.',
      }),
    })

    assert.strictEqual(approveRes.status, 200)
    const approveJson = await approveRes.json()
    assert.strictEqual(approveJson.data.workflowStatus, 'APPROVED')
    assert.strictEqual(approveJson.data.verificationStatus, 'FACULTY_APPROVED')
  })

  test('8. Security & Data Protection - Contact email, phone, and internal comments masked for public view', async () => {
    const res = await fetch(`${baseUrl}/api/repository/search?query=Autonomous Drone Path Planning`, {
      headers: student1.headers,
    })
    assert.strictEqual(res.status, 200)
    const json = await res.json()
    assert.ok(json.data.length >= 1)
    const p = json.data[0]

    for (const member of p.teamMembers) {
      assert.strictEqual(member.contactEmail, undefined, 'Public search must not expose student email')
      assert.strictEqual(member.contactPhone, undefined, 'Public search must not expose student phone')
    }
  })

  test('9. AI Project Mentor grounds answer with repository citations and queries student for novelty', async () => {
    const convRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({ title: 'AI Attendance Query' }),
    })
    const convJson = await convRes.json()
    const conversationId = convJson.data.id

    const msgRes = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...student1.headers,
      },
      body: JSON.stringify({
        content: 'I want to build a Smart Attendance Management System using facial recognition.',
        stream: false,
      }),
    })

    assert.strictEqual(msgRes.status, 200)
    const msgJson = await msgRes.json()
    const content = msgJson.data.content

    assert.ok(
      content.includes('Smart Attendance Management System') ||
      content.includes('Campus Repository Records') ||
      content.includes('repository') ||
      content.includes('overlap'),
      'AI response should cite repository records'
    )
    assert.ok(
      content.includes('What new capability') ||
      content.includes('What new capability or meaningful improvement are you planning?') ||
      content.includes('different') ||
      content.includes('improvement') ||
      content.includes('novelty'),
      'AI response should probe for new capability or improvement'
    )
  })
})
