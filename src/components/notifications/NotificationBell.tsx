import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Calendar,
  CheckCheck,
  ClipboardList,
  Clock,
  FileCheck,
  MessageSquare,
  UserCheck,
} from 'lucide-react'
import { authService } from '../../services/authService'
import {
  formatRelativeTime,
  notificationApiService,
  type AcademicNotificationItem,
  type NotificationCategory,
} from '../../services/notificationApiService'

function renderCategoryIcon(category?: NotificationCategory) {
  switch (category) {
    case 'ACTIVITY':
      return <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    case 'WEEKLY_REPORT':
      return <ClipboardList className="w-3.5 h-3.5 text-[#6658FF] shrink-0" />
    case 'SUBMISSION':
      return <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
    case 'REVIEW':
      return <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
    case 'SCHEDULE':
      return <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
    default:
      return <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
  }
}

export const NotificationBell: React.FC = () => {
  const [user, setUser] = useState(authService.getCurrentUser())
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<AcademicNotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const syncAuth = () => setUser(authService.getCurrentUser())
    window.addEventListener('cph:auth-changed', syncAuth)
    return () => window.removeEventListener('cph:auth-changed', syncAuth)
  }, [])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      setItems([])
      return
    }
    let active = true
    const refreshBadge = () => {
      notificationApiService
        .getUnreadCount()
        .then((c) => {
          if (active) setUnreadCount(c)
        })
        .catch(() => {})
    }
    refreshBadge()
    const timer = setInterval(refreshBadge, 60000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [user?.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const toggleOpen = async () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen && user) {
      setLoading(true)
      try {
        const res = await notificationApiService.listNotifications({ page: 1, limit: 6 })
        setItems(res.items)
        setUnreadCount(res.unreadCount)
      } catch {
        // Keep silent in header bell
      } finally {
        setLoading(false)
      }
    }
  }

  const handleOpenNotification = async (item: AcademicNotificationItem) => {
    if (!item.read) {
      await notificationApiService.markRead(item.id).catch(() => {})
      setUnreadCount((c) => Math.max(0, c - 1))
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, read: true } : x)))
    }
    setOpen(false)
    if (item.actionUrl) {
      navigate(item.actionUrl)
    } else {
      navigate('/notifications')
    }
  }

  const handleMarkAllRead = async () => {
    await notificationApiService.markAllRead().catch(() => {})
    setUnreadCount(0)
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Academic notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative p-2 rounded-full text-slate-700 hover:text-[#6658FF] hover:bg-white/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30"
      >
        <Bell className="w-4 h-4" />
        {user && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#6658FF] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && !user && (
        <div
          role="menu"
          className="fixed inset-x-4 top-[76px] sm:fixed sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden p-4 space-y-3"
        >
          <div>
            <p className="text-xs font-bold text-[#0B192C]">Academic Notifications</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Sign in to view project milestones, deadline reminders, and faculty review alerts.
            </p>
          </div>
          <Link
            to="/signin"
            onClick={() => setOpen(false)}
            className="block w-full text-center py-2 rounded-xl text-xs font-bold text-white bg-[#6658FF] hover:bg-[#5546FF] transition-colors"
          >
            Sign In to View Alerts
          </Link>
        </div>
      )}

      {open && user && (
        <div
          role="menu"
          className="fixed inset-x-4 top-[76px] sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-[#0B192C]">
              Notifications ({unreadCount} unread)
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6658FF] hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading alerts...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No notifications right now.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenNotification(item)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer ${
                    item.read ? 'bg-white' : 'bg-indigo-50/40'
                  }`}
                >
                  <div className="mt-0.5">{renderCategoryIcon(item.category)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${item.read ? 'font-medium text-slate-700' : 'font-bold text-[#0B192C]'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.message}</p>
                  </div>
                  {!item.read && <span className="w-2 h-2 rounded-full bg-[#6658FF] mt-1.5 shrink-0" />}
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-[#6658FF] hover:underline"
            >
              Open Notification Centre & Preferences &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
