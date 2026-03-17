import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type {
  ReportPeriod,
  TimingData,
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedEvidenceLink,
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
import type { GraphRAGEvidenceBundle, GraphRAGCrossEvidenceSet } from './graphRagEvidence'
import type { DeterministicSectionBlock } from './deterministicCore'

const UNIFIED_REPORT_SCHEMA_VERSION = '1.1'
const UNIFIED_REPORT_ENGINE_VERSION = 'destiny-matrix-ai-report-v2'
const PARAGRAPH_COUNT_PER_SECTION = 3

interface MappingCountryFit {
  country: string
  fitScore: number
  tradeOff: string
}

interface MappingIncomeBand {
  label: string
  conditionsUpper: string
  risksLower: string
  confidence: number
}

interface MappingRulebook {
  partnerArchetype: {
    primaryTraits: string[]
    supportTraits: string[]
    vibe: string[]
    style: string[]
    meetChannels: string[]
    recognitionClues: string[]
  }
  careerClusters: {
    roleArchetypes: string[]
    industryClusters: string[]
  }
  countryFit: MappingCountryFit[]
  incomeBands: MappingIncomeBand[]
}

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

function blendDisplayDomainScore(params: {
  overall: number
  summaryScore?: number | null
  analysisScore?: number | null
  signalScore?: number | null
}): number {
  const sourceScores = [params.summaryScore, params.analysisScore, params.signalScore].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )
  if (sourceScores.length === 0) return params.overall

  const summaryWeight = typeof params.summaryScore === 'number' ? 0.35 : 0
  const analysisWeight = typeof params.analysisScore === 'number' ? 0.2 : 0
  const signalWeight = typeof params.signalScore === 'number' ? 0.25 : 0
  const overallWeight = Math.max(0.2, 1 - summaryWeight - analysisWeight - signalWeight)
  const blended = Math.round(
    params.overall * overallWeight +
      (params.summaryScore || 0) * summaryWeight +
      (params.analysisScore || 0) * analysisWeight +
      (params.signalScore || 0) * signalWeight
  )
  let upperBound = params.overall + 22
  if (typeof params.analysisScore === 'number' && Number.isFinite(params.analysisScore)) {
    upperBound = Math.min(upperBound, params.analysisScore + 14)
  }
  if (typeof params.signalScore === 'number' && Number.isFinite(params.signalScore)) {
    upperBound = Math.max(upperBound, Math.min(96, params.signalScore + 10))
  }
  return Math.round(clamp(blended, Math.max(24, params.overall - 18), Math.min(96, upperBound)))
}

function blendDisplayDomainConfidence(params: {
  overallConfidence: number
  displayScore: number
  overallScore: number
  summaryConfidence?: number | null
  hasAnalysisScore: boolean
  hasSignalScore: boolean
}): number {
  const sourceConfidence =
    typeof params.summaryConfidence === 'number' && Number.isFinite(params.summaryConfidence)
      ? params.summaryConfidence
      : params.hasAnalysisScore
        ? 0.72
        : params.hasSignalScore
          ? 0.76
        : params.overallConfidence
  const gapPenalty = Math.max(0, params.displayScore - params.overallScore - 12) * 0.008
  return round2(
    clamp(sourceConfidence * 0.75 + params.overallConfidence * 0.25 - gapPenalty, 0.45, 0.92)
  )
}

function parseIsoDateParts(date: string): { year: number; month: number; day: number } | null {
  if (!date) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function pickTopStrings(values: Array<string | undefined>, limit: number): string[] {
  return unique(
    values.map((value) => (value || '').trim()).filter((value) => value.length > 0)
  ).slice(0, limit)
}

function extractMustKeepTokens(...sources: Array<string | undefined>): string[] {
  const years = sources
    .flatMap((source) => (source || '').match(/\b20\d{2}\b/g) || [])
    .map((year) => year.trim())
  const words = sources
    .flatMap((source) => (source || '').split(/[^\p{L}\p{N}]+/gu))
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter(
      (token) =>
        !['그리고', '하지만', 'the', 'and', 'with', 'this', 'that', 'signal', 'signals'].includes(
          token.toLowerCase()
        )
    )
  return unique([...years, ...words]).slice(0, 10)
}

function sectionToDomain(sectionPath: string): string {
  if (sectionPath.includes('career')) return 'career'
  if (sectionPath.includes('relationship') || sectionPath.includes('love')) return 'relationship'
  if (sectionPath.includes('wealth') || sectionPath.includes('money')) return 'wealth'
  if (sectionPath.includes('health')) return 'health'
  if (
    sectionPath.includes('timing') ||
    sectionPath.includes('opportun') ||
    sectionPath.includes('caution')
  ) {
    return 'timing'
  }
  if (sectionPath.includes('move') || sectionPath.includes('relocat')) return 'move'
  return 'personality'
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

function normalizeTrustScore(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  if (value <= 1) return round2(clamp(value, 0, 1))
  if (value <= 100) return round2(clamp(value / 100, 0, 1))
  return 0
}

function tokenizeForLink(...sources: Array<string | undefined>): string[] {
  return unique(
    sources
      .flatMap((source) =>
        String(source || '')
          .toLowerCase()
          .split(/[^\p{L}\p{N}_:+-]+/u)
      )
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .filter((token) => !/^\d+$/.test(token))
  )
}

function scoreSetLink(params: {
  signalDomains: string[]
  signalTokens: string[]
  set: GraphRAGCrossEvidenceSet
  sectionMatch: boolean
}): {
  linkScore: number
  overlapScore: number
  orbFitScore: number
  tokenHitRatio: number
} {
  const setDomains = (params.set.overlapDomains || []).map((domain) => String(domain).toLowerCase())
  const overlapCount = params.signalDomains.filter((domain) => setDomains.includes(domain)).length
  const domainScore =
    params.signalDomains.length > 0 ? overlapCount / Math.max(1, params.signalDomains.length) : 0

  const haystack = String(
    `${params.set.matrixEvidence} ${params.set.astrologyEvidence} ${params.set.sajuEvidence} ${params.set.combinedConclusion}`
  ).toLowerCase()
  const tokenHitCount = params.signalTokens
    .filter((token) => token.length >= 3)
    .filter((token) => haystack.includes(token)).length
  const tokenHitRatio =
    params.signalTokens.length > 0
      ? Math.min(1, tokenHitCount / Math.max(1, params.signalTokens.length))
      : 0

  const overlapScore = normalizeTrustScore(params.set.overlapScore)
  const orbFitScore = normalizeTrustScore(params.set.orbFitScore)
  const sectionBoost = params.sectionMatch ? 0.1 : 0
  const linkScore = clamp(
    domainScore * 0.35 +
      tokenHitRatio * 0.25 +
      overlapScore * 0.2 +
      orbFitScore * 0.2 +
      sectionBoost,
    0,
    1
  )
  return {
    linkScore: round2(linkScore),
    overlapScore,
    orbFitScore,
    tokenHitRatio: round2(tokenHitRatio),
  }
}

function buildUnifiedEvidenceLinks(params: {
  synthesis: SignalSynthesisResult | undefined
  claims: UnifiedClaim[]
  graphRagEvidence: GraphRAGEvidenceBundle | undefined
}): UnifiedEvidenceLink[] {
  const anchors = params.graphRagEvidence?.anchors || []
  if (!params.synthesis || anchors.length === 0) return []

  const signalById = params.synthesis.signalsById || {}
  const merged = new Map<string, Omit<UnifiedEvidenceLink, 'id'>>()

  for (const claim of params.claims) {
    const sectionHints = claimSectionHints(claim.domain || 'personality')
    for (const signalId of claim.selectedSignalIds || []) {
      const signal = signalById[signalId]
      if (!signal) continue

      const signalDomains = unique(
        (
          (signal.domainHints || []).map((domain) => String(domain).toLowerCase()) as string[]
        ).concat(claim.domain ? [String(claim.domain).toLowerCase()] : [])
      )
      const signalTokens = tokenizeForLink(
        signal.id,
        signal.rowKey,
        signal.colKey,
        signal.keyword,
        signal.sajuBasis,
        signal.astroBasis,
        ...(signal.tags || [])
      )

      let best:
        | {
            anchorId: string
            section: string
            setIds: string[]
            linkScore: number
            overlapScore: number
            orbFitScore: number
            reason: string
          }
        | undefined

      for (const anchor of anchors) {
        const sectionMatch = sectionHints.includes(anchor.section)
        const setCandidates = (anchor.crossEvidenceSets || [])
          .map((set) => {
            const scored = scoreSetLink({ signalDomains, signalTokens, set, sectionMatch })
            return { set, ...scored }
          })
          .sort((a, b) => b.linkScore - a.linkScore)

        const pickedSetIds = setCandidates
          .filter((candidate) => candidate.linkScore >= 0.2)
          .slice(0, 2)
          .map((candidate) => candidate.set.id)
        const topCandidate = setCandidates[0]
        const linkScore = topCandidate?.linkScore ?? (sectionMatch ? 0.22 : 0.12)
        const overlapScore = topCandidate?.overlapScore ?? 0
        const orbFitScore = topCandidate?.orbFitScore ?? 0
        const reason = sectionMatch
          ? `section-match:${anchor.section}`
          : pickedSetIds.length > 0
            ? `set-match:${pickedSetIds.join(',')}`
            : 'low-evidence-fallback'

        if (!best || linkScore > best.linkScore) {
          best = {
            anchorId: anchor.id,
            section: anchor.section,
            setIds:
              pickedSetIds.length > 0 ? pickedSetIds : topCandidate ? [topCandidate.set.id] : [],
            linkScore,
            overlapScore,
            orbFitScore,
            reason,
          }
        }
      }

      if (!best) continue
      const key = `${signalId}::${best.anchorId}`
      const existing = merged.get(key)
      if (existing) {
        existing.claimIds = unique([...(existing.claimIds || []), claim.id])
        existing.setIds = unique([...(existing.setIds || []), ...(best.setIds || [])])
        existing.linkScore = Math.max(existing.linkScore, best.linkScore)
        existing.overlapScore = Math.max(existing.overlapScore, best.overlapScore)
        existing.orbFitScore = Math.max(existing.orbFitScore, best.orbFitScore)
        if (existing.reason.length < best.reason.length) existing.reason = best.reason
        continue
      }

      merged.set(key, {
        signalId,
        claimIds: [claim.id],
        anchorId: best.anchorId,
        section: best.section,
        setIds: best.setIds,
        domain: claim.domain || signal.domainHints?.[0] || 'personality',
        linkScore: round2(best.linkScore),
        overlapScore: round2(best.overlapScore),
        orbFitScore: round2(best.orbFitScore),
        reason: best.reason,
      })
    }
  }

  const links = [...merged.values()].sort((a, b) => b.linkScore - a.linkScore)
  for (const claim of params.claims) {
    const hasClaimLink = links.some((link) => (link.claimIds || []).includes(claim.id))
    if (hasClaimLink) continue
    const signalId = claim.selectedSignalIds?.[0]
    const anchor =
      anchors.find((item) =>
        claimSectionHints(claim.domain || 'personality').includes(item.section)
      ) || anchors[0]
    if (!signalId || !anchor) continue
    links.push({
      signalId,
      claimIds: [claim.id],
      anchorId: anchor.id,
      section: anchor.section,
      setIds: (anchor.crossEvidenceSets || []).slice(0, 1).map((set) => set.id),
      domain: claim.domain || 'personality',
      linkScore: 0.2,
      overlapScore: 0,
      orbFitScore: 0,
      reason: 'claim-coverage-fallback',
    })
  }

  return links
    .map((link, index) => ({
      id: `LINK_${index + 1}`,
      ...link,
      claimIds: unique(link.claimIds || []),
      setIds: unique(link.setIds || []),
      linkScore: round2(link.linkScore),
      overlapScore: round2(link.overlapScore),
      orbFitScore: round2(link.orbFitScore),
    }))
    .sort((a, b) => b.linkScore - a.linkScore)
}

function buildUnifiedScoresFromData(params: {
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  signalSynthesis?: SignalSynthesisResult
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
  const signalBuckets = new Map<string, number[]>()
  for (const signal of params.signalSynthesis?.selectedSignals || []) {
    const domain = String(signal.domainHints?.[0] || '').toLowerCase()
    if (!domain) continue
    const score = normalizeScore100(signal.score)
    const bucket = signalBuckets.get(domain) || []
    bucket.push(score)
    signalBuckets.set(domain, bucket)
  }
  const bySignal = new Map<string, { score: number; confidence: number }>(
    [...signalBuckets.entries()].map(([domain, values]) => [
      domain,
      {
        score: Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)),
        confidence: 0.76,
      },
    ])
  )

  const pick = (
    key: 'career' | 'relationship' | 'wealth' | 'health' | 'move',
    summaryKey: 'career' | 'love' | 'money' | 'health' | 'move'
  ) => {
    const fromS = domainFromSummary(summaryKey)
    const fromAnalysis = byDomainAnalysis.get(key) || null
    const fromSignal = bySignal.get(key) || null
    const displayScore = blendDisplayDomainScore({
      overall,
      summaryScore: fromS?.score,
      analysisScore: fromAnalysis?.score,
      signalScore: fromSignal?.score,
    })
    return {
      score: displayScore,
      confidence: blendDisplayDomainConfidence({
        overallConfidence,
        displayScore,
        overallScore: overall,
        summaryConfidence: fromS?.confidence,
        hasAnalysisScore: Boolean(fromAnalysis),
        hasSignalScore: Boolean(fromSignal),
      }),
    }
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

function buildMappingRulebook(params: {
  lang: 'ko' | 'en'
  claims: UnifiedClaim[]
  selectedSignals: UnifiedSelectedSignal[]
  scores: UnifiedScores
  matrixInput?: MatrixCalculationInput
}): MappingRulebook {
  const relationshipSignals = params.selectedSignals.filter(
    (signal) => signal.domain === 'relationship'
  )
  const careerSignals = params.selectedSignals.filter((signal) => signal.domain === 'career')
  const wealthSignals = params.selectedSignals.filter((signal) => signal.domain === 'wealth')

  const relationshipKeywords = pickTopStrings(
    relationshipSignals.map((signal) => signal.summary),
    6
  )
  const careerKeywords = pickTopStrings(
    careerSignals.map((signal) => signal.summary),
    8
  )
  const wealthKeywords = pickTopStrings(
    wealthSignals.map((signal) => signal.summary),
    6
  )

  const partnerArchetype = {
    primaryTraits:
      relationshipKeywords.slice(0, 2).length > 0
        ? relationshipKeywords.slice(0, 2)
        : params.lang === 'ko'
          ? ['신중한 소통', '책임감 있는 합의']
          : ['measured communication', 'responsible commitment'],
    supportTraits:
      relationshipKeywords.slice(2, 5).length > 0
        ? relationshipKeywords.slice(2, 5)
        : params.lang === 'ko'
          ? ['감정 정리', '경계 존중', '현실 조율']
          : ['emotional regulation', 'boundary respect', 'practical alignment'],
    vibe:
      params.lang === 'ko'
        ? ['차분한 집중감', '실무형 안정감', '약속을 지키는 분위기']
        : ['calm focus', 'practical stability', 'reliable promise-keeping'],
    style:
      params.lang === 'ko'
        ? ['단정한 기본형', '기능성 우선', '과장 없는 취향']
        : ['clean basics', 'function-first', 'low-noise style'],
    meetChannels:
      params.lang === 'ko'
        ? ['프로젝트 협업', '지인 소개', '커리어 관련 커뮤니티']
        : ['project collaboration', 'trusted introductions', 'career communities'],
    recognitionClues:
      params.lang === 'ko'
        ? ['약속 시간을 엄수함', '대화 후 요약을 남김', '결정 전에 조건을 확인함']
        : [
            'punctual around commitments',
            'leaves concise summaries after talks',
            'checks terms before decisions',
          ],
  }

  const roleArchetypes =
    careerKeywords.slice(0, 3).length > 0
      ? careerKeywords.slice(0, 3)
      : params.lang === 'ko'
        ? ['전략-실행 하이브리드', '리스크 관리형 리더', '협업 조율형 운영자']
        : ['strategy-execution hybrid', 'risk-managed leader', 'coordination operator']

  const industryClusters =
    pickTopStrings(
      [
        ...careerKeywords,
        ...(params.lang === 'ko'
          ? ['데이터/분석', '제품/서비스 운영', '금융/자산 관리', '교육/컨설팅', '글로벌 프로젝트']
          : [
              'data/analytics',
              'product/service operations',
              'finance/asset management',
              'education/consulting',
              'global projects',
            ]),
      ],
      5
    ) || []

  const baseCountryRules = [
    {
      country: params.lang === 'ko' ? '싱가포르' : 'Singapore',
      score: 72,
      tradeOff:
        params.lang === 'ko'
          ? '속도는 빠르지만 문서 규율을 강하게 요구합니다.'
          : 'Fast cycle, but demands strict documentation discipline.',
    },
    {
      country: params.lang === 'ko' ? '미국' : 'United States',
      score: 70,
      tradeOff:
        params.lang === 'ko'
          ? '기회 폭이 크지만 경쟁 강도가 높습니다.'
          : 'Wide opportunity range, with high competition intensity.',
    },
    {
      country: params.lang === 'ko' ? '캐나다' : 'Canada',
      score: 68,
      tradeOff:
        params.lang === 'ko'
          ? '안정성이 높지만 의사결정 속도는 느릴 수 있습니다.'
          : 'Higher stability, with slower decision velocity.',
    },
    {
      country: params.lang === 'ko' ? '독일' : 'Germany',
      score: 67,
      tradeOff:
        params.lang === 'ko'
          ? '품질 기준은 높지만 초기 적응 비용이 큽니다.'
          : 'High quality standards with larger onboarding cost.',
    },
  ]

  const wealthBoost = Math.round((params.scores.domains.wealth?.score || 0) * 0.08)
  const careerBoost = Math.round((params.scores.domains.career?.score || 0) * 0.06)
  const dominantElementToken = String(
    params.matrixInput?.dominantWesternElement || ''
  ).toLowerCase()
  const countryFit = baseCountryRules
    .map((rule, index) => {
      const matrixBias =
        dominantElementToken.includes('fire') || params.matrixInput?.dayMasterElement === '화'
          ? index === 0
            ? 4
            : 0
          : params.matrixInput?.dayMasterElement === '수'
            ? index === 2
              ? 3
              : 0
            : 0
      return {
        country: rule.country,
        fitScore: clamp(rule.score + wealthBoost + careerBoost + matrixBias, 50, 96),
        tradeOff: rule.tradeOff,
      } satisfies MappingCountryFit
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3)

  const wealthScore = params.scores.domains.wealth?.score || params.scores.overall.score
  const overallConf = params.scores.overall.confidence
  const incomeBands: MappingIncomeBand[] =
    wealthScore >= 80
      ? [
          {
            label: params.lang === 'ko' ? '상단 성장 밴드' : 'upper growth band',
            conditionsUpper:
              params.lang === 'ko'
                ? '협상력 강화 + 고가치 역할 집중 시 상단으로 이동합니다.'
                : 'Moves upward when negotiation power and high-value role focus are secured.',
            risksLower:
              params.lang === 'ko'
                ? '확정 속도가 과하면 조건 누락으로 하단 되돌림이 발생합니다.'
                : 'Over-speed finalization can pull results back to the lower band.',
            confidence: round2(clamp(overallConf + 0.05, 0.35, 0.95)),
          },
          {
            label: params.lang === 'ko' ? '안정 운영 밴드' : 'stable operating band',
            conditionsUpper:
              params.lang === 'ko'
                ? '현금흐름 루틴 유지 시 변동폭이 줄어듭니다.'
                : 'Variance compresses with disciplined cash-flow routines.',
            risksLower:
              params.lang === 'ko'
                ? '단기 욕심이 커지면 회복 구간이 길어질 수 있습니다.'
                : 'Short-term overreach may lengthen recovery windows.',
            confidence: round2(clamp(overallConf, 0.3, 0.9)),
          },
        ]
      : [
          {
            label: params.lang === 'ko' ? '기반 구축 밴드' : 'foundation-building band',
            conditionsUpper:
              params.lang === 'ko'
                ? '지출 규율과 학습 투자 병행 시 점진 상승합니다.'
                : 'Gradual upside appears when spending discipline and skill investment are paired.',
            risksLower:
              params.lang === 'ko'
                ? '검증 없는 확정은 손실 확대 구간으로 연결됩니다.'
                : 'Unverified commitments can expand downside.',
            confidence: round2(clamp(overallConf, 0.28, 0.88)),
          },
          {
            label: params.lang === 'ko' ? '보수 방어 밴드' : 'conservative defense band',
            conditionsUpper:
              params.lang === 'ko'
                ? '현금 쿠션 확보 시 변동성 충격을 줄일 수 있습니다.'
                : 'Cash cushion reduces volatility shocks.',
            risksLower:
              params.lang === 'ko'
                ? '대외 약속 과다가 누적되면 하방이 커집니다.'
                : 'Over-committing external promises increases downside risk.',
            confidence: round2(clamp(overallConf - 0.04, 0.2, 0.85)),
          },
        ]

  return {
    partnerArchetype,
    careerClusters: {
      roleArchetypes,
      industryClusters:
        industryClusters.length > 0
          ? industryClusters
          : params.lang === 'ko'
            ? ['데이터/분석', '운영/기획', '리스크 관리']
            : ['data/analytics', 'operations/planning', 'risk management'],
    },
    countryFit,
    incomeBands,
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
  if (params.scope === 'LIFE') {
    const age = inferAgeFromBirthDate(params.birthDate)
    const stages = ['0-19', '20-34', '35-49', '50-64', '65-84']
    for (const stage of stages) {
      events.push({
        id: `EVT_STAGE_${stage.replace('-', '_')}`,
        type: 'life',
        timeHint: { ageRange: stage, confidence: 0.64 },
        thesis:
          params.lang === 'ko'
            ? `${stage}세 구간은 핵심 기준을 단순화하고 반복 루틴을 고정할수록 성과 변동폭이 줄어드는 흐름입니다.${age ? ` 현재 나이(약 ${age}세) 기준으로 우선순위를 정렬하세요.` : ''}`
            : `Stage ${stage} rewards simpler decision rules and repeatable routines for lower variance.${age ? ` Current age context (${age}) can refine priorities.` : ''}`,
        evidenceRefs: params.claims.flatMap((claim) => claim.selectedSignalIds).slice(0, 3),
      })
    }

    const turningAgeRanges = ['20-24', '25-29', '30-34', '35-39', '40-44', '45-54', '55-64']
    for (const [index, claim] of params.claims.slice(0, 7).entries()) {
      const ageRange = turningAgeRanges[index] || '65-74'
      events.push({
        id: `EVT_TURN_${index + 1}`,
        type: claimTypeFromDomain(claim.domain),
        timeHint: {
          ageRange,
          year,
          confidence: 0.61,
        },
        thesis:
          params.lang === 'ko'
            ? `${claim.text} 변곡점 구간에서는 결정을 단계화하고 확정 전에 조건 검증을 거치면 누적 성과가 커집니다.`
            : `${claim.text} In turning-point windows, staged decisions with pre-commit verification improve cumulative outcomes.`,
        evidenceRefs: [
          ...(claim.selectedSignalIds || []).slice(0, 3),
          ...(claim.anchorIds || []).slice(0, 2),
        ],
      })
    }

    for (const anchor of params.graphRagEvidence?.anchors || []) {
      events.push({
        id: `EVT_LIFE_SUPPORT_${events.length + 1}`,
        type: 'timing',
        timeHint: { year, month, confidence: 0.52 },
        thesis:
          params.lang === 'ko'
            ? `${anchor.section} 교차 근거는 월간 실행에서 검증 단계를 넣으면 오차를 줄일 수 있음을 보여줍니다.`
            : `Cross evidence in ${anchor.section} suggests monthly execution is safer with explicit verification gates.`,
        evidenceRefs: [anchor.id],
      })
      if (events.length >= 20) break
    }
    return events.slice(0, 20)
  }

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

  return events.slice(0, 10)
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
    const allSignalIds = refs
      .map((ref) => ref.id)
      .filter(Boolean)
      .slice(0, 6)
    const perParagraph =
      allSignalIds.length > 0
        ? Math.max(1, Math.ceil(allSignalIds.length / PARAGRAPH_COUNT_PER_SECTION))
        : 1
    for (let index = 0; index < PARAGRAPH_COUNT_PER_SECTION; index += 1) {
      const paraSignalIds =
        allSignalIds.slice(index * perParagraph, (index + 1) * perParagraph).length > 0
          ? allSignalIds.slice(index * perParagraph, (index + 1) * perParagraph)
          : allSignalIds.slice(0, perParagraph)
      const claimIds = params.claims
        .filter((claim) => claim.selectedSignalIds.some((id) => paraSignalIds.includes(id)))
        .map((claim) => claim.id)
        .slice(0, 4)
      const anchorIds = params.claims
        .filter((claim) => claimIds.includes(claim.id))
        .flatMap((claim) => claim.anchorIds || [])
        .slice(0, 3)
      out[`${path}.p${index + 1}`] = { claimIds, signalIds: paraSignalIds, anchorIds }
    }
  }
  return out
}

function sectionHeading(lang: 'ko' | 'en', sectionPath: string, index: number): string {
  const key = sectionPath.split('.').join('_')
  const koMap: Record<string, [string, string, string]> = {
    introduction: ['# 인생 총운 한 줄 로그라인', '## 전체 점수/신뢰 요약', '## 승부처와 실행 레버'],
    personalityDeep: ['# 성향 엔진(강점)', '# 그림자 패턴(리스크)', '# 회복 루틴과 의사결정 기준'],
    careerPath: [
      '# 커리어 엔진(역할 아키타입)',
      '# 직군·국가 적합도 근거',
      '# 시나리오와 90일 실행',
    ],
    relationshipDynamics: [
      '# 배우자 아키타입(누구)',
      '# 만남 채널·알아볼 단서',
      '# 관계 타임라인과 방어전략',
    ],
    wealthPotential: ['# 머니 스타일', '# 수입 밴드·점프 이벤트 근거', '# 누수 차단과 리스크 룰'],
    healthGuidance: ['# 취약 패턴', '# 경고 신호', '# 최소 루틴'],
    lifeMission: ['# 미션 한 줄', '# 결정 기준 3', '# 확장/축소 포인트'],
    timingAdvice: ['# 인생 챕터 흐름', '## 변곡점 Top7 근거', '## 실행 타이밍 전략'],
    actionPlan: ['# 2주 실행 3단계', '# 체크리스트', '# KPI와 트리거 프로토콜'],
    conclusion: ['# 승리 조건', '# 피해야 할 조건', '# 마지막 메시지'],
    overview: ['# 기간 총평', '## 근거 요약', '## 실행 전략'],
    energy: ['# 에너지 흐름', '## 근거 요약', '## 실행 전략'],
    opportunities: ['# 기회 포인트', '## 근거 요약', '## 실행 전략'],
    cautions: ['# 주의 포인트', '## 근거 요약', '## 실행 전략'],
    actionPlan_timing: ['# 실행 플랜', '## 근거 요약', '## 실행 전략'],
  }
  const enMap: Record<string, [string, string, string]> = {
    introduction: ['# Life Logline', '## Score and Trust Summary', '## Levers and Execution'],
    personalityDeep: ['# Personality Engine', '# Shadow Patterns', '# Recovery and Decision Rules'],
    careerPath: [
      '# Career Engine',
      '# Industry/Country Fit Evidence',
      '# Scenarios and 90-Day Plan',
    ],
    relationshipDynamics: [
      '# Partner Archetype',
      '# Meeting Channels and Recognition Clues',
      '# Timeline and Defense Strategy',
    ],
    wealthPotential: [
      '# Money Style',
      '# Income Bands and Jump Events',
      '# Leakage Control and Risk Rule',
    ],
    healthGuidance: ['# Vulnerability Patterns', '# Early Warnings', '# Minimum Routine'],
    lifeMission: ['# Mission Statement', '# Three Decision Criteria', '# Expand vs Reduce'],
    timingAdvice: ['# Life Chapter Flow', '## Top Turning Points Evidence', '## Timing Strategy'],
    actionPlan: ['# Two-Week Plan', '# Checklist', '# KPI and Trigger Protocol'],
    conclusion: ['# Winning Conditions', '# Conditions to Avoid', '# Closing Message'],
    overview: ['# Period Overview', '## Evidence Snapshot', '## Action Strategy'],
    energy: ['# Energy Flow', '## Evidence Snapshot', '## Action Strategy'],
    opportunities: ['# Opportunity Windows', '## Evidence Snapshot', '## Action Strategy'],
    cautions: ['# Caution Windows', '## Evidence Snapshot', '## Action Strategy'],
    actionPlan_timing: ['# Action Plan', '## Evidence Snapshot', '## Action Strategy'],
  }
  const mapKey =
    sectionPath === 'actionPlan' && key.includes('timing') ? 'actionPlan_timing' : sectionPath
  const indexSafe = Math.max(1, Math.min(3, index)) - 1
  if (lang === 'ko') {
    const headings = koMap[mapKey] || [
      `## ${key} 핵심 결론`,
      `## ${key} 근거 요약`,
      `## ${key} 실행 전략`,
    ]
    return headings[indexSafe]
  }
  const headings = enMap[mapKey] || [
    `## ${key} Core Thesis`,
    `## ${key} Evidence Snapshot`,
    `## ${key} Action Strategy`,
  ]
  return headings[indexSafe]
}

function formatTimeHintLabel(lang: 'ko' | 'en', hint?: UnifiedTimelineEvent['timeHint']): string {
  if (!hint) return lang === 'ko' ? '시기 미정' : 'timing pending'
  if (hint.ageRange) return lang === 'ko' ? `${hint.ageRange}세` : `age ${hint.ageRange}`
  if (hint.date) return hint.date
  if (hint.year && hint.month) return `${hint.year}-${String(hint.month).padStart(2, '0')}`
  if (hint.year) return `${hint.year}`
  if (hint.month) return lang === 'ko' ? `${hint.month}월` : `M${hint.month}`
  return lang === 'ko' ? '시기 미정' : 'timing pending'
}

function formatTimelineEventLine(lang: 'ko' | 'en', event: UnifiedTimelineEvent): string {
  const label = formatTimeHintLabel(lang, event.timeHint)
  const confidence =
    typeof event.timeHint?.confidence === 'number'
      ? Math.round(clamp(event.timeHint.confidence, 0, 1) * 100)
      : null
  if (lang === 'ko') {
    return confidence !== null
      ? `${label} (${confidence}%): ${event.thesis}`
      : `${label}: ${event.thesis}`
  }
  return confidence !== null
    ? `${label} (${confidence}%): ${event.thesis}`
    : `${label}: ${event.thesis}`
}

function formatScenarioLines(params: {
  lang: 'ko' | 'en'
  bundle?: UnifiedScenarioBundle
  eventsById: Map<string, UnifiedTimelineEvent>
}): string[] {
  const { lang, bundle, eventsById } = params
  if (!bundle) {
    return [
      lang === 'ko'
        ? '메인/대안 시나리오는 핵심 이벤트 기준으로 업데이트됩니다.'
        : 'Main/alternative scenarios will be updated from core events.',
    ]
  }
  const toLines = (ids: string[]) =>
    ids
      .map((id) => eventsById.get(id))
      .filter(Boolean)
      .map((event) => formatTimelineEventLine(lang, event as UnifiedTimelineEvent))
      .slice(0, 2)
  const mainLines = toLines(bundle.main.eventIds || [])
  const altLines = (bundle.alt || [])
    .slice(0, 2)
    .flatMap((option) => toLines(option.eventIds || []))
  const out: string[] = []
  if (mainLines.length > 0) out.push(`Main: ${mainLines.join(' / ')}`)
  if (altLines.length > 0) out.push(`Alt: ${altLines.join(' / ')}`)
  if (out.length === 0) {
    out.push(
      lang === 'ko'
        ? '시나리오 근거가 부족하여 기본 안전 전략을 유지합니다.'
        : 'Scenario evidence is limited; keep base safety strategy.'
    )
  }
  return out
}

function formatCountryFitLine(lang: 'ko' | 'en', item: MappingCountryFit): string {
  return lang === 'ko'
    ? `${item.country} 적합도 ${item.fitScore}: ${item.tradeOff}`
    : `${item.country} fit ${item.fitScore}: ${item.tradeOff}`
}

function formatIncomeBandLine(lang: 'ko' | 'en', item: MappingIncomeBand): string {
  const confidence = Math.round(clamp(item.confidence, 0, 1) * 100)
  return lang === 'ko'
    ? `${item.label} (${confidence}%): 상단조건=${item.conditionsUpper} / 하단리스크=${item.risksLower}`
    : `${item.label} (${confidence}%): upper=${item.conditionsUpper} / lower-risk=${item.risksLower}`
}

function buildBlocksBySection(params: {
  lang: 'ko' | 'en'
  sectionPaths: string[]
  claims: UnifiedClaim[]
  selectedSignals: UnifiedSelectedSignal[]
  timelineEvents: UnifiedTimelineEvent[]
  scenarioBundles: UnifiedScenarioBundle[]
  mappingRulebook: MappingRulebook
  scores: UnifiedScores
  matrixInput?: MatrixCalculationInput
  timeWindow: UnifiedTimeWindow
  evidenceRefsByPara: Record<string, UnifiedParaEvidenceRef>
}): Record<string, DeterministicSectionBlock[]> {
  const blocksBySection: Record<string, DeterministicSectionBlock[]> = {}
  const eventsById = new Map(params.timelineEvents.map((event) => [event.id, event]))

  for (const sectionPath of params.sectionPaths) {
    const sectionKey = sectionPath.split('.').pop() || sectionPath
    const domain = sectionToDomain(sectionPath)
    const claim = params.claims.find((item) => (item.domain || 'personality') === domain)
    const relevantEvents = params.timelineEvents
      .filter((event) =>
        domain === 'personality'
          ? event.type === 'life'
          : claimTypeFromDomain(domain) === event.type
      )
      .slice(0, 6)
    const bundle = params.scenarioBundles.find((item) => item.domain === domain)

    const para1 = params.evidenceRefsByPara[`${sectionPath}.p1`] || {
      claimIds: claim ? [claim.id] : [],
      signalIds: claim?.selectedSignalIds.slice(0, 2) || [],
      anchorIds: claim?.anchorIds.slice(0, 2) || [],
    }
    const para2 = params.evidenceRefsByPara[`${sectionPath}.p2`] || para1
    const para3 = params.evidenceRefsByPara[`${sectionPath}.p3`] || para2

    const signalSummaries = params.selectedSignals
      .filter((signal) => [...para1.signalIds, ...para2.signalIds].includes(signal.id))
      .map((signal) => signal.summary)
      .slice(0, 4)

    const eventLines = relevantEvents.map((event) => event.thesis).slice(0, 3)
    const scenarioHint = bundle
      ? [
          ...(bundle.main.summaryTokens || []),
          ...(bundle.alt || []).flatMap((option) => option.summaryTokens || []),
        ]
      : []

    const scenarioLines = formatScenarioLines({ lang: params.lang, bundle, eventsById })
    const countryLines = params.mappingRulebook.countryFit
      .slice(0, 3)
      .map((item) => formatCountryFitLine(params.lang, item))
    const incomeBandLines = params.mappingRulebook.incomeBands
      .slice(0, 3)
      .map((item) => formatIncomeBandLine(params.lang, item))

    const topLifeEvents = params.timelineEvents
      .filter((event) => event.type === 'life')
      .slice(0, 3)
      .map((event) => formatTimelineEventLine(params.lang, event))

    const turningEvents = params.timelineEvents
      .filter((event) => event.id.startsWith('EVT_TURN_'))
      .slice(0, 3)
      .map((event) => formatTimelineEventLine(params.lang, event))

    const topDomainScores = Object.entries(params.scores.domains || {})
      .sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0))
      .slice(0, 3)
      .map(([name, score]) =>
        params.lang === 'ko'
          ? `${name} ${score.score}점(${Math.round((score.confidence || 0) * 100)}%)`
          : `${name} ${score.score} (${Math.round((score.confidence || 0) * 100)}%)`
      )

    const mappingTokens = [
      params.mappingRulebook.countryFit[0]?.country,
      params.mappingRulebook.careerClusters.roleArchetypes[0],
      params.mappingRulebook.partnerArchetype.primaryTraits[0],
      params.mappingRulebook.incomeBands[0]?.label,
      String(params.scores.overall.score),
      `${Math.round((params.scores.overall.confidence || 0) * 100)}%`,
    ]

    const primaryTraitLine =
      params.lang === 'ko'
        ? `핵심 성향: ${params.mappingRulebook.partnerArchetype.primaryTraits.join(', ')} / 보조: ${params.mappingRulebook.partnerArchetype.supportTraits.join(', ')}`
        : `Primary traits: ${params.mappingRulebook.partnerArchetype.primaryTraits.join(', ')} / support: ${params.mappingRulebook.partnerArchetype.supportTraits.join(', ')}`

    const partnerVibeLine =
      params.lang === 'ko'
        ? `분위기/스타일: ${params.mappingRulebook.partnerArchetype.vibe.slice(0, 3).join(', ')} / ${params.mappingRulebook.partnerArchetype.style.slice(0, 3).join(', ')}`
        : `Vibe/style: ${params.mappingRulebook.partnerArchetype.vibe.slice(0, 3).join(', ')} / ${params.mappingRulebook.partnerArchetype.style.slice(0, 3).join(', ')}`

    const partnerChannelLine =
      params.lang === 'ko'
        ? `만남 채널 Top3: ${params.mappingRulebook.partnerArchetype.meetChannels.slice(0, 3).join(', ')}`
        : `Top channels: ${params.mappingRulebook.partnerArchetype.meetChannels.slice(0, 3).join(', ')}`

    const partnerClueLine =
      params.lang === 'ko'
        ? `알아볼 단서: ${params.mappingRulebook.partnerArchetype.recognitionClues.slice(0, 3).join(', ')}`
        : `Recognition clues: ${params.mappingRulebook.partnerArchetype.recognitionClues.slice(0, 3).join(', ')}`

    const roleLine =
      params.lang === 'ko'
        ? `역할 아키타입: ${params.mappingRulebook.careerClusters.roleArchetypes.slice(0, 3).join(', ')}`
        : `Role archetypes: ${params.mappingRulebook.careerClusters.roleArchetypes.slice(0, 3).join(', ')}`

    const industryLine =
      params.lang === 'ko'
        ? `직군/산업 Top5: ${params.mappingRulebook.careerClusters.industryClusters.slice(0, 5).join(', ')}`
        : `Industry clusters Top5: ${params.mappingRulebook.careerClusters.industryClusters.slice(0, 5).join(', ')}`

    let block1Bullets: string[] = []
    let block2Bullets: string[] = []
    let block3Bullets: string[] = []

    if (sectionKey === 'introduction') {
      block1Bullets = [
        params.lang === 'ko'
          ? `총점 ${params.scores.overall.score}점, 신뢰 ${Math.round((params.scores.overall.confidence || 0) * 100)}% 기준으로 해석을 시작합니다.`
          : `Start with score ${params.scores.overall.score} and confidence ${Math.round((params.scores.overall.confidence || 0) * 100)}%.`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = [
        params.lang === 'ko'
          ? `상위 도메인: ${topDomainScores.join(' / ')}`
          : `Top domains: ${topDomainScores.join(' / ')}`,
        ...signalSummaries.map((summary) =>
          params.lang === 'ko'
            ? `${summary} 신호가 우선순위를 압축합니다.`
            : `${summary} signal compresses priorities.`
        ),
      ]
      block3Bullets = [
        ...scenarioLines,
        ...(turningEvents.length > 0
          ? [
              params.lang === 'ko'
                ? `변곡점 Top: ${turningEvents.join(' / ')}`
                : `Top turning points: ${turningEvents.join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'personalityDeep') {
      block1Bullets = [
        params.lang === 'ko'
          ? `기본 기질은 일간 ${params.matrixInput?.dayMasterElement || '-'} + 서양 원소 ${params.matrixInput?.dominantWesternElement || '-'} 결합으로 해석합니다.`
          : `Core temperament is read from day master ${params.matrixInput?.dayMasterElement || '-'} + dominant element ${params.matrixInput?.dominantWesternElement || '-'}.`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = signalSummaries.length
        ? signalSummaries.map((summary) =>
            params.lang === 'ko'
              ? `${summary} 패턴이 판단 속도와 검증 강도를 함께 결정합니다.`
              : `${summary} pattern co-determines speed and verification depth.`
          )
        : [
            params.lang === 'ko'
              ? '성향 신호 밀도가 낮아 기본 루틴 중심으로 해석합니다.'
              : 'Personality signal density is low; routine-first mode is used.',
          ]
      block3Bullets = [
        params.lang === 'ko'
          ? '실행 기준: 결론 1줄 + 근거 1줄 + 재확인 1회.'
          : 'Execution rule: one-line conclusion + one-line evidence + one recheck.',
        ...(topLifeEvents.length > 0
          ? [
              params.lang === 'ko'
                ? `생애 흐름: ${topLifeEvents.join(' / ')}`
                : `Life-stage flow: ${topLifeEvents.join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'careerPath') {
      block1Bullets = [roleLine, industryLine, ...(claim?.text ? [claim.text] : [])]
      block2Bullets =
        countryLines.length > 0
          ? countryLines
          : [
              params.lang === 'ko'
                ? '국가 적합도 데이터가 부족해 역할-직군 우선 전략으로 대체합니다.'
                : 'Country-fit data is limited; role/cluster-first strategy is used.',
            ]
      block3Bullets = [
        ...scenarioLines,
        ...(relevantEvents.slice(0, 3).length > 0
          ? [
              params.lang === 'ko'
                ? `커리어 이벤트: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`
                : `Career events: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'relationshipDynamics') {
      block1Bullets = [primaryTraitLine, partnerVibeLine, ...(claim?.text ? [claim.text] : [])]
      block2Bullets = [partnerChannelLine, partnerClueLine]
      block3Bullets = [
        ...scenarioLines,
        ...(relevantEvents.slice(0, 3).length > 0
          ? [
              params.lang === 'ko'
                ? `관계 타임라인: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`
                : `Relationship timeline: ${relevantEvents
                    .slice(0, 3)
                    .map((event) => formatTimelineEventLine(params.lang, event))
                    .join(' / ')}`,
            ]
          : []),
      ]
    } else if (sectionKey === 'wealthPotential') {
      block1Bullets = [
        ...(claim?.text ? [claim.text] : []),
        ...(incomeBandLines.length > 0
          ? [
              params.lang === 'ko'
                ? `수입 밴드: ${incomeBandLines.join(' / ')}`
                : `Income bands: ${incomeBandLines.join(' / ')}`,
            ]
          : []),
      ]
      block2Bullets = signalSummaries.length
        ? signalSummaries.map((summary) =>
            params.lang === 'ko'
              ? `${summary} 근거를 기준으로 상단/하단 조건을 분리합니다.`
              : `Use ${summary} evidence to split upside/downside conditions.`
          )
        : [
            params.lang === 'ko'
              ? '재정 신호 밀도가 낮아 보수적 방어 밴드를 우선 적용합니다.'
              : 'Wealth signal density is low; defense band is prioritized.',
          ]
      block3Bullets = [...scenarioLines]
    } else if (sectionKey === 'timingAdvice') {
      block1Bullets = [
        params.lang === 'ko'
          ? `리포트 스코프: ${params.timeWindow.scope} (${params.timeWindow.start || '-'} ~ ${params.timeWindow.end || '-'})`
          : `Report scope: ${params.timeWindow.scope} (${params.timeWindow.start || '-'} ~ ${params.timeWindow.end || '-'})`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets =
        topLifeEvents.length > 0
          ? [
              params.lang === 'ko'
                ? `생애 챕터 요약: ${topLifeEvents.join(' / ')}`
                : `Life chapter summary: ${topLifeEvents.join(' / ')}`,
            ]
          : [
              params.lang === 'ko'
                ? '생애 챕터 데이터가 부족해 현재 타임라인 중심으로 해석합니다.'
                : 'Life chapter data is limited; use current timeline events.',
            ]
      block3Bullets = turningEvents.length
        ? [
            params.lang === 'ko'
              ? `변곡점 Top: ${turningEvents.join(' / ')}`
              : `Top turning points: ${turningEvents.join(' / ')}`,
            ...scenarioLines,
          ]
        : [...scenarioLines]
    } else if (sectionKey === 'actionPlan') {
      block1Bullets = [
        params.lang === 'ko'
          ? '2주 실행 3단계: 완료 1건 고정 -> 재확인 1건 -> 보류/확정 분리.'
          : 'Two-week loop: one completion -> one recheck -> split defer/commit.',
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = [
        params.lang === 'ko'
          ? `실행 우선순위: ${topDomainScores.join(' / ')}`
          : `Execution priority: ${topDomainScores.join(' / ')}`,
      ]
      block3Bullets = [
        ...scenarioLines,
        params.lang === 'ko'
          ? 'KPI: 완료율, 재확인 누락률, 일정 지연률을 함께 추적합니다.'
          : 'KPI: completion rate, recheck miss rate, and schedule delay rate.',
      ]
    } else if (sectionKey === 'lifeMission') {
      block1Bullets = [
        ...(claim?.text ? [claim.text] : []),
        params.lang === 'ko'
          ? '장기 미션은 단기 성과보다 반복 가능한 선택 기준을 남기는 데 있습니다.'
          : 'The long mission is to leave repeatable decision criteria, not one-off wins.',
      ]
      block2Bullets = signalSummaries.length
        ? signalSummaries.map((summary) =>
            params.lang === 'ko'
              ? `${summary} 신호가 확장/축소 기준을 만듭니다.`
              : `${summary} signal sets expand/reduce criteria.`
          )
        : [
            params.lang === 'ko'
              ? '핵심 신호가 부족해 건강/관계/커리어 균형 기준을 우선합니다.'
              : 'With limited signals, prioritize health/relationship/career balance.',
          ]
      block3Bullets = [...scenarioLines]
    } else if (sectionKey === 'conclusion') {
      block1Bullets = [
        params.lang === 'ko'
          ? `최종 결론: 총점 ${params.scores.overall.score}점, 신뢰 ${Math.round((params.scores.overall.confidence || 0) * 100)}%`
          : `Final view: score ${params.scores.overall.score}, confidence ${Math.round((params.scores.overall.confidence || 0) * 100)}%`,
        ...(claim?.text ? [claim.text] : []),
      ]
      block2Bullets = [
        params.lang === 'ko'
          ? `핵심 유지축: ${topDomainScores.join(' / ')}`
          : `Core axes to keep: ${topDomainScores.join(' / ')}`,
      ]
      block3Bullets = [...scenarioLines]
    } else {
      block1Bullets = [
        claim?.text ||
          (params.lang === 'ko'
            ? '핵심 신호를 기준으로 우선순위를 고정하세요.'
            : 'Lock priorities first using core signals.'),
      ]
      block2Bullets =
        signalSummaries.length > 0
          ? signalSummaries.map((summary) =>
              params.lang === 'ko'
                ? `${summary} 신호를 근거로 판단 강도를 조절합니다.`
                : `Calibrate decision intensity with ${summary} as evidence.`
            )
          : [
              params.lang === 'ko'
                ? '근거 신호 밀도를 먼저 확인하고 결론 강도를 맞추세요.'
                : 'Check evidence density first, then set conclusion strength.',
            ]
      block3Bullets = [...eventLines, ...scenarioHint]
        .slice(0, 3)
        .map((line) =>
          params.lang === 'ko'
            ? `${line} 실행 시 재확인 후 확정 순서를 유지하세요.`
            : `${line} Keep verify-then-commit ordering during execution.`
        )
      if (block3Bullets.length === 0) {
        block3Bullets = [
          params.lang === 'ko'
            ? '실행은 착수-재확인-확정의 3단계로 나누어 변동성을 줄입니다.'
            : 'Split execution into start-recheck-commit to reduce variance.',
        ]
      }
    }

    const blocks: DeterministicSectionBlock[] = [
      {
        blockId: `${sectionPath}.B1`,
        paraId: `${sectionPath}.p1`,
        heading: sectionHeading(params.lang, sectionPath, 1),
        bullets: block1Bullets.filter(Boolean),
        mustKeepTokens: extractMustKeepTokens(claim?.text, ...block1Bullets, ...mappingTokens),
        evidence: para1,
      },
      {
        blockId: `${sectionPath}.B2`,
        paraId: `${sectionPath}.p2`,
        heading: sectionHeading(params.lang, sectionPath, 2),
        bullets: block2Bullets.filter(Boolean),
        mustKeepTokens: extractMustKeepTokens(...signalSummaries, ...block2Bullets, claim?.text),
        evidence: para2,
      },
      {
        blockId: `${sectionPath}.B3`,
        paraId: `${sectionPath}.p3`,
        heading: sectionHeading(params.lang, sectionPath, 3),
        bullets: block3Bullets.filter(Boolean),
        mustKeepTokens: extractMustKeepTokens(
          ...eventLines,
          ...scenarioHint,
          ...block3Bullets,
          ...mappingTokens
        ),
        evidence: para3,
      },
    ]

    blocksBySection[sectionPath] = blocks
  }

  return blocksBySection
}

export function buildUnifiedEnvelope(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  lang: 'ko' | 'en'
  generatedAt: string
  matrixInput?: MatrixCalculationInput
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
  evidenceLinks: UnifiedEvidenceLink[]
  timelineEvents: UnifiedTimelineEvent[]
  scenarioBundles: UnifiedScenarioBundle[]
  evidenceRefsByPara: Record<string, UnifiedParaEvidenceRef>
  mappingRulebook: MappingRulebook
  blocksBySection: Record<string, DeterministicSectionBlock[]>
  timelinePriority: 'life_first' | 'default'
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
  const evidenceLinks = buildUnifiedEvidenceLinks({
    synthesis: params.signalSynthesis,
    claims,
    graphRagEvidence: params.graphRagEvidence,
  })
  const scores = buildUnifiedScoresFromData({
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
    signalSynthesis: params.signalSynthesis,
  })
  const mappingRulebook = buildMappingRulebook({
    lang: params.lang,
    claims,
    selectedSignals,
    scores,
    matrixInput: params.matrixInput,
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
  const blocksBySection = buildBlocksBySection({
    lang: params.lang,
    sectionPaths: params.sectionPaths,
    claims,
    selectedSignals,
    timelineEvents,
    scenarioBundles,
    mappingRulebook,
    scores,
    matrixInput: params.matrixInput,
    timeWindow,
    evidenceRefsByPara,
  })
  return {
    reportMeta,
    timeWindow,
    scores,
    claims,
    selectedSignals,
    anchors,
    evidenceLinks,
    timelineEvents,
    scenarioBundles,
    evidenceRefsByPara,
    mappingRulebook,
    blocksBySection,
    timelinePriority: timeWindow.scope === 'LIFE' ? 'life_first' : 'default',
  }
}
