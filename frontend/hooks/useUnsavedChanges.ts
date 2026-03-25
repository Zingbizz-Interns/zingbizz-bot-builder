'use client'

import { useEffect } from 'react'
import type { SaveStatus } from './useAutoSave'

/**
 * Warns the user before closing/refreshing the tab when there are unsaved changes.
 */
export function useUnsavedChanges(status: SaveStatus) {
  useEffect(() => {
    if (status !== 'unsaved') return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [status])
}
