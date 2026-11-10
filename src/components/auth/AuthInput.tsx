import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

interface AuthInputProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  icon?: React.ComponentType<{ className?: string }>
  autoComplete?: string
  disabled?: boolean
  helperText?: string
}

export const AuthInput: React.FC<AuthInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon: Icon,
  autoComplete,
  disabled = false,
  helperText,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const computedType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="w-full space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        {helperText && !error && (
          <span className="text-[11px] text-slate-400">{helperText}</span>
        )}
      </div>

      <div className="relative rounded-2xl transition-all">
        {/* Leading Icon */}
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {/* Input Element */}
        <input
          id={id}
          name={id}
          type={computedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full py-3 text-sm font-medium rounded-2xl bg-slate-50/70 border transition-all duration-200 focus:outline-none focus:bg-white ${
            Icon ? 'pl-10' : 'pl-4'
          } ${isPassword ? 'pr-11' : 'pr-4'} ${
            error
              ? 'border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
              : 'border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:border-[#6658FF] focus:ring-4 focus:ring-[#6658FF]/10'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />

        {/* Show/Hide Password Toggle Button */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg focus:outline-none cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Inline Validation Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default AuthInput
