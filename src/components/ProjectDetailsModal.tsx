import React, { useEffect } from 'react'
import {
  X,
  Calendar,
  Tag,
  Target,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Code2,
  Sparkles,
} from 'lucide-react'
import type { RepositoryProject } from './ProjectCard'

interface ProjectDetailsModalProps {
  project: RepositoryProject | null
  onClose: () => void
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!project) return null

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
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer z-10"
          aria-label="Close project modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Category & Academic Year Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3 pr-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20">
            <Tag className="w-3.5 h-3.5" />
            <span>{project.category}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Academic Year: {project.academicYear}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Demo Record
          </span>
        </div>

        {/* Project Title */}
        <h3 className="text-2xl sm:text-3xl font-black text-[#0B192C] tracking-tight leading-tight">
          {project.title}
        </h3>

        {/* Demonstration Disclaimer Callout */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Demonstration Record:</strong> This entry is an illustrative sample project from the CampusProjectHub demonstration catalog. It does not represent an actual approved university submission.
          </p>
        </div>

        {/* Project Image Banner */}
        <div className="mt-5 relative w-full h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        </div>

        {/* Overview Description */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Project Overview
          </h4>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
            {project.description}
          </p>
        </div>

        {/* Technology Stack */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-[#6658FF]" />
            <span>Technology Stack</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Sample Problem Statement */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileQuestion className="w-4 h-4 text-[#2563EB]" />
            <span>Sample Problem Statement</span>
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {project.problemStatement}
          </p>
        </div>

        {/* Sample Project Objectives */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#059669]" />
            <span>Sample Project Objectives</span>
          </h4>
          <ul className="space-y-2">
            {project.objectives.map((obj, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            CampusProjectHub • Academic Capstone Catalog
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailsModal
