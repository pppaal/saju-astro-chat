import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isAdminEmail } from '@/lib/auth/admin'
import GrantCreditsClient from './GrantCreditsClient'

export default async function GrantCreditsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/admin/grant-credits')}`)
  }
  if (!isAdminEmail(session.user.email)) {
    notFound()
  }

  return <GrantCreditsClient />
}
