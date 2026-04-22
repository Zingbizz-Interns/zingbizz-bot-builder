import React from 'react';
import { cn } from './NeoButton';

interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Background color variant */
  variant?: 'cream' | 'white' | 'red' | 'yellow' | 'muted' | 'black';
  /** Enables the lift-up hover animation */
  hover?: boolean;
  /** Shadow size */
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
}

const shadowMap = {
  sm: 'shadow-[4px_4px_0px_0px_#000]',
  md: 'shadow-[8px_8px_0px_0px_#000]',
  lg: 'shadow-[12px_12px_0px_0px_#000]',
  xl: 'shadow-[16px_16px_0px_0px_#000]',
};

const hoverShadowMap = {
  sm: 'hover:shadow-[6px_6px_0px_0px_#000]',
  md: 'hover:shadow-[10px_10px_0px_0px_#000]',
  lg: 'hover:shadow-[16px_16px_0px_0px_#000]',
  xl: 'hover:shadow-[20px_20px_0px_0px_#000]',
};

const variantMap = {
  cream:  'bg-[#FFFDF5] text-black',
  white:  'bg-white text-black',
  red:    'bg-[#FF6B6B] text-black',
  yellow: 'bg-[#FFD93D] text-black',
  muted:  'bg-[#C4B5FD] text-black',
  black:  'bg-black text-white',
};

export default function NeoCard({
  children,
  className,
  variant = 'white',
  hover = false,
  shadow = 'md',
  ...props
}: NeoCardProps) {
  return (
    <div
      className={cn(
        'border-4 border-black',
        variantMap[variant],
        shadowMap[shadow],
        hover && [
          'transition-transform duration-200 ease-out cursor-pointer',
          'hover:-translate-y-2',
          hoverShadowMap[shadow],
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
