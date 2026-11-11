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
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 group select-none shrink-0 whitespace-nowrap ${className}`}>
      <div
        className={`${sizeMap[iconSize]} rounded-xl border-2 border-[#6658FF] bg-[#6658FF]/10 flex items-center justify-center font-mono font-bold text-[#6658FF] shadow-xs transition-transform duration-300 group-hover:scale-105 shrink-0`}
      >
        <span>&lt;/&gt;</span>
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={`font-sans font-bold tracking-tight text-[15px] sm:text-base xl:text-[17px] leading-tight whitespace-nowrap ${
            inverted ? 'text-white' : 'text-[#6658FF]'
          }`}
        >
          CampusProjectHub
        </span>
        <span
          className={`text-[9px] xl:text-[10px] tracking-wider uppercase font-semibold whitespace-nowrap ${
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
