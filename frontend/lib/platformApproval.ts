import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Platform,
  PlatformConfig,
  PlatformConnectionRequest,
} from '@/types/database'

export interface PlatformApprovalPayload {
  platform: Platform
  access_token: string
  verify_token: string
  session_expiry_ms: number
  warning_time_ms: number
  warning_message: string
  phone_number_id: string | null
  waba_id: string | null
  page_id: string | null
  source?: string
  instagram_username?: string | null
  facebook_page_id?: string | null
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`)
  }

  return value.trim()
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed)
    }
  }

  return fallback
}

export function isMissingPlatformApprovalSchemaError(message: string) {
  return /does not exist/i.test(message) || /Could not find/i.test(message) || /column .* not found/i.test(message)
}

export function buildPlatformApprovalPayloadFromFormData(
  platform: Platform,
  formData: FormData
): PlatformApprovalPayload {
  const basePayload: PlatformApprovalPayload = {
    platform,
    access_token: normalizeRequiredString(formData.get('access_token'), 'Access token'),
    verify_token: normalizeRequiredString(formData.get('verify_token'), 'Verify token'),
    session_expiry_ms: normalizeNumber(formData.get('session_expiry_ms'), 600000),
    warning_time_ms: normalizeNumber(formData.get('warning_time_ms'), 120000),
    warning_message:
      normalizeOptionalString(formData.get('warning_message')) ??
      'Your session will expire soon. Please respond to continue.',
    phone_number_id: null,
    waba_id: null,
    page_id: null,
    source: 'manual_form',
  }

  if (platform === 'whatsapp') {
    return {
      ...basePayload,
      phone_number_id: normalizeRequiredString(formData.get('phone_number_id'), 'Phone Number ID'),
      waba_id: normalizeRequiredString(formData.get('waba_id'), 'WABA ID'),
    }
  }

  return {
    ...basePayload,
    page_id: normalizeRequiredString(formData.get('page_id'), 'Instagram Business Account ID'),
  }
}

export function parsePlatformApprovalPayload(
  platform: Platform,
  rawPayload: Record<string, unknown> | null | undefined
): PlatformApprovalPayload {
  const payload = rawPayload ?? {}

  const parsed: PlatformApprovalPayload = {
    platform,
    access_token: normalizeRequiredString(payload.access_token, 'Access token'),
    verify_token: typeof payload.verify_token === 'string' ? payload.verify_token : '',
    session_expiry_ms: normalizeNumber(payload.session_expiry_ms, 600000),
    warning_time_ms: normalizeNumber(payload.warning_time_ms, 120000),
    warning_message:
      normalizeOptionalString(payload.warning_message) ??
      'Your session will expire soon. Please respond to continue.',
    phone_number_id: normalizeOptionalString(payload.phone_number_id),
    waba_id: normalizeOptionalString(payload.waba_id),
    page_id: normalizeOptionalString(payload.page_id),
    source: normalizeOptionalString(payload.source) ?? undefined,
    instagram_username: normalizeOptionalString(payload.instagram_username),
    facebook_page_id: normalizeOptionalString(payload.facebook_page_id),
  }

  if (platform === 'whatsapp') {
    if (!parsed.phone_number_id) throw new Error('Phone Number ID is required in the approval payload')
    if (!parsed.waba_id) throw new Error('WABA ID is required in the approval payload')
  } else if (!parsed.page_id) {
    throw new Error('Instagram Business Account ID is required in the approval payload')
  }

  return parsed
}

function buildPlatformConfigRow(botId: string, payload: PlatformApprovalPayload) {
  return {
    bot_id: botId,
    platform: payload.platform,
    access_token: payload.access_token,
    verify_token: payload.verify_token,
    phone_number_id: payload.platform === 'whatsapp' ? payload.phone_number_id : null,
    waba_id: payload.platform === 'whatsapp' ? payload.waba_id : null,
    page_id: payload.platform === 'instagram' ? payload.page_id : null,
    session_expiry_ms: payload.session_expiry_ms,
    warning_time_ms: payload.warning_time_ms,
    warning_message: payload.warning_message,
    is_active: true,
    updated_at: new Date().toISOString(),
  }
}

export async function upsertPlatformConfigFromPayload(
  botId: string,
  payload: PlatformApprovalPayload
): Promise<PlatformConfig> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_configs')
    .upsert(buildPlatformConfigRow(botId, payload), { onConflict: 'bot_id,platform' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save platform configuration')
  }

  return data as PlatformConfig
}

export async function submitPlatformConnectionRequest(input: {
  botId: string
  customerId: string
  requestedBy: string
  payload: PlatformApprovalPayload
}) {
  const admin = createAdminClient()
  const supersededAt = new Date().toISOString()

  const { error: cancelError } = await admin
    .from('platform_connection_requests')
    .update({
      status: 'cancelled',
      decision_note: 'Superseded by a newer platform connection request.',
      reviewed_by: null,
      reviewed_at: null,
      updated_at: supersededAt,
    })
    .eq('bot_id', input.botId)
    .eq('platform', input.payload.platform)
    .eq('status', 'pending')

  if (cancelError && !isMissingPlatformApprovalSchemaError(cancelError.message)) {
    throw new Error(cancelError.message)
  }

  const { data, error } = await admin
    .from('platform_connection_requests')
    .insert({
      bot_id: input.botId,
      customer_id: input.customerId,
      platform: input.payload.platform,
      request_payload: input.payload,
      status: 'pending',
      requested_by: input.requestedBy,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create platform connection request')
  }

  return data as PlatformConnectionRequest
}
