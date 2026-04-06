'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import GeometricLogo from './GeometricLogo';
import BauhausButton from './BauhausButton';
import { cn } from './BauhausButton';
import { Menu } from 'lucide-react';

type SmoothScroller = {
  scrollTo: (target: string | Element, options?: { offset?: number; duration?: number }) => void;
};

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollTo = useCallback((e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    const el = document.querySelector(target);
    if (!el) return;

    const lenis = (window as unknown as { lenis?: SmoothScroller }).lenis;
    if (lenis) {
      lenis.scrollTo(el, { offset: -80, duration: 1.2 });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setIsMobileMenuOpen(false);
  }, []);

  return (
    <nav className="w-full border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/">
            <GeometricLogo />
          </Link>

          <div className="hidden md:flex items-center space-x-8 font-bold uppercase tracking-widest text-sm">
            <a href="#features" onClick={(e) => scrollTo(e, '#features')} className="cursor-pointer transition-colors hover:text-bauhaus-red">Features</a>
            <a href="#faq" onClick={(e) => scrollTo(e, '#faq')} className="cursor-pointer transition-colors hover:text-bauhaus-yellow">FAQ</a>
            <Link href="/login">
              <BauhausButton variant="primary" shape="square">Get Started</BauhausButton>
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <BauhausButton
              variant="ghost"
              className="p-2"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label="Toggle navigation menu"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              <Menu className="h-6 w-6" strokeWidth={3} />
            </BauhausButton>
          </div>
        </div>

        <div
          id="mobile-navigation"
          className={cn(
            'grid overflow-hidden transition-all duration-300 md:hidden',
            isMobileMenuOpen ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'
          )}
        >
          <div className="min-h-0">
            <div className="flex flex-col gap-3 border-t-4 border-black pt-4">
              <a
                href="#features"
                onClick={(e) => scrollTo(e, '#features')}
                className="font-bold uppercase tracking-widest transition-colors hover:text-bauhaus-red"
              >
                Features
              </a>
              <a
                href="#faq"
                onClick={(e) => scrollTo(e, '#faq')}
                className="font-bold uppercase tracking-widest transition-colors hover:text-bauhaus-yellow"
              >
                FAQ
              </a>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <BauhausButton variant="primary" shape="square" className="w-full justify-center">
                  Get Started
                </BauhausButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
