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
import {
  generateAIPremiumReport,
  generateThemedReport,
  generateTimingReport,
} from '@/lib/destiny-matrix/ai-report/aiReportService'
import { validateEvidenceBinding } from '@/lib/destiny-matrix/ai-report/rewriteGuards'
import { hasRepetitiveSentences } from '@/lib/destiny-matrix/ai-report/sectionAudit'

type SampleCase = {
  id: string
  theme: 'career' | 'love' | 'wealth' | 'health' | 'family'
  inputOverrides?: Partial<MatrixCalculationInput>
  summaryOverrides?: Partial<MatrixSummary>
}

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
    dayMasterElement: '\uBAA9' as FiveElement,
    pillarElements: ['\uBAA9', '\uD654', '\uD1A0', '\uAE08'] as FiveElement[],
    sibsinDistribution: { pyeonjae: 2, jeongjae: 1, sanggwan: 1, jeonggwan: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1, soe: 1, byeong: 1 } as any,
    relations: [
      { kind: 'clash', pillars: ['year', 'month'], detail: 'tension', note: 'watch communication' },
      { kind: 'harmony', pillars: ['day', 'hour'], detail: 'support', note: 'joint execution' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '\uD654' as FiveElement,
    currentDaeunElement: '\uC218' as FiveElement,
    currentSaeunElement: '\uD654' as FiveElement,
    shinsalList: ['\uCC9C\uC744\uADC0\uC778', '\uC5ED\uB9C8', '\uB9DD\uC2E0'] as any,
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
    crossSnapshot: { source: 'golden-test', crossAgreement: 0.62 } as any,
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
    id: 'golden-consistency',
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
      heavenlyStem: '\u4E59',
      earthlyBranch: '\u4EA5',
      element: '\uBAA9',
      startAge: 31,
      endAge: 40,
      isCurrent: true,
    },
    seun: { year: 2026, heavenlyStem: '\u4E19', earthlyBranch: '\u5348', element: '\uD654' },
    wolun: { month: 3, heavenlyStem: '\u7532', earthlyBranch: '\u5BC5', element: '\uBAA9' },
    iljin: {
      date: '2026-03-07',
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

function flattenSectionTexts(sections: Record<string, unknown>): string[] {
  const out: string[] = []
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      if (node.trim()) out.push(node.trim())
      return
    }
    if (Array.isArray(node)) {
      for (const value of node) walk(value)
      return
    }
    if (node && typeof node === 'object') {
      for (const value of Object.values(node)) walk(value)
    }
  }
  walk(sections)
  return out
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  )
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenize(a)
  const sb = tokenize(b)
  if (sa.size === 0 && sb.size === 0) return 1
  let intersection = 0
  for (const token of sa) {
    if (sb.has(token)) intersection += 1
  }
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : intersection / union
}

function uniquenessScore(sectionTexts: string[]): number {
  if (sectionTexts.length <= 1) return 1
  const sims: number[] = []
  for (let i = 0; i < sectionTexts.length; i += 1) {
    for (let j = i + 1; j < sectionTexts.length; j += 1) {
      sims.push(jaccardSimilarity(sectionTexts[i], sectionTexts[j]))
    }
  }
  const avgSimilarity = sims.reduce((sum, value) => sum + value, 0) / Math.max(1, sims.length)
  return Number((1 - avgSimilarity).toFixed(4))
}

const CASES: SampleCase[] = [
  { id: 'career-strong', theme: 'career' },
  {
    id: 'relationship-strong',
    theme: 'love',
    summaryOverrides: {
      strengthPoints: [
        mkHighlight(5, 'samhap', 'H7', 10, 'relationship expansion'),
        mkHighlight(2, 'siksin', 'Venus', 9, 'romance harmony'),
        mkHighlight(6, 'taewang', 'Moon', 8, 'bonding momentum'),
      ],
    },
  },
  {
    id: 'conflict-heavy',
    theme: 'family',
    summaryOverrides: {
      cautionPoints: [
        mkHighlight(5, 'chung', 'square', 5, 'conflict caution'),
        mkHighlight(5, 'wonjin', 'opposition', 4, 'trust caution'),
      ],
    },
  },
  {
    id: 'stable-core',
    theme: 'health',
    summaryOverrides: {
      balancePoints: [
        mkHighlight(3, 'jeongin', 'H6', 8, 'routine stability'),
        mkHighlight(4, 'daeunTransition', 'jupiterReturn', 7, 'stepwise growth'),
      ],
    },
  },
  {
    id: 'move-change',
    theme: 'career',
    inputOverrides: {
      activeTransits: ['uranusSquare', 'nodeReturn', 'mercuryRetrograde'],
    },
  },
  {
    id: 'romance-activation',
    theme: 'love',
    inputOverrides: {
      aspects: [
        { planet1: 'Venus', planet2: 'Mars', type: 'trine', orb: 1.4, angle: 120 },
        { planet1: 'Moon', planet2: 'Venus', type: 'sextile', orb: 2.2, angle: 60 },
      ] as any,
    },
  },
  {
    id: 'wealth-volatility',
    theme: 'wealth',
    inputOverrides: {
      activeTransits: ['saturnReturn', 'plutoTransit', 'jupiterRetrograde'],
    },
  },
  {
    id: 'health-warning',
    theme: 'health',
    summaryOverrides: {
      cautionPoints: [
        mkHighlight(3, 'sangwan', 'H6', 5, 'stress caution'),
        mkHighlight(4, 'seunShift', 'saturnReturn', 4, 'fatigue caution'),
      ],
    },
  },
  {
    id: 'late-bloomer',
    theme: 'career',
    inputOverrides: {
      currentDaeunElement: '\uAE08' as FiveElement,
      currentSaeunElement: '\uC218' as FiveElement,
      activeTransits: ['saturnReturn'],
    },
  },
  {
    id: 'mixed-pattern',
    theme: 'family',
    inputOverrides: {
      activeTransits: ['jupiterReturn', 'mercuryRetrograde', 'eclipse'],
    },
  },
]

describe('consistency-first golden set', () => {
  it('keeps core judgment aligned across calendar-core / timing / themed / comprehensive while preserving evidence safety', async () => {
    const timingData = createTimingData()
    let unsupportedDetailCount = 0
    let repeatedSectionCount = 0
    let avgCharsAccum = 0
    let avgCharsCount = 0
    let claimReuseAccum = 0
    let uniquenessAccum = 0
    let uniquenessCount = 0

    for (const sample of CASES) {
      const input = createInput(sample.inputOverrides)
      const summary = createSummary(sample.summaryOverrides || {})
      const matrixReport = createReport()
      const calendarCore = runDestinyCore({
        mode: 'calendar',
        lang: 'ko',
        matrixInput: input,
        matrixReport,
        matrixSummary: summary,
      })

      const comprehensive = await generateAIPremiumReport(input, matrixReport, {
        deterministicOnly: true,
        matrixSummary: summary,
        timingData,
        birthDate: '1995-02-09',
        name: 'Golden User',
        lang: 'ko',
      })
      const timing = await generateTimingReport(input, matrixReport, 'daily', timingData, {
        deterministicOnly: true,
        matrixSummary: summary,
        birthDate: '1995-02-09',
        lang: 'ko',
      })
      const themed = await generateThemedReport(input, matrixReport, sample.theme, timingData, {
        deterministicOnly: true,
        matrixSummary: summary,
        birthDate: '1995-02-09',
        lang: 'ko',
      })

      expect(comprehensive.coreHash, `${sample.id}:comprehensive-vs-calendar`).toBe(
        calendarCore.coreHash
      )
      expect(timing.coreHash, `${sample.id}:timing-vs-calendar`).toBe(calendarCore.coreHash)
      expect(themed.coreHash, `${sample.id}:themed-vs-calendar`).toBe(calendarCore.coreHash)

      const calendarClaimSig = asSetSignature(
        calendarCore.signalSynthesis.claims.map((claim) => claim.claimId)
      )
      const comprehensiveClaimSig = claimSignature(comprehensive.claims)
      const timingClaimSig = claimSignature(timing.claims)
      const themedClaimSig = claimSignature(themed.claims)
      expect(comprehensiveClaimSig, `${sample.id}:claims-comprehensive`).toBe(calendarClaimSig)
      expect(timingClaimSig, `${sample.id}:claims-timing`).toBe(calendarClaimSig)
      expect(themedClaimSig, `${sample.id}:claims-themed`).toBe(calendarClaimSig)

      expect(comprehensive.strategyEngine?.overallPhase, `${sample.id}:phase-comprehensive`).toBe(
        calendarCore.strategyEngine.overallPhase
      )
      expect(timing.strategyEngine?.overallPhase, `${sample.id}:phase-timing`).toBe(
        calendarCore.strategyEngine.overallPhase
      )
      expect(themed.strategyEngine?.overallPhase, `${sample.id}:phase-themed`).toBe(
        calendarCore.strategyEngine.overallPhase
      )

      expect(
        Math.abs(
          (comprehensive.strategyEngine?.attackPercent || 0) -
            calendarCore.strategyEngine.attackPercent
        ),
        `${sample.id}:attack-comprehensive`
      ).toBeLessThanOrEqual(2)
      expect(
        Math.abs(
          (timing.strategyEngine?.attackPercent || 0) - calendarCore.strategyEngine.attackPercent
        ),
        `${sample.id}:attack-timing`
      ).toBeLessThanOrEqual(2)
      expect(
        Math.abs(
          (themed.strategyEngine?.attackPercent || 0) - calendarCore.strategyEngine.attackPercent
        ),
        `${sample.id}:attack-themed`
      ).toBeLessThanOrEqual(2)

      const calendarCautionSig = cautionSignalSignature(
        calendarCore.signalSynthesis.selectedSignals as any
      )
      expect(
        cautionSignalSignature(comprehensive.selectedSignals),
        `${sample.id}:caution-comprehensive`
      ).toBe(calendarCautionSig)
      expect(cautionSignalSignature(timing.selectedSignals), `${sample.id}:caution-timing`).toBe(
        calendarCautionSig
      )
      expect(cautionSignalSignature(themed.selectedSignals), `${sample.id}:caution-themed`).toBe(
        calendarCautionSig
      )

      for (const [kind, report] of [
        ['comprehensive', comprehensive] as const,
        ['timing', timing] as const,
        ['themed', themed] as const,
      ]) {
        const sectionPaths = Object.keys(report.evidenceRefs || {})
        const binding = validateEvidenceBinding(
          report.sections as unknown as Record<string, unknown>,
          sectionPaths,
          report.evidenceRefs
        )
        const unsupportedTokens = binding.violations.flatMap(
          (violation) => violation.unsupportedTokens
        )
        unsupportedDetailCount += unsupportedTokens.length
        expect(
          unsupportedTokens.length,
          `${sample.id}:${kind}:unsupported=${unsupportedTokens.join(',')}`
        ).toBe(0)
        expect(
          report.meta.qualityMetrics?.forbiddenAdditionsPass,
          `${sample.id}:${kind}:forbidden`
        ).toBe(true)
        expect(
          report.meta.qualityMetrics?.tokenIntegrityPass,
          `${sample.id}:${kind}:encoding`
        ).toBe(true)
        expect(
          report.meta.qualityMetrics?.contradictionCount || 0,
          `${sample.id}:${kind}:contradiction`
        ).toBe(0)

        const texts = flattenSectionTexts(report.sections as unknown as Record<string, unknown>)
        const flatText = texts.join(' ')
        expect(flatText, `${sample.id}:${kind}:weekday`).not.toMatch(
          /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
        )
        expect(flatText, `${sample.id}:${kind}:mojibake`).not.toMatch(/\?{3,}|\uFFFD/)
        repeatedSectionCount += texts.filter((text) => hasRepetitiveSentences(text)).length
        const avgChars =
          texts.reduce((sum, text) => sum + text.length, 0) / Math.max(1, texts.length)
        avgCharsAccum += avgChars
        avgCharsCount += 1
      }

      const unionClaimSize = new Set(
        [
          ...comprehensive.claims.map((claim) => claim.id),
          ...timing.claims.map((claim) => claim.id),
          ...themed.claims.map((claim) => claim.id),
        ].filter(Boolean)
      ).size
      const intersectionClaimSize = new Set(
        comprehensive.claims
          .map((claim) => claim.id)
          .filter(
            (id) =>
              timing.claims.some((claim) => claim.id === id) &&
              themed.claims.some((claim) => claim.id === id)
          )
      ).size
      claimReuseAccum += intersectionClaimSize / Math.max(1, unionClaimSize)

      const timingRoleTexts = [
        timing.sections.overview,
        timing.sections.energy,
        timing.sections.opportunities,
        timing.sections.cautions,
        timing.sections.actionPlan,
      ]
      expect(uniquenessScore(timingRoleTexts), `${sample.id}:timing-uniqueness`).toBeGreaterThan(
        0.2
      )
      expect(timing.sections.opportunities, `${sample.id}:timing-opportunity-role`).toMatch(
        /\uAE30\uD68C|\uD655\uC7A5|opportunity|upside/i
      )
      expect(timing.sections.cautions, `${sample.id}:timing-caution-role`).toMatch(
        /\uC8FC\uC758|\uB9AC\uC2A4\uD06C|\uACBD\uACC4|\uD655\uC778|\uC624\uCC28|caution|risk|recheck/i
      )
      expect(timing.sections.actionPlan, `${sample.id}:timing-action-role`).toMatch(
        /\uC2E4\uD589|\uC810\uAC80|\uC815\uB9AC|action|plan|check/i
      )
      uniquenessAccum += uniquenessScore(timingRoleTexts)
      uniquenessCount += 1

      const themedTexts = flattenSectionTexts(themed.sections as unknown as Record<string, unknown>)
      uniquenessAccum += uniquenessScore(themedTexts.slice(0, Math.min(6, themedTexts.length)))
      uniquenessCount += 1
    }

    const avgChars = avgCharsAccum / Math.max(1, avgCharsCount)
    const avgClaimReuse = claimReuseAccum / CASES.length
    const avgUniqueness = uniquenessAccum / Math.max(1, uniquenessCount)

    expect(avgChars).toBeGreaterThanOrEqual(260)
    expect(avgClaimReuse).toBeGreaterThanOrEqual(0.95)
    expect(unsupportedDetailCount).toBe(0)
    expect(repeatedSectionCount).toBeLessThanOrEqual(4)
    expect(avgUniqueness).toBeGreaterThanOrEqual(0.24)
  }, 180000)
})
