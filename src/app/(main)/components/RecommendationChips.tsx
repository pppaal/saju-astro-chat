'use client'

import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildBirthQuery } from '../birthInfoStorage'
import { ENABLED_SERVICES } from '@/config/enabledServices'

interface RecommendationChipsProps {
  birthInfo: StoredBirthInfo | null
  locale: 'en' | 'ko'
}

export default function RecommendationChips({ birthInfo, locale }: RecommendationChipsProps) {
  const router = useRouter()

  const onChip = (href: string) => {
    const query = buildBirthQuery(birthInfo)
    const sep = href.includes('?') ? '&' : '?'
    router.push(query ? `${href}${sep}${query}` : href)
  }

  return (
    <div
      className={styles.homeChips}
      role="group"
      aria-label={locale === 'ko' ? '서비스' : 'Services'}
    >
      {ENABLED_SERVICES.map((service) => (
        <button
          key={service.id}
          type="button"
          className={styles.homeChip}
          onClick={() => onChip(service.href)}
        >
          <span className={styles.homeChipIcon} aria-hidden="true">
            {service.icon}
          </span>
          {locale === 'ko' ? service.label.ko : service.label.en}
        </button>
      ))}
    </div>
  )
}
