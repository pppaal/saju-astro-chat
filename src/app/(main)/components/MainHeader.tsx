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
  const navItemRef = useRef<HTMLDivElement>(null)
  const pageSize = 7
  const pageCount = Math.max(1, Math.ceil(ENABLED_SERVICES.length / pageSize))
  const maxPage = pageCount - 1

  const closeMenu = useCallback(() => {
    setActiveMenu(null)
    setServicePage(0) // Reset page when closing
  }, [])

  useEffect(() => {
    if (servicePage > maxPage) {
      setServicePage(maxPage)
    }
  }, [servicePage, maxPage])

  // Close dropdown when clicking outside (for mobile)
  useEffect(() => {
    if (!activeMenu) {
      return
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (navItemRef.current && !navItemRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [activeMenu, closeMenu])

  // Close dropdown when scrolling
  useEffect(() => {
    if (!activeMenu) {
      return
    }

    const handleScroll = () => {
      closeMenu()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [activeMenu, closeMenu])

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.brandText}>DestinyPal</span>
      </div>
      <nav className={styles.nav}>
        <Link href="/about" className={styles.navLink}>
          {translate('common.about', 'About')}
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
            {translate('common.ourService', 'Services')}
          </button>
          {activeMenu === 'services' && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>
                  {translate('services.title', 'Services')}
                </span>
                <span className={styles.dropdownSubtitle}>
                  {translate('services.subtitle', 'Explore our services')}
                </span>
              </div>
              <Grid className={styles.dropdownGrid} columns={3}>
                {ENABLED_SERVICES.slice(servicePage * pageSize, (servicePage + 1) * pageSize).map(
                  (s) => {
                    const content = (
                      <div className={styles.dropItemLeft}>
                        <span className={styles.dropItemIcon}>{s.icon}</span>
                        <div className={styles.dropItemText}>
                          <span className={styles.dropItemLabel}>
                            {translate(s.menuKey, locale === 'ko' ? s.label.ko : s.label.en)}
                          </span>
                          <span className={styles.dropItemDesc}>
                            {translate(
                              s.descriptionKey,
                              locale === 'ko' ? s.description.ko : s.description.en
                            )}
                          </span>
                        </div>
                      </div>
                    )

                    return (
                      <Card as={Link} key={s.href} href={s.href} className={styles.dropItem}>
                        {content}
                      </Card>
                    )
                  }
                )}
              </Grid>

              {/* Page Navigation */}
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
          {translate('common.pricing', 'Pricing')}
        </Link>
        <Link href="/blog" className={styles.navLink}>
          {translate('common.blog', 'Blog')}
        </Link>
        <Link href="/myjourney" className={styles.navLink}>
          {translate('app.myJourney', 'My Journey')}
        </Link>
        <span className={`${styles.navLink} ${styles.navLinkDisabled}`}>
          {translate('app.community', 'Community')}
          <span className={styles.comingSoonBadgeSmall}>
            {translate('common.comingSoon', 'Coming Soon')}
          </span>
        </span>
      </nav>
      <div className={styles.headerLinks}>
        <NotificationBell />
        <LanguageSwitcher />
        <HeaderUser />
      </div>
    </header>
  )
}

// Memoize MainHeader to prevent unnecessary re-renders
export default memo(MainHeader)
