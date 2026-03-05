import { describe, expect, it } from 'vitest'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixHighlight, MatrixSummary } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/Saju/types'
import { synthesizeMatrixSignals } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

function mkHighlight(
  layer: number,
  rowKey: string,
  colKey: string,
  score: number,
  keyword: string
): MatrixHighlight {
  return {
    layer,
    rowKey,
    colKey,
    cell: {
      interaction: {
        level: 'amplify',
        score,
        icon: 'x',
        colorCode: 'green',
        keyword,
        keywordEn: keyword,
      },
      sajuBasis: `${rowKey} saju`,
      astroBasis: `${colKey} astro`,
      advice: `${keyword} advice`,
    },
  }
}

function mkReport(seed: number): FusionReport {
  return {
    id: `r_${seed}`,
    generatedAt: new Date(),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '\uBAA9' as FiveElement,
      dayMasterDescription: 'wood',
      dominantSibsin: [],
      keyShinsals: [],
    },
    overallScore: {
      total: 70 + (seed % 20),
      grade: 'A',
      gradeDescription: 'A',
      gradeDescriptionEn: 'A',
      categoryScores: { strength: 80, opportunity: 78, balance: 74, caution: 46, challenge: 39 },
    },
    topInsights: [
      {
        id: `career_${seed}`,
        domain: 'career',
        category: 'strength',
        title: `career focus ${seed}`,
        titleEn: `career focus ${seed}`,
        description: 'career momentum',
        descriptionEn: 'career momentum',
        score: 80 + (seed % 10),
        rawScore: 80 + (seed % 10),
        weightedScore: 80 + (seed % 10),
        confidence: 0.8,
        priority: 'high',
        actionItems: [],
        icon: 'briefcase',
        colorCode: 'blue',
        sources: [],
      } as any,
      {
        id: `wealth_${seed}`,
        domain: 'wealth',
        category: 'balance',
        title: `wealth focus ${seed}`,
        titleEn: `wealth focus ${seed}`,
        description: 'wealth control',
        descriptionEn: 'wealth control',
        score: 72 + (seed % 8),
        rawScore: 72 + (seed % 8),
        weightedScore: 72 + (seed % 8),
        confidence: 0.75,
        priority: 'high',
        actionItems: [],
        icon: 'coin',
        colorCode: 'amber',
        sources: [],
      } as any,
    ],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 70 + (seed % 12),
        description: 'flow',
        descriptionEn: 'flow',
      },
      activeTransits: [],
      upcomingPeriods: [],
      retrogradeAlerts: [],
    },
    visualizations: {
      radarChart: { labels: [], labelsEn: [], values: [], maxValue: 100 },
      heatmap: { rows: [], cols: [], values: [], colorScale: [] },
      synergyNetwork: { nodes: [], edges: [] },
      timeline: { events: [] },
    },
  }
}

function mkSummary(seed: number): MatrixSummary {
  const offset = seed % 5
  return {
    totalScore: 63 + (seed % 30),
    strengthPoints: [
      mkHighlight(6, `imgwan_${seed}`, 'H10', 10 - (offset % 2), `career peak ${seed}`),
      mkHighlight(3, `siksin_${seed}`, 'H7', 9 - (offset % 3), `relationship drive ${seed}`),
      mkHighlight(2, `pyeonjae_${seed}`, 'Jupiter', 8 - (offset % 2), `wealth gate ${seed}`),
    ],
    cautionPoints: [
      mkHighlight(5, `chung_${seed}`, 'square', 2 + (offset % 3), `friction ${seed}`),
      mkHighlight(1, `saturn_h1_${seed}`, 'H1', 3 + (offset % 2), `self pressure ${seed}`),
    ],
    balancePoints: [
      mkHighlight(4, `daeun_${seed}`, 'transit', 6, `timing window ${seed}`),
      mkHighlight(3, `jeongin_${seed}`, 'H6', 6 - (offset % 2), `health routine ${seed}`),
    ],
    topSynergies: [],
  }
}

describe('synthesizeMatrixSignals regression matrix (60 cases)', () => {
  it('keeps structural quality and semantic grounding across generated cases', () => {
    const CASES = 60
    for (let seed = 0; seed < CASES; seed += 1) {
      const result = synthesizeMatrixSignals({
        lang: seed % 2 === 0 ? 'ko' : 'en',
        matrixReport: mkReport(seed),
        matrixSummary: mkSummary(seed),
      })

      expect(result.selectedSignals).toHaveLength(7)
      expect(result.claims.length).toBeGreaterThanOrEqual(3)

      for (const signal of result.selectedSignals) {
        expect(signal.semantic?.layerMeaningKo?.length || 0).toBeGreaterThan(0)
        expect(signal.semantic?.layerMeaningEn?.length || 0).toBeGreaterThan(0)
      }

      const hasCareerSignal = result.selectedSignals.some((s) => s.domainHints.includes('career'))
      const hasWealthSignal = result.selectedSignals.some((s) => s.domainHints.includes('wealth'))
      const hasRelationshipSignal = result.selectedSignals.some((s) =>
        s.domainHints.includes('relationship')
      )
      const hasTimingSignal = result.selectedSignals.some((s) => s.domainHints.includes('timing'))

      if (hasCareerSignal)
        expect(result.claims.some((claim) => claim.domain === 'career')).toBe(true)
      if (hasWealthSignal)
        expect(result.claims.some((claim) => claim.domain === 'wealth')).toBe(true)
      if (hasRelationshipSignal) {
        expect(result.claims.some((claim) => claim.domain === 'relationship')).toBe(true)
      }
      if (hasTimingSignal)
        expect(result.claims.some((claim) => claim.domain === 'timing')).toBe(true)

      for (const claim of result.claims) {
        expect(claim.thesis.length).toBeGreaterThan(30)
        expect(claim.riskControl.length).toBeGreaterThan(20)
        expect(claim.evidence.length).toBeGreaterThan(0)
      }
    }
  })
})
