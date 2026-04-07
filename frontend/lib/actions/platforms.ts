'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthorizedBotAccess } from '@/lib/botAccess'
import {
  buildPlatformApprovalPayloadFromFormData,
  isMissingPlatformApprovalSchemaError,
  submitPlatformConnectionRequest,
  upsertPlatformConfigFromPayload,
} from '@/lib/platformApproval'
import { revalidatePath } from 'next/cache'

function revalidatePlatformSurface(botId: string, customerId?: string) {
  revalidatePath('/dashboard/bots')
  revalidatePath(`/dashboard/bots/${botId}/platforms`)
  revalidatePath(`/dashboard/bots/${botId}/test`)

  if (customerId) {
    revalidatePath('/dashboard/super-admin')
    revalidatePath('/dashboard/super-admin/customers')
    revalidatePath(`/dashboard/super-admin/customers/${customerId}`)
    revalidatePath('/dashboard/super-admin/platform-approvals')
  }
}

// ─── Build Instagram OAuth URL ────────────────────────────────
export async function getInstagramOAuthUrl(botId: string): Promise<string> {
  const appId   = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/instagram/callback`

  const state = Buffer.from(
    JSON.stringify({ botId, ts: Date.now() })
  ).toString('base64url')

  const scopes = [
    'pages_show_list',           // list Facebook Pages the user manages
    'pages_read_engagement',     // read page info to find linked IG account
    'instagram_basic',           // basic Instagram account access
    'instagram_manage_messages', // send/receive Instagram DMs
  ].join(',')

  const params = new URLSearchParams({
    client_id:      appId,
    redirect_uri:   redirectUri,
    scope:          scopes,
    response_type:  'code',
    state,
    enable_fb_login: '1',
  })

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
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
  const access = await getAuthorizedBotAccess(botId)
  if (!access || !access.canEdit) {
    return { error: 'You do not have permission to manage this platform.' }
  }

  const platform = formData.get('platform') as 'whatsapp' | 'instagram'
  let payload

  try {
    payload = buildPlatformApprovalPayloadFromFormData(platform, formData)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to prepare platform request',
    }
  }

  try {
    await submitPlatformConnectionRequest({
      botId,
      customerId: access.customerId,
      requestedBy: access.userId,
      payload,
    })

    revalidatePlatformSurface(botId, access.customerId)

    return {
      success: true,
      approvalRequired: true,
      message:
        platform === 'whatsapp'
          ? 'WhatsApp approval request submitted. The platform will go live after a super admin approves it.'
          : 'Instagram approval request submitted. The platform will go live after a super admin approves it.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit platform request'

    if (!isMissingPlatformApprovalSchemaError(message)) {
      return { error: message }
    }

    try {
      await upsertPlatformConfigFromPayload(botId, payload)
      revalidatePlatformSurface(botId, access.customerId)

      return {
        success: true,
        approvalRequired: false,
        message:
          'Approval workflow tables are not available yet, so the platform was connected immediately. Run the super-admin migrations to enable approval gating.',
      }
    } catch (directSaveError) {
      return {
        error:
          directSaveError instanceof Error
            ? directSaveError.message
            : 'Failed to save platform configuration',
      }
    }
  }
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

  revalidatePlatformSurface(botId)
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
