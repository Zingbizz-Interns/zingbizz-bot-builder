import Link from 'next/link'
import {
  ShieldCheck,
  FlaskConical,
  ScrollText,
  UsersRound,
  Workflow,
  ArrowRight,
} from 'lucide-react'
import SuperAdminNav from './_components/SuperAdminNav'
import {
  createSuperAdminAuditTestEntry,
  getSuperAdminDashboardData,
  listSuperAdminCustomers,
} from '@/lib/actions/superAdmin'

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default async function SuperAdminPage() {
  const { appAdmin, adminCount, customerCount, pendingPlatformRequestCount, recentAuditLogs } =
    await getSuperAdminDashboardData()
  const customers = await listSuperAdminCustomers()

  const attentionAccounts = customers
    .filter((customer) => {
      const overQuota =
        customer.max_form_submissions !== null &&
        customer.completed_form_submissions >= customer.max_form_submissions

      return (
        overQuota ||
        !customer.automation_enabled ||
        !customer.excel_export_enabled ||
        customer.pending_platform_requests > 0
      )
    })
    .slice(0, 5)

  return (
    <div className="min-h-full bg-[#F5F5F0]">
      <div className="border-b-4 border-[#121212] bg-white px-6 py-6 md:px-10">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1040C0]">
          Super Admin
        </p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#121212]">
              Control Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#121212]/60">
              Phase 4 turns the protected admin shell into a real operations dashboard.
              Use this space to inspect customer accounts, review platform requests, and
              verify audit activity before rolling out the approval workflow.
            </p>
          </div>
          <div className="border-2 border-[#121212] bg-[#F0C020]/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
              Signed In
            </p>
            <p className="mt-1 text-sm font-black text-[#121212]">
              {appAdmin.label || appAdmin.email}
            </p>
            <p className="text-xs font-medium text-[#121212]/55">{appAdmin.email}</p>
          </div>
        </div>
      </div>

      <SuperAdminNav current="overview" />

      <div className="space-y-8 px-6 py-8 md:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          <section className="border-4 border-[#121212] bg-white p-5 shadow-[8px_8px_0px_0px_#121212]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#1040C0]" strokeWidth={2.5} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                  Admin Count
                </p>
                <p className="text-2xl font-black text-[#121212]">{adminCount}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[#121212]/60">
              Global app admins currently seeded in the protected admin table.
            </p>
          </section>

          <Link
            href="/dashboard/super-admin/customers"
            className="border-4 border-[#121212] bg-white p-5 shadow-[8px_8px_0px_0px_#1040C0] transition-transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-[#1040C0]" strokeWidth={2.5} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                  Customers
                </p>
                <p className="text-2xl font-black text-[#121212]">{customerCount}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[#121212]/60">
              Browse every account, inspect usage, and edit limits from one place.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#1040C0]">
              Open customer dashboard
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </p>
          </Link>

          <Link
            href="/dashboard/super-admin/platform-approvals"
            className="border-4 border-[#121212] bg-white p-5 shadow-[8px_8px_0px_0px_#F0C020] transition-transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              <Workflow className="h-5 w-5 text-[#D02020]" strokeWidth={2.5} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                  Pending Approvals
                </p>
                <p className="text-2xl font-black text-[#121212]">
                  {pendingPlatformRequestCount}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[#121212]/60">
              Review WhatsApp and Instagram connection requests before they go live.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#D02020]">
              Open approval queue
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </p>
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#F0C020]">
            <div className="border-b-2 border-[#121212] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                Attention Needed
              </p>
              <h2 className="text-lg font-black uppercase tracking-tight text-[#121212]">
                Priority Accounts
              </h2>
            </div>

            {attentionAccounts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#121212]/35">
                  No urgent customer states right now
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#121212]/8">
                {attentionAccounts.map((customer) => {
                  const overQuota =
                    customer.max_form_submissions !== null &&
                    customer.completed_form_submissions >= customer.max_form_submissions

                  return (
                    <Link
                      key={customer.customer_id}
                      href={`/dashboard/super-admin/customers/${customer.customer_id}`}
                      className="block px-5 py-4 transition-colors hover:bg-[#F5F5F0]"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-black text-[#121212]">{customer.name}</p>
                          <p className="text-sm font-medium text-[#121212]/55">{customer.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {overQuota && (
                            <span className="inline-flex items-center border-2 border-[#D02020] bg-[#D02020] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                              Over Quota
                            </span>
                          )}
                          {!customer.automation_enabled && (
                            <span className="inline-flex items-center border-2 border-[#1040C0] bg-[#1040C0] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                              Automation Off
                            </span>
                          )}
                          {!customer.excel_export_enabled && (
                            <span className="inline-flex items-center border-2 border-[#121212] bg-[#F0C020] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#121212]">
                              Exports Off
                            </span>
                          )}
                          {customer.pending_platform_requests > 0 && (
                            <span className="inline-flex items-center border-2 border-[#121212] bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#121212]">
                              {customer.pending_platform_requests} Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#121212]">
            <div className="border-b-2 border-[#121212] px-5 py-4">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-5 w-5 text-[#1040C0]" strokeWidth={2.5} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                    Audit Pipeline
                  </p>
                  <h2 className="text-lg font-black uppercase tracking-tight text-[#121212]">
                    Write Test Entry
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-sm font-medium leading-6 text-[#121212]/60">
                This stays here as the operational smoke test. Run it after migrations
                or role changes to confirm the super-admin audit pipeline still writes
                correctly.
              </p>
              <form action={createSuperAdminAuditTestEntry}>
                <button
                  type="submit"
                  className="inline-flex min-h-[48px] items-center gap-2 border-2 border-[#121212] bg-[#121212] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#1040C0]"
                >
                  <FlaskConical className="h-4 w-4" strokeWidth={2.5} />
                  Audit Test
                </button>
              </form>
            </div>
          </section>
        </div>

        <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#F0C020]">
          <div className="border-b-2 border-[#121212] px-5 py-4">
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5 text-[#D02020]" strokeWidth={2.5} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                  Recent Audit Logs
                </p>
                <h2 className="text-lg font-black uppercase tracking-tight text-[#121212]">
                  Latest Activity
                </h2>
              </div>
            </div>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#121212]/35">
                No audit logs yet
              </p>
              <p className="mt-2 text-sm font-medium text-[#121212]/55">
                Run the audit test after applying the migration and seeding your first app admin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-[#121212]/10">
                <thead className="bg-[#F5F5F0]">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                      Timestamp
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                      Action
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                      Target
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#121212]/8">
                  {recentAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[#121212]/65">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-5 py-4 text-sm font-black uppercase tracking-[0.15em] text-[#121212]">
                        {log.action}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#121212]/65">
                        {log.target_type}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[#121212]/55">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(log.metadata ?? {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
