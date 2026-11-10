import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Download,
  Send,
  Eye,
  Edit3,
  ChevronLeft,
  Save,
  RotateCcw,
  Check,
  X,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Clock,
  Code2,
  PlusCircle,
  GitCompare,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { aiProposalApiService } from '../services/aiProposalApiService'
import type {
  ProposalRecord,
  SectionImprovementResponse,
  VersionComparisonResult,
  TemplateMetadata,
} from '../services/aiProposalApiService'

const countWords = (text: string): number => {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export const ProposalEditorPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>()
  const navigate = useNavigate()

  const [proposal, setProposal] = useState<ProposalRecord | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string>('abstract')
  const [activeTab, setActiveTab] = useState<'readiness' | 'versions' | 'faculty'>('readiness')
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false)

  // Editor State
  const [currentContent, setCurrentContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // AI Section Refinement State
  const [isImproving, setIsImproving] = useState<boolean>(false)
  const [improvementPreview, setImprovementPreview] = useState<SectionImprovementResponse | null>(null)

  // Versioning Modal / Input State
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false)
  const [versionSummary, setVersionSummary] = useState<string>('')

  // Faculty Submission Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false)
  const [facultyGuideName, setFacultyGuideName] = useState<string>('Dr. H. M. Chandrashekar')
  const [submissionComments, setSubmissionComments] = useState<string>(
    'Final academic proposal ready for departmental synopsis evaluation.'
  )

  // Custom Section Modal State
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState<boolean>(false)
  const [customSectionTitle, setCustomSectionTitle] = useState<string>('')
  const [customSectionContent, setCustomSectionContent] = useState<string>('')

  // Version Comparison Modal State
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false)
  const [compareVerA, setCompareVerA] = useState<number>(1)
  const [compareVerB, setCompareVerB] = useState<number>(1)
  const [compareResult, setCompareResult] = useState<VersionComparisonResult | null>(null)
  const [isComparing, setIsComparing] = useState<boolean>(false)
  const [templates, setTemplates] = useState<TemplateMetadata[]>([])
  const [isExporting, setIsExporting] = useState<'docx' | 'pdf' | null>(null)

  // Load available college templates
  useEffect(() => {
    aiProposalApiService
      .listTemplates()
      .then((tpls) => setTemplates(tpls))
      .catch(() => {})
  }, [])

  const handleExport = async (format: 'docx' | 'pdf') => {
    if (!proposal || isExporting) return
    setIsExporting(format)
    try {
      await aiProposalApiService.downloadExport(proposal.id, format, proposal.projectTitle)
    } catch (err: any) {
      alert(`Failed to export ${format.toUpperCase()}: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsExporting(null)
    }
  }

  const handleTemplateChange = async (templateId: string) => {
    if (!proposal || !templateId) return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.updateTemplate(proposal.id, templateId)
      setProposal(updated)
    } catch (err: any) {
      alert('Failed to switch template: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  // Load Proposal
  const loadProposal = useCallback(async () => {
    if (!proposalId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await aiProposalApiService.getProposal(proposalId)
      setProposal(data)
      const sec = data.sections.find((s) => s.sectionId === selectedSectionId) || data.sections[0]
      if (sec) {
        setSelectedSectionId(sec.sectionId)
        setCurrentContent(sec.content)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load proposal')
    } finally {
      setIsLoading(false)
    }
  }, [proposalId, selectedSectionId])

  useEffect(() => {
    loadProposal()
  }, [proposalId])

  // Change selected section
  const handleSelectSection = (secId: string) => {
    if (!proposal) return
    // If unsaved changes in current section, auto-save first
    if (saveStatus === 'unsaved') {
      handleSaveContent(selectedSectionId, currentContent)
    }
    const target = proposal.sections.find((s) => s.sectionId === secId)
    if (target) {
      setSelectedSectionId(secId)
      setCurrentContent(target.content)
      setImprovementPreview(null)
      setSaveStatus('saved')
    }
  }

  // Handle content typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentContent(e.target.value)
    setSaveStatus('unsaved')
  }

  // Save section content
  const handleSaveContent = async (secId: string, contentToSave: string) => {
    if (!proposal) return
    setIsSaving(true)
    setSaveStatus('saving')
    try {
      const updated = await aiProposalApiService.updateSection(proposal.id, secId, contentToSave)
      setProposal(updated)
      setSaveStatus('saved')
    } catch (err: any) {
      alert('Failed to save section: ' + err.message)
      setSaveStatus('unsaved')
    } finally {
      setIsSaving(false)
    }
  }

  // Run AI improvement
  const handleImproveAction = async (
    action:
      | 'improve-clarity'
      | 'correct-grammar'
      | 'clarify-technical'
      | 'shorten'
      | 'expand'
      | 'check-consistency'
  ) => {
    if (!proposal) return
    setIsImproving(true)
    try {
      const result = await aiProposalApiService.improveSection(proposal.id, selectedSectionId, action)
      setImprovementPreview(result)
    } catch (err: any) {
      alert('AI improvement failed: ' + err.message)
    } finally {
      setIsImproving(false)
    }
  }

  // Apply AI Improvement
  const handleAcceptImprovement = async () => {
    if (!improvementPreview || !proposal) return
    setCurrentContent(improvementPreview.proposedContent)
    await handleSaveContent(selectedSectionId, improvementPreview.proposedContent)
    setImprovementPreview(null)
  }

  // Reject AI Improvement
  const handleRejectImprovement = () => {
    setImprovementPreview(null)
  }

  // Save new version snapshot
  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposal || !versionSummary.trim()) return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.createVersion(proposal.id, versionSummary.trim())
      setProposal(updated)
      setIsVersionModalOpen(false)
      setVersionSummary('')
      alert(`Version v${updated.activeVersionNumber} created successfully!`)
    } catch (err: any) {
      alert('Failed to save version: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Restore previous version
  const handleRestoreVersion = async (versionNumber: number) => {
    if (!proposal) return
    if (
      !confirm(
        `Are you sure you want to restore version v${versionNumber}? It will be created as a new revision without destroying past versions.`
      )
    )
      return

    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.restoreVersion(proposal.id, versionNumber)
      setProposal(updated)
      const sec = updated.sections.find((s) => s.sectionId === selectedSectionId) || updated.sections[0]
      if (sec) {
        setCurrentContent(sec.content)
      }
      alert(`Restored from v${versionNumber} as new revision v${updated.activeVersionNumber}!`)
    } catch (err: any) {
      alert('Failed to restore version: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Submit to Faculty
  const handleSubmitToFaculty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposal) return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.submitFaculty(
        proposal.id,
        facultyGuideName,
        submissionComments
      )
      setProposal(updated)
      setIsSubmitModalOpen(false)
      alert('Academic proposal successfully submitted for faculty review!')
    } catch (err: any) {
      alert('Submission failed: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Regenerate Section from Scope
  const handleRegenerateSection = async () => {
    if (!proposal) return
    if (
      !confirm(
        `Regenerate section "${currentSection?.title}" from project scope? Any manual edits in this specific section will be replaced, but all other sections will remain preserved.`
      )
    )
      return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.regenerateSection(proposal.id, selectedSectionId)
      setProposal(updated)
      const fresh = updated.sections.find((s) => s.sectionId === selectedSectionId)
      if (fresh) setCurrentContent(fresh.content)
      alert(`Section "${fresh?.title}" regenerated successfully from scope!`)
    } catch (err: any) {
      alert('Regeneration failed: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Add Custom Section
  const handleAddCustomSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposal || !customSectionTitle.trim()) return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.addCustomSection(proposal.id, {
        title: customSectionTitle.trim(),
        content: customSectionContent.trim(),
        isMandatory: false,
      })
      setProposal(updated)
      setIsAddSectionModalOpen(false)
      setCustomSectionTitle('')
      setCustomSectionContent('')
      alert(`Custom section "${customSectionTitle.trim()}" added successfully!`)
    } catch (err: any) {
      alert('Failed to add custom section: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Section
  const handleDeleteSection = async (secId: string) => {
    if (!proposal) return
    if (!confirm(`Are you sure you want to remove section "${currentSection?.title}"?`)) return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.deleteSection(proposal.id, secId)
      setProposal(updated)
      if (updated.sections.length > 0) {
        setSelectedSectionId(updated.sections[0].sectionId)
        setCurrentContent(updated.sections[0].content)
      }
      alert('Section removed successfully!')
    } catch (err: any) {
      alert('Failed to delete section: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Run Version Comparison
  const handleRunCompare = async () => {
    if (!proposal) return
    setIsComparing(true)
    try {
      const result = await aiProposalApiService.compareVersions(
        proposal.id,
        compareVerA,
        compareVerB
      )
      setCompareResult(result)
    } catch (err: any) {
      alert('Failed to compare versions: ' + err.message)
    } finally {
      setIsComparing(false)
    }
  }

  // Resubmit to Faculty
  const handleResubmitFaculty = async () => {
    if (!proposal) return
    setIsSaving(true)
    try {
      const updated = await aiProposalApiService.resubmitFaculty(
        proposal.id,
        'Resubmitted proposal following faculty feedback and requested revisions.'
      )
      setProposal(updated)
      alert('Proposal successfully resubmitted for faculty review!')
    } catch (err: any) {
      alert('Resubmission failed: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const currentSection = proposal?.sections.find((s) => s.sectionId === selectedSectionId)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#6658FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">Loading Academic Proposal Workspace...</p>
        </div>
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center text-white">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">Proposal Not Found</h3>
          <p className="text-sm text-slate-400 mb-5">{error || 'Could not locate proposal record.'}</p>
          <button
            onClick={() => navigate('/ai-mentor')}
            className="px-4 py-2 rounded-xl bg-[#6658FF] text-white text-sm font-semibold hover:bg-[#5546FF] cursor-pointer"
          >
            Back to AI Project Mentor
          </button>
        </div>
      </div>
    )
  }

  const readiness = proposal.readiness

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden selection:bg-[#6658FF]/30 selection:text-purple-200">
      {/* 1. TOP HEADER */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
        {/* Left: Breadcrumb & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ai-mentor')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Return to AI Project Mentor Workspace"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">AI Mentor</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {proposal.projectTitle}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                v{proposal.activeVersionNumber}
              </span>
              <span className="hidden md:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {proposal.documentType.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-md">
              {proposal.template.college} • {proposal.template.department}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Save Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400">
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">All Changes Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-purple-300 font-medium">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium">Unsaved</span>
              </>
            )}
          </div>

          {/* Preview / Edit Toggle */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isPreviewMode
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {isPreviewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPreviewMode ? 'Editor' : 'Preview'}</span>
          </button>

          {/* Export Buttons (authenticated fetch + blob download) */}
          <button
            type="button"
            onClick={() => handleExport('docx')}
            disabled={isExporting !== null}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Download formatted DOCX proposal"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExporting === 'docx' ? 'Exporting...' : 'DOCX'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Download formatted PDF proposal"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExporting === 'pdf' ? 'Exporting...' : 'PDF'}</span>
          </button>

          {/* Submit to Faculty */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            disabled={proposal.submission.status === 'SUBMITTED' || proposal.submission.status === 'APPROVED'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              proposal.submission.status === 'SUBMITTED' || proposal.submission.status === 'APPROVED'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-[#6658FF] hover:bg-[#5546FF] text-white shadow-sm cursor-pointer'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {proposal.submission.status === 'SUBMITTED'
                ? 'Submitted to Faculty'
                : proposal.submission.status === 'APPROVED'
                ? 'Faculty Approved'
                : 'Submit Proposal'}
            </span>
          </button>
        </div>
      </header>

      {/* Scope Status Banner */}
      {!proposal.isScopeFinalized && (
        <div className="bg-amber-950/50 border-b border-amber-500/30 px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Preliminary Unfinalized Scope:</strong> This proposal was drafted from an unfinalized scope. Finalize the scope in the AI Mentor before requesting formal faculty sign-off.
            </span>
          </div>
          <button
            onClick={() => navigate('/ai-mentor')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/40 text-[11px] cursor-pointer"
          >
            Review Scope
          </button>
        </div>
      )}

      {/* 2. PREVIEW MODE VIEW */}
      {isPreviewMode ? (
        <div className="flex-1 overflow-y-auto bg-slate-900 p-6 sm:p-10">
          <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-14 border border-slate-200">
            {/* College Header */}
            <div className="text-center pb-6 border-b border-slate-200 mb-8">
              <h2 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                {proposal.template.college}
              </h2>
              <h3 className="text-sm font-semibold text-slate-700 mt-1">
                {proposal.template.department}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Academic Year: {proposal.template.academicYear} | {proposal.template.semester}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-4 leading-tight">
                {proposal.projectTitle}
              </h1>
              <p className="text-xs font-semibold text-purple-700 mt-2">
                Document Type: {proposal.documentType.replace(/_/g, ' ')} (Version v
                {proposal.activeVersionNumber})
              </p>
            </div>

            {/* Document Sections */}
            <div className="space-y-8 text-sm leading-relaxed text-slate-800">
              {proposal.sections.map((sec) => (
                <div key={sec.sectionId} className="space-y-2">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1">
                    <span>
                      {sec.order}. {sec.title}
                    </span>
                    {sec.isManuallyEdited && (
                      <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Manually Edited
                      </span>
                    )}
                  </h4>
                  <div className="whitespace-pre-line text-slate-700 text-sm">
                    {sec.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 3. THREE-PANEL EDITOR WORKSPACE */
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Section Navigation */}
          <aside className="w-64 sm:w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">Proposal Sections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsAddSectionModalOpen(true)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Add custom section"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Add</span>
                </button>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {proposal.sections.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {proposal.sections.map((sec) => {
                const isSelected = sec.sectionId === selectedSectionId
                const isComplete = sec.wordCount > 30

                return (
                  <button
                    key={sec.sectionId}
                    onClick={() => handleSelectSection(sec.sectionId)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#6658FF] text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-[11px] font-mono shrink-0 ${
                          isSelected ? 'text-purple-200' : 'text-slate-500'
                        }`}
                      >
                        {sec.order}.
                      </span>
                      <span className="text-xs font-semibold truncate">{sec.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {sec.isManuallyEdited && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-indigo-400'
                          }`}
                          title="Contains student manual edits"
                        />
                      )}
                      {isComplete ? (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-white' : 'text-emerald-400'
                          }`}
                        />
                      ) : (
                        <AlertTriangle
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-amber-200' : 'text-amber-400'
                          }`}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Template Info Card */}
            <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-300 truncate">
                  {proposal.template.templateName}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 shrink-0">
                  v{proposal.template.templateVersion || '1.0.0'}
                </span>
              </div>
              <div className="truncate text-slate-500">
                {proposal.template.templateId} • {proposal.template.college}
              </div>
              {templates.length > 0 && proposal.submission.status === 'DRAFT' && (
                <select
                  value={proposal.template.templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  disabled={isSaving}
                  className="w-full mt-1 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 cursor-pointer"
                  title="Switch Assigned College Template"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.templateId} value={tpl.templateId}>
                      {tpl.templateName} (v{tpl.templateVersion || '1.0.0'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </aside>

          {/* MAIN EDITOR: Active Section Canvas */}
          <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {currentSection && (
              <>
                {/* Section Header & Toolbar */}
                <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-purple-400 font-mono">
                      {currentSection.order}.
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-white">{currentSection.title}</h2>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{countWords(currentContent)} Words</span>
                        <span>•</span>
                        <span>
                          {currentSection.isManuallyEdited ? (
                            <span className="text-indigo-400">Edited by Student</span>
                          ) : (
                            <span className="text-slate-400">AI Generated</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Quick Actions Toolbar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleImproveAction('improve-clarity')}
                      disabled={isImproving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Improve academic clarity, vocabulary and passive voice tone"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Clarity</span>
                    </button>

                    <button
                      onClick={() => handleImproveAction('correct-grammar')}
                      disabled={isImproving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Correct grammatical phrasing and punctuation"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Grammar</span>
                    </button>

                    <button
                      onClick={() => handleImproveAction('clarify-technical')}
                      disabled={isImproving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Strengthen technical architecture and specifications"
                    >
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Technical Rigor</span>
                    </button>

                    <button
                      onClick={() => handleImproveAction('shorten')}
                      disabled={isImproving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Shorten and condense verbose sentences"
                    >
                      <span className="text-xs">Shorten</span>
                    </button>

                    <button
                      onClick={() => handleImproveAction('expand')}
                      disabled={isImproving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Expand with academic IEEE 830 phrasing"
                    >
                      <span className="text-xs">Expand</span>
                    </button>

                    <button
                      onClick={handleRegenerateSection}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Regenerate this single section from scope without touching other sections"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>

                    {!currentSection.isMandatory && (
                      <button
                        onClick={() => handleDeleteSection(currentSection.sectionId)}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors cursor-pointer"
                        title="Remove optional section"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSaveContent(selectedSectionId, currentContent)}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6658FF] hover:bg-[#5546FF] text-white text-xs font-bold transition-all cursor-pointer shadow-xs ml-2"
                      title="Save section changes"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Improvement Diff Preview Card */}
                {improvementPreview && (
                  <div className="m-4 p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-100 flex flex-col gap-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-xs sm:text-sm text-purple-200">
                          Proposed AI Academic Revision
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-800/40 text-purple-300">
                          {improvementPreview.wordCountDelta >= 0 ? '+' : ''}
                          {improvementPreview.wordCountDelta} Words
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAcceptImprovement}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Revision</span>
                        </button>
                        <button
                          onClick={handleRejectImprovement}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Discard</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-purple-300 italic">
                      Rationale: {improvementPreview.revisionRationale}
                    </p>

                    <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/20 text-xs text-slate-200 whitespace-pre-line max-h-48 overflow-y-auto font-mono">
                      {improvementPreview.proposedContent}
                    </div>

                    {improvementPreview.consistencyWarnings &&
                      improvementPreview.consistencyWarnings.length > 0 && (
                        <div className="space-y-1">
                          {improvementPreview.consistencyWarnings.map((warn, i) => (
                            <div
                              key={i}
                              className="text-[11px] text-amber-300 flex items-center gap-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{warn}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* Main Textarea Canvas */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                  <textarea
                    value={currentContent}
                    onChange={handleContentChange}
                    placeholder="Enter academic section content here..."
                    className="flex-1 w-full bg-slate-900/90 text-slate-100 p-5 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6658FF]/50 text-sm sm:text-base leading-relaxed resize-none font-sans font-normal"
                  />
                </div>
              </>
            )}
          </main>

          {/* RIGHT PANEL: AI Copilot, Readiness & Version History */}
          <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('readiness')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'readiness'
                    ? 'border-[#6658FF] text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Readiness</span>
              </button>

              <button
                onClick={() => setActiveTab('versions')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'versions'
                    ? 'border-[#6658FF] text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Versions ({proposal.versions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('faculty')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'faculty'
                    ? 'border-[#6658FF] text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Review</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: READINESS ASSESSMENT */}
              {activeTab === 'readiness' && readiness && (
                <div className="space-y-4">
                  {/* Overall Rating Banner */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                      readiness.overallRating === 'READY_FOR_FACULTY_REVIEW'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : readiness.overallRating === 'ALMOST_READY'
                        ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                        Advisory Assessment
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10">
                        {readiness.overallRating.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs">
                      {readiness.overallRating === 'READY_FOR_FACULTY_REVIEW'
                        ? 'Proposal meets standard IEEE 830 criteria and is defense-ready.'
                        : 'Proposal has minor gaps that should be addressed before committee review.'}
                    </p>
                  </div>

                  {/* 9 Criteria Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Academic Quality Checks (9 Criteria)
                    </h4>

                    {[
                      { title: 'Problem Clarity', check: readiness.problemClarity },
                      { title: 'Objective Alignment', check: readiness.objectiveAlignment },
                      { title: 'Scope Consistency', check: readiness.scopeConsistency },
                      { title: 'Feature Completeness', check: readiness.featureCompleteness },
                      { title: 'Technical Feasibility', check: readiness.technicalFeasibility },
                      { title: 'Architecture Consistency', check: readiness.architectureConsistency },
                      { title: 'Methodology Completeness', check: readiness.methodologyCompleteness },
                      { title: 'Reference Validity', check: readiness.referenceValidity },
                      { title: 'Required Sections', check: readiness.requiredSectionCompleteness },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2"
                      >
                        {item.check.status === 'PASS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : item.check.status === 'WARN' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-200">{item.title}</div>
                          <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            {item.check.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actionable Suggestions */}
                  {readiness.actionableSuggestions.length > 0 && (
                    <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1.5">
                      <h5 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Actionable Mentor Advice</span>
                      </h5>
                      <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                        {readiness.actionableSuggestions.map((sug, i) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VERSION HISTORY */}
              {activeTab === 'versions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Revision Chain</span>
                    <div className="flex items-center gap-1.5">
                      {proposal.versions.length > 1 && (
                        <button
                          onClick={() => {
                            setCompareVerA(1)
                            setCompareVerB(proposal.activeVersionNumber)
                            setIsCompareModalOpen(true)
                            handleRunCompare()
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer flex items-center gap-1"
                          title="Compare proposal versions"
                        >
                          <GitCompare className="w-3 h-3 text-purple-400" />
                          <span>Compare</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsVersionModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-[#6658FF] text-white text-xs font-semibold hover:bg-[#5546FF] cursor-pointer"
                      >
                        Save Version
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {proposal.versions
                      .slice()
                      .reverse()
                      .map((ver) => (
                        <div
                          key={ver.versionNumber}
                          className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                            ver.versionNumber === proposal.activeVersionNumber
                              ? 'bg-purple-950/40 border-purple-500/40'
                              : 'bg-slate-800/50 border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white font-mono">
                              v{ver.versionNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(ver.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">{ver.revisionSummary}</p>

                          {ver.versionNumber !== proposal.activeVersionNumber && (
                            <button
                              onClick={() => handleRestoreVersion(ver.versionNumber)}
                              className="self-start text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer mt-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore as New Revision</span>
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 3: FACULTY SUBMISSION */}
              {activeTab === 'faculty' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Submission Status</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          proposal.submission.status === 'SUBMITTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : proposal.submission.status === 'APPROVED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {proposal.submission.status}
                      </span>
                    </div>

                    {proposal.submission.submittedAt && (
                      <div className="text-[11px] text-slate-400">
                        Submitted on:{' '}
                        {new Date(proposal.submission.submittedAt).toLocaleString()}
                      </div>
                    )}

                    {proposal.submission.facultyGuideName && (
                      <div className="text-[11px] text-slate-400">
                        Assigned Guide: <strong>{proposal.submission.facultyGuideName}</strong>
                      </div>
                    )}

                    {proposal.submission.facultyComments && (
                      <div className="mt-2 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <strong>Review Note:</strong> {proposal.submission.facultyComments}
                      </div>
                    )}
                  </div>

                  {/* Faculty Review & Submission History */}
                  {proposal.submission.feedbackHistory && proposal.submission.feedbackHistory.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Review Timeline ({proposal.submission.feedbackHistory.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {proposal.submission.feedbackHistory
                          .slice()
                          .reverse()
                          .map((entry, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/70 text-[11px] space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-300">{entry.status}</span>
                                <span className="text-slate-400">
                                  {new Date(entry.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-300">{entry.comments}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {proposal.submission.status === 'CHANGES_REQUESTED' && (
                    <button
                      onClick={handleResubmitFaculty}
                      disabled={isSaving}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 mb-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resubmit Revision to Guide</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    disabled={proposal.submission.status === 'SUBMITTED' || proposal.submission.status === 'APPROVED'}
                    className={`w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      proposal.submission.status === 'SUBMITTED' || proposal.submission.status === 'APPROVED'
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-[#6658FF] hover:bg-[#5546FF] cursor-pointer'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {proposal.submission.status === 'SUBMITTED'
                        ? 'Awaiting Faculty Review'
                        : proposal.submission.status === 'APPROVED'
                        ? 'Proposal Approved by Faculty'
                        : 'Submit for Faculty Review'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* 4. VERSION CREATION MODAL */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-1">Save Proposal Version Snapshot</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an immutable snapshot of all sections. Past versions are preserved.
            </p>

            <form onSubmit={handleSaveVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Revision Summary:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Completed methodology and clarified system architecture"
                  value={versionSummary}
                  onChange={(e) => setVersionSummary(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white"
                >
                  Save Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. FACULTY SUBMISSION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-1">Submit Proposal to Faculty</h3>
            <p className="text-xs text-slate-400 mb-4">
              Your proposal will be queued for formal academic guide review and milestone approval.
            </p>

            <form onSubmit={handleSubmitToFaculty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Faculty Guide Name:
                </label>
                <input
                  type="text"
                  required
                  value={facultyGuideName}
                  onChange={(e) => setFacultyGuideName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Submission Comments / Student Note:
                </label>
                <textarea
                  rows={3}
                  value={submissionComments}
                  onChange={(e) => setSubmissionComments(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#6658FF] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Guide</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADD CUSTOM SECTION MODAL */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-1">Add Custom Proposal Section</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a specialized section (e.g. Hardware Requirements, Security Architecture, Ethical Impact).
            </p>

            <form onSubmit={handleAddCustomSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Section Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hardware and Sensor Specifications"
                  value={customSectionTitle}
                  onChange={(e) => setCustomSectionTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#6658FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Content:
                </label>
                <textarea
                  rows={4}
                  placeholder="Draft introductory details for this section..."
                  value={customSectionContent}
                  onChange={(e) => setCustomSectionContent(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#6658FF] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSectionModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !customSectionTitle.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6658FF] hover:bg-[#5546FF] text-white flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. VERSION COMPARISON MODAL */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl text-white max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Compare Proposal Versions</h3>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Version A:</label>
                <select
                  value={compareVerA}
                  onChange={(e) => setCompareVerA(Number(e.target.value))}
                  className="p-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white"
                >
                  {proposal.versions.map((v) => (
                    <option key={v.versionNumber} value={v.versionNumber}>
                      v{v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-bold text-slate-500 mt-5">vs</span>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Version B:</label>
                <select
                  value={compareVerB}
                  onChange={(e) => setCompareVerB(Number(e.target.value))}
                  className="p-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white"
                >
                  {proposal.versions.map((v) => (
                    <option key={v.versionNumber} value={v.versionNumber}>
                      v{v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunCompare}
                disabled={isComparing}
                className="mt-5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs"
              >
                {isComparing ? 'Comparing...' : 'Run Diff'}
              </button>
            </div>

            {compareResult && (
              <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <span className="text-purple-300 font-bold block mb-1">
                      Version {compareResult.versionA} Summary:
                    </span>
                    <p className="text-slate-300">{compareResult.revisionSummaryA}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <span className="text-purple-300 font-bold block mb-1">
                      Version {compareResult.versionB} Summary:
                    </span>
                    <p className="text-slate-300">{compareResult.revisionSummaryB}</p>
                  </div>
                </div>

                {compareResult.modifiedSections.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-200 block">
                      Modified Sections ({compareResult.modifiedSections.length}):
                    </span>
                    {compareResult.modifiedSections.map((m) => (
                      <div
                        key={m.sectionId}
                        className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                      >
                        <span className="font-semibold text-white">{m.title}</span>
                        <span
                          className={`font-mono text-[11px] px-2 py-0.5 rounded-md ${
                            m.wordCountDelta >= 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {m.wordCountDelta >= 0 ? '+' : ''}
                          {m.wordCountDelta} words (from {m.wordCountA} to {m.wordCountB})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProposalEditorPage
