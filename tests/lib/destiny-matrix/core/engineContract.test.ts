import { describe, expect, it } from 'vitest'
import type {
  MatrixCalculationInput,
  MatrixHighlight,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
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
    planetHouses: { Sun: 1, Moon: 7, Mercury: 1, Venus: 5, Mars: 7, Jupiter: 10, Saturn: 6 } as any,
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
    crossSnapshot: { source: 'engine-contract', crossAgreement: 0.62 } as any,
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: '2026-03-10T00:00:00.000Z',
    },
    lang: 'ko',
    startYearMonth: '2026-01',
    ...overrides,
  }
}

function createSummary(overrides: Partial<MatrixSummary> = {}): MatrixSummary {
  return {
    totalScore: 78,
    confidenceScore: 0.66,
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
    overlapTimeline: [
      { month: '2026-04', overlapStrength: 0.78, timeOverlapWeight: 1.2, peakLevel: 'peak' },
      { month: '2026-07', overlapStrength: 0.65, timeOverlapWeight: 1.1, peakLevel: 'high' },
    ],
    ...overrides,
  }
}

function createReport(): FusionReport {
  return {
    id: 'engine-contract',
    generatedAt: new Date('2026-03-10T00:00:00.000Z'),
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

describe('destiny core engine contracts', () => {
  it('keeps deterministic hash and canonical output stable for same input', () => {
    const params = {
      mode: 'comprehensive' as const,
      lang: 'ko' as const,
      matrixInput: createInput(),
      matrixReport: createReport(),
      matrixSummary: createSummary(),
    }

    const first = runDestinyCore(params)
    const second = runDestinyCore(params)

    expect(first.coreHash).toBe(second.coreHash)
    expect(first.canonical).toEqual(second.canonical)
  })

  it('exposes canonical engine contract fields', () => {
    const core = runDestinyCore({
      mode: 'calendar',
      lang: 'ko',
      matrixInput: createInput(),
      matrixReport: createReport(),
      matrixSummary: createSummary(),
    })

    expect(core.canonical.claimIds.length).toBeGreaterThan(0)
    expect(core.canonical.layerScores.length).toBeGreaterThan(0)
    expect(core.canonical.interactionHits.length).toBeGreaterThan(0)
    expect(core.canonical.timelineHits.length).toBeGreaterThan(0)
    expect(core.canonical.attackPercent + core.canonical.defensePercent).toBe(100)
    expect(core.canonical.confidence).toBeGreaterThanOrEqual(0)
    expect(core.canonical.confidence).toBeLessThanOrEqual(1)
    expect(Object.keys(core.canonical.evidenceRefs).length).toBeGreaterThan(0)
    expect(core.canonical.phase).toBe(core.strategyEngine.overallPhase)
  })

  it('keeps claim and phase consistency across report/calendar/counselor adapters', async () => {
    const input = createInput()
    const matrixSummary = createSummary()
    const matrixReport = createReport()

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
      birthDate: '1995-02-09',
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

    const coreClaimIds = new Set(core.canonical.claimIds)
    const reportClaimIds = new Set(report.claims.map((claim) => claim.id))
    const coreEvidenceSignalIds = new Set(Object.values(core.canonical.evidenceRefs).flat())
    const reportSignalIds = new Set((report.selectedSignals || []).map((signal) => signal.id))
    const calendarSignalIds = new Set(
      (calendarPacket.selectedSignals || []).map((signal) => signal.id)
    )

    expect(report.coreHash).toBe(core.coreHash)
    expect(report.strategyEngine?.overallPhase).toBe(core.canonical.phase)
    expect(calendarPacket.strategyBrief.overallPhase).toBe(core.canonical.phase)
    expect(counselorPacket.strategyBrief.overallPhase).toBe(core.canonical.phase)

    coreClaimIds.forEach((claimId) => expect(reportClaimIds.has(claimId)).toBe(true))
    calendarPacket.topClaims.forEach((claim) => expect(coreClaimIds.has(claim.id)).toBe(true))
    counselorPacket.topClaims.forEach((claim) => expect(coreClaimIds.has(claim.id)).toBe(true))

    const evidenceOverlapWithReport = [...coreEvidenceSignalIds].some((id) =>
      reportSignalIds.has(id)
    )
    const evidenceOverlapWithCalendar = [...coreEvidenceSignalIds].some((id) =>
      calendarSignalIds.has(id)
    )
    expect(evidenceOverlapWithReport).toBe(true)
    expect(evidenceOverlapWithCalendar).toBe(true)
  })
})
