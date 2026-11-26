// tests/components/calendar/v9/DayView.test.tsx
//
// v9.2 일간 탭 — 일 뷰모델만 그린다. '왜 이런 날' 행은 월간 '03 / 오늘'의 '왜'와 같은 행(같은
// day.reason), DO/EASE · 분야별(아이콘 이모지 없음) · 겹치는 흐름('왜' 행은 카드에 있어 뺀다) ·
// 시진별(시진 창과 상승궁을 나란히 — 교차 마크 없음, 결정 19) · 사다리. 옛 DayTier 가드(맨 위
// 교차 = day.reason, 흉 교차는 조심 쪽)를 v9 화면으로 옮겼다.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import DayView from '@/components/calendar/v9/DayView'
import MonthView from '@/components/calendar/v9/MonthView'
import { buildDayViewModel } from '@/lib/calendar-view/dayViewModel'
import { buildMonthViewModel } from '@/lib/calendar-view/monthViewModel'
import type { DestinyDay } from '@/types/calendar'
import { makeV9Month, makeV9Day } from '../../../lib/calendar-view/_v9Month'

const HANGUL = /[ㄱ-ㆎ가-힣]/
// 이모지 표시 문자(그림 문자 + 이모지 변형 선택자). ↔ · ▲ · ✦ 같은 기호는 대상이 아니다.
const EMOJI = /\p{Emoji_Presentation}|\u{FE0F}/u

const HOURS: NonNullable<DestinyDay['hourCrossings']> = [
  {
    when: '05:15–07:15 (묘시)',
    whenEn: '05:15–07:15 (Rabbit hour)',
    clockStart: '05:15',
    clockEnd: '07:15',
    sibsin: '상관',
    tone: 'caution',
    risingSignKo: '천칭자리',
    risingSignEn: 'Libra',
    narrative: '말이 앞서기 쉬운 시간.',
    narrativeEn: 'Words run ahead of you.',
    strength: 0.6,
  },
  {
    when: '07:15–09:15 (진시)',
    whenEn: '07:15–09:15 (Dragon hour)',
    clockStart: '07:15',
    clockEnd: '09:15',
    sibsin: '정관',
    tone: 'good',
    risingSignKo: '전갈자리',
    risingSignEn: 'Scorpio',
    narrative: '공식 일을 처리하기 좋은 시간.',
    narrativeEn: 'Good for formal business.',
    strength: 0.8,
  },
  {
    when: '09:15–11:15 (사시)',
    whenEn: '09:15–11:15 (Snake hour)',
    clockStart: '09:15',
    clockEnd: '11:15',
    sibsin: '편관',
    tone: 'good',
    risingSignKo: '사수자리',
    risingSignEn: 'Sagittarius',
    narrative: '',
    narrativeEn: '',
    strength: 0.3,
  },
]

/** 실제 EN 페이로드처럼 — 교차의 표시 이름(sajuSide/astroSide)은 서버 언어, 원어 키는 한글. */
const EN_CROSS: DestinyDay['crossActivations'] = makeV9Day().crossActivations.map((c) => ({
  ...c,
  sajuSide: c.sajuKo === '정관' ? 'Direct Officer' : 'Indirect Wealth',
  astroSide: c.astroKo === '태양' ? 'Sun' : 'Mars',
}))

function dayOf(over: Partial<DestinyDay> = {}, lang: 'ko' | 'en' = 'en') {
  return makeV9Day({
    hourCrossings: HOURS,
    ...(lang === 'en' ? { crossActivations: EN_CROSS } : {}),
    ...over,
  })
}

/** 보이는 글자 — 줄바꿈 없는 공백(&nbsp;)은 보통 공백으로. */
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')

describe('DayView', () => {
  it('상담사 CTA — 기본은 그리고, showCounselor={false}(공개 샘플)면 없다(QA-8)', () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const on = render(<DayView vm={vm} locale="en" />)
    expect(on.container.querySelector('[data-counselor-cta]')).not.toBeNull()
    on.unmount()
    const off = render(<DayView vm={vm} locale="en" showCounselor={false} />)
    expect(off.container.querySelector('[data-counselor-cta]')).toBeNull()
  })

  it("'왜 이런 날' 행 = 월간 오늘의 '왜' 행(같은 day.reason)", () => {
    const day = dayOf()
    const dayVm = buildDayViewModel(day, { lang: 'en', sex: '여', isToday: true })
    const monthVm = buildMonthViewModel(makeV9Month(), day, { lang: 'en' })
    expect(dayVm.why).toEqual(monthVm.today?.reason)

    const d = render(<DayView vm={dayVm} locale="en" />)
    const dayWhy = d.container.querySelector('[data-why-row] [data-kind="timing"]') as HTMLElement
    const dayHtml = dayWhy.outerHTML
    d.unmount()
    const m = render(<MonthView vm={monthVm} locale="en" onOpenDay={() => {}} />)
    const monthWhy = m.container.querySelector(
      '[data-cal-section="today"] [data-why-row] [data-kind="timing"]'
    ) as HTMLElement
    expect(monthWhy.outerHTML).toBe(dayHtml)
    expect(dayWhy.getAttribute('data-mark')).toBe('up')
  })

  it('히어로 — 오늘 라벨 · 날짜 · 후크, 이날의 읽기 = 톤 단어 · 바람 단어', () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const hero = container.querySelector('[data-cal-section="day-hero"]') as HTMLElement
    expect(hero.textContent).toContain('Today · Thursday')
    expect(hero.textContent).toContain('2026.11.19')
    expect(container.querySelector('h1')?.textContent).toBe(vm.hero.headline)
    expect(text(hero.querySelector('[data-cal-read]'))).toContain(
      `${vm.hero.toneWord} · ${vm.hero.windWord}`
    )
  })

  it('DO / EASE, 분야별(이모지 아이콘 없음), 사다리 4칸', () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" />)
    expect(container.querySelector('[data-try="do"]')?.querySelectorAll('li').length).toBe(
      vm.tryThis?.do.length
    )
    expect(container.querySelector('[data-try="ease"]')?.querySelectorAll('li').length).toBe(
      vm.tryThis?.ease.length
    )
    expect(container.querySelectorAll('[data-area]').length).toBe(vm.byArea?.areas.length)
    expect(container.textContent).not.toMatch(EMOJI)
    expect(container.textContent).not.toMatch(HANGUL)
    expect(container.querySelectorAll('[data-cal-section="ladder"] li')).toHaveLength(4)
  })

  it("겹치는 흐름 — '왜' 행은 카드에, 목록엔 나머지(흉 교차는 ▼), 범례는 한 번", () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const rows = container.querySelectorAll('[data-cal-section="day-cross"] [data-kind="timing"]')
    expect(rows).toHaveLength(vm.crossings.length - 1)
    expect(rows[0].textContent).toContain('Mars')
    expect(rows[0].getAttribute('data-mark')).toBe('down')
    expect(container.querySelectorAll('[data-legend]')).toHaveLength(1)
  })

  it('시진별 — 실제 창 · 시진 이름 · 상승궁을 나란히, 교차 마크(▲▼) 없음, 절정 시진만 생활 문장', () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const hours = Array.from(container.querySelectorAll('[data-hour-tone]'))
    expect(hours.map((h) => h.textContent)).toEqual([
      expect.stringContaining('05:15–07:15'),
      expect.stringContaining('07:15–09:15'),
      expect.stringContaining('09:15–11:15'),
    ])
    expect(hours[1].textContent).toContain('Dragon hour')
    expect(hours[1].textContent).toContain('Scorpio rising')
    const section = container.querySelector('[data-cal-section="day-hours"]') as HTMLElement
    expect(section.querySelectorAll('path[d^="M6 1"], path[d^="M0.5 1"]')).toHaveLength(0)
    expect(section.querySelectorAll('[data-kind]')).toHaveLength(0)
    expect(hours.filter((h) => h.hasAttribute('data-peak'))).toHaveLength(2)
    expect(section.textContent).toContain('Good for formal business.')
    expect(section.textContent).toContain('Words run ahead of you.')
  })

  it('오늘이 아닌 날 — 라벨은 요일만, 연속 방문 칩 없음, 공유 줄은 이날', () => {
    const vm = buildDayViewModel(dayOf({ date: '2026-11-24' }), {
      lang: 'en',
      sex: '여',
      isToday: false,
    })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const hero = container.querySelector('[data-cal-section="day-hero"]') as HTMLElement
    expect(hero.textContent).toContain('Tuesday')
    expect(hero.textContent).not.toContain('Today ·')
    expect(container.textContent).toContain('Share this day')
    // 사다리 — 일 칸 'This day', NOW 점 없음, 모서리 '10-yr → this day'(QA VC-3).
    const ladder = container.querySelector('[data-cal-section="ladder"]') as HTMLElement
    expect(ladder.textContent).toContain('10-yr → this day')
    expect(ladder.querySelector('[data-now]')).toBeNull()
    expect(ladder.querySelector('[data-scale="daily"]')?.textContent).toContain('This day')
  })

  it('오늘이면 사다리 일 칸에 NOW 점, 모서리 10-yr → today', () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const ladder = container.querySelector('[data-cal-section="ladder"]') as HTMLElement
    expect(ladder.textContent).toContain('10-yr → today')
    expect(ladder.querySelector('[data-scale="daily"][data-now]')).not.toBeNull()
  })

  it('제목 — 번호 칸마다 h2(화면 읽기용), 분야 이름은 h3(QA A11Y-6)', () => {
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const h2 = Array.from(container.querySelectorAll('h2')).map((h) => h.textContent)
    expect(h2).toEqual(
      expect.arrayContaining([
        'The day’s read',
        'Try this',
        'By area',
        'Crossings',
        'Hour by hour',
        'Strongest driver per scale',
      ])
    )
    const h3 = Array.from(container.querySelectorAll('[data-cal-section="day-area"] h3')).map(
      (h) => h.textContent
    )
    expect(h3).toHaveLength(6)
    // 제목 단계를 건너뛰지 않는다 — 톤 카드 h3 앞에도 h2(h1 → h3 금지).
    const levels = Array.from(container.querySelectorAll('h1, h2, h3')).map((h) =>
      Number(h.tagName.slice(1))
    )
    levels.forEach((lv, i) => {
      if (i > 0) expect(lv - levels[i - 1]).toBeLessThanOrEqual(1)
    })
    expect(container.querySelector('h1')?.getAttribute('tabindex')).toBe('-1')
  })

  it('시진별 — 중립 시진은 칠하지 않는 견본 + 중립 이름, 범례에 중립(결정 QA-4)', () => {
    const neutral = {
      when: '11:15–13:15 (오시)',
      whenEn: '11:15–13:15 (Horse hour)',
      clockStart: '11:15',
      clockEnd: '13:15',
      sibsin: '',
      tone: 'neutral' as const,
      risingSignKo: '사수자리',
      risingSignEn: 'Sagittarius',
      strength: 0,
    }
    const vm = buildDayViewModel(dayOf({ hourCrossings: [...HOURS, neutral] }), {
      lang: 'en',
      sex: '여',
      isToday: true,
    })
    const { container } = render(<DayView vm={vm} locale="en" />)
    const row = container.querySelector('[data-hour-tone="neutral"]') as HTMLElement
    expect(row.textContent).toContain('11:15–13:15')
    expect(row.textContent).toContain('Neutral')
    expect(row.hasAttribute('data-peak')).toBe(false)
    const swatch = row.querySelector('i') as HTMLElement
    expect(swatch.className).not.toMatch(/swGood|swCaution/)
    const section = container.querySelector('[data-cal-section="day-hours"]') as HTMLElement
    expect(section.textContent).toContain('unshaded hours are neutral')
  })

  it('ko — 같은 구조를 한국어로', () => {
    const vm = buildDayViewModel(dayOf({}, 'ko'), { lang: 'ko', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="ko" />)
    expect(container.textContent).toContain('오늘 · 목요일')
    expect(container.textContent).toContain('상승궁 전갈자리')
    expect(container.textContent).not.toMatch(EMOJI)
  })

  it('이달 전체 보기 → onBackToMonth', () => {
    const onBack = vi.fn()
    const vm = buildDayViewModel(dayOf(), { lang: 'en', sex: '여', isToday: true })
    const { container } = render(<DayView vm={vm} locale="en" onBackToMonth={onBack} />)
    fireEvent.click(container.querySelector('[data-back-to-month]') as HTMLElement)
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
