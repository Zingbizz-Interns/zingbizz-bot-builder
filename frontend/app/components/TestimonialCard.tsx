import React from 'react';
import BauhausCard from './BauhausCard';
import { Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  imageColor: 'red' | 'blue' | 'yellow';
}

export default function TestimonialCard({ quote, author, role, imageColor }: TestimonialCardProps) {
  const bgMap = {
    red: 'bg-bauhaus-red',
    blue: 'bg-bauhaus-blue',
    yellow: 'bg-bauhaus-yellow',
  };

  const quoteColorMap = {
    red: 'text-bauhaus-red',
    blue: 'text-bauhaus-blue',
    yellow: 'text-bauhaus-yellow',
  };

  return (
    <BauhausCard cornerShape="none" className="flex flex-col group">
      <div className="mb-6 border-b-4 border-black pb-6 relative">
        <Quote className={`absolute -top-2 -right-2 h-12 w-12 opacity-20 ${quoteColorMap[imageColor]}`} />
        <p className="font-medium text-lg leading-relaxed relative z-10">&quot;{quote}&quot;</p>
      </div>
      
      <div className="flex items-center gap-4 mt-auto">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-black shadow-hard-sm ${bgMap[imageColor]} font-black text-2xl uppercase text-white`}>
          {author.charAt(0)}
        </div>
        <div>
          <div className="font-bold uppercase text-lg">{author}</div>
          <div className="font-medium text-sm text-gray-600 uppercase tracking-widest">{role}</div>
        </div>
      </div>
    </BauhausCard>
  );
}
