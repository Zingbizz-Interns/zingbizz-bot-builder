import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WhatsAppSetupSteps } from '../_components/WhatsAppSetupGuide'

export default async function WhatsAppGuidePage({
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
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-[#000000] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to Platforms
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center bg-[#FFD93D] border-4 border-black shadow-[4px_4px_0px_0px_#000]">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#000000]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black/40">WhatsApp</p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Setup Guide</h1>
          </div>
        </div>

        <p className="text-sm font-medium text-black/50 mt-2">
          Follow these steps to create your Meta App, verify your phone number, generate a permanent token,
          set up your webhook, and go live on WhatsApp Cloud API.
        </p>

        {/* Step overview pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            'Prerequisites',
            'Create Meta App',
            'Verify Phone Number',
            'Permanent Token',
            'Set Up Webhook',
            'Enable Billing',
            'Go to Production',
          ].map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 border-4 border-black/20 px-2.5 py-1">
              <span className="w-4 h-4 flex items-center justify-center bg-[#FFD93D] text-[#000000] text-[9px] font-black">
                {i + 1}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <WhatsAppSetupSteps />

      {/* CTA */}
      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/dashboard/bots/${botId}/platforms`}
          className="inline-flex items-center gap-2 bg-[#FFD93D] text-[#000000] border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all px-5 py-2.5 text-sm font-bold uppercase tracking-wider"
        >
          Go Connect WhatsApp
        </Link>
        <span className="text-xs font-medium text-black/40">
          Ready? Head back and enter your credentials.
        </span>
      </div>
    </div>
  )
}
