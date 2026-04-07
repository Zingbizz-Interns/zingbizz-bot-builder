'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/superAdmin'
import type {
  Bot,
  CustomerAccountControl,
  CustomerProfile,
  PlatformConnectionRequest,
  PlatformConnectionRequestStatus,
  Trigger,
  Form,
  FormResponse,
} from '@/types/database'

export interface AdminAuditLogRecord {
  id: string
  action: string
  target_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SuperAdminCustomerSummary {
  customer_id: string
  name: string
  email: string
  created_at: string
  bot_count: number
  completed_form_submissions: number
  max_form_submissions: number | null
  excel_export_enabled: boolean
  automation_enabled: boolean
  automation_disabled_reason: string | null
  pending_platform_requests: number
}

export interface SuperAdminBotLimitSummary {
  id: string
  name: string
  is_active: boolean
  trigger_limit: number | null
  trigger_limit_enforced: boolean
  trigger_count: number
}

export interface SuperAdminCustomerDetail {
  profile: CustomerProfile
  controls: CustomerAccountControl
  bots: SuperAdminBotLimitSummary[]
  completed_form_submissions: number
}

export interface PlatformConnectionRequestWithRelations
  extends PlatformConnectionRequest {
  bot_name?: string
  customer_name?: string
  customer_email?: string
}

function normalizeNullableLimit(value: number | null) {
  if (value === null || Number.isNaN(value)) return null
  if (!Number.isFinite(value)) throw new Error('Limit must be a finite number')
  if (value < 0) throw new Error('Limit cannot be negative')
  return Math.floor(value)
}

async function writeAdminAuditLog(input: {
  action: string
  actorUserId: string
  targetType: string
  targetId?: string | null
  metadata?: Record<string, unknown>
}) {
  const admin = createAdminClient()
  const { error } = await admin.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function ensureCustomerAccountControl(customerId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customer_account_controls')
    .upsert({ customer_id: customerId }, { onConflict: 'customer_id' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to ensure customer account control')
  }

  return data as CustomerAccountControl
}

export async function getSuperAdminDashboardData() {
  const { appAdmin } = await requireSuperAdmin()
  const admin = createAdminClient()

  const [
    { count: adminCount },
    { count: customerCount },
    { count: pendingPlatformRequestCount },
    { data: recentAuditLogs },
  ] = await Promise.all([
    admin.from('app_admins').select('user_id', { count: 'exact', head: true }),
    admin.from('customer_profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('platform_connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('admin_audit_logs')
      .select('id, action, target_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    appAdmin,
    adminCount: adminCount ?? 0,
    customerCount: customerCount ?? 0,
    pendingPlatformRequestCount: pendingPlatformRequestCount ?? 0,
    recentAuditLogs: (recentAuditLogs as AdminAuditLogRecord[] | null) ?? [],
  }
}

export async function createSuperAdminAuditTestEntry() {
  const { user, appAdmin } = await requireSuperAdmin()
  const admin = createAdminClient()

  const { error } = await admin.from('admin_audit_logs').insert({
    actor_user_id: user.id,
    action: 'phase_1_audit_test',
    target_type: 'system',
    target_id: null,
    metadata: {
      source: 'dashboard/super-admin',
      actor_email: appAdmin.email,
      actor_label: appAdmin.label,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/super-admin')
}

export async function listSuperAdminCustomers() {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const [
    { data: profiles, error: profilesError },
    { data: controls, error: controlsError },
    { data: bots, error: botsError },
    { data: triggers, error: triggersError },
    { data: forms, error: formsError },
    { data: responses, error: responsesError },
    { data: requests, error: requestsError },
  ] = await Promise.all([
    admin
      .from('customer_profiles')
      .select('id, user_id, name, email, created_at, updated_at')
      .order('created_at', { ascending: false }),
    admin.from('customer_account_controls').select('*'),
    admin.from('bots').select('id, customer_id, name, is_active, trigger_limit, trigger_limit_enforced'),
    admin.from('triggers').select('id, bot_id'),
    admin.from('forms').select('id, trigger_id'),
    admin.from('form_responses').select('id, form_id, is_complete'),
    admin.from('platform_connection_requests').select('id, customer_id, status'),
  ])

  if (profilesError) throw new Error(profilesError.message)
  if (controlsError) throw new Error(controlsError.message)
  if (botsError) throw new Error(botsError.message)
  if (triggersError) throw new Error(triggersError.message)
  if (formsError) throw new Error(formsError.message)
  if (responsesError) throw new Error(responsesError.message)
  if (requestsError) throw new Error(requestsError.message)

  const controlsByCustomerId = new Map(
    ((controls as CustomerAccountControl[] | null) ?? []).map((control) => [
      control.customer_id,
      control,
    ])
  )

  const botsByCustomerId = new Map<string, Bot[]>()
  for (const bot of ((bots as Bot[] | null) ?? [])) {
    const current = botsByCustomerId.get(bot.customer_id) ?? []
    current.push(bot)
    botsByCustomerId.set(bot.customer_id, current)
  }

  const formByTriggerId = new Map(
    ((forms as Form[] | null) ?? []).map((form) => [form.trigger_id, form.id])
  )

  const botIdByFormId = new Map<string, string>()
  for (const trigger of ((triggers as Pick<Trigger, 'id' | 'bot_id'>[] | null) ?? [])) {
    const formId = formByTriggerId.get(trigger.id)
    if (formId) {
      botIdByFormId.set(formId, trigger.bot_id)
    }
  }

  const completedFormsByCustomerId = new Map<string, number>()
  const customerIdByBotId = new Map(
    ((bots as Bot[] | null) ?? []).map((bot) => [bot.id, bot.customer_id])
  )

  for (const response of ((responses as Pick<FormResponse, 'form_id' | 'is_complete'>[] | null) ?? [])) {
    if (!response.is_complete) continue
    const botId = botIdByFormId.get(response.form_id)
    if (!botId) continue
    const customerId = customerIdByBotId.get(botId)
    if (!customerId) continue
    completedFormsByCustomerId.set(
      customerId,
      (completedFormsByCustomerId.get(customerId) ?? 0) + 1
    )
  }

  const pendingRequestsByCustomerId = new Map<string, number>()
  for (const request of ((requests as Pick<PlatformConnectionRequest, 'customer_id' | 'status'>[] | null) ?? [])) {
    if (request.status !== 'pending') continue
    pendingRequestsByCustomerId.set(
      request.customer_id,
      (pendingRequestsByCustomerId.get(request.customer_id) ?? 0) + 1
    )
  }

  return (((profiles as CustomerProfile[] | null) ?? []).map((profile) => {
    const control = controlsByCustomerId.get(profile.id)
    const ownedBots = botsByCustomerId.get(profile.id) ?? []

    return {
      customer_id: profile.id,
      name: profile.name,
      email: profile.email,
      created_at: profile.created_at,
      bot_count: ownedBots.length,
      completed_form_submissions: completedFormsByCustomerId.get(profile.id) ?? 0,
      max_form_submissions: control?.max_form_submissions ?? null,
      excel_export_enabled: control?.excel_export_enabled ?? true,
      automation_enabled: control?.automation_enabled ?? true,
      automation_disabled_reason: control?.automation_disabled_reason ?? null,
      pending_platform_requests: pendingRequestsByCustomerId.get(profile.id) ?? 0,
    } satisfies SuperAdminCustomerSummary
  })) satisfies SuperAdminCustomerSummary[]
}

export async function getSuperAdminCustomerDetail(customerId: string) {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const ensuredControl = await ensureCustomerAccountControl(customerId)

  const [
    { data: profile, error: profileError },
    { data: bots, error: botsError },
    { data: triggers, error: triggersError },
    { data: forms, error: formsError },
    { data: responses, error: responsesError },
  ] = await Promise.all([
    admin
      .from('customer_profiles')
      .select('id, user_id, name, email, created_at, updated_at')
      .eq('id', customerId)
      .single(),
    admin
      .from('bots')
      .select('id, customer_id, name, is_active, trigger_limit, trigger_limit_enforced')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    admin.from('triggers').select('id, bot_id'),
    admin.from('forms').select('id, trigger_id'),
    admin.from('form_responses').select('id, form_id, is_complete'),
  ])

  if (profileError || !profile) throw new Error(profileError?.message ?? 'Customer not found')
  if (botsError) throw new Error(botsError.message)
  if (triggersError) throw new Error(triggersError.message)
  if (formsError) throw new Error(formsError.message)
  if (responsesError) throw new Error(responsesError.message)

  const formIdByTriggerId = new Map(
    ((forms as Form[] | null) ?? []).map((form) => [form.trigger_id, form.id])
  )

  const triggerCountByBotId = new Map<string, number>()
  const formBotByFormId = new Map<string, string>()

  for (const trigger of ((triggers as Pick<Trigger, 'id' | 'bot_id'>[] | null) ?? [])) {
    triggerCountByBotId.set(
      trigger.bot_id,
      (triggerCountByBotId.get(trigger.bot_id) ?? 0) + 1
    )

    const formId = formIdByTriggerId.get(trigger.id)
    if (formId) {
      formBotByFormId.set(formId, trigger.bot_id)
    }
  }

  let completedFormSubmissionCount = 0
  for (const response of ((responses as Pick<FormResponse, 'form_id' | 'is_complete'>[] | null) ?? [])) {
    if (!response.is_complete) continue
    const botId = formBotByFormId.get(response.form_id)
    if (!botId) continue
    const bot = ((bots as Bot[] | null) ?? []).find((candidate) => candidate.id === botId)
    if (!bot) continue
    completedFormSubmissionCount += 1
  }

  return {
    profile: profile as CustomerProfile,
    controls: ensuredControl,
    bots: (((bots as Bot[] | null) ?? []).map((bot) => ({
      id: bot.id,
      name: bot.name,
      is_active: bot.is_active,
      trigger_limit: bot.trigger_limit ?? null,
      trigger_limit_enforced: bot.trigger_limit_enforced ?? true,
      trigger_count: triggerCountByBotId.get(bot.id) ?? 0,
    }))) as SuperAdminBotLimitSummary[],
    completed_form_submissions: completedFormSubmissionCount,
  } satisfies SuperAdminCustomerDetail
}

export async function saveCustomerAccountControls(input: {
  customerId: string
  maxFormSubmissions: number | null
  excelExportEnabled: boolean
  automationEnabled: boolean
  automationDisabledReason?: string | null
}) {
  const { user } = await requireSuperAdmin()
  const admin = createAdminClient()

  const normalizedLimit = normalizeNullableLimit(input.maxFormSubmissions)
  const normalizedReason = input.automationEnabled
    ? null
    : input.automationDisabledReason?.trim() || null

  const { data, error } = await admin
    .from('customer_account_controls')
    .upsert(
      {
        customer_id: input.customerId,
        max_form_submissions: normalizedLimit,
        excel_export_enabled: input.excelExportEnabled,
        automation_enabled: input.automationEnabled,
        automation_disabled_reason: normalizedReason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save customer account controls')
  }

  await writeAdminAuditLog({
    action: 'customer_account_controls.updated',
    actorUserId: user.id,
    targetType: 'customer',
    targetId: input.customerId,
    metadata: {
      max_form_submissions: normalizedLimit,
      excel_export_enabled: input.excelExportEnabled,
      automation_enabled: input.automationEnabled,
      automation_disabled_reason: normalizedReason,
    },
  })

  revalidatePath('/dashboard/super-admin')
  revalidatePath('/dashboard/super-admin/customers')
  return data as CustomerAccountControl
}

export async function saveBotTriggerLimit(input: {
  botId: string
  triggerLimit: number | null
  triggerLimitEnforced: boolean
}) {
  const { user } = await requireSuperAdmin()
  const admin = createAdminClient()

  const normalizedLimit = normalizeNullableLimit(input.triggerLimit)

  const { data, error } = await admin
    .from('bots')
    .update({
      trigger_limit: normalizedLimit,
      trigger_limit_enforced: input.triggerLimitEnforced,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.botId)
    .select('id, customer_id, name, is_active, trigger_limit, trigger_limit_enforced')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update bot trigger limit')
  }

  await writeAdminAuditLog({
    action: 'bot.trigger_limit.updated',
    actorUserId: user.id,
    targetType: 'bot',
    targetId: input.botId,
    metadata: {
      trigger_limit: normalizedLimit,
      trigger_limit_enforced: input.triggerLimitEnforced,
      bot_name: data.name,
      customer_id: data.customer_id,
    },
  })

  revalidatePath('/dashboard/super-admin')
  revalidatePath('/dashboard/super-admin/customers')
  return data as Pick<Bot, 'id' | 'customer_id' | 'name' | 'is_active' | 'trigger_limit' | 'trigger_limit_enforced'>
}

export async function getPlatformConnectionRequests(filters?: {
  status?: PlatformConnectionRequestStatus | 'all'
  customerId?: string
  botId?: string
}) {
  await requireSuperAdmin()
  const admin = createAdminClient()

  let query = admin
    .from('platform_connection_requests')
    .select(
      'id, bot_id, customer_id, platform, request_payload, status, decision_note, requested_by, reviewed_by, reviewed_at, created_at, updated_at, bots(id, name), customer_profiles(id, name, email)'
    )
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId)
  }

  if (filters?.botId) {
    query = query.eq('bot_id', filters.botId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  type JoinedRow = PlatformConnectionRequest & {
    bots?: { id: string; name: string }[] | null
    customer_profiles?: { id: string; name: string; email: string }[] | null
  }

  return (((data as JoinedRow[] | null) ?? []).map((row) => ({
    ...row,
    bot_name: row.bots?.[0]?.name ?? undefined,
    customer_name: row.customer_profiles?.[0]?.name ?? undefined,
    customer_email: row.customer_profiles?.[0]?.email ?? undefined,
  }))) as PlatformConnectionRequestWithRelations[]
}

export async function updatePlatformConnectionRequestStatus(input: {
  requestId: string
  status: PlatformConnectionRequestStatus
  decisionNote?: string | null
}) {
  const { user } = await requireSuperAdmin()
  const admin = createAdminClient()

  const { data: existing, error: existingError } = await admin
    .from('platform_connection_requests')
    .select('*')
    .eq('id', input.requestId)
    .single()

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? 'Platform connection request not found')
  }

  const isReviewed = input.status !== 'pending'
  const decisionNote = input.decisionNote?.trim() || null

  const { data, error } = await admin
    .from('platform_connection_requests')
    .update({
      status: input.status,
      decision_note: decisionNote,
      reviewed_by: isReviewed ? user.id : null,
      reviewed_at: isReviewed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update platform connection request')
  }

  await writeAdminAuditLog({
    action: `platform_connection_request.${input.status}`,
    actorUserId: user.id,
    targetType: 'platform_connection_request',
    targetId: input.requestId,
    metadata: {
      previous_status: existing.status,
      next_status: input.status,
      bot_id: existing.bot_id,
      customer_id: existing.customer_id,
      platform: existing.platform,
      decision_note: decisionNote,
    },
  })

  revalidatePath('/dashboard/super-admin')
  revalidatePath('/dashboard/super-admin/platform-approvals')
  return data as PlatformConnectionRequest
}
