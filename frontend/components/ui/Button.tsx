import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'red' | 'yellow' | 'muted' | 'outline' | 'ghost' | 'dark'
type Shape = 'square' | 'pill'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  shape?: Shape
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  red:     'bg-[#FF6B6B] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#ff5252]',
  yellow:  'bg-[#FFD93D] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#ffd000]',
  muted:   'bg-[#C4B5FD] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:bg-[#b5a3fd]',
  outline: 'bg-[#FFFDF5] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:bg-white',
  dark:    'bg-black text-white border-4 border-black shadow-[4px_4px_0px_0px_#FF6B6B] hover:bg-[#111]',
  ghost:   'border-2 border-transparent text-black hover:border-black hover:bg-[#FFFDF5]',
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
        'px-5 py-2.5 text-sm font-bold uppercase tracking-wide',
        'transition-all duration-100 ease-out cursor-pointer',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0',
        'focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none',
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
