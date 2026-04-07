# Phase 5: UX Polish & Power Features

## Objective
Layer on the features that make the live chat experience genuinely useful day-to-day: canned responses, internal notes, quick conversation access from contacts, and visual improvements that reduce friction for busy business owners.

---

## Dependencies
- Phase 1 COMPLETED
- Phase 2 COMPLETED
- Phase 3 COMPLETED
- Phase 4 COMPLETED (alert settings infrastructure exists)

---

## Subtasks

### 5.1 — Canned responses
**Purpose:** Pre-saved reply templates the agent can insert with one click. Reduces response time for common replies.

**Database:**
```sql
create table canned_responses (
  id         uuid primary key default gen_random_uuid(),
  bot_id     uuid references bots(id) on delete cascade,
  title      text not null,      -- internal label e.g. "Order refund policy"
  content    text not null,      -- the actual message text
  shortcut   text,               -- optional e.g. "/refund"
  created_at timestamptz not null default now()
);
```

**Backend route:**
```
GET    /api/agent/canned-responses?botId=
POST   /api/agent/canned-responses         { botId, title, content, shortcut }
PUT    /api/agent/canned-responses/:id     { title, content, shortcut }
DELETE /api/agent/canned-responses/:id
```

**UI — Canned response picker (in thread reply input):**
- Button next to reply textarea: "⚡ Quick Replies"
- Opens a small popover listing canned responses for this bot
- Click any response → inserts text into textarea (agent can still edit before sending)
- Search/filter within the popover

**UI — Canned responses management page:**
- Route: `/dashboard/bots/[botId]/settings` → "Quick Replies" section (or separate tab)
- Table of existing responses: title, preview, shortcut, edit/delete
- "Add new" button → inline form

**Shortcut trigger:** If agent types `/` in the reply textarea, show autocomplete dropdown of canned responses filtered by shortcut name.

---

### 5.2 — Internal notes on conversations
**Purpose:** Agents can leave notes on a conversation that are visible only in the dashboard — never sent to the customer.

**Database:**
```sql
create table conversation_notes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  agent_id        uuid references auth.users(id),
  content         text not null,
  created_at      timestamptz not null default now()
);
```

**Backend routes** (add to `backend/src/routes/agent.js`):
```
GET    /api/agent/conversations/:id/notes
POST   /api/agent/conversations/:id/notes    { content }
DELETE /api/agent/conversations/:id/notes/:noteId
```

**UI — Inside ConversationThread:**
- A second tab next to "Messages": "Notes"
- Notes tab shows a list of internal notes + a textarea to add new notes
- Notes are visually distinct — yellow sticky note aesthetic
- Each note shows: author (agent name), timestamp, content
- Notes do NOT appear in the Messages tab

---

### 5.3 — "View Chat" quick access from Contacts table
**File:** `frontend/app/(dashboard)/dashboard/bots/[botId]/contacts/_components/ContactsTable.tsx`

Add a "View Chat" button/icon on each row of the contacts table.

**Behaviour:**
- Clicking "View Chat" navigates to `/dashboard/bots/[botId]/live-chat?sender={phone}`
- The live chat page pre-selects and opens the conversation for that phone number
- If no conversation exists yet for that contact, show an empty state: "No messages yet"

**Implementation:**
- `sender` query param in the live chat route triggers auto-selection of that conversation on mount
- Add a `useEffect` in `ConversationList` that watches the query param and auto-selects the matching conversation

---

### 5.4 — "View Chat" quick access from Form Responses table
**File:** `frontend/app/(dashboard)/dashboard/bots/[botId]/triggers/[triggerId]/form/responses/_components/ResponsesTable.tsx`

The user specifically asked for this: each row in the form responses table should have a quick button to jump to that customer's conversation — same as the contacts table but here the identifier is the respondent's phone number stored in the form response.

**Behaviour:**
- Add a "View Chat" icon button on each row (same style as any existing row actions like export)
- Clicking navigates to `/dashboard/bots/[botId]/live-chat?sender={respondentPhone}`
- If the form response does not contain a phone number field, disable the button with tooltip: "No phone number in this response"
- Reuses the same `sender` query param auto-selection from subtask 5.3

**Implementation note:** Check how respondent phone is stored in the form response row — it may be stored as a named field answer (e.g., field type `phone`). Extract it from `response.answers` before rendering the button.

---

### 5.5 — Fallback count badge in conversation list

**File:** `frontend/app/(dashboard)/dashboard/inbox/_components/ConversationList.tsx`

When a conversation has `fallback_count >= 2`, show a small red pill badge on the conversation card.

**Display:**
- `fallback_count = 1`: no badge (single misunderstanding, not unusual)
- `fallback_count >= 2`: red pill showing the count, e.g. "3 fails"
- Tooltip on hover: "Bot failed to understand this customer 3 times"

**Reset behaviour:** When an agent takes over and successfully replies, reset `fallback_count = 0` (in the takeover or reply endpoint).

---

### 5.6 — Configurable escalation keywords per bot
**Purpose:** Currently escalation keywords are hardcoded. Business owners should be able to add/remove them.

**Database:** Add a column to `bots` table (or a JSONB field in a bot settings table):
```sql
alter table bots add column escalation_keywords text[] default array['human','agent','person','support','speak to','talk to','real person','help me'];
```

**UI — Bot Settings page:**
- New field: "Escalation Keywords" — tag input (add/remove keywords)
- Help text: "When a customer sends one of these words, they'll be flagged for human attention"
- Default keywords pre-filled

**Backend:** In `messageHandler.js`, load `botConfig.escalationKeywords` (already part of bot resolution) instead of the hardcoded array.

---

### 5.7 — Takeover message config per bot
**Purpose:** Currently the takeover acknowledgement message is hardcoded. Business owners should customise it.

**Database:**
```sql
alter table bots add column takeover_message text default 'You''re now connected with our team. We''ll be right with you.';
alter table bots add column takeover_message_enabled boolean default true;
```

**UI — Bot Settings page → Live Chat section:**
- Toggle: "Send message to customer when agent takes over" (default: on)
- Textarea: message text (shows character count)

---

### 5.8 — Mobile-responsive inbox
**File:** `frontend/app/(dashboard)/dashboard/inbox/page.tsx` and related components

Ensure the inbox is usable on mobile browsers (business owners checking on their phones).

**Changes:**
- On screens < 768px: hide the conversation list panel, show the list full-width
- Tapping a conversation card slides in the thread view full-screen
- Back button ("←") in thread header returns to the list
- Reply textarea is sticky at the bottom of the screen on mobile
- Touch-friendly button sizes (min 44px touch targets)

---

## Execution Plan (Step-by-Step)

1. Create `canned_responses` table in Supabase (5.1)
2. Add canned response backend routes to `agent.js` (5.1)
3. Build canned response picker UI in `ConversationThread` — popover + `/` shortcut trigger (5.1)
4. Add canned responses management to bot settings page (5.1)
5. Create `conversation_notes` table (5.2)
6. Add notes backend routes to `agent.js` — GET/POST/DELETE (5.2)
7. Build Notes tab inside `ConversationThread` (5.2)
8. Add "View Chat" button to contacts table (5.3)
9. Wire `sender` query param auto-selection into inbox (5.3)
10. Add "View Chat" button to form responses table — extract phone from response answers (5.4)
11. Add fallback count badge to conversation cards (5.5)
12. Add `escalation_keywords` column to bots + settings UI (5.6)
13. Update `messageHandler.js` to use `botConfig.escalationKeywords` (5.6)
14. Add `takeover_message` config to bots table + settings UI (5.7)
15. Update takeover endpoint to use `bot.takeover_message` (5.7)
16. Make inbox layout responsive for mobile (5.8)
17. Full QA pass on all Phase 5 features

---

## Validation Criteria
- [ ] Agent can create, edit, and delete canned responses per bot
- [ ] Clicking a canned response inserts text into the reply textarea
- [ ] Typing `/` in reply textarea shows filtered shortcut list
- [ ] Internal notes are visible in the Notes tab but never sent to customer
- [ ] Multiple agents can leave notes on the same conversation
- [ ] Notes backend routes are protected — only bot owners can read/write notes
- [ ] "View Chat" button in contacts table opens the correct conversation
- [ ] "View Chat" button in form responses table opens the correct conversation
- [ ] "View Chat" in form responses is disabled (with tooltip) when no phone field exists in response
- [ ] Fallback count badge appears for conversations with 2+ fallbacks
- [ ] Fallback count resets to 0 when agent takes over (badge disappears)
- [ ] Escalation keywords are configurable per bot and respected by the backend
- [ ] Takeover message is customisable per bot and can be disabled
- [ ] Inbox is fully functional on a 375px-wide mobile screen
- [ ] All buttons and interactive elements are touch-friendly on mobile
