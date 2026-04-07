'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import type { Contact, JourneyEvent } from '@/lib/actions/contacts'
import { getSenderJourney } from '@/lib/actions/contacts'

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  trigger_fired:   { label: 'Triggered',       color: '#1040C0' },
  form_started:    { label: 'Form started',     color: '#F0C020' },
  form_completed:  { label: 'Form completed',   color: '#121212' },
  form_abandoned:  { label: 'Form abandoned',   color: '#D02020' },
  question_answered: { label: 'Answered',       color: '#1040C0' },
  question_abandoned: { label: 'Abandoned at',  color: '#D02020' },
  query_opened:    { label: 'Query opened',     color: '#F0C020' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function truncateSender(id: string) {
  return id.length > 20 ? id.slice(0, 10) + '…' + id.slice(-6) : id
}

interface JourneyPanelProps {
  botId: string
  contact: Contact
  onClose: () => void
}

function JourneyPanel({ botId, contact, onClose }: JourneyPanelProps) {
  const [events, setEvents] = useState<JourneyEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSenderJourney(botId, contact.sender_id, contact.platform)
      .then(data => { setEvents(data); setLoading(false) })
      .catch(() => { setEvents([]); setLoading(false) })
  }, [botId, contact.sender_id, contact.platform])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-[#121212]/30"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white border-l-4 border-[#121212] shadow-[-8px_0px_0px_0px_#121212] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#121212] px-6 py-4 flex items-start justify-between shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-0.5">
              {contact.platform}
            </p>
            <p className="text-sm font-black uppercase tracking-tighter text-white break-all">
              {contact.sender_id}
            </p>
            <p className="text-xs font-medium text-white/40 mt-1">
              {contact.message_count} messages · Last seen {formatDate(contact.last_seen_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#121212]/40 mb-4">
            Event Journey
          </h3>

          {loading && (
            <p className="text-xs font-medium text-[#121212]/40">Loading...</p>
          )}

          {events && events.length === 0 && (
            <p className="text-xs font-medium text-[#121212]/40">
              No analytics events recorded for this contact.
            </p>
          )}

          {events && events.length > 0 && (
            <div className="space-y-2">
              {events.map((e, i) => {
                const cfg = EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: '#121212' }
                const detail = e.triggerName ?? e.questionText ?? null
                return (
                  <div key={e.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-full border-2 border-[#121212] shrink-0 mt-0.5"
                        style={{ backgroundColor: cfg.color }}
                      />
                      {i < events.length - 1 && (
                        <div className="w-px flex-1 bg-[#121212]/10 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-widest text-[#121212]">
                          {cfg.label}
                        </span>
                        {detail && (
                          <span className="text-xs font-medium text-[#121212]/60 truncate max-w-[200px]" title={detail}>
                            — {detail}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-[#121212]/30 mt-0.5">
                        {formatDate(e.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ContactsTableProps {
  botId: string
  contacts: Contact[]
}

export default function ContactsTable({ botId, contacts }: ContactsTableProps) {
  const [selected, setSelected] = useState<Contact | null>(null)

  if (contacts.length === 0) {
    return (
      <div className="border-4 border-dashed border-[#121212] p-16 text-center">
        <p className="font-black uppercase tracking-tighter text-[#121212]/30 text-lg">No contacts yet</p>
        <p className="text-xs font-medium text-[#121212]/30 mt-2">
          Contacts are auto-created when users message your bot.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] overflow-x-auto">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-[#121212] text-white">
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Sender</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Platform</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">First Seen</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Last Seen</th>
              <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest">Messages</th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b-2 border-[#121212]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F0F0]'}`}
              >
                <td className="px-4 py-3 font-mono text-sm font-bold text-[#121212]" title={c.sender_id}>
                  {truncateSender(c.sender_id)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 border-2 border-[#121212] ${
                      c.platform === 'whatsapp'
                        ? 'bg-[#128C7E] text-white'
                        : 'bg-[#0095F6] text-white'
                    }`}
                  >
                    {c.platform === 'whatsapp' ? 'WA' : 'IG'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-[#121212]/60">
                  {formatDate(c.first_seen_at)}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-[#121212]/60">
                  {formatDate(c.last_seen_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-black text-sm text-[#121212]">{c.message_count}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/dashboard/bots/${botId}/live-chat?sender=${encodeURIComponent(c.sender_id)}`}
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#107040] border-2 border-[#107040] px-2 py-1 hover:bg-[#107040] hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                      View Chat
                    </Link>
                    <button
                      onClick={() => setSelected(c)}
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#1040C0] border-2 border-[#1040C0] px-2 py-1 hover:bg-[#1040C0] hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                      Journey
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <JourneyPanel
          botId={botId}
          contact={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
