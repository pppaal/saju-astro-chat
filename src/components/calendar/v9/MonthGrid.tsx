'use client'

/**
 * 달력 그리드 — 뷰모델의 칸(monthViewModel.grid: 1일 앞 빈칸 · 요일 머리 · 칸마다 마크 · 지난 날 ·
 * 오늘 · 큰 날 · 최고의 날)을 그대로 그린다. 칸을 누르면 onTap(일) — 고른 날인지에 따른 동작
 * (gridTapIntent: 고르기 / 하루 전체로 들어가기)은 호출자가 정한다.
 *
 * 오늘은 1.5px 먹 고리 + LED — 조심 날이어도 조심 테 대신 오늘 고리(채움은 그대로). 고른 날은 칸
 * 아래 먹 막대로 오늘과 구분한다. 고른 날 상태는 호출자가 든다.
 *
 * 키보드(QA A11Y-7): 칸 30개가 탭 정지 하나다(roving tabindex — 고른 날, 없으면 오늘, 없으면 1일).
 * ←/→ 하루, ↑/↓ 한 주, Home/End 그 주의 처음·끝, Ctrl(⌘)+Home/End 그 달의 처음·끝 — 초점만
 * 옮기고 고르기는 Enter/Space(버튼 그대로). 스크린 리더 이름에 큰 날·지난 날도 싣는다(A11Y-2).
 */

import { useRef, useState, type KeyboardEvent } from 'react'
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

/** 키 → 옮겨 갈 날(그 달 안으로 자른다). 처리하지 않는 키는 null. */
export function gridKeyTarget(
  key: string,
  day: number,
  opts: { offset: number; days: number; ctrl?: boolean }
): number | null {
  const clamp = (d: number) => Math.min(opts.days, Math.max(1, d))
  // 칸의 요일 자리(0 = 줄의 첫 칸) — 1일 앞 빈칸(offset)만큼 민다.
  const col = (opts.offset + day - 1) % 7
  switch (key) {
    case 'ArrowLeft':
      return clamp(day - 1)
    case 'ArrowRight':
      return clamp(day + 1)
    case 'ArrowUp':
      return clamp(day - 7)
    case 'ArrowDown':
      return clamp(day + 7)
    case 'Home':
      return opts.ctrl ? 1 : clamp(day - col)
    case 'End':
      return opts.ctrl ? opts.days : clamp(day + (6 - col))
    default:
      return null
  }
}

export default function MonthGrid({ grid, selected, onTap, bestLabel, locale }: MonthGridProps) {
  const days = grid.cells.length
  const inMonth = (d: number) => d >= 1 && d <= days
  const todayD = grid.cells.find((c) => c.isToday)?.d
  const homeDay = inMonth(selected) ? selected : (todayD ?? 1)
  // 탭 정지 칸 — 화살표로 옮긴 날. 고른 날(homeDay)이 바뀌면 그 날로 돌아간다(이펙트 없이 —
  // 옮긴 날을 그때의 homeDay 와 함께 들고, homeDay 가 달라지면 무시).
  const [roving, setRoving] = useState({ home: homeDay, day: homeDay })
  const focusDay = roving.home === homeDay ? roving.day : homeDay
  const setFocusDay = (d: number) => setRoving({ home: homeDay, day: d })
  const btnRefs = useRef(new Map<number, HTMLButtonElement>())
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, d: number) => {
    const next = gridKeyTarget(e.key, d, {
      offset: grid.offset,
      days,
      ctrl: e.ctrlKey || e.metaKey,
    })
    if (next === null) return
    e.preventDefault()
    setFocusDay(next)
    btnRefs.current.get(next)?.focus()
  }
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
            aria-label={fill(pick(CAL_COPY.cellAria, locale), {
              label: c.read.label,
              verdict,
              keyDay: c.keyDay ? pick(CAL_COPY.cellKeyDay, locale) : '',
              past: c.past ? pick(CAL_COPY.cellPast, locale) : '',
            })}
            tabIndex={c.d === focusDay ? 0 : -1}
            ref={(el) => {
              if (el) btnRefs.current.set(c.d, el)
              else btnRefs.current.delete(c.d)
            }}
            onKeyDown={(e) => onKeyDown(e, c.d)}
            onFocus={() => setFocusDay(c.d)}
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
