import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('MonthTier (이 달의 모양)', () => {
  describe('header', () => {
    it('renders the monthly eyebrow + ko "N월의 모양" title', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('1달 · Monthly · 2026-06')).toBeInTheDocument()
      expect(screen.getByText('6월의 모양')).toBeInTheDocument()
    })

    it('renders the English "shape of" title', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('The shape of June')).toBeInTheDocument()
    })

    it('does NOT show the big ganji hanja stamp or 사주/四柱 tag on the main surface', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // The hanja stamp lives only inside the collapsed <details> fold now —
      // it must not be a prominent header element on the main surface.
      expect(container.querySelector('h1')?.textContent).not.toContain('甲午')
      expect(screen.queryByText('사주 · 四柱')).not.toBeInTheDocument()
      expect(screen.queryByText(/이 달의 기운/)).not.toBeInTheDocument()
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
    it('summarizes good/caution/avoid counts (ko, plain)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // goodDays:2 cautionDays:1 avoidDays:1
      expect(container.textContent).toContain('좋은 날 2개 · 조심할 날 1개 · 피하는 날 1개')
    })

    it('summarizes counts in English', () => {
      mockLocale = 'en'
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(container.textContent).toContain('2 good · 1 caution · 1 avoid')
    })
  })

  describe('calendar grid', () => {
    it('renders a cell per calendar entry with day numbers', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })

    it('does NOT render per-cell score badges or star glyphs (decluttered)', () => {
      const { container } = render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // score 92 was a dead field badge in the old design — gone now.
      expect(screen.queryByText('92')).not.toBeInTheDocument()
      expect(container.textContent).not.toContain('✦')
    })

    it('marks the focus cell as an activatable today button and fires onDive on click', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      const cell = screen.getByRole('button', { name: '오늘 15일로 줌인' })
      fireEvent.click(cell)
      expect(onDive).toHaveBeenCalledWith(15)
    })

    it('fires onDive when the focus cell receives a Space keydown', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      const cell = screen.getByRole('button', { name: '오늘 15일로 줌인' })
      fireEvent.keyDown(cell, { key: ' ' })
      expect(onDive).toHaveBeenCalledWith(15)
    })
  })

  describe('legend', () => {
    it('renders the Less→More scale + standout dots (ko)', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('잔잔')).toBeInTheDocument()
      expect(screen.getByText('좋음')).toBeInTheDocument()
      expect(screen.getByText('좋은 날')).toBeInTheDocument()
      expect(screen.getByText('조심할 날')).toBeInTheDocument()
      expect(screen.getByText('오늘')).toBeInTheDocument()
    })
  })

  describe('이달의 큰 날 (key days)', () => {
    it('renders the key-days heading and entries', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('이달의 큰 날')).toBeInTheDocument()
      // best day 06-06 is marked 'best' → verdict prefix "좋은 날".
      expect(screen.getAllByText(/좋은 날/).length).toBeGreaterThan(0)
    })

    it('expresses overlap as a neutral "겹치는 흐름" label with NO confidence digit', () => {
      const month = makeMonth({
        keyDays: [
          {
            date: '06-17',
            meaning: '두 체계가 수렴',
            astro: ['Jupiter'],
            saju: ['정재'],
            bothSystems: true,
            window: {
              start: '2026-06-14T00:00:00Z',
              peak: '2026-06-17T00:00:00Z',
              end: '2026-06-20T00:00:00Z',
            },
            confidence: 82,
          },
        ],
        bestDay: { date: '06-17', score: 90 },
        calendar: [
          makeCell({ d: 15, ds: '06-15', focus: true }),
          makeCell({ d: 17, ds: '06-17', mark: 'best', score: 90 }),
        ],
      })
      const { container } = render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      // neutral overlap label, plain window — but never the raw confidence digit/word.
      expect(screen.getByText('겹치는 흐름')).toBeInTheDocument()
      expect(screen.getByText('6/14–6/20 흐름')).toBeInTheDocument()
      expect(screen.queryByText(/신뢰/)).not.toBeInTheDocument()
      expect(container.textContent).not.toContain('82')
      expect(screen.queryByText('사주+점성')).not.toBeInTheDocument()
    })

    it('hides the overlap label for single-system key days', () => {
      const month = makeMonth({
        keyDays: [
          {
            date: '06-20',
            meaning: '주의',
            astro: [],
            saju: ['편관'],
            bothSystems: false,
            confidence: 41,
          },
        ],
      })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      expect(screen.queryByText('겹치는 흐름')).not.toBeInTheDocument()
      expect(screen.queryByText(/신뢰/)).not.toBeInTheDocument()
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

    it('renders the English summary body from bodyEn on locale toggle', () => {
      mockLocale = 'en'
      const month = makeMonth({
        narrative: [{ tag: '이달 총평', body: '한국어 총평', bodyEn: 'A steady, ripening month.' }],
      })
      render(<MonthTier month={month} onDive={noop} onRise={noop} />)
      expect(screen.getByText('A steady, ripening month.')).toBeInTheDocument()
      expect(screen.queryByText('한국어 총평')).not.toBeInTheDocument()
      expect(screen.getByText('This month')).toBeInTheDocument()
    })
  })

  describe('이달의 겹치는 흐름 (month cross — plain pair only)', () => {
    const crossFixture = {
      crossActivations: [
        {
          saju: '정재',
          sajuEn: 'Direct Wealth',
          astro: '금성',
          astroEn: 'Venus',
          meaning: '안정된 가치가 살아남',
          meaningEn: 'stable value lights up',
          polarity: 2,
        },
      ],
    }

    it('renders the plain area × planet pair (ko) and NOT the raw 정재 × 금성 term chip', () => {
      const { container } = render(
        <MonthTier month={makeMonth(crossFixture)} onDive={noop} onRise={noop} />
      )
      expect(screen.getByText('이달의 겹치는 흐름')).toBeInTheDocument()
      expect(screen.getByText('안정된 가치가 살아남')).toBeInTheDocument()
      // plain pair renders (sibsinArea × planetPlain), raw jargon pair does not.
      expect(screen.queryByText('정재 × 금성')).not.toBeInTheDocument()
      // the plain pair contains the plain planet word, never the literal 정재 term.
      expect(container.textContent).not.toContain('정재 × 금성')
    })

    it('renders the plain cross pair in English (Direct Wealth jargon dropped)', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth(crossFixture)} onDive={noop} onRise={noop} />)
      expect(screen.getByText('stable value lights up')).toBeInTheDocument()
      expect(screen.queryByText('Direct Wealth × Venus')).not.toBeInTheDocument()
    })
  })

  describe('자세한 신호 보기 (ganji fold)', () => {
    it('keeps the ganji hanja inside a collapsed details fold, not on the main surface', () => {
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      // the disclosure summary exists...
      expect(screen.getByText('자세한 신호 보기')).toBeInTheDocument()
      // ...and the hanja lives within that <details>, which is closed by default.
      const hanja = screen.getByText('甲午')
      expect(hanja.closest('details')).not.toBeNull()
    })
  })

  describe('dive button', () => {
    it('fires onDive with focusDay from the bottom button (ko)', () => {
      const onDive = vi.fn()
      render(<MonthTier month={makeMonth()} onDive={onDive} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: /오늘 6월 15일로 줌인/ }))
      expect(onDive).toHaveBeenCalledWith(15)
    })

    it('renders the English dive label', () => {
      mockLocale = 'en'
      render(<MonthTier month={makeMonth()} onDive={noop} onRise={noop} />)
      expect(screen.getByRole('button', { name: /Zoom in to June 15/ })).toBeInTheDocument()
    })
  })
})
