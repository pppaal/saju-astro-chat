import React from 'react'
import fs from 'node:fs'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// useI18n 모킹 — MonthTier.test 와 동일 패턴(locale 토글).
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { DayTier } from '@/components/calendar/tiers/DayTier'
import { dayShareHook } from '@/lib/share/shareHook'
import type { DestinyDay } from '@/types/calendar'

// 실 덤프 — tests/fixtures/calendar/audit-day.json 을 런타임에 읽어 캐스팅.
const AUDIT_PATH = process.cwd() + '/tests/fixtures/calendar/audit-day.json'
const day = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf-8')) as unknown as DestinyDay

const noop = () => {}

beforeEach(() => {
  mockLocale = 'ko'
})

describe('DayTier (오늘의 일진 · LIGHT)', () => {
  it('renders real dump data without throwing', () => {
    expect(() => render(<DayTier day={day} onRise={noop} sex="남" />)).not.toThrow()
  })

  it('surfaces the iljin ganzhi hanja 庚申 and sibsin 겁재', () => {
    const { container } = render(<DayTier day={day} onRise={noop} sex="남" />)
    expect(container.textContent).toContain('庚申')
    expect(container.textContent).toContain('겁재')
  })

  it('surfaces the punchy in-app hook headline (same source as the share card)', () => {
    const { container } = render(<DayTier day={day} onRise={noop} sex="남" />)
    // 후크는 dayTone.tone/score/seed 에서 결정적으로 뽑힌다(fixture: mixed·33).
    const hook = dayShareHook({
      tone: day.dayTone?.tone ?? 'mixed',
      score: day.score,
      seed: day.seed ?? 0,
      daySalt: Number(day.date?.slice(8, 10)) || 0,
      ko: true,
    })
    expect(hook.headline.length).toBeGreaterThan(0)
    expect(container.textContent).toContain(hook.headline)
  })

  it('가장 센 교차가 흉(−)이면 조심 목록으로 — "받쳐주는 흐름" 헤더 금지 (감사 #8)', () => {
    const d = {
      ...day,
      topReasons: [],
      topReasonsEn: [],
      cautions: [],
      cautionsEn: [],
      crossActivations: [
        {
          id: 'x',
          sajuSide: '겁재',
          astroSide: '화성',
          sajuKo: '겁재',
          astroKo: '화성',
          meaning: '경쟁과 충동의 결이 두 배로 강해져요. 큰 돈과 관계 결정은 한 박자 늦추세요.',
          meaningEn: 'Rivalry and impulse double up — slow big money and relationship calls.',
          polarity: -2,
          weight: 0.5,
          layer: 'daily',
        },
      ],
    } as DestinyDay
    const { container } = render(<DayTier day={d} onRise={noop} sex="남" />)
    // 흉 교차만 있는 날 — "받쳐주는 흐름" 문구가 떠서는 안 된다(부호 무시 버그).
    expect(container.textContent).not.toContain('받쳐주는 흐름이 같이 와요')
    // 교차 경고문은 조심 목록으로 합류.
    expect(container.textContent).toContain('경쟁과 충동의 결이 두 배로')
  })

  it("맨 위 교차는 day.reason — 월 리드아웃 '왜'와 같은 근거, 같은 페어의 반대 부호 행은 빠진다 (계획 B1 #4)", () => {
    const d = {
      ...day,
      topReasons: [],
      topReasonsEn: [],
      cautions: [],
      cautionsEn: [],
      crossActivations: [
        {
          id: 'big',
          sajuSide: '겁재',
          astroSide: '화성',
          sajuKo: '겁재',
          astroKo: '화성',
          meaning: '경쟁과 충동의 결이 두 배로 강해져요.',
          meaningEn: 'Rivalry and impulse double up.',
          polarity: -3,
          weight: 0.9,
          layer: 'monthly',
        },
        {
          id: 'same-pair-opposite',
          sajuSide: '식신',
          astroSide: '금성',
          sajuKo: '식신',
          astroKo: '금성',
          meaning: '같은 페어 반대 부호 행',
          meaningEn: 'same pair, opposite sign',
          polarity: -2,
          weight: 0.8,
          layer: 'monthly',
        },
      ],
      reason: {
        saju: '식신',
        sajuEn: 'Eating God',
        astro: '금성',
        astroEn: 'Venus',
        meaning: '즐기며 만드는 일에 손이 잘 붙는 날이에요.',
        meaningEn: 'Making things you enjoy comes easily today.',
        polarity: 1,
      },
    } as DestinyDay
    const { container } = render(<DayTier day={d} onRise={noop} sex="남" />)
    const cards = [...container.querySelectorAll('[class*="crossTop"]')]
    expect(cards.length).toBe(2)
    // 머리 카드 = 근거(식신 × 금성 ▲) + '왜 이런 날' 표지 — |polarity| 최대(겁재 −3)가 아님.
    expect(cards[0].textContent).toContain('식신')
    expect(cards[0].textContent).toContain('▲')
    expect(cards[0].textContent).toContain('왜 이런 날')
    expect(container.textContent).not.toContain('같은 페어 반대 부호 행')
    // 지금 일어나는 일 한 줄도 근거(+)에서 — 받쳐주는 흐름으로.
    expect(container.textContent).toContain('즐기며 만드는 일에 손이 잘 붙는')
  })

  it('day.reason 이 없으면 종전대로 |polarity| 최대가 머리, 강하면 "가장 센 흐름"', () => {
    const d = {
      ...day,
      crossActivations: [
        {
          id: 'big',
          sajuSide: '겁재',
          astroSide: '화성',
          sajuKo: '겁재',
          astroKo: '화성',
          meaning: '경쟁과 충동의 결이 두 배로 강해져요.',
          meaningEn: 'Rivalry and impulse double up.',
          polarity: -3,
          weight: 0.9,
          layer: 'daily',
        },
      ],
      reason: undefined,
    } as DestinyDay
    const { container } = render(<DayTier day={d} onRise={noop} sex="남" />)
    const cards = [...container.querySelectorAll('[class*="crossTop"]')]
    expect(cards[0].textContent).toContain('겁재')
    expect(cards[0].textContent).toContain('가장 센 흐름')
  })

  it('하루 리듬은 실제 시진 창과 그 시진 한가운데 상승궁을 나란히 보여 준다 (TP-8 · 결정 19)', () => {
    const ko = render(<DayTier day={day} onRise={noop} sex="남" />).container
    // 가장 센 좋은 시각 = 子 23:32–01:32(서울 실제 창), 명목 '23-1시' 아님.
    expect(ko.textContent).toContain('23:32–01:32')
    expect(ko.textContent).toContain('상승궁 물고기자리')
    expect(ko.textContent).not.toMatch(/23-1시|1-3시/)
    // 곡선 축 = 실제 시작 시각.
    const axis = [...ko.querySelectorAll('svg text')].map((t) => t.textContent)
    expect(axis).toEqual(expect.arrayContaining(['23:32', '01:32', '19:32']))

    mockLocale = 'en'
    const en = render(<DayTier day={day} onRise={noop} sex="남" />).container
    expect(en.textContent).toContain('23:32–01:32')
    expect(en.textContent).toContain('Pisces rising')
    expect(en.textContent).not.toMatch(/11pm-1am|1-3am/)
  })

  it('시진 × 상승궁 룰러는 교차가 아니다 — 옛 matched·교차 해석이 실려 와도 쓰지 않는다 (CC-3)', () => {
    const stale = (day.hourCrossings ?? []).map((h, i) => ({
      ...h,
      ...(i === 4
        ? {
            strength: 2,
            matched: true,
            crossMeaning: '편관 × 토성 — 책임과 구조가 단단해지는 결.',
            crossMeaningEn: 'Indirect Officer × Saturn — responsibility firms up.',
          }
        : {}),
    }))
    for (const loc of ['ko', 'en'] as const) {
      mockLocale = loc
      const { container } = render(
        <DayTier day={{ ...day, hourCrossings: stale } as DestinyDay} onRise={noop} sex="남" />
      )
      expect(container.textContent).not.toContain('× 토성')
      expect(container.textContent).not.toContain('× Saturn')
      // 매칭 우선이 없으니 가장 센 좋은 시각은 시각순 첫 강(2) 시진 — 子.
      expect(container.textContent).toContain('23:32–01:32')
    }
  })

  it('fires onRise from the top zoom-out button', () => {
    const onRise = vi.fn()
    const { getAllByRole } = render(<DayTier day={day} onRise={onRise} sex="남" />)
    const riseButtons = getAllByRole('button').filter((b) =>
      /줌아웃|줌|위로/.test(b.textContent ?? '')
    )
    expect(riseButtons.length).toBeGreaterThan(0)
    riseButtons[0].click()
    expect(onRise).toHaveBeenCalled()
  })
})
