import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isAdminUser } from '@/lib/auth/admin'
import GrantCreditsClient from './GrantCreditsClient'

export default async function GrantCreditsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/admin/grant-credits')}`)
  }
  // isAdminUser = DB User.role ('admin'|'superadmin') OR env ADMIN_EMAILS.
  // env 만 보던 isAdminEmail 로는 ADMIN_EMAILS 안 깔린 환경에서 본인 계정도
  // 못 들어가는 문제 → DB role 도 인정해서 prisma 로 직접 admin 부여 가능.
  if (!(await isAdminUser(session.user.id))) {
    notFound()
  }

  return <GrantCreditsClient />
}
