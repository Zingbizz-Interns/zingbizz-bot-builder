import { Suspense } from 'react'
import { getAnalytics, getAnswerDistribution } from '@/lib/actions/analytics'
import type { DateRange, PlatformFilter } from '@/lib/actions/analytics'
import FilterBar from './_components/FilterBar'
import StatCard from './_components/StatCard'

interface PageProps {
  params: Promise<{ botId: string }>
  searchParams: Promise<{ range?: string; platform?: string }>
}

const VALID_RANGES = ['7d', '30d', 'all'] as const
const VALID_PLATFORMS = ['all', 'whatsapp', 'instagram'] as const

export default async function AnalyticsPage({ params, searchParams }: PageProps) {
  const { botId } = await params
  const { range: rangeRaw, platform: platformRaw } = await searchParams

  const range: DateRange = VALID_RANGES.includes(rangeRaw as DateRange) ? (rangeRaw as DateRange) : '7d'
  const platform: PlatformFilter = VALID_PLATFORMS.includes(platformRaw as PlatformFilter)
    ? (platformRaw as PlatformFilter)
    : 'all'

  const [data, answerDist] = await Promise.all([
    getAnalytics(botId, range, platform),
    getAnswerDistribution(botId),
  ])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-black uppercase tracking-tighter text-3xl text-black">Analytics</h1>
          <p className="text-sm font-medium text-black/50 mt-1 uppercase tracking-widest">
            Bot Performance
          </p>
        </div>
        <Suspense>
          <FilterBar range={range} platform={platform} />
        </Suspense>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Trigger Fires" value={data.totals.triggerFires} accent="blue" />
        <StatCard label="Forms Completed" value={data.totals.formsCompleted} accent="black" />
        <StatCard label="Form Abandon Rate" value={`${data.totals.abandonRate}%`} accent="red" />
        <StatCard label="Active Users (1h)" value={data.activeUsers} accent="yellow" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Trigger leaderboard */}
        <section>
          <h2 className="font-black uppercase tracking-tighter text-lg text-[#000000] mb-3">
            Trigger Leaderboard
          </h2>
          {data.triggerStats.length === 0 ? (
            <EmptyState label="No trigger fires recorded" />
          ) : (
            <div className="border-4 border-black shadow-[4px_4px_0px_0px_#000]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Trigger</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Fires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.triggerStats.map((t, i) => (
                    <tr
                      key={t.id}
                      className={`border-b-2 border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FFFDF5]'}`}
                    >
                      <td className="px-4 py-3 font-bold text-sm text-black">{t.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-black text-lg text-[#FF6B6B]">{t.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Form performance */}
        <section>
          <h2 className="font-black uppercase tracking-tighter text-lg text-[#000000] mb-3">
            Form Performance
          </h2>
          {data.formStats.length === 0 ? (
            <EmptyState label="No form activity recorded" />
          ) : (
            <div className="border-4 border-black shadow-[4px_4px_0px_0px_#000] overflow-x-auto">
              <table className="w-full border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Form</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Started</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Done</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.formStats.map((f, i) => (
                    <tr
                      key={f.id}
                      className={`border-b-2 border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FFFDF5]'}`}
                    >
                      <td className="px-4 py-3 font-bold text-sm text-black">{f.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-sm">{f.started}</td>
                      <td className="px-4 py-3 text-right font-bold text-sm">{f.completed}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs font-black px-2 py-0.5 border-4 border-black ${
                            f.completionRate >= 70
                              ? 'bg-[#FF6B6B] text-white'
                              : f.completionRate >= 40
                                ? 'bg-[#FFD93D] text-black'
                                : 'bg-[#FF6B6B] text-white'
                          }`}
                        >
                          {f.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Answer Distribution heatmap */}
      {answerDist.length > 0 && (
        <section className="mt-8">
          <h2 className="font-black uppercase tracking-tighter text-lg text-[#000000] mb-1">
            Answer Distribution
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">
            Multiple-choice questions only
          </p>
          <div className="space-y-4">
            {answerDist.map(q => (
              <div key={q.questionId} className="border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                <div className="bg-black px-4 py-2 flex items-center justify-between gap-4">
                  <span className="text-white font-black text-sm uppercase tracking-tighter truncate">
                    {q.questionText}
                  </span>
                  <span className="text-white/40 text-xs font-bold shrink-0">
                    {q.formName} · {q.totalAnswers} answers
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {q.options.map(opt => (
                    <div key={opt.label} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#000000] w-36 shrink-0 truncate" title={opt.label}>
                        {opt.label}
                      </span>
                      <div className="flex-1 h-5 bg-[#FFFDF5] border-4 border-black relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#FF6B6B] transition-all duration-300"
                          style={{ width: `${opt.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-[#000000] w-10 text-right shrink-0">
                        {opt.pct}%
                      </span>
                      <span className="text-xs text-black/40 w-8 text-right shrink-0">
                        {opt.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conversion Funnel */}
      {data.formStats.length > 0 && (
        <section className="mt-8">
          <h2 className="font-black uppercase tracking-tighter text-lg text-[#000000] mb-1">
            Conversion Funnel
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">
            Per form trigger: triggered → started → completed
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.formStats.map(f => {
              const fired = data.triggerStats.find(t => t.id === f.id)?.count ?? 0
              const stages = [
                { label: 'Triggered',  value: fired,       color: '#FF6B6B' },
                { label: 'Started',    value: f.started,   color: '#FFD93D' },
                { label: 'Completed',  value: f.completed, color: '#000000' },
              ]
              const max = Math.max(fired, 1)
              return (
                <div key={f.id} className="border-4 border-black shadow-[4px_4px_0px_0px_#000]">
                  <div className="bg-[#FF6B6B] border-b-4 border-black px-4 py-2">
                    <span className="text-white font-black text-sm uppercase tracking-tighter">{f.name}</span>
                  </div>
                  <div className="p-5 space-y-4">
                    {stages.map((s, i) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black uppercase tracking-widest text-black/60">{s.label}</span>
                          <span className="text-lg font-black text-black">{s.value}</span>
                        </div>
                        <div className="h-6 bg-[#FFFDF5] border-4 border-black overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${Math.round((s.value / max) * 100)}%`, backgroundColor: s.color }}
                          />
                        </div>
                        {i < stages.length - 1 && s.value > 0 && stages[i + 1].value >= 0 && (
                          <p className="text-[10px] font-bold text-black/30 mt-1 text-right">
                            {Math.round((stages[i + 1].value / Math.max(s.value, 1)) * 100)}% passed
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Question drop-off */}
      {data.questionStats.length > 0 && (
        <section className="mt-8">
          <h2 className="font-black uppercase tracking-tighter text-lg text-[#000000] mb-3">
            Question Drop-off
          </h2>
          <div className="border-4 border-black shadow-[4px_4px_0px_0px_#000] overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Question</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Answered</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Abandoned</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Abandon %</th>
                </tr>
              </thead>
              <tbody>
                {data.questionStats.map((q, i) => (
                  <tr
                    key={q.id}
                    className={`border-b-2 border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FFFDF5]'}`}
                  >
                    <td className="px-4 py-3 font-medium text-sm text-[#000000] max-w-xs">
                      <span className="block truncate">{q.text}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sm">{q.answered}</td>
                    <td className="px-4 py-3 text-right font-bold text-sm">{q.abandoned}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-black px-2 py-0.5 border-4 border-black ${
                          q.abandonRate >= 50
                            ? 'bg-[#FF6B6B] text-white'
                            : q.abandonRate >= 25
                              ? 'bg-[#FFD93D] text-black'
                              : 'bg-[#FFFDF5] text-black'
                        }`}
                      >
                        {q.abandonRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border-4 border-black border-dashed p-10 text-center">
      <p className="font-black uppercase tracking-tighter text-black/30">{label}</p>
    </div>
  )
}
