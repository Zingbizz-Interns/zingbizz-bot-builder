# Phase 1: Database Foundation

## Objective
Establish the database schema and message persistence layer that every subsequent phase depends on. Nothing else can be built until messages, conversations, alerts, and alert settings are stored in Supabase.

---

## Dependencies
- None. This is the root phase.

---

## Subtasks

### 1.1 — Create `conversations` table
**Purpose:** One row per unique customer ↔ bot thread. Tracks who is handling it and whether it needs human attention.

```sql
create table conversations (
  id                        uuid primary key default gen_random_uuid(),
  bot_id                    uuid references bots(id) on delete cascade,
  platform                  text not null default 'whatsapp',
  sender_id                 text not null,                        -- customer phone number
  status                    text not null default 'bot',          -- 'bot' | 'agent' | 'closed'
  agent_id                  uuid references auth.users(id),       -- who took over (null if bot)
  needs_attention           boolean not null default false,
  unresolved_since          timestamptz,                          -- when bot first fell back
  fallback_count            integer not null default 0,
  last_customer_message_at  timestamptz,
  last_reply_at             timestamptz,                          -- last bot OR agent reply
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique(bot_id, platform, sender_id)
);
```

**RLS:** Enable RLS. Policy: user can only access conversations belonging to their bots.

**Auto-update trigger for `updated_at`:**
```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at_column();
```

---

### 1.2 — Create `messages` table
**Purpose:** Persist every message — customer, bot, and agent — for conversation history display.

```sql
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  bot_id          uuid references bots(id) on delete cascade,
  sender_type     text not null,   -- 'customer' | 'bot' | 'agent'
  content         text not null,
  message_type    text not null default 'text',  -- 'text' | 'interactive' | 'template'
  metadata        jsonb,                         -- raw interactive payload if needed
  created_at      timestamptz not null default now()
);

create index on messages (conversation_id, created_at);
create index on messages (bot_id, created_at);
```

**RLS:** Enable RLS. Policy: user can only access messages whose bot_id belongs to their bots.

---

### 1.3 — Create `alert_settings` table
**Purpose:** Per-bot configurable thresholds for when to alert the business owner.

```sql
create table alert_settings (
  bot_id                    uuid primary key references bots(id) on delete cascade,
  enabled                   boolean not null default true,
  threshold_minutes         integer not null default 120,   -- alert after 2 hours by default
  window_warning_enabled    boolean not null default true,  -- warn when 24hr window is closing
  window_warning_minutes    integer not null default 120,   -- warn 2 hours before window closes
  notify_email              boolean not null default true,
  notify_push               boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
```

---

### 1.4 — Create `alerts` table
**Purpose:** Store fired alerts so the business owner can see past notifications in the UI.

```sql
create table alerts (
  id              uuid primary key default gen_random_uuid(),
  bot_id          uuid references bots(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  alert_type      text not null,   -- 'response_threshold' | 'window_closing'
  is_read         boolean not null default false,
  acknowledged_at timestamptz,
  triggered_at    timestamptz not null default now()
);

create index on alerts (bot_id, is_read, triggered_at desc);
```

**RLS:** Enable RLS. Policy: user can only access alerts for their bots.

---

### 1.5 — Hook message storage into the WhatsApp webhook
**File:** `backend/src/services/messageHandler.js`

Every incoming customer message must be persisted BEFORE bot logic runs.

**Steps:**
1. Import a new `conversationStore` service (created in 1.7)
2. After resolving `botConfig`, call `getOrCreateConversation(botId, senderId, platform)`
3. Store the incoming message: `storeMessage(conversationId, 'customer', input)`
4. Update `conversations.last_customer_message_at = NOW()`
5. Attach `conversationId` to context passed through the handler

---

### 1.6 — Hook message storage for all bot replies
**File:** `backend/src/services/messageSender.js`

Every outgoing bot reply must also be persisted.

**Steps:**
1. After successfully sending any message (text, buttons, list), call `storeMessage(conversationId, 'bot', content)`
2. Update `conversations.last_reply_at = NOW()`
3. `conversationId` must be threaded through from the webhook context

---

### 1.7 — Create `conversationStore` service
**File:** `backend/src/services/conversationStore.js`

Centralises all DB operations for conversations and messages. Other services import from here.

**Functions to implement:**
```javascript
getOrCreateConversation(botId, senderId, platform) → conversation
storeMessage(conversationId, senderType, content, messageType, metadata) → message
markNeedsAttention(conversationId) → void       // sets needs_attention=true, unresolved_since=NOW() if null
incrementFallbackCount(conversationId) → void   // increments fallback_count by 1
resetFallbackCount(conversationId) → void       // resets fallback_count to 0 (called on agent takeover)
clearNeedsAttention(conversationId) → void      // sets needs_attention=false, unresolved_since=null
setConversationStatus(conversationId, status, agentId?) → void
updateLastReply(conversationId) → void
updateLastCustomerMessage(conversationId) → void
```

---

### 1.8 — Hook fallback to mark `needs_attention`
**File:** `backend/src/services/messageHandler.js` — Step 7 (Fallback block)

When the bot fires the fallback message, mark the conversation as needing human attention.

```javascript
// Step 7 — Fallback
await sendText(platform, senderId, botConfig.fallbackMessage, platformConfig);
await conversationStore.markNeedsAttention(conversation.id);
await conversationStore.incrementFallbackCount(conversation.id);
```

---

### 1.9 — Hook escalation keyword detection
**File:** `backend/src/services/messageHandler.js` — Before trigger matching (Step 5/6)

Detect when a customer explicitly asks for a human before running trigger matching.

**Keywords to detect (configurable later):**
`['human', 'agent', 'person', 'speak to', 'talk to', 'real person', 'support', 'help me']`

**Behavior:**
1. If keyword matched → `markNeedsAttention(conversation.id)`
2. Send acknowledgement: `"Our team has been notified and will reply shortly."`
3. Store acknowledgement as 'bot' message
4. `return` — do not continue to trigger matching

---

## Execution Plan (Step-by-Step)

1. Run SQL for subtask 1.1 in Supabase dashboard → verify table created
2. Run SQL for subtask 1.2 → verify table + indexes created
3. Run SQL for subtask 1.3 → verify table created
4. Run SQL for subtask 1.4 → verify table + index created
5. Create `backend/src/services/conversationStore.js` with all 7 functions
6. Wire `conversationStore` into `messageHandler.js` — incoming message storage (1.5)
7. Wire `conversationStore` into `messageSender.js` — outgoing reply storage (1.6)
8. Add fallback hook in `messageHandler.js` (1.8)
9. Add escalation keyword detection in `messageHandler.js` (1.9)
10. Send test messages via WhatsApp and verify rows appear in `messages` and `conversations` tables

---

## Validation Criteria
- [ ] Sending a WhatsApp message creates a row in `conversations`
- [ ] Every message (customer + bot reply) creates a row in `messages`
- [ ] Sending an unrecognised message fires fallback AND sets `needs_attention = true` on the conversation
- [ ] Sending "I need to speak to a human" sets `needs_attention = true` and returns the acknowledgement text
- [ ] `last_customer_message_at` updates on every customer message
- [ ] `last_reply_at` updates on every bot reply
- [ ] Duplicate customer/bot conversations reuse the same `conversations` row (unique constraint holds)
- [ ] RLS policies prevent cross-user data access
