import React, { useState } from 'react'
import {
  X,
  Sparkles,
  Users,
  Clock,
  Layers,
  GraduationCap,
  Play,
} from 'lucide-react'
import type { ProjectConstraints } from '../../services/aiEvaluationApiService'

interface ProjectAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  currentConstraints?: ProjectConstraints
  initialProjectTitle?: string
  initialProblemStatement?: string
  initialFeatures?: string[]
  onRunEvaluation: (
    constraints: Partial<ProjectConstraints>,
    proposedFeatures?: string[],
    projectMeta?: { projectTitle?: string; problemStatement?: string }
  ) => Promise<void>
  isBusy?: boolean
}

export const ProjectAssessmentModal: React.FC<ProjectAssessmentModalProps> = ({
  isOpen,
  onClose,
  currentConstraints,
  initialProjectTitle,
  initialProblemStatement,
  initialFeatures,
  onRunEvaluation,
  isBusy = false,
}) => {
  const [projectTitle, setProjectTitle] = useState<string>(initialProjectTitle || 'CampusProjectHub')
  const [problemStatement, setProblemStatement] = useState<string>(initialProblemStatement || '')
  const [teamSize, setTeamSize] = useState<number>(currentConstraints?.teamSize || 3)
  const [technicalExperience, setTechnicalExperience] = useState<'beginner' | 'intermediate' | 'advanced'>(
    currentConstraints?.technicalExperience || 'intermediate'
  )
  const [developmentWeeks, setDevelopmentWeeks] = useState<number>(currentConstraints?.developmentWeeks || 12)
  const [semesterDeadline, setSemesterDeadline] = useState<string>(
    currentConstraints?.semesterDeadline || 'End of 7th Semester (12 Weeks)'
  )
  const [frameworksText, setFrameworksText] = useState<string>(
    currentConstraints?.languagesAndFrameworks?.join(', ') || 'TypeScript, React, Node.js, Express, MongoDB'
  )
  const [hardwareResourcesText, setHardwareResourcesText] = useState<string>(
    currentConstraints?.hardwareResources?.join(', ') || 'Standard Student Laptops (CPU execution)'
  )
  const [budget, setBudget] = useState<string>(
    currentConstraints?.budget || 'Zero-cost / Open-Source & Student Free Tiers'
  )
  const [academicRequirements, setAcademicRequirements] = useState<string>(
    currentConstraints?.academicRequirements || 'University Capstone Rubric: Working Software, IEEE 830 Proposal, Viva Defense'
  )
  const [customFeaturesText, setCustomFeaturesText] = useState<string>(
    initialFeatures?.join(', ') ||
      'Student project management, Team collaboration, College project repository, AI project similarity detection, AI feature evaluation, Academic proposal generation, College-specific DOCX templates, Faculty review and approval, Real-time AI voice interaction'
  )

  React.useEffect(() => {
    if (isOpen) {
      setProjectTitle(initialProjectTitle || 'CampusProjectHub')
      setProblemStatement(initialProblemStatement || '')
      if (currentConstraints?.teamSize) setTeamSize(currentConstraints.teamSize)
      if (currentConstraints?.technicalExperience) setTechnicalExperience(currentConstraints.technicalExperience)
      if (currentConstraints?.developmentWeeks) setDevelopmentWeeks(currentConstraints.developmentWeeks)
      if (currentConstraints?.semesterDeadline) setSemesterDeadline(currentConstraints.semesterDeadline)
      if (currentConstraints?.languagesAndFrameworks?.length) {
        setFrameworksText(currentConstraints.languagesAndFrameworks.join(', '))
      }
      if (currentConstraints?.hardwareResources?.length) {
        setHardwareResourcesText(currentConstraints.hardwareResources.join(', '))
      }
      if (currentConstraints?.budget) setBudget(currentConstraints.budget)
      if (currentConstraints?.academicRequirements) {
        setAcademicRequirements(currentConstraints.academicRequirements)
      }
      if (initialFeatures && initialFeatures.length > 0) {
        setCustomFeaturesText(initialFeatures.join(', '))
      }
    }
  }, [isOpen, initialProjectTitle, initialProblemStatement, currentConstraints, initialFeatures])

  React.useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const frameworks = frameworksText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const hardwareResources = hardwareResourcesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const features = customFeaturesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    await onRunEvaluation(
      {
        teamSize,
        technicalExperience,
        developmentWeeks,
        semesterDeadline,
        languagesAndFrameworks: frameworks,
        hardwareResources,
        budget,
        academicRequirements,
      },
      features.length > 0 ? features : undefined,
      {
        projectTitle: projectTitle.trim() || undefined,
        problemStatement: problemStatement.trim() || undefined,
      }
    )
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-assessment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#6658FF]/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="project-assessment-modal-title" className="font-bold text-base text-white">
                Project Assessment & Constraints Audit
              </h3>
              <p className="text-xs text-slate-400">
                Populated with known details; adjust parameters to test feasibility
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project assessment modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658FF]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm text-slate-800">
          <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-100">
            <div>
              <label className="block text-xs font-bold text-purple-950 mb-1">
                Project Title:
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Smart Attendance Management System"
                className="w-full text-xs p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-950 mb-1">
                Problem Statement Summary (Optional):
              </label>
              <textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={2}
                placeholder="Briefly describe the core academic or engineering problem your project solves..."
                className="w-full text-xs p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              />
            </div>
          </div>

          {/* Team Size & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#6658FF]" />
                <span>Team Size:</span>
              </label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              >
                <option value={1}>1 Student (Solo Capstone)</option>
                <option value={2}>2 Students</option>
                <option value={3}>3 Students (Recommended Standard)</option>
                <option value={4}>4 Students</option>
                <option value={5}>5 Students</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                <span>Technical Experience:</span>
              </label>
              <select
                value={technicalExperience}
                onChange={(e) => setTechnicalExperience(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              >
                <option value="beginner">Beginner (First Full-Stack / Web Project)</option>
                <option value="intermediate">Intermediate (Comfortable with React/Node/DB)</option>
                <option value="advanced">Advanced (Prior Hackathons / Production Experience)</option>
              </select>
            </div>
          </div>

          {/* Development Timeline & Weeks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Development Duration (Weeks):</span>
              </label>
              <select
                value={developmentWeeks}
                onChange={(e) => setDevelopmentWeeks(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              >
                <option value={4}>4 Weeks (Sprint / Mini-Project Hackathon)</option>
                <option value={8}>8 Weeks (Mid-Semester Submission)</option>
                <option value={12}>12 Weeks (Full Academic Semester)</option>
                <option value={16}>16 Weeks (Extended Year-Long Milestone)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Semester Deadline Label:</label>
              <input
                type="text"
                value={semesterDeadline}
                onChange={(e) => setSemesterDeadline(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              />
            </div>
          </div>

          {/* Frameworks & Languages */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tech Stack & Languages (Comma-separated):
            </label>
            <input
              type="text"
              value={frameworksText}
              onChange={(e) => setFrameworksText(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
            />
          </div>

          {/* Hardware & Cloud Budget + Resources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hardware, Cloud & API Budget:
              </label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Available Hardware / Lab Resources:
              </label>
              <input
                type="text"
                value={hardwareResourcesText}
                onChange={(e) => setHardwareResourcesText(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
              />
            </div>
          </div>

          {/* Academic Requirements */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Academic & Department Rubric Requirements:
            </label>
            <input
              type="text"
              value={academicRequirements}
              onChange={(e) => setAcademicRequirements(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
            />
          </div>

          {/* Proposed Features to Evaluate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Proposed Features to Evaluate (Comma-separated):</span>
            </label>
            <textarea
              value={customFeaturesText}
              onChange={(e) => setCustomFeaturesText(e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]/20"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Features are evaluated across the 7 dimensions: Problem relevance, User value, Originality, Feasibility, Complexity, Resources, and Time suitability.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isBusy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isBusy ? 'Evaluating Scope...' : 'Run 7-Dimensional Audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
