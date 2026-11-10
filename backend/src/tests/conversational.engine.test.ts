import test from 'node:test'
import assert from 'node:assert/strict'
import { conversationalEngine } from '../modules/ai/conversational-engine/conversational.engine.js'
import { contextManager } from '../modules/ai/conversational-engine/context.manager.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import { aiService } from '../modules/ai/ai.service.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'

test('Conversational Intelligence Engine Test Suite (TASK 6)', async (t) => {
  process.env.ALLOW_INMEMORY_FALLBACK = 'true'
  await seedRepository()

  const student1Id = 'student-test-conversational-001'
  const student2Id = 'student-test-conversational-002'

  await t.test('1. MODE A — Project Discovery: Dynamic reference to CampusProjectHub when student proposes project management', async () => {
    const conv = await conversationService.createConversation(student1Id, 'PM Discovery Consultation')

    const result = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'I want to develop a college project management system'
    )

    assert.equal(result.mode, 'PROJECT_DISCOVERY')
    assert.ok(result.responseMarkdown.includes('CampusProjectHub'), 'Must reference CampusProjectHub')
    assert.ok(
      result.responseMarkdown.includes('scattered across') ||
      result.responseMarkdown.includes('seniors have already developed'),
      'Must explain the scattered reports and knowledge gap'
    )
    assert.ok(
      result.responseMarkdown.includes('compare your specific project idea') ||
      result.responseMarkdown.includes('walk you through the complete CampusProjectHub solution'),
      'Must offer the two progressive branches'
    )
    assert.ok(result.suggestedFollowUps.length >= 2, 'Must provide follow-up actions')

    // Context check
    const ctx = await contextManager.getOrCreateContext(conv.id, student1Id)
    assert.equal(ctx.mode, 'PROJECT_DISCOVERY')
    assert.equal(ctx.currentProjectIdea, 'College Project Management Platform')
  })

  await t.test('2. MODE A — Project Discovery: Repository overlap detection & pedagogical critique on existing benchmark', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Attendance Overlap Check')

    const result = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'We are a team of 4 developing Smart Attendance using Face Recognition with Python and React'
    )

    assert.equal(result.mode, 'PROJECT_DISCOVERY')
    assert.ok(result.responseMarkdown.includes('Verified Repository Record Detected'), 'Must detect repository match')
    assert.ok(
      result.responseMarkdown.includes('Smart Attendance') || result.responseMarkdown.includes('Attendance'),
      'Must cite benchmark title'
    )
    assert.ok(
      result.responseMarkdown.includes('similarity is not plagiarism') ||
      result.responseMarkdown.includes('Similarity is not plagiarism'),
      'Must enforce academic integrity notice'
    )
    assert.ok(
      result.responseMarkdown.includes('What new capability') ||
      result.responseMarkdown.includes('meaningful improvement'),
      'Must pose viva defense question'
    )

    // Context signals
    const ctx = await contextManager.getOrCreateContext(conv.id, student1Id)
    assert.equal(ctx.teamSize, 4, 'Must capture team size of 4')
    assert.ok(ctx.preferredTechnologies.includes('React'), 'Must capture React')
    assert.ok(ctx.preferredTechnologies.includes('Python'), 'Must capture Python')
  })

  await t.test('3. MODE B — CampusProjectHub Progressive Introduction: Step-by-step sequential delivery', async () => {
    const conv = await conversationService.createConversation(student1Id, 'CampusProjectHub Walkthrough')

    // Turn 1: Onboarding / Introduction
    const step1 = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'Please tell me about CampusProjectHub'
    )
    assert.equal(step1.mode, 'CAMPUSPROJECTHUB_INTRO')
    assert.ok(step1.responseMarkdown.includes('Introduction & Vision'), 'Must deliver Section 1')
    assert.ok(step1.responseMarkdown.includes('8 core academic problems'), 'Must suggest next step in prompt')

    // Turn 2: Progression to Problem Statement
    const step2 = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'Tell me more about the 8 problems'
    )
    assert.ok(step2.responseMarkdown.includes('Academic Problem Statement'), 'Must advance to Section 2')
    assert.ok(step2.responseMarkdown.includes('Project Discovery Gap'), 'Must list Discovery Gap')
    assert.ok(step2.responseMarkdown.includes('[Implemented]'), 'Must label implementation truthfully')

    // Turn 3: Jump directly to Architecture
    const step3 = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'Can you explain the system architecture?'
    )
    assert.ok(step3.responseMarkdown.includes('Three-Tier System Architecture'), 'Must jump to architecture')
    assert.ok(step3.responseMarkdown.includes('Presentation Tier'), 'Must detail presentation tier')
    assert.ok(step3.responseMarkdown.includes('Node.js + Express'), 'Must cite backend stack')
  })

  await t.test('4. COMPARISON INTELLIGENCE: Honest comparison with Trello and commercial tools', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Tool Comparison')

    const result = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'How is CampusProjectHub different from Trello?'
    )

    assert.ok(result.responseMarkdown.includes('CampusProjectHub vs. Trello'), 'Must compare with Trello')
    assert.ok(result.responseMarkdown.includes('Institutional Memory'), 'Must contrast institutional memory')
    assert.ok(result.responseMarkdown.includes('IEEE 830'), 'Must cite academic documentation standard')
    assert.ok(result.responseMarkdown.includes('Faculty Governance'), 'Must cite faculty governance')
  })

  await t.test('5. FEATURE SCOPING INTELLIGENCE: Honest feasibility assessment on complex features', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Feature Feasibility')

    // Test AI Task Allocation inquiry
    const taskResult = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'Can I add automated AI task allocation to our project?'
    )
    assert.ok(taskResult.responseMarkdown.includes('AI Task Allocation'), 'Must evaluate task allocation')
    assert.ok(
      taskResult.responseMarkdown.includes('Cold-Start') || taskResult.responseMarkdown.includes('Constraint'),
      'Must identify technical hurdles'
    )
    assert.ok(taskResult.responseMarkdown.includes('Pragmatic'), 'Must offer pragmatic alternative')

    // Test WebRTC Voice inquiry
    const voiceResult = await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'Should we implement real-time WebRTC voice mentorship?'
    )
    assert.ok(
      voiceResult.responseMarkdown.includes('UNNECESSARY') || voiceResult.responseMarkdown.includes('Simpler Alternative'),
      'Must classify WebRTC voice honestly and offer simpler preview'
    )
  })

  await t.test('6. CONVERSATION MEMORY: Context retention across multi-turn consultation', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Memory Tracking Session')

    // Turn 1: Experience declaration
    await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      'We are beginner 2nd year students working on a healthcare portal'
    )
    let ctx = await contextManager.getOrCreateContext(conv.id, student1Id)
    assert.equal(ctx.technicalExperience, 'beginner', 'Must capture beginner level')
    assert.equal(ctx.projectCategory, 'Healthcare Informatics', 'Must capture category')

    // Turn 2: Drop voice feature
    await conversationalEngine.processTurn(
      conv.id,
      student1Id,
      "We will drop the voice feature to keep the scope realistic"
    )
    ctx = await contextManager.getOrCreateContext(conv.id, student1Id)
    assert.ok(
      ctx.rejectedRecommendations.some((r) => r.toLowerCase().includes('voice')),
      'Must remember rejected voice recommendation'
    )
    assert.equal(ctx.technicalExperience, 'beginner', 'Must retain earlier beginner context')
  })

  await t.test('7. SECURITY & USER ISOLATION: Student 2 cannot access Student 1 conversation context', async () => {
    const conv1 = await conversationService.createConversation(student1Id, 'Private Consultation')

    await assert.rejects(
      async () => {
        await contextManager.getOrCreateContext(conv1.id, student2Id)
      },
      /Forbidden/,
      'Must reject unauthorized user context access with 403 Forbidden'
    )
  })

  await t.test('8. END-TO-END AI SERVICE INTEGRATION: aiService calls conversational engine smoothly', async () => {
    const conv = await conversationService.createConversation(student1Id, 'E2E Full Turn')

    const assistantMsg = await aiService.generateMentorResponse(
      conv.id,
      student1Id,
      'I want to develop a college project management system'
    )

    assert.ok(assistantMsg.content, 'Must return response content')
    assert.ok(assistantMsg.content.includes('CampusProjectHub'), 'Must include conversational engine response')
    assert.ok(assistantMsg.content.includes('scattered'), 'Must explain scattered reports problem')
  })
})
