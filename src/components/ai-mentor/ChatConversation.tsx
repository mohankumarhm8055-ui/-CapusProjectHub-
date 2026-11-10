import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Square, ArrowDown } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../../types/aiMentor'
import ChatMessage, { type MessageFeedbackPayload, type StoredFeedbackState } from './ChatMessage'

interface ChatConversationProps {
  messages: ChatMessageType[]
  isGenerating: boolean
  onStopGeneration: () => void
  onSelectFollowUp: (prompt: string) => void
  onRetry?: (message: ChatMessageType) => void
  isOfflineDemo?: boolean
  feedbackByMessageId?: Record<string, StoredFeedbackState>
  onSubmitFeedback?: (messageId: string, payload: MessageFeedbackPayload) => Promise<void> | void
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  messages,
  isGenerating,
  onStopGeneration,
  onSelectFollowUp,
  onRetry,
  isOfflineDemo = false,
  feedbackByMessageId,
  onSubmitFeedback,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollBottom, setShowScrollBottom] = React.useState(false)

  // Auto-scroll to bottom whenever messages or isGenerating changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isUp = scrollHeight - scrollTop - clientHeight > 150
    setShowScrollBottom(isUp)
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full relative"
    >
      {/* Messages Stream */}
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onSelectFollowUp={onSelectFollowUp}
          onRetry={onRetry}
          isOfflineDemo={isOfflineDemo}
          savedFeedback={feedbackByMessageId?.[message.id]}
          onSubmitFeedback={onSubmitFeedback}
        />
      ))}

      {/* Mentor Thinking / Generating State */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3.5 my-6 max-w-3xl"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6658FF] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 shadow-xs flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6658FF] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce" />
            </div>
            <span className="text-xs font-semibold text-slate-700">
              AI Mentor is analyzing your project requirements...
            </span>

            <button
              onClick={onStopGeneration}
              className="ml-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Stop generating response"
            >
              <Square className="w-3 h-3 fill-rose-600" />
              <span>Stop</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Anchor for auto scroll */}
      <div ref={bottomRef} className="h-4" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Scroll to latest</span>
        </button>
      )}
    </div>
  )
}

export default ChatConversation
