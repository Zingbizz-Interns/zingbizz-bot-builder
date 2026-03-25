'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface BusinessHours {
  timezone: string
  mon_start: string | null; mon_end: string | null
  tue_start: string | null; tue_end: string | null
  wed_start: string | null; wed_end: string | null
  thu_start: string | null; thu_end: string | null
  fri_start: string | null; fri_end: string | null
  sat_start: string | null; sat_end: string | null
  sun_start: string | null; sun_end: string | null
  outside_hours_message: string
}

export async function getBusinessHours(botId: string): Promise<BusinessHours | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('business_hours')
    .select('timezone,mon_start,mon_end,tue_start,tue_end,wed_start,wed_end,thu_start,thu_end,fri_start,fri_end,sat_start,sat_end,sun_start,sun_end,outside_hours_message')
    .eq('bot_id', botId)
    .single()
  return data ?? null
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export async function saveBusinessHours(
  botId: string,
  fd: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    bot_id: botId,
    timezone: (fd.get('timezone') as string) || 'UTC',
    outside_hours_message:
      (fd.get('outside_hours_message') as string) ||
      'Sorry, we are currently outside business hours.',
  }

  for (const day of DAYS) {
    const enabled = fd.get(`${day}_enabled`) === 'true'
    payload[`${day}_start`] = enabled ? ((fd.get(`${day}_start`) as string) || '09:00') : null
    payload[`${day}_end`] = enabled ? ((fd.get(`${day}_end`) as string) || '17:00') : null
  }

  const { error } = await supabase
    .from('business_hours')
    .upsert(payload, { onConflict: 'bot_id' })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bots/${botId}/settings`)
  return {}
}
