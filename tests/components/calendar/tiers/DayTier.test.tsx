import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// useI18n 은 locale 만 읽힌다 — mutable 변수로 ko/en 토글.
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { DayTier } from '@/components/calendar/tiers/DayTier'
import type { DayTierProps } from '@/components/calendar/tiers/DayTier'
import type { DestinyDay } from '@/types/calendar'
import type { DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'

function makeVerdict(over: Partial<DayVerdict> = {}): DayVerdict {
  return {
    band: 'good',
    tone: 'positive',
    tense: false,
    bright: false,
    ...over,
  } as DayVerdict
}

function makeDay(over: Partial<DestinyDay> = {}): DestinyDay {
  return {
    date: '2024-06-15',
    dateKo: '2024년 6월 15일',
    iljin: { hanja: '甲子', kr: '갑자', en: 'gapja' },
    iljinSibsin: '편재',
    score: 72,
    oneLine: '오늘은 재물의 기운이 흐르는 날',
    totalSignals: 5,
    signals: [],
    transits: [
      {
        id: 't1',
        cat: 'astro/transit',
        label: 'Mars conjunction Sun',
        polarity: 1,
        weight: 1,
        kind: 'transit' as never,
        layer: 'daily' as never,
        source: 'astro',
        body: 'Mars',
        aspect: 'conjunction',
        target: '본명 Sun',
        glyph: '♂',
      },
      {
        id: 't2',
        cat: 'astro/transit',
        label: 'Saturn square Moon',
        polarity: -2,
        weight: 1,
        kind: 'transit' as never,
        layer: 'daily' as never,
        source: 'astro',
        body: 'Saturn',
        aspect: 'square',
        target: '본명 Moon',
        glyph: '♄',
      },
    ] as never,
    crossSignals: [],
    allSignals: [],
    jijanggan: { jeonggi: { stem: '癸', sibsin: '정인', element: '수', layer: '정기' } },
    geokgukStatus: {
      name: '편재격',
      nameEn: 'Pyeon-jae (Indirect Wealth)',
      status: '성격',
      factors: { positive: ['편재 투출'], negative: [] } as never,
      description: '재성이 뚜렷한 격국',
    },
    gongmang: {
      natalBranches: ['戌', '亥'],
      activeBranches: ['戌'],
      activeAxes: ['일진'],
      note: '오늘 공망 활성',
    },
    appliedPatterns: [],
    crossActivations: [],
    twelveStageMatrix: [],
    shinsalActive: ['천을귀인', '도화'],
    topReasons: ['재성 우호 트랜짓'],
    cautions: ['관성 충돌 주의'],
    dayTone: makeVerdict(),
    hourCrossings: [
      {
        when: '5-7시 (묘시)',
        whenEn: '5-7am (Rabbit hour)',
        sibsin: '편재',
        tone: 'good',
        risingSignKo: '사자자리',
        risingSignEn: 'Leo',
        ruler: '태양',
        rulerEn: 'Sun',
        narrative: '아침의 기회',
        narrativeEn: 'morning opportunity',
        strength: 2,
        matched: true,
        crossMeaning: '재물과 표현의 교차',
        crossMeaningEn: 'wealth meets expression',
      },
      {
        when: '13-15시 (미시)',
        whenEn: '1-3pm (Goat hour)',
        sibsin: '정관',
        tone: 'caution',
        risingSignKo: '전갈자리',
        risingSignEn: 'Scorpio',
        ruler: '화성',
        rulerEn: 'Mars',
        narrative: '오후의 긴장',
        narrativeEn: 'afternoon tension',
        strength: 1,
        matched: false,
      },
    ],
    hourMoon: [],
    ...over,
  } as DestinyDay
}

describe('DayTier', () => {
  beforeEach(() => {
    mockLocale = 'ko'
  })

  function setup(over: { day?: Partial<DestinyDay>; props?: Partial<DayTierProps> } = {}) {
    const onRise = vi.fn()
    const utils = render(<DayTier day={makeDay(over.day)} onRise={onRise} {...over.props} />)
    return { onRise, ...utils }
  }

  describe('header (ko)', () => {
    it('renders the day eyebrow with the date and korean date', () => {
      setup()
      expect(screen.getByText(/1일/)).toBeInTheDocument()
      expect(screen.getByText(/2024-06-15/)).toBeInTheDocument()
      expect(screen.getByText('2024년 6월 15일')).toBeInTheDocument()
    })

    it('renders the iljin hanja and korean reading', () => {
      setup()
      expect(screen.getByText('甲子')).toBeInTheDocument()
      // 정갈 hero: kr reading sits on the "갑자 · 일진" line.
      expect(screen.getByText(/갑자 · 일진/)).toBeInTheDocument()
    })

    it('renders the one-line summary', () => {
      setup()
      expect(screen.getByText('오늘은 재물의 기운이 흐르는 날')).toBeInTheDocument()
    })
  })

  describe('today in depth (deep read)', () => {
    it('renders the synthesis paragraph grounded in the iljin (ko)', () => {
      setup()
      expect(screen.getByText('오늘 깊이 읽기')).toBeInTheDocument()
      // opener is grounded in the iljin reading (갑자) — unique to the deep-read body.
      expect(screen.getByText(/오늘은 갑자/)).toBeInTheDocument()
      // weaves active shinsal into the prose.
      expect(screen.getByText(/오늘 함께하는 기운/)).toBeInTheDocument()
    })

    it('renders the deep-read label in English', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText('Today in depth')).toBeInTheDocument()
      expect(screen.getByText(/Today carries the energy of/)).toBeInTheDocument()
    })
  })

  describe('natal detail fold (hidden signals)', () => {
    it('renders the collapsible natal detail with hidden stems (ko)', () => {
      setup()
      expect(screen.getByText(/본명 상세/)).toBeInTheDocument()
      expect(screen.getAllByText(/지장간/).length).toBeGreaterThan(0)
      // 癸 hidden-stem (jeonggi) chip from the fixture jijanggan.
      expect(screen.getByText('癸')).toBeInTheDocument()
    })

    it('translates the natal detail labels to English', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText(/Natal detail/)).toBeInTheDocument()
      expect(screen.getByText(/Hidden stems/)).toBeInTheDocument()
    })

    it('shows applied patterns with an English gloss (no Korean leak)', () => {
      mockLocale = 'en'
      setup({
        day: {
          appliedPatterns: [
            {
              id: 'jaesaeng-gwan',
              korean: '재생관',
              name: '財生官',
              polarity: 2,
              weight: 0.8,
              activeAxes: ['일진'],
              rule: '본명 재 + 시기 관 → 관 강화',
            },
          ],
        },
      })
      expect(screen.getByText(/Wealth generates Officer/)).toBeInTheDocument()
      // the Korean rule must NOT leak in EN mode
      expect(screen.queryByText(/본명 재/)).not.toBeInTheDocument()
    })
  })

  describe('tone dial (verdict-driven)', () => {
    it('shows the positive tone word for a positive verdict (ko)', () => {
      setup({ day: { dayTone: makeVerdict({ tone: 'positive' }) } })
      expect(screen.getByText('순풍')).toBeInTheDocument()
    })

    it('shows the caution tone word for a caution verdict (ko)', () => {
      setup({ day: { dayTone: makeVerdict({ band: 'low', tone: 'caution' }) } })
      expect(screen.getByText('역풍')).toBeInTheDocument()
    })

    it('shows the steady/mixed tone word for a mixed verdict (ko)', () => {
      setup({ day: { dayTone: makeVerdict({ band: 'mid', tone: 'mixed' }) } })
      expect(screen.getByText('평이')).toBeInTheDocument()
    })

    it('uses english tone words in en mode', () => {
      mockLocale = 'en'
      setup({ day: { dayTone: makeVerdict({ tone: 'positive' }) } })
      expect(screen.getByText('Tailwind')).toBeInTheDocument()
    })
  })

  describe('head chips / banners', () => {
    // #1519 dropped the static geokguk (격국) chip from the day screen — geokguk
    // success/failure is a static natal analysis, not day-level timing, so it was
    // removed from this tier (see DayTier.tsx head-status comment). The closest
    // current head-status surface is the iljin sibsin (일진 십신) line. Assert that
    // the day-pillar status renders AND the removed geokguk text does NOT.
    it('renders the iljin sibsin status in the head and drops the geokguk chip (ko)', () => {
      const { container } = setup()
      // 정갈 hero: kr line carries "일진", sibsin line carries 편재(재물).
      expect(container.textContent).toContain('일진')
      expect(screen.getAllByText(/편재/).length).toBeGreaterThan(0)
      // geokguk name / status / description are no longer rendered on the day tier.
      expect(screen.queryByText('편재격')).not.toBeInTheDocument()
      expect(screen.queryByText('재성이 뚜렷한 격국')).not.toBeInTheDocument()
    })

    it('renders the gongmang banner with active branches when present', () => {
      setup()
      expect(screen.getByText(/공망 · 空亡/)).toBeInTheDocument()
      expect(screen.getByText('오늘 공망 활성')).toBeInTheDocument()
    })

    it('hides the gongmang banner when no active branches', () => {
      setup({
        day: { gongmang: { natalBranches: ['戌', '亥'], activeBranches: [], activeAxes: [] } },
      })
      expect(screen.queryByText(/공망 · 空亡/)).not.toBeInTheDocument()
    })

    it('renders the VOC banner when voc is active', () => {
      // #1519 relabelled the VOC banner: "Moon VOC" → "달의 빈 시간" (ko) and renders
      // the window as "{from} → {to}".
      setup({ props: { voc: { active: true, from: '10:00', to: '12:00' } } })
      expect(screen.getByText('달의 빈 시간')).toBeInTheDocument()
      expect(screen.getByText('10:00 → 12:00')).toBeInTheDocument()
    })

    it('hides the VOC banner when voc is inactive', () => {
      setup({ props: { voc: { active: false } } })
      expect(screen.queryByText('달의 빈 시간')).not.toBeInTheDocument()
    })
  })

  describe('today core — reasons / cautions / shinsal', () => {
    it('renders top reasons and cautions lists (ko)', () => {
      setup()
      expect(screen.getByText('재성 우호 트랜짓')).toBeInTheDocument()
      expect(screen.getByText('관성 충돌 주의')).toBeInTheDocument()
    })

    it('translates aggregate-star + relation tokens in reasons/cautions (en)', () => {
      mockLocale = 'en'
      setup({
        day: {
          topReasons: ['재성 우호 트랜짓'],
          cautions: ['관성 충 주의'],
        },
      })
      // localizeLabel now falls back to translateSignalLabel, so the aggregate
      // stars (재성/관성) and the relation token (충) no longer leak as Hangul.
      expect(screen.queryByText(/재성/)).not.toBeInTheDocument()
      expect(screen.queryByText(/관성/)).not.toBeInTheDocument()
      expect(screen.getByText(/Wealth star/)).toBeInTheDocument()
      expect(screen.getByText(/Officer star/)).toBeInTheDocument()
      expect(screen.getByText(/clash/)).toBeInTheDocument()
    })

    it('renders the muted "steady day" line when no reasons and no cautions', () => {
      setup({ day: { topReasons: [], cautions: [] } })
      expect(screen.getByText('오늘은 두드러진 신호 없이 무난한 흐름이에요.')).toBeInTheDocument()
    })

    it('renders active shinsal pills (ko)', () => {
      setup()
      // shinsal names may also surface as domain evidence chips → allow multiple.
      expect(screen.getAllByText('천을귀인').length).toBeGreaterThan(0)
      expect(screen.getAllByText('도화').length).toBeGreaterThan(0)
    })

    it('renders the evidence transits inside the details disclosure', () => {
      // #1519 replaced the per-transit "근거 신호 보기" list with EvidenceDetails, a
      // <details> disclosure summarised "근거 자세히 · 신호와 강도" that renders
      // day.allSignals (polarity ≠ 0). Astro rows emit a "natal" target span which
      // localizes to "본명 …" in ko. Feed allSignals (the new prop) the astro rows.
      const astroSignals = [
        {
          id: 't1',
          cat: 'astro/transit',
          label: 'Mars conjunction Sun',
          polarity: 1,
          weight: 1,
          kind: 'transit' as never,
          layer: 'daily' as never,
          source: 'astro',
          body: 'Mars',
          aspect: 'conjunction',
          target: '본명 Sun',
          glyph: '♂',
        },
        {
          id: 't2',
          cat: 'astro/transit',
          label: 'Saturn square Moon',
          polarity: -2,
          weight: 1,
          kind: 'transit' as never,
          layer: 'daily' as never,
          source: 'astro',
          body: 'Saturn',
          aspect: 'square',
          target: '본명 Moon',
          glyph: '♄',
        },
      ] as never
      setup({ day: { allSignals: astroSignals } })
      // disclosure summary for the evidence/details section.
      expect(screen.getByText('근거 자세히 · 신호와 강도')).toBeInTheDocument()
      // astro rows render a "본명 …" natal-target span (one per signal).
      expect(screen.getAllByText(/본명/).length).toBeGreaterThan(0)
    })
  })

  describe('hour rhythm and strongest hours', () => {
    it('renders the hour rhythm label when hourCrossings exist', () => {
      setup()
      expect(screen.getByText('하루 시간 리듬')).toBeInTheDocument()
    })

    it('renders the strongest-hours crossing heading with × when a match exists', () => {
      setup()
      expect(screen.getByText(/오늘 가장 센 시간 · 사주 × 점성 교차/)).toBeInTheDocument()
    })

    it('drops the × claim in the heading when no hour matched', () => {
      setup({
        day: {
          hourCrossings: [
            {
              when: '13-15시 (미시)',
              whenEn: '1-3pm (Goat hour)',
              sibsin: '정관',
              tone: 'caution',
              risingSignKo: '전갈자리',
              risingSignEn: 'Scorpio',
              ruler: '화성',
              rulerEn: 'Mars',
              strength: 1,
              matched: false,
            },
          ],
        },
      })
      expect(screen.getByText('오늘 가장 센 시간')).toBeInTheDocument()
      expect(screen.queryByText(/사주 × 점성 교차/)).not.toBeInTheDocument()
    })

    it('omits hour sections entirely when no hourCrossings', () => {
      setup({ day: { hourCrossings: [] } })
      expect(screen.queryByText('하루 시간 리듬')).not.toBeInTheDocument()
    })
  })

  describe('today by area (domains)', () => {
    it('renders the "분야별 오늘 조언" section heading (ko)', () => {
      setup()
      expect(screen.getByText('분야별 오늘 조언')).toBeInTheDocument()
    })

    it('renders the english "Today by area" heading in en mode', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText('Today by area')).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('calls onRise from the top zoom-out button', () => {
      const { onRise } = setup()
      fireEvent.click(screen.getByText(/이번 달로 줌아웃/))
      expect(onRise).toHaveBeenCalledTimes(1)
    })

    it('calls onRise from the bottom zoom-out button', () => {
      const { onRise } = setup()
      fireEvent.click(screen.getByText(/다시 위로 — 줌아웃/))
      expect(onRise).toHaveBeenCalledTimes(1)
    })

    it('renders english zoom labels in en mode', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText(/Zoom out to month/)).toBeInTheDocument()
      expect(screen.getByText(/Zoom back out/)).toBeInTheDocument()
    })
  })
})
