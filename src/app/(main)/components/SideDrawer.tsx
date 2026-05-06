'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
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

        {/* Auth row */}
        <div className={styles.drawerSection}>
          {isAuthed ? (
            <div className={styles.drawerLink} aria-disabled="true">
              <span className={styles.drawerLinkIcon}>👤</span>
              <span>{userName}</span>
            </div>
          ) : (
            <Link href="/auth/signin?callbackUrl=/" className={styles.drawerLink} onClick={onClose}>
              <span className={styles.drawerLinkIcon}>🔑</span>
              <span>{locale === 'ko' ? '로그인' : 'Login'}</span>
            </Link>
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
