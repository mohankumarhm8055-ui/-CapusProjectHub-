import mongoose, { Schema, Document } from 'mongoose'
import { isMongoConnected } from '../../config/db.js'
import {
  IStudentProfile,
  IConnectionRequest,
  IMentorshipMessage,
  INotification,
  ConnectionStatus,
  MentorshipPurpose,
  NotificationType,
} from './connection.types.js'

// ==========================================
// 1. Mongoose Schemas & Documents
// ==========================================

export interface ProfileDocument extends Document, Omit<IStudentProfile, 'studentId'> {
  studentId: string
}

const ProfileSchema = new Schema<ProfileDocument>(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    graduationYear: { type: Schema.Types.Mixed, required: true },
    isAvailableForMentoring: { type: Boolean, default: false, index: true },
    skills: [{ type: String, trim: true }],
    bio: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    allowContactMethod: {
      type: String,
      enum: ['IN_APP_ONLY', 'EMAIL_ON_ACCEPT'],
      default: 'IN_APP_ONLY',
    },
    activeProjectsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const MongoProfileModel = mongoose.model<ProfileDocument>('StudentProfile', ProfileSchema)

export interface ConnectionDocument extends Document, Omit<IConnectionRequest, 'id'> {
  _id: mongoose.Types.ObjectId
}

const ConnectionSchema = new Schema<ConnectionDocument>(
  {
    projectId: { type: String, required: true, index: true },
    projectTitle: { type: String, required: true },
    juniorId: { type: String, required: true, index: true },
    juniorName: { type: String, required: true },
    seniorId: { type: String, required: true, index: true },
    seniorName: { type: String, required: true },
    purpose: {
      type: String,
      enum: [
        'UNDERSTAND_PROJECT',
        'LEARN_TECH_STACK',
        'UNDERSTAND_ARCHITECTURE',
        'ACCESS_DOCUMENTATION',
        'EXPLORE_ENHANCEMENTS',
        'SEEK_MENTORSHIP',
        'DISCUSS_EXTENSION',
      ],
      required: true,
    },
    note: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'BLOCKED'],
      default: 'PENDING',
      index: true,
    },
    declinedReason: { type: String, trim: true },
    expiresAt: { type: Date },
    closedAt: { type: Date },
    closedBy: { type: String },
  },
  { timestamps: true }
)

// Ensure efficient compound queries for duplicate checks and retrieval
ConnectionSchema.index({ juniorId: 1, seniorId: 1, projectId: 1, status: 1 })

export const MongoConnectionModel = mongoose.model<ConnectionDocument>('Connection', ConnectionSchema)

export interface MessageDocument extends Document, Omit<IMentorshipMessage, 'id'> {
  _id: mongoose.Types.ObjectId
}

const MessageSchema = new Schema<MessageDocument>(
  {
    connectionId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['junior', 'senior'], required: true },
    content: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const MongoMessageModel = mongoose.model<MessageDocument>('MentorshipMessage', MessageSchema)

export interface NotificationDocument extends Document, Omit<INotification, 'id'> {
  _id: mongoose.Types.ObjectId
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    recipientId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'CONNECTION_REQUEST_RECEIVED',
        'CONNECTION_REQUEST_ACCEPTED',
        'CONNECTION_REQUEST_DECLINED',
        'CONNECTION_CANCELLED',
        'CONNECTION_BLOCKED',
        'NEW_MESSAGE_RECEIVED',
        'SCHEDULE_PUBLISHED',
        'SCHEDULE_DEADLINE_UPDATED',
        'SCHEDULE_REQUIREMENTS_UPDATED',
        'ACTIVITY_DEADLINE_UPCOMING',
        'ACTIVITY_DUE_TOMORROW',
        'ACTIVITY_DUE_TODAY',
        'ACTIVITY_OVERDUE',
        'ACTIVITY_DEADLINE_REVISED',
        'WEEKLY_REPORT_APPROACHING',
        'WEEKLY_REPORT_DUE',
        'WEEKLY_REPORT_OVERDUE',
        'ACTIVITY_SUBMISSION_RECEIVED',
        'ACTIVITY_SENT_FOR_REVIEW',
        'WEEKLY_REPORT_SUBMITTED',
        'SUBMISSION_CHANGES_REQUESTED',
        'SUBMISSION_FEEDBACK_ADDED',
        'SUBMISSION_APPROVED',
        'SUBMISSION_REJECTED',
        'WEEKLY_REPORT_CLARIFICATION_REQUESTED',
        'WEEKLY_REPORT_FINALIZED',
        'FINAL_REVIEW_REQUESTED',
        'FINAL_CORRECTIONS_REQUIRED',
        'FINAL_COMPLETION_APPROVED',
        'PUBLICATION_DRAFT_READY',
        'PROJECT_PUBLISHED',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['ACTIVITY', 'WEEKLY_REPORT', 'SUBMISSION', 'REVIEW', 'SCHEDULE', 'PUBLICATION', 'MENTORSHIP'],
      default: 'MENTORSHIP',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: { type: String },
    deduplicationKey: { type: String },
    deadlineVersion: { type: Number },
    deliveryStatus: {
      type: String,
      enum: ['DELIVERED', 'PENDING', 'FAILED', 'SKIPPED_PREFERENCE'],
      default: 'DELIVERED',
    },
    emailDeliveryStatus: {
      type: String,
      enum: ['NOT_CONFIGURED', 'SKIPPED', 'SENT', 'FAILED'],
      default: 'NOT_CONFIGURED',
    },
    deliveryError: { type: String },
    cleared: { type: Boolean, default: false, index: true },
    data: {
      connectionId: { type: String },
      projectId: { type: String },
      projectTitle: { type: String },
      scheduleId: { type: String },
      activityId: { type: String },
      reportId: { type: String },
      submissionId: { type: String },
      weekNumber: { type: Number },
      senderId: { type: String },
      senderName: { type: String },
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

NotificationSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true })
NotificationSchema.index({ recipientId: 1, cleared: 1, createdAt: -1 })

export const MongoNotificationModel = mongoose.model<NotificationDocument>('Notification', NotificationSchema)

// ==========================================
// 2. In-Memory Store Implementations (Dual-Mode)
// ==========================================

const INITIAL_PROFILES: IStudentProfile[] = [
  {
    studentId: 'senior-alex-chen',
    displayName: 'Alex Chen',
    department: 'Computer Science and Engineering',
    graduationYear: 2025,
    isAvailableForMentoring: true,
    skills: ['React', 'Node.js', 'MongoDB', 'System Design', 'Socket.io'],
    bio: 'Lead architect on CampusProjectHub capstone. Passionate about helping juniors with system architecture and full-stack engineering.',
    email: 'alex.chen@campusprojecthub.edu',
    phone: '+1 (555) 234-5678',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 2,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-priya-patel',
    displayName: 'Priya Patel',
    department: 'Computer Science and Engineering',
    graduationYear: 2025,
    isAvailableForMentoring: true,
    skills: ['Python', 'FastAPI', 'PyTorch', 'Computer Vision', 'Jaccard Similarity'],
    bio: 'Core AI developer on campus project similarity and feature evaluation engines. Happy to mentor juniors on NLP and AI integration.',
    email: 'priya.patel@campusprojecthub.edu',
    phone: '+1 (555) 345-6789',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-marcus-vance',
    displayName: 'Marcus Vance',
    department: 'Robotics & Automation',
    graduationYear: 2024,
    isAvailableForMentoring: false, // Explicitly opted out / busy
    skills: ['ROS', 'C++', 'SLAM', 'LiDAR Sensor Fusion'],
    bio: 'Autonomous navigation researcher. Currently preparing for graduate school, unavailable for direct mentoring.',
    email: 'marcus.vance@campusprojecthub.edu',
    phone: '+1 (555) 456-7890',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-ananya-sharma',
    displayName: 'Ananya Sharma',
    department: 'Computer Science & Engineering',
    graduationYear: 2026,
    isAvailableForMentoring: true,
    skills: ['Python', 'Flask', 'React', 'Scikit-learn', 'SHAP'],
    bio: 'ML Pipeline Lead on the AI Healthcare Prediction System. Available to mentor juniors on model validation and explainable AI.',
    email: 'ananya.sharma@rvce.edu.in',
    phone: '+91 98450 11223',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-rohan-verma',
    displayName: 'Rohan Verma',
    department: 'Computer Science & Engineering',
    graduationYear: 2026,
    isAvailableForMentoring: false,
    skills: ['React', 'PostgreSQL', 'Flask', 'Docker'],
    bio: 'Full Stack Engineer on AI Healthcare Prediction System. Currently occupied with internship commitments.',
    email: 'rohan.verma@rvce.edu.in',
    phone: '+91 98450 22334',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-kiran-kumar',
    displayName: 'Kiran Kumar',
    department: 'Information Science & Engineering',
    graduationYear: 2026,
    isAvailableForMentoring: true,
    skills: ['Python', 'OpenCV', 'React', 'Node.js', 'MongoDB'],
    bio: 'Computer Vision Architect for Smart Attendance Management System. Happy to share lessons on classroom lighting hurdles and QR alternatives.',
    email: 'kiran.kumar@rvce.edu.in',
    phone: '+91 98450 33445',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-pooja-hegde',
    displayName: 'Pooja Hegde',
    department: 'Information Science & Engineering',
    graduationYear: 2026,
    isAvailableForMentoring: true,
    skills: ['React', 'Node.js', 'MongoDB', 'MySQL'],
    bio: 'Frontend & API Engineer. Available for mentoring on REST API integration and database schema normalization.',
    email: 'pooja.hegde@rvce.edu.in',
    phone: '+91 98450 44556',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 2,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-deepak-rao',
    displayName: 'Deepak Rao',
    department: 'Computer Science & Engineering',
    graduationYear: 2025,
    isAvailableForMentoring: true,
    skills: ['TypeScript', 'Next.js', 'Neo4j', 'PostgreSQL'],
    bio: 'Team Lead on Smart Learning Platform & Course Recommender. Open to advising on graph data modeling.',
    email: 'deepak.rao@rvce.edu.in',
    phone: '+91 98450 55667',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-varun-nair',
    displayName: 'Varun Nair',
    department: 'Information Science & Engineering',
    graduationYear: 2025,
    isAvailableForMentoring: false,
    skills: ['Node.js', 'Redis', 'PostgreSQL', 'React'],
    bio: 'Backend Lead for E-Commerce Concurrency Locking. Currently unavailable for direct mentoring.',
    email: 'varun.nair@rvce.edu.in',
    phone: '+91 98450 66778',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-siddharth-m',
    displayName: 'Siddharth M',
    department: 'Data Science & Artificial Intelligence',
    graduationYear: 2024,
    isAvailableForMentoring: true,
    skills: ['Python', 'FastAPI', 'React', 'SQLite'],
    bio: 'Data Scientist for Student Performance Analytics. Glad to discuss academic early-warning modeling.',
    email: 'siddharth.m@rvce.edu.in',
    phone: '+91 98450 77889',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-harish-gowda',
    displayName: 'Harish Gowda',
    department: 'Computer Science & Engineering',
    graduationYear: 2024,
    isAvailableForMentoring: false,
    skills: ['TypeScript', 'Express', 'React', 'PostgreSQL'],
    bio: 'Full Stack Developer on Campus Event Management.',
    email: 'harish.gowda@rvce.edu.in',
    phone: '+91 98450 88990',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
  {
    studentId: 'senior-karthik-rao',
    displayName: 'Karthik Rao',
    department: 'Computer Science & Engineering',
    graduationYear: 2024,
    isAvailableForMentoring: true,
    skills: ['JavaScript', 'Node.js', 'Express', 'React', 'MySQL'],
    bio: 'Full Stack Developer on Academic Project Management Portal.',
    email: 'karthik.rao@rvce.edu.in',
    phone: '+91 98450 99001',
    allowContactMethod: 'IN_APP_ONLY',
    activeProjectsCount: 1,
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01'),
  },
]

class InMemoryProfileStore {
  private profiles: Map<string, IStudentProfile> = new Map()

  constructor() {
    INITIAL_PROFILES.forEach((p) => this.profiles.set(p.studentId, { ...p }))
  }

  async get(studentId: string): Promise<IStudentProfile | null> {
    return this.profiles.get(studentId) || null
  }

  async set(profile: IStudentProfile): Promise<IStudentProfile> {
    this.profiles.set(profile.studentId, { ...profile, updatedAt: new Date() })
    return this.profiles.get(profile.studentId)!
  }

  async findByQuery(query: Partial<IStudentProfile>): Promise<IStudentProfile[]> {
    return Array.from(this.profiles.values()).filter((p) => {
      for (const [key, val] of Object.entries(query)) {
        if ((p as any)[key] !== val) return false
      }
      return true
    })
  }

  clear() {
    this.profiles.clear()
    INITIAL_PROFILES.forEach((p) => this.profiles.set(p.studentId, { ...p }))
  }
}

class InMemoryConnectionStore {
  private connections: Map<string, IConnectionRequest> = new Map()

  async get(id: string): Promise<IConnectionRequest | null> {
    return this.connections.get(id) || null
  }

  async create(data: Omit<IConnectionRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<IConnectionRequest> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const now = new Date()
    const conn: IConnectionRequest = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.connections.set(id, conn)
    return conn
  }

  async update(id: string, updates: Partial<IConnectionRequest>): Promise<IConnectionRequest | null> {
    const existing = this.connections.get(id)
    if (!existing) return null
    const updated = { ...existing, ...updates, updatedAt: new Date() }
    this.connections.set(id, updated)
    return updated
  }

  async find(filter: {
    juniorId?: string
    seniorId?: string
    projectId?: string
    status?: ConnectionStatus
    userId?: string
  }): Promise<IConnectionRequest[]> {
    return Array.from(this.connections.values()).filter((c) => {
      if (filter.projectId && c.projectId !== filter.projectId) return false
      if (filter.status && c.status !== filter.status) return false
      if (filter.userId && c.juniorId !== filter.userId && c.seniorId !== filter.userId) return false
      if (filter.juniorId && c.juniorId !== filter.juniorId) return false
      if (filter.seniorId && c.seniorId !== filter.seniorId) return false
      return true
    })
  }

  clear() {
    this.connections.clear()
  }
}

class InMemoryMessageStore {
  private messages: Map<string, IMentorshipMessage> = new Map()

  async create(data: Omit<IMentorshipMessage, 'id' | 'createdAt'>): Promise<IMentorshipMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const msg: IMentorshipMessage = {
      ...data,
      id,
      createdAt: new Date(),
    }
    this.messages.set(id, msg)
    return msg
  }

  async findByConnectionId(connectionId: string): Promise<IMentorshipMessage[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.connectionId === connectionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async markAsRead(connectionId: string, recipientUserId: string): Promise<number> {
    let count = 0
    for (const msg of this.messages.values()) {
      if (msg.connectionId === connectionId && msg.senderId !== recipientUserId && !msg.read) {
        msg.read = true
        count++
      }
    }
    return count
  }

  clear() {
    this.messages.clear()
  }
}

class InMemoryNotificationStore {
  private notifications: Map<string, INotification> = new Map()

  async create(data: Omit<INotification, 'id' | 'createdAt'>): Promise<INotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const notif: INotification = {
      ...data,
      id,
      createdAt: new Date(),
    }
    this.notifications.set(id, notif)
    return notif
  }

  async findByRecipient(recipientId: string): Promise<INotification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.recipientId === recipientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<boolean> {
    const notif = this.notifications.get(notificationId)
    if (notif && notif.recipientId === recipientId) {
      notif.read = true
      return true
    }
    return false
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    let count = 0
    for (const notif of this.notifications.values()) {
      if (notif.recipientId === recipientId && !notif.read) {
        notif.read = true
        count++
      }
    }
    return count
  }

  clear() {
    this.notifications.clear()
  }
}

export const inMemoryProfileStore = new InMemoryProfileStore()
export const inMemoryConnectionStore = new InMemoryConnectionStore()
export const inMemoryMessageStore = new InMemoryMessageStore()
export const inMemoryNotificationStore = new InMemoryNotificationStore()

export async function seedMentorProfiles(): Promise<void> {
  if (!isMongoConnected()) {
    return
  }

  for (const profile of INITIAL_PROFILES) {
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...profileData } = profile
    await MongoProfileModel.updateOne(
      { studentId: profile.studentId },
      { $setOnInsert: profileData },
      { upsert: true }
    )
  }
}
