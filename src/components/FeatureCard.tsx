import React from 'react'

export interface FeatureCardData {
  id: string
  title: string
  category: string
  description: string
  imageUrl: string
  rating?: string
  accentBadge?: string
}

interface FeatureCardProps {
  card: FeatureCardData
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ card }) => {
  return (
    <div
      className="group relative shrink-0 w-[300px] sm:w-[320px] h-[350px] rounded-[16px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer select-none border border-slate-800/20"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Background Photography / Graphic */}
      <img
        src={card.imageUrl}
        alt={card.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
      />

      {/* Dark gradient overlay for optimal typography contrast matching reference */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/40 group-hover:from-slate-950 group-hover:via-slate-950/80 transition-colors duration-300" />

      {/* Card Content: Category at top-left, title below, description below title */}
      <div className="relative z-10 p-6 flex flex-col justify-between h-full">
        <div>
          {/* Category Label at Top-Left */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/90 border border-white/15">
              {card.category}
            </span>
            {card.rating && (
              <span className="text-[11px] font-bold text-amber-400 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/30">
                ★ {card.rating}
              </span>
            )}
          </div>

          {/* Main Title below category */}
          <h3 className="text-2xl font-bold text-white tracking-tight leading-snug mt-4 drop-shadow-sm group-hover:text-white transition-colors">
            {card.title}
          </h3>

          {/* Description below title with comfortable line spacing */}
          <p className="mt-2.5 text-sm text-slate-200/90 leading-relaxed font-normal">
            {card.description}
          </p>
        </div>

        {/* Subtle bottom indicator line on hover */}
        <div className="w-full h-0.5 bg-gradient-to-r from-[#6658FF] to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
      </div>
    </div>
  )
}

export default FeatureCard
