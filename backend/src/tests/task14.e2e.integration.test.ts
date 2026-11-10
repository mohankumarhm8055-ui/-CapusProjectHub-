import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { inMemoryConversationStore } from '../modules/ai/conversation.model.js'
import { inMemoryMessageStore } from '../modules/ai/message.model.js'
import { inMemoryEvaluationStore } from '../modules/ai/feature-evaluation/evaluation.model.js'
import { inMemoryProposalStore } from '../modules/proposals/proposal.model.js'
import { inMemoryProjectStore } from '../modules/repository/project.model.js'
import {
  inMemoryConnectionStore,
  inMemoryMessageStore as inMemoryConnMessageStore,
  inMemoryNotificationStore,
  inMemoryProfileStore,
} from '../modules/connections/connection.model.js'
import {
  createAuthenticatedTestUser,
  enableTestInMemoryFallback,
  type TestAuthSession,
} from './helpers/testAuth.js'

describe('TASK 14 — CampusProjectHub Complete AI System E2E Integration Suite', () => {
  let server: http.Server
  let baseUrl: string
  const PORT = 5074

  let studentA: TestAuthSession
  let studentB: TestAuthSession
  let facultyUser: TestAuthSession
  let seniorMentor: TestAuthSession

  let conversationId: string
  let evaluationId: string
  let proposalId: string
  let matchedProjectId: string
  let optedOutSeniorId: string
  let connectionRequestId: string

  before(async () => {
    enableTestInMemoryFallback()
    inMemoryConversationStore.clear()
    inMemoryMessageStore.clear()
    inMemoryEvaluationStore.clear()
    inMemoryProposalStore.clear()
    inMemoryProjectStore.clear()
    inMemoryProfileStore.clear()
    inMemoryConnectionStore.clear()
    inMemoryConnMessageStore.clear()
    inMemoryNotificationStore.clear()

    await seedRepository()

    studentA = await createAuthenticatedTestUser({
      label: 'e2e-alice',
      role: 'student',
      fullName: 'Alice Student',
    })
    studentB = await createAuthenticatedTestUser({
      label: 'e2e-bob',
      role: 'student',
      fullName: 'Bob Student',
    })
    facultyUser = await createAuthenticatedTestUser({
      label: 'e2e-faculty',
      role: 'faculty',
      fullName: 'Dr. Ramesh Babu',
    })
    seniorMentor = await createAuthenticatedTestUser({
      label: 'e2e-senior',
      role: 'student',
      fullName: 'Kiran Kumar',
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
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('1 & 2. Student starts a project idea and AI Mentor maintains conversation context across turns', async () => {
    const convRes = await fetch(`${baseUrl}/api/ai/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({ title: 'New Project Consultation' }),
    })
    assert.equal(convRes.status, 201)
    const convJson: any = await convRes.json()
    conversationId = convJson.data.id
    assert.ok(conversationId)

    const turn1Res = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        content:
          'I want to build a Smart Attendance Management System for a team of 3 intermediate students using React, Node.js, and MongoDB.',
        stream: false,
      }),
    })
    assert.equal(turn1Res.status, 200)
    const turn1Json: any = await turn1Res.json()
    assert.equal(turn1Json.success, true)
    assert.ok(turn1Json.data.content.includes('Smart Attendance Management System'))
    assert.ok(turn1Json.data.content.includes('/explore-projects/'))

    const ctxRes = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}/context`, {
      headers: studentA.headers,
    })
    assert.equal(ctxRes.status, 200)
    const ctxJson: any = await ctxRes.json()
    assert.equal(ctxJson.data.teamSize, 3)
    assert.equal(ctxJson.data.technicalExperience, 'intermediate')
    assert.ok(ctxJson.data.preferredTechnologies.includes('React'))
    assert.ok(ctxJson.data.matchedRepositoryProject?.projectId)
    matchedProjectId = ctxJson.data.matchedRepositoryProject.projectId

    const turn2Res = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        content: 'Can I add facial recognition attendance to this project?',
        stream: false,
      }),
    })
    assert.equal(turn2Res.status, 200)
    const turn2Json: any = await turn2Res.json()
    assert.ok(
      turn2Json.data.content.toLowerCase().includes('qr') ||
        turn2Json.data.content.toLowerCase().includes('facial recognition')
    )
  })

  it('3, 4 & 5. Repository search returns accessible matches, explains similarity limitations, and recommends improvements', async () => {
    const searchRes = await fetch(`${baseUrl}/api/repository/search?query=Attendance`, {
      headers: studentA.headers,
    })
    assert.equal(searchRes.status, 200)
    const searchJson: any = await searchRes.json()
    assert.ok(searchJson.data.length >= 1)
    const attendanceProj = searchJson.data.find((p: any) => p.title.includes('Attendance'))
    assert.ok(attendanceProj)
    for (const member of attendanceProj.teamMembers) {
      assert.equal(member.email, undefined)
      assert.equal(member.contactEmail, undefined)
      assert.equal(member.phone, undefined)
    }

    const compareRes = await fetch(`${baseUrl}/api/repository/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        title: 'Smart Attendance System with Dynamic QR',
        description: 'Contactless classroom attendance tracking with expiring QR codes and analytics.',
        technologies: ['React', 'Node.js', 'MongoDB'],
      }),
    })
    assert.equal(compareRes.status, 200)
    const compareJson: any = await compareRes.json()
    assert.ok(compareJson.data.matches.length >= 1)
    const top = compareJson.data.matches[0]
    assert.ok(top.analysis.improvementOpportunities.length >= 1)
    assert.ok(top.sourceAttribution.confirmedFromDocumentation !== undefined)
    assert.ok(
      top.pedagogicalCritique.length > 10 &&
        !top.pedagogicalCritique.toLowerCase().includes('guilty of plagiarism')
    )
  })

  it('6, 7 & 8. Feature evaluation classifies features, preserves modified decisions on reassessment, and finalizes scope', async () => {
    const evalRes = await fetch(`${baseUrl}/api/ai/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        conversationId,
        projectTitle: 'Smart Campus QR Attendance Tracker',
        problemStatement:
          'Manual classroom roll calls waste instructional time and allow proxy attendance across college departments.',
        proposedFeatures: [
          'Student project management',
          'College project repository',
          'Facial recognition attendance',
          'Faculty review and approval',
        ],
        constraints: {
          teamSize: 3,
          technicalExperience: 'intermediate',
          developmentWeeks: 10,
          languagesAndFrameworks: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
          hardwareResources: ['Standard Laptops', 'Classroom Wi-Fi'],
          academicRequirements: 'VTU 7th Semester Mini-Project Rubric',
        },
      }),
    })
    assert.equal(evalRes.status, 201)
    const evalJson: any = await evalRes.json()
    evaluationId = evalJson.data.id
    assert.equal(evalJson.data.projectTitle, 'Smart Campus QR Attendance Tracker')
    assert.ok(evalJson.data.features.length >= 4)

    const facialFeature = evalJson.data.features.find((f: any) =>
      f.name.toLowerCase().includes('facial')
    )
    assert.ok(facialFeature)
    assert.equal(facialFeature.classification, 'UNNECESSARY')
    assert.ok(facialFeature.recommendation)
    assert.ok(facialFeature.simplerAlternative)

    const modRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/decisions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        featureId: facialFeature.featureId,
        decision: 'MODIFIED',
        modifiedScope: 'Use rotating 15-second QR code check-in instead of facial biometrics',
      }),
    })
    assert.equal(modRes.status, 200)
    const modJson: any = await modRes.json()
    assert.equal(modJson.data.decisions.length, 1)

    const reassessRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/reassess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        constraints: { developmentWeeks: 8 },
      }),
    })
    assert.equal(reassessRes.status, 200)
    const reassessJson: any = await reassessRes.json()
    assert.equal(reassessJson.data.version, 2)
    assert.equal(reassessJson.data.decisions.length, 1)
    assert.equal(reassessJson.data.decisions[0].decision, 'MODIFIED')

    const scopeRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/generate-scope`, {
      method: 'POST',
      headers: studentA.headers,
    })
    assert.equal(scopeRes.status, 200)
    const scopeJson: any = await scopeRes.json()
    assert.ok(scopeJson.data.finalScope)
    assert.ok(scopeJson.data.finalScope.problemStatement.includes('proxy attendance'))

    const finalizeRes = await fetch(`${baseUrl}/api/ai/evaluations/${evaluationId}/scope/finalize`, {
      method: 'POST',
      headers: studentA.headers,
    })
    assert.equal(finalizeRes.status, 200)
    const finalizeJson: any = await finalizeRes.json()
    assert.equal(finalizeJson.data.isFinalized, true)
  })

  it('9, 10 & 11. Generates grounded proposal with selected college template, preserves edits, and exports PDF/DOCX', async () => {
    const tplRes = await fetch(`${baseUrl}/api/proposals/templates`, {
      headers: studentA.headers,
    })
    assert.equal(tplRes.status, 200)
    const tplJson: any = await tplRes.json()
    const autoTemplate = tplJson.data.find(
      (t: any) => t.templateId === 'autonomous-cse-project-report-v1'
    )
    assert.ok(autoTemplate)
    assert.equal(autoTemplate.templateVersion, '1.2.0')

    const genRes = await fetch(`${baseUrl}/api/proposals/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        projectTitle: 'Smart Campus QR Attendance Tracker',
        sourceEvaluationId: evaluationId,
        templateId: 'autonomous-cse-project-report-v1',
      }),
    })
    assert.equal(genRes.status, 201)
    const genJson: any = await genRes.json()
    proposalId = genJson.data.id
    assert.equal(genJson.data.isScopeFinalized, true)
    assert.equal(genJson.data.template.templateId, 'autonomous-cse-project-report-v1')
    assert.equal(genJson.data.template.templateVersion, '1.2.0')

    const abstractSec = genJson.data.sections.find((s: any) => s.sectionId === 'abstract')
    assert.ok(abstractSec.content.includes('Smart Campus QR Attendance Tracker'))
    assert.ok(!abstractSec.content.includes('This paper proposes CampusProjectHub'))

    const editRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/sections/abstract`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        content: `${abstractSec.content}\n\n[Student Custom Addition: Tested on 60 classroom seats.]`,
      }),
    })
    assert.equal(editRes.status, 200)

    const switchTplRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/template`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({ templateId: 'vtu-cse-capstone-mini-v1' }),
    })
    assert.equal(switchTplRes.status, 200)
    const switchJson: any = await switchTplRes.json()
    assert.equal(switchJson.data.template.templateId, 'vtu-cse-capstone-mini-v1')
    const editedAfterSwitch = switchJson.data.sections.find((s: any) => s.sectionId === 'abstract')
    assert.ok(editedAfterSwitch.content.includes('Student Custom Addition'))
    assert.equal(editedAfterSwitch.isManuallyEdited, true)

    const pdfRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/export?format=pdf`, {
      headers: studentA.headers,
    })
    assert.equal(pdfRes.status, 200)
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer())
    assert.equal(pdfBuf.subarray(0, 5).toString('ascii'), '%PDF-')

    const docxRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/export?format=docx`, {
      headers: studentA.headers,
    })
    assert.equal(docxRes.status, 200)
    const docxBuf = Buffer.from(await docxRes.arrayBuffer())
    assert.equal(docxBuf.subarray(0, 2).toString('ascii'), 'PK')
  })

  it('12 & 13. Proposal submission reaches faculty workflow, prevents duplicate submit, and reflects faculty review status', async () => {
    const submitRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        facultyGuideName: 'Dr. Ramesh Babu',
        comments: 'Ready for faculty review.',
      }),
    })
    assert.equal(submitRes.status, 200)
    const submitJson: any = await submitRes.json()
    assert.equal(submitJson.data.submission.status, 'SUBMITTED')

    const dupRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({ comments: 'Duplicate click' }),
    })
    assert.equal(dupRes.status, 409)

    const facListRes = await fetch(`${baseUrl}/api/proposals`, {
      headers: facultyUser.headers,
    })
    assert.equal(facListRes.status, 200)
    const facListJson: any = await facListRes.json()
    assert.ok(facListJson.data.some((p: any) => p.id === proposalId))

    const reqChangesRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/faculty/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...facultyUser.headers,
      },
      body: JSON.stringify({
        status: 'CHANGES_REQUESTED',
        comments: 'Add QR token expiration diagram to Architecture section.',
      }),
    })
    assert.equal(reqChangesRes.status, 200)

    const resubRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({ comments: 'Added QR token expiration details.' }),
    })
    assert.equal(resubRes.status, 200)

    const approveRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/faculty/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...facultyUser.headers,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        comments: 'Approved for Phase 1 implementation.',
      }),
    })
    assert.equal(approveRes.status, 200)
    const approveJson: any = await approveRes.json()
    assert.equal(approveJson.data.submission.status, 'APPROVED')
    assert.ok(approveJson.data.submission.feedbackHistory.length >= 4)
  })

  it('14. Senior connection shows opt-in status, requires consent, and enables messaging only on accept', async () => {
    const projRes = await fetch(`${baseUrl}/api/repository/projects/${matchedProjectId}`, {
      headers: studentA.headers,
    })
    assert.equal(projRes.status, 200)
    const projJson: any = await projRes.json()
    const members = projJson.data.teamMembers
    assert.ok(members.length >= 1)
    const optedIn = members.find((m: any) => m.isAvailableForMentoring === true)
    assert.ok(optedIn)
    optedOutSeniorId = 'senior-rohan-verma'

    // Senior mentor opts into mentoring cleanly via authenticated endpoint
    await fetch(`${baseUrl}/api/connections/profile/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...seniorMentor.headers },
      body: JSON.stringify({ isAvailableForMentoring: true }),
    })

    const failReqRes = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        projectId: matchedProjectId,
        projectTitle: projJson.data.title,
        seniorId: optedOutSeniorId,
        purpose: 'UNDERSTAND_ARCHITECTURE',
        note: 'Hello, can I ask about your backend architecture for this project?',
      }),
    })
    assert.equal(failReqRes.status, 400)

    const okReqRes = await fetch(`${baseUrl}/api/connections/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentA.headers,
      },
      body: JSON.stringify({
        projectId: matchedProjectId,
        projectTitle: projJson.data.title,
        seniorId: seniorMentor.id,
        seniorName: seniorMentor.user.fullName,
        purpose: 'DISCUSS_EXTENSION',
        note: 'Hello! We want to extend your attendance architecture with rotating QR codes. Can we ask two questions?',
      }),
    })
    assert.equal(okReqRes.status, 201)
    const okReqJson: any = await okReqRes.json()
    connectionRequestId = okReqJson.data.id
    assert.equal(okReqJson.data.status, 'PENDING')

    const acceptRes = await fetch(`${baseUrl}/api/connections/${connectionRequestId}/accept`, {
      method: 'PATCH',
      headers: seniorMentor.headers,
    })
    assert.equal(acceptRes.status, 200)
    const acceptJson: any = await acceptRes.json()
    assert.equal(acceptJson.data.status, 'ACCEPTED')
  })

  it('15. Unauthorized users cannot access restricted data or faculty/admin actions', async () => {
    const convRes = await fetch(`${baseUrl}/api/ai/conversations/${conversationId}`, {
      headers: studentB.headers,
    })
    assert.equal(convRes.status, 403)

    const evalConvRes = await fetch(
      `${baseUrl}/api/ai/evaluations/conversation/${conversationId}`,
      { headers: studentB.headers }
    )
    assert.equal(evalConvRes.status, 403)

    const propRes = await fetch(`${baseUrl}/api/proposals/${proposalId}`, {
      headers: studentB.headers,
    })
    assert.equal(propRes.status, 403)

    const expRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/export?format=pdf`, {
      headers: studentB.headers,
    })
    assert.equal(expRes.status, 403)

    const facReviewRes = await fetch(`${baseUrl}/api/proposals/${proposalId}/faculty/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentB.headers,
      },
      body: JSON.stringify({ status: 'APPROVED', comments: 'Self-approve attempt' }),
    })
    assert.equal(facReviewRes.status, 403)

    const adminImportRes = await fetch(`${baseUrl}/api/repository/admin/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...studentB.headers,
      },
      body: JSON.stringify({ title: 'Unauthorized Import' }),
    })
    assert.equal(adminImportRes.status, 403)

    const connRes = await fetch(`${baseUrl}/api/connections/${connectionRequestId}`, {
      headers: studentB.headers,
    })
    assert.equal(connRes.status, 403)
  })
})
