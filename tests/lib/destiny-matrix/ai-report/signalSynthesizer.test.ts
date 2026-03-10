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

  it('keeps career and wealth signal coverage when candidates exist', () => {
    const report = mkReport()
    report.topInsights = [
      {
        id: 'career_hint',
        domain: 'career',
        category: 'strength',
        title: 'Career execution window',
        titleEn: 'Career execution window',
        description: 'career focus',
        descriptionEn: 'career focus',
        score: 84,
        rawScore: 84,
        weightedScore: 84,
        confidence: 0.8,
        priority: 'high',
        actionItems: [],
        icon: 'briefcase',
        colorCode: 'blue',
        sources: [],
      } as any,
      {
        id: 'wealth_hint',
        domain: 'wealth',
        category: 'balance',
        title: 'Wealth risk control',
        titleEn: 'Wealth risk control',
        description: 'wealth focus',
        descriptionEn: 'wealth focus',
        score: 79,
        rawScore: 79,
        weightedScore: 79,
        confidence: 0.75,
        priority: 'high',
        actionItems: [],
        icon: 'coin',
        colorCode: 'amber',
        sources: [],
      } as any,
    ]

    const lowDomainSummary: MatrixSummary = {
      totalScore: 65,
      strengthPoints: [
        mkHighlight(5, 'samhap', 'trine', 10, 'harmony'),
        mkHighlight(5, 'samhap', 'conjunction', 9, 'synergy'),
        mkHighlight(1, '금', 'air', 6, 'balance'),
      ],
      cautionPoints: [
        mkHighlight(5, 'chung', 'square', 3, 'friction'),
        mkHighlight(2, '상관', 'Saturn', 2, 'delay'),
      ],
      balancePoints: [
        mkHighlight(1, '목', 'air', 5, 'mixed'),
        mkHighlight(4, 'seun', 'trine', 5, 'timing'),
      ],
      topSynergies: [],
    }

    const result = synthesizeMatrixSignals({
      lang: 'ko',
      matrixReport: report,
      matrixSummary: lowDomainSummary,
    })

    expect(result.selectedSignals.some((s) => s.domainHints.includes('career'))).toBe(true)
    expect(result.selectedSignals.some((s) => s.domainHints.includes('wealth'))).toBe(true)
  })

  it('maps one signal into multiple claims when domain hints overlap', () => {
    const summary: MatrixSummary = {
      totalScore: 72,
      strengthPoints: [
        mkHighlight(6, '\uD3B8\uC7AC', 'H10', 10, 'dual domain leverage'),
        mkHighlight(6, 'imgwan', 'Jupiter', 9, 'career lift'),
        mkHighlight(3, 'siksin', 'H7', 8, 'relationship rhythm'),
      ],
      cautionPoints: [
        mkHighlight(5, 'chung', 'square', 3, 'friction'),
        mkHighlight(2, '\uC0C1\uAD00', 'Saturn', 2, 'delay'),
      ],
      balancePoints: [
        mkHighlight(1, '\uBAA9', 'air', 6, 'balance'),
        mkHighlight(4, 'seun', 'trine', 6, 'timing'),
      ],
      topSynergies: [],
    }

    const result = synthesizeMatrixSignals({
      lang: 'ko',
      matrixReport: mkReport(),
      matrixSummary: summary,
    })

    const dualEvidenceId = 'L6:\uD3B8\uC7AC:H10'
    const careerClaim = result.claims.find((claim) => claim.domain === 'career')
    const wealthClaim = result.claims.find((claim) => claim.domain === 'wealth')

    expect(careerClaim).toBeTruthy()
    expect(wealthClaim).toBeTruthy()
    expect(careerClaim?.evidence).toContain(dualEvidenceId)
    expect(wealthClaim?.evidence).toContain(dualEvidenceId)
  })

  it('converts rich advancedAstroSignals and snapshots into normalized coverage signals', () => {
    const result = synthesizeMatrixSignals({
      lang: 'ko',
      matrixReport: mkReport(),
      matrixSummary: mkSummary(),
      matrixInput: {
        dayMasterElement: '목' as any,
        pillarElements: ['목', '화', '토', '금'] as any,
        sibsinDistribution: { 편재: 2 } as any,
        twelveStages: {} as any,
        relations: [] as any,
        planetHouses: { Sun: 1, Jupiter: 10 } as any,
        planetSigns: { Sun: 'Aquarius' } as any,
        aspects: [] as any,
        advancedAstroSignals: {
          solarReturn: { score: 77 },
          lunarReturn: ['Moon'],
          fixedStars: 'active',
          eclipses: { impact: ['Sun'] },
        } as any,
        sajuSnapshot: { unse: { daeun: [{ age: 31 }] }, facts: { dayMaster: '경' } } as any,
        astrologySnapshot: { natalChart: { planets: [{ name: 'Sun' }] } } as any,
        crossSnapshot: { source: 'test', crossAgreement: 0.58 } as any,
      },
    })

    const ids = result.normalizedSignals.map((signal) => signal.id)
    expect(ids.some((id) => id.startsWith('COV:L10:advanced:solarreturn'))).toBe(true)
    expect(ids.some((id) => id.startsWith('COV:L10:advanced:eclipses'))).toBe(true)
    expect(ids.some((id) => id.startsWith('COV:L7:snapshot_saju:present'))).toBe(true)
    expect(ids.some((id) => id.startsWith('COV:L10:snapshot_astro:present'))).toBe(true)
    expect(ids.some((id) => id.startsWith('COV:L10:snapshot_cross:present'))).toBe(true)
  })

  it('emits wolun and iljin timing coverage signals when short-term timing is present', () => {
    const result = synthesizeMatrixSignals({
      lang: 'ko',
      matrixReport: mkReport(),
      matrixSummary: mkSummary(),
      matrixInput: {
        dayMasterElement: '목' as any,
        pillarElements: ['목', '화', '토', '금'] as any,
        sibsinDistribution: {} as any,
        twelveStages: {} as any,
        relations: [] as any,
        planetHouses: {} as any,
        planetSigns: {} as any,
        aspects: [] as any,
        currentWolunElement: '수' as any,
        currentIljinElement: '화' as any,
        currentIljinDate: '2026-03-10',
      },
    })

    const ids = result.normalizedSignals.map((signal) => signal.id)
    expect(ids).toContain('COV:L4:wolun:수')
    expect(ids).toContain('COV:L4:iljin:화')
  })
})
