import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AppAdminRecord {
  user_id: string
  email: string
  label: string | null
  created_at: string
}

export async function getCurrentAppAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, appAdmin: null as AppAdminRecord | null }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('app_admins')
    .select('user_id, email, label, created_at')
    .eq('user_id', user.id)
    .single()

  return {
    user,
    appAdmin: (data as AppAdminRecord | null) ?? null,
  }
}

export async function requireSuperAdmin() {
  const { user, appAdmin } = await getCurrentAppAdmin()

  if (!user) {
    redirect('/login')
  }

  if (!appAdmin) {
    redirect('/dashboard')
  }

  return { user, appAdmin }
}
