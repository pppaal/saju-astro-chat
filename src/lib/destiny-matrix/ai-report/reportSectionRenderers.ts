import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import type { DestinyCoreQuality } from '@/lib/destiny-matrix/core/runDestinyCore'

type TimingWindowLike = {
  whyNow?: string | null
  window?: string | null
  provenance?: { sourceFields?: string[]; sourceSetIds?: string[]; sourceRuleIds?: string[] }
}

type AdvisoryLike = {
  caution?: string | null
  provenance?: { sourceFields?: string[]; sourceSetIds?: string[]; sourceRuleIds?: string[] }
}

type ManifestationLike = {
  baselineThesis?: string | null
  manifestation?: string | null
  provenance?: { sourceFields?: string[]; sourceSetIds?: string[]; sourceRuleIds?: string[] }
}

type VerdictLike = { rationale?: string | null }
type DomainVerdictLike = {
  leadScenarioId?: string | null
  allowedActionLabels?: Array<string | null>
  allowedActions?: Array<string | null>
  blockedActionLabels?: Array<string | null>
  blockedActions?: Array<string | null>
}

type ElementMetaphor = {
  archetype: string
  environment: string
  edge: string
  risk: string
}

function hasBatchim(text: string): boolean {
  const value = String(text || '').trim()
  if (!value) return false
  const last = value.charCodeAt(value.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

function withObjectParticle(text: string): string {
  const value = String(text || '').trim()
  if (!value) return ''
  return `${value}${hasBatchim(value) ? '을' : '를'}`
}

export type ReportSectionRendererDeps = {
  buildEvidenceFooter: (input: MatrixCalculationInput, lang: 'ko' | 'en') => string
  normalizeNarrativeCoreText: (text: string, lang: 'ko' | 'en') => string
  getReportDomainLabel: (domain: string | undefined, lang: 'ko' | 'en') => string
  getTimingWindowLabel: (window: string | null | undefined, lang: 'ko' | 'en') => string
  findReportCoreTimingWindow: (
    reportCore: ReportCoreViewModel,
    domain: string | undefined
  ) => TimingWindowLike | undefined
  findReportCoreAdvisory: (
    reportCore: ReportCoreViewModel,
    domain: string | undefined
  ) => AdvisoryLike | undefined
  findReportCoreManifestation: (
    reportCore: ReportCoreViewModel,
    domain: string | undefined
  ) => ManifestationLike | undefined
  findReportCoreVerdict: (
    reportCore: ReportCoreViewModel,
    domain: string | undefined
  ) => VerdictLike | undefined
  findReportCoreDomainVerdict: (
    reportCore: ReportCoreViewModel,
    domain: string | undefined
  ) => DomainVerdictLike | undefined
  buildPersonalLifeTimelineNarrative: (
    matrixInput: MatrixCalculationInput,
    matrixSummary: MatrixSummary | undefined,
    lang: 'ko' | 'en'
  ) => string
  buildElementMetaphor: (matrixInput: MatrixCalculationInput, lang: 'ko' | 'en') => ElementMetaphor
  formatScenarioIdForNarrative: (id: string | null | undefined, lang: 'ko' | 'en') => string
  formatNarrativeParagraphs: (text: string, lang: 'ko' | 'en') => string
  sanitizeUserFacingNarrative: (text: string) => string
  containsHangul: (text: string | undefined | null) => boolean
  capitalizeFirst: (text: string | undefined | null) => string
  describeDataTrustSummary: (params: {
    score?: number
    grade?: string
    missingFields: string[]
    derivedFields: string[]
    conflictingFields: string[]
    confidenceReason?: string
    lang: 'ko' | 'en'
  }) => string
  describeProvenanceSummary: (params: {
    sourceFields: string[]
    sourceSetIds: string[]
    sourceRuleIds: string[]
    lang: 'ko' | 'en'
  }) => string
  describeTimingCalibrationSummary: (params: {
    reliabilityBand?: string
    reliabilityScore?: number
    pastStability?: number
    futureStability?: number
    backtestConsistency?: number
    calibratedFromHistory?: boolean
    calibrationSampleSize?: number
    calibrationMatchedRate?: number
    lang: 'ko' | 'en'
  }) => string
  describeIntraMonthPeakWindow: (params: {
    domainLabel: string
    points: unknown
    lang: 'ko' | 'en'
  }) => string
}

function appendEvidenceFooter(
  body: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const evidence = deps.buildEvidenceFooter(input, lang)
  if (!evidence) return body
  return `${body} ${evidence}`.trim()
}

function sanitizeNarrativeReason(
  value: string | null | undefined,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps,
  fallback = ''
): string {
  const text = String(value || '').trim()
  if (!text) return fallback
  return deps.normalizeNarrativeCoreText(text, lang) || fallback
}

export function buildReportTrustNarratives(
  reportCore: ReportCoreViewModel,
  coreQuality: DestinyCoreQuality | undefined,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): { trust: string; provenance: string } {
  const focusTiming = deps.findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusAdvisory = deps.findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusManifestation = deps.findReportCoreManifestation(reportCore, reportCore.focusDomain)

  return {
    trust: deps.describeDataTrustSummary({
      score: coreQuality?.score,
      grade: coreQuality?.grade,
      missingFields: coreQuality?.dataQuality.missingFields || [],
      derivedFields: coreQuality?.dataQuality.derivedFields || [],
      conflictingFields: coreQuality?.dataQuality.conflictingFields || [],
      confidenceReason: coreQuality?.dataQuality.confidenceReason,
      lang,
    }),
    provenance: deps.describeProvenanceSummary({
      sourceFields:
        focusTiming?.provenance?.sourceFields ||
        focusAdvisory?.provenance?.sourceFields ||
        focusManifestation?.provenance?.sourceFields ||
        [],
      sourceSetIds:
        focusTiming?.provenance?.sourceSetIds ||
        focusAdvisory?.provenance?.sourceSetIds ||
        focusManifestation?.provenance?.sourceSetIds ||
        [],
      sourceRuleIds:
        focusTiming?.provenance?.sourceRuleIds ||
        focusAdvisory?.provenance?.sourceRuleIds ||
        focusManifestation?.provenance?.sourceRuleIds ||
        [],
      lang,
    }),
  }
}

export function attachTrustNarrativeToSections<T extends Record<string, unknown>>(
  mode: 'comprehensive' | 'timing' | 'themed',
  sections: T,
  trust: string,
  provenance: string
): T {
  if (mode === 'comprehensive') return sections
  const suffix = [trust, provenance].filter(Boolean).join(' ')
  if (!suffix) return sections
  if (mode === 'timing' && typeof sections.overview === 'string') {
    return { ...sections, overview: `${sections.overview} ${suffix}`.trim() }
  }
  if (mode === 'themed' && typeof sections.deepAnalysis === 'string') {
    return { ...sections, deepAnalysis: `${sections.deepAnalysis} ${suffix}`.trim() }
  }
  return sections
}

export function renderIntroductionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const focusLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const actionFocusLabel = deps.getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const focusTiming = deps.findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const topDecision = reportCore.topDecisionLabel || reportCore.primaryAction
  const decadeLine = deps.buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang)
  const shortDecadeLine =
    String(decadeLine || '')
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean)[0] || decadeLine
  const timingReason = sanitizeNarrativeReason(focusTiming?.whyNow, lang, deps)
  const safeTimingReason = lang === 'en' && deps.containsHangul(timingReason) ? '' : timingReason
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          `지금 인생에서 가장 크게 움직이는 흐름은 ${focusLabel}입니다. 지금은 크게 벌이기보다 무엇을 먼저 고정할지가 결과를 가르는 구간입니다.`,
          reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
            ? `삶의 바탕에는 ${focusLabel} 흐름이 깔려 있지만, 지금 먼저 움직여야 할 영역은 ${actionFocusLabel}입니다. 현재 판단 기준도 ${topDecision} 쪽으로 기울어 있어, 속도보다 순서와 기준 정리가 더 중요하게 작동합니다.`
            : `현재 판단 기준도 ${topDecision} 쪽으로 기울어 있어, 속도보다 순서와 기준 정리가 더 중요하게 작동합니다.`,
          timingReason
            ? `이 흐름이 지금 선명한 이유는 ${timingReason}`
            : `이 구간에서는 ${withObjectParticle(metaphor.edge)} 한 번에 다 쓰기보다, 어디에 먼저 써야 할지를 아는 쪽이 유리합니다.`,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        `You are at your strongest when the field gets cleaner, not louder. ${deps.capitalizeFirst(metaphor.archetype)} is the right image for this phase.`,
        reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
          ? `The underlying axis right now is ${focusLabel}, while the action axis is ${actionFocusLabel}. The operating bias is ${topDecision}.`
          : `The central axis right now is ${focusLabel}, and the operating bias is ${topDecision}.`,
        `${deps.capitalizeFirst(metaphor.environment)} is where your ${metaphor.edge} become visible.`,
        shortDecadeLine,
        safeTimingReason
          ? `This is sharp right now because ${safeTimingReason}`
          : 'This phase rewards sequence more than speed.',
        reportCore.riskControl,
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderLifeMissionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const focusVerdict = deps.findReportCoreVerdict(reportCore, reportCore.focusDomain)
  const leadScenarios = reportCore.topScenarioIds
    .slice(0, 3)
    .map((id) => deps.formatScenarioIdForNarrative(id, lang))
    .filter(Boolean)
  const timeline = deps.buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang)
  const focusLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          '이번 인생 구간은 성과 하나를 더 만드는 시기가 아니라, 앞으로 오래 가져갈 기준을 다시 세우는 시기입니다.',
          String(timeline || '')
            .split(/(?<=[.!?])\s+/)
            .map((line) => line.trim())
            .filter(Boolean)[0] || timeline,
          `이번 장기 흐름에서 가장 크게 움직이는 영역은 ${focusLabel}이며, 지금 배워야 할 과제도 이 흐름에서 가장 선명하게 드러납니다.`,
          `${focusLabel}에서는 더 많이 쥐는 것보다, 어떤 기준을 반복 선택의 중심에 둘지가 장기 결과를 가릅니다.`,
          leadScenarios.length > 0
            ? `지금 인생 서사를 실제로 앞으로 미는 장면은 ${leadScenarios.join(', ')} 쪽입니다.`
            : '',
          '그래서 이번 10년은 성과를 늘리는 법보다, 다음 구간까지 들고 갈 원칙을 남기는 법을 배우는 쪽에 가깝습니다.',
          `장기 흐름에서 가장 위험한 지점은 ${metaphor.risk}이 기준 상실이나 과속 확정으로 바뀌는 순간입니다.`,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        `This chapter is about learning how to carry ${metaphor.archetype} for the long run without losing its edge.`,
        String(timeline || '')
          .split(/(?<=[.!?])\s+/)
          .map((line) => line.trim())
          .filter(Boolean)[0] || timeline,
        `The current life chapter is centered on ${focusLabel}, and that is where the main lesson is becoming visible.`,
        `The long arc improves less through isolated wins and more through standards you can repeat under pressure.`,
        leadScenarios.length > 0
          ? `The scenes pushing this life chapter forward are ${leadScenarios.join(', ')}.`
          : '',
        `${metaphor.risk} is the long-range failure point, especially when standards collapse or commitments are rushed.`,
        deps.normalizeNarrativeCoreText(focusVerdict?.rationale || reportCore.riskControl, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderPersonalityDeepSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const focusManifestation = deps.findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          focusManifestation?.baselineThesis ||
            '타고난 구조는 기준을 세우고 흐름을 조율하는 쪽에 가깝습니다.',
          `기본 성향의 강점은 ${withObjectParticle(metaphor.edge)} 빠르게 세우는 데 있고, 약점은 ${metaphor.risk}이 판단 과속으로 바뀔 때 드러납니다.`,
          '그래서 이 성향은 감으로 먼저 밀기보다, 기준 한 줄을 먼저 적고 움직일 때 가장 안정적으로 힘을 냅니다.',
          '핵심은 빠른 결론이 아니라, 결론과 확정의 타이밍을 분리하는 데 있습니다.',
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const safeBaseline = deps
    .normalizeNarrativeCoreText(focusManifestation?.baselineThesis || '', lang)
    .replace(/\b(Personality Engine|Phase transition layer|Expansion resource layer)\b:?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        'Your baseline temperament is strongest when standards are visible and pace is controlled.',
        `The upside of this structure is how quickly ${metaphor.edge} can be established once the room is clean.`,
        `The risk appears when ${metaphor.risk} turns into premature certainty before the shape of the situation is fully clear.`,
        safeBaseline && !/\b(pattern|layer|signal|engine)\b/i.test(safeBaseline)
          ? `In practical terms, ${safeBaseline.replace(/^[A-Z]/, (m) => m.toLowerCase())}`
          : 'In practical terms, you work best when the standard is named first and momentum is allowed to follow later.',
        'This personality is less about dramatic speed and more about knowing where the line should be drawn before anything becomes final.',
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderTimingAdviceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps,
  matrixSummary?: MatrixSummary
): string {
  const reportDomainToTimelineDomain = (() => {
    switch (reportCore.focusDomain) {
      case 'career':
        return 'career' as const
      case 'relationship':
        return 'love' as const
      case 'wealth':
        return 'money' as const
      case 'health':
        return 'health' as const
      case 'move':
        return 'move' as const
      default:
        return null
    }
  })()
  const focusTiming = deps.findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)
  const calibrationLine = deps.describeTimingCalibrationSummary({
    reliabilityBand: matrixSummary?.timingCalibration?.reliabilityBand,
    reliabilityScore: matrixSummary?.timingCalibration?.reliabilityScore,
    pastStability: matrixSummary?.timingCalibration?.pastStability,
    futureStability: matrixSummary?.timingCalibration?.futureStability,
    backtestConsistency: matrixSummary?.timingCalibration?.backtestConsistency,
    calibratedFromHistory: matrixSummary?.timingCalibration?.calibratedFromHistory,
    calibrationSampleSize: matrixSummary?.timingCalibration?.calibrationSampleSize,
    calibrationMatchedRate: matrixSummary?.timingCalibration?.calibrationMatchedRate,
    lang,
  })
  const intraMonthPeakLine = deps.describeIntraMonthPeakWindow({
    domainLabel: focusLabel,
    points: reportDomainToTimelineDomain
      ? matrixSummary?.overlapTimelineByDomain?.[reportDomainToTimelineDomain]
      : undefined,
    lang,
  })

  const koreanTimingExecutionLine = (() => {
    switch (reportCore.focusDomain) {
      case 'career':
        return '지금은 문서, 역할, 기한을 먼저 고정한 뒤에야 움직임이 힘을 받습니다.'
      case 'relationship':
        return '지금은 감정보다 속도와 경계를 먼저 맞춘 뒤에야 관계가 덜 흔들립니다.'
      case 'wealth':
        return '지금은 수익 기대보다 조건, 손실 상한, 빠져나올 문을 먼저 정해야 합니다.'
      case 'health':
        return '지금은 의지보다 회복 리듬과 과부하 신호를 먼저 정리해야 몸이 따라옵니다.'
      case 'move':
        return '지금은 이동 자체보다 경로, 생활 거점, 하루 동선을 먼저 다시 점검해야 합니다.'
      default:
        return '지금은 다음 수를 크게 두기보다, 다시 볼 수 있는 작은 단계로 나누는 편이 맞습니다.'
    }
  })()

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          focusTiming
            ? `${focusLabel}에서는 지금 바로 크게 밀어붙이기보다, 검토와 확정을 다른 리듬으로 나눌 때 타이밍이 살아납니다.`
            : `${focusLabel}에서는 지금 한 번에 밀어붙이기보다, 단계를 나눠 움직이는 편이 맞습니다.`,
          `지금 타이밍의 힘은 속도를 올리는 데 있지 않고, ${withObjectParticle(metaphor.edge)} 언제 꺼내 쓸지 아는 데 있습니다.`,
          koreanTimingExecutionLine,
          '오늘은 결론을 서두르기보다, 한 번 더 확인할 지점을 먼저 문서로 남기는 편이 안전합니다.',
          intraMonthPeakLine,
          calibrationLine,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const englishTimingExecutionLine = (() => {
    switch (reportCore.focusDomain) {
      case 'career':
        return 'The clean version of this move is simple: write down scope, deadline, and ownership before anything becomes public.'
      case 'relationship':
        return 'The clean version of this move is to align pace, boundaries, and expectations before giving the relationship a heavier name.'
      case 'wealth':
        return 'The clean version of this move is to lock the amount, the downside, and the exit terms before you expand.'
      case 'health':
        return 'The clean version of this move is to reduce load first and rebuild a repeatable recovery rhythm before intensity returns.'
      case 'move':
        return 'The clean version of this move is to verify the route, the base, and the daily friction before any larger relocation step.'
      default:
        return 'The clean version of this move is to keep the next step small enough to review before it becomes final.'
    }
  })()

  return deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        focusTiming
          ? `This is a usable ${deps.getTimingWindowLabel(focusTiming.window || undefined, lang).toLowerCase()} window for ${focusLabel}, but only if sequence comes before speed.`
          : `This phase is usable for ${focusLabel}, but it should be handled in stages rather than in one push.`,
        `The timing edge here is not acceleration, but knowing when ${metaphor.edge} should actually be used.`,
        englishTimingExecutionLine,
        'Pause the move when assumptions start replacing direct communication or when scope cannot be verified in writing.',
        intraMonthPeakLine,
        calibrationLine,
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
}

export function renderActionPlanSection(
  reportCore: ReportCoreViewModel,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const focusLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const actionFocusLabel = deps.getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const koreanActionCheckLine = (() => {
    switch (reportCore.focusDomain) {
      case 'career':
        return '오늘은 먼저 닫을 것 하나와 보류할 것 하나를 분리해 두는 편이 맞습니다.'
      case 'relationship':
        return '오늘은 관계를 더 깊게 밀기보다, 기대치와 속도를 한 번 더 맞추는 편이 맞습니다.'
      case 'wealth':
        return '오늘은 이익을 키우기보다 손실 상한과 조건부터 다시 확인하는 편이 맞습니다.'
      case 'health':
        return '오늘은 성과를 더 내기보다 회복 루틴을 먼저 지키는 편이 맞습니다.'
      case 'move':
        return '오늘은 결정을 키우기보다 경로와 생활 동선을 다시 확인하는 편이 맞습니다.'
      default:
        return '오늘은 바로 닫기보다 다시 볼 수 있는 작은 단계로 나누는 편이 맞습니다.'
    }
  })()

  if (lang === 'ko') {
    return deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          `이번 실행의 우선 행동은 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
          reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
            ? `삶의 배경에는 ${focusLabel} 흐름이 깔려 있지만, 이번 실행은 ${actionFocusLabel} 쪽부터 먼저 정리하는 편이 맞습니다.`
            : '',
          '한 번에 닫으려 하지 말고, 먼저 역할과 범위를 적고 그다음 확인 지점을 끼워 넣으세요.',
          '분위기나 압박이 결정을 대신하게 두면, 지금 구간의 장점이 바로 손실로 바뀝니다.',
          koreanActionCheckLine,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
  }

  const englishExecutionLine = (() => {
    switch (reportCore.focusDomain) {
      case 'career':
        return 'Start by fixing the role, the scope, and the review point before you try to close anything.'
      case 'relationship':
        return 'Start by clarifying pace and boundaries before you try to deepen or define the relationship.'
      case 'wealth':
        return 'Start by fixing the terms and the downside before you decide how much upside is worth chasing.'
      case 'health':
        return 'Start by reducing load and restoring a repeatable recovery rhythm before you ask the body for more output.'
      case 'move':
        return 'Start by reviewing the route, the base of operations, and the daily friction before any larger move.'
      default:
        return 'Start with a smaller, reviewable step before you try to turn the whole plan into a final commitment.'
    }
  })()

  return deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        `The current priority is ${reportCore.topDecisionLabel || reportCore.primaryAction}.`,
        reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
          ? `The underlying axis is ${focusLabel}, but this move should be executed through ${actionFocusLabel} first.`
          : '',
        englishExecutionLine,
        'Do not mistake momentum for readiness; if the plan cannot survive one round of review, it is not ready to close.',
        'Before moving, make sure the next step can still be verified, revised, or paused without creating unnecessary damage.',
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
}

export function renderCareerPathSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const timing = deps.findReportCoreTimingWindow(reportCore, 'career')
  const verdict = deps.findReportCoreVerdict(reportCore, 'career')
  const domainVerdict = deps.findReportCoreDomainVerdict(reportCore, 'career')
  const leadScenario = deps.formatScenarioIdForNarrative(
    domainVerdict?.leadScenarioId || undefined,
    lang
  )
  const allowed = (domainVerdict?.allowedActionLabels || domainVerdict?.allowedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          `당신의 커리어는 ${metaphor.archetype}처럼, 복잡한 판을 정리할수록 더 위력이 생깁니다.`,
          `${metaphor.environment}에서 ${metaphor.edge}이 커리어 강점으로 드러납니다.`,
          '핵심은 일을 늘리는 것보다 우선순위와 책임 범위를 먼저 고정하는 데 있습니다.',
          leadScenario ? `실제 커리어 서사는 ${leadScenario} 쪽으로 열려 있습니다.` : '',
          timing?.whyNow
            ? `지금 이 장면이 중요한 이유는 ${sanitizeNarrativeReason(timing.whyNow, lang, deps)}`
            : '',
          `${metaphor.risk}이 커리어 손실로 이어지기 쉬우니, 확정보다 기준 고정이 먼저입니다.`,
          allowed
            ? '지금 커리어에서는 한 번에 닫기보다, 역할을 먼저 고정하고 중간 점검을 끼워 넣는 방식이 맞습니다.'
            : '',
          deps.normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        `Your career gets sharper when the scene gets cleaner. ${deps.capitalizeFirst(metaphor.archetype)} is the right image here.`,
        `${deps.capitalizeFirst(metaphor.environment)} is where your ${metaphor.edge} become visible in work.`,
        'The real edge is not doing more, but deciding what you will be measured by.',
        leadScenario ? `The live career scene is ${leadScenario}.` : '',
        `${deps.capitalizeFirst(metaphor.risk)} is the work risk to watch.`,
        allowed
          ? 'In career, the better move is not a one-shot close but a staged path: lock the role first, then insert a review point before final commitment.'
          : '',
        deps.normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderRelationshipDynamicsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const timing = deps.findReportCoreTimingWindow(reportCore, 'relationship')
  const verdict = deps.findReportCoreVerdict(reportCore, 'relationship')
  const domainVerdict = deps.findReportCoreDomainVerdict(reportCore, 'relationship')
  const leadScenario = deps.formatScenarioIdForNarrative(
    domainVerdict?.leadScenarioId || undefined,
    lang
  )
  const blocked = (domainVerdict?.blockedActionLabels || domainVerdict?.blockedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          '관계는 감정의 크기보다 해석 일치, 기대치 조정, 경계 설정이 맞을 때 훨씬 안정적으로 움직입니다.',
          '이번 관계 흐름은 바로 결론을 내리기보다 거리와 속도를 먼저 맞추는 쪽에 가깝습니다.',
          `${metaphor.archetype} 같은 기질은 관계에서도 선을 먼저 긋고 난 뒤에야 깊이를 허용하는 방식으로 드러납니다.`,
          leadScenario ? `지금 관계에서 실제로 반복되는 장면은 ${leadScenario}입니다.` : '',
          timing?.whyNow
            ? `이 관계 이슈가 지금 떠오르는 이유는 ${sanitizeNarrativeReason(timing.whyNow, lang, deps)}`
            : '',
          blocked
            ? '특히 결론을 서두르거나 확인 없이 선을 넘는 방식은 오해를 키울 수 있습니다.'
            : '',
          deps.normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryCaution, lang),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        'Relationships improve here when interpretation, boundaries, and pacing line up before commitment pressure rises.',
        'This phase is less about forcing a conclusion and more about matching distance, pace, and expectations.',
        `${deps.capitalizeFirst(metaphor.archetype)} shows up in relationships as the need to draw the line before going deeper.`,
        leadScenario ? `The relationship scene repeating now is ${leadScenario}.` : '',
        blocked
          ? 'Pushing commitment or crossing the line without enough verification is more likely to enlarge misunderstanding.'
          : '',
        deps.normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryCaution, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderWealthPotentialSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const advisory = deps.findReportCoreAdvisory(reportCore, 'wealth')
  const timing = deps.findReportCoreTimingWindow(reportCore, 'wealth')
  const manifestation = deps.findReportCoreManifestation(reportCore, 'wealth')
  const verdict = deps.findReportCoreVerdict(reportCore, 'wealth')
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)
  const safeTimingReason = lang === 'en' ? '' : sanitizeNarrativeReason(timing?.whyNow, lang, deps)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          `재정은 ${metaphor.archetype}처럼 숫자와 조건을 차갑게 가를수록 더 오래 남습니다.`,
          manifestation?.manifestation ||
            '이번 돈의 흐름은 수익을 부풀리는 시기라기보다, 어디로 들어오고 어디서 새는지를 냉정하게 갈라봐야 하는 구간입니다.',
          `${metaphor.environment}처럼 돈도 힘을 줄 자리와 잘라낼 지출을 먼저 가를 때 비로소 속도가 붙습니다.`,
          timing?.whyNow
            ? `지금 이 판단이 필요한 이유는 ${sanitizeNarrativeReason(timing.whyNow, lang, deps)}`
            : '',
          `${metaphor.risk}이 재정에서는 과속 투자, 대충 넘긴 조건, 손실 상한 없는 약속으로 바뀌기 쉽습니다.`,
          '이번 재정의 승부처는 많이 버는 장면이 아니라, 어디까지 잃을 수 있고 무엇까지 책임질지를 먼저 써두는 데 있습니다.',
          '돈이 들어오는 문보다 먼저 점검해야 할 것은 계약 조건, 정산 기준, 손실 상한입니다.',
          deps.normalizeNarrativeCoreText(
            verdict?.rationale || advisory?.caution || reportCore.riskControl,
            lang
          ),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        `Wealth lasts longer when numbers, limits, and terms stay clean. ${deps.capitalizeFirst(metaphor.archetype)} is the right money image here.`,
        deps.capitalizeFirst(
          manifestation?.manifestation ||
            'This is less a phase for inflating upside and more a phase for separating inflow, leakage, and obligation with precision.'
        ),
        `${deps.capitalizeFirst(metaphor.environment)} is where the money decision becomes visible: decide what gets resources and what gets cut before you scale anything.`,
        safeTimingReason ? `This matters now because ${safeTimingReason}` : '',
        `${deps.capitalizeFirst(metaphor.risk)} tends to show up in money as rushed commitments, vague terms, and downside that was never defined in writing.`,
        'The real money edge now is not bigger upside, but knowing exactly what can leak, what remains negotiable, and where the downside stops.',
        'Before you chase more money, lock the terms, settlement logic, and loss boundary.',
        deps.normalizeNarrativeCoreText(
          verdict?.rationale || advisory?.caution || reportCore.riskControl,
          lang
        ),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderConclusionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const focusLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)
  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      lang === 'ko'
        ? [
            `이번 총운의 결론은 단순합니다. ${focusLabel} 축에서는 재능보다 운영 순서가 결과를 더 크게 가릅니다.`,
            `지금 차이를 만드는 건 ${withObjectParticle(metaphor.edge)} 어떤 순서로 쓰느냐입니다.`,
            reportCore.riskControl,
          ].join(' ')
        : [
            `The conclusion is simple: in ${focusLabel}, the person who sets the standard first usually controls the phase.`,
            `What changes the outcome here is not raw talent, but how ${metaphor.edge} get applied in sequence.`,
            reportCore.riskControl,
          ].join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}

export function renderHealthGuidanceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportSectionRendererDeps
): string {
  const timing = deps.findReportCoreTimingWindow(reportCore, 'health')
  const verdict = deps.findReportCoreVerdict(reportCore, 'health')
  const metaphor = deps.buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          '건강은 버티는 힘보다 회복 리듬과 과부하 신호를 얼마나 빨리 정리하느냐에서 갈립니다.',
          '이번 건강 흐름은 몰아붙이는 하루보다 반복 가능한 회복 루틴을 먼저 고정하는 쪽이 강합니다.',
          `${metaphor.risk}은 몸에서 피로 누적과 회복 지연으로 번지기 쉽습니다.`,
          timing?.whyNow
            ? `지금 몸 상태를 다시 봐야 하는 이유는 ${sanitizeNarrativeReason(timing.whyNow, lang, deps)}`
            : '',
          deps.normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang, deps)
  }

  const body = deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        'Health depends more on recovery rhythm and overload detection than on endurance alone.',
        'This phase rewards repeatable recovery before intensity.',
        `${deps.capitalizeFirst(metaphor.risk)} often turns into fatigue build-up or delayed recovery in the body.`,
        deps.normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang, deps)
}
