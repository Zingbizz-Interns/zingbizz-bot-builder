import { notFound } from 'next/navigation'
import SuperAdminNav from '../../_components/SuperAdminNav'
import CustomerDetailClient from '../../_components/CustomerDetailClient'
import {
  getPlatformConnectionRequests,
  getSuperAdminCustomerDetail,
} from '@/lib/actions/superAdmin'

export default async function SuperAdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params

  try {
    const [customer, requests] = await Promise.all([
      getSuperAdminCustomerDetail(customerId),
      getPlatformConnectionRequests({ customerId, status: 'all' }),
    ])

    return (
      <div className="min-h-full bg-[#F5F5F0]">
        <div className="border-b-4 border-[#121212] bg-white px-6 py-6 md:px-10">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1040C0]">
            Super Admin
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[#121212]">
            {customer.profile.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#121212]/60">
            Edit account-wide runtime controls, review per-bot trigger limits, and
            inspect related platform approval history from one focused screen.
          </p>
        </div>

        <SuperAdminNav current="customers" />

        <div className="px-6 py-8 md:px-10">
          <CustomerDetailClient customer={customer} requests={requests} />
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof Error && /Customer not found/i.test(error.message)) {
      notFound()
    }

    throw error
  }
}
