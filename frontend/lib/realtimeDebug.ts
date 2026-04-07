function isRealtimeDebugEnabled() {
  if (process.env.NEXT_PUBLIC_DEBUG_SUPABASE_REALTIME === 'true') return true
  if (process.env.NODE_ENV !== 'production') return true

  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  if (params.get('debugRealtime') === '1') return true

  try {
    return window.localStorage.getItem('debugSupabaseRealtime') === 'true'
  } catch {
    return false
  }
}

export function debugRealtime(scope: string, message: string, details?: unknown) {
  if (!isRealtimeDebugEnabled()) return

  const prefix = `[realtime:${scope}] ${new Date().toISOString()} ${message}`

  if (details === undefined) {
    console.log(prefix)
    return
  }

  console.log(prefix, details)
}
