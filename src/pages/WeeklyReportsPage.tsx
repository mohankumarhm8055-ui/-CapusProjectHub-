import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import type {
  EvidenceCategory,
  EvidenceFileMeta,
  EvidenceLink,
  EvidenceLinkType,
} from '../services/activitySubmissionApiService'
import { authService } from '../services/authService'
import {
  weeklyReportApiService,
  type EnrichedWeeklyPeriod,
  type WeeklyFacultyReviewAction,
  type WeeklyReportStatus,
  type WeeklyWorkspaceSummary,
} from '../services/weeklyReportApiService'

const STATUS_BADGE: Record<WeeklyReportStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: 'Not Started', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  DRAFT: { label: 'Draft', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  CLARIFICATION_REQUESTED: {
    label: 'Clarification Requested',
    className: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  FINALIZED: { label: 'Finalized', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OVERDUE: { label: 'Overdue', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const ALLOWED_EXT = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp']

function inferCategory(fileName: string): EvidenceCategory {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'PDF_DOCUMENT'
  if (lower.endsWith('.docx')) return 'DOCX_DOCUMENT'
  return 'IMAGE_EVIDENCE'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const WeeklyReportsPage: React.FC = () => {
  const { scheduleId } = useParams<{ scheduleId?: string }>()
  const navigate = useNavigate()
  const currentUser = authService.getCurrentUser()
  const isFacultyOrAdmin = currentUser?.role === 'faculty' || currentUser?.role === 'admin'
  const isStudent = currentUser?.role === 'student'

  const [workspaces, setWorkspaces] = useState<WeeklyWorkspaceSummary[]>([])
  const [selectedWs, setSelectedWs] = useState<WeeklyWorkspaceSummary | null>(null)
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Shared 5-Section Form State
  const [workCompleted, setWorkCompleted] = useState('')
  const [workInProgress, setWorkInProgress] = useState('')
  const [challengesOrBlockers, setChallengesOrBlockers] = useState('')
  const [planForNextWeek, setPlanForNextWeek] = useState('')
  const [supportingEvidenceNotes, setSupportingEvidenceNotes] = useState('')
  const [links, setLinks] = useState<EvidenceLink[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkType, setNewLinkType] = useState<EvidenceLinkType>('GITHUB_REPOSITORY')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [retainFileIds, setRetainFileIds] = useState<string[]>([])
  const [queuedFiles, setQueuedFiles] = useState<Array<{ file: File; category: EvidenceCategory }>>([])
  const [isDragging, setIsDragging] = useState(false)

  // Individual Contribution Form State
  const [contribWork, setContribWork] = useState('')
  const [contribActivityId, setContribActivityId] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [contribLinks, setContribLinks] = useState<EvidenceLink[]>([])
  const [contribLinkUrl, setContribLinkUrl] = useState('')

  // Faculty Review Form State
  const [facultyComment, setFacultyComment] = useState('')

  // Private Preview Modal
  const [previewFile, setPreviewFile] = useState<{ meta: EvidenceFileMeta; objectUrl: string } | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) URL.revokeObjectURL(previewFile.objectUrl)
    }
  }, [previewFile])

  const syncFormForWeek = (ws: WeeklyWorkspaceSummary | null, weekNumber: number) => {
    const wk = ws?.weeks.find((w) => w.period.weekNumber === weekNumber) || null
    const rep = wk?.report || null
    setWorkCompleted(rep?.workCompleted || '')
    setWorkInProgress(rep?.workInProgress || '')
    setChallengesOrBlockers(rep?.challengesOrBlockers || '')
    setPlanForNextWeek(rep?.planForNextWeek || '')
    setSupportingEvidenceNotes(rep?.supportingEvidenceNotes || '')
    setLinks(rep?.evidenceLinks || [])
    setRetainFileIds((rep?.evidenceFiles || []).map((f) => f.fileId))
    setQueuedFiles([])

    const myContrib = rep?.contributions.find((c) => c.studentId === currentUser?.id)
    setContribWork(myContrib?.workPerformed || '')
    setContribActivityId(myContrib?.relatedActivityId || '')
    setContribNote(myContrib?.supportingEvidenceNote || '')
    setContribLinks(myContrib?.evidenceLinks || [])
    setFacultyComment('')
  }

  const loadWorkspaces = async (preserveWeek?: number) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const list = await weeklyReportApiService.listWorkspaces()
      setWorkspaces(list)
      const chosen =
        (scheduleId ? list.find((w) => w.schedule.id === scheduleId) : null) || list[0] || null
      setSelectedWs(chosen)
      const defaultWeek = preserveWeek || chosen?.currentWeekNumber || chosen?.weeks[0]?.period.weekNumber || 1
      setSelectedWeekNum(defaultWeek)
      syncFormForWeek(chosen, defaultWeek)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load weekly reporting workspace.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspaces()
  }, [scheduleId])

  const activeWeek: EnrichedWeeklyPeriod | null =
    selectedWs?.weeks.find((w) => w.period.weekNumber === selectedWeekNum) || null

  const activeReport = activeWeek?.report || null
  const isStudentEditable =
    isStudent &&
    (!activeReport ||
      activeReport.status === 'DRAFT' ||
      activeReport.status === 'CLARIFICATION_REQUESTED')

  const pendingWeeks = selectedWs?.weeks.filter((w) => w.isPendingSubmission) || []

  const handleSelectWeek = (wkNum: number) => {
    setSelectedWeekNum(wkNum)
    setErrorMsg(null)
    setSuccessMsg(null)
    syncFormForWeek(selectedWs, wkNum)
  }

  const handleIncomingFiles = (fileList: FileList | null) => {
    if (!fileList) return
    setErrorMsg(null)
    const next = [...queuedFiles]
    for (const file of Array.from(fileList)) {
      if (next.length >= 5) {
        setErrorMsg('Maximum 5 files per upload.')
        break
      }
      const lower = file.name.toLowerCase()
      if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
        setErrorMsg(`Unsupported file "${file.name}". Allowed: PDF, DOCX, PNG, JPG, JPEG, WEBP.`)
        continue
      }
      if (file.size === 0 || file.size > 10 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" must be between 1 byte and 10 MB.`)
        continue
      }
      next.push({ file, category: inferCategory(file.name) })
    }
    setQueuedFiles(next)
  }

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return
    try {
      const parsed = new URL(newLinkUrl.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
    } catch {
      setErrorMsg('Enter a valid http:// or https:// reference URL.')
      return
    }
    setLinks((prev) => [
      ...prev,
      { url: newLinkUrl.trim(), linkType: newLinkType, label: newLinkLabel.trim() || newLinkType.replace(/_/g, ' ') },
    ])
    setNewLinkUrl('')
    setNewLinkLabel('')
    setErrorMsg(null)
  }

  const handleSaveDraft = async () => {
    if (!selectedWs || !activeWeek) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await weeklyReportApiService.saveDraft(selectedWs.schedule.id, activeWeek.period.weekNumber, {
        workCompleted,
        workInProgress,
        challengesOrBlockers,
        planForNextWeek,
        supportingEvidenceNotes,
        links,
        files: queuedFiles,
        retainFileIds,
      })
      setSuccessMsg(`Week ${activeWeek.period.weekNumber} draft saved cleanly.`)
      await loadWorkspaces(activeWeek.period.weekNumber)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save weekly report draft.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWs || !activeWeek) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const saved = await weeklyReportApiService.submitReport(
        selectedWs.schedule.id,
        activeWeek.period.weekNumber,
        {
          workCompleted,
          workInProgress,
          challengesOrBlockers,
          planForNextWeek,
          supportingEvidenceNotes,
          links,
          files: queuedFiles,
          retainFileIds,
        }
      )
      setSuccessMsg(
        `Week ${activeWeek.period.weekNumber} weekly report submitted (Revision #${saved.latestRevisionNumber}${
          saved.isLateSubmission ? ` • recorded ${saved.lateByDays} day(s) after deadline` : ''
        }).`
      )
      await loadWorkspaces(activeWeek.period.weekNumber)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit weekly report.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveContribution = async () => {
    if (!selectedWs || !activeWeek) return
    if (contribWork.trim().length < 4) {
      setErrorMsg('Describe your individual contribution (at least 4 characters).')
      return
    }
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const nextLinks = [...contribLinks]
      if (contribLinkUrl.trim()) {
        try {
          const parsed = new URL(contribLinkUrl.trim())
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            nextLinks.push({ url: contribLinkUrl.trim(), linkType: 'OTHER', label: 'Contribution Link' })
          }
        } catch {
          setErrorMsg('Contribution link URL is invalid.')
          setIsSaving(false)
          return
        }
      }
      await weeklyReportApiService.upsertContribution(
        selectedWs.schedule.id,
        activeWeek.period.weekNumber,
        {
          workPerformed: contribWork.trim(),
          relatedActivityId: contribActivityId || undefined,
          supportingEvidenceNote: contribNote.trim() || undefined,
          links: nextLinks,
          files: [],
        }
      )
      setContribLinkUrl('')
      setSuccessMsg(`Saved your Week ${activeWeek.period.weekNumber} individual contribution entry.`)
      await loadWorkspaces(activeWeek.period.weekNumber)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save individual contribution.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFacultyAction = async (action: WeeklyFacultyReviewAction) => {
    if (!activeReport) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await weeklyReportApiService.reviewReport(activeReport.id, {
        action,
        comment: facultyComment,
      })
      setSuccessMsg(`Recorded faculty action: ${action.replace(/_/g, ' ')}.`)
      setFacultyComment('')
      await loadWorkspaces(selectedWeekNum)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit faculty review action.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreviewPrivateFile = async (meta: EvidenceFileMeta) => {
    try {
      const blob = await weeklyReportApiService.fetchPrivateFileBlob(meta.fileId, false)
      setPreviewFile({ meta, objectUrl: URL.createObjectURL(blob) })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to preview private file.')
    }
  }

  const handleDownloadPrivateFile = async (meta: EvidenceFileMeta) => {
    try {
      const blob = await weeklyReportApiService.fetchPrivateFileBlob(meta.fileId, true)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = meta.originalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to download private file.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Weekly Academic Progress Reporting</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B192C] tracking-tight">
                {isFacultyOrAdmin ? 'Faculty Weekly Report Review' : 'Weekly Project Progress Reports'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Structured weekly reporting periods aligned directly to your published project calendar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/activity-tracker"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              >
                <span>Activity Submissions</span>
              </Link>
              <Link
                to="/academic-schedule"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              >
                <Calendar className="w-3.5 h-3.5 text-[#6658FF]" />
                <span>Schedule</span>
              </Link>
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-xs font-bold hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {successMsg && (
            <div role="status" className="mt-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button type="button" onClick={() => setSuccessMsg(null)} className="text-xs font-bold hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-[#6658FF]/30 border-t-[#6658FF] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading weekly reporting schedule...</p>
            </div>
          ) : !selectedWs ? (
            <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-2xl mx-auto">
              <ClipboardList className="w-8 h-8 text-[#6658FF] mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[#0B192C]">No Published Project Schedule Found</h2>
              <p className="text-sm text-slate-500 mt-2">
                Weekly reporting periods are automatically derived once a faculty guide publishes a project schedule.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Sidebar: Project Picker, Pending Alerts & Reporting Weeks */}
              <div className="lg:col-span-4 space-y-5">
                {workspaces.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Authorized Project
                    </label>
                    <select
                      value={selectedWs.schedule.id}
                      onChange={(e) => navigate(`/weekly-reports/${e.target.value}`)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.schedule.id} value={ws.schedule.id}>
                          {ws.schedule.projectTitle} ({ws.pendingWeeksCount} pending)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Pending Submissions Callout */}
                {pendingWeeks.length > 0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 space-y-2 text-xs text-amber-950">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Pending Weekly Reports ({pendingWeeks.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pendingWeeks.map((pw) => (
                        <button
                          key={pw.period.weekNumber}
                          type="button"
                          onClick={() => handleSelectWeek(pw.period.weekNumber)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer"
                        >
                          Week {pw.period.weekNumber} ({STATUS_BADGE[pw.effectiveStatus].label})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reporting Weeks List */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    Reporting Periods ({selectedWs.weeks.length})
                  </h2>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {selectedWs.weeks.map((w) => {
                      const active = w.period.weekNumber === selectedWeekNum
                      const badge = STATUS_BADGE[w.effectiveStatus]
                      return (
                        <button
                          key={w.period.weekNumber}
                          type="button"
                          onClick={() => handleSelectWeek(w.period.weekNumber)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                            active
                              ? 'bg-indigo-50/50 border-[#6658FF] ring-2 ring-[#6658FF]/15'
                              : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#0B192C]">
                              Week {w.period.weekNumber}
                              {w.isCurrentWeek ? ' • Current' : ''}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-mono">
                            {w.period.reportingPeriodStart} &rarr; {w.period.reportingPeriodEnd}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Deadline: <strong>{w.period.reportingDeadline}</strong> ({w.period.workingDaysCount} working days)
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Panel: Selected Week Report Form, Individual Contributions, Faculty Review & History */}
              {activeWeek && (
                <div className="lg:col-span-8 space-y-5">
                  {/* Week Header */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-bold text-[#0B192C]">
                            Week {activeWeek.period.weekNumber} Progress Report
                          </h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_BADGE[activeWeek.effectiveStatus].className}`}>
                            {STATUS_BADGE[activeWeek.effectiveStatus].label}
                          </span>
                          {activeReport?.isLateSubmission && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Submitted Late (+{activeReport.lateByDays}d)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Project: <strong>{selectedWs.schedule.projectTitle}</strong> • Guide:{' '}
                          <strong>{selectedWs.schedule.facultyGuideName}</strong>
                        </p>
                      </div>

                      <div className="text-right text-xs">
                        <div className="inline-flex items-center gap-1.5 text-slate-700 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#6658FF]" />
                          <span>Deadline: {activeWeek.period.reportingDeadline}</span>
                        </div>
                        {activeReport?.submittedAt && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Submitted by {activeReport.submittedByStudentName} on{' '}
                            {new Date(activeReport.submittedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Team ({selectedWs.teamId}):
                      </span>
                      {selectedWs.schedule.assignedStudents.map((st) => (
                        <span key={st.studentId} className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                          {st.fullName}
                          {st.isTeamLeader ? ' • Lead' : ''}
                        </span>
                      ))}
                    </div>

                    {activeWeek.period.overlappingActivities.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                        <strong>Scheduled activities active this period:</strong>{' '}
                        {activeWeek.period.overlappingActivities
                          .map((a) => `#${a.sequenceNumber} ${a.title} (due ${a.deadline})`)
                          .join(' • ')}
                      </div>
                    )}
                  </div>

                  {/* Faculty Comments & Clarification Alert */}
                  {activeReport && activeReport.facultyComments.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                      <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#6658FF]" />
                        <span>Faculty Feedback & Review Notes ({activeReport.facultyComments.length})</span>
                      </h3>
                      <div className="space-y-2.5">
                        {activeReport.facultyComments.map((fc) => (
                          <div
                            key={fc.commentId}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              fc.action === 'REQUEST_CLARIFICATION'
                                ? 'bg-amber-50 border-amber-300 text-amber-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">
                                {fc.facultyName} • {fc.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(fc.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p>{fc.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared 5-Section Weekly Report Form / Read View */}
                  <form onSubmit={handleSubmitReport} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                    <h3 className="text-sm font-bold text-[#0B192C]">
                      Shared Team Weekly Report Sections
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        A. Work completed this week *
                      </label>
                      <textarea
                        rows={3}
                        disabled={!isStudentEditable}
                        value={workCompleted}
                        onChange={(e) => setWorkCompleted(e.target.value)}
                        placeholder="Summarize verified implementation, research, testing, or design work completed this week..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        B. Work currently in progress *
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isStudentEditable}
                        value={workInProgress}
                        onChange={(e) => setWorkInProgress(e.target.value)}
                        placeholder="Ongoing modules, experiments, or documentation currently underway..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        C. Challenges or blockers *
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isStudentEditable}
                        value={challengesOrBlockers}
                        onChange={(e) => setChallengesOrBlockers(e.target.value)}
                        placeholder="Technical blockers, environment issues, or questions for faculty (write 'None' if clear)..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        D. Plan for next week *
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isStudentEditable}
                        value={planForNextWeek}
                        onChange={(e) => setPlanForNextWeek(e.target.value)}
                        placeholder="Concrete deliverables and activities scheduled for the next reporting period..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm disabled:bg-slate-50"
                      />
                    </div>

                    <div className="space-y-3 pt-1">
                      <label className="block text-xs font-bold text-slate-700">
                        E. Supporting evidence (Notes, Private Screenshots/Documents, Project Links)
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isStudentEditable}
                        value={supportingEvidenceNotes}
                        onChange={(e) => setSupportingEvidenceNotes(e.target.value)}
                        placeholder="Explain attached screenshots, commits, documents, or URLs..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm disabled:bg-slate-50"
                      />

                      {/* Retained / Existing Uploaded Private Files */}
                      {(activeReport?.evidenceFiles || []).filter((f) => retainFileIds.includes(f.fileId)).length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-500 block">
                            Attached Evidence Files:
                          </span>
                          {(activeReport?.evidenceFiles || [])
                            .filter((f) => retainFileIds.includes(f.fileId))
                            .map((f) => (
                              <div key={f.fileId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  {f.mimeType.startsWith('image/') ? (
                                    <ImageIcon className="w-4 h-4 text-[#6658FF] shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-[#6658FF] shrink-0" />
                                  )}
                                  <span className="font-medium truncate max-w-[220px]">{f.originalName}</span>
                                  <span className="text-[11px] text-slate-400">{formatBytes(f.sizeBytes)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {(f.mimeType === 'application/pdf' || f.mimeType.startsWith('image/')) && (
                                    <button type="button" onClick={() => handlePreviewPrivateFile(f)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-[#6658FF] font-semibold cursor-pointer">
                                      <Eye className="w-3.5 h-3.5" /> Preview
                                    </button>
                                  )}
                                  <button type="button" onClick={() => handleDownloadPrivateFile(f)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold cursor-pointer">
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </button>
                                  {isStudentEditable && (
                                    <button type="button" onClick={() => setRetainFileIds((prev) => prev.filter((id) => id !== f.fileId))} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Remove file from next save">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {isStudentEditable && (
                        <>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              setIsDragging(true)
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault()
                              setIsDragging(false)
                              handleIncomingFiles(e.dataTransfer.files)
                            }}
                            className={`rounded-2xl border-2 border-dashed p-4 text-center ${
                              isDragging ? 'border-[#6658FF] bg-[#6658FF]/5' : 'border-slate-300 bg-slate-50/70'
                            }`}
                          >
                            <Upload className="w-5 h-5 text-[#6658FF] mx-auto mb-1.5" />
                            <p className="text-xs text-slate-600 mb-2">
                              Drag & drop weekly screenshots, test outputs, or documents (PDF, DOCX, PNG, JPG, WEBP)
                            </p>
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer">
                              <Plus className="w-3.5 h-3.5 text-[#6658FF]" /> Choose Files
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                                onChange={(e) => {
                                  handleIncomingFiles(e.target.files)
                                  e.target.value = ''
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {queuedFiles.length > 0 && (
                            <div className="space-y-1.5">
                              {queuedFiles.map((q, idx) => (
                                <div key={`${q.file.name}-${idx}`} className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/40 border border-indigo-200 text-xs">
                                  <span>{q.file.name} ({formatBytes(q.file.size)})</span>
                                  <button type="button" onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-rose-600 font-bold cursor-pointer">
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <select
                              value={newLinkType}
                              onChange={(e) => setNewLinkType(e.target.value as EvidenceLinkType)}
                              className="sm:col-span-4 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                            >
                              <option value="GITHUB_REPOSITORY">GitHub Commit / Repo</option>
                              <option value="DEMO_URL">Demo URL</option>
                              <option value="RESEARCH_PAPER">Research Paper Reference</option>
                              <option value="DOCUMENTATION_URL">Documentation URL</option>
                            </select>
                            <input
                              type="url"
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              placeholder="https://..."
                              className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                            />
                            <input
                              type="text"
                              value={newLinkLabel}
                              onChange={(e) => setNewLinkLabel(e.target.value)}
                              placeholder="Label"
                              className="sm:col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                            />
                            <button type="button" onClick={handleAddLink} className="sm:col-span-1 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer">
                              Add
                            </button>
                          </div>
                        </>
                      )}

                      {links.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {links.map((lk, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                              <Link2 className="w-3 h-3 text-[#6658FF]" />
                              <a href={lk.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-medium hover:underline">
                                {lk.label}
                              </a>
                              {isStudentEditable && (
                                <button type="button" onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isStudentEditable && (
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveDraft}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Draft</span>
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {activeReport?.status === 'CLARIFICATION_REQUESTED'
                              ? 'Submit Updated Report'
                              : 'Submit Weekly Report'}
                          </span>
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Team & Individual Contributions Panel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#6658FF]" />
                          <span>Individual Team Member Contributions ({activeReport?.contributions.length || 0})</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Student-reported work logs are displayed distinctly from formal faculty-verified activity approvals.
                        </p>
                      </div>
                    </div>

                    {(activeReport?.contributions.length || 0) > 0 && (
                      <div className="space-y-2.5">
                        {activeReport!.contributions.map((c) => (
                          <div key={c.contributionId} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <strong className="text-[#0B192C]">{c.studentName}</strong>
                                {c.isTeamLeader && (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#6658FF] text-[10px] font-bold">
                                    Team Lead
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold">
                                  Student-Reported
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {new Date(c.updatedAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-700">{c.workPerformed}</p>
                            {c.relatedActivityTitle && (
                              <p className="text-[11px] text-slate-500">
                                <strong>Related Activity:</strong> {c.relatedActivityTitle}
                              </p>
                            )}
                            {c.supportingEvidenceNote && (
                              <p className="text-[11px] text-slate-600">
                                <strong>Evidence Note:</strong> {c.supportingEvidenceNote}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isStudentEditable && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700">
                          Log Your Individual Contribution (Week {activeWeek.period.weekNumber})
                        </h4>
                        <textarea
                          rows={2}
                          value={contribWork}
                          onChange={(e) => setContribWork(e.target.value)}
                          placeholder="Describe your individual engineering or documentation work this week..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={contribActivityId}
                            onChange={(e) => setContribActivityId(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                          >
                            <option value="">Related Scheduled Activity (Optional)</option>
                            {selectedWs.schedule.activities.map((a) => (
                              <option key={a.activityId} value={a.activityId}>
                                #{a.sequenceNumber} {a.title}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={contribNote}
                            onChange={(e) => setContribNote(e.target.value)}
                            placeholder="Supporting evidence / PR note (optional)"
                            className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="url"
                            value={contribLinkUrl}
                            onChange={(e) => setContribLinkUrl(e.target.value)}
                            placeholder="Optional contribution URL (https://...)"
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveContribution}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                          >
                            Save My Contribution
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Faculty Review Panel */}
                  {isFacultyOrAdmin && activeReport && activeReport.status !== 'DRAFT' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
                      <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Finalizing a weekly report acknowledges weekly progress only. Scheduled
                          activity completion and deliverables remain separate in the Activity
                          Submission review workflow.
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={facultyComment}
                        onChange={(e) => setFacultyComment(e.target.value)}
                        placeholder="Enter faculty review comment, guidance, or clarification request..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {activeReport.status === 'SUBMITTED' && (
                          <button type="button" disabled={isSaving} onClick={() => handleFacultyAction('MARK_UNDER_REVIEW')} className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">
                            Mark Under Review
                          </button>
                        )}
                        <button type="button" disabled={isSaving} onClick={() => handleFacultyAction('COMMENT')} className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">
                          Add Comment
                        </button>
                        <button type="button" disabled={isSaving} onClick={() => handleFacultyAction('REQUEST_CLARIFICATION')} className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer">
                          Request Clarification
                        </button>
                        {activeReport.status !== 'FINALIZED' && (
                          <button type="button" disabled={isSaving} onClick={() => handleFacultyAction('FINALIZE')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                            Finalize Report
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preserved Revision History */}
                  {activeReport && activeReport.revisions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
                      <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                        <History className="w-4 h-4 text-[#6658FF]" />
                        <span>Weekly Submission History ({activeReport.revisions.length})</span>
                      </h3>
                      <div className="space-y-3">
                        {[...activeReport.revisions].reverse().map((rev) => (
                          <div key={rev.revisionNumber} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-[#0B192C]">
                                Submission Revision #{rev.revisionNumber} • {rev.submittedByStudentName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(rev.submittedAt).toLocaleString()}
                                {rev.isLateSubmission ? ` • Late (+${rev.lateByDays}d)` : ' • On Time'}
                              </span>
                            </div>
                            <p className="text-slate-700">
                              <strong>Completed:</strong> {rev.workCompleted}
                            </p>
                            <p className="text-slate-600">
                              <strong>Next Week Plan:</strong> {rev.planForNextWeek}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-[#0B192C] truncate">{previewFile.meta.originalName}</h3>
              <button type="button" onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close preview">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4 min-h-[60vh]">
              {previewFile.meta.mimeType === 'application/pdf' ? (
                <iframe title={previewFile.meta.originalName} src={previewFile.objectUrl} className="w-full h-[72vh] rounded-lg border border-slate-300 bg-white" />
              ) : (
                <img src={previewFile.objectUrl} alt={previewFile.meta.originalName} className="max-w-full max-h-[72vh] rounded-lg shadow-sm object-contain bg-white" />
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default WeeklyReportsPage
