import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Tag, Calendar } from 'lucide-react'
import type { Project } from '../types/project'

interface RelatedProjectsCarouselProps {
  currentProject: Project
  allProjects: Project[]
}

export const RelatedProjectsCarousel: React.FC<RelatedProjectsCarouselProps> = ({
  currentProject,
  allProjects,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Find related projects (same category or sharing technologies, excluding current)
  const related = allProjects.filter((p) => {
    if (p.id === currentProject.id) return false
    if (p.category === currentProject.category) return true
    const currentTechs = currentProject.technologies.map((t) => t.name.toLowerCase())
    return p.technologies.some((t) => currentTechs.includes(t.name.toLowerCase()))
  })

  // Fallback if none found
  const displayedProjects = related.length > 0 ? related : allProjects.filter((p) => p.id !== currentProject.id)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -340 : 340
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  if (displayedProjects.length === 0) return null

  return (
    <div className="space-y-6 pt-10 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6658FF]" />
            <h3 className="text-xl sm:text-2xl font-bold text-[#0B192C]">
              Related Academic Capstones
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Explore projects in {currentProject.category} and related technology tracks.
          </p>
        </div>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#6658FF] shadow-xs transition-colors cursor-pointer"
            aria-label="Previous related projects"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#6658FF] shadow-xs transition-colors cursor-pointer"
            aria-label="Next related projects"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-5 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
      >
        {displayedProjects.map((p) => (
          <div
            key={p.id}
            className="min-w-[280px] sm:min-w-[320px] max-w-[320px] bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-[#6658FF]/30 transition-all duration-300 flex flex-col justify-between overflow-hidden group shrink-0"
          >
            <div>
              <div className="relative h-40 overflow-hidden bg-slate-100">
                <img
                  src={p.coverImage}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-[10px] font-bold text-[#6658FF] flex items-center gap-1 shadow-xs">
                  <Tag className="w-3 h-3" />
                  <span>{p.category}</span>
                </div>
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-950/70 text-[10px] font-mono text-white flex items-center gap-1 shadow-xs">
                  <Calendar className="w-3 h-3" />
                  <span>{p.academicYear}</span>
                </div>
              </div>

              <div className="p-4">
                <h4 className="text-sm font-bold text-[#0B192C] group-hover:text-[#6658FF] transition-colors line-clamp-1">
                  {p.title}
                </h4>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {p.technologies.slice(0, 3).map((t) => (
                    <span
                      key={t.name}
                      className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 rounded-md border border-slate-200/60"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                {p.department}
              </span>
              <Link
                to={`/explore-projects/${p.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#6658FF] hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all"
              >
                <span>View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RelatedProjectsCarousel
