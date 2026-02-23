import { describe, expect, it } from 'vitest'
import { buildPremiumActionChecklist } from '@/lib/destiny-matrix/actionChecklist'
import type { MatrixSummary } from '@/lib/destiny-matrix/types'

function createSummary(overrides: Partial<MatrixSummary> = {}): MatrixSummary {
  return {
    totalScore: 7.8,
    confidenceScore: 0.72,
    strengthPoints: [],
    balancePoints: [],
    cautionPoints: [],
    topSynergies: [],
    ...overrides,
  }
}

describe('buildPremiumActionChecklist', () => {
  it('builds a long actionable checklist for today and tomorrow', () => {
    const summary = createSummary()
    const result = buildPremiumActionChecklist({
      summary,
      locale: 'ko',
      todayDate: '2026-02-23',
      todayTransits: ['jupiterReturn'],
      tomorrowDate: '2026-02-24',
      tomorrowTransits: ['saturnReturn'],
    })

    expect(result.today.checklist.length).toBeGreaterThanOrEqual(8)
    expect(result.today.checklist.length).toBeLessThanOrEqual(10)
    expect(result.today.checklist[0].doneWhen.length).toBeGreaterThan(0)
    expect(result.tomorrow?.checklist.length).toBeGreaterThanOrEqual(8)
  })

  it('maps communication-heavy transit to speech risk guardrails', () => {
    const summary = createSummary({
      confidenceScore: 0.55,
    })
    const result = buildPremiumActionChecklist({
      summary,
      locale: 'ko',
      todayDate: '2026-02-23',
      todayTransits: ['mercuryRetrograde'],
    })

    expect(result.today.riskPrimary).toBe('speech')
    expect(result.today.riskLevel).toBe('mid')
    expect(result.today.avoid.join(' ')).toContain('확정')
  })

  it('selects social intent when love domain dominates', () => {
    const summary = createSummary({
      domainScores: {
        career: { domain: 'career', baseFinalScore: 5, finalScoreAdjusted: 5, sajuComponentScore: 0.5, astroComponentScore: 0.5, alignmentScore: 0.5, overlapStrength: 0.5, timeOverlapWeight: 1.1, confidenceScore: 0.5, drivers: [], cautions: [] },
        love: { domain: 'love', baseFinalScore: 8.5, finalScoreAdjusted: 8.5, sajuComponentScore: 0.6, astroComponentScore: 0.6, alignmentScore: 0.6, overlapStrength: 0.6, timeOverlapWeight: 1.2, confidenceScore: 0.6, drivers: [], cautions: [] },
        money: { domain: 'money', baseFinalScore: 4.5, finalScoreAdjusted: 4.5, sajuComponentScore: 0.4, astroComponentScore: 0.4, alignmentScore: 0.4, overlapStrength: 0.4, timeOverlapWeight: 1.0, confidenceScore: 0.4, drivers: [], cautions: [] },
        health: { domain: 'health', baseFinalScore: 5.2, finalScoreAdjusted: 5.2, sajuComponentScore: 0.5, astroComponentScore: 0.5, alignmentScore: 0.5, overlapStrength: 0.5, timeOverlapWeight: 1.0, confidenceScore: 0.5, drivers: [], cautions: [] },
        move: { domain: 'move', baseFinalScore: 5.1, finalScoreAdjusted: 5.1, sajuComponentScore: 0.5, astroComponentScore: 0.5, alignmentScore: 0.5, overlapStrength: 0.5, timeOverlapWeight: 1.0, confidenceScore: 0.5, drivers: [], cautions: [] },
      },
    })
    const result = buildPremiumActionChecklist({
      summary,
      locale: 'ko',
      todayDate: '2026-02-23',
      todayTransits: [],
    })

    expect(result.today.intentPrimary).toBe('social')
  })
})

