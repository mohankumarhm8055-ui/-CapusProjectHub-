import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from './auth.service.js'
import { UserRepository, toPublicUser } from './user.model.js'

const RegisterSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['student', 'faculty', 'admin']).optional(),
  inviteCode: z.string().optional(),
  usnOrEmployeeId: z.string().optional(),
  department: z.string().optional(),
  semesterOrDesignation: z.string().optional(),
  collegeName: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
})

const BootstrapAdminSchema = z.object({
  provisionSecret: z.string().min(1, 'Provisioning secret is required'),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  department: z.string().optional(),
  collegeName: z.string().optional(),
})

const AdminProvisionUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['student', 'faculty', 'admin']),
  usnOrEmployeeId: z.string().optional(),
  department: z.string().optional(),
  semesterOrDesignation: z.string().optional(),
  collegeName: z.string().optional(),
})

const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
})

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = RegisterSchema.parse(req.body)
      const result = await authService.register({
        ...body,
        userAgent: req.headers['user-agent'],
      })
      res.status(201).json({
        success: true,
        message: 'Account registered and authenticated.',
        data: result,
      })
    } catch (err) {
      next(err)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = LoginSchema.parse(req.body)
      const result = await authService.login({
        email: body.email,
        password: body.password,
        userAgent: req.headers['user-agent'],
      })
      res.json({
        success: true,
        message: 'Signed in successfully.',
        data: result,
      })
    } catch (err) {
      next(err)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jti = req.user?.jti
      if (jti) {
        await authService.logout(jti)
      }
      res.json({
        success: true,
        message: 'Signed out and session invalidated.',
      })
    } catch (err) {
      next(err)
    }
  }

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Authentication required' } })
        return
      }
      const user = await UserRepository.findById(userId)
      if (!user) {
        res.status(401).json({ success: false, error: { message: 'User account not found' } })
        return
      }
      res.json({
        success: true,
        data: toPublicUser(user),
      })
    } catch (err) {
      next(err)
    }
  }

  bootstrapAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = BootstrapAdminSchema.parse(req.body)
      const user = await authService.provisionAdminWithSecret(body)
      res.status(201).json({
        success: true,
        message: 'Administrator account provisioned.',
        data: user,
      })
    } catch (err) {
      next(err)
    }
  }

  adminListUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await authService.listUsers()
      res.json({
        success: true,
        data: users,
      })
    } catch (err) {
      next(err)
    }
  }

  adminProvisionUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = AdminProvisionUserSchema.parse(req.body)
      const user = await authService.provisionUserByAdmin(body)
      res.status(201).json({
        success: true,
        message: `${body.role} account provisioned.`,
        data: user,
      })
    } catch (err) {
      next(err)
    }
  }

  adminUpdateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.userId)
      const body = UpdateUserStatusSchema.parse(req.body)
      const updated = await authService.updateUserStatus(userId, body.isActive)
      if (!updated) {
        res.status(404).json({ success: false, error: { message: 'User not found' } })
        return
      }
      res.json({
        success: true,
        message: `User status updated (isActive=${body.isActive}).`,
        data: updated,
      })
    } catch (err) {
      next(err)
    }
  }
}

export const authController = new AuthController()
