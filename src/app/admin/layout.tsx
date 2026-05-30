import { Metadata } from 'next'
import { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isAdminUser } from '@/lib/auth/admin'
import AdminNav from './AdminNav'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

// 모든 /admin/* 의 공통 셸 — 인증 가드 + 상단 네비게이션.
// 가드를 여기 한 곳에 모아 두면 새 어드민 페이지마다 가드를 다시 쓸 필요가
// 없다. 기존 하위 page 들의 개별 가드는 남겨둬도 무해(중복 방어).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/admin')}`)
  }
  if (!(await isAdminUser(session.user.id))) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  )
}
