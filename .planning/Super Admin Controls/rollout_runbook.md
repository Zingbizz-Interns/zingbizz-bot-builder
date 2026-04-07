# Super Admin Controls Rollout Runbook

## Purpose
Operational guide for rolling out the super-admin controls safely in production, backfilling required data, and recovering quickly if platform approvals block valid customer traffic.

---

## Scope
This runbook covers:

- `006_super_admin_foundation.sql`
- `007_super_admin_controls_model.sql`
- super-admin seeding
- default values for existing customers and bots
- platform approval activation behavior
- rollback options

It does not replace the Phase 6 QA matrix. Run QA separately before marking Phase 6 complete.

---

## Safe Defaults

### Existing customers
- `customer_account_controls` rows are backfilled by `007_super_admin_controls_model.sql`
- default values:
  - `max_form_submissions = null`
  - `excel_export_enabled = true`
  - `automation_enabled = true`
  - `automation_disabled_reason = null`

These defaults preserve current behavior until a super admin intentionally adds limits.

### Existing bots
- `trigger_limit = null`
- `trigger_limit_enforced = true`

With `trigger_limit = null`, trigger creation remains unlimited until a super admin sets a cap.

### Existing platform configs
- Existing rows in `platform_configs` remain active
- Approval gating only affects new submissions and updated platform requests
- If an owner already has a live platform config, it keeps working until a new request is approved and promoted

---

## Prerequisites

1. Confirm both frontend and backend deployments are ready for the new code.
2. Confirm Supabase backups are available before running production SQL.
3. Confirm the intended root super-admin email is already present in `auth.users`.
4. Confirm `BACKEND_URL`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and other existing platform env vars are correct in production.

---

## Migration Order

Run these in Supabase SQL Editor in this exact order:

1. `database/migrations/006_super_admin_foundation.sql`
2. `database/migrations/007_super_admin_controls_model.sql`

Do not run `007` before `006`, because `007` depends on the super-admin foundation objects already existing.

---

## Initial Super Admin Seed

After running `006`, insert the first root admin:

```sql
insert into public.app_admins (user_id, email, label)
select
  id,
  email,
  'Root Admin'
from auth.users
where email = 'your-email@example.com'
on conflict (user_id) do update
set
  email = excluded.email,
  label = excluded.label;
```

Verification query:

```sql
select user_id, email, label, created_at
from public.app_admins
order by created_at desc;
```

---

## Backfill Expectations

### Customer control backfill
`007_super_admin_controls_model.sql` automatically inserts one `customer_account_controls` row per existing `customer_profiles` row:

```sql
insert into public.customer_account_controls (customer_id)
select cp.id
from public.customer_profiles cp
on conflict (customer_id) do nothing;
```

Verification query:

```sql
select
  count(*) as control_count
from public.customer_account_controls;
```

Compare it to:

```sql
select
  count(*) as customer_count
from public.customer_profiles;
```

Counts should match unless customers were created during rollout. If they do not match, rerun the backfill insert shown above.

### Existing platform requests
No historical platform requests are backfilled automatically. Existing live `platform_configs` remain the source of truth until new approval requests are submitted.

---

## Production Rollout Steps

1. Deploy backend and frontend code.
2. Run `006_super_admin_foundation.sql`.
3. Seed the first `app_admins` row.
4. Run `007_super_admin_controls_model.sql`.
5. Log in as the seeded super admin.
6. Open `/dashboard/super-admin` and verify access.
7. Open `/dashboard/super-admin/platform-approvals` and verify the queue loads.
8. Open one customer detail page and confirm control persistence works.
9. Submit one WhatsApp or Instagram request from an owner account.
10. Approve that request from the super-admin queue.
11. Confirm the platform becomes active on the owner-facing platforms page.
12. Confirm the bot resolves the approved platform at runtime.

---

## Immediate Smoke Checks

After rollout, verify at minimum:

1. non-admin users cannot open `/dashboard/super-admin`
2. owner can still open their bot settings and platforms pages
3. new platform submissions show as pending instead of instantly connected
4. approving a request updates the owner-facing page
5. existing connected platforms still work
6. no production errors appear in frontend or backend logs during approval actions

---

## Rollback Options

### Rollback level 1: unblock a single customer quickly
If a legitimate platform request is blocked and the customer must go live immediately:

1. open the request payload in the super-admin queue
2. approve it from the UI if possible
3. if the UI path is blocked, manually upsert the payload into `platform_configs`

Example structure:

```sql
insert into public.platform_configs (
  bot_id,
  platform,
  phone_number_id,
  waba_id,
  page_id,
  access_token,
  verify_token,
  session_expiry_ms,
  warning_time_ms,
  warning_message,
  is_active,
  updated_at
)
values (
  'BOT_ID_HERE',
  'whatsapp',
  'PHONE_NUMBER_ID_HERE',
  'WABA_ID_HERE',
  null,
  'ACCESS_TOKEN_HERE',
  'VERIFY_TOKEN_HERE',
  600000,
  120000,
  'Your session will expire soon. Please respond to continue.',
  true,
  now()
)
on conflict (bot_id, platform) do update
set
  phone_number_id = excluded.phone_number_id,
  waba_id = excluded.waba_id,
  page_id = excluded.page_id,
  access_token = excluded.access_token,
  verify_token = excluded.verify_token,
  session_expiry_ms = excluded.session_expiry_ms,
  warning_time_ms = excluded.warning_time_ms,
  warning_message = excluded.warning_message,
  is_active = true,
  updated_at = now();
```

Then mark the request row as approved manually if needed.

### Rollback level 2: temporarily bypass approval gating for new submissions
If the approval workflow itself is blocking too many valid connections:

1. revert the frontend/backend deployment to the last stable version before approval gating
2. keep the database migrations in place
3. owners will resume writing directly to `platform_configs` on the older code path

This is the safest broad rollback because it restores the previous runtime behavior without destructive SQL.

### Rollback level 3: freeze review operations while keeping live bots running
If the queue UI is unstable but live bots are fine:

1. stop processing new approvals temporarily
2. leave existing `platform_configs` untouched
3. communicate to internal operators that live platforms remain active, but new requests are paused

This avoids touching current customer traffic while you stabilize the review flow.

---

## Operator Notes

- Prefer approving valid requests through the app UI so audit logs stay complete.
- Do not delete `platform_connection_requests` history during rollback unless absolutely necessary.
- Existing live platform configs are intentionally preserved to reduce rollout risk.
- If a request is rejected, the customer can resubmit a corrected request without losing previous review history.

---

## Exit Criteria For Full Rollout

Treat rollout as complete only when:

1. migrations are applied in production
2. at least one super admin is seeded and verified
3. owner submission, super-admin approval, and runtime activation all work end to end
4. the Phase 6 QA matrix is finished
5. operators know the rollback path above
