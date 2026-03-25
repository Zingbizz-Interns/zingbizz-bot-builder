# Database Setup

## How to apply migrations

1. Go to **Supabase Dashboard** → your project → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `migrations/001_initial_schema.sql` → click **Run**
4. Create another **New Query**
5. Copy and paste the contents of `migrations/002_rls_policies.sql` → click **Run**

Done. All tables, indexes, and RLS policies are applied.

## Notes

- The Express backend uses the `service_role` key — it bypasses RLS and can read/write everything.
- The Next.js frontend uses the `anon` key — RLS is enforced, customers only see their own data.
- `access_token` in `platform_configs` is stored as plain text for now. Supabase Vault encryption can be added later.
- A `customer_profiles` row must be created on signup (handled in Phase 3 auth flow).
