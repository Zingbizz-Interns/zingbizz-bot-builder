import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FlowMap from './_components/FlowMap'

export default async function FlowPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: triggers } = await supabase
    .from('triggers')
    .select(`
      id, name, trigger_type, action_type,
      replier_actions (
        replier_buttons ( button_label, links_to_trigger_id )
      )
    `)
    .eq('bot_id', botId)
    .order('created_at', { ascending: true })

  if (!triggers) notFound()

  const nodes = triggers.map(t => ({
    id: t.id,
    name: t.name ?? 'Untitled',
    trigger_type: t.trigger_type as 'single' | 'multi' | 'any',
    action_type: t.action_type as 'replier' | 'form' | 'query',
    buttons: (Array.isArray(t.replier_actions) ? t.replier_actions : t.replier_actions ? [t.replier_actions] : [])
      .flatMap((ra: { replier_buttons?: { button_label: string; links_to_trigger_id: string | null }[] }) => ra.replier_buttons ?? [])
      .map((b: { button_label: string; links_to_trigger_id: string | null }) => ({
        label: b.button_label,
        links_to_trigger_id: b.links_to_trigger_id,
      })),
  }))

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Flow Map</h2>
        <p className="text-sm font-medium text-black/50 mt-1">
          Visual overview of how your triggers connect. Click a node to open its builder.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-6">
        {[
          { type: 'Replier', color: '#FF6B6B' },
          { type: 'Form', color: '#FF6B6B' },
          { type: 'Query', color: '#FFD93D' },
        ].map(({ type, color }) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-4 h-4 border-4 border-black" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold uppercase tracking-widest text-black/60">{type}</span>
          </div>
        ))}
        <span className="text-xs font-medium text-black/30 ml-2">
          Arrows = replier button links
        </span>
      </div>

      <FlowMap botId={botId} triggers={nodes} />
    </div>
  )
}
