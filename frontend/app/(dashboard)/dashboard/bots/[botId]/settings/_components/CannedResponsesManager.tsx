'use client'

import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import {
  createCannedResponse,
  deleteCannedResponse,
  getCannedResponses,
  updateCannedResponse,
  type CannedResponse,
} from '@/lib/actions/inbox'
import { useCanEdit } from '@/lib/context/botPermission'
import { Pencil, Trash2, Zap } from 'lucide-react'

interface Props {
  botId: string
}

const EMPTY_FORM = {
  title: '',
  content: '',
  shortcut: '',
}

export default function CannedResponsesManager({ botId }: Props) {
  const canEdit = useCanEdit()
  const [responses, setResponses] = useState<CannedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getCannedResponses(botId).then((result) => {
      setResponses(result.cannedResponses)
      setError(result.error ?? null)
      setLoading(false)
    })
  }, [botId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return responses
    return responses.filter((response) =>
      response.title.toLowerCase().includes(q) ||
      response.content.toLowerCase().includes(q) ||
      (response.shortcut ?? '').toLowerCase().includes(q)
    )
  }, [responses, search])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const action = editingId
      ? updateCannedResponse(editingId, form)
      : createCannedResponse({ botId, ...form })

    const result = await action
    const cannedResponse = result.cannedResponse

    if (result.error || !cannedResponse) {
      setError(result.error ?? 'Failed to save quick reply.')
      setSaving(false)
      return
    }

    setResponses((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? cannedResponse : item))
      }
      return [cannedResponse, ...prev]
    })
    setSuccess(editingId ? 'Quick reply updated.' : 'Quick reply created.')
    resetForm()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this quick reply?')) return
    const result = await deleteCannedResponse(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setResponses((prev) => prev.filter((item) => item.id !== id))
    setSuccess('Quick reply deleted.')
    if (editingId === id) resetForm()
  }

  function startEdit(response: CannedResponse) {
    setEditingId(response.id)
    setForm({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut ?? '',
    })
    setSuccess(null)
    setError(null)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4 border-4 border-black bg-[#F5F5F0] p-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#FF6B6B]" strokeWidth={2.5} />
          <p className="text-xs font-black uppercase tracking-widest text-black">
            {editingId ? 'Edit Quick Reply' : 'Add Quick Reply'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              readOnly={!canEdit}
              required
              className="w-full px-3 py-2.5 border-4 border-black bg-white text-sm font-medium read-only:opacity-60 read-only:cursor-not-allowed"
              placeholder="Refund policy"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">Shortcut</label>
            <input
              value={form.shortcut}
              onChange={(e) => setForm((prev) => ({ ...prev, shortcut: e.target.value }))}
              readOnly={!canEdit}
              className="w-full px-3 py-2.5 border-4 border-black bg-white text-sm font-medium read-only:opacity-60 read-only:cursor-not-allowed"
              placeholder="/refund"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">Reply Content</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            readOnly={!canEdit}
            required
            rows={4}
            className="w-full px-3 py-2.5 border-4 border-black bg-white text-sm font-medium resize-none read-only:opacity-60 read-only:cursor-not-allowed"
            placeholder="Thanks for reaching out. Here's how refunds work..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <Button type="submit" variant="yellow" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Quick Reply' : 'Create Quick Reply'}
            </Button>
          )}
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold uppercase tracking-widest text-black/50 hover:text-black"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-black/50">
          {responses.length} quick repl{responses.length === 1 ? 'y' : 'ies'} saved
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quick replies..."
          className="w-full max-w-xs px-3 py-2 border-4 border-black/20 bg-[#F5F5F0] text-xs font-medium focus:outline-none focus:border-black/50"
        />
      </div>

      {error && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#FF6B6B]">{error}</p>
        </div>
      )}
      {success && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-black">{success}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm font-medium text-black/40">Loading quick replies...</p>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-black/30 px-4 py-8 text-center text-sm font-medium text-black/40">
          No quick replies yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((response) => (
            <div key={response.id} className="border-4 border-black bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black uppercase tracking-tight text-black">{response.title}</p>
                    {response.shortcut && (
                      <span className="border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#FF6B6B]">
                        {response.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-black/70 whitespace-pre-wrap">
                    {response.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(response)}
                    disabled={!canEdit}
                    className="inline-flex items-center gap-1 border-4 border-black px-2 py-1 text-xs font-bold uppercase tracking-widest text-[#000000] hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pencil className="w-3 h-3" strokeWidth={2.5} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(response.id)}
                    disabled={!canEdit}
                    className="inline-flex items-center gap-1 border-2 border-[#FF6B6B] px-2 py-1 text-xs font-bold uppercase tracking-widest text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
