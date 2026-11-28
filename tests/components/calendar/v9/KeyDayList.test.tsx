// tests/components/calendar/v9/KeyDayList.test.tsx
//
// 큰 날 — 다음에 올 큰 날이 처음부터 펼쳐져 '왜' 교차 행을 보이고, 지난 날을 펼치면 'PAST'.
// 끝 마크는 두 체계 모두 무거운 날만(▲ 좋음·최고 / ▼ 조심·피함), 아니면 —. 범례는 맨 아래 한 번.

import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import KeyDayList, {
  defaultExpandedKeyDay,
  keyDayDirection,
} from '@/components/calendar/v9/KeyDayList'
import { buildMonthViewModel, type KeyDayRowVM } from '@/lib/calendar-view/monthViewModel'
import { makeV9Month, makeV9Day, TODAY_REASON } from '../../../lib/calendar-view/_v9Month'

function rowsOf(lang: 'ko' | 'en' = 'en', withReason = true) {
  const month = makeV9Month()
  if (withReason) {
    // 24일(다음에 올 큰 날 — 최고의 날)에 '왜' 근거를 싣는다.
    month.calendar = month.calendar.map((c) => (c.d === 24 ? { ...c, reason: TODAY_REASON } : c))
  }
  return buildMonthViewModel(month, makeV9Day(), { lang }).keyDays
}

const row = (c: HTMLElement, ds: string) => c.querySelector(`[data-ds="${ds}"]`) as HTMLElement

describe('KeyDayList', () => {
  it('다음에 올 큰 날(지나지 않은 첫 줄 = 24일)이 처음부터 펼쳐져 교차 행을 보인다', () => {
    const rows = rowsOf()
    expect(defaultExpandedKeyDay(rows)).toBe('11-24')
    const { container } = render(<KeyDayList rows={rows} locale="en" />)
    const r24 = row(container, '11-24')
    expect(r24.getAttribute('data-expanded')).toBe('')
    const x = r24.querySelector('[data-kind="timing"]') as HTMLElement
    expect(x.getAttribute('data-mark')).toBe('up')
    expect(x.textContent).toContain('Direct Officer')
    // 지난 17일은 접혀 있다.
    expect(row(container, '11-17').getAttribute('data-expanded')).toBeNull()
  })

  it("지난 날 줄은 흐림, 펼치면 'PAST' 표지", () => {
    const { container } = render(<KeyDayList rows={rowsOf()} locale="en" />)
    const r17 = row(container, '11-17')
    expect(r17.getAttribute('data-past')).toBe('')
    expect(r17.className).toMatch(/_past_/)
    fireEvent.click(r17.querySelector('button') as HTMLElement)
    expect(r17.getAttribute('data-expanded')).toBe('')
    const tag = r17.querySelector('[data-tag]') as HTMLElement
    expect(tag.getAttribute('data-tag')).toBe('past')
    expect(tag.textContent).toBe('Past') // mono 캡스로 'PAST'
    expect(r17.querySelector('[data-kind="timing"]')?.getAttribute('data-mark')).toBe('down')
    // 다시 누르면 접힌다.
    fireEvent.click(r17.querySelector('button') as HTMLElement)
    expect(r17.getAttribute('data-expanded')).toBeNull()
  })

  it('근거가 없는 날은 펼칠 수 없다(버튼 없음)', () => {
    const { container } = render(<KeyDayList rows={rowsOf()} locale="en" />)
    expect(row(container, '11-05').querySelector('button')).toBeNull()
  })

  it('끝 마크 — 두 체계 모두 무거운 날만 방향, 덧붙인 최고의 날(한쪽)은 —', () => {
    const rows = rowsOf()
    const by = (ds: string) => rows.find((r) => r.ds === ds) as KeyDayRowVM
    expect(keyDayDirection(by('11-09'))).toBe('up')
    expect(keyDayDirection(by('11-14'))).toBe('down')
    expect(keyDayDirection(by('11-17'))).toBe('down')
    expect(keyDayDirection(by('11-05'))).toBeNull() // 잔잔
    expect(keyDayDirection(by('11-24'))).toBeNull() // 수렴 선정 아님(덧붙인 최고의 날)
    const { container } = render(<KeyDayList rows={rows} locale="en" />)
    expect(row(container, '11-09').querySelector('[data-dir]')?.getAttribute('data-dir')).toBe('up')
    expect(row(container, '11-24').querySelector('[data-dir]')?.getAttribute('data-dir')).toBe(
      'none'
    )
    expect(container.querySelectorAll('[data-legend]')).toHaveLength(1)
  })

  it('ko — 날짜 라벨 · 판정 단어 · 지난 날 표지가 한국어', () => {
    const { container } = render(<KeyDayList rows={rowsOf('ko')} locale="ko" />)
    const r17 = row(container, '11-17')
    expect(r17.textContent).toContain('11월 17일')
    expect(r17.textContent).toContain('피할 날')
    fireEvent.click(r17.querySelector('button') as HTMLElement)
    expect(r17.querySelector('[data-tag]')?.textContent).toBe('지난 날')
  })
})
