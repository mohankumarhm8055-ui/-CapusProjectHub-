import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import AuthButtons from './AuthButtons'
import { Menu, X, Compass, Sparkles, UserCheck } from 'lucide-react'
import { MyConnectionsModal } from './connections/MyConnectionsModal'
import { authService } from '../services/authService'

interface NavbarProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
  transparent?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  onSignInClick,
  onSignUpClick,
  transparent = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleOpenMentorship = () => {
    if (!authService.getCurrentUser()) {
      navigate('/signin', { state: { from: location.pathname } })
      return
    }
    setConnectionsModalOpen(true)
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <nav
      className={`relative z-40 w-full transition-all duration-200 ${
        transparent
          ? 'bg-transparent'
          : 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 py-4 sm:py-5 flex items-center justify-between">
        {/* Left: Brand Logo linking to Home */}
        <Link to="/" className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
          <BrandLogo />
        </Link>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2 bg-slate-900/5 p-1.5 rounded-full border border-slate-200/60 backdrop-blur-xs">
          <Link
            to="/"
            className={`px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/')
                ? 'bg-white text-[#6658FF] shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            Home
          </Link>

          <Link
            to="/explore-projects"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/explore-projects')
                ? 'bg-[#6658FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Projects</span>
          </Link>

          <Link
            to="/ai-mentor"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/ai-mentor')
                ? 'bg-[#6658FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Mentor</span>
          </Link>
        </div>

        {/* Right: Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleOpenMentorship}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#6658FF]/10 hover:text-[#6658FF] border border-slate-200 hover:border-[#6658FF]/30 transition-all cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#6658FF]" />
            <span>Mentorship</span>
          </button>

          <AuthButtons
            onSignInClick={onSignInClick}
            onSignUpClick={onSignUpClick}
          />
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle mobile navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-5 py-4 space-y-3 animate-in slide-in-from-top-4 duration-200 shadow-xl">
          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/') ? 'bg-[#6658FF]/10 text-[#6658FF]' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Home
            </Link>

            <Link
              to="/explore-projects"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/explore-projects')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Projects</span>
            </Link>

            <Link
              to="/ai-mentor"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/ai-mentor')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Mentor</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleOpenMentorship()
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              <UserCheck className="w-4 h-4 text-[#6658FF]" />
              <span>Mentorship & Connections</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <AuthButtons
              onSignInClick={() => {
                setMobileMenuOpen(false)
                if (onSignInClick) onSignInClick()
              }}
              onSignUpClick={() => {
                setMobileMenuOpen(false)
                if (onSignUpClick) onSignUpClick()
              }}
            />
          </div>
        </div>
      )}

      {/* Senior-Junior Connections & Mentorship Modal */}
      <MyConnectionsModal
        isOpen={connectionsModalOpen}
        onClose={() => setConnectionsModalOpen(false)}
      />
    </nav>
  )
}

export default Navbar
