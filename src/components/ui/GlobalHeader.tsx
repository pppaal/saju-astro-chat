'use client'

import { Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { HamburgerDrawer } from './GlobalHeader/HamburgerDrawer'
import { CreditDisplay } from './GlobalHeader/CreditDisplay'
import { DropdownMenu } from './GlobalHeader/DropdownMenu'
import { useDropdownMenu } from './GlobalHeader/hooks'
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
  const { data: session, status } = useSession()

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }
  const nextLocaleLabel = locale === 'ko' ? 'EN' : 'KO'
  const localeAriaLabel = locale === 'ko' ? 'Switch to English' : '한국어로 전환'

  const isMainPage = !pathname || pathname === '/' || pathname === ''
  const isTarotReadingPage = Boolean(pathname && /^\/tarot\/[^/]+\/[^/]+/.test(pathname))
  // Pages with their own full-screen layouts (chat, calendar grid,
  // streaming reports) hide the global header to avoid clashing with
  // their own toolbars. Entry pages of those services now render the
  // global header instead so the hamburger and locale toggle stay
  // consistent.
  const hasCustomPageHeader = Boolean(
    pathname &&
    (
      [
        '/destiny-counselor/chat',
        '/destiny-map/counselor',
        '/destiny-map/result',
        '/astrology/counselor',
      ].includes(pathname) ||
      pathname.startsWith('/premium-reports/result') ||
      pathname.startsWith('/premium-reports/comprehensive') ||
      pathname.startsWith('/premium-reports/themed') ||
      pathname.startsWith('/premium-reports/timing') ||
      pathname.startsWith('/premium-reports/preview')
    )
  )
  const {
    showDropdown,
    setShowDropdown,
    focusedIndex,
    dropdownRef,
    triggerRef,
    menuItemsRef,
    menuItems,
    handleKeyDown,
  } = useDropdownMenu()

  const loading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const name =
    session?.user?.name ||
    session?.user?.email ||
    (isAuthenticated ? t('common.account') || 'Account' : null)

  const headerAriaLabel = t('nav.header') || 'Site header'

  // Hide on pages with their own top navigation/header
  if (isMainPage || hasCustomPageHeader) {
    return null
  }

  const localeButton = (
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
  )

  // Loading state
  if (loading) {
    return (
      <HeaderWrapper ariaLabel={headerAriaLabel}>
        <div className={styles.headerSlotLeft}>
          <HamburgerDrawer locale={locale} />
        </div>
        <div className={styles.headerSlotRight}>
          <div
            className="min-w-[80px] h-[34px] rounded-[20px] bg-blue-400/10 border border-transparent px-3.5 py-1.5"
            aria-hidden="true"
          />
        </div>
      </HeaderWrapper>
    )
  }

  // Not logged in — show language toggle (login lives in the side drawer)
  if (!isAuthenticated) {
    return (
      <HeaderWrapper ariaLabel={headerAriaLabel}>
        <div className={styles.headerSlotLeft}>
          <HamburgerDrawer locale={locale} />
        </div>
        <nav className={styles.headerSlotRight} aria-label={t('nav.main') || 'Main navigation'}>
          {localeButton}
        </nav>
      </HeaderWrapper>
    )
  }

  // Logged in
  return (
    <HeaderWrapper headerRef={dropdownRef} onKeyDown={handleKeyDown} ariaLabel={headerAriaLabel}>
      <div className={styles.headerSlotLeft}>
        <HamburgerDrawer locale={locale} />
      </div>
      <nav className={styles.headerSlotRight} aria-label={t('nav.main') || 'Main navigation'}>
        <button
          ref={triggerRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2.5 py-1.5 pl-2 pr-3.5 rounded-3xl
            border border-cyan-400/20 backdrop-blur-xl
            shadow-[0_2px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]
            cursor-pointer transition-all duration-200 hover:border-cyan-400/40
            focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            ${
              showDropdown
                ? 'bg-gradient-to-br from-cyan-400/20 to-blue-400/20'
                : 'bg-gradient-to-br from-cyan-400/[0.12] to-blue-400/[0.12] hover:from-cyan-400/20 hover:to-blue-400/20'
            }`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
          aria-controls="user-menu"
          aria-label={t('nav.userMenu') || `User menu for ${name}`}
        >
          <div
            className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 via-violet-400 to-green-400
              flex items-center justify-center text-[13px] font-bold text-white uppercase
              shadow-[0_2px_8px_rgba(99,210,255,0.3)]"
            aria-hidden="true"
          >
            {name?.charAt(0) || 'U'}
          </div>
          <span
            className="text-sm font-medium whitespace-nowrap tracking-[0.01em]
            bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent"
          >
            {name}
          </span>
          <div
            className="w-2 h-2 rounded-full bg-gradient-to-br from-green-500 to-green-400
              shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"
            aria-label={t('status.online') || 'Online'}
            role="status"
          />
        </button>
        {!isTarotReadingPage && <CreditDisplay />}
        {localeButton}
        {showDropdown && (
          <DropdownMenu items={menuItems} focusedIndex={focusedIndex} menuItemsRef={menuItemsRef} />
        )}
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
