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

  return (
    <div className={`border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white hover:-translate-y-0.5 transition-transform duration-200 ${!isActive ? 'opacity-60' : ''}`}>
      {/* Top accent bar */}
      <div className={`h-2 ${isActive ? 'bg-[#1040C0]' : 'bg-[#121212]/20'}`} />

      <div className="p-5">
        {/* Name + icon + controls */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 ${isActive ? 'bg-[#1040C0]' : 'bg-[#121212]/20'} border-2 border-[#121212] flex items-center justify-center`}>
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tighter text-[#121212]">
                {bot.name}
              </h3>
              {!isActive && (
                <span className="text-[10px] font-black uppercase tracking-widest text-[#121212]/40">
                  Paused
                </span>
              )}
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
                  ? 'text-[#121212]/30 hover:text-[#F0C020]'
                  : 'text-[#1040C0] hover:text-[#1040C0]/70'
              }`}
            >
              <Power className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[#121212]/30 hover:text-[#D02020] transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Platform badges */}
        <div className="flex gap-2 mb-4">
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border-2 border-[#121212] ${hasWA ? 'bg-[#F0C020] text-[#121212]' : 'bg-transparent text-[#121212]/30'}`}>
            WA {hasWA ? '●' : '○'}
          </span>
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border-2 border-[#121212] ${hasIG ? 'bg-[#D02020] text-white' : 'bg-transparent text-[#121212]/30'}`}>
            IG {hasIG ? '●' : '○'}
          </span>
        </div>

        {/* Fallback message preview */}
        <p className="text-xs font-medium text-[#121212]/50 mb-4 truncate border-l-2 border-[#E0E0E0] pl-2">
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
