'use client';
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './NeoButton';

interface FAQAccordionProps {
  question: string;
  answer: string;
}

export default function FAQAccordion({ question, answer }: FAQAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 w-full border-4 border-black shadow-[4px_4px_0px_0px_#000] transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          'w-full px-6 py-5 flex justify-between items-center text-left font-bold uppercase tracking-wide transition-colors duration-100',
          isOpen
            ? 'bg-[#FF6B6B] text-black'
            : 'bg-[#FFFDF5] text-black hover:bg-[#FFD93D]'
        )}
      >
        <span className="text-base md:text-lg pr-8 leading-tight">{question}</span>
        <ChevronDown
          className={cn('w-6 h-6 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
          strokeWidth={3}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px]' : 'max-h-0'
        )}
      >
        <div className="p-6 bg-[#FFD93D] text-black border-t-4 border-black font-bold text-base leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}
