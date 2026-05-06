'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import styles from '../main-page.module.css'
import { ENABLED_SERVICES } from '@/config/enabledServices'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  locale: 'en' | 'ko'
}

export default function SideDrawer({ open, onClose, locale }: SideDrawerProps) {
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'
  const userName = session?.user?.name || session?.user?.email || (isAuthed ? 'Account' : null)
  const isKo = locale === 'ko'

  // Inline Google sign-in panel — collapsed (just a 'Login' row) until the
  // user taps it. Resets every time the drawer closes so a returning user
  // always lands on the compact row first.
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (!open) {
      setLoginPanelOpen(false)
      return
    }
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

  return (
    <>
      <div
        className={`${styles.drawerOverlay} ${open ? styles.drawerOverlayOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={locale === 'ko' ? '메뉴' : 'Menu'}
        aria-hidden={!open}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLogo}>DestinyPal</span>
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={onClose}
            aria-label={locale === 'ko' ? '닫기' : 'Close'}
          >
            ×
          </button>
        </div>

        {/* Auth row — collapsed login pill expands inline so the user
            never leaves the home for /auth/signin. */}
        <div className={styles.drawerSection}>
          {isAuthed ? (
            <div className={styles.drawerLink} aria-disabled="true">
              <span className={styles.drawerLinkIcon}>👤</span>
              <span>{userName}</span>
            </div>
          ) : !loginPanelOpen ? (
            <button
              type="button"
              onClick={() => setLoginPanelOpen(true)}
              className={styles.drawerLink}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
              }}
              aria-expanded={false}
              aria-controls="home-drawer-login-panel"
            >
              <span className={styles.drawerLinkIcon}>🔑</span>
              <span>{isKo ? '로그인' : 'Login'}</span>
            </button>
          ) : (
            <div
              id="home-drawer-login-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                {isKo ? '로그인하고 계속하기' : 'Sign in to continue'}
              </p>
              <button
                type="button"
                disabled={!agreed}
                onClick={() => {
                  if (!agreed) return
                  void signIn('google', { callbackUrl: '/' })
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  background: agreed ? '#fff' : 'rgba(255,255,255,0.4)',
                  color: agreed ? '#0f172a' : '#334155',
                  cursor: agreed ? 'pointer' : 'not-allowed',
                  transition: 'background 120ms ease',
                }}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
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
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: 2, cursor: 'pointer' }}
                />
                <span>
                  {isKo ? '계속하면 ' : 'By continuing you agree to the '}
                  <Link
                    href="/policy/terms"
                    onClick={onClose}
                    style={{ color: '#67e8f9', textDecoration: 'none' }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {isKo ? '이용약관' : 'Terms'}
                  </Link>
                  {isKo ? ' 및 ' : ' and '}
                  <Link
                    href="/policy/privacy"
                    onClick={onClose}
                    style={{ color: '#67e8f9', textDecoration: 'none' }}
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

        {/* Services */}
        <div className={styles.drawerSection}>
          <p className={styles.drawerSectionTitle}>
            {locale === 'ko' ? '서비스' : 'Services'}
          </p>
          {ENABLED_SERVICES.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              className={styles.drawerLink}
              onClick={onClose}
            >
              <span className={styles.drawerLinkIcon}>{service.icon}</span>
              <span>{locale === 'ko' ? service.label.ko : service.label.en}</span>
            </Link>
          ))}
        </div>

        {/* Account */}
        <div className={styles.drawerSection}>
          <p className={styles.drawerSectionTitle}>
            {locale === 'ko' ? '계정' : 'Account'}
          </p>
          <Link href="/profile" className={styles.drawerLink} onClick={onClose}>
            <span className={styles.drawerLinkIcon}>📅</span>
            <span>{locale === 'ko' ? '내 생년월일 정보' : 'My Birth Info'}</span>
          </Link>
          <Link href="/pricing" className={styles.drawerLink} onClick={onClose}>
            <span className={styles.drawerLinkIcon}>💳</span>
            <span>{locale === 'ko' ? '요금제' : 'Pricing'}</span>
          </Link>
          {isAuthed && (
            <button
              type="button"
              className={styles.drawerLink}
              style={{ background: 'transparent', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}
              onClick={() => {
                onClose()
                void signOut({ callbackUrl: '/' })
              }}
            >
              <span className={styles.drawerLinkIcon}>🚪</span>
              <span>{locale === 'ko' ? '로그아웃' : 'Logout'}</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className={styles.drawerFooter}>
          <Link href="/policy/terms" className={styles.drawerFooterLink} onClick={onClose}>
            {locale === 'ko' ? '이용약관' : 'Terms'}
          </Link>
          <Link href="/policy/privacy" className={styles.drawerFooterLink} onClick={onClose}>
            {locale === 'ko' ? '개인정보' : 'Privacy'}
          </Link>
          <Link href="/policy/refund" className={styles.drawerFooterLink} onClick={onClose}>
            {locale === 'ko' ? '환불 정책' : 'Refund'}
          </Link>
          <Link href="/about" className={styles.drawerFooterLink} onClick={onClose}>
            {locale === 'ko' ? '소개' : 'About'}
          </Link>
          <Link href="/faq" className={styles.drawerFooterLink} onClick={onClose}>
            FAQ
          </Link>
          <Link href="/contact" className={styles.drawerFooterLink} onClick={onClose}>
            {locale === 'ko' ? '문의' : 'Contact'}
          </Link>
        </div>
      </aside>
    </>
  )
}
