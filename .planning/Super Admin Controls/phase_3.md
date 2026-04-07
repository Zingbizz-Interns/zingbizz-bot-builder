# Phase 3: Runtime Enforcement Engine

## Objective
Enforce limits and feature flags where behavior actually happens: message routing, form completion, trigger creation, and export APIs. UI-only enforcement is not sufficient.

---

## Dependencies
- Phase 1 for super-admin security model
- Phase 2 for control tables and platform request schema

---

## Subtasks

### 3.1 — Block trigger execution when account is over quota or disabled
**Primary file:** `backend/src/services/messageHandler.js`

**Purpose:** When a customer exceeds the allowed form submission cap or is manually disabled by super admin, the bot must stop processing triggers.

**Recommended behavior:**
- resolve customer control state before trigger matching
- if automation is disabled or the cap has already been reached:
  - do not execute triggers
  - optionally send a maintenance / limit-reached message
  - log the block event for observability

**Important:**
The block should happen before:
- trigger ID routing
- keyword matching
- catch-all fallback execution

---

### 3.2 — Enforce max stored form submissions
**Primary file:** `backend/src/services/actionExecutor.js`

**Purpose:** `form_responses` is the persisted source of truth, so the limit must be enforced before new completed submissions are stored.

**Recommended behavior:**
- on form start: optionally pre-check whether starting is allowed
- on form completion: count completed submissions for the customer
- if count has reached `max_form_submissions`, do not insert a new completed response
- return the user to idle state cleanly with a clear message

**Why double-check here:**
Even if routing blocks most flows, this prevents edge cases from sneaking a write through.

---

### 3.3 — Enforce per-bot trigger creation limit
**Primary file:** `frontend/lib/actions/triggers.ts`

**Purpose:** Before inserting a trigger, compare current trigger count against that bot’s configured limit.

**Recommended behavior:**
- count existing triggers for the target bot
- if `trigger_limit` is null, allow creation
- if `trigger_limit` is set and count >= limit, reject creation with a structured error
- editing an existing trigger must remain allowed

**Error contract:**
Return a user-friendly error string that the UI can surface as a toast or inline banner.

---

### 3.4 — Enforce Excel export feature flag
**Primary files:**
- `frontend/app/api/forms/[triggerId]/export/route.ts`
- form responses UI

**Purpose:** Export disablement must be enforced server-side, not only hidden from the button.

**Required behavior:**
- export route checks the owning customer’s `excel_export_enabled`
- if disabled, route returns `403`
- frontend button must be hidden or disabled to match the backend state

---

## Execution Plan (Step-by-Step)

1. Create a shared runtime helper that resolves customer controls from a bot or customer context
2. Wire the helper into `messageHandler.js` before trigger routing begins
3. Add a final write-time safety check inside `actionExecutor.js` before form submission insert
4. Update `createTrigger()` to enforce the per-bot trigger limit before insert
5. Update the XLSX export route to check customer export permissions before generating the workbook
6. Return stable, user-facing error messages for each blocked state
7. Add logging for blocked automation events and rejected exports

---

## Validation Criteria
- [ ] When a customer is over the max form submission limit, no triggers execute
- [ ] When a customer is manually disabled, no triggers execute even if quota is available
- [ ] Completed form submissions never exceed the configured cap
- [ ] Creating a trigger beyond the per-bot limit is rejected consistently
- [ ] Editing an existing trigger remains possible when the limit is already reached
- [ ] Export route returns `403` when Excel export is disabled
- [ ] UI and backend behavior match for every blocked scenario
