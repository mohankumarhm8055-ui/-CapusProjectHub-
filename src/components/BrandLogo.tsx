import React from 'react'

interface BrandLogoProps {
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
  inverted?: boolean
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  iconSize = 'md',
  inverted = false,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}>
      {/* Code icon styled closely to reference */}
      <div
        className={`${sizeMap[iconSize]} rounded-xl border-2 border-[#6658FF] bg-[#6658FF]/10 flex items-center justify-center font-mono font-bold text-[#6658FF] shadow-sm transition-transform duration-300 group-hover:scale-105`}
      >
        <span>&lt;/&gt;</span>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-sans font-bold tracking-tight text-base sm:text-lg leading-tight ${
            inverted ? 'text-white' : 'text-[#6658FF]'
          }`}
        >
          CampusProjectHub
        </span>
        <span
          className={`text-[9px] sm:text-[10px] tracking-wider uppercase font-semibold ${
            inverted ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Academic Platform
        </span>
      </div>
    </div>
  )
}

export default BrandLogo
