# Phase 4: Alerts & Notifications

## Objective
Implement the alert system that notifies business owners when conversations need attention or when the 24-hour WhatsApp reply window is about to close. Includes configurable per-bot thresholds, a notification bell in the UI, past alerts history, and email delivery.

---

## Dependencies
- Phase 1 COMPLETED (`conversations`, `alerts`, `alert_settings` tables exist)
- Phase 2 COMPLETED (agent routes operational)
- Phase 3 COMPLETED (inbox UI exists — notification bell is added here)

---

## Subtasks

### 4.1 — Backend cron job: Response threshold alert
**File:** `backend/src/jobs/alertScheduler.js` (new file)

Runs every **5 minutes**. Detects conversations that have been waiting longer than the configured threshold.

**Query logic:**
```sql
SELECT c.*, a.threshold_minutes, a.notify_email, b.name as bot_name
FROM conversations c
JOIN alert_settings a ON a.bot_id = c.bot_id
JOIN bots b ON b.id = c.bot_id
WHERE c.needs_attention = true
  AND c.status != 'agent'       -- agent already on it, skip
  AND c.status != 'closed'
  AND c.unresolved_since < NOW() - (a.threshold_minutes * interval '1 minute')
  AND a.enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM alerts al
    WHERE al.conversation_id = c.id
      AND al.alert_type = 'response_threshold'
      AND al.triggered_at > NOW() - interval '1 hour'  -- don't re-alert within 1 hour
  )
```

**For each matched conversation:**
1. Insert row into `alerts` table with `alert_type = 'response_threshold'`
2. If `notify_email = true` → call email service (4.4)

---

### 4.2 — Backend cron job: 24hr window closing alert
**File:** `backend/src/jobs/alertScheduler.js` (extend same file)

Runs every **5 minutes**. Detects conversations where the 24-hour reply window is closing soon.

**Query logic:**
```sql
SELECT c.*, a.window_warning_minutes, a.notify_email, b.name as bot_name
FROM conversations c
JOIN alert_settings a ON a.bot_id = c.bot_id
JOIN bots b ON b.id = c.bot_id
WHERE c.platform = 'whatsapp'
  AND c.status != 'closed'
  AND c.last_customer_message_at IS NOT NULL
  AND c.last_customer_message_at < NOW() - ((1440 - a.window_warning_minutes) * interval '1 minute')
  AND c.last_customer_message_at > NOW() - interval '24 hours'  -- window not yet expired
  AND a.window_warning_enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM alerts al
    WHERE al.conversation_id = c.id
      AND al.alert_type = 'window_closing'
      AND al.triggered_at > NOW() - interval '1 hour'
  )
```

**For each matched conversation:**
1. Insert `alert_type = 'window_closing'` into `alerts`
2. If `notify_email = true` → send urgent email

---

### 4.3 — Backend cron job: Agent went silent alert
**File:** `backend/src/jobs/alertScheduler.js` (extend same file)

Detects conversations where an agent took over, the customer has since sent a new message, but the agent has not replied. The agent is the one going silent now — not the bot.

**Query logic:**
```sql
SELECT c.*, a.threshold_minutes, a.notify_email, b.name as bot_name
FROM conversations c
JOIN alert_settings a ON a.bot_id = c.bot_id
JOIN bots b ON b.id = c.bot_id
WHERE c.status = 'agent'
  AND c.last_customer_message_at IS NOT NULL
  AND c.last_customer_message_at > COALESCE(c.last_reply_at, '1970-01-01')
  AND c.last_customer_message_at < NOW() - (a.threshold_minutes * interval '1 minute')
  AND a.enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM alerts al
    WHERE al.conversation_id = c.id
      AND al.alert_type = 'agent_silent'
      AND al.triggered_at > NOW() - interval '1 hour'
  )
```

**For each matched conversation:**
1. Insert `alert_type = 'agent_silent'` into `alerts`
2. If `notify_email = true` → send email: "Customer replied while you were handling this conversation — they're still waiting"

**Add `agent_silent` to the `alerts.alert_type` allowed values** (document in schema comment).

---

### 4.4 — Schedule the cron jobs
**File:** `backend/src/server.js`

Use `node-cron` (or `setInterval`) to run `alertScheduler` every 5 minutes on server start.

```javascript
const cron = require('node-cron');
const { runAlertChecks } = require('./jobs/alertScheduler');

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  runAlertChecks().catch(err => console.error('[alerts] cron error:', err.message));
});
```

Install dependency: `npm install node-cron`

---

### 4.5 — Email notification service
**File:** `backend/src/services/emailNotifier.js` (new file)

Send alert emails using an existing transactional email provider (Resend or SendGrid — check which is already used in the project, or add Resend as it has a generous free tier).

**Email content:**

For `response_threshold`:
```
Subject: [Action Required] Customer waiting on {bot_name}
Body:
  A customer (+91 98765 43210) has been waiting for X hours.
  Their last message: "I need help with my order..."
  
  [View Conversation] → link to /dashboard/inbox?conversation={id}
```

For `window_closing`:
```
Subject: ⚠️ Reply window closing in {minutes} min — {bot_name}
Body:
  You have {N} minutes left to reply to +91 98765 43210 
  before the 24-hour WhatsApp window closes.
  After that, you can only send template messages.
  
  [Reply Now] → link to /dashboard/inbox?conversation={id}
```

**Steps:**
1. Add email provider SDK (Resend: `npm install resend`)
2. Add `RESEND_API_KEY` to environment config
3. Implement `sendAlertEmail(alertType, conversation, botName, recipientEmail)`
4. Get recipient email from the bot owner's auth user record

---

### 4.6 — Alert settings UI (per bot)
**File:** `frontend/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx`

Add a new "Live Chat Alerts" section to the existing bot settings page.

**Fields:**
| Field | Type | Default |
|-------|------|---------|
| Enable alerts | Toggle | On |
| Alert me after | Number input (minutes) | 120 |
| WhatsApp window warning | Toggle | On |
| Warn me when N minutes remain | Number input | 120 |
| Email notifications | Toggle | On |

**Behaviour:**
- On save: `upsert` into `alert_settings` table
- Load existing settings on page mount
- Show preview: "You'll be alerted if a conversation is unanswered for 2 hours"

---

### 4.7 — Notification bell in navbar
**File:** `frontend/app/(dashboard)/layout.tsx` (or wherever the top navbar lives)

**Bell icon:**
- Shows unread alert count badge (red pill)
- Click opens a dropdown panel

**Dropdown panel:**
- Header: "Notifications" + "Mark all read" link
- List of recent alerts (last 20), newest first
- Each alert item:
  - Icon: ⏱ for response_threshold, ⚠️ for window_closing
  - Text: "Customer +91 98765... waiting 3 hours on {bot_name}"
  - Time: "2 hours ago"
  - Click → navigates to conversation in inbox
  - Unread alerts have a blue left border
- "View all alerts" link at bottom → `/dashboard/alerts`

**Unread count:** Fetch on mount, refresh every 60 seconds. Mark alerts as read when dropdown opens.

---

### 4.8 — Alerts history page
**File:** `frontend/app/(dashboard)/dashboard/alerts/page.tsx`

Full page for viewing all past alerts.

**Columns:**
| Column | Content |
|--------|---------|
| Type | Response Threshold / Window Closing |
| Bot | Bot name |
| Customer | Phone number |
| Triggered | Relative time ("3 hours ago") |
| Status | Read / Unread |
| Action | "View Conversation" button |

**Filters:** By bot, by alert type, by date range.

**Server action:** `getAlerts(filters)` → paginated list from `alerts` table.

---

### 4.9 — Server actions for alerts
**File:** `frontend/lib/actions/alerts.ts`

```typescript
getAlerts(filters: { botId?, alertType?, isRead?, page }) → Alert[]
getUnreadAlertCount(botIds[]) → number
markAlertRead(alertId) → void
markAllAlertsRead(botIds[]) → void
getAlertSettings(botId) → AlertSettings
saveAlertSettings(botId, settings) → AlertSettings
```

---

## Deferred: Push Notifications
`alert_settings` has a `notify_push` column reserved for future browser push notifications (FCM/service worker). **Not implemented in this phase.** The toggle must be hidden in the settings UI for now. Implement in a future phase when a push provider is chosen.

---

## Execution Plan (Step-by-Step)

1. Create `backend/src/jobs/alertScheduler.js` with all three check functions (4.1, 4.2, 4.3)
2. Add `node-cron` and wire scheduler into `server.js` (4.4)
3. Create `emailNotifier.js` — add Resend SDK, write email templates for all three alert types (4.5)
4. Add alert settings section to bot settings page — hide `notify_push` toggle (4.6)
5. Create `frontend/lib/actions/alerts.ts` (4.9)
6. Add notification bell to navbar layout with dropdown (4.7)
7. Create alerts history page (4.8)
8. Test:
   - Configure threshold to 1 minute for testing
   - Send an unrecognised message → wait → verify `response_threshold` alert fires
   - Take over conversation, have customer reply, wait → verify `agent_silent` alert fires
   - Verify email arrives for both alert types
   - Verify bell badge updates
   - Verify alert appears in history page with correct type label
   - Verify `window_closing` alert fires for a conversation at 22+ hours

---

## Validation Criteria
- [ ] Cron job runs every 5 minutes without crashing
- [ ] Response threshold alert fires when `unresolved_since` exceeds configured minutes
- [ ] Response threshold does NOT fire if agent is already active (`status='agent'`)
- [ ] Response threshold does NOT fire twice within 1 hour for the same conversation
- [ ] Window closing alert fires when `last_customer_message_at` is 22–24 hours ago
- [ ] Agent silent alert fires when agent is active, customer replied, and threshold has passed
- [ ] Agent silent alert does NOT fire if `last_reply_at` is after `last_customer_message_at`
- [ ] Alert email is received at the bot owner's email address for all three alert types
- [ ] Email contains a direct link to the conversation
- [ ] Notification bell shows correct unread count
- [ ] Clicking a notification navigates to the correct conversation
- [ ] "Mark all read" clears the badge
- [ ] Alert settings save and load correctly per bot
- [ ] `notify_push` toggle is NOT visible in the settings UI (deferred)
- [ ] Alerts history page shows all past alerts with correct type labels
- [ ] Alert settings validation: threshold must be between 15 and 1380 minutes
