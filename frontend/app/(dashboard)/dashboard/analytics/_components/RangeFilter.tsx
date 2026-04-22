'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { DateRange } from '@/lib/actions/analytics'

const OPTIONS: { label: string; value: DateRange }[] = [
  { label: '7 Days',   value: '7d' },
  { label: '30 Days',  value: '30d' },
  { label: 'All Time', value: 'all' },
]

export default function RangeFilter({ range }: { range: DateRange }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function pick(value: DateRange) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-0">
      {OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => pick(opt.value)}
          className={[
            'text-xs font-black uppercase tracking-widest px-4 py-2 border-4 border-black transition-colors',
            i > 0 ? 'border-l-0' : '',
            range === opt.value
              ? 'bg-black text-white'
              : 'bg-white text-[#000000] hover:bg-[#FFFDF5]',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
