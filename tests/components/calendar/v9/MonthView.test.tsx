// tests/components/calendar/v9/MonthView.test.tsx
//
// v9.2 월간 탭 — 디자인 샘플 모양(_v9Month: 2026-11, 오늘 19일)의 월 뷰모델을 en/ko 로 그린다.
// 날 수 · 큰 날 판정 단어(그리드 마크) · 범례 한 번 · 이모지 없음 · EN 한글 없음 · PUSH/HOLD(pickTryThis) ·
// 재탭 줌인(gridTapIntent) · '하루 전체 보기' — 옛 MonthTier 동작 가드를 v9 화면으로 옮겼다
// (규칙 자체는 tests/lib/calendar-view/monthViewModel.test.ts 가 본다).

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import MonthView from '@/components/calendar/v9/MonthView'
import { buildMonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { pickTryThis, toMMDD } from '@/lib/calendar-engine/derivers/tryThis'
import { makeV9Month, makeV9Day } from '../../../lib/calendar-view/_v9Month'

const HANGUL = /[ㄱ-ㆎ가-힣]/
// 이모지 표시 문자(그림 문자 + 이모지 변형 선택자). ↔ · ▲ · ✦ 같은 기호는 대상이 아니다.
const EMOJI = /\p{Emoji_Presentation}|\u{FE0F}/u

function renderMonth(lang: 'ko' | 'en', props: Partial<Parameters<typeof MonthView>[0]> = {}) {
  const month = makeV9Month()
  const vm = buildMonthViewModel(month, makeV9Day(), { lang })
  const onOpenDay = vi.fn()
  const onSelectDay = vi.fn()
  const utils = render(
    <MonthView vm={vm} locale={lang} onOpenDay={onOpenDay} onSelectDay={onSelectDay} {...props} />
  )
  return { ...utils, vm, month, onOpenDay, onSelectDay }
}

/** 보이는 글자 — 줄바꿈 없는 공백(&nbsp;)은 보통 공백으로. */
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')
/** 그리드 칸(막대 열도 data-day 를 가져 버튼으로 좁힌다). */
const cellOf = (c: HTMLElement, d: number) =>
  c.querySelector(`[data-cal-section="days"] button[data-day="${d}"]`) as HTMLElement

const counts = (c: HTMLElement) =>
  Object.fromEntries(
    Array.from(c.querySelectorAll('[data-count]')).map((el) => [
      el.getAttribute('data-count'),
      el.querySelector('dd')?.textContent,
    ])
  )

describe('MonthView — 히어로 · 날 수', () => {
  it('en: 날 수 Good 11 · Caution 4 · Avoid 4 · Calm 11, 한 달 읽기, H1 = 후크', () => {
    const { container, vm } = renderMonth('en')
    expect(counts(container)).toEqual({ good: '11', caution: '4', avoid: '4', calm: '11' })
    const labels = Array.from(container.querySelectorAll('[data-count] dt')).map(
      (e) => e.textContent
    )
    expect(labels).toEqual(['Good', 'Caution', 'Avoid', 'Calm'])
    expect(text(container.querySelector('[data-cal-read]'))).toContain(
      'A mixed month · toward duty & standing'
    )
    expect(container.querySelector('h1')?.textContent).toBe(vm.hero.headline)
    expect(container.textContent).toContain('11 days flow · 8 to ease off')
  })

  it('ko: 같은 수, 라벨은 한국어 범례', () => {
    const { container } = renderMonth('ko')
    expect(counts(container)).toEqual({ good: '11', caution: '4', avoid: '4', calm: '11' })
    expect(container.querySelector('[data-count="calm"] dt')?.textContent).toBe('잔잔한 날')
    expect(container.textContent).toContain('기복 있는 달')
  })
})

describe('MonthView — 해 볼 것', () => {
  it('PUSH/HOLD 날짜는 pickTryThis(오늘 이후, HOLD avoid-first)에서', () => {
    const { container, month } = renderMonth('en')
    const picked = pickTryThis(
      {
        bestDay: month.bestDay?.date ?? '',
        goodDays: month.goodDays,
        cautionDays: month.cautionDays,
        avoidDays: month.avoidDays,
      },
      toMMDD(month.ym, 19)
    )
    expect(container.querySelector('[data-try="push"]')?.getAttribute('data-ds')).toBe(picked.push)
    expect(container.querySelector('[data-try="hold"]')?.getAttribute('data-ds')).toBe(picked.hold)
    expect(container.querySelector('[data-try="push"]')?.textContent).toContain('Nov 24')
    expect(container.querySelector('[data-try="hold"]')?.textContent).toContain('Nov 29')
  })

  it('빈 쪽은 숨기고, 둘 다 없으면 블록이 없다', () => {
    const base = makeV9Month()
    const vm = buildMonthViewModel(base, makeV9Day(), { lang: 'en' })
    const one = render(
      <MonthView
        vm={{ ...vm, tryThis: { push: vm.tryThis.push, hold: null } }}
        locale="en"
        onOpenDay={() => {}}
      />
    )
    expect(one.container.querySelector('[data-try="push"]')).not.toBeNull()
    expect(one.container.querySelector('[data-try="hold"]')).toBeNull()
    one.unmount()
    const none = render(
      <MonthView
        vm={{ ...vm, tryThis: { push: null, hold: null } }}
        locale="en"
        onOpenDay={() => {}}
      />
    )
    expect(none.container.querySelector('[data-cal-section="try"]')).toBeNull()
  })
})

describe('MonthView — 큰 날 · 범례 · 글자', () => {
  it('큰 날 판정 단어는 그리드 마크를 따른다(FIX9b E5)', () => {
    const { container } = renderMonth('en')
    const rows = Array.from(container.querySelectorAll('[data-cal-section="key-days"] [data-ds]'))
    const verdict = (ds: string) =>
      rows.find((r) => r.getAttribute('data-ds') === ds)?.querySelector('b')?.textContent
    expect(verdict('11-05')).toBe('Calm day')
    expect(verdict('11-09')).toBe('Good day')
    expect(verdict('11-14')).toBe('Caution')
    expect(verdict('11-17')).toBe('Avoid')
    expect(verdict('11-24')).toBe('Best day')
    expect(verdict('11-29')).toBe('Avoid')
    // 그리드 칸과 같은 마크.
    for (const r of rows) {
      const ds = r.getAttribute('data-ds') as string
      expect(cellOf(container, Number(ds.slice(3))).getAttribute('data-mark')).toBe(
        r.getAttribute('data-mark')
      )
    }
  })

  it('범례는 블록마다 한 번 — 그리드 범례 1 · 타이밍 범례 1(큰 날 블록 맨 아래)', () => {
    const { container } = renderMonth('en')
    expect(container.querySelectorAll('[data-legend="grid"]')).toHaveLength(1)
    const timing = container.querySelectorAll('[data-legend=""]')
    expect(timing).toHaveLength(1)
    const keyDays = container.querySelector('[data-cal-section="key-days"]') as HTMLElement
    expect(keyDays.lastElementChild?.getAttribute('data-legend')).toBe('')
    const legendKeys = Array.from(container.querySelectorAll('[data-legend-key]')).map((e) =>
      e.getAttribute('data-legend-key')
    )
    expect(legendKeys).toEqual([
      'good',
      'best',
      'caution',
      'avoid',
      'calm',
      'keyDay',
      'today',
      'past',
    ])
  })

  it('이모지가 없고, EN 화면엔 한글이 없다', () => {
    const en = renderMonth('en')
    expect(en.container.textContent).not.toMatch(EMOJI)
    expect(en.container.textContent).not.toMatch(HANGUL)
    for (const el of Array.from(en.container.querySelectorAll('[aria-label]'))) {
      expect(el.getAttribute('aria-label')).not.toMatch(HANGUL)
    }
    en.unmount()
    const ko = renderMonth('ko')
    expect(ko.container.textContent).not.toMatch(EMOJI)
  })

  it('오늘 블록 — 후크, 톤 카드, 왜 이런 날 행(오늘의 근거), 근거 사다리 4칸', () => {
    const { container, vm } = renderMonth('en')
    const today = container.querySelector('[data-cal-section="today"]') as HTMLElement
    expect(today.textContent).toContain('03 / Today · Thursday')
    expect(today.textContent).toContain(vm.today?.headline ?? '∅')
    const why = today.querySelector('[data-why-row] [data-kind="timing"]') as HTMLElement
    expect(why.getAttribute('data-mark')).toBe('up')
    expect(within(why).getByText('Direct Officer')).toBeTruthy()
    expect(container.querySelectorAll('[data-cal-section="ladder"] li')).toHaveLength(4)
  })
})

describe('MonthView — 그리드 탭(재탭 줌인)', () => {
  it('다른 날을 누르면 그날 읽기가 열리고(onSelectDay), 한 번 더 누르면 하루 전체로(onOpenDay)', () => {
    const { container, onOpenDay, onSelectDay } = renderMonth('en')
    expect(container.querySelector('[data-cal-selected]')).toBeNull() // 처음엔 오늘 — 읽기는 '03 / 오늘'
    const cell17 = cellOf(container, 17)
    fireEvent.click(cell17)
    expect(onSelectDay).toHaveBeenCalledWith('2026-11-17')
    expect(onOpenDay).not.toHaveBeenCalled()
    const read = container.querySelector('[data-cal-selected="11-17"]') as HTMLElement
    expect(read.textContent).toContain('Avoid')
    // 큰 날 행과 같은 말 + 그날 '왜' 행(▼).
    expect(read.querySelector('[data-kind="timing"]')?.getAttribute('data-mark')).toBe('down')
    fireEvent.click(cell17)
    expect(onOpenDay).toHaveBeenCalledWith('2026-11-17')
  })

  it("'하루 전체 보기' — 오늘 블록은 오늘, 고른 날 읽기는 그날", () => {
    const { container, onOpenDay } = renderMonth('en')
    const todayOpen = container.querySelector('[data-cal-section="today"] [data-open-day]')
    fireEvent.click(todayOpen as HTMLElement)
    expect(onOpenDay).toHaveBeenLastCalledWith('2026-11-19')
    fireEvent.click(cellOf(container, 24))
    fireEvent.click(container.querySelector('[data-cal-selected] [data-open-day]') as HTMLElement)
    expect(onOpenDay).toHaveBeenLastCalledWith('2026-11-24')
  })
})
