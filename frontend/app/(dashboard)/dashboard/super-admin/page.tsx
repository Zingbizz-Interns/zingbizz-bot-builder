import { ShieldCheck, FlaskConical, ScrollText } from 'lucide-react'
import {
  createSuperAdminAuditTestEntry,
  getSuperAdminDashboardData,
} from '@/lib/actions/superAdmin'

export default async function SuperAdminPage() {
  const { appAdmin, adminCount, recentAuditLogs } =
    await getSuperAdminDashboardData()

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
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#121212]/60">
              Phase 1 foundation is live here: protected routing, shared access
              checks, and audit-log plumbing for future super-admin controls.
            </p>
          </div>
          <div className="border-2 border-[#121212] bg-[#F0C020]/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
              Signed In
            </p>
            <p className="mt-1 text-sm font-black text-[#121212]">
              {appAdmin.label || appAdmin.email}
            </p>
            <p className="text-xs font-medium text-[#121212]/55">
              {appAdmin.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-8 md:grid-cols-3 md:px-10">
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
            This card confirms the global super-admin role model is readable from
            the protected dashboard.
          </p>
        </section>

        <section className="border-4 border-[#121212] bg-white p-5 shadow-[8px_8px_0px_0px_#121212] md:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
                Audit Log Baseline
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-[#121212]">
                Write Test Entry
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#121212]/60">
                Use this once after the SQL migration and admin seed are applied.
                A successful write confirms the Phase 1 audit pipeline is working.
              </p>
            </div>

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

      <div className="px-6 pb-10 md:px-10">
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
                Run the audit test after applying the migration and seeding your
                first app admin.
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
                        {new Date(log.created_at).toLocaleString()}
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
