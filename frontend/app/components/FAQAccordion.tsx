'use client';
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './BauhausButton';

interface FAQAccordionProps {
  question: string;
  answer: string;
}

export default function FAQAccordion({ question, answer }: FAQAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6 w-full border-4 border-black shadow-hard-sm transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-6 py-4 flex justify-between items-center text-left transition-colors duration-300 font-bold uppercase",
          isOpen ? "bg-bauhaus-red text-white" : "bg-white text-black hover:bg-gray-50"
        )}
      >
        <span className="text-lg md:text-xl pr-8">{question}</span>
        <ChevronDown className={cn("w-6 h-6 transition-transform duration-300", isOpen && "rotate-180")} strokeWidth={3} />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-[500px]" : "max-h-0"
        )}
      >
        <div className="p-6 bg-[#FFF9C4] text-black border-t-4 border-black font-medium text-lg leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}
