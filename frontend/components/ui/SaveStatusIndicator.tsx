import type { SaveStatus } from '@/hooks/useAutoSave'

const CONFIG: Record<Exclude<SaveStatus, 'idle'>, { text: string; cls: string }> = {
  unsaved: { text: 'Unsaved changes', cls: 'text-[#FF6B6B] font-black' },
  saving:  { text: 'Saving...',       cls: 'text-black/50 font-black' },
  saved:   { text: '✓ Saved',         cls: 'text-black font-black' },
  error:   { text: 'Save failed',     cls: 'text-[#FF6B6B] font-black' },
}

export default function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const { text, cls } = CONFIG[status]
  return (
    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${cls}`}>
      {text}
    </span>
  )
}
