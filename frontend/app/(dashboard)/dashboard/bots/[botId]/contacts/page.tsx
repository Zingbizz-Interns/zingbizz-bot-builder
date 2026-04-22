import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getContacts } from '@/lib/actions/contacts'
import ContactsTable from './_components/ContactsTable'

export default async function ContactsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const contacts = await getContacts(botId)

  return (
    <div className="p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Bot Intelligence</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Contacts</h2>
          <p className="text-sm font-medium text-black/50 mt-1">
            Everyone who has messaged this bot. Click View to see their event journey.
          </p>
        </div>
        <div className="border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-[#FFD93D] px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-black/60">Total</p>
          <p className="text-3xl font-black tracking-tighter text-black">{contacts.length}</p>
        </div>
      </div>

      <ContactsTable botId={botId} contacts={contacts} />
    </div>
  )
}
