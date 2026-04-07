# Super Admin Controls — Implementation Status

> **Rule:** Update this file BEFORE starting any task (→ `IN_PROGRESS`) and AFTER completing it (→ `COMPLETED`).
> A phase cannot be marked `COMPLETED` unless ALL its subtasks are `COMPLETED` and ALL validation criteria in that phase file are satisfied.
> Future agents must rely ONLY on the files in `.planning/Super Admin Controls/` to continue this work.

---

## Summary

| Phase | Title | Status | Completion |
|-------|-------|--------|------------|
| Phase 1 | Super Admin Foundation | IN_PROGRESS | 2 / 4 subtasks |
| Phase 2 | Limits, Flags, and Approval Data Model | IN_PROGRESS | 1 / 4 subtasks |
| Phase 3 | Runtime Enforcement Engine | IN_PROGRESS | 4 / 4 subtasks |
| Phase 4 | Super Admin Dashboard | IN_PROGRESS | 4 / 4 subtasks |
| Phase 5 | Customer-Facing Guardrails | IN_PROGRESS | 4 / 4 subtasks |
| Phase 6 | Approval Activation, QA, and Rollout | IN_PROGRESS | 3 / 4 subtasks |

**Overall:** 18 / 24 subtasks completed

---

## Phase 1 — Super Admin Foundation

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 1.1 | Create global super-admin role model | IN_PROGRESS | Migration ready in `database/migrations/006_super_admin_foundation.sql` — must be run and seeded with at least one app admin |
| 1.2 | Add backend + frontend access helpers | COMPLETED | Added `frontend/lib/superAdmin.ts`, `frontend/lib/actions/superAdmin.ts`, and `backend/src/middleware/requireSuperAdmin.js` |
| 1.3 | Create protected super-admin route group | COMPLETED | Added `/dashboard/super-admin` page + protected layout and sidebar link |
| 1.4 | Add audit trail baseline for super-admin actions | IN_PROGRESS | Audit schema + test write action implemented; requires migration run before validation |

**Phase 1 Status:** IN_PROGRESS
**Validation:** See `phase_1.md`
**⚠️ Action required:** Run `database/migrations/006_super_admin_foundation.sql` in Supabase SQL Editor, then insert the first `app_admins` row before validating access and audit-log writes

---

## Phase 2 — Limits, Flags, and Approval Data Model

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 2.1 | Create customer-level control record | IN_PROGRESS | Migration ready in `database/migrations/007_super_admin_controls_model.sql` — includes backfill into `customer_account_controls` |
| 2.2 | Create bot-level limit fields | IN_PROGRESS | Migration ready in `database/migrations/007_super_admin_controls_model.sql` — adds `trigger_limit` + `trigger_limit_enforced` to `bots` |
| 2.3 | Create platform connection request workflow tables/fields | IN_PROGRESS | Migration ready in `database/migrations/007_super_admin_controls_model.sql` — creates `platform_connection_requests` with indexes and owner read/create policies |
| 2.4 | Add admin data loaders and mutators for new controls | COMPLETED | Expanded `frontend/lib/actions/superAdmin.ts` with customer summaries/details, control saves, bot trigger limit saves, request listing, and request status updates |

**Phase 2 Status:** IN_PROGRESS
**Validation:** See `phase_2.md`
**⚠️ Action required:** Run `database/migrations/007_super_admin_controls_model.sql` in Supabase SQL Editor before validating customer controls, bot trigger limits, and platform request records

---

## Phase 3 — Runtime Enforcement Engine

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 3.1 | Block trigger execution when account is over quota or disabled | COMPLETED | Added shared runtime gate in `backend/src/services/customerAccountControls.js` and wired it into `backend/src/services/messageHandler.js` before trigger routing |
| 3.2 | Enforce max stored form submissions | COMPLETED | Added write-time guard in `backend/src/services/actionExecutor.js` so completed submissions are rejected once automation is disabled or the cap is reached |
| 3.3 | Enforce per-bot trigger creation limit | COMPLETED | Added pre-insert trigger limit enforcement and user-facing error string in `frontend/lib/actions/triggers.ts` |
| 3.4 | Enforce Excel export feature flag | COMPLETED | Added server-side export gating in `frontend/app/api/forms/[triggerId]/export/route.ts` and matching disabled state in the responses UI |

**Phase 3 Status:** IN_PROGRESS
**Validation:** See `phase_3.md`
**⚠️ Action required:** Run `database/migrations/007_super_admin_controls_model.sql` in Supabase SQL Editor if not already applied, then validate the blocked automation, form cap, trigger limit, and export-disabled flows end to end

---

## Phase 4 — Super Admin Dashboard

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 4.1 | Build customer account list page | COMPLETED | Added `/dashboard/super-admin/customers` with summary cards, local filters, status pills, and direct links into per-customer controls |
| 4.2 | Build customer detail controls page | COMPLETED | Added `/dashboard/super-admin/customers/[customerId]` with account controls, usage summary, per-bot trigger limits, and related request history |
| 4.3 | Build platform approval queue | COMPLETED | Added `/dashboard/super-admin/platform-approvals` with search, status filtering, requester metadata, and request payload review |
| 4.4 | Build approve/reject action flows with audit notes | COMPLETED | Approval queue now captures review notes, updates status via server actions, and revalidates dashboard, queue, and customer detail routes |

**Phase 4 Status:** IN_PROGRESS
**Validation:** See `phase_4.md`
**⚠️ Action required:** Run both super-admin migrations in Supabase if needed, then validate dashboard access as a real super admin plus approve/reject flows and customer control persistence in the browser

---

## Phase 5 — Customer-Facing Guardrails

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 5.1 | Show trigger-limit feedback in bot builder UI | COMPLETED | Trigger creation now returns limit-aware copy with current count/limit, super-admin ownership of the cap, and a reminder that existing triggers remain editable |
| 5.2 | Show blocked / over-quota automation state to owners | COMPLETED | Added a persistent automation banner to the shared bot layout, backed by `frontend/lib/botGuardrails.ts`, so paused or over-quota accounts are clearly explained on bot pages |
| 5.3 | Show platform request pending/approved/rejected states | COMPLETED | Added shared platform request status UI plus request-aware header badges on the WhatsApp and Instagram setup cards |
| 5.4 | Hide or disable export actions when feature is off | COMPLETED | Export button remains disabled and now explicitly tells owners that XLSX export is controlled by their super admin in both the page UI and API response |

**Phase 5 Status:** IN_PROGRESS
**Validation:** See `phase_5.md`
**⚠️ Action required:** Run the super-admin migrations if they are not applied yet, seed realistic request/control data, and validate the blocked automation banner, request-state rendering, trigger-cap messaging, and export-disabled wording in the browser

---

## Phase 6 — Approval Activation, QA, and Rollout

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 6.1 | Safely activate approved platform requests | COMPLETED | Manual platform saves and Instagram OAuth now create approval requests first, and super-admin approval promotes the stored payload into `platform_configs` with one active row per bot/platform |
| 6.2 | Invalidate cache and revalidate affected pages | COMPLETED | Approval/save flows now revalidate owner + admin pages, and `tenantResolver` cache entries self-refresh when the active platform config row changes |
| 6.3 | Execute end-to-end QA matrix | NOT_STARTED | Covers owner, sub-account, super-admin, WA, IG, limits, exports |
| 6.4 | Prepare rollout, backfill, and rollback steps | COMPLETED | Added `.planning/Super Admin Controls/rollout_runbook.md` with migration order, safe defaults, initial admin seed SQL, backfill verification, rollout steps, and rollback playbooks |

**Phase 6 Status:** IN_PROGRESS
**Validation:** See `phase_6.md`
**⚠️ Action required:** Run the super-admin migrations if needed, then execute the Phase 6 QA matrix and prepare rollout / rollback notes before marking the phase complete

---

## Change Log

| Date | Change | Agent/Person |
|------|--------|--------------|
| 2026-04-07 | Initial super-admin planning module created with 6 phases and central status tracker. | Codex |
| 2026-04-07 | Phase 1 foundation code added: migration file, super-admin helpers, protected dashboard route, sidebar entry, and audit-log test action. Awaiting SQL run + first app admin seed. | Codex |
| 2026-04-07 | Phase 2 data-model code added: customer controls, bot trigger-limit fields, platform connection request migration, and shared super-admin loaders/mutators. Awaiting SQL run. | Codex |
| 2026-04-07 | Phase 3 enforcement code added: runtime automation gate, form submission cap guard, trigger creation limit enforcement, and server-side Excel export gating with matching UI state. Awaiting migration-backed QA. | Codex |
| 2026-04-07 | Phase 4 dashboard code added: customer list and detail pages, platform approval queue, shared super-admin navigation, and review-note approval actions. Awaiting browser-level QA with seeded data. | Codex |
| 2026-04-07 | Phase 5 customer guardrails added: persistent bot automation banner, request-aware platform status cards, clearer trigger-limit messaging, and super-admin wording for disabled Excel export. Awaiting end-to-end browser QA. | Codex |
| 2026-04-07 | Phase 6 activation code added: platform submissions now create approval requests, super-admin approvals promote request payloads into runtime config, and `tenantResolver` cache now refreshes when active config rows change. QA matrix and rollout notes still pending. | Codex |
| 2026-04-07 | Added rollout runbook for super-admin controls covering migration order, safe defaults, backfill checks, initial admin seed, smoke checks, and rollback options. | Codex |

---

## Key Implementation Targets

| Area | Current File(s) | Why It Matters |
|------|------------------|----------------|
| Runtime bot resolution | `backend/src/services/tenantResolver.js` | Only approved/active platform configs should resolve at runtime |
| Message routing | `backend/src/services/messageHandler.js` | Central point to stop all trigger execution when account is blocked or over quota |
| Form completion persistence | `backend/src/services/actionExecutor.js` | Best place to enforce max stored form submissions as a final safety check |
| Trigger creation | `frontend/lib/actions/triggers.ts` | Per-bot trigger limit must be enforced before insert |
| Platform save flows | `frontend/lib/actions/platforms.ts`, `frontend/app/api/instagram/callback/route.ts` | Current flows save immediately; approval workflow must intercept both |
| Export route | `frontend/app/api/forms/[triggerId]/export/route.ts` | Excel export enable/disable must be enforced server-side |
| Permissions model | `database/migrations/004_sub_accounts.sql`, `database/migrations/005_sub_account_read_policies.sql` | Existing roles cover owners/sub-accounts, but not site-wide super admins |
