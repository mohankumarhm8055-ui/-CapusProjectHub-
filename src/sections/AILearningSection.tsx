import React from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Lightbulb,
  Code2,
  FileText,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import AIAssistantPreview from '../components/AIAssistantPreview'

interface CapabilityItem {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
}

const capabilities: CapabilityItem[] = [
  {
    id: 'concept-explanation',
    title: 'Concept Explanation',
    description:
      'Understand programming concepts, algorithms and technical subjects through simple explanations.',
    icon: BookOpen,
    iconColor: 'text-[#6658FF]',
    iconBg: 'bg-[#6658FF]/10 border-[#6658FF]/20',
  },
  {
    id: 'project-guidance',
    title: 'Project Guidance',
    description:
      'Get help with project ideas, problem statements, architecture and implementation planning.',
    icon: Lightbulb,
    iconColor: 'text-[#2563EB]',
    iconBg: 'bg-[#2563EB]/10 border-[#2563EB]/20',
  },
  {
    id: 'technology-learning',
    title: 'Technology Learning',
    description:
      'Understand the technologies and frameworks required for academic projects.',
    icon: Code2,
    iconColor: 'text-[#7C3AED]',
    iconBg: 'bg-[#7C3AED]/10 border-[#7C3AED]/20',
  },
  {
    id: 'documentation-assistance',
    title: 'Documentation Assistance',
    description:
      'Get structured guidance for abstracts, reports and project documentation.',
    icon: FileText,
    iconColor: 'text-[#059669]',
    iconBg: 'bg-[#059669]/10 border-[#059669]/20',
  },
]

interface AILearningSectionProps {
  onExploreClick?: () => void
}

export const AILearningSection: React.FC<AILearningSectionProps> = ({ onExploreClick }) => {
  return (
    <section
      id="ai-assistant"
      className="relative py-24 sm:py-32 bg-[#FAF9FF] border-t border-slate-200/80 overflow-hidden"
    >
      {/* Background Soft Ambient Light */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* LEFT COLUMN: Educational & Capability Narrative (7 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Small uppercase label */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 text-xs font-bold tracking-widest uppercase w-fit"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-POWERED LEARNING</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0B192C] leading-tight"
            >
              Your AI Companion for Academic Projects
            </motion.h2>

            {/* Supporting Paragraph / Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="mt-4 text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl"
            >
              Learn concepts, explore technologies and get intelligent guidance throughout your project journey.
            </motion.p>

            {/* Four Capability Rows */}
            <div className="mt-8 sm:mt-10 space-y-4">
              {capabilities.map((cap, idx) => {
                const Icon = cap.icon

                return (
                  <motion.div
                    key={cap.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{
                      duration: 0.45,
                      delay: 0.18 + idx * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group flex items-start gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/80 hover:border-[#6658FF]/30 shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    {/* Icon Container */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cap.iconBg} group-hover:scale-105 transition-transform duration-200`}
                    >
                      <Icon className={`w-5 h-5 ${cap.iconColor}`} />
                    </div>

                    {/* Capability Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-[#0B192C] tracking-tight group-hover:text-[#6658FF] transition-colors">
                        {cap.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                        {cap.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Action Row: Primary Button & Secondary Text */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.52 }}
              className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
            >
              <button
                onClick={onExploreClick}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm text-white shadow-md hover:shadow-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Explore AI Assistant</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
                <GraduationCap className="w-4 h-4 text-[#6658FF] shrink-0" />
                <span>Designed for student project development.</span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Realistic AI Assistant Chat Interface Preview (5 cols on desktop) */}
          <div className="lg:col-span-5 flex justify-center">
            <AIAssistantPreview onExploreClick={onExploreClick} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AILearningSection
