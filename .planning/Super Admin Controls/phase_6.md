# Phase 6: Approval Activation, QA, and Rollout

## Objective
Safely activate approved platform requests, verify all enforcement paths end to end, and document rollout / rollback steps for production.

---

## Dependencies
- Phases 1 through 5 must be complete.

---

## Subtasks

### 6.1 — Safely activate approved platform requests
**Purpose:** Approval must transition a request into an actual runtime-usable platform config without leaving stale or partially active state behind.

**Recommended behavior:**
- on approval, write approved credentials/config into `platform_configs`
- mark request as `approved`
- ensure only one active config exists per `bot_id + platform`
- preserve rejected/pending history separately in request records

**Special care:**
Instagram OAuth currently auto-saves in the callback route, so this flow must be refactored to save a request instead.

---

### 6.2 — Invalidate cache and revalidate affected pages
**Purpose:** Approved platform changes and control updates must apply promptly.

**Known hotspot:**
- `backend/src/services/tenantResolver.js` caches bot config for 60 seconds

**Required work:**
- invalidate or bypass stale cache when platform approval state changes
- revalidate relevant dashboard pages after admin save/approval actions

---

### 6.3 — Execute end-to-end QA matrix
**Purpose:** This feature spans auth, schema, runtime behavior, exports, and platform connection flows. It needs structured QA.

**Minimum QA matrix:**
- super-admin access allowed / denied checks
- owner and sub-account cannot access admin area
- form submission cap reached
- manual automation disable enabled
- trigger limit reached on a bot
- export disabled
- WhatsApp request pending / approved / rejected
- Instagram request pending / approved / rejected
- approved platform becomes runtime-active
- rejected platform never becomes runtime-active

---

### 6.4 — Prepare rollout, backfill, and rollback steps
**Purpose:** This is production-sensitive. Existing customers need sane defaults and a recovery path.

**Required rollout notes:**
- default values for all existing customers and bots
- initial super-admin seed procedure
- backfill strategy for `customer_account_controls`
- rollback strategy if approval workflow blocks valid platforms unexpectedly
- communication plan for internal operators

---

## Execution Plan (Step-by-Step)

1. Refactor platform save flows so they create requests instead of activating immediately
2. Implement approval promotion into `platform_configs`
3. Invalidate runtime cache after approval, rejection, or control changes
4. Run the full QA matrix across local and deployed environments
5. Document seed, migration, backfill, and rollback steps
6. Only after QA passes, mark the phase complete in `status.md`

---

## Validation Criteria
- [ ] Approving a request results in exactly one active runtime config for that bot/platform
- [ ] Rejecting a request never activates the platform
- [ ] Runtime cache does not keep stale approval or limit state beyond the intended window
- [ ] Full QA matrix passes for super-admin, owner, and sub-account roles
- [ ] Existing customers receive safe defaults after migration/backfill
- [ ] Rollout and rollback steps are documented clearly enough for another agent or engineer to execute
