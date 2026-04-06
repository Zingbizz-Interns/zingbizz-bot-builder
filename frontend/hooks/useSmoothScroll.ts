'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type SmoothScroller = {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  raf: (time: number) => void;
  destroy: () => void;
};

export default function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis();
    const appWindow = window as unknown as { lenis?: SmoothScroller };

    appWindow.lenis = lenis as SmoothScroller;
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      appWindow.lenis = undefined;
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}
