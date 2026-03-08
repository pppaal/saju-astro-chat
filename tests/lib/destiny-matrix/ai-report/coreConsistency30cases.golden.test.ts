import { describe, expect, it } from 'vitest'
import type {
  MatrixCalculationInput,
  MatrixHighlight,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'
import type { FiveElement } from '@/lib/Saju/types'
import { runDestinyCore } from '@/lib/destiny-matrix/core/runDestinyCore'
import { generateThemedReport } from '@/lib/destiny-matrix/ai-report/aiReportService'
import { validateEvidenceBinding } from '@/lib/destiny-matrix/ai-report/rewriteGuards'

const THEMES = ['career', 'love', 'wealth', 'health', 'family'] as const

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
        level: score >= 7 ? 'amplify' : 'balance',
        score,
        icon: '*',
        colorCode: score >= 7 ? 'green' : 'yellow',
        keyword,
        keywordEn: keyword,
      },
      sajuBasis: `${rowKey} saju`,
      astroBasis: `${colKey} astro`,
      advice: `${keyword} action`,
    },
  }
}

function createInput(seed: number): MatrixCalculationInput {
  const strongElement = (['\uBAA9', '\uD654', '\uD1A0', '\uAE08', '\uC218'] as FiveElement[])[
    seed % 5
  ]
  const weakElement = (['\uC218', '\uAE08', '\uD1A0', '\uD654', '\uBAA9'] as FiveElement[])[
    seed % 5
  ]
  const transitPool = [
    'saturnReturn',
    'jupiterReturn',
    'mercuryRetrograde',
    'nodeReturn',
    'eclipse',
    'uranusSquare',
  ]
  const activeTransits = transitPool.filter((_, idx) => (seed + idx) % 2 === 0)

  return {
    dayMasterElement: strongElement,
    pillarElements: [strongElement, '\uD654', '\uD1A0', weakElement] as FiveElement[],
    sibsinDistribution: { pyeonjae: 2 + (seed % 3), jeongjae: 1, sanggwan: 1, jeonggwan: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1, soe: 1, byeong: 1 } as any,
    relations: [
      {
        kind: 'clash',
        pillars: ['year', 'month'],
        detail: `tension-${seed}`,
        note: 'watch communication',
      },
      {
        kind: 'harmony',
        pillars: ['day', 'hour'],
        detail: `support-${seed}`,
        note: 'joint execution',
      },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: weakElement,
    currentDaeunElement: (seed % 2 === 0 ? '\uC218' : '\uD654') as FiveElement,
    currentSaeunElement: (seed % 3 === 0 ? '\uAE08' : '\uD1A0') as FiveElement,
    shinsalList: ['\uCC9C\uC744\uADC0\uC778', '\uC5ED\uB9C8', '\uB9DD\uC2E0'] as any,
    dominantWesternElement: seed % 2 === 0 ? 'air' : 'fire',
    planetHouses: {
      Sun: 1 + (seed % 3),
      Moon: 7,
      Mercury: 1,
      Venus: 5 + (seed % 2),
      Mars: 7,
      Jupiter: 10,
      Saturn: 6,
    },
    planetSigns: {
      Sun: seed % 2 === 0 ? 'Aquarius' : 'Capricorn',
      Moon: seed % 2 === 0 ? 'Gemini' : 'Virgo',
      Mercury: 'Aquarius',
      Venus: 'Pisces',
      Mars: 'Leo',
      Jupiter: 'Sagittarius',
      Saturn: 'Pisces',
    } as any,
    aspects: [
      {
        planet1: 'Sun',
        planet2: 'Jupiter',
        type: 'trine',
        orb: 1.2 + (seed % 3) * 0.2,
        angle: 120,
      },
      {
        planet1: 'Moon',
        planet2: 'Mars',
        type: 'opposition',
        orb: 1.5 + (seed % 2) * 0.7,
        angle: 180,
      },
      {
        planet1: 'Mercury',
        planet2: 'Saturn',
        type: 'square',
        orb: 1.1 + (seed % 4) * 0.3,
        angle: 90,
      },
    ],
    activeTransits,
    asteroidHouses: { Ceres: 2, Pallas: 10, Juno: 7, Vesta: 6 } as any,
    extraPointSigns: { Chiron: 'Aries', Lilith: 'Scorpio', Vertex: 'Gemini' } as any,
    advancedAstroSignals: {
      solarReturn: true,
      lunarReturn: true,
      progressions: true,
      draconic: true,
      harmonics: true,
      fixedStars: true,
      eclipses: true,
      midpoints: true,
      asteroids: true,
      extraPoints: true,
    },
    sajuSnapshot: { pillars: true, unse: { daeun: [{ age: 31 + (seed % 3) }] } } as any,
    astrologySnapshot: {
      natalChart: { planets: [{ name: 'Sun' }] },
      transits: { active: activeTransits.length },
    } as any,
    crossSnapshot: {
      source: 'core-consistency-30',
      crossAgreement: 0.56 + (seed % 5) * 0.05,
    } as any,
    currentDateIso: `2026-03-${String((seed % 28) + 1).padStart(2, '0')}`,
    profileContext: {
      birthDate: `199${seed % 10}-02-09`,
      birthTime: seed % 2 === 0 ? '06:40' : '18:20',
      birthCity: seed % 2 === 0 ? 'Seoul' : 'Busan',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: new Date(Date.UTC(2026, 2, 1 + (seed % 28))).toISOString(),
    },
    lang: 'ko',
    startYearMonth: '2026-01',
  }
}

function createSummary(seed: number): MatrixSummary {
  return {
    totalScore: 72 + (seed % 14),
    strengthPoints: [
      mkHighlight(6, 'imgwan', 'H10', 10, `career peak ${seed}`),
      mkHighlight(2, 'pyeonjae', 'Jupiter', 8 + (seed % 2), `money expansion ${seed}`),
      mkHighlight(5, 'samhap', 'trine', 8, `relationship momentum ${seed}`),
    ],
    cautionPoints: [
      mkHighlight(5, 'chung', 'opposition', 4 + (seed % 2), `communication caution ${seed}`),
      mkHighlight(4, 'daeunTransition', 'saturnReturn', 3 + (seed % 2), `timing caution ${seed}`),
    ],
    balancePoints: [
      mkHighlight(3, 'jeongin', 'H6', 6 + (seed % 2), `health routine ${seed}`),
      mkHighlight(7, 'geokguk', 'solarArc', 6, `long-cycle balance ${seed}`),
    ],
    topSynergies: [],
  }
}

function createReport(seed: number): FusionReport {
  return {
    id: `core30-${seed}`,
    generatedAt: new Date('2026-03-07T00:00:00.000Z'),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '\uBAA9' as FiveElement,
      dayMasterDescription: 'wood',
      dominantSibsin: [] as any,
      keyShinsals: [] as any,
    },
    overallScore: {
      total: 80 + (seed % 8),
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 80, balance: 76, caution: 66, challenge: 61 },
    },
    topInsights: [
      {
        id: `ti1-${seed}`,
        domain: 'career',
        category: 'strength',
        title: 'career expansion',
        description: 'career momentum',
        score: 84,
        weightedScore: 84,
        actionItems: [],
        sources: [],
      },
    ] as any,
    domainAnalysis: [
      { domain: 'career', score: 82 },
      { domain: 'relationship', score: 70 },
      { domain: 'wealth', score: 75 },
      { domain: 'health', score: 66 },
      { domain: 'timing', score: 68 },
    ] as any,
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 78,
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
  } as any
}

function createTimingData(seed: number): TimingData {
  return {
    daeun: {
      heavenlyStem: '\u4E59',
      earthlyBranch: '\u4EA5',
      element: seed % 2 === 0 ? '\uBAA9' : '\uC218',
      startAge: 31,
      endAge: 40,
      isCurrent: true,
    },
    seun: { year: 2026, heavenlyStem: '\u4E19', earthlyBranch: '\u5348', element: '\uD654' },
    wolun: {
      month: (seed % 12) + 1,
      heavenlyStem: '\u7532',
      earthlyBranch: '\u5BC5',
      element: '\uBAA9',
    },
    iljin: {
      date: `2026-03-${String((seed % 28) + 1).padStart(2, '0')}`,
      heavenlyStem: '\u8F9B',
      earthlyBranch: '\u536F',
      element: '\uAE08',
    },
  }
}

function asSetSignature(values: string[]): string {
  return [...new Set(values)].sort().join('|')
}

function claimSignature(claims: Array<{ id: string }>): string {
  return asSetSignature((claims || []).map((claim) => claim.id))
}

function cautionSignalSignature(selectedSignals?: Array<{ id: string; polarity: string }>): string {
  return asSetSignature(
    (selectedSignals || []).filter((item) => item.polarity === 'caution').map((item) => item.id)
  )
}

describe('core consistency 30 golden cases', () => {
  it('keeps themed output aligned with deterministic core across 30 profile variants', async () => {
    let unsupportedDetailCount = 0
    let contradictionCount = 0
    let tokenIntegrityFailureCount = 0

    for (let seed = 1; seed <= 30; seed += 1) {
      const theme = THEMES[(seed - 1) % THEMES.length]
      const input = createInput(seed)
      const summary = createSummary(seed)
      const matrixReport = createReport(seed)
      const timingData = createTimingData(seed)

      const calendarCore = runDestinyCore({
        mode: 'calendar',
        lang: 'ko',
        matrixInput: input,
        matrixReport,
        matrixSummary: summary,
      })

      const themed = await generateThemedReport(input, matrixReport, theme, timingData, {
        deterministicOnly: true,
        matrixSummary: summary,
        birthDate: input.profileContext?.birthDate,
        lang: 'ko',
      })

      expect(themed.coreHash, `seed=${seed}:coreHash`).toBe(calendarCore.coreHash)
      expect(claimSignature(themed.claims), `seed=${seed}:claimSig`).toBe(
        asSetSignature(calendarCore.signalSynthesis.claims.map((claim) => claim.claimId))
      )
      expect(cautionSignalSignature(themed.selectedSignals), `seed=${seed}:cautionSig`).toBe(
        cautionSignalSignature(calendarCore.signalSynthesis.selectedSignals as any)
      )

      const sectionPaths = Object.keys(themed.evidenceRefs || {})
      const binding = validateEvidenceBinding(
        themed.sections as unknown as Record<string, unknown>,
        sectionPaths,
        themed.evidenceRefs
      )
      unsupportedDetailCount += binding.violations.reduce(
        (acc, violation) => acc + violation.unsupportedTokens.length,
        0
      )

      contradictionCount += themed.meta.qualityMetrics?.contradictionCount || 0
      tokenIntegrityFailureCount += themed.meta.qualityMetrics?.tokenIntegrityPass ? 0 : 1

      const sectionText = Object.values(themed.sections as Record<string, string>).join(' ')
      expect(sectionText, `seed=${seed}:weekday`).not.toMatch(
        /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
      )
    }

    expect(unsupportedDetailCount).toBe(0)
    expect(contradictionCount).toBe(0)
    expect(tokenIntegrityFailureCount).toBe(0)
  }, 180000)
})
