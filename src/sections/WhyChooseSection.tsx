import React from 'react'
import SectionHeading from '../components/SectionHeading'
import FeatureCarousel from '../components/FeatureCarousel'

export const WhyChooseSection: React.FC = () => {
  return (
    <section id="why-choose" className="py-24 sm:py-32 bg-[#FFFFFF] border-t border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading
          category="PLATFORM HIGHLIGHTS"
          title="Why Choose CampusProjectHub?"
          subtitle="Everything students need to plan, manage, collaborate and successfully complete academic projects."
          centered={true}
        />
      </div>

      {/* Feature Carousel */}
      <div className="w-full mt-2">
        <FeatureCarousel />
      </div>
    </section>
  )
}

export default WhyChooseSection
