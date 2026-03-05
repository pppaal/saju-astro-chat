import type { FusionReport } from '../interpreter/types'
import type { MatrixSummary } from '../types'
import type {
  ReportPeriod,
  TimingData,
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedParaEvidenceRef,
  UnifiedReportMeta,
  UnifiedReportScope,
  UnifiedScores,
  UnifiedScenarioBundle,
  UnifiedSelectedSignal,
  UnifiedTimelineEvent,
  UnifiedTimeWindow,
} from './types'
import type { SignalSynthesisResult } from './signalSynthesizer'
import type { SectionEvidenceRefs } from './evidenceRefs'
import type { GraphRAGEvidenceBundle } from './graphRagEvidence'

const UNIFIED_REPORT_SCHEMA_VERSION = '1.1'
const UNIFIED_REPORT_ENGINE_VERSION = 'destiny-matrix-ai-report-v2'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeConfidence(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.5
  if (value >= 0 && value <= 1) return round2(clamp(value, 0, 1))
  if (value > 1 && value <= 100) return round2(clamp(value / 100, 0, 1))
  return 0.5
}

function normalizeScore100(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  if (value >= 0 && value <= 10) return Math.round(clamp(value * 10, 0, 100))
  return Math.round(clamp(value, 0, 100))
}

function parseIsoDateParts(date: string): { year: number; month: number; day: number } | null {
  if (!date) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

function mapPeriodToScope(period: ReportPeriod): UnifiedReportScope {
  if (period === 'daily') return 'DAY'
  if (period === 'monthly') return 'MONTH'
  if (period === 'yearly') return 'YEAR'
  return 'LIFE'
}

function buildUnifiedTimeWindow(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  period?: ReportPeriod
  targetDate?: string
}): UnifiedTimeWindow {
  if (params.mode === 'timing' && params.period) {
    const scope = mapPeriodToScope(params.period)
    const targetDate = params.targetDate || new Date().toISOString().slice(0, 10)
    const parts = parseIsoDateParts(targetDate)
    if (scope === 'DAY') {
      return { scope, start: targetDate, end: targetDate, date: targetDate }
    }
    if (scope === 'MONTH') {
      if (parts) {
        const start = `${parts.year}-${String(parts.month).padStart(2, '0')}-01`
        return { scope, start, end: null, year: parts.year, month: parts.month }
      }
      return { scope, start: null, end: null }
    }
    if (scope === 'YEAR') {
      if (parts) {
        return {
          scope,
          start: `${parts.year}-01-01`,
          end: `${parts.year}-12-31`,
          year: parts.year,
        }
      }
      return { scope, start: null, end: null }
    }
    return { scope: 'LIFE', start: null, end: null }
  }
  return { scope: 'LIFE', start: null, end: null }
}

function buildUnifiedAnchorsFromGraph(
  graphRagEvidence: GraphRAGEvidenceBundle | undefined
): UnifiedAnchor[] {
  return (graphRagEvidence?.anchors || []).map((anchor) => {
    const sets = anchor.crossEvidenceSets || []
    const setCount = sets.length
    const avgOverlapScore =
      setCount > 0
        ? round2(sets.reduce((sum, set) => sum + (set.overlapScore || 0), 0) / setCount)
        : 0
    const avgOrbFitScore =
      setCount > 0
        ? round2(sets.reduce((sum, set) => sum + (set.orbFitScore || 0), 0) / setCount)
        : 0
    return {
      id: anchor.id,
      section: anchor.section,
      crossEvidenceSummary: `${anchor.sajuEvidence} | ${anchor.astrologyEvidence} | ${anchor.crossConclusion}`,
      setCount,
      avgOverlapScore,
      avgOrbFitScore,
    }
  })
}

function buildUnifiedSelectedSignalsFromSynthesis(
  synthesis?: SignalSynthesisResult
): UnifiedSelectedSignal[] {
  return (synthesis?.selectedSignals || []).map((signal) => ({
    id: signal.id,
    layer: `L${signal.layer}`,
    domain: signal.domainHints?.[0] || 'unknown',
    polarity: signal.polarity || 'unknown',
    summary: signal.keyword || `${signal.rowKey}:${signal.colKey}`,
    score: normalizeScore100(signal.score),
  }))
}

function claimSectionHints(domain: string): string[] {
  if (domain === 'career') return ['careerPath', 'actionPlan', 'timingAdvice']
  if (domain === 'relationship') return ['relationshipDynamics', 'actionPlan', 'timingAdvice']
  if (domain === 'wealth') return ['wealthPotential', 'careerPath', 'timingAdvice']
  if (domain === 'health') return ['healthGuidance', 'timingAdvice', 'actionPlan']
  if (domain === 'move') return ['timingAdvice', 'actionPlan']
  if (domain === 'timing') return ['timingAdvice', 'actionPlan']
  if (domain === 'spirituality') return ['lifeMission', 'conclusion']
  return ['introduction', 'personalityDeep']
}

function buildUnifiedClaimsFromSynthesis(
  synthesis: SignalSynthesisResult | undefined,
  anchors: UnifiedAnchor[]
): UnifiedClaim[] {
  const anchorsBySection = new Map<string, string[]>()
  for (const anchor of anchors) {
    const list = anchorsBySection.get(anchor.section) || []
    list.push(anchor.id)
    anchorsBySection.set(anchor.section, list)
  }
  return (synthesis?.claims || []).map((claim) => {
    const sectionHints = claimSectionHints(claim.domain)
    const anchorIds = sectionHints
      .flatMap((section) => anchorsBySection.get(section) || [])
      .slice(0, 4)
    return {
      id: claim.claimId,
      text: claim.thesis,
      selectedSignalIds: [...(claim.evidence || [])],
      anchorIds,
      domain: claim.domain,
    }
  })
}

function buildUnifiedScoresFromData(params: {
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
}): UnifiedScores {
  const fallbackOverall = normalizeScore100(params.matrixReport.overallScore?.total || 0)
  const overall = normalizeScore100(params.matrixSummary?.finalScoreAdjusted ?? fallbackOverall)
  const overallConfidence = normalizeConfidence(params.matrixSummary?.confidenceScore ?? 0.92)

  const fromSummary = params.matrixSummary?.domainScores
  const domainFromSummary = (key: 'career' | 'love' | 'money' | 'health' | 'move') => {
    const row = fromSummary?.[key]
    if (!row) return null
    return {
      score: normalizeScore100(row.finalScoreAdjusted),
      confidence: normalizeConfidence(row.confidenceScore),
    }
  }

  const byDomainAnalysis = new Map<string, { score: number; confidence: number }>(
    (params.matrixReport.domainAnalysis || []).map((item) => [
      item.domain,
      { score: normalizeScore100(item.score), confidence: 0.7 },
    ])
  )

  const pick = (
    key: 'career' | 'relationship' | 'wealth' | 'health' | 'move',
    summaryKey: 'career' | 'love' | 'money' | 'health' | 'move'
  ) => {
    const fromS = domainFromSummary(summaryKey)
    if (fromS) return fromS
    return byDomainAnalysis.get(key) || { score: overall, confidence: overallConfidence }
  }

  return {
    overall: { score: overall, confidence: overallConfidence },
    domains: {
      career: pick('career', 'career'),
      relationship: pick('relationship', 'love'),
      wealth: pick('wealth', 'money'),
      health: pick('health', 'health'),
      move: pick('move', 'move'),
    },
  }
}

function claimTypeFromDomain(domain?: string): UnifiedTimelineEvent['type'] {
  if (domain === 'career') return 'job'
  if (domain === 'relationship') return 'relationship'
  if (domain === 'wealth') return 'money'
  if (domain === 'health') return 'health'
  if (domain === 'move') return 'relocation'
  if (domain === 'timing') return 'timing'
  return 'life'
}

function claimToScenarioDomain(domain?: string): UnifiedScenarioBundle['domain'] | null {
  if (domain === 'career') return 'career'
  if (domain === 'relationship') return 'relationship'
  if (domain === 'wealth') return 'wealth'
  if (domain === 'health') return 'health'
  if (domain === 'move') return 'move'
  if (domain === 'timing') return 'timing'
  if (domain === 'personality' || domain === 'spirituality') return 'personality'
  return null
}

export function inferAgeFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const m = now.getMonth() - parsed.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1
  return Number.isFinite(age) && age >= 0 ? age : null
}

function buildUnifiedTimelineEventsFromClaims(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  lang: 'ko' | 'en'
  claims: UnifiedClaim[]
  graphRagEvidence: GraphRAGEvidenceBundle | undefined
  timingData?: TimingData
  scope: UnifiedReportScope
  birthDate?: string
}): UnifiedTimelineEvent[] {
  const events: UnifiedTimelineEvent[] = []
  const year = params.timingData?.seun?.year
  const month = params.timingData?.wolun?.month
  for (const claim of params.claims.slice(0, 8)) {
    events.push({
      id: `EVT_${events.length + 1}`,
      type: claimTypeFromDomain(claim.domain),
      timeHint: {
        year,
        month,
        confidence: 0.62,
      },
      thesis:
        params.lang === 'ko'
          ? `${claim.text} 해당 구간은 착수와 확정을 분리하고 재확인 단계를 포함할수록 결과 안정성이 올라갑니다.`
          : `${claim.text} This window is more stable when start and finalization are separated with one recheck step.`,
      evidenceRefs: [
        ...(claim.selectedSignalIds || []).slice(0, 3),
        ...(claim.anchorIds || []).slice(0, 2),
      ],
    })
  }

  for (const anchor of params.graphRagEvidence?.anchors || []) {
    events.push({
      id: `EVT_ANCHOR_${events.length + 1}`,
      type: 'timing',
      timeHint: { year, month, confidence: 0.58 },
      thesis:
        params.lang === 'ko'
          ? `${anchor.section} 근거 묶음에서 사주-점성 교차 신호가 확인되어, 해당 의사결정은 검증 단계를 먼저 거치면 리스크를 줄일 수 있습니다.`
          : `Cross evidence in ${anchor.section} indicates lower variance when a verification step is applied before commitment.`,
      evidenceRefs: [anchor.id],
    })
    if (events.length >= 12) break
  }

  if (params.scope === 'LIFE') {
    const age = inferAgeFromBirthDate(params.birthDate)
    const stages = ['0-19', '20-34', '35-49', '50-64', '65-84']
    for (const stage of stages) {
      events.push({
        id: `EVT_STAGE_${stage.replace('-', '_')}`,
        type: 'life',
        timeHint: { ageRange: stage, confidence: 0.55 },
        thesis:
          params.lang === 'ko'
            ? `${stage}세 구간은 핵심 기준을 단순화하고 반복 가능한 루틴을 고정할수록 성과 변동폭이 줄어드는 흐름입니다.${age ? ` 현재 나이 기준(약 ${age}세)과 연결해 우선순위를 정리하세요.` : ''}`
            : `Stage ${stage} rewards simpler decision rules and repeatable routines for lower variance.`,
        evidenceRefs: params.claims.flatMap((claim) => claim.selectedSignalIds).slice(0, 3),
      })
    }
  }
  return events.slice(0, params.scope === 'LIFE' ? 20 : 10)
}

function buildUnifiedScenarioBundles(params: {
  claims: UnifiedClaim[]
  timelineEvents: UnifiedTimelineEvent[]
}): UnifiedScenarioBundle[] {
  const bundles = new Map<UnifiedScenarioBundle['domain'], UnifiedScenarioBundle>()
  for (const claim of params.claims) {
    const domain = claimToScenarioDomain(claim.domain)
    if (!domain || bundles.has(domain)) continue
    bundles.set(domain, {
      id: `SCB_${domain.toUpperCase()}_01`,
      domain,
      main: {
        eventIds: [],
        summaryTokens: [claim.text].filter(Boolean).slice(0, 2),
      },
      alt: [],
      selectionWhy: {
        claimIds: [claim.id],
        signalIds: [...claim.selectedSignalIds.slice(0, 4)],
        anchorIds: [...claim.anchorIds.slice(0, 3)],
      },
    })
  }

  const allEvents = [...params.timelineEvents]
  for (const bundle of bundles.values()) {
    const domainEvents = allEvents.filter((event) => {
      const eventDomain = claimToScenarioDomain(
        event.type === 'job'
          ? 'career'
          : event.type === 'relationship' || event.type === 'marriage'
            ? 'relationship'
            : event.type === 'money'
              ? 'wealth'
              : event.type === 'health'
                ? 'health'
                : event.type === 'relocation'
                  ? 'move'
                  : event.type === 'timing'
                    ? 'timing'
                    : 'personality'
      )
      return eventDomain === bundle.domain
    })
    if (domainEvents[0]) {
      bundle.main.eventIds = [domainEvents[0].id]
      bundle.main.summaryTokens = [domainEvents[0].thesis.slice(0, 64)]
    }
    const altCandidates = domainEvents
      .slice(1)
      .concat(allEvents.filter((event) => !bundle.main.eventIds.includes(event.id)))
    for (const candidate of altCandidates) {
      if (bundle.alt.length >= 2) break
      bundle.alt.push({
        eventIds: [candidate.id],
        summaryTokens: [candidate.thesis.slice(0, 64)],
      })
    }
    while (bundle.alt.length < 2 && allEvents.length > 0) {
      const fallback = allEvents[bundle.alt.length % allEvents.length]
      bundle.alt.push({
        eventIds: [fallback.id],
        summaryTokens: [fallback.thesis.slice(0, 64)],
      })
    }
  }
  return [...bundles.values()]
}

function buildEvidenceRefsByPara(params: {
  sectionPaths: string[]
  evidenceRefs: SectionEvidenceRefs
  claims: UnifiedClaim[]
}): Record<string, UnifiedParaEvidenceRef> {
  const out: Record<string, UnifiedParaEvidenceRef> = {}
  for (const path of params.sectionPaths) {
    const refs = params.evidenceRefs[path] || []
    const signalIds = refs
      .map((ref) => ref.id)
      .filter(Boolean)
      .slice(0, 6)
    const claimIds = params.claims
      .filter((claim) => claim.selectedSignalIds.some((id) => signalIds.includes(id)))
      .map((claim) => claim.id)
      .slice(0, 4)
    const anchorIds = params.claims
      .filter((claim) => claimIds.includes(claim.id))
      .flatMap((claim) => claim.anchorIds || [])
      .slice(0, 3)
    out[`${path}.p1`] = { claimIds, signalIds, anchorIds }
  }
  return out
}

export function buildUnifiedEnvelope(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  lang: 'ko' | 'en'
  generatedAt: string
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  signalSynthesis?: SignalSynthesisResult
  graphRagEvidence: GraphRAGEvidenceBundle | undefined
  period?: ReportPeriod
  targetDate?: string
  timingData?: TimingData
  birthDate?: string
  sectionPaths: string[]
  evidenceRefs: SectionEvidenceRefs
}): {
  reportMeta: UnifiedReportMeta
  timeWindow: UnifiedTimeWindow
  scores: UnifiedScores
  claims: UnifiedClaim[]
  selectedSignals: UnifiedSelectedSignal[]
  anchors: UnifiedAnchor[]
  timelineEvents: UnifiedTimelineEvent[]
  scenarioBundles: UnifiedScenarioBundle[]
  evidenceRefsByPara: Record<string, UnifiedParaEvidenceRef>
} {
  const reportMeta: UnifiedReportMeta = {
    schemaVersion: UNIFIED_REPORT_SCHEMA_VERSION,
    generatedAt: params.generatedAt,
    engineVersion: UNIFIED_REPORT_ENGINE_VERSION,
  }
  const timeWindow = buildUnifiedTimeWindow({
    mode: params.mode,
    period: params.period,
    targetDate: params.targetDate,
  })
  const anchors = buildUnifiedAnchorsFromGraph(params.graphRagEvidence)
  const selectedSignals = buildUnifiedSelectedSignalsFromSynthesis(params.signalSynthesis)
  const claims = buildUnifiedClaimsFromSynthesis(params.signalSynthesis, anchors)
  const scores = buildUnifiedScoresFromData({
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
  })
  const timelineEvents = buildUnifiedTimelineEventsFromClaims({
    mode: params.mode,
    lang: params.lang,
    claims,
    graphRagEvidence: params.graphRagEvidence,
    timingData: params.timingData,
    scope: timeWindow.scope,
    birthDate: params.birthDate,
  })
  const scenarioBundles = buildUnifiedScenarioBundles({ claims, timelineEvents })
  const evidenceRefsByPara = buildEvidenceRefsByPara({
    sectionPaths: params.sectionPaths,
    evidenceRefs: params.evidenceRefs,
    claims,
  })
  return {
    reportMeta,
    timeWindow,
    scores,
    claims,
    selectedSignals,
    anchors,
    timelineEvents,
    scenarioBundles,
    evidenceRefsByPara,
  }
}

