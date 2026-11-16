'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { stripLocalePrefix } from '@/i18n/utils'
import styles from './Footer.module.css'

// Footer is hidden on the immersive service routes (and their subpaths): the
// disclaimer/links appearing below the fold makes every page feel "scrollable"
// on mobile even when the main content fits in the viewport. The home page,
// policy pages, /about, /faq, /contact, /pricing, /profile, /auth, /admin and
// /blog show the footer — the home page in particular needs the crawlable
// "Explore" block so search engines reach the SEO families from the root.
const HIDE_FOOTER_PREFIXES = [
  '/destiny-counselor',
  '/tarot',
  '/calendar', // canonical 캘린더(운흐름) route
  '/destiny', // 인생 흐름(인생·대운·년) full-screen 줌 셸 (·-counselor·pal 도 포함)
  '/destinypal', // legacy alias → /calendar (308 at edge)
  '/compatibility',
  '/report',
  '/astrology/counselor',
]

// 크롤러가 JS 없이 따라갈 수 있는 "Explore" 링크 블록 — 영어 우선 SEO/GEO 허브.
// 라벨은 translate() 로 가져오되 영어 폴백을 항상 둔다(사전 미로드 시에도 영어 노출).
const EXPLORE_LINKS: ReadonlyArray<{ href: string; key: string; fallback: string }> = [
  { href: '/horoscope', key: 'footer.dailyHoroscope', fallback: 'Daily Horoscope' },
  {
    href: '/compatibility/signs',
    key: 'footer.zodiacCompatibility',
    fallback: 'Zodiac Compatibility',
  },
  { href: '/tarot/cards', key: 'footer.tarotCardMeanings', fallback: 'Tarot Card Meanings' },
  { href: '/fortune', key: 'footer.koreanZodiacToday', fallback: 'Korean Zodiac Today' },
  { href: '/integrated-report', key: 'footer.freeBirthChart', fallback: 'Free Birth Chart' },
  {
    href: '/compatibility/free',
    key: 'footer.compatibilityReport',
    fallback: 'Compatibility Report',
  },
  { href: '/tarot/daily', key: 'footer.todaysTarot', fallback: "Today's Tarot" },
  { href: '/blog', key: 'footer.guides', fallback: 'Guides' },
  { href: '/method', key: 'footer.howItWorks', fallback: 'How it works' },
  { href: '/free', key: 'footer.freeTools', fallback: 'Free tools' },
]

export default function Footer() {
  const { translate, locale } = useI18n()
  // /ko/... 한국어 URL 도 베어 경로와 같은 판정을 받도록 프리픽스를 벗긴다.
  const pathname = stripLocalePrefix(usePathname())
  const isKo = locale === 'ko'

  // Home is a fixed, one-screen app shell (.homeContainer is position: fixed),
  // so a footer in the document flow would only paint underneath it and add a
  // phantom outer scroll. Home carries its own crawlable Explore row instead
  // (MainPageClient). Immersive service routes are hidden by prefix match.
  if (pathname === '/' || HIDE_FOOTER_PREFIXES.some((route) => pathname.startsWith(route))) {
    return null
  }

  const exploreLabel = translate('footer.explore', 'Explore')

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <nav className={styles.explore} aria-label={exploreLabel}>
          <span className={styles.exploreTitle}>{exploreLabel}</span>
          <ul className={styles.exploreList}>
            {EXPLORE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.exploreLink}>
                  {translate(item.key, item.fallback)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
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
