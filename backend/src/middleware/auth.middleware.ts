import { Request, Response, NextFunction } from 'express'
import { authService } from '../modules/auth/auth.service.js'
import { UserRole } from '../modules/auth/user.model.js'
import { DatabaseUnavailableError } from '../config/db.js'

export interface AuthUser {
  id: string
  role: UserRole
  email?: string
  fullName?: string
  jti?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Strictly verifies the server-signed Bearer JWT and its active session record in storage.
 * Never trusts client-supplied identity headers such as X-Student-Id, X-User-Id, or X-User-Role.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required. Please sign in with a valid bearer token.',
      },
    })
    return
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication token is missing.',
      },
    })
    return
  }

  try {
    const { user, jti } = await authService.verifyBearerToken(token)
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      jti,
    }
    next()
  } catch (err: any) {
    if (err instanceof DatabaseUnavailableError || err?.code === 'DATABASE_UNAVAILABLE') {
      next(err)
      return
    }
    res.status(err?.statusCode || 401).json({
      success: false,
      error: {
        code: err?.code || 'UNAUTHORIZED',
        message: err?.message || 'Invalid or expired authentication token.',
      },
    })
  }
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required.',
        },
      })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
        },
      })
      return
    }

    next()
  }
}
