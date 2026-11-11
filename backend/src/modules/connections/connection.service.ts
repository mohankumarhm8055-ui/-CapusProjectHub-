import mongoose from 'mongoose'
import { isMongoConnected, assertPersistenceAvailable } from '../../config/db.js'
import {
  IStudentProfile,
  IPublicStudentProfile,
  IConnectionRequest,
  IMentorshipMessage,
  INotification,
  ConnectionStatus,
  MentorshipPurpose,
  VALID_MENTORSHIP_PURPOSES,
} from './connection.types.js'
import {
  MongoProfileModel,
  MongoConnectionModel,
  MongoMessageModel,
  MongoNotificationModel,
  inMemoryProfileStore,
  inMemoryConnectionStore,
  inMemoryMessageStore,
  inMemoryNotificationStore,
} from './connection.model.js'

export class ConnectionService {
  // ==========================================
  // 1. Profile Management & Privacy
  // ==========================================

  async getProfile(studentId: string, requesterId?: string): Promise<IStudentProfile | IPublicStudentProfile | null> {
    let profile: IStudentProfile | null = null

    if (isMongoConnected()) {
      const doc = await MongoProfileModel.findOne({ studentId }).lean()
      if (doc) {
        profile = {
          studentId: doc.studentId,
          displayName: doc.displayName,
          department: doc.department,
          graduationYear: doc.graduationYear,
          isAvailableForMentoring: doc.isAvailableForMentoring,
          skills: doc.skills || [],
          bio: doc.bio,
          email: doc.email,
          phone: doc.phone,
          allowContactMethod: doc.allowContactMethod,
          activeProjectsCount: doc.activeProjectsCount,
          createdAt: (doc as any).createdAt || new Date(),
          updatedAt: (doc as any).updatedAt || new Date(),
        }
      }
    } else {
      assertPersistenceAvailable('mentorship profiles')
      profile = await inMemoryProfileStore.get(studentId)
    }

    if (!profile) {
      // Auto-create basic profile if not exists
      profile = {
        studentId,
        displayName: studentId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        department: 'Engineering',
        graduationYear: new Date().getFullYear(),
        isAvailableForMentoring: false,
        skills: ['Software Engineering'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      if (isMongoConnected()) {
        await MongoProfileModel.create(profile)
      } else {
        assertPersistenceAvailable('mentorship profiles')
        await inMemoryProfileStore.set(profile)
      }
    }

    // Default Privacy: If requester is NOT the student, sanitize profile (never reveal email or phone)
    if (requesterId !== studentId) {
      const publicProfile: IPublicStudentProfile = {
        studentId: profile.studentId,
        displayName: profile.displayName,
        department: profile.department,
        graduationYear: profile.graduationYear,
        isAvailableForMentoring: profile.isAvailableForMentoring,
        skills: profile.skills,
        bio: profile.bio,
        allowContactMethod: profile.allowContactMethod,
      }
      return publicProfile
    }

    return profile
  }

  async updateProfile(studentId: string, updates: Partial<IStudentProfile>): Promise<IStudentProfile> {
    const existing = (await this.getProfile(studentId, studentId)) as IStudentProfile

    const updated: IStudentProfile = {
      ...existing,
      ...updates,
      studentId, // immutable
      updatedAt: new Date(),
    }

    if (isMongoConnected()) {
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...mongoSafeUpdates } = updated
      await MongoProfileModel.findOneAndUpdate(
        { studentId },
        { $set: mongoSafeUpdates },
        { upsert: true, new: true }
      )
    } else {
      assertPersistenceAvailable('mentorship profiles')
      await inMemoryProfileStore.set(updated)
    }

    return updated
  }

  // ==========================================
  // 2. Connection Request Lifecycle
  // ==========================================

  async createConnectionRequest(params: {
    juniorId: string
    juniorName: string
    seniorId: string
    seniorName?: string
    projectId: string
    projectTitle: string
    purpose: MentorshipPurpose
    note: string
  }): Promise<IConnectionRequest> {
    const { juniorId, juniorName, seniorId, projectId, projectTitle, purpose, note } = params

    // 1. Self-connection check
    if (juniorId === seniorId) {
      const error: any = new Error('Self-connection prohibited: You cannot send a connection request to yourself.')
      error.status = 400
      error.code = 'SELF_CONNECTION_PROHIBITED'
      throw error
    }

    // 2. Purpose validation
    if (!VALID_MENTORSHIP_PURPOSES.includes(purpose)) {
      const error: any = new Error(`Invalid mentorship purpose. Must be one of: ${VALID_MENTORSHIP_PURPOSES.join(', ')}`)
      error.status = 400
      error.code = 'INVALID_PURPOSE'
      throw error
    }

    // 3. Note validation
    if (!note || note.trim().length < 10) {
      const error: any = new Error('Connection request note must be at least 10 characters explaining your learning goal.')
      error.status = 400
      error.code = 'INVALID_NOTE'
      throw error
    }

    // 4. Senior availability check
    const seniorProfile = (await this.getProfile(seniorId, juniorId)) as IPublicStudentProfile
    if (seniorProfile && !seniorProfile.isAvailableForMentoring) {
      const error: any = new Error(
        `Senior contributor ${seniorProfile.displayName} is currently not accepting new mentorship requests.`
      )
      error.status = 400
      error.code = 'MENTOR_UNAVAILABLE'
      throw error
    }

    // 5. Existing Duplicate or Block Check
    let existingConnections: IConnectionRequest[] = []
    if (isMongoConnected()) {
      const docs = await MongoConnectionModel.find({
        juniorId,
        seniorId,
        projectId,
      }).lean()
      existingConnections = docs.map((d) => ({
        id: d._id.toString(),
        projectId: d.projectId,
        projectTitle: d.projectTitle,
        juniorId: d.juniorId,
        juniorName: d.juniorName,
        seniorId: d.seniorId,
        seniorName: d.seniorName,
        purpose: d.purpose,
        note: d.note,
        status: d.status,
        declinedReason: d.declinedReason,
        createdAt: (d as any).createdAt,
        updatedAt: (d as any).updatedAt,
      }))
    } else {
      assertPersistenceAvailable('connections')
      existingConnections = await inMemoryConnectionStore.find({
        juniorId,
        seniorId,
        projectId,
      })
    }

    const hasPending = existingConnections.some((c) => c.status === 'PENDING')
    if (hasPending) {
      const error: any = new Error(
        'A pending mentorship request already exists for this senior contributor and project.'
      )
      error.status = 409
      error.code = 'DUPLICATE_PENDING_REQUEST'
      throw error
    }

    const isBlocked = existingConnections.some((c) => c.status === 'BLOCKED')
    if (isBlocked) {
      const error: any = new Error('Communication is blocked between these accounts.')
      error.status = 403
      error.code = 'CONNECTION_BLOCKED'
      throw error
    }

    // 6. Create request in PENDING state
    const resolvedSeniorName = params.seniorName || seniorProfile?.displayName || 'Senior Contributor'
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days expiration

    let createdRequest: IConnectionRequest

    if (isMongoConnected()) {
      const doc = await MongoConnectionModel.create({
        projectId,
        projectTitle,
        juniorId,
        juniorName,
        seniorId,
        seniorName: resolvedSeniorName,
        purpose,
        note: note.trim(),
        status: 'PENDING',
        expiresAt,
      })
      createdRequest = {
        id: doc._id.toString(),
        projectId: doc.projectId,
        projectTitle: doc.projectTitle,
        juniorId: doc.juniorId,
        juniorName: doc.juniorName,
        seniorId: doc.seniorId,
        seniorName: doc.seniorName,
        purpose: doc.purpose,
        note: doc.note,
        status: doc.status,
        expiresAt: doc.expiresAt,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      }
    } else {
      assertPersistenceAvailable('connections')
      createdRequest = await inMemoryConnectionStore.create({
        projectId,
        projectTitle,
        juniorId,
        juniorName,
        seniorId,
        seniorName: resolvedSeniorName,
        purpose,
        note: note.trim(),
        status: 'PENDING',
        expiresAt,
      })
    }

    // 7. Dispatch notification to Senior
    await this.createNotification({
      recipientId: seniorId,
      type: 'CONNECTION_REQUEST_RECEIVED',
      title: 'New Mentorship Request',
      message: `${juniorName} requested guidance on project "${projectTitle}" for ${purpose.replace(/_/g, ' ')}.`,
      data: {
        connectionId: createdRequest.id,
        projectId,
        projectTitle,
        senderId: juniorId,
        senderName: juniorName,
      },
    })

    return createdRequest
  }

  async acceptConnectionRequest(requestId: string, seniorId: string): Promise<IConnectionRequest> {
    const conn = await this.getConnectionById(requestId)
    if (!conn) {
      const error: any = new Error('Connection request not found')
      error.status = 404
      throw error
    }

    if (conn.seniorId !== seniorId) {
      const error: any = new Error('Unauthorized: Only the requested senior can accept this mentorship request.')
      error.status = 403
      throw error
    }

    if (conn.status !== 'PENDING') {
      const error: any = new Error(`Cannot accept request in status: ${conn.status}`)
      error.status = 400
      throw error
    }

    let updated: IConnectionRequest
    if (isMongoConnected()) {
      const doc = await MongoConnectionModel.findByIdAndUpdate(
        requestId,
        { $set: { status: 'ACCEPTED', updatedAt: new Date() } },
        { new: true }
      )
      updated = {
        id: doc!._id.toString(),
        projectId: doc!.projectId,
        projectTitle: doc!.projectTitle,
        juniorId: doc!.juniorId,
        juniorName: doc!.juniorName,
        seniorId: doc!.seniorId,
        seniorName: doc!.seniorName,
        purpose: doc!.purpose,
        note: doc!.note,
        status: doc!.status,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      }
    } else {
      assertPersistenceAvailable('connections')
      updated = (await inMemoryConnectionStore.update(requestId, { status: 'ACCEPTED' }))!
    }

    // Notify Junior of acceptance
    await this.createNotification({
      recipientId: conn.juniorId,
      type: 'CONNECTION_REQUEST_ACCEPTED',
      title: 'Mentorship Request Accepted',
      message: `${conn.seniorName} accepted your guidance request for "${conn.projectTitle}". Direct messaging is now enabled!`,
      data: {
        connectionId: conn.id,
        projectId: conn.projectId,
        projectTitle: conn.projectTitle,
        senderId: seniorId,
        senderName: conn.seniorName,
      },
    })

    return updated
  }

  async declineConnectionRequest(requestId: string, seniorId: string, reason?: string): Promise<IConnectionRequest> {
    const conn = await this.getConnectionById(requestId)
    if (!conn) {
      const error: any = new Error('Connection request not found')
      error.status = 404
      throw error
    }

    if (conn.seniorId !== seniorId) {
      const error: any = new Error('Unauthorized: Only the requested senior can decline this request.')
      error.status = 403
      throw error
    }

    if (conn.status !== 'PENDING') {
      const error: any = new Error(`Cannot decline request in status: ${conn.status}`)
      error.status = 400
      throw error
    }

    let updated: IConnectionRequest
    if (isMongoConnected()) {
      const doc = await MongoConnectionModel.findByIdAndUpdate(
        requestId,
        { $set: { status: 'DECLINED', declinedReason: reason, updatedAt: new Date() } },
        { new: true }
      )
      updated = {
        id: doc!._id.toString(),
        projectId: doc!.projectId,
        projectTitle: doc!.projectTitle,
        juniorId: doc!.juniorId,
        juniorName: doc!.juniorName,
        seniorId: doc!.seniorId,
        seniorName: doc!.seniorName,
        purpose: doc!.purpose,
        note: doc!.note,
        status: doc!.status,
        declinedReason: doc!.declinedReason,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      }
    } else {
      assertPersistenceAvailable('connections')
      updated = (await inMemoryConnectionStore.update(requestId, {
        status: 'DECLINED',
        declinedReason: reason,
      }))!
    }

    // Notify Junior of decline politely
    await this.createNotification({
      recipientId: conn.juniorId,
      type: 'CONNECTION_REQUEST_DECLINED',
      title: 'Mentorship Request Update',
      message: `${conn.seniorName} was unable to accept your request for "${conn.projectTitle}" at this time.`,
      data: {
        connectionId: conn.id,
        projectId: conn.projectId,
        projectTitle: conn.projectTitle,
        senderId: seniorId,
        senderName: conn.seniorName,
      },
    })

    return updated
  }

  async cancelConnectionRequest(requestId: string, juniorId: string): Promise<IConnectionRequest> {
    const conn = await this.getConnectionById(requestId)
    if (!conn) {
      const error: any = new Error('Connection request not found')
      error.status = 404
      throw error
    }

    if (conn.juniorId !== juniorId) {
      const error: any = new Error('Unauthorized: Only the junior requester can cancel this request.')
      error.status = 403
      throw error
    }

    if (conn.status !== 'PENDING') {
      const error: any = new Error(`Cannot cancel request in status: ${conn.status}`)
      error.status = 400
      throw error
    }

    let updated: IConnectionRequest
    if (isMongoConnected()) {
      const doc = await MongoConnectionModel.findByIdAndUpdate(
        requestId,
        { $set: { status: 'CANCELLED', updatedAt: new Date() } },
        { new: true }
      )
      updated = {
        id: doc!._id.toString(),
        projectId: doc!.projectId,
        projectTitle: doc!.projectTitle,
        juniorId: doc!.juniorId,
        juniorName: doc!.juniorName,
        seniorId: doc!.seniorId,
        seniorName: doc!.seniorName,
        purpose: doc!.purpose,
        note: doc!.note,
        status: doc!.status,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      }
    } else {
      assertPersistenceAvailable('connections')
      updated = (await inMemoryConnectionStore.update(requestId, { status: 'CANCELLED' }))!
    }

    return updated
  }

  async blockConnection(connectionId: string, userId: string): Promise<IConnectionRequest> {
    const conn = await this.getConnectionById(connectionId)
    if (!conn) {
      const error: any = new Error('Connection not found')
      error.status = 404
      throw error
    }

    if (conn.juniorId !== userId && conn.seniorId !== userId) {
      const error: any = new Error('Unauthorized: You are not a participant in this connection.')
      error.status = 403
      throw error
    }

    let updated: IConnectionRequest
    if (isMongoConnected()) {
      const doc = await MongoConnectionModel.findByIdAndUpdate(
        connectionId,
        { $set: { status: 'BLOCKED', closedAt: new Date(), closedBy: userId } },
        { new: true }
      )
      updated = {
        id: doc!._id.toString(),
        projectId: doc!.projectId,
        projectTitle: doc!.projectTitle,
        juniorId: doc!.juniorId,
        juniorName: doc!.juniorName,
        seniorId: doc!.seniorId,
        seniorName: doc!.seniorName,
        purpose: doc!.purpose,
        note: doc!.note,
        status: doc!.status,
        closedAt: doc!.closedAt,
        closedBy: doc!.closedBy,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      }
    } else {
      assertPersistenceAvailable('connections')
      updated = (await inMemoryConnectionStore.update(connectionId, {
        status: 'BLOCKED',
        closedAt: new Date(),
        closedBy: userId,
      }))!
    }

    return updated
  }

  async getConnectionById(connectionId: string): Promise<IConnectionRequest | null> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(connectionId)) return null
      const doc = await MongoConnectionModel.findById(connectionId).lean()
      if (!doc) return null
      return {
        id: doc._id.toString(),
        projectId: doc.projectId,
        projectTitle: doc.projectTitle,
        juniorId: doc.juniorId,
        juniorName: doc.juniorName,
        seniorId: doc.seniorId,
        seniorName: doc.seniorName,
        purpose: doc.purpose,
        note: doc.note,
        status: doc.status,
        declinedReason: doc.declinedReason,
        expiresAt: doc.expiresAt,
        closedAt: doc.closedAt,
        closedBy: doc.closedBy,
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      }
    }
    assertPersistenceAvailable('connections')
    return inMemoryConnectionStore.get(connectionId)
  }

  async listUserConnections(userId: string, filter?: { status?: ConnectionStatus; role?: 'junior' | 'senior' }): Promise<IConnectionRequest[]> {
    if (isMongoConnected()) {
      const query: any = {}
      if (filter?.role === 'junior') {
        query.juniorId = userId
      } else if (filter?.role === 'senior') {
        query.seniorId = userId
      } else {
        query.$or = [{ juniorId: userId }, { seniorId: userId }]
      }

      if (filter?.status) {
        query.status = filter.status
      }

      const docs = await MongoConnectionModel.find(query).sort({ updatedAt: -1 }).lean()
      return docs.map((d) => ({
        id: d._id.toString(),
        projectId: d.projectId,
        projectTitle: d.projectTitle,
        juniorId: d.juniorId,
        juniorName: d.juniorName,
        seniorId: d.seniorId,
        seniorName: d.seniorName,
        purpose: d.purpose,
        note: d.note,
        status: d.status,
        declinedReason: d.declinedReason,
        expiresAt: d.expiresAt,
        closedAt: d.closedAt,
        closedBy: d.closedBy,
        createdAt: (d as any).createdAt,
        updatedAt: (d as any).updatedAt,
      }))
    }

    assertPersistenceAvailable('connections')
    const all = await inMemoryConnectionStore.find({
      userId: filter?.role ? undefined : userId,
      juniorId: filter?.role === 'junior' ? userId : undefined,
      seniorId: filter?.role === 'senior' ? userId : undefined,
      status: filter?.status,
    })

    return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  // ==========================================
  // 3. Secure Messaging Channel
  // ==========================================

  async sendMessage(params: {
    connectionId: string
    senderId: string
    senderName: string
    content: string
  }): Promise<IMentorshipMessage> {
    const { connectionId, senderId, senderName, content } = params

    // 1. Fetch Connection and Verify Access
    const conn = await this.getConnectionById(connectionId)
    if (!conn) {
      const error: any = new Error('Connection not found')
      error.status = 404
      throw error
    }

    if (conn.juniorId !== senderId && conn.seniorId !== senderId) {
      const error: any = new Error('Unauthorized: You are not a participant in this connection.')
      error.status = 403
      throw error
    }

    // 2. Strict State Rule: Messaging ONLY allowed when ACCEPTED
    if (conn.status !== 'ACCEPTED') {
      const error: any = new Error(
        `Communication channel is locked. Messaging is only enabled for ACCEPTED connections (current status: ${conn.status}).`
      )
      error.status = 403
      error.code = 'COMMUNICATION_LOCKED'
      throw error
    }

    // 3. Content Validation
    if (!content || !content.trim() || content.trim().length > 2000) {
      const error: any = new Error('Message content must be between 1 and 2000 characters.')
      error.status = 400
      throw error
    }

    const senderRole = senderId === conn.juniorId ? 'junior' : 'senior'
    const recipientId = senderId === conn.juniorId ? conn.seniorId : conn.juniorId

    let message: IMentorshipMessage

    if (isMongoConnected()) {
      const doc = await MongoMessageModel.create({
        connectionId,
        senderId,
        senderName,
        senderRole,
        content: content.trim(),
        read: false,
      })
      message = {
        id: doc._id.toString(),
        connectionId: doc.connectionId,
        senderId: doc.senderId,
        senderName: doc.senderName,
        senderRole: doc.senderRole as any,
        content: doc.content,
        read: doc.read,
        createdAt: (doc as any).createdAt,
      }
    } else {
      assertPersistenceAvailable('mentorship messages')
      message = await inMemoryMessageStore.create({
        connectionId,
        senderId,
        senderName,
        senderRole,
        content: content.trim(),
        read: false,
      })
    }

    // Notify recipient of new message
    await this.createNotification({
      recipientId,
      type: 'NEW_MESSAGE_RECEIVED',
      title: `New message from ${senderName}`,
      message: content.length > 80 ? `${content.substring(0, 77)}...` : content,
      data: {
        connectionId,
        projectId: conn.projectId,
        projectTitle: conn.projectTitle,
        senderId,
        senderName,
      },
    })

    return message
  }

  async getMessages(connectionId: string, userId: string): Promise<IMentorshipMessage[]> {
    const conn = await this.getConnectionById(connectionId)
    if (!conn) {
      const error: any = new Error('Connection not found')
      error.status = 404
      throw error
    }

    if (conn.juniorId !== userId && conn.seniorId !== userId) {
      const error: any = new Error('Unauthorized: You are not a participant in this connection.')
      error.status = 403
      throw error
    }

    if (isMongoConnected()) {
      const docs = await MongoMessageModel.find({ connectionId }).sort({ createdAt: 1 }).lean()
      return docs.map((d) => ({
        id: d._id.toString(),
        connectionId: d.connectionId,
        senderId: d.senderId,
        senderName: d.senderName,
        senderRole: d.senderRole as any,
        content: d.content,
        read: d.read,
        createdAt: (d as any).createdAt,
      }))
    }

    assertPersistenceAvailable('mentorship messages')
    return inMemoryMessageStore.findByConnectionId(connectionId)
  }

  async markMessagesAsRead(connectionId: string, userId: string): Promise<number> {
    const conn = await this.getConnectionById(connectionId)
    if (!conn) return 0

    if (conn.juniorId !== userId && conn.seniorId !== userId) {
      return 0
    }

    if (isMongoConnected()) {
      const res = await MongoMessageModel.updateMany(
        { connectionId, senderId: { $ne: userId }, read: false },
        { $set: { read: true } }
      )
      return res.modifiedCount
    }

    assertPersistenceAvailable('mentorship messages')
    return inMemoryMessageStore.markAsRead(connectionId, userId)
  }

  // ==========================================
  // 4. Notifications System
  // ==========================================

  async createNotification(data: Omit<INotification, 'id' | 'createdAt' | 'read'>): Promise<INotification> {
    if (isMongoConnected()) {
      const doc = await MongoNotificationModel.create({ ...data, read: false })
      return {
        id: doc._id.toString(),
        recipientId: doc.recipientId,
        type: doc.type as any,
        title: doc.title,
        message: doc.message,
        data: doc.data as any,
        read: doc.read,
        createdAt: (doc as any).createdAt,
      }
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.create({ ...data, read: false })
  }

  async getNotifications(userId: string): Promise<INotification[]> {
    if (isMongoConnected()) {
      const docs = await MongoNotificationModel.find({
        recipientId: userId,
        cleared: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .lean()
      return docs.map((d: any) => ({
        id: d._id.toString(),
        recipientId: d.recipientId,
        type: d.type as any,
        category: d.category,
        title: d.title,
        message: d.message,
        actionUrl: d.actionUrl,
        deduplicationKey: d.deduplicationKey,
        deadlineVersion: d.deadlineVersion,
        deliveryStatus: d.deliveryStatus,
        emailDeliveryStatus: d.emailDeliveryStatus,
        deliveryError: d.deliveryError,
        cleared: Boolean(d.cleared),
        data: d.data as any,
        read: d.read,
        createdAt: d.createdAt,
      }))
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.findByRecipient(userId).then((list) =>
      list.filter((n) => !n.cleared)
    )
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(notificationId)) return false
      const doc = await MongoNotificationModel.findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { $set: { read: true } },
        { new: true }
      )
      return !!doc
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.markAsRead(notificationId, userId)
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    if (isMongoConnected()) {
      const res = await MongoNotificationModel.updateMany(
        { recipientId: userId, read: false },
        { $set: { read: true } }
      )
      return res.modifiedCount
    }
    assertPersistenceAvailable('notifications')
    return inMemoryNotificationStore.markAllAsRead(userId)
  }
}

export const connectionService = new ConnectionService()
