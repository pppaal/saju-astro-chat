'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { HamburgerDrawer } from './GlobalHeader/HamburgerDrawer'
import { styles } from './GlobalHeader/styles'
import type { HeaderWrapperProps } from './GlobalHeader/types'

// ============================================
// Header Wrapper Component
// ============================================
function HeaderWrapper({ children, headerRef, onKeyDown, ariaLabel }: HeaderWrapperProps) {
  return (
    <header
      ref={headerRef}
      className={styles.header}
      role="banner"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {children}
    </header>
  )
}

// ============================================
// Main GlobalHeaderContent Component
// ============================================
function GlobalHeaderContent() {
  const { t, locale, setLocale } = useI18n()
  const pathname = usePathname()

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }
  const nextLocaleLabel = locale === 'ko' ? 'EN' : 'KO'
  const localeAriaLabel = locale === 'ko' ? 'Switch to English' : '한국어로 전환'

  const isMainPage = !pathname || pathname === '/' || pathname === ''
  const hasCustomPageHeader = Boolean(
    pathname &&
    (
      [
        '/destiny-counselor',
        '/destiny-counselor/chat',
        '/destiny-map/counselor',
        '/destiny-map/result',
        '/astrology/counselor',
        '/calendar',
      ].includes(pathname) ||
      pathname.startsWith('/calendar/') ||
      pathname.startsWith('/premium-reports/result') ||
      pathname.startsWith('/premium-reports/comprehensive') ||
      pathname.startsWith('/premium-reports/themed') ||
      pathname.startsWith('/premium-reports/timing') ||
      pathname.startsWith('/premium-reports/preview')
    )
  )

  const headerAriaLabel = t('nav.header') || 'Site header'

  // Hide on pages with their own top navigation/header
  if (isMainPage || hasCustomPageHeader) {
    return null
  }

  // Single header layout for everyone: hamburger left + locale toggle right.
  // Account / credits / dropdown all live inside the hamburger drawer to keep
  // the header visually clean.
  return (
    <HeaderWrapper ariaLabel={headerAriaLabel}>
      <div className={styles.headerSlotLeft}>
        <HamburgerDrawer locale={locale} />
      </div>
      <nav className={styles.headerSlotRight} aria-label={t('nav.main') || 'Main navigation'}>
        <button
          type="button"
          onClick={toggleLocale}
          className={`text-[#EAE6FF] text-sm font-semibold tracking-wide whitespace-nowrap
            px-3.5 py-1.5 rounded-[20px] backdrop-blur-md cursor-pointer border-blue-400/40
            ${styles.buttonBase} ${styles.blueButton}`}
          aria-label={localeAriaLabel}
          title={localeAriaLabel}
        >
          {nextLocaleLabel}
        </button>
      </nav>
    </HeaderWrapper>
  )
}

// ============================================
// Skeleton Component
// ============================================
function GlobalHeaderSkeleton() {
  return (
    <header className={styles.header} role="banner" aria-busy="true" aria-label="Loading header">
      <div
        className="min-w-[80px] h-[34px] rounded-[20px] bg-blue-400/10 border border-transparent px-3.5 py-1.5 animate-pulse"
        aria-hidden="true"
      />
    </header>
  )
}

// ============================================
// Export
// ============================================
export default function GlobalHeader() {
  return (
    <Suspense fallback={<GlobalHeaderSkeleton />}>
      <GlobalHeaderContent />
    </Suspense>
  )
}
