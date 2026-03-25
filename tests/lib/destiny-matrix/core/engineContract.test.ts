import { describe, expect, it } from 'vitest'
import type {
  MatrixCalculationInput,
  MatrixHighlight,
  MatrixSummary,
} from '@/lib/destiny-matrix/types'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { FiveElement } from '@/lib/Saju/types'
import { runDestinyCore } from '@/lib/destiny-matrix/core/runDestinyCore'
import {
  adaptCoreToCalendar,
  adaptCoreToCounselor,
  adaptCoreToReport,
} from '@/lib/destiny-matrix/core'
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
    dayMasterElement: 'ëª©' as FiveElement,
    pillarElements: ['ëª©', 'í™”', 'í† ', 'ê¸ˆ'] as FiveElement[],
    sibsinDistribution: { pyeonjae: 2, jeongjae: 1, sanggwan: 1, jeonggwan: 1 } as any,
    twelveStages: { imgwan: 1, jewang: 1, soe: 1, byeong: 1 } as any,
    relations: [
      { kind: 'clash', pillars: ['year', 'month'], detail: 'tension', note: 'watch communication' },
      { kind: 'harmony', pillars: ['day', 'hour'], detail: 'support', note: 'joint execution' },
    ] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: 'í™”' as FiveElement,
    currentDaeunElement: 'ìˆ˜' as FiveElement,
    currentSaeunElement: 'í™”' as FiveElement,
    shinsalList: ['ì²œì„ê·€ì¸', 'ì—­ë§ˆ', 'ë§ì‹ '] as any,
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
    crossSnapshot: {
      source: 'engine-contract',
      crossAgreement: 0.62,
      crossAgreementMatrix: [
        {
          domain: 'wealth',
          timescales: {
            now: { agreement: 0.74, contradiction: 0.18, leadLag: 0.21 },
            '1-3m': { agreement: 0.68, contradiction: 0.22, leadLag: 0.1 },
          },
          leadLag: 0.16,
        },
        {
          domain: 'health',
          timescales: {
            now: { agreement: 0.51, contradiction: 0.39, leadLag: -0.12 },
          },
          leadLag: -0.12,
        },
      ],
    } as any,
    subjects: [{ subjectId: 'self', role: 'self', label: 'Self' }],
    relationContexts: [
      {
        relationId: 'self:self',
        sourceSubjectId: 'self',
        targetSubjectId: 'self',
        relationType: 'self',
        status: 'stable',
      },
    ],
    timeSlices: [
      { sliceId: 'now', window: 'now', label: 'Now', certainty: 0.92 },
      { sliceId: '1-3m', window: '1-3m', label: '1-3 months', certainty: 0.81 },
    ],
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
      dayMasterElement: 'ëª©' as FiveElement,
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
    expect(core.canonical.crossAgreementMatrix.length).toBeGreaterThan(0)
    expect(core.canonical.subjects[0]?.subjectId).toBe('self')
    expect(core.canonical.relationContexts[0]?.relationType).toBe('self')
    expect(core.canonical.timeSlices[0]?.window).toBe('now')
    expect(core.canonical.phase).toBe(core.strategyEngine.overallPhase)
    expect(core.canonical.phaseLabel).toBe(core.strategyEngine.overallPhaseLabel)
    expect(core.canonical.gradeLabel.length).toBeGreaterThan(0)
    expect(core.canonical.gradeReason.length).toBeGreaterThan(0)
    expect(core.canonical.focusDomain).toBeTruthy()
    expect(core.canonical.actionFocusDomain).toBeTruthy()
    expect(core.canonical.thesis.length).toBeGreaterThan(0)
    expect(core.canonical.riskControl.length).toBeGreaterThan(0)
    expect(core.canonical.primaryAction.length).toBeGreaterThan(0)
    expect(core.canonical.primaryCaution.length).toBeGreaterThan(0)
    expect(core.canonical.leadPatternId).toBeTruthy()
    expect(core.canonical.leadScenarioId).toBeTruthy()
    expect(core.canonical.topSignalIds.length).toBeGreaterThan(0)
    expect(core.canonical.domainLeads.length).toBeGreaterThan(0)
    expect(core.canonical.advisories.length).toBeGreaterThan(0)
    expect(core.canonical.coherenceAudit.notes.length).toBeGreaterThan(0)
    expect(core.canonical.judgmentPolicy.mode).toBeTruthy()
    expect(core.canonical.judgmentPolicy.allowedActions.length).toBeGreaterThan(0)
    expect(core.canonical.domainVerdicts.length).toBeGreaterThan(0)
    expect(core.canonical.domainVerdicts[0]?.leadPatternFamily).toBeTruthy()
    const healthVerdict = core.canonical.domainVerdicts.find(
      (verdict) => verdict.domain === 'health'
    )
    if (healthVerdict) {
      expect(healthVerdict.mode).toBe('prepare')
      expect(healthVerdict.allowedActions).not.toContain('commit_now')
    }
    expect(core.canonical.advisories[0].thesis.length).toBeGreaterThan(0)
    expect(core.canonical.advisories[0].action.length).toBeGreaterThan(0)
    expect(core.canonical.advisories[0].caution.length).toBeGreaterThan(0)
    expect(core.canonical.domainLeads[0].dominanceScore).toBeGreaterThan(0)
    expect(core.canonical.topPatterns.length).toBeGreaterThan(0)
    expect(core.canonical.topPatterns[0]?.family.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios.length).toBeGreaterThan(0)
    expect(core.canonical.topDecision?.id).toBeTruthy()
    expect(core.canonical.topScenarios[0]?.timingRelevance).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.whyNow.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.entryConditions.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.abortConditions.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.sustainConditions.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.reversalRisk.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.wrongMoveCost.length).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.sustainability).toBeGreaterThan(0)
    expect(core.canonical.topScenarios[0]?.evidenceIds.length).toBeGreaterThan(0)
    expect(core.canonical.advisories[0]?.strategyLine.length).toBeGreaterThan(0)
    expect(core.canonical.advisories[0]?.leadSignalIds.length).toBeGreaterThan(0)
    expect(core.canonical.advisories[0]?.leadPatternIds.length).toBeGreaterThan(0)
    expect(core.canonical.domainTimingWindows.length).toBeGreaterThan(0)
    expect(core.canonical.domainTimingWindows[0]?.window).toBeTruthy()
    expect(core.canonical.domainTimingWindows[0]?.timingGranularity).toBeTruthy()
    expect(core.canonical.domainTimingWindows[0]?.precisionReason.length).toBeGreaterThan(0)
    expect(core.canonical.domainTimingWindows[0]?.timingConflictMode).toBeTruthy()
    expect(core.canonical.domainTimingWindows[0]?.timingConflictNarrative.length).toBeGreaterThan(0)
    expect(core.canonical.domainTimingWindows[0]?.whyNow.length).toBeGreaterThan(0)
    expect(core.canonical.domainTimingWindows[0]?.entryConditions.length).toBeGreaterThan(0)
    expect(core.canonical.domainTimingWindows[0]?.abortConditions.length).toBeGreaterThan(0)
    expect(core.canonical.arbitrationLedger.focusWinner.domain).toBe(core.canonical.focusDomain)
    expect(core.canonical.arbitrationLedger.focusWinner.reason.length).toBeGreaterThan(0)
    expect(core.canonical.arbitrationLedger.actionWinner.domain).toBe(
      core.canonical.actionFocusDomain
    )
    expect(core.canonical.arbitrationLedger.actionWinner.reason.length).toBeGreaterThan(0)
    expect(Array.isArray(core.canonical.arbitrationLedger.conflictReasons)).toBe(true)
    expect(core.canonical.manifestations.length).toBeGreaterThan(0)
    expect(core.canonical.manifestations[0]?.baselineThesis.length).toBeGreaterThan(0)
    expect(core.canonical.manifestations[0]?.activationThesis.length).toBeGreaterThan(0)
    expect(core.canonical.manifestations[0]?.manifestation.length).toBeGreaterThan(0)
    expect(core.canonical.manifestations[0]?.activationSources.length).toBeGreaterThan(0)
    const focusManifestation = core.canonical.manifestations.find(
      (item) => item.domain === core.canonical.focusDomain
    )
    expect(focusManifestation).toBeTruthy()
    expect(core.canonical.thesis).toBe(
      focusManifestation?.manifestation || focusManifestation?.activationThesis
    )
    expect(
      core.canonical.primaryAction === focusManifestation?.likelyExpressions[0] ||
        core.canonical.primaryAction.length > 0
    ).toBe(true)
    expect(
      core.canonical.primaryCaution === focusManifestation?.riskExpressions[0] ||
        core.canonical.primaryCaution.length > 0
    ).toBe(true)
    const actionableDomains = new Set(core.canonical.advisories.map((item) => item.domain))
    expect(actionableDomains.has('career')).toBe(true)
    expect(actionableDomains.has('wealth')).toBe(true)
    expect(actionableDomains.has('relationship')).toBe(true)
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
      core,
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
      core,
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
    expect(counselorPacket.canonicalBrief?.answerThesis).toBe(core.canonical.thesis)
    expect(counselorPacket.topManifestation?.domain).toBe(core.canonical.focusDomain)
    expect(counselorPacket.topTimingWindow?.domain).toBe(core.canonical.focusDomain)
    const reportNarrative = Object.values(report.sections).join('\n')
    expect(report.sections.introduction.length).toBeGreaterThan(0)
    expect(
      reportNarrative.includes(core.canonical.primaryAction) ||
        reportNarrative.includes(core.canonical.riskControl)
    ).toBe(true)
    expect(
      report.sections.actionPlan.includes(core.canonical.topDecisionLabel || '') ||
        report.sections.actionPlan.includes(core.canonical.primaryAction) ||
        report.sections.actionPlan.includes(core.canonical.riskControl)
    ).toBe(true)
    expect(report.sections.actionPlan.length).toBeGreaterThan(0)
    expect(report.sections.actionPlan).not.toMatch(
      /dayMasterElement|sibsinDistribution|rule checks/i
    )
  })

  it('keeps adapter contracts aligned to the same canonical source', () => {
    const core = runDestinyCore({
      mode: 'calendar',
      lang: 'ko',
      matrixInput: createInput(),
      matrixReport: createReport(),
      matrixSummary: createSummary(),
    })

    const calendarVm = adaptCoreToCalendar(core)
    const counselorVm = adaptCoreToCounselor(core)
    const reportVm = adaptCoreToReport(core)

    expect(calendarVm.coreHash).toBe(core.coreHash)
    expect(counselorVm.coreHash).toBe(core.coreHash)
    expect(reportVm.coreHash).toBe(core.coreHash)

    expect(calendarVm.phase).toBe(core.canonical.phase)
    expect(counselorVm.phase).toBe(core.canonical.phase)
    expect(reportVm.phase).toBe(core.canonical.phase)

    expect(calendarVm.focusDomain).toBe(core.canonical.focusDomain)
    expect(counselorVm.focusDomain).toBe(core.canonical.focusDomain)
    expect(reportVm.focusDomain).toBe(core.canonical.focusDomain)

    expect(calendarVm.gradeLabel).toBe(core.canonical.gradeLabel)
    expect(counselorVm.gradeLabel).toBe(core.canonical.gradeLabel)
    expect(reportVm.gradeLabel).toBe(core.canonical.gradeLabel)

    expect(calendarVm.riskControl).toBe(core.canonical.riskControl)
    expect(counselorVm.riskControl).toBe(core.canonical.riskControl)
    expect(reportVm.riskControl).toBe(core.canonical.riskControl)

    expect(calendarVm.primaryAction).toBe(core.canonical.primaryAction)
    expect(counselorVm.primaryAction).toBe(core.canonical.primaryAction)
    expect(reportVm.primaryAction).toBe(core.canonical.primaryAction)
    expect(Object.keys(calendarVm.claimProvenanceById).length).toBeGreaterThan(0)
    expect(Object.keys(counselorVm.claimProvenanceById).length).toBeGreaterThan(0)
    expect(Object.keys(reportVm.claimProvenanceById).length).toBeGreaterThan(0)

    expect(calendarVm.primaryCaution).toBe(core.canonical.primaryCaution)
    expect(counselorVm.primaryCaution).toBe(core.canonical.primaryCaution)
    expect(reportVm.primaryCaution).toBe(core.canonical.primaryCaution)
    expect(calendarVm.coherenceAudit.verificationBias).toBe(
      core.canonical.coherenceAudit.verificationBias
    )
    expect(calendarVm.judgmentPolicy.mode).toBe(core.canonical.judgmentPolicy.mode)
    expect(counselorVm.judgmentPolicy.rationale).toBe(core.canonical.judgmentPolicy.rationale)
    expect(reportVm.domainVerdicts[0]?.leadPatternFamily).toBe(
      core.canonical.domainVerdicts[0]?.leadPatternFamily
    )
    expect(counselorVm.coherenceAudit.gatedDecision).toBe(
      core.canonical.coherenceAudit.gatedDecision
    )
    expect(reportVm.coherenceAudit.domainConflictCount).toBe(
      core.canonical.coherenceAudit.domainConflictCount
    )

    expect(calendarVm.advisories).toHaveLength(core.canonical.advisories.length)
    expect(counselorVm.advisories).toHaveLength(core.canonical.advisories.length)
    expect(reportVm.advisories).toHaveLength(core.canonical.advisories.length)
    expect(calendarVm.advisories[0]?.thesis).toBe(core.canonical.advisories[0]?.thesis)
    expect(counselorVm.advisories[0]?.action).toBe(core.canonical.advisories[0]?.action)
    expect(reportVm.advisories[0]?.caution).toBe(core.canonical.advisories[0]?.caution)
    expect(calendarVm.advisories[0]?.strategyLine).toBe(core.canonical.advisories[0]?.strategyLine)
    expect(reportVm.advisories[0]?.leadPatternIds).toEqual(
      core.canonical.advisories[0]?.leadPatternIds
    )
    expect(calendarVm.domainTimingWindows).toEqual(core.canonical.domainTimingWindows)
    expect(counselorVm.domainTimingWindows).toEqual(core.canonical.domainTimingWindows)
    expect(reportVm.domainTimingWindows).toEqual(core.canonical.domainTimingWindows)
    expect(calendarVm.manifestations).toEqual(core.canonical.manifestations)
    expect(counselorVm.manifestations).toEqual(core.canonical.manifestations)
    expect(reportVm.manifestations).toEqual(core.canonical.manifestations)

    expect(calendarVm.claimIds).toEqual(core.canonical.claimIds)
    expect(counselorVm.claimIds).toEqual(core.canonical.claimIds)
    expect(reportVm.claimIds).toEqual(core.canonical.claimIds)
  })
})
