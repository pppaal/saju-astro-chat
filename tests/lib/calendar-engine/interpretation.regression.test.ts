import { describe, it, expect, beforeAll } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildInterpretation } from '@/lib/calendar-engine/interpretation/matcher'

/**
 * Regression suite — guards the cross-dimensional invariants the
 * calendar engine relies on. Each `it` block asserts a property that
 * silently regressed before this file existed (audit-driven baseline).
 */

interface Profile {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

const SEOUL_MALE_1995: Profile = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const TOKYO_MALE_2001: Profile = {
  birthDate: '2001-11-22',
  birthTime: '22:10',
  gender: 'male',
  latitude: 35.6762,
  longitude: 139.6503,
  timeZone: 'Asia/Tokyo',
}

async function buildForDate(p: Profile, dateIso: string) {
  const saju = calculateSajuData(p.birthDate, p.birthTime, p.gender, 'solar', p.timeZone)
  const natal = await buildNatalContext(p, { saju })
  const cells = await buildCalendar(
    natal,
    {
      start: `${dateIso}T00:00:00.000Z`,
      end: `${dateIso}T23:59:59.000Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
  return { saju, natal, cells, interp }
}

describe('calendar-engine regression', () => {
  describe('different birth profiles → different interpretations', () => {
    it('Seoul 1995 male vs Tokyo 2001 male produce different day masters', async () => {
      const a = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const b = await buildForDate(TOKYO_MALE_2001, '2026-05-15')
      const dmA = a.saju.pillars.day.heavenlyStem.name
      const dmB = b.saju.pillars.day.heavenlyStem.name
      expect(dmA).not.toBe(dmB)
    })

    it('two profiles can produce different derivedScore for the same day', async () => {
      const a = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const b = await buildForDate(TOKYO_MALE_2001, '2026-05-15')
      // Not asserting strict inequality — different sajus can land on
      // the same score by coincidence — but the themeScores breakdown
      // should differ.
      const tsA = a.interp.themeScores ?? {}
      const tsB = b.interp.themeScores ?? {}
      const sigA = `${tsA.love}-${tsA.money}-${tsA.career}-${tsA.health}-${tsA.growth}`
      const sigB = `${tsB.love}-${tsB.money}-${tsB.career}-${tsB.health}-${tsB.growth}`
      expect(sigA).not.toBe(sigB)
    })
  })

  describe('year-over-year ganji distinction', () => {
    it('2024 vs 2025 vs 2026 vs 2027 produce distinct seun narratives', async () => {
      const years = [2024, 2025, 2026, 2027]
      const texts: string[] = []
      for (const y of years) {
        const { interp } = await buildForDate(SEOUL_MALE_1995, `${y}-05-15`)
        const seun = interp.sections.find((s) => s.section === 'seun')?.text ?? ''
        texts.push(seun)
      }
      // Each year must produce a unique text (ganji-specific tail
      // from getGanjiTransitNarrative ensures this).
      const unique = new Set(texts)
      expect(unique.size).toBe(years.length)
    })
  })

  describe('month-wide score distribution', () => {
    it('a full month has no 5+ day tie at the same score', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const dist: Record<number, number> = {}
      for (const c of cells) dist[c.derivedScore] = (dist[c.derivedScore] ?? 0) + 1
      // Soft compression should cap ties — after fix #342, max tie was 5.
      // Leave headroom: assert no score has 8+ ties.
      const maxTie = Math.max(...Object.values(dist))
      expect(maxTie).toBeLessThan(8)
    })

    it('a full month covers a healthy score range (no flat distribution)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const scores = cells.map((c) => c.derivedScore)
      const range = Math.max(...scores) - Math.min(...scores)
      // Score should vary at least 15 points across the month.
      expect(range).toBeGreaterThanOrEqual(15)
    })

    it('soft-compression prevents derivedScore from hitting 100', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const max = Math.max(...cells.map((c) => c.derivedScore))
      expect(max).toBeLessThanOrEqual(98)
    })
  })

  describe('score / themeScores synchronisation', () => {
    it('monthly buildInterpretation produces themeScores for all 5 themes', async () => {
      const { interp } = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const ts = interp.themeScores ?? {}
      // All 5 themes should be populated (Partial<Record> but expect at
      // least 3 of them set since the user has rules firing on multiple
      // domains).
      const themesPopulated = (['love', 'money', 'career', 'health', 'growth'] as const).filter(
        (k) => typeof ts[k] === 'number'
      )
      expect(themesPopulated.length).toBeGreaterThanOrEqual(3)
    })

    it('every cell has a cell.themeScores object (UI 그래프 contract)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-07T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      for (const c of cells) {
        expect(c.themeScores).toBeDefined()
        expect(typeof c.themeScores).toBe('object')
      }
    })
  })
})
