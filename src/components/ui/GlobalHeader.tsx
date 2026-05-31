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
    ['/destiny-counselor', '/astrology/counselor', '/compatibility/counselor'].includes(pathname)
  )

  // 라이트 페이지 위에 떴을 때 ink 톤으로 자동 전환. 다크 cosmic 페이지
  // (destiny-map, pricing, calendar 등) 에서는 기존 dark variant 유지.
  // /destiny-counselor 는 next.config redirects 로 /destiny-map 으로 영구 redirect
  // → 더 이상 LIGHT prefix 등록 불필요.
  const LIGHT_PAGE_PREFIXES = ['/profile', '/compatibility', '/about']
  const isLightPage = Boolean(
    pathname && LIGHT_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
  const variant: 'light' | 'dark' = isLightPage ? 'light' : 'dark'

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
        <HamburgerDrawer locale={locale} variant={variant} />
      </div>
      <nav className={styles.headerSlotRight} aria-label={t('nav.main') || 'Main navigation'}>
        <button
          type="button"
          onClick={toggleLocale}
          className={`text-[13px] font-semibold tracking-wide
            w-9 h-9 rounded-full backdrop-blur-md cursor-pointer
            inline-flex items-center justify-center ${styles.buttonBase} ${
              variant === 'light'
                ? 'bg-white/85 hover:bg-white text-[#1c1917] focus-visible:ring-[#a07a3c] focus-visible:ring-offset-[#fafaf9] shadow-[0_1px_2px_rgba(28,25,23,0.06)]'
                : `text-[#EAE6FF] ${styles.blueButton}`
            }`}
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
