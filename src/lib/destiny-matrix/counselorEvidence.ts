import type { FusionReport, InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '@/lib/destiny-matrix/types'
import {
  buildGraphRAGEvidence,
  summarizeGraphRAGEvidence,
  type GraphRAGEvidenceSummary,
} from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { ReportEvidenceRef } from '@/lib/destiny-matrix/ai-report/evidenceRefs'
import type { SignalSynthesisResult } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/ai-report/strategyEngine'
import type {
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
} from '@/lib/destiny-matrix/ai-report/types'
import { buildUnifiedEnvelope } from '@/lib/destiny-matrix/ai-report/unifiedReport'

const COUNSELOR_SECTION_PATHS = [
  'overview',
  'patterns',
  'timing',
  'recommendations',
  'actionPlan',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
]

type CounselorTheme =
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

export interface CounselorEvidencePacket {
  focusDomain: string
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
}

type CounselorEvidencePacketLike = {
  focusDomain?: string
  graphRagEvidenceSummary?: {
    totalAnchors?: number
    totalSets?: number
  }
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
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function mapThemeToDomain(theme: CounselorTheme): InsightDomain {
  switch (theme) {
    case 'love':
    case 'family':
      return 'relationship'
    case 'career':
      return 'career'
    case 'wealth':
      return 'wealth'
    case 'health':
      return 'health'
    case 'today':
    case 'month':
    case 'year':
      return 'timing'
    case 'life':
    case 'chat':
    default:
      return 'personality'
  }
}

function domainHintsForSection(sectionPath: string, focusDomain: InsightDomain): string[] {
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
  focusDomain: InsightDomain,
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

function summarizeAnchor(anchor: UnifiedAnchor): string {
  return anchor.crossEvidenceSummary.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function summarizeClaim(claim: UnifiedClaim): string {
  return claim.text.replace(/\s+/g, ' ').trim().slice(0, 180)
}

export function buildCounselorEvidencePacket(params: {
  theme: CounselorTheme
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  signalSynthesis: SignalSynthesisResult
  strategyEngine: StrategyEngineResult
  birthDate?: string
}): CounselorEvidencePacket {
  const focusDomain = mapThemeToDomain(params.theme)
  const graphRagEvidence = buildGraphRAGEvidence(params.matrixInput, params.matrixReport, {
    mode: 'comprehensive',
    focusDomain,
  })
  const evidenceRefs = Object.fromEntries(
    COUNSELOR_SECTION_PATHS.map((sectionPath) => [
      sectionPath,
      toEvidenceRefs(sectionPath, focusDomain, params.signalSynthesis),
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
    sectionPaths: COUNSELOR_SECTION_PATHS,
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
    anchors: [],
  }

  return {
    focusDomain,
    graphRagEvidenceSummary,
    topAnchors: (unified.anchors || []).slice(0, 8).map((anchor) => ({
      id: anchor.id,
      section: anchor.section,
      summary: summarizeAnchor(anchor),
      setCount: anchor.setCount,
    })),
    topClaims: (unified.claims || []).slice(0, 10).map((claim) => ({
      id: claim.id,
      text: summarizeClaim(claim),
      domain: claim.domain,
      signalIds: claim.selectedSignalIds.slice(0, 8),
      anchorIds: claim.anchorIds.slice(0, 6),
    })),
    scenarioBriefs: (unified.scenarioBundles || [])
      .slice(0, 6)
      .map((bundle: UnifiedScenarioBundle) => ({
        id: bundle.id,
        domain: bundle.domain,
        mainTokens: (bundle.main.summaryTokens || []).slice(0, 8),
        altTokens: (bundle.alt || []).flatMap((alt) => alt.summaryTokens || []).slice(0, 8),
      })),
    selectedSignals: (params.signalSynthesis.selectedSignals || [])
      .slice()
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 10)
      .map((signal) => ({
        id: signal.id,
        domain: signal.domainHints[0] || 'personality',
        polarity: signal.polarity,
        summary: `${signal.keyword}: ${(signal.sajuBasis || signal.astroBasis || signal.advice || '').slice(0, 180)}`,
        score: signal.score,
      })),
    strategyBrief: {
      overallPhase: params.strategyEngine.overallPhase,
      overallPhaseLabel: params.strategyEngine.overallPhaseLabel,
      attackPercent: params.strategyEngine.attackPercent,
      defensePercent: params.strategyEngine.defensePercent,
    },
  }
}

export function formatCounselorEvidencePacket(
  packet: CounselorEvidencePacketLike | null | undefined,
  lang: 'ko' | 'en'
): string {
  if (!packet || !packet.focusDomain || !packet.graphRagEvidenceSummary) return ''

  const anchorLines = (packet.topAnchors || [])
    .slice(0, 6)
    .map((anchor) => `- ${anchor.section}: ${anchor.summary} (sets=${anchor.setCount})`)
  const claimLines = (packet.topClaims || [])
    .slice(0, 6)
    .map(
      (claim) =>
        `- [${claim.domain || 'general'}] ${claim.text} | signals=${(claim.signalIds || []).slice(0, 4).join(',') || 'none'}`
    )
  const scenarioLines = (packet.scenarioBriefs || []).slice(0, 4).map((scenario) => {
    const main = (scenario.mainTokens || []).slice(0, 4).join(', ') || 'none'
    const alt = (scenario.altTokens || []).slice(0, 4).join(', ') || 'none'
    return `- ${scenario.domain}: main=${main} | alt=${alt}`
  })
  const signalLines = (packet.selectedSignals || [])
    .slice(0, 8)
    .map(
      (signal) =>
        `- ${signal.domain}/${signal.polarity}/score=${signal.score}: ${signal.summary || 'none'}`
    )
  const strategyLabel = packet.strategyBrief?.overallPhaseLabel || 'none'
  const attackPercent = packet.strategyBrief?.attackPercent ?? '-'
  const defensePercent = packet.strategyBrief?.defensePercent ?? '-'

  if (lang === 'ko') {
    return [
      '[Counselor Evidence Packet v2]',
      `focus_domain=${packet.focusDomain}`,
      `graph_anchors=${packet.graphRagEvidenceSummary.totalAnchors}`,
      `graph_sets=${packet.graphRagEvidenceSummary.totalSets}`,
      `strategy=${strategyLabel}(${attackPercent}/${defensePercent})`,
      '',
      '[Core Claims]',
      ...(claimLines.length > 0 ? claimLines : ['- none']),
      '',
      '[Scenarios]',
      ...(scenarioLines.length > 0 ? scenarioLines : ['- none']),
      '',
      '[Signal Evidence]',
      ...(signalLines.length > 0 ? signalLines : ['- none']),
      '',
      '[Anchor Evidence]',
      ...(anchorLines.length > 0 ? anchorLines : ['- none']),
      '',
      '[Response Contract]',
      '- 답변은 4문단 이상으로 작성: 현재국면 -> 근거해석 -> 실행전략 -> 재확인체크리스트.',
      '- 각 문단에 근거를 최소 1개씩 연결하고, 추천/주의가 서로 충돌하지 않게 유지.',
      '- irreversible 행동(서명, 확정, 발송, 결제)은 caution 신호가 있으면 즉시 권하지 말 것.',
      '- 핵심 결론은 strategy와 top claim에 반드시 일치시킬 것.',
    ].join('\n')
  }

  return [
    '[Counselor Evidence Packet v2]',
    `focus_domain=${packet.focusDomain}`,
    `graph_anchors=${packet.graphRagEvidenceSummary.totalAnchors}`,
    `graph_sets=${packet.graphRagEvidenceSummary.totalSets}`,
    `strategy=${strategyLabel}(${attackPercent}/${defensePercent})`,
    '',
    '[Core Claims]',
    ...(claimLines.length > 0 ? claimLines : ['- none']),
    '',
    '[Scenarios]',
    ...(scenarioLines.length > 0 ? scenarioLines : ['- none']),
    '',
    '[Signal Evidence]',
    ...(signalLines.length > 0 ? signalLines : ['- none']),
    '',
    '[Anchor Evidence]',
    ...(anchorLines.length > 0 ? anchorLines : ['- none']),
    '',
    '[Response Contract]',
    '- Write at least 4 paragraphs: current phase -> grounded interpretation -> strategy -> recheck checklist.',
    '- Each paragraph must include at least one evidence item and keep recommendation/caution non-contradictory.',
    '- If caution signals exist, do not push irreversible actions (sign/finalize/send/pay) immediately.',
    '- Keep final verdict strictly aligned with strategy and top claims.',
  ].join('\n')
}
