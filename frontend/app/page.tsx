'use client';

import React from 'react';
import Navigation from './components/Navigation';
import HeroSection from './components/landing/HeroSection';
import FeaturesSection from './components/landing/FeaturesSection';
import IntegrationsSection from './components/landing/IntegrationsSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import FAQSection from './components/landing/FAQSection';
import CTASection from './components/landing/CTASection';
import Footer from './components/landing/Footer';
import SectionDivider from './components/SectionDivider';
import ClickSpark from './components/ClickSpark';

export default function LandingPage() {
  return (
    <ClickSpark sparkColor="#FF6B6B" sparkSize={12} sparkRadius={25} sparkCount={12} duration={500} className="w-full">
      <div className="min-h-screen overflow-x-hidden bg-[#FFFDF5] pb-20 text-black selection:bg-[#FFD93D] selection:text-black">
        <Navigation />
        <HeroSection />
        <FeaturesSection />
        <SectionDivider />
        <IntegrationsSection />
        <TestimonialsSection />
        <SectionDivider />
        <FAQSection />
        <SectionDivider />
        <CTASection />
        <Footer />
      </div>
    </ClickSpark>
  );
}
