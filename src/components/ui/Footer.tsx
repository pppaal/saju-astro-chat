'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './Footer.module.css'

// Footer is hidden on the home page and on the 6 active service routes
// (and their subpaths). The disclaimer/links appearing below the fold makes
// every page feel "scrollable" on mobile even when the main content fits in
// the viewport. Policy pages, /about, /faq, /contact, /pricing, /profile,
// /auth, /admin, /blog still show the footer.
const HIDE_FOOTER_PREFIXES = [
  '/destiny-counselor',
  '/tarot',
  '/destinypal', // Phase D — canonical 5-tier fortune route (replaces /calendar)
  '/calendar', // Legacy alias → /destinypal (308 at edge); kept defensively
  '/compatibility',
  '/report',
  '/astrology/counselor',
]

export default function Footer() {
  const { translate, locale } = useI18n()
  const pathname = usePathname()
  const isKo = locale === 'ko'

  // Hide on home page (exact) and on service routes (prefix match).
  if (pathname === '/' || pathname === '') return null
  if (pathname && HIDE_FOOTER_PREFIXES.some((route) => pathname.startsWith(route))) {
    return null
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.links}>
          <Link href="/about" className={styles.link}>
            {translate('footer.about', 'About')}
          </Link>
          <Link href="/faq" className={styles.link}>
            {translate('footer.faq', 'FAQ')}
          </Link>
          <Link href="/contact" className={styles.link}>
            {translate('footer.contact', 'Contact')}
          </Link>
          <Link href="/policy/terms" className={styles.link}>
            {translate('footer.terms', 'Terms')}
          </Link>
          <Link href="/policy/privacy" className={styles.link}>
            {translate('footer.privacy', 'Privacy')}
          </Link>
          <Link href="/policy/refund" className={styles.link}>
            {translate('footer.refund', 'Refund')}
          </Link>
        </div>
        <div className={styles.copyright} suppressHydrationWarning>
          © {new Date().getFullYear()} DestinyPal. All rights reserved.
        </div>
        <div className={styles.disclaimer} suppressHydrationWarning>
          {translate(
            'footer.disclaimer',
            isKo
              ? '본 서비스의 모든 해석은 사주명리·점성술 전통에 기반한 *참고 자료*이며 미래를 단정·확정하지 않습니다. 중요한 의사결정은 본인의 판단과 전문가 상담을 함께 활용하세요.'
              : 'All readings are based on classical Saju and astrology as *reference material* — not predictions of fate. Use them alongside your own judgment and a qualified professional for important decisions.'
          )}
        </div>
        <div className={styles.mobileLegalOnly} aria-label="Legal links">
          <Link href="/policy/terms">{translate('footer.terms', 'Terms')}</Link>
          <Link href="/policy/privacy">{translate('footer.privacy', 'Privacy')}</Link>
          <Link href="/policy/refund">{translate('footer.refund', 'Refund')}</Link>
        </div>
      </div>
    </footer>
  )
}
