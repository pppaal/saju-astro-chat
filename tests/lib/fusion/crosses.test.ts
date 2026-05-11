import { describe, it, expect } from 'vitest'
import {
  crossThemeAtTime,
  crossAllThemesAtTime,
  crossThemeAcrossTimings,
  crossAllThemesAllTimings,
} from '@/lib/fusion/crosses'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars } from '@/lib/saju/themes/types'

const fixturePillars: SimpleSajuPillars = {
  year:  { stem: '甲', branch: '子' },
  month: { stem: '丙', branch: '寅' },
  day:   { stem: '戊', branch: '辰' },
  hour:  { stem: '庚', branch: '申' },
}

const fixtureChart: Chart = {
  ascendant: { name: 'Ascendant', longitude: 0, sign: 'Aries', degree: 0, minute: 0, formatted: '', house: 1 },
  mc: { name: 'MC', longitude: 270, sign: 'Capricorn', degree: 0, minute: 0, formatted: '', house: 10 },
  houses: Array.from({ length: 12 }, (_, i) => ({
    index: i + 1, cusp: i * 30, sign: 'Aries', formatted: '',
  })) as never,
  planets: [
    { name: 'Sun',     longitude: 30,  sign: 'Taurus',     degree: 0, minute: 0, formatted: '', house: 2 },
    { name: 'Moon',    longitude: 60,  sign: 'Gemini',     degree: 0, minute: 0, formatted: '', house: 3 },
    { name: 'Mercury', longitude: 90,  sign: 'Cancer',     degree: 0, minute: 0, formatted: '', house: 4 },
    { name: 'Venus',   longitude: 180, sign: 'Libra',      degree: 0, minute: 0, formatted: '', house: 7 },
    { name: 'Mars',    longitude: 150, sign: 'Virgo',      degree: 0, minute: 0, formatted: '', house: 6 },
    { name: 'Jupiter', longitude: 240, sign: 'Sagittarius', degree: 0, minute: 0, formatted: '', house: 9 },
    { name: 'Saturn',  longitude: 270, sign: 'Capricorn',  degree: 0, minute: 0, formatted: '', house: 10 },
  ],
}

describe('fusion/crosses', () => {
  describe('crossThemeAtTime', () => {
    it('love × lifelong cross 결과 반환', () => {
      const r = crossThemeAtTime({
        saju: fixturePillars,
        astro: fixtureChart,
        theme: 'love',
        timing: { unit: 'lifelong', periodLabel: '평생' },
      })
      expect(r.theme).toBe('love')
      expect(r.timing.unit).toBe('lifelong')
      expect(r.sajuView.theme).toBeDefined()
      expect(r.astroView.theme).toBeDefined()
      expect(r.crossView.tone).toBeDefined()
      expect(r.crossView.consensus).toContain('love')
      expect(r.crossView.factors.length).toBeGreaterThan(0)
    })

    it('career × yearly cross', () => {
      const r = crossThemeAtTime({
        saju: fixturePillars,
        astro: fixtureChart,
        theme: 'career',
        timing: { unit: 'yearly', periodLabel: '2027' },
      })
      expect(r.theme).toBe('career')
      expect(r.timing.periodLabel).toBe('2027')
    })

    it('crisis × monthly cautious tone', () => {
      const r = crossThemeAtTime({
        saju: fixturePillars,
        astro: fixtureChart,
        theme: 'crisis',
        timing: { unit: 'monthly' },
      })
      expect(r.theme).toBe('crisis')
    })

    it('18 테마 모두 호출 가능', () => {
      const themes: Array<typeof r['theme']> = []
      const themeKeys = ['love', 'money', 'career', 'family', 'health', 'personality',
        'study', 'children', 'parents', 'travel', 'social', 'business',
        'reputation', 'spirituality', 'karma', 'crisis', 'creativity', 'legal'] as const
      for (const t of themeKeys) {
        const r = crossThemeAtTime({
          saju: fixturePillars,
          astro: fixtureChart,
          theme: t,
          timing: { unit: 'lifelong' },
        })
        themes.push(r.theme)
      }
      expect(themes).toHaveLength(18)
    })
  })

  describe('crossAllThemesAtTime', () => {
    it('한 시기 18 cross 반환', () => {
      const list = crossAllThemesAtTime(fixturePillars, fixtureChart, { unit: 'lifelong' })
      expect(list).toHaveLength(18)
    })
  })

  describe('crossThemeAcrossTimings', () => {
    it('한 테마 5 시기 cross 반환', () => {
      const list = crossThemeAcrossTimings(
        fixturePillars,
        fixtureChart,
        'love',
        [
          { unit: 'lifelong' },
          { unit: 'decadal',  periodLabel: '2025-2034' },
          { unit: 'yearly',   periodLabel: '2027' },
          { unit: 'monthly',  periodLabel: '2027-05' },
          { unit: 'daily',    periodLabel: '2027-05-15' },
        ],
      )
      expect(list).toHaveLength(5)
      expect(list[0].timing.unit).toBe('lifelong')
      expect(list[4].timing.unit).toBe('daily')
    })
  })

  describe('crossAllThemesAllTimings', () => {
    it('18 테마 × 5 시기 = 90 cross', () => {
      const timings = [
        { unit: 'lifelong' as const },
        { unit: 'decadal' as const },
        { unit: 'yearly' as const },
        { unit: 'monthly' as const },
        { unit: 'daily' as const },
      ]
      const list = crossAllThemesAllTimings(fixturePillars, fixtureChart, timings)
      expect(list).toHaveLength(90)
    })
  })
})

declare const r: { theme: string }
