const realtimeDebugEnabled =
  process.env.NEXT_PUBLIC_DEBUG_SUPABASE_REALTIME === 'true' ||
  process.env.NODE_ENV !== 'production'

export function debugRealtime(scope: string, message: string, details?: unknown) {
  if (!realtimeDebugEnabled) return

  const prefix = `[realtime:${scope}] ${new Date().toISOString()} ${message}`

  if (details === undefined) {
    console.debug(prefix)
    return
  }

  console.debug(prefix, details)
}
