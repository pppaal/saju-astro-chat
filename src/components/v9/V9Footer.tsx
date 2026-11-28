/**
 * v9 푸터 — 홈 · 인생 흐름 · 캘린더 공용. 면책 두 줄(또는 화면 고유 한 문장), 출처 줄
 * ('Math: our engine · Words in the counselor: AI' / '계산: 우리 엔진 · 상담의 말: AI'),
 * 워드마크, 링크(/pricing · /policy/privacy · /policy/terms · /policy/refund). 링크 이름은
 * 전역 Footer 의 footer.* 키와 같은 이름(FOOTER in v9Copy, ko 'Pricing' = '요금제').
 * 서버·클라이언트 공용.
 */

import Link from 'next/link'
import KkachiMark from '@/components/branding/KkachiMark'
import { CHROME, FOOTER, PROVENANCE, pick, type Lang } from './v9Copy'
import s from './V9Footer.module.css'

const LINKS = [
  { key: 'pricing', href: '/pricing' },
  { key: 'privacy', href: '/policy/privacy' },
  { key: 'terms', href: '/policy/terms' },
  { key: 'refund', href: '/policy/refund' },
] as const

interface V9FooterProps {
  locale: Lang
  /** 'A reading shows tendencies…' 대신 화면 고유 한 문장. */
  line?: string
  className?: string
}

export default function V9Footer({ locale, line, className }: V9FooterProps) {
  return (
    <footer className={[s.foot, className].filter(Boolean).join(' ')} data-v9-footer="">
      <p>
        {pick(FOOTER.reflection, locale)}
        <br />
        {line ?? pick(FOOTER.tendencies, locale)}
      </p>
      <p className={s.pv}>
        {pick(PROVENANCE.mathLabel, locale)}: <b>{pick(PROVENANCE.mathValue, locale)}</b>
        {' · '}
        {pick(PROVENANCE.wordsLabel, locale)}: <b>{pick(PROVENANCE.wordsValue, locale)}</b>
      </p>
      <div className={s.links}>
        <span className={s.wm}>
          <KkachiMark size={16} />
          {pick(CHROME.wordmark, locale)}
        </span>
        <nav aria-label={pick(FOOTER.nav, locale)}>
          {LINKS.map((l) => (
            <Link key={l.key} href={l.href}>
              {pick(FOOTER[l.key], locale)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
