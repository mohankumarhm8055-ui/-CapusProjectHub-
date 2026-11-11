import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackgroundMarquee from '../components/BackgroundMarquee'
import InteractiveStickerField from '../components/InteractiveStickerField'
import { Sparkles, ArrowDown, Compass, ArrowRight } from 'lucide-react'

interface HeroSectionProps {
  onSignInClick?: () => void
  onSignUpClick?: () => void
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSignInClick,
  onSignUpClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Smooth scroll down to next section
  const scrollToNext = () => {
    const nextSection = document.getElementById('why-choose')
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section
      ref={containerRef}
      className="relative min-h-[680px] h-screen max-h-[1080px] w-full bg-[#DFE6EF] overflow-x-clip flex flex-col justify-between selection:bg-[#6658FF]/20 cursor-default"
    >
      {/* Background decorative layers isolated inside clip wrapper so header dropdowns & mobile drawer are never clipped */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 1. Animated background typography moving continuously at ultra-slow subtle speed */}
        <BackgroundMarquee />

        {/* 2. Cursor-Following Technology Sticker Trail (Covers entire Hero) */}
        <InteractiveStickerField containerRef={containerRef} />
      </div>

      {/* 3. Top Navigation Bar */}
      <Navbar
        transparent={true}
        onSignInClick={onSignInClick}
        onSignUpClick={onSignUpClick}
      />

      {/* 4. Hero Main Content Area */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-14 py-8 sm:py-12 my-auto flex flex-col justify-center pointer-events-auto">
        {/* Hero Left Editorial Headline Block */}
        <div className="max-w-4xl lg:max-w-5xl">
          {/* Subtle status tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 sm:mb-6 rounded-full bg-white/70 backdrop-blur-sm border border-slate-300/60 shadow-xs text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#6658FF] animate-pulse" />
            <span>AI-Powered Academic Project Hub</span>
            <span className="text-slate-400">|</span>
            <span className="text-[#6658FF] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 2026 Ready
            </span>
          </div>

          {/* Main editorial serif heading */}
          <h1 className="font-serif font-black tracking-tight leading-[0.96] sm:leading-[0.94] text-[#0B192C]">
            <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-[84px] drop-shadow-xs">
              Manage Projects
            </span>
            <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-[84px] drop-shadow-xs">
              Build Together
            </span>
            <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-[84px] text-[#6658FF] transition-colors">
              Learn Smarter <span className="font-mono text-3xl sm:text-5xl lg:text-6xl font-bold align-baseline">&lt;&gt;</span>
            </span>
          </h1>

          {/* Supporting text */}
          <p className="mt-6 sm:mt-8 text-base sm:text-[17px] font-semibold text-slate-700 max-w-xl leading-relaxed">
            Plan academic projects, collaborate with your team and learn smarter with AI-powered guidance.
          </p>

          {/* Explore Projects Primary CTA */}
          <div className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4">
            <Link
              to="/explore-projects"
              className="inline-flex items-center gap-2 px-6 py-3 sm:px-7 sm:py-3.5 rounded-full font-bold text-sm text-white shadow-md hover:shadow-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Projects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={scrollToNext}
              className="inline-flex items-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-full font-semibold text-sm text-slate-700 bg-white/80 hover:bg-white border border-slate-300/80 shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <span>Platform Overview</span>
              <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom bar / scroll cue */}
      <div className="relative z-20 w-full px-5 sm:px-8 lg:px-14 pb-5 flex items-center justify-between text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span>CAMPUSPROJECTHUB.ORG</span>
        </div>

        <button
          onClick={scrollToNext}
          className="group flex items-center gap-2 text-slate-600 hover:text-[#6658FF] transition-colors cursor-pointer"
        >
          <span>Explore platform</span>
          <ArrowDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
        </button>
      </div>
    </section>
  )
}

export default HeroSection
