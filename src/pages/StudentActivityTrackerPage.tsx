import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Upload,
  FileText,
  Image as ImageIcon,
  Link2,
  Plus,
  Trash2,
  Eye,
  Download,
  History,
  Users,
  ShieldCheck,
  BookOpen,
  MessageSquare,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  activitySubmissionApiService,
  type ActivityDetailResponse,
  type ActivitySubmissionStatus,
  type ActivityTimingStatus,
  type AuthorizedWorkspace,
  type EvidenceCategory,
  type EvidenceFileMeta,
  type EvidenceLink,
  type EvidenceLinkType,
} from '../services/activitySubmissionApiService'

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp']
const MAX_FILE_BYTES = 10 * 1024 * 1024

const SUBMISSION_STATUS_STYLES: Record<
  ActivitySubmissionStatus,
  { label: string; className: string }
> = {
  NOT_SUBMITTED: {
    label: 'Not Submitted',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  CHANGES_REQUESTED: {
    label: 'Changes Requested',
    className: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  RESUBMITTED: {
    label: 'Resubmitted',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

const EVIDENCE_CATEGORY_OPTIONS: Array<{ value: EvidenceCategory; label: string }> = [
  { value: 'PDF_DOCUMENT', label: 'PDF Document' },
  { value: 'DOCX_DOCUMENT', label: 'DOCX Document' },
  { value: 'UI_UX_SCREENSHOT', label: 'UI/UX Screenshot' },
  { value: 'ARCHITECTURE_DIAGRAM', label: 'Architecture Diagram' },
  { value: 'IMAGE_EVIDENCE', label: 'Image Evidence' },
  { value: 'SUPPORTING_DOCUMENT', label: 'Supporting Documentation' },
]

const LINK_TYPE_OPTIONS: Array<{ value: EvidenceLinkType; label: string }> = [
  { value: 'GITHUB_REPOSITORY', label: 'GitHub Repository' },
  { value: 'RESEARCH_PAPER', label: 'Research Paper Reference' },
  { value: 'DEMO_URL', label: 'Live / Video Demo Link' },
  { value: 'DESIGN_LINK', label: 'UI/UX Design Link' },
  { value: 'DOCUMENTATION_URL', label: 'Documentation URL' },
  { value: 'OTHER', label: 'Supporting URL' },
]

function formatTimingBadge(
  timingStatus: ActivityTimingStatus,
  daysRemaining: number,
  lateByDays: number
): { label: string; className: string } {
  switch (timingStatus) {
    case 'SUBMITTED_ON_TIME':
      return { label: 'Submitted On Time', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'SUBMITTED_LATE':
      return {
        label: `Submitted Late (+${lateByDays}d)`,
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      }
    case 'OVERDUE':
      return {
        label: `Overdue (${Math.abs(daysRemaining)}d past deadline)`,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      }
    case 'DUE_TODAY':
      return { label: 'Due Today', className: 'bg-amber-50 text-amber-800 border-amber-200' }
    default:
      return {
        label: daysRemaining === 1 ? 'Due Tomorrow' : `Due in ${daysRemaining} days`,
        className: 'bg-slate-50 text-slate-600 border-slate-200',
      }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function inferDefaultCategoryFromName(name: string): EvidenceCategory {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'PDF_DOCUMENT'
  if (lower.endsWith('.docx')) return 'DOCX_DOCUMENT'
  return 'IMAGE_EVIDENCE'
}

export const StudentActivityTrackerPage: React.FC = () => {
  const { scheduleId, activityId } = useParams<{ scheduleId?: string; activityId?: string }>()
  const navigate = useNavigate()

  const [workspaces, setWorkspaces] = useState<AuthorizedWorkspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<AuthorizedWorkspace | null>(null)
  const [activityDetail, setActivityDetail] = useState<ActivityDetailResponse | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Evidence Upload & Link Form State
  const [description, setDescription] = useState('')
  const [queuedFiles, setQueuedFiles] = useState<Array<{ file: File; category: EvidenceCategory }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [links, setLinks] = useState<EvidenceLink[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkType, setNewLinkType] = useState<EvidenceLinkType>('GITHUB_REPOSITORY')
  const [newLinkLabel, setNewLinkLabel] = useState('')

  // Secure File Preview Modal State (authenticated Blob URL, never public static link)
  const [previewFile, setPreviewFile] = useState<{
    meta: EvidenceFileMeta
    objectUrl: string
  } | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) {
        URL.revokeObjectURL(previewFile.objectUrl)
      }
    }
  }, [previewFile])

  const loadData = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      if (scheduleId && activityId) {
        const detail = await activitySubmissionApiService.getActivityDetail(scheduleId, activityId)
        setActivityDetail(detail)
        setDescription('')
        setQueuedFiles([])
        setLinks([])
      } else {
        setActivityDetail(null)
        const list = await activitySubmissionApiService.listWorkspaces()
        setWorkspaces(list)
        if (scheduleId) {
          const found = list.find((w) => w.schedule.id === scheduleId) || null
          if (found) {
            setSelectedWorkspace(found)
          } else {
            const direct = await activitySubmissionApiService.getWorkspace(scheduleId)
            setSelectedWorkspace(direct)
          }
        } else {
          setSelectedWorkspace(list[0] || null)
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load authorized project workspace.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [scheduleId, activityId])

  const handleIncomingFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setErrorMsg(null)

    const nextItems = [...queuedFiles]
    for (const file of Array.from(fileList)) {
      if (nextItems.length >= 5) {
        setErrorMsg('Maximum 5 files can be attached per submission.')
        break
      }
      const lower = file.name.toLowerCase()
      const validExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
      if (!validExt) {
        setErrorMsg(
          `Unsupported file "${file.name}". Allowed formats: PDF, DOCX, PNG, JPG, JPEG, WEBP.`
        )
        continue
      }
      if (file.size === 0) {
        setErrorMsg(`File "${file.name}" is empty (0 bytes).`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        setErrorMsg(`File "${file.name}" exceeds the 10 MB size limit.`)
        continue
      }
      nextItems.push({ file, category: inferDefaultCategoryFromName(file.name) })
    }
    setQueuedFiles(nextItems)
  }

  const handleAddLink = () => {
    const trimmed = newLinkUrl.trim()
    if (!trimmed) return
    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setErrorMsg('Evidence link must start with http:// or https://.')
        return
      }
    } catch {
      setErrorMsg('Enter a valid URL (e.g. https://github.com/team/project).')
      return
    }
    setErrorMsg(null)
    setLinks((prev) => [
      ...prev,
      {
        url: trimmed,
        linkType: newLinkType,
        label:
          newLinkLabel.trim() ||
          LINK_TYPE_OPTIONS.find((o) => o.value === newLinkType)?.label ||
          'Evidence Link',
      },
    ])
    setNewLinkUrl('')
    setNewLinkLabel('')
  }

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityDetail || !scheduleId || !activityId) return
    if (description.trim().length < 5) {
      setErrorMsg('Enter a clear submission description (at least 5 characters).')
      return
    }
    if (queuedFiles.length === 0 && links.length === 0) {
      setErrorMsg('Attach at least one valid evidence file or supporting reference URL.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const isResubmit = activityDetail.permissions.canResubmit
      const result = isResubmit
        ? await activitySubmissionApiService.resubmitEvidence(scheduleId, activityId, {
            description: description.trim(),
            links,
            files: queuedFiles,
          })
        : await activitySubmissionApiService.submitEvidence(scheduleId, activityId, {
            description: description.trim(),
            links,
            files: queuedFiles,
          })

      setSuccessMsg(
        `Evidence submitted cleanly as Revision #${result.revision.revisionNumber} (${
          result.revision.isLate
            ? `recorded ${result.revision.lateByDays} day(s) after deadline`
            : 'on time'
        }).`
      )
      await loadData()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit activity evidence.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreviewPrivateFile = async (fileMeta: EvidenceFileMeta) => {
    setIsPreviewLoading(true)
    setErrorMsg(null)
    try {
      const blob = await activitySubmissionApiService.fetchPrivateFileBlob(fileMeta.fileId, false)
      const objectUrl = URL.createObjectURL(blob)
      setPreviewFile({ meta: fileMeta, objectUrl })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to open authenticated file preview.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleDownloadPrivateFile = async (fileMeta: EvidenceFileMeta) => {
    setErrorMsg(null)
    try {
      const blob = await activitySubmissionApiService.fetchPrivateFileBlob(fileMeta.fileId, true)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileMeta.originalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download evidence file.')
    }
  }

  const isPreviewable = (mime: string) =>
    mime === 'application/pdf' || mime.startsWith('image/')

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Student Activity Tracker & Evidence Submission</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B192C] tracking-tight">
                {activityDetail ? activityDetail.activity.title : 'My Project Workspace'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {activityDetail
                  ? `Activity #${activityDetail.activity.sequenceNumber} • ${activityDetail.schedule.projectTitle}`
                  : 'View your faculty-published academic schedule, milestone requirements, and team evidence submissions.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activityDetail && (
                <Link
                  to={`/activity-tracker/${activityDetail.schedule.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Project Timeline</span>
                </Link>
              )}
              <Link
                to="/academic-schedule"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              >
                <Calendar className="w-3.5 h-3.5 text-[#6658FF]" />
                <span>Schedule Manager</span>
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div
              role="alert"
              className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="mt-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-[#6658FF]/30 border-t-[#6658FF] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading academic workspace...</p>
            </div>
          ) : activityDetail ? (
            /* =====================================================
               DETAIL VIEW: SCHEDULED ACTIVITY + EVIDENCE SUBMISSION
               ===================================================== */
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Requirements, Team & Instructions */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        SUBMISSION_STATUS_STYLES[activityDetail.submissionStatus].className
                      }`}
                    >
                      {SUBMISSION_STATUS_STYLES[activityDetail.submissionStatus].label}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        formatTimingBadge(
                          activityDetail.timingStatus,
                          activityDetail.daysRemaining,
                          activityDetail.lateByDays
                        ).className
                      }`}
                    >
                      {
                        formatTimingBadge(
                          activityDetail.timingStatus,
                          activityDetail.daysRemaining,
                          activityDetail.lateByDays
                        ).label
                      }
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        activityDetail.activity.isMandatory
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {activityDetail.activity.isMandatory ? 'Mandatory' : 'Optional'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                      {activityDetail.submissionMode === 'INDIVIDUAL'
                        ? 'Individual Submission'
                        : 'Team Shared Submission'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">Start Date</span>
                      <strong className="text-[#0B192C] font-mono">
                        {activityDetail.activity.startDate}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Official Deadline</span>
                      <strong className="text-[#0B192C] font-mono">
                        {activityDetail.activity.deadline}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100 text-xs leading-relaxed">
                    <div>
                      <h3 className="font-bold text-[#0B192C] mb-1">Faculty Instructions</h3>
                      <p className="text-slate-600">{activityDetail.activity.description}</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0B192C] mb-1">Required Deliverables</h3>
                      <p className="text-slate-700">
                        {activityDetail.activity.requiredSubmissionDescription}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0B192C] mb-1">Submission Instructions</h3>
                      <p className="text-slate-600">
                        {activityDetail.activity.studentUpdateInstructions}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0B192C] mb-1">Accepted Formats</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {activityDetail.activity.acceptedEvidenceFormats.map((fmt) => (
                          <span
                            key={fmt}
                            className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                          >
                            {fmt.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Scheduled deadlines and deliverable rules are set by faculty guide{' '}
                      <strong>{activityDetail.schedule.facultyGuideName}</strong> and cannot be
                      modified by students or team leaders.
                    </span>
                  </div>
                </div>

                {/* Authorized Team Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5 text-xs">
                  <div className="font-bold text-[#0B192C] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#6658FF]" />
                    <span>Authorized Project Team</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activityDetail.schedule.assignedStudents.map((st) => (
                      <span
                        key={st.studentId}
                        className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium"
                      >
                        {st.fullName}
                        {st.isTeamLeader ? ' • Team Lead' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Feedback, Submission Form & Revision History */}
              <div className="lg:col-span-7 space-y-5">
                {/* Highlighted Faculty Feedback Banner */}
                {activityDetail.submission?.latestFacultyFeedback && (
                  <div
                    className={`rounded-2xl border p-4 space-y-1.5 text-xs ${
                      activityDetail.submissionStatus === 'CHANGES_REQUESTED'
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>
                        Faculty Feedback ({activityDetail.submission.reviewedByFacultyName || 'Guide'})
                      </span>
                    </div>
                    <p className="leading-relaxed">
                      {activityDetail.submission.latestFacultyFeedback}
                    </p>
                  </div>
                )}

                {/* Submission / Resubmission Card OR Duplicate-Prevention Notice */}
                {activityDetail.permissions.canSubmitInitial ||
                activityDetail.permissions.canResubmit ? (
                  <form
                    onSubmit={handleSubmitEvidence}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-[#0B192C]">
                          {activityDetail.permissions.canResubmit
                            ? `Submit Revised Evidence (Revision #${
                                (activityDetail.submission?.latestRevisionNumber || 1) + 1
                              })`
                            : 'Submit Activity Evidence'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {activityDetail.submissionMode === 'TEAM_SHARED'
                            ? 'This is a team-shared activity: submitting once records official evidence for the whole project team.'
                            : 'This activity requires an individual submission from your student account.'}
                        </p>
                      </div>
                      {activityDetail.isOverdueNow && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Submission will be marked Late</span>
                        </span>
                      )}
                    </div>

                    {/* Submission Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Submission Summary & Notes *
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={
                          activityDetail.permissions.canResubmit
                            ? 'Explain what corrections you made in response to faculty feedback...'
                            : 'Describe the work completed, attached documents, screenshots, or repository links...'
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#6658FF]"
                      />
                    </div>

                    {/* Drag-and-Drop Private File Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Attach Evidence Files (PDF, DOCX, PNG, JPG, WEBP — max 10 MB each)
                      </label>
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
                        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                          isDragging
                            ? 'border-[#6658FF] bg-[#6658FF]/5'
                            : 'border-slate-300 bg-slate-50/70'
                        }`}
                      >
                        <Upload className="w-6 h-6 text-[#6658FF] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          Drag & drop reports, architecture diagrams, or UI screenshots here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                          Files are stored privately and accessible only to your team & faculty guide.
                        </p>
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#6658FF] text-xs font-bold text-[#0B192C] cursor-pointer">
                          <Plus className="w-3.5 h-3.5 text-[#6658FF]" />
                          <span>Choose Files</span>
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
                        <div className="mt-3 space-y-2">
                          {queuedFiles.map((item, idx) => (
                            <div
                              key={`${item.file.name}-${idx}`}
                              className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {item.file.type.startsWith('image/') ? (
                                  <ImageIcon className="w-4 h-4 text-[#6658FF] shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-[#6658FF] shrink-0" />
                                )}
                                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                  {item.file.name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  ({formatFileSize(item.file.size)})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={item.category}
                                  onChange={(e) =>
                                    setQueuedFiles((prev) =>
                                      prev.map((q, qIdx) =>
                                        qIdx === idx
                                          ? { ...q, category: e.target.value as EvidenceCategory }
                                          : q
                                      )
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px]"
                                >
                                  {EVIDENCE_CATEGORY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQueuedFiles((prev) => prev.filter((_, qIdx) => qIdx !== idx))
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  aria-label="Remove queued file"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reference Links */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Reference Links (GitHub Repository, Research Paper URL, Demo Link)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <select
                          value={newLinkType}
                          onChange={(e) => setNewLinkType(e.target.value as EvidenceLinkType)}
                          className="sm:col-span-4 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                        >
                          {LINK_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://github.com/..."
                          className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          placeholder="Label (optional)"
                          className="sm:col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddLink}
                          className="sm:col-span-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>

                      {links.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {links.map((lk, idx) => (
                            <div
                              key={`${lk.url}-${idx}`}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Link2 className="w-3.5 h-3.5 text-[#6658FF] shrink-0" />
                                <span className="font-semibold text-slate-700 shrink-0">
                                  {lk.label}:
                                </span>
                                <span className="text-indigo-700 truncate">{lk.url}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setLinks((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {isSubmitting
                            ? 'Uploading Evidence...'
                            : activityDetail.permissions.canResubmit
                            ? 'Submit Revised Evidence'
                            : 'Submit Official Evidence'}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : activityDetail.submission ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#0B192C]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {activityDetail.submissionStatus === 'APPROVED'
                          ? 'Activity Evidence Approved'
                          : 'Team Evidence Already Submitted'}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Revision #{activityDetail.submission.latestRevisionNumber} was submitted by{' '}
                      <strong>{activityDetail.submission.lastSubmittedByStudentName}</strong> on{' '}
                      {new Date(activityDetail.submission.lastSubmittedAt).toLocaleString()}.{' '}
                      {activityDetail.submissionStatus === 'APPROVED'
                        ? 'This activity has been approved by your faculty guide.'
                        : 'Duplicate initial submissions are locked while under faculty review. Resubmission unlocks automatically if faculty requests revisions.'}
                    </p>
                  </div>
                ) : null}

                {/* Revision History */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#6658FF]" />
                      <span>Submission & Revision History ({activityDetail.revisions.length})</span>
                    </h3>
                  </div>

                  {activityDetail.revisions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No evidence has been submitted for this activity yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activityDetail.revisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#6658FF] text-white font-bold text-[11px]">
                                Revision #{rev.revisionNumber}
                              </span>
                              <span className="font-bold text-[#0B192C]">
                                {rev.submittedByStudentName}
                                {rev.submittedByIsTeamLeader ? ' (Lead)' : ''}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  rev.isLate
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {rev.isLate ? `Late (+${rev.lateByDays}d)` : 'On Time'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {new Date(rev.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-slate-700 leading-relaxed">
                            {rev.submissionDescription}
                          </p>

                          {rev.facultyFeedback && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                              <span className="font-bold block">
                                Review Outcome: {(rev.facultyReviewOutcome || '').replace(/_/g, ' ')}
                              </span>
                              <p>{rev.facultyFeedback}</p>
                            </div>
                          )}

                          {rev.evidenceFiles.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="font-semibold text-slate-600 block">
                                Attached Evidence Files:
                              </span>
                              <div className="space-y-1.5">
                                {rev.evidenceFiles.map((f) => (
                                  <div
                                    key={f.fileId}
                                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {f.mimeType.startsWith('image/') ? (
                                        <ImageIcon className="w-4 h-4 text-[#6658FF] shrink-0" />
                                      ) : (
                                        <FileText className="w-4 h-4 text-[#6658FF] shrink-0" />
                                      )}
                                      <span className="font-medium text-slate-800 truncate max-w-[220px]">
                                        {f.originalName}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        {formatFileSize(f.sizeBytes)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {isPreviewable(f.mimeType) && (
                                        <button
                                          type="button"
                                          disabled={isPreviewLoading}
                                          onClick={() => handlePreviewPrivateFile(f)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-[#6658FF] hover:bg-indigo-100 font-semibold cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Preview</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadPrivateFile(f)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {rev.evidenceLinks.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-600 block">
                                Reference Links:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {rev.evidenceLinks.map((lk, lIdx) => (
                                  <a
                                    key={lIdx}
                                    href={lk.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#6658FF] text-indigo-700 font-medium"
                                  >
                                    <Link2 className="w-3 h-3" />
                                    <span>{lk.label}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : workspaces.length === 0 && !selectedWorkspace ? (
            <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[#0B192C]">No Published Project Schedule Yet</h2>
              <p className="text-sm text-slate-500 mt-2">
                Once your faculty guide initializes and publishes your academic project schedule, your
                chronological milestones and evidence submission workspace will appear here.
              </p>
            </div>
          ) : (
            /* =====================================================
               WORKSPACE VIEW: AUTHORIZED PROJECT + CHRONOLOGICAL ACTIVITIES
               ===================================================== */
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {workspaces.length > 1 && (
                <div className="lg:col-span-3 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    Authorized Projects ({workspaces.length})
                  </h2>
                  {workspaces.map((ws) => {
                    const active = selectedWorkspace?.schedule.id === ws.schedule.id
                    return (
                      <button
                        key={ws.schedule.id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkspace(ws)
                          navigate(`/activity-tracker/${ws.schedule.id}`)
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          active
                            ? 'bg-white border-[#6658FF] ring-2 ring-[#6658FF]/15 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#0B192C] line-clamp-2">
                          {ws.schedule.projectTitle}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Guide: {ws.schedule.facultyGuideName}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedWorkspace && (
                <div
                  className={`${
                    workspaces.length > 1 ? 'lg:col-span-9' : 'lg:col-span-12'
                  } space-y-6`}
                >
                  {/* Project Overview Header */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-bold text-[#0B192C]">
                            {selectedWorkspace.schedule.projectTitle}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Published Schedule v{selectedWorkspace.schedule.version}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                          {selectedWorkspace.projectDescription}
                        </p>
                        <p className="text-xs text-slate-500 pt-1">
                          Faculty Guide: <strong>{selectedWorkspace.schedule.facultyGuideName}</strong>{' '}
                          • {selectedWorkspace.schedule.department} •{' '}
                          {selectedWorkspace.schedule.academicYear} • Template:{' '}
                          <strong>{selectedWorkspace.schedule.templateName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Team Members:
                      </span>
                      {selectedWorkspace.schedule.assignedStudents.map((st) => (
                        <span
                          key={st.studentId}
                          className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                        >
                          {st.fullName}
                          {st.usnOrEmployeeId ? ` (${st.usnOrEmployeeId})` : ''}
                          {st.isTeamLeader ? ' • Team Lead' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chronological Activity List */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#6658FF]" />
                        <span>Chronological Academic Activities ({selectedWorkspace.activities.length})</span>
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {selectedWorkspace.activities.map((item) => {
                        const subStyle = SUBMISSION_STATUS_STYLES[item.submissionStatus]
                        const timeStyle = formatTimingBadge(
                          item.timingStatus,
                          item.daysRemaining,
                          item.lateByDays
                        )
                        return (
                          <div
                            key={item.activity.activityId}
                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:border-[#6658FF]/40 transition-colors space-y-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-[#6658FF]/10 text-[#6658FF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {item.activity.sequenceNumber}
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-[#0B192C]">
                                    {item.activity.title}
                                  </h4>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {item.activity.requiredSubmissionDescription}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${subStyle.className}`}
                                >
                                  {subStyle.label}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${timeStyle.className}`}
                                >
                                  {timeStyle.label}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    item.activity.isMandatory
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {item.activity.isMandatory ? 'Mandatory' : 'Optional'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 text-xs">
                              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-[#6658FF]" />
                                  <span>
                                    Start: <strong>{item.activity.startDate}</strong> • Deadline:{' '}
                                    <strong>{item.activity.deadline}</strong>
                                  </span>
                                </span>
                                {item.latestSubmission && (
                                  <span className="text-slate-500">
                                    Rev #{item.latestSubmission.latestRevisionNumber} by{' '}
                                    <strong>{item.latestSubmission.lastSubmittedByStudentName}</strong>
                                  </span>
                                )}
                              </div>

                              <Link
                                to={`/activity-tracker/${selectedWorkspace.schedule.id}/activities/${item.activity.activityId}`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6658FF] hover:bg-[#5546FF] text-white text-xs font-bold"
                              >
                                <span>
                                  {item.submissionStatus === 'CHANGES_REQUESTED'
                                    ? 'View Feedback & Resubmit'
                                    : item.submissionStatus === 'NOT_SUBMITTED'
                                    ? 'Open & Submit Evidence'
                                    : 'View Evidence & History'}
                                </span>
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Secure Authenticated File Preview Modal (PDF / Image Blobs only) */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#0B192C] truncate">
                  {previewFile.meta.originalName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Private authenticated preview • {formatFileSize(previewFile.meta.sizeBytes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPrivateFile(previewFile.meta)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close file preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4 min-h-[60vh]">
              {previewFile.meta.mimeType === 'application/pdf' ? (
                <iframe
                  title={previewFile.meta.originalName}
                  src={previewFile.objectUrl}
                  className="w-full h-[72vh] rounded-lg border border-slate-300 bg-white"
                />
              ) : (
                <img
                  src={previewFile.objectUrl}
                  alt={previewFile.meta.originalName}
                  className="max-w-full max-h-[72vh] rounded-lg shadow-sm object-contain bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default StudentActivityTrackerPage
