'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getBots } from '@/lib/actions/bots'
import BotCard from './_components/BotCard'
import CreateBotModal from './_components/CreateBotModal'
import Button from '@/components/ui/Button'

export default function BotsPage() {
  const [bots, setBots] = useState<Awaited<ReturnType<typeof getBots>>>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await getBots()
    setBots(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="border-b-4 border-black pb-6 mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Dashboard</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#000000] leading-[0.9]">
            My Bots
          </h1>
        </div>
        <Button variant="red" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" strokeWidth={3} />
          New Bot
        </Button>
      </div>

      {/* Bot grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="border-4 border-black h-44 bg-[#FFD93D]/30 animate-pulse" />
          ))}
        </div>
      ) : bots.length === 0 ? (
        <div className="border-4 border-dashed border-black p-16 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#FF6B6B] border-4 border-black" />
            <div className="w-5 h-5 bg-[#FFD93D] border-4 border-black" />
            <div className="w-5 h-5 border-4 border-black"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: '#FF6B6B' }} />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-black/40 text-center">
            No bots yet.<br />Create your first bot to get started.
          </p>
          <Button variant="outline" shape="pill" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" strokeWidth={3} />
            Create Bot
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map(bot => (
            <BotCard key={bot.id} bot={bot as Parameters<typeof BotCard>[0]['bot']} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateBotModal onClose={() => { setShowModal(false); load() }} />
      )}
    </div>
  )
}
