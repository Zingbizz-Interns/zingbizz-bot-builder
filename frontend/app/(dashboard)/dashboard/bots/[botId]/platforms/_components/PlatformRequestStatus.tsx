import type { Platform, PlatformConnectionRequest } from '@/types/database'

interface PlatformRequestStatusProps {
  platform: Platform
  request: PlatformConnectionRequest | null
  hasLiveConfig: boolean
}

function getStatusCopy(platform: Platform, request: PlatformConnectionRequest | null, hasLiveConfig: boolean) {
  const platformLabel = platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'

  if (!request) {
    if (hasLiveConfig) {
      return {
        tone: 'success' as const,
        badge: 'Active',
        title: `${platformLabel} is connected`,
        body: 'No approval request is recorded for this platform yet, but the live platform configuration is already connected.',
      }
    }

    return {
      tone: 'neutral' as const,
      badge: 'No Request Yet',
      title: `No ${platformLabel} approval request yet`,
      body: 'There is no approval record on file for this platform right now. Once a request exists, its review state will appear here.',
    }
  }

  if (request.status === 'pending') {
    return {
      tone: 'warning' as const,
      badge: 'Pending Approval',
      title: `${platformLabel} is waiting for super-admin review`,
      body: hasLiveConfig
        ? 'A live platform config is still on file separately. This pending request does not change the connected state until it is reviewed.'
        : 'Do not treat this platform as live yet. The request is still waiting for super-admin approval.',
    }
  }

  if (request.status === 'approved') {
    return hasLiveConfig
      ? {
          tone: 'success' as const,
          badge: 'Approved & Active',
          title: `${platformLabel} has been approved`,
          body: 'The latest approval request is approved and the platform is currently connected.',
        }
      : {
          tone: 'neutral' as const,
          badge: 'Approved',
          title: `${platformLabel} was approved`,
          body: 'The approval record is in place, but this platform is not active yet. Activation is finalized separately from the approval note.',
        }
  }

  if (request.status === 'rejected') {
    return {
      tone: 'danger' as const,
      badge: 'Rejected',
      title: `${platformLabel} needs updates before approval`,
      body: 'The latest request was rejected. Review the note below, correct the credentials if needed, and resubmit when you are ready.',
    }
  }

  return {
    tone: 'neutral' as const,
    badge: 'Cancelled',
    title: `${platformLabel} request cancelled`,
    body: 'The latest approval request was cancelled. You can submit a new request whenever you are ready.',
  }
}

const toneClasses = {
  neutral: 'border-black/20 bg-[#F6F6F6] text-black',
  success: 'border-[#107040] bg-[#107040]/10 text-black',
  warning: 'border-[#FFD93D] bg-[#FFD93D]/12 text-black',
  danger: 'border-[#FF6B6B] bg-[#FF6B6B]/10 text-black',
}

const badgeToneClasses = {
  neutral: 'border-black bg-white text-black/70',
  success: 'border-[#107040] bg-[#107040] text-white',
  warning: 'border-black bg-[#FFD93D] text-black',
  danger: 'border-[#FF6B6B] bg-[#FF6B6B] text-white',
}

export default function PlatformRequestStatus({
  platform,
  request,
  hasLiveConfig,
}: PlatformRequestStatusProps) {
  const status = getStatusCopy(platform, request, hasLiveConfig)

  return (
    <div className={`border-2 px-4 py-3 ${toneClasses[status.tone]}`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#000000]/45">
            Approval Status
          </p>
          <h4 className="mt-1 text-sm font-black uppercase tracking-tight text-black">
            {status.title}
          </h4>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[#000000]/75">
            {status.body}
          </p>
          {request?.decision_note?.trim() && (
            <p className="mt-3 border-l-4 border-black pl-3 text-xs font-bold uppercase tracking-[0.2em] text-[#000000]/65">
              Review Note: {request.decision_note.trim()}
            </p>
          )}
        </div>

        <span className={`shrink-0 border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${badgeToneClasses[status.tone]}`}>
          {status.badge}
        </span>
      </div>
    </div>
  )
}
