import React from 'react'

interface SectionHeadingProps {
  category?: string
  title: string
  subtitle?: string
  centered?: boolean
  className?: string
  titleClassName?: string
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  category,
  title,
  subtitle,
  centered = true,
  className = '',
  titleClassName = '',
}) => {
  return (
    <div
      className={`max-w-3xl mb-12 sm:mb-16 ${
        centered ? 'mx-auto text-center' : 'text-left'
      } ${className}`}
    >
      {category && (
        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold uppercase tracking-widest text-[#6658FF] bg-[#6658FF]/10 rounded-full border border-[#6658FF]/20">
          {category}
        </span>
      )}
      <h2
        className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0B192C] leading-tight ${titleClassName}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default SectionHeading
