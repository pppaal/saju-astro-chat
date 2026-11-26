/**
 * 03 / 오늘 — 월 뷰모델의 오늘 단면(buildTodaySection): 후크(공유 카드와 같은 소스), 까치 한 줄
 * (행동 처방의 한 끗), 톤 카드(톤 단어 · 화해된 한 줄 + '왜' 한 줄), '왜 이런 날' 교차 행(= day.reason —
 * 일간 탭의 '왜'와 같은 행), '하루 전체 보기' · '오늘 공유하기' 줄. 계산하지 않는다.
 *
 * 톤 카드(DayToneCard)는 일간 탭(DayView)도 쓴다 — 같은 날의 카드가 두 탭에서 같다.
 */

import type { ReactNode } from 'react'
import KkachiMark from '@/components/branding/KkachiMark'
import CrossCheckRow from '@/components/v9/CrossCheckRow'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import type { TodaySectionVM } from '@/lib/calendar-view/dayViewModel'
import { ShareDayButton } from '@/components/calendar/ShareDayButton'
import ArrowIcon from './ArrowIcon'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'

/** 까치 한 줄 — 24px 먹 마크 + 세리프 이탤릭 한 줄. */
export function KkachiLine({ text }: { text: string }) {
  return (
    <div className={s.kk} data-kkachi-line="">
      <KkachiMark size={22} className={s.kkAv} />
      <p className={s.voice}>{text}</p>
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
