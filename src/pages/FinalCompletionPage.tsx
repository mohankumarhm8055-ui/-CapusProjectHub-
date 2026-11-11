import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  History,
  Layers,
  Lock,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { authService } from '../services/authService'
import {
  finalLifecycleApiService,
  type DeliverableSlotKind,
  type EvidenceFileMeta,
  type FinalDeliverableConfig,
  type FinalLifecycleStatus,
  type FinalMetadataPayload,
  type LifecycleProjectDetailResponse,
  type LifecycleProjectListItem,
  type PendingUploadSlot,
  type PublicationDraftPayload,
} from '../services/finalLifecycleApiService'

const STATUS_BADGE: Record<FinalLifecycleStatus, { label: string; cls: string }> = {
  NOT_READY: {
    label: 'Not Ready',
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  FINAL_REVIEW_PENDING: {
    label: 'Final Review Pending',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CORRECTIONS_REQUIRED: {
    label: 'Corrections Required',
    cls: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  COMPLETION_APPROVED: {
    label: 'Completion Approved',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  PUBLICATION_DRAFT: {
    label: 'Publication Draft Saved',
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  PUBLISHED: {
    label: 'Published to Repository',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  UNPUBLISHED: {
    label: 'Unpublished',
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  ARCHIVED: {
    label: 'Archived',
    cls: 'bg-slate-200 text-slate-700 border-slate-300',
  },
}

const EMPTY_METADATA: FinalMetadataPayload = {
  title: '',
  abstract: '',
  problemStatement: '',
  objectives: [],
  proposedSolution: '',
  modules: [],
  technologyStack: [],
  architectureDescription: '',
  challenges: [],
  learningOutcomes: [],
  futureEnhancements: [],
  references: [],
  academicYear: '',
  batch: '',
  semester: '',
  department: '',
  category: 'Web Application',
  githubUrl: '',
  demoUrl: '',
  videoUrl: '',
  documentationUrl: '',
}

const splitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

const joinLines = (items?: string[]): string => (items && items.length > 0 ? items.join('\n') : '')

const parseModulesText = (text: string): Array<{ name: string; description: string }> =>
  splitLines(text).map((line) => {
    const sep = line.indexOf(':')
    if (sep === -1) return { name: line, description: 'Core functional module' }
    return {
      name: line.slice(0, sep).trim(),
      description: line.slice(sep + 1).trim() || 'Core functional module',
    }
  })

const formatModulesText = (mods?: Array<{ name: string; description: string }>): string =>
  (mods || []).map((m) => `${m.name}: ${m.description}`).join('\n')

const parseTechStackText = (text: string): Array<{ name: string; category?: string }> =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name, category: 'Core' }))

const formatTechStackText = (stack?: Array<{ name: string }>): string =>
  (stack || []).map((t) => t.name).join(', ')

const FinalCompletionPage: React.FC = () => {
  const { scheduleId: routeScheduleId } = useParams<{ scheduleId?: string }>()
  const navigate = useNavigate()
  const currentUser = authService.getCurrentUser()
  const userRole = currentUser?.role || 'student'
  const isFacultyOrAdmin = userRole === 'faculty' || userRole === 'admin'
  const isAdmin = userRole === 'admin'

  const [projects, setProjects] = useState<LifecycleProjectListItem[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(routeScheduleId || '')
  const [detail, setDetail] = useState<LifecycleProjectDetailResponse | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'SUBMISSION' | 'FACULTY_PUBLICATION' | 'AUDIT_RULES'>(
    isFacultyOrAdmin ? 'FACULTY_PUBLICATION' : 'SUBMISSION'
  )

  // Student Submission State
  const [meta, setMeta] = useState<FinalMetadataPayload>(EMPTY_METADATA)
  const [objectivesText, setObjectivesText] = useState('')
  const [modulesText, setModulesText] = useState('')
  const [techStackText, setTechStackText] = useState('')
  const [challengesText, setChallengesText] = useState('')
  const [outcomesText, setOutcomesText] = useState('')
  const [futureText, setFutureText] = useState('')
  const [referencesText, setReferencesText] = useState('')
  const [retainedFiles, setRetainedFiles] = useState<
    Array<EvidenceFileMeta & { slot: DeliverableSlotKind }>
  >([])
  const [pendingUploads, setPendingUploads] = useState<PendingUploadSlot[]>([])

  // Faculty Review State
  const [reviewComment, setReviewComment] = useState('')
  const [pubDraft, setPubDraft] = useState<PublicationDraftPayload | null>(null)
  const [pubReason, setPubReason] = useState('')

  // Admin Deliverable Config State
  const [adminConfig, setAdminConfig] = useState<FinalDeliverableConfig | null>(null)

  const loadProjects = useCallback(async () => {
    setLoadingList(true)
    setErrorMsg(null)
    try {
      const items = await finalLifecycleApiService.listProjects()
      setProjects(items)
      if (!selectedScheduleId && items.length > 0) {
        setSelectedScheduleId(items[0].schedule.id)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load academic projects')
    } finally {
      setLoadingList(false)
    }
  }, [selectedScheduleId])

  const hydrateDetailForms = useCallback((d: LifecycleProjectDetailResponse) => {
    const draftSource =
      d.lifecycle.draftSubmission ||
      d.lifecycle.finalSubmissionRevisions[d.lifecycle.finalSubmissionRevisions.length - 1]
    const initialMeta: FinalMetadataPayload = draftSource?.metadata
      ? { ...EMPTY_METADATA, ...draftSource.metadata }
      : {
          ...EMPTY_METADATA,
          title: d.schedule.projectTitle,
          academicYear: d.schedule.academicYear,
          batch: d.schedule.batch || '',
          semester: d.schedule.semester || '',
          department: d.schedule.department,
        }
    setMeta(initialMeta)
    setObjectivesText(joinLines(initialMeta.objectives))
    setModulesText(formatModulesText(initialMeta.modules))
    setTechStackText(formatTechStackText(initialMeta.technologyStack))
    setChallengesText(joinLines(initialMeta.challenges))
    setOutcomesText(joinLines(initialMeta.learningOutcomes))
    setFutureText(joinLines(initialMeta.futureEnhancements))
    setReferencesText(joinLines(initialMeta.references))

    const existingFiles: Array<EvidenceFileMeta & { slot: DeliverableSlotKind }> = []
    if (draftSource) {
      for (const f of draftSource.finalReportFiles || []) existingFiles.push({ ...f, slot: 'FINAL_REPORT' })
      for (const f of draftSource.presentationFiles || []) existingFiles.push({ ...f, slot: 'PRESENTATION' })
      for (const f of draftSource.architectureDiagramFiles || [])
        existingFiles.push({ ...f, slot: 'ARCHITECTURE_DIAGRAM' })
      for (const f of draftSource.screenshotFiles || []) existingFiles.push({ ...f, slot: 'SCREENSHOT' })
      for (const f of draftSource.supportingFiles || []) existingFiles.push({ ...f, slot: 'SUPPORTING' })
    }
    setRetainedFiles(existingFiles)
    setPendingUploads([])
    setPubDraft(d.effectivePublicationDraft)
    setAdminConfig(d.deliverableConfig)
  }, [])

  const loadDetail = useCallback(
    async (scheduleId: string) => {
      if (!scheduleId) return
      setLoadingDetail(true)
      setErrorMsg(null)
      try {
        const res = await finalLifecycleApiService.getProjectDetail(scheduleId)
        setDetail(res)
        hydrateDetailForms(res)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to load project final lifecycle details')
      } finally {
        setLoadingDetail(false)
      }
    },
    [hydrateDetailForms]
  )

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (routeScheduleId && routeScheduleId !== selectedScheduleId) {
      setSelectedScheduleId(routeScheduleId)
    }
  }, [routeScheduleId, selectedScheduleId])

  useEffect(() => {
    if (selectedScheduleId) {
      void loadDetail(selectedScheduleId)
    }
  }, [selectedScheduleId, loadDetail])

  const compiledMetadata = useMemo<FinalMetadataPayload>(
    () => ({
      ...meta,
      objectives: splitLines(objectivesText),
      modules: parseModulesText(modulesText),
      technologyStack: parseTechStackText(techStackText),
      challenges: splitLines(challengesText),
      learningOutcomes: splitLines(outcomesText),
      futureEnhancements: splitLines(futureText),
      references: splitLines(referencesText),
    }),
    [meta, objectivesText, modulesText, techStackText, challengesText, outcomesText, futureText, referencesText]
  )

  const handleFilePick = (slot: DeliverableSlotKind, files: FileList | null) => {
    if (!files || files.length === 0) return
    const added: PendingUploadSlot[] = Array.from(files).map((file) => ({
      file,
      slot,
      evidenceCategory: slot,
    }))
    setPendingUploads((prev) => [...prev, ...added])
  }

  const handleOpenPrivateFile = async (fileId: string, download: boolean) => {
    try {
      const blobUrl = await finalLifecycleApiService.fetchPrivateFileBlobUrl(fileId, download)
      if (download) {
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `deliverable-${fileId}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer')
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to open deliverable file')
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedScheduleId) return
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      await finalLifecycleApiService.saveDraft(selectedScheduleId, {
        metadata: compiledMetadata,
        uploads: pendingUploads,
        retainFileIds: retainedFiles.map((f) => f.fileId),
      })
      setStatusMsg('Final submission draft saved.')
      await Promise.all([loadProjects(), loadDetail(selectedScheduleId)])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitFinalReview = async () => {
    if (!selectedScheduleId) return
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      const res = await finalLifecycleApiService.submitForFinalReview(selectedScheduleId, {
        metadata: compiledMetadata,
        uploads: pendingUploads,
        retainFileIds: retainedFiles.map((f) => f.fileId),
      })
      setStatusMsg(
        `Final submission Revision #${res.snapshot.revisionNumber} recorded and sent to faculty guide for final review.`
      )
      await Promise.all([loadProjects(), loadDetail(selectedScheduleId)])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Cannot submit for final review yet')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFacultyAction = async (
    action: 'ADD_FEEDBACK' | 'REQUEST_CORRECTIONS' | 'APPROVE_COMPLETION'
  ) => {
    if (!selectedScheduleId) return
    if (!reviewComment.trim()) {
      setErrorMsg('Please enter faculty review remarks before continuing.')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      await finalLifecycleApiService.performFinalReview(selectedScheduleId, {
        action,
        comment: reviewComment.trim(),
      })
      setReviewComment('')
      setStatusMsg(
        action === 'APPROVE_COMPLETION'
          ? 'Project final completion approved. Repository publication remains an explicit next step.'
          : action === 'REQUEST_CORRECTIONS'
            ? 'Final corrections requested and student team notified.'
            : 'Faculty review feedback added.'
      )
      await Promise.all([loadProjects(), loadDetail(selectedScheduleId)])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record faculty final review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSavePublicationDraft = async (notifyReady = false) => {
    if (!selectedScheduleId || !pubDraft) return
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      await finalLifecycleApiService.savePublicationDraft(selectedScheduleId, {
        ...pubDraft,
        notifyReady,
      })
      setStatusMsg('Curated repository publication draft saved.')
      await Promise.all([loadProjects(), loadDetail(selectedScheduleId)])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save publication draft')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedScheduleId) return
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      const res = await finalLifecycleApiService.publishProject(selectedScheduleId)
      setStatusMsg(`Published to main CampusProjectHub repository (Project ID: ${res.projectId}).`)
      await Promise.all([loadProjects(), loadDetail(selectedScheduleId)])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to publish project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnpublishOrArchive = async (mode: 'UNPUBLISH' | 'ARCHIVE') => {
    if (!selectedScheduleId) return
    if (pubReason.trim().length < 5) {
      setErrorMsg('Please enter an audit reason (at least 5 characters) before changing publication visibility.')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      if (mode === 'UNPUBLISH') {
        await finalLifecycleApiService.unpublishProject(selectedScheduleId, pubReason.trim())
        setStatusMsg('Project unpublished and hidden from public repository discovery.')
      } else {
        await finalLifecycleApiService.archiveProject(selectedScheduleId, pubReason.trim())
        setStatusMsg('Project archived from active repository discovery.')
      }
      setPubReason('')
      await Promise.all([loadProjects(), loadDetail(selectedScheduleId)])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update repository status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAdminConfig = async () => {
    if (!adminConfig) return
    setSubmitting(true)
    setErrorMsg(null)
    setStatusMsg(null)
    try {
      const updated = await finalLifecycleApiService.updateConfig({
        mandatoryDeliverables: adminConfig.mandatoryDeliverables,
        requireStartedWeeklyReportsSubmitted: adminConfig.requireStartedWeeklyReportsSubmitted,
        requireAllWeeklyReportsSubmitted: adminConfig.requireAllWeeklyReportsSubmitted,
        minimumWeeklyReportsRequired: adminConfig.minimumWeeklyReportsRequired,
      })
      setAdminConfig(updated)
      setStatusMsg('Institutional final deliverable rules updated.')
      if (selectedScheduleId) {
        await loadDetail(selectedScheduleId)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update institutional rules')
    } finally {
      setSubmitting(false)
    }
  }

  const latestRevision = useMemo(() => {
    if (!detail || detail.lifecycle.finalSubmissionRevisions.length === 0) return null
    return detail.lifecycle.finalSubmissionRevisions[
      detail.lifecycle.finalSubmissionRevisions.length - 1
    ]
  }, [detail])

  const allSubmittedFiles = useMemo(() => {
    if (!latestRevision) {
      return {
        screenshots: retainedFiles.filter((f) => f.slot === 'SCREENSHOT'),
        diagrams: retainedFiles.filter((f) => f.slot === 'ARCHITECTURE_DIAGRAM'),
        reports: retainedFiles.filter((f) => f.slot === 'FINAL_REPORT'),
        presentations: retainedFiles.filter((f) => f.slot === 'PRESENTATION'),
        supporting: retainedFiles.filter((f) => f.slot === 'SUPPORTING'),
      }
    }
    return {
      screenshots: latestRevision.screenshotFiles || [],
      diagrams: latestRevision.architectureDiagramFiles || [],
      reports: latestRevision.finalReportFiles || [],
      presentations: latestRevision.presentationFiles || [],
      supporting: latestRevision.supportingFiles || [],
    }
  }, [latestRevision, retainedFiles])

  const lifecycleStatus = detail?.lifecycle.status || 'NOT_READY'
  const statusMeta = STATUS_BADGE[lifecycleStatus]

  const isTeamMember = Boolean(
    detail && currentUser && detail.schedule.assignedStudentIds.includes(currentUser.id)
  )
  const isAssignedFaculty = Boolean(
    detail && currentUser && (detail.schedule.facultyGuideId === currentUser.id || isAdmin)
  )
  const canEditSubmission =
    isTeamMember &&
    !['COMPLETION_APPROVED', 'PUBLICATION_DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(lifecycleStatus)
  const canCuratePublication =
    isAssignedFaculty &&
    ['COMPLETION_APPROVED', 'PUBLICATION_DRAFT', 'PUBLISHED', 'UNPUBLISHED'].includes(lifecycleStatus)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header & Project Selector */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6658FF]/10 text-[#6658FF] text-xs font-bold mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Academic Capstone Completion & Publication</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
                Final Completion & Repository Publication
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                Verify mandatory academic milestones, submit final deliverables and metadata, complete faculty
                completion review, and curate verified projects for public repository discovery.
              </p>
            </div>

            {detail && (
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${statusMeta.cls}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{statusMeta.label}</span>
                </span>
                {detail.lifecycle.status === 'PUBLISHED' && (
                  <Link
                    to={`/explore-projects/${detail.schedule.projectId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#6658FF] text-white hover:bg-[#5546FF]"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>View Public Repository Entry</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-3 border-t border-slate-100">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Select Assigned Academic Project
              </label>
              <select
                value={selectedScheduleId}
                onChange={(e) => {
                  const next = e.target.value
                  setSelectedScheduleId(next)
                  navigate(isFacultyOrAdmin ? `/faculty-final-review/${next}` : `/final-completion/${next}`, {
                    replace: true,
                  })
                }}
                disabled={loadingList}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6658FF]"
              >
                {projects.length === 0 && <option value="">No active academic schedules found</option>}
                {projects.map((p) => (
                  <option key={p.schedule.id} value={p.schedule.id}>
                    {p.schedule.projectTitle} — {STATUS_BADGE[p.lifecycleStatus].label} (
                    {p.schedule.academicYear})
                  </option>
                ))}
              </select>
            </div>

            {detail && (
              <div className="md:col-span-6 flex flex-wrap gap-3 text-xs text-slate-600">
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Faculty Guide</span>
                  <span className="font-bold text-slate-800">{detail.schedule.facultyGuideName}</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Department</span>
                  <span className="font-bold text-slate-800">{detail.schedule.department}</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Revisions</span>
                  <span className="font-bold text-slate-800">
                    Rev #{detail.lifecycle.latestRevisionNumber}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {statusMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {loadingDetail && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading final lifecycle workspace...
          </div>
        )}

        {!loadingDetail && detail && (
          <>
            {/* Live Completion Eligibility Checklist */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[#0B192C] flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-[#6658FF]" />
                    <span>Final Completion Eligibility Checklist</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mandatory scheduled activities ({detail.eligibility.metrics.mandatoryActivitiesApproved}/
                    {detail.eligibility.metrics.mandatoryActivitiesTotal} approved) and institutional
                    deliverables must pass before final review. Optional activities (
                    {detail.eligibility.metrics.optionalActivitiesTotal}) never block completion.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    detail.eligibility.eligibleForFinalReview
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {detail.eligibility.eligibleForFinalReview
                    ? 'All Completion Requirements Satisfied'
                    : `${detail.eligibility.blockingReasons.length} Requirement(s) Pending`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {detail.eligibility.checklist.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-3.5 text-xs space-y-1 ${
                      item.passed
                        ? 'bg-emerald-50/40 border-emerald-200/80'
                        : item.required
                          ? 'bg-rose-50/40 border-rose-200/80'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">{item.label}</span>
                      {item.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Workspace Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('SUBMISSION')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer border ${
                  activeTab === 'SUBMISSION'
                    ? 'bg-[#6658FF] text-white border-[#6658FF]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#6658FF]/40'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Final Deliverables & Metadata</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FACULTY_PUBLICATION')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer border ${
                  activeTab === 'FACULTY_PUBLICATION'
                    ? 'bg-[#6658FF] text-white border-[#6658FF]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#6658FF]/40'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Faculty Final Review & Publication</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AUDIT_RULES')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer border ${
                  activeTab === 'AUDIT_RULES'
                    ? 'bg-[#6658FF] text-white border-[#6658FF]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#6658FF]/40'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Trail & Deliverable Rules</span>
              </button>
            </div>

            {/* TAB 1: STUDENT FINAL DELIVERABLES & METADATA */}
            {activeTab === 'SUBMISSION' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Private Deliverable Uploads */}
                  <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-[#0B192C]">
                          Final Deliverables (Stored Privately Until Published)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Upload finalized academic artifacts cleanly separated by slot. Unselected internal
                          files never appear in the public repository.
                        </p>
                      </div>
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(
                        [
                          { slot: 'FINAL_REPORT', label: 'Final Project Report (PDF/DOCX)', multiple: false },
                          { slot: 'PRESENTATION', label: 'Presentation Slides (PDF/PPTX)', multiple: false },
                          {
                            slot: 'ARCHITECTURE_DIAGRAM',
                            label: 'Architecture Diagram (PNG/SVG/PDF)',
                            multiple: false,
                          },
                          { slot: 'SCREENSHOT', label: 'Application Screenshots (Images)', multiple: true },
                        ] as Array<{ slot: DeliverableSlotKind; label: string; multiple: boolean }>
                      ).map((box) => (
                        <label
                          key={box.slot}
                          className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 hover:border-[#6658FF] p-3.5 block cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>{box.label}</span>
                            <Upload className="w-3.5 h-3.5 text-[#6658FF]" />
                          </div>
                          <input
                            type="file"
                            multiple={box.multiple}
                            disabled={!canEditSubmission}
                            onChange={(e) => handleFilePick(box.slot, e.target.files)}
                            className="text-xs text-slate-500 w-full file:mr-2 file:rounded-lg file:border-0 file:bg-[#6658FF]/10 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-[#6658FF]"
                          />
                        </label>
                      ))}
                    </div>

                    {/* Retained & Pending Files */}
                    {(retainedFiles.length > 0 || pendingUploads.length > 0) && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Attached Deliverables
                        </h4>
                        <div className="space-y-1.5">
                          {retainedFiles.map((file) => (
                            <div
                              key={file.fileId}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-mono font-bold text-[#6658FF] mr-2">
                                  [{file.slot}]
                                </span>
                                <span className="font-semibold text-slate-800 truncate">
                                  {file.originalName}
                                </span>
                                <span className="text-slate-400 ml-2">
                                  ({Math.max(1, Math.round(file.sizeBytes / 1024))} KB)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrivateFile(file.fileId, false)}
                                  className="text-[#6658FF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrivateFile(file.fileId, true)}
                                  className="text-slate-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                {canEditSubmission && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRetainedFiles((prev) =>
                                        prev.filter((item) => item.fileId !== file.fileId)
                                      )
                                    }
                                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                                    title="Remove from draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {pendingUploads.map((item, idx) => (
                            <div
                              key={`${item.file.name}-${idx}`}
                              className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-indigo-700 mr-2">
                                  [NEW {item.slot}]
                                </span>
                                <span className="font-semibold text-slate-800">{item.file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingUploads((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Structured Academic Metadata Form */}
                  <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-[#0B192C]">
                      Final Academic Metadata & Repository Links
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-600 block mb-1">Final Project Title</label>
                        <input
                          type="text"
                          value={meta.title}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-600 block mb-1">Final Abstract</label>
                        <textarea
                          rows={3}
                          value={meta.abstract}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, abstract: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Problem Statement</label>
                        <textarea
                          rows={3}
                          value={meta.problemStatement}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, problemStatement: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Proposed Solution</label>
                        <textarea
                          rows={3}
                          value={meta.proposedSolution}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, proposedSolution: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">
                          Objectives (one per line)
                        </label>
                        <textarea
                          rows={3}
                          value={objectivesText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setObjectivesText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">
                          Modules (Name: Description per line)
                        </label>
                        <textarea
                          rows={3}
                          value={modulesText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setModulesText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-600 block mb-1">
                          Technology Stack (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={techStackText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setTechStackText(e.target.value)}
                          placeholder="React, Node.js, Express, MongoDB"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-600 block mb-1">
                          Architecture Summary
                        </label>
                        <textarea
                          rows={2}
                          value={meta.architectureDescription || ''}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, architectureDescription: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">
                          Challenges Overcome (one per line)
                        </label>
                        <textarea
                          rows={2}
                          value={challengesText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setChallengesText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">
                          Learning Outcomes (one per line)
                        </label>
                        <textarea
                          rows={2}
                          value={outcomesText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setOutcomesText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">
                          Future Enhancements (one per line)
                        </label>
                        <textarea
                          rows={2}
                          value={futureText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setFutureText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">
                          References (one per line)
                        </label>
                        <textarea
                          rows={2}
                          value={referencesText}
                          disabled={!canEditSubmission}
                          onChange={(e) => setReferencesText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">GitHub Repository URL</label>
                        <input
                          type="url"
                          value={meta.githubUrl || ''}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, githubUrl: e.target.value })}
                          placeholder="https://github.com/..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Demo / Walkthrough URL</label>
                        <input
                          type="url"
                          value={meta.demoUrl || ''}
                          disabled={!canEditSubmission}
                          onChange={(e) => setMeta({ ...meta, demoUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    {canEditSubmission && (
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleSaveDraft}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Save Final Draft
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleSubmitFinalReview}
                          className="px-5 py-2.5 rounded-xl bg-[#6658FF] text-white text-xs sm:text-sm font-bold hover:bg-[#5546FF] flex items-center gap-2 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>
                            {lifecycleStatus === 'CORRECTIONS_REQUIRED'
                              ? 'Resubmit Corrected Final Package'
                              : 'Submit for Final Faculty Review'}
                          </span>
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                {/* Right Sidebar: Revisions & Faculty Final Feedback */}
                <div className="lg:col-span-4 space-y-6">
                  <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#6658FF]" />
                      <span>Final Submission Revisions ({detail.lifecycle.finalSubmissionRevisions.length})</span>
                    </h3>
                    {detail.lifecycle.finalSubmissionRevisions.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No final review submission recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {detail.lifecycle.finalSubmissionRevisions.map((rev) => (
                          <div
                            key={rev.revisionNumber}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span>Revision #{rev.revisionNumber}</span>
                              <span className="text-[11px] font-normal text-slate-500">
                                {new Date(rev.submittedAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-600">By {rev.submittedByStudentName}</p>
                            <p className="text-[11px] text-slate-500">
                              Report: {rev.finalReportFiles.length} | Slides: {rev.presentationFiles.length}{' '}
                              | Screenshots: {rev.screenshotFiles.length}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-[#0B192C]">Faculty Final Feedback</h3>
                    {detail.lifecycle.facultyFeedback.length === 0 ? (
                      <p className="text-xs text-slate-500">No faculty final review comments recorded yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {detail.lifecycle.facultyFeedback.map((fb) => (
                          <div
                            key={fb.feedbackId}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{fb.facultyName}</span>
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                                {fb.action.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-slate-700">{fb.comment}</p>
                            <span className="text-[10px] text-slate-400 block">
                              Rev #{fb.revisionNumber} • {new Date(fb.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* TAB 2: FACULTY FINAL REVIEW & PUBLICATION PREPARATION */}
            {activeTab === 'FACULTY_PUBLICATION' && (
              <div className="space-y-6">
                {/* Summary of Approved Activities & Weekly Reports */}
                <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B192C] mb-2">
                      Scheduled Activity Approvals
                    </h3>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {detail.schedule.activities.map((act) => (
                        <div
                          key={act.activityId}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-slate-800">
                            {act.sequenceNumber}. {act.title}{' '}
                            {!act.isMandatory && (
                              <span className="text-[10px] text-slate-400">(Optional)</span>
                            )}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-600">
                            {act.facultyReviewStatus || act.activityStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B192C] mb-2">
                      Weekly Progress Reports ({detail.weeklyReports.length})
                    </h3>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {detail.weeklyReports.map((rep) => (
                        <div
                          key={rep.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-slate-800">
                            Week {rep.weekNumber} ({new Date(rep.periodStart).toLocaleDateString()} –{' '}
                            {new Date(rep.periodEnd).toLocaleDateString()})
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-600">
                            {rep.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Faculty Final Completion Decision */}
                {isAssignedFaculty && (
                  <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#0B192C]">
                        Faculty Final Completion Review
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Approving completion validates the academic submission (`COMPLETION_APPROVED`), distinct
                        from activity approvals and distinct from repository publication.
                      </p>
                    </div>

                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Enter final academic evaluation remarks or specific correction items..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleFacultyAction('ADD_FEEDBACK')}
                        className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Add Final Feedback
                      </button>
                      <button
                        type="button"
                        disabled={
                          submitting ||
                          !['FINAL_REVIEW_PENDING', 'CORRECTIONS_REQUIRED'].includes(lifecycleStatus)
                        }
                        onClick={() => handleFacultyAction('REQUEST_CORRECTIONS')}
                        className="px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                      >
                        Request Final Corrections
                      </button>
                      <button
                        type="button"
                        disabled={submitting || lifecycleStatus !== 'FINAL_REVIEW_PENDING'}
                        onClick={() => handleFacultyAction('APPROVE_COMPLETION')}
                        className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Final Completion</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* Publication Preparation & Explicit Control */}
                {pubDraft && (
                  <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-[#0B192C]">
                          Publication Preparation & Repository Controls
                        </h3>
                        <p className="text-xs text-slate-500">
                          Curate only approved public fields and selected assets. Private emails, internal
                          feedback, and unselected files are never exposed in CampusProjectHub discovery.
                        </p>
                      </div>
                      {!canCuratePublication && isAssignedFaculty && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                          Approve final completion first to unlock repository publication
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Curate Fields + Select Supporting Material */}
                      <div className="lg:col-span-7 space-y-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">Public Title (4A)</label>
                          <input
                            type="text"
                            disabled={!canCuratePublication}
                            value={pubDraft.title}
                            onChange={(e) => setPubDraft({ ...pubDraft, title: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">Academic Year</label>
                            <input
                              type="text"
                              disabled={!canCuratePublication}
                              value={pubDraft.academicYear}
                              onChange={(e) =>
                                setPubDraft({ ...pubDraft, academicYear: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">Batch</label>
                            <input
                              type="text"
                              disabled={!canCuratePublication}
                              value={pubDraft.batch || ''}
                              onChange={(e) => setPubDraft({ ...pubDraft, batch: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">Department</label>
                            <input
                              type="text"
                              disabled={!canCuratePublication}
                              value={pubDraft.department}
                              onChange={(e) => setPubDraft({ ...pubDraft, department: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Curated Abstract Summary (4B)
                          </label>
                          <textarea
                            rows={3}
                            disabled={!canCuratePublication}
                            value={pubDraft.abstract}
                            onChange={(e) => setPubDraft({ ...pubDraft, abstract: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>

                        {/* Supporting Asset Allowlist Selection (4C) */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                          <h4 className="font-bold text-slate-800">
                            Selected Supporting Material for Public View (4C)
                          </h4>

                          <div>
                            <span className="text-[11px] font-bold text-slate-500 block mb-1">
                              Approved Screenshots (check to publish)
                            </span>
                            {allSubmittedFiles.screenshots.length === 0 ? (
                              <span className="text-slate-400">No final screenshots uploaded.</span>
                            ) : (
                              <div className="space-y-1">
                                {allSubmittedFiles.screenshots.map((f) => {
                                  const checked = pubDraft.selectedScreenshotFileIds.includes(f.fileId)
                                  return (
                                    <label
                                      key={f.fileId}
                                      className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                                    >
                                      <span className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          disabled={!canCuratePublication}
                                          checked={checked}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...pubDraft.selectedScreenshotFileIds, f.fileId]
                                              : pubDraft.selectedScreenshotFileIds.filter(
                                                  (id) => id !== f.fileId
                                                )
                                            setPubDraft({
                                              ...pubDraft,
                                              selectedScreenshotFileIds: next,
                                            })
                                          }}
                                        />
                                        <span>{f.originalName}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPrivateFile(f.fileId, false)}
                                        className="text-[#6658FF] hover:underline"
                                      >
                                        Inspect
                                      </button>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                                Architecture Diagram
                              </span>
                              <select
                                disabled={!canCuratePublication}
                                value={pubDraft.selectedArchitectureDiagramFileId || ''}
                                onChange={(e) =>
                                  setPubDraft({
                                    ...pubDraft,
                                    selectedArchitectureDiagramFileId: e.target.value || undefined,
                                  })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                              >
                                <option value="">None exposed publicly</option>
                                {allSubmittedFiles.diagrams.map((d) => (
                                  <option key={d.fileId} value={d.fileId}>
                                    {d.originalName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                                Approved Final Report PDF
                              </span>
                              <select
                                disabled={!canCuratePublication}
                                value={pubDraft.selectedFinalReportFileId || ''}
                                onChange={(e) =>
                                  setPubDraft({
                                    ...pubDraft,
                                    selectedFinalReportFileId: e.target.value || undefined,
                                  })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                              >
                                <option value="">None exposed publicly</option>
                                {allSubmittedFiles.reports.map((r) => (
                                  <option key={r.fileId} value={r.fileId}>
                                    {r.originalName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {canCuratePublication && (
                          <div className="space-y-3 pt-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleSavePublicationDraft(true)}
                                className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 font-bold hover:bg-indigo-100 cursor-pointer"
                              >
                                Save Publication Draft
                              </button>
                              {lifecycleStatus !== 'PUBLISHED' && (
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={handlePublish}
                                  className="px-5 py-2 rounded-xl bg-[#6658FF] text-white font-bold hover:bg-[#5546FF] flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Globe className="w-4 h-4" />
                                  <span>Publish to Repository</span>
                                </button>
                              )}
                            </div>

                            {/* Unpublish / Archive Controls */}
                            <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50 space-y-2">
                              <label className="text-[11px] font-bold text-slate-600 block">
                                Audit Reason for Unpublish / Archive
                              </label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={pubReason}
                                  onChange={(e) => setPubReason(e.target.value)}
                                  placeholder="Reason recorded in repository audit log..."
                                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                />
                                {lifecycleStatus === 'PUBLISHED' && (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleUnpublishOrArchive('UNPUBLISH')}
                                    className="px-3.5 py-1.5 rounded-xl border border-orange-300 bg-orange-50 text-orange-800 font-bold hover:bg-orange-100 flex items-center gap-1 cursor-pointer"
                                  >
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Unpublish</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => handleUnpublishOrArchive('ARCHIVE')}
                                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>Archive</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Formatted Publication Preview Card */}
                      <div className="lg:col-span-5">
                        <div className="rounded-2xl border border-[#6658FF]/25 bg-gradient-to-b from-[#6658FF]/5 to-white p-5 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono uppercase text-[10px] font-bold text-[#6658FF]">
                              Public Repository Preview (4A–4D)
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">
                              {pubDraft.academicYear} {pubDraft.batch ? `• ${pubDraft.batch}` : ''}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-[#0B192C]">{pubDraft.title}</h4>
                          <p className="text-slate-600 leading-relaxed">{pubDraft.abstract}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {pubDraft.technologyStack.map((t) => (
                              <span
                                key={t.name}
                                className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-semibold"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-slate-200/80 space-y-1">
                            <p className="font-bold text-slate-700">
                              Selected Assets: {pubDraft.selectedScreenshotFileIds.length} screenshots •{' '}
                              {pubDraft.selectedArchitectureDiagramFileId ? '1 diagram' : '0 diagrams'} •{' '}
                              {pubDraft.selectedFinalReportFileId ? '1 report PDF' : '0 PDFs'}
                            </p>
                            <p className="text-slate-600">
                              <strong>Team (4D):</strong>{' '}
                              {pubDraft.teamMembers.map((m) => m.name).join(', ') || 'Assigned Team'}
                            </p>
                            <p className="text-slate-600">
                              <strong>Faculty Guide:</strong> {pubDraft.facultyGuide.name} (
                              {pubDraft.facultyGuide.department || pubDraft.department})
                            </p>
                            <p className="text-[11px] text-emerald-700">
                              Verified Clean: private emails, internal review comments & unselected files excluded.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* TAB 3: AUDIT TRAIL & DELIVERABLE RULES */}
            {activeTab === 'AUDIT_RULES' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2">
                    <History className="w-4 h-4 text-[#6658FF]" />
                    <span>Final Lifecycle Audit Trail</span>
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {detail.lifecycle.auditHistory.map((entry) => (
                      <div
                        key={entry.entryId}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{entry.action.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {entry.previousStatus} {'->'} {entry.newStatus}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Actor: {entry.actorName} ({entry.actorRole}) •{' '}
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        {entry.comment && <p className="text-slate-700 italic">"{entry.comment}"</p>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#6658FF]" />
                    <span>Institutional Deliverable Rules</span>
                  </h3>
                  {adminConfig && (
                    <div className="space-y-2.5 text-xs">
                      {(
                        [
                          { key: 'finalReport', label: 'Final Report Upload Mandatory' },
                          { key: 'presentation', label: 'Presentation Slides Mandatory' },
                          { key: 'sourceCodeOrGithub', label: 'Source Code / GitHub URL Mandatory' },
                          { key: 'architectureDiagram', label: 'Architecture Diagram Mandatory' },
                          { key: 'screenshots', label: 'Screenshots Mandatory' },
                          { key: 'demoLinkOrVideo', label: 'Demo / Video Link Mandatory' },
                        ] as Array<{
                          key: keyof FinalDeliverableConfig['mandatoryDeliverables']
                          label: string
                        }>
                      ).map((rule) => (
                        <label
                          key={rule.key}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                        >
                          <span className="font-semibold text-slate-700">{rule.label}</span>
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={adminConfig.mandatoryDeliverables[rule.key]}
                            onChange={(e) =>
                              setAdminConfig({
                                ...adminConfig,
                                mandatoryDeliverables: {
                                  ...adminConfig.mandatoryDeliverables,
                                  [rule.key]: e.target.checked,
                                },
                              })
                            }
                          />
                        </label>
                      ))}

                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                        <span className="font-semibold text-slate-700">
                          Require Started Weekly Reports Submitted
                        </span>
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={adminConfig.requireStartedWeeklyReportsSubmitted}
                          onChange={(e) =>
                            setAdminConfig({
                              ...adminConfig,
                              requireStartedWeeklyReportsSubmitted: e.target.checked,
                            })
                          }
                        />
                      </label>

                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleSaveAdminConfig}
                          className="w-full py-2.5 rounded-xl bg-[#6658FF] text-white font-bold hover:bg-[#5546FF] cursor-pointer"
                        >
                          Save Institutional Deliverable Rules
                        </button>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Only administrators can modify institutional completion requirements.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default FinalCompletionPage
