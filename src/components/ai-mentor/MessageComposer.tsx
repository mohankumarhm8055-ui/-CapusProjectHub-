import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Headphones,
  X,
  FileText,
  AlertCircle,
  Globe,
} from 'lucide-react'
import { voiceService } from '../../services/voiceService'
import type { SpokenLanguage } from '../../types/aiMentor'

interface MessageComposerProps {
  onSendMessage: (text: string, attachments?: string[]) => void
  isGenerating: boolean
  onOpenVoiceMode: () => void
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isGenerating,
  onOpenVoiceMode,
}) => {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [isListeningMic, setIsListeningMic] = useState(false)
  const [micAudioLevel, setMicAudioLevel] = useState(0)
  const [micLanguage, setMicLanguage] = useState<SpokenLanguage>('auto')
  const [micError, setMicError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseTextRef = useRef<string>('')
  const hasSpokenRef = useRef<boolean>(false)

  // Auto-resize textarea height as content expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`
    }
  }, [text])

  // Stop microphone on unmount
  useEffect(() => {
    return () => {
      voiceService.stopListening()
    }
  }, [])

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isGenerating) return
    if (isListeningMic) {
      voiceService.stopListening()
      setIsListeningMic(false)
    }
    onSendMessage(text.trim(), attachments)
    setText('')
    setAttachments([])
    setMicError(null)
    baseTextRef.current = ''
    hasSpokenRef.current = false
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Simulated file attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const names = Array.from(files).map((f) => f.name)
      setAttachments((prev) => [...prev, ...names])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Real Speech-to-Text Toggle
  const handleToggleMic = () => {
    setMicError(null)

    if (isListeningMic) {
      voiceService.stopListening()
      setIsListeningMic(false)
      setMicAudioLevel(0)
      return
    }

    // Preserve existing typed text before speech begins
    baseTextRef.current = text.trim() ? text.trim() + ' ' : ''
    hasSpokenRef.current = false

    const started = voiceService.startListening({
      language: micLanguage,
      onResult: (transcript) => {
        hasSpokenRef.current = true
        // Keep prior typed text intact while streaming recognized speech
        const updated = baseTextRef.current + transcript
        setText(updated)
        console.log('[MessageComposer] Transcript inserted into composer:', updated)
      },
      onError: (errMsg) => {
        setMicError(errMsg)
        setIsListeningMic(false)
        setMicAudioLevel(0)
      },
      onAudioLevel: (level) => {
        setMicAudioLevel(level)
      },
    })

    if (started) {
      setIsListeningMic(true)
    }
  }

  return (
    <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 max-w-5xl mx-auto w-full">
      {/* Microphone Error Alert */}
      {micError && (
        <div
          role="alert"
          className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{micError}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss microphone alert"
            onClick={() => setMicError(null)}
            className="text-amber-600 hover:text-amber-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Recording Waveform Banner */}
      {isListeningMic && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </span>
            <span className="font-semibold">Listening... speak your question</span>
            <span className="text-[11px] text-rose-500">
              (Transcript is editable before sending)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Visual sound level bars */}
            <div className="flex items-center gap-0.5 h-3">
              {[40, 70, 100, 60, 80].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, Math.min(14, (micAudioLevel / 100) * h))}px`,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleToggleMic}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 ml-2 cursor-pointer underline"
            >
              Stop Mic
            </button>
          </div>
        </div>
      )}

      {/* File Attachment Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
            >
              <FileText className="w-3.5 h-3.5 text-[#6658FF]" />
              <span className="max-w-[180px] truncate">{file}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-slate-400 hover:text-slate-700 ml-0.5"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative flex flex-col rounded-2xl bg-white border border-slate-200/90 shadow-xs focus-within:border-[#6658FF] focus-within:ring-2 focus-within:ring-[#6658FF]/15 transition-all">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,.zip,.py,.ts,.tsx,.js,.java"
        />

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message AI Project Mentor"
          placeholder={
            isListeningMic
              ? 'Listening to speech... your words will appear here in real time.'
              : 'Ask your AI Mentor about project ideas, college comparisons, feature scope, or proposals...'
          }
          rows={1}
          className="w-full px-4 pt-3 pb-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-500 resize-none focus:outline-none bg-transparent"
        />

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left tools: Attachment, Mic with Language, Voice Mode */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Attach project abstract, diagram, or code file"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-600 hover:text-[#6658FF] hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658FF]"
              title="Attach project abstract, diagram, or code file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Speech-to-Text Mic Button */}
            <button
              type="button"
              aria-label={isListeningMic ? 'Stop speech recording' : 'Start speech to text microphone'}
              onClick={handleToggleMic}
              className={`p-2 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658FF] ${
                isListeningMic
                  ? 'text-rose-600 bg-rose-50 ring-2 ring-rose-400'
                  : 'text-slate-600 hover:text-[#6658FF] hover:bg-slate-100'
              }`}
              title={isListeningMic ? 'Stop recording speech' : 'Speak your question (Speech-to-Text)'}
            >
              {isListeningMic ? <Mic className="w-4 h-4 text-rose-600 animate-pulse" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* Language Selector for Speech */}
            <div className="flex items-center gap-1 bg-slate-100/80 rounded-lg p-0.5 text-[11px] border border-slate-200">
              <Globe className="w-3 h-3 text-slate-400 ml-1.5" />
              {(['auto', 'en', 'kn', 'hi'] as SpokenLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setMicLanguage(lang)
                    if (isListeningMic) {
                      voiceService.stopListening()
                      setIsListeningMic(false)
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                    micLanguage === lang
                      ? 'bg-white text-[#6658FF] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Set speech language to ${lang === 'auto' ? 'Automatic Detection' : lang === 'en' ? 'English' : lang === 'kn' ? 'Kannada' : 'Hindi'}`}
                >
                  {lang === 'auto' ? 'Auto' : lang === 'en' ? 'EN' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिंदी'}
                </button>
              ))}
            </div>

            {/* Real-Time Voice Mode Button */}
            <button
              type="button"
              aria-label="Open Real-Time Voice Mode"
              onClick={onOpenVoiceMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#6658FF] bg-[#6658FF]/10 hover:bg-[#6658FF]/20 border border-[#6658FF]/20 transition-all cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658FF]"
              title="Launch Real-Time Voice Intelligence Workspace"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Mode</span>
            </button>
          </div>

          {/* Right tool: Send Button */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[10px] text-slate-500">
              Enter to send • Shift+Enter for new line
            </span>
            <button
              type="button"
              aria-label="Send message to AI Mentor"
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || isGenerating}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658FF] ${
                (!text.trim() && attachments.length === 0) || isGenerating
                  ? 'bg-slate-300 cursor-not-allowed text-slate-600'
                  : 'bg-[#6658FF] hover:bg-[#5546FF] shadow-sm hover:shadow-md cursor-pointer active:scale-95'
              }`}
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Academic Disclaimer Microcopy */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-600 text-center">
        <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
        <span>
          AI can make mistakes. Verify important academic citations, algorithms, and consult your faculty guide.
        </span>
      </div>
    </div>
  )
}

export default MessageComposer
