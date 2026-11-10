import { Router } from 'express'
import { connectionController } from './connection.controller.js'
import { authenticate } from '../../middleware/auth.middleware.js'

const router = Router()

// All connection routes require authentication
router.use(authenticate)

// 1. Profile Management
router.get('/profile/me', (req, res) => connectionController.getMyProfile(req, res))
router.patch('/profile/me', (req, res) => connectionController.updateMyProfile(req, res))
router.get('/profile/:studentId', (req, res) => connectionController.getPublicProfile(req, res))

// 2. Notifications
router.get('/notifications', (req, res) => connectionController.getNotifications(req, res))
router.patch('/notifications/read-all', (req, res) => connectionController.markAllNotificationsRead(req, res))
router.patch('/notifications/:notifId/read', (req, res) => connectionController.markNotificationRead(req, res))

// 3. Requests Lifecycle
router.post('/requests', (req, res) => connectionController.createRequest(req, res))
router.get('/requests', (req, res) => connectionController.listRequests(req, res))
router.get('/:id', (req, res) => connectionController.getConnection(req, res))
router.patch('/:id/accept', (req, res) => connectionController.acceptRequest(req, res))
router.patch('/:id/decline', (req, res) => connectionController.declineRequest(req, res))
router.patch('/:id/cancel', (req, res) => connectionController.cancelRequest(req, res))
router.patch('/:id/block', (req, res) => connectionController.blockConnection(req, res))

// 4. Secure Messaging Channel
router.get('/:id/messages', (req, res) => connectionController.getMessages(req, res))
router.post('/:id/messages', (req, res) => connectionController.sendMessage(req, res))
router.patch('/:id/messages/read', (req, res) => connectionController.markMessagesRead(req, res))

export default router
