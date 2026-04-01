# MVP.md — Build Plan & Phases
asdasfasdasdasd
## MVP Feature Set

Everything listed below is in scope for this MVP build. Nothing is deferred.

### Design System
All UI must follow `design.xml` (Bauhaus). Key rules:
- Font: Outfit · Colors: `#F0F0F0` / `#121212` / `#D02020` / `#1040C0` / `#F0C020`
- Borders: `border-2`/`border-4` black · Radius: `rounded-none` or `rounded-full` only
- Shadows: hard offset `shadow-[4px_4px_0px_0px_#121212]` / `shadow-[8px_8px_0px_0px_#121212]`
- Reusable: `Button.tsx`, `Card.tsx`, `cn()` from `lib/utils.ts`

### Included
- Customer auth (signup / login)
- Multi-platform credentials per customer (WhatsApp + Instagram, independent)
- Platform-specific credential validation via Meta test API
- Multiple bots per customer
- Trigger system: single message, multiple messages, any message (catch-all)
- Per-trigger platform assignment (WA / IG / both)
- Fallback message (configurable)
- Replier action (message + quick-reply buttons)
- Form action (dynamic questions, validation, optional/required, multiple choice, conditional logic, reference previous answers, progress indicator)
- Query Builder action (categories → questions → answers)
- Configurable session expiry per bot
- Configurable session expiry warning (timing + message)
- Builder UI: form-based, live phone mockup preview, test mode
- View form responses + XLSX export
- Analytics dashboard (trigger counts, form drop-off, question abandon, active sessions)

### Excluded (Deferred)
- Drag and drop visual flow builder
- Welcome message
- Save & Resume sessions
- Tag / filter / search / notes on responses
- Email / webhook notifications on submission
- Templates

---

## Phase Breakdown

---

### Phase 1 — Project Setup & Foundation

**Goal:** Initialize both projects (Next.js frontend + Express backend), connect Supabase, establish folder structure.

**Tasks:**
1. Create Next.js project with TypeScript, Tailwind CSS, App Router
2. Refactor existing Express app — clean up hardcoded logic, prepare for multi-tenant
3. Create Supabase project — get URL, anon key, service role key
4. Setup `.env` files for both Next.js and Express with Supabase credentials
5. Install Supabase JS client in both projects (`@supabase/supabase-js`)
6. Setup shared folder structure:
   - Next.js: `app/`, `components/`, `lib/`, `hooks/`, `types/`
   - Express: `src/config/`, `src/routes/`, `src/services/`, `src/middleware/`, `src/utils/`
7. Setup TypeScript config for both projects
8. Verify Supabase connection from both frontend and backend
9. Setup ESLint + Prettier

**Skills:** `nextjs-app-router-patterns`, `supabase-automation`, `typescript-pro`, `tailwind-patterns`

**Deliverables:**
- Both projects boot without errors
- Supabase connection verified from both
- Clean folder structure in place

---

### Phase 2 — Database Schema Design

**Goal:** Design and apply the full Supabase PostgreSQL schema covering all entities.

**Tables to create:**

```
customers                  — managed by Supabase Auth (auth.users)
customer_profiles          — name, email linked to auth.users.id
bots                       — id, customer_id, name, platform (wa/ig/both), fallback_message
platform_configs           — id, bot_id, platform, phone_number_id, waba_id, page_id, access_token (vault ref), verify_token, session_expiry_ms, warning_time_ms, warning_message
triggers                   — id, bot_id, trigger_type (single/multi/any), platforms[], action_type (replier/form/query)
trigger_keywords           — id, trigger_id, keyword
replier_actions            — id, trigger_id, message_text
replier_buttons            — id, replier_id, button_label, links_to_trigger_id
forms                      — id, trigger_id, title
form_questions             — id, form_id, order_index, question_text, input_type (text/choice), validation_type, is_required, reference_question_id (nullable)
form_question_options      — id, question_id, option_label (for multiple choice)
form_conditions            — id, question_id, condition_question_id, condition_operator (eq/neq/contains), condition_value
query_builders             — id, trigger_id
query_categories           — id, query_builder_id, category_name, order_index
query_questions            — id, category_id, question_text, answer_text, order_index
form_responses             — id, form_id, sender_id, platform, started_at, completed_at, is_complete
form_response_answers      — id, response_id, question_id, answer_text
analytics_events           — id, bot_id, event_type, trigger_id, question_id, platform, sender_id, created_at
```

**Tasks:**
1. Write SQL migration files for all tables
2. Apply migrations in Supabase dashboard
3. Setup Row Level Security (RLS) policies — customers can only read/write their own bot data
4. Store API credentials using Supabase Vault (encrypted)
5. Create indexes on frequently queried columns (bot_id, sender_id, trigger_id)
6. Write TypeScript types matching all tables (`types/database.ts`)

**Skills:** `database-design`, `postgresql`, `supabase-automation`, `typescript-pro`

**Deliverables:**
- All tables created in Supabase
- RLS policies applied
- TypeScript types generated

---

### Phase 3 — Authentication

**Goal:** Customer signup, login, logout using Supabase Auth. Protected routes in Next.js. Auth middleware in Express.

**Tasks:**
1. Setup Supabase Auth in Next.js using `@supabase/ssr`
2. Create auth pages: `/login`, `/signup`
3. Create auth forms with validation (email, password)
4. Setup Supabase Auth middleware in Next.js (`middleware.ts`) — redirect unauthenticated users
5. Create `customer_profiles` row on signup (trigger or explicit insert)
6. Setup auth session in Express middleware — validate Supabase JWT on protected API routes
7. Create protected layout wrapper for dashboard pages
8. Logout functionality

**Skills:** `nextjs-app-router-patterns`, `supabase-automation`, `typescript-pro`

**Deliverables:**
- Customers can sign up and log in
- All dashboard routes are protected
- Express API validates Supabase JWT

---

### Phase 4 — Platform Credential Management

**Goal:** Customers can add, update, and validate their WhatsApp and/or Instagram API credentials per bot.

**Tasks:**
1. Create UI page: `/dashboard/bots/[botId]/platforms`
2. Build WhatsApp credential form:
   - Fields: Phone Number ID, WABA ID, Access Token, Webhook Verify Token
3. Build Instagram credential form:
   - Fields: Page ID, Access Token, Webhook Verify Token
4. On submit: make a test API call to Meta to validate credentials before saving
   - WhatsApp test: GET `https://graph.facebook.com/v18.0/{phone-number-id}` with access token
   - Instagram test: GET `https://graph.facebook.com/v18.0/{page-id}` with access token
5. Show success/failure feedback from validation
6. Store valid credentials in Supabase Vault (encrypted reference stored in `platform_configs`)
7. Allow updating/deleting credentials
8. Show which platforms are connected per bot (badge indicators)

**Skills:** `supabase-automation`, `whatsapp-automation`, `instagram-automation`, `api-security-best-practices`, `nextjs-app-router-patterns`

**Deliverables:**
- Customers can add WA + IG credentials independently
- Credentials validated before saving
- Stored securely in Vault

---

### Phase 5 — Bot Management & Session Config

**Goal:** Customers can create, name, and configure multiple bots. Each bot has session expiry and fallback message settings.

**Tasks:**
1. Create UI page: `/dashboard/bots` — list all bots
2. Create/edit bot modal:
   - Bot name
   - Fallback message text
3. Per-platform session config (inside platform config):
   - Session expiry duration (dropdown: 5m / 10m / 30m / 1hr / custom)
   - Warning time before expiry (e.g., "warn 2 minutes before")
   - Warning message text (e.g., "Your session will expire in 2 minutes. Please respond to continue.")
4. Delete bot (with confirmation)
5. Show bot list with platform connection status

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `supabase-automation`

**Deliverables:**
- Customers can manage multiple bots
- Session expiry fully configurable per bot per platform

---

### Phase 6 — Trigger Builder

**Goal:** Customers can create triggers with type, keywords, platform assignment, and link to an action type.

**Tasks:**
1. Create UI page: `/dashboard/bots/[botId]/triggers`
2. List all triggers for a bot
3. Create trigger form:
   - Trigger type selector: Single Message / Multiple Messages / Any Message
   - Keywords input (tag-input for multiple, single text for single)
   - Platform assignment: WhatsApp / Instagram / Both (checkbox)
   - Action type selector: Replier / Form / Query Builder
4. Edit trigger
5. Delete trigger (with warning if action is linked)
6. Show trigger list with type badge, platforms, and linked action type

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `supabase-automation`

**Deliverables:**
- Full trigger CRUD
- Triggers correctly associated with action type

---

### Phase 7 — Replier Builder

**Goal:** Customers can build a Replier action — a message with optional quick-reply buttons that link to other triggers.

**Tasks:**
1. Create Replier builder UI at `/dashboard/bots/[botId]/triggers/[triggerId]/replier`
2. Message text input (supports plain text)
3. Add quick-reply buttons:
   - Button label input
   - Link to trigger dropdown (shows all triggers for this bot)
4. Reorder buttons (up/down)
5. Delete buttons
6. Save replier config to Supabase (`replier_actions` + `replier_buttons`)
7. Live phone mockup preview (right side panel):
   - Shows WhatsApp or Instagram themed UI
   - Renders message bubble + quick-reply buttons in real time as customer types
   - Platform skin switches based on bot's platform config

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `tailwind-patterns`

**Deliverables:**
- Full replier builder with live preview
- Buttons correctly linked to triggers

---

### Phase 8 — Form Builder

**Goal:** Customers can build dynamic forms with questions, validation, optional/required, multiple choice, conditional logic, and previous answer references.

**Tasks:**
1. Create Form builder UI at `/dashboard/bots/[botId]/triggers/[triggerId]/form`
2. Add questions:
   - Question text input
   - Input type: Free Text or Multiple Choice
   - If Multiple Choice: add/remove options
   - Validation type selector: None / Email / Phone / Date / Name / Number
   - Required / Optional toggle
3. Reference previous answer in question text:
   - Insert token button: `{Q1}`, `{Q2}`, etc. inserted into question text
   - Preview resolves tokens to example values in live preview
4. Conditional logic per question:
   - "Show this question only if [Question X] [equals / does not equal / contains] [value]"
   - Multiple conditions per question (AND logic)
5. Reorder questions (up/down)
6. Delete questions
7. Save form config to Supabase
8. Live phone mockup preview:
   - Shows each question one by one as the bot would ask it
   - Renders multiple choice as quick-reply buttons
   - Shows progress indicator ("Question 2 of 5")

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `tailwind-patterns`, `typescript-pro`

**Deliverables:**
- Full form builder with all question types
- Conditional logic working
- Live preview showing correct form flow

---

### Phase 9 — Query Builder

**Goal:** Customers can build FAQ categories and Q&A pairs via the frontend.

**Tasks:**
1. Create Query Builder UI at `/dashboard/bots/[botId]/triggers/[triggerId]/query`
2. Add/edit/delete categories
3. Per category: add/edit/delete questions with answer text
4. Reorder categories and questions (up/down)
5. Save to Supabase (`query_categories` + `query_questions`)
6. Live phone mockup preview:
   - Shows category list as quick-reply buttons
   - On category select: shows question list as quick-reply buttons
   - On question select: shows answer + "Ask another question" / "Done" buttons

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `supabase-automation`

**Deliverables:**
- Full Query Builder with live preview

---

### Phase 10 — Live Phone Mockup Preview Component

**Goal:** Shared reusable phone mockup preview component used across Replier, Form, and Query builders.

**Tasks:**
1. Build `<PhoneMockup />` React component with:
   - Platform prop: `"whatsapp"` or `"instagram"` — changes header/theme/skin
   - Chat bubble rendering (bot message, user message)
   - Quick-reply button rendering
   - Progress indicator rendering
   - Scrollable message history
2. Build `<BotPreviewSimulator />` that takes the current builder state and renders the expected conversation
3. Integrate into Replier, Form, and Query builder pages (right-side sticky panel)
4. Auto-updates on any builder field change (reactive)

**Skills:** `react-best-practices`, `tailwind-patterns`, `typescript-pro`

**Deliverables:**
- Fully working live preview across all 3 builders

---

### Phase 11 — Test Mode

**Goal:** Customers can test their bot in a browser chat simulator before going live — no real Meta messages sent.

**Tasks:**
1. Create `/dashboard/bots/[botId]/test` page
2. Build `<TestChat />` component:
   - Chat input at bottom
   - Message bubbles (bot + user)
   - Quick-reply buttons clickable
   - Simulates full bot session including:
     - Trigger matching
     - Replier response
     - Form flow (with validation, conditional logic, progress)
     - Query flow
     - Session expiry warning + expiry
3. All logic runs client-side (reads bot config from Supabase, simulates in browser)
4. "Reset session" button to restart
5. Show which trigger/action matched (debug overlay toggle)

**Skills:** `react-best-practices`, `nextjs-app-router-patterns`, `typescript-pro`

**Deliverables:**
- Full in-browser bot test simulator
- All actions testable without Meta credentials

---

### Phase 12 — Express Webhook Engine (Core)

**Goal:** Refactor Express backend to be fully multi-tenant. Identify the correct customer and bot by incoming webhook credentials. Match triggers. Manage sessions.

**Tasks:**
1. Remove all hardcoded form/FAQ logic from existing routes
2. Build webhook router for WhatsApp:
   - GET `/webhook/whatsapp` — verify token check (looks up `platform_configs` by verify token)
   - POST `/webhook/whatsapp` — receive message, identify bot by Phone Number ID
3. Build webhook router for Instagram:
   - GET `/webhook/instagram` — verify token check
   - POST `/webhook/instagram` — receive message, identify bot by Page ID
4. Build `TenantResolver` service:
   - Takes incoming platform identifier (Phone Number ID or Page ID)
   - Queries Supabase for matching `platform_config` → gets `bot_id` and full bot config
5. Build `TriggerMatcher` service:
   - Takes incoming message text + bot's triggers
   - Matches against: single keyword, multiple keywords, any-message catch-all
   - Returns matched trigger or fallback
6. Build `SessionManager` service (replaces existing in-memory):
   - Uses Supabase for persistent session state (or Redis — default to Supabase for MVP)
   - Respects per-bot session expiry config
   - Fires warning message at configured warning time before expiry
   - Clears session on expiry
7. Build `MessageSender` service:
   - Retrieves customer's decrypted credentials from Supabase Vault
   - Sends WhatsApp messages via Meta Graph API
   - Sends Instagram messages via Meta Graph API
   - Handles text messages, quick-reply buttons

**Skills:** `nodejs-backend-patterns`, `whatsapp-automation`, `instagram-automation`, `supabase-automation`, `api-design-principles`

**Deliverables:**
- Multi-tenant webhook engine working
- Trigger matching working
- Session expiry + warning working
- Messages sent using customer's own credentials

---

### Phase 13 — Action Executors (Backend)

**Goal:** Implement the three action type executors that run when a trigger is matched.

**Tasks:**

#### Replier Executor
1. Load replier config from Supabase (message + buttons)
2. Send message with quick-reply buttons to user

#### Form Executor
1. Load form + questions from Supabase
2. Manage per-user form progress in session (current question index, collected answers)
3. On each message:
   - Validate answer against question's validation type
   - On failure: re-ask same question with error reason
   - On pass: evaluate conditional logic for next question (skip questions whose conditions aren't met)
   - Replace `{Q1}`, `{Q2}` tokens in question text with collected answers
   - Send next question (with options if multiple choice)
   - Show progress indicator: "Question X of Y"
4. On form complete:
   - Save `form_response` + `form_response_answers` to Supabase
   - Send completion message
5. On returning user (already has a completed response):
   - Detect via `form_responses` table
   - Ask "You already submitted. Want to submit again?" with Yes/No buttons

#### Query Executor
1. Load query builder config (categories + questions) from Supabase
2. Manage per-user query state in session (current category selected or not)
3. Send category list as quick-reply buttons
4. On category select: send question list as quick-reply buttons
5. On question select: send answer + "Ask another question" + "Done" buttons
6. On "Done": clear query state from session

**Skills:** `nodejs-backend-patterns`, `supabase-automation`, `typescript-pro`

**Deliverables:**
- All 3 action types fully functional end-to-end

---

### Phase 14 — Response Viewer & XLSX Export

**Goal:** Customers can view form submission responses and export to XLSX.

**Tasks:**
1. Create `/dashboard/bots/[botId]/forms/[formId]/responses` page
2. Show response table:
   - One row per submission
   - Columns: submission date, platform, each question answer
   - Show completion status (complete / incomplete)
3. Pagination (50 per page)
4. XLSX export button:
   - Generates and downloads `.xlsx` file
   - One sheet per form
   - Header row = question texts
   - Data rows = answers per submission
5. Use `xlsx` / `exceljs` library for file generation

**Skills:** `nextjs-app-router-patterns`, `supabase-automation`, `xlsx`, `react-best-practices`

**Deliverables:**
- Response viewer showing all submissions
- Working XLSX export

---

### Phase 15 — Analytics Dashboard

**Goal:** Show bot-level analytics — trigger usage, form completion rates, question drop-off, active sessions.

**Tasks:**
1. Instrument analytics events in Phase 13 executors:
   - `trigger_fired` — trigger matched, record trigger_id, platform, sender_id
   - `form_started` — form executor began
   - `form_completed` — form fully submitted
   - `form_abandoned` — session expired mid-form
   - `question_answered` — per question answer recorded
   - `question_abandoned` — session expired on this question
   - `query_opened` — query executor began
2. Create `/dashboard/bots/[botId]/analytics` page
3. Build analytics components:
   - **Trigger Counts** — bar chart: triggers vs usage count
   - **Form Completion Rate** — donut chart: completed vs abandoned per form
   - **Question Drop-off** — bar chart: which question most users abandon at
   - **Active Sessions** — live count (poll every 30s from Supabase sessions table)
4. Date range filter (last 7 days / 30 days / all time)
5. Per-platform filter (WA / IG / both)

**Skills:** `analytics-tracking`, `react-best-practices`, `nextjs-app-router-patterns`, `supabase-automation`

**Deliverables:**
- Analytics dashboard with all 4 metric types
- Live active sessions counter
- Date + platform filters working

---

### ✅ Phase 16 — Quick Wins

**Goal:** High-visibility improvements with zero new DB tables and minimal risk. Each change is isolated to a single layer (frontend or backend).

**Tasks:**

#### Bot Status Toggle
1. Add `is_active boolean DEFAULT true` column to `bots` table
2. Add toggle UI to bot card on `/dashboard/bots` (and bot settings page)
3. In `backend/src/services/tenantResolver.js` — skip bots where `is_active = false`, return null so webhook sends no reply
4. Update `frontend/lib/actions/bots.ts` — add `toggleBotStatus(botId, isActive)`

#### Trigger Search + Filter
1. Add search input + action-type filter dropdown to `/dashboard/bots/[botId]/triggers`
2. Client-side filtering only — filter triggers array by keyword match on trigger name/keywords and action_type
3. No backend changes required

#### Per-Trigger Rate Limiting
1. In `backend/src/services/messageHandler.js` — maintain an in-memory `Map<triggerId_senderId, { count, windowStart }>`
2. Per-trigger config: max hits (default 5) per window (default 60s) — hardcoded for MVP, configurable later
3. If over limit: send a configurable throttle message ("You've sent too many messages. Please wait a moment.") and skip action execution
4. Reset count after window expires

#### Response Heatmap (Analytics)
1. In `/dashboard/bots/[botId]/analytics` — add a new "Answer Distribution" section below the existing tables
2. For each multiple-choice form question, fetch `form_response_answers` grouped by `answer_text`
3. Render as a horizontal bar chart per question (tallest bar = most chosen option)
4. Uses existing data — no new events or tables needed

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `nodejs-backend-patterns`, `supabase-automation`

**Deliverables:**
- Bots can be toggled on/off without deletion
- Trigger list is searchable and filterable
- Rate limiting prevents abuse per sender per trigger
- Multiple-choice answer distribution visible in analytics

---

### Phase 17 — Builder UX

**Goal:** Improve the day-to-day experience of building and testing bot configs. All changes are frontend-only — no DB migrations required.

**Tasks:**

#### Auto-Save / Draft State
1. In each builder page (replier, form, query) — add a debounced auto-save (1.5s after last change)
2. Show a status indicator in the page header: "Saving..." → "Saved X seconds ago" → "Unsaved changes"
3. On navigation-away (Next.js `beforeunload` + router events) — warn if there are unsaved changes
4. Track dirty state via a `useUnsavedChanges` hook shared across all 3 builders

#### Form Preview Navigation
1. In `FormPreview.tsx` — replace the static question-step display with an interactive simulator
2. Add a simulated answer input at the bottom of the preview phone mockup
3. When user types an answer and hits enter, advance to the next question (applying conditional logic)
4. Show the full conversation history scrolled in the preview (question + simulated answer bubbles)
5. Add a "Reset Preview" button to restart from Q1
6. Conditional logic branches become visually testable without using Test Mode

#### Trigger Flow Map
1. Add a new "Flow Map" tab to the bot layout (alongside Triggers, Analytics, etc.)
2. Route: `/dashboard/bots/[botId]/flow`
3. Fetch all triggers + replier buttons with their `links_to_trigger_id` references
4. Render a read-only node graph using SVG (no external lib required for MVP):
   - Each trigger = a rectangular node (color-coded by action type)
   - Replier button connections = directed arrows between nodes
   - Any-message catch-all shown as a special node
5. Clicking a node navigates to that trigger's builder page

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `tailwind-patterns`, `typescript-pro`

**Deliverables:**
- All 3 builders auto-save with status feedback
- Form preview is fully interactive (testable conditional branches)
- Bot flow structure visible as a node graph

---

### Phase 18 — Contact Intelligence

**Goal:** Build a contact layer so customers can see who has interacted with their bot, understand user journeys, and enforce business hour rules.

**New DB Tables:**
```
contacts              — id, bot_id, sender_id, platform, first_seen_at, last_seen_at, message_count
business_hours        — id, bot_id, timezone, mon–sun start/end times (nullable = closed), outside_hours_message
```

**Tasks:**

#### Contact List
1. Add `contacts` table migration
2. In `backend/src/services/messageHandler.js` — upsert contact on every incoming message (sender_id + platform + bot_id): increment `message_count`, update `last_seen_at`
3. Frontend page: `/dashboard/bots/[botId]/contacts`
4. Table: sender ID, platform badge, first seen, last seen, message count — sortable columns
5. Add "Contacts" tab to bot layout

#### Business Hours Config
1. Add `business_hours` table migration
2. Frontend: Add "Business Hours" section to bot settings page (`/dashboard/bots/[botId]/settings`)
3. UI: timezone dropdown + per-day toggle with start/end time pickers + outside-hours message textarea
4. In `backend/src/services/messageHandler.js` — before processing any message, check business hours for the bot's config; if outside hours, send `outside_hours_message` and skip all trigger/action logic

#### Conversion Funnel (Analytics)
1. In `/dashboard/bots/[botId]/analytics` — add a "Conversion Funnel" section
2. Per form trigger: aggregate `trigger_fired` → `form_started` → `form_completed` counts from `analytics_events`
3. Render as a vertical funnel chart (3 bars, each narrower): Triggered → Started → Completed
4. Show drop-off % between each stage

#### Per-Sender Journey View
1. In the contacts page, clicking a contact opens a slide-over panel
2. Panel shows chronological event log for that sender: trigger fired, form started, question answered (which question), form completed/abandoned — pulled from `analytics_events` filtered by `sender_id`
3. If they completed a form, show a "View Response" link directly to their submission

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `supabase-automation`, `nodejs-backend-patterns`

**Deliverables:**
- Contact list auto-populates from real interactions
- Business hours enforced per bot with custom offline message
- Conversion funnel visible per form in analytics
- Full per-sender event journey accessible from contacts page

---

### Phase 19 — Platform Growth

**Goal:** Features that scale the platform — helping customers onboard faster and manage larger bot configs efficiently.

**Tasks:**

#### Duplicate Trigger
1. Add "Duplicate" option to `TriggerCard` kebab menu
2. Server action `duplicateTrigger(triggerId)` in `frontend/lib/actions/triggers.ts`:
   - Copy `triggers` row (new id, same bot_id, append " (Copy)" to name)
   - Copy `trigger_keywords` rows (new trigger_id)
   - Copy linked action: replier (`replier_actions` + `replier_buttons`), form (`forms` + `form_questions` + `form_question_options` + `form_conditions`), or query (`query_builders` + `query_categories` + `query_questions`)
3. Newly created duplicate appears at top of trigger list

#### Duplicate Bot
1. Add "Duplicate Bot" option to bot card on `/dashboard/bots`
2. Server action `duplicateBot(botId)` in `frontend/lib/actions/bots.ts`:
   - Copy `bots` row (new id, append " (Copy)" to name)
   - Do NOT copy `platform_configs` (credentials are unique per deployment)
   - Copy all triggers + all their actions (reuse duplicate trigger logic above)
3. New bot appears in bot grid with a banner: "Platform credentials not configured"

#### Onboarding Wizard
1. Add `onboarding_completed boolean DEFAULT false` to `customer_profiles`
2. After first login (or when `onboarding_completed = false`), redirect to `/dashboard/onboarding`
3. 3-step wizard:
   - **Step 1 — Create your first bot:** bot name + fallback message (inline form)
   - **Step 2 — Connect a platform:** WhatsApp or Instagram credential form (reuse existing `PlatformForm` components)
   - **Step 3 — Create your first trigger:** simplified trigger form (type + keyword + action type)
4. On completion: set `onboarding_completed = true`, redirect to the new bot's triggers page
5. Add "Skip for now" at each step that still marks onboarding complete

**Skills:** `nextjs-app-router-patterns`, `react-best-practices`, `supabase-automation`, `typescript-pro`

**Deliverables:**
- Any trigger (with full action config) duplicatable in one click
- Any bot duplicatable (triggers + actions, no credentials)
- First-time users guided through setup in 3 steps

---

## Phase Summary

| Phase | Name | Key Output |
|---|---|---|
| 1 | Project Setup | Both projects running, Supabase connected |
| 2 | Database Schema | All tables, RLS, TypeScript types |
| 3 | Authentication | Login/signup, protected routes |
| 4 | Platform Credentials | WA + IG credentials stored + validated |
| 5 | Bot Management | Multi-bot, session config, fallback message |
| 6 | Trigger Builder | Full trigger CRUD |
| 7 | Replier Builder | Replier + live preview |
| 8 | Form Builder | Full form builder + live preview |
| 9 | Query Builder | FAQ builder + live preview |
| 10 | Phone Mockup Component | Shared preview component |
| 11 | Test Mode | In-browser bot simulator |
| 12 | Webhook Engine | Multi-tenant webhook + session management |
| 13 | Action Executors | Replier/Form/Query working end-to-end |
| 14 | Response Viewer | View responses + XLSX export |
| 15 | Analytics | Dashboard with all metrics |
| 16 | Quick Wins | Bot toggle, trigger search, rate limiting, answer heatmap |
| 17 | Builder UX | Auto-save, interactive form preview, trigger flow map |
| 18 | Contact Intelligence | Contact list, business hours, conversion funnel, journey view |
| 19 | Platform Growth | Duplicate trigger/bot, onboarding wizard |
