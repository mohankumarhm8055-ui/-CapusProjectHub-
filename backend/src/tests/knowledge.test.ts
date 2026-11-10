import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { knowledgeService } from '../modules/ai/knowledge/knowledge.service.js'
import { aiService } from '../modules/ai/ai.service.js'
import { conversationService } from '../modules/ai/conversation.service.js'

test('Master AI Knowledge Base Test Suite', async (t) => {
  const docsDir = path.resolve(__dirname, '../../../docs/ai-mentor/knowledge')

  await t.test('All 20 Master Knowledge documents and 3 meta-registries exist on disk', () => {
    assert.ok(fs.existsSync(docsDir), `Knowledge directory must exist at ${docsDir}`)

    const requiredDocs = [
      '01-project-identity.md',
      '02-problem-statement.md',
      '03-existing-system.md',
      '04-proposed-solution.md',
      '05-project-objectives.md',
      '06-functional-modules.md',
      '07-student-workflow.md',
      '08-faculty-workflow.md',
      '09-project-repository.md',
      '10-senior-junior-connection.md',
      '11-ai-project-mentor.md',
      '12-feature-evaluation.md',
      '13-proposal-generation.md',
      '14-system-architecture.md',
      '15-database-architecture.md',
      '16-technology-stack.md',
      '17-security-and-privacy.md',
      '18-project-limitations.md',
      '19-future-enhancements.md',
      '20-demo-conversation.md',
      'project-knowledge-index.md',
      'implementation-status.md',
      'knowledge-source-registry.md',
    ]

    for (const doc of requiredDocs) {
      const fullPath = path.join(docsDir, doc)
      assert.ok(fs.existsSync(fullPath), `Document ${doc} must exist on disk`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 200, `Document ${doc} must have non-trivial content (size: ${stat.size} bytes)`)
    }
  })

  await t.test('knowledgeService lists all 23 documents correctly', () => {
    const list = knowledgeService.listKnowledgeDocs()
    assert.equal(list.length, 23, 'Must index all 23 documents')
    assert.ok(list.some((d) => d.id === '01' && d.filename === '01-project-identity.md'))
    assert.ok(list.some((d) => d.id === '10' && d.filename === '10-senior-junior-connection.md'))
    assert.ok(list.some((d) => d.id === 'index' && d.filename === 'project-knowledge-index.md'))
  })

  await t.test('knowledgeService.readKnowledgeDoc reads documents by id and filename', () => {
    const doc01ById = knowledgeService.readKnowledgeDoc('01')
    assert.ok(doc01ById, 'Should resolve document 01 by ID')
    assert.ok(doc01ById.includes('Project Identity'), 'Must contain title')
    assert.ok(doc01ById.includes('CampusProjectHub'), 'Must contain platform name')

    const doc10ByFilename = knowledgeService.readKnowledgeDoc('10-senior-junior-connection.md')
    assert.ok(doc10ByFilename, 'Should resolve document 10 by filename')
    assert.ok(doc10ByFilename.includes('Senior-Junior'), 'Must contain title')

    const missingDoc = knowledgeService.readKnowledgeDoc('non-existent-file.md')
    assert.equal(missingDoc, null, 'Should return null for missing doc')
  })

  await t.test('knowledgeService.queryKnowledge triggers grounded context for key domains', () => {
    // 1. Identity
    const identityCtx = knowledgeService.queryKnowledge('What is CampusProjectHub?')
    assert.ok(identityCtx, 'Should return identity context')
    assert.ok(identityCtx.includes('CAMPUSPROJECTHUB MASTER KNOWLEDGE - PROJECT IDENTITY'))

    // 2. Problem statement
    const problemCtx = knowledgeService.queryKnowledge('What is the problem statement and why do we need CampusProjectHub?')
    assert.ok(problemCtx, 'Should return problem statement context')
    assert.ok(problemCtx.includes('CAMPUSPROJECTHUB MASTER KNOWLEDGE - PROBLEM STATEMENT'))

    // 3. Senior Junior Connection
    const seniorJuniorCtx = knowledgeService.queryKnowledge('How does the senior junior connection and mentorship work?')
    assert.ok(seniorJuniorCtx, 'Should return senior junior connection context')
    assert.ok(seniorJuniorCtx.includes('CAMPUSPROJECTHUB MASTER KNOWLEDGE - SENIOR-JUNIOR CONNECTION'))

    // 4. 16 Functional Modules
    const modulesCtx = knowledgeService.queryKnowledge('Can you list the 16 functional modules?')
    assert.ok(modulesCtx, 'Should return 16 functional modules context')
    assert.ok(modulesCtx.includes('CAMPUSPROJECTHUB MASTER KNOWLEDGE - 16 FUNCTIONAL MODULES'))

    // 5. Limitations
    const limitCtx = knowledgeService.queryKnowledge('What are the limitations and drawbacks of CampusProjectHub?')
    assert.ok(limitCtx, 'Should return limitations context')
    assert.ok(limitCtx.includes('CAMPUSPROJECTHUB MASTER KNOWLEDGE - ARCHITECTURAL LIMITATIONS'))
  })

  await t.test('AI Project Mentor generates grounded response using Master Knowledge', async () => {
    process.env.ALLOW_INMEMORY_FALLBACK = 'true'
    const conv = await conversationService.createConversation('test-student-knowledge', 'Knowledge Base Test')
    const assistantMsg = await aiService.generateMentorResponse(
      conv.id,
      'test-student-knowledge',
      'Tell me about the senior-junior connection in CampusProjectHub and how privacy is protected.'
    )

    assert.ok(assistantMsg.content, 'Mentor must generate response')
    assert.ok(
      assistantMsg.content.includes('Senior-Junior') || assistantMsg.content.includes('senior-junior'),
      'Response must address senior-junior network'
    )
    assert.ok(
      assistantMsg.content.includes('Zero-Leakage') || assistantMsg.content.includes('Masked') || assistantMsg.content.includes('privacy'),
      'Response must address privacy and contact masking'
    )
  })
})
