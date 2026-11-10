import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import BrandLogo from '../BrandLogo'
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  badgeText?: string
  footerPrompt: {
    text: string
    linkText: string
    linkHref: string
  }
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  badgeText = 'Academic Platform',
  footerPrompt,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF9FF] via-[#EEF3F8] to-[#E3EBF5] text-slate-800 antialiased flex flex-col justify-between selection:bg-[#6658FF]/20 selection:text-[#6658FF] relative overflow-x-hidden">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#6658FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Return Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 py-6 flex items-center justify-between">
        <Link to="/" className="cursor-pointer">
          <BrandLogo />
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#6658FF] transition-colors p-2 rounded-xl hover:bg-white/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Authentication Card Area */}
      <main className="relative z-20 w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(102,88,255,0.12)] text-center relative overflow-hidden"
        >
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6658FF]/10 text-[#6658FF] text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#6658FF]" />
            <span>{badgeText}</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B192C]">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {subtitle}
          </p>

          {/* Form Content */}
          <div className="mt-8 text-left">{children}</div>

          {/* Footer Navigation Link (e.g. Don't have an account? Sign Up) */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-600">
            <span>{footerPrompt.text} </span>
            <Link
              to={footerPrompt.linkHref}
              className="font-bold text-[#6658FF] hover:text-[#5546FF] hover:underline transition-colors"
            >
              {footerPrompt.linkText}
            </Link>
          </div>
        </motion.div>

        {/* Security / Privacy Trust Pill */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#6658FF]" />
          <span>Encrypted Academic Workspace • CampusProjectHub 2026</span>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-20 w-full py-5 text-center text-xs text-slate-500">
        <p>&copy; 2026 CampusProjectHub. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default AuthLayout
