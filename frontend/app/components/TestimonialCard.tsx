import React from 'react';
import NeoCard from './NeoCard';
import { Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  imageColor: 'red' | 'yellow' | 'muted';
}

export default function TestimonialCard({ quote, author, role, imageColor }: TestimonialCardProps) {
  const bgMap = {
    red:    'bg-[#FF6B6B]',
    yellow: 'bg-[#FFD93D]',
    muted:  'bg-[#C4B5FD]',
  };

  const quoteColorMap = {
    red:    'text-[#FF6B6B]',
    yellow: 'text-[#FFD93D]',
    muted:  'text-[#C4B5FD]',
  };

  return (
    <NeoCard hover shadow="lg" className="flex flex-col p-8">
      {/* Quote block */}
      <div className="mb-6 border-b-4 border-black pb-6 relative">
        <Quote
          className={`absolute -top-2 -right-2 h-12 w-12 opacity-25 ${quoteColorMap[imageColor]}`}
        />
        <p className="font-bold text-lg leading-relaxed relative z-10">
          &quot;{quote}&quot;
        </p>
      </div>

      {/* Author */}
      <div className="flex items-center gap-4 mt-auto">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_#000] ${bgMap[imageColor]} font-black text-2xl uppercase`}
        >
          {author.charAt(0)}
        </div>
        <div>
          <div className="font-black uppercase text-base tracking-tight">{author}</div>
          <div className="font-bold text-xs uppercase tracking-widest">{role}</div>
        </div>
      </div>
    </NeoCard>
  );
}
