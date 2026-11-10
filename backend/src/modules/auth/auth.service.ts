import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { config } from '../../config/env.js'
import { UserRepository, UserRole, IPublicUser, toPublicUser } from './user.model.js'
import { SessionRepository } from './session.model.js'

export interface JwtSessionPayload {
  sub: string
  role: UserRole
  email: string
  name: string
  jti: string
  iat?: number
  exp?: number
}

export interface AuthResult {
  user: IPublicUser
  token: string
  expiresAt: string
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${derivedKey}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, originalHex] = parts
  const originalBuffer = Buffer.from(originalHex, 'hex')
  const derivedBuffer = crypto.scryptSync(password, salt, 64)
  if (originalBuffer.length !== derivedBuffer.length) return false
  return crypto.timingSafeEqual(originalBuffer, derivedBuffer)
}

function parseExpiryMs(expiresIn: string): number {
  const match = expiresIn.trim().match(/^(\d+)([smhd])$/i)
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const val = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit === 's') return val * 1000
  if (unit === 'm') return val * 60 * 1000
  if (unit === 'h') return val * 60 * 60 * 1000
  return val * 24 * 60 * 60 * 1000
}

function constantTimeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export class AuthService {
  private async issueSession(
    user: IPublicUser,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: string }> {
    const jti = crypto.randomUUID()
    const ttlMs = parseExpiryMs(config.JWT_EXPIRES_IN || '7d')
    const expiresAt = new Date(Date.now() + ttlMs)

    await SessionRepository.create({
      jti,
      userId: user.id,
      role: user.role,
      expiresAt,
      userAgent,
    })

    const payload: JwtSessionPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.fullName,
      jti,
    }

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: (config.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    })

    return { token, expiresAt: expiresAt.toISOString() }
  }

  async register(input: {
    email: string
    password: string
    fullName: string
    role?: UserRole
    inviteCode?: string
    usnOrEmployeeId?: string
    department?: string
    semesterOrDesignation?: string
    collegeName?: string
    userAgent?: string
  }): Promise<AuthResult> {
    const requestedRole: UserRole = input.role || 'student'

    if (requestedRole === 'admin') {
      const err: any = new Error(
        'Administrator accounts cannot be self-registered. Use controlled provisioning.'
      )
      err.statusCode = 403
      err.code = 'ADMIN_SELF_REGISTRATION_FORBIDDEN'
      throw err
    }

    if (requestedRole === 'faculty') {
      const configuredInvite = config.FACULTY_INVITE_CODE?.trim()
      if (!configuredInvite) {
        const err: any = new Error(
          'Self-service faculty registration is disabled. Contact an administrator to provision your faculty account.'
        )
        err.statusCode = 403
        err.code = 'FACULTY_REGISTRATION_CONTROLLED'
        throw err
      }
      if (!input.inviteCode || !constantTimeMatch(input.inviteCode.trim(), configuredInvite)) {
        const err: any = new Error('Invalid faculty invite code.')
        err.statusCode = 403
        err.code = 'INVALID_FACULTY_INVITE_CODE'
        throw err
      }
    }

    const passwordHash = hashPassword(input.password)
    const created = await UserRepository.create({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: requestedRole,
      fullName: input.fullName.trim(),
      usnOrEmployeeId: input.usnOrEmployeeId?.trim(),
      department: input.department?.trim(),
      semesterOrDesignation: input.semesterOrDesignation?.trim(),
      collegeName: input.collegeName?.trim(),
      isActive: true,
    })

    const publicUser = toPublicUser(created)
    const { token, expiresAt } = await this.issueSession(publicUser, input.userAgent)
    return { user: publicUser, token, expiresAt }
  }

  async login(input: {
    email: string
    password: string
    userAgent?: string
  }): Promise<AuthResult> {
    const user = await UserRepository.findByEmail(input.email)
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      const err: any = new Error('Invalid email or password.')
      err.statusCode = 401
      err.code = 'INVALID_CREDENTIALS'
      throw err
    }

    if (!user.isActive) {
      const err: any = new Error('Account has been deactivated. Contact an administrator.')
      err.statusCode = 403
      err.code = 'ACCOUNT_INACTIVE'
      throw err
    }

    const updated = (await UserRepository.updateById(user.id, { lastLoginAt: new Date() })) || user
    const publicUser = toPublicUser(updated)
    const { token, expiresAt } = await this.issueSession(publicUser, input.userAgent)
    return { user: publicUser, token, expiresAt }
  }

  async verifyBearerToken(token: string): Promise<{
    user: IPublicUser
    jti: string
  }> {
    let decoded: JwtSessionPayload
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as JwtSessionPayload
    } catch {
      const err: any = new Error('Invalid or expired authentication token.')
      err.statusCode = 401
      err.code = 'INVALID_TOKEN'
      throw err
    }

    if (!decoded?.sub || !decoded?.jti) {
      const err: any = new Error('Malformed authentication token.')
      err.statusCode = 401
      err.code = 'INVALID_TOKEN'
      throw err
    }

    const activeSession = await SessionRepository.findActiveByJti(decoded.jti)
    if (!activeSession) {
      const err: any = new Error('Session expired or signed out. Please sign in again.')
      err.statusCode = 401
      err.code = 'SESSION_REVOKED'
      throw err
    }

    const user = await UserRepository.findById(decoded.sub)
    if (!user || !user.isActive) {
      const err: any = new Error('Authenticated user account not found or inactive.')
      err.statusCode = 401
      err.code = 'USER_UNAVAILABLE'
      throw err
    }

    return { user: toPublicUser(user), jti: decoded.jti }
  }

  async logout(jti: string): Promise<void> {
    if (jti) {
      await SessionRepository.revokeByJti(jti)
    }
  }

  async provisionAdminWithSecret(input: {
    provisionSecret: string
    email: string
    password: string
    fullName: string
    department?: string
    collegeName?: string
  }): Promise<IPublicUser> {
    const configuredSecret = config.ADMIN_PROVISION_SECRET?.trim()
    if (!configuredSecret || configuredSecret.length < 12) {
      const err: any = new Error(
        'Administrator provisioning secret is not configured on the server.'
      )
      err.statusCode = 403
      err.code = 'ADMIN_PROVISIONING_DISABLED'
      throw err
    }

    if (!input.provisionSecret || !constantTimeMatch(input.provisionSecret, configuredSecret)) {
      const err: any = new Error('Invalid administrator provisioning secret.')
      err.statusCode = 403
      err.code = 'INVALID_PROVISION_SECRET'
      throw err
    }

    const passwordHash = hashPassword(input.password)
    const created = await UserRepository.create({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      fullName: input.fullName.trim(),
      department: input.department?.trim(),
      collegeName: input.collegeName?.trim(),
      isActive: true,
    })
    return toPublicUser(created)
  }

  async provisionUserByAdmin(input: {
    email: string
    password: string
    fullName: string
    role: UserRole
    usnOrEmployeeId?: string
    department?: string
    semesterOrDesignation?: string
    collegeName?: string
  }): Promise<IPublicUser> {
    const passwordHash = hashPassword(input.password)
    const created = await UserRepository.create({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role,
      fullName: input.fullName.trim(),
      usnOrEmployeeId: input.usnOrEmployeeId?.trim(),
      department: input.department?.trim(),
      semesterOrDesignation: input.semesterOrDesignation?.trim(),
      collegeName: input.collegeName?.trim(),
      isActive: true,
    })
    return toPublicUser(created)
  }

  async listUsers(): Promise<IPublicUser[]> {
    const users = await UserRepository.listAll()
    return users.map(toPublicUser)
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<IPublicUser | null> {
    const updated = await UserRepository.updateById(userId, { isActive })
    if (!updated) return null
    if (!isActive) {
      await SessionRepository.revokeAllForUser(userId)
    }
    return toPublicUser(updated)
  }
}

export const authService = new AuthService()
