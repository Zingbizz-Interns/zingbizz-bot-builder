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
    <ClickSpark sparkColor="#D02020" sparkSize={12} sparkRadius={25} sparkCount={12} duration={500} className="w-full">
      <div className="min-h-screen overflow-x-hidden bg-bauhaus-white pb-20 text-bauhaus-black selection:bg-bauhaus-blue selection:text-white">
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
