'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/superAdmin'

export interface AdminAuditLogRecord {
  id: string
  action: string
  target_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function getSuperAdminDashboardData() {
  const { appAdmin } = await requireSuperAdmin()
  const admin = createAdminClient()

  const [{ count: adminCount }, { data: recentAuditLogs }] = await Promise.all([
    admin.from('app_admins').select('user_id', { count: 'exact', head: true }),
    admin
      .from('admin_audit_logs')
      .select('id, action, target_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    appAdmin,
    adminCount: adminCount ?? 0,
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
