'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

/**
 * Debounced auto-save hook. Watches `deps` and triggers `saveFn` after `delay` ms of inactivity.
 * Skips the first render so existing data is not immediately saved on mount.
 */
export function useAutoSave(
  saveFn: () => Promise<{ error?: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[],
  delay = 1500
): { status: SaveStatus; triggerSave: () => Promise<void> } {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)
  const saveFnRef = useRef(saveFn)
  saveFnRef.current = saveFn

  const triggerSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setStatus('saving')
    const result = await saveFnRef.current()
    if (result?.error) {
      setStatus('error')
    } else {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }, [])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setStatus('unsaved')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(triggerSave, delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { status, triggerSave }
}
