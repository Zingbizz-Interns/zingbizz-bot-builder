# Phase 1: Super Admin Foundation

## Objective
Introduce a true site-wide super-admin capability that is separate from customer owners and sub-accounts. This phase creates the security boundary that every later phase depends on.

---

## Dependencies
- None. This is the root phase for the super-admin feature set.

---

## Subtasks

### 1.1 — Create global super-admin role model
**Purpose:** The current project has owners (`customer_profiles`) and team members (`sub_accounts`), but no website-level admin who can manage all customers.

**Recommended schema:**
```sql
create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  label text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
```

**Why this design:**
- avoids overloading `customer_profiles`
- keeps super-admin scope independent of customer ownership
- makes access checks explicit and easy to audit

**Required decisions:**
- whether `email` is informational only or part of uniqueness checks
- whether only one “founder/root” admin can edit the `app_admins` table

---

### 1.2 — Add backend + frontend access helpers
**Purpose:** All super-admin screens and mutations must use a single shared access-check mechanism.

**Likely implementation targets:**
- `frontend/lib/` server helper such as `getCurrentAppAdmin()`
- backend middleware for privileged routes if REST endpoints are introduced
- shared query helper for checking `app_admins.user_id = auth.uid()`

**Guard requirements:**
- deny normal owners
- deny sub-accounts
- deny unauthenticated users
- return `403` for authenticated non-admins

---

### 1.3 — Create protected super-admin route group
**Purpose:** Super-admin tools need their own dashboard entry point and route-level guard.

**Suggested route structure:**
- `/dashboard/super-admin`
- `/dashboard/super-admin/customers`
- `/dashboard/super-admin/platform-approvals`

**Suggested implementation:**
- create a dedicated layout for the route group
- load current admin identity server-side before rendering
- redirect non-admins away before page content loads

---

### 1.4 — Add audit trail baseline for super-admin actions
**Purpose:** Limit changes and approval decisions affect customer behavior globally. Those changes must be attributable.

**Recommended schema:**
```sql
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

**Log at minimum:**
- max form submission limit changes
- excel export toggle changes
- trigger limit changes
- platform approval / rejection decisions
- account-wide automation lock / unlock

---

## Execution Plan (Step-by-Step)

1. Add a new DB migration for `app_admins` and `admin_audit_logs`
2. Seed the initial super-admin user(s) manually in Supabase SQL or via a protected script
3. Create a shared server helper that returns the current app-admin record
4. Add route-level protection for `/dashboard/super-admin/*`
5. Add a small super-admin landing page that confirms access is working
6. Wire audit-log writes into one test mutation before broader rollout
7. Verify non-admin owners and sub-accounts receive `403` or redirect

---

## Validation Criteria
- [ ] A user listed in `app_admins` can load the super-admin area
- [ ] A normal customer owner cannot access the super-admin area
- [ ] A sub-account cannot access the super-admin area
- [ ] Super-admin checks are implemented via shared helpers, not repeated ad hoc logic
- [ ] At least one super-admin action writes an `admin_audit_logs` row successfully
- [ ] Access control failure modes are explicit (`401` for unauthenticated, `403` for authenticated non-admin)
