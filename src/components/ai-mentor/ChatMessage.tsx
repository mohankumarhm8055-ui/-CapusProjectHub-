import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  CornerDownRight,
  Code2,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  Square,
  Loader2,
} from 'lucide-react'
import type { ChatMessage as ChatMessageType, AudioPlaybackSpeed } from '../../types/aiMentor'
import { voiceService } from '../../services/voiceService'

export type FeedbackCategory =
  | 'HELPFUL_RESPONSE'
  | 'INCORRECT_INFORMATION'
  | 'IRRELEVANT_RESPONSE'
  | 'CONFUSING_EXPLANATION'
  | 'MISSING_PROJECT_INFO'

export interface MessageFeedbackPayload {
  rating: 'helpful' | 'needs_improvement'
  category: FeedbackCategory
  comment?: string
}

export interface StoredFeedbackState {
  rating: 'helpful' | 'needs_improvement'
  category: FeedbackCategory
  comment?: string
}

interface ChatMessageProps {
  message: ChatMessageType
  onSelectFollowUp?: (prompt: string) => void
  onRetry?: (message: ChatMessageType) => void
  isOfflineDemo?: boolean
  savedFeedback?: StoredFeedbackState
  onSubmitFeedback?: (messageId: string, payload: MessageFeedbackPayload) => Promise<void> | void
}

// Simple custom markdown renderer tailored for clean academic responses
const renderMarkdownContent = (content: string) => {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockLang = ''
  let codeBlockLines: string[] = []
  let tableRows: string[][] = []
  let inTable = false

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length === 0) return null
    const header = tableRows[0]
    const body = tableRows.slice(1).filter((row) => !row.every((cell) => cell.includes('---')))

    const tableNode = (
      <div key={`${keyPrefix}-table`} className="my-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              {header.map((cell, cIdx) => (
                <th key={cIdx} className="px-3.5 py-2">
                  {renderInlineFormatting(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2">
                    {renderInlineFormatting(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []
    inTable = false
    return tableNode
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block start / end
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        if (inTable) {
          const tNode = flushTable(`table-${i}`)
          if (tNode) elements.push(tNode)
        }
        inCodeBlock = true
        codeBlockLang = line.trim().replace(/^```/, '') || 'code'
        codeBlockLines = []
      } else {
        inCodeBlock = false
        const codeText = codeBlockLines.join('\n')
        elements.push(
          <CodeBlockView
            key={`code-${i}`}
            code={codeText}
            language={codeBlockLang}
          />
        )
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Markdown Table handling
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
      tableRows.push(cells)
      continue
    } else if (inTable) {
      const tNode = flushTable(`table-${i}`)
      if (tNode) elements.push(tNode)
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base sm:text-lg font-bold text-[#0B192C] mt-4 mb-2 tracking-tight">
          {renderInlineFormatting(line.replace('### ', ''))}
        </h3>
      )
      continue
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm sm:text-base font-bold text-slate-800 mt-3 mb-1.5">
          {renderInlineFormatting(line.replace('#### ', ''))}
        </h4>
      )
      continue
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200" />)
      continue
    }

    // Callout / Blockquote lines
    if (line.trim().startsWith('> ')) {
      elements.push(
        <blockquote key={`bq-${i}`} className="my-2 pl-3 py-1.5 pr-2 border-l-2 border-[#6658FF] bg-slate-50 rounded-r-lg text-xs sm:text-sm text-slate-700 leading-relaxed">
          {renderInlineFormatting(line.trim().substring(2))}
        </blockquote>
      )
      continue
    }

    // Bullet list items
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-xs sm:text-sm text-slate-700 my-1 leading-relaxed">
          {renderInlineFormatting(line.trim().substring(2))}
        </li>
      )
      continue
    }

    // Numbered list items
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 my-1.5 leading-relaxed">
          <span className="font-bold text-[#6658FF] min-w-[1.2rem]">{numMatch[1]}.</span>
          <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
        </div>
      )
      continue
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="h-2" />)
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-1">
        {renderInlineFormatting(line)}
      </p>
    )
  }

  // Flush trailing table if any
  if (inTable) {
    const tNode = flushTable(`table-end`)
    if (tNode) elements.push(tNode)
  }

  return elements
}

// Inline formatting parser for [links](url), **bold**, *italic*, and `code`
const renderInlineFormatting = (text: string) => {
  const parts: React.ReactNode[] = []
  let cursor = 0
  const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(text.substring(cursor, match.index))
    }
    const token = match[0]
    if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        const [, label, href] = linkMatch
        const isSafeInternal = href.startsWith('/')
        const isSafeExternal = href.startsWith('https://') || href.startsWith('http://')
        if (isSafeInternal || isSafeExternal) {
          parts.push(
            <a
              key={match.index}
              href={href}
              {...(isSafeExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="text-[#6658FF] hover:text-[#4F46E5] underline underline-offset-2 font-semibold"
            >
              {label}
            </a>
          )
        } else {
          parts.push(label)
        }
      } else {
        parts.push(token)
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-100 text-[#6658FF] font-mono text-[11px] sm:text-xs border border-slate-200">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      )
    }
    cursor = regex.lastIndex
  }

  if (cursor < text.length) {
    parts.push(text.substring(cursor))
  }

  return parts.length > 0 ? parts : text
}

// Dedicated Code Block component with Copy button
const CodeBlockView: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#0F172A] text-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Code2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSelectFollowUp,
  onRetry,
  isOfflineDemo = false,
  savedFeedback,
  onSubmitFeedback,
}) => {
  const [copiedResponse, setCopiedResponse] = useState(false)
  const [localFeedback, setLocalFeedback] = useState<'liked' | 'disliked' | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>(
    savedFeedback?.category && savedFeedback.category !== 'HELPFUL_RESPONSE'
      ? savedFeedback.category
      : 'CONFUSING_EXPLANATION'
  )
  const [feedbackComment, setFeedbackComment] = useState(savedFeedback?.comment || '')
  const [feedbackSavedNotice, setFeedbackSavedNotice] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isPausedAudio, setIsPausedAudio] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState<AudioPlaybackSpeed>(1)

  const feedback: 'liked' | 'disliked' | null =
    localFeedback ??
    (savedFeedback?.rating === 'helpful'
      ? 'liked'
      : savedFeedback?.rating === 'needs_improvement'
      ? 'disliked'
      : null)

  const isAssistant = message.role === 'assistant'

  const handleHelpfulClick = async () => {
    setLocalFeedback('liked')
    setShowFeedbackForm(false)
    if (onSubmitFeedback) {
      await onSubmitFeedback(message.id, {
        rating: 'helpful',
        category: 'HELPFUL_RESPONSE',
      })
      setFeedbackSavedNotice(true)
      setTimeout(() => setFeedbackSavedNotice(false), 2000)
    }
  }

  const handleNeedsImprovementClick = async () => {
    setLocalFeedback('disliked')
    setShowFeedbackForm((prev) => !prev)
  }

  const handleSubmitNegativeFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmitFeedback) {
      await onSubmitFeedback(message.id, {
        rating: 'needs_improvement',
        category: feedbackCategory,
        comment: feedbackComment.trim() || undefined,
      })
    }
    setShowFeedbackForm(false)
    setFeedbackSavedNotice(true)
    setTimeout(() => setFeedbackSavedNotice(false), 2500)
  }

  // Clean audio resources if this message unmounts
  useEffect(() => {
    return () => {
      if (voiceService.getPlayingMessageId() === message.id) {
        voiceService.stopSpeech()
      }
    }
  }, [message.id])

  const handleTogglePlayAudio = () => {
    setAudioError(null)

    if (isPlayingAudio) {
      if (isPausedAudio) {
        voiceService.resumeSpeech()
        setIsPausedAudio(false)
      } else {
        voiceService.pauseSpeech()
        setIsPausedAudio(true)
      }
      return
    }

    setIsLoadingAudio(true)

    voiceService.speak(message.id, message.content, {
      speed: playbackSpeed,
      onStart: () => {
        setIsLoadingAudio(false)
        setIsPlayingAudio(true)
        setIsPausedAudio(false)
      },
      onEnd: () => {
        setIsLoadingAudio(false)
        setIsPlayingAudio(false)
        setIsPausedAudio(false)
      },
      onError: (err) => {
        setIsLoadingAudio(false)
        setIsPlayingAudio(false)
        setIsPausedAudio(false)
        setAudioError(err || 'Failed to play voice audio')
      },
    })
  }

  const handleStopAudio = () => {
    voiceService.stopSpeech()
    setIsLoadingAudio(false)
    setIsPlayingAudio(false)
    setIsPausedAudio(false)
  }

  const handleReplayAudio = () => {
    handleStopAudio()
    setTimeout(() => {
      handleTogglePlayAudio()
    }, 100)
  }

  const handleChangeSpeed = (newSpeed: AudioPlaybackSpeed) => {
    setPlaybackSpeed(newSpeed)
    if (isPlayingAudio && !isPausedAudio) {
      voiceService.speak(message.id, message.content, {
        speed: newSpeed,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
      })
    }
  }

  const handleCopyResponse = () => {
    navigator.clipboard?.writeText(message.content)
    setCopiedResponse(true)
    setTimeout(() => setCopiedResponse(false), 2000)
  }

  if (!isAssistant) {
    // User / Student Message
    return (
      <div className="flex justify-end my-4 animate-in fade-in duration-200">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="bg-[#6658FF] text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-md">
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
              {message.content}
            </p>
            <div className="mt-1 text-right">
              <span className="text-[10px] text-white/70">{message.timestamp}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 ring-2 ring-white shadow-xs">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    )
  }

  // AI Assistant / Mentor Message
  return (
    <div className="flex justify-start my-6 animate-in fade-in duration-200">
      <div className="flex items-start gap-3.5 max-w-3xl w-full">
        {/* Mentor Avatar */}
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6658FF] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-indigo-100">
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Message Content Container */}
        <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-5 shadow-xs">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0B192C]">
                AI Project Mentor
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Academic Guide
              </span>
              {isOfflineDemo && (
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  Offline Demo
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">{message.timestamp}</span>
          </div>

          {/* Formatted Markdown Body */}
          {message.status === 'failed' ? (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Failed to complete generation. Connection or provider timeout occurred.</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  aria-label="Retry failed mentor response"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          ) : (
            <div className="prose-slate">{renderMarkdownContent(message.content)}</div>
          )}

          {/* Action Bar (Copy, Feedback, Audio) */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleCopyResponse}
                aria-label="Copy entire mentor response"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658FF]"
                title="Copy entire response"
              >
                {copiedResponse ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copied response</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <div className="h-3 w-px bg-slate-200 mx-1" aria-hidden="true" />

              <button
                type="button"
                onClick={handleHelpfulClick}
                aria-label="Mark response as helpful"
                aria-pressed={feedback === 'liked'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  feedback === 'liked'
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Helpful response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNeedsImprovementClick}
                aria-label="Report issue with response (optional feedback)"
                aria-pressed={feedback === 'disliked'}
                aria-expanded={showFeedbackForm}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  feedback === 'disliked'
                    ? 'text-rose-700 bg-rose-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Report response issue (optional)"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              {feedbackSavedNotice && (
                <span className="text-[11px] font-medium text-emerald-700 ml-1" role="status">
                  Feedback saved
                </span>
              )}

              <div className="h-3 w-px bg-slate-200 mx-1" />

              {/* Feature B: AI Response Audio Controls */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handleTogglePlayAudio}
                  disabled={isLoadingAudio}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                    isLoadingAudio
                      ? 'bg-slate-200 text-slate-500 cursor-wait'
                      : isPlayingAudio && !isPausedAudio
                      ? 'bg-[#6658FF] text-white shadow-xs'
                      : isPausedAudio
                      ? 'bg-amber-100 text-amber-800'
                      : audioError
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:text-[#6658FF] hover:bg-slate-200/60'
                  }`}
                  title={
                    isLoadingAudio
                      ? 'Synthesizing voice audio...'
                      : audioError
                      ? `Voice error: ${audioError}. Click to retry.`
                      : isPlayingAudio
                      ? isPausedAudio
                        ? 'Resume voice audio'
                        : 'Pause voice audio'
                      : 'Play AI response audio'
                  }
                >
                  {isLoadingAudio ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-[#6658FF]" />
                      <span>Loading...</span>
                    </>
                  ) : isPlayingAudio && !isPausedAudio ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </>
                  ) : isPausedAudio ? (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </>
                  )}
                </button>

                {isPlayingAudio && (
                  <>
                    <button
                      type="button"
                      onClick={handleStopAudio}
                      aria-label="Stop audio playback"
                      className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                      title="Stop audio playback"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={handleReplayAudio}
                      aria-label="Replay audio from start"
                      className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                      title="Replay from start"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}

                {/* Playback Speed selector: 0.75x, 1x, 1.25x, 1.5x */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => handleChangeSpeed(parseFloat(e.target.value) as AudioPlaybackSpeed)}
                  aria-label="Audio playback speed"
                  className="text-[10px] font-bold text-slate-600 bg-transparent py-0.5 px-1 rounded hover:bg-slate-200 cursor-pointer focus:outline-none"
                  title="Playback speed"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              {isOfflineDemo
                ? 'Offline Demo Preview • Connect backend for live repository records'
                : 'Repository-grounded guidance • Verify citations with your faculty guide'}
            </span>
          </div>

          {/* Optional Lightweight Student Feedback Drawer */}
          {showFeedbackForm && (
            <form
              onSubmit={handleSubmitNegativeFeedback}
              aria-label="Optional response feedback form"
              className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">What could be improved? (Optional)</span>
                <button
                  type="button"
                  onClick={() => setShowFeedbackForm(false)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Skip
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Issue category">
                {(
                  [
                    ['INCORRECT_INFORMATION', 'Incorrect information'],
                    ['IRRELEVANT_RESPONSE', 'Irrelevant response'],
                    ['CONFUSING_EXPLANATION', 'Confusing explanation'],
                    ['MISSING_PROJECT_INFO', 'Missing project information'],
                  ] as const
                ).map(([cat, label]) => (
                  <button
                    key={cat}
                    type="button"
                    role="radio"
                    aria-checked={feedbackCategory === cat}
                    onClick={() => setFeedbackCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                      feedbackCategory === cat
                        ? 'bg-[#6658FF] text-white border-[#6658FF]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-[#6658FF]/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  maxLength={300}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Optional note (no personal info needed)..."
                  aria-label="Optional feedback note"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#6658FF]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#6658FF] hover:bg-[#5546FF] text-white font-semibold text-[11px] cursor-pointer shrink-0"
                >
                  Submit Feedback
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Optional feedback helps reviewers improve clarity; it is never automatically treated as verified training data.
              </p>
            </form>
          )}

          {/* Suggested Follow-Up Prompts */}
          {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CornerDownRight className="w-3 h-3 text-[#6658FF]" />
                Suggested Next Steps:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {message.suggestedFollowUps.map((followUp, fIdx) => (
                  <button
                    key={fIdx}
                    onClick={() => onSelectFollowUp?.(followUp)}
                    className="text-left text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#6658FF]/10 text-slate-700 hover:text-[#6658FF] border border-slate-200 hover:border-[#6658FF]/30 transition-all cursor-pointer font-medium"
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
