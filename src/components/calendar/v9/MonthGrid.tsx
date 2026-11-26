/**
 * 달력 그리드 — 뷰모델의 칸(monthViewModel.grid: 1일 앞 빈칸 · 요일 머리 · 칸마다 마크 · 지난 날 ·
 * 오늘 · 큰 날 · 최고의 날)을 그대로 그린다. 칸을 누르면 onTap(일) — 고른 날인지에 따른 동작
 * (gridTapIntent: 고르기 / 하루 전체로 들어가기)은 호출자가 정한다.
 *
 * 오늘은 1.5px 먹 고리 + LED — 조심 날이어도 조심 테 대신 오늘 고리(채움은 그대로). 고른 날은 칸
 * 아래 먹 막대로 오늘과 구분한다. 서버·클라이언트 공용(훅 없음 — 고른 날 상태는 호출자가).
 */

import type { MonthGridCellVM, MonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import { CAL_COPY } from './calendarCopy'
import g from './MonthGrid.module.css'

interface MonthGridProps {
  grid: MonthViewModel['grid']
  /** 지금 고른 날(일). 오늘을 고른 상태면 고른 날 표시를 따로 그리지 않는다. */
  selected: number
  onTap: (d: number) => void
  /** 칸 아래 'Best' 라벨. */
  bestLabel: string
  locale: Lang
}

/** 칸의 채움 클래스 — 오늘 조심 날은 테 없는 채움(오늘 고리가 테). */
function fillClass(c: MonthGridCellVM): string {
  if (c.isToday && c.mark === 'caution') return g.cautionToday
  return g[c.mark] ?? ''
}

export default function MonthGrid({ grid, selected, onTap, bestLabel, locale }: MonthGridProps) {
  const best = grid.cells.find((c) => c.best)
  // 최고의 날이 든 줄(요일 머리 다음 줄부터 0) — 그 줄 칸들 아래에 BEST 자리를 둔다.
  const bestRow = best ? Math.floor((grid.offset + best.d - 1) / 7) : -1
  const rowOf = (d: number) => Math.floor((grid.offset + d - 1) / 7)
  return (
    <div className={g.days} role="group" aria-label={pick(CAL_COPY.gridAria, locale)}>
      {grid.weekdays.map((w, i) => (
        <span key={`wd-${i}`} className={g.wd} aria-hidden="true">
          {w}
        </span>
      ))}
      {Array.from({ length: grid.offset }).map((_, i) => (
        <span key={`pad-${i}`} className={g.pad} aria-hidden="true" />
      ))}
      {grid.cells.map((c) => {
        const sel = c.d === selected && !c.isToday
        const cls = [
          g.day,
          fillClass(c),
          c.isToday ? g.today : '',
          c.past ? g.past : '',
          sel ? g.sel : '',
          rowOf(c.d) === bestRow ? g.bestRow : '',
        ]
          .filter(Boolean)
          .join(' ')
        const verdict = c.isToday
          ? `${pick(CAL_COPY.today, locale)}, ${c.read.verdict}`
          : c.read.verdict
        return (
          <button
            key={c.ds}
            type="button"
            className={cls}
            data-day={c.d}
            data-mark={c.mark}
            data-today={c.isToday ? '' : undefined}
            data-past={c.past ? '' : undefined}
            data-selected={sel ? '' : undefined}
            data-best={c.best ? '' : undefined}
            data-key-day={c.keyDay ? '' : undefined}
            aria-pressed={c.d === selected}
            aria-current={c.isToday ? 'date' : undefined}
            aria-label={fill(pick(CAL_COPY.cellAria, locale), { label: c.read.label, verdict })}
            onClick={() => onTap(c.d)}
          >
            <span className={g.num}>{c.d}</span>
            {c.isToday ? <i className={g.led} data-led="" aria-hidden="true" /> : null}
            {c.keyDay ? <i className={g.kd} aria-hidden="true" /> : null}
            {c.best ? (
              <span className={g.bl} aria-hidden="true">
                {bestLabel}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
