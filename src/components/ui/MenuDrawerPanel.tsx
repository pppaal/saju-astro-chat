'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ENABLED_SERVICES } from '@/config/enabledServices'
import GoogleLoginPanel from '@/components/auth/GoogleLoginPanel'
import { clearClientCacheAndSignOut } from '@/lib/auth/clearClientCache'

interface MenuDrawerPanelProps {
  open: boolean
  onClose: () => void
  locale: 'en' | 'ko'
  /** 'dark' = 다크 cosmic (기본), 'light' = 흰 배경 (메인 premium-white). */
  variant?: 'dark' | 'light'
}

/**
 * 사이트 전체에서 공유하는 햄버거 드로어 패널.
 * 메뉴 항목은 어디서나 동일. 단, 타로 컨텍스트일 때만 '타로 리딩 기록' 노출.
 * 패널 색은 variant 로만 결정 — 로그인 상태에 따른 자동 색 변화 없음.
 */
export function MenuDrawerPanel({
  open,
  onClose,
  locale,
  variant = 'dark',
}: MenuDrawerPanelProps) {
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isAuthed = status === 'authenticated'
  const userName =
    profileName ||
    session?.user?.name ||
    session?.user?.email ||
    (isAuthed ? 'Account' : null)
  const isKo = locale === 'ko'
  const isInTarot = pathname?.startsWith('/tarot') ?? false
  const isLight = variant === 'light'

  useEffect(() => {
    if (!open) setLoginPanelOpen(false)
  }, [open])

  // session.user.name 은 OAuth cache 라 사용자가 프로필에서 이름 바꿔도
  // 안 갱신됨. drawer 열릴 때 /api/me/profile 의 최신 user.name 가져오기.
  useEffect(() => {
    if (!isAuthed) {
      setProfileName(null)
      return
    }
    if (!open) return
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
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const panelClass = isLight
    ? 'bg-white border-r border-[#e7e5e4] shadow-[4px_0_24px_rgba(0,0,0,0.08)]'
    : 'bg-gradient-to-b from-[#120c24] to-[#06040f] border-r border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)]'

  const headerBorderClass = isLight ? 'border-b border-[#e7e5e4]' : 'border-b border-white/8'

  const logoClass = isLight ? 'text-stone-900' : 'text-white'

  const iconBtnClass = isLight
    ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
    : 'text-white/85 hover:text-white hover:bg-white/10'

  const authRowClass = isLight
    ? 'bg-stone-100 text-stone-800'
    : 'bg-white/[0.04] text-white/90'

  const authBtnClass = isLight
    ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
    : 'bg-white/[0.04] text-white/90 hover:bg-white/[0.08]'

  const sectionTitleClass = isLight ? 'text-stone-500' : 'text-[rgba(232,204,138,0.55)]'

  const linkClass = isLight
    ? 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
    : 'text-white/90 hover:bg-white/[0.06]'

  const footerBorderClass = isLight ? 'border-t border-[#e7e5e4]' : 'border-t border-white/8'
  const footerTextClass = isLight ? 'text-stone-500' : 'text-white/45'
  const footerLinkHoverClass = isLight ? 'hover:text-stone-900' : 'hover:text-white/80'
  const overlayClass = isLight ? 'bg-stone-900/40' : 'bg-black/55'

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[var(--z-modal-backdrop)] backdrop-blur-sm ${overlayClass}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isKo ? '메뉴' : 'Menu'}
        className={`fixed top-0 left-0 bottom-0 z-[var(--z-modal)] w-[min(320px,86vw)]
          flex flex-col ${panelClass}`}
      >
        <div className={`flex items-center justify-between px-5 py-4 ${headerBorderClass}`}>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              onClick={onClose}
              aria-label={isKo ? '홈으로' : 'Home'}
              data-icon-only="true"
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full
                border-0 outline-none bg-transparent shadow-none transition-colors ${iconBtnClass}`}
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
            <span className={`font-bold tracking-wide ${logoClass}`}>DestinyPal</span>
          </div>
          <button
            type="button"
            data-icon-only="true"
            onClick={onClose}
            aria-label={isKo ? '닫기' : 'Close'}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full
              border-0 outline-none bg-transparent p-0 shadow-none cursor-pointer transition-colors ${iconBtnClass}`}
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
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${authRowClass}`}>
                <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                  👤
                </span>
                <span className="text-sm truncate">{userName}</span>
              </div>
            ) : !loginPanelOpen ? (
              <button
                type="button"
                onClick={() => setLoginPanelOpen(true)}
                aria-expanded={false}
                aria-controls="menu-drawer-login-panel"
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                  transition-colors text-left ${authBtnClass}`}
              >
                <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                  🔑
                </span>
                <span className="text-sm">{isKo ? '로그인' : 'Login'}</span>
              </button>
            ) : (
              <GoogleLoginPanel
                locale={isKo ? 'ko' : 'en'}
                callbackUrl="/"
                onLinkNavigate={onClose}
                panelId="menu-drawer-login-panel"
              />
            )}
          </div>

          <p
            className={`px-3 pt-2 pb-1 text-[11px] uppercase tracking-[0.12em] ${sectionTitleClass}`}
          >
            {isKo ? '서비스' : 'Services'}
          </p>
          {ENABLED_SERVICES.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${linkClass}`}
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

          <p
            className={`px-3 pt-4 pb-1 text-[11px] uppercase tracking-[0.12em] ${sectionTitleClass}`}
          >
            {isKo ? '계정' : 'Account'}
          </p>
          <Link
            href="/profile"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${linkClass}`}
          >
            <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
              👤
            </span>
            <span className="text-sm">{isKo ? '내 정보' : 'My Info'}</span>
          </Link>
          {isAuthed && isInTarot && (
            <Link
              href="/tarot/history"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${linkClass}`}
            >
              <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                🔮
              </span>
              <span className="text-sm">{isKo ? '타로 리딩 기록' : 'My Tarot Readings'}</span>
            </Link>
          )}
          <Link
            href="/pricing"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${linkClass}`}
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
                onClose()
                // Purge SW caches before sign-out so the next user on a
                // shared device can't see this user's data.
                void clearClientCacheAndSignOut(() => signOut({ callbackUrl: '/' }))
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left ${linkClass}`}
            >
              <span aria-hidden="true" className="inline-flex w-5 items-center justify-center">
                🚪
              </span>
              <span className="text-sm">{isKo ? '로그아웃' : 'Logout'}</span>
            </button>
          )}
        </div>

        <div
          className={`flex flex-wrap gap-x-4 gap-y-2 px-5 py-4 text-[11px] ${footerBorderClass} ${footerTextClass}`}
        >
          <Link href="/policy/terms" onClick={onClose} className={footerLinkHoverClass}>
            {isKo ? '이용약관' : 'Terms'}
          </Link>
          <Link href="/policy/privacy" onClick={onClose} className={footerLinkHoverClass}>
            {isKo ? '개인정보' : 'Privacy'}
          </Link>
          <Link href="/policy/refund" onClick={onClose} className={footerLinkHoverClass}>
            {isKo ? '환불 정책' : 'Refund'}
          </Link>
          <Link href="/about" onClick={onClose} className={footerLinkHoverClass}>
            {isKo ? '소개' : 'About'}
          </Link>
          <Link href="/faq" onClick={onClose} className={footerLinkHoverClass}>
            FAQ
          </Link>
          <Link href="/blog" onClick={onClose} className={footerLinkHoverClass}>
            {isKo ? '블로그' : 'Blog'}
          </Link>
          <Link href="/contact" onClick={onClose} className={footerLinkHoverClass}>
            {isKo ? '문의' : 'Contact'}
          </Link>
        </div>
      </aside>
    </>
  )
}
