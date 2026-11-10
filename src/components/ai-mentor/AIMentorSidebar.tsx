import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  MessageSquare,
  Settings,
  LogOut,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Sparkles,
  ChevronLeft,
  GraduationCap,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react'
import type { Conversation, ConversationGroup } from '../../types/aiMentor'
import BrandLogo from '../BrandLogo'
import { authService } from '../../services/authService'

interface AIMentorSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onRenameConversation: (id: string, newTitle: string) => void
  onDeleteConversation: (id: string) => void
  onOpenSettings: () => void
  isOpenMobile: boolean
  onCloseMobile: () => void
  isCollapsedDesktop: boolean
  onToggleCollapseDesktop: () => void
}

export const AIMentorSidebar: React.FC<AIMentorSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
}) => {
  const navigate = useNavigate()
  const currentUser = authService.getCurrentUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Modals for rename and delete
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  const groups: ConversationGroup[] = ['Today', 'Yesterday', 'Previous 7 Days']

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    setRenamingId(conv.id)
    setRenameValue(conv.title)
  }

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameConversation(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const handleStartDelete = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    setDeletingId(conv.id)
  }

  const handleConfirmDelete = () => {
    if (deletingId) {
      onDeleteConversation(deletingId)
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#0F172A] text-slate-200 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isOpenMobile
            ? 'translate-x-0 w-80 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        } ${isCollapsedDesktop ? 'md:w-20' : 'md:w-80'}`}
      >
        {/* Top Header / Branding */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          {!isCollapsedDesktop ? (
            <div className="flex items-center gap-2.5">
              <Link to="/" className="flex items-center gap-2 group">
                <BrandLogo inverted={true} />
              </Link>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6658FF]/20 text-[#8B5CF6] border border-[#6658FF]/30">
                <Sparkles className="w-2.5 h-2.5" />
                AI Mentor
              </span>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6658FF] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-sm shadow-md">
                AI
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapseDesktop}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-200 ${
                isCollapsedDesktop ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: New Conversation */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewConversation()
              onCloseMobile()
            }}
            className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#6658FF] to-[#7C3AED] hover:from-[#5546FF] hover:to-[#6D28D9] transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer active:scale-[0.98] ${
              isCollapsedDesktop ? 'p-2.5' : ''
            }`}
            title="Start New Conversation"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsedDesktop && <span>New Conversation</span>}
          </button>
        </div>

        {/* Search Bar (Hidden when collapsed on desktop) */}
        {!isCollapsedDesktop && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#6658FF] focus:ring-1 focus:ring-[#6658FF] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Categorized Conversation History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-thin scrollbar-thumb-slate-800">
          {groups.map((group) => {
            const groupConvs = filteredConversations.filter((c) => c.group === group)
            if (groupConvs.length === 0) return null

            return (
              <div key={group} className="space-y-1">
                {!isCollapsedDesktop && (
                  <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    {group}
                  </div>
                )}

                {groupConvs.map((conv) => {
                  const isActive = conv.id === activeConversationId
                  const isMenuOpen = activeMenuId === conv.id

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id)
                        onCloseMobile()
                      }}
                      className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#6658FF]/15 text-white border border-[#6658FF]/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-850/80'
                      }`}
                      title={conv.title}
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                          isActive ? 'text-[#8B5CF6]' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />

                      {!isCollapsedDesktop && (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium leading-snug">
                              {conv.title}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {conv.updatedAt}
                            </span>
                          </div>

                          {/* Action Menu Trigger */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuId(isMenuOpen ? null : conv.id)
                              }}
                              className={`p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
                                isMenuOpen ? 'opacity-100 bg-slate-800' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title="Conversation options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-36 rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(conv, e)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 text-left transition-colors"
                                >
                                  <Edit2 className="w-3 h-3 text-slate-400" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartDelete(conv, e)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left transition-colors"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {filteredConversations.length === 0 && (
            <div className="px-3 py-6 text-center text-slate-400 text-xs">
              <FolderOpen className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              {!isCollapsedDesktop && <p>No conversations found</p>}
            </div>
          )}
        </div>

        {/* Bottom Profile Bar & Settings */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-800">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
              </div>

              {!isCollapsedDesktop && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser?.fullName || 'Academic User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate uppercase">
                    {currentUser?.role || 'student'}
                    {currentUser?.department ? ` • ${currentUser.department}` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="AI Mentor Settings"
                aria-label="AI Mentor Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  await authService.signOut()
                  navigate('/signin')
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Rename Dialog Modal */}
      {renamingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-slate-200">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#8B5CF6]" />
              Rename Conversation
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Give this mentoring session a clear topic name for future reference.
            </p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename()
                if (e.key === 'Escape') setRenamingId(null)
              }}
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-[#6658FF] focus:ring-1 focus:ring-[#6658FF] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenamingId(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#6658FF] hover:bg-[#5546FF] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-slate-200">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Delete Conversation?</h3>
            <p className="text-xs text-slate-400 mb-4">
              This action cannot be undone. All responses, code defense suggestions, and follow-ups in this thread will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AIMentorSidebar
