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
    <div className="border-b-4 border-black bg-[#FFFDF5] px-8 py-4">
      <div className="flex flex-col gap-3 border-4 border-black bg-[#FFD93D] px-5 py-4 shadow-[6px_6px_0px_0px_#000] lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border-4 border-black bg-black">
            {isManualPause ? (
              <PauseCircle className="h-5 w-5 text-[#FFD93D]" strokeWidth={2.5} />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[#FF6B6B]" strokeWidth={2.5} />
            )}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-black/60">
              Account Guardrail
            </p>
            <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-black">
              {title}
            </h3>
            <p className="mt-2 text-sm font-bold leading-relaxed text-black/75">
              {detail}
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-[#FF6B6B]">
              Triggers, automated replies, and form flows stay paused until your super admin updates this account.
            </p>
          </div>
        </div>

        {state.maxFormSubmissions !== null && (
          <div className="flex shrink-0 flex-col gap-1 border-4 border-black bg-[#FFFDF5] px-4 py-3 text-right shadow-[4px_4px_0px_0px_#000]">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-black/50">
              Stored Forms
            </span>
            <span className="text-lg font-black uppercase tracking-tight text-black">
              {state.completedFormSubmissions} / {state.maxFormSubmissions}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
