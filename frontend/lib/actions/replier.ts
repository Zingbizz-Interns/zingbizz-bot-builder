'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getReplier(triggerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('replier_actions')
    .select('*, replier_buttons(*)')
    .eq('trigger_id', triggerId)
    .maybeSingle()
  return data
}

export async function saveReplier(triggerId: string, botId: string, formData: FormData) {
  const supabase = await createClient()

  const message_text = (formData.get('message_text') as string)?.trim()
  const buttons = JSON.parse((formData.get('buttons') as string) || '[]') as {
    label: string
    links_to_trigger_id: string | null
  }[]

  if (!message_text) return { error: 'Message text is required' }

  const { data: replier, error } = await supabase
    .from('replier_actions')
    .upsert({ trigger_id: triggerId, message_text }, { onConflict: 'trigger_id' })
    .select()
    .single()

  if (error) return { error: error.message }

  // Replace all buttons
  await supabase.from('replier_buttons').delete().eq('replier_id', replier.id)

  if (buttons.length > 0) {
    const { error: btnError } = await supabase.from('replier_buttons').insert(
      buttons.map((b, i) => ({
        replier_id: replier.id,
        button_label: b.label,
        links_to_trigger_id: b.links_to_trigger_id || null,
        order_index: i,
      }))
    )
    if (btnError) return { error: btnError.message }
  }

  revalidatePath(`/dashboard/bots/${botId}/triggers/${triggerId}/replier`)
  return { success: true }
}
