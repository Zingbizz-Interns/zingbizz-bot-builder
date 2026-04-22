'use client';

import { useRef } from 'react';
import { ArrowRight, Star, Zap } from 'lucide-react';
import AnimatedContent from '../AnimatedContent';
import NeoButton from '../NeoButton';
import useHeroAnimation from '@/hooks/useHeroAnimation';
import useSmoothScroll from '@/hooks/useSmoothScroll';

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useSmoothScroll();
  useHeroAnimation(heroRef);

  return (
    <section
      ref={heroRef}
      className="relative w-full max-w-7xl mx-auto border-x-4 border-b-4 border-black bg-[#FFFDF5] lg:grid lg:grid-cols-[60%_40%] min-h-[88vh]"
    >
      {/* Left — hero content */}
      <div className="flex flex-col justify-center border-b-4 border-black p-8 sm:p-12 lg:border-b-0 lg:border-r-4 lg:p-16 xl:p-24">
        {/* Eyebrow badge */}
        <div className="hero-title-line mb-6 inline-flex w-fit items-center gap-2 border-4 border-black bg-[#FFD93D] px-4 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-1">
          <Star className="h-4 w-4 fill-black" strokeWidth={0} />
          <span className="font-black uppercase tracking-widest text-xs">No-Code Bot Builder</span>
        </div>

        {/* Headline */}
        <h1 className="mb-8 overflow-hidden font-black uppercase leading-none tracking-tighter">
          <div className="hero-title-line text-7xl sm:text-8xl lg:text-9xl">Build</div>
          <div className="hero-title-line text-7xl sm:text-8xl lg:text-9xl bg-[#FF6B6B] border-4 border-black px-2 w-fit shadow-[6px_6px_0px_0px_#000] rotate-1 my-2">
            Bots
          </div>
          <div className="hero-title-line text-7xl sm:text-8xl lg:text-9xl">Visually</div>
        </h1>

        <p className="hero-subtitle mb-12 max-w-md text-lg font-bold leading-relaxed">
          Automate WhatsApp &amp; Instagram with a drag-and-drop flow builder.
          Zero code, pure logic. Deploy in minutes.
        </p>

        <div className="hero-cta flex flex-wrap gap-4">
          <NeoButton variant="primary" size="lg" className="text-lg">
            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
          </NeoButton>
          <NeoButton variant="outline" size="lg" className="text-lg">
            Watch Demo
          </NeoButton>
        </div>
      </div>

      {/* Right — visual chaos zone */}
      <div className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-[#FF6B6B] border-l-0 p-8">
        {/* Halftone texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)',
            backgroundSize: '20px 20px',
          }}
        />

        <AnimatedContent distance={150} direction="horizontal" duration={1.2} ease="power4.out" delay={0.5}>
          <div className="group relative h-72 w-72 sm:h-80 sm:w-80">
            {/* Central card */}
            <div className="absolute inset-0 flex items-center justify-center border-4 border-black bg-[#FFFDF5] shadow-[12px_12px_0px_0px_#000] rotate-3 transition-transform duration-500 group-hover:rotate-0">
              <Zap className="h-24 w-24 text-[#FF6B6B]" strokeWidth={2.5} fill="currentColor" />
            </div>

            {/* Floating yellow square */}
            <div className="absolute -top-10 -right-10 h-24 w-24 border-4 border-black bg-[#FFD93D] shadow-[6px_6px_0px_0px_#000] transition-transform duration-500 ease-out group-hover:translate-x-4 group-hover:-translate-y-4 animate-spin-slow" />

            {/* Floating muted circle */}
            <div className="absolute -bottom-8 -left-10 h-28 w-28 rounded-full border-4 border-black bg-[#C4B5FD] shadow-[6px_6px_0px_0px_#000] transition-transform duration-500 ease-out group-hover:-translate-x-4 group-hover:translate-y-4" />

            {/* Sticker badge */}
            <div className="absolute -top-4 -left-6 border-4 border-black bg-black text-white px-3 py-1 font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_#FFD93D] -rotate-3">
              Free Forever
            </div>
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
}
