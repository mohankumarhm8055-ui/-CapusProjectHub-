import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Menu, UserCheck, X } from 'lucide-react'
import BrandLogo from './BrandLogo'
import AuthButtons from './AuthButtons'
import { MyConnectionsModal } from './connections/MyConnectionsModal'
import { NotificationBell } from './notifications/NotificationBell'
import { authService } from '../services/authService'
import type { AuthenticatedUser } from '../services/sessionService'

interface NavbarProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
  transparent?: boolean
}

interface NavItem {
  label: string
  to: string
}

export const Navbar: React.FC<NavbarProps> = ({
  onSignInClick,
  onSignUpClick,
  transparent = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() =>
    authService.getCurrentUser()
  )
  const moreDropdownRef = useRef<HTMLDivElement | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getCurrentUser())
    window.addEventListener('cph:auth-changed', syncAuth)
    return () => window.removeEventListener('cph:auth-changed', syncAuth)
  }, [])

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreMenuOpen(false)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const isFacultyOrAdmin =
    currentUser?.role === 'faculty' || currentUser?.role === 'admin'

  const handleOpenMentorship = () => {
    if (!authService.getCurrentUser()) {
      navigate('/signin', { state: { from: location.pathname } })
      return
    }
    setConnectionsModalOpen(true)
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path === '/final-completion' || path === '/faculty-final-review') {
      return (
        location.pathname.startsWith('/final-completion') ||
        location.pathname.startsWith('/faculty-final-review')
      )
    }
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const navItems: NavItem[] = [
    { label: 'Home', to: '/' },
    { label: 'Explore Projects', to: '/explore-projects' },
    { label: 'AI Mentor', to: '/ai-mentor' },
    { label: 'Schedule', to: '/academic-schedule' },
    { label: 'Activities', to: '/activity-tracker' },
    { label: 'Weekly', to: '/weekly-reports' },
    ...(isFacultyOrAdmin ? [{ label: 'Review', to: '/faculty-review' }] : []),
    {
      label: 'Final',
      to: isFacultyOrAdmin ? '/faculty-final-review' : '/final-completion',
    },
  ]

  // Tablet (768-1023px): indices 0..1 inline, indices 2+ inside Workspace dropdown
  // Laptop (1024-1279px): indices 0..3 inline, indices 4+ inside Workspace dropdown
  // Desktop (>=1280px): all items inline
  const getItemVisibilityClass = (idx: number) => {
    if (idx <= 1) return 'inline-flex'
    if (idx <= 3) return 'hidden lg:inline-flex'
    return 'hidden xl:inline-flex'
  }

  const getDropdownItemVisibilityClass = (idx: number) => {
    if (idx <= 1) return 'hidden'
    if (idx <= 3) return 'block lg:hidden'
    return 'block xl:hidden'
  }

  const isMoreActive = navItems.slice(2).some((item) => isActive(item.to))

  const linkClass = (active: boolean) =>
    `px-2.5 xl:px-3 py-1.5 rounded-xl text-[13px] xl:text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30 ${
      active
        ? 'bg-white text-[#6658FF] shadow-2xs'
        : 'text-slate-700 hover:text-[#6658FF] hover:bg-white/65'
    }`

  return (
    <header
      className={`relative z-50 w-full transition-colors duration-200 ${
        transparent
          ? 'bg-[#DFE6EF]/70 backdrop-blur-md border-b border-slate-300/40'
          : 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
      }`}
    >
      <nav
        aria-label="Primary Navigation"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-14 h-[72px] flex items-center justify-between gap-2 sm:gap-3 xl:gap-4"
      >
        {/* LEFT: Brand Logo + Name + Subtitle */}
        <Link
          to="/"
          className="shrink-0 focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30 rounded-xl"
          onClick={() => {
            setMobileMenuOpen(false)
            setMoreMenuOpen(false)
          }}
        >
          <BrandLogo />
        </Link>

        {/* CENTER (Tablet md+, Laptop lg+, Desktop xl+) */}
        <div className="hidden md:flex items-center justify-center min-w-0 flex-1">
          <div className="flex items-center gap-0.5 xl:gap-1 px-1.5 py-1 rounded-2xl bg-slate-900/[0.04] border border-slate-200/75">
            {navItems.map((item, idx) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${getItemVisibilityClass(idx)} ${linkClass(isActive(item.to))}`}
              >
                {item.label}
              </Link>
            ))}

            {/* Overflow Workspace Menu for Tablet (768px) & Laptop (1024px) */}
            <div ref={moreDropdownRef} className="relative xl:hidden shrink-0">
              <button
                type="button"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                aria-expanded={moreMenuOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30 ${
                  isMoreActive || moreMenuOpen
                    ? 'bg-white text-[#6658FF] shadow-2xs'
                    : 'text-slate-700 hover:text-[#6658FF] hover:bg-white/65'
                }`}
              >
                <span>Workspace</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {moreMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-1.5 space-y-0.5"
                >
                  {navItems.map((item, idx) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      onClick={() => setMoreMenuOpen(false)}
                      className={`${getDropdownItemVisibilityClass(idx)} px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive(item.to)
                          ? 'bg-[#6658FF]/10 text-[#6658FF]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#6658FF]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT (Tablet & Desktop >= 768px): Notifications + Auth / Profile Menu */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <NotificationBell />
          <AuthButtons
            onSignInClick={onSignInClick}
            onSignUpClick={onSignUpClick}
            onOpenMentorship={handleOpenMentorship}
          />
        </div>

        {/* RIGHT (Mobile < 768px): Notification Bell + Hamburger Menu */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-white/70 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6658FF]/30"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer (< 768px) */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="md:hidden absolute left-0 right-0 top-full max-h-[calc(100vh-4.5rem)] overflow-y-auto bg-white/98 backdrop-blur-xl border-b border-slate-200 px-4 py-4 space-y-3 shadow-2xl z-50"
        >
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive(item.to)
                    ? 'bg-[#6658FF] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                handleOpenMentorship()
              }}
              className="w-full text-left flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#6658FF]" />
              <span>Mentorship & Connections</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <AuthButtons
              variant="mobile"
              onNavigate={() => setMobileMenuOpen(false)}
              onSignInClick={onSignInClick}
              onSignUpClick={onSignUpClick}
            />
          </div>
        </div>
      )}

      {/* Senior-Junior Connections & Mentorship Modal */}
      <MyConnectionsModal
        isOpen={connectionsModalOpen}
        onClose={() => setConnectionsModalOpen(false)}
      />
    </header>
  )
}

export default Navbar
