import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'muted' | 'outline' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'pill';
}

const NeoButton = React.forwardRef<HTMLButtonElement, NeoButtonProps>(
  ({ className, variant = 'primary', size = 'md', shape = 'square', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base — bold, uppercase, sharp
          'inline-flex items-center justify-center font-bold uppercase tracking-wide cursor-pointer',
          'border-4 border-black transition-all duration-100 ease-out',
          'focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none',
          // Mechanical press-down on click
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0',
          // Shapes
          shape === 'square' ? 'rounded-none' : 'rounded-full',
          // Sizes
          size === 'sm' && 'px-4 py-2 text-xs h-10',
          size === 'md' && 'px-6 py-3 text-sm h-12',
          size === 'lg' && 'px-8 py-4 text-base h-14',
          // Variants
          variant === 'primary' &&
            'bg-[#FF6B6B] text-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#ff5252]',
          variant === 'secondary' &&
            'bg-[#FFD93D] text-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#ffd000]',
          variant === 'muted' &&
            'bg-[#C4B5FD] text-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#b5a3fd]',
          variant === 'outline' &&
            'bg-[#FFFDF5] text-black shadow-[4px_4px_0px_0px_#000] hover:bg-white',
          variant === 'dark' &&
            'bg-black text-white shadow-[4px_4px_0px_0px_#FF6B6B] hover:bg-[#111]',
          variant === 'ghost' &&
            'border-2 border-transparent text-black hover:border-black hover:bg-[#FFFDF5] shadow-none',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

NeoButton.displayName = 'NeoButton';

export default NeoButton;
