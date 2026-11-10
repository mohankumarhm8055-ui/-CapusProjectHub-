import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Tag, ArrowUpRight, Sparkles } from 'lucide-react'

export interface RepositoryProject {
  id: string
  title: string
  description: string
  technologies: string[]
  category: string
  academicYear: string
  image: string
  problemStatement: string
  objectives: string[]
}

interface ProjectCardProps {
  project: RepositoryProject
  onViewDetails: (project: RepositoryProject) => void
  index: number
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onViewDetails,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.5,
        delay: (index % 3) * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(102,88,255,0.09)] hover:border-[#6658FF]/40 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
    >
      <div>
        {/* Project Thumbnail Image Container */}
        <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-slate-100">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

          {/* Category Overlay Badge */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[#6658FF] shadow-xs">
            <Tag className="w-3 h-3 text-[#6658FF]" />
            <span>{project.category}</span>
          </div>

          {/* Academic Year Badge */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-[11px] font-mono font-medium text-white shadow-xs">
            <Calendar className="w-3 h-3 text-slate-300" />
            <span>{project.academicYear}</span>
          </div>

          {/* Demonstration Notice Watermark */}
          <div className="absolute bottom-2.5 right-3.5 flex items-center gap-1 text-[10px] font-mono text-white/80 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#6658FF]" />
            <span>Demo Record</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold text-[#0B192C] tracking-tight group-hover:text-[#6658FF] transition-colors duration-200 line-clamp-1">
            {project.title}
          </h3>

          {/* Description */}
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed line-clamp-2">
            {project.description}
          </p>

          {/* Technology Badges */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 group-hover:border-[#6658FF]/20 group-hover:bg-[#6658FF]/5 transition-colors"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer: View Details CTA */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
        <span className="text-[11px] font-mono text-slate-400">
          Capstone Archive
        </span>

        <button
          onClick={() => onViewDetails(project)}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#6658FF] hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all cursor-pointer"
        >
          <span>View Details</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

export default ProjectCard
