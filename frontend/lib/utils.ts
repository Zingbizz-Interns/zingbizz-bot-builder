import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── WhatsApp 24-hour window expiry utility (3.9) ─────────────────────────────

export interface WhatsAppWindowExpiry {
  expiresAt: Date
  remainingMs: number
  isExpired: boolean
  isWarning: boolean // true if < 2 hours remaining
  display: string   // "22:14:33" or "EXPIRED"
}

export function getWhatsAppWindowExpiry(lastCustomerMessageAt: string | null): WhatsAppWindowExpiry {
  if (!lastCustomerMessageAt) {
    return {
      expiresAt: new Date(0),
      remainingMs: 0,
      isExpired: true,
      isWarning: false,
      display: 'EXPIRED',
    }
  }

  const lastMsg = new Date(lastCustomerMessageAt)
  const expiresAt = new Date(lastMsg.getTime() + 24 * 60 * 60 * 1000)
  const remainingMs = expiresAt.getTime() - Date.now()

  if (remainingMs <= 0) {
    return { expiresAt, remainingMs: 0, isExpired: true, isWarning: false, display: 'EXPIRED' }
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const display = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':')

  return {
    expiresAt,
    remainingMs,
    isExpired: false,
    isWarning: remainingMs < 2 * 60 * 60 * 1000,
    display,
  }
}
