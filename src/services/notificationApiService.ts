import { extractApiErrorMessage, getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/notifications`

export type NotificationCategory =
  | 'ACTIVITY'
  | 'WEEKLY_REPORT'
  | 'SUBMISSION'
  | 'REVIEW'
  | 'SCHEDULE'
  | 'MENTORSHIP'

export interface AcademicNotificationItem {
  id: string
  recipientId: string
  type: string
  category?: NotificationCategory
  title: string
  message: string
  actionUrl?: string
  deadlineVersion?: number
  deliveryStatus?: 'DELIVERED' | 'PENDING' | 'FAILED' | 'SKIPPED_PREFERENCE'
  emailDeliveryStatus?: 'NOT_CONFIGURED' | 'SKIPPED' | 'SENT' | 'FAILED'
  data?: {
    connectionId?: string
    projectId?: string
    projectTitle?: string
    scheduleId?: string
    activityId?: string
    reportId?: string
    submissionId?: string
    weekNumber?: number
    senderId?: string
    senderName?: string
  }
  read: boolean
  createdAt: string
}

export interface PaginatedNotificationsResponse {
  items: AcademicNotificationItem[]
  totalCount: number
  unreadCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface UserNotificationPreferences {
  id: string
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  activityReminders: boolean
  weeklyReportReminders: boolean
  submissionUpdates: boolean
  reviewUpdates: boolean
  scheduleUpdates: boolean
  updatedAt: string
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, res.status, fallback))
  }
  return json.data as T
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString()
}

export const notificationApiService = {
  async listNotifications(params?: {
    page?: number
    limit?: number
    unreadOnly?: boolean
    category?: NotificationCategory | ''
  }): Promise<PaginatedNotificationsResponse> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.unreadOnly) query.set('unreadOnly', 'true')
    if (params?.category) query.set('category', params.category)

    const res = await fetch(`${getBase()}?${query.toString()}`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load notifications')
  },

  async getUnreadCount(): Promise<number> {
    const res = await fetch(`${getBase()}/unread-count`, {
      headers: getApiHeaders({}, false),
    })
    const data = await parseJson<{ unreadCount: number }>(res, 'Failed to load unread count')
    return data.unreadCount
  },

  async markRead(notificationId: string): Promise<void> {
    const res = await fetch(`${getBase()}/${notificationId}/read`, {
      method: 'PATCH',
      headers: getApiHeaders({}, false),
    })
    await parseJson(res, 'Failed to mark notification as read')
  },

  async markAllRead(): Promise<number> {
    const res = await fetch(`${getBase()}/read-all`, {
      method: 'PATCH',
      headers: getApiHeaders({}, false),
    })
    const data = await parseJson<{ updatedCount: number }>(res, 'Failed to mark all notifications read')
    return data.updatedCount
  },

  async clearHistory(): Promise<number> {
    const res = await fetch(`${getBase()}`, {
      method: 'DELETE',
      headers: getApiHeaders({}, false),
    })
    const data = await parseJson<{ clearedCount: number }>(res, 'Failed to clear notification history')
    return data.clearedCount
  },

  async getPreferences(): Promise<UserNotificationPreferences> {
    const res = await fetch(`${getBase()}/preferences`, {
      headers: getApiHeaders({}, false),
    })
    return parseJson(res, 'Failed to load notification preferences')
  },

  async updatePreferences(
    updates: Partial<
      Pick<
        UserNotificationPreferences,
        | 'inAppEnabled'
        | 'emailEnabled'
        | 'activityReminders'
        | 'weeklyReportReminders'
        | 'submissionUpdates'
        | 'reviewUpdates'
        | 'scheduleUpdates'
      >
    >
  ): Promise<UserNotificationPreferences> {
    const res = await fetch(`${getBase()}/preferences`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(updates),
    })
    return parseJson(res, 'Failed to save notification preferences')
  },
}
