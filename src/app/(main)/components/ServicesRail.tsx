'use client'

import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import { ENABLED_SERVICES } from '@/config/enabledServices'
import { buildBirthQuery, type StoredBirthInfo } from '../birthInfoStorage'

interface ServicesRailProps {
  birthInfo: StoredBirthInfo | null
  onOpenBirthModal: () => void
  locale: 'en' | 'ko'
}

/**
 * Compact horizontal rail of all 5 active services on the home page.
 * - With birthInfo: deep-links into the service with the birth query
 *   pre-filled, so the user doesn't get re-prompted on the inner page.
 * - Without birthInfo: opens the birth modal first.
 */
export default function ServicesRail({ birthInfo, onOpenBirthModal, locale }: ServicesRailProps) {
  const router = useRouter()

  const handleClick = (href: string) => {
    if (!birthInfo) {
      onOpenBirthModal()
      return
    }
    const query = buildBirthQuery(birthInfo)
    const sep = href.includes('?') ? '&' : '?'
    router.push(query ? `${href}${sep}${query}` : href)
  }

  return (
    <div className={styles.homeServicesRail} role="group" aria-label={locale === 'ko' ? '전체 서비스' : 'All services'}>
      {ENABLED_SERVICES.map((service) => (
        <button
          key={service.id}
          type="button"
          className={styles.homeServiceItem}
          onClick={() => handleClick(service.href)}
          aria-label={locale === 'ko' ? service.label.ko : service.label.en}
        >
          <span className={styles.homeServiceItemIcon} aria-hidden="true">
            {service.icon}
          </span>
          <span className={styles.homeServiceItemLabel}>
            {locale === 'ko' ? service.label.ko : service.label.en}
          </span>
        </button>
      ))}
    </div>
  )
}
