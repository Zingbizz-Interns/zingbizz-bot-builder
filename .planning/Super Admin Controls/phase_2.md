# Phase 2: Limits, Flags, and Approval Data Model

## Objective
Create the persistent data model that powers account-level limits, per-bot trigger caps, and pending platform approval requests.

---

## Dependencies
- Phase 1 must be complete because super-admin-only mutations will own these records.

---

## Subtasks

### 2.1 — Create customer-level control record
**Purpose:** Each customer account needs a single place to store super-admin-controlled business rules.

**Recommended table:**
```sql
create table if not exists customer_account_controls (
  customer_id uuid primary key references customer_profiles(id) on delete cascade,
  max_form_submissions integer,
  excel_export_enabled boolean not null default true,
  automation_enabled boolean not null default true,
  automation_disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Recommended semantics:**
- `max_form_submissions = null` means unlimited
- `excel_export_enabled = false` disables all XLSX exports for that customer
- `automation_enabled = false` is a hard kill switch if you ever need to stop all triggers manually

---

### 2.2 — Create bot-level limit fields
**Purpose:** Trigger creation limit is per bot, not per customer.

**Recommended addition to `bots`:**
```sql
alter table bots
  add column if not exists trigger_limit integer,
  add column if not exists trigger_limit_enforced boolean not null default true;
```

**Recommended semantics:**
- `trigger_limit = null` means unlimited
- enforcement applies only to creation, not editing existing triggers

---

### 2.3 — Create platform connection request workflow model
**Purpose:** WA/IG connections currently save immediately. We need a pending-request layer so super admins can approve before the bot uses the platform.

**Recommended table:**
```sql
create table if not exists platform_connection_requests (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references bots(id) on delete cascade,
  customer_id uuid not null references customer_profiles(id) on delete cascade,
  platform text not null check (platform in ('whatsapp', 'instagram')),
  request_payload jsonb not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')) default 'pending',
  decision_note text,
  requested_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Why a separate request table is better than a pending `platform_configs` row:**
- runtime resolution remains simple and safe
- approved configs can still live in `platform_configs`
- rejected requests do not pollute active runtime configuration

---

### 2.4 — Add admin data loaders and mutators
**Purpose:** Later UI phases need stable server actions or backend services to read and update the new control data.

**Required helper groups:**
- load customer account controls
- update account controls
- load platform requests
- approve/reject platform requests
- count current trigger usage and form submission usage

**Preferred behavior:**
- keep writes server-side only
- write audit logs for every mutation
- revalidate affected dashboard pages after save

---

## Execution Plan (Step-by-Step)

1. Create a DB migration for `customer_account_controls`, `platform_connection_requests`, and bot limit fields
2. Backfill one control row per existing `customer_profiles` row
3. Add indexes needed for approval queue and customer lookups
4. Create shared server actions / backend services for reading and writing the new records
5. Add audit log writes to each super-admin mutation helper
6. Confirm the data model can represent all requested business rules without UI workarounds

---

## Validation Criteria
- [ ] Every existing customer can be mapped to exactly one `customer_account_controls` row
- [ ] A customer can be configured with unlimited or capped form submissions
- [ ] A customer can have Excel export enabled or disabled independently of other controls
- [ ] A bot can have its own trigger creation limit without affecting sibling bots
- [ ] WA and IG connection attempts can be stored as `pending` requests without creating an active runtime config
- [ ] Every admin mutation helper writes an audit log entry
