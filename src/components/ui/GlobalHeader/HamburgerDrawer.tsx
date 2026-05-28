'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ENABLED_SERVICES } from '@/config/enabledServices'
import GoogleLoginPanel from '@/components/auth/GoogleLoginPanel'

interface HamburgerDrawerProps {
  locale: 'en' | 'ko'
  /** 라이트 페이지 위에 떴을 때 ink 톤으로 전환. 기본값 'dark' (다크 cosmic 페이지). */
  variant?: 'light' | 'dark'
}

export function HamburgerDrawer({ locale, variant = 'dark' }: HamburgerDrawerProps) {
  const [open, setOpen] = useState(false)
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isAuthed = status === 'authenticated'
  // session.user.name 은 OAuth 시점 cache 라 사용자가 프로필에서 이름을
  // 바꿔도 안 갱신됨. /api/me/profile 의 최신 user.name 을 fetch 해서 우선
  // 사용. 사용자: "메인페이지 이름 프로필이랑 동기화 안 됐어"
  const userName =
    profileName ||
    session?.user?.name ||
    session?.user?.email ||
    (isAuthed ? 'Account' : null)
  const isKo = locale === 'ko'
  // 타로 컨텍스트 일 때만 '타로 리딩 기록' 노출 — 다른 페이지에서는 노이즈 X.
  // 그 외 진입점은 프로필(/profile) 안에 있음.
  const isInTarot = pathname?.startsWith('/tarot') ?? false

  // Reset the login panel collapsed state every time the drawer closes so
  // a returning user always sees the compact "로그인" row first.
  useEffect(() => {
    if (!open) setLoginPanelOpen(false)
  }, [open])

  // 프로필에서 사용자가 이름 바꿔도 session 캐시 / OAuth 이름이 그대로 떠
  // 있는 문제 회피. drawer 가 열릴 때마다 /api/me/profile 의 최신 user.name
  // 을 가져와 갱신. cache:'no-store' 로 브라우저 캐시 우회 — PATCH 직후 GET
  // 이 stale 한 옛 값 반환하던 회귀 차단.
  useEffect(() => {
    if (!isAuthed) {
      setProfileName(null)
      return
    }
    if (!open) return // drawer 열린 순간만 fetch — mount 1 회는 stale 위험
    let cancelled = false
    fetch('/api/me/profile', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const name = (data?.user?.name as string | undefined) || (data?.name as string | undefined)
        if (name && name.trim()) setProfileName(name.trim())
      })
      .catch(() => {
        /* keep session.user.name fallback */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthed, open])

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
        style={{ border: 'none', outline: 'none', background: 'transparent', WebkitAppearance: 'none' }}
        className={`flex flex-col items-center justify-center gap-[4px] w-9 h-9 rounded-full
          cursor-pointer transition-colors
          focus-visible:ring-2 focus-visible:ring-[#a07a3c] focus-visible:ring-offset-2 ${
            variant === 'light'
              ? 'hover:bg-stone-100/60 focus-visible:ring-offset-[#fafaf9]'
              : 'hover:bg-white/10 focus-visible:ring-offset-slate-900'
          }`}
      >
        <span
          className={`block w-[14px] h-[2px] rounded ${
            variant === 'light' ? 'bg-[#1c1917]' : isAuthed ? 'bg-[#e8cc8a]' : 'bg-white'
          }`}
        />
        <span
          className={`block w-[14px] h-[2px] rounded ${
            variant === 'light' ? 'bg-[#1c1917]' : isAuthed ? 'bg-[#e8cc8a]' : 'bg-white'
          }`}
        />
        <span
          className={`block w-[14px] h-[2px] rounded ${
            variant === 'light' ? 'bg-[#1c1917]' : isAuthed ? 'bg-[#e8cc8a]' : 'bg-white'
          }`}
        />
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
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  onClick={close}
                  aria-label={isKo ? '홈으로' : 'Home'}
                  style={{ border: 'none', outline: 'none', background: 'transparent' }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full
                    text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5 10v10h14V10" />
                  </svg>
                </Link>
                <span className="text-white font-bold tracking-wide">DestinyPal</span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={isKo ? '닫기' : 'Close'}
                style={{ border: 'none', outline: 'none', background: 'transparent', WebkitAppearance: 'none' }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full
                  text-white/85
                  hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
              <div className="px-2 pb-2">
                {isAuthed ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] text-white/90">
                    <span
                      aria-hidden="true"
                      className="inline-flex w-5 items-center justify-center"
                    >
                      👤
                    </span>
                    <span className="text-sm truncate">{userName}</span>
                  </div>
                ) : !loginPanelOpen ? (
                  <button
                    type="button"
                    onClick={() => setLoginPanelOpen(true)}
                    aria-expanded={false}
                    aria-controls="drawer-login-panel"
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl
                      bg-white/[0.04] text-white/90 hover:bg-white/[0.08] cursor-pointer
                      transition-colors text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex w-5 items-center justify-center"
                    >
                      🔑
                    </span>
                    <span className="text-sm">{isKo ? '로그인' : 'Login'}</span>
                  </button>
                ) : (
                  <GoogleLoginPanel
                    locale={isKo ? 'ko' : 'en'}
                    callbackUrl="/"
                    onLinkNavigate={close}
                    panelId="drawer-login-panel"
                  />
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
                  <span
                    aria-hidden="true"
                    className="inline-flex w-5 items-center justify-center text-base"
                  >
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
                <span aria-hidden="true">👤</span>
                <span className="text-sm">{isKo ? '내 정보' : 'My Info'}</span>
              </Link>
              {isAuthed && isInTarot && (
                <Link
                  href="/tarot/history"
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/[0.06]"
                >
                  <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                    🔮
                  </span>
                  <span className="text-sm">{isKo ? '타로 리딩 기록' : 'My Tarot Readings'}</span>
                </Link>
              )}
              <Link
                href="/pricing"
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/[0.06]"
              >
                <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                  💳
                </span>
                <span className="text-sm">{isKo ? '크레딧 충전' : 'Recharge Credits'}</span>
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
                  <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                    🚪
                  </span>
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
