import { Suspense } from 'react'
import { getPlatformConfigs } from '@/lib/actions/platforms'
import WhatsAppForm from './_components/WhatsAppForm'
import InstagramForm from './_components/InstagramForm'
import type { PlatformConfig } from '@/types/database'

export default async function PlatformsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params
  const configs = await getPlatformConfigs(botId)

  const waConfig = (configs.find(c => c.platform === 'whatsapp') ?? null) as PlatformConfig | null
  const igConfig = (configs.find(c => c.platform === 'instagram') ?? null) as PlatformConfig | null

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-1">Bot Config</p>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Platforms</h2>
        <p className="text-sm font-medium text-[#121212]/50 mt-1">
          Connect your Meta API credentials. Validate before saving.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp */}
        <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
          <div className="bg-[#F0C020] border-b-4 border-[#121212] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#121212]" />
              <h3 className="text-base font-black uppercase tracking-tighter text-[#121212]">WhatsApp</h3>
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border-2 border-[#121212] ${waConfig ? 'bg-[#121212] text-[#F0C020]' : 'bg-transparent text-[#121212]/40'}`}>
              {waConfig ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="p-6">
            <WhatsAppForm botId={botId} existing={waConfig} />
          </div>
        </div>

        {/* Instagram */}
        <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
          <div className="bg-[#D02020] border-b-4 border-[#121212] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-white" />
              <h3 className="text-base font-black uppercase tracking-tighter text-white">Instagram</h3>
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 border-2 ${igConfig ? 'bg-white border-white text-[#D02020]' : 'bg-transparent border-white/40 text-white/40'}`}>
              {igConfig ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="p-6">
            <Suspense fallback={null}>
              <InstagramForm botId={botId} existing={igConfig} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
