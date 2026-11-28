/**
 * 03 / 오늘 — 월 뷰모델의 오늘 단면(buildTodaySection): 후크(공유 카드와 같은 소스), 까치 한 줄
 * (행동 처방의 한 끗), 톤 카드(톤 단어 · 화해된 한 줄 + '왜' 한 줄), '왜 이런 날' 교차 행(= day.reason —
 * 일간 탭의 '왜'와 같은 행), '하루 전체 보기' · '오늘 공유하기' 줄. 계산하지 않는다.
 *
 * 톤 카드(DayToneCard)는 일간 탭(DayView)도 쓴다 — 같은 날의 카드가 두 탭에서 같다.
 */

import type { CSSProperties, ReactNode } from 'react'
import KkachiMark from '@/components/branding/KkachiMark'
import CrossCheckRow from '@/components/v9/CrossCheckRow'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import type { TodaySectionVM } from '@/lib/calendar-view/dayViewModel'
import { ShareDayButton } from '@/components/calendar/ShareDayButton'
import ArrowIcon from './ArrowIcon'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'

/**
 * 한 줄의 대략 너비(em) — 글자 종류별 폭의 합. 까치 한 줄 글자 크기를 이 값으로 줄여 문장을 그대로
 * 둔 채 한 줄에 맞춘다(FIX9 C3 · QA VC-11). 폭은 실제 v9Serif 이탤릭(EN) · v9Sans 500(KO)으로 엔진
 * 한 끗 문장 60개를 재서 맞췄다(어림 ÷ 실제 = EN 1.02–1.16, KO 1.04–1.05 — 늘 조금 넉넉). 그래도
 * 넘치면 줄이 바뀔 뿐 글이 잘리지 않는다.
 */
function voiceEm(text: string): number {
  const ko = /[\uAC00-\uD7A3]/.test(text) // 한국어 줄은 산세리프(.ko .voice)
  let em = 0
  for (const ch of text) {
    if (/[\uAC00-\uD7A3\u3130-\u318F\u4E00-\u9FFF]/.test(ch)) em += 1
    else if (ch === '—' || ch === '–') em += ko ? 1 : 0.8
    else if (ch === ' ' || /[.,:;’'‘!|·]/.test(ch)) em += ko ? 0.27 : 0.23
    else if (/[mwMW]/.test(ch)) em += 0.62
    else if (/[A-Z]/.test(ch)) em += 0.56
    else if (/[a-z]/.test(ch)) em += 0.39
    else if (/[0-9]/.test(ch)) em += 0.45
    else em += 0.5
  }
  return Math.round(em * 1.04 * 100) / 100
}

/** 까치 한 줄 — 24px 먹 마크 + 세리프 이탤릭 한 줄(긴 문장은 글자를 줄여 한 줄로). */
export function KkachiLine({ text }: { text: string }) {
  const style = { '--vem': voiceEm(text) } as CSSProperties
  return (
    <div className={s.kk} data-kkachi-line="">
      <KkachiMark size={22} className={s.kkAv} />
      <p className={s.voice} style={style}>
        {text}
      </p>
    </div>
  )
}

interface DayToneCardProps {
  today: TodaySectionVM
  locale: Lang
  isToday: boolean
  /** 카드 아래 줄들(하루 전체 보기 등) — 공유 줄 위에. */
  children?: ReactNode
}

/** 톤 카드 — 톤 단어 · 한 줄 · '왜 이런 날' 교차 행 · (줄 링크) · 공유 줄. */
export function DayToneCard({ today, locale, isToday, children }: DayToneCardProps) {
  const line = [today.line, today.why].filter(Boolean).join(' ')
  return (
    <div className={s.panel} data-tone-card="">
      <h3 className={s.h3}>{today.toneWord}</h3>
      {line ? <p className={s.sub}>{line}</p> : null}
      {today.reason ? (
        <div className={s.why} data-why-row="">
          <div className={s.lr}>
            <span>{pick(CAL_COPY.whyLabel, locale)}</span>
            <span>{today.shortDate}</span>
          </div>
          <CrossCheckRow
            kind="timing"
            first
            saju={today.reason.saju}
            stars={today.reason.stars}
            mark={today.reason.mark}
            note={today.reason.note}
            locale={locale}
          />
        </div>
      ) : null}
      {children}
      <ShareDayButton data={{ isKo: locale === 'ko', ...today.share }} isToday={isToday} />
    </div>
  )
}

interface TodayBlockProps {
  today: TodaySectionVM
  locale: Lang
  onOpenDay: () => void
}

export default function TodayBlock({ today, locale, onOpenDay }: TodayBlockProps) {
  return (
    <section className={s.sec} data-cal-section="today">
      <div className={s.lr}>
        <span>
          <i className={s.led} aria-hidden="true" />
          {fill(pick(CAL_COPY.todayPrefix, locale), { label: today.label })}
        </span>
        <span>{today.dateLabel}</span>
      </div>
      <h2 className={s.h2}>
        {today.headline}
        {today.subline ? <span className={s.lt}>{today.subline}</span> : null}
      </h2>
      {today.voice ? <KkachiLine text={today.voice} /> : null}
      <DayToneCard today={today} locale={locale} isToday>
        <button type="button" className={s.lrow} onClick={onOpenDay} data-open-day="">
          <span>
            <b>{pick(CAL_COPY.openDay, locale)}</b>
            <span className={s.s}>{pick(CAL_COPY.openDaySub, locale)}</span>
          </span>
          <ArrowIcon />
        </button>
      </DayToneCard>
    </section>
  )
}
