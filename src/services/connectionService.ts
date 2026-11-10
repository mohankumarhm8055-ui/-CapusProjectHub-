// Client Service for Senior-Junior Connection Intelligence (TASK 9)

export type ConnectionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'BLOCKED'

export type MentorshipPurpose =
  | 'UNDERSTAND_PROJECT'
  | 'LEARN_TECH_STACK'
  | 'UNDERSTAND_ARCHITECTURE'
  | 'ACCESS_DOCUMENTATION'
  | 'EXPLORE_ENHANCEMENTS'
  | 'SEEK_MENTORSHIP'
  | 'DISCUSS_EXTENSION'

export interface IStudentProfile {
  studentId: string
  displayName: string
  department: string
  graduationYear: number | string
  isAvailableForMentoring: boolean
  skills: string[]
  bio?: string
  email?: string
  phone?: string
  allowContactMethod?: 'IN_APP_ONLY' | 'EMAIL_ON_ACCEPT'
  activeProjectsCount?: number
}

export interface IPublicStudentProfile {
  studentId: string
  displayName: string
  department: string
  graduationYear: number | string
  isAvailableForMentoring: boolean
  skills: string[]
  bio?: string
  allowContactMethod?: 'IN_APP_ONLY' | 'EMAIL_ON_ACCEPT'
}

export interface IConnectionRequest {
  id: string
  projectId: string
  projectTitle: string
  juniorId: string
  juniorName: string
  seniorId: string
  seniorName: string
  purpose: MentorshipPurpose
  note: string
  status: ConnectionStatus
  declinedReason?: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

export interface IMentorshipMessage {
  id: string
  connectionId: string
  senderId: string
  senderName: string
  senderRole: 'junior' | 'senior'
  content: string
  read: boolean
  createdAt: string
}

export interface INotification {
  id: string
  recipientId: string
  type: string
  title: string
  message: string
  data?: {
    connectionId?: string
    projectId?: string
    projectTitle?: string
    senderId?: string
    senderName?: string
  }
  read: boolean
  createdAt: string
}

import { getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/connections`

const getHeaders = (_studentId?: string) => getApiHeaders()

export const connectionService = {
  // Profiles
  async getMyProfile(_studentId?: string): Promise<IStudentProfile> {
    const res = await fetch(`${getBase()}/profile/me`, {
      headers: getHeaders(),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to fetch profile')
    return json.data
  },

  async updateMyProfile(updates: Partial<IStudentProfile>, studentId?: string): Promise<IStudentProfile> {
    const res = await fetch(`${getBase()}/profile/me`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to update profile')
    return json.data
  },

  async getPublicProfile(targetStudentId: string, studentId?: string): Promise<IPublicStudentProfile> {
    const res = await fetch(`${getBase()}/profile/${targetStudentId}`, {
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to fetch public profile')
    return json.data
  },

  // Connection Requests
  async createRequest(
    data: {
      projectId: string
      projectTitle: string
      seniorId: string
      seniorName?: string
      purpose: MentorshipPurpose
      note: string
      juniorName?: string
    },
    studentId?: string
  ): Promise<IConnectionRequest> {
    const res = await fetch(`${getBase()}/requests`, {
      method: 'POST',
      headers: getHeaders(studentId),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || 'Failed to create connection request')
    }
    return json.data
  },

  async listRequests(
    filters?: { status?: ConnectionStatus; role?: 'junior' | 'senior' },
    studentId?: string
  ): Promise<IConnectionRequest[]> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.role) params.append('role', filters.role)

    const res = await fetch(`${getBase()}/requests?${params.toString()}`, {
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to fetch requests')
    return json.data
  },

  async acceptRequest(requestId: string, studentId?: string): Promise<IConnectionRequest> {
    const res = await fetch(`${getBase()}/${requestId}/accept`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to accept request')
    return json.data
  },

  async declineRequest(requestId: string, reason?: string, studentId?: string): Promise<IConnectionRequest> {
    const res = await fetch(`${getBase()}/${requestId}/decline`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
      body: JSON.stringify({ reason }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to decline request')
    return json.data
  },

  async cancelRequest(requestId: string, studentId?: string): Promise<IConnectionRequest> {
    const res = await fetch(`${getBase()}/${requestId}/cancel`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to cancel request')
    return json.data
  },

  async blockConnection(connectionId: string, studentId?: string): Promise<IConnectionRequest> {
    const res = await fetch(`${getBase()}/${connectionId}/block`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to block connection')
    return json.data
  },

  // Messaging
  async getMessages(connectionId: string, studentId?: string): Promise<IMentorshipMessage[]> {
    const res = await fetch(`${getBase()}/${connectionId}/messages`, {
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to fetch messages')
    return json.data
  },

  async sendMessage(
    connectionId: string,
    content: string,
    senderName?: string,
    studentId?: string
  ): Promise<IMentorshipMessage> {
    const res = await fetch(`${getBase()}/${connectionId}/messages`, {
      method: 'POST',
      headers: getHeaders(studentId),
      body: JSON.stringify({ content, senderName }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to send message')
    return json.data
  },

  async markMessagesRead(connectionId: string, studentId?: string): Promise<number> {
    const res = await fetch(`${getBase()}/${connectionId}/messages/read`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    return json.markedCount || 0
  },

  // Notifications
  async getNotifications(studentId?: string): Promise<INotification[]> {
    const res = await fetch(`${getBase()}/notifications`, {
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error?.message || 'Failed to fetch notifications')
    return json.data
  },

  async markAllNotificationsRead(studentId?: string): Promise<number> {
    const res = await fetch(`${getBase()}/notifications/read-all`, {
      method: 'PATCH',
      headers: getHeaders(studentId),
    })
    const json = await res.json()
    return json.markedCount || 0
  },
}
