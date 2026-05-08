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
import type { EvidenceBundle, CrossEvidenceSet } from './structuredEvidence'
import type { DeterministicSectionBlock } from './deterministicCore'

const UNIFIED_REPORT_SCHEMA_VERSION = '1.1'
const UNIFIED_REPORT_ENGINE_VERSION = 'destiny-matrix-ai-report-v2'
const PARAGRAPH_COUNT_PER_SECTION = 3

import {
  buildUnifiedTimeWindow,
  blendDisplayDomainConfidence,
  blendDisplayDomainScore,
  clamp,
  extractMustKeepTokens,
  normalizeConfidence,
  normalizeScore100,
  pickTopStrings,
  round2,
  sectionToDomain,
  unique,
} from './unifiedReportSupport'
import type { MappingCountryFit, MappingIncomeBand, MappingRulebook } from './unifiedReportSupport'
import {
  buildBlocksBySection,
  buildEvidenceRefsByPara,
  buildUnifiedScenarioBundles,
  buildUnifiedTimelineEventsFromClaims,
} from './unifiedReportEnvelopeSupport'

function buildUnifiedAnchorsFromGraph(
  structuredEvidence: EvidenceBundle | undefined
): UnifiedAnchor[] {
  return (structuredEvidence?.anchors || []).map((anchor) => {
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
  set: CrossEvidenceSet
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
  structuredEvidence: EvidenceBundle | undefined
}): UnifiedEvidenceLink[] {
  const anchors = params.structuredEvidence?.anchors || []
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
      const dayMasterElement = String(params.matrixInput?.dayMasterElement || '').toLowerCase()
      const matrixBias =
        dominantElementToken.includes('fire') || dayMasterElement === 'fire'
          ? index === 0
            ? 4
            : 0
          : dayMasterElement === 'water'
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

export function buildUnifiedEnvelope(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  lang: 'ko' | 'en'
  generatedAt: string
  matrixInput?: MatrixCalculationInput
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  signalSynthesis?: SignalSynthesisResult
  structuredEvidence: EvidenceBundle | undefined
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
  const anchors = buildUnifiedAnchorsFromGraph(params.structuredEvidence)
  const selectedSignals = buildUnifiedSelectedSignalsFromSynthesis(params.signalSynthesis)
  const claims = buildUnifiedClaimsFromSynthesis(params.signalSynthesis, anchors)
  const evidenceLinks = buildUnifiedEvidenceLinks({
    synthesis: params.signalSynthesis,
    claims,
    structuredEvidence: params.structuredEvidence,
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
    structuredEvidence: params.structuredEvidence,
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

