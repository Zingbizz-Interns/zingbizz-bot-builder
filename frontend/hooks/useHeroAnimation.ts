'use client';

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function useHeroAnimation(heroRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top 80%',
          onEnter: () => timeline.play(),
          onLeaveBack: () => timeline.pause(0),
          onEnterBack: () => timeline.restart(),
          onLeave: () => timeline.pause(0),
        },
      });

      timeline
        .from('.hero-title-line', {
          y: 100,
          opacity: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
        })
        .from(
          '.hero-subtitle',
          { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' },
          '-=0.4'
        )
        .from(
          '.hero-cta',
          { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.5)' },
          '-=0.2'
        );
    }, heroRef);

    return () => ctx.revert();
  }, [heroRef]);
}
