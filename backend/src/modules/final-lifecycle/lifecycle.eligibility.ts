import type { IActivitySubmission } from '../activity-submissions/submission.types.js'
import { formatUtcDate } from '../schedules/calendar.utils.js'
import type { IProjectSchedule } from '../schedules/schedule.types.js'
import { generateWeeklyReportingPeriods } from '../weekly-reports/weeklyReport.calendar.js'
import type { IWeeklyProgressReport } from '../weekly-reports/weeklyReport.types.js'
import type {
  CompletionEligibilityResult,
  EligibilityChecklistItem,
  IFinalDeliverableConfig,
  IFinalMetadataPayload,
  IFinalSubmissionSnapshot,
} from './lifecycle.types.js'

export interface CandidateDeliverablesState {
  metadata?: Partial<IFinalMetadataPayload>
  finalReportFiles?: Array<{ fileId: string }>
  presentationFiles?: Array<{ fileId: string }>
  architectureDiagramFiles?: Array<{ fileId: string }>
  screenshotFiles?: Array<{ fileId: string }>
}

/**
 * Evaluates whether a scheduled project has satisfied every institutional rule
 * required to enter final review or be approved for completion:
 * - All mandatory scheduled activities approved (optional activities never block)
 * - No pending correction loops on submissions
 * - Required weekly reports submitted
 * - Mandatory final deliverables attached
 * - Required academic metadata completed
 */
export function evaluateCompletionEligibility(params: {
  schedule: IProjectSchedule
  submissions: IActivitySubmission[]
  weeklyReports: IWeeklyProgressReport[]
  config: IFinalDeliverableConfig
  deliverables?: CandidateDeliverablesState | IFinalSubmissionSnapshot | null
  todayIso?: string
}): CompletionEligibilityResult {
  const { schedule, submissions, weeklyReports, config, deliverables } = params
  const todayIso = params.todayIso || formatUtcDate(new Date())
  const checklist: EligibilityChecklistItem[] = []
  const blockingReasons: string[] = []

  // 1. Mandatory vs Optional Scheduled Activities
  const mandatoryActivities = schedule.activities.filter((a) => a.isMandatory)
  const optionalActivities = schedule.activities.filter((a) => !a.isMandatory)
  let mandatoryApprovedCount = 0
  const missingMandatoryTitles: string[] = []

  for (const act of mandatoryActivities) {
    const mode = act.submissionMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM_SHARED'
    if (mode === 'TEAM_SHARED') {
      const sub = submissions.find(
        (s) => s.activityId === act.activityId && s.submissionKey === 'TEAM'
      )
      if (sub?.status === 'APPROVED') {
        mandatoryApprovedCount++
      } else {
        missingMandatoryTitles.push(
          `#${act.sequenceNumber} ${act.title} (${sub ? sub.status.replace(/_/g, ' ') : 'NOT SUBMITTED'})`
        )
      }
    } else {
      const allApproved = schedule.assignedStudentIds.every((studentId) => {
        const sub = submissions.find(
          (s) => s.activityId === act.activityId && s.submissionKey === studentId
        )
        return sub?.status === 'APPROVED'
      })
      if (allApproved) {
        mandatoryApprovedCount++
      } else {
        missingMandatoryTitles.push(`#${act.sequenceNumber} ${act.title} (Individual approval pending)`)
      }
    }
  }

  const allMandatoryApproved = missingMandatoryTitles.length === 0
  checklist.push({
    key: 'mandatory_activities',
    label: 'Mandatory Scheduled Activities Approved',
    passed: allMandatoryApproved,
    required: true,
    detail: allMandatoryApproved
      ? `All ${mandatoryActivities.length} mandatory activities approved (${optionalActivities.length} optional activities do not block completion).`
      : `Incomplete mandatory activities: ${missingMandatoryTitles.join('; ')}`,
  })
  if (!allMandatoryApproved) {
    blockingReasons.push(`Unapproved mandatory scheduled activities: ${missingMandatoryTitles.join(', ')}`)
  }

  // 2. Unresolved correction loops (even on submitted optional work or weekly reports)
  const pendingCorrections = submissions.filter((s) => s.status === 'CHANGES_REQUESTED')
  const weeklyClarifications = weeklyReports.filter((w) => w.status === 'CLARIFICATION_REQUESTED')
  const noOpenCorrections = pendingCorrections.length === 0 && weeklyClarifications.length === 0
  checklist.push({
    key: 'resolved_corrections',
    label: 'Outstanding Corrections Resolved',
    passed: noOpenCorrections,
    required: true,
    detail: noOpenCorrections
      ? 'No unresolved Changes Requested or Clarification Requested items.'
      : `${pendingCorrections.length} activity correction(s) and ${weeklyClarifications.length} weekly clarification(s) still open.`,
  })
  if (!noOpenCorrections) {
    blockingReasons.push('Resolve all open Changes Requested / Clarification Requested items first.')
  }

  // 3. Weekly Progress Reports check
  const periods = generateWeeklyReportingPeriods(schedule)
  const reportByWeek = new Map(weeklyReports.map((r) => [r.weekNumber, r]))
  const submittedStatuses = new Set(['SUBMITTED', 'UNDER_REVIEW', 'FINALIZED'])
  const submittedReportsCount = weeklyReports.filter((r) => submittedStatuses.has(r.status)).length

  const requiredPeriods = config.requireAllWeeklyReportsSubmitted
    ? periods
    : config.requireStartedWeeklyReportsSubmitted
    ? periods.filter((p) => p.reportingPeriodStart <= todayIso)
    : []

  const missingWeeks = requiredPeriods
    .filter((p) => {
      const rep = reportByWeek.get(p.weekNumber)
      return !rep || !submittedStatuses.has(rep.status)
    })
    .map((p) => `Week ${p.weekNumber}`)

  const belowMinimumCount = submittedReportsCount < config.minimumWeeklyReportsRequired
  const weeklyPassed = missingWeeks.length === 0 && !belowMinimumCount

  checklist.push({
    key: 'weekly_reports',
    label: 'Required Weekly Progress Reports Submitted',
    passed: weeklyPassed,
    required: true,
    detail: weeklyPassed
      ? `${submittedReportsCount} weekly report(s) submitted and accounted for.`
      : missingWeeks.length > 0
      ? `Missing required weekly reports: ${missingWeeks.join(', ')}.`
      : `At least ${config.minimumWeeklyReportsRequired} submitted weekly report(s) required (currently ${submittedReportsCount}).`,
  })
  if (!weeklyPassed) {
    blockingReasons.push(
      missingWeeks.length > 0
        ? `Missing weekly progress reports: ${missingWeeks.join(', ')}`
        : `Minimum ${config.minimumWeeklyReportsRequired} submitted weekly progress report required`
    )
  }

  // 4. Final Deliverables check (per institutional policy)
  const meta = deliverables?.metadata
  const hasFinalReport = (deliverables?.finalReportFiles?.length || 0) > 0
  const hasPresentation = (deliverables?.presentationFiles?.length || 0) > 0
  const hasGithub = Boolean(meta?.githubUrl && meta.githubUrl.trim())
  const hasArchitectureDiagram = (deliverables?.architectureDiagramFiles?.length || 0) > 0
  const hasScreenshots = (deliverables?.screenshotFiles?.length || 0) > 0
  const hasDemo = Boolean((meta?.demoUrl && meta.demoUrl.trim()) || (meta?.videoUrl && meta.videoUrl.trim()))

  const deliverableChecks: Array<{ key: string; label: string; required: boolean; present: boolean }> = [
    { key: 'deliv_report', label: 'Final Project Report (PDF/DOCX)', required: config.mandatoryDeliverables.finalReport, present: hasFinalReport },
    { key: 'deliv_presentation', label: 'Presentation Slides', required: config.mandatoryDeliverables.presentation, present: hasPresentation },
    { key: 'deliv_github', label: 'Source Code / GitHub URL', required: config.mandatoryDeliverables.sourceCodeOrGithub, present: hasGithub },
    { key: 'deliv_arch', label: 'System Architecture Diagram', required: config.mandatoryDeliverables.architectureDiagram, present: hasArchitectureDiagram },
    { key: 'deliv_screens', label: 'UI/UX Screenshots', required: config.mandatoryDeliverables.screenshots, present: hasScreenshots },
    { key: 'deliv_demo', label: 'Project Demo URL / Video', required: config.mandatoryDeliverables.demoLinkOrVideo, present: hasDemo },
  ]

  for (const d of deliverableChecks) {
    checklist.push({
      key: d.key,
      label: d.label,
      passed: d.present,
      required: d.required,
      detail: d.present ? 'Provided.' : d.required ? 'Required by institutional policy.' : 'Optional deliverable.',
    })
    if (d.required && !d.present) {
      blockingReasons.push(`Missing mandatory final deliverable: ${d.label}`)
    }
  }

  // 5. Required Project Metadata
  const missingMetaFields: string[] = []
  if (!meta?.title?.trim()) missingMetaFields.push('Title')
  if (!meta?.abstract?.trim() || meta.abstract.trim().length < 20) missingMetaFields.push('Abstract')
  if (!meta?.problemStatement?.trim() || meta.problemStatement.trim().length < 15) {
    missingMetaFields.push('Problem Statement')
  }
  if (!meta?.objectives || meta.objectives.length === 0) missingMetaFields.push('Objectives')
  if (!meta?.proposedSolution?.trim()) missingMetaFields.push('Proposed Solution')
  if (!meta?.modules || meta.modules.length === 0) missingMetaFields.push('Implemented Modules')
  if (!meta?.technologyStack || meta.technologyStack.length === 0) missingMetaFields.push('Technology Stack')
  if (!meta?.learningOutcomes || meta.learningOutcomes.length === 0) missingMetaFields.push('Learning Outcomes')

  const metaPassed = missingMetaFields.length === 0
  checklist.push({
    key: 'project_metadata',
    label: 'Complete Project Metadata',
    passed: metaPassed,
    required: true,
    detail: metaPassed
      ? 'All required academic metadata fields provided.'
      : `Missing metadata: ${missingMetaFields.join(', ')}.`,
  })
  if (!metaPassed) {
    blockingReasons.push(`Incomplete project metadata: ${missingMetaFields.join(', ')}`)
  }

  return {
    eligibleForFinalReview: blockingReasons.length === 0,
    checklist,
    blockingReasons,
    metrics: {
      mandatoryActivitiesTotal: mandatoryActivities.length,
      mandatoryActivitiesApproved: mandatoryApprovedCount,
      optionalActivitiesTotal: optionalActivities.length,
      weeklyReportsSubmitted: submittedReportsCount,
    },
  }
}
