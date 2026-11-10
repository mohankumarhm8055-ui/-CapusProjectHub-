import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { repositoryService, type IdeaComparisonResponse } from '../../services/repositoryService'
import { useNavigate, Link } from 'react-router-dom'
import { RequestGuidanceModal } from '../connections/RequestGuidanceModal'
import { ExternalLink, UserCheck } from 'lucide-react'

interface IdeaSimilarityModalProps {
  isOpen: boolean
  onClose: () => void
  initialTitle?: string
}

export const IdeaSimilarityModal: React.FC<IdeaSimilarityModalProps> = ({
  isOpen,
  onClose,
  initialTitle = '',
}) => {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [technologies, setTechnologies] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<IdeaComparisonResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guidanceTarget, setGuidanceTarget] = useState<{
    projectId: string
    projectTitle: string
    seniorId: string
    seniorName: string
  } | null>(null)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Please provide both a project title and description.')
      return
    }

    try {
      setIsScanning(true)
      setError(null)
      const techArray = technologies
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const result = await repositoryService.compareIdea({
        title: title.trim(),
        description: description.trim(),
        technologies: techArray,
      })
      setScanResult(result)
    } catch (err: any) {
      setError(err.message || 'Failed to complete repository similarity comparison.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleReset = () => {
    setTitle('')
    setDescription('')
    setTechnologies('')
    setScanResult(null)
    setError(null)
  }

  const handleDiscussWithMentor = () => {
    onClose()
    const prompt = title.trim()
      ? `My project idea is ${title.trim()}. ${description.trim()}${technologies.trim() ? ` using ${technologies.trim()}` : ''}`
      : undefined
    navigate('/ai-mentor', prompt ? { state: { initialPrompt: prompt, title: title.trim() } } : undefined)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">AI Project Idea Similarity Scanner</h2>
                <p className="text-xs text-indigo-200/80">
                  Ground your project idea against verified college repository records
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Input Form */}
            <form onSubmit={handleScan} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Proposed Project Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Smart Attendance Management System using Face Recognition"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Core Problem Statement & Solution Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the exact problem your team solves and key planned capabilities..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Planned Technologies (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={technologies}
                  onChange={(e) => setTechnologies(e.target.value)}
                  placeholder="e.g., Python, OpenCV, React, Flask, MongoDB"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Notice: Similarity is evaluated for pedagogical guidance, not automated rejection.
                </span>
                <div className="flex items-center gap-2">
                  {scanResult && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scanning Repository...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        Run Repository Similarity Scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Results Display */}
            {scanResult && (
              <div className="space-y-6">
                {/* Summary Alert */}
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                        Repository Intelligence Analysis:
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-800 font-semibold">
                        {scanResult.summary}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                      Scanned authorized departmental archives. Found {scanResult.matches.length} relevant reference project(s).
                    </p>
                  </div>
                  <button
                    onClick={handleDiscussWithMentor}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    <span>Discuss in AI Mentor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Match Cards */}
                {scanResult.matches.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-800">No Direct Repository Overlap</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Your proposed concept is novel within your college's authorized repository records. You have strong originality potential for capstone defense!
                    </p>
                  </div>
                ) : (
                  scanResult.matches.map((match, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4"
                    >
                      {/* Match Header */}
                      <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Previous Project
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                              {match.classification}
                            </span>
                            <span className="text-xs text-slate-400">
                              (Match: {Math.round(match.overlapConfidence * 100)}%)
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-1">
                            {match.matchedProject.title}
                          </h3>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {match.matchedProject.academicYear} • Dept of {match.matchedProject.department} • Guide: {match.matchedProject.facultyGuide?.name}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {match.sourceAttribution.verificationStatus}
                          </span>
                          <Link
                            to={`/explore-projects/${match.matchedProject.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6658FF] hover:underline"
                          >
                            <span>View Dossier</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Senior Authors & Mentorship Opt-In */}
                      {match.matchedProject.teamMembers && match.matchedProject.teamMembers.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-[#6658FF]" />
                              Contributors:
                            </span>
                            {match.matchedProject.teamMembers.map((member, mIdx) => (
                              <span
                                key={mIdx}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                  member.isAvailableForMentoring
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                              >
                                <span>{member.name}</span>
                                <span className="text-[10px] opacity-80">
                                  ({member.isAvailableForMentoring ? 'Accepting Mentees' : 'Not Opted In'})
                                </span>
                                {member.isAvailableForMentoring && member.studentId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setGuidanceTarget({
                                        projectId: match.matchedProject.id,
                                        projectTitle: match.matchedProject.title,
                                        seniorId: member.studentId!,
                                        seniorName: member.name,
                                      })
                                    }
                                    className="ml-1 px-2 py-0.5 rounded-full bg-[#6658FF] text-white text-[10px] font-bold hover:bg-[#5546FF] cursor-pointer"
                                  >
                                    Draft Request
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Academic Critique */}
                      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          <span>Academic Mentor Critique & Viva Defense Question:</span>
                        </div>
                        <p>{match.pedagogicalCritique}</p>
                      </div>

                      {/* Detailed 4-Dimension Breakdown (Section 5) */}
                      {match.analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          {/* 1. Documented Features */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Actual Documented Features:</span>
                            </div>
                            <ul className="space-y-1 text-slate-600">
                              {match.analysis.documentedFeatures.slice(0, 4).map((f, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-emerald-500 font-bold">•</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 2. Similarities with Your Idea */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Overlaps with Your Proposed Idea:</span>
                            </div>
                            <ul className="space-y-1 text-slate-600">
                              {match.analysis.similaritiesWithIdea.slice(0, 3).map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-indigo-500 font-bold">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 3. Missing or Unknown Information */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Missing / Unknown in Repository:</span>
                            </div>
                            <ul className="space-y-1 text-slate-600">
                              {match.analysis.missingOrUnknownInformation.slice(0, 3).map((m, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-amber-500 font-bold">•</span>
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 4. Improvement Opportunities */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                              <Cpu className="w-3.5 h-3.5 text-purple-600" />
                              <span>Meaningful Improvement Opportunities:</span>
                            </div>
                            <ul className="space-y-1 text-slate-600">
                              {match.analysis.improvementOpportunities.slice(0, 3).map((opp, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-purple-500 font-bold">•</span>
                                  <span>{opp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              CampusProjectHub Repository Intelligence Engine v2.0 • Grounded Evaluation
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>

      {guidanceTarget && (
        <RequestGuidanceModal
          isOpen={!!guidanceTarget}
          onClose={() => setGuidanceTarget(null)}
          projectId={guidanceTarget.projectId}
          projectTitle={guidanceTarget.projectTitle}
          seniorId={guidanceTarget.seniorId}
          seniorName={guidanceTarget.seniorName}
          initialPurpose="DISCUSS_EXTENSION"
          initialNote={`Hello ${guidanceTarget.seniorName}! We found your project "${guidanceTarget.projectTitle}" while exploring related capstones${title.trim() ? ` for our idea "${title.trim()}"` : ''}. Could we ask 1-2 questions about your architecture and documented hurdles?`}
        />
      )}
    </AnimatePresence>
  )
}
export default IdeaSimilarityModal
