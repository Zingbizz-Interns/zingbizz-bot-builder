-- ============================================================
-- Phase 5: Live Chat — UX Polish & Power Features
-- Run this entire file in Supabase SQL Editor after phase_1_live_chat.sql
-- ============================================================

-- Reuse the shared trigger helper if it does not exist yet.
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 5.1 canned_responses
-- ------------------------------------------------------------
create table if not exists canned_responses (
  id         uuid primary key default gen_random_uuid(),
  bot_id     uuid not null references bots(id) on delete cascade,
  title      text not null,
  content    text not null,
  shortcut   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canned_responses_bot_created
  on canned_responses (bot_id, created_at desc);

create unique index if not exists canned_responses_bot_shortcut_unique
  on canned_responses (bot_id, lower(shortcut))
  where shortcut is not null and length(trim(shortcut)) > 0;

alter table canned_responses enable row level security;

drop policy if exists "Users can manage canned responses for their own bots" on canned_responses;
create policy "Users can manage canned responses for their own bots"
  on canned_responses for all
  using (
    bot_id in (
      select id from bots where customer_id = get_my_customer_id()
    )
  );

drop trigger if exists canned_responses_updated_at on canned_responses;
create trigger canned_responses_updated_at
  before update on canned_responses
  for each row execute function update_updated_at_column();

-- ------------------------------------------------------------
-- 5.2 conversation_notes
-- ------------------------------------------------------------
create table if not exists conversation_notes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  agent_id        uuid not null references auth.users(id),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists conversation_notes_conversation_created
  on conversation_notes (conversation_id, created_at desc);

alter table conversation_notes enable row level security;

drop policy if exists "Users can manage notes for their own conversations" on conversation_notes;
create policy "Users can manage notes for their own conversations"
  on conversation_notes for all
  using (
    conversation_id in (
      select c.id
      from conversations c
      join bots b on b.id = c.bot_id
      where b.customer_id = get_my_customer_id()
    )
  );

-- ------------------------------------------------------------
-- 5.6 and 5.7 bot live-chat config
-- ------------------------------------------------------------
alter table bots
  add column if not exists escalation_keywords text[] default array[
    'human', 'agent', 'person', 'support', 'speak to', 'talk to', 'real person', 'help me'
  ];

alter table bots
  add column if not exists takeover_message text default 'You''re now connected with our team. We''ll be right with you.';

alter table bots
  add column if not exists takeover_message_enabled boolean not null default true;
