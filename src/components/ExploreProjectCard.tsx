import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Tag,
  Users,
  Heart,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import type { Project } from '../types/project'

interface ExploreProjectCardProps {
  project: Project
  index: number
}

export const ExploreProjectCard: React.FC<ExploreProjectCardProps> = ({
  project,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: (index % 6) * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(102,88,255,0.1)] hover:border-[#6658FF]/40 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
    >
      <div>
        {/* Project Thumbnail Image Container */}
        <Link
          to={`/explore-projects/${project.id}`}
          className="block relative w-full h-52 sm:h-56 overflow-hidden bg-slate-100 cursor-pointer"
        >
          <img
            src={project.coverImage}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

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

          {/* Faculty Approval / Verification Status Pill */}
          <div className="absolute bottom-3 left-3.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-[11px] font-bold text-white shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {(project as any).verificationStatus === 'VERIFIED_HISTORICAL'
                ? 'Verified Historical'
                : (project as any).verificationStatus === 'FACULTY_APPROVED' || project.approvalStatus === 'Faculty Approved'
                ? 'Faculty Approved'
                : project.approvalStatus || 'Verified'}
            </span>
          </div>

          {/* Source Status Label */}
          <div className="absolute bottom-3 right-3.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90">
            <Sparkles className="w-3 h-3 text-[#6658FF]" />
            <span>
              {(project as any).sourceType === 'ADMIN_IMPORTED_HISTORICAL'
                ? 'Historical Archive'
                : (project as any).sourceType === 'STUDENT_SUBMISSION'
                ? 'Student Capstone'
                : 'Academic Repository'}
            </span>
          </div>
        </Link>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {/* Title */}
          <Link to={`/explore-projects/${project.id}`}>
            <h3 className="text-lg sm:text-xl font-bold text-[#0B192C] tracking-tight group-hover:text-[#6658FF] transition-colors duration-200 line-clamp-1">
              {project.title}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed line-clamp-2">
            {project.description}
          </p>

          {/* Technology Stack Badges */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 4).map((tech) => (
              <span
                key={tech.name}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 group-hover:border-[#6658FF]/20 group-hover:bg-[#6658FF]/5 transition-colors"
              >
                {tech.name}
              </span>
            ))}
            {project.technologies.length > 4 && (
              <span className="px-2 py-1 rounded-md text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200/60">
                +{project.technologies.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Team members, Likes, Comments, View Details */}
      <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
        {/* Overlapping Team Avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden">
            {project.teamMembers.map((member) => (
              <img
                key={member.id}
                src={member.profileImage}
                alt={member.name}
                title={`${member.name} (${member.role})`}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>{project.teamMembers.length}</span>
          </span>
        </div>

        {/* Social stats & View Link */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
            <span>{project.likesCount}</span>
          </span>

          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
            <span>{project.commentsCount}</span>
          </span>

          <Link
            to={`/explore-projects/${project.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#6658FF] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default ExploreProjectCard
