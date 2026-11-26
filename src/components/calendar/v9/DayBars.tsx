/**
 * 01 / 하루씩 — 30일 막대 판. 뷰모델(monthViewModel.bars · bestAnnotation · axisTicks)을 그대로
 * 그린다: 막대 높이 = 그날 점수, 색 = 그리드 마크(같은 부호), 지난 날 45%, 오늘 LED, 큰 날 별,
 * 'BEST · 24' 상자 주석, 축 눈금(1 · 8 · 15 · 오늘 · 최고 · 마지막). 계산하지 않는다.
 * 서버·클라이언트 공용(훅 없음).
 */

import type { CSSProperties } from 'react'
import type { MonthBarVM, MonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'
import b from './DayBars.module.css'

interface DayBarsProps {
  bars: MonthBarVM[]
  bestAnnotation: MonthViewModel['bestAnnotation']
  axisTicks: MonthViewModel['axisTicks']
  /** 'Nov 2026' — 판 오른쪽 아래. */
  monthShort: string
  locale: Lang
}

/** 막대 높이 — 판 높이의 90% 까지(위에 별·LED 자리를 남긴다). */
const barHeight = (h: number) => `${Math.max(4, Math.round(Math.min(1, Math.max(0, h)) * 90))}%`

export default function DayBars({
  bars,
  bestAnnotation,
  axisTicks,
  monthShort,
  locale,
}: DayBarsProps) {
  const n = Math.max(1, bars.length)
  const cols: CSSProperties = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
  const today = bars.find((x) => x.isToday)
  // 주석 자리 — 그 막대 칸 가운데. 가장자리 칸이면 판 밖으로 나가지 않게 안쪽으로.
  const annLeft = bestAnnotation
    ? `${Math.min(90, Math.max(10, ((bestAnnotation.d - 0.5) / n) * 100))}%`
    : ''
  return (
    <div className={b.plate} data-cal-bars="">
      <span className={`${b.cl} ${b.a}`} aria-hidden="true">
        {pick(CAL_COPY.barsA, locale)}
      </span>
      <span className={`${b.cl} ${b.b}`} aria-hidden="true">
        {pick(CAL_COPY.barsB, locale)}
      </span>
      <div className={b.wrap}>
        {bestAnnotation ? (
          <span className={b.ann} style={{ left: annLeft }} data-ann="best">
            {bestAnnotation.label}
          </span>
        ) : null}
        <div
          className={b.bars}
          style={cols}
          role="img"
          aria-label={pick(CAL_COPY.barsAria, locale)}
        >
          {bars.map((bar) => (
            <span
              key={bar.ds}
              className={[b.col, bar.past ? b.past : ''].filter(Boolean).join(' ')}
              data-day={bar.d}
              data-mark={bar.mark}
              data-past={bar.past ? '' : undefined}
              data-today={bar.isToday ? '' : undefined}
            >
              {bar.isToday ? (
                <i className={b.led} data-led="" />
              ) : bar.keyDay ? (
                <i className={b.kd} />
              ) : null}
              <i
                className={[b.db, b[bar.mark], bar.isToday ? b.today : '']
                  .filter(Boolean)
                  .join(' ')}
                style={{ height: barHeight(bar.height) }}
              />
            </span>
          ))}
        </div>
      </div>
      <div className={b.axis} style={cols} aria-hidden="true">
        {axisTicks.map((t) => (
          <span key={t.d} className={t.today ? b.td : undefined} style={{ gridColumn: t.d }}>
            {t.d}
          </span>
        ))}
      </div>
      {today ? (
        <span className={`${b.cl} ${b.c}`}>
          <i className={b.led} aria-hidden="true" />
          {fill(pick(CAL_COPY.todayChip, locale), { d: today.d })}
        </span>
      ) : null}
      <span className={`${b.cl} ${b.d}`} aria-hidden="true">
        {monthShort}
      </span>
    </div>
  )
}
