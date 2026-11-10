import React from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  GraduationCap,
  Sparkles,
  Users,
  Check,
  AlertCircle,
  Plus,
} from 'lucide-react'

export const TeamWorkspacePreview: React.FC = () => {
  const teamMembers = [
    {
      name: 'Aarav Sharma',
      role: 'Team Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isLeader: true,
    },
    {
      name: 'Priya Patel',
      role: 'Frontend Eng.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      isLeader: false,
    },
    {
      name: 'Rohan Verma',
      role: 'Backend Eng.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      isLeader: false,
    },
    {
      name: 'Sneha Kulkarni',
      role: 'UI/UX Designer',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      isLeader: false,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl bg-white border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(102,88,255,0.12)] p-4 sm:p-6 lg:p-7 overflow-hidden text-slate-800"
    >
      {/* Decorative Subtle Ambient Corner Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#6658FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Project Title & Status */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center shrink-0 shadow-xs font-bold text-base">
            <Users className="w-5 h-5 text-[#6658FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base sm:text-lg font-black tracking-tight text-[#0B192C]">
                Campus Management System
              </h4>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6658FF] animate-pulse" />
                Active Sprint 3
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              CS Capstone • Semester 7 • 4 Collaborators
            </p>
          </div>
        </div>

        {/* Right: Team Avatars with Leader Indicator */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex -space-x-2.5 overflow-visible">
            {teamMembers.map((m) => (
              <div
                key={m.name}
                className="relative group cursor-pointer"
                title={`${m.name} (${m.role})${m.isLeader ? ' — Team Leader' : ''}`}
              >
                <img
                  src={m.avatar}
                  alt={m.name}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ${
                    m.isLeader ? 'ring-[#6658FF] ring-offset-1' : 'ring-white'
                  }`}
                />
                {m.isLeader && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-xs"
                    title="Team Leader"
                  >
                    <Crown className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
            <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Aarav (Lead)
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Upcoming Deadline Sub-Bar */}
      <div className="pt-4 pb-4 grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-center">
        {/* Progress Bar (7 cols) */}
        <div className="sm:col-span-7 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6658FF]" />
              <span>Sprint Milestone Progress</span>
            </span>
            <span className="font-mono font-bold text-[#6658FF]">68% Complete</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '68%' }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-gradient-to-r from-[#2563EB] via-[#6658FF] to-[#8B5CF6] rounded-full"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
            <span>17 of 25 tasks completed</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> On Track
            </span>
          </div>
        </div>

        {/* Upcoming Deadline Card (5 cols) */}
        <div className="sm:col-span-5 bg-gradient-to-br from-amber-50/80 to-amber-50/30 rounded-2xl p-3 border border-amber-200/70 flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Upcoming Deadline
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
            <p className="text-xs font-bold text-slate-800 truncate">
              Sprint 3 Faculty Review
            </p>
            <p className="text-[11px] text-amber-900/80 font-medium">
              Nov 18, 2026 (7 days remaining)
            </p>
          </div>
        </div>
      </div>

      {/* Faculty Feedback Notification Alert */}
      <div className="mb-5 p-3 sm:p-3.5 rounded-2xl bg-[#6658FF]/5 border border-[#6658FF]/20 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center shrink-0 mt-0.5">
          <GraduationCap className="w-4 h-4 text-[#6658FF]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#0B192C] flex items-center gap-1.5">
              <span>Dr. Radhika Sen</span>
              <span className="text-[10px] font-semibold text-slate-500">• Faculty Supervisor</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">2h ago</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            <span className="font-semibold text-[#6658FF]">Milestone 2 Approved:</span> "Excellent relational schema design and indexing. Proceed with the JWT token refresh and role middleware implementation."
          </p>
        </div>
      </div>

      {/* Task Board Columns: To Do, In Progress, Completed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Column 1: To Do */}
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                To Do
              </h5>
              <span className="w-4 h-4 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              aria-label="Add To Do task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Card 1 */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-[#6658FF]/40 hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                  Security
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Nov 16</span>
              </div>
              <h6 className="text-xs font-bold text-slate-800 group-hover:text-[#6658FF] transition-colors leading-snug">
                Audit API Rate Limiting & Auth Tokens
              </h6>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt="Rohan Verma"
                    className="w-4 h-4 rounded-full object-cover"
                    title="Rohan Verma"
                  />
                  <span className="text-[10px] font-medium text-slate-600">Rohan V.</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400">1/3 subtasks</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-[#6658FF]/40 hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Documentation
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Nov 17</span>
              </div>
              <h6 className="text-xs font-bold text-slate-800 group-hover:text-[#6658FF] transition-colors leading-snug">
                Format IEEE Project Report Chapter 4
              </h6>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80"
                    alt="Sneha Kulkarni"
                    className="w-4 h-4 rounded-full object-cover"
                    title="Sneha Kulkarni"
                  />
                  <span className="text-[10px] font-medium text-slate-600">Sneha K.</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400">0/2 subtasks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6658FF] animate-pulse" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                In Progress
              </h5>
              <span className="w-4 h-4 rounded-full bg-[#6658FF]/15 text-[#6658FF] text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              aria-label="Add In Progress task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Card 1 */}
            <div className="p-3 bg-white rounded-xl border-2 border-[#6658FF]/30 shadow-xs hover:border-[#6658FF] hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20">
                  Backend API
                </span>
                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> High
                </span>
              </div>
              <h6 className="text-xs font-bold text-slate-800 group-hover:text-[#6658FF] transition-colors leading-snug">
                Integrate Faculty Feedback on JWT Middleware
              </h6>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                      alt="Aarav Sharma"
                      className="w-4 h-4 rounded-full object-cover ring-1 ring-[#6658FF]"
                      title="Aarav Sharma (Team Leader)"
                    />
                    <Crown className="w-2 h-2 text-amber-500 fill-amber-500 absolute -top-1 -right-1" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Aarav S.</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#6658FF]">4/5 subtasks</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-[#6658FF]/40 hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  UI/UX
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Nov 15</span>
              </div>
              <h6 className="text-xs font-bold text-slate-800 group-hover:text-[#6658FF] transition-colors leading-snug">
                Attendance Dashboard Student View Components
              </h6>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                    alt="Priya Patel"
                    className="w-4 h-4 rounded-full object-cover"
                    title="Priya Patel"
                  />
                  <span className="text-[10px] font-medium text-slate-600">Priya P.</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400">3/4 subtasks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Completed
              </h5>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>

          <div className="space-y-2.5">
            {/* Card 1 */}
            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/60 shadow-xs hover:border-emerald-400 transition-all group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Database
                </span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Guide Approved
                </span>
              </div>
              <h6 className="text-xs font-bold text-slate-700 line-through decoration-slate-300 leading-snug">
                PostgreSQL Schema Definition & Entity Relations
              </h6>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt="Rohan Verma"
                    className="w-4 h-4 rounded-full object-cover"
                    title="Rohan Verma"
                  />
                  <span className="text-[10px] font-medium text-slate-500">Rohan V.</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600">4/4 done</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/60 shadow-xs hover:border-emerald-400 transition-all group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Planning
                </span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              </div>
              <h6 className="text-xs font-bold text-slate-700 line-through decoration-slate-300 leading-snug">
                SRS Requirement Specification Document
              </h6>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Aarav Sharma"
                    className="w-4 h-4 rounded-full object-cover"
                    title="Aarav Sharma"
                  />
                  <span className="text-[10px] font-medium text-slate-500">All Team</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600">6/6 done</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Subtle Preview Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Interactive Workspace UI Preview</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Calendar className="w-3 h-3" />
          <span>Demo Data • CampusProjectHub 2026</span>
        </div>
      </div>
    </motion.div>
  )
}

export default TeamWorkspacePreview
