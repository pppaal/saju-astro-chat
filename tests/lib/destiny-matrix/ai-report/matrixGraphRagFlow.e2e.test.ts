import { describe, expect, it } from 'vitest'
import type {
  MatrixCalculationInput,
  MatrixSummary,
  MatrixHighlight,
} from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { FiveElement } from '@/lib/Saju/types'
import {
  generateAIPremiumReport,
  generateThemedReport,
  generateTimingReport,
} from '@/lib/destiny-matrix/ai-report/aiReportService'

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
      advice: `${keyword} advice`,
    },
  }
}

function createMatrixSummary(): MatrixSummary {
  return {
    totalScore: 79,
    strengthPoints: [
      mkHighlight(6, 'imgwan', 'H10', 10, 'career peak'),
      mkHighlight(2, 'pyeonjae', 'Jupiter', 9, 'wealth window'),
      mkHighlight(5, 'samhap', 'trine', 8, 'relationship momentum'),
    ],
    cautionPoints: [
      mkHighlight(5, 'chung', 'opposition', 4, 'relationship caution'),
      mkHighlight(4, 'daeunTransition', 'saturnReturn', 4, 'timing caution'),
    ],
    balancePoints: [
      mkHighlight(3, 'jeongin', 'H6', 6, 'health routine'),
      mkHighlight(7, 'geokguk', 'solarArc', 6, 'long-cycle balance'),
    ],
    topSynergies: [],
  }
}

function createInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '목' as FiveElement,
    pillarElements: ['목', '화', '토', '금'] as FiveElement[],
    sibsinDistribution: { 정재: 2, 편재: 2, 상관: 1 } as any,
    twelveStages: { 임관: 1, 제왕: 1, 쇠: 1, 병: 1 } as any,
    relations: [
      { kind: '지지충', pillars: ['year', 'month'], detail: '충', note: 'tension' },
      { kind: '지지육합', pillars: ['day', 'hour'], detail: '합', note: 'support' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as FiveElement,
    currentDaeunElement: '수' as FiveElement,
    currentSaeunElement: '화' as FiveElement,
    shinsalList: ['천을귀인', '역마', '망신'] as any,
    dominantWesternElement: 'air',
    planetHouses: { Sun: 1, Moon: 7, Jupiter: 10, Saturn: 6, Mars: 7 },
    planetSigns: {} as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Jupiter', type: 'trine', angle: 120, orb: 1.2 },
      { planet1: 'Moon', planet2: 'Mars', type: 'opposition', angle: 180, orb: 2.1 },
      { planet1: 'Mercury', planet2: 'Saturn', type: 'square', angle: 90, orb: 1.5 },
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
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: '2026-03-06T00:00:00.000Z',
    },
    currentDateIso: '2026-03-06',
    lang: 'ko',
  }
}

function createReport(): FusionReport {
  return {
    id: 'r-e2e-1',
    generatedAt: new Date('2026-03-06T00:00:00.000Z'),
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
      categoryScores: { strength: 84, opportunity: 81, balance: 76, caution: 66, challenge: 60 },
    },
    topInsights: [
      {
        id: 'ti1',
        domain: 'career',
        category: 'strength',
        title: 'career expansion',
        description: 'career momentum',
        score: 88,
        rawScore: 88,
        weightedScore: 88,
        priority: 'high',
        icon: 'x',
        colorCode: 'green',
        sources: [
          {
            layer: 6,
            layerName: 'L6',
            sajuFactor: '임관',
            astroFactor: 'Jupiter in H10',
            interaction: {
              level: 'amplify',
              score: 9,
              icon: 'x',
              colorCode: 'green',
              keyword: 'peak',
              keywordEn: 'peak',
            },
            contribution: 0.6,
          },
        ],
        actionItems: [{ type: 'do', text: 'focus', textEn: 'focus' }],
      },
      {
        id: 'ti2',
        domain: 'relationship',
        category: 'caution',
        title: 'relationship tension',
        description: 'communication caution',
        score: 72,
        rawScore: 72,
        weightedScore: 72,
        priority: 'high',
        icon: 'x',
        colorCode: 'red',
        sources: [],
        actionItems: [{ type: 'consider', text: 'verify', textEn: 'verify' }],
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

function createTimingData() {
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
    wolun: { month: 2, heavenlyStem: '甲', earthlyBranch: '寅', element: '목' },
    iljin: { date: '2026-02-25', heavenlyStem: '辛', earthlyBranch: '卯', element: '금' },
  } as any
}

function assertBridge(report: {
  claims: Array<{ id: string; selectedSignalIds: string[] }>
  selectedSignals: Array<{ id: string }>
  anchors: Array<{ id: string }>
  evidenceLinks: Array<{ signalId: string; anchorId: string; claimIds: string[]; setIds: string[] }>
}) {
  expect(report.evidenceLinks.length).toBeGreaterThan(0)
  const signalIds = new Set(report.selectedSignals.map((signal) => signal.id))
  const anchorIds = new Set(report.anchors.map((anchor) => anchor.id))
  expect(
    report.evidenceLinks.every(
      (link) => signalIds.has(link.signalId) && anchorIds.has(link.anchorId)
    )
  ).toBe(true)
  expect(report.evidenceLinks.some((link) => (link.setIds || []).length > 0)).toBe(true)
  for (const claim of report.claims) {
    expect(report.evidenceLinks.some((link) => (link.claimIds || []).includes(claim.id))).toBe(true)
  }
}

describe('matrix + graphrag flow e2e', () => {
  it('comprehensive report links matrix signals to graphrag anchors/sets', async () => {
    const report = await generateAIPremiumReport(createInput(), createReport(), {
      deterministicOnly: true,
      matrixSummary: createMatrixSummary(),
      timingData: createTimingData(),
      birthDate: '1995-02-09',
      name: 'Jun Young Rhee',
    })
    assertBridge(report as any)
  })

  it('timing/themed reports keep matrix-graphrag links in deterministic flow', async () => {
    const input = createInput()
    const matrixReport = createReport()
    const timing = await generateTimingReport(input, matrixReport, 'daily', createTimingData(), {
      deterministicOnly: true,
      matrixSummary: createMatrixSummary(),
      birthDate: '1995-02-09',
    })
    assertBridge(timing as any)

    const themed = await generateThemedReport(input, matrixReport, 'career', createTimingData(), {
      deterministicOnly: true,
      matrixSummary: createMatrixSummary(),
      birthDate: '1995-02-09',
    })
    assertBridge(themed as any)
  })

  it('smoke: 3 profile contexts keep deterministic bridge integrity', async () => {
    const profiles = [
      {
        name: 'Jun Young Rhee',
        birthDate: '1995-02-09',
        birthTime: '06:40',
        birthCity: 'Seoul',
        timezone: 'Asia/Seoul',
      },
      {
        name: 'Alex Kim',
        birthDate: '1992-11-03',
        birthTime: '21:10',
        birthCity: 'Busan',
        timezone: 'Asia/Seoul',
      },
      {
        name: 'Mina Park',
        birthDate: '1988-07-22',
        birthTime: '13:25',
        birthCity: 'Incheon',
        timezone: 'Asia/Seoul',
      },
    ] as const

    for (const profile of profiles) {
      const input = createInput()
      input.profileContext = {
        ...input.profileContext,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthCity: profile.birthCity,
        timezone: profile.timezone,
      }
      const report = await generateAIPremiumReport(input, createReport(), {
        deterministicOnly: true,
        matrixSummary: createMatrixSummary(),
        timingData: createTimingData(),
        birthDate: profile.birthDate,
        name: profile.name,
      })
      assertBridge(report as any)
      expect((report.evidenceLinks || []).length).toBeGreaterThanOrEqual(
        (report.claims || []).length
      )
    }
  })
})
