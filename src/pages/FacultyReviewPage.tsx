import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  History,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import {
  activitySubmissionApiService,
  type ActivitySubmissionStatus,
  type EvidenceFileMeta,
} from '../services/activitySubmissionApiService'
import { authService } from '../services/authService'
import {
  facultyReviewApiService,
  type FacultyReviewDashboardResponse,
  type IndependentScheduleStatus,
  type ReviewDashboardBucket,
  type SubmissionReviewDetailResponse,
} from '../services/facultyReviewApiService'

const BUCKET_TABS: Array<{ key: 'ALL' | ReviewDashboardBucket; label: string }> = [
  { key: 'ALL', label: 'All Submissions' },
  { key: 'PENDING_REVIEW', label: 'Pending Review' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { key: 'RESUBMITTED', label: 'Resubmitted' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
]

const REVIEW_BADGE: Record<ActivitySubmissionStatus, { label: string; className: string }> = {
  NOT_SUBMITTED: { label: 'Not Submitted', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  SUBMITTED: { label: 'Pending Review', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  CHANGES_REQUESTED: { label: 'Changes Requested', className: 'bg-amber-50 text-amber-800 border-amber-300' },
  RESUBMITTED: { label: 'Resubmitted', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const SCHEDULE_BADGE: Record<IndependentScheduleStatus, { label: string; className: string }> = {
  UPCOMING: { label: 'Schedule: Upcoming', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  ACTIVE: { label: 'Schedule: Active', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  OVERDUE: { label: 'Schedule: Overdue', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  CLOSED: { label: 'Schedule: Closed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const FacultyReviewPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId?: string }>()
  const navigate = useNavigate()
  const currentUser = authService.getCurrentUser()
  const isFacultyOrAdmin = currentUser?.role === 'faculty' || currentUser?.role === 'admin'

  const [dashboard, setDashboard] = useState<FacultyReviewDashboardResponse | null>(null)
  const [detail, setDetail] = useState<SubmissionReviewDetailResponse | null>(null)
  const [activeView, setActiveView] = useState<'SUBMISSIONS' | 'WEEKLY_REPORTS'>('SUBMISSIONS')

  // Dashboard Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReviewDashboardBucket>('ALL')
  const [projectFilter, setProjectFilter] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [teamSearch, setTeamSearch] = useState('')

  // Detail Decision & Comparison State
  const [feedbackText, setFeedbackText] = useState('')
  const [correctionInstructions, setCorrectionInstructions] = useState('')
  const [compareRevNum, setCompareRevNum] = useState<number | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Private File Preview Modal
  const [previewFile, setPreviewFile] = useState<{ meta: EvidenceFileMeta; objectUrl: string } | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) URL.revokeObjectURL(previewFile.objectUrl)
    }
  }, [previewFile])

  const loadData = async () => {
    if (!isFacultyOrAdmin) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setErrorMsg(null)
    try {
      if (submissionId) {
        const res = await facultyReviewApiService.getSubmissionDetail(submissionId)
        setDetail(res)
        setDashboard(null)
        if (res.revisions.length > 1) {
          setCompareRevNum(res.revisions[1].revisionNumber)
        } else {
          setCompareRevNum(null)
        }
      } else {
        setDetail(null)
        const res = await facultyReviewApiService.getDashboard({
          scheduleId: projectFilter || undefined,
          activityId: activityFilter || undefined,
          status: statusFilter,
          submissionDate: dateFilter || undefined,
          teamSearch: teamSearch || undefined,
        })
        setDashboard(res)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load faculty review workspace.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [submissionId, statusFilter, projectFilter, activityFilter, dateFilter])

  const handleDecision = async (
    outcome: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
  ) => {
    if (!submissionId) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await facultyReviewApiService.submitDecision(submissionId, {
        outcome,
        feedback: feedbackText.trim(),
        correctionInstructions: correctionInstructions.trim() || undefined,
      })
      setSuccessMsg(`Recorded faculty decision: ${outcome.replace(/_/g, ' ')}. Student notification sent.`)
      setFeedbackText('')
      setCorrectionInstructions('')
      await loadData()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record review decision.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddFeedbackOnly = async () => {
    if (!submissionId) return
    if (feedbackText.trim().length < 4) {
      setErrorMsg('Enter at least 4 characters for faculty feedback.')
      return
    }
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await facultyReviewApiService.addFeedback(submissionId, {
        comment: feedbackText.trim(),
        correctionInstructions: correctionInstructions.trim() || undefined,
      })
      setSuccessMsg('Structured feedback added to audit history and team notified.')
      setFeedbackText('')
      setCorrectionInstructions('')
      await loadData()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save faculty feedback.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreviewPrivateFile = async (meta: EvidenceFileMeta) => {
    try {
      const blob = await activitySubmissionApiService.fetchPrivateFileBlob(meta.fileId, false)
      setPreviewFile({ meta, objectUrl: URL.createObjectURL(blob) })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load private evidence preview.')
    }
  }

  const handleDownloadPrivateFile = async (meta: EvidenceFileMeta) => {
    try {
      const blob = await activitySubmissionApiService.fetchPrivateFileBlob(meta.fileId, true)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = meta.originalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download private file.')
    }
  }

  if (!isFacultyOrAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <div>
          <Navbar />
          <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
            <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
            <h1 className="text-lg font-bold text-[#0B192C]">Faculty Review Access Required</h1>
            <p className="text-sm text-slate-500">
              Only authorized faculty guides and academic administrators can inspect student submissions
              and record official academic review decisions.
            </p>
            <Link
              to="/activity-tracker"
              className="inline-block px-4 py-2 rounded-xl bg-[#6658FF] text-white text-xs font-bold"
            >
              Return to Student Activity Tracker
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const latestRevision = detail?.revisions[0] || null
  const comparedRevision =
    compareRevNum !== null
      ? detail?.revisions.find((r) => r.revisionNumber === compareRevNum) || null
      : null

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Faculty Review & Approval Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B192C] tracking-tight">
                {detail ? detail.activity.title : 'Assigned Project Submissions & Reports'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {detail
                  ? `${detail.project.projectTitle} • Activity #${detail.activity.sequenceNumber}`
                  : 'Inspect evidence submitted by assigned student teams, compare revisions, request changes, or approve work.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {detail && (
                <button
                  type="button"
                  onClick={() => navigate('/faculty-review')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Review Queue</span>
                </button>
              )}
              <Link
                to="/academic-schedule"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              >
                <Calendar className="w-3.5 h-3.5 text-[#6658FF]" />
                <span>Manage Schedules</span>
              </Link>
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3">
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
            <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3">
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
              <p className="text-sm text-slate-500">Loading faculty review queue...</p>
            </div>
          ) : detail ? (
            /* =====================================================
               SUBMISSION REVIEW DETAIL PAGE
               ===================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Project & Activity Context + Review Decision Form */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${REVIEW_BADGE[detail.reviewStatus].className}`}>
                      Review: {REVIEW_BADGE[detail.reviewStatus].label}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${SCHEDULE_BADGE[detail.scheduleStatus].className}`}>
                      {SCHEDULE_BADGE[detail.scheduleStatus].label}
                    </span>
                    {detail.submission.isLate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Late (+{detail.submission.lateByDays}d)</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">Original Deadline</span>
                      <strong className="font-mono text-[#0B192C]">{detail.activity.deadline}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Submitted Date/Time</span>
                      <strong className="text-[#0B192C]">
                        {new Date(detail.submission.lastSubmittedAt).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
                    <p>
                      <strong className="text-[#0B192C]">Required Submission:</strong>{' '}
                      <span className="text-slate-600">{detail.activity.requiredSubmissionDescription}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Users className="w-3.5 h-3.5 text-[#6658FF]" />
                      <strong className="text-slate-600">Team:</strong>
                      {detail.project.assignedStudents.map((st) => (
                        <span key={st.studentId} className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                          {st.fullName}
                          {st.isTeamLeader ? ' • Lead' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Faculty Review Decision & Structured Feedback Form */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                  <h2 className="text-sm font-bold text-[#0B192C]">
                    Faculty Decision & Structured Feedback (Rev #{detail.submission.latestRevisionNumber})
                  </h2>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Review Feedback / Decision Reason
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Required for Changes Requested or Rejected; optional approval remarks..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Correction Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={correctionInstructions}
                      onChange={(e) => setCorrectionInstructions(e.target.value)}
                      placeholder="Specific file updates, diagram fixes, or citation corrections needed..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {detail.reviewStatus !== 'UNDER_REVIEW' && detail.reviewStatus !== 'APPROVED' && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDecision('UNDER_REVIEW')}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Mark Under Review
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleAddFeedbackOnly}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-indigo-700 cursor-pointer"
                    >
                      Add Feedback Only
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDecision('CHANGES_REQUESTED')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDecision('REJECTED')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDecision('APPROVED')}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Submission</span>
                    </button>
                  </div>
                </div>

                {/* Immutable Decision Audit Trail */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#6658FF]" />
                    <span>Faculty Decision Audit History ({detail.reviewHistory.length})</span>
                  </h3>
                  {detail.reviewHistory.length === 0 ? (
                    <p className="text-xs text-slate-500">No review decisions recorded yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {detail.reviewHistory.map((dec) => (
                        <div key={dec.decisionId} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#0B192C]">
                              {dec.outcome.replace(/_/g, ' ')} • Rev #{dec.revisionNumber}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(dec.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-700">{dec.comment}</p>
                          {dec.correctionInstructions && (
                            <p className="text-amber-800 text-[11px]">
                              <strong>Instructions:</strong> {dec.correctionInstructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Revision Comparison & Evidence Inspector */}
              <div className="lg:col-span-7 space-y-5">
                {detail.revisions.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-[#0B192C]">
                      Compare Latest (Rev #{latestRevision?.revisionNumber}) with Previous Revision:
                    </span>
                    <select
                      value={compareRevNum ?? ''}
                      onChange={(e) => setCompareRevNum(e.target.value ? Number(e.target.value) : null)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    >
                      <option value="">Hide side-by-side comparison</option>
                      {detail.revisions.slice(1).map((r) => (
                        <option key={r.revisionNumber} value={r.revisionNumber}>
                          Revision #{r.revisionNumber} ({new Date(r.submittedAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {comparedRevision && latestRevision && (
                  <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6658FF]">
                      Revision Comparison: Rev #{comparedRevision.revisionNumber} vs Latest Rev #{latestRevision.revisionNumber}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <span className="font-bold text-slate-600 block">
                          Previous Revision #{comparedRevision.revisionNumber}
                        </span>
                        <p className="text-slate-700">{comparedRevision.submissionDescription}</p>
                        <p className="text-[11px] text-slate-500">
                          Files: {comparedRevision.evidenceFiles.length} • Links: {comparedRevision.evidenceLinks.length}
                        </p>
                        {comparedRevision.facultyFeedback && (
                          <p className="text-amber-800 text-[11px]">
                            <strong>Prior Feedback:</strong> {comparedRevision.facultyFeedback}
                          </p>
                        )}
                      </div>
                      <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-200 space-y-1.5">
                        <span className="font-bold text-[#0B192C] block">
                          Latest Revision #{latestRevision.revisionNumber}
                        </span>
                        <p className="text-slate-800">{latestRevision.submissionDescription}</p>
                        <p className="text-[11px] text-slate-600">
                          Files: {latestRevision.evidenceFiles.length} • Links: {latestRevision.evidenceLinks.length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                    <History className="w-4 h-4 text-[#6658FF]" />
                    <span>Submitted Evidence & Revisions ({detail.revisions.length})</span>
                  </h3>

                  <div className="space-y-4">
                    {detail.revisions.map((rev) => (
                      <div key={rev.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#6658FF] text-white font-bold text-[11px]">
                              Revision #{rev.revisionNumber}
                            </span>
                            <strong className="text-[#0B192C]">{rev.submittedByStudentName}</strong>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              rev.isLate ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {rev.isLate ? `Late (+${rev.lateByDays}d)` : 'On Time'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {new Date(rev.submittedAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-slate-700 leading-relaxed">{rev.submissionDescription}</p>

                        {rev.evidenceFiles.length > 0 && (
                          <div className="space-y-1.5">
                            {rev.evidenceFiles.map((f) => (
                              <div key={f.fileId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200">
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
                                  <button type="button" onClick={() => handleDownloadPrivateFile(f)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {rev.evidenceLinks.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {rev.evidenceLinks.map((lk, idx) => (
                              <a key={idx} href={lk.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#6658FF] text-indigo-700 font-medium">
                                <Link2 className="w-3 h-3" /> {lk.label}
                              </a>
                            ))}
                          </div>
                        )}

                        {rev.facultyFeedback && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                            <span className="font-bold block">
                              Decision on Rev #{rev.revisionNumber}: {(rev.facultyReviewOutcome || '').replace(/_/g, ' ')}
                            </span>
                            <p>{rev.facultyFeedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =====================================================
               FACULTY REVIEW DASHBOARD
               ===================================================== */
            <div className="space-y-6">
              {/* View Switcher: Activity Submissions vs Weekly Reports */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('SUBMISSIONS')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    activeView === 'SUBMISSIONS'
                      ? 'bg-[#6658FF] text-white border-[#6658FF]'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Activity Submissions ({dashboard?.items.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('WEEKLY_REPORTS')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    activeView === 'WEEKLY_REPORTS'
                      ? 'bg-[#6658FF] text-white border-[#6658FF]'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Weekly Progress Reports ({dashboard?.weeklyWorkspaces.length || 0})</span>
                </button>
              </div>

              {activeView === 'SUBMISSIONS' ? (
                <>
                  {/* Status Filter Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {BUCKET_TABS.map((tab) => {
                      const count =
                        tab.key === 'ALL'
                          ? dashboard?.items.length || 0
                          : tab.key === 'PENDING_REVIEW'
                          ? dashboard?.grouped.pendingReview.length || 0
                          : tab.key === 'UNDER_REVIEW'
                          ? dashboard?.grouped.underReview.length || 0
                          : tab.key === 'CHANGES_REQUESTED'
                          ? dashboard?.grouped.changesRequested.length || 0
                          : tab.key === 'RESUBMITTED'
                          ? dashboard?.grouped.resubmitted.length || 0
                          : tab.key === 'APPROVED'
                          ? dashboard?.grouped.approved.length || 0
                          : dashboard?.grouped.rejected.length || 0

                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setStatusFilter(tab.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${
                            statusFilter === tab.key
                              ? 'bg-[#0B192C] text-white border-[#0B192C]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {tab.label} ({count})
                        </button>
                      )
                    })}
                  </div>

                  {/* Filter Controls */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <option value="">All Assigned Projects</option>
                      {dashboard?.filterOptions.projects.map((p) => (
                        <option key={p.scheduleId} value={p.scheduleId}>
                          {p.projectTitle}
                        </option>
                      ))}
                    </select>

                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <option value="">All Scheduled Activities</option>
                      {dashboard?.filterOptions.activities.map((a) => (
                        <option key={a.activityId} value={a.activityId}>
                          #{a.sequenceNumber} {a.title}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      aria-label="Filter by submission date"
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    />

                    <input
                      type="text"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder="Filter by student or project..."
                      className="px-3 py-2 rounded-xl border border-slate-200"
                    />

                    <button
                      type="button"
                      onClick={() => loadData()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>

                  {/* Submissions List */}
                  <div className="space-y-3">
                    {!dashboard || dashboard.items.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                        No student submissions match your current filters.
                      </div>
                    ) : (
                      dashboard.items.map((item) => (
                        <div
                          key={item.submission.id}
                          className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#6658FF]/40 transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${REVIEW_BADGE[item.submission.status].className}`}>
                                {REVIEW_BADGE[item.submission.status].label}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${SCHEDULE_BADGE[item.scheduleStatus].className}`}>
                                {SCHEDULE_BADGE[item.scheduleStatus].label}
                              </span>
                              {item.submission.isLate && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  Late (+{item.submission.lateByDays}d)
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-[#0B192C]">
                              #{item.submission.activitySequenceNumber} {item.submission.activityTitle}
                            </h3>
                            <p className="text-xs text-slate-600">
                              Project: <strong>{item.projectTitle}</strong> • Submitted by{' '}
                              <strong>{item.submission.lastSubmittedByStudentName}</strong> (Rev #{item.submission.latestRevisionNumber})
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Deadline: {item.originalDeadline}
                              </span>
                              <span>
                                Submitted: {new Date(item.submission.lastSubmittedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <Link
                            to={`/faculty-review/submissions/${item.submission.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6658FF] hover:bg-[#5546FF] text-white text-xs font-bold shrink-0"
                          >
                            <span>Inspect & Review</span>
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                /* Integrated Weekly Report Review Directory */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Weekly progress reports are reviewed independently from formal scheduled activity approvals. Finalizing a weekly report never marks an academic activity complete.
                    </span>
                  </div>

                  {dashboard?.weeklyWorkspaces.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                      No published project weekly reports found yet.
                    </div>
                  ) : (
                    dashboard?.weeklyWorkspaces.map((ws) => (
                      <div key={ws.schedule.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-[#0B192C]">
                              {ws.schedule.projectTitle}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {ws.weeks.filter((w) => w.report && w.report.status !== 'DRAFT').length} submitted weekly reports • Team: {ws.schedule.assignedStudents.map((s) => s.fullName).join(', ')}
                            </p>
                          </div>
                          <Link
                            to={`/weekly-reports/${ws.schedule.id}`}
                            className="px-4 py-2 rounded-xl bg-[#6658FF] hover:bg-[#5546FF] text-white text-xs font-bold"
                          >
                            Open Weekly Reports &rarr;
                          </Link>
                        </div>
                      </div>
                    ))
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
              <button type="button" onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close file preview">
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

export default FacultyReviewPage
