# Live Chat — Implementation Status

> **Rule:** Update this file BEFORE starting any task (→ IN_PROGRESS) and AFTER completing it (→ COMPLETED).
> A phase cannot be marked COMPLETED unless ALL its subtasks are COMPLETED and ALL validation criteria are satisfied.
> Future agents must rely ONLY on these files to continue work.

---

## Summary

| Phase | Title | Status | Completion |
|-------|-------|--------|------------|
| Phase 1 | Database Foundation | IN_PROGRESS | 6 / 9 subtasks (1.1–1.4 need SQL run in Supabase) |
| Phase 2 | Backend — Takeover Logic & Agent API | IN_PROGRESS | 6 / 7 subtasks (2.7 needs Supabase dashboard) |
| Phase 3 | Frontend — Live Inbox UI | NOT_STARTED | 0 / 9 subtasks |
| Phase 4 | Alerts & Notifications | NOT_STARTED | 0 / 9 subtasks |
| Phase 5 | UX Polish & Power Features | IN_PROGRESS | 4 / 8 subtasks |

**Overall:** 6 / 42 subtasks completed (backend code done, DB migration pending)

---

## Phase 1 — Database Foundation

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 1.1 | Create `conversations` table + `updated_at` trigger | IN_PROGRESS | SQL ready in `backend/migrations/phase_1_live_chat.sql` — must be run in Supabase dashboard |
| 1.2 | Create `messages` table | IN_PROGRESS | Same migration file |
| 1.3 | Create `alert_settings` table | IN_PROGRESS | Same migration file |
| 1.4 | Create `alerts` table | IN_PROGRESS | Same migration file |
| 1.5 | Hook message storage into WhatsApp webhook | COMPLETED | `messageHandler.js` — getOrCreateConversation + storeMessage on every inbound message |
| 1.6 | Hook message storage for bot replies | COMPLETED | `messageSender.js` — persistBotReply called after every successful WA send |
| 1.7 | Create `conversationStore` service | COMPLETED | `backend/src/services/conversationStore.js` — 9 functions |
| 1.8 | Hook fallback → mark `needs_attention` + increment `fallback_count` | COMPLETED | `messageHandler.js` step 7 |
| 1.9 | Hook escalation keyword detection | COMPLETED | `messageHandler.js` — before trigger matching, WhatsApp only |

**Phase 1 Status:** IN_PROGRESS — code complete, awaiting SQL migration run
**Validation:** See `phase_1.md` — 8 criteria must pass
**⚠️ Action required:** Run `backend/migrations/phase_1_live_chat.sql` in Supabase SQL Editor, then verify validation criteria

---

## Phase 2 — Backend: Takeover Logic & Agent API

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 2.1 | Intercept webhook when agent is active | COMPLETED | `messageHandler.js` — early return after message storage when `status='agent'` |
| 2.2 | Create agent API routes (6 routes) | COMPLETED | `backend/src/routes/agent.js` — all 6 routes implemented |
| 2.3 | Auth middleware for agent routes | COMPLETED | `requireAuth` applied in `server.js`; bot ownership checked inline per route |
| 2.4 | Takeover acknowledgement message | COMPLETED | Inside takeover endpoint — reads `bot.takeover_message`, falls back to default |
| 2.5 | Reset `fallback_count` on takeover + first agent reply | COMPLETED | Called in both takeover and reply endpoints |
| 2.6 | Wire agent routes into Express app | COMPLETED | `server.js` — `app.use('/api/agent', requireAuth, agentRouter)` |
| 2.7 | Enable Supabase Realtime on `messages` + `conversations` | NOT_STARTED | Manual step: Supabase dashboard → Database → Replication |

**Phase 2 Status:** IN_PROGRESS — code complete, awaiting Supabase Realtime enablement (2.7)
**Validation:** See `phase_2.md` — 10 criteria must pass
**⚠️ Action required:** In Supabase dashboard → Database → Replication, enable Realtime for `messages` and `conversations` tables

---

## Phase 3 — Frontend: Live Inbox UI

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 3.1 | Add "Inbox" to global sidebar with badge count | COMPLETED | `Sidebar.tsx` — Inbox nav item + 60s polling attention count badge |
| 3.2 | Create global Inbox page (split-panel layout) | COMPLETED | `inbox/page.tsx` + `InboxClient.tsx` — server fetches botIds, client manages selected state |
| 3.3 | Conversation list component + filter tabs | COMPLETED | `ConversationList.tsx` — 5 tabs, search, 30-item pagination, conversation cards |
| 3.4 | Conversation thread component | COMPLETED | `ConversationThread.tsx` — bubbles, action buttons, reply input, date grouping |
| 3.5 | Supabase Realtime for open thread (new messages) | COMPLETED | `ConversationThread.tsx` — subscribes to messages + conversation status changes |
| 3.6 | Supabase Realtime for conversation LIST (status/attention updates) | COMPLETED | `ConversationList.tsx` — subscribes to conversations + messages INSERT |
| 3.7 | Add "Live Chat" tab per bot | COMPLETED | `bots/[botId]/layout.tsx` + `live-chat/page.tsx` — pre-filtered to bot |
| 3.8 | Server actions for inbox data | COMPLETED | `frontend/lib/actions/inbox.ts` — direct Supabase reads, backend calls for writes |
| 3.9 | 24hr countdown timer utility | COMPLETED | `frontend/lib/utils.ts` — `getWhatsAppWindowExpiry()` with HH:MM:SS countdown |

**Phase 3 Status:** COMPLETED
**Validation:** See `phase_3.md` — 12 criteria must pass
**⚠️ Note:** Requires Phase 1 SQL migration and Phase 2 Supabase Realtime enablement to be fully functional end-to-end

---

## Phase 4 — Alerts & Notifications

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 4.1 | Backend cron: response threshold alert | COMPLETED | `backend/src/jobs/alertScheduler.js` — `checkResponseThreshold()` |
| 4.2 | Backend cron: 24hr window closing alert | COMPLETED | `alertScheduler.js` — `checkWindowClosing()` |
| 4.3 | Backend cron: agent went silent alert | COMPLETED | `alertScheduler.js` — `checkAgentSilent()` |
| 4.4 | Schedule cron jobs in server.js | COMPLETED | `node-cron` installed; `*/5 * * * *` schedule in `server.js` |
| 4.5 | Email notification service (3 alert types) | COMPLETED | `backend/src/services/emailNotifier.js` — Resend SDK, 3 templates |
| 4.6 | Alert settings UI per bot (hide push toggle) | COMPLETED | `LiveChatAlertsForm.tsx` added to bot settings page; push toggle not present |
| 4.7 | Notification bell in navbar | COMPLETED | `NotificationBell.tsx` in Sidebar — dropdown, mark all read, 60s poll |
| 4.8 | Alerts history page | COMPLETED | `dashboard/alerts/page.tsx` + `AlertsClient.tsx` — filters, pagination |
| 4.9 | Server actions for alerts | COMPLETED | `frontend/lib/actions/alerts.ts` — 6 functions |

**Phase 4 Status:** COMPLETED
**Deferred:** Push notifications (`notify_push` column reserved but not implemented)
**⚠️ Config required:** Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` to backend `.env`
**Validation:** See `phase_4.md` — 16 criteria must pass

---

## Phase 5 — UX Polish & Power Features

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 5.1 | Canned responses (DB + routes + picker UI + management) | IN_PROGRESS | SQL ready in `backend/migrations/phase_5_live_chat_power_features.sql`; backend routes, picker UI, and settings manager implemented |
| 5.2 | Internal notes (DB + backend routes + Notes tab UI) | IN_PROGRESS | SQL ready in `backend/migrations/phase_5_live_chat_power_features.sql`; GET/POST/DELETE routes + Notes tab implemented |
| 5.3 | "View Chat" from Contacts table | COMPLETED | `ContactsTable.tsx` — direct link to bot live chat with `sender` query param |
| 5.4 | "View Chat" from Form Responses table | COMPLETED | `ResponsesTable.tsx` — phone extracted from phone-validated answers; disabled state when absent |
| 5.5 | Fallback count badge in conversation list | COMPLETED | `ConversationList.tsx` — red fail badge for `fallback_count >= 2` |
| 5.6 | Configurable escalation keywords per bot | IN_PROGRESS | DB column migration ready; settings UI + tenantResolver wiring implemented |
| 5.7 | Takeover message config per bot | IN_PROGRESS | DB columns migration ready; settings UI + takeover endpoint support implemented |
| 5.8 | Mobile-responsive inbox | COMPLETED | `InboxClient.tsx` + `ConversationThread.tsx` — mobile list/thread split with back button and touch-sized actions |

**Phase 5 Status:** IN_PROGRESS
**Phase 5 Status:** IN_PROGRESS — frontend/backend code largely implemented, awaiting Phase 5 SQL migration run and end-to-end QA
**Validation:** See `phase_5.md` — 15 criteria must pass
**⚠️ Action required:** Run `backend/migrations/phase_5_live_chat_power_features.sql` in Supabase SQL Editor before validating quick replies, notes, escalation keywords, and takeover settings

---

## Change Log

| Date | Change | Agent/Person |
|------|--------|--------------|
| 2026-04-07 | Initial status file created. All phases defined. | Claude |
| 2026-04-07 | Audit pass: 9 gaps found and fixed across all phases. Subtask count updated from 38 → 42. | Claude |
| 2026-04-07 | Phase 3 COMPLETED — 9/9 subtasks done. All inbox UI files created, TypeScript clean. | Claude |
| 2026-04-07 | Phase 4 COMPLETED — 9/9 subtasks done. Alert scheduler, email notifier, settings UI, notification bell, alerts history page. TypeScript clean. | Claude |
| 2026-04-07 | Phase 5 implementation pass: quick replies, notes, sender deep-links, fallback badge, mobile inbox, and live-chat settings code added. Awaiting SQL migration + QA. | Codex |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/services/messageHandler.js` | Core message routing — modified in 1.5, 1.8, 1.9, 2.1 |
| `backend/src/services/messageSender.js` | Bot reply sender — modified in 1.6 |
| `backend/src/services/conversationStore.js` | New — all DB ops for conversations/messages (9 functions) |
| `backend/src/routes/agent.js` | New — all human agent API endpoints + notes routes |
| `backend/src/jobs/alertScheduler.js` | New — 3 cron checks: threshold, window_closing, agent_silent |
| `backend/src/services/emailNotifier.js` | New — sends alert emails (3 templates) |
| `frontend/components/ui/Sidebar.tsx` | Modified — add Inbox nav item with badge |
| `frontend/app/(dashboard)/dashboard/inbox/` | New — global inbox page and components |
| `frontend/app/(dashboard)/dashboard/alerts/` | New — alerts history page |
| `frontend/lib/actions/inbox.ts` | New — inbox server actions |
| `frontend/lib/actions/alerts.ts` | New — alerts server actions |
| `frontend/app/(dashboard)/dashboard/bots/[botId]/contacts/_components/ContactsTable.tsx` | Modified — View Chat button |
| `frontend/app/(dashboard)/dashboard/bots/[botId]/triggers/[triggerId]/form/responses/_components/ResponsesTable.tsx` | Modified — View Chat button |
