import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authService } from '../../services/authService'
import { getAuthToken, type AuthenticatedUser } from '../../services/sessionService'

interface ProtectedRouteProps {
  children: React.ReactElement
  allowedRoles?: Array<'student' | 'faculty' | 'admin'>
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation()
  const [checking, setChecking] = useState<boolean>(!!getAuthToken())
  const [user, setUser] = useState<AuthenticatedUser | null>(() => authService.getCurrentUser())

  useEffect(() => {
    let active = true
    const runVerify = async () => {
      if (!getAuthToken()) {
        if (active) {
          setUser(null)
          setChecking(false)
        }
        return
      }
      const verified = await authService.verifySession()
      if (active) {
        setUser(verified)
        setChecking(false)
      }
    }

    runVerify()

    const handleAuthChange = () => {
      setUser(authService.getCurrentUser())
    }
    window.addEventListener('cph:auth-changed', handleAuthChange)
    return () => {
      active = false
      window.removeEventListener('cph:auth-changed', handleAuthChange)
    }
  }, [location.pathname])

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] text-slate-700 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#6658FF]" />
        <p className="text-sm font-semibold">Verifying academic session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
