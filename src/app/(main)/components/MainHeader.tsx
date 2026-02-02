'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styles from '../main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher'
import Card from '@/components/ui/Card'
import Grid from '@/components/ui/Grid'
import { SERVICE_LINKS } from '@/data/home'

const NotificationBell = dynamic(() => import('@/components/notifications/NotificationBell'), {
  ssr: false,
})
const HeaderUser = dynamic(() => import('../HeaderUser'), { ssr: false })

function MainHeader() {
  const { t } = useI18n()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [servicePage, setServicePage] = useState(0)
  const navItemRef = useRef<HTMLDivElement>(null)
  const pageSize = 7
  const pageCount = Math.max(1, Math.ceil(SERVICE_LINKS.length / pageSize))
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

  const translate = useCallback(
    (key: string, fallback: string) => {
      const res = t(key)
      const last = key.split('.').pop() || key
      return res === last ? fallback : res
    },
    [t]
  )

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
            {t('common.ourService')}
          </button>
          {activeMenu === 'services' && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>{t('services.title')}</span>
                <span className={styles.dropdownSubtitle}>{t('services.subtitle')}</span>
              </div>
              <Grid className={styles.dropdownGrid} columns={3}>
                {SERVICE_LINKS.slice(servicePage * pageSize, (servicePage + 1) * pageSize).map(
                  (s) => {
                    const content = (
                      <div className={styles.dropItemLeft}>
                        <span className={styles.dropItemIcon}>{s.icon}</span>
                        <div className={styles.dropItemText}>
                          <span className={styles.dropItemLabel}>
                            {t(`services.${s.key}.label`)}
                            {s.comingSoon && (
                              <span className={styles.comingSoonBadge}>
                                {t('common.comingSoon')}
                              </span>
                            )}
                          </span>
                          <span className={styles.dropItemDesc}>{t(`services.${s.key}.desc`)}</span>
                        </div>
                      </div>
                    )

                    return s.comingSoon ? (
                      <Card
                        key={s.href}
                        className={`${styles.dropItem} ${styles.dropItemDisabled}`}
                      >
                        {content}
                      </Card>
                    ) : (
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
                    ‹
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
                    ›
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
          {t('app.myJourney')}
        </Link>
        <Link href="/destiny-match" className={styles.navLink}>
          {t('app.destinyMatch')}
        </Link>
        <span className={`${styles.navLink} ${styles.navLinkDisabled}`}>
          {t('app.community')}
          <span className={styles.comingSoonBadgeSmall}>{t('common.comingSoon')}</span>
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
