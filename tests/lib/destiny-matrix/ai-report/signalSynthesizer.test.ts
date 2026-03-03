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

function mkReport(): FusionReport {
  return {
    id: 'r1',
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
      total: 80,
      grade: 'A',
      gradeDescription: 'A',
      gradeDescriptionEn: 'A',
      categoryScores: { strength: 80, opportunity: 80, balance: 70, caution: 40, challenge: 30 },
    },
    topInsights: [],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 70,
        description: 'd',
        descriptionEn: 'd',
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

function mkSummary(): MatrixSummary {
  return {
    totalScore: 73,
    strengthPoints: [
      mkHighlight(6, 'imgwan', 'H10', 10, 'career-peak'),
      mkHighlight(8, 'cheon-eul', 'Jupiter', 9, 'mentor-luck'),
      mkHighlight(3, 'siksin', 'H7', 8, 'relationship-drive'),
    ],
    cautionPoints: [
      mkHighlight(6, 'sa', 'H10', 2, 'career-reset'),
      mkHighlight(5, '\uD3B8\uC7AC', 'Saturn', 4, 'cash-limit'),
    ],
    balancePoints: [
      mkHighlight(3, 'jeongin', 'H6', 6, 'health-routine'),
      mkHighlight(4, 'shortTerm', 'h9_move', 6, 'move-window'),
    ],
    topSynergies: [],
  }
}

describe('synthesizeMatrixSignals', () => {
  it('applies 7-pick rule and synthesizes domain claims', () => {
    const result = synthesizeMatrixSignals({
      lang: 'ko',
      matrixReport: mkReport(),
      matrixSummary: mkSummary(),
    })

    expect(result.selectedSignals).toHaveLength(7)
    expect(result.selectedSignals.filter((s) => s.polarity === 'strength')).toHaveLength(3)
    expect(result.selectedSignals.filter((s) => s.polarity === 'caution')).toHaveLength(2)
    expect(result.selectedSignals.filter((s) => s.polarity === 'balance')).toHaveLength(2)

    const domainCount = new Set(result.selectedSignals.map((s) => s.domainHints[0])).size
    expect(domainCount).toBeGreaterThanOrEqual(3)

    const careerClaim = result.claims.find((c) => c.domain === 'career')
    expect(careerClaim).toBeTruthy()
    expect(careerClaim?.evidence.length).toBeGreaterThanOrEqual(2)
  })
})
