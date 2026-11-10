/**
 * Shared authenticated session & API header/URL helpers.
 * Uses verified server-issued Bearer JWT tokens and NEVER generates
 * client-side fake student identities or trusts spoofed identity headers.
 */

export type AuthenticatedRole = 'student' | 'faculty' | 'admin'

export interface AuthenticatedUser {
  id: string
  email: string
  role: AuthenticatedRole
  fullName: string
  usnOrEmployeeId?: string
  department?: string
  semesterOrDesignation?: string
  collegeName?: string
  isActive?: boolean
}

const AUTH_TOKEN_KEY = 'cph_auth_token'
const AUTH_USER_KEY = 'cph_auth_user'
const LEGACY_STUDENT_KEY = 'campusprojecthub_student_session_id'

export function notifyAuthChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cph:auth-changed'))
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token')
  } catch {
    return null
  }
}

export function getCurrentAuthUser(): AuthenticatedUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthenticatedUser
  } catch {
    return null
  }
}

export function setAuthSession(token: string, user: AuthenticatedUser): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    localStorage.removeItem(LEGACY_STUDENT_KEY)
    localStorage.removeItem('token')
  } catch {
    // Ignore storage quota issues
  }
  notifyAuthChanged()
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem(LEGACY_STUDENT_KEY)
    localStorage.removeItem('token')
  } catch {
    // Ignore storage errors
  }
  notifyAuthChanged()
}

export function getApiBaseUrl(): string {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL
  if (envBase && typeof envBase === 'string') {
    return envBase.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location.port === '4173') {
    return 'http://127.0.0.1:5000'
  }
  return ''
}

export function getApiHeaders(
  extra: Record<string, string> = {},
  includeContentType = true
): Record<string, string> {
  const token = getAuthToken()
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export function extractApiErrorMessage(json: any, status: number, fallback: string): string {
  if (status === 401) {
    clearAuthSession()
    return json?.error?.message || 'Your session has expired. Please sign in again.'
  }
  if (status === 503 || json?.error?.code === 'DATABASE_UNAVAILABLE') {
    return (
      json?.error?.message ||
      'Persistent database storage is currently unavailable. Please try again once MongoDB is connected.'
    )
  }
  return json?.error?.message || json?.message || `${fallback} (${status})`
}
