import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Bot,
  Send,
  User,
  Copy,
  Check,
  RotateCcw,
  Code2,
  BookOpen,
  Boxes,
  HelpCircle,
} from 'lucide-react'

interface SuggestedPrompt {
  id: string
  text: string
  icon: React.ComponentType<{ className?: string }>
  studentText: string
  aiResponse: string
}

const suggestedPrompts: SuggestedPrompt[] = [
  {
    id: 'plan',
    text: 'Help me plan my project',
    icon: HelpCircle,
    studentText: 'How should I start building a college project management system?',
    aiResponse:
      'Start by identifying the main users: students, faculty and administrators. Then define the project creation, task management, collaboration and approval workflows.',
  },
  {
    id: 'tech',
    text: 'Explain a technology',
    icon: BookOpen,
    studentText: 'Can you explain why React with TypeScript is ideal for academic web projects?',
    aiResponse:
      'React provides reusable component architecture for complex dashboards, while TypeScript introduces static typing to prevent runtime bugs and simplify team collaboration.',
  },
  {
    id: 'arch',
    text: 'Understand system architecture',
    icon: Boxes,
    studentText: 'What architecture pattern should we follow for our team project?',
    aiResponse:
      'A 3-tier modular architecture works best: a Vite/React client for responsive UI, RESTful Node.js APIs for business logic, and a structured database with automated milestone tracking.',
  },
]

interface AIAssistantPreviewProps {
  onExploreClick?: () => void
}

export const AIAssistantPreview: React.FC<AIAssistantPreviewProps> = ({ onExploreClick }) => {
  const [activePromptIndex, setActivePromptIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const activePrompt = suggestedPrompts[activePromptIndex]

  const handleCopy = () => {
    navigator.clipboard?.writeText(activePrompt.aiResponse)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSelectPrompt = (index: number) => {
    setActivePromptIndex(index)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onExploreClick) {
      onExploreClick()
    }
  }

  return (
    <motion.div
      id="ai-assistant-preview"
      initial={{ opacity: 0, scale: 0.96, y: 24 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-xl mx-auto lg:max-w-none"
    >
      {/* Background Soft Aura */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-[#6658FF]/20 via-[#4F46E5]/15 to-[#2563EB]/20 rounded-[2.5rem] blur-xl opacity-70 pointer-events-none" />

      {/* Main Chat Interface Container */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_rgba(102,88,255,0.08)] overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* AI Avatar Icon */}
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#6658FF] p-0.5 shadow-sm flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-400/50" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm sm:text-base text-[#0B192C] tracking-tight">
                  Campus AI
                </h4>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Academic v2
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Project Learning Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActivePromptIndex(0)}
              title="Reset conversation"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Online
            </div>
          </div>
        </div>

        {/* Conversation Body */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 bg-gradient-to-b from-[#FAF9FF]/40 to-white min-h-[290px] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Student Message */}
            <div className="flex items-start gap-3 justify-end">
              <div className="max-w-[85%] sm:max-w-[80%] bg-[#6658FF] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-xs shadow-sm shadow-[#6658FF]/20">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80 mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Student</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed font-medium">
                  {activePrompt.studentText}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            </div>

            {/* Campus AI Response */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#6658FF] flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>

              <div className="max-w-[90%] sm:max-w-[85%] bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl rounded-tl-xs shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6658FF]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Campus AI Guidance</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#6658FF] transition-colors p-1 rounded-md hover:bg-slate-50 cursor-pointer"
                    title="Copy response"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {activePrompt.aiResponse}
                </p>

                {/* Subtle AI Context Badge */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3 h-3 text-blue-500" />
                    Project Architecture Advice
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-semibold">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Three Suggested Prompts */}
          <div className="pt-2">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#6658FF]" />
              <span>Suggested Prompts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, idx) => {
                const Icon = prompt.icon
                const isActive = idx === activePromptIndex

                return (
                  <button
                    key={prompt.id}
                    onClick={() => handleSelectPrompt(idx)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${
                      isActive
                        ? 'bg-[#6658FF]/10 text-[#6658FF] border-[#6658FF]/30 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#6658FF]/40 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#6658FF]' : 'text-slate-400'}`} />
                    <span>{prompt.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Message Input Preview Bar */}
        <div className="p-3 sm:p-4 bg-slate-50/90 border-t border-slate-100">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Campus AI about your project..."
                className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6658FF]/40 focus:border-[#6658FF] placeholder:text-slate-400 shadow-xs"
              />
            </div>

            <button
              type="submit"
              className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#6658FF] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:from-[#1D4ED8] hover:to-[#5546FF] transition-all cursor-pointer shrink-0"
              title="Send prompt preview"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Micro Disclaimer Text */}
          <p className="mt-2 text-center text-[11px] text-slate-400 font-medium">
            Campus AI provides structured learning guidance for undergraduate projects.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default AIAssistantPreview
