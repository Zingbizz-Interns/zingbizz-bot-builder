import React from 'react';
import { cn } from './BauhausButton';

interface BauhausCardProps extends React.HTMLAttributes<HTMLDivElement> {
  cornerShape?: 'circle' | 'square' | 'triangle' | 'none';
  cornerColor?: 'red' | 'blue' | 'yellow';
}

export default function BauhausCard({ 
  children, 
  className,
  cornerShape = 'circle',
  cornerColor = 'red',
  ...props 
}: BauhausCardProps) {
  const bgColor = {
    red: 'bg-bauhaus-red',
    blue: 'bg-bauhaus-blue',
    yellow: 'bg-bauhaus-yellow',
  }[cornerColor];

  return (
    <div 
      className={cn(
        "relative bg-white border-4 border-black shadow-hard-lg p-6 lg:p-8",
        "transition-transform duration-300 ease-out hover:-translate-y-2",
        className
      )}
      {...props}
    >
      {/* Corner Decoration */}
      {cornerShape !== 'none' && (
        <div className="absolute top-4 right-4 w-4 h-4 z-10 border-2 border-black">
          {cornerShape === 'square' && (
            <div className={`w-full h-full ${bgColor}`} />
          )}
          {cornerShape === 'circle' && (
            <div className={`w-full h-full rounded-full ${bgColor} absolute -top-0.5 -right-0.5 block border-2 border-black h-4 w-4`} />
          )}
          {cornerShape === 'triangle' && (
             <div 
               className={`w-full h-full ${bgColor} absolute -top-0.5 -right-0.5 block border-2 border-black h-4 w-4`} 
               style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
             />
          )}
        </div>
      )}
      {children}
    </div>
  );
}
