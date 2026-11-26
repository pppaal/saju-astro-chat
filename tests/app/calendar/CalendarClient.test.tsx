// tests/app/calendar/CalendarClient.test.tsx
//
// v9.2 운세 달력 틀 — 월간 | 일간 스위치, 탭 기억('dp_tier', try/catch), 재탭·'하루 전체 보기'로
// 일간 전환, 다른 날은 /api/calendar/day 의 일 뷰모델로 갈아끼움(오늘은 네트워크 없이), 실패 시
// 다시 시도. 옛 CalendarClient(줌 셸)의 day fetch · cache · seq 가드 동작을 옮겼다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('date=1997-03-21&lat=37.5665'),
}))

import CalendarClient, { readStoredTab } from '@/app/calendar/CalendarClient'
import { buildMonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { buildDayViewModel } from '@/lib/calendar-view/dayViewModel'
import { makeV9Month, makeV9Day } from '../../lib/calendar-view/_v9Month'

const monthVm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
const dayVm = buildDayViewModel(makeV9Day(), { lang: 'en', sex: '여', isToday: true })
const day24 = buildDayViewModel(makeV9Day({ date: '2026-11-24' }), {
  lang: 'en',
  sex: '여',
  isToday: false,
})

function renderClient() {
  return render(
    <CalendarClient
      locale="en"
      monthVm={monthVm}
      dayVm={dayVm}
      chipStamp="1997.3.21 · Seoul"
      folioStamp="1997.3.21 14:30 · Seoul"
      folioRight="Sample"
      dayMaster={{ stem: '壬', element: 'water' }}
      dayFetchParams={{ tz: 'Asia/Seoul' }}
    />
  )
}

const seg = (c: HTMLElement, label: string) =>
  Array.from(c.querySelectorAll('[role="group"] button')).find(
    (b) => b.textContent === label
  ) as HTMLElement
const view = (c: HTMLElement) => c.querySelector('[data-cal-view]')?.getAttribute('data-cal-view')
const cellOf = (c: HTMLElement, d: number) =>
  c.querySelector(`[data-cal-section="days"] button[data-day="${d}"]`) as HTMLElement

describe('CalendarClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    window.localStorage.clear()
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { vm: day24 } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('상단 바 · 폴리오 두 번 · 스위치(월간 기본) · 푸터', () => {
    const { container } = renderClient()
    expect(container.querySelector('[data-v9-topbar]')?.textContent).toContain('Fortune calendar')
    expect(container.querySelectorAll('[data-folio]')).toHaveLength(2)
    expect(seg(container, 'Monthly').getAttribute('aria-pressed')).toBe('true')
    expect(view(container)).toBe('month')
    expect(container.querySelector('[data-v9-footer]')).not.toBeNull()
  })

  it("탭 기억 — 'day' 를 복원하고, 스위치를 누르면 저장한다", async () => {
    window.localStorage.setItem('dp_tier', 'day')
    const { container } = renderClient()
    await waitFor(() => expect(view(container)).toBe('day'))
    fireEvent.click(seg(container, 'Monthly'))
    expect(view(container)).toBe('month')
    expect(window.localStorage.getItem('dp_tier')).toBe('month')
  })

  it('readStoredTab — 옛 셸 숫자(1 = 일)도 읽고, 저장소 오류는 null', () => {
    window.localStorage.setItem('dp_tier', '1')
    expect(readStoredTab()).toBe('day')
    window.localStorage.setItem('dp_tier', 'zoom')
    expect(readStoredTab()).toBeNull()
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredTab()).toBeNull()
    spy.mockRestore()
  })

  it("오늘의 '하루 전체 보기' — 네트워크 없이 일간(오늘)", () => {
    const { container } = renderClient()
    fireEvent.click(
      container.querySelector('[data-cal-section="today"] [data-open-day]') as HTMLElement
    )
    expect(view(container)).toBe('day')
    expect(container.querySelector('[data-cal-view="day"]')?.getAttribute('data-iso')).toBe(
      '2026-11-19'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('다른 날 재탭 → /api/calendar/day(현재 쿼리 + override + day) 의 뷰모델로 일간', async () => {
    const { container } = renderClient()
    fireEvent.click(cellOf(container, 24))
    fireEvent.click(cellOf(container, 24))
    expect(view(container)).toBe('day')
    await waitFor(() =>
      expect(container.querySelector('[data-cal-view="day"]')?.getAttribute('data-iso')).toBe(
        '2026-11-24'
      )
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/calendar/day?')
    expect(url).toContain('date=1997-03-21')
    expect(url).toContain('tz=Asia%2FSeoul')
    expect(url).toContain('day=2026-11-24')
    // 같은 날을 다시 열면 캐시 — 네트워크 없음.
    fireEvent.click(seg(container, 'Monthly'))
    fireEvent.click(cellOf(container, 24))
    fireEvent.click(cellOf(container, 24))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('불러오기 실패 — 안내 + 다시 시도', async () => {
    fetchMock.mockImplementationOnce(async () => ({ ok: false, json: async () => ({}) }))
    const { container, getByText } = renderClient()
    fireEvent.click(cellOf(container, 24))
    fireEvent.click(cellOf(container, 24))
    await waitFor(() => expect(getByText('Couldn’t load that day.')).toBeTruthy())
    await act(async () => {
      fireEvent.click(getByText('Retry'))
    })
    await waitFor(() =>
      expect(container.querySelector('[data-cal-view="day"]')?.getAttribute('data-iso')).toBe(
        '2026-11-24'
      )
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('고른 날은 400ms 디바운스로 미리 받는다', async () => {
    vi.useFakeTimers()
    const { container } = renderClient()
    fireEvent.click(cellOf(container, 24))
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(450)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
