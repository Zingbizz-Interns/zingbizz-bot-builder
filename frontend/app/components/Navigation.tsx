'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import GeometricLogo from './GeometricLogo';
import NeoButton, { cn } from './NeoButton';
import { Menu, X } from 'lucide-react';

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
    <nav className="w-full border-b-4 border-black bg-[#FFFDF5] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/">
            <GeometricLogo />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 font-bold uppercase tracking-widest text-sm">
            <a
              href="#features"
              onClick={(e) => scrollTo(e, '#features')}
              className="cursor-pointer border-2 border-transparent px-2 py-1 transition-all duration-100 hover:border-black hover:bg-[#FF6B6B] hover:shadow-[4px_4px_0px_0px_#000]"
            >
              Features
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollTo(e, '#faq')}
              className="cursor-pointer border-2 border-transparent px-2 py-1 transition-all duration-100 hover:border-black hover:bg-[#FFD93D] hover:shadow-[4px_4px_0px_0px_#000]"
            >
              FAQ
            </a>
            <Link href="/login">
              <NeoButton variant="primary">Get Started</NeoButton>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              className="border-4 border-black p-2 bg-[#FFFDF5] shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label="Toggle navigation menu"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen
                ? <X className="h-5 w-5" strokeWidth={3} />
                : <Menu className="h-5 w-5" strokeWidth={3} />
              }
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          id="mobile-navigation"
          className={cn(
            'grid overflow-hidden transition-all duration-200 md:hidden',
            isMobileMenuOpen ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'
          )}
        >
          <div className="min-h-0">
            <div className="flex flex-col gap-3 border-t-4 border-black pt-4">
              <a
                href="#features"
                onClick={(e) => scrollTo(e, '#features')}
                className="font-bold uppercase tracking-widest border-4 border-black px-4 py-3 bg-[#FFFDF5] hover:bg-[#FF6B6B] transition-colors duration-100"
              >
                Features
              </a>
              <a
                href="#faq"
                onClick={(e) => scrollTo(e, '#faq')}
                className="font-bold uppercase tracking-widest border-4 border-black px-4 py-3 bg-[#FFFDF5] hover:bg-[#FFD93D] transition-colors duration-100"
              >
                FAQ
              </a>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <NeoButton variant="primary" className="w-full justify-center">
                  Get Started
                </NeoButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
