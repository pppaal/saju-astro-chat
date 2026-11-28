/**
 * 월간 히어로 — 먹 띠: 까치 한 줄 + 算 도장, 모서리 줄('THE MONTH | November 2026'), H1(공유 후크와
 * 같은 소스 — monthShareHook), 리드(후크 둘째 줄), 그 아래 한 달 읽기 · 날 수(children = MonthRead).
 * 일간 히어로(DayView)도 같은 띠를 쓴다(byline · 모서리 줄 · H1 만 다름). 서버·클라이언트 공용.
 */

import type { ReactNode } from 'react'
import KkachiMark from '@/components/branding/KkachiMark'
import { pick, PROVENANCE, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'

interface HeroBandProps {
  /** 모서리 줄 왼쪽 · 오른쪽. */
  corner: { left: ReactNode; right: ReactNode }
  headline: string
  subline?: string
  locale: Lang
  /** 섹션 표지(data-cal-section). */
  section: string
  children?: ReactNode
}

/**
 * 대시(—) 앞 공백을 줄바꿈 없는 공백으로 — 줄이 '— today turns…' 처럼 대시로 열리지 않고 대시가 앞
 * 낱말 끝에 붙는다(QA R-VC-7). 후크 문장 원본(shareHook)은 공유 카드와 같이 쓰니 화면에서만 붙인다.
 */
function glueDash(text: string): string {
  return text.replace(/ —/g, '\u00a0—')
}

/** 먹 띠 히어로 — 월간 · 일간 공용 틀. */
export function HeroBand({ corner, headline, subline, locale, section, children }: HeroBandProps) {
  return (
    <section className={s.band} data-cal-section={section} aria-labelledby="cal-h1">
      <div className={s.hby}>
        <KkachiMark size={24} light="var(--ink)" className={s.av} />
        <span>{pick(CAL_COPY.byline, locale)}</span>
        <span className={s.stamp}>
          {pick(CAL_COPY.computed, locale)}
          <span className={s.seal} role="img" aria-label={pick(PROVENANCE.seal, locale)}>
            算
          </span>
        </span>
      </div>
      <div className={`${s.lr} ${s.lrDark}`}>
        <span>{corner.left}</span>
        <span>{corner.right}</span>
      </div>
      {/* tabIndex -1 — 보기가 갈아끼워지면 CalendarClient 가 여기로 초점을 옮긴다(QA A11Y-1). */}
      <h1 id="cal-h1" className={s.h1} tabIndex={-1}>
        {glueDash(headline)}
      </h1>
      {subline ? <p className={s.lede}>{glueDash(subline)}</p> : null}
      {children}
    </section>
  )
}

interface MonthHeroProps {
  monthLabel: string
  headline: string
  subline?: string
  locale: Lang
  children?: ReactNode
}

export default function MonthHero({
  monthLabel,
  headline,
  subline,
  locale,
  children,
}: MonthHeroProps) {
  return (
    <HeroBand
      section="month-hero"
      corner={{ left: pick(CAL_COPY.theMonth, locale), right: monthLabel }}
      headline={headline}
      subline={subline}
      locale={locale}
    >
      {children}
    </HeroBand>
  )
}
