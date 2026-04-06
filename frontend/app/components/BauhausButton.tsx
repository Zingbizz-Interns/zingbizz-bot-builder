import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BauhausButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'yellow' | 'outline' | 'ghost';
  shape?: 'square' | 'pill';
}

const BauhausButton = React.forwardRef<HTMLButtonElement, BauhausButtonProps>(
  ({ className, variant = 'primary', shape = 'square', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2',
          // Interaction states & typography
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          'px-6 py-3 text-sm md:text-base cursor-pointer',
          // Shapes
          shape === 'square' ? 'rounded-none' : 'rounded-full',
          // Variants
          variant === 'primary' && 'border-2 border-black bg-bauhaus-red text-white shadow-hard-sm hover:bg-bauhaus-red/90 focus:ring-bauhaus-red',
          variant === 'secondary' && 'border-2 border-black bg-bauhaus-blue text-white shadow-hard-sm hover:bg-bauhaus-blue/90 focus:ring-bauhaus-blue',
          variant === 'yellow' && 'border-2 border-black bg-bauhaus-yellow text-black shadow-hard-sm hover:bg-bauhaus-yellow/90 focus:ring-bauhaus-yellow',
          variant === 'outline' && 'bg-white text-black border-2 border-black shadow-hard-sm hover:bg-gray-50 focus:ring-black',
          variant === 'ghost' && 'border-none text-black hover:bg-gray-200',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

BauhausButton.displayName = 'BauhausButton';

export default BauhausButton;
