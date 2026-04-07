import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthorizedBotAccess } from '@/lib/botAccess'
import type { Platform, PlatformConnectionRequest } from '@/types/database'

type AutomationBlockReason = 'automation_disabled' | 'submission_limit_reached' | null

export interface BotAutomationGuardrailState {
  botId: string
  customerId: string
  automationEnabled: boolean
  automationDisabledReason: string | null
  maxFormSubmissions: number | null
  completedFormSubmissions: number
  isOverFormSubmissionLimit: boolean
  isBlocked: boolean
  blockReason: AutomationBlockReason
}

export type LatestPlatformRequestMap = Record<Platform, PlatformConnectionRequest | null>

const EMPTY_PLATFORM_REQUESTS: LatestPlatformRequestMap = {
  whatsapp: null,
  instagram: null,
}

function isMissingSchemaError(message: string) {
  return /does not exist/i.test(message) || /Could not find/i.test(message) || /column .* not found/i.test(message)
}

async function countCompletedFormSubmissionsForCustomer(customerId: string) {
  const admin = createAdminClient()

  const { data: bots, error: botsError } = await admin
    .from('bots')
    .select('id')
    .eq('customer_id', customerId)

  if (botsError) {
    throw new Error(botsError.message)
  }

  const botIds = (bots ?? []).map((bot) => bot.id)
  if (botIds.length === 0) {
    return 0
  }

  const { data: triggers, error: triggersError } = await admin
    .from('triggers')
    .select('id')
    .in('bot_id', botIds)

  if (triggersError) {
    throw new Error(triggersError.message)
  }

  const triggerIds = (triggers ?? []).map((trigger) => trigger.id)
  if (triggerIds.length === 0) {
    return 0
  }

  const { data: forms, error: formsError } = await admin
    .from('forms')
    .select('id')
    .in('trigger_id', triggerIds)

  if (formsError) {
    throw new Error(formsError.message)
  }

  const formIds = (forms ?? []).map((form) => form.id)
  if (formIds.length === 0) {
    return 0
  }

  const { count, error: responsesError } = await admin
    .from('form_responses')
    .select('id', { count: 'exact', head: true })
    .in('form_id', formIds)
    .eq('is_complete', true)

  if (responsesError) {
    throw new Error(responsesError.message)
  }

  return count ?? 0
}

export async function getBotAutomationGuardrailState(
  botId: string
): Promise<BotAutomationGuardrailState | null> {
  const access = await getAuthorizedBotAccess(botId)
  if (!access) {
    return null
  }

  const admin = createAdminClient()
  const { data: control, error } = await admin
    .from('customer_account_controls')
    .select('max_form_submissions, automation_enabled, automation_disabled_reason')
    .eq('customer_id', access.customerId)
    .maybeSingle()

  if (error) {
    if (isMissingSchemaError(error.message)) {
      return {
        botId,
        customerId: access.customerId,
        automationEnabled: true,
        automationDisabledReason: null,
        maxFormSubmissions: null,
        completedFormSubmissions: 0,
        isOverFormSubmissionLimit: false,
        isBlocked: false,
        blockReason: null,
      }
    }

    throw new Error(error.message)
  }

  const maxFormSubmissions = control?.max_form_submissions ?? null
  const automationEnabled = control?.automation_enabled ?? true
  const automationDisabledReason = control?.automation_disabled_reason ?? null

  let completedFormSubmissions = 0
  let isOverFormSubmissionLimit = false

  if (maxFormSubmissions !== null) {
    completedFormSubmissions = await countCompletedFormSubmissionsForCustomer(access.customerId)
    isOverFormSubmissionLimit = completedFormSubmissions >= maxFormSubmissions
  }

  const blockReason: AutomationBlockReason = !automationEnabled
    ? 'automation_disabled'
    : isOverFormSubmissionLimit
      ? 'submission_limit_reached'
      : null

  return {
    botId,
    customerId: access.customerId,
    automationEnabled,
    automationDisabledReason,
    maxFormSubmissions,
    completedFormSubmissions,
    isOverFormSubmissionLimit,
    isBlocked: blockReason !== null,
    blockReason,
  }
}

export async function getLatestPlatformConnectionRequests(
  botId: string
): Promise<LatestPlatformRequestMap | null> {
  const access = await getAuthorizedBotAccess(botId)
  if (!access) {
    return null
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_connection_requests')
    .select('*')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingSchemaError(error.message)) {
      return { ...EMPTY_PLATFORM_REQUESTS }
    }

    throw new Error(error.message)
  }

  const requests = { ...EMPTY_PLATFORM_REQUESTS }

  for (const row of (data ?? []) as PlatformConnectionRequest[]) {
    if (!requests[row.platform]) {
      requests[row.platform] = row
    }
  }

  return requests
}
