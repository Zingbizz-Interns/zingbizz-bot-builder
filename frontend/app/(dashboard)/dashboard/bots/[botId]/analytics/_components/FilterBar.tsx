'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { DateRange, PlatformFilter } from '@/lib/actions/analytics'

interface FilterBarProps {
  range: DateRange
  platform: PlatformFilter
}

const DATE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
]

const PLATFORM_OPTIONS: { label: string; value: PlatformFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Instagram', value: 'instagram' },
]

export default function FilterBar({ range, platform }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Date range */}
      <div className="flex items-center gap-0">
        {DATE_OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => update('range', opt.value)}
            className={[
              'text-xs font-black uppercase tracking-widest px-4 py-2 border-4 border-black',
              i > 0 ? 'border-l-0' : '',
              range === opt.value
                ? 'bg-black text-white'
                : 'bg-white text-[#000000] hover:bg-[#FFFDF5]',
              'transition-colors',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Platform filter */}
      <div className="flex items-center gap-0">
        {PLATFORM_OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => update('platform', opt.value)}
            className={[
              'text-xs font-black uppercase tracking-widest px-4 py-2 border-4 border-black',
              i > 0 ? 'border-l-0' : '',
              platform === opt.value
                ? opt.value === 'whatsapp'
                  ? 'bg-[#FFD93D] text-black'
                  : opt.value === 'instagram'
                    ? 'bg-[#FF6B6B] text-white'
                    : 'bg-[#FF6B6B] text-white'
                : 'bg-white text-[#000000] hover:bg-[#FFFDF5]',
              'transition-colors',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
