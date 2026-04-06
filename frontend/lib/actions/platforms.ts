'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Build Instagram OAuth URL ────────────────────────────────
export async function getInstagramOAuthUrl(botId: string): Promise<string> {
  const appId   = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/instagram/callback`

  const state = Buffer.from(
    JSON.stringify({ botId, ts: Date.now() })
  ).toString('base64url')

  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights',
  ].join(',')

  const params = new URLSearchParams({
    client_id:      appId,
    redirect_uri:   redirectUri,
    scope:          scopes,
    response_type:  'code',
    state,
    enable_fb_login: '1',
  })

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`
}

// ─── Validate credentials against Meta Graph API ─────────────
export async function validateCredentials(
  platform: 'whatsapp' | 'instagram',
  identifier: string,  // phone_number_id (WA) or instagram_account_id (IG)
  accessToken: string
) {
  try {
    // WhatsApp: validate by fetching the phone number object directly
    // Instagram: validate the access token via /me (IGID cannot be validated via Graph API directly)
    const url = platform === 'whatsapp'
      ? `https://graph.facebook.com/v18.0/${identifier}?access_token=${accessToken}`
      : `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`

    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()

    if (data.error) {
      return { valid: false, error: data.error.message as string }
    }
    return { valid: true, name: (data.name ?? data.display_phone_number ?? identifier) as string }
  } catch {
    return { valid: false, error: 'Failed to reach Meta API. Check your credentials.' }
  }
}

// ─── Save or update platform config ──────────────────────────
export async function savePlatformConfig(botId: string, formData: FormData) {
  const supabase = await createClient()
  const platform = formData.get('platform') as 'whatsapp' | 'instagram'

  const payload: Record<string, unknown> = {
    bot_id: botId,
    platform,
    access_token: formData.get('access_token'),
    verify_token: formData.get('verify_token'),
    session_expiry_ms: Number(formData.get('session_expiry_ms')) || 600000,
    warning_time_ms: Number(formData.get('warning_time_ms')) || 120000,
    warning_message: formData.get('warning_message') || 'Your session will expire soon. Please respond to continue.',
    is_active: true,
  }

  if (platform === 'whatsapp') {
    payload.phone_number_id = formData.get('phone_number_id')
    payload.waba_id = formData.get('waba_id')
    payload.page_id = null
  } else {
    payload.page_id = formData.get('page_id')
    payload.phone_number_id = null
    payload.waba_id = null
  }

  // Upsert — update if exists, insert if not
  const { error } = await supabase
    .from('platform_configs')
    .upsert(payload, { onConflict: 'bot_id,platform' })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/bots/${botId}/platforms`)
  return { success: true }
}

// ─── Delete platform config ───────────────────────────────────
export async function deletePlatformConfig(botId: string, platform: 'whatsapp' | 'instagram') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('platform_configs')
    .delete()
    .eq('bot_id', botId)
    .eq('platform', platform)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/bots/${botId}/platforms`)
  return { success: true }
}

// ─── Get platform configs for a bot ──────────────────────────
export async function getPlatformConfigs(botId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('platform_configs')
    .select('*')
    .eq('bot_id', botId)

  return data ?? []
}
