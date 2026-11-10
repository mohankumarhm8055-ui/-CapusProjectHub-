import type { SpokenLanguage, AudioPlaybackSpeed, VoiceState, VoiceTranscriptTurn } from '../types/aiMentor'

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

const VOICE_API_BASE =
  typeof window !== 'undefined' && window.location.origin.includes(':5173')
    ? 'http://localhost:5000/api/ai/voice'
    : '/api/ai/voice'

// Structured diagnostic logging helper for Speech-to-Text and Voice Playback
function voiceLog(stage: string, data?: Record<string, any>) {
  const ts = new Date().toISOString().substring(11, 23)
  if (data) {
    console.log(`[VoiceSTT ${ts}] ${stage}:`, data)
  } else {
    console.log(`[VoiceSTT ${ts}] ${stage}`)
  }
}

export interface VoiceSessionData {
  id: string
  conversationId: string
  state: VoiceState
  language: SpokenLanguage
  transcriptTurns: VoiceTranscriptTurn[]
  currentAudioUrl?: string
}

class VoiceService {
  private recognition: any = null
  private isCurrentlyListening = false
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private activeUtterance: SpeechSynthesisUtterance | null = null
  private isSpeechPaused = false
  private currentPlayingId: string | null = null
  private cachedVoices: SpeechSynthesisVoice[] = []
  private selectedFemaleVoiceName: string = ''

  // MediaRecorder audio capture state (for fallback browsers)
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private recordingStartTime: number = 0
  private accumulatedTranscript: string = ''
  private activeRecorderMime: string = 'audio/webm'

  constructor() {
    this.initVoiceSystem()
  }

  /**
   * Preload voices and listen for system voice changes to ensure natural female voice is ready
   */
  private initVoiceSystem() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const refresh = () => {
      const v = window.speechSynthesis.getVoices()
      if (v && v.length > 0) {
        this.cachedVoices = v
        const best = this.findPremierFemaleVoice('en-IN')
        if (best) {
          this.selectedFemaleVoiceName = best.name
          voiceLog('Female neural voice initialized', {
            voiceName: best.name,
            lang: best.lang,
            default: best.default,
          })
        }
      }
    }

    refresh()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = refresh
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  public getActiveUtterance(): SpeechSynthesisUtterance | null {
    return this.activeUtterance
  }

  // Language code mapping
  private langMap: Record<SpokenLanguage, string> = {
    auto: 'en-IN',
    en: 'en-IN',
    kn: 'kn-IN',
    hi: 'hi-IN',
  }

  /**
   * Find premier natural female neural voice matching language preference
   */
  public findPremierFemaleVoice(langCode: string = 'en-IN'): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null

    let voices = this.cachedVoices
    if (!voices || voices.length === 0) {
      voices = window.speechSynthesis.getVoices()
      if (voices && voices.length > 0) {
        this.cachedVoices = voices
      }
    }
    if (!voices || voices.length === 0) return null

    const langPrefix = langCode.split('-')[0].toLowerCase()

    // Premier Natural/Neural Female Voice Names across Windows, Chrome, Edge, Safari, macOS, Android
    const priorityFemalePatterns: RegExp[] = [
      // Azure Natural Female Voices (Edge & Windows 11) - Warm, conversational, ChatGPT-tier
      /Microsoft Jenny Online \(Natural\)/i,
      /Microsoft Aria Online \(Natural\)/i,
      /Microsoft Neerja Online \(Natural\)/i, // Academic Indian English Mentor
      /Microsoft Swara Online \(Natural\)/i,  // Hindi Natural Female
      /Microsoft Sapna Online \(Natural\)/i,  // Kannada Natural Female
      // Google Chrome Natural Female Voices
      /Google US English/i,
      /Google UK English Female/i,
      /Google हिन्दी/i,
      /Google ಕನ್ನಡ/i,
      // Apple Natural Female Voices (Safari / macOS / iOS)
      /Samantha/i,
      /Victoria/i,
      /Karen/i,
      /Tessa/i,
      // Standard Windows Female Voices
      /Microsoft Zira/i,
      /Microsoft Heera/i,
      /Microsoft Gagana/i,
      /Microsoft Kalpana/i,
      // Any voice explicitly containing female
      /\bfemale\b/i,
      /\bwoman\b/i,
    ]

    // Strict male voice exclusion filter
    const isMaleVoice = (name: string): boolean => {
      return /david|mark|george|ravi|madhur|guy|stefan|pavel|richard|james|male|man\b|boy\b/i.test(name)
    }

    // Step A: Search for language-matching female neural voice
    const langMatching = voices.filter((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)
    )

    let chosen: SpeechSynthesisVoice | null = null

    for (const pattern of priorityFemalePatterns) {
      const match = langMatching.find((v) => pattern.test(v.name) && !isMaleVoice(v.name))
      if (match) {
        chosen = match
        break
      }
    }

    // Step B: Search all available voices for priority female voice
    if (!chosen) {
      for (const pattern of priorityFemalePatterns) {
        const match = voices.find((v) => pattern.test(v.name) && !isMaleVoice(v.name))
        if (match) {
          chosen = match
          break
        }
      }
    }

    // Step C: Fallback to any non-male voice in matching language
    if (!chosen) {
      const nonMaleLang = langMatching.find((v) => !isMaleVoice(v.name))
      if (nonMaleLang) chosen = nonMaleLang
    }

    // Step D: Any non-male voice in the entire pool
    if (!chosen) {
      const nonMaleAny = voices.find((v) => !isMaleVoice(v.name))
      if (nonMaleAny) chosen = nonMaleAny
    }

    if (!chosen && voices.length > 0) {
      chosen = voices[0]
    }

    if (chosen) {
      this.selectedFemaleVoiceName = chosen.name
    }

    return chosen
  }

  public getSelectedVoiceName(): string {
    return this.selectedFemaleVoiceName || 'Dr. Neerja / Jenny (Natural Female Academic Mentor)'
  }

  /**
   * Get active female voice identity for diagnostics & UI reporting
   */
  public getVoiceDetails(lang: SpokenLanguage = 'auto') {
    const voice = this.findPremierFemaleVoice(this.langMap[lang] || 'en-IN')
    return {
      voiceId: voice ? voice.name : 'cph-female-neural-default',
      voiceName: voice ? voice.name : 'Dr. Neerja / Jenny (Natural Female Academic Mentor)',
      gender: 'female',
      language: voice ? voice.lang : 'en-IN',
      provider: voice?.name.includes('Google')
        ? 'Google Chrome Neural Speech'
        : voice?.name.includes('Microsoft')
        ? 'Microsoft Azure / Windows Neural Voice'
        : voice?.name.includes('Samantha')
        ? 'Apple Neural Speech'
        : 'Web Speech Synthesis Neural API',
    }
  }

  // Preserve technical terminology casing in recognized speech
  public sanitizeTechnicalTerms(text: string): string {
    if (!text) return ''
    let sanitized = text

    const termReplacements: Array<[RegExp, string]> = [
      [/\bcampus\s*project\s*hub\b/gi, 'CampusProjectHub'],
      [/\bcampusprojecthub\b/gi, 'CampusProjectHub'],
      [/\breact\s*js\b|\breactjs\b|\breact\b/gi, 'React'],
      [/\bmongo\s*db\b|\bmongodb\b/gi, 'MongoDB'],
      [/\bnode\s*js\b|\bnodejs\b/gi, 'Node.js'],
      [/\bexpress\s*js\b/gi, 'Express'],
      [/\btype\s*script\b|\btypescript\b/gi, 'TypeScript'],
      [/\bjava\s*script\b|\bjavascript\b/gi, 'JavaScript'],
      [/\bapi\b/gi, 'API'],
      [/\bapis\b/gi, 'APIs'],
      [/\brest\s*api\b|\brest\s*apis\b/gi, 'REST API'],
      [/\bgraphql\b/gi, 'GraphQL'],
      [/\bwebrtc\b/gi, 'WebRTC'],
      [/\bsql\b/gi, 'SQL'],
      [/\bnosql\b/gi, 'NoSQL'],
      [/\bui\b/gi, 'UI'],
      [/\bux\b/gi, 'UX'],
      [/\bieee\s*830\b/gi, 'IEEE 830'],
      [/\bieee\b/gi, 'IEEE'],
      [/\bvtu\b/gi, 'VTU'],
      [/\bjaccard\b/gi, 'Jaccard'],
      [/\bvite\b/gi, 'Vite'],
      [/\btailwind\b/gi, 'Tailwind'],
      [/\bgit\s*hub\b|\bgithub\b/gi, 'GitHub'],
      [/\bgit\s*lab\b|\bgitlab\b/gi, 'GitLab'],
      [/\bdocker\b/gi, 'Docker'],
      [/\bpython\b/gi, 'Python'],
      [/\bjwt\b/gi, 'JWT'],
      [/\bsse\b/gi, 'SSE'],
    ]

    for (const [pattern, replacement] of termReplacements) {
      sanitized = sanitized.replace(pattern, replacement)
    }

    return sanitized
  }

  /**
   * Transcribe recorded audio blob via backend STT endpoint
   */
  async transcribeAudioBlob(blob: Blob, language: SpokenLanguage = 'auto'): Promise<{
    text: string
    detectedLanguage: SpokenLanguage
    preservedTechnicalTerms: string[]
  }> {
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const audioBase64 = await base64Promise
    const res = await fetch(`${VOICE_API_BASE}/transcribe`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ audioBase64, language }),
    })

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || 'Failed to transcribe audio stream')
    }
    return json.data
  }

  // 1. REBUILT SPEECH-TO-TEXT (FEATURE A)
  startListening(options: {
    language?: SpokenLanguage
    onResult: (transcript: string, isFinal: boolean) => void
    onError: (errorMsg: string) => void
    onAudioLevel?: (level: number) => void
  }): boolean {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    this.stopListening()
    this.accumulatedTranscript = ''

    const selectedLang = options.language || 'auto'
    voiceLog('Recording initiated', {
      language: selectedLang,
      engine: SpeechRecognitionClass ? 'NativeWebSpeech' : 'MediaRecorderFallback',
    })

    // If browser supports native Web Speech API (Chrome / Edge / Safari / Chromium),
    // run native recognition directly without concurrent getUserMedia locks to eliminate device contention.
    if (SpeechRecognitionClass) {
      return this.startNativeSpeechRecognition(SpeechRecognitionClass, selectedLang, options)
    } else {
      return this.startMediaRecorderFallback(selectedLang, options)
    }
  }

  /**
   * High-accuracy native speech recognition (Chrome, Edge, Safari, Chromium)
   */
  private startNativeSpeechRecognition(
    SpeechRecognitionClass: any,
    selectedLang: SpokenLanguage,
    options: {
      onResult: (transcript: string, isFinal: boolean) => void
      onError: (errorMsg: string) => void
      onAudioLevel?: (level: number) => void
    }
  ): boolean {
    try {
      const recognition = new SpeechRecognitionClass()
      this.recognition = recognition

      recognition.lang = this.langMap[selectedLang] || 'en-IN'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        this.isCurrentlyListening = true
        voiceLog('Native SpeechRecognition active', { lang: recognition.lang })
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i]
          const text = item[0].transcript
          if (item.isFinal) {
            finalTranscript += text
          } else {
            interimTranscript += text
          }
        }

        const combinedText = (
          this.accumulatedTranscript +
          ' ' +
          finalTranscript +
          (interimTranscript ? ' ' + interimTranscript : '')
        ).trim()

        if (finalTranscript) {
          this.accumulatedTranscript = (this.accumulatedTranscript + ' ' + finalTranscript).trim()
        }

        if (combinedText) {
          const sanitizedText = this.sanitizeTechnicalTerms(combinedText)
          options.onResult(sanitizedText, !!finalTranscript && !interimTranscript)
          voiceLog('Transcript received via WebSpeech', {
            text: sanitizedText,
            isFinal: !!finalTranscript,
          })
        }
      }

      recognition.onerror = (event: any) => {
        voiceLog('WebSpeech recognition error event', { error: event.error })

        if (event.error === 'not-allowed') {
          this.isCurrentlyListening = false
          options.onError('Microphone permission was denied. Please allow microphone access in your browser settings to speak.')
        } else if (event.error === 'no-speech') {
          // Do not abort immediately on brief pauses
          voiceLog('WebSpeech brief silence detected')
        } else if (event.error === 'network') {
          // Network error reaching speech servers -> fallback to MediaRecorder
          voiceLog('WebSpeech network error, falling back to MediaRecorder', { error: event.error })
          this.startMediaRecorderFallback(selectedLang, options)
        } else if (event.error !== 'aborted') {
          options.onError(`Speech recognition error: ${event.error}. You can also type your message.`)
        }
      }

      recognition.onend = () => {
        voiceLog('Native SpeechRecognition session ended')
        this.isCurrentlyListening = false
      }

      recognition.start()
      return true
    } catch (err: any) {
      voiceLog('Failed to start native SpeechRecognition', { error: err.message })
      return this.startMediaRecorderFallback(selectedLang, options)
    }
  }

  /**
   * MediaRecorder fallback for browsers without native SpeechRecognition (e.g. Firefox)
   */
  private startMediaRecorderFallback(
    selectedLang: SpokenLanguage,
    options: {
      onResult: (transcript: string, isFinal: boolean) => void
      onError: (errorMsg: string) => void
      onAudioLevel?: (level: number) => void
    }
  ): boolean {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      voiceLog('Failure stage: Permission / Environment', { errorCode: 'MEDIA_DEVICES_NOT_SUPPORTED' })
      options.onError('Microphone access is not supported in this browser. Please use Chrome, Edge, or type your message.')
      return false
    }

    this.audioChunks = []
    this.recordingStartTime = Date.now()

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        this.mediaStream = stream
        this.isCurrentlyListening = true
        voiceLog('MediaRecorder fallback audio stream acquired', { activeTracks: stream.getAudioTracks().length })

        // Waveform monitoring
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          if (AudioContextClass) {
            const ctx = new AudioContextClass()
            this.audioContext = ctx
            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 64
            source.connect(analyser)
            this.analyser = analyser

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const checkLevel = () => {
              if (!this.isCurrentlyListening) return
              analyser.getByteFrequencyData(dataArray)
              let sum = 0
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i]
              }
              const avg = sum / dataArray.length
              options.onAudioLevel?.(Math.min(100, Math.round(avg * 1.5)))
              requestAnimationFrame(checkLevel)
            }
            requestAnimationFrame(checkLevel)
          }
        } catch (_) {}

        let mimeType = 'audio/webm'
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus'
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm'
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4'
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg'
          }
        }
        this.activeRecorderMime = mimeType

        try {
          const recorder = new MediaRecorder(stream, { mimeType })
          this.mediaRecorder = recorder

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data)
            }
          }

          recorder.onstop = async () => {
            const durationSec = ((Date.now() - this.recordingStartTime) / 1000).toFixed(2)
            const totalBytes = this.audioChunks.reduce((acc, chunk) => acc + chunk.size, 0)
            voiceLog('MediaRecorder stopped', {
              duration: `${durationSec}s`,
              chunks: this.audioChunks.length,
              totalBytes,
            })

            if (this.audioChunks.length === 0 || totalBytes === 0) {
              options.onError('Empty audio recording: No audio data was captured. Please speak into your microphone.')
              return
            }

            voiceLog('Uploading recorded audio to backend STT', { endpoint: `${VOICE_API_BASE}/transcribe` })
            const audioBlob = new Blob(this.audioChunks, { type: this.activeRecorderMime })

            try {
              const res = await this.transcribeAudioBlob(audioBlob, selectedLang)
              if (res.text && res.text.trim()) {
                const sanitized = this.sanitizeTechnicalTerms(res.text.trim())
                this.accumulatedTranscript = sanitized
                options.onResult(sanitized, true)
                voiceLog('Transcript received from backend STT', { text: sanitized })
              } else {
                options.onError('No speech could be recognized. Please try speaking again or type your message.')
              }
            } catch (err: any) {
              options.onError(err.message || 'Speech-to-text service error. Please type your message.')
            }
          }

          recorder.start(250)
          voiceLog('MediaRecorder recording active', { mimeType })
        } catch (recErr: any) {
          options.onError('Failed to initialize audio recorder: ' + recErr.message)
        }
      })
      .catch((err) => {
        this.isCurrentlyListening = false
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          options.onError('Microphone permission was denied. Please allow microphone access in your browser settings.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          options.onError('No microphone device was detected. Please connect an audio input device.')
        } else {
          options.onError(`Microphone error: ${err.message || 'Unable to access audio input.'}`)
        }
      })

    return true
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (_) {}
      this.recognition = null
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch (_) {}
    }

    this.isCurrentlyListening = false

    if (this.mediaStream) {
      const stream = this.mediaStream
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
      }, 300)
      this.mediaStream = null
    }

    if (this.audioContext) {
      try {
        this.audioContext.close()
      } catch (_) {}
      this.audioContext = null
    }
    this.analyser = null
  }

  isListening(): boolean {
    return this.isCurrentlyListening
  }

  // 2. NATURAL FEMALE AI VOICE (FEATURE B - CHATGPT QUALITY)
  speak(
    messageId: string,
    text: string,
    options: {
      language?: SpokenLanguage
      speed?: AudioPlaybackSpeed
      onStart?: () => void
      onEnd?: () => void
      onError?: (err: string) => void
    }
  ) {
    this.stopSpeech()

    if (!window.speechSynthesis) {
      options.onError?.('Speech synthesis is not supported in this browser.')
      return
    }

    // High clarity text cleaning: eliminate markdown noise and format for natural cadence
    let cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/\|[^\n]+\|/g, ' ') // Strip markdown table rows
      .replace(/[-*#]{2,}/g, ' ')
      .replace(/###\s+/g, '')
      .replace(/##\s+/g, '')
      .replace(/#\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[➔→]/g, 'to')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim()

    // Phonetic clarity enhancement for technical terms
    const phoneticReplacements: Array<[RegExp, string]> = [
      [/\bCampusProjectHub\b/g, 'Campus Project Hub'],
      [/\bIEEE\s*830\b/gi, 'I triple E eight thirty'],
      [/\bIEEE\b/gi, 'I triple E'],
      [/\bREST\s*APIs?\b/gi, 'REST A P I'],
      [/\bAPIs?\b/gi, 'A P I'],
      [/\bMongoDB\b/gi, 'Mongo D B'],
      [/\bUI\/UX\b/gi, 'U I and U X'],
      [/\bUI\b/gi, 'U I'],
      [/\bUX\b/gi, 'U X'],
      [/\bVTU\b/gi, 'V T U'],
      [/\bJWT\b/gi, 'J W T'],
      [/\bSSE\b/gi, 'S S E'],
      [/\bFRs?\b/gi, 'Functional Requirements'],
      [/\bNFRs?\b/gi, 'Non Functional Requirements'],
    ]

    for (const [pattern, replacement] of phoneticReplacements) {
      cleanText = cleanText.replace(pattern, replacement)
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    this.activeUtterance = utterance
    this.currentPlayingId = messageId
    this.isSpeechPaused = false

    const lang = options.language || 'auto'
    const targetLangCode = this.langMap[lang] || 'en-IN'
    utterance.lang = targetLangCode

    // Natural feminine AI voice acoustic configuration:
    // Warm, friendly, calm, professional female academic project mentor
    utterance.pitch = 1.05 // Gentle feminine resonance
    utterance.rate = (options.speed || 1.0) * 0.94 // Natural conversational pace (~145 wpm)
    utterance.volume = 1.0 // Full clear loudness, no clipping

    // Select premier natural female neural voice
    const femaleVoice = this.findPremierFemaleVoice(targetLangCode)
    if (femaleVoice) {
      utterance.voice = femaleVoice
      voiceLog('Using natural female voice for speech playback', {
        voiceName: femaleVoice.name,
        lang: femaleVoice.lang,
        pitch: 1.05,
        rate: utterance.rate,
        volume: 1.0,
      })
    }

    utterance.onstart = () => {
      voiceLog('Female voice speech playback started', { messageId })
      options.onStart?.()
    }

    utterance.onend = () => {
      this.currentPlayingId = null
      this.activeUtterance = null
      this.isSpeechPaused = false
      voiceLog('Female voice speech playback finished', { messageId })
      options.onEnd?.()
    }

    utterance.onerror = (e) => {
      this.currentPlayingId = null
      this.activeUtterance = null
      this.isSpeechPaused = false
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        voiceLog('Female voice speech playback error', { error: e.error })
        options.onError?.(`Speech synthesis error: ${e.error}`)
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  pauseSpeech() {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      this.isSpeechPaused = true
    }
  }

  resumeSpeech() {
    if (window.speechSynthesis && this.isSpeechPaused) {
      window.speechSynthesis.resume()
      this.isSpeechPaused = false
    }
  }

  stopSpeech() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    this.activeUtterance = null
    this.currentPlayingId = null
    this.isSpeechPaused = false
  }

  getPlayingMessageId(): string | null {
    return this.currentPlayingId
  }

  isSpeaking(): boolean {
    return !!window.speechSynthesis?.speaking && !this.isSpeechPaused
  }

  isPaused(): boolean {
    return this.isSpeechPaused
  }

  // 3. BACKEND VOICE SESSION CLIENT (FEATURES C, D, E)
  private getHeaders(): HeadersInit {
    let token = ''
    try {
      token = localStorage.getItem('cph_auth_token') || localStorage.getItem('token') || ''
    } catch {
      token = ''
    }
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  async startVoiceSession(conversationId: string, language: SpokenLanguage = 'auto'): Promise<VoiceSessionData> {
    const res = await fetch(`${VOICE_API_BASE}/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ conversationId, language }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to start voice session')
    return json.data
  }

  async sendVoiceTurn(
    sessionId: string,
    speech: string,
    language?: SpokenLanguage
  ): Promise<{
    session: VoiceSessionData
    studentTurn: VoiceTranscriptTurn
    mentorTurn: VoiceTranscriptTurn
    audio: { audioUrl: string; durationSeconds: number }
  }> {
    const res = await fetch(`${VOICE_API_BASE}/sessions/${sessionId}/interact`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ speech, language }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to process voice turn')
    return json.data
  }

  async interruptVoiceSession(sessionId: string): Promise<VoiceSessionData> {
    this.stopSpeech()
    const res = await fetch(`${VOICE_API_BASE}/sessions/${sessionId}/interrupt`, {
      method: 'POST',
      headers: this.getHeaders(),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to interrupt voice session')
    return json.data
  }

  async endVoiceSession(sessionId: string): Promise<VoiceSessionData> {
    this.stopSpeech()
    this.stopListening()
    const res = await fetch(`${VOICE_API_BASE}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: this.getHeaders(),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to end voice session')
    return json.data
  }
}

export const voiceService = new VoiceService()
