import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BotSummary } from '@/lib/actions/globalAnalytics'

export default function BotAnalyticsCard({ bot }: { bot: BotSummary }) {
  const hasActivity = bot.triggerFires > 0 || bot.formsStarted > 0

  return (
    <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] bg-white flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-[#121212] px-5 py-4 flex items-center justify-between gap-2">
        <h3 className="font-black uppercase tracking-tighter text-base text-[#121212] truncate">
          {bot.botName}
        </h3>
        <Link
          href={`/dashboard/bots/${bot.botId}/analytics`}
          className="shrink-0 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#121212]/40 hover:text-[#1040C0] transition-colors"
        >
          Details
          <ArrowRight className="w-3 h-3" strokeWidth={3} />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 divide-x-2 divide-y-2 divide-[#121212]/10 flex-1">
        <Stat label="Trigger Fires" value={bot.triggerFires} accent="blue" />
        <Stat label="Active Users (1h)" value={bot.activeUsers} accent="yellow" />
        <Stat label="Forms Completed" value={bot.formsCompleted} />
        <Stat
          label="Completion Rate"
          value={bot.formsStarted > 0 ? `${bot.completionRate}%` : '—'}
          accent={
            bot.formsStarted === 0
              ? undefined
              : bot.completionRate >= 70
                ? 'green'
                : bot.completionRate >= 40
                  ? 'yellow'
                  : 'red'
          }
        />
      </div>

      {!hasActivity && (
        <div className="px-5 py-3 border-t-2 border-[#121212]/10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/30 text-center">
            No activity in selected period
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'blue' | 'red' | 'yellow' | 'green'
}) {
  const valueColors = {
    blue: 'text-[#1040C0]',
    red: 'text-[#D02020]',
    yellow: 'text-[#B08000]',
    green: 'text-[#1040C0]',
  }

  return (
    <div className="px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tighter ${accent ? valueColors[accent] : 'text-[#121212]'}`}>
        {value}
      </p>
    </div>
  )
}
