import React, { useEffect, useState } from 'react'
import { X, Crown, Mail, Phone, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react'
import type { TeamMember } from '../types/project'
import { RequestGuidanceModal } from './connections/RequestGuidanceModal'

interface TeamModalProps {
  members: TeamMember[]
  isOpen: boolean
  onClose: () => void
  projectTitle: string
  projectId?: string
}

export const TeamModal: React.FC<TeamModalProps> = ({
  members,
  isOpen,
  onClose,
  projectTitle,
  projectId = 'proj_cph_academic_01',
}) => {
  const [guidanceTarget, setGuidanceTarget] = useState<TeamMember | null>(null)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          aria-label="Close team modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pr-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Capstone Team ({members.length} Members)</span>
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight">
            Project Contributors & Roles
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-1">
            {projectTitle}
          </p>
        </div>

        {/* Members List */}
        <div className="space-y-4">
          {members.map((member, idx) => (
            <div
              key={member.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                member.isLeader
                  ? 'bg-gradient-to-r from-[#6658FF]/5 via-blue-50/40 to-white border-[#6658FF]/30 shadow-xs'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Avatar with Leader Crown */}
                <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={member.profileImage}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                  {member.isLeader && (
                    <span className="absolute bottom-1 right-1 p-1 rounded-md bg-amber-500 text-white shadow-xs">
                      <Crown className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-base sm:text-lg font-bold text-[#0B192C]">
                      {member.name}
                    </h4>
                    {member.isLeader ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300">
                        Team Leader
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                        Member #{idx + 1}
                      </span>
                    )}

                    {member.isAvailableForMentoring === true ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Accepting Mentees</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        <span>Not Opted In</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-[#6658FF]">
                    {member.role}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                    <span>{member.department}</span>
                    <span>•</span>
                    <span>{member.semester}</span>
                  </div>

                  {/* Responsibilities */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Assigned Responsibilities:
                    </p>
                    <ul className="space-y-1">
                      {member.responsibilities.map((resp, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contact Information (Only if explicitly permitted) */}
                  {member.isLeader && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                      {member.showPublicEmail && member.publicEmail && (
                        <a
                          href={`mailto:${member.publicEmail}`}
                          className="inline-flex items-center gap-1.5 text-[#6658FF] hover:underline font-medium"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{member.publicEmail}</span>
                        </a>
                      )}

                      {member.showPublicPhone && member.publicPhone ? (
                        <a
                          href={`tel:${member.publicPhone}`}
                          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{member.publicPhone}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          (Private phone withheld by student privacy preference)
                        </span>
                      )}
                    </div>
                  )}
                  {/* Mentorship Guidance Action */}
                  {member.isAvailableForMentoring === true ? (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Opted into mentorship • Private contact protected until accepted
                      </span>
                      <button
                        onClick={() => setGuidanceTarget(member)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#6658FF] hover:bg-[#5748e6] transition-all shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Request Guidance</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 italic">
                        Author has not opted into mentorship requests for this project.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            CampusProjectHub • Academic Registry
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>

      {/* Structured Guidance Request Modal */}
      {guidanceTarget && (
        <RequestGuidanceModal
          isOpen={!!guidanceTarget}
          onClose={() => setGuidanceTarget(null)}
          projectId={projectId}
          projectTitle={projectTitle}
          seniorId={guidanceTarget.studentId || `senior-${guidanceTarget.name.toLowerCase().replace(/\s+/g, '-')}`}
          seniorName={guidanceTarget.name}
        />
      )}
    </div>
  )
}

export default TeamModal
