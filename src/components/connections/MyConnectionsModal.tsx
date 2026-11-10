import React, { useState, useEffect } from 'react'
import {
  X,
  MessageSquare,
  Inbox,
  UserCheck,
  Bell,
  Send,
  Check,
  CheckCheck,
  Shield,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react'
import { connectionService } from '../../services/connectionService'
import { getCurrentAuthUser } from '../../services/sessionService'
import type {
  IConnectionRequest,
  IMentorshipMessage,
  INotification,
  IStudentProfile,
} from '../../services/connectionService'

interface MyConnectionsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'chat' | 'requests' | 'profile' | 'notifications'
}

export const MyConnectionsModal: React.FC<MyConnectionsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'chat',
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'requests' | 'profile' | 'notifications'>(
    initialTab
  )
  const [connections, setConnections] = useState<IConnectionRequest[]>([])
  const [selectedConnection, setSelectedConnection] = useState<IConnectionRequest | null>(null)
  const [messages, setMessages] = useState<IMentorshipMessage[]>([])
  const [newMessageText, setNewMessageText] = useState('')
  const [notifications, setNotifications] = useState<INotification[]>([])
  const [profile, setProfile] = useState<IStudentProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('')
  const [newSkillInput, setNewSkillInput] = useState('')

  // Current authenticated user ID
  const currentUserId = getCurrentAuthUser()?.id || ''

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedConnection) {
      loadMessages(selectedConnection.id)
    }
  }, [selectedConnection])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [reqs, notifs, prof] = await Promise.all([
        connectionService.listRequests(),
        connectionService.getNotifications(),
        connectionService.getMyProfile(),
      ])
      setConnections(reqs)
      setNotifications(notifs)
      setProfile(prof)

      const accepted = reqs.filter((r) => r.status === 'ACCEPTED')
      if (accepted.length > 0 && !selectedConnection) {
        setSelectedConnection(accepted[0])
      }
    } catch (err) {
      console.error('Failed to load connections data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (connectionId: string) => {
    try {
      const msgs = await connectionService.getMessages(connectionId)
      setMessages(msgs)
      await connectionService.markMessagesRead(connectionId)
    } catch (err) {
      console.error('Failed to load messages', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessageText.trim() || !selectedConnection) return

    setSendingMsg(true)
    try {
      const msg = await connectionService.sendMessage(
        selectedConnection.id,
        newMessageText.trim(),
        profile?.displayName || 'Student Researcher'
      )
      setMessages((prev) => [...prev, msg])
      setNewMessageText('')
    } catch (err: any) {
      alert(err.message || 'Failed to send message')
    } finally {
      setSendingMsg(false)
    }
  }

  const handleAcceptRequest = async (id: string) => {
    try {
      await connectionService.acceptRequest(id)
      await loadInitialData()
    } catch (err: any) {
      alert(err.message || 'Failed to accept request')
    }
  }

  const handleDeclineRequest = async (id: string) => {
    const reason = prompt('Optional reason for declining:')
    try {
      await connectionService.declineRequest(id, reason || undefined)
      await loadInitialData()
    } catch (err: any) {
      alert(err.message || 'Failed to decline request')
    }
  }

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this mentorship request?')) return
    try {
      await connectionService.cancelRequest(id)
      await loadInitialData()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request')
    }
  }

  const handleBlockConnection = async (id: string) => {
    if (!confirm('Block this connection? Neither party will be able to send further messages.')) return
    try {
      await connectionService.blockConnection(id)
      await loadInitialData()
      setSelectedConnection(null)
    } catch (err: any) {
      alert(err.message || 'Failed to block connection')
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    try {
      const updated = await connectionService.updateMyProfile(profile)
      setProfile(updated)
      setProfileSuccessMsg('Mentorship profile updated successfully!')
      setTimeout(() => setProfileSuccessMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddSkill = () => {
    if (!newSkillInput.trim() || !profile) return
    if (!profile.skills.includes(newSkillInput.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkillInput.trim()],
      })
    }
    setNewSkillInput('')
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!profile) return
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skillToRemove),
    })
  }

  if (!isOpen) return null

  const acceptedConnections = connections.filter((c) => c.status === 'ACCEPTED')
  const incomingRequests = connections.filter(
    (c) => c.seniorId === currentUserId && c.status === 'PENDING'
  )
  const outgoingRequests = connections.filter(
    (c) => c.juniorId === currentUserId && c.status === 'PENDING'
  )
  const unreadNotifsCount = notifications.filter((n) => !n.read).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0B192C]">
                Senior–Junior Mentorship Workspace
              </h2>
              <p className="text-xs text-slate-500">
                Peer guidance, project extensions, and verified knowledge exchange
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-2 overflow-x-auto bg-white">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-[#6658FF] text-[#6658FF] bg-[#6658FF]/5'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Active Connections ({acceptedConnections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'border-[#6658FF] text-[#6658FF] bg-[#6658FF]/5'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Requests ({incomingRequests.length + outgoingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#6658FF] text-[#6658FF] bg-[#6658FF]/5'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Mentorship Availability</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-[#6658FF] text-[#6658FF] bg-[#6658FF]/5'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            {unreadNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Active Chat Channel */}
        {loading && (
          <div className="py-2 px-6 bg-[#6658FF]/5 text-[#6658FF] text-[11px] font-semibold text-center border-b border-[#6658FF]/10 animate-pulse">
            Syncing mentorship connections and notifications...
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Connections Sidebar */}
            <div className="w-72 border-r border-slate-200 bg-slate-50/50 overflow-y-auto p-3 space-y-2">
              <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Connected Peers
              </p>
              {acceptedConnections.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-400">
                  <p>No active connections yet.</p>
                  <p className="mt-1 text-[11px]">
                    Send a mentorship request from any project page!
                  </p>
                </div>
              ) : (
                acceptedConnections.map((conn) => {
                  const peerName =
                    conn.juniorId === currentUserId ? conn.seniorName : conn.juniorName
                  const peerRole = conn.juniorId === currentUserId ? 'Senior Mentor' : 'Junior Mentee'
                  const isSelected = selectedConnection?.id === conn.id

                  return (
                    <button
                      key={conn.id}
                      onClick={() => setSelectedConnection(conn)}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white shadow-xs border border-[#6658FF]/30 text-slate-900'
                          : 'hover:bg-slate-100/70 border border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs truncate">{peerName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6658FF]/10 text-[#6658FF]">
                          {peerRole}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{conn.projectTitle}</p>
                    </button>
                  )
                })
              )}
            </div>

            {/* Chat Conversation View */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedConnection ? (
                <>
                  {/* Active Chat Header */}
                  <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div>
                      <h4 className="font-bold text-sm text-[#0B192C]">
                        {selectedConnection.juniorId === currentUserId
                          ? selectedConnection.seniorName
                          : selectedConnection.juniorName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {selectedConnection.projectTitle} • Purpose:{' '}
                        <span className="font-semibold text-[#6658FF]">
                          {selectedConnection.purpose.replace(/_/g, ' ')}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleBlockConnection(selectedConnection.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block</span>
                    </button>
                  </div>

                  {/* Message Thread */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
                    {/* Initial Note Banner */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 text-xs text-indigo-900 max-w-lg mx-auto">
                      <p className="font-bold mb-1">Original Mentorship Request Note:</p>
                      <p className="italic text-indigo-800">"{selectedConnection.note}"</p>
                    </div>

                    {messages.map((m) => {
                      const isMe = m.senderId === currentUserId
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? 'bg-[#6658FF] text-white rounded-br-xs'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                            }`}
                          >
                            <p>{m.content}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe &&
                              (m.read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Message Input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t border-slate-200 bg-white flex items-center gap-3"
                  >
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type a respectful question or guidance..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6658FF]/30 focus:border-[#6658FF]"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !newMessageText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#6658FF] text-white text-xs font-bold hover:bg-[#5748e6] disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-8 text-center">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-[#6658FF]" />
                  <p className="font-semibold text-slate-600">Select an accepted connection</p>
                  <p className="text-slate-400 mt-1 max-w-xs">
                    Choose a peer from the left panel to begin discussing system architecture and
                    project guidance.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Mentorship Requests */}
        {activeTab === 'requests' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Incoming Requests */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#6658FF]" />
                <span>Incoming Guidance Requests ({incomingRequests.length})</span>
              </h3>
              {incomingRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl">
                  No incoming guidance requests at this moment.
                </p>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0B192C]">{req.juniorName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#6658FF]/10 text-[#6658FF]">
                            {req.purpose.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Regarding: <span className="font-semibold">{req.projectTitle}</span>
                        </p>
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          "{req.note}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>My Outgoing Requests ({outgoingRequests.length})</span>
              </h3>
              {outgoingRequests.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl">
                  You have not submitted any pending mentorship requests.
                </p>
              ) : (
                <div className="space-y-3">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0B192C]">
                            To: {req.seniorName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            PENDING REVIEW
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{req.projectTitle}</p>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Mentorship Profile */}
        {activeTab === 'profile' && profile && (
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {profileSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {/* Availability Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#0B192C]">
                  Accepting Mentorship Requests
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allow juniors to view your badge on projects and submit guidance inquiries.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isAvailableForMentoring}
                  onChange={(e) =>
                    setProfile({ ...profile, isAvailableForMentoring: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6658FF]"></div>
              </label>
            </div>

            {/* Display Name & Bio */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Mentorship Bio & Academic Interests
                </label>
                <textarea
                  rows={3}
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Share what parts of software engineering you enjoy helping with..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Skills Tags */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Technical Expertise & Skills
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Add skill (e.g. Docker, MongoDB, FastApi)..."
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6658FF] shrink-0" />
              <span>
                Personal emails and phone numbers are strictly protected and never displayed in public
                repositories. Communication is exclusively handled in-platform.
              </span>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-[#6658FF] text-white text-xs font-bold hover:bg-[#5748e6] transition-all shadow-xs cursor-pointer"
              >
                {savingProfile ? 'Saving...' : 'Save Mentorship Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'notifications' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Activity & Requests
              </p>
              <button
                onClick={async () => {
                  await connectionService.markAllNotificationsRead()
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                }}
                className="text-xs font-bold text-[#6658FF] hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl">
                No notifications right now.
              </p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    notif.read ? 'bg-white border-slate-200' : 'bg-[#6658FF]/5 border-[#6658FF]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0B192C]">{notif.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
