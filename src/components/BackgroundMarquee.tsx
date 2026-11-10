import React from 'react'

interface MarqueeRowProps {
  words: string[]
  direction: 'left' | 'right'
  duration: number // in seconds (100 - 150s for ultra-calm movement)
  className?: string
}

const MarqueeRow: React.FC<MarqueeRowProps> = ({
  words,
  direction,
  duration,
  className = '',
}) => {
  // Repeat array enough times to fill ultra-wide screens seamlessly
  const repeatedWords = Array(6).fill(words).flat()

  const animationName = direction === 'left' ? 'marquee-left' : 'marquee-right'

  return (
    <div className={`flex select-none overflow-hidden whitespace-nowrap leading-none ${className}`}>
      <div
        className="flex shrink-0 items-center gap-6 sm:gap-12"
        style={{
          animation: `${animationName} ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {repeatedWords.map((word, idx) => (
          <span
            key={`a-${idx}`}
            className="text-[12vw] sm:text-[11vw] lg:text-[10vw] font-black uppercase tracking-tighter text-[#C2D2E4] opacity-90 transition-opacity"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {word}
          </span>
        ))}
      </div>
      <div
        className="flex shrink-0 items-center gap-6 sm:gap-12"
        aria-hidden="true"
        style={{
          animation: `${animationName} ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {repeatedWords.map((word, idx) => (
          <span
            key={`b-${idx}`}
            className="text-[12vw] sm:text-[11vw] lg:text-[10vw] font-black uppercase tracking-tighter text-[#C2D2E4] opacity-90 transition-opacity"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  )
}

export const BackgroundMarquee: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 flex flex-col justify-between overflow-hidden pointer-events-none opacity-95">
      {/* Row 1: Right to left — ultra-slow calm movement */}
      <MarqueeRow
        words={['PROJECTS', 'BUILD', 'ACADEMIC', 'PROJECTS']}
        direction="left"
        duration={115}
        className="pt-2 sm:pt-4"
      />

      {/* Row 2: Left to right */}
      <MarqueeRow
        words={['LEARNING', 'FUTURE', 'STUDENTS', 'LEARNING']}
        direction="right"
        duration={138}
      />

      {/* Row 3: Right to left */}
      <MarqueeRow
        words={['COLLABORATION', 'TEAMS', 'RESEARCH', 'COLLABORATION']}
        direction="left"
        duration={122}
      />

      {/* Row 4: Left to right */}
      <MarqueeRow
        words={['INNOVATION', 'SOLUTIONS', 'CAMPUS', 'INNOVATION']}
        direction="right"
        duration={146}
      />

      {/* Row 5: Right to left */}
      <MarqueeRow
        words={['DEVELOPMENT', 'AI-POWERED', 'CODE', 'DEVELOPMENT']}
        direction="left"
        duration={128}
        className="pb-2 sm:pb-4"
      />
    </div>
  )
}

export default BackgroundMarquee
