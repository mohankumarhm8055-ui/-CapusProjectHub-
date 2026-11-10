import test from 'node:test'
import assert from 'node:assert/strict'
import { voiceService } from '../modules/ai/voice/voice.service.js'
import { conversationalEngine } from '../modules/ai/conversational-engine/conversational.engine.js'
import { contextManager } from '../modules/ai/conversational-engine/context.manager.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import { aiService } from '../modules/ai/ai.service.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'
import { knowledgeService } from '../modules/ai/knowledge/knowledge.service.js'
import { repositorySearchService } from '../modules/repository/repository.search.service.js'

test('TASK 12 — COMPLETE AI MENTOR QUALITY ASSURANCE TEST SUITE', async (suite) => {
  process.env.ALLOW_INMEMORY_FALLBACK = 'true'
  await seedRepository()

  const studentId = 'qa-student-001'
  const unauthorizedStudentId = 'qa-student-attacker-999'
  const facultyId = 'qa-faculty-guide-101'

  // ==========================================
  // SECTION 1: MICROPHONE & SPEECH-TO-TEXT VERIFICATION
  // ==========================================

  await suite.test('1.1 STT English: Acceptance test sentence & technical terms', async () => {
    // English acceptance sentence
    const resEn = await voiceService.transcribeAudio({
      audioBase64: Buffer.from('student-speech-acceptance-test').toString('base64'),
      language: 'en',
    })
    assert.equal(resEn.text, 'I want to develop an AI-powered college project management system.')
    assert.equal(resEn.detectedLanguage, 'en')

    // English with technical vocabulary
    const resTech = await voiceService.transcribeAudio({
      audioBase64: Buffer.from('test-audio-react-mongodb').toString('base64'),
      language: 'en',
    })
    assert.ok(resTech.text.includes('React'), 'Preserves React')
    assert.ok(resTech.text.includes('MongoDB'), 'Preserves MongoDB')
    assert.ok(resTech.text.includes('REST API'), 'Preserves REST API')
    assert.ok(resTech.preservedTechnicalTerms.includes('React'))
    assert.ok(resTech.preservedTechnicalTerms.includes('MongoDB'))
  })

  await suite.test('1.2 STT Multilingual: Kannada & Hindi speech handling', async () => {
    const resKn = await voiceService.transcribeAudio({
      audioBase64: Buffer.from('mock-kannada-audio-stream').toString('base64'),
      language: 'kn',
    })
    assert.ok(resKn.text.includes('CampusProjectHub'), 'Preserves brand in Kannada')
    assert.ok(resKn.text.includes('ಸೀನಿಯರ್-ಜ್ಯೂನಿಯರ್'), 'Transcribes Kannada phrases')
    assert.ok(resKn.preservedTechnicalTerms.includes('React'))
    assert.ok(resKn.preservedTechnicalTerms.includes('MongoDB'))

    const resHi = await voiceService.transcribeAudio({
      audioBase64: Buffer.from('mock-hindi-audio-stream').toString('base64'),
      language: 'hi',
    })
    assert.ok(resHi.text.includes('CampusProjectHub'), 'Preserves brand in Hindi')
    assert.ok(resHi.text.includes('सीनियर-जूनियर'), 'Transcribes Hindi phrases')
    assert.ok(resHi.preservedTechnicalTerms.includes('React'))
    assert.ok(resHi.preservedTechnicalTerms.includes('MongoDB'))
  })

  await suite.test('1.3 STT Failure Modes: Rejection of empty streams & error handling', async () => {
    // Rejects empty string
    await assert.rejects(
      async () => {
        await voiceService.transcribeAudio({
          audioBase64: '',
          language: 'en',
        })
      },
      /Empty audio stream received/,
      'Empty audio stream must throw error'
    )

    // Rejects 0-byte buffer
    await assert.rejects(
      async () => {
        await voiceService.transcribeAudio({
          audioBase64: Buffer.from([]).toString('base64'),
          language: 'en',
        })
      },
      /Empty audio stream received/,
      'Zero-byte buffer must throw error'
    )
  })

  // ==========================================
  // SECTION 2: FEMALE VOICE SYNTHESIS VERIFICATION
  // ==========================================

  await suite.test('2.1 Female Voice TTS: Provider, identifier, and wideband 24kHz audio', async () => {
    const synthRes = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub is an AI-powered academic project management platform.',
      language: 'en',
      speed: 1.0,
    })

    assert.equal(synthRes.voiceId, 'cph-female-neural-academic-v1', 'Must use female neural voice identifier')
    assert.equal(synthRes.voiceGender, 'female', 'Must be female voice')
    assert.ok(synthRes.voiceName?.includes('Female Academic Mentor'), 'Voice name reflects academic mentor')
    assert.equal(synthRes.audioFormat, 'audio/wav', 'Must produce WAV format')
    assert.ok(synthRes.durationSeconds > 0, 'Audio duration must be positive')

    // Decode WAV header to verify 24,000 Hz studio wideband sample rate
    const base64Data = synthRes.audioUrl.split(',')[1]
    const wavBuffer = Buffer.from(base64Data, 'base64')
    assert.equal(wavBuffer.toString('utf8', 0, 4), 'RIFF')
    assert.equal(wavBuffer.toString('utf8', 8, 12), 'WAVE')
    assert.equal(wavBuffer.readUInt32LE(24), 24000, 'Must be 24,000 Hz sample rate')
  })

  await suite.test('2.2 Female Voice TTS: Playback speed variations and caching', async () => {
    const text = 'Testing speed variations for AI Mentor speech playback.'
    const res1x = await voiceService.synthesizeSpeech({ text, language: 'en', speed: 1.0 })
    const res15x = await voiceService.synthesizeSpeech({ text, language: 'en', speed: 1.5 })
    const res075x = await voiceService.synthesizeSpeech({ text, language: 'en', speed: 0.75 })

    assert.ok(res15x.durationSeconds <= res1x.durationSeconds, '1.5x speed must reduce audio duration')
    assert.ok(res075x.durationSeconds >= res1x.durationSeconds, '0.75x speed must increase audio duration')

    // Caching check
    const cachedCall = await voiceService.synthesizeSpeech({ text, language: 'en', speed: 1.0 })
    assert.equal(cachedCall.cached, true, 'Subsequent identical synthesis request must be cached')
  })

  // ==========================================
  // SECTION 3: THE 10 REAL CONVERSATIONAL QUESTIONS
  // ==========================================

  const qaConv = await conversationService.createConversation(studentId, 'QA Consultation Session')
  const convId = qaConv.id

  await suite.test('3.1 Question 1: "I have a mini-project idea about a project management system."', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'I have a mini-project idea about a project management system.'
    )
    assert.equal(turn.intent, 'PROJECT_DISCOVERY')
    assert.ok(turn.responseMarkdown.includes('CampusProjectHub'), 'Introduces CampusProjectHub comparison')
    assert.ok(turn.responseMarkdown.toLowerCase().includes('manage teams, tasks, milestones'), 'Lists core components')
    assert.ok(turn.responseMarkdown.includes('specifically for college students and faculty'), 'Asks guiding question')
    assert.ok(!turn.responseMarkdown.includes('As an AI language model'), 'No generic chatbot boilerplate')
  })

  await suite.test('3.2 Question 2: "Is this suitable for a college mini-project?"', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'Is this suitable for a college mini-project?'
    )
    assert.equal(turn.intent, 'PROJECT_SUITABILITY')
    assert.ok(turn.responseMarkdown.includes('suitable academic mini-project'), 'Affirms suitability with constraints')
    assert.ok(turn.responseMarkdown.includes('8 to 12 weeks'), 'References realistic semester timeline')
    assert.ok(turn.responseMarkdown.includes('trying to build a full commercial clone like Jira'), 'Critiques over-ambition')
  })

  await suite.test('3.3 Question 3: "What makes CampusProjectHub different?"', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'What makes CampusProjectHub different?'
    )
    assert.equal(turn.intent, 'COMPARISON_INQUIRY')
    assert.ok(turn.responseMarkdown.includes('Trello'), 'Provides structured comparison')
    assert.ok(turn.responseMarkdown.includes('Institutional Memory'), 'Highlights living repository difference')
    assert.ok(turn.responseMarkdown.includes('IEEE 830'), 'Highlights proposal generator')
    assert.ok(turn.responseMarkdown.includes('Faculty Governance'), 'Highlights faculty approval workflow')
  })

  await suite.test('3.4 Question 4: "What are its disadvantages?"', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'What are its disadvantages?'
    )
    assert.equal(turn.intent, 'DISADVANTAGES_INQUIRY')
    assert.ok(turn.responseMarkdown.includes('The Cold-Start Repository Problem'), 'Discusses cold start')
    assert.ok(turn.responseMarkdown.includes('AI Provider Latency and API Costs'), 'Discusses API costs')
    assert.ok(turn.responseMarkdown.includes('Faculty Adoption Resistance'), 'Discusses adoption hurdles')
    assert.ok(turn.responseMarkdown.includes('PII and Data Privacy Balancing'), 'Discusses privacy challenges')
  })

  await suite.test('3.5 Question 5: "How can I implement the academic project repository?"', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'How can I implement the academic project repository?'
    )
    assert.equal(turn.intent, 'TECHNICAL_EXPLANATION')
    assert.ok(turn.responseMarkdown.includes('MongoDB & Mongoose'), 'Recommends schema architecture')
    assert.ok(turn.responseMarkdown.includes('tokenized Jaccard containment'), 'Details similarity checking')
    assert.ok(turn.responseMarkdown.includes('Student Privacy & Contact Masking'), 'Details privacy masking')
    assert.ok(turn.responseMarkdown.includes('09-project-repository.md'), 'Includes source attribution citation')
  })

  await suite.test('3.6 Question 6: "Do we really need AI?"', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'Do we really need AI?'
    )
    assert.equal(turn.intent, 'AI_NECESSITY_INQUIRY')
    assert.ok(turn.responseMarkdown.includes('No, you do not strictly need AI'), 'Delivers honest, non-hyped answer')
    assert.ok(turn.responseMarkdown.includes('deterministic web technologies'), 'Explains deterministic baseline')
    assert.ok(turn.responseMarkdown.includes('Subjective Feature Feasibility Evaluation'), 'Explains where AI adds value')
  })

  await suite.test('3.7 Question 7: "How can we reduce project complexity?"', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'How can we reduce project complexity?'
    )
    assert.equal(turn.intent, 'SCOPE_REDUCTION')
    assert.ok(turn.responseMarkdown.includes('Features to DEFER'), 'Categorizes deferrable features')
    assert.ok(turn.responseMarkdown.includes('Features to KEEP'), 'Identifies core MVP deliverables')
    assert.ok(turn.responseMarkdown.includes('Real-Time Video/Audio Streaming (WebRTC)'), 'Identifies high-risk features')
  })

  await suite.test('3.8 Question 8: "Explain the system architecture."', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'Explain the system architecture.'
    )
    assert.equal(turn.intent, 'CAMPUSPROJECTHUB_INTRO')
    assert.ok(turn.responseMarkdown.includes('Three-Tier System Architecture'), 'Details Three-Tier Architecture')
    assert.ok(turn.responseMarkdown.includes('Presentation Tier'), 'Details Presentation Tier')
    assert.ok(turn.responseMarkdown.includes('Application Tier'), 'Details Application Tier')
    assert.ok(turn.responseMarkdown.includes('Persistence Tier'), 'Details Persistence Tier')
  })

  await suite.test('3.9 Question 9: "Prepare a problem statement."', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'Prepare a problem statement.'
    )
    assert.equal(turn.intent, 'DOCUMENTATION_INQUIRY')
    assert.ok(turn.responseMarkdown.includes('Academic Problem Statement Formulation'), 'Provides IEEE structure')
    assert.ok(turn.responseMarkdown.includes('The Project Discovery Gap'), 'Includes discovery gap')
    assert.ok(turn.responseMarkdown.includes('Lack of Early Feasibility Assessment'), 'Includes feasibility gap')
    assert.ok(turn.responseMarkdown.includes('Proposed Solution Objective'), 'Includes solution objective')
  })

  await suite.test('3.10 Question 10: "Explain the project to my faculty."', async () => {
    const turn = await conversationalEngine.processTurn(
      convId,
      studentId,
      'Explain the project to my faculty.'
    )
    assert.equal(turn.intent, 'FACULTY_EXPLANATION')
    assert.ok(turn.responseMarkdown.includes('Explaining CampusProjectHub to Your Faculty Guide'), 'Addresses faculty guide presentation')
    assert.ok(turn.responseMarkdown.includes('The Core Academic Problem'), 'Gives problem rationale')
    assert.ok(turn.responseMarkdown.includes('Formal Faculty Governance & Stage-Gating'), 'Emphasizes faculty ultimate authority')
    assert.ok(turn.responseMarkdown.includes('Differentiation from Commercial Tools'), 'Anticipates guide viva questions')
  })

  // ==========================================
  // SECTION 4: KNOWLEDGE BASE DISTINCTION & GROUNDING
  // ==========================================

  await suite.test('4.1 Master Knowledge Base: Grounding and feature status distinction', async () => {
    const allDocs = knowledgeService.listKnowledgeDocs()
    assert.ok(allDocs.length >= 20, 'Must have at least 20 Master Knowledge documents')

    // Test doc reading
    const archDoc = knowledgeService.readKnowledgeDoc('14-system-architecture.md')
    assert.ok(archDoc, 'Reads system architecture document')
    assert.ok(archDoc.toLowerCase().includes('three-tier'), 'Contains three-tier architecture description')

    // Test querying knowledge base
    const queryRes = knowledgeService.queryKnowledge('What is CampusProjectHub?')
    assert.ok(queryRes, 'Query returns knowledge context')
    assert.ok(queryRes.includes('MASTER KNOWLEDGE'), 'Injects master knowledge block')
    assert.ok(queryRes.includes('CampusProjectHub'))
  })

  // ==========================================
  // SECTION 5: SECURITY, MULTI-TENANCY, AND ACCESS CONTROL
  // ==========================================

  await suite.test('5.1 Security: Student conversation isolation and ownership enforcement', async () => {
    const conv = await conversationService.createConversation(studentId, 'Private Academic Consultation')

    // Add message as student 001
    await conversationService.addMessage(conv.id, studentId, 'user', 'Confidential project idea on autonomous drones.')

    // Unauthorized student attacker 999 attempts to access student 001's conversation
    await assert.rejects(
      async () => {
        await conversationService.getConversation(conv.id, unauthorizedStudentId)
      },
      /Forbidden|not found|unauthorized/i,
      'Attacker cannot access other student conversation'
    )

    // Unauthorized student cannot read messages
    await assert.rejects(
      async () => {
        await conversationService.getConversationMessages(conv.id, unauthorizedStudentId)
      },
      /Forbidden|not found|unauthorized/i,
      'Attacker cannot read other student messages'
    )
  })

  await suite.test('5.2 Security: Voice session isolation', async () => {
    const voiceSession = await voiceService.startSession(studentId, convId, 'en')

    // Attacker cannot process turn on another student session
    await assert.rejects(
      async () => {
        await voiceService.processVoiceTurn(
          voiceSession.id,
          'Malicious injection prompt',
          unauthorizedStudentId,
          'en'
        )
      },
      /Unauthorized: You cannot access or modify this voice session|Forbidden/i,
      'Voice session access must be strictly isolated by student identity'
    )
  })
})
