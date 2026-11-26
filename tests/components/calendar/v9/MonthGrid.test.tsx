// tests/components/calendar/v9/MonthGrid.test.tsx
//
// 달력 그리드 — 오늘 = LED + 오늘 고리(조심 날이어도 조심 테 클래스 없음), 지난 날 = 모두 같은 흐림,
// 최고의 날 = 고리 클래스 + 'Best' 라벨, 고른 날 = 오늘과 다른 표시.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import MonthGrid, { gridKeyTarget } from '@/components/calendar/v9/MonthGrid'
import { buildMonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { makeV9Month, makeV9Day } from '../../../lib/calendar-view/_v9Month'

function gridOf(overrideToday?: 'caution') {
  const month = makeV9Month()
  if (overrideToday) {
    month.calendar = month.calendar.map((c) => (c.d === 19 ? { ...c, mark: overrideToday } : c))
  }
  return buildMonthViewModel(month, makeV9Day(), { lang: 'en' }).grid
}

const cell = (c: HTMLElement, d: number) => c.querySelector(`[data-day="${d}"]`) as HTMLElement

describe('MonthGrid', () => {
  it('오늘 칸에 LED, 조심 날이어도 조심 테 클래스가 없다(오늘 고리가 테)', () => {
    const { container } = render(
      <MonthGrid
        grid={gridOf('caution')}
        selected={19}
        onTap={() => {}}
        bestLabel="Best"
        locale="en"
      />
    )
    const today = cell(container, 19)
    expect(today.getAttribute('data-today')).toBe('')
    expect(today.getAttribute('aria-current')).toBe('date')
    expect(today.querySelector('[data-led]')).not.toBeNull()
    expect(today.className).toMatch(/_today_/)
    expect(today.className).not.toMatch(/_caution_/)
    expect(today.className).toMatch(/_cautionToday_/) // 채움은 그대로
    // 다른 조심 날은 조심 테 그대로.
    expect(cell(container, 20).className).toMatch(/_caution_/)
    // LED 는 오늘 하나뿐.
    expect(container.querySelectorAll('[data-led]')).toHaveLength(1)
  })

  it('지난 날(1–18)은 모두 같은 흐림 클래스, 오늘·이후는 없음', () => {
    const { container } = render(
      <MonthGrid grid={gridOf()} selected={19} onTap={() => {}} bestLabel="Best" locale="en" />
    )
    const pastClass = (d: number) => cell(container, d).className.match(/_past_\w+/)?.[0]
    const first = pastClass(1)
    expect(first).toBeTruthy()
    for (let d = 1; d <= 18; d++) {
      expect(cell(container, d).getAttribute('data-past')).toBe('')
      expect(pastClass(d)).toBe(first)
    }
    for (let d = 19; d <= 30; d++) expect(cell(container, d).getAttribute('data-past')).toBeNull()
  })

  it("최고의 날은 고리(best) 클래스 + 칸 아래 'Best' 라벨, 큰 날 별", () => {
    const { container } = render(
      <MonthGrid grid={gridOf()} selected={19} onTap={() => {}} bestLabel="Best" locale="en" />
    )
    const best = cell(container, 24)
    expect(best.getAttribute('data-best')).toBe('')
    expect(best.className).toMatch(/_best_/)
    expect(best.textContent).toContain('Best')
    expect(best.getAttribute('data-key-day')).toBe('')
    // 최고의 날이 든 줄은 BEST 자리를 남긴다.
    expect(best.className).toMatch(/_bestRow_/)
  })

  it('고른 날은 오늘과 다른 표시 — 오늘을 고른 상태엔 고른 날 표시가 없다', () => {
    const onTap = vi.fn()
    const { container, rerender } = render(
      <MonthGrid grid={gridOf()} selected={19} onTap={onTap} bestLabel="Best" locale="en" />
    )
    expect(container.querySelector('[data-selected]')).toBeNull()
    fireEvent.click(cell(container, 22))
    expect(onTap).toHaveBeenCalledWith(22)
    rerender(<MonthGrid grid={gridOf()} selected={22} onTap={onTap} bestLabel="Best" locale="en" />)
    const sel = cell(container, 22)
    expect(sel.getAttribute('data-selected')).toBe('')
    expect(sel.getAttribute('aria-pressed')).toBe('true')
    expect(sel.className).toMatch(/_sel_/)
    expect(sel.className).not.toMatch(/_today_/)
    expect(sel.querySelector('[data-led]')).toBeNull()
    const today = cell(container, 19)
    expect(today.className).not.toMatch(/_sel_/)
    expect(today.getAttribute('aria-pressed')).toBe('false')
  })

  it('1일 앞 빈칸 = offset, 요일 머리 7개, 칸 이름 = 날짜 · 판정', () => {
    const grid = gridOf()
    const { container } = render(
      <MonthGrid grid={grid} selected={19} onTap={() => {}} bestLabel="Best" locale="en" />
    )
    expect(container.querySelectorAll('button')).toHaveLength(30)
    // 큰 날 · 지난 날도 이름에(QA A11Y-2 — ✦ 와 45% 흐림은 화면에만 보인다).
    expect(cell(container, 17).getAttribute('aria-label')).toBe(
      'Nov 17 · Tue, Avoid, key day, past'
    )
    expect(cell(container, 19).getAttribute('aria-label')).toBe('Nov 19 · Thu, Today, Calm day')
    expect(grid.offset).toBe(0)
  })

  it('탭 정지는 하나 — 고른 날(없으면 오늘)만 tabIndex 0(QA A11Y-7)', () => {
    const { container, rerender } = render(
      <MonthGrid grid={gridOf()} selected={19} onTap={() => {}} bestLabel="Best" locale="en" />
    )
    const stops = () =>
      Array.from(container.querySelectorAll('button')).filter((b) => b.tabIndex === 0)
    expect(stops().map((b) => b.getAttribute('data-day'))).toEqual(['19'])
    rerender(
      <MonthGrid grid={gridOf()} selected={22} onTap={() => {}} bestLabel="Best" locale="en" />
    )
    expect(stops().map((b) => b.getAttribute('data-day'))).toEqual(['22'])
  })

  it('←/→ 하루, ↑/↓ 한 주, Home/End 그 주 — 초점만 옮기고 고르지 않는다', () => {
    const onTap = vi.fn()
    const { container } = render(
      <MonthGrid grid={gridOf()} selected={19} onTap={onTap} bestLabel="Best" locale="en" />
    )
    cell(container, 19).focus()
    fireEvent.keyDown(cell(container, 19), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cell(container, 20))
    expect(cell(container, 20).tabIndex).toBe(0)
    expect(cell(container, 19).tabIndex).toBe(-1)
    fireEvent.keyDown(cell(container, 20), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(cell(container, 27))
    fireEvent.keyDown(cell(container, 27), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(cell(container, 30)) // 그 달 끝에서 멈춘다
    fireEvent.keyDown(cell(container, 30), { key: 'Home', ctrlKey: true })
    expect(document.activeElement).toBe(cell(container, 1))
    expect(onTap).not.toHaveBeenCalled()
  })

  it('gridKeyTarget — 2026-11(1일 = 일요일, offset 0)', () => {
    const o = { offset: 0, days: 30 }
    expect(gridKeyTarget('ArrowLeft', 1, o)).toBe(1)
    expect(gridKeyTarget('ArrowUp', 5, o)).toBe(1)
    expect(gridKeyTarget('Home', 19, o)).toBe(15) // 19일(목) 줄의 일요일
    expect(gridKeyTarget('End', 19, o)).toBe(21)
    expect(gridKeyTarget('End', 29, o)).toBe(30) // 마지막 줄은 그 달 끝까지
    expect(gridKeyTarget('End', 19, { ...o, ctrl: true })).toBe(30)
    expect(gridKeyTarget('Home', 3, { offset: 3, days: 31 })).toBe(1)
    expect(gridKeyTarget('Enter', 3, o)).toBeNull()
  })
})
