import React from 'react';

export default function GeometricLogo() {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      {/* Sticker mark — three overlapping neo shapes */}
      <div className="relative h-9 w-[52px] shrink-0 group-hover:scale-105 transition-transform duration-200">
        {/* Circle — hot red */}
        <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#FF6B6B] border-2 border-black shadow-[2px_2px_0px_0px_#000] z-10" />
        {/* Square — vivid yellow */}
        <div className="absolute left-4 top-0 w-7 h-7 bg-[#FFD93D] border-2 border-black shadow-[2px_2px_0px_0px_#000] z-20" />
        {/* Triangle — soft violet */}
        <div
          className="absolute left-8 top-0 w-7 h-7 bg-[#C4B5FD] border-2 border-black shadow-[2px_2px_0px_0px_#000] z-30"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
      </div>

      <span className="font-black tracking-tighter uppercase text-xl md:text-2xl leading-none">
        ZingBizz
      </span>
    </div>
  );
}
