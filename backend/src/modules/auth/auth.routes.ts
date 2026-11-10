import { Router } from 'express'
import { authController } from './auth.controller.js'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/bootstrap-admin', authController.bootstrapAdmin)

router.post('/logout', authenticate, authController.logout)
router.get('/me', authenticate, authController.me)

router.get('/admin/users', authenticate, requireRole('admin'), authController.adminListUsers)
router.post('/admin/users', authenticate, requireRole('admin'), authController.adminProvisionUser)
router.patch(
  '/admin/users/:userId/status',
  authenticate,
  requireRole('admin'),
  authController.adminUpdateUserStatus
)

export default router
