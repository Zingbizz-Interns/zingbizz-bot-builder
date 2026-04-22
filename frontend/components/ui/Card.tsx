import { cn } from '@/lib/utils'

type Variant = 'cream' | 'white' | 'red' | 'yellow' | 'muted' | 'black'
type Shadow = 'sm' | 'md' | 'lg' | 'xl'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: Variant
  shadow?: Shadow
  hover?: boolean
}

const variantMap: Record<Variant, string> = {
  cream:  'bg-[#FFFDF5] text-black',
  white:  'bg-white text-black',
  red:    'bg-[#FF6B6B] text-black',
  yellow: 'bg-[#FFD93D] text-black',
  muted:  'bg-[#C4B5FD] text-black',
  black:  'bg-black text-white',
}

const shadowMap: Record<Shadow, string> = {
  sm: 'shadow-[4px_4px_0px_0px_#000]',
  md: 'shadow-[8px_8px_0px_0px_#000]',
  lg: 'shadow-[12px_12px_0px_0px_#000]',
  xl: 'shadow-[16px_16px_0px_0px_#000]',
}

const hoverShadowMap: Record<Shadow, string> = {
  sm: 'hover:shadow-[6px_6px_0px_0px_#000]',
  md: 'hover:shadow-[10px_10px_0px_0px_#000]',
  lg: 'hover:shadow-[16px_16px_0px_0px_#000]',
  xl: 'hover:shadow-[20px_20px_0px_0px_#000]',
}

export default function Card({
  children,
  className,
  variant = 'white',
  shadow = 'md',
  hover = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'relative border-4 border-black',
        variantMap[variant],
        shadowMap[shadow],
        hover && [
          'transition-transform duration-200 ease-out cursor-pointer',
          'hover:-translate-y-1',
          hoverShadowMap[shadow],
        ],
        className
      )}
    >
      {children}
    </div>
  )
}
