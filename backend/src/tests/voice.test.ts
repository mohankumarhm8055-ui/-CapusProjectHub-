import test from 'node:test'
import assert from 'node:assert/strict'
import { voiceService } from '../modules/ai/voice/voice.service.js'
import { conversationService } from '../modules/ai/conversation.service.js'
import { isValidStateTransition, inMemoryVoiceSessionStore } from '../modules/ai/voice/voice.session.model.js'

test('Voice Intelligence Engine Test Suite (TASK 7)', async (t) => {
  process.env.ALLOW_INMEMORY_FALLBACK = 'true'
  const student1Id = 'student-voice-test-001'
  const student2Id = 'student-voice-test-002'

  await t.test('1. State Machine: Validates legal vs illegal voice state transitions', () => {
    // Legal transitions
    assert.ok(isValidStateTransition('idle', 'connecting'))
    assert.ok(isValidStateTransition('connecting', 'listening'))
    assert.ok(isValidStateTransition('listening', 'processing'))
    assert.ok(isValidStateTransition('processing', 'speaking'))
    assert.ok(isValidStateTransition('speaking', 'interrupted'))
    assert.ok(isValidStateTransition('interrupted', 'listening'))
    assert.ok(isValidStateTransition('listening', 'ended'))

    // Illegal transitions
    assert.equal(isValidStateTransition('ended', 'listening'), false, 'Ended session cannot transition to listening')
    assert.equal(isValidStateTransition('idle', 'speaking'), false, 'Idle cannot jump directly to speaking')
  })

  await t.test('2. Voice Session Lifecycle: Start session transitions to listening', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Voice Consultation')
    const session = await voiceService.startSession(student1Id, conv.id, 'en')

    assert.ok(session.id, 'Session must have an ID')
    assert.equal(session.ownerId, student1Id)
    assert.equal(session.conversationId, conv.id)
    assert.equal(session.state, 'listening', 'New active session must be ready and listening')
    assert.equal(session.language, 'en')
  })

  await t.test('3. Speech-to-Text: Preserves technical terminology in transcripts', async () => {
    const res = await voiceService.transcribeAudio({
      audioBase64: Buffer.from('test-audio').toString('base64'),
      language: 'en',
    })

    assert.ok(res.text, 'Must produce transcription')
    assert.ok(res.preservedTechnicalTerms.includes('React'), 'Must preserve React')
    assert.ok(res.preservedTechnicalTerms.includes('MongoDB'), 'Must preserve MongoDB')
  })

  await t.test('4. Text-to-Speech: Generates audible container and caches synthesis results', async () => {
    const res1 = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub is an AI-powered academic project platform.',
      language: 'en',
      speed: 1,
    })

    assert.ok(res1.audioUrl.startsWith('data:audio/wav;base64,'), 'Must return valid WAV data URI')
    assert.equal(res1.cached, false, 'First call is not cached')

    // Second identical call must be cached
    const res2 = await voiceService.synthesizeSpeech({
      text: 'CampusProjectHub is an AI-powered academic project platform.',
      language: 'en',
      speed: 1,
    })

    assert.equal(res2.cached, true, 'Subsequent identical request must be cached')
  })

  await t.test('5. Process Voice Turn: Generates AI response and transitions to speaking', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Voice Turn Session')
    const session = await voiceService.startSession(student1Id, conv.id, 'en')

    const turnResult = await voiceService.processVoiceTurn(
      session.id,
      student1Id,
      'I want to develop a college project management system',
      'en'
    )

    assert.equal(turnResult.studentTurn.speaker, 'student')
    assert.equal(turnResult.studentTurn.text, 'I want to develop a college project management system')
    assert.equal(turnResult.mentorTurn.speaker, 'mentor')
    assert.ok(turnResult.mentorTurn.text.includes('CampusProjectHub'), 'Must ground response using conversational engine')
    assert.ok(turnResult.audio.audioUrl.startsWith('data:audio/wav;base64,'), 'Must synthesize mentor speech')
    assert.equal(turnResult.session.state, 'speaking', 'State must be speaking during mentor response')
  })

  await t.test('6. Interruption Handling: Halts speech immediately and returns to listening', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Interruption Session')
    const session = await voiceService.startSession(student1Id, conv.id, 'en')

    // Trigger turn to reach speaking
    await voiceService.processVoiceTurn(session.id, student1Id, 'Explain the problem statement')

    // Student interrupts AI while speaking
    const interruptedSession = await voiceService.handleInterruption(session.id, student1Id)

    assert.equal(interruptedSession.state, 'listening', 'Must immediately recover to listening state')
    assert.equal(interruptedSession.currentAudioUrl, undefined, 'Must clear active audio playback')
    assert.ok(interruptedSession.lastInterruptionAt, 'Must record interruption timestamp')
  })

  await t.test('7. End Session: Closes voice session cleanly', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Ending Session')
    const session = await voiceService.startSession(student1Id, conv.id, 'en')

    const ended = await voiceService.endSession(session.id, student1Id)
    assert.equal(ended.state, 'ended', 'State must be ended')

    // Attempting to speak to an ended session throws error
    await assert.rejects(
      async () => {
        await voiceService.processVoiceTurn(session.id, student1Id, 'Hello?')
      },
      /Cannot send speech to an ended voice session/
    )
  })

  await t.test('8. Security Authorization: Student 202 cannot access Student 101 voice session', async () => {
    const conv = await conversationService.createConversation(student1Id, 'Private Voice Session')
    const session = await voiceService.startSession(student1Id, conv.id, 'en')

    await assert.rejects(
      async () => {
        await voiceService.getSession(session.id, student2Id)
      },
      /Forbidden/,
      'Must reject unauthorized access with 403 Forbidden'
    )
  })
})
