import { Suspense } from 'react'
import { getGlobalAnalytics } from '@/lib/actions/globalAnalytics'
import type { DateRange } from '@/lib/actions/analytics'
import RangeFilter from './_components/RangeFilter'
import BotAnalyticsCard from './_components/BotAnalyticsCard'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

const VALID_RANGES: DateRange[] = ['7d', '30d', 'all']

export default async function GlobalAnalyticsPage({ searchParams }: PageProps) {
  const { range: rangeRaw } = await searchParams
  const range: DateRange = VALID_RANGES.includes(rangeRaw as DateRange) ? (rangeRaw as DateRange) : '7d'

  const data = await getGlobalAnalytics(range)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 mb-12">
        <div className="border-4 border-black bg-[#FFD93D] px-6 py-3 shadow-[6px_6px_0px_0px_#000] -rotate-1 w-fit">
          <h1 className="font-black uppercase tracking-tighter text-4xl text-black">Analytics</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/60 mt-1 bg-white border-2 border-black px-2 py-0.5 w-fit">
            All Bots · Overview
          </p>
        </div>
        <Suspense>
          <RangeFilter range={range} />
        </Suspense>
      </div>

      {/* Global totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 mb-16 mt-4">
        <div className="-mt-2 rotate-1"><TotalCard label="Trigger Fires" value={data.totals.triggerFires} accent="red" /></div>
        <div className="mt-2 -rotate-1"><TotalCard label="Forms Started" value={data.totals.formsStarted} /></div>
        <div className="-mt-1 rotate-2"><TotalCard label="Forms Completed" value={data.totals.formsCompleted} /></div>
        <div className="mt-3 -rotate-2">
          <TotalCard
            label="Completion Rate"
            value={data.totals.formsStarted > 0 ? `${data.totals.completionRate}%` : '—'}
            accent="yellow"
          />
        </div>
        <div className="-mt-3 rotate-1"><TotalCard label="Active Users (1h)" value={data.totals.activeUsers} accent="muted" /></div>
      </div>

      {/* Per-bot grid */}
      {data.bots?.length === 0 ? (
        <div className="border-4 border-dashed border-black p-20 text-center">
          <p className="font-black uppercase tracking-tighter text-black/30 text-xl">No bots yet</p>
          <p className="text-sm font-bold text-black/40 mt-2">
            Create a bot to start seeing analytics.
          </p>
        </div>
      ) : (
        <>
          <h2 className="font-black uppercase tracking-tighter text-2xl text-black mb-6 bg-[#C4B5FD] border-4 border-black px-4 py-2 w-fit shadow-[4px_4px_0px_0px_#000] rotate-1">
            Per-Bot Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.bots.map(bot => (
              <BotAnalyticsCard key={bot.botId} bot={bot} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TotalCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'red' | 'yellow' | 'muted'
}) {
  const topBorderMap = {
    red:    'border-t-[#FF6B6B]',
    yellow: 'border-t-[#FFD93D]',
    muted:  'border-t-[#C4B5FD]',
  }

  return (
    <div
      className={`border-4 border-t-8 border-black ${accent ? topBorderMap[accent] : 'border-t-black'} bg-[#FFFDF5] shadow-[4px_4px_0px_0px_#000] p-5`}
    >
      <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">{label}</p>
      <p className="text-3xl font-black tracking-tighter text-black">{value}</p>
    </div>
  )
}
