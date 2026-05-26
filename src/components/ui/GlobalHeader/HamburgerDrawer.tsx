'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import { ENABLED_SERVICES } from '@/config/enabledServices'

interface HamburgerDrawerProps {
  locale: 'en' | 'ko'
}

export function HamburgerDrawer({ locale }: HamburgerDrawerProps) {
  const [open, setOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'
  const userName = session?.user?.name || session?.user?.email || (isAuthed ? 'Account' : null)
  const isKo = locale === 'ko'

  // Reset the login panel collapsed state every time the drawer closes so
  // a returning user always sees the compact "로그인" row first.
  useEffect(() => {
    if (!open) setLoginPanelOpen(false)
  }, [open])

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
        className={`flex flex-col items-center justify-center gap-[5px] w-10 h-10 rounded-full
          backdrop-blur-md cursor-pointer transition-colors
          focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2
          focus-visible:ring-offset-slate-900 ${
            isAuthed
              ? 'border border-violet-300/45 bg-violet-500/20 hover:bg-violet-500/30 hover:border-violet-300/70 shadow-[0_0_16px_rgba(139,92,246,0.4)]'
              : 'border border-white/20 bg-black/40 hover:bg-white/10 hover:border-white/40'
          }`}
      >
        <span className={`block w-4 h-[2px] rounded ${isAuthed ? 'bg-violet-200' : 'bg-white'}`} />
        <span className={`block w-4 h-[2px] rounded ${isAuthed ? 'bg-violet-200' : 'bg-white'}`} />
        <span className={`block w-4 h-[2px] rounded ${isAuthed ? 'bg-violet-200' : 'bg-white'}`} />
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
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full
                    border border-white/15 bg-white/5 text-white/85
                    hover:text-white hover:bg-white/10 transition-colors"
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
                className="inline-flex items-center justify-center w-8 h-8 rounded-full
                  border border-white/15 bg-white/5 text-white/85
                  hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
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
                    <span aria-hidden="true">👤</span>
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
                    <span aria-hidden="true">🔑</span>
                    <span className="text-sm">{isKo ? '로그인' : 'Login'}</span>
                  </button>
                ) : (
                  <div
                    id="drawer-login-panel"
                    className="flex flex-col gap-2 px-3 py-3 rounded-xl bg-white/[0.04]"
                  >
                    <p className="text-[13px] font-medium text-white/90">
                      {isKo ? '로그인하고 계속하기' : 'Sign in to continue'}
                    </p>
                    <button
                      type="button"
                      disabled={!agreed}
                      onClick={() => {
                        if (!agreed) return
                        void signIn('google', { callbackUrl: '/' })
                      }}
                      className={`flex items-center justify-center gap-2 w-full px-3 py-2.5
                        rounded-lg text-sm font-medium transition-colors
                        ${
                          agreed
                            ? 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                            : 'bg-white/40 text-slate-700 cursor-not-allowed'
                        }`}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {isKo ? 'Google로 로그인' : 'Continue with Google'}
                    </button>
                    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-white/65">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 cursor-pointer"
                      />
                      <span>
                        {isKo ? '계속하면 ' : 'By continuing you agree to the '}
                        <Link
                          href="/policy/terms"
                          onClick={close}
                          className="text-cyan-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {isKo ? '이용약관' : 'Terms'}
                        </Link>
                        {isKo ? ' 및 ' : ' and '}
                        <Link
                          href="/policy/privacy"
                          onClick={close}
                          className="text-cyan-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {isKo ? '개인정보 처리방침' : 'Privacy'}
                        </Link>
                        {isKo ? '에 동의합니다.' : '.'}
                      </span>
                    </label>
                  </div>
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
                <span aria-hidden="true">👤</span>
                <span className="text-sm">{isKo ? '내 정보' : 'My Info'}</span>
              </Link>
              {isAuthed && (
                <Link
                  href="/tarot/history"
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/[0.06]"
                >
                  <span aria-hidden="true">🔮</span>
                  <span className="text-sm">
                    {isKo ? '타로 리딩 기록' : 'My Tarot Readings'}
                  </span>
                </Link>
              )}
              <Link
                href="/pricing"
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/[0.06]"
              >
                <span aria-hidden="true">💳</span>
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
