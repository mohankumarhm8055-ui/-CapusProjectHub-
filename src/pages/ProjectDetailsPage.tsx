import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Calendar,
  Tag,
  Users,
  CheckCircle2,
  Globe,
  FileText,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Cpu,
  Layers,
  Terminal,
  HelpCircle,
  Lightbulb,
  Target,
  Wrench,
  BookOpen,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import TeamModal from '../components/TeamModal'
import ScreenshotLightbox from '../components/ScreenshotLightbox'
import ProjectCommunitySection from '../components/ProjectCommunitySection'
import RelatedProjectsCarousel from '../components/RelatedProjectsCarousel'
import { DEMO_PROJECTS, INITIAL_COMMENTS } from '../data/mockProjects'
import { repositoryService } from '../services/repositoryService'
import { authService } from '../services/authService'
import { finalLifecycleApiService } from '../services/finalLifecycleApiService'
import IdeaSimilarityModal from '../components/ai-mentor/IdeaSimilarityModal'
import type { Project, TechCategory } from '../types/project'

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
)

interface ProjectDetailsPageProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
  isAuthenticated?: boolean
}

export const ProjectDetailsPage: React.FC<ProjectDetailsPageProps> = ({
  onSignInClick,
  onSignUpClick,
  isAuthenticated,
}) => {
  const { projectId } = useParams<{ projectId: string }>()
  const effectiveIsAuthenticated = Boolean(isAuthenticated || authService.getCurrentUser())

  const [liveProject, setLiveProject] = useState<Project | null>(null)
  const [relatedCatalog, setRelatedCatalog] = useState<Project[]>(DEMO_PROJECTS)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [docNotice, setDocNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState<boolean>(false)

  // Lightbox & Team modal state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [teamModalOpen, setTeamModalOpen] = useState(false)

  // Scroll to top on page load and fetch project data
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!projectId) return

    const mock = DEMO_PROJECTS.find((p) => p.id === projectId)
    if (mock) {
      setLiveProject(mock)
      setIsLoading(false)
      return
    }

    // Attempt to fetch from real backend repository
    setFetchError(null)
    setDocNotice(null)
    repositoryService
      .getProjectById(projectId)
      .then((repo) => {
        const adapted: any = {
          id: repo.id,
          title: repo.title,
          slug: repo.slug,
          description: repo.abstract || repo.problemStatement,
          abstract: repo.abstract,
          problemStatement: repo.problemStatement,
          objectives: repo.objectives || [],
          proposedSolution: repo.proposedSolution || repo.solution || '',
          coverImage:
            repo.screenshots?.[0]?.url ||
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
          screenshots: (repo.screenshots || []).map((s, idx) => ({ id: String(idx), url: s.url, caption: s.caption || '' })),
          category: repo.category || repo.department || 'Software Engineering',
          department: repo.department,
          academicYear: repo.academicYear,
          difficulty: 'Intermediate',
          status: repo.reviewStatus === 'APPROVED' ? 'Completed' : 'Under Review',
          technologies: (repo.technologyStack || []).map((t) => ({ name: t.name, category: 'Frontend' })),
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
          modules: repo.modules || [],
          architecture: repo.architecture,
          reportDocuments: repo.reportDocuments || [],
          githubUrl: repo.githubUrl,
          liveDemoUrl: repo.demoUrl,
          documentationUrl: repo.documentationUrl,
          videoUrl: repo.videoUrl,
          learningOutcomes: repo.learningOutcomes || [],
          futureEnhancements: repo.futureEnhancements || [],
          challenges: repo.challenges || [],
          teamMembers: (repo.teamMembers || []).map((m, idx) => ({
            id: m.studentId || String(idx),
            studentId: m.studentId,
            name: m.name,
            profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            role: m.role || 'Contributor',
            department: m.department || repo.department,
            semester: repo.semester || 'Recorded in Dossier',
            responsibilities: [],
            isLeader: m.isLeader || false,
            isAvailableForMentoring: m.isAvailableForMentoring === true,
            showPublicPhone: false,
            showPublicEmail: false,
          })),
          facultyGuide: {
            id: 'faculty-1',
            name: repo.facultyGuide?.name || 'Assigned Faculty',
            designation: repo.facultyGuide?.designation || 'Faculty Mentor',
            department: repo.facultyGuide?.department || repo.department,
            profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
          },
          approvalStatus:
            repo.verificationStatus === 'VERIFIED_HISTORICAL'
              ? 'Faculty Approved'
              : repo.verificationStatus === 'FACULTY_APPROVED'
              ? 'Faculty Approved'
              : 'Pending Review',
          likesCount: 0,
          commentsCount: 0,
          createdAt: repo.createdAt || '2025-01-01T00:00:00.000Z',
          sourceType: repo.sourceType,
          verificationStatus: repo.verificationStatus,
        }
        setLiveProject(adapted)

        if (authService.getCurrentUser()) {
          const protectedUrls = [
            ...(adapted.screenshots || []).map((s: any) => s.url),
            adapted.coverImage,
          ].filter(
            (u: string) =>
              typeof u === 'string' && u.startsWith('/api/final-lifecycle/published-files/')
          )
          if (protectedUrls.length > 0) {
            Promise.all(
              Array.from(new Set<string>(protectedUrls)).map(async (origUrl) => {
                try {
                  const blobUrl = await finalLifecycleApiService.fetchAuthenticatedAssetBlobUrl(origUrl, false)
                  return [origUrl, blobUrl] as const
                } catch {
                  return [origUrl, origUrl] as const
                }
              })
            ).then((entries) => {
              const urlMap = new Map(entries)
              setLiveProject((prev: any) =>
                prev && prev.id === adapted.id
                  ? {
                      ...prev,
                      coverImage: urlMap.get(prev.coverImage) || prev.coverImage,
                      screenshots: (prev.screenshots || []).map((s: any) => ({
                        ...s,
                        url: urlMap.get(s.url) || s.url,
                      })),
                    }
                  : prev
              )
            })
          }
        }

        // Load related catalog records from live repository
        repositoryService
          .searchProjects({ limit: 6 })
          .then((listRes) => {
            if (listRes.projects.length > 0) {
              setRelatedCatalog(
                listRes.projects.map((p) => ({
                  ...adapted,
                  id: p.id,
                  title: p.title,
                  slug: p.slug,
                  description: p.abstract || p.problemStatement,
                  category: (p.category as any) || p.department || 'Software Engineering',
                  department: p.department,
                  academicYear: p.academicYear,
                  coverImage:
                    p.screenshots?.[0]?.url ||
                    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
                  technologies: (p.technologyStack || []).map((t) => ({ name: t.name, category: 'Frontend' as const })),
                }))
              )
            }
          })
          .catch(() => {})
      })
      .catch((err: any) => {
        setLiveProject(null)
        setFetchError(
          err?.message ||
            (!authService.getCurrentUser()
              ? 'Sign in to view full verified project repository dossiers.'
              : 'The requested project repository record could not be found or is restricted.')
        )
      })
      .finally(() => setIsLoading(false))
  }, [projectId])

  const project = liveProject

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-800">
        <Navbar onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />
        <div className="max-w-md mx-auto text-center py-24 px-4">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-medium">Retrieving verified project dossier...</p>
        </div>
        <Footer onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-800">
        <Navbar onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />
        <div className="max-w-md mx-auto text-center py-24 px-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B192C]">Project Unavailable</h2>
          <p className="mt-2 text-sm text-slate-500">
            {fetchError || 'The requested project repository record could not be found or may have been archived.'}
          </p>
          <Link
            to="/explore-projects"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#6658FF]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Explore Projects</span>
          </Link>
        </div>
        <Footer onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />
      </div>
    )
  }

  // Group technologies by category
  const groupedTechs = project.technologies.reduce<Record<TechCategory, string[]>>((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = []
    acc[curr.category].push(curr.name)
    return acc
  }, {} as Record<TechCategory, string[]>)

  const comments = INITIAL_COMMENTS[project.id] || []

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between selection:bg-[#6658FF]/20 selection:text-[#6658FF]">
      <div>
        {/* Navigation Bar */}
        <Navbar onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />

        {/* Breadcrumb Navigation */}
        <div className="bg-white border-b border-slate-200/80 py-3.5">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 flex items-center gap-2 text-xs font-medium text-slate-500 overflow-x-auto no-scrollbar">
            <Link to="/" className="hover:text-[#6658FF] transition-colors shrink-0">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <Link to="/explore-projects" className="hover:text-[#6658FF] transition-colors shrink-0">
              Explore Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-[#0B192C] font-semibold truncate max-w-xs sm:max-w-md">
              {project.title}
            </span>
          </div>
        </div>

        {/* Project Header Banner & Overview */}
        <div className="bg-white border-b border-slate-200/80 pt-8 pb-12 sm:pt-10 sm:pb-16">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14">
            {/* Meta Tags Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20">
                <Tag className="w-3.5 h-3.5" />
                <span>{project.category}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{project.academicYear}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <span>Difficulty: {project.difficulty}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{project.approvalStatus}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                {project.sourceType === 'ADMIN_IMPORTED_HISTORICAL'
                  ? 'Historical Archive'
                  : project.sourceType === 'STUDENT_SUBMISSION'
                  ? 'Student Capstone'
                  : 'College Repository'}
              </span>
            </div>

            {/* Main Title & Action Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0B192C] tracking-tight leading-tight">
                {project.title}
              </h1>

              <button
                onClick={() => setIsIdeaModalOpen(true)}
                className="self-start lg:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-xs hover:shadow-indigo-500/20 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Compare With My Idea</span>
              </button>
            </div>

            {/* Subtitle / Short Description */}
            <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed font-normal">
              {project.description}
            </p>

            {/* Quick Summary Row: Team avatars + Department + External Links */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Team Profile Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTeamModalOpen(true)}
                  className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-slate-50 hover:bg-[#6658FF]/5 border border-slate-200 hover:border-[#6658FF]/30 transition-all cursor-pointer group"
                >
                  <div className="flex -space-x-2 overflow-hidden ml-1">
                    {project.teamMembers.map((m) => (
                      <img
                        key={m.id}
                        src={m.profileImage}
                        alt={m.name}
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                      />
                    ))}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#0B192C] group-hover:text-[#6658FF] transition-colors flex items-center gap-1">
                      <span>{project.teamMembers.length} Team Members</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Leader: {project.teamMembers[0]?.name}
                    </p>
                  </div>
                </button>

                {/* Faculty Guide Pill */}
                <div className="hidden sm:flex items-center gap-2.5 pl-4 border-l border-slate-200">
                  <img
                    src={project.facultyGuide.profileImage}
                    alt={project.facultyGuide.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div className="text-left text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Faculty Guide
                    </span>
                    <span className="font-bold text-[#0B192C]">
                      {project.facultyGuide.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* GitHub and Live Demo External Links */}
              <div className="flex flex-wrap items-center gap-2.5">
                {project.githubUrl ? (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 shadow-xs hover:border-slate-400 transition-colors"
                  >
                    <GithubIcon className="w-4 h-4" />
                    <span>View Repository</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200/60 cursor-not-allowed">
                    <GithubIcon className="w-3.5 h-3.5 opacity-50" />
                    <span>Repository Private</span>
                  </span>
                )}

                {project.liveDemoUrl ? (
                  <a
                    href={project.liveDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] shadow-xs transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Live Demo</span>
                    <ExternalLink className="w-3 h-3 text-white/80" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200/60 cursor-not-allowed">
                    <Globe className="w-3.5 h-3.5 opacity-50" />
                    <span>Demo Link N/A</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Demonstration Disclaimer Callout Banner */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 pt-6">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Academic Demonstration Showcase:</strong> This record is an illustrative capstone example in the CampusProjectHub demonstration catalog. External repository links and documentation previews demonstrate platform capabilities.
            </p>
          </div>
        </div>

        {/* Main Content Showcase Layout */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Main Content (8 cols) */}
            <div className="lg:col-span-8 space-y-10">
              {/* Section B: Project Screenshots & Lightbox Gallery */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#0B192C]">
                      Project Screenshots & Previews
                    </h3>
                    <p className="text-xs text-slate-500">
                      Click any screenshot to open the high-resolution lightbox.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {project.screenshots.length} Screenshots
                  </span>
                </div>

                {/* Primary Large Screenshot */}
                <div
                  onClick={() => {
                    setLightboxIndex(0)
                    setLightboxOpen(true)
                  }}
                  className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-900 cursor-pointer group shadow-sm"
                >
                  <img
                    src={project.screenshots[0]?.url || project.coverImage}
                    alt={project.screenshots[0]?.caption || project.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white text-xs sm:text-sm font-medium">
                    <p>{project.screenshots[0]?.caption}</p>
                    <span className="text-[11px] text-slate-300 font-mono mt-1 block">
                      Click to expand in lightbox
                    </span>
                  </div>
                </div>

                {/* Secondary Thumbnail Strip */}
                {project.screenshots.length > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {project.screenshots.map((s, idx) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setLightboxIndex(idx)
                          setLightboxOpen(true)
                        }}
                        className={`relative h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-100 border-2 cursor-pointer transition-all hover:scale-102 ${
                          idx === 0 ? 'border-[#6658FF]' : 'border-transparent'
                        }`}
                      >
                        <img src={s.url} alt={s.caption} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section A: Project Abstract & Overview */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#6658FF]" />
                    <span>Academic Abstract</span>
                  </h3>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
                    {project.abstract}
                  </p>
                </div>

                {/* Problem Statement */}
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/70">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-1.5 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-rose-600" />
                    <span>Problem Statement</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-rose-950/80 leading-relaxed">
                    {project.problemStatement}
                  </p>
                </div>

                {/* Proposed Solution */}
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 border border-blue-200/70">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <span>Proposed Solution</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-blue-950/80 leading-relaxed">
                    {project.proposedSolution}
                  </p>
                </div>

                {/* Project Objectives */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span>Project Objectives</span>
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {project.objectives.map((obj, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs sm:text-sm text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section F: Project Requirements & Setup */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#6658FF]" />
                    <span>Project Technical Requirements & Setup</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    System specifications and step-by-step setup instructions for replication.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hardware requirements */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <span>Hardware Requirements</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {project.requirements.hardware.map((hw, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#6658FF]">•</span>
                          <span>{hw}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Software requirements */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-purple-500" />
                      <span>Software Requirements</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {project.requirements.software.map((sw, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#6658FF]">•</span>
                          <span>{sw}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Installation Commands */}
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                    <span className="text-[11px] font-bold uppercase">Installation & Run Commands</span>
                    <Terminal className="w-3.5 h-3.5" />
                  </div>
                  {project.requirements.installation.map((cmd, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-emerald-400 select-none">$</span>
                      <span className="text-slate-100">{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section H: Academic Learning Outcomes & Future Enhancements */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
                <h3 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#6658FF]" />
                  <span>Academic Insights & Future Scope</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Key Learning Outcomes
                    </h4>
                    <ul className="space-y-1.5">
                      {project.learningOutcomes.map((lo, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#6658FF] shrink-0 mt-0.5" />
                          <span>{lo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Future Enhancements
                    </h4>
                    <ul className="space-y-1.5">
                      {project.futureEnhancements.map((fe, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{fe}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Key Project Challenges Overcome
                    </h4>
                    <ul className="space-y-1.5">
                      {project.challenges.map((ch, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                          <span className="text-slate-400">•</span>
                          <span>{ch}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section I: YouTube-Style Community Interaction (Likes + Comments) */}
              <ProjectCommunitySection
                projectId={project.id}
                initialLikesCount={project.likesCount}
                initialComments={comments}
                onRequireAuth={() => {
                  if (onSignUpClick) onSignUpClick()
                }}
                isAuthenticated={effectiveIsAuthenticated}
              />
            </div>

            {/* Right Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Section E: Technology & Tools Grouped */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
                <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#6658FF]" />
                  <span>Technologies & Stack</span>
                </h3>

                <div className="space-y-3.5">
                  {Object.entries(groupedTechs).map(([category, techs]) => (
                    <div key={category} className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        {category}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {techs.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section C: Team Profile Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#6658FF]" />
                    <span>Project Team ({project.teamMembers.length})</span>
                  </h3>
                  <button
                    onClick={() => setTeamModalOpen(true)}
                    className="text-xs font-bold text-[#6658FF] hover:underline cursor-pointer"
                  >
                    View All Roles
                  </button>
                </div>

                <div className="space-y-3">
                  {project.teamMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setTeamModalOpen(true)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <img
                        src={m.profileImage}
                        alt={m.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold text-[#0B192C] truncate">
                            {m.name}
                          </p>
                          {m.isLeader && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300">
                              Lead
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6658FF] font-medium truncate">
                          {m.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setTeamModalOpen(true)}
                  className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Inspect Team Responsibilities & Contact
                </button>
              </div>

              {/* Section D: Faculty Guide Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Academic Mentorship
                </span>

                <div className="flex items-center gap-3.5">
                  <img
                    src={project.facultyGuide.profileImage}
                    alt={project.facultyGuide.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#0B192C]">
                      {project.facultyGuide.name}
                    </h4>
                    <p className="text-xs text-[#6658FF] font-medium">
                      {project.facultyGuide.designation}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {project.facultyGuide.department}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Evaluation Status:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {project.approvalStatus}
                  </span>
                </div>
              </div>

              {/* Section G: Documentation & Report */}
              <div className="bg-gradient-to-br from-[#6658FF]/5 via-blue-50/30 to-white rounded-3xl p-6 border border-[#6658FF]/20 space-y-3">
                <h4 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#6658FF]" />
                  <span>Capstone Documentation</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Academic project report documents and technical references attached to this repository record.
                </p>
                {(project as any).reportDocuments && (project as any).reportDocuments.length > 0 && (project as any).reportDocuments[0]?.fileUrl ? (
                  String((project as any).reportDocuments[0].fileUrl).startsWith('/api/final-lifecycle/published-files/') ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const blobUrl = await finalLifecycleApiService.fetchAuthenticatedAssetBlobUrl(
                            (project as any).reportDocuments[0].fileUrl,
                            false
                          )
                          window.open(blobUrl, '_blank', 'noopener,noreferrer')
                        } catch (err) {
                          setDocNotice(
                            err instanceof Error ? err.message : 'Sign in to access approved project report documents.'
                          )
                        }
                      }}
                      className="block text-center w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] transition-all shadow-xs cursor-pointer"
                    >
                      Open Approved Report ({(project as any).reportDocuments[0].title || 'PDF'})
                    </button>
                  ) : (
                    <a
                      href={(project as any).reportDocuments[0].fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] transition-all shadow-xs"
                    >
                      Open Archived Report ({(project as any).reportDocuments[0].title || 'PDF'})
                    </a>
                  )
                ) : project.documentationUrl ? (
                  <a
                    href={project.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] transition-all shadow-xs"
                  >
                    Open Project Documentation
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setDocNotice(
                        `No PDF report document is currently archived for "${project.title}". Use the AI Mentor to compare its documented modules or connect with contributors.`
                      )
                    }
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
                  >
                    Check Archived Report Availability
                  </button>
                )}
                {docNotice && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    {docNotice}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section J: Related Projects Carousel */}
          <div className="mt-12 sm:mt-16">
            <RelatedProjectsCarousel
              currentProject={project}
              allProjects={relatedCatalog}
            />
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ScreenshotLightbox
        screenshots={project.screenshots}
        activeIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      {/* Team Details Modal */}
      <TeamModal
        members={project.teamMembers}
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        projectTitle={project.title}
        projectId={project.id || project.slug}
      />

      {/* Idea Similarity Modal */}
      <IdeaSimilarityModal
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        initialTitle={project.title}
      />

      {/* Footer */}
      <Footer onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} />
    </div>
  )
}

export default ProjectDetailsPage
