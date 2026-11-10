import React from 'react'
import { motion } from 'framer-motion'
import {
  Compass,
  Sparkles,
  CheckSquare,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Lightbulb,
} from 'lucide-react'
import type { SuggestionCard } from '../../types/aiMentor'
import { DEFAULT_SUGGESTION_CARDS } from '../../services/aiMentorService'

interface WelcomeScreenProps {
  onSelectSuggestion: (prompt: string, title: string) => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion }) => {
  const getIcon = (name: SuggestionCard['iconName']) => {
    switch (name) {
      case 'Compass':
        return <Compass className="w-5 h-5 text-[#6658FF]" />
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-[#2563EB]" />
      case 'CheckSquare':
        return <CheckSquare className="w-5 h-5 text-[#059669]" />
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-[#7C3AED]" />
    }
  }

  const getBadgeColor = (name: SuggestionCard['iconName']) => {
    switch (name) {
      case 'Compass':
        return 'bg-[#6658FF]/10 text-[#6658FF] border-[#6658FF]/20'
      case 'Sparkles':
        return 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20'
      case 'CheckSquare':
        return 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
      case 'BookOpen':
        return 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20'
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-5xl mx-auto w-full">
      {/* Top Academic Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 shadow-xs mb-4"
      >
        <GraduationCap className="w-4 h-4" />
        <span>HONEST ACADEMIC PROJECT GUIDE</span>
      </motion.div>

      {/* Main Heading & Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-center max-w-2xl mb-8 sm:mb-12"
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B192C] tracking-tight font-serif leading-tight">
          What are we building today?
        </h1>
        <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed">
          I'm your AI Project Mentor. Let's discover existing projects, evaluate your ideas, and build something meaningful.
        </p>
      </motion.div>

      {/* 4 Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
        {DEFAULT_SUGGESTION_CARDS.map((card, idx) => {
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + idx * 0.08 }}
              onClick={() => onSelectSuggestion(card.prompt, card.title)}
              className="group relative flex flex-col text-left p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-[#6658FF]/50 shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="flex items-center justify-between mb-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {getIcon(card.iconName)}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeColor(
                    card.iconName
                  )}`}
                >
                  {card.category}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#0B192C] group-hover:text-[#6658FF] transition-colors mb-1.5 flex items-center justify-between">
                <span>{card.title}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                {card.description}
              </p>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 group-hover:text-[#6658FF] transition-colors">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{card.badgeText}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Trust & Academic Rigor Footer Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 text-center max-w-xl"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Faculty-Aligned Feedback:</strong> Responses adhere to standard capstone rubrics, ethical citations, and anti-plagiarism guidelines.
        </span>
      </motion.div>
    </div>
  )
}

export default WelcomeScreen
