import React from 'react';

export default function GeometricLogo() {
  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className="flex gap-[-2px] items-center relative h-8 w-16 group-hover:scale-105 transition-transform duration-300">
        <div className="w-6 h-6 rounded-full bg-[#1040C0] border-2 border-black absolute left-0 z-10 shadow-[2px_2px_0px_0px_black]"></div>
        <div className="w-6 h-6 bg-[#D02020] border-2 border-black absolute left-4 z-20 shadow-[2px_2px_0px_0px_black]"></div>
        <div 
          className="w-6 h-6 bg-[#F0C020] border-2 border-black absolute left-8 z-30 shadow-[2px_2px_0px_0px_black]" 
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        ></div>
      </div>
      <span className="font-black tracking-tighter uppercase text-xl md:text-2xl mt-1">ZingBizz</span>
    </div>
  );
}
