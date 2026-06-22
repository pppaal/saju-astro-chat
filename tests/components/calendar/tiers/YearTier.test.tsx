import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { YearTier, type YearTierProps } from '@/components/calendar/tiers/YearTier'
import type { DestinyYear, DestinyUserSummary } from '@/types/calendar'

// ── fixtures ────────────────────────────────────────────────────────────────

function makeGanji(hanja = '丙午', kr = '병오', en = 'byeongo') {
  return { hanja, kr, en }
}

function makeUser(over: Partial<DestinyUserSummary> = {}): DestinyUserSummary {
  return {
    birth: '1990-06-15 12:00',
    birthKo: '1990년 6월 15일 12:00',
    place: '서울',
    sex: '남',
    ilgan: { hanja: '甲', kr: '갑목', en: 'Gap', element: '목' },
    yongsin: { hanja: '火', kr: '화', en: 'Fire', primary: '화', secondary: '토', avoid: [] },
    huisin: { hanja: '土', kr: '토', en: 'Earth', primary: '토', avoid: [] },
    gyeokguk: '정인격',
    gyeokgukEn: 'Direct Resource',
    gangyak: '중화',
    dominantSibsin: { name: '정인', pct: 30 },
    elements: { 목: 3, 화: 1, 토: 2, 금: 1, 수: 1 },
    astro: {
      sun: '쌍둥이자리',
      asc: '양자리',
      mc: '염소자리',
      sunEn: 'Gemini',
      ascEn: 'Aries',
      mcEn: 'Capricorn',
    },
    dignities: [
      {
        planet: 'Mercury',
        sign: 'Gemini',
        degree: 10,
        tiers: {
          domicile: true,
          exaltation: false,
          detriment: false,
          fall: false,
          triplicity: false,
          term: false,
          face: false,
        } as never,
        score: 5,
      },
      {
        planet: 'Saturn',
        sign: 'Capricorn',
        degree: 5,
        tiers: { domicile: true } as never,
        score: 4,
      },
    ],
    almutenFiguris: { planet: 'Sun', score: 5 },
    sect: 'day',
    lots: [],
    intro: '본명 소개.',
    introEn: 'Natal intro.',
    ...over,
  } as DestinyUserSummary
}

function makeProfection(over: Record<string, unknown> = {}) {
  return {
    house: 8,
    theme: '변환 · 깊이 · 재구성',
    themeEn: 'Transformation · Depth',
    cusp: '처녀자리',
    cuspEn: 'Virgo',
    ruler: '수성',
    rulerEn: 'Mercury',
    rulerNatal: '1궁 (물병자리)',
    rulerNatalEn: '1st house · Aquarius',
    rulerNatalHouse: 1,
    rulerNatalSign: 'Aquarius',
    ...over,
  } as DestinyYear['profection']
}

/** 12달 점수 — 큰 달/평이/조심이 모두 나오도록. */
function makeMonthlyScores() {
  return [
    { month: 1, score: 72, bestDay: '01-10' }, // big (peak)
    { month: 2, score: 45 }, // steady
    { month: 3, score: 30 }, // caution (low)
    { month: 4, score: 50 }, // steady
    { month: 5, score: 65 }, // big
    { month: 6, score: 42 }, // steady
    { month: 7, score: 38 }, // caution
    { month: 8, score: 55 }, // steady
    { month: 9, score: 48 }, // steady
    { month: 10, score: 61 }, // big
    { month: 11, score: 44 }, // steady
    { month: 12, score: 52 }, // steady
  ]
}

function makeYear(over: Partial<DestinyYear> = {}): DestinyYear {
  return {
    year: 2026,
    headline: '올해의 무게중심은 8번째 영역으로 기울어요.',
    headlineEn: 'This year leans toward your 8th house.',
    sewoon: { gz: makeGanji(), sibsin: '정관', score: 60 },
    sewoonGz: makeGanji(),
    sewoonSibsin: '정관',
    profection: over.profection === null ? (null as never) : (over.profection ?? makeProfection()),
    profectionWheel: over.profectionWheel ?? [],
    sajuNote: '세운 십신 + 용신 흐름 한 줄.',
    sajuNoteEn: 'Annual pillar note in English.',
    astroNote: '프로펙션 룰러 본명 위치 한 줄.',
    astroNoteEn: 'Profection ruler natal position in English.',
    zrSpiritChapters: over.zrSpiritChapters ?? [],
    zrFortuneChapters: over.zrFortuneChapters ?? [],
    monthlyScores: over.monthlyScores,
    crossings: over.crossings,
    ...over,
  }
}

const noop = () => {}

/** Hellenistic jargon glyphs/words that must NOT appear on the main surface. */
const PLANET_GLYPHS = ['☉', '☽', '☿', '♀', '♂', '♃', '♄', '♅', '♆', '♇']

beforeEach(() => {
  mockLocale = 'ko'
})

describe('YearTier', () => {
  describe('main surface — "올해의 모양" (jargon-free)', () => {
    it('renders the eyebrow, "N년의 모양" heading and plain ko headline', () => {
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('2026년의 모양')).toBeInTheDocument()
      expect(screen.getByText('올해의 무게중심은 8번째 영역으로 기울어요.')).toBeInTheDocument()
    })

    it('renders the English "The shape of N" heading + headlineEn', () => {
      mockLocale = 'en'
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({ headlineEn: 'This year leans toward your 8th house.' })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText('The shape of 2026')).toBeInTheDocument()
      const headline = screen.getByText('This year leans toward your 8th house.')
      expect(headline.textContent).not.toMatch(/[가-힣]/)
    })

    it('falls back to a profection-derived English one-liner when headlineEn absent', () => {
      mockLocale = 'en'
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({
            headlineEn: undefined,
            profection: makeProfection({ themeEn: 'Depth' }),
          })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText(/This year leans toward your house 8/)).toBeInTheDocument()
    })

    it('renders the "열두 달의 흐름" month-shape and the 큰 달/조심 one-liner', () => {
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({ monthlyScores: makeMonthlyScores() })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText('열두 달의 흐름')).toBeInTheDocument()
      // legend — 큰 달 / 조심할 달 (appears in legend; 큰 달 also in the one-liner <b>).
      expect(screen.getAllByText('큰 달').length).toBeGreaterThan(0)
      expect(screen.getAllByText('조심할 달').length).toBeGreaterThan(0)
      // 큰 달/조심 one-liner derived from scores (1월=peak 72, 3월=low 30) — scoped to the
      // bigCaution paragraph (the <p> that wraps the "조심" <b>). No digits/scores leak.
      const oneLiner = screen.getByText('조심').closest('p')!
      expect(oneLiner).toHaveTextContent(/큰 달.*1월/)
      expect(oneLiner).toHaveTextContent(/조심.*3월/)
      expect(oneLiner.textContent).not.toMatch(/\d+점|\d{2}-\d{2}/)
    })

    it('main surface has NO planet glyphs, house-wheel center, or profection jargon', () => {
      const { container } = render(
        <YearTier
          user={makeUser()}
          year={makeYear({ monthlyScores: makeMonthlyScores() })}
          onDive={noop}
          onRise={noop}
        />
      )
      // Everything jargony is inside the <details> fold. Grab the main surface =
      // tierInner minus the details element.
      const details = container.querySelector('details')!
      expect(details).toBeTruthy()
      const detailsText = details.textContent ?? ''
      const fullText = container.textContent ?? ''
      const mainText = fullText.replace(detailsText, '')

      // no planet glyphs anywhere on the main surface.
      for (const g of PLANET_GLYPHS) {
        expect(mainText).not.toContain(g)
      }
      // no Hellenistic jargon words on the main surface.
      expect(mainText).not.toMatch(/profection/i)
      expect(mainText).not.toMatch(/Lord of Year/i)
      expect(mainText).not.toMatch(/Sect ·/)
      expect(mainText).not.toMatch(/Zodiacal Releasing/i)
      // no raw sewoon ganji / hanja on the main surface.
      expect(mainText).not.toContain('세운')
      expect(mainText).not.toContain('丙午')
    })

    it('all Hellenistic jargon lives inside the details fold', () => {
      const { container } = render(
        <YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />
      )
      const details = container.querySelector('details')!
      const d = within(details as HTMLElement)
      // jargon present, but only inside the fold.
      expect(d.getByText('profection')).toBeInTheDocument()
      expect(d.getByText(/Sect · Diurnal/)).toBeInTheDocument()
      expect(d.getByText(/Zodiacal Releasing/)).toBeInTheDocument()
      expect(d.getByText(/세운 2026 · 정관/)).toBeInTheDocument()
    })
  })

  describe('crossings (plain area × planet + tone) on the main surface', () => {
    it('shows the plain crossing list when crossings present (ko)', () => {
      const year = makeYear({
        crossings: [
          {
            when: '3–7월',
            whenEn: 'Mar–Jul',
            title: '정재 × 금성',
            titleEn: 'Right Wealth × Venus',
            detail: '재물 흐름 강화',
            detailEn: 'Wealth flow',
            tone: 'good',
          },
        ],
      })
      const { container } = render(
        <YearTier user={makeUser()} year={year} onDive={noop} onRise={noop} />
      )
      expect(screen.getByText('올해 무엇이 겹치나 · 2026')).toBeInTheDocument()
      const crossing = screen.getByText('정재 × 금성 · 길')
      expect(crossing).toBeInTheDocument()
      // crossing list is on the main surface, not inside the fold.
      const details = container.querySelector('details')!
      expect(details.contains(crossing)).toBe(false)
    })
  })

  describe('details fold — profection readout', () => {
    it('renders the active house readout and profection key-values (ko)', () => {
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('8번째 영역이 무대')).toBeInTheDocument()
      expect(screen.getByText('profection')).toBeInTheDocument()
      expect(screen.getByText('수성')).toBeInTheDocument()
    })

    it('EN locale: profection readout shows English only (no Hangul leak)', () => {
      mockLocale = 'en'
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({
            profection: makeProfection({
              theme: '변환 · 깊이 · 재구성',
              themeEn: 'Transformation · Depth',
              cusp: '처녀자리',
              cuspEn: 'Virgo',
              ruler: '수성',
              rulerEn: 'Mercury',
              rulerNatal: '1궁 (물병자리)',
              rulerNatalEn: '1st house · Aquarius',
            }),
          })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText('Transformation · Depth')).toBeInTheDocument()
      expect(screen.getByText('Virgo')).toBeInTheDocument()
      expect(screen.getByText('1st house · Aquarius')).toBeInTheDocument()
      expect(screen.queryByText('변환 · 깊이 · 재구성')).not.toBeInTheDocument()
      expect(screen.queryByText('처녀자리')).not.toBeInTheDocument()
      expect(screen.getAllByText('Mercury').length).toBeGreaterThan(0)
      expect(screen.queryByText('수성')).not.toBeInTheDocument()
    })

    it('renders the house-TBD readout when profection is absent', () => {
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({ profection: null as never, headline: '재구성의 해.' })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText('활성 영역 미정')).toBeInTheDocument()
    })
  })

  describe('details fold — sect + Lord-of-Year', () => {
    it('renders the day-sect line and Lord-of-Year dignity readout', () => {
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByText(/Sect · Diurnal/)).toBeInTheDocument()
      const lord = screen.getByText('Lord of Year').closest('p')!
      expect(lord).toHaveTextContent('domicile')
    })

    it('renders night-sect when user.sect is night', () => {
      render(
        <YearTier
          user={makeUser({ sect: 'night' })}
          year={makeYear()}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText(/Sect · Nocturnal/)).toBeInTheDocument()
    })
  })

  describe('details fold — sewoon (saju) row', () => {
    it('renders the annual sewoon label with year + sibsin', () => {
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByText(/세운 2026 · 정관/)).toBeInTheDocument()
      expect(screen.getByText('세운 십신 + 용신 흐름 한 줄.')).toBeInTheDocument()
    })

    it('EN locale: sajuNote/astroNote show English only (no Hangul leak)', () => {
      mockLocale = 'en'
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({
            sajuNote: '세운 십신 + 용신 흐름 한 줄.',
            sajuNoteEn: 'Annual pillar note in English.',
            astroNote: '프로펙션 룰러 본명 위치 한 줄.',
            astroNoteEn: 'Profection ruler natal position in English.',
          })}
          onDive={noop}
          onRise={noop}
        />
      )
      const saju = screen.getByText('Annual pillar note in English.')
      expect(saju.textContent).not.toMatch(/[가-힣]/)
      expect(screen.queryByText('세운 십신 + 용신 흐름 한 줄.')).not.toBeInTheDocument()
      const astro = screen.getByText('Profection ruler natal position in English.')
      expect(astro.textContent).not.toMatch(/[가-힣]/)
      expect(screen.queryByText('프로펙션 룰러 본명 위치 한 줄.')).not.toBeInTheDocument()
      expect(screen.getByText(/Annual 2026 · 정관/)).toBeInTheDocument()
    })
  })

  describe('details fold — ZR cards', () => {
    it('renders active spirit/fortune chapter data and empty state for the other', () => {
      const spiritCh = {
        sign: 'Sagittarius',
        ruler: 'Jupiter',
        calendarStartYear: 2020,
        calendarEndYear: 2032,
        durationYears: 12,
        now: true,
        startLot: 'spirit',
        level: 1,
        index: 0,
        subPeriods: [
          {
            sign: 'Aries',
            ruler: 'Mars',
            startYear: 2026,
            endYear: 2027,
            durationMonths: 12,
            isPeak: true,
            isLoosingOfTheBond: false,
          },
        ],
      }
      const year = makeYear({ zrSpiritChapters: [spiritCh as never], zrFortuneChapters: [] })
      render(<YearTier user={makeUser()} year={year} onDive={noop} onRise={noop} />)
      expect(screen.getByText('Sagittarius')).toBeInTheDocument()
      expect(screen.getByText('Peak · 정점')).toBeInTheDocument()
      expect(screen.getByText('현재 활성 Fortune 챕터 없음')).toBeInTheDocument()
    })
  })

  describe('details fold — wheel pivotal badge', () => {
    it('renders the LoB badge when a chapter carries a loosing-of-the-bond subperiod', () => {
      const ch = {
        sign: 'Leo',
        ruler: 'Sun',
        calendarStartYear: 2020,
        calendarEndYear: 2030,
        durationYears: 10,
        now: true,
        startLot: 'spirit',
        level: 1,
        index: 0,
        subPeriods: [
          {
            sign: 'Leo',
            ruler: 'Sun',
            startYear: 2026,
            endYear: 2027,
            durationMonths: 12,
            isPeak: false,
            isLoosingOfTheBond: true,
          },
        ],
      }
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({ zrSpiritChapters: [ch as never] })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText('Loosing of the Bond')).toBeInTheDocument()
    })
  })

  describe('zoom out / rise + dive buttons', () => {
    it('fires onRise from the zoom-out button (ko)', () => {
      const onRise = vi.fn()
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={onRise} />)
      fireEvent.click(screen.getByRole('button', { name: /인생으로 줌아웃/ }))
      expect(onRise).toHaveBeenCalledTimes(1)
    })

    it('fires onDive from the bottom zoom-in button (ko)', () => {
      const onDive = vi.fn()
      render(<YearTier user={makeUser()} year={makeYear()} onDive={onDive} onRise={noop} />)
      fireEvent.click(screen.getByRole('button', { name: /이번 달로 줌인/ }))
      expect(onDive).toHaveBeenCalledTimes(1)
    })

    it('renders the English dive label', () => {
      mockLocale = 'en'
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByRole('button', { name: /Zoom in to this month/ })).toBeInTheDocument()
    })
  })
})
