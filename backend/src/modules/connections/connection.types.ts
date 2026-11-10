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

export const VALID_MENTORSHIP_PURPOSES: MentorshipPurpose[] = [
  'UNDERSTAND_PROJECT',
  'LEARN_TECH_STACK',
  'UNDERSTAND_ARCHITECTURE',
  'ACCESS_DOCUMENTATION',
  'EXPLORE_ENHANCEMENTS',
  'SEEK_MENTORSHIP',
  'DISCUSS_EXTENSION',
]

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
  createdAt: Date
  updatedAt: Date
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
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  closedAt?: Date
  closedBy?: string
}

export interface IMentorshipMessage {
  id: string
  connectionId: string
  senderId: string
  senderName: string
  senderRole: 'junior' | 'senior'
  content: string
  read: boolean
  createdAt: Date
}

export type NotificationType =
  | 'CONNECTION_REQUEST_RECEIVED'
  | 'CONNECTION_REQUEST_ACCEPTED'
  | 'CONNECTION_REQUEST_DECLINED'
  | 'CONNECTION_CANCELLED'
  | 'CONNECTION_BLOCKED'
  | 'NEW_MESSAGE_RECEIVED'

export interface INotification {
  id: string
  recipientId: string
  type: NotificationType
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
  createdAt: Date
}
