import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import AuthButtons from './AuthButtons'
import { Menu, X, Compass, Sparkles, UserCheck, Calendar, FileCheck, ClipboardList, Bell, ShieldCheck, Award } from 'lucide-react'
import { MyConnectionsModal } from './connections/MyConnectionsModal'
import { NotificationBell } from './notifications/NotificationBell'
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
          <Link
            to="/academic-schedule"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/academic-schedule')
                ? 'bg-[#6658FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </Link>
          <Link
            to="/activity-tracker"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/activity-tracker')
                ? 'bg-[#6658FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Activities</span>
          </Link>
          <Link
            to="/weekly-reports"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/weekly-reports')
                ? 'bg-[#6658FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Weekly</span>
          </Link>
          {(authService.getCurrentUser()?.role === 'faculty' ||
            authService.getCurrentUser()?.role === 'admin') && (
            <Link
              to="/faculty-review"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
                isActive('/faculty-review')
                  ? 'bg-[#6658FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Review</span>
            </Link>
          )}
          <Link
            to={
              authService.getCurrentUser()?.role === 'faculty' ||
              authService.getCurrentUser()?.role === 'admin'
                ? '/faculty-final-review'
                : '/final-completion'
            }
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all ${
              isActive('/final-completion') || isActive('/faculty-final-review')
                ? 'bg-[#6658FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#6658FF] hover:bg-white/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Final</span>
          </Link>
        </div>

        {/* Right: Auth Buttons */}
        <div className="hidden md:flex items-center gap-2.5">
          <NotificationBell />
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
        <div className="flex md:hidden items-center gap-1.5">
          <NotificationBell />
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
            <Link
              to="/academic-schedule"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/academic-schedule')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </Link>
            <Link
              to="/activity-tracker"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/activity-tracker')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Activities</span>
            </Link>
            <Link
              to="/weekly-reports"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/weekly-reports')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Weekly Reports</span>
            </Link>
            {(authService.getCurrentUser()?.role === 'faculty' ||
              authService.getCurrentUser()?.role === 'admin') && (
              <Link
                to="/faculty-review"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/faculty-review')
                    ? 'bg-[#6658FF] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Faculty Review</span>
              </Link>
            )}
            <Link
              to={
                authService.getCurrentUser()?.role === 'faculty' ||
                authService.getCurrentUser()?.role === 'admin'
                  ? '/faculty-final-review'
                  : '/final-completion'
              }
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/final-completion') || isActive('/faculty-final-review')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Final Completion</span>
            </Link>
            <Link
              to="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/notifications')
                  ? 'bg-[#6658FF] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
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
