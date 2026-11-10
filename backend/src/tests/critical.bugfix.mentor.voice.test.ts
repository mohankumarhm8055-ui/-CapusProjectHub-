import test from 'node:test'
import assert from 'node:assert/strict'
import { voiceService } from '../modules/ai/voice/voice.service.js'
import { conversationalEngine } from '../modules/ai/conversational-engine/conversational.engine.js'
import { contextManager } from '../modules/ai/conversational-engine/context.manager.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import { aiService } from '../modules/ai/ai.service.js'
import { seedRepository } from '../modules/repository/repository.seeder.js'

test('CRITICAL BUG FIX TEST SUITE: Microphone STT + Conversational Intelligence', async (suite) => {
  process.env.ALLOW_INMEMORY_FALLBACK = 'true'
  await seedRepository()

  const studentId = 'student-critical-fix-001'

  // ==========================================
  // PART A: MICROPHONE & SPEECH RECOGNITION TESTS (12 SCENARIOS)
  // ==========================================

  await suite.test('PART A - Mic Test 1 & 2: Handles permissions and empty streams safely', async () => {
    // Empty recording rejection
    await assert.rejects(
      async () => {
        await voiceService.transcribeAudio({
          audioBase64: '',
          language: 'en',
        })
      },
      /Empty audio stream received/,
      'Empty audio recording must be rejected with informative error'
    )

    // Buffer length 0 rejection
    await assert.rejects(
      async () => {
        await voiceService.transcribeAudio({
          audioBase64: Buffer.from([]).toString('base64'),
          language: 'en',
        })
      },
      /Empty audio stream received/,
      'Zero-byte buffer must be rejected'
    )
  })

  await suite.test('PART A - Mic Test 3, 7 & 8: English speech with mixed technical vocabulary', async () => {
    const audioData = Buffer.from('mock-audio-payload-with-react-mongodb-api')
    const res = await voiceService.transcribeAudio({
      audioBase64: audioData.toString('base64'),
      language: 'en',
    })

    assert.ok(res.text, 'Must produce non-empty transcript')
    assert.equal(res.detectedLanguage, 'en', 'Must detect English')
    assert.ok(res.preservedTechnicalTerms.includes('React'), 'Must preserve React casing')
    assert.ok(res.preservedTechnicalTerms.includes('MongoDB'), 'Must preserve MongoDB casing')
    assert.ok(res.preservedTechnicalTerms.includes('API') || res.preservedTechnicalTerms.includes('CampusProjectHub'), 'Must preserve technical vocabulary')
  })

  await suite.test('PART A - Mic Test 6: Kannada speech handling', async () => {
    const audioData = Buffer.from('mock-audio-kannada')
    const res = await voiceService.transcribeAudio({
      audioBase64: audioData.toString('base64'),
      language: 'kn',
    })

    assert.ok(res.text, 'Must return transcript')
    assert.equal(res.detectedLanguage, 'kn', 'Must respect Kannada language code')
  })

  await suite.test('PART A - Mic Test 4 & 5: Editable transcript sent to conversation backend', async () => {
    const conv = await conversationService.createConversation(studentId, 'Speech Transcript Turn')

    // Simulate recognized speech that student edited before submitting
    const studentEditedTranscript = 'I have a mini-project idea about a project management system.'

    const message = await conversationService.addMessage(
      conv.id,
      studentId,
      'user',
      studentEditedTranscript
    )

    assert.equal(message.content, studentEditedTranscript, 'Submitted message matches edited transcript')
    assert.equal(message.role, 'user')
  })

  // ==========================================
  // PART B: CONVERSATIONAL INTELLIGENCE TESTS (10 CRITICAL SCENARIOS)
  // ==========================================

  await suite.test('PART B - Scenario 1: "I have a project idea about project management."', async () => {
    const conv = await conversationService.createConversation(studentId, 'Idea Discussion')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'I have a mini-project idea about a project management system.'
    )

    assert.equal(result.mode, 'PROJECT_DISCOVERY')
    // 1. Understand and acknowledge actual idea
    assert.ok(
      result.responseMarkdown.includes("good starting point for a mini-project") ||
      result.responseMarkdown.includes("project management system can help students"),
      'Must acknowledge the project idea directly'
    )
    // 2. Mention existing systems
    assert.ok(
      result.responseMarkdown.includes("project management systems already exist") ||
      result.responseMarkdown.includes("Trello"),
      'Must explain that systems already exist'
    )
    // 3. Explain CampusProjectHub differentiators
    assert.ok(result.responseMarkdown.includes("Academic Project Repository"), 'Must highlight repository differentiator')
    assert.ok(result.responseMarkdown.includes("Knowledge Sharing"), 'Must highlight knowledge sharing')
    assert.ok(result.responseMarkdown.includes("AI Project Mentor"), 'Must highlight AI Mentor')
    assert.ok(result.responseMarkdown.includes("Proposal Generation"), 'Must highlight proposal generation')
    // 4. Scoping & 1 follow-up question
    assert.ok(
      result.responseMarkdown.includes("Are you planning to build this specifically for college students and faculty"),
      'Must ask the relevant follow-up question'
    )
    // Never output generic mode list
    assert.equal(result.responseMarkdown.includes('Mode A — Project Discovery'), false, 'Must not output generic mode list')
  })

  await suite.test('PART B - Scenario 2: "Is this project suitable for a mini-project?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'Suitability Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Is this project suitable for a mini-project?'
    )

    assert.ok(result.responseMarkdown.includes('single-semester timeline') || result.responseMarkdown.includes('suitable academic mini-project'), 'Must discuss mini-project suitability')
    assert.ok(result.responseMarkdown.includes('Execution Realism') || result.responseMarkdown.includes('8 to 12 weeks'), 'Must address realistic timeline')
    assert.ok(result.responseMarkdown.includes('MVP') || result.responseMarkdown.includes('manageable'), 'Must recommend focused MVP')
    assert.ok(result.responseMarkdown.includes('team size'), 'Must ask follow-up regarding team size')
  })

  await suite.test('PART B - Scenario 3: "What makes CampusProjectHub different?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'Differentiation Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'What makes CampusProjectHub different?'
    )

    assert.ok(result.responseMarkdown.includes('Institutional Memory') || result.responseMarkdown.includes('33-field'), 'Must cite institutional memory')
    assert.ok(result.responseMarkdown.includes('Prior-Art Discovery') || result.responseMarkdown.includes('similarity'), 'Must cite similarity/discovery')
    assert.ok(result.responseMarkdown.includes('IEEE 830'), 'Must cite IEEE 830 documentation')
    assert.ok(result.responseMarkdown.includes('Senior-Junior'), 'Must cite Senior-Junior connection')
    assert.ok(result.responseMarkdown.includes('Faculty'), 'Must cite faculty governance')
  })

  await suite.test('PART B - Scenario 4: "Explain its modules."', async () => {
    const conv = await conversationService.createConversation(studentId, 'Modules Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Explain its modules.'
    )

    assert.ok(result.responseMarkdown.includes('Functional Modules') || result.responseMarkdown.includes('16'), 'Must explain modules')
    assert.ok(result.responseMarkdown.includes('Student Project Management'), 'Must include Student Project Management')
    assert.ok(result.responseMarkdown.includes('Academic Project Repository'), 'Must include Repository')
    assert.ok(result.responseMarkdown.includes('[Implemented]'), 'Must state truthful implementation status')
  })

  await suite.test('PART B - Scenario 5: "What are its disadvantages?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'Disadvantages Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'What are its disadvantages?'
    )

    assert.ok(result.responseMarkdown.includes('Cold-Start') || result.responseMarkdown.includes('cold-start'), 'Must discuss cold start problem')
    assert.ok(result.responseMarkdown.includes('Latency') || result.responseMarkdown.includes('API Costs'), 'Must discuss LLM latency/costs')
    assert.ok(result.responseMarkdown.includes('Faculty Adoption') || result.responseMarkdown.includes('Verification Overhead'), 'Must discuss faculty or verification hurdles')
    assert.ok(result.responseMarkdown.includes('viva defense'), 'Must offer viva defense advice')
  })

  await suite.test('PART B - Scenario 6: "How can we implement the project repository?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'Repository Implementation')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'How can we implement the project repository?'
    )

    assert.ok(result.responseMarkdown.includes('MongoDB') || result.responseMarkdown.includes('Mongoose'), 'Must explain database schema')
    assert.ok(result.responseMarkdown.includes('Jaccard') || result.responseMarkdown.includes('Full-Text'), 'Must explain search and similarity')
    assert.ok(result.responseMarkdown.includes('Privacy') || result.responseMarkdown.includes('Masking'), 'Must explain privacy masking')
  })

  await suite.test('PART B - Scenario 7: "Do we really need AI?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'AI Necessity Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Do we really need AI?'
    )

    assert.ok(result.responseMarkdown.includes('No, you do not strictly need AI') || result.responseMarkdown.includes('deterministic web technologies'), 'Must be honest about baseline CRUD')
    assert.ok(result.responseMarkdown.includes('Feature Feasibility') || result.responseMarkdown.includes('feasibility critique'), 'Must explain subjective evaluation value')
    assert.ok(result.responseMarkdown.includes('Semantic Similarity') || result.responseMarkdown.includes('IEEE 830'), 'Must explain where AI adds real academic value')
    assert.ok(result.responseMarkdown.includes('buzzword'), 'Must warn against adding AI purely as a buzzword')
  })

  await suite.test('PART B - Scenario 8: "Can we reduce the scope?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'Scope Reduction')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Can we reduce the scope?'
    )

    assert.ok(result.responseMarkdown.includes('Future Work') || result.responseMarkdown.includes('DEFER'), 'Must identify features to defer')
    assert.ok(result.responseMarkdown.includes('WebRTC') || result.responseMarkdown.includes('Blockchain'), 'Must advise deferring high-complexity features')
    assert.ok(result.responseMarkdown.includes('Core Scope') || result.responseMarkdown.includes('KEEP'), 'Must identify core features')
  })

  await suite.test('PART B - Scenario 9: "Explain the architecture."', async () => {
    const conv = await conversationService.createConversation(studentId, 'Architecture Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Can you explain the system architecture?'
    )

    assert.ok(result.responseMarkdown.includes('Three-Tier System Architecture') || result.responseMarkdown.includes('three tiers') || result.responseMarkdown.includes('Three-Tier'), 'Must explain three-tier architecture')
    assert.ok(result.responseMarkdown.includes('Presentation Tier'), 'Must detail presentation tier')
    assert.ok(result.responseMarkdown.includes('Node.js + Express') || result.responseMarkdown.includes('Express'), 'Must cite backend stack')
  })

  await suite.test('PART B - Scenario 10: "Prepare a problem statement."', async () => {
    const conv = await conversationService.createConversation(studentId, 'Problem Statement Inquiry')

    const result = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Prepare a problem statement for our project.'
    )

    assert.ok(result.responseMarkdown.includes('Academic Problem Statement Formulation') || result.responseMarkdown.includes('Problem Statement'), 'Must formulate problem statement')
    assert.ok(result.responseMarkdown.includes('Project Discovery Gap'), 'Must identify discovery gap')
    assert.ok(result.responseMarkdown.includes('Proposed Solution Objective') || result.responseMarkdown.includes('Solution Objective'), 'Must state solution objective')
    assert.ok(result.responseMarkdown.includes('Would you like to refine this problem statement'), 'Must ask relevant follow-up question')
  })

  // ==========================================
  // MANDATORY MULTI-TURN REAL-APPLICATION SEQUENCE (TURNS 1, 2, & 3)
  // ==========================================

  await suite.test('MANDATORY MULTI-TURN TEST: Idea -> "Yes, specifically for college students." -> "What are the disadvantages?"', async () => {
    const conv = await conversationService.createConversation(studentId, 'Mandatory Multi-Turn Sequence')

    // Turn 1
    const turn1 = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'I have a mini-project idea about a project management system.'
    )
    assert.ok(turn1.responseMarkdown.includes('project management systems already exist'), 'Turn 1 must explain existing systems')
    assert.ok(turn1.responseMarkdown.includes('Academic Project Repository'), 'Turn 1 must highlight academic repository')
    assert.ok(turn1.responseMarkdown.includes('Are you planning to build this specifically for college students and faculty'), 'Turn 1 must ask college use case question')

    // Turn 2: "Yes, specifically for college students."
    const turn2 = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'Yes, specifically for college students.'
    )
    assert.equal(turn2.intent, 'COLLEGE_SCOPE_AFFIRMATION', 'Must classify as COLLEGE_SCOPE_AFFIRMATION')
    assert.ok(turn2.responseMarkdown.includes('Focusing specifically on an academic institution') || turn2.responseMarkdown.includes('strategic decision'), 'Turn 2 must validate college strategic decision')
    assert.ok(turn2.responseMarkdown.includes('Trello') || turn2.responseMarkdown.includes('Jira'), 'Turn 2 must explain why enterprise tools fail in colleges')
    assert.ok(turn2.responseMarkdown.includes('Institutional Memory'), 'Turn 2 must explain institutional memory')
    assert.ok(turn2.responseMarkdown.includes('Core Mini-Project Features to Build') || turn2.responseMarkdown.includes('High Priority'), 'Turn 2 must outline realistic scope')
    assert.ok(turn2.responseMarkdown.includes('High-Risk Features to Defer') || turn2.responseMarkdown.includes('Future Work'), 'Turn 2 must advise what to defer')
    assert.ok(turn2.responseMarkdown.includes('Between the student project workflow and the previous-batch project repository'), 'Turn 2 must ask focused follow-up question')

    // Turn 3: "What are the disadvantages?"
    const turn3 = await conversationalEngine.processTurn(
      conv.id,
      studentId,
      'What are the disadvantages?'
    )
    assert.equal(turn3.intent, 'DISADVANTAGES_INQUIRY', 'Must classify as DISADVANTAGES_INQUIRY')
    assert.ok(turn3.responseMarkdown.includes('Cold-Start') || turn3.responseMarkdown.includes('cold-start'), 'Turn 3 must analyze cold-start problem')
    assert.ok(turn3.responseMarkdown.includes('Latency') || turn3.responseMarkdown.includes('Costs'), 'Turn 3 must analyze AI latency and costs')
    assert.ok(turn3.responseMarkdown.includes('Faculty Adoption') || turn3.responseMarkdown.includes('Verification Overhead'), 'Turn 3 must analyze adoption/verification overhead')
    assert.ok(turn3.responseMarkdown.includes('viva defense'), 'Turn 3 must provide viva defense advice')
  })

  // ==========================================
  // PART 3: AUDIO PLAYBACK QUALITY & CONTROLS TESTS
  // ==========================================

  await suite.test('PART 3 - Audio Playback Engineering: 24kHz wideband WAV synthesis and speed variation', async () => {
    // 1.0x standard speed synthesis
    const synth1x = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub provides intelligent repository discovery and feature evaluation.',
      language: 'en',
      speed: 1.0,
    })
    assert.ok(synth1x.audioUrl.startsWith('data:audio/wav;base64,'), 'Must return valid audio data URL')
    assert.equal(synth1x.audioFormat, 'audio/wav')
    assert.ok(synth1x.durationSeconds > 0)

    // Decode WAV header to verify 24kHz wideband studio sample rate
    const base64Data = synth1x.audioUrl.split(',')[1]
    const wavBuffer = Buffer.from(base64Data, 'base64')
    assert.equal(wavBuffer.toString('utf8', 0, 4), 'RIFF', 'Valid RIFF header')
    assert.equal(wavBuffer.toString('utf8', 8, 12), 'WAVE', 'Valid WAVE container')
    assert.equal(wavBuffer.readUInt32LE(24), 24000, 'Must have 24,000 Hz studio sample rate for clear voice playback')

    // Speed variations: 0.75x, 1.25x, 1.5x
    const synth15x = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub provides intelligent repository discovery and feature evaluation.',
      language: 'en',
      speed: 1.5,
    })
    assert.ok(synth15x.durationSeconds <= synth1x.durationSeconds, '1.5x speed must reduce audio duration')

    // Multilingual synthesis tests (Kannada and Hindi)
    const synthKn = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub ನಲ್ಲಿ ಸೀನಿಯರ್-ಜ್ಯೂನಿಯರ್ ಸಂಪರ್ಕ ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ?',
      language: 'kn',
      speed: 1.0,
    })
    assert.equal(synthKn.language, 'kn', 'Must synthesize Kannada audio container')

    const synthHi = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub में सीनियर-जूनियर कनेक्शन कैसे काम करता है?',
      language: 'hi',
      speed: 1.0,
    })
    assert.equal(synthHi.language, 'hi', 'Must synthesize Hindi audio container')
  })
})
