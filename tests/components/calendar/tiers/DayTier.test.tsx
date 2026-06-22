import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
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
    dayMaster: { hanja: '辛', kr: '신금', en: 'Sin · Yin Metal' },
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

// "자세한 신호 보기" fold 엘리먼트(<details>)를 찾는다. 표면(나머지 DOM)에
// 용어가 새지 않았는지를 검증하기 위해 fold 안/밖을 가른다.
function getFold(): HTMLElement {
  const summary = screen.getByText(mockLocale === 'ko' ? '자세한 신호 보기' : 'See the raw signals')
  const details = summary.closest('details')
  if (!details) throw new Error('signal fold <details> not found')
  return details as HTMLElement
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

  describe('hero (마음의 날씨, ko)', () => {
    it('renders the day eyebrow with the date and korean date', () => {
      setup()
      expect(screen.getByText(/1일/)).toBeInTheDocument()
      expect(screen.getByText(/2024-06-15/)).toBeInTheDocument()
      expect(screen.getByText('2024년 6월 15일')).toBeInTheDocument()
    })

    it('leads with a PLAIN mood line and keeps ALL jargon off the main surface', () => {
      const { container } = setup()
      // 쉬운말 무드 리드 — 뜻("돈·현실")만. 일진/십신 한자·용어 줄은 hero 에 없다.
      expect(screen.getByText('오늘은 ‘돈·현실’의 기운')).toBeInTheDocument()
      // 표면(= fold 를 뺀 DOM)엔 일진 한자도, 원시 "오늘의 기운 갑자(甲子)" 줄도 없다.
      const fold = getFold()
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toContain('甲子')
      expect(surface.textContent).not.toMatch(/오늘의 기운 갑자/)
      // 한자/원시 십신 줄은 fold 안에만 존재한다.
      expect(fold.textContent).toContain('甲子')
      expect(within(fold).getByText(/오늘의 기운 갑자/)).toBeInTheDocument()
    })

    it('shows strength as a word, not a raw score number (score 72 → 강한 날)', () => {
      setup()
      // 시안: 숫자 점수 제거, 막대+고정 단어. score 72 → |72-50|=22 → level 4 → 강한 날.
      expect(screen.getByText('강한 날')).toBeInTheDocument()
      expect(screen.queryByText('SCORE')).not.toBeInTheDocument()
      expect(screen.queryByText('72')).not.toBeInTheDocument()
    })

    it('keeps raw polarity (±) markers off the main surface (fold only)', () => {
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
      ] as never
      const { container } = setup({ day: { allSignals: astroSignals } })
      // the PolChip "+1" exists only inside the fold.
      const fold = getFold()
      expect(within(fold).getByText('+1')).toBeInTheDocument()
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toContain('+1')
    })

    it('moves the natal day master into the fold, plainly described', () => {
      const { container } = setup()
      const fold = getFold()
      // 일간 한자·풀이는 fold 안에만.
      expect(fold.textContent).toContain('辛')
      expect(within(fold).getByText(/나의 타고난 기운 · 신금/)).toBeInTheDocument()
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toContain('辛')
    })

    it('shows the day master reference in plain English inside the fold', () => {
      mockLocale = 'en'
      setup()
      const fold = getFold()
      expect(within(fold).getByText(/your core nature · Sin · Yin Metal/)).toBeInTheDocument()
    })

    it('renders the one-line summary', () => {
      setup()
      expect(screen.getByText('오늘은 재물의 기운이 흐르는 날')).toBeInTheDocument()
    })
  })

  describe('today in depth (deep read)', () => {
    it('renders the synthesis paragraph grounded in the iljin life-area (ko)', () => {
      setup()
      expect(screen.getByText('오늘 깊이 읽기')).toBeInTheDocument()
      // the woven shinsal list (천을귀인 · 도화) is contiguous only inside the
      // deep-read body.
      const para = screen.getByText(/천을귀인 · 도화/)
      expect(para).toBeInTheDocument()
      // opener leads with the iljin's plain life-area, not the raw ganji term.
      expect(para.textContent).toContain('돈·현실')
    })

    it('renders the deep-read paragraph with plain life-areas in English', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText('Today in depth')).toBeInTheDocument()
      // opener leads with the plain life-area ('opportunity & money'), no ganji.
      expect(screen.getAllByText(/opportunity & money/).length).toBeGreaterThan(0)
    })
  })

  describe('지금 일어나는 일 (what is happening)', () => {
    it('renders the section with plain reason lines (ko)', () => {
      setup()
      expect(screen.getByText('지금 일어나는 일')).toBeInTheDocument()
      expect(screen.getByText('재성 우호 트랜짓')).toBeInTheDocument()
    })

    it('renders the english heading in en mode', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText("What's happening")).toBeInTheDocument()
    })

    it('leads with the strongest cross meaning when a cross is present (ko)', () => {
      setup({
        day: {
          crossActivations: [
            {
              id: 'x1',
              sajuSide: '정재',
              astroSide: '금성',
              sajuKo: '정재',
              astroKo: '금성',
              meaning: '안정된 가치·관계가 살아남',
              meaningEn: 'stable value and ties light up',
              polarity: 2 as const,
              weight: 0.8,
            },
          ] as never,
        },
      })
      // cross meaning surfaces plainly in the "지금 일어나는 일" list.
      expect(screen.getAllByText('안정된 가치·관계가 살아남').length).toBeGreaterThan(0)
    })

    it('renders the muted "steady day" line when no reasons and no cautions and no cross', () => {
      setup({ day: { topReasons: [], cautions: [], crossActivations: [] } })
      expect(screen.getByText('오늘은 두드러진 신호 없이 무난한 흐름이에요.')).toBeInTheDocument()
    })

    it('translates aggregate-star + relation tokens in reasons (en)', () => {
      mockLocale = 'en'
      setup({
        day: {
          topReasons: ['재성 우호 트랜짓'],
          cautions: [],
        },
      })
      // localizeLabel falls back to translateSignalLabel, so 재성 no longer leaks.
      expect(screen.queryByText(/재성/)).not.toBeInTheDocument()
      expect(screen.getByText(/Wealth star/)).toBeInTheDocument()
    })
  })

  describe('이렇게 해보세요 (try this)', () => {
    it('renders the section heading and DO / EASE chips (ko)', () => {
      setup()
      expect(screen.getByText('이렇게 해보세요')).toBeInTheDocument()
      expect(screen.getByText(/이렇게 ·/)).toBeInTheDocument()
      expect(screen.getByText(/살살 ·/)).toBeInTheDocument()
    })

    it('renders the english section + chips in en mode', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText('Try this today')).toBeInTheDocument()
      expect(screen.getByText(/DO ·/)).toBeInTheDocument()
      expect(screen.getByText(/EASE ·/)).toBeInTheDocument()
    })
  })

  describe('saju × astrology cross card', () => {
    const crossDay = {
      crossActivations: [
        {
          id: 'x1',
          sajuSide: '정재',
          astroSide: '금성',
          sajuKo: '정재',
          astroKo: '금성',
          meaning: '안정된 가치·관계가 살아남',
          meaningEn: 'stable value and ties light up',
          polarity: 2 as const,
          weight: 0.8,
        },
      ],
    }

    it('renders the cross meaning in Korean', () => {
      setup({ day: crossDay })
      expect(screen.getAllByText('안정된 가치·관계가 살아남').length).toBeGreaterThan(0)
    })

    it('picks meaningEn in English (no server-locale baking)', () => {
      mockLocale = 'en'
      setup({ day: crossDay })
      expect(screen.getAllByText('stable value and ties light up').length).toBeGreaterThan(0)
      expect(screen.queryByText('안정된 가치·관계가 살아남')).not.toBeInTheDocument()
    })
  })

  describe('signal fold (all jargon, collapsed)', () => {
    it('renders ONE collapsible fold holding the chart + natal jargon (ko)', () => {
      setup()
      expect(screen.getByText('자세한 신호 보기')).toBeInTheDocument()
      const fold = getFold()
      // the iljin/day-master hanja live inside the fold.
      expect(fold.textContent).toContain('甲子')
      expect(fold.textContent).toContain('辛')
      // natal hidden-stem (jeonggi) chip from the fixture jijanggan.
      expect(within(fold).getByText('癸')).toBeInTheDocument()
      expect(within(fold).getByText(/숨은 기운/)).toBeInTheDocument()
    })

    it('translates the fold natal labels to plain English', () => {
      mockLocale = 'en'
      setup()
      const fold = getFold()
      expect(within(fold).getByText('See the raw signals')).toBeInTheDocument()
      expect(within(fold).getByText(/Hidden energies within/)).toBeInTheDocument()
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
          ] as never,
        },
      })
      const fold = getFold()
      expect(within(fold).getByText(/Wealth generates Officer/)).toBeInTheDocument()
      // the Korean rule must NOT leak in EN mode
      expect(within(fold).queryByText(/본명 재/)).not.toBeInTheDocument()
    })

    it('renders the evidence signals (aspect→natal, polarity, strength) inside the fold', () => {
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
      const { container } = setup({ day: { allSignals: astroSignals } })
      const fold = getFold()
      // the signals/strength block lives inside the fold.
      expect(within(fold).getByText('신호와 강도')).toBeInTheDocument()
      // astro rows render a "본명 …" natal-target span (one per signal) inside fold.
      expect(within(fold).getAllByText(/본명/).length).toBeGreaterThan(0)
      // and the polarity (±) markers do NOT leak to the main surface.
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toMatch(/본명/)
    })

    it('moves the hour-row astrology terms (rising sign / ruler) into the fold', () => {
      const { container } = setup()
      const fold = getFold()
      // sky-by-hour rising sign + ruler are inside the fold only.
      expect(within(fold).getByText('시간대 하늘')).toBeInTheDocument()
      expect(fold.textContent).toContain('사자자리')
      expect(fold.textContent).toContain('상승')
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toContain('사자자리')
      expect(surface.textContent).not.toContain('상승')
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
    it('keeps the plain mood lead and drops the geokguk chip (ko)', () => {
      const { container } = setup()
      // 쉬운말 hero: 뜻("기운")만 표면에. 십신 용어(편재)는 fold 안으로.
      expect(container.textContent).toContain('의 기운')
      // geokguk name / status / description are no longer rendered on the day tier.
      expect(screen.queryByText('편재격')).not.toBeInTheDocument()
      expect(screen.queryByText('재성이 뚜렷한 격국')).not.toBeInTheDocument()
    })

    it('renders the gongmang banner plainly (no hanja glyph) when active', () => {
      const { container } = setup()
      expect(screen.getByText(/비는 자리/)).toBeInTheDocument()
      expect(screen.getByText('오늘 공망 활성')).toBeInTheDocument()
      // the hollow-branch hanja glyph (戌) is dropped from the banner surface.
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toContain('戌')
    })

    it('hides the gongmang banner when no active branches', () => {
      setup({
        day: { gongmang: { natalBranches: ['戌', '亥'], activeBranches: [], activeAxes: [] } },
      })
      expect(screen.queryByText(/비는 자리/)).not.toBeInTheDocument()
    })

    it('renders the VOC banner when voc is active', () => {
      setup({ props: { voc: { active: true, from: '10:00', to: '12:00' } } })
      expect(screen.getByText('달의 빈 시간')).toBeInTheDocument()
      expect(screen.getByText('10:00 → 12:00')).toBeInTheDocument()
    })

    it('hides the VOC banner when voc is inactive', () => {
      setup({ props: { voc: { active: false } } })
      expect(screen.queryByText('달의 빈 시간')).not.toBeInTheDocument()
    })
  })

  describe('hour rhythm and strongest hours', () => {
    it('renders the hour rhythm label when hourCrossings exist', () => {
      setup()
      expect(screen.getByText('하루 시간 리듬')).toBeInTheDocument()
    })

    it('renders the strongest-hours heading plainly (no astrology jargon)', () => {
      const { container } = setup()
      expect(screen.getByText('오늘 가장 센 시간')).toBeInTheDocument()
      // rising-sign / ruler astrology terms are NOT on the strongest-hours surface.
      const surface = container.cloneNode(true) as HTMLElement
      surface.querySelectorAll('details').forEach((d) => d.remove())
      expect(surface.textContent).not.toContain('사자자리')
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

    it('drops the per-domain evidence marker rows (✦/△/⇄) from the domain grid', () => {
      const { container } = setup()
      // the raw evidence markers used by the old domain "근거/Why" rows are gone.
      expect(container.textContent).not.toContain('근거')
      expect(container.textContent).not.toContain('✦')
      expect(container.textContent).not.toContain('⇄')
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
