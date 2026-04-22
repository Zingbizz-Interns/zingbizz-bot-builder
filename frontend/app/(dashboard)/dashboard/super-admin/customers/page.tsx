import SuperAdminNav from '../_components/SuperAdminNav'
import CustomersOverview from '../_components/CustomersOverview'
import { listSuperAdminCustomers } from '@/lib/actions/superAdmin'

export default async function SuperAdminCustomersPage() {
  const customers = await listSuperAdminCustomers()

  return (
    <div className="min-h-full bg-[#F5F5F0]">
      <div className="border-b-4 border-black bg-white px-6 py-6 md:px-10">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#FF6B6B]">
          Super Admin
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-black">
          Customer Accounts
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-black/60">
          Inspect operational health across every account, filter by risky states,
          and jump straight into the detailed controls for any customer.
        </p>
      </div>

      <SuperAdminNav current="customers" />

      <div className="px-6 py-8 md:px-10">
        <CustomersOverview customers={customers} />
      </div>
    </div>
  )
}
