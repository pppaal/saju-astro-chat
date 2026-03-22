'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import Link from 'next/link'
import styles from '../main-page.module.css'
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher'
import Card from '@/components/ui/Card'
import Grid from '@/components/ui/Grid'
import { ENABLED_SERVICES } from '@/config/enabledServices'
import NotificationBell from '@/components/notifications/NotificationBell'
import HeaderUser from '../HeaderUser'

interface MainHeaderProps {
  translate: (key: string, fallback: string) => string
  locale: 'en' | 'ko'
}

function MainHeader({ translate, locale }: MainHeaderProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [servicePage, setServicePage] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const navItemRef = useRef<HTMLDivElement>(null)
  const pageSize = 7
  const pageCount = Math.max(1, Math.ceil(ENABLED_SERVICES.length / pageSize))
  const maxPage = pageCount - 1

  const closeMenus = useCallback(() => {
    setActiveMenu(null)
    setIsMobileMenuOpen(false)
    setServicePage(0)
  }, [])

  useEffect(() => {
    if (servicePage > maxPage) {
      setServicePage(maxPage)
    }
  }, [servicePage, maxPage])

  useEffect(() => {
    if (!activeMenu && !isMobileMenuOpen) {
      return
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [activeMenu, closeMenus, isMobileMenuOpen])

  useEffect(() => {
    if (!activeMenu && !isMobileMenuOpen) {
      return
    }

    const handleScroll = () => {
      closeMenus()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [activeMenu, closeMenus, isMobileMenuOpen])

  return (
    <header ref={headerRef} className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.brandText}>DestinyPal</span>
      </div>

      <nav className={`${styles.nav} ${styles.desktopNav}`}>
        <Link href="/about" className={styles.navLink}>
          {translate('common.about', locale === 'ko' ? '소개' : 'About')}
        </Link>
        <div
          ref={navItemRef}
          className={styles.navItem}
          onMouseEnter={() => setActiveMenu('services')}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <button
            className={styles.navButton}
            onClick={() => setActiveMenu(activeMenu === 'services' ? null : 'services')}
          >
            {locale === 'ko' ? '서비스' : 'Services'}
          </button>
          {activeMenu === 'services' && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>
                  {locale === 'ko' ? '서비스' : 'Services'}
                </span>
                <span className={styles.dropdownSubtitle}>
                  {locale === 'ko' ? '주요 서비스를 둘러보세요' : 'Explore our services'}
                </span>
              </div>
              <Grid className={styles.dropdownGrid} columns={3}>
                {ENABLED_SERVICES.slice(servicePage * pageSize, (servicePage + 1) * pageSize).map(
                  (service) => {
                    const content = (
                      <div className={styles.dropItemLeft}>
                        <span className={styles.dropItemIcon}>{service.icon}</span>
                        <div className={styles.dropItemText}>
                          <span className={styles.dropItemLabel}>
                            {translate(
                              service.menuKey,
                              locale === 'ko' ? service.label.ko : service.label.en
                            )}
                          </span>
                          <span className={styles.dropItemDesc}>
                            {translate(
                              service.descriptionKey,
                              locale === 'ko' ? service.description.ko : service.description.en
                            )}
                          </span>
                        </div>
                      </div>
                    )

                    return (
                      <Card
                        as={Link}
                        key={service.href}
                        href={service.href}
                        className={styles.dropItem}
                      >
                        {content}
                      </Card>
                    )
                  }
                )}
              </Grid>

              {pageCount > 1 && (
                <div className={styles.dropdownPagination}>
                  <button
                    type="button"
                    className={`${styles.dropdownPageBtn} ${servicePage === 0 ? styles.disabled : ''}`}
                    onClick={() => setServicePage((prev) => Math.max(0, prev - 1))}
                    disabled={servicePage === 0}
                    aria-label="Previous page"
                  >
                    &#8249;
                  </button>
                  <div className={styles.dropdownPageDots}>
                    {Array.from({ length: pageCount }).map((_, idx) => (
                      <span
                        key={`page-dot-${idx}`}
                        className={`${styles.dropdownPageDot} ${servicePage === idx ? styles.active : ''}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`${styles.dropdownPageBtn} ${servicePage === maxPage ? styles.disabled : ''}`}
                    onClick={() => setServicePage((prev) => Math.min(maxPage, prev + 1))}
                    disabled={servicePage === maxPage}
                    aria-label="Next page"
                  >
                    &#8250;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Link href="/pricing" className={styles.navLink}>
          {translate('common.pricing', locale === 'ko' ? '요금' : 'Pricing')}
        </Link>
        <Link href="/blog" className={styles.navLink}>
          {translate('common.blog', locale === 'ko' ? '블로그' : 'Blog')}
        </Link>
        <Link href="/myjourney" className={styles.navLink}>
          {translate('app.myJourney', locale === 'ko' ? '나의 여정' : 'My Journey')}
        </Link>
      </nav>

      <div className={styles.headerLinks}>
        <span className={styles.headerBell}>
          <NotificationBell />
        </span>
        <LanguageSwitcher />
        <HeaderUser />
        <button
          type="button"
          className={styles.mobileMenuToggle}
          onClick={() => {
            setActiveMenu(null)
            setServicePage(0)
            setIsMobileMenuOpen((prev) => !prev)
          }}
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-mobile-menu"
          aria-label={locale === 'ko' ? '메뉴 열기' : 'Open menu'}
        >
          <span className={styles.mobileMenuBar} />
          <span className={styles.mobileMenuBar} />
          <span className={styles.mobileMenuBar} />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id="main-mobile-menu" className={styles.mobileMenuPanel}>
          <nav className={styles.mobileNav}>
            <Link href="/about" className={styles.mobileNavLink} onClick={closeMenus}>
              {translate('common.about', locale === 'ko' ? '소개' : 'About')}
            </Link>
            <Link href="/pricing" className={styles.mobileNavLink} onClick={closeMenus}>
              {translate('common.pricing', locale === 'ko' ? '요금' : 'Pricing')}
            </Link>
            <Link href="/blog" className={styles.mobileNavLink} onClick={closeMenus}>
              {translate('common.blog', locale === 'ko' ? '블로그' : 'Blog')}
            </Link>
            <Link href="/myjourney" className={styles.mobileNavLink} onClick={closeMenus}>
              {translate('app.myJourney', locale === 'ko' ? '나의 여정' : 'My Journey')}
            </Link>
          </nav>

          <div className={styles.mobileServicesSection}>
            <p className={styles.mobileServicesTitle}>
              {locale === 'ko' ? '주요 서비스' : 'Core Services'}
            </p>
            <div className={styles.mobileServicesGrid}>
              {ENABLED_SERVICES.map((service) => (
                <Link
                  key={service.href}
                  href={service.href}
                  className={styles.mobileServiceLink}
                  onClick={closeMenus}
                >
                  <span className={styles.mobileServiceIcon}>{service.icon}</span>
                  <span className={styles.mobileServiceText}>
                    {translate(
                      service.menuKey,
                      locale === 'ko' ? service.label.ko : service.label.en
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default memo(MainHeader)
