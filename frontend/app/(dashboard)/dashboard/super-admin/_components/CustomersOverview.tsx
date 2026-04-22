'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import type { SuperAdminCustomerSummary } from '@/lib/actions/superAdmin'

type CustomerFilter =
  | 'all'
  | 'over_quota'
  | 'automation_disabled'
  | 'exports_disabled'
  | 'pending_approvals'

const filterLabels: Record<CustomerFilter, string> = {
  all: 'All Customers',
  over_quota: 'Over Quota',
  automation_disabled: 'Automation Off',
  exports_disabled: 'Exports Off',
  pending_approvals: 'Pending Approvals',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverQuota(customer: SuperAdminCustomerSummary) {
  return (
    customer.max_form_submissions !== null &&
    customer.completed_form_submissions >= customer.max_form_submissions
  )
}

function statusPillClasses(color: 'blue' | 'red' | 'yellow' | 'white') {
  switch (color) {
    case 'blue':
      return 'border-[#FF6B6B] bg-[#FF6B6B] text-white'
    case 'red':
      return 'border-[#FF6B6B] bg-[#FF6B6B] text-white'
    case 'yellow':
      return 'border-black bg-[#FFD93D] text-black'
    default:
      return 'border-black/25 bg-white text-black/60'
  }
}

export default function CustomersOverview({
  customers,
}: {
  customers: SuperAdminCustomerSummary[]
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return customers.filter((customer) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        customer.name.toLowerCase().includes(normalizedSearch) ||
        customer.email.toLowerCase().includes(normalizedSearch)

      if (!matchesSearch) return false

      switch (filter) {
        case 'over_quota':
          return isOverQuota(customer)
        case 'automation_disabled':
          return !customer.automation_enabled
        case 'exports_disabled':
          return !customer.excel_export_enabled
        case 'pending_approvals':
          return customer.pending_platform_requests > 0
        default:
          return true
      }
    })
  }, [customers, filter, search])

  const counts = useMemo(
    () => ({
      total: customers.length,
      overQuota: customers.filter(isOverQuota).length,
      automationDisabled: customers.filter((customer) => !customer.automation_enabled).length,
      exportsDisabled: customers.filter((customer) => !customer.excel_export_enabled).length,
      pendingApprovals: customers.filter((customer) => customer.pending_platform_requests > 0).length,
    }),
    [customers]
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#000]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Customers
          </p>
          <p className="mt-2 text-3xl font-black text-black">{counts.total}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#FF6B6B]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Over Quota
          </p>
          <p className="mt-2 text-3xl font-black text-[#FF6B6B]">{counts.overQuota}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#FF6B6B]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Automation Off
          </p>
          <p className="mt-2 text-3xl font-black text-[#FF6B6B]">{counts.automationDisabled}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#FFD93D]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Exports Off
          </p>
          <p className="mt-2 text-3xl font-black text-black">{counts.exportsDisabled}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#107040]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Pending Approvals
          </p>
          <p className="mt-2 text-3xl font-black text-[#107040]">{counts.pendingApprovals}</p>
        </div>
      </div>

      <section className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_#000]">
        <div className="border-b-2 border-black px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#000000]/45">
                Filters
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-black">
                Customer Accounts
              </h2>
            </div>

            <label className="flex min-w-[280px] items-center gap-2 border-4 border-black bg-[#F5F5F0] px-3 py-2">
              <Search className="h-4 w-4 text-black/50" strokeWidth={2.5} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="w-full bg-transparent text-sm font-medium text-[#000000] outline-none placeholder:text-[#000000]/35"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(filterLabels) as CustomerFilter[]).map((value) => {
              const active = filter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`border-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-black bg-white text-[#000000] hover:bg-[#FFD93D]'
                  }`}
                >
                  {filterLabels[value]}
                </button>
              )
            })}
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#000000]/35">
              No customer accounts match this filter
            </p>
            <p className="mt-2 text-sm font-medium text-[#000000]/55">
              Try clearing the search or switching back to a broader filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-[#000000]/10">
              <thead className="bg-[#F5F5F0]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Bots
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Form Usage
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Exports
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Automation
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Approvals
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Joined
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                    Open
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000000]/8">
                {filteredCustomers.map((customer) => {
                  const overQuota = isOverQuota(customer)

                  return (
                    <tr key={customer.customer_id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-black">{customer.name}</p>
                        <p className="text-sm font-medium text-[#000000]/55">{customer.email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-black">
                        {customer.bot_count}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-black text-black">
                            {customer.completed_form_submissions}
                            <span className="ml-2 text-xs font-medium uppercase tracking-[0.18em] text-[#000000]/45">
                              / {customer.max_form_submissions ?? 'Unlimited'}
                            </span>
                          </p>
                          <span
                            className={`inline-flex w-fit items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusPillClasses(
                              overQuota ? 'red' : 'white'
                            )}`}
                          >
                            {overQuota ? 'Limit Reached' : 'Healthy'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusPillClasses(
                            customer.excel_export_enabled ? 'white' : 'yellow'
                          )}`}
                        >
                          {customer.excel_export_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusPillClasses(
                              customer.automation_enabled ? 'blue' : 'red'
                            )}`}
                          >
                            {customer.automation_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {!customer.automation_enabled && customer.automation_disabled_reason && (
                            <p className="max-w-[240px] text-xs font-medium text-[#000000]/55">
                              {customer.automation_disabled_reason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-black">
                        {customer.pending_platform_requests}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#000000]/55">
                        {formatDate(customer.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/super-admin/customers/${customer.customer_id}`}
                          className="inline-flex items-center gap-2 border-4 border-black px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#000000] transition-colors hover:bg-black hover:text-white"
                        >
                          View Controls
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
