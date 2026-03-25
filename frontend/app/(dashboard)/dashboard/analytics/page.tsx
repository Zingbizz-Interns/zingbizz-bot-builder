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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-black uppercase tracking-tighter text-3xl text-[#121212]">Analytics</h1>
          <p className="text-sm font-medium text-[#121212]/50 mt-1 uppercase tracking-widest">
            All Bots · Overview
          </p>
        </div>
        <Suspense>
          <RangeFilter range={range} />
        </Suspense>
      </div>

      {/* Global totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <TotalCard label="Trigger Fires"    value={data.totals.triggerFires}  accent="blue" />
        <TotalCard label="Forms Started"    value={data.totals.formsStarted}  />
        <TotalCard label="Forms Completed"  value={data.totals.formsCompleted} />
        <TotalCard
          label="Completion Rate"
          value={data.totals.formsStarted > 0 ? `${data.totals.completionRate}%` : '—'}
          accent="yellow"
        />
        <TotalCard label="Active Users (1h)" value={data.totals.activeUsers} accent="red" />
      </div>

      {/* Per-bot grid */}
      {data.bots.length === 0 ? (
        <div className="border-4 border-[#121212] border-dashed p-20 text-center">
          <p className="font-black uppercase tracking-tighter text-[#121212]/30 text-xl">No bots yet</p>
          <p className="text-sm font-medium text-[#121212]/40 mt-2">
            Create a bot to start seeing analytics.
          </p>
        </div>
      ) : (
        <>
          <h2 className="font-black uppercase tracking-tighter text-lg text-[#121212] mb-4">
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
  accent?: 'blue' | 'red' | 'yellow'
}) {
  const topBorder = {
    blue:   'border-t-[#1040C0]',
    red:    'border-t-[#D02020]',
    yellow: 'border-t-[#F0C020]',
  }

  return (
    <div
      className={`border-4 border-t-8 border-[#121212] ${accent ? topBorder[accent] : 'border-t-[#121212]'} bg-white shadow-[4px_4px_0px_0px_#121212] p-5`}
    >
      <p className="text-xs font-black uppercase tracking-widest text-[#121212]/50 mb-2">{label}</p>
      <p className="text-3xl font-black tracking-tighter text-[#121212]">{value}</p>
    </div>
  )
}
