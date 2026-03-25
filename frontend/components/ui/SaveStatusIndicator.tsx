import type { SaveStatus } from '@/hooks/useAutoSave'

const CONFIG: Record<Exclude<SaveStatus, 'idle'>, { text: string; cls: string }> = {
  unsaved: { text: 'Unsaved changes', cls: 'text-[#F0C020]' },
  saving:  { text: 'Saving...',       cls: 'text-[#1040C0]' },
  saved:   { text: 'Saved',           cls: 'text-[#1040C0]' },
  error:   { text: 'Save failed',     cls: 'text-[#D02020]' },
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
