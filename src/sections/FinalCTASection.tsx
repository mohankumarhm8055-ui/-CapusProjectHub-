import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Compass, Sparkles, CheckCircle2 } from 'lucide-react'

interface FinalCTASectionProps {
  onGetStartedClick?: () => void
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({
  onGetStartedClick,
}) => {
  return (
    <section
      id="final-cta"
      className="relative w-full py-24 sm:py-32 lg:py-36 bg-gradient-to-b from-[#FAF9FF] via-[#EEF3F8] to-[#E3EBF5] border-t border-slate-200/80 overflow-hidden"
    >
      {/* Subtle Background Typographic Watermark (Restrained & Editorial) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-serif font-black text-[130px] sm:text-[200px] md:text-[260px] lg:text-[320px] text-slate-900/[0.03] tracking-tighter leading-none whitespace-nowrap">
          INNOVATE
        </span>
      </div>

      {/* Soft Ambient Radial Lights */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#6658FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          {/* Subtle Category Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 sm:mb-8 rounded-full bg-white/85 backdrop-blur-sm border border-slate-300/80 shadow-xs text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#6658FF] animate-pulse" />
            <span>Empowering Student Innovators</span>
            <span className="text-slate-300">|</span>
            <span className="text-[#6658FF] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> CampusProjectHub
            </span>
          </div>

          {/* Main Editorial Heading */}
          <h2 className="font-serif font-black text-3xl sm:text-5xl md:text-6xl lg:text-[64px] tracking-tight text-[#0B192C] leading-[1.08] sm:leading-[1.04] max-w-4xl">
            Your Next Great Project{' '}
            <span className="text-[#6658FF] inline-block drop-shadow-xs">
              Starts Here.
            </span>
          </h2>

          {/* Supporting Text */}
          <p className="mt-6 sm:mt-7 text-base sm:text-lg md:text-xl text-slate-600 font-medium max-w-2xl leading-relaxed">
            Turn your academic ideas into meaningful projects. Build your team,
            organize your work, learn new technologies, and bring your ideas to life with CampusProjectHub.
          </p>

          {/* CTA Buttons: Primary & Secondary */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            {/* Primary CTA Button: Get Started */}
            <Link
              to="/signup"
              onClick={onGetStartedClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-bold text-sm sm:text-base text-white shadow-lg hover:shadow-2xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Secondary CTA Button: Explore Projects */}
            <Link
              to="/explore-projects"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-bold text-sm sm:text-base text-slate-800 bg-white/95 hover:bg-white border border-slate-300/90 shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <Compass className="w-4 h-4 text-[#6658FF]" />
              <span>Explore Projects</span>
            </Link>
          </div>

          {/* Trust / Reassurance Sub-Row */}
          <div className="mt-10 pt-6 border-t border-slate-300/60 w-full max-w-xl flex flex-wrap items-center justify-center gap-5 sm:gap-7 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6658FF]" />
              <span>Free for students & faculty</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6658FF]" />
              <span>No credit card required</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6658FF]" />
              <span>AI-assisted guidance</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default FinalCTASection
