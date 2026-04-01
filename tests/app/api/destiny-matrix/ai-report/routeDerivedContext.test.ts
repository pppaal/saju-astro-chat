import { describe, expect, it } from 'vitest'
import {
  buildDerivedCrossSnapshot,
  ensureDerivedSnapshots,
} from '@/app/api/destiny-matrix/ai-report/routeDerivedContext'

describe('routeDerivedContext cross snapshot derivation', () => {
  it('builds rich derived cross snapshot from domain analysis and matrix summary', () => {
    const snapshot = buildDerivedCrossSnapshot({
      dayMasterElement: '목',
      geokguk: 'jeonggwan',
      yongsin: '화',
      currentDaeunElement: '수',
      currentSaeunElement: '화',
      currentWolunElement: '목',
      currentIljinElement: '화',
      currentDateIso: '2026-03-30',
      relations: [{ kind: 'harmony' }],
      aspects: [{ planet1: 'Sun', planet2: 'Jupiter', type: 'trine' }],
      activeTransits: ['saturnReturn', 'jupiterReturn'],
      topInsights: [
        { domain: 'career', category: 'strength', title: 'role expansion' },
        { domain: 'wealth', category: 'caution', title: 'cash leakage' },
      ],
      domainAnalysis: [
        { domain: 'career', score: 82 },
        { domain: 'relationship', score: 71 },
        { domain: 'wealth', score: 76 },
      ],
      matrixSummary: {
        domainScores: {
          career: {
            finalScoreAdjusted: 8.2,
            confidenceScore: 0.78,
            overlapStrength: 0.74,
            sajuComponentScore: 0.8,
            astroComponentScore: 0.77,
            alignmentScore: 0.82,
            drivers: ['approval line'],
            cautions: ['scope creep'],
          },
          love: {
            finalScoreAdjusted: 7.1,
            confidenceScore: 0.72,
            overlapStrength: 0.68,
            sajuComponentScore: 0.71,
            astroComponentScore: 0.74,
            alignmentScore: 0.76,
            drivers: ['cadence'],
            cautions: ['mixed pace'],
          },
        },
        overlapTimelineByDomain: {
          career: [{ month: '2026-04', overlapStrength: 0.78, timeOverlapWeight: 1.2, peakLevel: 'peak' }],
          love: [{ month: '2026-05', overlapStrength: 0.73, timeOverlapWeight: 1.18, peakLevel: 'high' }],
        },
      },
    })

    expect(Array.isArray(snapshot.crossAgreementMatrix)).toBe(true)
    expect(snapshot.crossAgreementMatrix?.length).toBeGreaterThanOrEqual(2)
    expect(typeof snapshot.crossAgreement).toBe('number')
    expect((snapshot.domainScores as Record<string, unknown>)?.career).toBeTruthy()
    expect((snapshot.crossEvidence as { domains?: Record<string, unknown> })?.domains?.career).toBeTruthy()
    expect(
      (
        snapshot.crossEvidence as { domains?: Record<string, { crossConclusion?: string }> }
      )?.domains?.career?.crossConclusion
    ).toContain('커리어')
  })

  it('preserves shallow existing cross snapshot fields while enriching missing details', () => {
    const enriched = ensureDerivedSnapshots({
      currentDateIso: '2026-03-30',
      category: 'career',
      relations: [{ kind: 'harmony' }],
      aspects: [{ planet1: 'Sun', planet2: 'Jupiter', type: 'trine' }],
      domainAnalysis: [{ domain: 'career', score: 84 }],
      crossSnapshot: {
        source: 'user-provided',
        theme: 'career',
      },
    })

    const crossSnapshot = enriched.crossSnapshot as {
      source?: string
      theme?: string
      crossAgreementMatrix?: unknown[]
      crossEvidence?: unknown
    }

    expect(crossSnapshot.source).toBe('user-provided')
    expect(crossSnapshot.theme).toBe('career')
    expect(Array.isArray(crossSnapshot.crossAgreementMatrix)).toBe(true)
    expect(crossSnapshot.crossEvidence).toBeTruthy()
    expect(
      (
        crossSnapshot.crossEvidence as { domains?: Record<string, { crossConclusion?: string }> }
      )?.domains?.career?.crossConclusion
    ).toContain('실행')
  })
})
