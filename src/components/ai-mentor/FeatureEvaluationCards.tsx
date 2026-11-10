import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Layers,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck,
  RotateCcw,
  Info,
  ShieldAlert,
} from 'lucide-react'
import type {
  EvaluationRecord,
  EvaluatedFeature,
  DecisionStatus,
  FeatureClassification,
} from '../../services/aiEvaluationApiService'

interface FeatureEvaluationCardsProps {
  evaluation: EvaluationRecord
  onRecordDecision: (featureId: string, decision: DecisionStatus, modifiedScope?: string) => Promise<void>
  onOpenScopeModal: () => void
  onOpenAssessmentModal: () => void
  isBusy?: boolean
}

export const FeatureEvaluationCards: React.FC<FeatureEvaluationCardsProps> = ({
  evaluation,
  onRecordDecision,
  onOpenScopeModal,
  onOpenAssessmentModal,
  isBusy = false,
}) => {
  const [filter, setFilter] = useState<string>('ALL')
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [modifyingFeatureId, setModifyingFeatureId] = useState<string | null>(null)
  const [modifiedScopeText, setModifiedScopeText] = useState<string>('')
  const [activeTradeoffNote, setActiveTradeoffNote] = useState<{ featureName: string; note: string } | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedFeatures((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getDecision = (featureId: string) => {
    return evaluation.decisions.find((d) => d.featureId === featureId)
  }

  const handleAccept = async (featureId: string) => {
    await onRecordDecision(featureId, 'ACCEPTED')
    setActiveTradeoffNote(null)
  }

  const handleReject = async (feature: EvaluatedFeature) => {
    await onRecordDecision(feature.featureId, 'REJECTED')
    const decision = evaluation.decisions.find((d) => d.featureId === feature.featureId)
    setActiveTradeoffNote({
      featureName: feature.name,
      note: decision?.tradeoffNotes || `Excluded "${feature.name}" from final project scope to protect delivery timeline.`,
    })
  }

  const handleStartModify = (feature: EvaluatedFeature) => {
    const existing = getDecision(feature.featureId)
    setModifyingFeatureId(feature.featureId)
    setModifiedScopeText(existing?.modifiedScope || feature.simplerAlternative || 'Reduced lightweight implementation')
  }

  const handleSaveModify = async (featureId: string) => {
    if (!modifiedScopeText.trim()) return
    await onRecordDecision(featureId, 'MODIFIED', modifiedScopeText.trim())
    setModifyingFeatureId(null)
    setModifiedScopeText('')
  }

  const filteredFeatures = evaluation.features.filter((f) => {
    if (filter === 'ALL') return true
    return f.classification === filter
  })

  const getClassificationBadge = (c: FeatureClassification) => {
    switch (c) {
      case 'ESSENTIAL':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'RECOMMENDED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'OPTIONAL':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'UNNECESSARY':
        return 'bg-rose-100 text-rose-800 border-rose-200'
    }
  }

  const getFeasibilityBadge = (rating: string) => {
    switch (rating) {
      case 'FEASIBLE_INITIAL':
        return { label: 'Feasible for Initial Mini-Project', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' }
      case 'FEASIBLE_REDUCED_SCOPE':
        return { label: 'Feasible with Reduced Scope', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' }
      case 'REQUIRES_RESOURCES_OR_TIME':
        return { label: 'Requires Additional Resources / Time', color: 'bg-amber-50 text-amber-700 border-amber-300' }
      default:
        return { label: 'Not Currently Feasible', color: 'bg-rose-50 text-rose-700 border-rose-300' }
    }
  }

  const feasibilityInfo = getFeasibilityBadge(evaluation.overallFeasibility.rating)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden my-4">
      {/* Top Header: Overall Feasibility Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">7-Dimensional Feature Evaluation</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-purple-200 font-mono">
                  v{evaluation.version}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target Project: <span className="font-semibold text-white">{evaluation.projectTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAssessmentModal}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Edit project constraints (team, timeline, experience)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reassess Constraints</span>
            </button>
            <button
              onClick={onOpenScopeModal}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Final Scope Generator</span>
            </button>
          </div>
        </div>

        {/* Overall Feasibility Rating Callout */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Overall Feasibility:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${feasibilityInfo.color}`}>
              {feasibilityInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span>Team: <strong>{evaluation.constraints.teamSize} Students</strong></span>
            <span>Experience: <strong>{evaluation.constraints.technicalExperience}</strong></span>
            <span>Deadline: <strong>{evaluation.constraints.developmentWeeks} Weeks</strong></span>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-2 bg-white/5 p-3 rounded-xl border border-white/10">
          <strong>Recommended Scope:</strong> {evaluation.overallFeasibility.recommendedReleaseScope}
        </p>
      </div>

      {/* Trade-off Notification Toast (if student recently rejected a feature) */}
      {activeTradeoffNote && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Student Decision Logged ({activeTradeoffNote.featureName}):</strong>{' '}
              <span>{activeTradeoffNote.note}</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTradeoffNote(null)}
            className="text-amber-700 hover:text-amber-950 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500 font-medium mr-2">Filter Category:</span>
        {(['ALL', 'ESSENTIAL', 'RECOMMENDED', 'OPTIONAL', 'UNNECESSARY'] as const).map((tab) => {
          const count =
            tab === 'ALL'
              ? evaluation.features.length
              : evaluation.features.filter((f) => f.classification === tab).length
          const isActive = filter === tab
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#6658FF] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All Features' : tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Feature Cards List */}
      <div className="p-5 space-y-4">
        {filteredFeatures.map((feature) => {
          const decision = getDecision(feature.featureId)
          const isExpanded = !!expandedFeatures[feature.featureId]
          const isModifying = modifyingFeatureId === feature.featureId

          return (
            <div
              key={feature.featureId}
              className={`rounded-xl border transition-all ${
                decision?.decision === 'REJECTED'
                  ? 'border-slate-200 bg-slate-50/70 opacity-75'
                  : decision?.decision === 'ACCEPTED'
                  ? 'border-emerald-200 bg-white shadow-xs'
                  : decision?.decision === 'MODIFIED'
                  ? 'border-indigo-200 bg-white shadow-xs'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">{feature.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getClassificationBadge(
                        feature.classification
                      )}`}
                    >
                      {feature.classification}
                    </span>

                    {/* Decision Badge */}
                    {decision?.decision === 'ACCEPTED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Accepted</span>
                      </span>
                    )}
                    {decision?.decision === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                        <XCircle className="w-3 h-3 text-slate-500" />
                        <span>Excluded from Scope</span>
                      </span>
                    )}
                    {decision?.decision === 'MODIFIED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Edit3 className="w-3 h-3 text-indigo-600" />
                        <span>Modified Scope</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {feature.dimensions.problemRelevance.rationale}
                  </p>

                  {/* Modified scope text preview */}
                  {decision?.decision === 'MODIFIED' && decision.modifiedScope && (
                    <div className="mt-2 text-xs text-indigo-900 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                      <strong>Adjusted Scope:</strong> {decision.modifiedScope}
                    </div>
                  )}

                  {/* Rejection trade-off explanation preview */}
                  {decision?.decision === 'REJECTED' && decision.tradeoffNotes && (
                    <div className="mt-2 text-xs text-slate-700 bg-slate-100 p-2 rounded-lg border border-slate-200">
                      <strong>Trade-off Note:</strong> {decision.tradeoffNotes}
                    </div>
                  )}
                </div>

                {/* Right: Decision Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAccept(feature.featureId)}
                    disabled={isBusy}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      decision?.decision === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                    title="Accept this feature into implementation scope"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>

                  <button
                    onClick={() => handleReject(feature)}
                    disabled={isBusy}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      decision?.decision === 'REJECTED'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                    title="Reject and exclude this feature from implementation scope"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleStartModify(feature)}
                    disabled={isBusy}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      decision?.decision === 'MODIFIED'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}
                    title="Modify feature scope to fit student constraints"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modify</span>
                  </button>

                  <button
                    onClick={() => toggleExpand(feature.featureId)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title={isExpanded ? 'Collapse 7-dimension audit' : 'Expand 7-dimension audit'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inline Scope Modification Form */}
              {isModifying && (
                <div className="bg-indigo-50/70 p-4 border-t border-indigo-100 flex flex-col gap-2">
                  <label className="text-xs font-bold text-indigo-950">
                    Adjust Scope for "{feature.name}":
                  </label>
                  <textarea
                    value={modifiedScopeText}
                    onChange={(e) => setModifiedScopeText(e.target.value)}
                    rows={2}
                    placeholder="Describe your simplified implementation or reduced scope..."
                    className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800"
                  />
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <button
                      onClick={() => setModifyingFeatureId(null)}
                      className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveModify(feature.featureId)}
                      disabled={isBusy}
                      className="px-3.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Save Adjusted Scope
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded 7-Dimension Evaluation Breakdown */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Dimension 1 & 2 */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#6658FF]" />
                        <span>1. Problem Relevance & 2. User Value</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mb-1">
                        <strong>Relevance:</strong> {feature.dimensions.problemRelevance.rationale}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        <strong>Value:</strong> {feature.dimensions.userValue.rationale} (Beneficiary: {feature.dimensions.userValue.primaryBeneficiary})
                      </p>
                    </div>

                    {/* Dimension 3 & 4 */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>3. Originality & 4. Technical Feasibility</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mb-1">
                        <strong>Originality:</strong> {feature.dimensions.originality.rationale}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        <strong>Feasibility:</strong> {feature.dimensions.technicalFeasibility.rationale}
                      </p>
                    </div>

                    {/* Dimension 5 & 6 */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>5. Complexity & 6. Resource Requirements</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mb-1">
                        <strong>Complexity:</strong> Level {feature.dimensions.complexity.level} — {feature.dimensions.complexity.rationale}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        <strong>Resources:</strong> {feature.dimensions.resourceRequirements.rationale}
                      </p>
                    </div>

                    {/* Dimension 7 */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>7. Time Suitability & Deadline</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mb-1">
                        <strong>Estimated Duration:</strong> ~{feature.dimensions.timeSuitability.estimatedWeeks} Weeks
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        <strong>Fits Deadline:</strong> {feature.dimensions.timeSuitability.fitsDeadline ? 'Yes' : 'No'} — {feature.dimensions.timeSuitability.rationale}
                      </p>
                    </div>
                  </div>

                  {/* Risks & Simpler Alternative */}
                  {feature.potentialRisks.length > 0 && (
                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-rose-900">
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Identified Risks:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {feature.potentialRisks.map((risk, rIdx) => (
                          <li key={rIdx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feature.simplerAlternative && (
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-950">
                      <strong>Recommended Simpler Alternative:</strong> {feature.simplerAlternative}
                    </div>
                  )}

                  <div className="text-slate-600 text-[11px]">
                    <strong>Faculty Recommendation:</strong> {feature.recommendation}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Call to Action */}
      <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-600">
          Decisions: <strong>{evaluation.decisions.filter((d) => d.decision === 'ACCEPTED').length} Accepted</strong> •{' '}
          <strong>{evaluation.decisions.filter((d) => d.decision === 'REJECTED').length} Excluded</strong> •{' '}
          <strong>{evaluation.decisions.filter((d) => d.decision === 'MODIFIED').length} Modified</strong>
        </p>

        <button
          onClick={onOpenScopeModal}
          disabled={isBusy}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <FileCheck className="w-4 h-4" />
          <span>Compile & Finalize Project Scope</span>
        </button>
      </div>
    </div>
  )
}
