import Link from 'next/link'
import { ShieldCheck, UsersRound, Workflow } from 'lucide-react'

type Section = 'overview' | 'customers' | 'approvals'

const navItems: {
  href: string
  label: string
  section: Section
  icon: typeof ShieldCheck
}[] = [
  {
    href: '/dashboard/super-admin',
    label: 'Overview',
    section: 'overview',
    icon: ShieldCheck,
  },
  {
    href: '/dashboard/super-admin/customers',
    label: 'Customers',
    section: 'customers',
    icon: UsersRound,
  },
  {
    href: '/dashboard/super-admin/platform-approvals',
    label: 'Platform Approvals',
    section: 'approvals',
    icon: Workflow,
  },
]

export default function SuperAdminNav({ current }: { current: Section }) {
  return (
    <div className="border-b-4 border-black bg-white px-6 py-4 md:px-10">
      <div className="flex flex-wrap gap-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.section === current

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? 'border-black bg-black text-white'
                  : 'border-black bg-[#F5F5F0] text-[#000000] hover:bg-[#FFD93D]'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.5} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
