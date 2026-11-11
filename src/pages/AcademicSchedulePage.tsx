import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Plus,
  Send,
  Save,
  Eye,
  Edit3,
  History,
  Users,
  BookOpen,
  FileCheck,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { authService } from '../services/authService'
import {
  scheduleApiService,
  type AcademicCalendarConfig,
  type EvidenceFormat,
  type HolidayEntry,
  type InitializationOptions,
  type ProjectSchedule,
  type ScheduleChangeHistoryEntry,
  type ScheduleDateWarning,
  type ScheduledActivity,
} from '../services/scheduleApiService'

const WEEKDAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
]

const EVIDENCE_LABELS: Record<EvidenceFormat, string> = {
  PDF_DOCUMENT: 'PDF Document',
  REPOSITORY_LINK: 'Repository Link',
  DESIGN_FILE: 'Design File',
  DEMO_VIDEO: 'Demo Video',
  TEST_REPORT: 'Test Report',
  PRESENTATION_SLIDES: 'Presentation Slides',
  SUMMARY_NOTE: 'Summary Note',
}

function getTodayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function checkLocalNonWorkingWarnings(
  activities: ScheduledActivity[],
  calendarConfig: AcademicCalendarConfig
): ScheduleDateWarning[] {
  const warnings: ScheduleDateWarning[] = []
  const holidayMap = new Map(calendarConfig.holidays.map((h) => [h.date, h.label]))
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (const act of activities) {
    for (const field of ['startDate', 'deadline'] as const) {
      const val = act[field]
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) continue
      if (holidayMap.has(val)) {
        warnings.push({
          activityId: act.activityId,
          sequenceNumber: act.sequenceNumber,
          activityTitle: act.title,
          field,
          date: val,
          reason: `${field === 'deadline' ? 'Deadline' : 'Start date'} (${val}) falls on institutional holiday: ${holidayMap.get(val)}`,
        })
      } else {
        const [y, m, d] = val.split('-').map(Number)
        const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
        if (!calendarConfig.workingDays.includes(dow)) {
          warnings.push({
            activityId: act.activityId,
            sequenceNumber: act.sequenceNumber,
            activityTitle: act.title,
            field,
            date: val,
            reason: `${field === 'deadline' ? 'Deadline' : 'Start date'} (${val}) falls on configured non-working day (${dayNames[dow]})`,
          })
        }
      }
    }
  }
  return warnings
}

export const AcademicSchedulePage: React.FC = () => {
  const currentUser = authService.getCurrentUser()
  const canManageSchedules = currentUser?.role === 'faculty' || currentUser?.role === 'admin'

  const [schedules, setSchedules] = useState<ProjectSchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<ProjectSchedule | null>(null)
  const [history, setHistory] = useState<ScheduleChangeHistoryEntry[]>([])
  const [initOptions, setInitOptions] = useState<InitializationOptions | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // View Mode: browse existing schedule | initialize new schedule | preview timeline
  const [mode, setMode] = useState<'view' | 'initialize'>('view')
  const [previewMode, setPreviewMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Draft / Initialize Form State
  const [projectChoiceMode, setProjectChoiceMode] = useState<'existing' | 'new'>('existing')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectDept, setNewProjectDept] = useState(currentUser?.department || 'Computer Science & Engineering')
  const [newProjectYear, setNewProjectYear] = useState('2025–26')
  const [newProjectProblem, setNewProjectProblem] = useState('')

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Array<{ studentId: string; isTeamLeader: boolean }>>([])
  const [calendarConfig, setCalendarConfig] = useState<AcademicCalendarConfig>({
    timezone: 'UTC_DATE_ONLY',
    projectStartDate: getTodayIsoDate(),
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
  })
  const [holidayDateInput, setHolidayDateInput] = useState('')
  const [holidayLabelInput, setHolidayLabelInput] = useState('')
  const [activities, setActivities] = useState<ScheduledActivity[]>([])
  const [changeReason, setChangeReason] = useState('')
  const [showAdminTemplates, setShowAdminTemplates] = useState(false)
  const [templateChangelog, setTemplateChangelog] = useState('')
  const [firstActivityDaysOverride, setFirstActivityDaysOverride] = useState<number>(3)

  const liveWarnings = checkLocalNonWorkingWarnings(activities, calendarConfig)

  const loadWorkspace = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const list = await scheduleApiService.listMySchedules()
      setSchedules(list)
      if (list.length > 0 && !selectedSchedule) {
        await handleSelectSchedule(list[0])
      }
      if (canManageSchedules) {
        const opts = await scheduleApiService.getInitializationOptions()
        setInitOptions(opts)
        if (opts.projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(opts.projects[0].id)
        }
        if (opts.templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(opts.templates[0].id)
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load academic schedule workspace.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

  const handleSelectSchedule = async (sched: ProjectSchedule) => {
    setSelectedSchedule(sched)
    setActivities(sched.activities)
    setCalendarConfig(sched.calendarConfig)
    setSelectedStudents(
      sched.assignedStudents.map((s) => ({
        studentId: s.studentId,
        isTeamLeader: Boolean(s.isTeamLeader),
      }))
    )
    setMode('view')
    setPreviewMode(false)
    setChangeReason('')
    try {
      const hist = await scheduleApiService.getScheduleHistory(sched.id)
      setHistory(hist)
    } catch {
      setHistory([])
    }
  }

  const handleStartInitialize = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setMode('initialize')
    setPreviewMode(false)
    setSelectedSchedule(null)
    setHistory([])
    setSelectedStudents([])

    const tplId = selectedTemplateId || initOptions?.templates?.[0]?.id
    if (tplId) {
      try {
        const suggested = await scheduleApiService.suggestDates({
          templateId: tplId,
          calendarConfig,
        })
        setActivities(suggested.activities)
      } catch (err: any) {
        setErrorMsg(err?.message || 'Could not calculate initial dates.')
      }
    }
  }

  const handleRecalculateDates = async (overrideCalendar?: AcademicCalendarConfig) => {
    const cfg = overrideCalendar || calendarConfig
    const tplId =
      mode === 'initialize'
        ? selectedTemplateId || initOptions?.templates?.[0]?.id
        : selectedSchedule?.templateId
    if (!tplId) return

    setErrorMsg(null)
    try {
      const suggested = await scheduleApiService.suggestDates({
        templateId: tplId,
        calendarConfig: cfg,
      })
      // Preserve custom activity wording if same sequence numbers exist while updating dates cleanly
      setActivities((prev) =>
        suggested.activities.map((sAct) => {
          const existing = prev.find((p) => p.sequenceNumber === sAct.sequenceNumber)
          return existing
            ? { ...existing, startDate: sAct.startDate, deadline: sAct.deadline }
            : sAct
        })
      )
      setSuccessMsg('Recalculated activity start dates and deadlines using your working calendar.')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to recalculate dates.')
    }
  }

  const toggleWorkingDay = (dow: number) => {
    const exists = calendarConfig.workingDays.includes(dow)
    if (exists && calendarConfig.workingDays.length === 1) return
    const nextDays = exists
      ? calendarConfig.workingDays.filter((d) => d !== dow)
      : [...calendarConfig.workingDays, dow]
    setCalendarConfig((prev) => ({ ...prev, workingDays: nextDays }))
  }

  const handleAddHoliday = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayDateInput) || !holidayLabelInput.trim()) return
    const nextHolidays: HolidayEntry[] = [
      ...calendarConfig.holidays.filter((h) => h.date !== holidayDateInput),
      { date: holidayDateInput, label: holidayLabelInput.trim() },
    ].sort((a, b) => a.date.localeCompare(b.date))
    setCalendarConfig((prev) => ({ ...prev, holidays: nextHolidays }))
    setHolidayDateInput('')
    setHolidayLabelInput('')
  }

  const handleRemoveHoliday = (dateStr: string) => {
    setCalendarConfig((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((h) => h.date !== dateStr),
    }))
  }

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.some((s) => s.studentId === studentId)) {
        return prev.filter((s) => s.studentId !== studentId)
      }
      return [...prev, { studentId, isTeamLeader: prev.length === 0 }]
    })
  }

  const handleActivityChange = (
    idx: number,
    updates: Partial<ScheduledActivity>
  ) => {
    setActivities((prev) => prev.map((a, i) => (i === idx ? { ...a, ...updates } : a)))
  }

  const handleCreateDraft = async (publishImmediately: boolean) => {
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const { schedule } = await scheduleApiService.initializeSchedule({
        ...(projectChoiceMode === 'existing'
          ? { projectId: selectedProjectId }
          : {
              newProject: {
                title: newProjectTitle,
                department: newProjectDept,
                academicYear: newProjectYear,
                problemStatement: newProjectProblem,
              },
            }),
        templateId: selectedTemplateId,
        assignedStudents: selectedStudents,
        calendarConfig,
        activities,
      })

      let finalSchedule = schedule
      if (publishImmediately) {
        const pubRes = await scheduleApiService.publishSchedule(schedule.id)
        finalSchedule = pubRes.schedule
      }

      const list = await scheduleApiService.listMySchedules()
      setSchedules(list)
      await handleSelectSchedule(finalSchedule)
      setSuccessMsg(
        publishImmediately
          ? `Official schedule published for "${finalSchedule.projectTitle}" and assigned students notified.`
          : `Draft schedule saved for "${finalSchedule.projectTitle}".`
      )
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save schedule.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveExistingDraft = async (andPublish: boolean) => {
    if (!selectedSchedule) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const { schedule } = await scheduleApiService.updateDraftSchedule(selectedSchedule.id, {
        calendarConfig,
        activities,
        assignedStudents: selectedStudents,
      })
      let finalSchedule = schedule
      if (andPublish) {
        const pubRes = await scheduleApiService.publishSchedule(schedule.id)
        finalSchedule = pubRes.schedule
      }
      const list = await scheduleApiService.listMySchedules()
      setSchedules(list)
      await handleSelectSchedule(finalSchedule)
      setSuccessMsg(
        andPublish
          ? 'Official schedule published to team and students notified.'
          : 'Draft schedule updated cleanly.'
      )
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update schedule.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleModifyPublished = async () => {
    if (!selectedSchedule) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const { schedule } = await scheduleApiService.modifyPublishedSchedule(selectedSchedule.id, {
        reason: changeReason.trim(),
        calendarConfig,
        activities,
      })
      const list = await scheduleApiService.listMySchedules()
      setSchedules(list)
      await handleSelectSchedule(schedule)
      setSuccessMsg(
        `Schedule updated to v${schedule.version}. Original baseline preserved and assigned students notified.`
      )
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record published schedule update.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishTemplateVersion = async (templateId: string) => {
    const tpl = initOptions?.templates.find((t) => t.id === templateId)
    if (!tpl?.latestVersion || !templateChangelog.trim()) {
      setErrorMsg('Provide a short changelog note before publishing a new template version.')
      return
    }
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const updatedActivities = tpl.latestVersion.activities.map((a, idx) =>
        idx === 0
          ? { ...a, suggestedDurationDays: Math.max(1, firstActivityDaysOverride) }
          : a
      )
      const { version } = await scheduleApiService.addTemplateVersion(templateId, {
        changelog: templateChangelog.trim(),
        activities: updatedActivities,
      })
      const opts = await scheduleApiService.getInitializationOptions()
      setInitOptions(opts)
      setTemplateChangelog('')
      setSuccessMsg(`Published template ${tpl.name} v${version.version}. Existing schedules remain unchanged.`)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to publish template version.')
    } finally {
      setIsSaving(false)
    }
  }

  const isEditingAllowed =
    canManageSchedules && (mode === 'initialize' || selectedSchedule !== null)

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
          {/* Top Academic Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Academic Project Lifecycle Tracker</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B192C] tracking-tight">
                {canManageSchedules
                  ? 'Academic Schedule Manager'
                  : 'Official Project Schedule'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {canManageSchedules
                  ? 'Initialize projects from institutional templates, configure academic working days, preview timelines, and publish schedules for student teams.'
                  : 'Official chronological milestone schedule published by your faculty guide. Activity deadlines and requirements are view-only.'}
              </p>
            </div>

            {canManageSchedules && (
              <button
                type="button"
                onClick={handleStartInitialize}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize New Schedule</span>
              </button>
            )}
          </div>

          {/* Feedback Banners */}
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
              <p className="text-sm text-slate-500">Loading academic schedules...</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Sidebar: Project Schedule List */}
              <div className="lg:col-span-3 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                  {canManageSchedules ? 'Managed Schedules' : 'My Team Schedules'} ({schedules.length})
                </h2>

                {schedules.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 text-xs text-slate-500 leading-relaxed">
                    {canManageSchedules
                      ? 'No project schedules initialized yet. Click "Initialize New Schedule" to configure your first team timeline.'
                      : 'No official academic schedule has been published for your account yet. Your faculty guide will notify you once published.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((s) => {
                      const active = mode === 'view' && selectedSchedule?.id === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectSchedule(s)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            active
                              ? 'bg-white border-[#6658FF] ring-2 ring-[#6658FF]/15 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {s.status} • v{s.version}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {s.academicYear}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#0B192C] line-clamp-2">
                            {s.projectTitle}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            {s.templateName}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentUser?.role === 'admin' && initOptions && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdminTemplates(!showAdminTemplates)}
                      className="w-full flex items-center justify-between text-xs font-bold text-[#0B192C] cursor-pointer"
                    >
                      <span>Admin: Template Catalog ({initOptions.templates.length})</span>
                      <span className="text-[#6658FF]">{showAdminTemplates ? 'Hide' : 'Manage'}</span>
                    </button>
                    {showAdminTemplates && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        {initOptions.templates.map((tpl) => (
                          <div key={tpl.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#0B192C]">{tpl.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200">
                                v{tpl.activeVersion}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {tpl.latestVersion?.activities.length ?? 0} reusable activities • {tpl.targetDurationWeeks} weeks
                            </p>
                            <div className="space-y-1.5 pt-1">
                              <label className="block text-[10px] font-semibold text-slate-600">
                                Activity 1 Duration (working days)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={firstActivityDaysOverride}
                                onChange={(e) => setFirstActivityDaysOverride(Number(e.target.value) || 3)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                              />
                              <input
                                type="text"
                                placeholder="New template version changelog..."
                                value={templateChangelog}
                                onChange={(e) => setTemplateChangelog(e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                              />
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handlePublishTemplateVersion(tpl.id)}
                                className="w-full py-1.5 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Publish Template v{tpl.activeVersion + 1}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Main Panel */}
              <div className="lg:col-span-9 space-y-6">
                {!isEditingAllowed ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-2xl mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0B192C]">
                      No Published Schedule Selected
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                      Once your faculty guide initializes and publishes the official schedule for your team, every activity, deadline, and required deliverable will appear here in chronological order.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header & Mode Switch (Edit vs Chronological Preview) */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-bold text-[#0B192C]">
                              {mode === 'initialize'
                                ? 'Initialize Project Schedule'
                                : selectedSchedule?.projectTitle}
                            </h2>
                            {selectedSchedule && (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  selectedSchedule.status === 'PUBLISHED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {selectedSchedule.status === 'PUBLISHED'
                                  ? `Official Schedule v${selectedSchedule.version}`
                                  : 'Draft (Unpublished)'}
                              </span>
                            )}
                          </div>
                          {selectedSchedule && (
                            <p className="text-xs text-slate-500 mt-1">
                              Template: <strong>{selectedSchedule.templateName}</strong> (v{selectedSchedule.templateVersion}) • Guide: <strong>{selectedSchedule.facultyGuideName}</strong> • {selectedSchedule.department}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {canManageSchedules && (
                            <button
                              type="button"
                              onClick={() => setPreviewMode(!previewMode)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              {previewMode ? (
                                <>
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Back to Configuration</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-[#6658FF]" />
                                  <span>Preview Timeline</span>
                                </>
                              )}
                            </button>
                          )}
                          {selectedSchedule && (
                            <button
                              type="button"
                              onClick={() => setShowHistory(!showHistory)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>History ({history.length})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Assigned Student Team Pills */}
                      {selectedSchedule && (
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Authorized Team:
                          </span>
                          {selectedSchedule.assignedStudents.map((st) => (
                            <span
                              key={st.studentId}
                              className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                            >
                              {st.fullName}
                              {st.usnOrEmployeeId ? ` (${st.usnOrEmployeeId})` : ''}
                              {st.isTeamLeader ? ' • Lead' : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {!canManageSchedules && (
                        <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Official faculty-published schedule. Dates and deliverable requirements are read-only for all students and team leaders.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Schedule History Panel */}
                    {showHistory && selectedSchedule && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                        <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                          <History className="w-4 h-4 text-[#6658FF]" />
                          <span>Schedule Version & Change History</span>
                        </h3>
                        {history.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No published revisions recorded yet (schedule is currently a Draft).
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {history.map((h) => (
                              <div
                                key={h.id}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-bold text-[#0B192C]">
                                    v{h.versionNumber} • {h.changeType.replace(/_/g, ' ')}
                                    {h.activityTitle ? ` — ${h.activityTitle}` : ''}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    By {h.changedByName} • {new Date(h.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-slate-600">
                                  <strong>{h.field}:</strong>{' '}
                                  <span className="line-through text-slate-400">{h.previousValue}</span>{' '}
                                  &rarr; <span className="font-semibold text-indigo-700">{h.newValue}</span>
                                </p>
                                <p className="text-slate-500 italic">Reason: {h.reason}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Faculty Configuration Controls (Project, Template, Calendar, Team) */}
                    {canManageSchedules && !previewMode && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
                        {mode === 'initialize' && initOptions && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                1. Academic Project
                              </label>
                              <div className="flex gap-2 mb-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setProjectChoiceMode('existing')}
                                  className={`px-3 py-1 rounded-lg font-semibold border cursor-pointer ${
                                    projectChoiceMode === 'existing'
                                      ? 'bg-[#6658FF] text-white border-[#6658FF]'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  Existing Project
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProjectChoiceMode('new')}
                                  className={`px-3 py-1 rounded-lg font-semibold border cursor-pointer ${
                                    projectChoiceMode === 'new'
                                      ? 'bg-[#6658FF] text-white border-[#6658FF]'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  Create New Project
                                </button>
                              </div>
                              {projectChoiceMode === 'existing' ? (
                                <select
                                  value={selectedProjectId}
                                  onChange={(e) => setSelectedProjectId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800"
                                >
                                  {initOptions.projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} ({p.academicYear})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="New academic project title..."
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Department"
                                      value={newProjectDept}
                                      onChange={(e) => setNewProjectDept(e.target.value)}
                                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Academic Year (e.g. 2025–26)"
                                      value={newProjectYear}
                                      onChange={(e) => setNewProjectYear(e.target.value)}
                                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                    />
                                  </div>
                                  <textarea
                                    rows={2}
                                    placeholder="Brief project problem focus (optional)"
                                    value={newProjectProblem}
                                    onChange={(e) => setNewProjectProblem(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                2. Academic Schedule Template
                              </label>
                              <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 mb-2"
                              >
                                {initOptions.templates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} (v{t.activeVersion} • {t.targetDurationWeeks} Weeks)
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                {initOptions.templates.find((t) => t.id === selectedTemplateId)?.description}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Calendar Configuration */}
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Academic Calendar & Working Days
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleRecalculateDates()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6658FF] bg-[#6658FF]/10 hover:bg-[#6658FF]/20 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Recalculate Suggested Dates</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Project Start Date
                              </label>
                              <input
                                type="date"
                                value={calendarConfig.projectStartDate}
                                onChange={(e) =>
                                  setCalendarConfig((prev) => ({
                                    ...prev,
                                    projectStartDate: e.target.value,
                                  }))
                                }
                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Working Days of the Week
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {WEEKDAYS.map((day) => {
                                  const on = calendarConfig.workingDays.includes(day.value)
                                  return (
                                    <button
                                      key={day.value}
                                      type="button"
                                      onClick={() => toggleWorkingDay(day.value)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                                        on
                                          ? 'bg-[#6658FF] text-white border-[#6658FF]'
                                          : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {day.short}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Institutional Holidays */}
                          <div className="pt-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Institutional Holidays / Non-Working Dates
                            </label>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <input
                                type="date"
                                value={holidayDateInput}
                                onChange={(e) => setHolidayDateInput(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Holiday name (e.g. Republic Day)"
                                value={holidayLabelInput}
                                onChange={(e) => setHolidayLabelInput(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs min-w-[200px]"
                              />
                              <button
                                type="button"
                                onClick={handleAddHoliday}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                              >
                                Add Holiday
                              </button>
                            </div>
                            {calendarConfig.holidays.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {calendarConfig.holidays.map((h) => (
                                  <span
                                    key={h.date}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium"
                                  >
                                    <span>
                                      {h.date}: {h.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveHoliday(h.date)}
                                      className="font-bold text-amber-700 hover:text-rose-700 cursor-pointer"
                                      aria-label={`Remove holiday ${h.date}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Authorized Student Team Selection (Draft / Initialize) */}
                        {(mode === 'initialize' || selectedSchedule?.status === 'DRAFT') && initOptions && (
                          <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                              Assign Authorized Student Team Members
                            </h3>
                            {initOptions.students.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                No registered student accounts found yet. Register student accounts via Sign Up first.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {initOptions.students.map((st) => {
                                  const selected = selectedStudents.find((x) => x.studentId === st.studentId)
                                  return (
                                    <div
                                      key={st.studentId}
                                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                                        selected
                                          ? 'bg-indigo-50 border-[#6658FF] text-indigo-900'
                                          : 'bg-slate-50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStudent(st.studentId)}
                                        className="font-semibold cursor-pointer"
                                      >
                                        {selected ? '✓ ' : '+ '}
                                        {st.fullName}
                                      </button>
                                      {selected && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedStudents((prev) =>
                                              prev.map((p) =>
                                                p.studentId === st.studentId
                                                  ? { ...p, isTeamLeader: !p.isTeamLeader }
                                                  : p
                                              )
                                            )
                                          }
                                          className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                                            selected.isTeamLeader
                                              ? 'bg-[#6658FF] text-white border-[#6658FF]'
                                              : 'bg-white text-slate-500 border-slate-300'
                                          }`}
                                          title="Metadata only: team leaders cannot alter official faculty schedule"
                                        >
                                          {selected.isTeamLeader ? 'Lead' : 'Member'}
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Non-Working Day Warnings (Never silently moved) */}
                    {liveWarnings.length > 0 && canManageSchedules && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Non-Working Day Warning ({liveWarnings.length})</span>
                        </div>
                        <p className="text-amber-800">
                          Your selected dates fall on non-working days or institutional holidays. Dates are kept as configured; adjust below if you prefer a working day:
                        </p>
                        <ul className="list-disc ml-5 space-y-0.5">
                          {liveWarnings.map((w, i) => (
                            <li key={i}>
                              <strong>
                                #{w.sequenceNumber} {w.activityTitle}
                              </strong>
                              : {w.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Chronological Official / Preview Timeline OR Faculty Editable Activity List */}
                    {previewMode || !canManageSchedules ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#6658FF]" />
                            <span>
                              {previewMode ? 'Schedule Timeline Preview' : 'Official Academic Activity Timeline'}
                            </span>
                          </h3>
                          <span className="text-xs text-slate-500">
                            {activities.length} Scheduled Activities
                          </span>
                        </div>

                        <div className="space-y-3">
                          {activities.map((act) => (
                            <div
                              key={act.activityId}
                              className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-7 h-7 rounded-xl bg-[#6658FF]/10 text-[#6658FF] font-bold text-xs flex items-center justify-center shrink-0">
                                    {act.sequenceNumber}
                                  </span>
                                  <div>
                                    <h4 className="text-sm font-bold text-[#0B192C]">{act.title}</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">{act.description}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      act.isMandatory
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {act.isMandatory ? 'Mandatory' : 'Optional'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                                    Status: {act.activityStatus.replace(/_/g, ' ')}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                                    Review: {act.facultyReviewStatus.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <Clock className="w-3.5 h-3.5 text-[#6658FF] shrink-0" />
                                  <span>
                                    <strong>Start:</strong> {act.startDate} &rarr;{' '}
                                    <strong>Deadline:</strong> {act.deadline}
                                  </span>
                                </div>
                                <div className="text-slate-600">
                                  <strong>Evidence Formats:</strong>{' '}
                                  {act.acceptedEvidenceFormats.map((f) => EVIDENCE_LABELS[f] || f).join(', ')}
                                </div>
                              </div>

                              <div className="text-xs text-slate-700 space-y-1">
                                <p>
                                  <strong>Required Submission:</strong> {act.requiredSubmissionDescription}
                                </p>
                                <p className="text-slate-500">
                                  <strong>Update Instructions:</strong> {act.studentUpdateInstructions}
                                </p>
                              </div>

                              {selectedSchedule?.status === 'PUBLISHED' && (
                                <div className="pt-2 border-t border-slate-200/70 flex justify-end">
                                  <Link
                                    to={`/activity-tracker/${selectedSchedule.id}/activities/${act.activityId}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6658FF] hover:bg-[#5546FF] text-white text-xs font-bold"
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                    <span>
                                      {canManageSchedules
                                        ? 'Inspect Activity Submissions'
                                        : 'Open Activity & Submit Evidence'}
                                    </span>
                                  </Link>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-[#6658FF]" />
                            <span>Configure Scheduled Activities ({activities.length})</span>
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {activities.map((act, idx) => (
                            <div
                              key={act.activityId}
                              className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/40"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                                  <span className="w-6 h-6 rounded-lg bg-[#6658FF] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                    {act.sequenceNumber}
                                  </span>
                                  <input
                                    type="text"
                                    value={act.title}
                                    onChange={(e) =>
                                      handleActivityChange(idx, { title: e.target.value })
                                    }
                                    className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#0B192C]"
                                  />
                                </div>

                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={act.isMandatory}
                                    onChange={(e) =>
                                      handleActivityChange(idx, { isMandatory: e.target.checked })
                                    }
                                    className="rounded text-[#6658FF]"
                                  />
                                  <span>Mandatory</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="block font-semibold text-slate-600 mb-1">
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={act.startDate}
                                    onChange={(e) =>
                                      handleActivityChange(idx, { startDate: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-600 mb-1">
                                    Deadline
                                  </label>
                                  <input
                                    type="date"
                                    value={act.deadline}
                                    onChange={(e) =>
                                      handleActivityChange(idx, { deadline: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="block font-semibold text-slate-600 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={act.description}
                                    onChange={(e) =>
                                      handleActivityChange(idx, { description: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-600 mb-1">
                                    Required Submission
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={act.requiredSubmissionDescription}
                                    onChange={(e) =>
                                      handleActivityChange(idx, {
                                        requiredSubmissionDescription: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar (Save Draft / Publish / Versioned Update) */}
                    {canManageSchedules && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {mode === 'initialize' ? (
                          <>
                            <span className="text-xs text-slate-500">
                              Preview your timeline before publishing to assigned students.
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleCreateDraft(false)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Draft</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleCreateDraft(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Publish Official Schedule</span>
                              </button>
                            </div>
                          </>
                        ) : selectedSchedule?.status === 'DRAFT' ? (
                          <>
                            <span className="text-xs text-slate-500">
                              Draft schedule is not yet visible to students until published.
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveExistingDraft(false)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Draft Changes</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveExistingDraft(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Publish Schedule to Team</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3">
                            <input
                              type="text"
                              placeholder="Required reason for modifying published deadline/activity..."
                              value={changeReason}
                              onChange={(e) => setChangeReason(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                            />
                            <button
                              type="button"
                              disabled={isSaving || changeReason.trim().length < 5}
                              onClick={handleModifyPublished}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6658FF] hover:bg-[#5546FF] disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Versioned Update & Notify Team</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default AcademicSchedulePage
