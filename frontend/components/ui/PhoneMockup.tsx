'use client'

import { ReactNode, useState } from 'react'
import { ChevronLeft, MoreVertical } from 'lucide-react'

interface PhoneMockupProps {
  platforms: string[]
  botName: string
  /** Optional label shown below the phone. Omit to render no label. */
  label?: string | ((isWA: boolean) => string)
  /** When provided, the bottom input bar becomes a live functional input. */
  inputValue?: string
  onInputChange?: (val: string) => void
  onInputSubmit?: () => void
  inputPlaceholder?: string
  children: (isWA: boolean) => ReactNode
}

export default function PhoneMockup({ platforms, botName, label, inputValue, onInputChange, onInputSubmit, inputPlaceholder, children }: PhoneMockupProps) {
  const [skin, setSkin] = useState<'whatsapp' | 'instagram'>(
    platforms.includes('whatsapp') ? 'whatsapp' : 'instagram'
  )
  const isWA = skin === 'whatsapp'

  const labelText = typeof label === 'function' ? label(isWA) : label

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Platform toggle — only when trigger has both platforms */}
      {platforms.includes('whatsapp') && platforms.includes('instagram') && (
        <div className="flex border-2 border-[#121212]">
          {(['whatsapp', 'instagram'] as const).map(p => (
            <button
              key={p}
              onClick={() => setSkin(p)}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-colors ${
                skin === p ? 'bg-[#121212] text-white' : 'bg-white text-[#121212]/50'
              }`}
            >
              {p === 'whatsapp' ? 'WA' : 'IG'}
            </button>
          ))}
        </div>
      )}

      {/* Phone frame */}
      <div className="w-[280px] border-[6px] border-[#121212] rounded-[32px] overflow-hidden shadow-[6px_6px_0px_0px_#121212] bg-white">
        {/* Status bar */}
        <div className={`px-5 pt-2 pb-1 flex justify-between items-center text-[10px] font-bold ${isWA ? 'bg-[#075E54] text-white' : 'bg-white text-[#121212]'}`}>
          <span>9:41</span>
          <span>100%</span>
        </div>

        {/* Header */}
        {isWA ? (
          <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            <div className="w-8 h-8 rounded-full bg-[#128C7E] border-2 border-white/30 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{botName[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">{botName}</p>
              <p className="text-white/60 text-[10px]">online</p>
            </div>
            <MoreVertical className="w-4 h-4 text-white/80" strokeWidth={2} />
          </div>
        ) : (
          <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
            <ChevronLeft className="w-5 h-5 text-[#121212]" strokeWidth={2.5} />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">{botName[0]?.toUpperCase()}</span>
            </div>
            <p className="text-[#121212] text-xs font-bold truncate flex-1">{botName}</p>
          </div>
        )}

        {/* Chat area — provided by caller */}
        <div
          className="min-h-[320px] p-3 flex flex-col justify-end gap-2"
          style={{ backgroundColor: isWA ? '#E5DDD5' : '#FFFFFF' }}
        >
          {children(isWA)}
        </div>

        {/* Input bar */}
        <div className={`px-2 py-2 flex items-center gap-1.5 ${isWA ? 'bg-[#F0F0F0]' : 'bg-white border-t border-gray-200'}`}>
          {onInputChange ? (
            <input
              value={inputValue ?? ''}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onInputSubmit?.() }}
              placeholder={inputPlaceholder ?? 'Message...'}
              className={`flex-1 rounded-full px-3 py-1.5 text-[10px] text-gray-700 focus:outline-none ${isWA ? 'bg-white' : 'bg-[#F0F0F0]'}`}
            />
          ) : (
            <div className={`flex-1 rounded-full px-3 py-1.5 text-[10px] text-gray-400 ${isWA ? 'bg-white' : 'bg-[#F0F0F0]'}`}>
              Message...
            </div>
          )}
          <button
            onClick={onInputSubmit}
            disabled={!onInputChange}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${isWA ? 'bg-[#075E54]' : 'bg-[#0095F6]'} disabled:opacity-50`}
          >
            →
          </button>
        </div>
      </div>

      {labelText && (
        <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/30">{labelText}</p>
      )}
    </div>
  )
}
