# Phase 5: Customer-Facing Guardrails

## Objective
Make the limit and approval system understandable to normal users. When actions are blocked, the UI must explain why and what state the account is in.

---

## Dependencies
- Phase 3 for actual enforcement
- Phase 4 for super-admin-managed state to exist in real workflows

---

## Subtasks

### 5.1 — Show trigger-limit feedback in bot builder UI
**Primary UI:** trigger creation modal / triggers page

**Purpose:** When the trigger cap is reached, owners should get immediate feedback instead of a vague failure.

**Recommended UX:**
- preferred: toast notification with limit reached message
- fallback: inline error banner inside the modal if no toast library is added yet

**Message should include:**
- current limit
- that the limit is controlled by super admin
- that editing existing triggers remains available

---

### 5.2 — Show blocked / over-quota automation state to owners
**Primary UI:** bot triggers pages, platform pages, maybe dashboard overview

**Purpose:** If the bot stops responding because the account hit the stored-form cap or was disabled manually, the owner must see that clearly.

**Recommended UX:**
- persistent banner on relevant bot pages
- state label such as `Automation Paused`
- reason text from `automation_disabled_reason` or quota state

---

### 5.3 — Show platform request pending/approved/rejected states
**Primary UI:** WA and IG platform forms

**Purpose:** Platform setup should no longer look “saved” immediately once approval is introduced.

**Required states:**
- no request yet
- pending approval
- approved and active
- rejected with note

**Important behavior:**
- while pending, the form should not imply the bot is live on that platform
- if rejected, the owner should be able to submit a corrected request

---

### 5.4 — Hide or disable export actions when feature is off
**Primary UI:** form responses export button

**Purpose:** Remove false affordances when export is disabled by super admin.

**Recommended UX:**
- disabled button with tooltip or helper text
- or hide button entirely if that fits the product better
- if disabled, the page should still mention that export is controlled by super admin

---

## Execution Plan (Step-by-Step)

1. Pick a consistent feedback pattern for blocking states (toast, banner, inline error)
2. Update trigger creation UI to surface limit-reached errors clearly
3. Add account-state banner(s) to bot management pages when automation is paused or capped
4. Update WA/IG forms to render request lifecycle states
5. Update responses page to disable or hide export when customer export is off
6. Verify every UI state matches the corresponding backend enforcement outcome

---

## Validation Criteria
- [ ] Trigger creation limit failures are explained clearly in the UI
- [ ] Owners can tell when automation is paused due to quota vs manual super-admin disablement
- [ ] Platform setup pages correctly distinguish pending, approved, and rejected states
- [ ] Export UI does not offer a working control when export is disabled
- [ ] No customer-facing screen claims a platform is live before approval is actually granted
