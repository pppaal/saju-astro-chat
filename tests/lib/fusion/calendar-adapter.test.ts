import { describe, it, expect } from 'vitest'
import { buildCalendarMonth, buildCalendarDay } from '@/lib/fusion/adapters'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'

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

describe('fusion/adapters/forCalendar', () => {
  describe('buildCalendarMonth', () => {
    it('2027-05 31일', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 5)
      expect(m.year).toBe(2027)
      expect(m.month).toBe(5)
      expect(m.days).toHaveLength(31)
    })

    it('2027-02 28일', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 2)
      expect(m.days).toHaveLength(28)
    })

    it('domainScores·tone·label', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 5)
      const d = m.days[0]
      expect(d.date).toBe('2027-05-01')
      expect(d.domainScores).toBeDefined()
      expect(d.tone).toBeDefined()
      expect(d.label).toBeTruthy()
    })

    it('bestDays top 5', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 5)
      expect(m.highlights.bestDays).toHaveLength(5)
    })

    it('auspiciousByDomain', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 5)
      expect(m.highlights.auspiciousByDomain.love).toBeDefined()
      expect(m.highlights.auspiciousByDomain.career).toBeDefined()
    })

    it('iljinByDate override', async () => {
      const m = await buildCalendarMonth({
        saju: fixturePillars, astro: fixtureChart,
        iljinByDate: { '2027-05-15': '갑자' },
      }, 2027, 5)
      expect(m.days.find(d => d.date === '2027-05-15')?.iljin).toBe('갑자')
    })

    it('월 통계', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 5)
      expect(m.monthScore).toBeGreaterThanOrEqual(0)
      expect(m.monthScore).toBeLessThanOrEqual(1)
      expect(m.monthlyDomains.love).toBeDefined()
      expect(m.monthNarrative).toMatch(/이[번]? 달은/)
    })
  })

  describe('buildCalendarDay', () => {
    it('18 테마 cross', async () => {
      const d = await buildCalendarDay({ saju: fixturePillars, astro: fixtureChart }, '2027-05-15')
      expect(d.crosses).toHaveLength(18)
    })

    it('topInsights 7 이내', async () => {
      const d = await buildCalendarDay({ saju: fixturePillars, astro: fixtureChart }, '2027-05-15')
      expect(d.topInsights.length).toBeLessThanOrEqual(7)
    })

    it('domainScores numeric', async () => {
      const d = await buildCalendarDay({ saju: fixturePillars, astro: fixtureChart }, '2027-05-15')
      expect(d.domainScores.love).toBeGreaterThanOrEqual(0)
      expect(d.domainScores.love).toBeLessThanOrEqual(1)
    })

    it('advice', async () => {
      const d = await buildCalendarDay({ saju: fixturePillars, astro: fixtureChart }, '2027-05-15')
      expect(Array.isArray(d.advice.do)).toBe(true)
      expect(Array.isArray(d.advice.avoid)).toBe(true)
    })

    it('lunar/cheoneulgwiin caller', async () => {
      const d = await buildCalendarDay({
        saju: fixturePillars, astro: fixtureChart,
        lunarByDate: { '2027-05-15': '음 4월 9일' },
        isCheoneulGwiinByDate: { '2027-05-15': true },
      }, '2027-05-15')
      expect(d.lunar).toBe('음 4월 9일')
      expect(d.isCheoneulGwiin).toBe(true)
    })

    it('bestDaysOfMonth top 3', async () => {
      const m = await buildCalendarMonth({ saju: fixturePillars, astro: fixtureChart }, 2027, 5)
      const d = await buildCalendarDay({
        saju: fixturePillars, astro: fixtureChart,
        bestDaysOfMonth: m.highlights.bestDays,
      }, '2027-05-15')
      expect(d.bestDaysOfMonth?.length).toBeLessThanOrEqual(3)
    })
  })
})
