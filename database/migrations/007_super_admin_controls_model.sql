-- ============================================================
-- 007_super_admin_controls_model.sql
-- Super admin limits, flags, and platform request workflow
-- Run AFTER 006_super_admin_foundation.sql
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.customer_account_controls (
  customer_id uuid primary key references public.customer_profiles(id) on delete cascade,
  max_form_submissions integer,
  excel_export_enabled boolean not null default true,
  automation_enabled boolean not null default true,
  automation_disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_account_controls_max_form_submissions_non_negative
    check (max_form_submissions is null or max_form_submissions >= 0)
);

insert into public.customer_account_controls (customer_id)
select cp.id
from public.customer_profiles cp
on conflict (customer_id) do nothing;

drop trigger if exists customer_account_controls_updated_at on public.customer_account_controls;
create trigger customer_account_controls_updated_at
  before update on public.customer_account_controls
  for each row execute function update_updated_at_column();

alter table public.bots
  add column if not exists trigger_limit integer,
  add column if not exists trigger_limit_enforced boolean not null default true;

alter table public.bots
  drop constraint if exists bots_trigger_limit_non_negative;

alter table public.bots
  add constraint bots_trigger_limit_non_negative
    check (trigger_limit is null or trigger_limit >= 0);

create table if not exists public.platform_connection_requests (
  id uuid primary key default uuid_generate_v4(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  platform text not null check (platform in ('whatsapp', 'instagram')),
  request_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note text,
  requested_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_connection_requests_status_created
  on public.platform_connection_requests (status, created_at desc);

create index if not exists idx_platform_connection_requests_customer_status
  on public.platform_connection_requests (customer_id, status, created_at desc);

create index if not exists idx_platform_connection_requests_bot_platform
  on public.platform_connection_requests (bot_id, platform, created_at desc);

drop trigger if exists platform_connection_requests_updated_at on public.platform_connection_requests;
create trigger platform_connection_requests_updated_at
  before update on public.platform_connection_requests
  for each row execute function update_updated_at_column();

grant all on public.customer_account_controls to authenticated, service_role;
grant all on public.platform_connection_requests to authenticated, service_role;

alter table public.customer_account_controls enable row level security;
alter table public.platform_connection_requests enable row level security;

drop policy if exists "Users can view own customer account controls" on public.customer_account_controls;
create policy "Users can view own customer account controls"
  on public.customer_account_controls
  for select
  using (customer_id = get_my_customer_id());

drop policy if exists "Users can view own platform connection requests" on public.platform_connection_requests;
create policy "Users can view own platform connection requests"
  on public.platform_connection_requests
  for select
  using (customer_id = get_my_customer_id());

drop policy if exists "Users can create own platform connection requests" on public.platform_connection_requests;
create policy "Users can create own platform connection requests"
  on public.platform_connection_requests
  for insert
  with check (
    customer_id = get_my_customer_id()
    and requested_by = auth.uid()
  );
