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
    it('2027 5월 31일 결과 반환', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027,
        5,
      )
      expect(month.year).toBe(2027)
      expect(month.month).toBe(5)
      expect(month.days).toHaveLength(31)  // May has 31 days
    })

    it('2027 2월 28일', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027,
        2,
      )
      expect(month.days).toHaveLength(28)
    })

    it('각 날짜에 domainScores·tone·label 있음', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027,
        5,
      )
      const day = month.days[0]
      expect(day.date).toBe('2027-05-01')
      expect(day.domainScores).toBeDefined()
      expect(day.tone).toBeDefined()
      expect(day.label).toBeTruthy()
      expect(Object.keys(day.domainScores).length).toBeGreaterThan(0)
    })

    it('highlights — bestDays top 5', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027,
        5,
      )
      expect(month.highlights.bestDays).toHaveLength(5)
    })

    it('highlights — auspiciousByDomain', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027,
        5,
      )
      expect(month.highlights.auspiciousByDomain.love).toBeDefined()
      expect(month.highlights.auspiciousByDomain.career).toBeDefined()
    })

    it('iljin 매핑 작동', () => {
      const month = buildCalendarMonth(
        {
          saju: fixturePillars,
          astro: fixtureChart,
          iljinByDate: { '2027-05-15': '갑자' },
        },
        2027,
        5,
      )
      const day15 = month.days.find((d) => d.date === '2027-05-15')
      expect(day15?.iljin).toBe('갑자')
    })

    it('월 통계 — monthScore, monthTone, monthlyDomains, monthNarrative', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027,
        5,
      )
      expect(month.monthScore).toBeGreaterThanOrEqual(0)
      expect(month.monthScore).toBeLessThanOrEqual(1)
      expect(month.monthTone).toBeDefined()
      expect(month.monthlyDomains.love).toBeDefined()
      expect(month.monthlyDomains.career).toBeDefined()
      expect(month.monthNarrative).toContain('이 달은')
      expect(month.monthNarrative.length).toBeGreaterThan(20)
    })
  })

  describe('buildCalendarDay', () => {
    it('18 테마 풀 cross 반환', () => {
      const day = buildCalendarDay(
        { saju: fixturePillars, astro: fixtureChart },
        '2027-05-15',
      )
      expect(day.date).toBe('2027-05-15')
      expect(day.crosses).toHaveLength(18)
    })

    it('topInsights 7 이내', () => {
      const day = buildCalendarDay(
        { saju: fixturePillars, astro: fixtureChart },
        '2027-05-15',
      )
      expect(day.topInsights.length).toBeLessThanOrEqual(7)
    })

    it('domainScores numeric (0~1)', () => {
      const day = buildCalendarDay(
        { saju: fixturePillars, astro: fixtureChart },
        '2027-05-15',
      )
      expect(day.domainScores.love).toBeGreaterThanOrEqual(0)
      expect(day.domainScores.love).toBeLessThanOrEqual(1)
      expect(day.domainScores.career).toBeDefined()
    })

    it('advice do/avoid 배열', () => {
      const day = buildCalendarDay(
        { saju: fixturePillars, astro: fixtureChart },
        '2027-05-15',
      )
      expect(day.advice).toBeDefined()
      expect(Array.isArray(day.advice.do)).toBe(true)
      expect(Array.isArray(day.advice.avoid)).toBe(true)
    })

    it('lunar / isCheoneulGwiin caller 제공', () => {
      const day = buildCalendarDay(
        {
          saju: fixturePillars,
          astro: fixtureChart,
          lunarByDate: { '2027-05-15': '음 4월 9일' },
          isCheoneulGwiinByDate: { '2027-05-15': true },
        },
        '2027-05-15',
      )
      expect(day.lunar).toBe('음 4월 9일')
      expect(day.isCheoneulGwiin).toBe(true)
    })

    it('bestDaysOfMonth top 3', () => {
      const month = buildCalendarMonth(
        { saju: fixturePillars, astro: fixtureChart },
        2027, 5,
      )
      const day = buildCalendarDay(
        { saju: fixturePillars, astro: fixtureChart, bestDaysOfMonth: month.highlights.bestDays },
        '2027-05-15',
      )
      expect(day.bestDaysOfMonth?.length).toBeLessThanOrEqual(3)
    })
  })
})
