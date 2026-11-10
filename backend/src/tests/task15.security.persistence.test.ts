import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import mongoose from 'mongoose'
import { createApp } from '../app.js'
import { config } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { seedMentorProfiles } from '../modules/connections/connection.model.js'
import { seedCollegeTemplates } from '../modules/proposals/template.model.js'
import { MongoUserModel, inMemoryUserStore } from '../modules/auth/user.model.js'
import { inMemorySessionStore } from '../modules/auth/session.model.js'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import { inMemoryEvaluationStore } from '../modules/ai/feature-evaluation/evaluation.model.js'
import { inMemoryProposalStore } from '../modules/proposals/proposal.model.js'
import {
  inMemoryConnectionStore,
  inMemoryMessageStore as inMemoryConnMsgStore,
  inMemoryNotificationStore,
} from '../modules/connections/connection.model.js'

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/campusprojecthub_task15_test'

function clearAllInMemoryStores(): void {
  inMemoryUserStore.clear()
  inMemorySessionStore.clear()
  inMemoryConversationStore.clear()
  inMemoryMessageStore.clear()
  inMemoryEvaluationStore.clear()
  inMemoryProposalStore.clear()
  inMemoryConnectionStore.clear()
  inMemoryConnMsgStore.clear()
  inMemoryNotificationStore.clear()
}

describe('TASK 15 — MongoDB Persistence & Authentication Hardening Integration Suite', () => {
  let server: http.Server | null = null
  let baseUrl = ''
  const PORT = 5075

  const startHttpServer = async () => {
    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://127.0.0.1:${PORT}`
        resolve()
      })
    })
  }

  const stopHttpServer = async () => {
    if (!server) return
    const current = server
    server = null
    await new Promise<void>((resolve) => current.close(() => resolve()))
  }

  before(async () => {
    // Ensure strict fail-closed database policy during Task 15 suite
    process.env.ALLOW_INMEMORY_FALLBACK = 'false'
    config.ALLOW_INMEMORY_FALLBACK = 'false'
    config.FACULTY_INVITE_CODE = 'TEST-FAC-INVITE-2026'
    config.ADMIN_PROVISION_SECRET = 'TEST-ADMIN-SECRET-2026-LONG'

    await disconnectDatabase()
    clearAllInMemoryStores()
    await startHttpServer()
  })

  after(async () => {
    await stopHttpServer()
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase()
    }
    await disconnectDatabase()
  })

  it('1. Refuses silent in-memory fallback when MongoDB is disconnected (503 DATABASE_UNAVAILABLE)', async () => {
    const healthRes = await fetch(`${baseUrl}/health`)
    assert.equal(healthRes.status, 503)
    const healthJson: any = await healthRes.json()
    assert.equal(healthJson.status, 'unavailable')
    assert.equal(healthJson.database.persistent, false)

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'offline@campusprojecthub.edu',
        password: 'Password123!',
        fullName: 'Offline Test',
      }),
    })
    assert.equal(regRes.status, 503)
    const regJson: any = await regRes.json()
    assert.equal(regJson.error.code, 'DATABASE_UNAVAILABLE')
  })

  it('2. Connects to real MongoDB and seeds repository, mentor profiles & college templates', async () => {
    await connectDatabase(TEST_MONGO_URI)
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase()
    }
    await seedRepository()
    await seedMentorProfiles()
    await seedCollegeTemplates()

    const healthRes = await fetch(`${baseUrl}/health`)
    assert.equal(healthRes.status, 200)
    const healthJson: any = await healthRes.json()
    assert.equal(healthJson.status, 'ok')
    assert.equal(healthJson.database.connected, true)
    assert.equal(healthJson.database.mode, 'mongodb')
    assert.equal(healthJson.database.persistent, true)
  })

  let student1Id = ''
  let student1Token = ''
  let student2Token = ''
  let facultyToken = ''
  let adminToken = ''
  let seniorMentorId = ''
  let seniorMentorToken = ''

  it('3. Student registration hashes password with scrypt, rejects plaintext exposure, and controlled faculty/admin provisioning works', async () => {
    // A. Register Student 1
    const reg1Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.hardened@rvce.edu.in',
        password: 'StrongPassword#2026',
        fullName: 'Alice Hardened',
        department: 'Computer Science & Engineering',
      }),
    })
    assert.equal(reg1Res.status, 201)
    const reg1Json: any = await reg1Res.json()
    assert.ok(reg1Json.data.token)
    assert.equal(reg1Json.data.user.role, 'student')
    assert.equal(reg1Json.data.user.passwordHash, undefined)
    student1Id = reg1Json.data.user.id
    student1Token = reg1Json.data.token

    // Inspect real MongoDB user document to prove password is scrypt hashed
    const dbUser: any = await MongoUserModel.findOne({ email: 'alice.hardened@rvce.edu.in' }).lean()
    assert.ok(dbUser)
    assert.ok(dbUser.passwordHash.startsWith('scrypt:'))
    assert.notEqual(dbUser.passwordHash, 'StrongPassword#2026')

    // Invalid password rejected with 401
    const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.hardened@rvce.edu.in',
        password: 'WrongPassword!',
      }),
    })
    assert.equal(badLogin.status, 401)

    // Register Student 2 & Senior Mentor
    const reg2Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob.hardened@rvce.edu.in',
        password: 'StrongPassword#2026',
        fullName: 'Bob Hardened',
      }),
    })
    student2Token = (await reg2Res.json()).data.token

    const regSeniorRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'senior.hardened@rvce.edu.in',
        password: 'StrongPassword#2026',
        fullName: 'Senior Mentor',
      }),
    })
    const seniorJson: any = await regSeniorRes.json()
    seniorMentorId = seniorJson.data.user.id
    seniorMentorToken = seniorJson.data.token

    // Public admin self-registration is strictly blocked (403)
    const adminSelfReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'evil.admin@rvce.edu.in',
        password: 'StrongPassword#2026',
        fullName: 'Evil Admin',
        role: 'admin',
      }),
    })
    assert.equal(adminSelfReg.status, 403)

    // Controlled faculty registration fails without invite code, succeeds with invite code
    const facFail = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fac.hardened@rvce.edu.in',
        password: 'StrongPassword#2026',
        fullName: 'Prof. Reviewer',
        role: 'faculty',
        inviteCode: 'WRONG-CODE',
      }),
    })
    assert.equal(facFail.status, 403)

    const facOk = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fac.hardened@rvce.edu.in',
        password: 'StrongPassword#2026',
        fullName: 'Prof. Reviewer',
        role: 'faculty',
        inviteCode: 'TEST-FAC-INVITE-2026',
      }),
    })
    assert.equal(facOk.status, 201)
    facultyToken = (await facOk.json()).data.token

    // Controlled admin bootstrap
    const adminBoot = await fetch(`${baseUrl}/api/auth/bootstrap-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provisionSecret: 'TEST-ADMIN-SECRET-2026-LONG',
        email: 'admin.hardened@rvce.edu.in',
        password: 'AdminPassword#2026',
        fullName: 'System Admin',
      }),
    })
    assert.equal(adminBoot.status, 201)

    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.hardened@rvce.edu.in',
        password: 'AdminPassword#2026',
      }),
    })
    assert.equal(adminLogin.status, 200)
    adminToken = (await adminLogin.json()).data.token
  })

  it('4. Changing X-Student-Id or X-User-Role headers cannot impersonate or escalate privileges', async () => {
    // Request without bearer token but with X-Student-Id / X-User-Role -> 401
    const unauthHeaderRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      headers: {
        'X-Student-Id': student1Id,
        'X-User-Role': 'admin',
      },
    })
    assert.equal(unauthHeaderRes.status, 401)

    // Student 2 sends valid Bearer token + forged X-Student-Id of Student 1 + X-User-Role: admin
    const spoofConvRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student2Token}`,
        'X-Student-Id': student1Id,
        'X-User-Role': 'admin',
      },
      body: JSON.stringify({ title: 'Spoof Attempt' }),
    })
    assert.equal(spoofConvRes.status, 201)
    const spoofConvJson: any = await spoofConvRes.json()
    // Owner must strictly be Student 2, NOT Student 1!
    assert.notEqual(spoofConvJson.data.ownerId, student1Id)

    // Spoofed X-User-Role: admin on Student token still gets 403 on admin endpoints
    const spoofAdminRes = await fetch(`${baseUrl}/api/auth/admin/users`, {
      headers: {
        Authorization: `Bearer ${student2Token}`,
        'X-User-Role': 'admin',
      },
    })
    assert.equal(spoofAdminRes.status, 403)
  })

  it('5. Logout invalidates the active server-side session token immediately', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.hardened@rvce.edu.in',
        password: 'StrongPassword#2026',
      }),
    })
    const tempToken = (await loginRes.json()).data.token

    const meBefore = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tempToken}` },
    })
    assert.equal(meBefore.status, 200)

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` },
    })
    assert.equal(logoutRes.status, 200)

    const meAfter = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tempToken}` },
    })
    assert.equal(meAfter.status, 401)
    const meAfterJson: any = await meAfter.json()
    assert.equal(meAfterJson.error.code, 'SESSION_REVOKED')
  })

  let persistedConvId = ''
  let persistedEvalId = ''
  let persistedDraftProposalId = ''
  let persistedSubmittedProposalId = ''
  let persistedConnectionId = ''
  const customTemplateId = 'rvce-custom-hardened-tpl-v1'

  it('6. Saves conversation, evaluation, scope, proposals, connections & template to MongoDB, then survives full server restart', async () => {
    // 1. Conversation + message
    const convRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ title: 'MongoDB Persistent Mentor Thread' }),
    })
    assert.equal(convRes.status, 201)
    persistedConvId = (await convRes.json()).data.id

    const msgRes = await fetch(`${baseUrl}/api/ai/conversations/${persistedConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        content: 'We want to build a Smart Attendance System with rotating QR codes for 3 intermediate students.',
        stream: false,
      }),
    })
    assert.equal(msgRes.status, 200)

    // 2. Evaluation + decision + scope + finalize
    const evalRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        conversationId: persistedConvId,
        projectTitle: 'Persistent Campus QR Attendance',
        proposedFeatures: [
          'Student project management',
          'Facial recognition attendance',
          'Faculty review workflow',
        ],
      }),
    })
    assert.equal(evalRes.status, 201)
    const evalJson: any = await evalRes.json()
    persistedEvalId = evalJson.data.id

    const facial = evalJson.data.features.find((f: any) => f.name.toLowerCase().includes('facial'))
    await fetch(`${baseUrl}/api/ai/evaluations/${persistedEvalId}/decisions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        featureId: facial.featureId,
        decision: 'MODIFIED',
        modifiedScope: 'Use rotating 15-second QR tokens',
      }),
    })

    await fetch(`${baseUrl}/api/ai/evaluations/${persistedEvalId}/generate-scope`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    await fetch(`${baseUrl}/api/ai/evaluations/${persistedEvalId}/scope/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1Token}` },
    })

    // 3. Admin saves custom college template
    const tplCreate = await fetch(`${baseUrl}/api/proposals/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        templateId: customTemplateId,
        templateVersion: '2.0.0',
        templateName: 'RVCE Persistent Hardened Format',
        college: 'R.V. College of Engineering',
        department: 'CSE',
        academicYear: '2026 - 2027',
        semester: '7th Semester',
        documentType: 'MINI_PROJECT_PROPOSAL',
        mandatorySectionIds: ['title', 'abstract', 'problem-statement', 'objectives', 'scope', 'references'],
        optionalSectionIds: [],
      }),
    })
    assert.equal(tplCreate.status, 201)

    // 4. Draft proposal (stays private from faculty) + Submitted proposal (visible to faculty)
    const draftRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        projectTitle: 'Private Draft Proposal',
        sourceEvaluationId: persistedEvalId,
      }),
    })
    persistedDraftProposalId = (await draftRes.json()).data.id

    const propRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        projectTitle: 'Submitted Persistent Proposal',
        sourceEvaluationId: persistedEvalId,
        templateId: customTemplateId,
      }),
    })
    persistedSubmittedProposalId = (await propRes.json()).data.id

    await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}/sections/abstract`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ content: 'Custom persisted abstract surviving restart.' }),
    })
    await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ revisionSummary: 'Pre-restart snapshot v2' }),
    })
    await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ facultyGuideName: 'Prof. Reviewer', comments: 'Submitting to MongoDB.' }),
    })

    // 5. Senior opts in + connection + accept + message
    await fetch(`${baseUrl}/api/connections/profile/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${seniorMentorToken}` },
      body: JSON.stringify({ isAvailableForMentoring: true }),
    })
    const connReqRes = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        projectId: 'proj_cph_academic_01',
        projectTitle: 'Smart Attendance System',
        seniorId: seniorMentorId,
        purpose: 'UNDERSTAND_ARCHITECTURE',
        note: 'Seeking guidance on QR token expiration persistence across restarts.',
      }),
    })
    assert.equal(connReqRes.status, 201)
    persistedConnectionId = (await connReqRes.json()).data.id

    await fetch(`${baseUrl}/api/connections/${persistedConnectionId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${seniorMentorToken}` },
    })
    await fetch(`${baseUrl}/api/connections/${persistedConnectionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ content: 'This mentorship message must survive restart.' }),
    })

    // --- SIMULATE FULL SERVER RESTART & CLEAR ALL IN-MEMORY CACHES ---
    await stopHttpServer()
    clearAllInMemoryStores()
    await disconnectDatabase()

    await connectDatabase(TEST_MONGO_URI)
    await startHttpServer()

    // Re-verify all records survived server restart from MongoDB alone
    const convAfter = await fetch(`${baseUrl}/api/ai/conversations/${persistedConvId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    assert.equal(convAfter.status, 200)
    const convAfterJson: any = await convAfter.json()
    assert.equal(convAfterJson.data.conversation.title, 'MongoDB Persistent Mentor Thread')
    assert.equal(convAfterJson.data.messages.length, 2)

    const evalAfter = await fetch(`${baseUrl}/api/ai/evaluations/${persistedEvalId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    assert.equal(evalAfter.status, 200)
    const evalAfterJson: any = await evalAfter.json()
    assert.equal(evalAfterJson.data.isFinalized, true)
    assert.equal(evalAfterJson.data.decisions[0].decision, 'MODIFIED')
    assert.ok(evalAfterJson.data.finalScope)

    const propAfter = await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    assert.equal(propAfter.status, 200)
    const propAfterJson: any = await propAfter.json()
    assert.equal(propAfterJson.data.activeVersionNumber, 2)
    assert.equal(propAfterJson.data.submission.status, 'SUBMITTED')
    assert.equal(propAfterJson.data.template.templateId, customTemplateId)
    const absAfter = propAfterJson.data.sections.find((s: any) => s.sectionId === 'abstract')
    assert.equal(absAfter.content, 'Custom persisted abstract surviving restart.')

    const connMsgAfter = await fetch(`${baseUrl}/api/connections/${persistedConnectionId}/messages`, {
      headers: { Authorization: `Bearer ${seniorMentorToken}` },
    })
    assert.equal(connMsgAfter.status, 200)
    const connMsgJson: any = await connMsgAfter.json()
    assert.equal(connMsgJson.data.length, 1)
    assert.equal(connMsgJson.data[0].content, 'This mentorship message must survive restart.')

    const tplAfter = await fetch(`${baseUrl}/api/proposals/templates`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    const tplList: any[] = (await tplAfter.json()).data
    assert.ok(tplList.some((t) => t.templateId === customTemplateId))
  })

  it('7. Enforces Role-Based Access Control (Student isolation, Faculty private limits, Admin rejection of Students)', async () => {
    // Student 2 cannot read Student 1 private conversation, evaluation, draft/submitted proposal, or connection
    assert.equal(
      (await fetch(`${baseUrl}/api/ai/conversations/${persistedConvId}`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      })).status,
      403
    )
    assert.equal(
      (await fetch(`${baseUrl}/api/ai/evaluations/${persistedEvalId}`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      })).status,
      403
    )
    assert.equal(
      (await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      })).status,
      403
    )

    // Faculty CANNOT access unrelated private student conversations, private evaluations, or unsubmitted DRAFT proposals
    assert.equal(
      (await fetch(`${baseUrl}/api/ai/conversations/${persistedConvId}`, {
        headers: { Authorization: `Bearer ${facultyToken}` },
      })).status,
      403
    )
    assert.equal(
      (await fetch(`${baseUrl}/api/ai/evaluations/${persistedEvalId}`, {
        headers: { Authorization: `Bearer ${facultyToken}` },
      })).status,
      403
    )
    assert.equal(
      (await fetch(`${baseUrl}/api/proposals/${persistedDraftProposalId}`, {
        headers: { Authorization: `Bearer ${facultyToken}` },
      })).status,
      403
    )

    // Faculty CAN read & review SUBMITTED proposal
    assert.equal(
      (await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}`, {
        headers: { Authorization: `Bearer ${facultyToken}` },
      })).status,
      200
    )
    const revRes = await fetch(`${baseUrl}/api/proposals/${persistedSubmittedProposalId}/faculty/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({ status: 'APPROVED', comments: 'Approved by authorized faculty.' }),
    })
    assert.equal(revRes.status, 200)

    // Admin-only APIs reject both Student AND Faculty accounts
    for (const nonAdminToken of [student1Token, facultyToken]) {
      assert.equal(
        (await fetch(`${baseUrl}/api/auth/admin/users`, {
          headers: { Authorization: `Bearer ${nonAdminToken}` },
        })).status,
        403
      )
      assert.equal(
        (await fetch(`${baseUrl}/api/proposals/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nonAdminToken}` },
          body: JSON.stringify({
            templateId: 'unauth-tpl',
            templateName: 'Unauthorized Template',
            college: 'Test',
            department: 'CSE',
            academicYear: '2026',
            semester: '7th',
            documentType: 'MINI_PROJECT_PROPOSAL',
            mandatorySectionIds: ['title'],
          }),
        })).status,
        403
      )
      assert.equal(
        (await fetch(`${baseUrl}/api/repository/admin/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nonAdminToken}` },
          body: JSON.stringify({ project: { title: 'Unauthorized Import' } }),
        })).status,
        403
      )
    }

    // Admin succeeds on user listing & repository admin import
    const adminUsersRes = await fetch(`${baseUrl}/api/auth/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert.equal(adminUsersRes.status, 200)
    const usersJson: any = await adminUsersRes.json()
    assert.ok(usersJson.data.length >= 5)
    for (const u of usersJson.data) {
      assert.equal(u.passwordHash, undefined)
    }
  })

  it('8. Database disconnect reports 503 safely and recovers cleanly upon reconnect', async () => {
    await disconnectDatabase()

    const failedConvRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    assert.equal(failedConvRes.status, 503)
    const failedJson: any = await failedConvRes.json()
    assert.equal(failedJson.error.code, 'DATABASE_UNAVAILABLE')

    const failedHealth = await fetch(`${baseUrl}/health`)
    assert.equal(failedHealth.status, 503)

    // Reconnect and verify immediate recovery
    await connectDatabase(TEST_MONGO_URI)

    const recoveredHealth = await fetch(`${baseUrl}/health`)
    assert.equal(recoveredHealth.status, 200)

    const recoveredConvRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    })
    assert.equal(recoveredConvRes.status, 200)
    const recoveredJson: any = await recoveredConvRes.json()
    assert.ok(recoveredJson.data.some((c: any) => c.id === persistedConvId))
  })
})
