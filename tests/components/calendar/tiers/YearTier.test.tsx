import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

beforeEach(() => {
  mockLocale = 'ko'
})

describe('YearTier', () => {
  describe('header + headline', () => {
    it('renders the year eyebrow + heading + ko headline', () => {
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('올해의 흐름')).toBeInTheDocument()
      expect(screen.getByText('올해의 무게중심은 8번째 영역으로 기울어요.')).toBeInTheDocument()
    })

    it('renders the custom English headline (headlineEn) when present', () => {
      mockLocale = 'en'
      render(
        <YearTier
          user={makeUser()}
          year={makeYear({ headlineEn: 'This year leans toward your 8th house.' })}
          onDive={noop}
          onRise={noop}
        />
      )
      expect(screen.getByText('This year')).toBeInTheDocument()
      const headline = screen.getByText('This year leans toward your 8th house.')
      expect(headline).toBeInTheDocument()
      expect(headline.textContent).not.toMatch(/[가-힣]/)
    })

    it('falls back to profection-derived English one-liner when headlineEn absent', () => {
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
  })

  describe('zoom out / rise button', () => {
    it('fires onRise from the zoom-out button (ko)', () => {
      const onRise = vi.fn()
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={onRise} />)
      fireEvent.click(screen.getByRole('button', { name: /인생으로 줌아웃/ }))
      expect(onRise).toHaveBeenCalledTimes(1)
    })
  })

  describe('crossings vs monthly flow list', () => {
    it('shows the cross-activation crossing list when crossings present (ko)', () => {
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
      render(<YearTier user={makeUser()} year={year} onDive={noop} onRise={noop} />)
      expect(screen.getByText('올해의 사주 × 점성 교차 · 2026')).toBeInTheDocument()
      expect(screen.getByText('정재 × 금성 · 길')).toBeInTheDocument()
    })

    it('falls back to the 12-month flow list when no crossings', () => {
      const year = makeYear({
        monthlyScores: [
          { month: 1, score: 70, bestDay: '01-10' },
          { month: 2, score: 45 },
          { month: 3, score: 30 },
        ],
      })
      render(<YearTier user={makeUser()} year={year} onDive={noop} onRise={noop} />)
      expect(screen.getByText('올해 12달 흐름 · 2026')).toBeInTheDocument()
      expect(screen.getByText('좋은 달')).toBeInTheDocument()
      expect(screen.getByText('평이한 달')).toBeInTheDocument()
      expect(screen.getByText('조심할 달')).toBeInTheDocument()
    })

    it('renders the MonthBars graph when monthlyScores present', () => {
      const year = makeYear({
        monthlyScores: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, score: 50 })),
      })
      render(<YearTier user={makeUser()} year={year} onDive={noop} onRise={noop} />)
      expect(screen.getByText('12달 흐름')).toBeInTheDocument()
    })
  })

  describe('profection readout (details)', () => {
    it('renders the active house readout and profection key-values (ko)', () => {
      render(<YearTier user={makeUser()} year={makeYear()} onDive={noop} onRise={noop} />)
      expect(screen.getByText('8번째 영역이 무대')).toBeInTheDocument()
      // dl rows.
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
      // theme + cusp + ruler (natal) all in English
      expect(screen.getByText('Transformation · Depth')).toBeInTheDocument()
      expect(screen.getByText('Virgo')).toBeInTheDocument()
      expect(screen.getByText('1st house · Aquarius')).toBeInTheDocument()
      // primary KO terms must NOT render
      expect(screen.queryByText('변환 · 깊이 · 재구성')).not.toBeInTheDocument()
      expect(screen.queryByText('처녀자리')).not.toBeInTheDocument()
      // Mercury (ruler) appears (ruler row + Lord of Year), KO '수성' must not
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

  describe('sect + Lord-of-Year', () => {
    it('renders the day-sect line and Lord-of-Year dignity readout', () => {
      // ruler Mercury -> dignity present (domicile, score 5 -> pos tone).
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

  describe('sewoon (saju) row', () => {
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
      expect(saju).toBeInTheDocument()
      expect(saju.textContent).not.toMatch(/[가-힣]/)
      expect(screen.queryByText('세운 십신 + 용신 흐름 한 줄.')).not.toBeInTheDocument()
      const astro = screen.getByText('Profection ruler natal position in English.')
      expect(astro).toBeInTheDocument()
      expect(astro.textContent).not.toMatch(/[가-힣]/)
      expect(screen.queryByText('프로펙션 룰러 본명 위치 한 줄.')).not.toBeInTheDocument()
      // Annual sewoon label uses English prefix in EN
      expect(screen.getByText(/Annual 2026 · 정관/)).toBeInTheDocument()
    })
  })

  describe('ZR cards', () => {
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
      // pivotal tag from the peak subPeriod.
      expect(screen.getByText('Peak · 정점')).toBeInTheDocument()
      // fortune lane has no active chapter.
      expect(screen.getByText('현재 활성 Fortune 챕터 없음')).toBeInTheDocument()
    })
  })

  describe('wheel pivotal badge', () => {
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

  describe('dive button', () => {
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
