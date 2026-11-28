/**
 * 홈 내비 — 왼쪽 워드마크(까치 + destinypal, '/' 링크), 오른쪽 mono 언어 토글과 알약 하나.
 * 손님은 'Sign in'(메뉴 드로어의 로그인 패널을 바로 연다), 로그인한 사람은 'Menu'(드로어).
 * 언어 토글의 이름은 'KO 한국어로 전환' / 'EN Switch to English' — 보이는 글자로 시작한다.
 * <header><nav> 안에 <a> 를 둔다 — e2e/homepage.spec 이 'nav a, header a' 를 센다.
 * 상태는 부모(MainPageClient)가 갖는다 — 여기엔 훅이 없다.
 */

import Link from 'next/link'
import KkachiMark from '@/components/branding/KkachiMark'
import { pick, type Lang } from '@/lib/i18n/bi'
import { HOME_COPY, LOCALE_TOGGLE } from './homeCopy'
import s from './home-v9.module.css'

interface HomeNavProps {
  locale: Lang
  isAuthed: boolean
  onToggleLocale: () => void
  /** 손님 — 로그인 패널이 열린 드로어. */
  onSignIn: () => void
  /** 로그인한 사람 — 드로어. */
  onMenu: () => void
}

export default function HomeNav({
  locale,
  isAuthed,
  onToggleLocale,
  onSignIn,
  onMenu,
}: HomeNavProps) {
  return (
    <header data-home-nav="">
      <nav className={s.nav}>
        <Link href="/" className={s.mark} aria-label={pick(HOME_COPY.homeAria, locale)}>
          <KkachiMark size={20} />
          destinypal
        </Link>
        <span className={s.navRight}>
          {/* 접근성 이름 = 보이는 글자(KO/EN) + 숨긴 설명 — 음성 제어로 'KO' 를 불러도 눌리게(WCAG 2.5.3).
              설명은 바꿀 언어로 쓰고 그 언어로 읽히게 lang 을 단다(3.1.2). */}
          <button type="button" className={s.loc} onClick={onToggleLocale}>
            {LOCALE_TOGGLE.short[locale]}
            <span className={s.sr} lang={locale === 'ko' ? 'en' : 'ko'}>
              {' '}
              {LOCALE_TOGGLE.aria[locale]}
            </span>
          </button>
          {isAuthed ? (
            <button type="button" className={s.pill} onClick={onMenu} aria-haspopup="dialog">
              {pick(HOME_COPY.menu, locale)}
            </button>
          ) : (
            <button type="button" className={s.pill} onClick={onSignIn} aria-haspopup="dialog">
              {pick(HOME_COPY.signIn, locale)}
            </button>
          )}
        </span>
      </nav>
    </header>
  )
}
