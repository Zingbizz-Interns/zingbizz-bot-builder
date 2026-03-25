# Context.md — Project Quick Context

Load this file at the start of any conversation to get full context instantly.

---

## What This Project Is

A **multi-tenant chatbot builder platform** for WhatsApp and Instagram.
Customers log in, configure their bot via a frontend UI, connect their Meta API credentials, and the system handles all messaging automatically.

---

## Project Structure

```
C:\instagram_bot\
├── backend/          ← Node.js + Express (webhook handler)
├── frontend/         ← Next.js 15 (builder UI)
├── database/         ← SQL migrations
├── design.xml        ← Bauhaus design system (source of truth)
├── doc-1.md          ← Full discussion record
├── MVP.md            ← Detailed phase-by-phase build plan
└── Context.md        ← This file
```

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL + Auth)
- **DB Client:** Supabase JS client (`@supabase/supabase-js`, `@supabase/ssr`)
- **Design System:** Bauhaus (`design.xml`) — see rules below
- **Icons:** `lucide-react`
- **Utilities:** `clsx` + `tailwind-merge` → `cn()` in `frontend/lib/utils.ts`

---

## Design System (Bauhaus) — Mandatory Rules

Source of truth: `design.xml`. Follow on every UI component.

- **Font:** Outfit (400/500/700/900) via `next/font/google`
- **Colors:** `#F0F0F0` bg · `#121212` black · `#D02020` red · `#1040C0` blue · `#F0C020` yellow
- **Borders:** `border-2` / `border-4` always `border-[#121212]` — no soft borders
- **Radius:** `rounded-none` OR `rounded-full` only — never `rounded-lg` etc.
- **Shadows:** Hard offset only — `shadow-[4px_4px_0px_0px_#121212]` / `shadow-[8px_8px_0px_0px_#121212]`
- **Buttons:** Uppercase, `font-bold tracking-wider`, active press: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`
- **Typography:** Headlines = `font-black uppercase tracking-tighter` · Labels = `font-bold uppercase tracking-widest`
- **Never:** gradients, soft shadows, `rounded-lg/xl/md`, generic gray card styles

**Reusable components (already built):**
- `frontend/components/ui/Button.tsx` — variants: red, blue, yellow, outline, ghost
- `frontend/components/ui/Card.tsx` — border-4 card with optional corner decorations
- `frontend/lib/utils.ts` — `cn()` utility

---

## Key Concepts

**Multi-tenant:** Each customer has their own account. One customer can have both WhatsApp and Instagram bots independently.

**Platform Credentials (stored in Supabase, validated via Meta API before saving):**
- WhatsApp: Phone Number ID, WABA ID, Access Token, Webhook Verify Token
- Instagram: Page ID, Access Token, Webhook Verify Token

**Trigger System:**
- 3 types: `single` (one keyword), `multi` (array of keywords), `any` (catch-all)
- Each trigger has `platforms: ["whatsapp"] | ["instagram"] | ["whatsapp","instagram"]`
- Fallback message: fires when no trigger matches (customer-defined)

**3 Action Types:**
1. `replier` — message + quick-reply buttons, each button links to another trigger
2. `form` — dynamic questions: validation, optional/required, multiple choice, conditional logic (`show Q3 if Q2 == "Yes"`), previous answer tokens (`{Q1}`), progress indicator
3. `query` — FAQ: categories → questions → pre-written answers

**Session (per bot per platform):**
- Configurable expiry duration
- Configurable warning time + warning message before expiry

**Builder UI Features:**
- Form-based builder (no drag and drop)
- Live phone mockup preview (WhatsApp/Instagram skin, real-time)
- Test Mode (in-browser chat simulator)

**Response Management:** View form responses + XLSX export

**Analytics:** Trigger counts, form completion/drop-off, question abandon rate, active sessions

---

## Excluded (Deferred)
Drag and drop builder, welcome message, save & resume sessions, tag/filter/notes on responses, email/webhook notifications, templates.

---

## Database Tables
```
customer_profiles, bots, platform_configs,
triggers, trigger_keywords,
replier_actions, replier_buttons,
forms, form_questions, form_question_options, form_conditions,
query_builders, query_categories, query_questions,
form_responses, form_response_answers,
analytics_events
```
Migrations in `database/migrations/001_initial_schema.sql` + `002_rls_policies.sql`
TypeScript types in `frontend/types/database.ts`

---

## Important SQL — Run in Supabase Dashboard

```sql
-- Auto-create profile on signup (run once)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RPC to upsert profile (used by bots.ts)
CREATE OR REPLACE FUNCTION upsert_my_profile(p_name text, p_email text)
RETURNS uuid AS $$
DECLARE profile_id uuid;
BEGIN
  INSERT INTO public.customer_profiles (user_id, email, name)
  VALUES (auth.uid(), p_email, p_name)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO profile_id;
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant table access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

---

## Build Progress

### ✅ Phase 1 — Project Setup & Foundation
- Next.js 15 + TypeScript + Tailwind v4 in `frontend/`, Express in `backend/`
- Supabase clients: `frontend/lib/supabase/client.ts`, `server.ts`, `admin.ts`
- `.env.local` (frontend) and `.env` (backend) configured

### ✅ Phase 2 — Database Schema
- All 17 tables + RLS via `database/migrations/001_initial_schema.sql` + `002_rls_policies.sql`
- TypeScript types in `frontend/types/database.ts`

### ✅ Phase 3 — Authentication
- Supabase Auth + `@supabase/ssr`, middleware protects `/dashboard/*`
- `frontend/lib/actions/auth.ts` — `signUp`, `signIn`, `signOut`
- Pages: `/login`, `/signup` · Sidebar: `frontend/components/ui/Sidebar.tsx`
- Express JWT middleware: `backend/src/middleware/auth.js`

### ✅ Phase 4 — Platform Credential Management
- `frontend/lib/actions/platforms.ts` — `savePlatformConfig`, `validateCredentials` (Meta API v18.0)
- `/dashboard/bots/[botId]/platforms` — WA + IG forms, validate-then-save
- Session config UI added to both platform forms (`SessionConfig.tsx`)

### ✅ Phase 5 — Bot Management & Session Config
- `frontend/lib/actions/bots.ts` — `createBot`, `updateBot`, `deleteBot`, `getBots`, `getOrCreateProfile` (RPC)
- `/dashboard/bots` — bot grid, CreateBotModal
- `/dashboard/bots/[botId]/settings` — edit bot name + fallback message
- Settings tab added to bot layout

### ✅ Phase 6 — Trigger Builder
- `frontend/lib/actions/triggers.ts` — `getTriggers`, `createTrigger`, `updateTrigger`, `deleteTrigger`
- `/dashboard/bots/[botId]/triggers` — list + create/edit modal
- TriggerModal: type selector (single/multi/any), tag keyword input, platform toggles, action type selector
- TriggerCard: badges, keywords, edit/delete, "Open Builder" link

### ✅ Phase 7 — Replier Builder
- `frontend/lib/actions/replier.ts` — `getReplier`, `saveReplier`
- `/dashboard/bots/[botId]/triggers/[triggerId]/replier`
- Message textarea + up to 3 quick-reply buttons (label + trigger link)
- Live phone preview (WA/IG skin) in `PhonePreview.tsx`

### ✅ Phase 8 — Form Builder
- `frontend/lib/actions/form.ts` — `getForm`, `saveForm`
- `/dashboard/bots/[botId]/triggers/[triggerId]/form`
- `QuestionCard.tsx`: question text, input type, validation, required toggle, multiple choice options, conditional logic, {Q1} token insertion
- `FormPreview.tsx`: per-question preview with progress bar, WA/IG skin, question navigation

### ✅ Phase 9 — Query Builder
- `frontend/lib/actions/query.ts` — `getQueryBuilder`, `saveQueryBuilder`
- `/dashboard/bots/[botId]/triggers/[triggerId]/query`
- `QueryBuilderUI.tsx`: collapsible categories, questions with answer textarea, reorder/delete
- `QueryPreview.tsx`: fully interactive 3-stage preview (categories → questions → answer)

### ✅ Phase 10 — Shared Phone Mockup Component
- `frontend/components/ui/PhoneMockup.tsx` — shared chrome (toggle, frame, status bar, WA/IG header, input bar)
- Render prop `children: (isWA: boolean) => ReactNode` for chat content
- Replaced `PhonePreview.tsx`, `FormPreview.tsx`, `QueryPreview.tsx` with shared component

### ✅ Phase 11 — Test Mode
- `frontend/app/(dashboard)/dashboard/bots/[botId]/test/page.tsx` — server component loads full bot config
- `test/_components/TestMode.tsx` — interactive in-browser simulator
- Trigger matching (single/multi/any), replier buttons, form flow (validation + conditionals + tokens), query 3-stage FAQ
- "Test" tab added to bot layout

### ✅ Phase 12 — Express Webhook Engine
- `backend/src/config/env.js` — simplified (Supabase only)
- `backend/src/services/supabase.js` — admin client
- `backend/src/services/tenantResolver.js` — resolves Phone Number ID / Page ID → full bot config, 60s cache
- `backend/src/services/sessionManager.js` — in-memory sessions, warning + expiry timers
- `backend/src/services/messageSender.js` — WA (buttons/list/text fallback) + IG (quick_replies/text fallback)
- `backend/src/services/messageHandler.js` — shared routing: form / query / idle / resubmit confirm modes
- `backend/src/routes/webhook.js` — Instagram multi-tenant webhook
- `backend/src/routes/whatsapp.webhook.js` — WhatsApp multi-tenant webhook

### ✅ Phase 13 — Action Executors
- `backend/src/services/actionExecutor.js` — replier, form (validate + conditionals + tokens + Supabase save), query (3-stage FAQ)
- Returning user detection: checks `form_responses` for existing submission → "Submit again?" confirm flow

---

### ✅ Phase 14 — Response Viewer & XLSX Export
- `frontend/lib/actions/responses.ts` — `getFormResponses` (paginated, 50/page), `getFormIdByTrigger`
- Route: `/dashboard/bots/[botId]/triggers/[triggerId]/form/responses`
- `ResponsesTable.tsx` — date, platform badge, status badge, per-question answers, pagination
- XLSX export via `GET /api/forms/[triggerId]/export` — header row = question texts, rows = answers
- "View Responses" button added to TriggerCard for form-type triggers

### ✅ Phase 15 — Analytics Dashboard
- `backend/src/services/analytics.js` — `track()` helper, fire-and-forget
- Instrumented: `trigger_fired` (messageHandler), `form_started` + `query_opened` + `form_completed` + `question_answered` (actionExecutor), `form_abandoned` + `question_abandoned` (session expiry callback in messageHandler)
- `frontend/lib/actions/analytics.ts` — `getAnalytics(botId, range, platform)` aggregates events in JS
- `/dashboard/bots/[botId]/analytics` — date range (7d/30d/all) + platform (all/WA/IG) filter bar (URL-driven)
- Stat cards: Trigger Fires, Forms Completed, Form Abandon Rate, Active Users (last 1h)
- Tables: Trigger Leaderboard, Form Performance (started/completed/rate), Question Drop-off (answered/abandoned/%)
- Analytics tab added to bot layout

### ✅ Phase 16 — Quick Wins
- **Bot Status Toggle** — `is_active` on `bots` table; Power button in `BotCard.tsx`; `toggleBotStatus` in `bots.ts`; `tenantResolver.js` returns null for inactive bots
- **Trigger Search + Filter** — `TriggerList.tsx`: search input + action-type filter buttons (client-side, no backend change)
- **Rate Limiting** — `messageHandler.js`: in-memory `rateLimitMap`, max 5 fires per trigger per sender per 60s
- **Answer Heatmap** — `analytics.ts`: `getAnswerDistribution(botId)`; analytics page: horizontal bar chart per multiple-choice question
- **DB migration required:** `ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;`
- `backend/src/services/analytics.js` — `track()` helper, fire-and-forget
- Instrumented: `trigger_fired` (messageHandler), `form_started` + `query_opened` + `form_completed` + `question_answered` (actionExecutor), `form_abandoned` + `question_abandoned` (session expiry callback in messageHandler)
- `frontend/lib/actions/analytics.ts` — `getAnalytics(botId, range, platform)` aggregates events in JS
- `/dashboard/bots/[botId]/analytics` — date range (7d/30d/all) + platform (all/WA/IG) filter bar (URL-driven)
- Stat cards: Trigger Fires, Forms Completed, Form Abandon Rate, Active Users (last 1h)
- Tables: Trigger Leaderboard, Form Performance (started/completed/rate), Question Drop-off (answered/abandoned/%)
- Analytics tab added to bot layout
