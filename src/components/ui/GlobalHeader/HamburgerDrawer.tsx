'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { ENABLED_SERVICES } from '@/config/enabledServices'

interface HamburgerDrawerProps {
  locale: 'en' | 'ko'
}

export function HamburgerDrawer({ locale }: HamburgerDrawerProps) {
  const [open, setOpen] = useState(false)
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'
  const userName = session?.user?.name || session?.user?.email || (isAuthed ? 'Account' : null)
  const isKo = locale === 'ko'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isKo ? '메뉴 열기' : 'Open menu'}
        className="flex flex-col items-center justify-center gap-[5px] w-10 h-10 rounded-full
          border border-white/20 bg-black/40 backdrop-blur-md cursor-pointer
          hover:bg-white/10 hover:border-white/40 transition-colors
          focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2
          focus-visible:ring-offset-slate-900"
      >
        <span className="block w-4 h-[2px] bg-white rounded" />
        <span className="block w-4 h-[2px] bg-white rounded" />
        <span className="block w-4 h-[2px] bg-white rounded" />
      </button>

      {open && (
        <>
          <div
            onClick={close}
            aria-hidden="true"
            className="fixed inset-0 z-[10000] bg-black/55 backdrop-blur-[2px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={isKo ? '메뉴' : 'Menu'}
            className="fixed top-0 left-0 bottom-0 z-[10001] w-[min(320px,86vw)]
              bg-gradient-to-b from-[#120c24] to-[#06040f] border-r border-white/10
              shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <span className="text-white font-bold tracking-wide">DestinyPal</span>
              <button
                type="button"
                onClick={close}
                aria-label={isKo ? '닫기' : 'Close'}
                className="w-8 h-8 rounded-full border border-white/15 bg-white/5
                  text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
              <div className="px-2 pb-2">
                {isAuthed ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] text-white/90">
                    <span aria-hidden="true">👤</span>
                    <span className="text-sm">{userName}</span>
                  </div>
                ) : (
                  <Link
                    href="/auth/signin?callbackUrl=/"
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                      bg-white/[0.04] text-white/90 hover:bg-white/[0.08]"
                  >
                    <span aria-hidden="true">🔑</span>
                    <span className="text-sm">{isKo ? '로그인' : 'Login'}</span>
                  </Link>
                )}
              </div>

              <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-[0.12em] text-violet-200/55">
                {isKo ? '서비스' : 'Services'}
              </p>
              {ENABLED_SERVICES.map((service) => (
                <Link
                  key={service.id}
                  href={service.href}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-white/90 hover:bg-white/[0.06] transition-colors"
                >
                  <span aria-hidden="true" className="text-base">
                    {service.icon}
                  </span>
                  <span className="text-sm">{isKo ? service.label.ko : service.label.en}</span>
                </Link>
              ))}

              <p className="px-3 pt-4 pb-1 text-[11px] uppercase tracking-[0.12em] text-violet-200/55">
                {isKo ? '계정' : 'Account'}
              </p>
              <Link
                href="/profile"
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/[0.06]"
              >
                <span aria-hidden="true">📅</span>
                <span className="text-sm">{isKo ? '내 사주 정보' : 'My Birth Info'}</span>
              </Link>
              <Link
                href="/pricing"
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/[0.06]"
              >
                <span aria-hidden="true">💳</span>
                <span className="text-sm">{isKo ? '요금제' : 'Pricing'}</span>
              </Link>
              {isAuthed && (
                <button
                  type="button"
                  onClick={() => {
                    close()
                    void signOut({ callbackUrl: '/' })
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90
                    hover:bg-white/[0.06] cursor-pointer text-left"
                >
                  <span aria-hidden="true">🚪</span>
                  <span className="text-sm">{isKo ? '로그아웃' : 'Logout'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-4 border-t border-white/8 text-[11px] text-white/45">
              <Link href="/policy/terms" onClick={close} className="hover:text-white/80">
                {isKo ? '이용약관' : 'Terms'}
              </Link>
              <Link href="/policy/privacy" onClick={close} className="hover:text-white/80">
                {isKo ? '개인정보' : 'Privacy'}
              </Link>
              <Link href="/policy/refund" onClick={close} className="hover:text-white/80">
                {isKo ? '환불 정책' : 'Refund'}
              </Link>
              <Link href="/faq" onClick={close} className="hover:text-white/80">
                FAQ
              </Link>
              <Link href="/contact" onClick={close} className="hover:text-white/80">
                {isKo ? '문의' : 'Contact'}
              </Link>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
