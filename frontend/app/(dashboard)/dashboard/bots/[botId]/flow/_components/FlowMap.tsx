'use client'

import { useMemo } from 'react'

interface TriggerNode {
  id: string
  name: string
  trigger_type: 'single' | 'multi' | 'any'
  action_type: 'replier' | 'form' | 'query'
  buttons: { label: string; links_to_trigger_id: string | null }[]
}

interface FlowMapProps {
  botId: string
  triggers: TriggerNode[]
}

const NODE_W = 164
const NODE_H = 58
const COL_GAP = 100
const ROW_GAP = 90
const COLS = 3
const PAD = 48

const ACTION_BG: Record<string, string> = {
  replier: '#1040C0',
  form: '#D02020',
  query: '#F0C020',
}
const ACTION_TEXT: Record<string, string> = {
  replier: '#FFFFFF',
  form: '#FFFFFF',
  query: '#121212',
}

export default function FlowMap({ botId, triggers }: FlowMapProps) {
  const layout = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    triggers.forEach((t, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      positions[t.id] = {
        x: PAD + col * (NODE_W + COL_GAP),
        y: PAD + row * (NODE_H + ROW_GAP),
      }
    })
    return positions
  }, [triggers])

  const edges = useMemo(() => {
    const result: { fromId: string; toId: string; label: string }[] = []
    for (const t of triggers) {
      for (const btn of t.buttons) {
        if (btn.links_to_trigger_id && layout[btn.links_to_trigger_id]) {
          result.push({ fromId: t.id, toId: btn.links_to_trigger_id, label: btn.label })
        }
      }
    }
    return result
  }, [triggers, layout])

  if (triggers.length === 0) {
    return (
      <div className="border-4 border-dashed border-[#121212] p-20 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#121212]/40">No triggers yet.</p>
        <p className="text-xs font-medium text-[#121212]/30 mt-2">Create triggers to see the flow map.</p>
      </div>
    )
  }

  const rows = Math.ceil(triggers.length / COLS)
  const svgW = PAD * 2 + COLS * NODE_W + (COLS - 1) * COL_GAP
  const svgH = PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP + 30

  return (
    <div className="overflow-x-auto border-4 border-[#121212] bg-[#F0F0F0] shadow-[8px_8px_0px_0px_#121212]">
      <svg width={svgW} height={svgH} className="block">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="#121212" opacity="0.7" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = layout[e.fromId]
          const to = layout[e.toId]
          if (!from || !to) return null

          // Exit from bottom-center of source, enter at top-center of target
          const x1 = from.x + NODE_W / 2
          const y1 = from.y + NODE_H
          const x2 = to.x + NODE_W / 2
          const y2 = to.y - 6
          const midY = (y1 + y2) / 2

          // Self-loop: exit right side, loop around
          const isSelf = e.fromId === e.toId
          if (isSelf) {
            const cx = from.x + NODE_W + 30
            const cy = from.y + NODE_H / 2
            return (
              <g key={i}>
                <path
                  d={`M ${from.x + NODE_W} ${from.y + NODE_H / 2 - 10} Q ${cx + 20} ${cy} ${from.x + NODE_W} ${from.y + NODE_H / 2 + 10}`}
                  fill="none"
                  stroke="#121212"
                  strokeWidth="1.5"
                  opacity="0.5"
                  markerEnd="url(#arrowhead)"
                />
                <text x={cx + 22} y={cy + 3} textAnchor="start" fontSize="8" fontWeight="700" fill="#121212" opacity="0.5">
                  {e.label.length > 12 ? e.label.slice(0, 11) + '…' : e.label}
                </text>
              </g>
            )
          }

          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke="#121212"
                strokeWidth="1.5"
                opacity="0.55"
                markerEnd="url(#arrowhead)"
              />
              {e.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 3}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#121212"
                  opacity="0.5"
                >
                  {e.label.length > 14 ? e.label.slice(0, 13) + '…' : e.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {triggers.map(t => {
          const pos = layout[t.id]
          if (!pos) return null
          const bg = ACTION_BG[t.action_type] ?? '#F0F0F0'
          const fg = ACTION_TEXT[t.action_type] ?? '#121212'
          const href = `/dashboard/bots/${botId}/triggers/${t.id}/${t.action_type}`
          const displayName = t.name.length > 17 ? t.name.slice(0, 15) + '…' : t.name

          return (
            <a key={t.id} href={href}>
              {/* Hard shadow */}
              <rect x={pos.x + 4} y={pos.y + 4} width={NODE_W} height={NODE_H} fill="#121212" />
              {/* Main node */}
              <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} fill={bg} stroke="#121212" strokeWidth="2" />
              {/* Name */}
              <text
                x={pos.x + NODE_W / 2}
                y={pos.y + NODE_H / 2 - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill={fg}
                style={{ letterSpacing: '0.04em', textTransform: 'uppercase' } as React.CSSProperties}
              >
                {displayName}
              </text>
              {/* Action + trigger type */}
              <text
                x={pos.x + NODE_W / 2}
                y={pos.y + NODE_H / 2 + 9}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={fg}
                opacity={0.7}
                style={{ letterSpacing: '0.08em', textTransform: 'uppercase' } as React.CSSProperties}
              >
                {t.action_type} · {t.trigger_type}
              </text>
            </a>
          )
        })}
      </svg>
    </div>
  )
}
