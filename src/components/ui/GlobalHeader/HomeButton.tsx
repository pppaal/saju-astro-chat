'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { HomeIcon } from './icons'
import { styles } from './styles'

/**
 * Home button that hides on the home page
 */
export function HomeButton() {
  const pathname = usePathname()
  const { t } = useI18n()

  if (pathname === '/' || pathname === '') {
    return null
  }

  return (
    <Link
      href="/"
      className={`flex items-center justify-center w-9 h-9 rounded-full hover:scale-105
        ${styles.buttonBase} ${styles.blueButton}`}
      aria-label={t('nav.home') || 'Go to home page'}
    >
      <HomeIcon size={18} />
    </Link>
  )
}
