import { authService } from '../../modules/auth/auth.service.js'
import { UserRole, IPublicUser, UserRepository } from '../../modules/auth/user.model.js'
import { hashPassword } from '../../modules/auth/auth.service.js'

export interface TestAuthSession {
  id: string
  user: IPublicUser
  token: string
  headers: Record<string, string>
}

export function enableTestInMemoryFallback(): void {
  process.env.ALLOW_INMEMORY_FALLBACK = 'true'
}

export async function createAuthenticatedTestUser(params: {
  label?: string
  role: UserRole
  fullName: string
  department?: string
}): Promise<TestAuthSession> {
  enableTestInMemoryFallback()

  const slug = (params.label || params.role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  const unique = `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const email = `${unique}@campusprojecthub.edu`
  const password = 'TestPassword@2026'

  let user: IPublicUser
  if (params.role === 'student') {
    const res = await authService.register({
      email,
      password,
      fullName: params.fullName,
      role: 'student',
      department: params.department || 'Computer Science & Engineering',
    })
    return {
      id: res.user.id,
      user: res.user,
      token: res.token,
      headers: { Authorization: `Bearer ${res.token}` },
    }
  }

  user = await authService.provisionUserByAdmin({
    email,
    password,
    fullName: params.fullName,
    role: params.role,
    department: params.department || 'Computer Science & Engineering',
  })

  const loginRes = await authService.login({ email, password })
  return {
    id: user.id,
    user: loginRes.user,
    token: loginRes.token,
    headers: { Authorization: `Bearer ${loginRes.token}` },
  }
}

/**
 * Ensures a Mongo user exists for a given profile or email during tests.
 */
export async function findOrCreateTestUserByEmail(params: {
  email: string
  role: UserRole
  fullName: string
}): Promise<TestAuthSession> {
  const password = 'TestPassword@2026'
  const existing = await UserRepository.findByEmail(params.email)
  if (!existing) {
    await UserRepository.create({
      email: params.email,
      passwordHash: hashPassword(password),
      role: params.role,
      fullName: params.fullName,
      isActive: true,
    })
  }
  const loginRes = await authService.login({ email: params.email, password })
  return {
    id: loginRes.user.id,
    user: loginRes.user,
    token: loginRes.token,
    headers: { Authorization: `Bearer ${loginRes.token}` },
  }
}
