-- ============================================================
-- Phase 1: Live Chat — Database Foundation
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 conversations table
-- ------------------------------------------------------------

create table if not exists conversations (
  id                        uuid primary key default gen_random_uuid(),
  bot_id                    uuid references bots(id) on delete cascade,
  platform                  text not null default 'whatsapp',
  sender_id                 text not null,
  status                    text not null default 'bot',         -- 'bot' | 'agent' | 'closed'
  agent_id                  uuid references auth.users(id),
  needs_attention           boolean not null default false,
  unresolved_since          timestamptz,
  fallback_count            integer not null default 0,
  last_customer_message_at  timestamptz,
  last_reply_at             timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique(bot_id, platform, sender_id)
);

-- Auto-update updated_at on every row change
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at_column();

-- RLS
alter table conversations enable row level security;

create policy "Users can access their own bot conversations"
  on conversations for all
  using (
    bot_id in (
      select id from bots where customer_id = get_my_customer_id()
    )
  );

grant all on public.conversations to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 1.2 messages table
-- ------------------------------------------------------------

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  bot_id          uuid references bots(id) on delete cascade,
  sender_type     text not null,          -- 'customer' | 'bot' | 'agent'
  content         text not null,
  message_type    text not null default 'text',  -- 'text' | 'interactive' | 'template'
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_created
  on messages (conversation_id, created_at);

create index if not exists messages_bot_created
  on messages (bot_id, created_at);

-- RLS
alter table messages enable row level security;

create policy "Users can access messages for their own bots"
  on messages for all
  using (
    bot_id in (
      select id from bots where customer_id = get_my_customer_id()
    )
  );

grant all on public.messages to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 1.3 alert_settings table
-- ------------------------------------------------------------

create table if not exists alert_settings (
  bot_id                    uuid primary key references bots(id) on delete cascade,
  enabled                   boolean not null default true,
  threshold_minutes         integer not null default 120,
  window_warning_enabled    boolean not null default true,
  window_warning_minutes    integer not null default 120,
  notify_email              boolean not null default true,
  notify_push               boolean not null default false,  -- reserved, not yet implemented
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- RLS
alter table alert_settings enable row level security;

create policy "Users can manage alert settings for their own bots"
  on alert_settings for all
  using (
    bot_id in (
      select id from bots where customer_id = get_my_customer_id()
    )
  );

grant all on public.alert_settings to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 1.4 alerts table
-- alert_type: 'response_threshold' | 'window_closing' | 'agent_silent'
-- ------------------------------------------------------------

create table if not exists alerts (
  id              uuid primary key default gen_random_uuid(),
  bot_id          uuid references bots(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  alert_type      text not null,
  is_read         boolean not null default false,
  acknowledged_at timestamptz,
  triggered_at    timestamptz not null default now()
);

create index if not exists alerts_bot_unread
  on alerts (bot_id, is_read, triggered_at desc);

-- RLS
alter table alerts enable row level security;

create policy "Users can access alerts for their own bots"
  on alerts for all
  using (
    bot_id in (
      select id from bots where customer_id = get_my_customer_id()
    )
  );

grant all on public.alerts to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Helper: auto-update updated_at on alert_settings changes
-- ------------------------------------------------------------

drop trigger if exists alert_settings_updated_at on alert_settings;
create trigger alert_settings_updated_at
  before update on alert_settings
  for each row execute function update_updated_at_column();

-- ------------------------------------------------------------
-- Helper: atomic fallback_count increment
-- Avoids race conditions when two messages arrive simultaneously.
-- Called by conversationStore.incrementFallbackCount()
-- ------------------------------------------------------------

create or replace function increment_conversation_fallback_count(conv_id uuid)
returns void as $$
begin
  update conversations
  set fallback_count = fallback_count + 1
  where id = conv_id;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_conversation_fallback_count(uuid) to anon, authenticated, service_role;
