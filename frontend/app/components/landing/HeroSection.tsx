'use client';

import { useRef } from 'react';
import { ArrowRight, Box, Zap } from 'lucide-react';
import AnimatedContent from '../AnimatedContent';
import BauhausButton from '../BauhausButton';
import useHeroAnimation from '@/hooks/useHeroAnimation';
import useSmoothScroll from '@/hooks/useSmoothScroll';

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useSmoothScroll();
  useHeroAnimation(heroRef);

  return (
    <section
      ref={heroRef}
      className="relative grid h-auto min-h-[85vh] w-full max-w-7xl mx-auto border-x-4 border-b-4 border-black bg-white lg:grid-cols-2"
    >
      <div className="flex flex-col justify-center border-b-4 border-black p-8 sm:p-12 lg:border-b-0 lg:border-r-4 lg:p-24">
        <h1 className="mb-8 overflow-hidden text-6xl font-black uppercase leading-[0.9] tracking-tighter sm:text-7xl lg:text-8xl">
          <div className="hero-title-line">Build</div>
          <div className="hero-title-line text-bauhaus-red">Bots</div>
          <div className="hero-title-line mt-2">Visually</div>
        </h1>
        <p className="hero-subtitle mb-12 max-w-md text-lg font-medium sm:text-xl">
          Constructivist tools for a modern era. Automate WhatsApp and Instagram with
          pure geometry and functional design. No code required.
        </p>
        <div className="hero-cta relative flex flex-wrap gap-4">
          <BauhausButton variant="primary" className="text-lg">
            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
          </BauhausButton>
          <BauhausButton variant="outline" className="text-lg">
            Watch Demo
          </BauhausButton>
        </div>
      </div>

      <div className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-bauhaus-blue p-8 sm:p-12 lg:p-24">
        <AnimatedContent distance={150} direction="horizontal" duration={1.2} ease="power4.out" delay={0.5}>
          <div className="group relative h-64 w-64 sm:h-80 sm:w-80">
            <div className="absolute inset-0 flex items-center justify-center rotate-6 border-4 border-black bg-white shadow-hard-xl transition-transform duration-500 group-hover:rotate-0">
              <Box className="h-24 w-24 text-bauhaus-red" strokeWidth={2} />
            </div>
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full border-4 border-black bg-bauhaus-yellow shadow-hard-md transition-transform duration-500 ease-out group-hover:translate-x-4 group-hover:-translate-y-4" />
            <div className="absolute -bottom-8 -left-8 flex h-32 w-32 items-center justify-center border-4 border-black bg-bauhaus-red shadow-hard-md transition-transform duration-500 ease-out group-hover:-translate-x-4 group-hover:translate-y-4">
              <Zap className="h-12 w-12 text-white" strokeWidth={3} />
            </div>
          </div>
        </AnimatedContent>
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '30px 30px' }}
        />
      </div>
    </section>
  );
}
