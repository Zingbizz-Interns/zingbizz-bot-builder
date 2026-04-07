import { AlertTriangle, PauseCircle } from 'lucide-react'
import type { BotAutomationGuardrailState } from '@/lib/botGuardrails'

interface BotAutomationStatusBannerProps {
  state: BotAutomationGuardrailState
}

export default function BotAutomationStatusBanner({ state }: BotAutomationStatusBannerProps) {
  if (!state.isBlocked) {
    return null
  }

  const isManualPause = state.blockReason === 'automation_disabled'
  const title = isManualPause ? 'Automation Paused' : 'Submission Limit Reached'
  const detail = isManualPause
    ? state.automationDisabledReason?.trim() || 'A super admin paused automation for this account.'
    : `This account has stored ${state.completedFormSubmissions} completed form submission${
        state.completedFormSubmissions === 1 ? '' : 's'
      }${state.maxFormSubmissions !== null ? ` out of ${state.maxFormSubmissions}` : ''}.`

  return (
    <div className="border-b-4 border-[#121212] bg-[#FFF3D6] px-8 py-4">
      <div className="flex flex-col gap-3 border-4 border-[#121212] bg-white px-5 py-4 shadow-[6px_6px_0px_0px_#121212] lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#121212] bg-[#F0C020]">
            {isManualPause ? (
              <PauseCircle className="h-5 w-5 text-[#121212]" strokeWidth={2.5} />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[#121212]" strokeWidth={2.5} />
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#121212]/45">
              Account Guardrail
            </p>
            <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-[#121212]">
              {title}
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#121212]/75">
              {detail}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-[#D02020]">
              Triggers, automated replies, and form flows stay paused until your super admin updates this account.
            </p>
          </div>
        </div>

        {state.maxFormSubmissions !== null && (
          <div className="flex shrink-0 flex-col gap-1 border-2 border-[#121212] bg-[#F7F7F7] px-4 py-3 text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#121212]/45">
              Stored Forms
            </span>
            <span className="text-lg font-black uppercase tracking-tight text-[#121212]">
              {state.completedFormSubmissions} / {state.maxFormSubmissions}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
