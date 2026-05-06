'use client'

import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildBirthQuery } from '../birthInfoStorage'

interface RecommendationChipsProps {
  birthInfo: StoredBirthInfo | null
  onOpenBirthModal: () => void
  locale: 'en' | 'ko'
}

interface Chip {
  icon: string
  label: { ko: string; en: string }
  href: (query: string) => string
}

const CHIPS: Chip[] = [
  {
    icon: '📅',
    label: { ko: '인생 흐름 보기', en: 'Lifetime flow' },
    href: (q) => `/premium-reports/themed?theme=career&period=lifetime&tier=premium${q ? `&${q}` : ''}`,
  },
  {
    icon: '💕',
    label: { ko: '올해 연애운', en: 'This year — love' },
    href: (q) => `/premium-reports/themed?theme=love&period=yearly&tier=premium${q ? `&${q}` : ''}`,
  },
  {
    icon: '💰',
    label: { ko: '이번 달 재물운', en: 'This month — wealth' },
    href: (q) => `/premium-reports/themed?theme=wealth&period=monthly&tier=premium${q ? `&${q}` : ''}`,
  },
]

export default function RecommendationChips({
  birthInfo,
  onOpenBirthModal,
  locale,
}: RecommendationChipsProps) {
  const router = useRouter()

  const onChip = (chip: Chip) => {
    if (!birthInfo) {
      onOpenBirthModal()
      return
    }
    const query = buildBirthQuery(birthInfo)
    router.push(chip.href(query))
  }

  return (
    <div className={styles.homeChips} role="group" aria-label={locale === 'ko' ? '추천' : 'Suggestions'}>
      {CHIPS.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          className={styles.homeChip}
          onClick={() => onChip(chip)}
        >
          <span className={styles.homeChipIcon} aria-hidden="true">
            {chip.icon}
          </span>
          {locale === 'ko' ? chip.label.ko : chip.label.en}
        </button>
      ))}
    </div>
  )
}
