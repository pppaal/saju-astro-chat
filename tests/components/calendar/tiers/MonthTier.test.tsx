import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { MonthTier, type MonthTierProps } from '@/components/calendar/tiers/MonthTier'
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
    woolunSibsin: over.woolunSibsin ?? '정재',
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

describe('MonthTier', () => {
  describe('cal head', () => {
    it('renders the monthly eyebrow + ko flow title', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('1달 · MONTHLY · 2026-06')).toBeInTheDocument()
      expect(screen.getByText('2026년 6월의 흐름')).toBeInTheDocument()
    })

    it('renders the English flow title', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('June 2026')).toBeInTheDocument()
    })

    it('renders the woolun sibsin caption + tag (ko)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // caption: "월운 · 午월 · 정재"
      expect(screen.getByText(/월운 · 午월 · 정재/)).toBeInTheDocument()
      // sibsin tag: "甲(정재) / 午"
      expect(screen.getByText('甲(정재) / 午')).toBeInTheDocument()
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
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // goodDays:2 cautionDays:1 avoidDays:1
      expect(screen.getByText('좋은 날 2개 · 주의 1개 · 피하기 1개')).toBeInTheDocument()
    })

    it('summarizes counts in English with pluralization', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText(/2 good days · 1 caution · 1 avoid/)).toBeInTheDocument()
    })
  })

  describe('calendar heatmap', () => {
    it('renders a cell per calendar entry with day numbers and scores', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // day numbers present.
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      // score badges rendered (Math.round).
      expect(screen.getByText('92')).toBeInTheDocument()
      // best-day star glyph.
      expect(container.textContent).toContain('✦')
    })

    it('renders the Today tag on the focus cell and fires onDive when clicked', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      const today = screen.getByText('오늘')
      fireEvent.click(today.closest('[role="button"]')!)
      expect(onDive).toHaveBeenCalledWith(15)
    })

    it('fires onDive when the focus cell receives a Space keydown', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      const today = screen.getByText('오늘')
      fireEvent.keyDown(today.closest('[role="button"]')!, { key: ' ' })
      expect(onDive).toHaveBeenCalledWith(15)
    })
  })

  describe('legend', () => {
    it('renders best/avoid/converge legend chips', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(container.textContent).toContain('최고')
      expect(container.textContent).toContain('피함')
      expect(container.textContent).toContain('수렴')
    })

    it('renders a lunar-return legend chip when lunarReturnIso present', () => {
      const month = makeMonth({ lunarReturnIso: '2026-06-18' })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      expect(screen.getByText(/Lunar Return 06-18/)).toBeInTheDocument()
    })

    it('renders a void-of-course legend chip when voc dates present', () => {
      const month = makeMonth({ voidOfCourseDates: ['2026-06-11T00:00:00Z'] })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      expect(screen.getByText(/void-of-course · 1일/)).toBeInTheDocument()
    })
  })

  describe('key-days crossing list', () => {
    it('renders the key-days heading and entries', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('이달의 큰 날 · 주목 (사주 × 점성 수렴)')).toBeInTheDocument()
      // best day 06-06 is marked 'best' → verdict prefix "좋은 날" (may appear on
      // multiple key-day entries / calendar cells).
      expect(screen.getAllByText(/좋은 날/).length).toBeGreaterThan(0)
    })

    it('appends the best day to key days when missing from keyDays', () => {
      const month = makeMonth({
        keyDays: [
          { date: '06-20', meaning: '주의 흐름', astro: [], saju: ['편관'], bothSystems: false },
        ],
        // bestDay 06-06 not in keyDays → component appends it.
      })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      // appended best-day detail line.
      expect(screen.getByText('이달 점수가 가장 높은 날')).toBeInTheDocument()
    })
  })

  describe('monthly summary narrative', () => {
    it('renders the 이달 총평 summary card when present (ko)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('이달은 차분히 무르익는 흐름.')).toBeInTheDocument()
      expect(screen.getByText('이달 총평')).toBeInTheDocument()
    })

    it('omits the summary card when no matching narrative tag', () => {
      const month = makeMonth({ narrative: [{ tag: '다른 태그', body: '본문' }] })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      expect(screen.queryByText('본문')).not.toBeInTheDocument()
    })
  })

  describe('dive button', () => {
    it('fires onDive with focusDay from the bottom button (ko)', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: /오늘 06월 15일로 줌인/ }))
      expect(onDive).toHaveBeenCalledWith(15)
    })

    it('renders the English dive label', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByRole('button', { name: /Zoom in to June 15/ })).toBeInTheDocument()
    })
  })
})
