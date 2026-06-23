'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// 어드민 공통 네비게이션. layout.tsx 에서 모든 /admin/* 페이지 상단에 렌더된다.
// 메뉴가 많아져 그룹(드롭다운)으로 정리했다. 새 페이지는 해당 그룹 items 에
// 한 줄만 추가하면 된다.
type NavItem = { href: string; label: string }
type NavGroup = { label: string; items: NavItem[] }

const HOME: NavItem = { href: '/admin', label: '개요' }

const NAV_GROUPS: NavGroup[] = [
  {
    label: '운영',
    items: [
      { href: '/admin/users', label: '유저 검색' },
      { href: '/admin/credits', label: '크레딧 관리' },
      { href: '/admin/reconcile', label: '결제 점검·복구' },
    ],
  },
  {
    label: '지표',
    items: [
      { href: '/admin/visitors', label: '방문자' },
      { href: '/admin/dashboard', label: '상세 지표' },
      { href: '/admin/revenue', label: '매출·크레딧' },
      { href: '/admin/funnel', label: '전환 퍼널' },
    ],
  },
  {
    label: '모니터링',
    items: [
      { href: '/admin/webhooks', label: '결제·웹훅' },
      { href: '/admin/anomalies', label: '이상징후' },
      { href: '/admin/audit', label: '감사로그' },
    ],
  },
  {
    label: '홍보',
    items: [{ href: '/admin/social', label: 'Threads 자동게시' }],
  },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  // 바깥 클릭 / 경로 변경 시 드롭다운 닫기.
  useEffect(() => setOpen(null), [pathname])
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const homeActive = pathname === '/admin'
  const groupActive = (g: NavGroup) => g.items.some((i) => pathname?.startsWith(i.href))

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-stone-900">DestinyPal</span>
          <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white">
            ADMIN
          </span>
        </Link>

        <nav ref={navRef} className="flex flex-wrap items-center gap-1">
          <Link
            href={HOME.href}
            className={
              homeActive
                ? 'rounded-full bg-stone-900 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900'
            }
          >
            {HOME.label}
          </Link>

          {NAV_GROUPS.map((group) => {
            const isOpen = open === group.label
            const active = groupActive(group)
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : group.label)}
                  className={
                    active
                      ? 'flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1.5 text-sm font-medium text-white'
                      : 'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900'
                  }
                  aria-expanded={isOpen}
                >
                  {group.label}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                  >
                    <path
                      d="M2.5 4.5L6 8l3.5-3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {isOpen && (
                  <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                    {group.items.map((item) => {
                      const itemActive = pathname?.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={
                            itemActive
                              ? 'block bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900'
                              : 'block px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 hover:text-stone-900'
                          }
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
