# Phase 2: Backend — Takeover Logic & Agent API

## Objective
Build the backend logic that allows a human agent to take control of a conversation, reply to customers via the WhatsApp API, and release the conversation back to the bot. The webhook must stop routing to the bot when an agent has taken over.

---

## Dependencies
- Phase 1 must be COMPLETED
- `conversations` and `messages` tables must exist
- `conversationStore` service must be operational

---

## Subtasks

### 2.1 — Intercept webhook when agent is active
**File:** `backend/src/services/messageHandler.js`

When a conversation has `status = 'agent'`, incoming customer messages must NOT be processed by the bot. They should only be stored and surfaced to the agent in real time.

**Logic to add after `getOrCreateConversation()`:**

```javascript
if (conversation.status === 'agent') {
  await conversationStore.storeMessage(conversation.id, 'customer', input);
  await conversationStore.updateLastCustomerMessage(conversation.id);
  // Supabase Realtime will push this to the agent's inbox automatically
  // via the messages table INSERT event — no extra push needed here
  return; // Bot does NOT process this message
}
```

---

### 2.2 — Create agent API routes
**File:** `backend/src/routes/agent.js` (new file)

All agent actions go through authenticated REST endpoints. Frontend calls these.

**Routes:**

```
POST   /api/agent/conversations/:id/takeover
       Body: {}
       Action: Sets status='agent', agent_id=currentUser, needs_attention=false, unresolved_since=null
       Returns: { conversation }

POST   /api/agent/conversations/:id/release
       Body: {}
       Action: Sets status='bot', agent_id=null
       Returns: { conversation }

POST   /api/agent/conversations/:id/resolve
       Body: {}
       Action: Sets status='closed'
       Returns: { conversation }

POST   /api/agent/conversations/:id/reply
       Body: { message: string }
       Action: Calls sendWhatsAppMessage(), stores message as 'agent', updates last_reply_at
       Returns: { message }

GET    /api/agent/conversations
       Query: botId, status, needs_attention, limit, offset
       Action: Paginated list of conversations with last message preview
       Returns: { conversations[], total }

GET    /api/agent/conversations/:id/messages
       Query: limit, offset
       Action: Returns paginated messages for a conversation (oldest first)
       Returns: { messages[], total }
```

---

### 2.3 — Auth middleware for agent routes
**File:** `backend/src/middleware/auth.js` (extend existing)

Agent routes must be protected. Only authenticated users who own the bot tied to the conversation can access it.

**Steps:**
1. Verify JWT from `Authorization: Bearer <token>` header using Supabase
2. Attach `req.user` to the request
3. For conversation-specific routes, verify `conversation.bot_id` belongs to a bot owned by `req.user.id`
4. Apply middleware to all `/api/agent/*` routes

---

### 2.4 — Takeover acknowledgement message (optional send)
**File:** `backend/src/routes/agent.js` — inside the takeover endpoint

When an agent takes over, optionally send a message to the customer letting them know.

**Config:** Check `bot.takeover_message` (can be null = don't send). Default: `"You're now connected with our team. We'll be right with you."`

**Steps:**
1. After setting `status='agent'`, check if `bot.takeover_message` is set
2. If set, call `sendWhatsAppMessage(senderPhone, bot.takeover_message)`
3. Store as a 'bot' message (it's automated, not typed by agent)

---

### 2.5 — Reset `fallback_count` on agent takeover
**File:** `backend/src/routes/agent.js` — inside the takeover endpoint

When an agent takes over, reset the fallback counter so the conversation card badge clears.

```javascript
// Inside takeover endpoint, after setting status='agent':
await conversationStore.resetFallbackCount(conversation.id);
```

Also reset on `POST /api/agent/conversations/:id/reply` (first agent reply confirms they are handling it).

---

### 2.6 — Wire agent routes into Express app
**File:** `backend/src/server.js`

```javascript
const agentRouter = require('./routes/agent');
app.use('/api/agent', authMiddleware, agentRouter);
```

---

### 2.7 — Enable Supabase Realtime on `messages` table
**In Supabase dashboard:**
1. Go to Database → Replication
2. Enable Realtime for the `messages` table
3. Enable Realtime for the `conversations` table (for status changes)

This allows the frontend inbox to receive new messages instantly without polling.

---

## Execution Plan (Step-by-Step)

1. Add agent-active intercept to `messageHandler.js` (2.1)
2. Create `backend/src/routes/agent.js` with all 6 routes (2.2)
3. Extend `backend/src/middleware/auth.js` with bot ownership verification (2.3)
4. Add takeover acknowledgement logic inside takeover endpoint (2.4)
5. Add `resetFallbackCount` call inside takeover and first-reply endpoints (2.5)
6. Register agent router in `server.js` (2.6)
7. Enable Supabase Realtime on `messages` and `conversations` tables (2.7)
8. Test with cURL / Postman:
   - Take over a conversation
   - Send a message as agent → verify it appears in WhatsApp
   - Verify bot does NOT reply to subsequent customer messages
   - Release conversation → verify bot resumes

---

## Validation Criteria
- [ ] `POST /api/agent/conversations/:id/takeover` sets `status='agent'` in DB
- [ ] After takeover, customer messages no longer trigger bot replies
- [ ] After takeover, customer messages still appear in the `messages` table
- [ ] `POST /api/agent/conversations/:id/reply` delivers the message to the customer's WhatsApp
- [ ] Agent reply is stored in `messages` with `sender_type='agent'`
- [ ] `POST /api/agent/conversations/:id/release` sets `status='bot'` and bot resumes handling
- [ ] `POST /api/agent/conversations/:id/resolve` sets `status='closed'`
- [ ] Unauthenticated requests to agent routes return 401
- [ ] A user cannot access conversations for bots they don't own (403)
- [ ] Supabase Realtime fires on new message INSERT (verify in browser console)
