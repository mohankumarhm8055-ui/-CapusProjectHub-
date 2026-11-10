import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { Sparkles } from 'lucide-react'

interface FooterProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
}

export const Footer: React.FC<FooterProps> = ({
  onSignInClick,
  onSignUpClick,
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  // Helper to scroll smoothly to section or navigate to homepage section
  const handleScrollToSection = (sectionId: string) => {
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      navigate(`/#${sectionId}`)
    }
  }

  // Placeholder handler for legal links without creating fake legal documents
  const handlePlaceholderLegal = (e: React.MouseEvent, title: string) => {
    e.preventDefault()
    alert(`${title} will be published prior to institution deployment. CampusProjectHub follows standard FERPA/academic privacy guidelines.`)
  }

  // Placeholder handler for Help & Support
  const handleSupportClick = (e: React.MouseEvent) => {
    e.preventDefault()
    alert('CampusProjectHub Student Support: Please reach out to your department coordinator or email support@campusprojecthub.org for guidance.')
  }

  return (
    <footer className="relative bg-[#0B1424] text-slate-300 border-t border-slate-800/80 pt-16 sm:pt-20 pb-12 sm:pb-14 overflow-hidden selection:bg-[#6658FF]/20 selection:text-white">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6658FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 relative z-10">
        {/* Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14 border-b border-slate-800/80">
          {/* Column 1 — Brand (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <BrandLogo inverted={true} />

            {/* Exact Required Brand Description */}
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              An academic project workspace where students turn ideas into organized, collaborative, and meaningful projects.
            </p>

            {/* Subtle Brand Tagline with Purple Accent */}
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#8B5CF6]">
              <Sparkles className="w-3.5 h-3.5 text-[#6658FF]" />
              <span>Plan Projects • Learn Together • Build Smarter</span>
            </div>
          </div>

          {/* Column 2 — Platform (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-400">
              <li>
                <Link
                  to="/"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-white transition-colors cursor-pointer block"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/explore-projects"
                  className="hover:text-white transition-colors cursor-pointer block"
                >
                  Explore Projects
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('how-it-works')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  How It Works
                </button>
              </li>
              <li>
                <Link
                  to="/ai-mentor"
                  className="hover:text-white transition-colors cursor-pointer block"
                >
                  AI Project Mentor
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('team-collaboration')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Team Collaboration
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 — For Students (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              For Students
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-400">
              <li>
                <Link
                  to="/explore-projects"
                  className="hover:text-white transition-colors cursor-pointer block"
                >
                  Discover Projects
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  onClick={onSignUpClick}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Start a Project
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('team-collaboration')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Find Teammates
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('team-collaboration')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Manage Tasks
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('ai-assistant')}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Learn with AI
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4 — Account (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Account
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-400">
              <li>
                <Link
                  to="/signin"
                  onClick={onSignInClick}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  onClick={onSignUpClick}
                  className="text-[#8B5CF6] hover:text-[#a78bfa] font-semibold transition-colors cursor-pointer text-left block"
                >
                  Sign Up
                </Link>
              </li>
              <li>
                <Link
                  to="/signin"
                  onClick={onSignInClick}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                  title="Access faculty review and grading portal"
                >
                  Faculty Access
                </Link>
              </li>
              <li>
                <a
                  href="#support"
                  onClick={handleSupportClick}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  Help & Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Left: Copyright */}
          <p className="order-2 sm:order-1 text-center sm:text-left">
            &copy; 2026 CampusProjectHub. All rights reserved.
          </p>

          {/* Right: Legal Links (Clear placeholders without fake legal content) */}
          <div className="order-1 sm:order-2 flex items-center gap-5 sm:gap-6">
            <a
              href="#privacy"
              onClick={(e) => handlePlaceholderLegal(e, 'Privacy Policy')}
              className="hover:text-slate-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </a>
            <span className="text-slate-700">•</span>
            <a
              href="#terms"
              onClick={(e) => handlePlaceholderLegal(e, 'Terms of Service')}
              className="hover:text-slate-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
