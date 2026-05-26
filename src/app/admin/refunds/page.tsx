import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isAdminUser } from '@/lib/auth/admin'
import RefundClient from './RefundClient'

export default async function RefundsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/admin/refunds')}`)
  }
  // isAdminUser = DB User.role ('admin'|'superadmin') OR env ADMIN_EMAILS.
  if (!(await isAdminUser(session.user.id))) {
    notFound()
  }

  return <RefundClient />
}
