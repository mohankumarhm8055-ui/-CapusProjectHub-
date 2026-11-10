import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Menu,
  Headphones,
  Settings,
  Compass,
  Home,
  Wifi,
  WifiOff,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  UserCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import type { Conversation, ChatMessage as ChatMessageType, MentorSettings } from '../types/aiMentor'
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  generateAcademicResponse,
} from '../services/aiMentorService'
import { aiMentorApiService, type ConversationContextData } from '../services/aiMentorApiService'
import { aiEvaluationApiService } from '../services/aiEvaluationApiService'
import { aiProposalApiService } from '../services/aiProposalApiService'
import { RequestGuidanceModal } from '../components/connections/RequestGuidanceModal'
import type {
  EvaluationRecord,
  DecisionStatus,
  ProjectConstraints,
  FinalScope,
} from '../services/aiEvaluationApiService'
import AIMentorSidebar from '../components/ai-mentor/AIMentorSidebar'
import WelcomeScreen from '../components/ai-mentor/WelcomeScreen'
import ChatConversation from '../components/ai-mentor/ChatConversation'
import MessageComposer from '../components/ai-mentor/MessageComposer'
import VoiceModePreview from '../components/ai-mentor/VoiceModePreview'
import AIMentorSettingsModal from '../components/ai-mentor/AIMentorSettingsModal'
import { FeatureEvaluationCards } from '../components/ai-mentor/FeatureEvaluationCards'
import { FinalScopeModal } from '../components/ai-mentor/FinalScopeModal'
import { ProjectAssessmentModal } from '../components/ai-mentor/ProjectAssessmentModal'

export const AIMentorPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations())
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [conversationContext, setConversationContext] = useState<ConversationContextData | null>(null)
  const [settings, setSettings] = useState<MentorSettings>(() => loadSettings())

  // Backend connection status
  const [backendStatus, setBackendStatus] = useState<{
    isConnected: boolean
    providerName?: string
    databasePersistent?: boolean
    databaseMode?: string
  }>({ isConnected: false })

  // Feature Evaluation Engine states
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationRecord | null>(null)
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false)
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [guidanceTarget, setGuidanceTarget] = useState<{
    projectId: string
    projectTitle: string
    seniorId: string
    seniorName: string
  } | null>(null)

  // UI state
  const [isOpenMobile, setIsOpenMobile] = useState(false)
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false)
  const [isVoiceOpen, setIsVoiceOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const stopGenerationRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const initialPromptHandledRef = useRef(false)

  const syncConversationWorkspace = async (convId: string) => {
    try {
      const [ctx, evalRec] = await Promise.all([
        aiMentorApiService.getConversationContext(convId).catch(() => null),
        aiEvaluationApiService.getLatestByConversation(convId).catch(() => null),
      ])
      setConversationContext(ctx)
      setCurrentEvaluation(evalRec)
    } catch {
      // Keep existing state on transient error
    }
  }

  // Probe backend status on mount and sync remote conversations if available
  useEffect(() => {
    let isMounted = true

    aiMentorApiService.checkStatus().then(async (status) => {
      if (!isMounted) return
      if (status.connected) {
        setBackendStatus({
          isConnected: true,
          providerName: status.activeProvider,
          databasePersistent: status.database?.persistent,
          databaseMode: status.database?.mode,
        })
        if (status.database && !status.database.persistent) {
          setWorkspaceError(
            status.database.mode === 'in-memory-dev-fallback'
              ? 'Running in temporary development fallback mode (MongoDB disconnected). Changes will not survive server restart.'
              : 'Persistent database storage (MongoDB) is unavailable. Saving conversations and proposals is blocked.'
          )
        }
        try {
          const remoteConvs = await aiMentorApiService.listConversations()
          if (isMounted && remoteConvs.length > 0) {
            setConversations(remoteConvs)
          }
        } catch (err: any) {
          if (isMounted && err?.message) {
            setWorkspaceError(err.message)
          }
        }
      } else {
        setBackendStatus({ isConnected: false })
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  // Sync conversations to localStorage for offline reliability
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Handle switching or starting new conversation
  const handleNewConversation = async () => {
    setWorkspaceError(null)
    setCurrentEvaluation(null)
    setConversationContext(null)

    if (backendStatus.isConnected) {
      try {
        const remote = await aiMentorApiService.createConversation('New Project Consultation')
        setConversations((prev) => [remote, ...prev])
        setActiveConversationId(remote.id)
        setIsGenerating(false)
        return
      } catch (err) {
        console.warn('Backend create conversation failed, falling back locally', err)
      }
    }

    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Project Consultation',
      createdAt: 'Today',
      updatedAt: 'Just now',
      group: 'Today',
      messages: [],
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setIsGenerating(false)
  }

  // Handle selecting an existing conversation and fetching messages + context + evaluation
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id)
    setIsGenerating(false)
    setWorkspaceError(null)
    setCurrentEvaluation(null)
    setConversationContext(null)

    if (backendStatus.isConnected) {
      try {
        const { messages } = await aiMentorApiService.getConversation(id)
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, messages } : c))
        )
        await syncConversationWorkspace(id)
      } catch (err: any) {
        setWorkspaceError(err?.message || 'Could not load saved conversation from server.')
      }
    }
  }

  // Handle renaming a conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: 'Just now' } : c))
    )

    if (backendStatus.isConnected) {
      try {
        await aiMentorApiService.renameConversation(id, newTitle)
      } catch (err) {
        console.warn('Remote rename failed', err)
      }
    }
  }

  // Handle deleting a conversation
  const handleDeleteConversation = async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConversationId === id) {
      setActiveConversationId(null)
    }

    if (backendStatus.isConnected) {
      try {
        await aiMentorApiService.deleteConversation(id)
      } catch (err) {
        console.warn('Remote delete failed', err)
      }
    }
  }

  // Clear all conversations
  const handleClearAllHistory = () => {
    setConversations([])
    setActiveConversationId(null)
    localStorage.removeItem('campusprojecthub_ai_mentor_conversations')
  }

  // Handle saving settings
  const handleSaveSettings = (newSettings: MentorSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  // Stop generation control
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    stopGenerationRef.current = true
    setIsGenerating(false)
  }

  // Feature Evaluation Handlers
  const handleRunEvaluation = async (
    constraints: Partial<ProjectConstraints>,
    proposedFeatures?: string[],
    projectMeta?: { projectTitle?: string; problemStatement?: string },
    targetConversationId?: string
  ) => {
    setIsEvaluating(true)
    setWorkspaceError(null)
    const convIdForEval = targetConversationId || activeConversationId || undefined
    const resolvedTitle =
      projectMeta?.projectTitle ||
      conversationContext?.currentProjectIdea ||
      (activeConversation?.title && activeConversation.title !== 'New Project Consultation'
        ? activeConversation.title
        : 'CampusProjectHub')

    try {
      if (currentEvaluation && (!projectMeta?.projectTitle || projectMeta.projectTitle === currentEvaluation.projectTitle)) {
        const updated = await aiEvaluationApiService.reassess(
          currentEvaluation.id,
          constraints,
          proposedFeatures
        )
        setCurrentEvaluation(updated)
      } else {
        const created = await aiEvaluationApiService.createEvaluation({
          projectTitle: resolvedTitle,
          problemStatement: projectMeta?.problemStatement,
          conversationId: convIdForEval,
          constraints: {
            ...(conversationContext?.teamSize ? { teamSize: conversationContext.teamSize } : {}),
            ...(conversationContext?.technicalExperience
              ? { technicalExperience: conversationContext.technicalExperience }
              : {}),
            ...(conversationContext?.preferredTechnologies?.length
              ? { languagesAndFrameworks: conversationContext.preferredTechnologies }
              : {}),
            ...constraints,
          },
          proposedFeatures:
            proposedFeatures && proposedFeatures.length > 0
              ? proposedFeatures
              : conversationContext?.proposedFeatures?.length
              ? conversationContext.proposedFeatures
              : undefined,
        })
        setCurrentEvaluation(created)
      }
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Failed to run feature evaluation.')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleRecordDecision = async (
    featureId: string,
    decision: DecisionStatus,
    modifiedScope?: string
  ) => {
    if (!currentEvaluation) return
    setWorkspaceError(null)
    try {
      const updated = await aiEvaluationApiService.recordDecision(
        currentEvaluation.id,
        featureId,
        decision,
        modifiedScope
      )
      setCurrentEvaluation(updated)
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Failed to record student decision.')
    }
  }

  const handleOpenScopeModal = async () => {
    if (!currentEvaluation) return
    setIsEvaluating(true)
    setWorkspaceError(null)
    try {
      const updated = await aiEvaluationApiService.generateFinalScope(currentEvaluation.id)
      setCurrentEvaluation(updated)
      setIsScopeModalOpen(true)
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Failed to generate final scope.')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleSaveFinalScope = async (updates: Partial<FinalScope>) => {
    if (!currentEvaluation) return
    setWorkspaceError(null)
    try {
      const updated = await aiEvaluationApiService.updateFinalScope(currentEvaluation.id, updates)
      setCurrentEvaluation(updated)
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Failed to save final scope.')
    }
  }

  const handleOpenProposalGenerator = async () => {
    if (conversationContext?.activeProposalId) {
      navigate(`/ai-mentor/proposals/${conversationContext.activeProposalId}`)
      return
    }
    setIsGeneratingProposal(true)
    setWorkspaceError(null)
    try {
      const prop = await aiProposalApiService.generateProposal({
        projectTitle:
          currentEvaluation?.projectTitle ||
          conversationContext?.currentProjectIdea ||
          'CampusProjectHub: AI-Powered Academic Project Management Platform',
        documentType: 'MINI_PROJECT_PROPOSAL',
        sourceEvaluationId: currentEvaluation?.id,
      })
      navigate(`/ai-mentor/proposals/${prop.id}`)
    } catch (err: any) {
      setWorkspaceError('Failed to launch proposal generator: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  // Send message flow (streaming from backend if connected, fallback locally if offline)
  const handleSendMessage = async (text: string, attachments?: string[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return

    const lower = text.toLowerCase()
    if (
      lower.includes('evaluate') &&
      (lower.includes('feature') || lower.includes('campusprojecthub') || lower.includes('scope'))
    ) {
      handleRunEvaluation({})
    }

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMessageContent =
      attachments && attachments.length > 0
        ? `${text}\n\n📎 *Attached files*: ${attachments.join(', ')}`
        : text

    const userMsg: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: timeStr,
    }

    let targetConvId = activeConversationId

    // If no active conversation exists, create one immediately
    if (!targetConvId || !activeConversation) {
      const newTitle = text.length > 40 ? `${text.substring(0, 38)}...` : text

      if (backendStatus.isConnected) {
        try {
          const remoteConv = await aiMentorApiService.createConversation(newTitle)
          targetConvId = remoteConv.id
          setConversations((prev) => [{ ...remoteConv, messages: [userMsg] }, ...prev])
          setActiveConversationId(remoteConv.id)
        } catch {
          const fallbackConv: Conversation = {
            id: `conv-${Date.now()}`,
            title: newTitle || 'Project Consultation',
            createdAt: 'Today',
            updatedAt: 'Just now',
            group: 'Today',
            messages: [userMsg],
          }
          setConversations((prev) => [fallbackConv, ...prev])
          setActiveConversationId(fallbackConv.id)
          targetConvId = fallbackConv.id
        }
      } else {
        const fallbackConv: Conversation = {
          id: `conv-${Date.now()}`,
          title: newTitle || 'Project Consultation',
          createdAt: 'Today',
          updatedAt: 'Just now',
          group: 'Today',
          messages: [userMsg],
        }
        setConversations((prev) => [fallbackConv, ...prev])
        setActiveConversationId(fallbackConv.id)
        targetConvId = fallbackConv.id
      }
    } else {
      // Append user message to active conversation
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConvId) {
            const shouldRename = c.title === 'New Project Consultation'
            const updatedTitle = shouldRename
              ? text.length > 40
                ? `${text.substring(0, 38)}...`
                : text
              : c.title
            return {
              ...c,
              title: updatedTitle,
              updatedAt: 'Just now',
              messages: [...c.messages, userMsg],
            }
          }
          return c
        })
      )
    }

    // Begin generating mentor response
    setIsGenerating(true)
    stopGenerationRef.current = false
    abortControllerRef.current = new AbortController()

    // 1. STREAMING FROM REAL BACKEND (When connected)
    if (backendStatus.isConnected && targetConvId) {
      let remoteTargetConvId = targetConvId
      if (targetConvId.startsWith('conv-')) {
        try {
          const newRemote = await aiMentorApiService.createConversation(text.slice(0, 38) || 'Project Consultation')
          remoteTargetConvId = newRemote.id
          setActiveConversationId(newRemote.id)
          setConversations((prev) =>
            prev.map((c) => (c.id === targetConvId ? { ...c, id: newRemote.id } : c))
          )
        } catch {
          // Continue with existing conversation ID if remote creation fails
        }
      }

      const assistantMsgId = `assistant-${Date.now()}`
      let streamText = ''

      // Insert placeholder assistant message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === remoteTargetConvId || c.id === targetConvId) {
            const pendingMsg: ChatMessageType = {
              id: assistantMsgId,
              role: 'assistant',
              content: '',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'pending',
            }
            return {
              ...c,
              messages: [...c.messages, pendingMsg],
            }
          }
          return c
        })
      )

      try {
        await aiMentorApiService.streamMessage(
          remoteTargetConvId,
          text,
          {
            onToken: (token) => {
              streamText += token
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === remoteTargetConvId || c.id === targetConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: streamText } : m
                      ),
                    }
                  }
                  return c
                })
              )
            },
            onDone: (finalAssistantMsg) => {
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === remoteTargetConvId || c.id === targetConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId ? { ...finalAssistantMsg, status: 'completed' } : m
                      ),
                    }
                  }
                  return c
                })
              )
              setIsGenerating(false)
              syncConversationWorkspace(remoteTargetConvId)
            },
            onError: (err) => {
              console.warn('Streaming fallback triggered:', err)
              const fallbackResponse = generateAcademicResponse(text, settings)
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === remoteTargetConvId || c.id === targetConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: fallbackResponse.content, status: 'completed', suggestedFollowUps: fallbackResponse.suggestedFollowUps }
                          : m
                      ),
                    }
                  }
                  return c
                })
              )
              setIsGenerating(false)
            },
          },
          abortControllerRef.current.signal
        )
        return
      } catch {
        // Fall back below if streaming threw synchronously
      }
    }

    // 2. OFFLINE / LOCAL SIMULATED STREAMING FALLBACK
    const responseTemplate = generateAcademicResponse(text, settings)

    setTimeout(() => {
      if (stopGenerationRef.current) return

      const assistantMsg: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseTemplate.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: responseTemplate.suggestedFollowUps,
        codeSnippet: responseTemplate.codeSnippet,
        status: 'completed',
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: 'Just now' }
            : c
        )
      )
      setIsGenerating(false)
    }, 1200)
  }

  // Handle clicking a card from the WelcomeScreen
  const handleSelectSuggestion = (prompt: string, title: string) => {
    handleSendMessage(prompt)
    if (activeConversationId) {
      handleRenameConversation(activeConversationId, title)
    }
  }

  // Handle retrying a failed message
  const handleRetryMessage = (failedMsg: ChatMessageType) => {
    if (activeConversation) {
      const msgIndex = activeConversation.messages.findIndex((m) => m.id === failedMsg.id)
      const userMsg = msgIndex > 0 ? activeConversation.messages[msgIndex - 1] : null
      if (userMsg && userMsg.role === 'user') {
        // Remove failed assistant message and resend
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? { ...c, messages: c.messages.filter((m) => m.id !== failedMsg.id) }
              : c
          )
        )
        handleSendMessage(userMsg.content)
      }
    }
  }

  // Handle incoming initialPrompt from IdeaSimilarityModal
  useEffect(() => {
    const state = location.state as { initialPrompt?: string; title?: string } | null
    if (state?.initialPrompt && backendStatus.isConnected && !initialPromptHandledRef.current) {
      initialPromptHandledRef.current = true
      handleSendMessage(state.initialPrompt)
    }
  }, [location.state, backendStatus.isConnected])

  // Determine if active view is WelcomeScreen or ChatConversation
  const showWelcome = !activeConversation || activeConversation.messages.length === 0

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-800 antialiased font-sans selection:bg-[#6658FF]/20 selection:text-[#6658FF]">
      {/* 1. Left Collapsible Sidebar */}
      <AIMentorSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleCollapseDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Workspace Header Bar */}
        <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-xs z-10">
          {/* Left: Mobile Toggle & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsOpenMobile(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open sidebar drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[#0B192C] truncate">
                  {activeConversation ? activeConversation.title : 'AI Project Mentor'}
                </h1>
                
                {/* Real-time Backend Connection Indicator */}
                {backendStatus.isConnected ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Wifi className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Backend Active ({backendStatus.providerName || 'AI'})</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <WifiOff className="w-2.5 h-2.5 text-amber-600" />
                    <span>Offline Demo Mode</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 hidden sm:block truncate">
                Your Honest Academic Project Guide • Capstone Viva & Architecture Support
              </p>
            </div>
          </div>

          {/* Right: Quick Actions & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 7-Dimensional Feature Evaluation Trigger */}
            <button
              onClick={() => setIsAssessmentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Launch 7-Dimensional Feature Evaluation"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">Feature Evaluation</span>
            </button>

            {/* Academic Proposal Workspace Trigger */}
            <button
              onClick={handleOpenProposalGenerator}
              disabled={isGeneratingProposal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Generate or Edit Academic Proposal (IEEE 830)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">
                {isGeneratingProposal ? 'Generating...' : 'Academic Proposal'}
              </span>
            </button>

            {/* Launch Voice Mode Preview */}
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#6658FF] bg-[#6658FF]/10 hover:bg-[#6658FF]/20 border border-[#6658FF]/20 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Launch AI Voice Mode (Preview)"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Voice Mode</span>
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="AI Mentor Settings"
              aria-label="AI Mentor Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Links back to Platform */}
            <Link
              to="/explore-projects"
              className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#6658FF] transition-colors px-2 py-1"
              title="Go to Explore Projects"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Projects</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#6658FF] transition-colors px-2 py-1"
              title="Go to Homepage"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </header>

        {/* Workspace Body: Welcome Screen OR Chat Conversation & Evaluation */}
        <main className="flex-1 overflow-hidden flex flex-col relative bg-[#F8FAFC]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-10 right-10 w-80 h-80 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* API Error Banner */}
            {workspaceError && (
              <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full pt-3">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{workspaceError}</span>
                  </div>
                  <button
                    onClick={() => setWorkspaceError(null)}
                    className="font-bold text-rose-700 hover:text-rose-950 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Unified Student Project Workflow Context Strip */}
            {(conversationContext?.currentProjectIdea ||
              conversationContext?.matchedRepositoryProject ||
              currentEvaluation) && (
              <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full pt-3">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {conversationContext?.currentProjectIdea && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold max-w-xs truncate">
                        <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">Idea: {conversationContext.currentProjectIdea}</span>
                      </span>
                    )}

                    {conversationContext?.matchedRepositoryProject && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                        <span>
                          Match: <strong>{conversationContext.matchedRepositoryProject.title}</strong>
                        </span>
                        {conversationContext.matchedRepositoryProject.sourceUrl && (
                          <Link
                            to={conversationContext.matchedRepositoryProject.sourceUrl}
                            className="inline-flex items-center gap-0.5 text-[#6658FF] font-bold hover:underline ml-1"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {conversationContext.matchedRepositoryProject.authors?.find(
                          (a) => a.isAvailableForMentoring && a.studentId
                        ) && (
                          <button
                            type="button"
                            onClick={() => {
                              const mentor = conversationContext.matchedRepositoryProject!.authors!.find(
                                (a) => a.isAvailableForMentoring && a.studentId
                              )!
                              setGuidanceTarget({
                                projectId:
                                  conversationContext.matchedRepositoryProject!.projectId || 'repo-match',
                                projectTitle: conversationContext.matchedRepositoryProject!.title,
                                seniorId: mentor.studentId!,
                                seniorName: mentor.name,
                              })
                            }}
                            className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>Connect Mentor</span>
                          </button>
                        )}
                      </div>
                    )}

                    {currentEvaluation && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${
                          currentEvaluation.isFinalized
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          Scope v{currentEvaluation.version} ({currentEvaluation.isFinalized ? 'Finalized' : 'Draft'})
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!currentEvaluation && (
                      <button
                        type="button"
                        onClick={() => setIsAssessmentModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold cursor-pointer"
                      >
                        Evaluate Features
                      </button>
                    )}
                    {conversationContext?.activeProposalId && (
                      <Link
                        to={`/ai-mentor/proposals/${conversationContext.activeProposalId}`}
                        className="px-2.5 py-1 rounded-lg bg-[#6658FF] hover:bg-[#5546FF] text-white font-bold"
                      >
                        Open Proposal
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Feature Evaluation Interactive Panel */}
            {currentEvaluation && (
              <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full pt-4">
                <FeatureEvaluationCards
                  evaluation={currentEvaluation}
                  onRecordDecision={handleRecordDecision}
                  onOpenScopeModal={handleOpenScopeModal}
                  onOpenAssessmentModal={() => setIsAssessmentModalOpen(true)}
                  isBusy={isEvaluating}
                />
              </div>
            )}

            {showWelcome && !currentEvaluation ? (
              <div className="flex-1 flex items-center justify-center">
                <WelcomeScreen onSelectSuggestion={handleSelectSuggestion} />
              </div>
            ) : (
              <ChatConversation
                messages={activeConversation ? activeConversation.messages : []}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
                onSelectFollowUp={(prompt) => handleSendMessage(prompt)}
                onRetry={handleRetryMessage}
              />
            )}
          </div>

          {/* Bottom Docked Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            onOpenVoiceMode={() => setIsVoiceOpen(true)}
          />
        </main>
      </div>

      {/* Voice Mode Preview Modal */}
      <VoiceModePreview
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        activeConversationId={activeConversationId}
        onSwitchToTextChat={() => setIsVoiceOpen(false)}
        onAppendMessage={(role, content) => {
          if (!activeConversationId) return
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const newMsg: ChatMessageType = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            role,
            content,
            timestamp: nowStr,
            status: 'completed',
          }
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === activeConversationId) {
                return {
                  ...c,
                  messages: [...c.messages, newMsg],
                }
              }
              return c
            })
          )
        }}
      />

      {/* Mentor Settings Modal */}
      <AIMentorSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearAllHistory={handleClearAllHistory}
      />

      {/* Final Scope Modal */}
      <FinalScopeModal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        scope={currentEvaluation?.finalScope}
        evaluationId={currentEvaluation?.id}
        evaluation={currentEvaluation}
        onSaveScope={handleSaveFinalScope}
        onScopeUpdated={(updated) => setCurrentEvaluation(updated)}
      />

      {/* Project Assessment Constraints Modal */}
      <ProjectAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        currentConstraints={currentEvaluation?.constraints}
        initialProjectTitle={
          currentEvaluation?.projectTitle ||
          conversationContext?.currentProjectIdea ||
          (activeConversation?.title && activeConversation.title !== 'New Project Consultation'
            ? activeConversation.title
            : undefined)
        }
        initialProblemStatement={currentEvaluation?.finalScope?.problemStatement}
        initialFeatures={
          currentEvaluation?.features?.map((f) => f.name) ||
          (conversationContext?.proposedFeatures?.length ? conversationContext.proposedFeatures : undefined)
        }
        onRunEvaluation={handleRunEvaluation}
        isBusy={isEvaluating}
      />

      {/* Senior-Junior Mentorship Request Modal */}
      {guidanceTarget && (
        <RequestGuidanceModal
          isOpen={!!guidanceTarget}
          onClose={() => setGuidanceTarget(null)}
          projectId={guidanceTarget.projectId}
          projectTitle={guidanceTarget.projectTitle}
          seniorId={guidanceTarget.seniorId}
          seniorName={guidanceTarget.seniorName}
          initialPurpose="DISCUSS_EXTENSION"
          initialNote={`Hello ${guidanceTarget.seniorName}! While exploring "${conversationContext?.currentProjectIdea || 'our upcoming capstone'}" in the AI Mentor, we discovered your project "${guidanceTarget.projectTitle}". We would appreciate your advice on your architecture and documented engineering challenges.`}
        />
      )}
    </div>
  )
}

export default AIMentorPage
