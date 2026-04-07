import { requireSuperAdmin } from '@/lib/superAdmin'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSuperAdmin()
  return children
}
