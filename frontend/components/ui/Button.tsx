import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'red' | 'blue' | 'yellow' | 'outline' | 'ghost'
type Shape = 'square' | 'pill'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  shape?: Shape
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  red:     'bg-[#D02020] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:bg-[#D02020]/90',
  blue:    'bg-[#1040C0] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:bg-[#1040C0]/90',
  yellow:  'bg-[#F0C020] text-[#121212] border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:bg-[#F0C020]/90',
  outline: 'bg-white text-[#121212] border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:bg-[#F0F0F0]',
  ghost:   'border-none text-[#121212] hover:bg-[#E0E0E0]',
}

export default function Button({
  variant = 'red',
  shape = 'square',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-5 py-2.5 text-sm font-bold uppercase tracking-wider',
        'transition-all duration-200 ease-out cursor-pointer',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0',
        shape === 'pill' ? 'rounded-full' : 'rounded-none',
        fullWidth && 'w-full',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
