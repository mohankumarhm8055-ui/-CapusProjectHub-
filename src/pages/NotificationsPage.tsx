import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ClipboardList,
  Clock,
  FileCheck,
  MessageSquare,
  Settings,
  Trash2,
  UserCheck,
} from 'lucide-react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import {
  formatRelativeTime,
  notificationApiService,
  type AcademicNotificationItem,
  type NotificationCategory,
  type UserNotificationPreferences,
} from '../services/notificationApiService'

const CATEGORY_TABS: Array<{ value: NotificationCategory | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ACTIVITY', label: 'Activities' },
  { value: 'WEEKLY_REPORT', label: 'Weekly Reports' },
  { value: 'SUBMISSION', label: 'Submissions' },
  { value: 'REVIEW', label: 'Reviews' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'MENTORSHIP', label: 'Mentorship' },
]

function categoryIcon(cat?: NotificationCategory) {
  switch (cat) {
    case 'ACTIVITY':
      return <Clock className="w-4 h-4 text-amber-600 shrink-0" />
    case 'WEEKLY_REPORT':
      return <ClipboardList className="w-4 h-4 text-[#6658FF] shrink-0" />
    case 'SUBMISSION':
      return <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
    case 'REVIEW':
      return <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
    case 'SCHEDULE':
      return <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
    default:
      return <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
  }
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate()

  const [items, setItems] = useState<AcademicNotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [category, setCategory] = useState<NotificationCategory | ''>('')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadNotifications = async (targetPage = page) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await notificationApiService.listNotifications({
        page: targetPage,
        limit: 12,
        unreadOnly,
        category,
      })
      setItems(res.items)
      setPage(res.page)
      setTotalPages(res.totalPages)
      setTotalCount(res.totalCount)
      setUnreadCount(res.unreadCount)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications(1)
  }, [category, unreadOnly])

  const handleTogglePrefs = async () => {
    const next = !showPrefs
    setShowPrefs(next)
    if (next && !prefs) {
      try {
        const p = await notificationApiService.getPreferences()
        setPrefs(p)
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load preferences.')
      }
    }
  }

  const handlePrefChange = async (
    key: keyof Pick<
      UserNotificationPreferences,
      | 'inAppEnabled'
      | 'emailEnabled'
      | 'activityReminders'
      | 'weeklyReportReminders'
      | 'submissionUpdates'
      | 'reviewUpdates'
      | 'scheduleUpdates'
    >
  ) => {
    if (!prefs) return
    try {
      const updated = await notificationApiService.updatePreferences({ [key]: !prefs[key] })
      setPrefs(updated)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save notification preference.')
    }
  }

  const handleMarkRead = async (item: AcademicNotificationItem) => {
    if (item.read) return
    await notificationApiService.markRead(item.id).catch(() => {})
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, read: true } : x)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const handleMarkAllRead = async () => {
    await notificationApiService.markAllRead().catch(() => {})
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
    setUnreadCount(0)
  }

  const handleClearHistory = async () => {
    await notificationApiService.clearHistory().catch(() => {})
    await loadNotifications(1)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 mb-2">
                <Bell className="w-3.5 h-3.5" />
                <span>Academic Notification Centre</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B192C] tracking-tight">
                Notifications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {unreadCount} unread • {totalCount} total alerts matching filter
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePrefs}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#6658FF] cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Optional Notification Preferences Drawer */}
          {showPrefs && prefs && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-[#0B192C]">Notification Preferences</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {(
                  [
                    ['inAppEnabled', 'In-App Notifications'],
                    ['emailEnabled', 'Email Alerts (when SMTP configured)'],
                    ['activityReminders', 'Activity Deadline Reminders'],
                    ['weeklyReportReminders', 'Weekly Report Reminders'],
                    ['submissionUpdates', 'Submission Alerts'],
                    ['reviewUpdates', 'Faculty Review Updates'],
                    ['scheduleUpdates', 'Schedule Changes'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(prefs[key])}
                      onChange={() => handlePrefChange(key)}
                      className="rounded accent-[#6658FF]"
                    />
                    <span className="font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_TABS.map((t) => (
                <button
                  key={t.value || 'all'}
                  type="button"
                  onClick={() => setCategory(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${
                    category === t.value
                      ? 'bg-[#6658FF] text-white border-[#6658FF]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded accent-[#6658FF]"
              />
              <span>Unread only</span>
            </label>
          </div>

          {/* Notification List */}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading notifications...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                No notifications match your current filter.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.read ? 'bg-white' : 'bg-indigo-50/35'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      {categoryIcon(item.category)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-xs sm:text-sm ${item.read ? 'font-semibold text-slate-700' : 'font-bold text-[#0B192C]'}`}>
                          {item.title}
                        </h3>
                        {!item.read && (
                          <span className="px-2 py-0.5 rounded-full bg-[#6658FF] text-white text-[10px] font-bold">
                            Unread
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark Read</span>
                      </button>
                    )}
                    {item.actionUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleMarkRead(item)
                          navigate(item.actionUrl!)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#6658FF] hover:bg-[#5546FF] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Open &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => loadNotifications(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => loadNotifications(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default NotificationsPage
