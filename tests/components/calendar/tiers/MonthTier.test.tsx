import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { MonthTier } from '@/components/calendar/tiers/MonthTier'
import type { DestinyMonth, DestinyCalendarCell } from '@/types/calendar'

// ── fixtures ────────────────────────────────────────────────────────────────

function makeGanji(hanja = '甲午', kr = '갑오', en = 'gabo') {
  return { hanja, kr, en }
}

function makeCell(over: Partial<DestinyCalendarCell> & { d: number }): DestinyCalendarCell {
  const ds = over.ds ?? `06-${String(over.d).padStart(2, '0')}`
  return {
    d: over.d,
    ds,
    iso: over.iso ?? `2026-${ds}`,
    intensity: over.intensity ?? 0.5,
    score: over.score,
    mark: over.mark ?? null,
    focus: over.focus ?? false,
    signalCount: over.signalCount,
  }
}

function makeConverge(over: Record<string, unknown> = {}) {
  return {
    date: '2026-06-12',
    score: 80,
    astro: ['Venus'],
    saju: ['정재'],
    bothSystems: true,
    meaning: '사주·점성 수렴',
    ...over,
  } as DestinyMonth['converge']
}

function makeMonth(over: Partial<DestinyMonth> = {}): DestinyMonth {
  return {
    label: '2026년 6월',
    ym: '2026-06',
    woolun: makeGanji(),
    woolunSibsin: over.woolunSibsin ?? '편재',
    cautionDays: over.cautionDays ?? ['06-20'],
    goodDays: over.goodDays ?? ['06-05', '06-10'],
    bestDay: over.bestDay ?? { date: '06-06', score: 92 },
    avoidDays: over.avoidDays ?? ['06-25'],
    narrative: over.narrative ?? [{ tag: '이달 총평', body: '이달은 차분히 무르익는 흐름.' }],
    converge: over.converge ?? makeConverge(),
    keyDays: over.keyDays ?? [
      {
        date: '06-06',
        meaning: '결실이 보이는 날',
        astro: ['Venus'],
        saju: ['정재'],
        bothSystems: true,
      },
    ],
    focusDay: over.focusDay ?? 15,
    calendar: over.calendar ?? [
      makeCell({ d: 5, ds: '06-05', mark: 'good', score: 70 }),
      makeCell({ d: 6, ds: '06-06', mark: 'best', score: 92 }),
      makeCell({ d: 15, ds: '06-15', focus: true, score: 55 }),
      makeCell({ d: 20, ds: '06-20', mark: 'caution', score: 35 }),
      makeCell({ d: 25, ds: '06-25', mark: 'avoid', score: 20 }),
    ],
    voidOfCourseDates: over.voidOfCourseDates,
    lunarReturnIso: over.lunarReturnIso,
    ...over,
  }
}

const noop = () => {}

beforeEach(() => {
  mockLocale = 'ko'
})

describe('MonthTier (이 달의 모양 · LIGHT)', () => {
  describe('header', () => {
    it('renders the monthly eyebrow + ko "N월의 모양" title', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('2026년 6월')).toBeInTheDocument()
      // ganzhi 폴드 안의 "6월의 모양" (자세히 보기)
      expect(screen.getByText('6월의 모양')).toBeInTheDocument()
    })

    it('renders the English "shape of" title', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('The shape of June')).toBeInTheDocument()
    })

    it('shows the ganzhi hanja + reading on the main surface (new LIGHT design)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // 간지는 이제 표면에 노출된다(시안 의도) — 더 이상 폴드 안에 숨기지 않는다.
      expect(screen.getByText('甲午')).toBeInTheDocument()
      expect(screen.getByText('갑오월')).toBeInTheDocument()
    })
  })

  describe('novice basic view (surfaced content)', () => {
    it('surfaces the do/avoid action line from structured fields (ko)', () => {
      // bestDay 06-06 → do, cautionDays[0] 06-20 → avoid
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('이렇게 해보세요')).toBeInTheDocument()
      expect(screen.getByText(/6\/6 무렵 미뤄둔 일을 추진하고/)).toBeInTheDocument()
      expect(screen.getByText(/6\/20 무렵엔 큰 결정·이동을 미루세요/)).toBeInTheDocument()
    })

    it('shows the "tap a date" hint near the grid (ko)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText(/날짜를 누르면 그날 운을 볼 수 있어요/)).toBeInTheDocument()
    })

    it('shows the legend explainer line (ko)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(
        screen.getByText(/색이 진할수록 잘 풀리는 날, 붉은 날은 큰 결정을 미루기 좋은 날/)
      ).toBeInTheDocument()
    })

    it('uses plain hero tone word "잘 풀리는 달" (no writer-speak 결)', () => {
      // goodDays:2 > careN:2? equal → mild. Force a good month.
      const month = makeMonth({
        goodDays: ['06-05', '06-10', '06-11'],
        cautionDays: ['06-20'],
        avoidDays: [],
      })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      expect(screen.getByText('잘 풀리는 달')).toBeInTheDocument()
    })
  })

  describe('fold ledes (쉽게 말하면 …)', () => {
    it('renders a plain-language lede after each fold summary (ko)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(
        screen.getByText(/이 달 전체에 흐르는 기운을 사주의 '간지'로 나타낸 거예요/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/가장 또렷한 흐름이 사주와 별자리 어디서 겹치는지/)
      ).toBeInTheDocument()
    })
  })

  describe('rise / zoom-out button', () => {
    it('renders and fires onRise when showRise (default)', () => {
      const onRise = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={onRise} />)
      fireEvent.click(screen.getByRole('button', { name: /올해로 줌아웃/ }))
      expect(onRise).toHaveBeenCalledTimes(1)
    })

    it('hides the zoom-out button when showRise=false', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} showRise={false} />)
      expect(screen.queryByRole('button', { name: /올해로 줌아웃/ })).not.toBeInTheDocument()
    })
  })

  describe('day-count summary', () => {
    it('summarizes good/caution/avoid counts (ko)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // goodDays:2 cautionDays:1 avoidDays:1
      const counts = container.querySelector('header')?.textContent ?? ''
      expect(counts).toContain('좋은 날')
      expect(counts).toContain('2')
      expect(counts).toContain('조심할 날')
      expect(counts).toContain('피하는 날')
    })

    it('summarizes counts in English', () => {
      mockLocale = 'en'
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      const counts = container.querySelector('header')?.textContent ?? ''
      expect(counts).toContain('good')
      expect(counts).toContain('caution')
      expect(counts).toContain('avoid')
    })
  })

  describe('calendar grid', () => {
    it('renders a cell per calendar entry with day numbers', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      const grid = container.querySelector('[class*="grid"]')!
      const nums = within(grid as HTMLElement)
      expect(nums.getByText('6')).toBeInTheDocument()
      expect(nums.getByText('15')).toBeInTheDocument()
      expect(nums.getByText('25')).toBeInTheDocument()
    })

    it('marks the focus cell as today (clickable)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // every cell is a button now (selectable for the readout)
      const cell = screen.getByRole('button', { name: '15일 자세히 보기' })
      expect(cell).toBeInTheDocument()
    })
  })

  describe('readout panel', () => {
    it('shows a readout for the default focus day (ko)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // focusDay=15 is the focus cell → today wins for the label/tag.
      const readout = container.querySelector('[class*="readout"]')
      expect(readout?.textContent).toContain('15')
      expect(readout?.textContent).toContain('오늘')
    })

    it('updates the readout when a day cell is clicked (caution day)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: '20일 자세히 보기' }))
      const readout = container.querySelector('[class*="readout"]')!
      // day 20 is marked caution → tag "조심할 날"
      expect((readout as HTMLElement).textContent).toContain('조심할 날')
      expect((readout as HTMLElement).textContent).toContain('20')
      // actionable advice for a caution day
      expect((readout as HTMLElement).textContent).toContain(
        '큰 결정·계약·이사는 며칠 미루는 게 좋아요'
      )
    })

    it('shows actionable advice for a good day in the readout (ko)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: '5일 자세히 보기' }))
      const readout = container.querySelector('[class*="readout"]')!
      expect((readout as HTMLElement).textContent).toContain(
        '미뤄둔 일을 시작하거나 밀어붙이기 좋아요'
      )
    })

    it('shows the big-day title in the readout when the selected day is a key day', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // day 6 is the best/key day
      fireEvent.click(screen.getByRole('button', { name: '6일 자세히 보기' }))
      const readout = container.querySelector('[class*="readout"]')!
      expect((readout as HTMLElement).textContent).toContain('좋은 날')
    })

    it('renders a readout in English', () => {
      mockLocale = 'en'
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: 'View day 25' }))
      const readout = container.querySelector('[class*="readout"]')!
      expect(within(readout as HTMLElement).getByText('avoid')).toBeInTheDocument()
    })
  })

  describe('legend', () => {
    it('renders the good/caution/avoid/today legend (ko)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      const legend = within(container.querySelector('[class*="legend"]') as HTMLElement)
      expect(legend.getByText('좋은 날')).toBeInTheDocument()
      expect(legend.getByText('조심할 날')).toBeInTheDocument()
      expect(legend.getByText('피하는 날')).toBeInTheDocument()
      expect(legend.getByText('오늘')).toBeInTheDocument()
      // bigDays present → 큰 날 legend
      expect(legend.getByText('큰 날')).toBeInTheDocument()
    })
  })

  describe('이달의 큰 날 (key days)', () => {
    it('renders the key-days heading and entries', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('이달의 큰 날')).toBeInTheDocument()
      // best day 06-06 is marked 'best' → verdict prefix "좋은 날".
      expect(screen.getAllByText(/좋은 날/).length).toBeGreaterThan(0)
    })

    it('appends the best day to key days when missing from keyDays', () => {
      const month = makeMonth({
        keyDays: [
          { date: '06-20', meaning: '주의 흐름', astro: [], saju: ['편관'], bothSystems: false },
        ],
      })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      // appended best-day entry carries the "최고의 날" prefix.
      expect(screen.getByText(/최고의 날/)).toBeInTheDocument()
    })
  })

  describe('이달의 한 줄 (verdict)', () => {
    it('renders the verdict heading and a term-tag with ganji · sibsin', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('이달의 한 줄')).toBeInTheDocument()
      // term-tag exposes the raw ganji + sibsin on the surface (시안 의도).
      expect(screen.getByText('甲午 · 편재')).toBeInTheDocument()
    })
  })

  describe('겹치는 흐름 (crossings)', () => {
    const crossFixture = {
      crossActivations: [
        {
          saju: '편재',
          sajuEn: 'Indirect Wealth',
          astro: '화성',
          astroEn: 'Mars',
          meaning: '활동적인 돈 기운이 살아남',
          meaningEn: 'active money energy lights up',
          polarity: 2,
        },
      ],
    }

    it('renders the crossing card with raw saju/astro terms on the surface (ko)', () => {
      render(<MonthTier month={makeMonth(crossFixture)} onDive={noop} onRise={noop} />)
      expect(screen.getByText('겹치는 흐름')).toBeInTheDocument()
      // raw terms are intentionally shown now
      expect(screen.getByText('편재')).toBeInTheDocument()
      expect(screen.getByText('화성')).toBeInTheDocument()
      // body meaning shown
      expect(screen.getByText('활동적인 돈 기운이 살아남')).toBeInTheDocument()
      // single strongest crossing carries the key-day color flag
      expect(screen.getByText('큰 날의 색')).toBeInTheDocument()
    })

    it('renders the crossing meaning in English', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth(crossFixture)} onDive={noop} onRise={noop} />)
      expect(screen.getByText('active money energy lights up')).toBeInTheDocument()
      expect(screen.getByText('Key-day color')).toBeInTheDocument()
    })
  })

  describe('CTA / dive button', () => {
    it('fires onDive with focusDay from the CTA (ko)', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: /오늘 6월 15일로 줌인/ }))
      expect(onDive).toHaveBeenCalledWith(15)
    })

    it('fires onDive with the *selected* day after tapping another cell (ko)', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      // 20일 선택 → CTA 라벨이 그 날로 바뀌고, 줌인도 그 날로 간다.
      fireEvent.click(screen.getByRole('button', { name: '20일 자세히 보기' }))
      fireEvent.click(screen.getByRole('button', { name: /6월 20일 운 자세히 보기/ }))
      expect(onDive).toHaveBeenCalledWith(20)
    })

    it('renders the English dive label', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByRole('button', { name: /Zoom in to today, June 15/ })).toBeInTheDocument()
    })
  })
})
