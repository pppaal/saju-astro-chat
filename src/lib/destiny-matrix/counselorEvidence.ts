import type { FusionReport, InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '@/lib/destiny-matrix/types'
import {
  buildGraphRAGEvidence,
  summarizeGraphRAGEvidence,
  type GraphRAGEvidenceSummary,
  type GraphRAGDomain,
} from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { ReportEvidenceRef } from '@/lib/destiny-matrix/ai-report/evidenceRefs'
import type {
  NormalizedSignal,
  SignalDomain,
  SignalSynthesisResult,
} from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/ai-report/strategyEngine'
import type {
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
} from '@/lib/destiny-matrix/ai-report/types'
import { buildUnifiedEnvelope } from '@/lib/destiny-matrix/ai-report/unifiedReport'
import { adaptCoreToCounselor } from '@/lib/destiny-matrix/core/adapters'
import type { DestinyCoreResult } from '@/lib/destiny-matrix/core/runDestinyCore'
import {
  describeDataTrustSummary,
  describeIntraMonthPeakWindow,
  describeProvenanceSummary,
  describeSajuAstroConflictByDomain,
  describeTimingCalibrationSummary,
  describeWhyStack,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import {
  buildSanitizedCanonicalBrief,
  formatTransitLabels,
  localizeCounselorDomain,
  sanitizeCounselorFreeText,
  sanitizeCounselorProjectionBlock,
  sanitizeCounselorTextList,
} from '@/lib/destiny-matrix/counselorEvidenceSanitizer'
import {
  buildCounselorArbitrationLine,
  buildCounselorVerdictContext,
  buildCounselorVerdictLead,
  buildCounselorVerdictTimingLine,
  isQuestionDrivenTheme,
  joinUniqueVerdictParts,
  mapThemeToDomain,
} from '@/lib/destiny-matrix/counselorEvidenceVerdict'

const COUNSELOR_SECTION_PATHS = [
  'overview',
  'patterns',
  'timing',
  'recommendations',
  'actionPlan',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
] as const

export type CounselorTheme =
  | 'love'
  | 'career'
  | 'wealth'
  | 'health'
  | 'family'
  | 'today'
  | 'month'
  | 'year'
  | 'life'
  | 'chat'
  | string

function mapSignalDomainToTimelineDomain(
  domain?: string
): import('@/lib/destiny-matrix/types').DomainKey | null {
  switch (domain) {
    case 'career':
      return 'career'
    case 'relationship':
      return 'love'
    case 'wealth':
      return 'money'
    case 'health':
      return 'health'
    case 'move':
      return 'move'
    default:
      return null
  }
}

export interface CounselorEvidencePacket {
  focusDomain: string
  actionFocusDomain?: string
  riskAxisLabel?: string
  timingMatrix?: Array<{
    domain: string
    label: string
    window: string
    granularity: string
    confidence: number
    summary: string
  }>
  verdict: string
  guardrail: string
  topAnchorSummary: string
  graphRagEvidenceSummary: GraphRAGEvidenceSummary
  topAnchors: Array<{
    id: string
    section: string
    summary: string
    setCount: number
  }>
  topClaims: Array<{
    id: string
    text: string
    domain?: string
    signalIds: string[]
    anchorIds: string[]
    provenanceSummary?: string
  }>
  scenarioBriefs: Array<{
    id: string
    domain: string
    mainTokens: string[]
    altTokens: string[]
  }>
  selectedSignals: Array<{
    id: string
    domain: string
    polarity: string
    summary: string
    score: number
  }>
  strategyBrief: {
    overallPhase: string
    overallPhaseLabel: string
    attackPercent: number
    defensePercent: number
  }
  canonicalBrief?: {
    gradeLabel: string
    phaseLabel: string
    actionFocusDomain?: string
    focusRunnerUpDomain?: string
    actionRunnerUpDomain?: string
    focusNarrative?: string
    actionNarrative?: string
    suppressionNarratives?: string[]
    topDecisionAction?: string
    topDecisionLabel?: string
    answerThesis: string
    primaryAction: string
    primaryCaution: string
    timingHint: string
    policyMode: 'execute' | 'verify' | 'prepare'
    policyRationale: string
    allowedActions: string[]
    blockedActions: string[]
    softChecks: string[]
    hardStops: string[]
    latentTopAxes?: string[]
  }
  topDomainAdvisory?: {
    domain: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
  }
  topTimingWindow?: {
    domain: string
    window: string
    timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
    timingReliabilityBand?: 'low' | 'medium' | 'high'
    timingReliabilityScore?: number
    readinessScore?: number
    triggerScore?: number
    convergenceScore?: number
    precisionReason?: string
    timingConflictMode?: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
    timingConflictNarrative?: string
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
  }
  topManifestation?: {
    domain: string
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: string
  }
  projections?: {
    structure?: CounselorProjectionBlock
    timing?: CounselorProjectionBlock
    conflict?: CounselorProjectionBlock
    action?: CounselorProjectionBlock
    risk?: CounselorProjectionBlock
    evidence?: CounselorProjectionBlock
    branches?: CounselorProjectionBlock
  }
  whyStack: string[]
}

export type CounselorProjectionBlock = {
  headline: string
  summary: string
  reasons?: string[]
  detailLines?: string[]
  drivers?: string[]
  counterweights?: string[]
  nextMoves?: string[]
}

type CounselorEvidencePacketLike = {
  focusDomain?: string
  riskAxisLabel?: string
  timingMatrix?: CounselorEvidencePacket['timingMatrix']
  verdict?: string
  guardrail?: string
  topAnchorSummary?: string
  graphRagEvidenceSummary?: Partial<GraphRAGEvidenceSummary>
  topAnchors?: Array<{
    id?: string
    section?: string
    summary?: string
    setCount?: number
  }>
  topClaims?: Array<{
    id?: string
    text?: string
    domain?: string
    signalIds?: string[]
    anchorIds?: string[]
    provenanceSummary?: string
  }>
  scenarioBriefs?: Array<{
    id?: string
    domain?: string
    mainTokens?: string[]
    altTokens?: string[]
  }>
  selectedSignals?: Array<{
    id?: string
    domain?: string
    polarity?: string
    summary?: string
    score?: number
  }>
  strategyBrief?: {
    overallPhase?: string
    overallPhaseLabel?: string
    attackPercent?: number
    defensePercent?: number
  }
  canonicalBrief?: Partial<NonNullable<CounselorEvidencePacket['canonicalBrief']>>
  topDomainAdvisory?: CounselorEvidencePacket['topDomainAdvisory']
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow']
  topManifestation?: CounselorEvidencePacket['topManifestation']
  projections?: CounselorEvidencePacket['projections']
  whyStack?: string[]
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function buildDomainSpecificWhyReasons(input: {
  domain: string
  lang: 'ko' | 'en'
  yongsin?: string
  currentDaeunElement?: string
  geokguk?: string
  activeTransits?: string[]
  aspectsCount?: number
  graphFocusReason?: string
  graphReason?: string
  strategyLine?: string
  answerThesis?: string
}): {
  sajuWhy: string
  astroWhy: string
  crossWhy: string
  graphWhy: string
} {
  const {
    domain,
    lang,
    yongsin,
    currentDaeunElement,
    geokguk,
    activeTransits = [],
    aspectsCount = 0,
    graphFocusReason,
    graphReason,
    strategyLine,
    answerThesis,
  } = input

  if (lang !== 'ko') {
    const genericSaju =
      yongsin && currentDaeunElement
        ? yongsin === currentDaeunElement
          ? `the current 10-year cycle matches the useful element (${yongsin}), so the broader pattern is supportive`
          : `the current 10-year cycle (${currentDaeunElement}) does not fully match the useful element (${yongsin}), so pace control matters`
        : geokguk
          ? `the pattern frame (${geokguk}) sets the baseline temperament of this issue`
          : `the broader pattern sets the baseline direction of the issue`
    const genericAstro =
      activeTransits.length > 0
        ? `active transits like ${activeTransits.slice(0, 2).join(', ')} are changing timing and reaction speed`
        : aspectsCount > 0
          ? `the natal chart geometry explains which scene becomes visible first`
          : `astrology is mainly reinforcing timing and variable management`
    return {
      sajuWhy: genericSaju,
      astroWhy: genericAstro,
      crossWhy:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        'the overlapping signals point to the same decision axis first',
      graphWhy:
        graphReason ||
        'the top evidence bundle is ranked first because its overlap and fit are stronger than the surrounding sets',
    }
  }

  const byDomain: Record<
    string,
    {
      saju: string
      astro: string
      cross: string
      graph: string
    }
  > = {
    relationship: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞물려 관계를 밀 때와 멈출 때의 기준이 비교적 또렷합니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 감정보다 관계의 거리와 기준을 먼저 봐야 합니다.`
          : `관계에서는 감정보다 기대치와 경계가 어떻게 굳어 있는지가 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 대화 속도와 오해 가능성을 직접 흔들고 있습니다.`
          : `점성 쪽은 누가 먼저 열리고, 어디서 반응이 엇갈리는지 같은 타이밍 변수를 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '관계는 감정의 강도보다 대화 순서와 확인 방식이 결과를 바꾸는 축으로 겹칩니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 관계에서 말의 순서, 경계, 재확인 포인트가 가장 촘촘히 겹치는 장면을 먼저 잡습니다.',
    },
    career: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 역할 확장이나 책임 증가를 감당할 체력이 붙는 흐름입니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 성과보다 역할·범위 정리가 먼저입니다.`
          : `커리어에서는 어떤 역할을 맡아도 버틸 구조인지가 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 마감, 평가, 조율 속도를 바꾸고 있습니다.`
          : `점성 쪽은 언제 책임이 늘고, 언제 일정 변수로 흔들리는지 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '커리어는 가능성보다 역할, 책임 범위, 마감 기준을 먼저 고정해야 하는 축으로 근거가 모입니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 커리어에서 역할 정의, 범위 조율, 마감 압력과 가장 직접 연결된 장면을 먼저 올립니다.',
    },
    wealth: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 돈의 흐름을 늘릴 여지는 있지만, 구조를 먼저 잡을수록 유지력이 커집니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 수익보다 누수와 손실 상한부터 봐야 합니다.`
          : `재정에서는 얼마를 버느냐보다 무엇이 새고 있는지가 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 지출 타이밍, 협상 속도, 조건 변수를 직접 흔듭니다.`
          : `점성 쪽은 금액보다 기한, 계약 조건, 변수 관리 쪽 리듬을 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '재정은 기대 수익보다 금액, 기한, 손실 상한을 먼저 닫아야 하는 축으로 근거가 겹칩니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 재정에서 조건 검토, 현금흐름, 손실 제한과 가장 직접 연결된 세트를 먼저 씁니다.',
    },
    health: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 회복 리듬을 다시 세우면 체력이 따라붙기 쉬운 흐름입니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 무리한 추진보다 회복 블록 확보가 먼저입니다.`
          : `건강에서는 의지보다 회복 리듬이 얼마나 무너지지 않았는지가 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 피로 체감, 수면 흔들림, 과부하 타이밍을 직접 건드립니다.`
          : `점성 쪽은 몸 상태가 언제 흔들리고 언제 회복 여지가 붙는지 같은 생활 타이밍을 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '건강은 억지로 끌어올리는 힘보다 회복 리듬과 과부하 관리가 먼저라는 쪽으로 근거가 모입니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 건강에서 피로 누적, 회복 순서, 루틴 유지와 가장 직접 맞닿은 세트를 먼저 고릅니다.',
    },
    move: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 이동이나 거점 재설계의 큰 방향을 잡기 쉬운 흐름입니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 크게 옮기기보다 경로와 생활 거점을 다시 짜는 편이 낫습니다.`
          : `이동에서는 결단력보다 생활 동선과 유지 가능한 구조가 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 경로, 일정 변경, 외부 변수 유입 속도를 흔들고 있습니다.`
          : `점성 쪽은 언제 이동 창이 열리고, 언제 일정 변수 때문에 틀어지기 쉬운지 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '이동은 한 번에 확정하는 결정이 아니라 경로와 거점을 다시 설계하는 문제로 근거가 겹칩니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 이동에서 경로 재확인, 계약 검토, 거점 재정리와 바로 연결되는 장면을 먼저 봅니다.',
    },
    timing: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 큰 흐름과 실제 타이밍이 비교적 같은 방향으로 갑니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 시기 판단은 더 보수적으로 잡는 편이 맞습니다.`
          : `타이밍에서는 큰 흐름이 받쳐주는지부터 보는 것이 먼저입니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 언제 열리고 언제 흔들리는지 같은 실제 시점 변수를 만듭니다.`
          : `점성 쪽은 시점의 열림과 닫힘을 더 민감하게 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '타이밍은 좋아 보이는 순간보다 실제로 조건이 맞는 순간을 고르는 문제라는 쪽으로 근거가 겹칩니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 타이밍에서 열리는 조건과 늦춰야 할 신호가 가장 선명한 세트를 먼저 올립니다.',
    },
    personality: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 원래 강점이 더 잘 드러나는 흐름입니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 원래 강점보다 방어 습관이 먼저 튀어나오기 쉽습니다.`
          : `성향에서는 원래 어떤 방식으로 버티고, 어디서 과해지는지가 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 반응 속도와 대인 태도를 일시적으로 바꿉니다.`
          : `점성 쪽은 평소 성향이 어떤 상황에서 더 강하게 드러나는지 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '성향은 장점이 어디서 힘이 되고, 어디서 과해지는지 보는 축으로 근거가 모입니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 성향에서 반복되는 반응 패턴과 그 결과를 가장 잘 설명하는 세트를 먼저 씁니다.',
    },
    spirituality: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `현재 대운 오행이 용신(${yongsin})과 맞아 장기 방향과 내적 기준을 다시 세우기 쉬운 흐름입니다.`
            : `현재 대운 오행(${currentDaeunElement})과 용신(${yongsin})이 어긋나 있어 방향성은 급히 확정하기보다 가치 기준을 먼저 정리하는 편이 맞습니다.`
          : `사명과 장기 방향에서는 외부 성과보다 무엇을 오래 가져갈지의 기준이 기본 체질을 만듭니다.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} 같은 현재 변수가 방향 감각과 의미 해석의 체감 변화를 크게 만듭니다.`
          : `점성 쪽은 어떤 시점에 방향 감각이 흔들리고 다시 선명해지는지 보여줍니다.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '장기 방향은 성급한 결론보다 무엇을 오래 유지할지의 기준을 세우는 문제로 근거가 모입니다.',
      graph:
        graphReason ||
        '상위 근거 묶음은 장기 방향에서 반복 가치와 선택 기준을 가장 잘 설명하는 세트를 먼저 씁니다.',
    },
  }

  const selected = byDomain[domain] || byDomain.personality
  return {
    sajuWhy: selected.saju,
    astroWhy: selected.astro,
    crossWhy: selected.cross,
    graphWhy: selected.graph,
  }
}

function domainHintsForSection(sectionPath: string, focusDomain: string): string[] {
  switch (sectionPath) {
    case 'overview':
      return uniq([focusDomain, 'personality', 'timing'])
    case 'patterns':
      return uniq([focusDomain, 'personality'])
    case 'timing':
      return uniq(['timing', focusDomain])
    case 'recommendations':
    case 'actionPlan':
      return uniq([focusDomain, 'timing'])
    default:
      return [focusDomain]
  }
}

function toEvidenceRefs(
  sectionPath: string,
  focusDomain: string,
  signalSynthesis: SignalSynthesisResult
): ReportEvidenceRef[] {
  const domainHints = domainHintsForSection(sectionPath, focusDomain)
  const selected = (signalSynthesis.selectedSignals || [])
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
  const prioritized = selected.filter((signal) =>
    signal.domainHints.some((domain) => domainHints.includes(domain))
  )
  const fallback = selected.slice(0, 8)
  const source = (prioritized.length > 0 ? prioritized : fallback).slice(0, 8)

  return source.map((signal) => ({
    id: signal.id,
    domain: signal.domainHints[0],
    layer: signal.layer,
    rowKey: signal.rowKey,
    colKey: signal.colKey,
    keyword: signal.keyword,
    sajuBasis: signal.sajuBasis,
    astroBasis: signal.astroBasis,
    score: signal.score,
  }))
}

function mergeUniqueSignals(signalSynthesis: SignalSynthesisResult): NormalizedSignal[] {
  const seen = new Set<string>()
  const ordered = [
    ...(signalSynthesis.selectedSignals || []),
    ...(signalSynthesis.normalizedSignals || []),
  ]
  const out: NormalizedSignal[] = []
  for (const signal of ordered) {
    if (!signal?.id || seen.has(signal.id)) continue
    seen.add(signal.id)
    out.push(signal)
  }
  return out
}

function scoreCounselorSignal(
  signal: NormalizedSignal,
  focusDomain: string,
  sectionPath: string | undefined,
  isSelected: boolean
): number {
  const signalDomains = signal.domainHints || []
  const matchesFocusLead = signalDomains[0] === focusDomain
  const matchesFocusAny = signalDomains.some((domain) => domain === focusDomain)
  const sectionHints = sectionPath
    ? domainHintsForSection(sectionPath, focusDomain as InsightDomain)
    : []
  const matchesSectionLead =
    sectionHints.length > 0 && signalDomains[0] && sectionHints.includes(signalDomains[0])
  const matchesSectionAny = sectionHints.some((hint) =>
    signalDomains.some((domain) => domain === hint)
  )
  return (
    (matchesFocusLead ? 120 : 0) +
    (matchesFocusAny ? 80 : 0) +
    (matchesSectionLead ? 48 : 0) +
    (matchesSectionAny ? 24 : 0) +
    (isSelected ? 12 : 0) +
    signal.rankScore
  )
}

function rankCounselorSignals(
  signalSynthesis: SignalSynthesisResult,
  focusDomain: string,
  sectionPath?: string
): NormalizedSignal[] {
  const selectedIds = new Set((signalSynthesis.selectedSignals || []).map((signal) => signal.id))
  return mergeUniqueSignals(signalSynthesis)
    .slice()
    .sort((a, b) => {
      const delta =
        scoreCounselorSignal(b, focusDomain, sectionPath, selectedIds.has(b.id)) -
        scoreCounselorSignal(a, focusDomain, sectionPath, selectedIds.has(a.id))
      if (delta !== 0) return delta
      return b.rankScore - a.rankScore
    })
}

function summarizeAnchor(anchor: UnifiedAnchor): string {
  return anchor.crossEvidenceSummary.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function summarizeClaim(claim: UnifiedClaim): string {
  return claim.text.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function isInsightDomain(domain: string): domain is InsightDomain {
  return (
    domain === 'personality' ||
    domain === 'career' ||
    domain === 'relationship' ||
    domain === 'wealth' ||
    domain === 'health' ||
    domain === 'spirituality' ||
    domain === 'timing'
  )
}

function getGraphRagFocusDomain(domain: SignalDomain): GraphRAGDomain {
  if (domain === 'move') return 'move'
  return isInsightDomain(domain) ? domain : 'personality'
}

function getCounselorDomainPriority(domain: SignalDomain): string[] {
  if (domain === 'move') return ['move', 'timing', 'spirituality']
  return [domain]
}

function inferScenarioSectionHints(scenarioIds: string[]): string[] {
  const hints = new Set<string>()
  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (
      /boundary|distance|commitment|cohabitation|family_acceptance|reconciliation|separation|clarify/.test(
        key
      )
    ) {
      hints.add('relationshipDynamics')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/promotion|contract|manager|specialist|authority|entry|restart|role/.test(key)) {
      hints.add('careerPath')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/income|asset|capital|debt|expense|cashflow|pricing/.test(key)) {
      hints.add('wealthPotential')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/recovery|burnout|sleep|inflammation|routine|load/.test(key)) {
      hints.add('recommendations')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/travel|relocation|housing|lease|route|commute|basecamp|cross_border|foreign/.test(key)) {
      hints.add('timing')
      hints.add('actionPlan')
      hints.add('overview')
    }
  }
  return [...hints]
}

function buildScenarioActionHints(scenarioIds: string[], lang: 'ko' | 'en'): string[] {
  const hints = new Set<string>()
  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (/clarify_expectations/.test(key)) {
      hints.add(lang === 'ko' ? '기대치를 먼저 명확히 하세요' : 'clarify expectations first')
    }
    if (/distance_tuning/.test(key)) {
      hints.add(lang === 'ko' ? '거리와 속도를 다시 맞추세요' : 'tune distance and pace')
    }
    if (/boundary_reset/.test(key)) {
      hints.add(lang === 'ko' ? '관계 경계를 다시 정리하세요' : 'reset the boundary')
    }
    if (/commitment_preparation/.test(key)) {
      hints.add(
        lang === 'ko' ? '확정보다 준비 단계를 먼저 두세요' : 'prepare before defining commitment'
      )
    }
    if (/route_recheck/.test(key)) {
      hints.add(lang === 'ko' ? '경로를 먼저 재확인하세요' : 'recheck the route first')
    }
    if (/commute_restructure/.test(key)) {
      hints.add(lang === 'ko' ? '경로와 동선을 다시 설계하세요' : 'restructure the commute')
    }
    if (/basecamp_reset/.test(key)) {
      hints.add(lang === 'ko' ? '생활 거점을 다시 정리하세요' : 'reset the base of operations')
    }
    if (/lease_decision/.test(key)) {
      hints.add(
        lang === 'ko'
          ? '계약 조건을 먼저 재확인하고 다시 협의하세요'
          : 'renegotiate the lease terms'
      )
    }
    if (/promotion_review/.test(key)) {
      hints.add(lang === 'ko' ? '승진/역할 검토를 먼저 하세요' : 'review the promotion case first')
    }
    if (/contract_negotiation/.test(key)) {
      hints.add(lang === 'ko' ? '조건 협의부터 하세요' : 'negotiate the terms first')
    }
    if (/debt_restructure/.test(key)) {
      hints.add(
        lang === 'ko' ? '부채 구조를 재정리하세요' : 'restructure the debt before expanding'
      )
    }
    if (/capital_allocation/.test(key)) {
      hints.add(lang === 'ko' ? '자금 배분부터 다시 점검하세요' : 'review capital allocation first')
    }
    if (/recovery_reset|recovery_compliance/.test(key)) {
      hints.add(
        lang === 'ko' ? '회복 루틴을 먼저 복구하세요' : 'restore the recovery routine first'
      )
    }
  }
  return [...hints].slice(0, 3)
}

function buildPacketGuardrail(
  phase: StrategyEngineResult['overallPhase'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (phase === 'expansion') return '실행은 하되, 확정 전 반대 근거 1개를 반드시 확인하세요.'
    if (phase === 'high_tension_expansion')
      return '속도는 내되 문서, 금액, 약속은 이중 확인 후 확정하세요.'
    if (phase === 'expansion_guarded') return '기회는 잡되 체크리스트를 먼저 끝낸 뒤 확장하세요.'
    if (phase === 'stabilize') return '새 확장보다 구조 정렬과 우선순위 재정리를 먼저 하세요.'
    return '새로운 확장보다 손실, 오해, 과속을 먼저 막으세요.'
  }

  if (phase === 'expansion') return 'Move forward, but force one counter-check before committing.'
  if (phase === 'high_tension_expansion')
    return 'Keep momentum, but double-check documents, money, and commitments first.'
  if (phase === 'expansion_guarded')
    return 'Take the opportunity only after your checklist is complete.'
  if (phase === 'stabilize') return 'Prioritize structural alignment before new expansion.'
  return 'Contain loss, confusion, and overspeed before starting something new.'
}

export function buildCounselorEvidencePacket(params: {
  theme: CounselorTheme
  lang: 'ko' | 'en'
  focusDomainOverride?: InsightDomain
  matrixInput: MatrixCalculationInput
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  signalSynthesis: SignalSynthesisResult
  strategyEngine: StrategyEngineResult
  core?: DestinyCoreResult
  birthDate?: string
}): CounselorEvidencePacket {
  const fallbackFocusDomain = params.focusDomainOverride || mapThemeToDomain(params.theme)
  const counselorCore = params.core ? adaptCoreToCounselor(params.core, params.lang) : null
  const questionDrivenTheme = isQuestionDrivenTheme(params.theme)
  const themedQuestionDomain = questionDrivenTheme ? mapThemeToDomain(params.theme) : undefined
  const preferredDomain =
    params.focusDomainOverride ||
    themedQuestionDomain ||
    counselorCore?.actionFocusDomain ||
    counselorCore?.focusDomain ||
    fallbackFocusDomain

  const graphRagEvidence = buildGraphRAGEvidence(params.matrixInput, params.matrixReport, {
    mode: 'comprehensive',
    focusDomain: getGraphRagFocusDomain(preferredDomain),
  })
  const evidenceRefs = Object.fromEntries(
    COUNSELOR_SECTION_PATHS.map((sectionPath) => [
      sectionPath,
      toEvidenceRefs(sectionPath, preferredDomain, params.signalSynthesis),
    ])
  )

  const unified = buildUnifiedEnvelope({
    mode: 'comprehensive',
    lang: params.lang,
    generatedAt: new Date().toISOString(),
    matrixInput: params.matrixInput,
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
    signalSynthesis: params.signalSynthesis,
    graphRagEvidence,
    birthDate: params.birthDate,
    sectionPaths: COUNSELOR_SECTION_PATHS as unknown as string[],
    evidenceRefs,
  })

  const graphRagEvidenceSummary = summarizeGraphRAGEvidence(graphRagEvidence) || {
    mode: 'comprehensive',
    totalAnchors: 0,
    totalSets: 0,
    avgOverlapScore: 0,
    avgOrbFitScore: 0,
    highTrustSetCount: 0,
    lowTrustSetCount: 0,
    cautionSections: [],
    focusReason: '',
    graphReason: '',
    anchors: [],
  }

  const topClaim = (unified.claims || [])[0]
  const topClaimText = topClaim ? summarizeClaim(topClaim) : ''
  const guardrail = buildPacketGuardrail(params.strategyEngine.overallPhase, params.lang)

  const topDomainAdvisory =
    counselorCore?.advisories.find(
      (item) => item.domain === (counselorCore?.actionFocusDomain || preferredDomain)
    ) ||
    counselorCore?.advisories.find((item) => item.domain === preferredDomain) ||
    counselorCore?.advisories[0] ||
    null
  const topTimingWindow =
    counselorCore?.domainTimingWindows.find(
      (item) => item.domain === (counselorCore?.actionFocusDomain || preferredDomain)
    ) ||
    counselorCore?.domainTimingWindows.find((item) => item.domain === preferredDomain) ||
    counselorCore?.domainTimingWindows[0] ||
    null
  const topManifestation =
    counselorCore?.manifestations.find(
      (item) => item.domain === (counselorCore?.actionFocusDomain || preferredDomain)
    ) ||
    counselorCore?.manifestations.find((item) => item.domain === preferredDomain) ||
    counselorCore?.manifestations[0] ||
    null
  const scenarioActionHints = buildScenarioActionHints(
    counselorCore?.topScenarioIds || [],
    params.lang
  )
  const prefersScenarioActionLead =
    preferredDomain === 'move' &&
    scenarioActionHints.length > 0 &&
    (counselorCore?.topDecisionAction === 'prepare_only' ||
      /preparation|information-gathering|준비|정보 수집/i.test(
        counselorCore?.topDecisionLabel || ''
      ))
  const topDecisionLeadLabel =
    prefersScenarioActionLead && scenarioActionHints[0]
      ? `${localizeCounselorDomain(preferredDomain, params.lang)}: ${scenarioActionHints[0]}`
      : counselorCore?.topDecisionLabel
  const verdictContext = buildCounselorVerdictContext({
    lang: params.lang,
    domainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    topTimingWindow,
    topDomainAdvisory,
    topManifestation,
  })
  const verdictTimingLine = buildCounselorVerdictTimingLine({
    lang: params.lang,
    topTimingWindow,
    topManifestation,
  })

  const verdict = joinUniqueVerdictParts([
    buildCounselorVerdictLead(
      topDecisionLeadLabel ?? undefined,
      counselorCore?.actionFocusDomain,
      preferredDomain,
      params.lang
    ),
    verdictContext || counselorCore?.answerThesis,
    prefersScenarioActionLead ? scenarioActionHints[0] : undefined,
    verdictTimingLine || topManifestation?.manifestation,
    counselorCore ? undefined : topClaimText,
  ])

  const prioritizedSignals = rankCounselorSignals(params.signalSynthesis, preferredDomain).slice(
    0,
    counselorCore ? 6 : 10
  )
  const prioritizedClaims = (unified.claims || [])
    .slice()
    .sort((a, b) => {
      const aFocus = a.domain === preferredDomain ? 1 : 0
      const bFocus = b.domain === preferredDomain ? 1 : 0
      if (aFocus !== bFocus) return bFocus - aFocus
      if (counselorCore?.topClaimId) {
        if (a.id === counselorCore.topClaimId) return -1
        if (b.id === counselorCore.topClaimId) return 1
      }
      return 0
    })
    .slice(0, counselorCore ? 4 : 10)
  const prioritizedScenarioBundles = (unified.scenarioBundles || [])
    .slice()
    .sort((a, b) => {
      const aFocus = a.domain === preferredDomain ? 1 : 0
      const bFocus = b.domain === preferredDomain ? 1 : 0
      if (aFocus !== bFocus) return bFocus - aFocus
      if (counselorCore?.topScenarioIds?.length) {
        const aTop = counselorCore.topScenarioIds.includes(a.id) ? 1 : 0
        const bTop = counselorCore.topScenarioIds.includes(b.id) ? 1 : 0
        if (aTop !== bTop) return bTop - aTop
      }
      return 0
    })
    .slice(0, counselorCore ? 3 : 6)
  const prioritizedAnchors = (unified.anchors || [])
    .slice()
    .sort((a, b) => {
      const scenarioSectionHints = inferScenarioSectionHints(counselorCore?.topScenarioIds || [])
      const anchorSectionDomains = (anchor: UnifiedAnchor) =>
        domainHintsForSection(anchor.section, getGraphRagFocusDomain(preferredDomain))
      const aScenarioFocus = scenarioSectionHints.includes(a.section) ? 1 : 0
      const bScenarioFocus = scenarioSectionHints.includes(b.section) ? 1 : 0
      if (aScenarioFocus !== bScenarioFocus) return bScenarioFocus - aScenarioFocus
      const aFocus = anchorSectionDomains(a).some((domain) =>
        getCounselorDomainPriority(preferredDomain).includes(domain)
      )
        ? 1
        : 0
      const bFocus = anchorSectionDomains(b).some((domain) =>
        getCounselorDomainPriority(preferredDomain).includes(domain)
      )
        ? 1
        : 0
      if (aFocus !== bFocus) return bFocus - aFocus
      if (a.setCount !== b.setCount) return b.setCount - a.setCount
      return summarizeAnchor(b).length - summarizeAnchor(a).length
    })
    .slice(0, counselorCore ? 4 : 8)
  const topAnchorSummary = prioritizedAnchors[0] ? summarizeAnchor(prioritizedAnchors[0]) : ''
  const whyReasons = buildDomainSpecificWhyReasons({
    domain: preferredDomain,
    lang: params.lang,
    yongsin: params.matrixInput.yongsin,
    currentDaeunElement: params.matrixInput.currentDaeunElement,
    geokguk: params.matrixInput.geokguk,
    activeTransits: params.matrixInput.activeTransits,
    aspectsCount: params.matrixInput.aspects?.length,
    graphFocusReason: graphRagEvidenceSummary.focusReason,
    graphReason:
      graphRagEvidenceSummary.graphReason ||
      (topAnchorSummary
        ? `"${topAnchorSummary}" 쪽에서 가장 촘촘하게 이어집니다.`
        : '겹치는 포인트가 가장 많은 장면부터 우선 확인하는 방식으로 정렬됩니다.'),
    strategyLine: topDomainAdvisory?.strategyLine,
    answerThesis: counselorCore?.answerThesis,
  })
  const whyStack = describeWhyStack({
    lang: params.lang,
    focusDomainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    sajuReason: whyReasons.sajuWhy,
    astroReason: whyReasons.astroWhy,
    crossReason: whyReasons.crossWhy,
    graphReason: whyReasons.graphWhy,
  })
  const conflictNarrative = describeSajuAstroConflictByDomain({
    crossAgreement: params.core?.canonical.crossAgreement,
    focusDomainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    lang: params.lang,
  })
  const trustNarrative = describeDataTrustSummary({
    score: params.core?.quality.score,
    grade: params.core?.quality.grade,
    missingFields: params.core?.quality.dataQuality.missingFields || [],
    derivedFields: params.core?.quality.dataQuality.derivedFields || [],
    conflictingFields: params.core?.quality.dataQuality.conflictingFields || [],
    confidenceReason: params.core?.quality.dataQuality.confidenceReason,
    lang: params.lang,
  })
  const provenanceNarrative = describeProvenanceSummary({
    sourceFields:
      topTimingWindow?.provenance?.sourceFields ||
      topDomainAdvisory?.provenance?.sourceFields ||
      topManifestation?.provenance?.sourceFields ||
      [],
    sourceSetIds:
      topTimingWindow?.provenance?.sourceSetIds ||
      topDomainAdvisory?.provenance?.sourceSetIds ||
      topManifestation?.provenance?.sourceSetIds ||
      [],
    sourceRuleIds:
      topTimingWindow?.provenance?.sourceRuleIds ||
      topDomainAdvisory?.provenance?.sourceRuleIds ||
      topManifestation?.provenance?.sourceRuleIds ||
      [],
    lang: params.lang,
  })
  const timingCalibrationNarrative = describeTimingCalibrationSummary({
    reliabilityBand: params.matrixSummary?.timingCalibration?.reliabilityBand,
    reliabilityScore: params.matrixSummary?.timingCalibration?.reliabilityScore,
    pastStability: params.matrixSummary?.timingCalibration?.pastStability,
    futureStability: params.matrixSummary?.timingCalibration?.futureStability,
    backtestConsistency: params.matrixSummary?.timingCalibration?.backtestConsistency,
    calibratedFromHistory: params.matrixSummary?.timingCalibration?.calibratedFromHistory,
    calibrationSampleSize: params.matrixSummary?.timingCalibration?.calibrationSampleSize,
    calibrationMatchedRate: params.matrixSummary?.timingCalibration?.calibrationMatchedRate,
    lang: params.lang,
  })
  const timelineDomain = mapSignalDomainToTimelineDomain(preferredDomain)
  const intraMonthPeakNarrative = describeIntraMonthPeakWindow({
    domainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    points: timelineDomain
      ? params.matrixSummary?.overlapTimelineByDomain?.[timelineDomain]
      : undefined,
    lang: params.lang,
  })
  const arbitrationNarrative = counselorCore
    ? buildCounselorArbitrationLine({
        focusDomain: preferredDomain,
        actionFocusDomain: counselorCore.actionFocusDomain,
        focusRunnerUpDomain: counselorCore.arbitrationBrief.focusRunnerUpDomain || undefined,
        actionRunnerUpDomain: counselorCore.arbitrationBrief.actionRunnerUpDomain || undefined,
        lang: params.lang,
      })
    : ''
  const latentNarrative = counselorCore?.latentTopAxes?.length
    ? params.lang === 'ko'
      ? `지금 해석을 가장 세게 끄는 축은 ${counselorCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}입니다.`
      : `The strongest latent drivers right now are ${counselorCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}.`
    : ''

  return {
    focusDomain: preferredDomain,
    actionFocusDomain: counselorCore?.actionFocusDomain,
    riskAxisLabel: counselorCore?.riskAxisLabel,
    timingMatrix: (counselorCore?.timingMatrix || []).slice(0, 4).map((item) => ({
      domain: item.domain,
      label: item.label,
      window: item.window,
      granularity: item.granularity,
      confidence: item.confidence,
      summary: sanitizeCounselorFreeText(item.summary, params.lang),
    })),
    verdict: sanitizeCounselorFreeText(verdict, params.lang),
    guardrail: sanitizeCounselorFreeText(counselorCore?.primaryCaution || guardrail, params.lang),
    topAnchorSummary,
    graphRagEvidenceSummary,
    topAnchors: prioritizedAnchors.map((anchor) => ({
      id: anchor.id,
      section: anchor.section,
      summary: summarizeAnchor(anchor),
      setCount: anchor.setCount,
    })),
    topClaims: prioritizedClaims.map((claim) => ({
      id: claim.id,
      text: summarizeClaim(claim),
      domain: claim.domain,
      signalIds: claim.selectedSignalIds.slice(0, 8),
      anchorIds: claim.anchorIds.slice(0, 6),
      provenanceSummary: describeProvenanceSummary({
        sourceFields: counselorCore?.claimProvenanceById?.[claim.id]?.sourceFields || [],
        sourceSetIds: counselorCore?.claimProvenanceById?.[claim.id]?.sourceSetIds || [],
        sourceRuleIds: counselorCore?.claimProvenanceById?.[claim.id]?.sourceRuleIds || [],
        lang: params.lang,
      }),
    })),
    scenarioBriefs: prioritizedScenarioBundles.map((bundle: UnifiedScenarioBundle) => ({
      id: bundle.id,
      domain: bundle.domain,
      mainTokens: (bundle.main.summaryTokens || []).slice(0, 8),
      altTokens: (bundle.alt || []).flatMap((alt) => alt.summaryTokens || []).slice(0, 8),
    })),
    selectedSignals: prioritizedSignals.map((signal) => ({
      id: signal.id,
      domain: signal.domainHints[0] || 'personality',
      polarity: signal.polarity,
      summary: `${signal.keyword}: ${(signal.sajuBasis || signal.astroBasis || signal.advice || '').slice(0, 180)}`,
      score: signal.score,
    })),
    strategyBrief: {
      overallPhase: counselorCore?.phase || params.strategyEngine.overallPhase,
      overallPhaseLabel: counselorCore?.phaseLabel || params.strategyEngine.overallPhaseLabel,
      attackPercent: params.strategyEngine.attackPercent,
      defensePercent: params.strategyEngine.defensePercent,
    },
    canonicalBrief: counselorCore
      ? buildSanitizedCanonicalBrief({
          counselorCore,
          lang: params.lang,
          topDecisionLeadLabel,
          scenarioActionHints,
        })
      : undefined,
    topDomainAdvisory: topDomainAdvisory
      ? {
          domain: topDomainAdvisory.domain,
          thesis: sanitizeCounselorFreeText(topDomainAdvisory.thesis, params.lang),
          action: sanitizeCounselorFreeText(
            [topDomainAdvisory.action, ...scenarioActionHints].filter(Boolean).join(' / '),
            params.lang
          ),
          caution: sanitizeCounselorFreeText(topDomainAdvisory.caution, params.lang),
          timingHint: sanitizeCounselorFreeText(topDomainAdvisory.timingHint, params.lang),
          strategyLine: sanitizeCounselorFreeText(topDomainAdvisory.strategyLine, params.lang),
        }
      : undefined,
    topTimingWindow: topTimingWindow
        ? {
          domain: topTimingWindow.domain,
          window: topTimingWindow.window,
          timingGranularity: topTimingWindow.timingGranularity,
          timingReliabilityBand: params.matrixSummary?.timingCalibration?.reliabilityBand,
          timingReliabilityScore: params.matrixSummary?.timingCalibration?.reliabilityScore,
          readinessScore: topTimingWindow.readinessScore,
          triggerScore: topTimingWindow.triggerScore,
          convergenceScore: topTimingWindow.convergenceScore,
          precisionReason: sanitizeCounselorFreeText(topTimingWindow.precisionReason, params.lang),
          timingConflictMode: topTimingWindow.timingConflictMode,
          timingConflictNarrative: sanitizeCounselorFreeText(
            topTimingWindow.timingConflictNarrative,
            params.lang
          ),
          whyNow: sanitizeCounselorFreeText(topTimingWindow.whyNow, params.lang),
          entryConditions: sanitizeCounselorTextList(
            [...topTimingWindow.entryConditions].slice(0, 3),
            params.lang
          ),
          abortConditions: sanitizeCounselorTextList(
            [...topTimingWindow.abortConditions].slice(0, 3),
            params.lang
          ),
        }
      : undefined,
    topManifestation: topManifestation
      ? {
          domain: topManifestation.domain,
          baselineThesis: sanitizeCounselorFreeText(topManifestation.baselineThesis, params.lang),
          activationThesis: sanitizeCounselorFreeText(
            topManifestation.activationThesis,
            params.lang
          ),
          manifestation: sanitizeCounselorFreeText(topManifestation.manifestation, params.lang),
          likelyExpressions: sanitizeCounselorTextList(
            [...topManifestation.likelyExpressions].slice(0, 3),
            params.lang
          ),
          riskExpressions: sanitizeCounselorTextList(
            [...topManifestation.riskExpressions].slice(0, 3),
            params.lang
          ),
          timingWindow: topManifestation.timingWindow,
        }
      : undefined,
    projections: counselorCore
      ? {
          structure: sanitizeCounselorProjectionBlock(counselorCore.projections.structure, params.lang),
          timing: sanitizeCounselorProjectionBlock(counselorCore.projections.timing, params.lang),
          conflict: sanitizeCounselorProjectionBlock(counselorCore.projections.conflict, params.lang),
          action: sanitizeCounselorProjectionBlock(counselorCore.projections.action, params.lang),
          risk: sanitizeCounselorProjectionBlock(counselorCore.projections.risk, params.lang),
          evidence: sanitizeCounselorProjectionBlock(counselorCore.projections.evidence, params.lang),
          branches: sanitizeCounselorProjectionBlock(counselorCore.projections.branches, params.lang),
        }
      : undefined,
    whyStack: [
      ...whyStack,
      arbitrationNarrative,
      latentNarrative,
      topTimingWindow?.timingConflictNarrative || '',
      timingCalibrationNarrative,
      intraMonthPeakNarrative,
      topTimingWindow?.precisionReason || '',
      conflictNarrative,
      trustNarrative,
      provenanceNarrative,
    ]
      .map((line) => sanitizeCounselorFreeText(line, params.lang))
      .filter(Boolean)
      .slice(0, 6),
  }
}

export function formatCounselorEvidencePacket(
  packet: CounselorEvidencePacketLike | null | undefined,
  lang: 'ko' | 'en'
): string {
  if (!packet || !packet.focusDomain) return ''
  const strategyLabel = packet.strategyBrief?.overallPhaseLabel || 'none'
  const attackPercent = packet.strategyBrief?.attackPercent ?? '-'
  const defensePercent = packet.strategyBrief?.defensePercent ?? '-'

  const canonicalLines = packet.canonicalBrief
    ? [
        '[Canonical Core]',
        `grade=${packet.canonicalBrief.gradeLabel || 'none'}`,
        `core_phase=${packet.canonicalBrief.phaseLabel || 'none'}`,
        `phase=${packet.canonicalBrief.phaseLabel || 'none'}`,
        `action_focus=${packet.canonicalBrief.actionFocusDomain || 'none'}`,
        `focus_runner_up=${packet.canonicalBrief.focusRunnerUpDomain || 'none'}`,
        `action_runner_up=${packet.canonicalBrief.actionRunnerUpDomain || 'none'}`,
        `top_decision=${packet.canonicalBrief.topDecisionLabel || packet.canonicalBrief.topDecisionAction || 'none'}`,
        `core_claim_ids=${(packet.topClaims || []).map((claim) => claim.id).filter(Boolean).slice(0, 6).join(' | ') || 'none'}`,
        `core_caution_signal_ids=${(packet.selectedSignals || []).map((signal) => signal.id).filter(Boolean).slice(0, 6).join(' | ') || 'none'}`,
        `answer=${packet.canonicalBrief.answerThesis || 'none'}`,
        `action=${packet.canonicalBrief.primaryAction || 'none'}`,
        `caution=${packet.canonicalBrief.primaryCaution || 'none'}`,
        `timing=${packet.canonicalBrief.timingHint || 'none'}`,
        `policy_mode=${packet.canonicalBrief.policyMode || 'none'}`,
        `latent_top_axes=${(packet.canonicalBrief.latentTopAxes || []).join(' | ') || 'none'}`,
        '',
      ]
    : []

  const arbitrationLines = packet.canonicalBrief
    ? [
        '[Arbitration]',
        `focus_narrative=${packet.canonicalBrief.focusNarrative || 'none'}`,
        `action_narrative=${packet.canonicalBrief.actionNarrative || 'none'}`,
        `suppression=${(packet.canonicalBrief.suppressionNarratives || []).join(' | ') || 'none'}`,
        '',
      ]
    : []

  const advisoryLines = packet.topDomainAdvisory
    ? [
        '[Domain Advisory]',
        `thesis=${packet.topDomainAdvisory.thesis}`,
        `action=${packet.topDomainAdvisory.action}`,
        `caution=${packet.topDomainAdvisory.caution}`,
        '',
      ]
    : []

  const timingLines = packet.topTimingWindow
    ? [
        '[Timing Window]',
        `domain=${packet.topTimingWindow.domain}`,
        `window=${packet.topTimingWindow.window}`,
        `granularity=${packet.topTimingWindow.timingGranularity || 'unknown'}`,
        `reliability=${packet.topTimingWindow.timingReliabilityBand || 'unknown'}${typeof packet.topTimingWindow.timingReliabilityScore === 'number' ? `:${Math.round(packet.topTimingWindow.timingReliabilityScore * 100)}` : ''}`,
        `scores=readiness:${typeof packet.topTimingWindow.readinessScore === 'number' ? packet.topTimingWindow.readinessScore.toFixed(2) : 'n/a'}|trigger:${typeof packet.topTimingWindow.triggerScore === 'number' ? packet.topTimingWindow.triggerScore.toFixed(2) : 'n/a'}|convergence:${typeof packet.topTimingWindow.convergenceScore === 'number' ? packet.topTimingWindow.convergenceScore.toFixed(2) : 'n/a'}`,
        `precision=${packet.topTimingWindow.precisionReason || 'none'}`,
        `conflict_mode=${packet.topTimingWindow.timingConflictMode || 'none'}`,
        `conflict=${packet.topTimingWindow.timingConflictNarrative || 'none'}`,
        '',
      ]
    : []

  const timingMatrixLines =
    (packet.timingMatrix || []).length > 0
      ? [
          '[Timing Matrix]',
          ...(packet.timingMatrix || [])
            .slice(0, 4)
            .map(
              (row) =>
                `matrix=${row.label}:${row.window}/${row.granularity}:${Math.round(row.confidence * 100)}|${row.summary}`
            ),
          '',
        ]
      : []

  const projectionLines = packet.projections
    ? [
        '[Projections]',
        packet.projections.action?.summary ? `action=${packet.projections.action.summary}` : '',
        ...(packet.projections.action?.detailLines || [])
          .slice(0, 2)
          .map((line) => `action_detail=${line}`),
        ...(packet.projections.action?.drivers || [])
          .slice(0, 2)
          .map((line) => `action_driver=${line}`),
        ...(packet.projections.action?.nextMoves || [])
          .slice(0, 2)
          .map((line) => `action_next=${line}`),
        ...(packet.projections.action?.reasons || [])
          .slice(0, 2)
          .map((line) => `action_reason=${line}`),
        packet.projections.timing?.summary ? `timing=${packet.projections.timing.summary}` : '',
        ...(packet.projections.timing?.detailLines || [])
          .slice(0, 2)
          .map((line) => `timing_detail=${line}`),
        ...(packet.projections.timing?.drivers || [])
          .slice(0, 2)
          .map((line) => `timing_driver=${line}`),
        ...(packet.projections.timing?.counterweights || [])
          .slice(0, 2)
          .map((line) => `timing_counterweight=${line}`),
        ...(packet.projections.timing?.nextMoves || [])
          .slice(0, 2)
          .map((line) => `timing_next=${line}`),
        ...(packet.projections.timing?.reasons || [])
          .slice(0, 2)
          .map((line) => `timing_reason=${line}`),
        packet.projections.risk?.summary ? `risk=${packet.projections.risk.summary}` : '',
        ...(packet.projections.risk?.detailLines || [])
          .slice(0, 2)
          .map((line) => `risk_detail=${line}`),
        ...(packet.projections.risk?.counterweights || [])
          .slice(0, 2)
          .map((line) => `risk_counterweight=${line}`),
        ...(packet.projections.risk?.nextMoves || [])
          .slice(0, 2)
          .map((line) => `risk_next=${line}`),
        ...(packet.projections.risk?.reasons || [])
          .slice(0, 2)
          .map((line) => `risk_reason=${line}`),
        packet.projections.conflict?.summary
          ? `conflict=${packet.projections.conflict.summary}`
          : '',
        ...(packet.projections.conflict?.detailLines || [])
          .slice(0, 2)
          .map((line) => `conflict_detail=${line}`),
        ...(packet.projections.conflict?.counterweights || [])
          .slice(0, 2)
          .map((line) => `conflict_counterweight=${line}`),
        ...(packet.projections.conflict?.reasons || [])
          .slice(0, 2)
          .map((line) => `conflict_reason=${line}`),
        packet.projections.structure?.summary
          ? `structure=${packet.projections.structure.summary}`
          : '',
        ...(packet.projections.structure?.detailLines || [])
          .slice(0, 2)
          .map((line) => `structure_detail=${line}`),
        ...(packet.projections.structure?.drivers || [])
          .slice(0, 2)
          .map((line) => `structure_driver=${line}`),
        ...(packet.projections.structure?.reasons || [])
          .slice(0, 2)
          .map((line) => `structure_reason=${line}`),
        packet.projections.evidence?.summary
          ? `evidence=${packet.projections.evidence.summary}`
          : '',
        ...(packet.projections.evidence?.detailLines || [])
          .slice(0, 2)
          .map((line) => `evidence_detail=${line}`),
        ...(packet.projections.evidence?.drivers || [])
          .slice(0, 2)
          .map((line) => `evidence_driver=${line}`),
        ...(packet.projections.evidence?.reasons || [])
          .slice(0, 2)
          .map((line) => `evidence_reason=${line}`),
        packet.projections.branches?.summary
          ? `branches=${packet.projections.branches.summary}`
          : '',
        ...(packet.projections.branches?.detailLines || [])
          .slice(0, 3)
          .map((line) => `branch_detail=${line}`),
        ...(packet.projections.branches?.drivers || [])
          .slice(0, 3)
          .map((line) => `branch_driver=${line}`),
        ...(packet.projections.branches?.counterweights || [])
          .slice(0, 2)
          .map((line) => `branch_counterweight=${line}`),
        ...(packet.projections.branches?.nextMoves || [])
          .slice(0, 2)
          .map((line) => `branch_next=${line}`),
        ...(packet.projections.branches?.reasons || [])
          .slice(0, 2)
          .map((line) => `branch_reason=${line}`),
        '',
      ].filter(Boolean)
    : []

  const whyLines = (packet.whyStack || []).slice(0, 1).map((line) => `- ${line}`)
  const actionLines = packet.canonicalBrief
    ? [
        '[Action and Guardrails]',
        `primary_action=${packet.canonicalBrief.primaryAction || 'none'}`,
        `primary_caution=${packet.canonicalBrief.primaryCaution || 'none'}`,
        `soft_checks=${(packet.canonicalBrief.softChecks || []).slice(0, 3).join(' | ') || 'none'}`,
        `hard_stops=${(packet.canonicalBrief.hardStops || []).slice(0, 2).join(' | ') || 'none'}`,
        '',
      ]
    : []

  const commonLines = [
    '[Counselor Evidence Packet v3 - Slim]',
    `focus_domain=${packet.focusDomain}`,
    `risk_axis=${packet.riskAxisLabel || 'none'}`,
    `graph_anchors=${packet.graphRagEvidenceSummary?.totalAnchors ?? 0}`,
    `graph_sets=${packet.graphRagEvidenceSummary?.totalSets ?? 0}`,
    `strategy=${strategyLabel}(${attackPercent}/${defensePercent})`,
    '',
    ...canonicalLines,
    ...arbitrationLines,
    ...timingLines,
    ...timingMatrixLines,
    ...projectionLines,
    ...actionLines,
    '[Why Stack]',
    ...(whyLines.length > 0 ? whyLines : ['- none']),
    '',
  ]

  if (lang === 'ko') {
    return [
      ...commonLines,
      '[Response Contract]',
      '- 첫 문단에서 질문에 직접 답하고, 현재 국면을 단정형 문장으로 바로 정리할 것.',
      '- 둘째 문단에서는 구조와 타이밍을 함께 풀고, readiness/trigger/convergence 차이가 있으면 왜 그런지 직접 설명할 것.',
      '- 셋째 문단에서는 충돌과 행동을 같이 다루고, 지금 해야 할 행동과 미뤄야 할 행동을 분리할 것.',
      '- 가능하면 하나의 정답처럼 말하지 말고, branch_detail과 branch_next를 바탕으로 현실 경로 2~3개를 짧게 구분할 것.',
      '- 마지막 문단에서는 리스크와 재확인 체크리스트를 제시하고, caution 신호가 있으면 irreversible 행동(서명, 확정, 발송, 결제)을 바로 밀지 말 것.',
      '- projection summary는 fallback으로만 쓰고, detail/driver/counterweight/next와 reason을 우선 사용할 것.',
    ].join('\n')
  }

  return [
    ...commonLines,
    '[Response Contract]',
    '- Open with a direct answer and a declarative read of the current phase.',
    '- In the second paragraph, explain structure and timing together, and explicitly name any readiness/trigger/convergence mismatch.',
    '- In the third paragraph, translate conflict into action: what to do now, what to delay, and why.',
    '- When possible, do not present a single fixed destiny; use branch_detail and branch_next to distinguish 2-3 realistic paths.',
    '- End with risk and a recheck checklist; if caution signals exist, do not push irreversible actions (sign/finalize/send/pay) immediately.',
    '- Prefer projection summaries and projection reasons first, and attach at least one grounding item to every paragraph.',
  ].join('\n')
}
