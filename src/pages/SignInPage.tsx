import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { authService, isValidEmail, type AuthResponse } from '../services/authService'

export const SignInPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTarget = (location.state as { from?: string } | null)?.from || '/ai-mentor'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null)
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = 'College email is required.'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid academic email address (e.g. name@college.edu).'
    }

    if (!password) {
      newErrors.password = 'Password must not be empty.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthResponse(null)

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const response = await authService.signIn({
        email: email.trim(),
        password,
        rememberMe,
      })
      setAuthResponse(response)
      if (response.success) {
        navigate(redirectTarget, { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your project workspaces, faculty mentor evaluations, and milestone submissions."
      badgeText="Academic Sign In"
      footerPrompt={{
        text: "Don't have an academic account?",
        linkText: 'Sign Up',
        linkHref: '/signup',
      }}
    >
      {/* Authentication Status Banner */}
      {authResponse && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            authResponse.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : authResponse.status === 'database_unavailable'
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {authResponse.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {authResponse.success
                ? 'Signed In'
                : authResponse.status === 'database_unavailable'
                ? 'Database Persistence Unavailable'
                : 'Sign In Failed'}
            </p>
            <p className="mt-1 text-xs opacity-90">{authResponse.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
        <AuthInput
          id="email"
          label="College Email"
          type="email"
          value={email}
          onChange={(val) => {
            setEmail(val)
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
          }}
          placeholder="student@university.edu"
          required
          error={errors.email}
          icon={Mail}
          autoComplete="email"
          disabled={submitting}
        />

        {/* Password Field */}
        <AuthInput
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(val) => {
            setPassword(val)
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
          }}
          placeholder="••••••••••••"
          required
          error={errors.password}
          icon={Lock}
          autoComplete="current-password"
          disabled={submitting}
        />

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs sm:text-[13px] pt-1">
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#6658FF] focus:ring-[#6658FF]/40 cursor-pointer"
            />
            <span className="font-medium">Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setForgotPasswordModal(true)}
            className="font-bold text-[#6658FF] hover:text-[#5546FF] transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-full font-bold text-sm sm:text-base text-white shadow-md hover:shadow-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] transition-all cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{submitting ? 'Verifying...' : 'Sign In'}</span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* Forgot Password Modal / Placeholder Notice */}
      {forgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="w-12 h-12 rounded-2xl bg-[#6658FF]/10 text-[#6658FF] flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-[#0B192C]">
              Password Reset Notice
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Self-service password recovery will connect to your institution's SSO or LDAP directory upon backend deployment. Please contact your department coordinator to reset academic capstone credentials.
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setForgotPasswordModal(false)}
                className="w-full py-2.5 rounded-full font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}

export default SignInPage
