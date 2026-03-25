import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Server-only. Never expose to the browser.
export function createAdminClient() {
  console.log('[admin] SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
