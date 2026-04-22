'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, Settings, MessageSquare, Power } from 'lucide-react'
import { deleteBot, toggleBotStatus } from '@/lib/actions/bots'
import Button from '@/components/ui/Button'

interface PlatformConfig {
  platform: string
  is_active: boolean
}

interface BotCardProps {
  bot: {
    id: string
    name: string
    fallback_message: string
    created_at: string
    is_active: boolean
    platform_configs: PlatformConfig[]
  }
}

export default function BotCard({ bot }: BotCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [isActive, setIsActive] = useState(bot.is_active ?? true)
  const [toggling, setToggling] = useState(false)

  const hasWA = bot.platform_configs?.some(p => p.platform === 'whatsapp')
  const hasIG = bot.platform_configs?.some(p => p.platform === 'instagram')

  async function handleDelete() {
    if (!confirm(`Delete "${bot.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteBot(bot.id)
  }

  async function handleToggle() {
    setToggling(true)
    const next = !isActive
    setIsActive(next)
    await toggleBotStatus(bot.id, next)
    setToggling(false)
  }

  // Pseudo-random rotation for sticker effect based on ID
  const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-0'];
  const rotateClass = rotations[bot.id.charCodeAt(0) % 5];

  return (
    <div className={`relative border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all duration-200 ${rotateClass} hover:rotate-0 z-10 hover:z-20 ${!isActive ? 'opacity-60' : ''}`}>
      {/* Absolute overlapping status badge */}
      {!isActive && (
        <div className="absolute -top-4 -right-4 border-4 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0px_0px_#000] rotate-3 z-20">
          Paused
        </div>
      )}

      {/* Top accent bar */}
      <div className={`h-3 border-b-4 border-black ${isActive ? 'bg-[#FF6B6B]' : 'bg-black/20'}`} />

      <div className="p-5">
        {/* Name + icon + controls */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isActive ? 'bg-[#FFD93D]' : 'bg-black/20'} border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] -rotate-2`}>
              <MessageSquare className="w-5 h-5 text-black" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-black leading-none">
                {bot.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle active/paused */}
            <button
              onClick={handleToggle}
              disabled={toggling || deleting}
              title={isActive ? 'Pause bot' : 'Resume bot'}
              className={`p-1 transition-colors disabled:opacity-50 ${
                isActive
                  ? 'text-black/30 hover:text-[#FFD93D]'
                  : 'text-[#FF6B6B] hover:text-[#FF6B6B]/70'
              }`}
            >
              <Power className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-black/30 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Platform badges */}
        <div className="flex gap-2 mb-4">
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border-4 border-black ${hasWA ? 'bg-[#FFD93D] text-black' : 'bg-transparent text-black/30'}`}>
            WA {hasWA ? '●' : '○'}
          </span>
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border-4 border-black ${hasIG ? 'bg-[#FF6B6B] text-white' : 'bg-transparent text-black/30'}`}>
            IG {hasIG ? '●' : '○'}
          </span>
        </div>

        {/* Fallback message preview */}
        <p className="text-xs font-medium text-black/50 mb-4 truncate border-l-2 border-[#E0E0E0] pl-2">
          {bot.fallback_message}
        </p>

        {/* Actions */}
        <Link href={`/dashboard/bots/${bot.id}/platforms`}>
          <Button variant="outline" className="w-full text-xs">
            <Settings className="w-3.5 h-3.5" strokeWidth={2.5} />
            Configure
          </Button>
        </Link>
      </div>
    </div>
  )
}
