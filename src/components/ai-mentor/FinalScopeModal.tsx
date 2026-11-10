import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  FileCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  Code2,
  Layers,
  Edit2,
  Save,
  Sparkles,
  ArrowRight,
  History,
  GitCompare,
  Lock,
  Unlock,
  ShieldCheck,
  RotateCcw,
  PlusCircle,
  BookOpen,
} from 'lucide-react'
import type {
  FinalScope,
  EvaluationRecord,
  ScopeVersion,
} from '../../services/aiEvaluationApiService'
import { aiEvaluationApiService } from '../../services/aiEvaluationApiService'
import { aiProposalApiService, type TemplateMetadata } from '../../services/aiProposalApiService'

interface FinalScopeModalProps {
  isOpen: boolean
  onClose: () => void
  scope: FinalScope | undefined
  evaluationId?: string
  evaluation?: EvaluationRecord | null
  onSaveScope: (updated: Partial<FinalScope>) => Promise<void>
  onScopeUpdated?: (updatedRecord: EvaluationRecord) => void
}

export const FinalScopeModal: React.FC<FinalScopeModalProps> = ({
  isOpen,
  onClose,
  scope: initialScope,
  evaluationId,
  evaluation,
  onSaveScope,
  onScopeUpdated,
}) => {
  const navigate = useNavigate()

  // Active scope viewing (either current or historical version)
  const [activeScope, setActiveScope] = useState<FinalScope | undefined>(initialScope)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(initialScope?.title || '')
  const [editedProblem, setEditedProblem] = useState(initialScope?.problemStatement || '')
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)

  // Scope Versions State
  const [versions, setVersions] = useState<ScopeVersion[]>(evaluation?.scopeVersions || [])
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(evaluation?.version || 1)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [showNewVersionModal, setShowNewVersionModal] = useState(false)
  const [newVersionSummary, setNewVersionSummary] = useState('')
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [templates, setTemplates] = useState<TemplateMetadata[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('vtu-cse-capstone-mini-v1')

  // Comparison State
  const [compareVerA, setCompareVerA] = useState<number>(1)
  const [compareVerB, setCompareVerB] = useState<number>(evaluation?.version || 1)
  const [comparisonResult, setComparisonResult] = useState<any>(null)
  const [isComparing, setIsComparing] = useState(false)

  // Sync state when evaluation/initialScope updates
  useEffect(() => {
    if (initialScope) {
      setActiveScope(initialScope)
      setEditedTitle(initialScope.title)
      setEditedProblem(initialScope.problemStatement)
    }
    if (evaluation?.scopeVersions) {
      setVersions(evaluation.scopeVersions)
    }
  }, [initialScope, evaluation])

  // Load versions & college templates
  useEffect(() => {
    if (isOpen) {
      aiProposalApiService
        .listTemplates()
        .then((tpls) => {
          if (tpls.length > 0) {
            setTemplates(tpls)
          }
        })
        .catch(() => {})
    }
    if (evaluationId && isOpen) {
      aiEvaluationApiService
        .listScopeVersions(evaluationId)
        .then((res) => {
          const list = res?.versions || []
          if (list.length > 0) {
            setVersions(list)
            const latest = list[list.length - 1]
            if (latest) {
              setSelectedVersionNum(latest.version)
              setCompareVerB(latest.version)
              if (list.length > 1) {
                setCompareVerA(list[list.length - 2].version)
              }
            }
          }
        })
        .catch(() => {
          // Keep existing versions
        })
    }
  }, [evaluationId, isOpen])

  if (!isOpen || !initialScope || !activeScope) return null

  const isFinalized = evaluation?.isFinalized || false

  const handleGenerateProposal = async () => {
    setIsGeneratingProposal(true)
    try {
      const chosenTpl = templates.find((t) => t.templateId === selectedTemplateId)
      const prop = await aiProposalApiService.generateProposal({
        projectTitle: activeScope.title,
        documentType: chosenTpl?.documentType || 'MINI_PROJECT_PROPOSAL',
        sourceEvaluationId: evaluationId,
        templateId: selectedTemplateId,
      })
      onClose()
      navigate(`/ai-mentor/proposals/${prop.id}`)
    } catch (err: any) {
      alert('Failed to generate academic proposal: ' + err.message)
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  const handleCopyMarkdown = () => {
    const md = `# ${activeScope.title}

## Problem Statement
${activeScope.problemStatement}

## Core Objectives
${activeScope.coreObjectives.map((o) => `- ${o}`).join('\n')}

## Essential Scope (Phase 1 Deliverables)
${activeScope.essentialFeatures.map((f) => `- [x] ${f}`).join('\n')}

## Accepted Recommended Features
${activeScope.acceptedRecommendedFeatures.map((f) => `- [x] ${f}`).join('\n')}

## Accepted Optional Features
${activeScope.acceptedOptionalFeatures.map((f) => `- [x] ${f}`).join('\n')}

## Excluded Features (Decision History)
${activeScope.excludedFeatures.map((e) => `- [ ] ${e.featureName} — Rationale: ${e.reason}`).join('\n')}

## Implementation Milestones
${activeScope.implementationMilestones
  .map(
    (m) => `### ${m.milestone} (~${m.durationWeeks} Weeks)\n${m.deliverables.map((d) => `- ${d}`).join('\n')}`
  )
  .join('\n\n')}

## Technology Stack & Dependencies
${activeScope.technologyStack.join(', ')}

## Known Risks & Explicit Assumptions
${activeScope.knownRisks.map((r) => `- Risk: ${r}`).join('\n')}
${activeScope.explicitAssumptions.map((a) => `- Assumption: ${a}`).join('\n')}
`
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveScope({
        title: editedTitle,
        problemStatement: editedProblem,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmFinalize = async () => {
    if (!evaluationId) return
    setIsFinalizing(true)
    try {
      const updated = await aiEvaluationApiService.finalizeScope(evaluationId)
      if (onScopeUpdated) onScopeUpdated(updated)
      setShowFinalizeConfirm(false)
    } catch (err: any) {
      alert('Failed to finalize scope: ' + err.message)
    } finally {
      setIsFinalizing(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!evaluationId || !newVersionSummary.trim()) return
    setIsCreatingVersion(true)
    try {
      const updated = await aiEvaluationApiService.createScopeVersion(
        evaluationId,
        newVersionSummary.trim()
      )
      if (onScopeUpdated) onScopeUpdated(updated)
      if (updated.scopeVersions) {
        setVersions(updated.scopeVersions)
        const latest = updated.scopeVersions[updated.scopeVersions.length - 1]
        setSelectedVersionNum(latest.version)
      }
      setShowNewVersionModal(false)
      setNewVersionSummary('')
    } catch (err: any) {
      alert('Failed to create scope version: ' + err.message)
    } finally {
      setIsCreatingVersion(false)
    }
  }

  const handleRestoreVersion = async (versionNum: number) => {
    if (!evaluationId) return
    if (!confirm(`Restore Scope to Version ${versionNum}? Current scope will be safely archived as a version.`)) {
      return
    }
    setIsRestoring(true)
    try {
      const updated = await aiEvaluationApiService.restoreScopeVersion(evaluationId, versionNum)
      if (onScopeUpdated) onScopeUpdated(updated)
      if (updated.finalScope) setActiveScope(updated.finalScope)
      if (updated.scopeVersions) setVersions(updated.scopeVersions)
      setSelectedVersionNum(versionNum)
      setShowVersionHistory(false)
    } catch (err: any) {
      alert('Failed to restore version: ' + err.message)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleRunComparison = async () => {
    if (!evaluationId) return
    setIsComparing(true)
    try {
      const result = await aiEvaluationApiService.compareScopeVersions(
        evaluationId,
        compareVerA,
        compareVerB
      )
      setComparisonResult(result)
    } catch (err: any) {
      alert('Failed to compare versions: ' + err.message)
    } finally {
      setIsComparing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Project Implementation Scope</h3>
                {isFinalized ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <Lock className="w-2.5 h-2.5" />
                    FINALIZED (Confirmed)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Unlock className="w-2.5 h-2.5" />
                    PROPOSED (Draft)
                  </span>
                )}
                {versions.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                    v{selectedVersionNum} of {versions.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Synthesized from 7-dimensional evaluation and student decisions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Version History Button */}
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="View Scope Versions and Change History"
            >
              <History className="w-3.5 h-3.5" />
              <span>Versions ({versions.length || 1})</span>
            </button>

            {/* Compare Button */}
            {versions.length > 1 && (
              <button
                onClick={() => {
                  setShowCompareModal(true)
                  handleRunComparison()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Compare Scope Versions"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare</span>
              </button>
            )}

            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {!isFinalized && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Scope'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Version History Drawer / Banner */}
        {showVersionHistory && (
          <div className="bg-slate-800 text-white px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span className="font-bold">Scope Version Audit:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {versions.map((v) => (
                  <button
                    key={v.version}
                    onClick={() => {
                      setSelectedVersionNum(v.version)
                      setActiveScope(v.scope)
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      selectedVersionNum === v.version
                        ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-400'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    v{v.version} {v.isFinalized ? '🔒' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedVersionNum !== evaluation?.version && (
                <button
                  onClick={() => handleRestoreVersion(selectedVersionNum)}
                  disabled={isRestoring}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isRestoring ? 'Restoring...' : `Restore v${selectedVersionNum}`}</span>
                </button>
              )}
              <button
                onClick={() => setShowNewVersionModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6658FF] hover:bg-[#5546FF] text-white font-semibold cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" />
                <span>New Revision Snapshot</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 text-xs sm:text-sm">
          {/* Finalized Scope Alert if Locked */}
          {isFinalized && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs">Official Scope Confirmed & Locked</h4>
                  <p className="text-[11px] text-emerald-800">
                    Confirmed by student on {evaluation?.finalizedAt ? new Date(evaluation.finalizedAt).toLocaleDateString() : 'Active Session'}. This scope serves as the baseline for faculty review and evaluation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewVersionModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shrink-0"
              >
                Create Revision
              </button>
            </div>
          )}

          {/* Repository Intelligence & Novelty Analysis (if present) */}
          {evaluation?.repositoryComparison && evaluation.repositoryComparison.matches?.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>College Repository Benchmark Analysis</span>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                We cross-referenced your project against {evaluation.repositoryComparison.totalEvaluated || 20}+ approved college repositories to verify novelty and help you differentiate your contributions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {evaluation.repositoryComparison.matches.slice(0, 2).map((m: any, idx: number) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-indigo-100 text-xs">
                    <span className="font-bold text-slate-900">{m.title}</span>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{m.summary}</p>
                    {m.analysis?.improvementOpportunities && (
                      <p className="text-[11px] text-indigo-700 font-semibold mt-1">
                        Opportunity: {m.analysis.improvementOpportunities[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-lg bg-white/80 border border-indigo-100 text-[11px] text-slate-700">
                <span className="font-bold text-indigo-900">Academic Integrity Note: </span>
                {evaluation.repositoryComparison.disclaimer ||
                  'Similarity is never treated as proof of plagiarism in CampusProjectHub. It highlights prior foundation and opportunities for novel extension.'}
              </div>
            </div>
          )}

          {/* Title & Problem Statement */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Project Title:</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-sm font-bold p-2.5 rounded-lg border border-purple-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Problem Statement:</label>
                  <textarea
                    value={editedProblem}
                    onChange={(e) => setEditedProblem(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2.5 rounded-lg border border-purple-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#6658FF] hover:bg-[#5546FF] text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4 className="text-base font-bold text-purple-950">{activeScope.title}</h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Problem Statement:</strong> {activeScope.problemStatement}
                </p>
              </>
            )}
          </div>

          {/* Core Objectives */}
          <div>
            <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 mb-2">
              <Layers className="w-4 h-4 text-[#6658FF]" />
              <span>Core Academic Objectives</span>
            </h5>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              {activeScope.coreObjectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>

          {/* Feature Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Essential Deliverables */}
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/30">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 mb-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Essential Capabilities ({activeScope.essentialFeatures.length})</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-700">
                {activeScope.essentialFeatures.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Accepted Recommended & Optional */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Accepted Enhancements (
                  {activeScope.acceptedRecommendedFeatures.length + activeScope.acceptedOptionalFeatures.length})
                </span>
              </div>
              <ul className="space-y-1 text-xs text-slate-700">
                {activeScope.acceptedRecommendedFeatures.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
                {activeScope.acceptedOptionalFeatures.map((f, idx) => (
                  <li key={`opt-${idx}`} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Excluded Features (Student-Controlled Decisions) */}
          {activeScope.excludedFeatures.length > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Excluded Features & Rationale ({activeScope.excludedFeatures.length})</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Preserved in decision history to justify why scope was narrowed during faculty reviews:
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {activeScope.excludedFeatures.map((ex, idx) => (
                  <li key={idx} className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900">{ex.featureName}:</span>{' '}
                    <span className="text-slate-600">{ex.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Implementation Milestones */}
          <div>
            <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 mb-2.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Implementation Roadmap & Milestones</span>
            </h5>
            <div className="space-y-2.5">
              {activeScope.implementationMilestones.map((m, mIdx) => (
                <div key={mIdx} className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs">{m.milestone}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                      ~{m.durationWeeks} Weeks
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-xs pl-1">
                    {m.deliverables.map((d, dIdx) => (
                      <li key={dIdx}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Risks & Explicit Assumptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Known Technical Risks</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {activeScope.knownRisks.map((r, rIdx) => (
                  <li key={rIdx}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <Code2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Explicit Project Assumptions</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {activeScope.explicitAssumptions.map((a, aIdx) => (
                  <li key={aIdx}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Scope Status:{' '}
              {isFinalized ? (
                <strong className="text-emerald-600">Finalized & Locked</strong>
              ) : (
                <strong className="text-amber-600">Draft (Requires Confirmation)</strong>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {templates.length > 0 && (
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium max-w-[230px]"
                title="Select Assigned College Proposal Template"
              >
                {templates.map((tpl) => (
                  <option key={tpl.templateId} value={tpl.templateId}>
                    {tpl.templateName} (v{tpl.templateVersion || '1.0.0'})
                  </option>
                ))}
              </select>
            )}
            {!isFinalized && (
              <button
                onClick={() => setShowFinalizeConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Finalize Scope</span>
              </button>
            )}

            <button
              onClick={handleGenerateProposal}
              disabled={isGeneratingProposal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingProposal ? 'Generating...' : 'Generate Academic Proposal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Finalize Confirmation Modal */}
        {showFinalizeConfirm && (
          <div className="absolute inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Confirm Scope Finalization</h4>
                  <p className="text-xs text-slate-500">Explicit Student Agreement</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                By finalizing this scope, you confirm that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>Essential deliverables ({activeScope.essentialFeatures.length}) are approved for Phase 1.</li>
                <li>Excluded features ({activeScope.excludedFeatures.length}) are acknowledged and justified.</li>
                <li>This scope serves as the binding baseline for faculty evaluation.</li>
              </ul>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFinalize}
                  disabled={isFinalizing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isFinalizing ? 'Finalizing...' : 'Yes, Finalize Official Scope'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Version Snapshot Modal */}
        {showNewVersionModal && (
          <div className="absolute inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-purple-100 text-purple-600">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Create Scope Version Snapshot</h4>
                  <p className="text-xs text-slate-500">Immutable revision for change tracking</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change Summary / Justification:
                </label>
                <textarea
                  value={newVersionSummary}
                  onChange={(e) => setNewVersionSummary(e.target.value)}
                  placeholder="e.g., Narrowed scope following Faculty review to defer face recognition"
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVersion}
                  disabled={isCreatingVersion || !newVersionSummary.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white disabled:opacity-50"
                >
                  {isCreatingVersion ? 'Creating...' : 'Create Snapshot'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Versions Modal */}
        {showCompareModal && (
          <div className="absolute inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <GitCompare className="w-5 h-5 text-purple-600" />
                  <h4 className="font-bold text-slate-900 text-base">Compare Scope Versions</h4>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Version A:</label>
                  <select
                    value={compareVerA}
                    onChange={(e) => setCompareVerA(Number(e.target.value))}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {versions.map((v) => (
                      <option key={v.version} value={v.version}>
                        Version {v.version}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="font-bold text-slate-400 mt-4">vs</span>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Version B:</label>
                  <select
                    value={compareVerB}
                    onChange={(e) => setCompareVerB(Number(e.target.value))}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {versions.map((v) => (
                      <option key={v.version} value={v.version}>
                        Version {v.version}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRunComparison}
                  disabled={isComparing}
                  className="mt-4 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs"
                >
                  {isComparing ? 'Comparing...' : 'Run Diff'}
                </button>
              </div>

              {comparisonResult && (
                <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <span className="font-bold text-purple-950">Feasibility Rating Transition:</span>{' '}
                    <span className="text-slate-700">
                      {comparisonResult.feasibilityDiff.from} → {comparisonResult.feasibilityDiff.to}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="font-bold text-emerald-900 block mb-1">
                        + Added Essential Features ({comparisonResult.addedEssentialFeatures.length}):
                      </span>
                      {comparisonResult.addedEssentialFeatures.length > 0 ? (
                        <ul className="list-disc list-inside text-emerald-800">
                          {comparisonResult.addedEssentialFeatures.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                      <span className="font-bold text-rose-900 block mb-1">
                        - Removed Essential Features ({comparisonResult.removedEssentialFeatures.length}):
                      </span>
                      {comparisonResult.removedEssentialFeatures.length > 0 ? (
                        <ul className="list-disc list-inside text-rose-800">
                          {comparisonResult.removedEssentialFeatures.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">
                      Excluded Features Difference:
                    </span>
                    <p className="text-slate-600">
                      Added exclusions: {comparisonResult.excludedFeaturesDiff.added.join(', ') || 'None'} |{' '}
                      Removed exclusions: {comparisonResult.excludedFeaturesDiff.removed.join(', ') || 'None'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
