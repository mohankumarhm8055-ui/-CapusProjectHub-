import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Award,
  Bell,
  ChevronDown,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  UserCheck,
} from 'lucide-react'
import { authService } from '../services/authService'
import type { AuthenticatedUser } from '../services/sessionService'

interface AuthButtonsProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
  onOpenMentorship?: () => void
  onNavigate?: () => void
  variant?: 'header' | 'mobile'
  className?: string
}

const ROLE_STYLES: Record<string, { label: string; badge: string }> = {
  student: { label: 'Student', badge: 'bg-[#6658FF]/10 text-[#6658FF]' },
  faculty: { label: 'Faculty', badge: 'bg-emerald-50 text-emerald-700' },
  admin: { label: 'Admin', badge: 'bg-amber-50 text-amber-800' },
}

export const AuthButtons: React.FC<AuthButtonsProps> = ({
  onSignInClick,
  onSignUpClick,
  onOpenMentorship,
  onNavigate,
  variant = 'header',
  className = '',
}) => {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthenticatedUser | null>(() => authService.getCurrentUser())
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const syncUser = () => setUser(authService.getCurrentUser())
    window.addEventListener('cph:auth-changed', syncUser)
    if (authService.getCurrentUser()) {
      authService.verifySession().then((verified) => {
        if (!verified) setUser(null)
        else setUser(verified)
      })
    }
    return () => window.removeEventListener('cph:auth-changed', syncUser)
  }, [])

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await authService.signOut()
    setUser(null)
    if (onNavigate) onNavigate()
    navigate('/')
  }

  if (user) {
    const roleMeta = ROLE_STYLES[user.role] || {
      label: user.role,
      badge: 'bg-slate-100 text-slate-700',
    }

    if (variant === 'mobile') {
      return (
        <div className={`w-full space-y-2.5 ${className}`}>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0B192C] truncate">{user.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${roleMeta.badge}`}>
              {roleMeta.label}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )
    }

    return (
      <div ref={menuRef} className={`relative shrink-0 ${className}`}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Account menu for ${user.fullName}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/85 hover:bg-white border border-slate-200/90 text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30"
        >
          <span className="w-6 h-6 rounded-full bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold max-w-[72px] lg:max-w-[84px] xl:max-w-[125px] truncate text-[#0B192C]">
            {user.fullName}
          </span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${roleMeta.badge}`}>
            {roleMeta.label}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#0B192C] truncate">{user.fullName}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${roleMeta.badge}`}>
                  {roleMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
              {user.department && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.department}</p>
              )}
            </div>

            <div className="p-1.5 space-y-0.5 text-xs font-semibold text-slate-700">
              <Link
                to={
                  user.role === 'faculty' || user.role === 'admin'
                    ? '/faculty-final-review'
                    : '/final-completion'
                }
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#6658FF] transition-colors"
              >
                <Award className="w-4 h-4 text-[#6658FF]" />
                <span>
                  {user.role === 'faculty' || user.role === 'admin'
                    ? 'Final Review & Publication'
                    : 'Final Completion Workspace'}
                </span>
              </Link>

              {(user.role === 'faculty' || user.role === 'admin') && (
                <Link
                  to="/faculty-review"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#6658FF] transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Faculty Activity Review</span>
                </Link>
              )}

              <Link
                to="/notifications"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#6658FF] transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-500" />
                <span>Notifications</span>
              </Link>

              {onOpenMentorship && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenMentorship()
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-[#6658FF] transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#6658FF]" />
                  <span>Mentorship & Connections</span>
                </button>
              )}
            </div>

            <div className="p-1.5 border-t border-slate-100">
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-2 shrink-0 whitespace-nowrap ${
        variant === 'mobile' ? 'w-full grid grid-cols-2' : ''
      } ${className}`}
    >
      <Link
        to="/signin"
        onClick={() => {
          if (onNavigate) onNavigate()
          if (onSignInClick) onSignInClick()
        }}
        className={`px-3 xl:px-4 py-1.5 text-[13px] xl:text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-white/80 rounded-full transition-colors border border-slate-300/70 bg-white/60 text-center whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30 cursor-pointer`}
      >
        Sign In
      </Link>

      <Link
        to="/signup"
        onClick={() => {
          if (onNavigate) onNavigate()
          if (onSignUpClick) onSignUpClick()
        }}
        className="inline-flex items-center justify-center px-3.5 xl:px-4 py-1.5 text-[13px] xl:text-sm font-semibold text-white transition-all rounded-full shadow-sm hover:shadow-md bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] text-center whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#6658FF]/50 cursor-pointer"
      >
        <span>Sign Up</span>
      </Link>
    </div>
  )
}

export default AuthButtons
