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
  // Pages with their own full-screen layouts (chat, calendar grid,
  // streaming reports) hide the global header to avoid clashing with
  // their own toolbars. Entry pages of those services now render the
  // global header instead so the hamburger and locale toggle stay
  // consistent.
  const hasCustomPageHeader = Boolean(
    pathname &&
    [
      '/destiny-map/counselor',
      '/destiny-map/result',
      '/astrology/counselor',
      '/compatibility/counselor',
    ].includes(pathname)
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
          className={`text-[#EAE6FF] text-[13px] font-semibold tracking-wide
            w-9 h-9 rounded-full backdrop-blur-md cursor-pointer border-blue-400/40
            inline-flex items-center justify-center
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
        className="w-9 h-9 rounded-full bg-blue-400/10 border border-transparent animate-pulse"
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
