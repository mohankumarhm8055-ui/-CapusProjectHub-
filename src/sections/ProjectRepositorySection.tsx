import React, { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Search,
  BookOpen,
  ArrowRight,
  Layers,
  RotateCcw,
} from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import ProjectCard, { type RepositoryProject } from '../components/ProjectCard'
import ProjectDetailsModal from '../components/ProjectDetailsModal'

const DEMO_PROJECTS: RepositoryProject[] = [
  {
    id: 'proj-01',
    title: 'AI Healthcare Prediction System',
    description:
      'A machine learning application for healthcare prediction and analysis.',
    technologies: ['Python', 'Machine Learning', 'Flask'],
    category: 'Artificial Intelligence',
    academicYear: '2025–26',
    image:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    problemStatement:
      'Detecting chronic disease risks early from fragmented clinical patient records with fast response times and interpretable prediction confidence metrics.',
    objectives: [
      'Train supervised classification algorithms on curated medical diagnostic benchmarks.',
      'Deploy a responsive Flask web API for rapid symptom and lab metric ingestion.',
      'Provide explainable medical prediction graphs for doctors and clinical interns.',
    ],
  },
  {
    id: 'proj-02',
    title: 'Smart Attendance Management',
    description:
      'A digital attendance system with student and faculty management.',
    technologies: ['React', 'Node.js', 'MongoDB'],
    category: 'Web Development',
    academicYear: '2025–26',
    image:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    problemStatement:
      'Replacing prone-to-error paper attendance logs with a cloud-synchronized multi-department roll call platform.',
    objectives: [
      'Implement student and faculty role-based access control with secure JWT sessions.',
      'Automate real-time notification alerts when student attendance drops below semester thresholds.',
      'Generate semester-wide statistical audit reports for department heads and mentors.',
    ],
  },
  {
    id: 'proj-03',
    title: 'Smart Learning Platform',
    description:
      'An interactive academic platform for digital learning.',
    technologies: ['React', 'Express', 'AI'],
    category: 'Education Technology',
    academicYear: '2024–25',
    image:
      'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop&q=80',
    problemStatement:
      'Addressing low engagement in asynchronous collegiate online learning through tailored AI problem walkthroughs.',
    objectives: [
      'Build progressive modular course lessons with automated completion tracking.',
      'Integrate AI prompt assistants for contextual hints on coding and math coursework.',
      'Facilitate interactive collaborative peer discussion forums within syllabus units.',
    ],
  },
  {
    id: 'proj-04',
    title: 'E-Commerce Management System',
    description:
      'A web platform for product, order and inventory management.',
    technologies: ['React', 'Node.js', 'MongoDB'],
    category: 'Full Stack Development',
    academicYear: '2024–25',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    problemStatement:
      'Synchronizing multi-vendor stock levels, payment settlement ledgers, and order dispatch tracking within a high-throughput architecture.',
    objectives: [
      'Design faceted product catalog search with sub-second Elasticsearch indexing.',
      'Implement atomic MongoDB transactions to eliminate double-booking during checkouts.',
      'Provide merchant analytics dashboards for order fulfillment velocity and profit margins.',
    ],
  },
  {
    id: 'proj-05',
    title: 'Student Performance Analytics',
    description:
      'An analytics application for examining academic performance.',
    technologies: ['Python', 'Pandas', 'Scikit-learn'],
    category: 'Data Science',
    academicYear: '2025–26',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    problemStatement:
      'Identifying early academic difficulties across large college student cohorts using multi-semester grade and attendance patterns.',
    objectives: [
      'Cleanse and normalize multi-source academic transcripts and lab score datasets.',
      'Train predictive regression and clustering models to flag early dropout warning indicators.',
      'Deliver interactive visual performance summaries for academic counselors and faculty advisors.',
    ],
  },
  {
    id: 'proj-06',
    title: 'Campus Event Management',
    description:
      'A platform for organizing and managing college events.',
    technologies: ['React', 'Firebase'],
    category: 'Web Development',
    academicYear: '2024–25',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
    problemStatement:
      'Consolidating scattered registration forms, room schedules, and ticketing passes for campus symposiums and hackathons.',
    objectives: [
      'Develop real-time event timetable scheduling powered by Firebase Cloud Firestore.',
      'Generate dynamic participant QR tickets for instantaneous check-in verification at auditoriums.',
      'Provide student organizing committees with live RSVP capacity tracking and announcement broadcasting.',
    ],
  },
]

const CATEGORIES = [
  'All Projects',
  'Artificial Intelligence',
  'Web Development',
  'Data Science',
  'Education Technology',
  'Full Stack Development',
] as const

interface ProjectRepositorySectionProps {
  onViewAllProjects?: () => void
}

export const ProjectRepositorySection: React.FC<ProjectRepositorySectionProps> = ({
  onViewAllProjects,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Projects')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<RepositoryProject | null>(null)

  // Filter projects by category & search query
  const filteredProjects = useMemo(() => {
    return DEMO_PROJECTS.filter((proj) => {
      const matchesCategory =
        selectedCategory === 'All Projects' || proj.category === selectedCategory

      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchesCategory

      const matchesSearch =
        proj.title.toLowerCase().includes(query) ||
        proj.description.toLowerCase().includes(query) ||
        proj.technologies.some((tech) => tech.toLowerCase().includes(query)) ||
        proj.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  const handleResetFilters = () => {
    setSelectedCategory('All Projects')
    setSearchQuery('')
  }

  return (
    <section
      id="project-repository"
      className="relative py-24 sm:py-32 bg-[#FFFFFF] border-t border-slate-200/80 overflow-hidden"
    >
      {/* Subtle ambient light */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <SectionHeading
          category="ACADEMIC KNOWLEDGE HUB"
          title="Learn From Projects Built Before You"
          subtitle="Discover academic projects, explore technologies and find inspiration for your next innovation."
          centered
        />

        {/* Filter and Search Bar */}
        <div className="mt-10 sm:mt-12 space-y-5">
          {/* Top row: Search input + Results summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, technologies, or topics..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6658FF]/40 focus:border-[#6658FF] placeholder:text-slate-400 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Showing <strong>{filteredProjects.length}</strong> of{' '}
                {DEMO_PROJECTS.length} Demonstration Projects
              </span>
            </div>
          </div>

          {/* Category Pill Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#6658FF] text-white border-[#6658FF] shadow-sm shadow-[#6658FF]/30'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#6658FF]/40 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Project Gallery Grid: 3 cols Desktop, 2 cols Tablet, 1 col Mobile */}
        <div className="mt-8 sm:mt-10">
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProjects.map((project, idx) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={idx}
                  onViewDetails={setSelectedProject}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No matching projects found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No demonstration projects match "{searchQuery}" under {selectedCategory}.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#6658FF] bg-[#6658FF]/10 hover:bg-[#6658FF]/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Section Navigation: View All Projects CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <button
            onClick={() => {
              if (onViewAllProjects) {
                onViewAllProjects()
              } else {
                alert('Academic Project Repository route will be available in future releases. Exploring all 6 demonstration records.')
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm text-[#0B192C] bg-white border border-slate-300 hover:border-[#6658FF] hover:text-[#6658FF] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
          >
            <Layers className="w-4 h-4 text-[#6658FF]" />
            <span>View All Projects</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#6658FF] group-hover:translate-x-1 transition-all" />
          </button>
          <p className="mt-2.5 text-xs text-slate-400 font-medium">
            Browse through university capstone archives, problem statements, and implementation notes.
          </p>
        </div>
      </div>

      {/* Project Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailsModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

export default ProjectRepositorySection
