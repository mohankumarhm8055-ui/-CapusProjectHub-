import { Request, Response } from 'express'
import { z } from 'zod'
import { connectionService } from './connection.service.js'
import { VALID_MENTORSHIP_PURPOSES } from './connection.types.js'

// Validation Schemas
const CreateRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  projectTitle: z.string().min(1, 'Project title is required'),
  seniorId: z.string().min(1, 'Senior ID is required'),
  seniorName: z.string().optional(),
  purpose: z.enum([
    'UNDERSTAND_PROJECT',
    'LEARN_TECH_STACK',
    'UNDERSTAND_ARCHITECTURE',
    'ACCESS_DOCUMENTATION',
    'EXPLORE_ENHANCEMENTS',
    'SEEK_MENTORSHIP',
    'DISCUSS_EXTENSION',
  ]),
  note: z.string().min(10, 'Request note must be at least 10 characters').max(1500),
})

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  department: z.string().min(2).optional(),
  graduationYear: z.union([z.number(), z.string()]).optional(),
  isAvailableForMentoring: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().max(1000).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  allowContactMethod: z.enum(['IN_APP_ONLY', 'EMAIL_ON_ACCEPT']).optional(),
})

const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000),
})

export class ConnectionController {
  // --- Profile Endpoints ---

  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const studentId = req.user!.id
      const profile = await connectionService.getProfile(studentId, studentId)
      res.json({ success: true, data: profile })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to fetch student profile' },
      })
    }
  }

  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const studentId = req.user!.id
      const validated = UpdateProfileSchema.parse(req.body)
      const updated = await connectionService.updateProfile(studentId, validated)
      res.json({ success: true, data: updated })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message || 'Invalid profile updates' },
      })
    }
  }

  async getPublicProfile(req: Request, res: Response): Promise<void> {
    try {
      const studentId = String(req.params.studentId)
      const requesterId = req.user?.id
      const profile = await connectionService.getProfile(studentId, requesterId)
      if (!profile) {
        res.status(404).json({ success: false, error: { message: 'Profile not found' } })
        return
      }
      res.json({ success: true, data: profile })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to fetch public profile' },
      })
    }
  }

  // --- Connection Request Endpoints ---

  async createRequest(req: Request, res: Response): Promise<void> {
    try {
      const juniorId = req.user!.id
      const juniorName =
        req.user?.fullName ||
        req.body.juniorName ||
        req.user?.email?.split('@')[0] ||
        'Student'

      const validated = CreateRequestSchema.parse(req.body)

      const request = await connectionService.createConnectionRequest({
        juniorId,
        juniorName,
        seniorId: validated.seniorId,
        seniorName: validated.seniorName,
        projectId: validated.projectId,
        projectTitle: validated.projectTitle,
        purpose: validated.purpose,
        note: validated.note,
      })

      res.status(201).json({ success: true, data: request })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code || 'REQUEST_FAILED', message: error.message },
      })
    }
  }

  async listRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const status = req.query.status as any
      const role = req.query.role as any

      const connections = await connectionService.listUserConnections(userId, { status, role })
      res.json({ success: true, data: connections })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to list connections' },
      })
    }
  }

  async getConnection(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const userId = req.user!.id
      const conn = await connectionService.getConnectionById(id)

      if (!conn) {
        res.status(404).json({ success: false, error: { message: 'Connection not found' } })
        return
      }

      if (conn.juniorId !== userId && conn.seniorId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: { message: 'Access denied to this connection' } })
        return
      }

      res.json({ success: true, data: conn })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to retrieve connection' },
      })
    }
  }

  async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const seniorId = req.user!.id

      const accepted = await connectionService.acceptConnectionRequest(id, seniorId)
      res.json({ success: true, data: accepted })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to accept request' },
      })
    }
  }

  async declineRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const seniorId = req.user!.id
      const reason = req.body?.reason

      const declined = await connectionService.declineConnectionRequest(id, seniorId, reason)
      res.json({ success: true, data: declined })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to decline request' },
      })
    }
  }

  async cancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const juniorId = req.user!.id

      const cancelled = await connectionService.cancelConnectionRequest(id, juniorId)
      res.json({ success: true, data: cancelled })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to cancel request' },
      })
    }
  }

  async blockConnection(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const userId = req.user!.id

      const blocked = await connectionService.blockConnection(id, userId)
      res.json({ success: true, data: blocked })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to block connection' },
      })
    }
  }

  // --- Secure Messaging Endpoints ---

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const senderId = req.user!.id
      const senderName = req.user?.fullName || req.body.senderName || req.user?.email?.split('@')[0] || 'Student Contributor'
      const validated = SendMessageSchema.parse(req.body)

      const message = await connectionService.sendMessage({
        connectionId: id,
        senderId,
        senderName,
        content: validated.content,
      })

      res.status(201).json({ success: true, data: message })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code || 'SEND_MESSAGE_FAILED', message: error.message },
      })
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const userId = req.user!.id

      const messages = await connectionService.getMessages(id, userId)
      res.json({ success: true, data: messages })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 400).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to fetch messages' },
      })
    }
  }

  async markMessagesRead(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const userId = req.user!.id

      const count = await connectionService.markMessagesAsRead(id, userId)
      res.json({ success: true, markedCount: count })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to mark messages read' },
      })
    }
  }

  // --- Notifications Endpoints ---

  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const notifs = await connectionService.getNotifications(userId)
      res.json({ success: true, data: notifs })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to fetch notifications' },
      })
    }
  }

  async markNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      const notifId = String(req.params.notifId)
      const userId = req.user!.id
      const updated = await connectionService.markNotificationRead(notifId, userId)
      res.json({ success: true, updated })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to mark notification read' },
      })
    }
  }

  async markAllNotificationsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const count = await connectionService.markAllNotificationsRead(userId)
      res.json({ success: true, markedCount: count })
    } catch (error: any) {
      res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: { code: error.code, message: error.message || 'Failed to mark all notifications read' },
      })
    }
  }
}

export const connectionController = new ConnectionController()
