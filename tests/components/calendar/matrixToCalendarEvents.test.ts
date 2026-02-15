import { describe, expect, it } from 'vitest'
import { matrixSummaryToCalendarEvents } from '@/components/calendar/peaks/matrixToCalendarEvents'
import type { DomainKey, DomainScore } from '@/lib/destiny-matrix/types'

function makeDomainScore(
  domain: DomainKey,
  finalScoreAdjusted: number,
  alignmentScore = 0.7
): DomainScore {
  return {
    domain,
    baseFinalScore: finalScoreAdjusted,
    finalScoreAdjusted,
    sajuComponentScore: 0.6,
    astroComponentScore: 0.6,
    alignmentScore,
    overlapStrength: 0.7,
    timeOverlapWeight: 1.2,
    confidenceScore: 0.8,
    drivers: ['Strong momentum'],
    cautions: ['Avoid overcommitment'],
  }
}

describe('matrixSummaryToCalendarEvents', () => {
  it('respects month/year caps', () => {
    const overlapTimeline = Array.from({ length: 12 }).map((_, idx) => {
      const month = String((idx % 12) + 1).padStart(2, '0')
      return {
        month: `2026-${month}`,
        overlapStrength: 0.8,
        timeOverlapWeight: 1.24,
        peakLevel: 'peak' as const,
      }
    })

    const events = matrixSummaryToCalendarEvents({
      overlapTimeline,
      confidenceScore: 0.9,
      drivers: ['D1', 'D2'],
      cautions: ['C1'],
      alignmentScore: 0.8,
      timeOverlapWeight: 1.2,
      domainScores: {
        career: makeDomainScore('career', 9),
        love: makeDomainScore('love', 8),
        money: makeDomainScore('money', 7),
        health: makeDomainScore('health', 6),
        move: makeDomainScore('move', 5),
      },
      overlapTimelineByDomain: {
        career: overlapTimeline,
        love: overlapTimeline,
        money: overlapTimeline,
        health: overlapTimeline,
        move: overlapTimeline,
      },
    })

    expect(events.length).toBeLessThanOrEqual(18)

    const perMonth = new Map<string, number>()
    for (const event of events) {
      perMonth.set(event.month, (perMonth.get(event.month) || 0) + 1)
    }

    expect([...perMonth.values()].every((count) => count <= 2)).toBe(true)
  })

  it('prefixes explore when confidence is low', () => {
    const events = matrixSummaryToCalendarEvents({
      confidenceScore: 0.4,
      overlapTimeline: [
        {
          month: '2026-02',
          overlapStrength: 0.8,
          timeOverlapWeight: 1.24,
          peakLevel: 'peak',
        },
      ],
      domainScores: {
        career: makeDomainScore('career', 9),
        love: makeDomainScore('love', 8),
        money: makeDomainScore('money', 7),
        health: makeDomainScore('health', 6),
        move: makeDomainScore('move', 5),
      },
      overlapTimelineByDomain: {
        career: [
          { month: '2026-02', overlapStrength: 0.9, timeOverlapWeight: 1.27, peakLevel: 'peak' },
        ],
        love: [
          { month: '2026-02', overlapStrength: 0.9, timeOverlapWeight: 1.27, peakLevel: 'peak' },
        ],
        money: [],
        health: [],
        move: [],
      },
    })

    expect(events.length).toBeGreaterThan(0)
    expect(events.every((event) => event.title.startsWith('(Explore)'))).toBe(true)
  })

  it('uses only top 2 domains for domain peak events', () => {
    const events = matrixSummaryToCalendarEvents({
      confidenceScore: 0.9,
      overlapTimeline: [
        { month: '2026-02', overlapStrength: 0.81, timeOverlapWeight: 1.24, peakLevel: 'peak' },
      ],
      domainScores: {
        career: makeDomainScore('career', 9, 0.6),
        love: makeDomainScore('love', 8, 0.9),
        money: makeDomainScore('money', 8, 0.7),
        health: makeDomainScore('health', 6, 0.7),
        move: makeDomainScore('move', 5, 0.7),
      },
      overlapTimelineByDomain: {
        career: [
          { month: '2026-02', overlapStrength: 0.81, timeOverlapWeight: 1.24, peakLevel: 'peak' },
        ],
        love: [
          { month: '2026-02', overlapStrength: 0.81, timeOverlapWeight: 1.24, peakLevel: 'peak' },
        ],
        money: [
          { month: '2026-02', overlapStrength: 0.81, timeOverlapWeight: 1.24, peakLevel: 'peak' },
        ],
        health: [],
        move: [],
      },
    })

    const domainEvents = events.filter((event) => event.domain !== 'global')
    expect(domainEvents.length).toBeGreaterThan(0)
    expect(
      domainEvents.every((event) => event.domain === 'career' || event.domain === 'love')
    ).toBe(true)
    expect(domainEvents.some((event) => event.domain === 'money')).toBe(false)
  })
})
