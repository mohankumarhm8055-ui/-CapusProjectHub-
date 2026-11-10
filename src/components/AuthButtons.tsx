import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User as UserIcon } from 'lucide-react'
import { authService } from '../services/authService'
import type { AuthenticatedUser } from '../services/sessionService'

interface AuthButtonsProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
  className?: string
}

export const AuthButtons: React.FC<AuthButtonsProps> = ({
  onSignInClick,
  onSignUpClick,
  className = '',
}) => {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthenticatedUser | null>(() => authService.getCurrentUser())

  useEffect(() => {
    const syncUser = () => setUser(authService.getCurrentUser())
    window.addEventListener('cph:auth-changed', syncUser)
    if (user) {
      authService.verifySession().then((verified) => {
        if (!verified) setUser(null)
        else setUser(verified)
      })
    }
    return () => window.removeEventListener('cph:auth-changed', syncUser)
  }, [])

  const handleSignOut = async () => {
    await authService.signOut()
    setUser(null)
    navigate('/')
  }

  if (user) {
    return (
      <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <UserIcon className="w-3.5 h-3.5 text-[#6658FF]" />
          <span className="font-semibold max-w-[120px] truncate">{user.fullName}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#6658FF]/10 text-[#6658FF]">
            {user.role}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* Sign In */}
      <Link
        to="/signin"
        onClick={onSignInClick}
        className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-900/5 rounded-full transition-all duration-200 border border-transparent hover:border-slate-300/60 focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30 cursor-pointer"
      >
        Sign In
      </Link>

      {/* Sign Up */}
      <Link
        to="/signup"
        onClick={onSignUpClick}
        className="group relative inline-flex items-center justify-center px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-all duration-300 rounded-full shadow-md hover:shadow-lg hover:shadow-[#6658FF]/25 bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#6658FF]/50 cursor-pointer"
      >
        <span>Sign Up</span>
        <span className="ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5">
          &rarr;
        </span>
      </Link>
    </div>
  )
}

export default AuthButtons
