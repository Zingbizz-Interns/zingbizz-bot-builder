# doc-1.md — Full Discussion Record

## 1. Current System (Existing Codebase)

**Stack:** Node.js + Express, no database (CSV file storage), no frontend.
**Channels:** WhatsApp and Instagram — both sharing the same core services.
**Entry:** `src/server.js` → routes: `src/routes/webhook.js`, `src/routes/whatsapp.webhook.js`

### Feature 1: Form Builder (Hardcoded Admissions Form)
- Fixed steps: Student Name → Grade → Parent Name → Contact → Email → DOB → Previous School → Special Requirements
- Each step has validation (email, phone, date, name format)
- On validation failure: same question re-asked with reason
- On completion: saved to `data/admissions.csv` / `data/instagram_admissions.csv`
- Duplicate check: if user already submitted, asks if they want to create a new entry

### Feature 2: Query Builder (Hardcoded FAQ)
- Categories (genres) → Questions per category → Pre-written answers
- "Ask another question" + "Situation Solved" buttons at the end

### Session
- In-memory session store (`src/services/form.service.js`)
- Hardcoded 1-minute timeout (meant to be 10 min in production)
- On timeout: session cleared, user notified

### Services
- `form.service.js` — session management, step tracking
- `faq.service.js` — FAQ lookup
- `faq.data.js` — hardcoded FAQ data
- `form.validation.js` — validation logic
- `csv.storage.js` / `instagram.csv.storage.js` — CSV read/write
- `whatsapp.service.js` / `instagram.service.js` — Meta API calls

---

## 2. New System Requirements (From Discussion)

### Goal
Build a **frontend-configurable, multi-tenant chatbot builder** that allows customers to create and manage WhatsApp and/or Instagram bots through a UI — without any hardcoding.

---

### Multi-Tenant & Platform

- Each customer has their own account
- A customer can have **both** WhatsApp and Instagram bots under one account
- Each platform has its own independent credentials, webhook config, and session settings
- Credentials validated against Meta API before saving (test API call)

**WhatsApp credentials required:**
- Phone Number ID
- WhatsApp Business Account ID (WABA ID)
- Access Token
- Webhook Verify Token

**Instagram credentials required:**
- Instagram Page ID (or connected FB Page ID)
- Access Token
- Webhook Verify Token

---

### Trigger System

3 types of trigger matching:
- **Single message** — one specific keyword (e.g., `"admission"`)
- **Multiple messages** — array of keywords that all fire the same action (e.g., `["apply", "application"]`)
- **Any message** — catch-all for anything not matching existing triggers

Each trigger has a `platforms` field:
- `["whatsapp"]` — fires on WhatsApp only
- `["instagram"]` — fires on Instagram only
- `["whatsapp", "instagram"]` — fires on both

Special triggers:
- **Fallback message** — customer-defined message when no trigger matches

---

### 3 Action Types

#### 1. Replier
- Send a custom message with quick-reply buttons
- Each button links to another trigger (triggering its action)
- Fully built via frontend

#### 2. Form
- Dynamic questions defined by customer via frontend
- Each question has:
  - **Validation type**: email, phone, date, name, free text, etc.
  - **Required or Optional**
  - **Multiple choice** (predefined options) or free text
  - **Conditional logic**: show this question only if a previous question's answer matches a condition
  - **Reference previous answer** in question text (e.g., "What is {Q1}'s phone number?")
- **Progress indicator** shown to end user: "Question 3 of 7"
- On completion: response saved to Supabase DB
- Customer can view responses and export as XLSX

#### 3. Query Builder
- Customer defines categories, questions per category, and pre-written answers
- Same UX as existing system but fully built via frontend (not hardcoded)

---

### Session Configuration (Per Bot)
- **Session expiry duration** — configurable (e.g., 10 mins, 30 mins, 1 hour)
- **Warning time** — how long before expiry to warn (e.g., 2 mins before)
- **Warning message text** — fully customizable text shown to user before expiry

---

### Builder UI Features
- Form-based builder (no drag and drop)
- **Live phone mockup preview** — WhatsApp/Instagram themed, updates in real time as customer builds
- **Test Mode** — in-browser chat simulator, no real Meta messages sent

---

### Response Management
- View all submitted form responses per form
- XLSX export

---

### Analytics Dashboard
- Users triggered per action (counts)
- Form completion rate vs drop-off rate
- Which question users abandon at (per question drop-off)
- Active sessions count (live)

---

## 3. Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS | Full-stack capable, great DX |
| Bot Backend | Node.js + Express (existing, expanded) | Already exists, keeps webhook handling separate |
| Database | Supabase (PostgreSQL) | Managed, includes Auth, RLS, Vault for secrets |
| Auth | Supabase Auth | Replaces manual JWT/bcrypt |
| Credential storage | Supabase Vault (encrypted) | Secure secret storage |
| ORM/DB client | Supabase JS client | Works with Supabase natively |
| Bot builder UI | Form-based (no drag and drop) | Simpler to build and use |
| Templates | Removed from scope | Not needed for MVP |
| Save & Resume sessions | Removed from scope | Deferred |
| Welcome message | Removed from scope | Deferred |
| Tag/filter/notes/notifications | Removed from scope | Deferred |
| Drag and drop flow builder | Removed from scope | Deferred |

---

## 4. Final Tech Stack

```
Customer Browser
  └── Next.js (App Router) + Tailwind CSS
        ├── Supabase JS client (DB reads/writes for builder)
        └── Calls Express API for bot-specific ops

Meta Webhook (WhatsApp / Instagram)
  └── Express Backend (Node.js)
        ├── Identifies customer by incoming platform credentials
        ├── Loads bot config from Supabase
        ├── Matches trigger
        ├── Executes action (Replier / Form / Query)
        └── Uses customer's stored credentials to send reply

Supabase
  ├── PostgreSQL (all data)
  ├── Auth (customer login)
  ├── Vault (encrypted API credentials)
  └── Row Level Security (customers see only their own data)
```
