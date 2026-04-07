# Phase 3: Frontend — Live Inbox UI

## Objective
Build the full inbox interface where agents can view all WhatsApp conversations, filter by attention state, open conversation threads, and reply as a human. Includes real-time message delivery via Supabase Realtime.

---

## Dependencies
- Phase 1 COMPLETED
- Phase 2 COMPLETED
- All agent API routes operational
- Supabase Realtime enabled on `messages` and `conversations`

---

## Subtasks

### 3.1 — Add "Inbox" to the global sidebar
**File:** `frontend/components/ui/Sidebar.tsx`

Add an "Inbox" nav item in the main sidebar (global — not per-bot). Position it between Bots and Analytics.

- Label: `Inbox`
- Icon: inbox or message icon (use existing icon library in the project)
- Route: `/dashboard/inbox`
- Show an unread badge count: number of conversations where `needs_attention = true` and `status != 'closed'`
  - Fetch this count on mount and refresh every 60 seconds

---

### 3.2 — Create global Inbox page
**File:** `frontend/app/(dashboard)/dashboard/inbox/page.tsx`

Split-panel layout (desktop):
```
┌─────────────────────────────────────────────────────┐
│ Inbox                                    [Filters ▼] │
├───────────────────┬─────────────────────────────────┤
│ Conversation List │ Conversation Thread              │
│ (left panel)      │ (right panel)                   │
│                   │                                 │
│ [search bar]      │ [messages scroll area]          │
│                   │                                 │
│ [conversation     │ [agent reply input]             │
│  cards...]        │                                 │
└───────────────────┴─────────────────────────────────┘
```

On mobile: list view by default, tapping a conversation opens full-screen thread.

---

### 3.3 — Conversation list component
**File:** `frontend/app/(dashboard)/dashboard/inbox/_components/ConversationList.tsx`

**Filter tabs:**
| Tab | Condition |
|-----|-----------|
| All | All conversations, all statuses except internal test |
| Needs Attention | `needs_attention = true` AND `status != 'closed'` |
| Agent Active | `status = 'agent'` |
| Resolved | `status = 'closed'` |
| Expiring Soon | `last_customer_message_at` is between 22–24 hours ago AND `status != 'closed'` (window still open but closing) |

**Each conversation card shows:**
- Customer phone number (formatted)
- Bot name (since inbox is global)
- Last message preview (truncated to 60 chars)
- Time since last message
- Status badge: Bot / Agent / Closed
- `needs_attention` indicator: orange dot
- Fallback count badge: red pill if `fallback_count >= 2` (e.g. "3 fails")
- 24hr window warning: red clock icon if expiring within 2 hours

**Search bar:** Filter by phone number or last message content (client-side filter on loaded data).

**Pagination / infinite scroll:** Load 30 at a time, load more on scroll.

---

### 3.4 — Conversation thread component
**File:** `frontend/app/(dashboard)/dashboard/inbox/_components/ConversationThread.tsx`

**Header:**
- Customer phone number
- Bot name
- Current status badge
- 24hr countdown timer (if `last_customer_message_at` is within last 24 hours) — shows `HH:MM:SS` counting down, turns red under 2 hours
- Takeover / Release / Resolve buttons (contextual based on current status)

**Message area:**
- Chronological scroll (oldest at top, newest at bottom)
- Auto-scroll to bottom on new message
- Message bubbles:
  - Customer: left-aligned, gray background
  - Bot: right-aligned, blue background, small "Bot" label
  - Agent: right-aligned, green background, small "You" label
- Show sender label and timestamp on each message
- Load older messages on scroll to top (pagination)

**Agent reply input (only visible when `status = 'agent'`):**
- Textarea with send button
- `Cmd/Ctrl + Enter` to send
- Character count (WhatsApp text limit awareness)
- Canned responses picker button (Phase 5)

**Action buttons:**
- `status = 'bot'`: Show "Take Over" button (primary)
- `status = 'agent'`: Show "Return to Bot" and "Resolve" buttons
- `status = 'closed'`: Show "Reopen" button (sets back to 'bot')

---

### 3.5 — Supabase Realtime subscription
**File:** `frontend/app/(dashboard)/dashboard/inbox/_components/ConversationThread.tsx`

Subscribe to new messages for the currently open conversation.

```typescript
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      setMessages(prev => [...prev, payload.new]);
      scrollToBottom();
    }
  )
  .subscribe();

// Cleanup on unmount / conversation change
return () => supabase.removeChannel(channel);
```

Also subscribe to `conversations` table for status changes (e.g., another agent took over).

---

### 3.6 — Supabase Realtime subscription for conversation LIST
**File:** `frontend/app/(dashboard)/dashboard/inbox/_components/ConversationList.tsx`

The conversation list must also update live — not just the open thread. Without this, the list goes stale while the agent is watching it.

**Subscribe to `conversations` table for the agent's bots:**
```typescript
const channel = supabase
  .channel('conversation-list')
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'conversations',
      filter: `bot_id=in.(${botIds.join(',')})`
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setConversations(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setConversations(prev =>
          prev.map(c => c.id === payload.new.id ? payload.new : c)
        );
      }
    }
  )
  .subscribe();

return () => supabase.removeChannel(channel);
```

**What this keeps live:**
- New conversation appears in list when a first-time customer messages
- `needs_attention` badge appears/disappears without refresh
- Status badge (Bot/Agent/Closed) updates when another agent takes over
- Last message preview updates — subscribe to `messages` table too and update the matching conversation card's preview text

---

### 3.7 — Add "Live Chat" tab per bot (was 3.6)
**File:** `frontend/app/(dashboard)/dashboard/bots/[botId]/layout.tsx`

Add "Live Chat" to the per-bot tab navigation (alongside Triggers, Contacts, Analytics).

- Route: `/dashboard/bots/[botId]/live-chat`
- Shows the same inbox UI but pre-filtered to this bot only
- Same filter tabs, same thread view
- Re-uses `ConversationList` and `ConversationThread` components with `botId` prop

---

### 3.8 — Server actions for inbox data
**File:** `frontend/lib/actions/inbox.ts`

```typescript
getConversations(filters: { botId?, status?, needsAttention?, page }) → ConversationWithPreview[]
getMessages(conversationId, page) → Message[]
takeoverConversation(conversationId) → Conversation
releaseConversation(conversationId) → Conversation
resolveConversation(conversationId) → Conversation
sendAgentMessage(conversationId, message) → Message
getUnreadAttentionCount(botIds[]) → number
```

These call the backend agent API routes from Phase 2.

---

### 3.9 — 24hr countdown timer utility
**File:** `frontend/lib/utils.ts` (extend existing)

```typescript
function getWhatsAppWindowExpiry(lastCustomerMessageAt: string): {
  expiresAt: Date;
  remainingMs: number;
  isExpired: boolean;
  isWarning: boolean; // true if < 2 hours remaining
  display: string;   // "22:14:33" or "EXPIRED"
}
```

Used by `ConversationThread` header and `ConversationList` card.

---

## Execution Plan (Step-by-Step)

1. Add Inbox nav item + unread badge count to `Sidebar.tsx` (3.1)
2. Create inbox page route and layout `dashboard/inbox/page.tsx` (3.2)
3. Build `ConversationList` component with filter tabs and conversation cards (3.3)
4. Build `ConversationThread` component — messages, header, action buttons (3.4)
5. Add countdown timer utility to `utils.ts` (3.9)
6. Wire Supabase Realtime into thread component for new messages (3.5)
7. Wire Supabase Realtime into conversation list for live status/attention updates (3.6)
8. Create `frontend/lib/actions/inbox.ts` with all server actions (3.8)
9. Add per-bot Live Chat tab and route (3.7)
9. Test end-to-end:
   - Send a WhatsApp message → appears in inbox
   - Click Take Over → status updates, reply box appears
   - Type reply → delivers to customer WhatsApp
   - New customer message → appears in thread in real time
   - Release → bot resumes handling

---

## Validation Criteria
- [ ] Inbox page loads and shows all WhatsApp conversations
- [ ] Filter tabs correctly narrow the list (Needs Attention, Agent Active, Resolved, Expiring)
- [ ] Opening a conversation shows full message history (customer, bot, agent messages)
- [ ] "Take Over" button sets status to agent and shows reply input
- [ ] Agent reply sends successfully to customer WhatsApp
- [ ] New incoming customer message appears in thread without page refresh (Realtime)
- [ ] "Return to Bot" releases the conversation and bot resumes
- [ ] "Resolve" closes the conversation
- [ ] 24hr countdown timer is accurate and turns red under 2 hours
- [ ] Unread badge count in sidebar reflects actual `needs_attention` count
- [ ] Per-bot Live Chat tab shows only that bot's conversations
- [ ] Mobile layout: list → full-screen thread on tap
