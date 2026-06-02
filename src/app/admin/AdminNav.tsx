'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 어드민 공통 네비게이션. layout.tsx 에서 모든 /admin/* 페이지 상단에 렌더된다.
// 새 페이지를 추가하면 NAV_ITEMS 에 한 줄만 더하면 자동으로 연결된다.
const NAV_ITEMS: { href: string; label: string }[] = [
  { href: '/admin', label: '개요' },
  { href: '/admin/users', label: '유저 검색' },
  { href: '/admin/grant-credits', label: '크레딧 지급' },
  { href: '/admin/refunds', label: '환불' },
  { href: '/admin/usage', label: '사용량 분석' },
  { href: '/admin/dashboard', label: '상세 지표' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-stone-900">DestinyPal</span>
          <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white">
            ADMIN
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'rounded-full bg-stone-900 px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
