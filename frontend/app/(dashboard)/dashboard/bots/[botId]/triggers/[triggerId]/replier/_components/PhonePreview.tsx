'use client'

import PhoneMockup from '@/components/ui/PhoneMockup'

interface PhonePreviewProps {
  platforms: string[]
  message: string
  buttons: { label: string }[]
  botName: string
}

export default function PhonePreview({ platforms, message, buttons, botName }: PhonePreviewProps) {
  return (
    <PhoneMockup
      platforms={platforms}
      botName={botName}
      label={(isWA) => isWA ? 'WhatsApp Preview' : 'Instagram Preview'}
    >
      {(isWA) => message ? (
        <div className="flex flex-col gap-2">
          <div className="max-w-[85%] self-start">
            <div
              className={`px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs leading-relaxed ${
                isWA ? 'bg-white text-[#121212] shadow-sm' : 'bg-[#F0F0F0] text-[#121212]'
              }`}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {message}
              <span className="block text-right text-[9px] mt-0.5 text-gray-400">
                {isWA ? '9:41 ✓✓' : '9:41 AM'}
              </span>
            </div>
          </div>

          {buttons.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {buttons.map((btn, i) => (
                <button
                  key={i}
                  className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border text-center ${
                    isWA
                      ? 'bg-white border-[#128C7E] text-[#128C7E]'
                      : 'bg-white border-[#0095F6] text-[#0095F6]'
                  }`}
                >
                  {btn.label || `Button ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-xs text-gray-400 italic py-8">
          Type a message to preview
        </p>
      )}
    </PhoneMockup>
  )
}
