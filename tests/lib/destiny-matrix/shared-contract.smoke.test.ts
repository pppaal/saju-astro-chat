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
import { buildCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import { generateAIPremiumReport } from '@/lib/destiny-matrix/ai-report/aiReportService'

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
        icon: '*',
        colorCode: 'green',
        keyword,
        keywordEn: keyword,
      },
      sajuBasis: `${rowKey} saju`,
      astroBasis: `${colKey} astro`,
      advice: `${keyword} action`,
    },
  }
}

function createInput(overrides: Partial<MatrixCalculationInput> = {}): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as FiveElement,
    pillarElements: ['목', '화', '토', '금'] as FiveElement[],
    sibsinDistribution: { pyeonjae: 2, jeongjae: 1, sanggwan: 1, jeonggwan: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1, soe: 1, byeong: 1 } as any,
    relations: [
      { kind: 'clash', pillars: ['year', 'month'], detail: 'tension', note: 'watch communication' },
      { kind: 'harmony', pillars: ['day', 'hour'], detail: 'support', note: 'joint execution' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as FiveElement,
    currentDaeunElement: '수' as FiveElement,
    currentSaeunElement: '화' as FiveElement,
    shinsalList: ['천을귀인', '역마', '망신'] as any,
    dominantWesternElement: 'air',
    planetHouses: {
      Sun: 1,
      Moon: 7,
      Mercury: 1,
      Venus: 5,
      Mars: 7,
      Jupiter: 10,
      Saturn: 6,
    },
    planetSigns: {
      Sun: 'Aquarius',
      Moon: 'Gemini',
      Mercury: 'Aquarius',
      Venus: 'Pisces',
      Mars: 'Leo',
      Jupiter: 'Sagittarius',
      Saturn: 'Pisces',
    } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Jupiter', type: 'trine', orb: 1.2, angle: 120 },
      { planet1: 'Moon', planet2: 'Mars', type: 'opposition', orb: 2.4, angle: 180 },
      { planet1: 'Mercury', planet2: 'Saturn', type: 'square', orb: 1.8, angle: 90 },
    ],
    activeTransits: ['saturnReturn', 'jupiterReturn', 'mercuryRetrograde'],
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
    sajuSnapshot: { pillars: true, unse: { daeun: [{ age: 31 }] } } as any,
    astrologySnapshot: {
      natalChart: { planets: [{ name: 'Sun' }] },
      transits: { active: 3 },
    } as any,
    crossSnapshot: { source: 'shared-contract-test', crossAgreement: 0.62 } as any,
    currentDateIso: '2026-03-07',
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: '2026-03-07T00:00:00.000Z',
    },
    lang: 'ko',
    startYearMonth: '2026-01',
    ...overrides,
  }
}

function createSummary(overrides: Partial<MatrixSummary> = {}): MatrixSummary {
  return {
    totalScore: 78,
    strengthPoints: [
      mkHighlight(6, 'imgwan', 'H10', 10, 'career peak'),
      mkHighlight(2, 'pyeonjae', 'Jupiter', 9, 'money expansion'),
      mkHighlight(5, 'samhap', 'trine', 8, 'relationship momentum'),
    ],
    cautionPoints: [
      mkHighlight(5, 'chung', 'opposition', 4, 'communication caution'),
      mkHighlight(4, 'daeunTransition', 'saturnReturn', 3, 'timing caution'),
    ],
    balancePoints: [
      mkHighlight(3, 'jeongin', 'H6', 7, 'health routine'),
      mkHighlight(7, 'geokguk', 'solarArc', 6, 'long-cycle balance'),
    ],
    topSynergies: [],
    ...overrides,
  }
}

function createReport(): FusionReport {
  return {
    id: 'shared-contract',
    generatedAt: new Date('2026-03-07T00:00:00.000Z'),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목' as FiveElement,
      dayMasterDescription: 'wood',
      dominantSibsin: [] as any,
      keyShinsals: [] as any,
    },
    overallScore: {
      total: 84,
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 80, balance: 76, caution: 66, challenge: 61 },
    },
    topInsights: [
      {
        id: 'ti1',
        domain: 'career',
        category: 'strength',
        title: 'career expansion',
        description: 'career momentum',
        score: 88,
        weightedScore: 88,
        actionItems: [],
        sources: [],
      },
      {
        id: 'ti2',
        domain: 'relationship',
        category: 'caution',
        title: 'relationship caution',
        description: 'communication caution',
        score: 72,
        weightedScore: 72,
        actionItems: [],
        sources: [],
      },
      {
        id: 'ti3',
        domain: 'wealth',
        category: 'strength',
        title: 'wealth window',
        description: 'cashflow opportunity',
        score: 79,
        weightedScore: 79,
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

function createTimingData(): TimingData {
  return {
    daeun: {
      heavenlyStem: '乙',
      earthlyBranch: '亥',
      element: '목',
      startAge: 31,
      endAge: 40,
      isCurrent: true,
    },
    seun: { year: 2026, heavenlyStem: '丙', earthlyBranch: '午', element: '화' },
    wolun: { month: 3, heavenlyStem: '甲', earthlyBranch: '寅', element: '목' },
    iljin: {
      date: '2026-03-07',
      heavenlyStem: '辛',
      earthlyBranch: '卯',
      element: '금',
    },
  }
}

describe('destiny shared contract smoke', () => {
  it('keeps calendar, counselor, and report aligned to the same core contract', async () => {
    const input = createInput()
    const matrixSummary = createSummary()
    const matrixReport = createReport()
    const timingData = createTimingData()

    const core = runDestinyCore({
      mode: 'calendar',
      lang: 'ko',
      matrixInput: input,
      matrixReport,
      matrixSummary,
    })

    const report = await generateAIPremiumReport(input, matrixReport, {
      deterministicOnly: true,
      matrixSummary,
      timingData,
      birthDate: '1995-02-09',
      name: 'Smoke User',
      lang: 'ko',
    })

    const calendarPacket = buildCounselorEvidencePacket({
      theme: 'today',
      lang: 'ko',
      matrixInput: input,
      matrixReport,
      matrixSummary,
      signalSynthesis: core.signalSynthesis,
      strategyEngine: core.strategyEngine,
      birthDate: '1995-02-09',
    })

    const counselorPacket = buildCounselorEvidencePacket({
      theme: 'chat',
      lang: 'ko',
      matrixInput: input,
      matrixReport,
      matrixSummary,
      signalSynthesis: core.signalSynthesis,
      strategyEngine: core.strategyEngine,
      birthDate: '1995-02-09',
    })

    expect(report.coreHash).toBe(core.coreHash)
    expect(report.strategyEngine?.overallPhase).toBe(core.strategyEngine.overallPhase)
    expect(calendarPacket.strategyBrief.overallPhase).toBe(core.strategyEngine.overallPhase)
    expect(counselorPacket.strategyBrief.overallPhase).toBe(core.strategyEngine.overallPhase)

    const reportClaimIds = new Set(report.claims.map((claim) => claim.id))
    const reportAnchorIds = new Set(report.anchors.map((anchor) => anchor.id))

    expect(calendarPacket.topClaims.length).toBeGreaterThan(0)
    expect(counselorPacket.topClaims.length).toBeGreaterThan(0)
    expect(calendarPacket.topAnchors.length).toBeGreaterThan(0)
    expect(counselorPacket.topAnchors.length).toBeGreaterThan(0)

    calendarPacket.topClaims.forEach((claim) => expect(reportClaimIds.has(claim.id)).toBe(true))
    counselorPacket.topClaims.forEach((claim) => expect(reportClaimIds.has(claim.id)).toBe(true))
    calendarPacket.topAnchors.forEach((anchor) => expect(reportAnchorIds.has(anchor.id)).toBe(true))
    counselorPacket.topAnchors.forEach((anchor) =>
      expect(reportAnchorIds.has(anchor.id)).toBe(true)
    )

    expect(calendarPacket.verdict.length).toBeGreaterThan(0)
    expect(counselorPacket.verdict.length).toBeGreaterThan(0)
    expect(calendarPacket.guardrail.length).toBeGreaterThan(0)
    expect(counselorPacket.guardrail.length).toBeGreaterThan(0)
  })
})
