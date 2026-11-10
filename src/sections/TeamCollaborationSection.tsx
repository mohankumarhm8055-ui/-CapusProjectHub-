import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  ClipboardList,
  ChartNoAxesCombined,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import TeamWorkspacePreview from '../components/TeamWorkspacePreview'

interface TeamCollaborationSectionProps {
  onStartProjectClick?: () => void
}

const COLLABORATION_FEATURES = [
  {
    id: 'team-formation',
    title: 'Team Formation',
    description: 'Create project teams, invite students and assign roles.',
    icon: Users,
    iconColor: 'text-[#6658FF]',
    iconBg: 'bg-[#6658FF]/10',
    borderColor: 'group-hover:border-[#6658FF]/40',
  },
  {
    id: 'task-allocation',
    title: 'Task Allocation',
    description: 'Assign responsibilities, establish deadlines and track tasks.',
    icon: ClipboardList,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
    borderColor: 'group-hover:border-blue-500/40',
  },
  {
    id: 'progress-monitoring',
    title: 'Progress Monitoring',
    description: 'Track milestones, monitor completion and identify pending work.',
    icon: ChartNoAxesCombined,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-500/10',
    borderColor: 'group-hover:border-indigo-500/40',
  },
  {
    id: 'faculty-collaboration',
    title: 'Faculty Collaboration',
    description: 'Share updates and receive guidance from faculty supervisors.',
    icon: GraduationCap,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-500/10',
    borderColor: 'group-hover:border-purple-500/40',
  },
]

export const TeamCollaborationSection: React.FC<TeamCollaborationSectionProps> = ({
  onStartProjectClick,
}) => {
  return (
    <section
      id="team-collaboration"
      className="relative w-full py-20 sm:py-28 bg-[#FAF9FF] border-t border-slate-200/80 overflow-hidden"
    >
      {/* Subtle Background Glows matching CampusProjectHub palette */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Section Identity, Benefits & CTA (5 cols on lg, 6 cols on xl) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 xl:col-span-5 space-y-7"
          >
            {/* Small uppercase category label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#6658FF]/20 shadow-xs text-xs font-bold text-[#6658FF]">
              <Sparkles className="w-3.5 h-3.5 text-[#6658FF]" />
              <span className="tracking-wider uppercase">Team Collaboration</span>
            </div>

            {/* Large Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#0B192C] leading-[1.12]">
              Better Projects Begin With Better Collaboration.
            </h2>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Bring your team together, organize responsibilities and turn ideas into successful academic projects.
            </p>

            {/* Four Collaboration Benefits in Clean Rows */}
            <div className="pt-2 space-y-3.5">
              {COLLABORATION_FEATURES.map((feature, idx) => {
                const IconComponent = feature.icon
                return (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.45,
                      delay: 0.1 * idx,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`group p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-start gap-3.5 ${feature.borderColor}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-[15px] font-bold text-[#0B192C] group-hover:text-[#6658FF] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* CTA Button: Start Your Project */}
            <div className="pt-2">
              <Link
                to="/signup"
                onClick={onStartProjectClick}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-white shadow-md hover:shadow-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Start Your Project</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Visually Rich Team Workspace Preview (7 cols on lg) */}
          <div className="lg:col-span-7 xl:col-span-7 w-full">
            <TeamWorkspacePreview />
          </div>
        </div>
      </div>
    </section>
  )
}

export default TeamCollaborationSection
