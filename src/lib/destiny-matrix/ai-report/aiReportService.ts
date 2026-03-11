// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrix(TM) - AI Premium Report Generator
// 유료 기능: AI 기반 상세 내러티브 리포트 생성

import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type {
  ReportPeriod,
  ReportTheme,
  TimingData,
  TimingAIPremiumReport,
  ThemedAIPremiumReport,
  TimingReportSections,
  ThemedReportSections,
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
  UnifiedTimelineEvent,
  TopMatchedPattern,
} from './types'
import { THEME_META } from './types'
import { logger } from '@/lib/logger'
import { recordCounter } from '@/lib/metrics'
import { buildTimingPrompt } from './prompts/timingPrompts'
import { buildThemedPrompt } from './prompts/themedPrompts'
import {
  buildGraphRAGEvidence,
  formatGraphRAGEvidenceForPrompt,
  summarizeGraphRAGEvidence,
} from './graphRagEvidence'
import { renderSectionsAsMarkdown, renderSectionsAsText } from './reportRendering'
import { buildDeterministicCore, type DeterministicSectionBlock } from './deterministicCore'
import type { DeterministicProfile } from './deterministicCoreConfig'
import { getThemedSectionKeys } from './themeSchema'
import { buildLifeCyclePromptBlock, buildThemeSchemaPromptBlock } from '../interpretationSchema'
import { buildUnifiedEnvelope, inferAgeFromBirthDate } from './unifiedReport'
import {
  buildReportQualityMetrics as buildReportQualityMetricsCore,
  recordReportQualityMetrics as recordReportQualityMetricsCore,
  type ReportQualityContext,
  type ReportQualityMetrics,
} from './reportQuality'
import {
  buildEvidenceBindingRepairPrompt,
  enforceEvidenceBindingFallback,
  getPathText,
  getPathValue,
  hasRequiredSectionPaths,
  rewriteSectionsWithFallback,
  setPathText,
  validateEvidenceBinding,
} from './rewriteGuards'
import {
  buildActionRepairInstruction,
  buildAntiRepetitionInstruction,
  buildCrossRepairInstruction,
  buildCrossCoverageRepairInstruction,
  buildDepthRepairInstruction,
  buildEvidenceRepairInstruction,
  buildNarrativeRewritePrompt,
  buildNarrativeStyleRepairInstruction,
  buildSecondPassInstruction,
  buildTimingRepairInstruction,
  getMaxRepairPassesByPlan,
} from './repairPrompts'
import {
  getCoverageRatioByPredicate,
  getCrossCoverageRatio,
  getListStylePaths,
  getMissingCrossPaths,
  getMissingPathsByPredicate,
  getRepetitivePaths,
  getShortSectionPaths,
  hasActionInText,
  hasCrossInText,
  hasEvidenceTriplet,
  hasListLikeStyle,
  hasRepetitiveSentences,
  hasTimingInText,
} from './sectionAudit'
import { evaluateSectionGate, splitSentences } from './sectionQualityGate'
import {
  buildSynthesisFactsForSection,
  type SignalSynthesisResult,
  getDomainsForSection,
} from './signalSynthesizer'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type { StrategyEngineResult } from './strategyEngine'
import { THEME_DOMAIN_ONTOLOGY } from './matrixOntology'
import { generateNarrativeSectionsFromSynthesis } from './narrativeGenerator'

// Extracted modules
import type { AIPremiumReport, AIReportGenerationOptions, AIUserPlan } from './reportTypes'

import { buildMatrixSummary } from './promptBuilders'
import { callAIBackendGeneric } from './aiBackend'
import {
  generatePeriodLabel,
  calculatePeriodScore,
  calculateThemeScore,
  extractKeywords,
} from './scoreCalculators'
import type { GraphRAGEvidenceAnchor, GraphRAGCrossEvidenceSet } from './graphRagEvidence'
import {
  buildNormalizedMatrixInput,
  runDestinyCore,
} from '@/lib/destiny-matrix/core/runDestinyCore'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'

const RECHECK_REGEX = /재확인|점검|검토|verify|recheck|double-check|checklist|review/i
const ABSOLUTE_RISK_REGEX = /무조건|절대|반드시|100%|always|never|guaranteed|certainly/i
const IRREVERSIBLE_ACTION_REGEX =
  /계약|서명|확정|예약|결혼식|청첩장|이직\s*확정|창업\s*확정|런칭|큰\s*결정|즉시\s*결정|sign|finalize|commit now|book|wedding|invitation|big decision|launch/i
const CAUTION_INDICATOR_REGEX =
  /주의|리스크|경계|재확인|확인|오류|갈등|충돌|caution|risk|warning|recheck|conflict/i
const IMMEDIATE_FORCE_REGEX =
  /즉시|바로|지금\s*확정|오늘\s*확정|today\s*finalize|sign now|commit now|immediately/i
const MITIGATION_REGEX =
  /전|재확인|점검|검토|보류|미루|분리|하지\s*말|avoid|before|recheck|verify|defer|hold/i
const RECOMMENDATION_TONE_REGEX =
  /하세요|하십시오|권장|추천|진행|실행|하라|해야|권합니다|recommended|recommend|should|must|do this|proceed/i
const USER_FACING_NOISE_REGEX =
  /(snapshot_|astrologysnapshot|sajusnapshot|crosssnapshot|스냅샷\s*키|해당\s*스냅샷|array\(|object\(|COV:|I\d+:|L\d+:|crossEvidenceSets|graphRAG|graphrag|matrix_)/i

function recordRewriteModeMetric(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  tokensUsed: number | undefined
) {
  const fallback = modelUsed.includes('rewrite-fallback') ? 'true' : 'false'
  recordCounter('destiny.ai_report.rewrite.mode', 1, {
    report_type: reportType,
    model_used: modelUsed,
    fallback,
  })
  if (typeof tokensUsed === 'number') {
    recordCounter('destiny.ai_report.rewrite.tokens', tokensUsed, {
      report_type: reportType,
      model_used: modelUsed,
    })
  }
}

function buildDirectToneOverride(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '## 말투 강제 규칙',
      '- 친구식 위로체 대신 전문가 컨설팅 톤으로 작성합니다.',
      '- 각 단락 첫 문장은 결론형으로 시작합니다.',
      '- 두루뭉술한 표현 대신 명확한 판단 문장을 사용합니다.',
      '- 근거(사주/점성) -> 해석 -> 행동 순서를 유지합니다.',
      '- 불릿이 아니라 문단형으로 작성하되, 문장은 짧고 단정하게 씁니다.',
    ].join('\n')
  }
  return [
    '## Tone Override',
    '- Use a professional consultant tone, not friendly consolation.',
    '- Start each paragraph with a conclusion sentence.',
    '- Prefer clear judgments over vague hedging.',
    '- Keep the flow: evidence (Saju/Astrology) -> interpretation -> action.',
    '- Keep short, assertive paragraph sentences.',
  ].join('\n')
}

function countSectionChars(sections: Record<string, unknown>): number {
  const values = Object.values(sections || {}) as unknown[]
  return values.reduce<number>((acc, value) => {
    if (typeof value === 'string') {
      return acc + value.length
    }
    if (Array.isArray(value)) {
      return acc + value.join(' ').length
    }
    if (value && typeof value === 'object') {
      return acc + countSectionChars(value as Record<string, unknown>)
    }
    return acc
  }, 0)
}

function buildTopMatchedPatterns(
  patterns: PatternResult[] | undefined,
  limit = 10
): TopMatchedPattern[] {
  if (!Array.isArray(patterns) || patterns.length === 0) return []
  return patterns.slice(0, limit).map((pattern) => ({
    id: pattern.id,
    label: pattern.label,
    score: pattern.score,
    confidence: pattern.confidence,
    domains: [...(pattern.domains || [])],
    activationReason: pattern.activationReason,
    matchedSignalIds: [...(pattern.matchedSignalIds || [])].slice(0, 8),
    matchedKeywords: [...(pattern.matchedKeywords || [])].slice(0, 8),
  }))
}

function buildReportQualityMetrics(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  context: ReportQualityContext = {}
): ReportQualityMetrics {
  const forbiddenAdditionsPass = !validateEvidenceBinding(
    sections,
    sectionPaths,
    evidenceRefs
  ).violations.some((violation) => violation.unsupportedTokens.length > 0)

  return buildReportQualityMetricsCore({
    sections,
    sectionPaths,
    evidenceRefs,
    context,
    minEvidenceRefsPerSection: MIN_EVIDENCE_REFS_PER_SECTION,
    regex: {
      recheck: RECHECK_REGEX,
      absoluteRisk: ABSOLUTE_RISK_REGEX,
      irreversibleAction: IRREVERSIBLE_ACTION_REGEX,
      cautionIndicator: CAUTION_INDICATOR_REGEX,
      immediateForce: IMMEDIATE_FORCE_REGEX,
      mitigation: MITIGATION_REGEX,
      recommendationTone: RECOMMENDATION_TONE_REGEX,
    },
    hasEvidenceSupport,
    forbiddenAdditionsPass,
  })
}

function recordReportQualityMetrics(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  quality: ReportQualityMetrics
) {
  recordReportQualityMetricsCore(reportType, modelUsed, quality)
}

function attachDeterministicArtifacts(
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  unified: ReturnType<typeof buildUnifiedEnvelope>
): ReturnType<typeof buildDeterministicCore> {
  return {
    ...deterministicCore,
    artifacts: {
      ...(deterministicCore.artifacts || {}),
      mappingRulebook: unified.mappingRulebook as unknown as Record<string, unknown>,
      blocksBySection: unified.blocksBySection,
      scenarioBundles: (unified.scenarioBundles || []).map((bundle) => ({
        id: bundle.id,
        domain: bundle.domain,
        mainTokens: bundle.main.summaryTokens || [],
        altTokens: (bundle.alt || []).map((alt) => alt.summaryTokens || []),
      })),
      evidenceLinks: (unified.evidenceLinks || []).map((link) => ({
        id: link.id,
        signalId: link.signalId,
        claimIds: link.claimIds || [],
        anchorId: link.anchorId,
        setIds: link.setIds || [],
        score: link.linkScore,
      })),
      timelinePriority: unified.timelinePriority,
    },
  }
}

function sanitizeSectionsByPaths(
  sections: Record<string, unknown>,
  paths: string[]
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(sections)) as Record<string, unknown>
  const sectionKeySet = new Set<keyof AIPremiumReport['sections']>([
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ])
  for (const path of paths) {
    const value = getPathValue(next, path)
    if (typeof value !== 'string') continue
    const sectionCandidate = path.split('.').pop() as keyof AIPremiumReport['sections']
    const sectionKey = sectionKeySet.has(sectionCandidate) ? sectionCandidate : 'introduction'
    const lang: 'ko' | 'en' = /[가-힣]/.test(value) ? 'ko' : 'en'
    const sanitized = postProcessSectionNarrative(value, sectionKey, lang)
    setPathText(next, path, softenOverclaimPhrases(sanitized))
  }
  return next
}

function softenOverclaimPhrases(text: string): string {
  if (!text) return text
  return text
    .replace(/무조건/gi, '가능하면')
    .replace(/절대/gi, '가급적')
    .replace(/반드시/gi, '우선적으로')
    .replace(/100%/gi, '높은 확률로')
    .replace(/\bguaranteed\b/gi, 'high-probability')
    .replace(/\bcertainly\b/gi, 'likely')
    .replace(/\balways\b/gi, 'in most cases')
    .replace(/\bnever\b/gi, 'rarely')
}

const EVIDENCE_TOKEN_STOP_WORDS = new Set([
  '그리고',
  '하지만',
  '에서',
  '으로',
  '입니다',
  '합니다',
  '흐름',
  '현재',
  '기질',
  '성향',
  '기준',
  'signal',
  'signals',
  'with',
  'from',
  'this',
  'that',
  'the',
  'and',
  'for',
  'your',
])

const FORCE_REWRITE_ONLY_MODE = true
const FORCE_STRICT_COMPUTE_ONLY_MODE = true

function shouldUseDeterministicOnly(flag?: boolean): boolean {
  if (FORCE_STRICT_COMPUTE_ONLY_MODE) return true
  if (typeof flag === 'boolean') return flag
  const env = String(process.env.DESTINY_REPORT_DETERMINISTIC_ONLY || '')
    .trim()
    .toLowerCase()
  return env === '1' || env === 'true' || env === 'yes' || env === 'on'
}

function compactToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

function tokenizeEvidenceText(value?: string): string[] {
  if (!value) return []
  return value
    .split(/[^\p{L}\p{N}_:]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .map((token) => compactToken(token))
    .filter((token) => token.length >= 2 && !EVIDENCE_TOKEN_STOP_WORDS.has(token))
}

const EVIDENCE_DOMAIN_PRIORITY = [
  'career',
  'wealth',
  'relationship',
  'health',
  'timing',
  'personality',
  'spirituality',
  'move',
] as const
const MIN_EVIDENCE_REFS_PER_SECTION = 2
const GLOBAL_EVIDENCE_DOMAINS = [
  'career',
  'relationship',
  'wealth',
  'health',
  'timing',
  'personality',
  'spirituality',
  'move',
]

function resolveSignalDomain(
  domainHints: string[] | undefined,
  preferredDomains?: Set<string>
): string {
  const hints = (domainHints || []).filter(Boolean)
  if (hints.length === 0) return 'personality'
  if (preferredDomains) {
    const direct = hints.find((domain) => preferredDomains.has(domain))
    if (direct) return direct
  }
  const sorted = [...new Set(hints)].sort((a, b) => {
    const ai = EVIDENCE_DOMAIN_PRIORITY.indexOf(a as (typeof EVIDENCE_DOMAIN_PRIORITY)[number])
    const bi = EVIDENCE_DOMAIN_PRIORITY.indexOf(b as (typeof EVIDENCE_DOMAIN_PRIORITY)[number])
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99)
  })
  return sorted[0] || 'personality'
}

function toEvidenceRef(
  signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number],
  preferredDomains?: Set<string>
): ReportEvidenceRef {
  return {
    id: signal.id,
    domain: resolveSignalDomain(signal.domainHints, preferredDomains),
    layer: signal.layer,
    rowKey: signal.rowKey,
    colKey: signal.colKey,
    keyword: signal.keyword,
    sajuBasis: signal.sajuBasis,
    astroBasis: signal.astroBasis,
    score: signal.score,
  }
}

function selectEvidenceRefsByDomains(
  synthesis: SignalSynthesisResult | undefined,
  domains: string[],
  limit = 4,
  usedSignalIds?: Set<string>
): ReportEvidenceRef[] {
  if (!synthesis) return []
  const domainSet = new Set(domains)
  const claimWeightBySignal = new Map<string, number>()
  for (const claim of synthesis.claims) {
    if (!domainSet.has(claim.domain)) continue
    for (const signalId of claim.evidence) {
      claimWeightBySignal.set(signalId, (claimWeightBySignal.get(signalId) || 0) + 1)
    }
  }

  const candidateById = new Map<
    string,
    {
      signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number]
      overlap: number
      claimWeight: number
      freshness: number
      score: number
    }
  >()

  const pushCandidate = (
    signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number] | undefined,
    baseBoost = 0
  ) => {
    if (!signal) return
    const overlap = (signal.domainHints || []).filter((domain) => domainSet.has(domain)).length
    const claimWeight = claimWeightBySignal.get(signal.id) || 0
    const freshness = usedSignalIds && !usedSignalIds.has(signal.id) ? 1 : 0
    const relevance =
      overlap * 100 + claimWeight * 24 + freshness * 12 + baseBoost + (signal.rankScore || 0)
    const existing = candidateById.get(signal.id)
    if (!existing || relevance > existing.score) {
      candidateById.set(signal.id, {
        signal,
        overlap,
        claimWeight,
        freshness,
        score: relevance,
      })
    }
  }

  for (const signalId of claimWeightBySignal.keys()) {
    pushCandidate(synthesis.signalsById[signalId], 12)
  }
  for (const signal of synthesis.selectedSignals) {
    pushCandidate(signal)
  }
  for (const signal of synthesis.normalizedSignals) {
    if ((signal.domainHints || []).some((domain) => domainSet.has(domain))) {
      pushCandidate(signal)
    }
  }

  const orderedSignals = [...candidateById.values()]
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap
      if (b.claimWeight !== a.claimWeight) return b.claimWeight - a.claimWeight
      if (b.freshness !== a.freshness) return b.freshness - a.freshness
      return b.score - a.score
    })
    .map((item) => item.signal)
  const deduped: ReportEvidenceRef[] = []
  const seen = new Set<string>()
  for (const signal of orderedSignals) {
    if (!signal || seen.has(signal.id)) continue
    seen.add(signal.id)
    deduped.push(toEvidenceRef(signal, domainSet))
    if (usedSignalIds) usedSignalIds.add(signal.id)
    if (deduped.length >= limit) break
  }
  return deduped
}

function getTimingPathDomains(path: string): string[] {
  if (path === 'domains.career') return ['career']
  if (path === 'domains.love') return ['relationship']
  if (path === 'domains.wealth') return ['wealth']
  if (path === 'domains.health') return ['health']
  if (path === 'luckyElements') return ['timing', 'personality']
  return ['timing', 'career', 'relationship', 'wealth', 'health']
}

function getThemedPathDomains(theme: ReportTheme, path: string): string[] {
  const profile = THEME_DOMAIN_ONTOLOGY[theme] || THEME_DOMAIN_ONTOLOGY.family
  if (path === 'timing' || path === 'riskWindows') return [...profile.timing]
  return [...profile.primary, ...profile.support]
}

function buildComprehensiveEvidenceRefs(
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  const usedSignalIds = new Set<string>()
  for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
    refs[sectionKey] = selectEvidenceRefsByDomains(
      synthesis,
      getDomainsForSection(sectionKey),
      4,
      usedSignalIds
    )
  }
  return ensureMinimumEvidenceRefs(
    refs,
    COMPREHENSIVE_SECTION_KEYS as string[],
    synthesis,
    (path) => getDomainsForSection(path)
  )
}

function buildTimingEvidenceRefs(
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  const usedSignalIds = new Set<string>()
  for (const path of sectionPaths) {
    refs[path] = selectEvidenceRefsByDomains(
      synthesis,
      getTimingPathDomains(path),
      4,
      usedSignalIds
    )
  }
  return ensureMinimumEvidenceRefs(refs, sectionPaths, synthesis, getTimingPathDomains)
}

function buildThemedEvidenceRefs(
  theme: ReportTheme,
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  const usedSignalIds = new Set<string>()
  for (const path of sectionPaths) {
    refs[path] = selectEvidenceRefsByDomains(
      synthesis,
      getThemedPathDomains(theme, path),
      4,
      usedSignalIds
    )
  }
  return ensureMinimumEvidenceRefs(refs, sectionPaths, synthesis, (path) =>
    getThemedPathDomains(theme, path)
  )
}

function mergeEvidenceRefs(
  base: ReportEvidenceRef[],
  incoming: ReportEvidenceRef[],
  limit = 4
): ReportEvidenceRef[] {
  const merged = [...base]
  const seen = new Set(base.map((ref) => ref.id))
  for (const ref of incoming) {
    if (!ref?.id || seen.has(ref.id)) continue
    seen.add(ref.id)
    merged.push(ref)
    if (merged.length >= limit) break
  }
  return merged
}

function ensureMinimumEvidenceRefs(
  refs: SectionEvidenceRefs,
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined,
  resolveDomains: (path: string) => string[]
): SectionEvidenceRefs {
  if (!synthesis) return refs
  const next: SectionEvidenceRefs = { ...refs }
  for (const path of sectionPaths) {
    const existing = [...(next[path] || [])]
    if (existing.length >= MIN_EVIDENCE_REFS_PER_SECTION) continue

    const local = selectEvidenceRefsByDomains(synthesis, resolveDomains(path), 4)
    let merged = mergeEvidenceRefs(existing, local, 4)
    if (merged.length < MIN_EVIDENCE_REFS_PER_SECTION) {
      const global = selectEvidenceRefsByDomains(synthesis, GLOBAL_EVIDENCE_DOMAINS, 4)
      merged = mergeEvidenceRefs(merged, global, 4)
    }
    next[path] = merged
  }
  return next
}

function hasEvidenceSupport(text: string, refs: ReportEvidenceRef[]): boolean {
  if (!text || refs.length === 0) return true
  const lowered = text.toLowerCase()
  for (const ref of refs) {
    const tokens = [
      ...tokenizeEvidenceText(ref.keyword),
      ...tokenizeEvidenceText(ref.rowKey),
      ...tokenizeEvidenceText(ref.colKey),
      ...tokenizeEvidenceText(ref.sajuBasis),
      ...tokenizeEvidenceText(ref.astroBasis),
    ].slice(0, 12)
    for (const token of tokens) {
      if (!token || token.length < 2) continue
      if (lowered.includes(token)) return true
    }
  }
  return false
}

function hasEvidenceIdReference(text: string, refs: ReportEvidenceRef[]): boolean {
  if (!text || refs.length === 0) return true
  const lowered = text.toLowerCase()
  return refs.some((ref) => {
    const hints = [ref.keyword, ref.rowKey, ref.colKey]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.toLowerCase())
    return hints.some((hint) => lowered.includes(hint))
  })
}

function enforceEvidenceRefFooters(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  lang: 'ko' | 'en'
): Record<string, unknown> {
  for (const path of sectionPaths) {
    const text = getPathText(sections, path)
    if (!text) continue
    const refs = (evidenceRefs[path] || []).filter((ref) => Boolean(ref.id))
    if (refs.length === 0) continue
    if (hasEvidenceIdReference(text, refs)) continue
    const top = refs.slice(0, 2)
    const hints = top
      .map((ref) => ref.keyword || ref.rowKey || ref.colKey)
      .filter(Boolean)
      .join(', ')
    const footer =
      lang === 'ko'
        ? `근거 흐름은 ${hints || '핵심 신호'}입니다.`
        : `Grounding follows ${hints || 'core signals'}.`
    setPathText(sections, path, `${text} ${footer}`.replace(/\s{2,}/g, ' ').trim())
  }
  return sections
}

const COMPREHENSIVE_SECTION_KEYS: Array<keyof AIPremiumReport['sections']> = [
  'introduction',
  'personalityDeep',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
  'healthGuidance',
  'lifeMission',
  'timingAdvice',
  'actionPlan',
  'conclusion',
]

function isComprehensiveSectionsPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return COMPREHENSIVE_SECTION_KEYS.every((key) => typeof record[key] === 'string')
}

const BOILERPLATE_PATTERNS = [
  /이 구간의 핵심 초점은[^.\n!?]*[.\n!?]?/g,
  /This section focuses on[^.\n!?]*[.\n!?]?/gi,
]
const BANNED_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/격국의 결/gi, '격국 흐름'],
  [/긴장 신호/gi, '주의 신호'],
  [/상호작용/gi, '연동'],
  [/시사/gi, '보여줌'],
  [/결이/gi, '흐름이'],
  [/프레임/gi, '구조'],
  [/검증/gi, '재확인'],
  [/근거 세트/gi, '근거 묶음'],
  [
    /\b(?:tarot|numerology|human\s*design|chakra|reiki|mbti|enneagram|blood\s*type|feng\s*shui)\b/gi,
    'saju-astrology',
  ],
  [/(?:타로|수비학|휴먼\s*디자인|차크라|레이키|에니어그램|혈액형|풍수)/gi, '사주·점성'],
]
const BANNED_PHRASE_PATTERNS = BANNED_PHRASE_REPLACEMENTS.map(([pattern]) => pattern)
const SECTION_CONCRETE_NOUNS: Record<keyof AIPremiumReport['sections'], string[]> = {
  introduction: ['일정', '우선순위', '대화', '수면', '피로', '마감'],
  personalityDeep: ['말투', '속도', '거리두기', '결정', '수면', '두통'],
  careerPath: ['일정', '우선순위', '협업', '결정 지연', '마감', '회의'],
  relationshipDynamics: ['말이 빨라짐', '단호해짐', '거리두기', '확정 서두름', '대화', '연락'],
  wealthPotential: ['지출', '저축', '계약', '예산', '마감', '우선순위'],
  healthGuidance: ['소화', '수면', '두통', '허리', '관절', '피로'],
  lifeMission: ['일정', '습관', '기록', '대화', '협업', '우선순위'],
  timingAdvice: ['오늘', '이번주', '이번 달', '마감', '대화', '결정'],
  actionPlan: ['일정', '우선순위', '협업', '수면', '대화', '마감'],
  conclusion: ['일정', '대화', '수면', '우선순위', '피로', '결정'],
}

function stripBannedPhrases(text: string): string {
  let result = text
  for (const [pattern, replacement] of BANNED_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function containsBannedPhrase(text: string): boolean {
  return BANNED_PHRASE_PATTERNS.some((pattern) => pattern.test(text))
}

export function sanitizeSectionNarrative(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  cleaned = stripBannedPhrases(cleaned)
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}
const REPETITIVE_OPENER_REGEX =
  /^(?:\uACB0\uB860\uBD80\uD130 \uB9D0\uD558\uBA74|\uC694\uC57D\uD558\uBA74|\uD575\uC2EC\uC740)\b/
const SECTION_OPENERS_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '지금 국면의 핵심은 방향 설정입니다',
  personalityDeep: '성향의 중심축은 판단과 리듬 조절입니다',
  careerPath: '커리어에서는 우선순위 설계가 성과를 가릅니다',
  relationshipDynamics: '관계에서는 해석 오차 관리가 먼저입니다',
  wealthPotential: '재정에서는 기대수익보다 조건 검증이 우선입니다',
  healthGuidance: '건강은 회복 리듬 관리가 핵심입니다',
  lifeMission: '장기 성장은 일관된 실행 기록에서 나옵니다',
  timingAdvice: '타이밍은 속도보다 순서가 중요합니다',
  actionPlan: '실행은 단계를 분리할수록 재현성이 높아집니다',
  conclusion: '이번 흐름의 결론은 속도와 검증의 균형입니다',
}
function normalizeSentenceKey(sentence: string): string {
  return sentence
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
function postProcessSectionNarrative(
  text: string,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  const base = sanitizeSectionNarrative(text)
  if (!base) return base
  const sentences = splitSentences(base)
  if (sentences.length === 0) return base
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const sentence of sentences) {
    const key = normalizeSentenceKey(sentence)
    if (key.length < 12 || !seen.has(key)) {
      deduped.push(sentence)
      if (key.length >= 12) seen.add(key)
    }
  }
  if (lang === 'ko' && deduped[0] && REPETITIVE_OPENER_REGEX.test(deduped[0])) {
    deduped[0] = SECTION_OPENERS_KO[sectionKey]
  }
  return deduped
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sanitizeTimingContradictions(text: string, input: MatrixCalculationInput): string {
  if (!text) return text
  let out = text
  if (input.currentSaeunElement && /세운\s*미입력/gi.test(out)) {
    out = out.replace(/세운\s*미입력/gi, '세운 흐름 반영')
  }
  if (input.currentDaeunElement && /대운\s*미입력/gi.test(out)) {
    out = out.replace(/대운\s*미입력/gi, '대운 흐름 반영')
  }
  if (input.currentWolunElement && /월운\s*미입력/gi.test(out)) {
    out = out.replace(/월운\s*미입력/gi, '월운 흐름 반영')
  }
  if ((input.currentIljinElement || input.currentIljinDate) && /일진\s*미입력/gi.test(out)) {
    out = out.replace(/일진\s*미입력/gi, '일진 흐름 반영')
  }
  return out
}

function toKoreanDomainLabel(domain: string): string {
  const map: Record<string, string> = {
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '사명',
    timing: '시기',
  }
  return map[domain] || '흐름'
}

interface GraphRagSummaryPayload {
  topInsights: string[]
  drivers: string[]
  cautions: string[]
  trust: {
    avgOverlapScore: number
    avgOrbFitScore: number
    highTrustSetCount: number
    lowTrustSetCount: number
    totalSets: number
  }
  cautionSections: string[]
}

function uniqueStrings(values: Array<string | undefined | null>, limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = String(value || '').trim()
    if (!text) continue
    if (seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function buildGraphRagSummaryPayload(
  lang: 'ko' | 'en',
  matrixReport: FusionReport,
  graphRagEvidence: NonNullable<AIPremiumReport['graphRagEvidence']>,
  signalSynthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined
): GraphRagSummaryPayload {
  const graphSummary = summarizeGraphRAGEvidence(graphRagEvidence)
  const topInsightTitles = uniqueStrings(
    (matrixReport.topInsights || []).map((item) => item.title),
    5
  )
  const claimFallback = uniqueStrings(
    (signalSynthesis?.claims || []).map((claim) => claim.thesis),
    5
  )
  const anchorFallback = uniqueStrings(
    (graphRagEvidence.anchors || []).map((anchor) =>
      lang === 'ko' ? `${anchor.section} 섹션 교차 근거` : `${anchor.section} cross evidence`
    ),
    5
  )
  const topInsights =
    topInsightTitles.length > 0
      ? topInsightTitles
      : claimFallback.length > 0
        ? claimFallback
        : anchorFallback

  const strengthSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => signal.polarity === 'strength')
    .slice(0, 3)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} 상승 근거: ${signal.keyword || signal.rowKey}`
      }
      return `${domain} upside signal: ${signal.keyword || signal.rowKey}`
    })
  const strategyDrivers = (strategyEngine?.domainStrategies || []).slice(0, 3).map((strategy) => {
    if (lang === 'ko') {
      return `${toKoreanDomainLabel(strategy.domain)} ${strategy.phaseLabel}, 공격 ${strategy.attackPercent}% / 방어 ${strategy.defensePercent}%`
    }
    return `${strategy.domain} ${strategy.phaseLabel}, offense ${strategy.attackPercent}% / defense ${strategy.defensePercent}%`
  })
  const drivers = uniqueStrings(
    [
      ...strengthSignals,
      ...strategyDrivers,
      ...(signalSynthesis?.claims || []).map((claim) =>
        lang === 'ko'
          ? `${toKoreanDomainLabel(claim.domain)}: ${claim.thesis}`
          : `${claim.domain}: ${claim.thesis}`
      ),
    ],
    6
  )

  const cautionSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => signal.polarity === 'caution')
    .slice(0, 4)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} 주의: ${signal.keyword || signal.rowKey} 신호는 확정 전 재확인이 필요합니다.`
      }
      return `${domain} caution: ${signal.keyword || signal.rowKey} requires recheck before commitment.`
    })
  const cautionSections = graphSummary?.cautionSections || []
  const cautionFromSections = cautionSections.map((section) =>
    lang === 'ko'
      ? `${section} 섹션은 교차 근거 신뢰가 낮아 검증 중심으로 운영해야 합니다.`
      : `${section} section has lower cross-evidence trust and should run verification-first.`
  )
  const trustCaution =
    (graphSummary?.lowTrustSetCount || 0) > 0
      ? [
          lang === 'ko'
            ? `저신뢰 교차 세트 ${graphSummary?.lowTrustSetCount || 0}건이 있어 서명/확정/즉시결정은 보수적으로 처리하세요.`
            : `There are ${graphSummary?.lowTrustSetCount || 0} low-trust cross sets, so keep sign/finalize decisions conservative.`,
        ]
      : []

  const cautions = uniqueStrings([...cautionSignals, ...cautionFromSections, ...trustCaution], 6)

  return {
    topInsights,
    drivers:
      drivers.length > 0
        ? drivers
        : [
            lang === 'ko'
              ? '핵심 근거는 상승 신호와 국면 전략을 함께 확인하며 실행해야 합니다.'
              : 'Use both upside signals and phase strategy together for execution.',
          ],
    cautions:
      cautions.length > 0
        ? cautions
        : [
            lang === 'ko'
              ? '근거 신뢰가 낮은 구간은 확정 전에 체크리스트 검증을 먼저 적용하세요.'
              : 'When evidence trust is low, apply checklist verification before commitment.',
          ],
    trust: {
      avgOverlapScore: graphSummary?.avgOverlapScore || 0,
      avgOrbFitScore: graphSummary?.avgOrbFitScore || 0,
      highTrustSetCount: graphSummary?.highTrustSetCount || 0,
      lowTrustSetCount: graphSummary?.lowTrustSetCount || 0,
      totalSets: graphSummary?.totalSets || 0,
    },
    cautionSections,
  }
}

function humanizeCrossSetFact(set: GraphRAGCrossEvidenceSet): string {
  const pairMatch = set.astrologyEvidence.match(/^([A-Za-z]+)-([a-z]+)-([A-Za-z]+)/i)
  const p1 = pairMatch?.[1] || '행성'
  const aspectRaw = (pairMatch?.[2] || '').toLowerCase()
  const p2 = pairMatch?.[3] || '행성'
  const aspectKoMap: Record<string, string> = {
    conjunction: '합으로 만납니다',
    opposition: '대립으로 충돌 포인트가 생기기 쉽습니다',
    square: '각을 세우며 압박을 줍니다',
    trine: '자연스럽게 조화를 이룹니다',
    sextile: '부드럽게 기회를 엽니다',
    quincunx: '조정이 필요한 구간이 자주 생깁니다',
  }
  const aspectKo = aspectKoMap[aspectRaw] || '영향을 줍니다'
  const domains = set.overlapDomains.map(toKoreanDomainLabel).join(', ')
  return `${p1}과 ${p2} 흐름은 ${aspectKo}. ${domains} 쪽은 방향이 또렷해지기 쉽습니다.`
}

function extractTopMatrixFacts(matrixReport: FusionReport, sectionKey: string): string[] {
  const domainBySection: Record<string, string[]> = {
    introduction: ['personality', 'timing'],
    personalityDeep: ['personality'],
    careerPath: ['career', 'wealth'],
    relationshipDynamics: ['relationship'],
    wealthPotential: ['wealth', 'career'],
    healthGuidance: ['health'],
    lifeMission: ['spirituality', 'personality'],
    timingAdvice: ['timing'],
    actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
    conclusion: ['personality', 'timing'],
  }
  const targets = new Set(domainBySection[sectionKey] || ['personality'])
  return matrixReport.topInsights
    .filter((item) => targets.has(item.domain))
    .slice(0, 3)
    .map(
      (item) =>
        `${item.title} 흐름이 이어집니다. 지금은 ${toKoreanDomainLabel(item.domain)} 쪽 선택이 더 중요합니다.`
    )
}

function buildStrategyFactsForSection(
  strategyEngine: StrategyEngineResult | undefined,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string[] {
  if (!strategyEngine) return []
  const domains = getDomainsForSection(sectionKey)
  const candidates = strategyEngine.domainStrategies
    .filter((strategy) => domains.includes(strategy.domain))
    .slice(0, 2)
  if (candidates.length === 0) return []
  const lines: string[] = []
  for (const strategy of candidates) {
    const key = `${strategy.domain}:${strategy.phase}`
    const koActionByKey: Record<string, string> = {
      'career:expansion': '핵심 과제 1~2개를 먼저 완료하고 외부 확정은 체크리스트 후 진행하세요.',
      'career:high_tension_expansion': '결론은 내되 서명·발송은 24시간 재확인 슬롯 뒤로 미루세요.',
      'relationship:expansion_guarded': '대화는 늘리고 확정 발언은 늦춰 해석 오차 비용을 낮추세요.',
      'wealth:expansion_guarded': '금액·기한·취소조건 3항을 먼저 고정하고 실행 규모를 분할하세요.',
      'health:defensive_reset': '과속을 멈추고 수면·수분·회복 루틴부터 복구하세요.',
      'timing:high_tension_expansion':
        '결정 시점과 실행 시점을 분리해 커뮤니케이션 리스크를 줄이세요.',
    }
    const enActionByKey: Record<string, string> = {
      'career:expansion':
        'Finish 1-2 core tasks first, then commit externally after checklist pass.',
      'career:high_tension_expansion':
        'Decide now, but push signing/sending behind a 24h recheck slot.',
      'relationship:expansion_guarded':
        'Increase dialogue and delay final statements to reduce interpretation errors.',
      'wealth:expansion_guarded':
        'Lock amount/deadline/cancellation terms first and split position size.',
      'health:defensive_reset': 'Stop overspeed and restore sleep-hydration-recovery blocks first.',
      'timing:high_tension_expansion':
        'Separate decision timing from execution timing to reduce communication risk.',
    }
    const phaseAction =
      lang === 'ko'
        ? koActionByKey[key] || '국면별 조건을 분리해 실행하고 확정 전 재확인을 유지하세요.'
        : enActionByKey[key] || 'Run staged execution with recheck gates before commitment.'

    if (lang === 'ko') {
      lines.push(
        `${toKoreanDomainLabel(strategy.domain)} 국면은 ${strategy.phaseLabel}이며 공격 ${strategy.attackPercent}% / 방어 ${strategy.defensePercent}% 운영이 적합합니다.`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    } else {
      lines.push(
        `${strategy.domain} is in ${strategy.phaseLabel} with offense ${strategy.attackPercent}% / defense ${strategy.defensePercent}%.`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    }
  }
  return lines
}

function buildSectionFactPack(
  sectionKey: keyof AIPremiumReport['sections'],
  anchor: GraphRAGEvidenceAnchor | undefined,
  matrixReport: FusionReport,
  input: MatrixCalculationInput,
  signalSynthesis?: SignalSynthesisResult,
  strategyEngine?: StrategyEngineResult,
  lang: 'ko' | 'en' = 'ko'
): string[] {
  const bullets: string[] = []
  if (input.dayMasterElement) {
    bullets.push(
      `타고난 구조상 ${input.dayMasterElement} 일간은 방향을 먼저 잡을 때 흔들림이 줄기 쉽습니다.`
    )
  }
  if (input.geokguk) {
    bullets.push(
      `타고난 구조상 ${input.geokguk} 성향은 역할과 책임을 분명히 할수록 성과가 올라가기 쉽습니다.`
    )
  }
  if (input.yongsin) {
    bullets.push(
      `용신이 ${input.yongsin} 쪽이면 생활 리듬을 그쪽으로 맞출 때 체감이 빨라지기 쉽습니다.`
    )
  }

  const topSets = [...(anchor?.crossEvidenceSets || [])]
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, 2)
  for (const set of topSets) {
    bullets.push(humanizeCrossSetFact(set))
  }

  bullets.push(...buildSynthesisFactsForSection(signalSynthesis, sectionKey, lang))
  bullets.push(...buildStrategyFactsForSection(strategyEngine, sectionKey, lang))
  bullets.push(...extractTopMatrixFacts(matrixReport, sectionKey))

  const activeTransits = (input.activeTransits || []).slice(0, 2)
  if (activeTransits.length > 0) {
    bullets.push(
      `현재는 ${activeTransits.join(', ')} 영향이 겹쳐 결정 속도를 조절하는 쪽이 낫습니다.`
    )
  }
  if (
    input.currentDaeunElement ||
    input.currentSaeunElement ||
    input.currentWolunElement ||
    input.currentIljinElement ||
    input.currentIljinDate
  ) {
    bullets.push(
      `대운/세운/월운/일진 신호가 함께 움직이는 구간이라 단기 감정보다 단계별 계획을 우선하는 쪽이 낫습니다.`
    )
  }

  return bullets
    .map((line) => line.trim())
    .filter((line, idx, arr) => line.length > 0 && arr.indexOf(line) === idx)
    .slice(0, 12)
}

function buildSectionPrompt(
  sectionKey: keyof AIPremiumReport['sections'],
  factPack: string[],
  lang: 'ko' | 'en',
  draftText?: string,
  targetMinChars?: number
): string {
  const facts = factPack.map((fact) => `- ${fact}`).join('\n')
  const concreteNouns = SECTION_CONCRETE_NOUNS[sectionKey].join(', ')
  const minChars = Math.max(220, Math.floor(targetMinChars || (lang === 'ko' ? 420 : 320)))
  const longForm = minChars >= (lang === 'ko' ? 600 : 450)
  if (lang === 'ko') {
    return [
      '당신은 사주+점성 통합 상담가입니다.',
      `섹션 이름: ${sectionKey}`,
      '스타일 규칙:',
      '- 첫 문장은 결론형으로 시작하되, 시작 표현을 섹션마다 다르게 씁니다.',
      '- 쉬운 한국어 설명문으로 씁니다.',
      longForm ? '- 문장 길이는 22~60자로 맞춥니다.' : '- 문장 길이는 15~35자로 맞춥니다.',
      longForm ? '- 문단마다 8~14문장으로 작성합니다.' : '- 문단마다 4~7문장으로 작성합니다.',
      `- 이 섹션은 최소 ${minChars}자 이상으로 작성합니다.`,
      '- 구체 명사를 최소 2개 포함합니다.',
      `- 이 섹션 명사 후보: ${concreteNouns}`,
      '- 과장/공포 조장 금지. 근거가 있을 때만 단정합니다.',
      '- 불릿/번호 목록 없이 자연 문단으로 작성합니다.',
      '- 같은 의미 문장을 반복하지 말고, 각 문장은 새 정보 1개 이상 포함합니다.',
      '- 조언형 문장(좋습니다/유의하셔야 합니다)은 최대 2문장만 사용합니다.',
      draftText
        ? '아래 초안을 보강해 더 정교하게 완성합니다.'
        : '아래 사실 묶음만으로 섹션을 작성합니다.',
      '사실 묶음:',
      facts,
      draftText ? `초안:\n${draftText}` : '',
      'JSON으로만 반환: {"text":"..."}',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You are a combined Saju+Astrology counselor.',
    `Section: ${sectionKey}`,
    'Style rules:',
    '- Start with a direct conclusion, but vary opening expressions by section.',
    longForm
      ? '- Use medium-length declarative sentences with concrete detail and context.'
      : '- Use concise declarative sentences with concrete details.',
    longForm
      ? '- Write 8-14 connected sentences for this section.'
      : '- Write 4-7 connected sentences for this section.',
    `- This section must be at least ${minChars} characters.`,
    '- No hype, no absolutes, and no fear language.',
    '- No bullet or numbered output; prose paragraphs only.',
    '- Avoid repeating semantically equivalent sentences.',
    draftText
      ? 'Refine the draft with stronger depth and precision.'
      : 'Write only from the fact pack below.',
    'Fact pack:',
    facts,
    draftText ? `Draft:\n${draftText}` : '',
    'Return JSON only: {"text":"..."}',
  ]
    .filter(Boolean)
    .join('\n')
}

function summarizeTopInsightsByCategory(
  report: FusionReport,
  categories: Array<'strength' | 'opportunity' | 'balance' | 'caution' | 'challenge'>,
  lang: 'ko' | 'en',
  limit = 3
): string {
  const rows = (report.topInsights || [])
    .filter((item) => categories.includes(item.category))
    .slice(0, limit)
    .map((item) => (lang === 'ko' ? item.title : item.titleEn || item.title))
    .filter(Boolean)
  return rows.length > 0
    ? rows.join(', ')
    : lang === 'ko'
      ? '핵심 신호 정리 중'
      : 'Core signals in review'
}

function ensureLongSectionNarrative(base: string, minChars: number, extras: string[]): string {
  let out = String(base || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const uniqExtras = [...new Set(extras.map((v) => String(v || '').trim()).filter(Boolean))]
  for (const extra of uniqExtras) {
    if (out.length >= minChars) break
    if (out.includes(extra)) continue
    out = `${out} ${extra}`.replace(/\s{2,}/g, ' ').trim()
  }
  return dedupeNarrativeSentences(out)
}

function sentenceKey(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 72)
    .toLowerCase()
}

function dedupeNarrativeSentences(text: string): string {
  if (!text) return ''
  const raw = text
    .replace(/\s{2,}/g, ' ')
    .split(/(?<=[.!?]|다\.)\s+/u)
    .map((line) => line.trim())
    .filter(Boolean)
  if (raw.length <= 1) return text
  const seen = new Set<string>()
  const kept: string[] = []
  for (const sentence of raw) {
    const key = sentenceKey(sentence)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(sentence)
  }
  return kept
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sanitizeUserFacingNarrative(text: string): string {
  const normalized = String(text || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!normalized) return normalized
  const sentences = splitSentences(normalized)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (sentences.length === 0) return normalized
  const filtered = sentences.filter((sentence) => !USER_FACING_NOISE_REGEX.test(sentence))
  const base = filtered.length >= Math.min(3, sentences.length) ? filtered : sentences
  const cleaned = base
    .map((sentence) =>
      sentence
        .replace(USER_FACING_NOISE_REGEX, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join(' ')
    .replace(/(2주 실행 3단계:)\s*\1/g, '$1')
    .replace(/(Main:)\s*(Main:)/g, '$1')
    .replace(/(Alt:)\s*(Alt:)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return dedupeNarrativeSentences(cleaned)
}

function formatNarrativeParagraphs(text: string, lang: 'ko' | 'en'): string {
  const normalized = String(text || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!normalized) return normalized
  const sentences = splitSentences(normalized)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (sentences.length <= 4) return normalized
  const groupSize = lang === 'ko' ? 3 : 2
  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += groupSize) {
    chunks.push(sentences.slice(i, i + groupSize).join(' '))
  }
  return chunks
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sanitizeComprehensiveSectionsForUser(
  sections: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...sections }
  for (const key of COMPREHENSIVE_SECTION_KEYS) {
    const current = String(next[key] || '').trim()
    if (!current) continue
    const cleaned = sanitizeUserFacingNarrative(current)
    next[key] = formatNarrativeParagraphs(cleaned, 'ko')
  }
  return next
}

function normalizeDeterministicLine(line: string): string {
  return String(line || '')
    .replace(/^#{1,6}\s*/g, '')
    .replace(/^[•\-*]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function collectNarrativeSupplementsFromBlocks(
  blocks: DeterministicSectionBlock[] | undefined,
  lang: 'ko' | 'en'
): string[] {
  if (!blocks || blocks.length === 0) return []
  const NOISY_FRAGMENT_REGEX =
    /(snapshot_|astrologysnapshot|sajusnapshot|crosssnapshot|스냅샷|=object\(|array\(|COV:|I\d+:|L\d+:|EVT_|matrix_|graphrag|crossEvidenceSets|insight_\d+|근거\s*id|claimid|signalid|anchorid|레이어:|코어\s*신호|보조\s*증거)/i
  const chunks: string[] = []
  for (const block of blocks) {
    const heading = normalizeDeterministicLine(String(block.heading || ''))
    const lines = (block.bullets || [])
      .map((line) => normalizeDeterministicLine(String(line || '')))
      .filter((line) => line.length >= 14)
      .filter((line) => !NOISY_FRAGMENT_REGEX.test(line))
      .slice(0, 3)
    if (lines.length === 0) continue
    const composed = lines
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!composed) continue
    if (heading) {
      chunks.push(lang === 'ko' ? `${heading}: ${composed}` : `${heading}: ${composed}`)
      continue
    }
    chunks.push(composed)
  }
  return [...new Set(chunks)]
}

function renderDeterministicBlocksToSectionText(
  blocks: DeterministicSectionBlock[] | undefined
): string {
  if (!blocks || blocks.length === 0) return ''
  const parts = blocks
    .map((block) => {
      const heading = String(block.heading || '').trim()
      const prose = (block.bullets || [])
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (!heading && !prose) return ''
      if (!heading) return prose
      if (!prose) return heading
      return `${heading}\n${prose}`
    })
    .filter(Boolean)
  return parts.join('\n\n').trim()
}

function mergeComprehensiveDraftWithBlocks(
  fallback: AIPremiumReport['sections'],
  blocksBySection: Record<string, DeterministicSectionBlock[]> | undefined,
  lang: 'ko' | 'en'
): AIPremiumReport['sections'] {
  const merged: AIPremiumReport['sections'] = { ...fallback }
  if (!blocksBySection) return merged
  const minCharsPerSection = lang === 'ko' ? 1250 : 950
  for (const key of COMPREHENSIVE_SECTION_KEYS) {
    const baseText = String(fallback[key] || '').trim()
    if (lang === 'ko' && baseText.length >= 1150) {
      merged[key] = baseText
      continue
    }
    const supplements = collectNarrativeSupplementsFromBlocks(blocksBySection[key], lang)
    if (supplements.length === 0) continue
    merged[key] = ensureLongSectionNarrative(fallback[key], minCharsPerSection, supplements)
  }
  return merged
}

function buildComprehensiveFallbackSections(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  lang: 'ko' | 'en',
  signalSynthesis?: SignalSynthesisResult
): AIPremiumReport['sections'] {
  const synthesisNarrative =
    signalSynthesis && signalSynthesis.claims.length > 0
      ? generateNarrativeSectionsFromSynthesis({
          lang,
          matrixInput: input,
          synthesis: signalSynthesis,
        })
      : null
  const strengths = summarizeTopInsightsByCategory(
    matrixReport,
    ['strength', 'opportunity'],
    lang,
    3
  )
  const cautions = summarizeTopInsightsByCategory(matrixReport, ['caution', 'challenge'], lang, 3)
  const topDomains = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((d) => `${d.domain}(${d.score})`)
    .join(', ')
  const profileCtx = input.profileContext || {}
  const profileLine =
    lang === 'ko'
      ? [profileCtx.birthDate, profileCtx.birthTime, profileCtx.birthCity]
          .filter(Boolean)
          .join(' / ')
      : [profileCtx.birthDate, profileCtx.birthTime, profileCtx.birthCity]
          .filter(Boolean)
          .join(' / ')
  const geokgukLine = input.geokguk
    ? lang === 'ko'
      ? `격국은 ${input.geokguk}으로 해석되며`
      : `The frame is interpreted as ${input.geokguk},`
    : ''
  const yongsinLine = input.yongsin
    ? lang === 'ko'
      ? `용신은 ${input.yongsin} 축에 가깝습니다.`
      : `and the useful element aligns with ${input.yongsin}.`
    : ''

  if (lang === 'ko') {
    const koSections: AIPremiumReport['sections'] = {
      introduction: `오늘 흐름은 “좋은 카드가 손에 들어왔지만, 내는 순서를 잘 잡아야 이기는 판”에 가깝습니다. 사주 일간 ${input.dayMasterElement}와 점성 핵심 신호를 겹쳐 보면, 밀어도 되는 축은 ${strengths}, 브레이크를 걸어야 하는 축은 ${cautions}로 정리됩니다. 한 줄 결론은 단순합니다. 속도로 이기려 하지 말고, 정확한 순서로 이기는 날입니다.`,
      personalityDeep: `당신의 기본 엔진은 빠른 판단력과 구조화 능력입니다. 그래서 시작은 누구보다 빠른데, 가끔은 확인 단계가 짧아져서 “좋은 선택을 아쉽게 마무리”하는 순간이 생깁니다. 오늘은 감으로 먼저 뛰기보다, 결론 1줄과 근거 1줄을 먼저 적고 움직이면 실수 비용이 크게 줄어듭니다.`,
      careerPath: `커리어 상위 지표는 ${topDomains || 'career(평가 중)'}이고, 지금은 “넓게 벌리기”보다 “깊게 닫기”가 이득인 타이밍입니다. 회의가 길어지는 날일수록 새 일 3개보다 완료 1개가 커리어 체급을 올립니다. 특히 협업 건은 역할·마감·책임을 먼저 고정할수록, 다음 기회에서 당신의 협상력이 선명하게 올라갑니다.`,
      relationshipDynamics: `관계에서는 말의 양보다 해석의 정확도가 승부를 냅니다. 같은 문장도 타이밍이 어긋나면 압박으로 들릴 수 있으니, 결론을 던지기 전에 “내가 이해한 게 맞는지” 한 줄로 맞춰보세요. 가까운 관계일수록 이 작은 확인이 감정 소모를 줄이고 신뢰를 빠르게 회복시킵니다.`,
      wealthPotential: `돈 흐름은 기회와 경계가 동시에 켜져 있습니다. 즉, 벌 수 있는 문은 열려 있지만, 조건을 대충 보면 새는 구멍도 함께 커지는 국면입니다. 지출·계약·투자 모두 금액, 기한, 취소 조건만 따로 떼어 확인해도 손실 확률이 눈에 띄게 내려갑니다.`,
      healthGuidance: `에너지는 단거리 스퍼트에 강한 편이라, 몰입 후 회복이 늦어질 때 컨디션 낙폭이 커질 수 있습니다. 오늘은 강한 루틴 하나보다 “짧은 회복 루틴 3번”이 더 효율적입니다. 수면, 수분, 호흡처럼 작지만 반복 가능한 기준을 지키면 집중력의 바닥이 올라갑니다.`,
      lifeMission: `장기적으로 당신의 힘은 한 번의 대박보다 “신뢰가 쌓이는 반복”에서 나옵니다. 기준을 설명할 수 있는 사람은 결국 큰 선택도 맡게 됩니다. 오늘의 작은 일관성이 1년 뒤의 큰 기회로 연결된다는 관점으로 움직이면 방향이 흔들리지 않습니다.`,
      timingAdvice: `결정 코어는 ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict}(${deterministicCore.decision.score}점)` : '일반 모드'}입니다. 강점 신호(${strengths})가 뜨는 구간은 실행 속도를 높이고, 주의 신호(${cautions})가 걸린 구간은 확정 전 이중 확인을 넣으세요. 특히 문서·합의·대외 전달은 “초안-검토-확정” 3단계로 쪼개면 결과가 훨씬 안정됩니다.`,
      actionPlan: `오늘 플랜은 세 줄이면 충분합니다. 1) 반드시 닫을 결과물 1개, 2) 외부 전달 전 재확인 1개, 3) 오늘 확정하지 않을 보류 1개. 이 구조만 지켜도 하루가 끝났을 때 “많이 한 느낌”이 아니라 “남는 결과”가 생깁니다.`,
      conclusion: `이번 흐름의 승부 포인트는 재능이 아니라 운영입니다. 밀어야 할 때는 분명히 밀고, 확인해야 할 때는 반드시 멈추는 리듬만 지켜도 체감 성과가 달라집니다. 같은 패턴을 2주만 유지하면 운의 변동이 줄고 결과의 재현성이 올라갑니다.`,
    }

    const extraBySection: Record<keyof AIPremiumReport['sections'], string[]> = {
      introduction: [
        profileLine
          ? `기준 프로필은 ${profileLine}이며, 같은 입력에서는 같은 핵심 클레임과 같은 전략 국면이 유지됩니다.`
          : '기준 프로필 입력이 완전할수록 섹션별 근거 밀도와 실행 정확도가 함께 올라갑니다.',
        [geokgukLine, yongsinLine].filter(Boolean).join(' '),
        '실전에서는 “무엇을 더 할지”보다 “무엇을 오늘 안 할지”를 먼저 정하면 집중력이 살아납니다.',
        '오전에는 생산, 오후에는 검토처럼 역할을 분리하면 체감 피로 대비 성과가 좋아집니다.',
        '작은 실수 하나가 일정 전체를 흔들 수 있는 날이므로, 체크리스트 한 장이 생각보다 큰 차이를 만듭니다.',
      ],
      personalityDeep: [
        '스스로의 리듬을 관리하는 가장 쉬운 방법은 하루 종료 전에 결정 로그를 3줄 남기는 것입니다.',
        '이 패턴이 쌓이면 감정이 요동치는 날에도 선택의 품질이 무너지지 않습니다.',
        '당신의 강점은 빠른 출발보다, 빠른 출발 뒤에도 방향을 바로잡는 복원력에 있습니다.',
      ],
      careerPath: [
        '특히 일정이 복잡한 주에는 “새 착수 1개, 기존 마감 2개”처럼 닫힘 비율을 높이는 운영이 유리합니다.',
        '상대가 많은 프로젝트일수록 책임 경계를 선명하게 그어야 갈등 비용을 줄일 수 있습니다.',
        '성과는 종종 아이디어 수가 아니라 완료된 결과물의 밀도에서 평가된다는 점을 기억하면 좋습니다.',
      ],
      relationshipDynamics: [
        '대화가 길어질수록 핵심은 흐려지기 쉽기 때문에, 중요한 말은 짧게 요약해 합의 지점을 먼저 맞추세요.',
        '감정이 높은 순간에 결론을 내리기보다 템포를 늦추는 선택이 오히려 관계를 빠르게 안정시킵니다.',
        '오늘은 “내가 맞다”보다 “우리가 같은 이해를 갖고 있나”를 묻는 쪽이 훨씬 강한 선택입니다.',
      ],
      wealthPotential: [
        '수익 기회가 보일수록 조건 검토를 더 엄격하게 하는 습관이 장기 성과를 지켜줍니다.',
        '같은 금액이라도 기한과 취소 조항이 다르면 리스크가 완전히 달라질 수 있습니다.',
        '이번 사이클은 공격보다 방어를 먼저 두는 설계가 결과적으로 더 큰 여유를 만듭니다.',
      ],
      healthGuidance: [
        '컨디션이 떨어지기 전에 짧은 회복 루틴을 먼저 넣으면 하루 전체의 집중도가 유지됩니다.',
        '강도 높은 하루 뒤에는 반드시 회복 시간을 일정에 고정해 누적 피로를 끊어내세요.',
        '건강 관리는 의지의 문제가 아니라 배치의 문제라는 관점이 이번 흐름에서 특히 중요합니다.',
      ],
      lifeMission: [
        '큰 목표를 세우는 것보다 매주 지킬 수 있는 원칙 2~3개를 유지하는 쪽이 실제 변화로 이어집니다.',
        '장기 운은 단기 성과의 합계가 아니라, 흔들릴 때 복귀하는 습관의 품질에서 갈립니다.',
        '결국 당신의 방향성은 화려한 선언보다 반복 가능한 선택 기준으로 증명됩니다.',
      ],
      timingAdvice: [
        '오늘-이번 주-이번 달의 시간축을 분리해서 보면, 급한 일과 중요한 일을 동시에 살릴 수 있습니다.',
        '특히 오늘은 실행은 빠르게, 확정은 한 템포 늦게 두는 전략이 가장 안전합니다.',
        '타이밍 운용의 포인트는 완벽한 예측이 아니라 오류 비용을 줄이는 구조를 먼저 세우는 데 있습니다.',
      ],
      actionPlan: [
        '실행 순서를 단순화하면 판단 피로가 줄어들고 실제 행동 전환률이 올라갑니다.',
        '하루 마지막 10분에 “완료/보류/재확인”만 정리해도 다음 날의 시작 속도가 달라집니다.',
        '중요한 건 계획을 많이 세우는 게 아니라, 계획을 끝까지 지킬 수 있게 설계하는 것입니다.',
      ],
      conclusion: [
        '이번 국면은 재능보다 루틴이 승패를 가르는 시기입니다.',
        '작은 기준을 반복해 운용하면 결과가 안정되고, 안정된 결과가 다시 자신감을 만듭니다.',
        '그래서 지금 필요한 건 새로운 비법이 아니라, 이미 잡은 원칙을 끝까지 밀어붙이는 힘입니다.',
      ],
    }

    const base = koSections
    return {
      introduction: ensureLongSectionNarrative(base.introduction, 900, [
        ...extraBySection.introduction,
      ]),
      personalityDeep: ensureLongSectionNarrative(base.personalityDeep, 900, [
        ...extraBySection.personalityDeep,
      ]),
      careerPath: ensureLongSectionNarrative(base.careerPath, 900, [...extraBySection.careerPath]),
      relationshipDynamics: ensureLongSectionNarrative(base.relationshipDynamics, 900, [
        ...extraBySection.relationshipDynamics,
      ]),
      wealthPotential: ensureLongSectionNarrative(base.wealthPotential, 900, [
        ...extraBySection.wealthPotential,
      ]),
      healthGuidance: ensureLongSectionNarrative(base.healthGuidance, 900, [
        ...extraBySection.healthGuidance,
      ]),
      lifeMission: ensureLongSectionNarrative(base.lifeMission, 900, [
        ...extraBySection.lifeMission,
      ]),
      timingAdvice: ensureLongSectionNarrative(base.timingAdvice, 900, [
        ...extraBySection.timingAdvice,
      ]),
      actionPlan: ensureLongSectionNarrative(base.actionPlan, 900, [...extraBySection.actionPlan]),
      conclusion: ensureLongSectionNarrative(base.conclusion, 900, [...extraBySection.conclusion]),
    }
  }

  return {
    introduction: `This report was generated in deterministic safety mode. It prioritizes actionable overlap between your Saju day master ${input.dayMasterElement} and core astrology signals. Strength signals are summarized as ${strengths}, while caution signals are summarized as ${cautions}.`,
    personalityDeep: `Your baseline pattern combines fast decision rhythm with analytical framing. The upside is decisive execution; the downside is premature commitment without verification. Separate decision timing from commitment timing to keep quality high under pressure.`,
    careerPath: `Top domain indicators are ${topDomains || 'career(under review)'}. Your best pattern is narrow-and-finish execution: complete one or two core deliverables before expansion. In collaboration, lock scope and deadline first to reduce variance.`,
    relationshipDynamics: `In relationships, alignment quality matters more than intensity. Keep statements concise and add one confirmation question to reduce interpretation drift. In close ties, context-first dialogue is safer than fast conclusions.`,
    wealthPotential: `Financially, opportunity and caution signals coexist, so avoid commitment based on upside alone. Prioritize spend control, cashflow visibility, and term verification. For large decisions, a 24-hour recheck window is usually protective.`,
    healthGuidance: `Your energy pattern tends to run in bursts with delayed recovery. Stabilize sleep, hydration, and routine before scaling workload. On overloaded days, prioritize review tasks with high error cost over raw volume.`,
    lifeMission: `Your long-term leverage comes from compounding trust, not short spikes. Explain your criteria clearly and keep execution logs. Consistent quality beats impulsive wins and narrows outcome volatility.`,
    timingAdvice: `Deterministic decision status is ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict} (${deterministicCore.decision.score})` : 'general mode'}. Use high-signal windows (${strengths}) for execution, and route caution zones (${cautions}) through verification before commitment.`,
    actionPlan: `Use a three-step execution loop today. First, define one must-finish deliverable. Second, verify terms, deadline, and ownership in one line before external communication. Third, commit only what must close today and move the rest into a recheck slot.`,
    conclusion: `This output is an intentionally conservative, consistency-first report. Move fast in strength zones and never skip verification in caution zones. Keeping this pattern for two weeks will materially improve result repeatability.`,
  }
}

function buildSynthesisPromptBlock(
  synthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  lang: 'ko' | 'en',
  mode: 'timing' | 'themed',
  theme?: ReportTheme
): string {
  if (!synthesis || synthesis.claims.length === 0) return ''
  const themeDomainMap: Record<ReportTheme, string[]> = {
    love: ['relationship', 'personality'],
    career: ['career', 'wealth'],
    wealth: ['wealth', 'career'],
    health: ['health', 'timing'],
    family: ['relationship', 'personality'],
  }
  const preferredDomains =
    mode === 'timing'
      ? ['timing', 'career', 'relationship', 'wealth', 'health']
      : themeDomainMap[theme || 'career']
  const pickedClaims = synthesis.claims
    .filter((claim) => preferredDomains.includes(claim.domain))
    .slice(0, 4)
  const claims = pickedClaims.length > 0 ? pickedClaims : synthesis.claims.slice(0, 3)
  const claimLines = claims.map((claim) => {
    const evidence = claim.evidence
      .slice(0, 2)
      .map((id) => synthesis.signalsById[id])
      .filter(Boolean)
      .map((signal) => `${signal.id}:${signal.keyword || signal.rowKey}`)
      .join(', ')
    if (lang === 'ko') {
      return `- ${claim.domain}: ${claim.thesis} | 근거: ${evidence || 'pending'} | 통제: ${claim.riskControl}`
    }
    return `- ${claim.domain}: ${claim.thesis} | evidence: ${evidence || 'pending'} | control: ${claim.riskControl}`
  })
  const strategyLines = (strategyEngine?.domainStrategies || [])
    .filter((item) => preferredDomains.includes(item.domain))
    .slice(0, 3)
    .map((item) =>
      lang === 'ko'
        ? `- 전략 ${item.domain}: ${item.phaseLabel}, 공격 ${item.attackPercent}% / 방어 ${item.defensePercent}% | thesis=${item.thesis}`
        : `- strategy ${item.domain}: ${item.phaseLabel}, offense ${item.attackPercent}% / defense ${item.defensePercent}% | thesis=${item.thesis}`
    )
  if (lang === 'ko') {
    return [
      '## Signal Synthesizer (고정 근거)',
      '- 아래 클레임과 근거 ID를 벗어나는 사실 추가 금지',
      '- 같은 도메인에서 상승/주의가 동시에 있으면 반드시 "상승 + 리스크관리"로 통합 서술',
      strategyEngine
        ? `- 전체 국면: ${strategyEngine.overallPhaseLabel}, 운영 비율 공격 ${strategyEngine.attackPercent}% / 방어 ${strategyEngine.defensePercent}%`
        : '',
      ...strategyLines,
      ...claimLines,
    ].join('\n')
  }
  return [
    '## Signal Synthesizer (fixed evidence)',
    '- Do not add facts beyond these claim/evidence IDs',
    '- If strength and caution coexist in a domain, synthesize as "upside + risk-control"',
    strategyEngine
      ? `- Overall phase: ${strategyEngine.overallPhaseLabel}, offense ${strategyEngine.attackPercent}% / defense ${strategyEngine.defensePercent}%`
      : '',
    ...strategyLines,
    ...claimLines,
  ].join('\n')
}

function buildTimingFallbackSections(
  input: MatrixCalculationInput,
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en'
): TimingReportSections {
  const claims = synthesis?.claims || []
  const pick = (domain: string) => claims.find((claim) => claim.domain === domain)
  const merge = (lead: string | undefined, body: string) =>
    lead && lead.trim().length > 0 ? `${lead} ${body}` : body
  const timing = pick('timing')
  const career = pick('career')
  const relation = pick('relationship')
  const wealth = pick('wealth')
  const health = pick('health')

  if (lang === 'ko') {
    const koSections: TimingReportSections = {
      overview: merge(
        timing?.thesis,
        '오늘 흐름은 확정 속도보다 재확인 순서가 중요합니다. 결론과 실행 시점을 분리하면 손실 가능성을 줄일 수 있습니다. 오전에는 핵심 과제 1개를 끝내는 데 집중하고, 오후에는 외부 공유 전 조건/기한/책임을 문서로 다시 확인하세요. 당일 확정이 필요한 항목과 보류 항목을 분리하면 판단 피로가 줄고 실수 비용도 낮아집니다.'
      ),
      energy: merge(
        health?.thesis,
        '에너지는 단기 집중 후 회복 관리가 핵심입니다. 수면·수분·루틴을 먼저 고정한 뒤 업무 볼륨을 늘리세요. 과속을 막기 위해 60~90분 집중 블록 뒤에 10분 회복 블록을 고정하면 생산성 편차가 줄어듭니다. 피로 신호가 올라올수록 새 일을 늘리기보다 진행 중인 일을 깔끔히 마무리하는 편이 성과를 지켜줍니다.'
      ),
      opportunities: merge(
        career?.thesis,
        '기회 구간에서는 핵심 과업 1~2개 완결 전략이 유리합니다. 확장 전에 역할과 책임을 먼저 정리하세요. 제안/협업은 범위를 좁혀 파일럿 형태로 시작하면 실패 비용을 줄이면서도 학습 속도를 높일 수 있습니다. 오늘은 실행 속도보다 완료 품질을 기준으로 우선순위를 정하면 다음 단계 확장이 훨씬 수월해집니다.'
      ),
      cautions: merge(
        relation?.riskControl,
        '커뮤니케이션 오차가 누적되면 성과가 흔들릴 수 있습니다. 대화/문서 전달 전 한 줄 요약 재확인을 넣으세요. 특히 숫자/기한/범위가 포함된 메시지는 송신 전 체크리스트를 거쳐야 오해를 줄일 수 있습니다. 감정이 올라온 상태에서는 즉시 확정 답변보다 시간차 응답이 결과적으로 관계 비용을 낮춥니다.'
      ),
      domains: {
        career: merge(
          career?.riskControl,
          '커리어는 일정·우선순위·마감 정의를 먼저 고정하는 운영이 안전합니다. 업무 요청이 많아질수록 “오늘 끝낼 일/이번 주 처리할 일/보류할 일”로 나눠 운영하면 완료율이 올라갑니다. 역할 경계를 문서로 남겨야 협업 충돌이 줄어듭니다.'
        ),
        love: merge(
          relation?.riskControl,
          '관계는 감정 속도보다 해석 일치가 먼저입니다. 확인 질문으로 오차를 줄이세요. 중요한 대화는 상대가 이해한 핵심을 한 문장으로 되짚게 하면 오해 누적을 막을 수 있습니다. 결론을 서두르기보다 맥락을 맞춘 뒤 합의점을 정하세요.'
        ),
        wealth: merge(
          wealth?.riskControl,
          '재정은 금액·기한·취소조건을 체크리스트로 검증한 뒤 확정하세요. 지출은 즉흥 결제보다 24시간 보류 규칙을 두면 후회 비용을 크게 줄일 수 있습니다. 현금흐름표를 짧게라도 업데이트하면 의사결정 정확도가 올라갑니다.'
        ),
        health: merge(
          health?.riskControl,
          '건강은 과속보다 회복 리듬 유지가 우선입니다. 피로 누적 신호를 선제적으로 차단하세요. 무리한 운동/수면 부족/카페인 과다 조합은 집중력 하락을 키울 수 있으니 피하는 것이 좋습니다. 회복 루틴을 일정에 먼저 배치하면 하루 품질이 안정됩니다.'
        ),
      },
      actionPlan:
        '오늘은 1) 끝낼 결과물 1개 정의 2) 외부 전달 전 조건·기한·책임 재확인 3) 당일 확정이 아닌 항목은 24시간 재검토 슬롯으로 이동의 3단계로 운영하세요. 이 루틴을 반복하면 실수율은 낮아지고, 같은 시간 대비 체감 성과는 높아집니다. 실행 기준은 “많이 하기”가 아니라 “완결도 높게 끝내기”로 잡는 것이 유리합니다.',
      luckyElements:
        '행운 요소는 속도보다 순서입니다. 먼저 재확인하고 이후 확정하세요. 오늘은 작은 승리를 빠르게 쌓기보다 핵심 한 건의 완성도를 높이는 방식이 전체 흐름을 안정시키는 데 더 효과적입니다. 계획을 좁히고 마감을 명확히 두면 체감 운의 흔들림이 줄어듭니다.',
    }

    const extra: Record<string, string[]> = {
      overview: [
        '핵심은 많이 처리하는 날이 아니라, 중요한 것을 정확히 닫는 날이라는 점입니다.',
        '오전은 생산 블록, 오후는 조정 블록으로 역할을 분리하면 하루의 밀도가 확실히 올라갑니다.',
      ],
      energy: [
        '에너지 관리가 무너지면 판단 품질이 먼저 떨어지므로, 회복 시간을 일정 안에 먼저 배치하는 운영이 필요합니다.',
        '집중 시간이 길어질수록 짧은 회복 간격을 의도적으로 넣어야 후반부 결정력이 유지됩니다.',
      ],
      opportunities: [
        '오늘 기회는 새 시작보다 기존 과업의 완결에서 더 크게 발생합니다.',
        '작게 검증하고 빠르게 보완하는 루프를 돌리면 확장 비용을 크게 낮출 수 있습니다.',
      ],
      cautions: [
        '특히 메시지/문서/합의처럼 기록이 남는 커뮤니케이션은 한 번 더 확인하는 습관이 필수입니다.',
        '감정이 올라온 순간의 즉시 확정은 피하고, 시간차 응답으로 판단 오차를 줄이세요.',
      ],
      career: [
        '커리어 신뢰는 화려한 시작보다 누락 없는 마감에서 쌓입니다.',
        '오늘은 새로운 약속을 늘리기보다 기존 책임을 선명하게 정리하는 쪽이 유리합니다.',
      ],
      love: [
        '관계에서는 이기려는 대화보다 정확히 이해하는 대화가 장기적으로 훨씬 강합니다.',
        '짧은 확인 질문 하나가 길어진 갈등을 미리 끊어낼 수 있습니다.',
      ],
      wealth: [
        '재정은 기대수익보다 조건 통제가 먼저입니다.',
        '작은 지출이라도 기준을 통일하면 월말 변동성이 눈에 띄게 줄어듭니다.',
      ],
      health: [
        '건강은 컨디션이 나빠졌을 때 고치는 것보다, 나빠지기 전에 리듬을 유지하는 것이 훨씬 효율적입니다.',
        '오늘은 강한 루틴 하나보다 약한 루틴 여러 번이 실제 회복에 더 유리합니다.',
      ],
      actionPlan: [
        '실행 항목을 줄이면 집중이 살아나고, 집중이 살아나면 결과 품질이 올라갑니다.',
        '하루 종료 전 10분 리뷰만 고정해도 다음 날 출발 속도가 달라집니다.',
      ],
      luckyElements: [
        '오늘의 운은 감각보다 운영에서 갈립니다.',
        '결정과 확정을 분리하는 습관이 장기 성과를 보호해 줍니다.',
      ],
    }

    return {
      overview: ensureLongSectionNarrative(koSections.overview, 560, extra.overview),
      energy: ensureLongSectionNarrative(koSections.energy, 520, extra.energy),
      opportunities: ensureLongSectionNarrative(koSections.opportunities, 520, extra.opportunities),
      cautions: ensureLongSectionNarrative(koSections.cautions, 500, extra.cautions),
      domains: {
        career: ensureLongSectionNarrative(koSections.domains.career, 420, extra.career),
        love: ensureLongSectionNarrative(koSections.domains.love, 420, extra.love),
        wealth: ensureLongSectionNarrative(koSections.domains.wealth, 420, extra.wealth),
        health: ensureLongSectionNarrative(koSections.domains.health, 420, extra.health),
      },
      actionPlan: ensureLongSectionNarrative(koSections.actionPlan, 520, extra.actionPlan),
      luckyElements: ensureLongSectionNarrative(
        koSections.luckyElements || '',
        360,
        extra.luckyElements
      ),
    }
  }

  return {
    overview:
      timing?.thesis ||
      'Today favors verification order over commitment speed. Separate decision timing from execution timing.',
    energy:
      health?.thesis ||
      'Your energy pattern needs recovery-first pacing. Lock sleep, hydration, and routine before scaling workload.',
    opportunities:
      career?.thesis ||
      'High-yield windows reward narrow-and-finish execution. Lock scope and ownership before expansion.',
    cautions:
      relation?.riskControl ||
      'Communication drift can amplify loss. Add one-line confirmation before sending messages or documents.',
    domains: {
      career:
        career?.riskControl ||
        'For career, stabilize schedule, priorities, and deadlines before hard commitment.',
      love:
        relation?.riskControl ||
        'In relationships, alignment quality beats emotional speed. Use confirmation questions.',
      wealth:
        wealth?.riskControl ||
        'For money decisions, validate amount, due date, and cancellation terms before commit.',
      health:
        health?.riskControl ||
        'For health, preserve recovery rhythm and cut overdrive before fatigue compounds.',
    },
    actionPlan:
      'Execution sequence: 1) define one must-finish output, 2) verify scope/deadline/ownership before external delivery, 3) move non-urgent commitments into a 24h recheck slot.',
    luckyElements:
      'Your practical lucky element is disciplined sequencing: verify first, then commit.',
  }
}

function enforceThemedDepth(
  sections: ThemedReportSections,
  theme: ReportTheme
): ThemedReportSections {
  const extraByField: Record<string, string[]> = {
    deepAnalysis: [
      '핵심은 기질 자체보다 기질을 운용하는 순서를 정하는 데 있습니다.',
      '같은 재능도 실행 구조에 따라 결과 밀도가 크게 달라집니다.',
    ],
    patterns: [
      '상승 신호와 주의 신호가 동시에 있을 때는 공격과 방어를 분리하는 설계가 필수입니다.',
      '패턴을 읽는 목적은 예언이 아니라 손실을 줄이면서 기회를 확장하는 데 있습니다.',
    ],
    timing: [
      '오늘-이번 주-이번 달의 시간축을 분리하면 의사결정 품질이 크게 올라갑니다.',
      '시기를 맞춘다는 것은 기다리는 것이 아니라 순서를 설계하는 일에 가깝습니다.',
    ],
    strategy: [
      '전략은 화려한 선택보다 재현 가능한 반복으로 완성됩니다.',
      '실행 전에 기준을 문장으로 고정하면 돌발 변수 대응력이 높아집니다.',
    ],
    roleFit: [
      '역할 적합은 좋아 보이는 직함보다 실제 에너지 사용 방식과 맞아야 오래 갑니다.',
      '잘 맞는 포지션일수록 성과뿐 아니라 피로 회복 속도도 함께 좋아집니다.',
    ],
    turningPoints: [
      '전환점은 보통 기회 신호와 조정 신호가 동시에 나타나는 지점에서 발생합니다.',
      '변화를 크게 만들수록 기준을 더 단순하게 유지해야 흔들림이 줄어듭니다.',
    ],
    compatibility: [
      '궁합의 본질은 감정 크기보다 해석 정확도와 회복 속도에 있습니다.',
      '강한 끌림이 오래 가려면 소통 규칙이 먼저 합의되어야 합니다.',
    ],
    spouseProfile: [
      '잘 맞는 상대는 완벽한 사람이 아니라 기준을 공유할 수 있는 사람입니다.',
      '관계 안정성은 취향보다 갈등 처리 방식에서 갈리는 경우가 많습니다.',
    ],
    marriageTiming: [
      '관계 확정 시점은 감정 고조보다 생활 조건 정렬이 되었는지가 더 중요합니다.',
      '시간차 재확인은 확신을 약화시키는 것이 아니라 관계 리스크를 줄이는 절차입니다.',
    ],
    incomeStreams: [
      '수입 다각화는 채널 수보다 채널별 리스크 통제 수준이 성패를 가릅니다.',
      '작은 검증 루프를 반복하면 실패 비용은 낮추고 학습 속도는 높일 수 있습니다.',
    ],
    riskManagement: [
      '리스크 관리는 기회를 포기하는 것이 아니라 손실 상한을 정해 기회를 오래 유지하는 방법입니다.',
      '규칙 없는 공격은 성과를 흔들고, 규칙 있는 공격은 성과를 누적시킵니다.',
    ],
    prevention: [
      '예방은 문제가 생긴 뒤의 큰 조치보다, 평소의 작은 조정에서 더 높은 효율이 납니다.',
      '몸 상태는 의지보다 일정 배치의 영향을 크게 받습니다.',
    ],
    riskWindows: [
      '위험 구간은 대체로 일정 밀집과 커뮤니케이션 과부하가 동시에 나타날 때 커집니다.',
      '위험 구간의 핵심 대응은 강행이 아니라 강도 조절과 우선순위 재배치입니다.',
    ],
    recoveryPlan: [
      '회복 계획은 강도보다 지속성이 중요하며, 지킬 수 있는 기준이 오래 갑니다.',
      '루틴이 단순할수록 실제 유지율이 올라갑니다.',
    ],
    dynamics: [
      '가족 역학은 정답 찾기보다 서로의 해석 차이를 줄이는 과정에서 안정됩니다.',
      '짧고 정확한 대화를 반복하는 방식이 장기적으로 갈등 비용을 크게 줄입니다.',
    ],
    communication: [
      '소통의 질은 말의 양이 아니라 맥락과 결론을 분리하는 구조에서 올라갑니다.',
      '중요한 대화일수록 전달 전 요약 확인이 필요합니다.',
    ],
    legacy: [
      '유산은 자산만이 아니라 문제를 다루는 원칙이 다음 세대로 전달되는 방식입니다.',
      '기준 문서화를 습관화하면 관계 운영 품질이 안정됩니다.',
    ],
    actionPlan: [
      '실행 계획은 복잡한 프레임보다 실제 행동으로 전환되는 단순한 단계가 효과적입니다.',
      '핵심은 계획을 많이 세우는 것이 아니라 계획을 끝까지 지키는 구조입니다.',
    ],
  }

  const out: ThemedReportSections = { ...sections }
  out.deepAnalysis = ensureLongSectionNarrative(out.deepAnalysis, 560, extraByField.deepAnalysis)
  out.patterns = ensureLongSectionNarrative(out.patterns, 520, extraByField.patterns)
  out.timing = ensureLongSectionNarrative(out.timing, 520, extraByField.timing)
  out.actionPlan = ensureLongSectionNarrative(out.actionPlan, 520, extraByField.actionPlan)
  out.recommendations = (out.recommendations || []).map((line, idx) =>
    ensureLongSectionNarrative(line, 280, [
      `실행 전 체크포인트를 ${idx + 1}개라도 명확히 두면 결과 편차를 줄일 수 있습니다.`,
    ])
  )

  if (out.strategy)
    out.strategy = ensureLongSectionNarrative(out.strategy, 500, extraByField.strategy)
  if (out.roleFit) out.roleFit = ensureLongSectionNarrative(out.roleFit, 460, extraByField.roleFit)
  if (out.turningPoints) {
    out.turningPoints = ensureLongSectionNarrative(
      out.turningPoints,
      460,
      extraByField.turningPoints
    )
  }
  if (out.compatibility) {
    out.compatibility = ensureLongSectionNarrative(
      out.compatibility,
      500,
      extraByField.compatibility
    )
  }
  if (out.spouseProfile) {
    out.spouseProfile = ensureLongSectionNarrative(
      out.spouseProfile,
      460,
      extraByField.spouseProfile
    )
  }
  if (out.marriageTiming) {
    out.marriageTiming = ensureLongSectionNarrative(
      out.marriageTiming,
      420,
      extraByField.marriageTiming
    )
  }
  if (out.incomeStreams) {
    out.incomeStreams = ensureLongSectionNarrative(
      out.incomeStreams,
      440,
      extraByField.incomeStreams
    )
  }
  if (out.riskManagement) {
    out.riskManagement = ensureLongSectionNarrative(
      out.riskManagement,
      420,
      extraByField.riskManagement
    )
  }
  if (out.prevention) {
    out.prevention = ensureLongSectionNarrative(out.prevention, 440, extraByField.prevention)
  }
  if (out.riskWindows) {
    out.riskWindows = ensureLongSectionNarrative(out.riskWindows, 420, extraByField.riskWindows)
  }
  if (out.recoveryPlan) {
    out.recoveryPlan = ensureLongSectionNarrative(out.recoveryPlan, 420, extraByField.recoveryPlan)
  }
  if (out.dynamics)
    out.dynamics = ensureLongSectionNarrative(out.dynamics, 460, extraByField.dynamics)
  if (out.communication) {
    out.communication = ensureLongSectionNarrative(
      out.communication,
      420,
      extraByField.communication
    )
  }
  if (out.legacy) out.legacy = ensureLongSectionNarrative(out.legacy, 420, extraByField.legacy)

  void theme
  return out
}

function buildThemedFallbackSections(
  theme: ReportTheme,
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en'
): ThemedReportSections {
  const claims = synthesis?.claims || []
  const pick = (domain: string) => claims.find((claim) => claim.domain === domain)
  const merge = (lead: string | undefined, body: string) =>
    lead && lead.trim().length > 0 ? `${lead} ${body}` : body
  const career = pick('career')
  const relation = pick('relationship')
  const wealth = pick('wealth')
  const health = pick('health')
  const personality = pick('personality')
  const timing = pick('timing')

  const baseKo: ThemedReportSections = {
    deepAnalysis: merge(
      personality?.thesis,
      '핵심 성향은 빠른 판단과 검증 필요가 함께 작동하는 구조입니다. 확정 전 재확인 단계를 고정하면 변동성이 줄어듭니다. 강점은 판단 속도와 구조화 능력이며, 리스크는 과속 결론과 누락입니다. 따라서 결론을 내는 순간과 외부 확정을 하는 순간을 분리해 운영하면 성과의 재현성이 올라갑니다. 오늘은 감정 반응보다 실행 순서를 먼저 정해 리듬을 안정화하세요.'
    ),
    patterns:
      '반복 패턴은 상승 신호와 주의 신호가 동시에 나타나는 형태입니다. 따라서 "확장 + 리스크관리"를 하나의 전략으로 묶어 운영하는 것이 유리합니다. 상승 구간에서는 과업을 좁혀 완결률을 높이고, 주의 구간에서는 체크리스트로 손실을 먼저 막아야 합니다. 이 두 단계를 분리하면 같은 노력 대비 결과 편차가 줄어듭니다. 패턴의 핵심은 속도보다 순서, 직감보다 검증입니다.',
    timing: merge(
      timing?.thesis,
      '타이밍 전략은 당일 확정보다 단계적 검증에 강점이 있습니다. 오늘 결론, 내일 확정의 이중 단계가 안정적입니다. 대운/세운 흐름이 엇갈리는 구간에서는 착수는 가능하되 확정은 보수적으로 운영하는 편이 손실을 줄입니다. 중요한 문서/약속/결제는 최소 1회의 재확인 창을 둬야 오차를 줄일 수 있습니다. 타이밍은 빠른 시작보다 정확한 마감에서 차이가 납니다.'
    ),
    recommendations: [
      merge(
        career?.riskControl,
        '핵심 과업 1~2개를 먼저 완결하세요. 범위를 넓히기 전에 역할·기한·책임을 문서 한 줄로 고정하면 실행 오차를 크게 줄일 수 있습니다.'
      ),
      merge(
        relation?.riskControl,
        '대화/문서 전달 전 한 줄 요약 재확인을 넣으세요. 특히 감정이 개입되는 대화일수록 결론보다 해석 일치 확인을 먼저 해야 갈등 비용이 낮아집니다.'
      ),
      merge(
        wealth?.riskControl,
        '금액·기한·취소조건을 체크리스트로 검증하세요. 당일 확정 대신 24시간 보류 후 재검토하면 후회 비용과 누락 리스크를 동시에 줄일 수 있습니다.'
      ),
    ],
    actionPlan:
      '실행 순서는 1) 목표 1개 고정 2) 조건 재확인 3) 확정 분할입니다. 이 순서를 2주 유지하면 결과 재현성이 올라갑니다. 매일 종료 전에 “완료 1건 / 보류 1건 / 재확인 1건”을 기록하면 다음 날 의사결정 속도가 빨라집니다. 핵심은 많이 하는 것이 아니라, 중요한 것을 정확히 끝내는 것입니다.',
  }

  switch (theme) {
    case 'love':
      return enforceThemedDepth(
        {
          ...baseKo,
          compatibility: merge(
            relation?.thesis,
            '관계 궁합은 감정 강도보다 해석 일치 여부가 핵심입니다. 서로의 기대를 문장으로 맞추면 갈등 비용이 줄어듭니다. 서로 좋은 의도가 있어도 표현 속도가 다르면 오해가 생기기 쉬우므로, 중요한 대화는 요약 확인 단계를 넣는 편이 유리합니다. 강한 끌림과 안정성이 동시에 유지되려면 결론을 서두르지 말고 합의 기준을 먼저 맞춰야 합니다.'
          ),
          spouseProfile:
            '관계형 파트너와의 조합에서 장점이 커집니다. 다만 확정 속도가 빠르면 오해가 누적되므로 확인 질문 루틴이 필요합니다. 잘 맞는 상대일수록 작은 말실수도 크게 남을 수 있으니, 감정 표현과 사실 확인을 분리하는 대화 습관이 중요합니다. 장기적으로는 배려보다 구조가 관계를 지켜주는 순간이 많습니다.',
          marriageTiming: merge(
            timing?.riskControl,
            '중요 확정은 당일보다 24시간 검증 창을 둔 뒤 진행하는 방식이 더 안전합니다. 일정·예산·역할 분담을 문서로 먼저 맞추면 감정 변수에 흔들릴 확률이 낮아집니다. 타이밍이 좋을수록 더 신중하게 기준을 맞추는 것이 실제 만족도를 높입니다.'
          ),
        },
        theme
      )
    case 'career':
      return enforceThemedDepth(
        {
          ...baseKo,
          strategy: merge(
            career?.thesis,
            '커리어 전략은 폭넓은 시도보다 핵심 과업 완결 중심이 유리합니다. 역할·마감·책임의 명확화가 성과를 지킵니다. 상승 신호가 있어도 리스크 관리가 함께 필요하므로, 실행은 공격적으로 하되 확정은 단계적으로 진행하세요. 성과가 나는 사람의 공통점은 속도보다 누락 없는 마감 품질에 있습니다.'
          ),
          roleFit:
            '의사결정과 구조화가 필요한 포지션에서 강점이 큽니다. 단, 속도전보다 품질 검증 프로세스가 필수입니다. 리더/기획/운영처럼 기준을 정하고 조율하는 역할에서 특히 성과가 잘 납니다. 반대로 기준 없는 다중 업무는 에너지를 분산시키므로 업무 구조를 먼저 정리해야 합니다.',
          turningPoints: merge(
            timing?.thesis,
            '전환점은 상승 신호와 조정 신호가 동시에 들어오는 구간에서 나타납니다. 확장과 재정의를 병행하세요. 새로운 기회를 잡을 때 기존 방식의 일부를 정리해야 다음 레벨로 올라갈 수 있습니다. 전환기의 핵심은 “더 많이”가 아니라 “더 정확히”입니다.'
          ),
        },
        theme
      )
    case 'wealth':
      return enforceThemedDepth(
        {
          ...baseKo,
          strategy: merge(
            wealth?.thesis,
            '재정 전략은 수익 기대보다 현금흐름 안정과 조건 검증에 우선순위를 둬야 합니다. 기회가 있어도 리스크를 통제하지 못하면 누적 성과가 흔들릴 수 있으므로, 먼저 손실 상한을 정하고 그 안에서 실행해야 합니다. 수익률보다 생존률을 높이는 운영이 장기적으로 더 큰 결과를 만듭니다.'
          ),
          incomeStreams:
            '수입원 다각화는 가능하지만, 새 채널 확정은 소규모 검증 후 확대가 안전합니다. 파일럿 단계에서 고객 반응/비용 구조/회수 기간을 먼저 확인하면 실패 비용을 크게 줄일 수 있습니다. 작은 성공을 반복해 확장하는 방식이 현재 흐름과 잘 맞습니다.',
          riskManagement: merge(
            wealth?.riskControl,
            '지출 상한과 손절 규칙을 먼저 정하고 실행하세요. 계약/투자/결제는 당일 확정보다 24시간 검토를 넣어 리스크를 통제하는 편이 안정적입니다.'
          ),
        },
        theme
      )
    case 'health':
      return enforceThemedDepth(
        {
          ...baseKo,
          prevention: merge(
            health?.thesis,
            '예방의 핵심은 과부하 누적을 차단하는 것입니다. 수면·수분·회복 루틴을 일정에 고정하세요. 컨디션이 좋을 때 무리해서 당기는 패턴이 반복되면 반동 피로가 커질 수 있으니 강도 조절이 필수입니다. 건강 전략은 의지보다 시스템이 오래 갑니다.'
          ),
          riskWindows: merge(
            timing?.thesis,
            '리스크 구간은 일정 밀집과 커뮤니케이션 과부하가 겹칠 때 커집니다. 일정 분할로 충격을 줄이세요. 특히 이동/야근/수면 부족이 동시에 겹치면 실수 확률이 급격히 올라갈 수 있습니다. 위험 구간은 미리 예고하고 일정 강도를 낮추는 것이 안전합니다.'
          ),
          recoveryPlan: merge(
            health?.riskControl,
            '회복 계획은 강도보다 지속성이 중요합니다. 2주 단위로 재점검하세요. 무리한 목표보다 매일 지킬 수 있는 기본 루틴을 정해두면 회복 효율이 높아집니다. 기준은 “완벽한 하루”가 아니라 “무너지지 않는 패턴”입니다.'
          ),
        },
        theme
      )
    case 'family':
      return enforceThemedDepth(
        {
          ...baseKo,
          dynamics: merge(
            relation?.thesis,
            '가족 역학은 표현 속도 차이에서 오해가 커지기 쉽습니다. 맥락 정리 후 전달하는 방식이 유리합니다. 가까운 관계일수록 말의 톤과 순서가 결과를 크게 좌우하므로, 결론보다 배경 설명을 먼저 맞추는 습관이 중요합니다. 작은 오해를 빠르게 정리하면 장기 갈등을 예방할 수 있습니다.'
          ),
          communication: merge(
            relation?.riskControl,
            '결론 전달 전 상대 해석을 다시 확인하면 갈등 비용을 줄일 수 있습니다. 민감한 주제는 즉시 해결하려 하기보다 합의 가능한 기준부터 정하는 편이 안정적입니다. 한 번의 완벽한 대화보다, 짧고 정확한 대화를 여러 번 쌓는 방식이 효과적입니다.'
          ),
          legacy:
            '세대 과제는 단기 성과보다 일관된 운영 원칙을 남기는 것입니다. 기준 문서화를 습관화하세요. 가족 안에서도 역할/책임/기대치가 보이면 갈등이 줄고 협력이 쉬워집니다. 남기는 것은 말이 아니라 반복 가능한 운영 규칙입니다.',
        },
        theme
      )
  }
}

// ===========================
// Main generation function
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'
  const normalizedInput = buildNormalizedMatrixInput(input)

  // 1. Build prompt
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'comprehensive',
    focusDomain: options.focusDomain,
  })
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'comprehensive',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const fallbackSections = buildComprehensiveFallbackSections(
      normalizedInput,
      matrixReport,
      deterministicCore,
      lang,
      signalSynthesis
    )
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'comprehensive',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      birthDate: options.birthDate,
      timingData: options.timingData,
      sectionPaths,
      evidenceRefs,
    })
    const draftSections = mergeComprehensiveDraftWithBlocks(
      fallbackSections,
      unified.blocksBySection,
      lang
    )
    let sections = draftSections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = sanitizeSectionsByPaths(sections, sectionPaths)
    sections = sanitizeComprehensiveSectionsForUser(sections)

    const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
    const keyStrengths = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'strength')
      .slice(0, 3)
      .map((i) => i.title)
    const keyChallenges = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'challenge' || i.category === 'caution')
      .slice(0, 3)
      .map((i) => i.title)
    const domainFallback = [...(matrixReport.domainAnalysis || [])]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((d) =>
        lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
      )
    const anchorFallback = (graphRagEvidence.anchors || [])
      .slice(0, 3)
      .map((a) =>
        lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
      )
    const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
    const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
    const safeKeyChallenges =
      keyChallenges.length > 0
        ? keyChallenges
        : lang === 'ko'
          ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
          : [
              'Caution signals require review',
              'Recheck before final commitment',
              'Communication risk check',
            ]
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('comprehensive', 'deterministic-only', qualityMetrics)

    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
        geokguk: input.geokguk,
      },
      sections: sections as AIPremiumReport['sections'],
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      matrixSummary: {
        overallScore: matrixReport.overallScore.total,
        grade: matrixReport.overallScore.grade,
        topInsights: safeTopInsights,
        keyStrengths: safeKeyStrengths,
        keyChallenges: safeKeyChallenges,
      },
      signalSynthesis,
      strategyEngine,
      meta: {
        modelUsed: 'deterministic-only',
        tokensUsed: 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.2.0-deterministic-only',
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE) {
    const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const fallbackSections = buildComprehensiveFallbackSections(
      input,
      matrixReport,
      deterministicCore,
      lang,
      signalSynthesis
    )
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'comprehensive',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      birthDate: options.birthDate,
      timingData: options.timingData,
      sectionPaths,
      evidenceRefs,
    })
    const draftSections = mergeComprehensiveDraftWithBlocks(
      fallbackSections,
      unified.blocksBySection,
      lang
    )
    const rewrite = await rewriteSectionsWithFallback<AIPremiumReport['sections']>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths: sectionPaths,
      minCharsPerSection: lang === 'ko' ? 380 : 280,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = sanitizeSectionsByPaths(sections, sectionPaths)
    sections = sanitizeComprehensiveSectionsForUser(sections)

    const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
    const keyStrengths = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'strength')
      .slice(0, 3)
      .map((i) => i.title)
    const keyChallenges = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'challenge' || i.category === 'caution')
      .slice(0, 3)
      .map((i) => i.title)
    const domainFallback = [...(matrixReport.domainAnalysis || [])]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((d) =>
        lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
      )
    const anchorFallback = (graphRagEvidence.anchors || [])
      .slice(0, 3)
      .map((a) =>
        lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
      )
    const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
    const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
    const safeKeyChallenges =
      keyChallenges.length > 0
        ? keyChallenges
        : lang === 'ko'
          ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
          : [
              'Caution signals require review',
              'Recheck before final commitment',
              'Communication risk check',
            ]
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('comprehensive', rewrite.modelUsed, qualityMetrics)

    recordRewriteModeMetric('comprehensive', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
        geokguk: input.geokguk,
      },
      sections: sections as AIPremiumReport['sections'],
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      matrixSummary: {
        overallScore: matrixReport.overallScore.total,
        grade: matrixReport.overallScore.grade,
        topInsights: safeTopInsights,
        keyStrengths: safeKeyStrengths,
        keyChallenges: safeKeyChallenges,
      },
      signalSynthesis,
      strategyEngine,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }

  const requestedChars =
    typeof options.targetChars === 'number' && Number.isFinite(options.targetChars)
      ? Math.max(3500, Math.min(32000, Math.floor(options.targetChars)))
      : detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 18000
          : 14000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 11000
            : 8500
          : undefined
  const maxTokensOverride = requestedChars ? Math.ceil(requestedChars / 2) + 1200 : undefined
  const sectionTokenBudget = maxTokensOverride
    ? Math.max(850, Math.min(2400, Math.floor(maxTokensOverride / 4)))
    : undefined
  const sectionMinChars =
    detailLevel === 'comprehensive'
      ? lang === 'ko'
        ? 850
        : 650
      : detailLevel === 'detailed'
        ? lang === 'ko'
          ? 600
          : 450
        : lang === 'ko'
          ? 380
          : 300

  const sectionAnchors = new Map(
    (graphRagEvidence.anchors || []).map((anchor) => [anchor.section, anchor])
  )
  let sections: Record<string, unknown> = {}
  let tokensUsed = 0
  const models = new Set<string>()
  let usedDeterministicFallback = false

  try {
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      const anchor = sectionAnchors.get(sectionKey)
      const factPack = buildSectionFactPack(
        sectionKey,
        anchor,
        matrixReport,
        input,
        signalSynthesis,
        strategyEngine,
        lang
      )
      const draftPrompt = buildSectionPrompt(sectionKey, factPack, lang, undefined, sectionMinChars)

      const draft = await callAIBackendGeneric<{ text: string }>(draftPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        modelOverride: 'gpt-4o-mini',
      })
      tokensUsed += draft.tokensUsed || 0
      models.add(draft.model)
      const draftText = sanitizeSectionNarrative(draft.sections?.text || '')

      const synthesisPrompt = buildSectionPrompt(
        sectionKey,
        factPack,
        lang,
        draftText,
        sectionMinChars
      )
      const synthesized = await callAIBackendGeneric<{ text: string }>(synthesisPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        modelOverride: 'gpt-4o',
      })
      tokensUsed += synthesized.tokensUsed || 0
      models.add(synthesized.model)
      let sectionText = sanitizeTimingContradictions(
        postProcessSectionNarrative(synthesized.sections?.text || draftText, sectionKey, lang),
        input
      )

      const quality = evaluateSectionGate(sectionText, factPack, sectionKey, containsBannedPhrase)
      if (!quality.pass) {
        const repairPrompt = [
          buildSectionPrompt(sectionKey, factPack, lang, sectionText, sectionMinChars),
          lang === 'ko'
            ? `보강 규칙: 새 포인트를 최소 3개 넣고, 구체 명사를 최소 2개 넣고, 사실 묶음 반영 문장을 최소 2개 넣어 주세요. 평균 문장 길이는 40자 이하로 맞추고 금지 표현은 제거해 주세요. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
            : `Repair rules: add at least 3 new points, include at least 2 concrete nouns, and reflect at least 2 fact-pack points. Keep average sentence length under 40 chars and remove banned phrases. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`,
        ].join('\n')
        try {
          const repaired = await callAIBackendGeneric<{ text: string }>(repairPrompt, lang, {
            userPlan: options.userPlan,
            maxTokensOverride: sectionTokenBudget,
            modelOverride: 'gpt-4o',
          })
          tokensUsed += repaired.tokensUsed || 0
          models.add(repaired.model)
          sectionText = sanitizeTimingContradictions(
            postProcessSectionNarrative(repaired.sections?.text || sectionText, sectionKey, lang),
            input
          )
        } catch (error) {
          logger.warn('[AI Report] Section repair failed; keeping synthesized text', {
            section: sectionKey,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      sections[sectionKey] = sectionText
    }
  } catch (error) {
    usedDeterministicFallback = true
    const fallbackSections = buildComprehensiveFallbackSections(
      input,
      matrixReport,
      deterministicCore,
      lang,
      signalSynthesis
    )
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      sections[sectionKey] = fallbackSections[sectionKey]
    }
    logger.warn('[AI Report] Falling back to deterministic narrative sections', {
      error: error instanceof Error ? error.message : String(error),
      lang,
    })
  }

  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)
  if (!usedDeterministicFallback && maxRepairPasses > 0) {
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const crossPaths = sectionPaths.filter((path) => path !== 'conclusion')
    const timingPaths = ['timingAdvice', 'actionPlan', 'careerPath', 'wealthPotential']
    const minCharsPerSection =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 600
          : 450
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 420
            : 300
          : lang === 'ko'
            ? 280
            : 220
    const minTotalChars =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 9000
          : 7000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 6200
            : 4600
          : lang === 'ko'
            ? 4200
            : 3200
    const minCrossCoverage = 0.75
    const minActionCoverage = 0.7
    const minEvidenceTripletCoverage = 0.68
    const minTimingCoverage = 0.55

    const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
    const missingCross = getMissingCrossPaths(sections, crossPaths)
    const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
    const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
    const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
    const missingEvidenceTripletPaths = getMissingPathsByPredicate(
      sections,
      crossPaths,
      hasEvidenceTriplet
    )
    const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
      sections,
      crossPaths,
      hasEvidenceTriplet
    )
    const missingTimingPaths = getMissingPathsByPredicate(sections, timingPaths, hasTimingInText)
    const timingCoverageRatio = getCoverageRatioByPredicate(sections, timingPaths, hasTimingInText)
    const listStylePaths = getListStylePaths(sections, sectionPaths)
    const repetitivePaths = getRepetitivePaths(sections, sectionPaths)
    const totalChars = countSectionChars(sections)
    const needsRepair =
      shortPaths.length > 0 ||
      missingCross.length > 0 ||
      totalChars < minTotalChars ||
      crossCoverageRatio < minCrossCoverage ||
      actionCoverageRatio < minActionCoverage ||
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
      timingCoverageRatio < minTimingCoverage ||
      listStylePaths.length > 0 ||
      repetitivePaths.length > 0

    if (needsRepair) {
      const rewritePrompt = buildNarrativeRewritePrompt(lang, sections, {
        minCharsPerSection,
        minTotalChars,
        requiredTimingSections: timingPaths,
      })
      const repairPrompt = [
        rewritePrompt,
        buildDepthRepairInstruction(
          lang,
          sectionPaths,
          shortPaths,
          minCharsPerSection,
          minTotalChars
        ),
        missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
        crossCoverageRatio < minCrossCoverage
          ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
          : '',
        actionCoverageRatio < minActionCoverage
          ? buildActionRepairInstruction(
              lang,
              actionCoverageRatio,
              minActionCoverage,
              missingActionPaths
            )
          : '',
        evidenceTripletCoverageRatio < minEvidenceTripletCoverage
          ? buildEvidenceRepairInstruction(
              lang,
              evidenceTripletCoverageRatio,
              minEvidenceTripletCoverage,
              missingEvidenceTripletPaths
            )
          : '',
        timingCoverageRatio < minTimingCoverage
          ? buildTimingRepairInstruction(
              lang,
              timingCoverageRatio,
              minTimingCoverage,
              missingTimingPaths
            )
          : '',
        listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
        repetitivePaths.length > 0 ? buildAntiRepetitionInstruction(lang, repetitivePaths) : '',
      ]
        .filter(Boolean)
        .join('\n')

      try {
        const repaired = await callAIBackendGeneric<AIPremiumReport['sections']>(
          repairPrompt,
          lang,
          {
            userPlan: options.userPlan,
            maxTokensOverride,
            modelOverride: 'gpt-4o',
          }
        )
        const candidateSections = repaired.sections as unknown
        if (isComprehensiveSectionsPayload(candidateSections)) {
          sections = candidateSections
        }
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)

        const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
        const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
        const secondActionCoverageRatio = getCoverageRatioByPredicate(
          sections,
          crossPaths,
          hasActionInText
        )
        const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
          sections,
          crossPaths,
          hasEvidenceTriplet
        )
        const secondTimingCoverageRatio = getCoverageRatioByPredicate(
          sections,
          timingPaths,
          hasTimingInText
        )
        const secondTotalChars = countSectionChars(sections)
        if (
          maxRepairPasses > 1 &&
          (secondShortPaths.length > 0 ||
            secondTotalChars < minTotalChars ||
            secondCrossCoverageRatio < minCrossCoverage ||
            secondActionCoverageRatio < minActionCoverage ||
            secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
            secondTimingCoverageRatio < minTimingCoverage)
        ) {
          const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
          try {
            const second = await callAIBackendGeneric<AIPremiumReport['sections']>(
              secondPrompt,
              lang,
              {
                userPlan: options.userPlan,
                maxTokensOverride,
                modelOverride: 'gpt-4o',
              }
            )
            const secondCandidate = second.sections as unknown
            if (isComprehensiveSectionsPayload(secondCandidate)) {
              sections = secondCandidate
            }
            tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
            models.add(second.model)
          } catch (error) {
            logger.warn(
              '[AI Report] Second global repair pass failed; keeping first repaired result',
              {
                error: error instanceof Error ? error.message : String(error),
                plan: options.userPlan || 'free',
              }
            )
          }
        }
      } catch (error) {
        logger.warn('[AI Report] Global narrative repair failed; keeping section-wise result', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }
  }

  const comprehensiveSectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
  const comprehensiveEvidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
  if (!usedDeterministicFallback) {
    const evidenceCheck = validateEvidenceBinding(
      sections,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs
    )
    if (evidenceCheck.needsRepair && maxRepairPasses > 0) {
      try {
        const repairPrompt = buildEvidenceBindingRepairPrompt(
          lang,
          sections,
          comprehensiveEvidenceRefs,
          evidenceCheck.violations
        )
        const repaired = await callAIBackendGeneric<AIPremiumReport['sections']>(
          repairPrompt,
          lang,
          {
            userPlan: options.userPlan,
            maxTokensOverride,
            modelOverride: 'gpt-4o',
          }
        )
        const candidate = repaired.sections as unknown
        if (isComprehensiveSectionsPayload(candidate)) {
          sections = candidate
        }
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)
      } catch (error) {
        logger.warn('[AI Report] Evidence-binding repair failed; keeping current sections', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }

    const finalEvidenceCheck = validateEvidenceBinding(
      sections,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs
    )
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        comprehensiveEvidenceRefs,
        lang
      )
    }
  }
  sections = enforceEvidenceRefFooters(
    sections,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )
  sections = sanitizeSectionsByPaths(sections, comprehensiveSectionPaths)

  const model = usedDeterministicFallback ? 'deterministic-fallback' : [...models].join(' -> ')
  const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
  const keyStrengths = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'strength')
    .slice(0, 3)
    .map((i) => i.title)
  const keyChallenges = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'challenge' || i.category === 'caution')
    .slice(0, 3)
    .map((i) => i.title)
  const domainFallback = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) =>
      lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
    )
  const anchorFallback = (graphRagEvidence.anchors || [])
    .slice(0, 3)
    .map((a) =>
      lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
    )
  const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
  const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
  const safeKeyChallenges =
    keyChallenges.length > 0
      ? keyChallenges
      : lang === 'ko'
        ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
        : [
            'Caution signals require review',
            'Recheck before final commitment',
            'Communication risk check',
          ]
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'comprehensive',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    birthDate: options.birthDate,
    timingData: options.timingData,
    sectionPaths: comprehensiveSectionPaths,
    evidenceRefs: comprehensiveEvidenceRefs,
  })
  const qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    {
      requiredPaths: comprehensiveSectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )
  recordReportQualityMetrics('comprehensive', model, qualityMetrics)

  // 3. ??? ??
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
      geokguk: input.geokguk,
    },

    sections: sections as AIPremiumReport['sections'],
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: comprehensiveEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      [
        'introduction',
        'personalityDeep',
        'careerPath',
        'relationshipDynamics',
        'wealthPotential',
        'healthGuidance',
        'lifeMission',
        'timingAdvice',
        'actionPlan',
        'conclusion',
      ],
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, [
      'introduction',
      'personalityDeep',
      'careerPath',
      'relationshipDynamics',
      'wealthPotential',
      'healthGuidance',
      'lifeMission',
      'timingAdvice',
      'actionPlan',
      'conclusion',
    ]),

    matrixSummary: {
      overallScore: matrixReport.overallScore.total,
      grade: matrixReport.overallScore.grade,
      topInsights: safeTopInsights,
      keyStrengths: safeKeyStrengths,
      keyChallenges: safeKeyChallenges,
    },
    signalSynthesis,
    strategyEngine,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics,
    },
  }

  return report
}

// ===========================
// Timing report generation function
// ===========================

export async function generateTimingReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  period: ReportPeriod,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    targetDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    deterministicOnly?: boolean
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {}
): Promise<TimingAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]
  const normalizedInput = buildNormalizedMatrixInput(input)
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'timing',
    period,
  })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'timing',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const sectionPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]
    const draftSections = buildTimingFallbackSections(normalizedInput, signalSynthesis, lang)
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    let sections = draftSections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPaths(sections, sectionPaths)
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'timing',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      period,
      targetDate,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
      ],
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('timing', 'deterministic-only', qualityMetrics)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      period,
      targetDate,
      periodLabel,
      timingData,
      sections: sections as unknown as TimingReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: 'deterministic-only',
        tokensUsed: 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.2.0-deterministic-only',
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE) {
    const sectionPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]
    const requiredPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
    ]
    const draftSections = buildTimingFallbackSections(normalizedInput, signalSynthesis, lang)
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'timing',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      period,
      targetDate,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const rewrite = await rewriteSectionsWithFallback<TimingReportSections>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 320 : 240,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPaths(sections, sectionPaths)
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('timing', rewrite.modelUsed, qualityMetrics)
    recordRewriteModeMetric('timing', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      period,
      targetDate,
      periodLabel,
      timingData,
      sections: sections as unknown as TimingReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock('comprehensive', lang)
  const synthesisPromptBlock = buildSynthesisPromptBlock(
    signalSynthesis,
    strategyEngine,
    lang,
    'timing'
  )

  // 1. Build matrix summary
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. Build prompt
  const prompt = `${buildTimingPrompt(
    period,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
    },
    timingData,
    targetDate,
    matrixSummary,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}\n\n${synthesisPromptBlock}`

  // 3. Call AI backend + quality gate (length/cross evidence)
  const base = await callAIBackendGeneric<TimingReportSections>(prompt, lang, {
    userPlan: options.userPlan,
  })
  const timingRequiredPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  let sections = hasRequiredSectionPaths(base.sections as unknown, timingRequiredPaths)
    ? (base.sections as unknown as Record<string, unknown>)
    : (buildTimingFallbackSections(normalizedInput, signalSynthesis, lang) as unknown as Record<
        string,
        unknown
      >)
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
    'luckyElements',
  ]
  const crossPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  const minCharsPerSection = lang === 'ko' ? 300 : 230
  const minTotalChars = lang === 'ko' ? 5200 : 4000
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65

  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<TimingReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, timingRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<TimingReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
          })
          const secondSections = second.sections as unknown
          if (hasRequiredSectionPaths(secondSections, timingRequiredPaths)) {
            sections = secondSections as Record<string, unknown>
          }
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Timing Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Timing Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const timingEvidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
  const timingEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, timingEvidenceRefs)
  if (timingEvidenceCheck.needsRepair && maxRepairPasses > 0) {
    try {
      const repairPrompt = buildEvidenceBindingRepairPrompt(
        lang,
        sections,
        timingEvidenceRefs,
        timingEvidenceCheck.violations
      )
      const repaired = await callAIBackendGeneric<TimingReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, timingRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
    } catch (error) {
      logger.warn('[Timing Report] Evidence-binding repair failed; using current response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const finalTimingEvidenceCheck = validateEvidenceBinding(
    sections,
    sectionPaths,
    timingEvidenceRefs
  )
  if (finalTimingEvidenceCheck.needsRepair) {
    sections = enforceEvidenceBindingFallback(
      sections,
      finalTimingEvidenceCheck.violations,
      timingEvidenceRefs,
      lang
    )
  }
  sections = enforceEvidenceRefFooters(sections, sectionPaths, timingEvidenceRefs, lang)
  sections = sanitizeSectionsByPaths(sections, sectionPaths)

  // 4. Build period label
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. Calculate score
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'timing',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    period,
    targetDate,
    timingData,
    birthDate: options.birthDate,
    sectionPaths,
    evidenceRefs: timingEvidenceRefs,
  })
  const qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    timingEvidenceRefs,
    {
      requiredPaths: timingRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 6. Assemble report
  const report: TimingAIPremiumReport = {
    id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    period,
    targetDate,
    periodLabel,

    timingData,
    sections: sections as unknown as TimingReportSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: timingEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    strategyEngine,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
        'luckyElements',
      ],
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]),
    periodScore,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics,
    },
  }

  recordReportQualityMetrics('timing', model, report.meta.qualityMetrics!)

  return report
}

// ===========================
// Themed report generation function
// ===========================

export async function generateThemedReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  theme: ReportTheme,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    deterministicOnly?: boolean
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {}
): Promise<ThemedAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const normalizedInput = buildNormalizedMatrixInput(input)
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'themed',
    theme,
  })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'themed',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const draftSections = buildThemedFallbackSections(theme, signalSynthesis, lang)
    const evidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
    let sections = draftSections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPaths(sections, sectionPaths)
    const themeMeta = THEME_META[theme]
    const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)
    const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'themed',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('themed', 'deterministic-only', qualityMetrics)
    return {
      id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      theme,
      themeLabel: themeMeta.label[lang],
      themeEmoji: themeMeta.emoji,
      sections: sections as unknown as ThemedReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      themeScore,
      keywords,
      meta: {
        modelUsed: 'deterministic-only',
        tokensUsed: 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.2.0-deterministic-only',
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const requiredPaths = [...sectionPaths]
    const draftSections = buildThemedFallbackSections(theme, signalSynthesis, lang)
    const evidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'themed',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const rewrite = await rewriteSectionsWithFallback<ThemedReportSections>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 340 : 260,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPaths(sections, sectionPaths)
    const themeMeta = THEME_META[theme]
    const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)
    const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('themed', rewrite.modelUsed, qualityMetrics)
    recordRewriteModeMetric('themed', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      theme,
      themeLabel: themeMeta.label[lang],
      themeEmoji: themeMeta.emoji,
      sections: sections as unknown as ThemedReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      themeScore,
      keywords,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock(theme, lang)
  const synthesisPromptBlock = buildSynthesisPromptBlock(
    signalSynthesis,
    strategyEngine,
    lang,
    'themed',
    theme
  )

  // 1. Build matrix summary
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. Build prompt
  const prompt = `${buildThemedPrompt(
    theme,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
      sibsinDistribution: input.sibsinDistribution,
    },
    timingData,
    matrixSummary,
    undefined,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}\n\n${synthesisPromptBlock}`

  // 3. Call AI backend + quality gate (length/cross evidence)
  const base = await callAIBackendGeneric<ThemedReportSections>(prompt, lang, {
    userPlan: options.userPlan,
  })
  const themedRequiredPaths = [...getThemedSectionKeys(theme)]
  let sections = hasRequiredSectionPaths(base.sections as unknown, themedRequiredPaths)
    ? (base.sections as unknown as Record<string, unknown>)
    : (buildThemedFallbackSections(theme, signalSynthesis, lang) as unknown as Record<
        string,
        unknown
      >)
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [...getThemedSectionKeys(theme)]
  const crossPaths = sectionPaths.filter((path) => path !== 'recommendations')
  const minCharsPerSection = lang === 'ko' ? 320 : 240
  const minTotalChars = lang === 'ko' ? 5600 : 4200
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65
  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<ThemedReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, themedRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondListStylePaths = getListStylePaths(sections, sectionPaths)
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
          secondListStylePaths.length > 0)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<ThemedReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
          })
          const secondSections = second.sections as unknown
          if (hasRequiredSectionPaths(secondSections, themedRequiredPaths)) {
            sections = secondSections as Record<string, unknown>
          }
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Themed Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Themed Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const themedEvidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
  const themedEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, themedEvidenceRefs)
  if (themedEvidenceCheck.needsRepair && maxRepairPasses > 0) {
    try {
      const repairPrompt = buildEvidenceBindingRepairPrompt(
        lang,
        sections,
        themedEvidenceRefs,
        themedEvidenceCheck.violations
      )
      const repaired = await callAIBackendGeneric<ThemedReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, themedRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
    } catch (error) {
      logger.warn('[Themed Report] Evidence-binding repair failed; using current response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const finalThemedEvidenceCheck = validateEvidenceBinding(
    sections,
    sectionPaths,
    themedEvidenceRefs
  )
  if (finalThemedEvidenceCheck.needsRepair) {
    sections = enforceEvidenceBindingFallback(
      sections,
      finalThemedEvidenceCheck.violations,
      themedEvidenceRefs,
      lang
    )
  }
  sections = enforceEvidenceRefFooters(sections, sectionPaths, themedEvidenceRefs, lang)
  sections = sanitizeSectionsByPaths(sections, sectionPaths)

  // 4. Theme metadata
  const themeMeta = THEME_META[theme]

  // 5. Calculate score
  const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)

  // 6. Extract keywords
  const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'themed',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    timingData,
    birthDate: options.birthDate,
    sectionPaths,
    evidenceRefs: themedEvidenceRefs,
  })
  const qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    themedEvidenceRefs,
    {
      requiredPaths: themedRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 7. Assemble report
  const report: ThemedAIPremiumReport = {
    id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    theme,
    themeLabel: themeMeta.label[lang],
    themeEmoji: themeMeta.emoji,

    sections: sections as unknown as ThemedReportSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: themedEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    strategyEngine,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      sectionPaths,
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, sectionPaths),
    themeScore,
    keywords,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics,
    },
  }

  recordReportQualityMetrics('themed', model, report.meta.qualityMetrics!)

  return report
}
