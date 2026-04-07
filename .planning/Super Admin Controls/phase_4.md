# Phase 4: Super Admin Dashboard

## Objective
Build the internal dashboard that lets super admins inspect customers, change limits, and approve or reject platform requests safely.

---

## Dependencies
- Phase 1 for route protection
- Phase 2 for control records and request data
- Phase 3 for enforcement behavior to make the controls meaningful

---

## Subtasks

### 4.1 — Build customer account list page
**Purpose:** Super admins need a single view of all customers and their current operational state.

**Suggested page:** `/dashboard/super-admin/customers`

**Recommended columns:**
- customer name
- customer email
- total bots
- current completed form submission count
- max form submissions
- excel export enabled/disabled
- automation enabled/disabled
- count of pending platform requests

**Useful filters:**
- over quota
- automation disabled
- exports disabled
- has pending approvals

---

### 4.2 — Build customer detail controls page
**Purpose:** Super admins need a focused control surface per customer.

**Suggested sections:**
- account summary
- usage summary
- form submission cap editor
- excel export toggle
- manual automation kill switch
- per-bot trigger limits table

**Required behavior:**
- all saves create audit logs
- field validation prevents invalid negative limits
- current usage should be visible next to configured caps

---

### 4.3 — Build platform approval queue
**Purpose:** Pending WA/IG requests need a dedicated triage surface.

**Suggested page:** `/dashboard/super-admin/platform-approvals`

**Queue should show:**
- request age
- customer name
- bot name
- platform
- requester identity
- request status
- request metadata summary needed for review

---

### 4.4 — Build approve/reject action flows with audit notes
**Purpose:** Approval is not just a toggle; it is an operational decision that needs reviewer attribution.

**Required actions:**
- approve request
- reject request
- optionally cancel stale request
- capture review note for both approve and reject

**Required outputs:**
- audit log row
- updated request status
- UI refresh of queue and customer detail page

---

## Execution Plan (Step-by-Step)

1. Create the protected super-admin route group and layout
2. Build the customer list page with aggregated counts and quick status pills
3. Build the customer detail page with editable controls and per-bot limits
4. Build the platform approvals queue with request detail panels
5. Add approve/reject actions with confirmation and audit note capture
6. Revalidate all affected routes after each save or approval action
7. Verify normal dashboard users cannot discover or load these pages

---

## Validation Criteria
- [ ] Super admins can browse all customers from one dashboard
- [ ] Customer detail page shows current usage and current configured limits together
- [ ] Editing account controls persists and survives refresh
- [ ] Platform approval queue shows pending requests accurately
- [ ] Approve/reject decisions capture reviewer identity and review timestamp
- [ ] All write actions generate audit log records
- [ ] Owners and sub-accounts cannot access any super-admin page
