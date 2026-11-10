import React, { useRef, useState, useEffect, useCallback } from 'react'
import FeatureCard from './FeatureCard'
import type { FeatureCardData } from './FeatureCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const CAROUSEL_CARDS: FeatureCardData[] = [
  {
    id: 'card-1',
    title: 'Project Management',
    category: 'PROJECT WORKSPACE',
    description: 'Organize academic projects, tasks, deadlines and milestones.',
    imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
    rating: '4.9/5',
  },
  {
    id: 'card-2',
    title: 'AI Learning Assistant',
    category: 'AI LEARNING',
    description: 'Understand difficult concepts and receive AI-powered project guidance.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    rating: '4.9/5',
  },
  {
    id: 'card-3',
    title: 'Team Collaboration',
    category: 'TEAMWORK',
    description: 'Connect teammates and distribute project responsibilities.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    rating: '4.8/5',
  },
  {
    id: 'card-4',
    title: 'Faculty Guidance',
    category: 'FACULTY SUPPORT',
    description: 'Receive project reviews, feedback and academic supervision.',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    rating: '5.0/5',
  },
  {
    id: 'card-5',
    title: 'Project Repository',
    category: 'KNOWLEDGE HUB',
    description: 'Explore approved academic projects from previous batches.',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
    rating: '4.9/5',
  },
  {
    id: 'card-6',
    title: 'Progress Tracking',
    category: 'PROJECT ANALYTICS',
    description: 'Monitor project completion, milestones and submissions.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    rating: '4.8/5',
  },
]

export const FeatureCarousel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollBounds = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  useEffect(() => {
    checkScrollBounds()
    const container = scrollRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollBounds, { passive: true })
    }
    window.addEventListener('resize', checkScrollBounds)
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollBounds)
      }
      window.removeEventListener('resize', checkScrollBounds)
    }
  }, [checkScrollBounds])

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const cardWidth = 344 // 320px width + 24px gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth

    scrollRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-8 group/carousel">
      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          aria-label="Previous feature"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xl border border-slate-200 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-108 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          aria-label="Next feature"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xl border border-slate-200 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-108 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-6 h-6 stroke-[2.2]" />
        </button>
      )}

      {/* Horizontal Carousel Track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-4 px-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {CAROUSEL_CARDS.map(card => (
          <FeatureCard key={card.id} card={card} />
        ))}

        {/* Peek buffer to ensure partial next card visibility */}
        <div className="shrink-0 w-8 sm:w-16 pointer-events-none" />
      </div>
    </div>
  )
}

export default FeatureCarousel
