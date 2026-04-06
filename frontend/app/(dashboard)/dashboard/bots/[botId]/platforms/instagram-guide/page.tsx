import Link from 'next/link'
import { ArrowLeft, Instagram } from 'lucide-react'
import { InstagramSetupSteps } from '../_components/InstagramSetupGuide'

export default async function InstagramGuidePage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  const { botId } = await params

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/bots/${botId}/platforms`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#121212]/40 hover:text-[#121212] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to Platforms
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F56040] border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212]">
            <Instagram className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40">Instagram</p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Setup Guide</h1>
          </div>
        </div>

        <p className="text-sm font-medium text-[#121212]/50 mt-2">
          Follow these steps to create your Meta App, configure OAuth, set up webhooks, and go live.
          Each step can be expanded for detailed instructions.
        </p>

        {/* Step overview pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            'Prerequisites',
            'Create Meta App',
            'Add Instagram',
            'OAuth Redirect URI',
            'Get Credentials',
            'Set Up Webhook',
            'App Review',
          ].map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 border-2 border-[#121212]/20 px-2.5 py-1">
              <span className="w-4 h-4 flex items-center justify-center bg-[#D02020] text-white text-[9px] font-black">
                {i + 1}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#121212]/60">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <InstagramSetupSteps />

      {/* CTA */}
      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/dashboard/bots/${botId}/platforms`}
          className="inline-flex items-center gap-2 bg-[#D02020] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:shadow-[2px_2px_0px_0px_#121212] hover:translate-x-[2px] hover:translate-y-[2px] transition-all px-5 py-2.5 text-sm font-bold uppercase tracking-wider"
        >
          <Instagram className="w-4 h-4" strokeWidth={2.5} />
          Go Connect Instagram
        </Link>
        <span className="text-xs font-medium text-[#121212]/40">
          Ready? Head back and click &quot;Connect with Instagram&quot;.
        </span>
      </div>
    </div>
  )
}
