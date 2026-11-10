import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  AlertCircle,
  Radio,
  MessageSquare,
  Globe,
  Zap,
} from 'lucide-react'
import type { VoiceState, SpokenLanguage, VoiceTranscriptTurn } from '../../types/aiMentor'
import { voiceService } from '../../services/voiceService'

interface VoiceModePreviewProps {
  isOpen: boolean
  onClose: () => void
  activeConversationId?: string | null
  onSwitchToTextChat?: () => void
  onAppendMessage?: (role: 'user' | 'assistant', content: string) => void
}

export const VoiceModePreview: React.FC<VoiceModePreviewProps> = ({
  isOpen,
  onClose,
  activeConversationId,
  onSwitchToTextChat,
  onAppendMessage,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('connecting')
  const [selectedLanguage, setSelectedLanguage] = useState<SpokenLanguage>('auto')
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<VoiceTranscriptTurn[]>([])
  const [currentSpeech, setCurrentSpeech] = useState<string>('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Scroll transcript to bottom as turns arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, currentSpeech])

  // Lifecycle: initialize voice session when modal opens
  useEffect(() => {
    if (!isOpen) {
      handleEndSession()
      return
    }

    let isMounted = true
    setErrorMessage(null)
    setVoiceState('connecting')
    setTranscript([])
    setCurrentSpeech('')

    const initSession = async () => {
      try {
        const convId = activeConversationId || 'voice-demo-session'
        // Call backend voice session endpoint
        const session = await voiceService.startVoiceSession(convId, selectedLanguage)
        if (!isMounted) return

        setActiveSessionId(session.id)
        setVoiceState('listening')
        startMicrophoneCapture()
      } catch (err: any) {
        if (!isMounted) return
        // Fallback to local browser voice session if backend unreachable
        setVoiceState('listening')
        startMicrophoneCapture()
      }
    }

    initSession()

    return () => {
      isMounted = false
      voiceService.stopListening()
      voiceService.stopSpeech()
    }
  }, [isOpen, activeConversationId])

  // Start browser speech recognition
  const startMicrophoneCapture = () => {
    const started = voiceService.startListening({
      language: selectedLanguage,
      onResult: (text, isFinal) => {
        setCurrentSpeech(text)
        if (isFinal && text.trim().length > 3) {
          handleStudentSpokenInput(text.trim())
        }
      },
      onError: (errMsg) => {
        setErrorMessage(errMsg)
        setVoiceState('error')
      },
      onAudioLevel: (lvl) => {
        setAudioLevel(lvl)
      },
    })

    if (!started) {
      setVoiceState('error')
    }
  }

  // Handle student spoken input submission
  const handleStudentSpokenInput = async (studentText: string) => {
    if (!studentText) return

    setCurrentSpeech('')
    setVoiceState('processing')
    voiceService.stopListening()

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const studentTurn: VoiceTranscriptTurn = {
      id: `student-${Date.now()}`,
      speaker: 'student',
      text: studentText,
      timestamp: now,
    }

    setTranscript((prev) => [...prev, studentTurn])
    onAppendMessage?.('user', studentText)

    try {
      if (activeSessionId) {
        // Send turn to backend Voice Intelligence session
        const turnData = await voiceService.sendVoiceTurn(
          activeSessionId,
          studentText,
          selectedLanguage
        )

        const mentorTurn: VoiceTranscriptTurn = {
          id: `mentor-${Date.now()}`,
          speaker: 'mentor',
          text: turnData.mentorTurn.text,
          timestamp: turnData.mentorTurn.timestamp,
        }

        setTranscript((prev) => [...prev, mentorTurn])
        onAppendMessage?.('assistant', turnData.mentorTurn.text)
        setVoiceState('speaking')

        // Play voice response
        voiceService.speak(`voice-${Date.now()}`, turnData.mentorTurn.text, {
          language: selectedLanguage,
          speed: 1,
          onStart: () => setVoiceState('speaking'),
          onEnd: () => {
            setVoiceState('listening')
            startMicrophoneCapture()
          },
          onError: () => {
            setVoiceState('listening')
            startMicrophoneCapture()
          },
        })
      } else {
        // Fallback simulated response with real audio synthesis
        const responseText =
          'That is an interesting question! For your college capstone, clearly differentiate your core algorithmic challenges from generic UI components to satisfy university evaluation rubrics.'

        const mentorTurn: VoiceTranscriptTurn = {
          id: `mentor-${Date.now()}`,
          speaker: 'mentor',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        setTranscript((prev) => [...prev, mentorTurn])
        onAppendMessage?.('assistant', responseText)
        setVoiceState('speaking')

        voiceService.speak(`fallback-${Date.now()}`, responseText, {
          language: selectedLanguage,
          onEnd: () => {
            setVoiceState('listening')
            startMicrophoneCapture()
          },
        })
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process voice turn')
      setVoiceState('listening')
      startMicrophoneCapture()
    }
  }

  // Interruption: Student clicks interrupt or speaks during AI response
  const handleInterrupt = async () => {
    voiceService.stopSpeech()
    setVoiceState('interrupted')

    if (activeSessionId) {
      try {
        await voiceService.interruptVoiceSession(activeSessionId)
      } catch (_) {}
    }

    // Immediately transition back to listening
    setTimeout(() => {
      setVoiceState('listening')
      startMicrophoneCapture()
    }, 400)
  }

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      startMicrophoneCapture()
    } else {
      setIsMuted(true)
      voiceService.stopListening()
      setAudioLevel(0)
    }
  }

  // End voice session
  const handleEndSession = async () => {
    voiceService.stopListening()
    voiceService.stopSpeech()
    setVoiceState('ended')

    if (activeSessionId) {
      try {
        await voiceService.endVoiceSession(activeSessionId)
      } catch (_) {}
    }

    onClose()
  }

  // Switch to Text Chat seamlessly
  const handleSwitchToText = () => {
    handleEndSession()
    onSwitchToTextChat?.()
  }

  if (!isOpen) return null

  // State colors & visual indicators
  const stateTheme = {
    connecting: {
      label: 'Connecting Voice Engine...',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      ring: 'border-violet-500/40',
      orb: 'from-violet-600 to-indigo-700',
    },
    listening: {
      label: 'Listening... Speak Naturally',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      ring: 'border-emerald-500/50',
      orb: 'from-emerald-600 to-teal-700',
    },
    processing: {
      label: 'AI Mentor is Reasoning...',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      ring: 'border-amber-500/50',
      orb: 'from-amber-600 to-orange-700',
    },
    speaking: {
      label: 'AI Mentor is Speaking',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      ring: 'border-cyan-500/50',
      orb: 'from-cyan-600 to-blue-700',
    },
    interrupted: {
      label: 'Interrupted by Student',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      ring: 'border-rose-500/60',
      orb: 'from-rose-600 to-red-700',
    },
    reconnecting: {
      label: 'Reconnecting Voice Stream...',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      ring: 'border-amber-500/40',
      orb: 'from-amber-600 to-orange-700',
    },
    ended: {
      label: 'Session Ended',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      ring: 'border-slate-700',
      orb: 'from-slate-700 to-slate-800',
    },
    error: {
      label: 'Voice Channel Error',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      ring: 'border-rose-500/60',
      orb: 'from-rose-700 to-red-900',
    },
    idle: {
      label: 'Ready',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      ring: 'border-slate-700',
      orb: 'from-slate-700 to-slate-800',
    },
  }[voiceState]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900/95 border border-slate-800 p-6 sm:p-8 text-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#6658FF]/20 border border-[#6658FF]/40 flex items-center justify-center text-[#8B5CF6]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Mentor Voice Intelligence</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stateTheme.badge}`}>
                  {voiceState.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">Natural two-way academic viva defense & discussion</p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['auto', 'en', 'kn', 'hi'] as SpokenLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setSelectedLanguage(lang)
                  if (voiceState === 'listening') {
                    startMicrophoneCapture()
                  }
                }}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedLanguage === lang
                    ? 'bg-[#6658FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'auto' ? 'Auto' : lang === 'en' ? 'EN' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null)
                setVoiceState('listening')
                startMicrophoneCapture()
              }}
              className="text-[11px] font-bold text-rose-400 hover:text-white underline cursor-pointer ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Central Orb & Visual Waveform */}
        <div className="py-8 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Outer animated audio-responsive rings */}
            <motion.div
              animate={{
                scale: voiceState === 'listening' ? [1, 1 + audioLevel / 120, 1] : voiceState === 'speaking' ? [1, 1.15, 1] : 1,
                opacity: voiceState === 'listening' ? 0.8 : 0.4,
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className={`absolute inset-0 rounded-full border-2 ${stateTheme.ring}`}
            />
            <motion.div
              animate={{
                scale: voiceState === 'listening' ? [1, 1 + audioLevel / 80, 1] : [1, 1.05, 1],
                opacity: 0.2,
              }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className={`absolute -inset-4 rounded-full border ${stateTheme.ring}`}
            />

            {/* Glowing Core Orb */}
            <div
              className={`w-28 h-28 rounded-full bg-gradient-to-tr ${stateTheme.orb} shadow-lg flex items-center justify-center relative overflow-hidden transition-all duration-300`}
            >
              <div className="absolute inset-0 bg-radial from-white/20 to-transparent" />
              {voiceState === 'listening' && (
                <Mic className="w-10 h-10 text-white animate-pulse" />
              )}
              {voiceState === 'speaking' && (
                <Volume2 className="w-10 h-10 text-white" />
              )}
              {voiceState === 'processing' && (
                <Sparkles className="w-10 h-10 text-amber-200 animate-spin" />
              )}
              {voiceState === 'interrupted' && (
                <Zap className="w-10 h-10 text-rose-200" />
              )}
              {voiceState === 'connecting' && (
                <Radio className="w-10 h-10 text-violet-200 animate-ping" />
              )}
            </div>
          </div>

          {/* Current State Text */}
          <p className="mt-4 text-sm font-semibold text-white tracking-wide">
            {stateTheme.label}
          </p>
          {voiceState === 'listening' && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Microphone active • Speak your capstone inquiry
            </p>
          )}
          {voiceState === 'speaking' && (
            <p className="text-[11px] text-cyan-300 mt-0.5">
              Mentor is explaining • Tap Interrupt anytime to cut in
            </p>
          )}

          {/* Live transcript buffer when student speaks */}
          {currentSpeech && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 max-w-md text-center italic">
              "{currentSpeech}"
            </div>
          )}
        </div>

        {/* Turn-by-Turn Transcript History */}
        <div className="flex-1 overflow-y-auto px-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 min-h-[140px] max-h-[220px]">
          {transcript.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
              Spoken conversation turns will appear here in real time.
            </div>
          ) : (
            transcript.map((turn) => (
              <div
                key={turn.id}
                className={`flex flex-col ${turn.speaker === 'student' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">
                  {turn.speaker === 'student' ? 'You' : 'AI Mentor'} • {turn.timestamp}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    turn.speaker === 'student'
                      ? 'bg-[#6658FF] text-white rounded-tr-xs'
                      : 'bg-slate-800 text-slate-200 rounded-tl-xs border border-slate-700/80'
                  }`}
                >
                  {turn.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Controls Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Switch to Text Chat */}
          <button
            type="button"
            onClick={handleSwitchToText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            title="Switch back to normal text chat with full transcript preserved"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Switch to Text Chat</span>
          </button>

          {/* Center: Interruption & Mute Controls */}
          <div className="flex items-center gap-2">
            {voiceState === 'speaking' && (
              <button
                type="button"
                onClick={handleInterrupt}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer animate-pulse"
                title="Interrupt AI Mentor while speaking"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tap to Interrupt</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: End Call */}
          <button
            type="button"
            onClick={handleEndSession}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
            title="End voice session"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Voice Session</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoiceModePreview
