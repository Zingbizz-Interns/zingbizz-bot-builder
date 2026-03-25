import { cn } from '@/lib/utils'

type Accent = 'red' | 'blue' | 'yellow' | 'none'
type Decoration = 'circle' | 'square' | 'triangle' | 'none'

interface CardProps {
  children: React.ReactNode
  className?: string
  accent?: Accent
  decoration?: Decoration
  hover?: boolean
}

const accentColors: Record<Accent, string> = {
  red:    '#D02020',
  blue:   '#1040C0',
  yellow: '#F0C020',
  none:   'transparent',
}

export default function Card({
  children,
  className,
  accent = 'none',
  decoration = 'none',
  hover = false,
}: CardProps) {
  const accentColor = accentColors[accent]

  return (
    <div
      className={cn(
        'relative bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212]',
        'transition-transform duration-200 ease-out',
        hover && 'hover:-translate-y-1 cursor-pointer',
        className
      )}
    >
      {/* Corner decoration */}
      {decoration !== 'none' && accent !== 'none' && (
        <div className="absolute top-3 right-3">
          {decoration === 'circle' && (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
          )}
          {decoration === 'square' && (
            <div className="w-3 h-3 rounded-none" style={{ backgroundColor: accentColor }} />
          )}
          {decoration === 'triangle' && (
            <div
              className="w-3 h-3"
              style={{
                backgroundColor: accentColor,
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  )
}
