/**
 * CampusProjectHub — Authentication Service
 * Connects directly to /api/auth/* endpoints with JWT + server-side session verification.
 * Passwords are NEVER stored in localStorage or cookies.
 */

import {
  clearAuthSession,
  getApiBaseUrl,
  getApiHeaders,
  getAuthToken,
  getCurrentAuthUser,
  setAuthSession,
  type AuthenticatedRole,
  type AuthenticatedUser,
} from './sessionService'

export type UserRole = 'student' | 'faculty'

export interface SignInCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignUpPayload {
  fullName: string
  email: string
  password: string
  confirmPassword?: string
  role: UserRole
  college: string
  department: string
  // Student-specific fields
  usnOrStudentId?: string
  semester?: string
  academicYear?: string
  // Faculty-specific fields
  facultyId?: string
  designation?: string
  areasOfExpertise?: string
  inviteCode?: string
}

export interface AuthResponse {
  success: boolean
  status: 'authenticated' | 'validation_error' | 'error' | 'database_unavailable'
  message: string
  timestamp: string
  targetDashboard?: string
  user?: AuthenticatedUser
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email.trim())
}

export function getRoleDashboardRoute(role: AuthenticatedRole): string {
  switch (role) {
    case 'faculty':
    case 'admin':
    case 'student':
    default:
      return '/ai-mentor'
  }
}

export const authService = {
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        status: 'validation_error',
        message: 'Please provide both college email and password.',
        timestamp: new Date().toISOString(),
      }
    }

    if (!isValidEmail(credentials.email)) {
      return {
        success: false,
        status: 'validation_error',
        message: 'Please provide a valid educational or institutional email address.',
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email.trim(),
          password: credentials.password,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        const isDbDown = res.status === 503 || json?.error?.code === 'DATABASE_UNAVAILABLE'
        return {
          success: false,
          status: isDbDown ? 'database_unavailable' : 'error',
          message:
            json?.error?.message ||
            (isDbDown
              ? 'Persistent database storage is currently unavailable.'
              : 'Invalid email or password.'),
          timestamp: new Date().toISOString(),
        }
      }

      const { token, user } = json.data
      setAuthSession(token, user)

      return {
        success: true,
        status: 'authenticated',
        message: json.message || 'Signed in successfully.',
        timestamp: new Date().toISOString(),
        targetDashboard: getRoleDashboardRoute(user.role),
        user,
      }
    } catch {
      return {
        success: false,
        status: 'error',
        message: 'Unable to reach authentication server. Verify backend is running.',
        timestamp: new Date().toISOString(),
      }
    }
  },

  async signUp(payload: SignUpPayload): Promise<AuthResponse> {
    if (
      !payload.fullName ||
      !payload.email ||
      !payload.password ||
      !payload.role ||
      !payload.college ||
      !payload.department
    ) {
      return {
        success: false,
        status: 'validation_error',
        message: 'All required fields must be completed for registration.',
        timestamp: new Date().toISOString(),
      }
    }

    if (!isValidEmail(payload.email)) {
      return {
        success: false,
        status: 'validation_error',
        message: 'Please enter a valid academic email address.',
        timestamp: new Date().toISOString(),
      }
    }

    if (payload.password.length < 8) {
      return {
        success: false,
        status: 'validation_error',
        message: 'Password must be at least 8 characters long.',
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email.trim(),
          password: payload.password,
          fullName: payload.fullName.trim(),
          role: payload.role,
          inviteCode: payload.inviteCode?.trim() || undefined,
          usnOrEmployeeId:
            payload.role === 'student' ? payload.usnOrStudentId : payload.facultyId,
          department: payload.department,
          semesterOrDesignation:
            payload.role === 'student' ? payload.semester : payload.designation,
          collegeName: payload.college.trim(),
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        const isDbDown = res.status === 503 || json?.error?.code === 'DATABASE_UNAVAILABLE'
        return {
          success: false,
          status: isDbDown ? 'database_unavailable' : 'error',
          message:
            json?.error?.message ||
            (isDbDown
              ? 'Persistent database storage is currently unavailable.'
              : 'Account registration failed.'),
          timestamp: new Date().toISOString(),
        }
      }

      const { token, user } = json.data
      setAuthSession(token, user)

      return {
        success: true,
        status: 'authenticated',
        message: json.message || 'Account registered and authenticated.',
        timestamp: new Date().toISOString(),
        targetDashboard: getRoleDashboardRoute(user.role),
        user,
      }
    } catch {
      return {
        success: false,
        status: 'error',
        message: 'Unable to reach authentication server. Verify backend is running.',
        timestamp: new Date().toISOString(),
      }
    }
  },

  async verifySession(): Promise<AuthenticatedUser | null> {
    const token = getAuthToken()
    if (!token) return null

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        headers: getApiHeaders({}, false),
      })

      if (res.status === 401) {
        clearAuthSession()
        return null
      }

      if (!res.ok) {
        return getCurrentAuthUser()
      }

      const json = await res.json().catch(() => null)
      if (json?.success && json?.data) {
        setAuthSession(token, json.data)
        return json.data
      }
      return null
    } catch {
      return getCurrentAuthUser()
    }
  },

  getCurrentUser(): AuthenticatedUser | null {
    if (!getAuthToken()) return null
    return getCurrentAuthUser()
  },

  async signOut(): Promise<void> {
    const token = getAuthToken()
    try {
      if (token) {
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          headers: getApiHeaders(),
        })
      }
    } catch {
      // Clear local session regardless of network error
    } finally {
      clearAuthSession()
    }
  },
}

export default authService
