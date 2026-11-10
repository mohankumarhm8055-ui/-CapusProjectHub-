import React, { useState } from 'react'
import { X, Send, Sparkles, CheckCircle2, AlertCircle, Shield } from 'lucide-react'
import { connectionService } from '../../services/connectionService'
import type { MentorshipPurpose } from '../../services/connectionService'

interface RequestGuidanceModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
  seniorId: string
  seniorName: string
  initialNote?: string
  initialPurpose?: MentorshipPurpose
  onSuccess?: () => void
}

const PURPOSES: { value: MentorshipPurpose; label: string; desc: string }[] = [
  {
    value: 'UNDERSTAND_ARCHITECTURE',
    label: 'Understand System Architecture & Schemas',
    desc: 'Clarify high-level design, database relationships, and component interactions.',
  },
  {
    value: 'LEARN_TECH_STACK',
    label: 'Learn Tech Stack & Implementation Details',
    desc: 'Inquire about library choices, deployment pitfalls, and frameworks.',
  },
  {
    value: 'DISCUSS_EXTENSION',
    label: 'Discuss Project Extension / Collaboration',
    desc: 'Explore building upon this benchmark project for your semester capstone.',
  },
  {
    value: 'UNDERSTAND_PROJECT',
    label: 'Understand Project Concept & Scope',
    desc: 'Discuss the problem statement, user workflows, and core features.',
  },
  {
    value: 'ACCESS_DOCUMENTATION',
    label: 'Request Guidance on Documentation & Viva',
    desc: 'Learn how the team prepared IEEE reports and handled faculty evaluation questions.',
  },
  {
    value: 'EXPLORE_ENHANCEMENTS',
    label: 'Explore Future Enhancements & Limitations',
    desc: 'Learn about challenges the team faced and unresolved research avenues.',
  },
  {
    value: 'SEEK_MENTORSHIP',
    label: 'Seek General Academic Project Mentorship',
    desc: 'Advice on milestones, task allocation, and engineering standards.',
  },
]

export const RequestGuidanceModal: React.FC<RequestGuidanceModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  seniorId,
  seniorName,
  initialNote = '',
  initialPurpose = 'UNDERSTAND_ARCHITECTURE',
  onSuccess,
}) => {
  const [purpose, setPurpose] = useState<MentorshipPurpose>(initialPurpose)
  const [note, setNote] = useState(initialNote)
  const [agreedEtiquette, setAgreedEtiquette] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  React.useEffect(() => {
    if (isOpen) {
      setNote(initialNote)
      setPurpose(initialPurpose)
      setAgreedEtiquette(false)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialNote, initialPurpose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedEtiquette) {
      setError('Please acknowledge the academic peer communication guidelines before sending.')
      return
    }
    if (note.trim().length < 15) {
      setError('Please write at least 15 characters explaining your learning goal.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await connectionService.createRequest({
        projectId,
        projectTitle,
        seniorId,
        seniorName,
        purpose,
        note: note.trim(),
      })
      setSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit connection request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Senior–Junior Mentorship Request</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight">
            Request Guidance from {seniorName}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-1">
            Regarding: <span className="font-semibold text-slate-700">{projectTitle}</span>
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Mentorship request submitted successfully!</p>
              <p className="text-emerald-700 mt-0.5">
                {seniorName} has been notified. You can track this in your Connections tab.
              </p>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Purpose Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Mentorship Purpose <span className="text-rose-500">*</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as MentorshipPurpose)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6658FF]/30 focus:border-[#6658FF]"
              >
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {PURPOSES.find((p) => p.value === purpose)?.desc}
              </p>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Personal Request Note <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Hello! Our team is studying your architecture and we had a couple of questions about your database schema..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#6658FF]/30 focus:border-[#6658FF]"
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>Minimum 15 characters</span>
                <span>{note.length}/1500</span>
              </div>
            </div>

            {/* Academic Etiquette Note */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Academic Peer Communication Etiquette</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Senior contributors are current students or alumni volunteering their time. Be concise,
                respectful, and specific in your inquiry. Personal phone numbers and private emails
                are withheld to prevent spam.
              </p>
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedEtiquette}
                onChange={(e) => setAgreedEtiquette(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#6658FF] focus:ring-[#6658FF]"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I agree to respectful peer mentorship guidelines. Once accepted, our conversation will be
                conducted through CampusProjectHub's secure in-app messaging channel.
              </span>
            </label>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !agreedEtiquette}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#6658FF] hover:bg-[#5748e6] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Sending Request...' : 'Submit Mentorship Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
