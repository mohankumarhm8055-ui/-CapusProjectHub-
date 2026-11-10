import React from 'react'
import { motion } from 'framer-motion'
import { FolderPlus, Users, CodeXml, GraduationCap, ChevronRight, CheckCircle2, ArrowDown } from 'lucide-react'
import SectionHeading from '../components/SectionHeading'

interface StepItem {
  number: string
  stepLabel: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accentColor: string
  bgGlow: string
  highlightBadge: string
}

const steps: StepItem[] = [
  {
    number: '01',
    stepLabel: 'STEP 01',
    title: 'Create Your Project',
    description:
      'Start your academic project by defining its title, objectives, description and technology stack.',
    icon: FolderPlus,
    accentColor: 'text-[#6658FF]',
    bgGlow: 'bg-[#6658FF]/10 border-[#6658FF]/20 group-hover:border-[#6658FF]/40',
    highlightBadge: 'bg-[#6658FF]/10 text-[#6658FF] border-[#6658FF]/20',
  },
  {
    number: '02',
    stepLabel: 'STEP 02',
    title: 'Build Your Team',
    description:
      'Invite teammates, assign responsibilities and organize your project team.',
    icon: Users,
    accentColor: 'text-[#2563EB]',
    bgGlow: 'bg-[#2563EB]/10 border-[#2563EB]/20 group-hover:border-[#2563EB]/40',
    highlightBadge: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  },
  {
    number: '03',
    stepLabel: 'STEP 03',
    title: 'Learn and Develop',
    description:
      'Use AI learning assistance, manage development tasks and receive faculty guidance.',
    icon: CodeXml,
    accentColor: 'text-[#7C3AED]',
    bgGlow: 'bg-[#7C3AED]/10 border-[#7C3AED]/20 group-hover:border-[#7C3AED]/40',
    highlightBadge: 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20',
  },
  {
    number: '04',
    stepLabel: 'STEP 04',
    title: 'Complete and Submit',
    description:
      'Track milestones, upload project documentation and receive evaluation feedback.',
    icon: GraduationCap,
    accentColor: 'text-[#059669]',
    bgGlow: 'bg-[#059669]/10 border-[#059669]/20 group-hover:border-[#059669]/40',
    highlightBadge: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
  },
]

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-32 bg-[#F8FAFC] border-t border-slate-200/80 overflow-hidden"
    >
      {/* Subtle background ambient gradients */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <SectionHeading
          category="WORKFLOW PROCESS"
          title="How It Works"
          subtitle="From your first project idea to successful completion — everything happens in one place."
          centered
        />

        {/* Steps Container */}
        <div className="relative mt-16 sm:mt-20">
          {/* Desktop Horizontal Connecting Line (Runs cleanly through the center line of cards) */}
          <div
            className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[#6658FF]/30 via-[#2563EB]/30 via-[#7C3AED]/30 to-[#059669]/30 pointer-events-none z-0"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-24 animate-[shimmer_3s_infinite_linear]" />
          </div>

          {/* Steps Grid: 4 cols on desktop, 2 cols on tablet, 1 col on mobile with vertical connecting spine */}
          <div className="relative">
            {/* Mobile continuous vertical connector timeline line */}
            <div
              className="block md:hidden absolute left-6 top-8 bottom-8 w-[2px] bg-gradient-to-b from-[#6658FF]/30 via-[#2563EB]/30 via-[#7C3AED]/30 to-[#059669]/30 z-0 pointer-events-none"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10">
              {steps.map((step, idx) => {
                const IconComponent = step.icon

                return (
                  <React.Fragment key={step.number}>
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{
                        duration: 0.55,
                        delay: idx * 0.12,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="group relative flex flex-col justify-between bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(102,88,255,0.08)] hover:border-[#6658FF]/40 transition-all duration-300 hover:-translate-y-1.5"
                    >
                      {/* Step Top Header: Number and Icon Node */}
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          {/* Step Number Badge */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-3xl font-black text-slate-300 group-hover:text-[#6658FF] transition-colors duration-300">
                              {step.number}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md border ${step.highlightBadge}`}
                            >
                              {step.stepLabel}
                            </span>
                          </div>

                          {/* Icon Container with subtle hover bounce/scale */}
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shadow-xs ${step.bgGlow}`}
                          >
                            <IconComponent className={`w-6 h-6 ${step.accentColor}`} />
                          </div>
                        </div>

                        {/* Step Title */}
                        <h3 className="text-lg sm:text-xl font-bold text-[#0B192C] tracking-tight mb-2.5 group-hover:text-[#6658FF] transition-colors duration-200">
                          {step.title}
                        </h3>

                        {/* Step Description */}
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Step Footer with Directional Cue */}
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-[#6658FF] transition-colors">
                        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#6658FF] transition-colors" />
                          Stage {idx + 1} of 4
                        </span>
                        {idx < steps.length - 1 ? (
                          <span className="flex items-center gap-0.5 text-slate-300 group-hover:text-[#6658FF] transition-colors">
                            Next
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Final Delivery
                          </span>
                        )}
                      </div>
                    </motion.div>

                    {/* Mobile inter-card directional cue */}
                    {idx < steps.length - 1 && (
                      <div className="flex md:hidden justify-center items-center -my-3 z-20">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
                          <ArrowDown className="w-3.5 h-3.5 text-[#6658FF]" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
