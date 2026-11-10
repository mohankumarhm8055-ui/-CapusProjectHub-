import React, { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import type { ScreenshotItem } from '../types/project'

interface ScreenshotLightboxProps {
  screenshots: ScreenshotItem[]
  activeIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
}

export const ScreenshotLightbox: React.FC<ScreenshotLightboxProps> = ({
  screenshots,
  activeIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate((activeIndex - 1 + screenshots.length) % screenshots.length)
      if (e.key === 'ArrowRight') onNavigate((activeIndex + 1) % screenshots.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeIndex, screenshots.length, onClose, onNavigate])

  if (!isOpen || screenshots.length === 0) return null

  const current = screenshots[activeIndex]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between text-white pb-3 px-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <ImageIcon className="w-4 h-4 text-[#6658FF]" />
            <span>Screenshot {activeIndex + 1} of {screenshots.length}</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main image container */}
        <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10">
          <img
            src={current.url}
            alt={current.caption}
            className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl"
          />

          {/* Navigation Arrows */}
          {screenshots.length > 1 && (
            <>
              <button
                onClick={() => onNavigate((activeIndex - 1 + screenshots.length) % screenshots.length)}
                className="absolute left-3 p-2.5 rounded-full bg-slate-950/70 hover:bg-[#6658FF] text-white transition-all cursor-pointer backdrop-blur-xs border border-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => onNavigate((activeIndex + 1) % screenshots.length)}
                className="absolute right-3 p-2.5 rounded-full bg-slate-950/70 hover:bg-[#6658FF] text-white transition-all cursor-pointer backdrop-blur-xs border border-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Caption */}
        <div className="w-full mt-3 p-3 bg-white/10 backdrop-blur-md rounded-xl text-center text-xs sm:text-sm text-slate-200">
          <p>{current.caption}</p>
        </div>

        {/* Thumbnail Strip */}
        {screenshots.length > 1 && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto py-1 px-2">
            {screenshots.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => onNavigate(idx)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  idx === activeIndex
                    ? 'border-[#6658FF] scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={s.url} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ScreenshotLightbox
