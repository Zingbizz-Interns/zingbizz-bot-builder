-- ============================================================
-- 006_super_admin_foundation.sql
-- Super admin access + audit trail baseline
-- Run AFTER 005_sub_account_read_policies.sql
-- ============================================================

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  label text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create unique index if not exists idx_app_admins_email_lower
  on public.app_admins (lower(email));

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_actor_created
  on public.admin_audit_logs (actor_user_id, created_at desc);

create index if not exists idx_admin_audit_logs_created
  on public.admin_audit_logs (created_at desc);

create or replace function public.is_app_admin()
returns boolean as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$ language sql security definer stable;

grant usage on schema public to authenticated, service_role;
grant select on public.app_admins to authenticated, service_role;
grant select, insert on public.admin_audit_logs to authenticated, service_role;
grant all on public.app_admins to service_role;
grant all on public.admin_audit_logs to service_role;

alter table public.app_admins enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "Users can view their own app admin row" on public.app_admins;
create policy "Users can view their own app admin row"
  on public.app_admins
  for select
  using (user_id = auth.uid());

drop policy if exists "Super admins can view audit logs" on public.admin_audit_logs;
create policy "Super admins can view audit logs"
  on public.admin_audit_logs
  for select
  using (public.is_app_admin());

drop policy if exists "Super admins can insert audit logs" on public.admin_audit_logs;
create policy "Super admins can insert audit logs"
  on public.admin_audit_logs
  for insert
  with check (
    public.is_app_admin()
    and actor_user_id = auth.uid()
  );
