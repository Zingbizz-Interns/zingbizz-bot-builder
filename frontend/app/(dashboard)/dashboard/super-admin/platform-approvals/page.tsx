import SuperAdminNav from '../_components/SuperAdminNav'
import PlatformApprovalsBoard from '../_components/PlatformApprovalsBoard'
import { getPlatformConnectionRequests } from '@/lib/actions/superAdmin'

export default async function SuperAdminPlatformApprovalsPage() {
  const requests = await getPlatformConnectionRequests({ status: 'all' })

  return (
    <div className="min-h-full bg-[#F5F5F0]">
      <div className="border-b-4 border-[#121212] bg-white px-6 py-6 md:px-10">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1040C0]">
          Super Admin
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[#121212]">
          Platform Approval Queue
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#121212]/60">
          Review pending WhatsApp and Instagram connection requests, add audit
          notes, and make approval decisions with clear reviewer attribution.
        </p>
      </div>

      <SuperAdminNav current="approvals" />

      <div className="px-6 py-8 md:px-10">
        <PlatformApprovalsBoard requests={requests} />
      </div>
    </div>
  )
}
