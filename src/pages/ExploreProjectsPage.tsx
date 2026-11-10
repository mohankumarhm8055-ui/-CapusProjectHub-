import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  Compass,
  RotateCcw,
  ArrowUpDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ExploreProjectCard from '../components/ExploreProjectCard'
import IdeaSimilarityModal from '../components/ai-mentor/IdeaSimilarityModal'
import { DEMO_PROJECTS } from '../data/mockProjects'
import { repositoryService, type RepositoryProject } from '../services/repositoryService'
import type { Project, ProjectDifficulty } from '../types/project'

interface ExploreProjectsPageProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
}

const CATEGORIES = [
  'All Projects',
  'Artificial Intelligence',
  'Machine Learning',
  'Web Development',
  'Data Science',
  'Full Stack Development',
] as const

const DEPARTMENTS = [
  'All Departments',
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Data Science & Artificial Intelligence',
  'Electrical and Electronics Engineering',
  'Electronics and Communication Engineering',
] as const

const ACADEMIC_YEARS = ['All Years', '2025–26', '2024–25', '2023-2024'] as const

const NATURAL_LANGUAGE_SUGGESTIONS = [
  'Projects developed using machine learning',
  'Previous projects related to college attendance',
  'Projects using React and MongoDB',
  'Show projects related to CampusProjectHub',
  'What projects have seniors developed using IoT?',
]

export const ExploreProjectsPage: React.FC<ExploreProjectsPageProps> = ({
  onSignInClick,
  onSignUpClick,
}) => {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All Projects')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments')
  const [selectedYear, setSelectedYear] = useState<string>('All Years')
  const [selectedSourceType, setSelectedSourceType] = useState<string>('All Sources')
  const [approvedOnly, setApprovedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'latest' | 'mostLiked' | 'mostDiscussed'>('latest')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Real backend repository state
  const [liveProjects, setLiveProjects] = useState<RepositoryProject[]>([])
  const [totalCount, setTotalCount] = useState<number>(DEMO_PROJECTS.length)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState<boolean>(false)

  // Fetch from real backend repository
  useEffect(() => {
    let isCancelled = false
    const fetchRepoProjects = async () => {
      try {
        setIsLoading(true)
        const res = await repositoryService.searchProjects({
          query: searchQuery.trim() || undefined,
          department: selectedDepartment !== 'All Departments' ? selectedDepartment : undefined,
          academicYear: selectedYear !== 'All Years' ? selectedYear : undefined,
          category: selectedCategory !== 'All Projects' ? selectedCategory : undefined,
          sourceType:
            selectedSourceType === 'Historical Archives'
              ? 'ADMIN_IMPORTED_HISTORICAL'
              : selectedSourceType === 'Student Capstones'
              ? 'STUDENT_SUBMISSION'
              : undefined,
          verificationStatus: approvedOnly ? 'FACULTY_APPROVED' : undefined,
          page: currentPage,
          limit: 9,
          naturalLanguage: true,
        })

        if (!isCancelled) {
          setLiveProjects(res.projects)
          setTotalCount(res.totalCount)
          setTotalPages(res.totalPages)
        }
      } catch {
        // Fall back gracefully to mock demonstration projects if backend is offline
        if (!isCancelled) {
          setLiveProjects([])
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchRepoProjects, 250)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedDepartment,
    selectedYear,
    selectedSourceType,
    approvedOnly,
    currentPage,
  ])

  // Map live repository projects or fallback to DEMO_PROJECTS
  const displayedProjects: Project[] = useMemo(() => {
    if (liveProjects.length > 0) {
      return liveProjects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.abstract || p.problemStatement,
        abstract: p.abstract,
        problemStatement: p.problemStatement,
        objectives: p.objectives || [],
        proposedSolution: p.proposedSolution || p.solution || '',
        coverImage:
          p.screenshots?.[0]?.url ||
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
        screenshots: (p.screenshots || []).map((s, idx) => ({ id: String(idx), url: s.url, caption: s.caption || '' })),
        category: (p.category as any) || 'Artificial Intelligence',
        department: p.department,
        academicYear: p.academicYear,
        difficulty: 'Intermediate' as ProjectDifficulty,
        status: p.reviewStatus === 'APPROVED' ? 'Completed' : 'Under Review',
        technologies: (p.technologyStack || []).map((t) => ({ name: t.name, category: 'Frontend' as const })),
        requirements: {
          hardware: [],
          software: [],
          languages: [],
          frameworks: [],
          database: [],
          environment: [],
          installation: [],
          prerequisites: [],
        },
        learningOutcomes: p.learningOutcomes || [],
        futureEnhancements: p.futureEnhancements || [],
        challenges: p.challenges || [],
        teamMembers: (p.teamMembers || []).map((m, idx) => ({
          id: m.studentId || String(idx),
          studentId: m.studentId,
          name: m.name,
          profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          role: m.role || 'Contributor',
          department: m.department || p.department,
          semester: '8th Semester',
          responsibilities: [],
          isLeader: m.isLeader || false,
          isAvailableForMentoring: m.isAvailableForMentoring === true,
          showPublicPhone: false,
          showPublicEmail: false,
        })),
        facultyGuide: {
          id: 'faculty-1',
          name: p.facultyGuide?.name || 'Assigned Faculty',
          designation: p.facultyGuide?.designation || 'Faculty Mentor',
          department: p.facultyGuide?.department || p.department,
          profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        },
        approvalStatus:
          p.verificationStatus === 'VERIFIED_HISTORICAL'
            ? 'Faculty Approved'
            : p.verificationStatus === 'FACULTY_APPROVED'
            ? 'Faculty Approved'
            : 'Pending Review',
        likesCount: 12,
        commentsCount: 4,
        createdAt: p.createdAt || new Date().toISOString(),
        sourceType: p.sourceType,
        verificationStatus: p.verificationStatus,
      } as any))
    }

    // Mock fallback when offline
    return DEMO_PROJECTS.filter((p) => {
      if (selectedCategory !== 'All Projects' && p.category !== selectedCategory) return false
      if (selectedDepartment !== 'All Departments' && p.department !== selectedDepartment) return false
      if (selectedYear !== 'All Years' && p.academicYear !== selectedYear) return false
      if (approvedOnly && p.approvalStatus !== 'Faculty Approved') return false
      const query = searchQuery.trim().toLowerCase()
      if (query) {
        const matchesTitle = p.title.toLowerCase().includes(query)
        const matchesDesc = p.description.toLowerCase().includes(query)
        const matchesTech = p.technologies.some((t) => t.name.toLowerCase().includes(query))
        if (!matchesTitle && !matchesDesc && !matchesTech) return false
      }
      return true
    })
  }, [liveProjects, selectedCategory, selectedDepartment, selectedYear, approvedOnly, searchQuery])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('All Projects')
    setSelectedDepartment('All Departments')
    setSelectedYear('All Years')
    setSelectedSourceType('All Sources')
    setApprovedOnly(false)
    setSortBy('latest')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'All Projects' ||
    selectedDepartment !== 'All Departments' ||
    selectedYear !== 'All Years' ||
    selectedSourceType !== 'All Sources' ||
    approvedOnly

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between selection:bg-[#6658FF]/20 selection:text-[#6658FF]">
      <div>
        <Navbar onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />

        {/* Explore Projects Header Hero */}
        <div className="relative bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC] border-b border-slate-200/80 pt-12 pb-16 sm:py-20 overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-4 rounded-full bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 text-xs font-bold tracking-widest uppercase"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>COLLEGE PROJECT REPOSITORY & INTELLIGENCE</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0B192C] tracking-tight leading-tight"
            >
              Discover Verified College Projects.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Search authorized historical archives and faculty-approved student capstones with AI-powered similarity analysis.
            </motion.p>

            {/* AI Idea Scanner Banner Trigger */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                onClick={() => setIsIdeaModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Project Idea Similarity Scanner</span>
              </button>
            </motion.div>
          </div>
        </div>

        {/* Discovery & Search Controls */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 -mt-8 relative z-20">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.04)] space-y-4">
            {/* Top Search Bar & Sort Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Ask in natural language (e.g. 'Projects using React and MongoDB' or 'attendance system')..."
                  className="w-full pl-11 pr-12 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6658FF]/40 focus:border-[#6658FF] placeholder:text-slate-400 shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Action Buttons: Sort & Advanced Filters Toggle */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#6658FF]" />
                  <span className="hidden sm:inline text-slate-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sort projects"
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#0B192C]"
                  >
                    <option value="latest">Latest</option>
                    <option value="mostLiked">Most Liked</option>
                    <option value="mostDiscussed">Most Discussed</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                    showAdvancedFilters || hasActiveFilters
                      ? 'bg-[#6658FF]/10 text-[#6658FF] border-[#6658FF]/30'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#6658FF]" />}
                </button>
              </div>
            </div>

            {/* Natural Language Search Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Try:
              </span>
              {NATURAL_LANGUAGE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setSearchQuery(suggestion)
                    setCurrentPage(1)
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/80 transition-colors shrink-0 cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat)
                      setCurrentPage(1)
                    }}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#6658FF] text-white border-[#6658FF] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#6658FF]/40 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Advanced Filters Expandable Drawer */}
            {showAdvancedFilters && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Department Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6658FF]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Year Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6658FF]"
                  >
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Type Filter */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Repository Source
                  </label>
                  <select
                    value={selectedSourceType}
                    onChange={(e) => {
                      setSelectedSourceType(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6658FF]"
                  >
                    <option value="All Sources">All Sources</option>
                    <option value="Historical Archives">Historical Archives (Admin)</option>
                    <option value="Student Capstones">Student Capstones (Faculty Approved)</option>
                  </select>
                </div>

                {/* Verification Toggle */}
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={approvedOnly}
                      onChange={(e) => {
                        setApprovedOnly(e.target.checked)
                        setCurrentPage(1)
                      }}
                      className="rounded text-[#6658FF] focus:ring-[#6658FF] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Faculty Approved Only
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Results Count & Reset row */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Showing <strong>{displayedProjects.length}</strong> of {totalCount} Repository Records
                {isLoading && <span className="text-indigo-600 font-sans ml-2 animate-pulse">Updating...</span>}
              </span>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[#6658FF] hover:underline font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Project Gallery Grid */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 py-12 sm:py-16">
          {displayedProjects.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {displayedProjects.map((project, idx) => (
                  <ExploreProjectCard key={project.id} project={project} index={idx} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-3">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center mx-auto mb-4">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0B192C]">No projects matched your criteria</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Try loosening your search terms or testing your idea in the AI Idea Similarity Scanner.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
                <button
                  onClick={() => setIsIdeaModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scan Idea Similarity</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Idea Similarity Scanner Modal */}
      <IdeaSimilarityModal
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        initialTitle={searchQuery}
      />

      <Footer onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />
    </div>
  )
}

export default ExploreProjectsPage
