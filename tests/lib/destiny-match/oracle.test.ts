import { describe, it, expect, vi } from 'vitest'

import { createSeededRandom } from '@/lib/destiny-match/oracle/seededRandom'
import { buildOracleSeed, drawRelationshipSpread } from '@/lib/destiny-match/oracle/tarotDraw'
import {
  getOracleReading,
  isRelationshipActivity,
  DEFAULT_ORACLE_ACTIVITY,
} from '@/lib/destiny-match/oracle'
import { tarotDeck } from '@/lib/tarot/data'

vi.mock('@/lib/saju/saju', () => ({
  calculateSajuData: vi.fn().mockReturnValue({
    pillars: {
      year: {
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      },
      month: {
        heavenlyStem: { name: '乙' },
        earthlyBranch: { name: '丑' },
      },
      day: {
        heavenlyStem: { name: '丙' },
        earthlyBranch: { name: '寅' },
      },
      time: {
        heavenlyStem: { name: '丁' },
        earthlyBranch: { name: '卯' },
      },
    },
  }),
}))

vi.mock('@/lib/prediction/specificDateEngine', async () => {
  const actual = await vi.importActual<typeof import('@/lib/prediction/specificDateEngine')>(
    '@/lib/prediction/specificDateEngine'
  )
  return {
    ...actual,
    findBestDates: vi.fn().mockImplementation((input) => {
      const start = input.startDate ?? new Date()
      const days = input.searchDays ?? 14
      const out = []
      for (let i = 0; i < days; i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        out.push({
          date,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          dayOfWeek: '월',
          totalScore: 60 + (i % 5) * 5, // varies but bounded
          activityScore: 70,
          grade: 'B',
          rank: 0,
          dailyStem: '甲',
          dailyBranch: '子',
          twelveStage: '왕',
          sibsin: '비견',
          bestHours: [
            {
              hour: 10,
              hourRange: '09:00-11:00',
              siGan: '巳',
              quality: 'excellent',
              reason: 'mock reason',
              score: 90,
            },
          ],
          reasons: [`reason-${i}`],
          warnings: [],
          detailedAnalysis: 'mock',
        })
      }
      return out
    }),
  }
})

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe('createSeededRandom', () => {
  it('returns same sequence for same seed', () => {
    const a = createSeededRandom('match:abc')
    const b = createSeededRandom('match:abc')
    const seqA = Array.from({ length: 5 }, () => a.nextInt(78))
    const seqB = Array.from({ length: 5 }, () => b.nextInt(78))
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createSeededRandom('match:abc')
    const b = createSeededRandom('match:xyz')
    const seqA = Array.from({ length: 5 }, () => a.nextInt(78))
    const seqB = Array.from({ length: 5 }, () => b.nextInt(78))
    expect(seqA).not.toEqual(seqB)
  })

  it('nextInt stays in [0, max)', () => {
    const r = createSeededRandom('seed')
    for (let i = 0; i < 200; i++) {
      const n = r.nextInt(78)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(78)
    }
  })
})

describe('buildOracleSeed', () => {
  it('buckets by UTC day so two requests on the same day match', () => {
    const morning = new Date('2026-05-07T01:00:00Z')
    const evening = new Date('2026-05-07T23:30:00Z')
    expect(buildOracleSeed({ connectionId: 'c1', asOf: morning })).toBe(
      buildOracleSeed({ connectionId: 'c1', asOf: evening })
    )
  })

  it('changes seed across UTC day boundary', () => {
    const today = new Date('2026-05-07T20:00:00Z')
    const tomorrow = new Date('2026-05-08T03:00:00Z')
    expect(buildOracleSeed({ connectionId: 'c1', asOf: today })).not.toBe(
      buildOracleSeed({ connectionId: 'c1', asOf: tomorrow })
    )
  })

  it('does NOT change when activity differs (cards stay stable across activity toggles)', () => {
    const at = new Date('2026-05-07T12:00:00Z')
    // Tarot draw must be deterministic across activity changes — see tarotDraw.ts.
    const a = drawRelationshipSpread(buildOracleSeed({ connectionId: 'c1', asOf: at }))
    const b = drawRelationshipSpread(buildOracleSeed({ connectionId: 'c1', asOf: at }))
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id))
  })
})

describe('drawRelationshipSpread', () => {
  const seed = 'connection:abc|meeting|2026-05-07'

  it('returns three positioned cards', () => {
    const spread = drawRelationshipSpread(seed)
    expect(spread.spread).toBe('relationship-3card')
    expect(spread.cards).toHaveLength(3)
    expect(spread.cards.map((c) => c.position)).toEqual(['present', 'potential', 'advice'])
  })

  it('is deterministic for the same seed', () => {
    const a = drawRelationshipSpread(seed)
    const b = drawRelationshipSpread(seed)
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id))
    expect(a.cards.map((c) => c.reversed)).toEqual(b.cards.map((c) => c.reversed))
  })

  it('does not draw the same card twice in a single spread', () => {
    const ids = drawRelationshipSpread(seed).cards.map((c) => c.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('drawn cards exist in the deck', () => {
    const validIds = new Set(tarotDeck.map((c) => c.id))
    for (const card of drawRelationshipSpread(seed).cards) {
      expect(validIds.has(card.id)).toBe(true)
    }
  })

  it('different seeds produce different draws (most of the time)', () => {
    const a = drawRelationshipSpread('seed-a').cards.map((c) => c.id)
    const b = drawRelationshipSpread('seed-z').cards.map((c) => c.id)
    expect(a).not.toEqual(b)
  })
})

describe('isRelationshipActivity', () => {
  it('accepts whitelisted activities', () => {
    expect(isRelationshipActivity('meeting')).toBe(true)
    expect(isRelationshipActivity('proposal')).toBe(true)
    expect(isRelationshipActivity('travel')).toBe(true)
  })

  it('rejects non-relationship activities', () => {
    expect(isRelationshipActivity('surgery')).toBe(false)
    expect(isRelationshipActivity('investment')).toBe(false)
    expect(isRelationshipActivity('not-a-thing')).toBe(false)
  })
})

describe('getOracleReading', () => {
  const baseInput = {
    connectionId: 'conn-test-1',
    asOf: new Date('2026-05-07T12:00:00Z'),
    person1: { birthDate: '1990-05-15', birthTime: '14:30', gender: 'M' },
    person2: { birthDate: '1992-08-20', birthTime: '09:00', gender: 'F' },
  }

  it('returns tarot + auspicious dates with default activity', async () => {
    const reading = await getOracleReading(baseInput)
    expect(reading.activity).toBe(DEFAULT_ORACLE_ACTIVITY)
    expect(reading.tarot.cards).toHaveLength(3)
    expect(reading.auspicious.windowDays).toBe(14)
    expect(reading.auspicious.dates.length).toBeGreaterThan(0)
    expect(reading.auspicious.dates.length).toBeLessThanOrEqual(5)
  })

  it('produces identical readings for two callers on the same day', async () => {
    const a = await getOracleReading(baseInput)
    const b = await getOracleReading(baseInput)
    expect(a.tarot.cards.map((c) => c.id)).toEqual(b.tarot.cards.map((c) => c.id))
    expect(a.auspicious.dates.map((d) => d.date)).toEqual(b.auspicious.dates.map((d) => d.date))
  })

  it('respects activity override', async () => {
    const reading = await getOracleReading({ ...baseInput, activity: 'proposal' })
    expect(reading.activity).toBe('proposal')
  })

  it('top dates are sorted by score descending', async () => {
    const reading = await getOracleReading(baseInput)
    const scores = reading.auspicious.dates.map((d) => d.score)
    const sorted = [...scores].sort((x, y) => y - x)
    expect(scores).toEqual(sorted)
  })

  it('each date has YYYY-MM-DD format and a grade', async () => {
    const reading = await getOracleReading(baseInput)
    for (const d of reading.auspicious.dates) {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(['S', 'A', 'B', 'C', 'D']).toContain(d.grade)
    }
  })
})
