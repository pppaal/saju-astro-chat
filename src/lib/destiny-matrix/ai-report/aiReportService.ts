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
import { formatPolicyCheckLabels } from '@/lib/destiny-matrix/core/actionCopy'
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
  type SignalDomain,
  getDomainsForSection,
} from './signalSynthesizer'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type { StrategyEngineResult } from './strategyEngine'
import { THEME_DOMAIN_ONTOLOGY } from './matrixOntology'
import { generateNarrativeSectionsFromSynthesis } from './narrativeGenerator'
import {
  describeDataTrustSummary,
  describeExecutionStance,
  describeProvenanceSummary,
  describePhaseFlow,
  describeSajuAstroConflictByDomain,
  describeTimingWindowNarrative as describeHumanTimingWindowNarrative,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'

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
import type { DestinyCoreQuality } from '@/lib/destiny-matrix/core/runDestinyCore'
import { adaptCoreToReport } from '@/lib/destiny-matrix/core/adapters'
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

type ReportCoreViewModel = ReturnType<typeof adaptCoreToReport>

function buildReportOutputCoreFields(reportCore: ReportCoreViewModel | null | undefined) {
  if (!reportCore) return {}
  return {
    focusDomain: reportCore.focusDomain,
    topDecisionId: reportCore.topDecisionId,
    topDecisionLabel: reportCore.topDecisionLabel,
    riskControl: reportCore.riskControl,
  }
}

function getReportDomainLabel(
  domain: string,
  lang: 'ko' | 'en'
): string {
  const koLabels: Record<string, string> = {
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    move: '이동',
    personality: '성향',
    spirituality: '장기 방향',
    timing: '타이밍',
  }
  const enLabels: Record<string, string> = {
    career: 'career',
    relationship: 'relationships',
    wealth: 'wealth',
    health: 'health',
    move: 'movement',
    personality: 'personality',
    spirituality: 'direction',
    timing: 'timing',
  }
  return lang === 'ko' ? koLabels[domain] || domain : enLabels[domain] || domain
}

function getTimingWindowLabel(
  window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+',
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const labels = {
      now: '지금',
      '1-3m': '1~3개월',
      '3-6m': '3~6개월',
      '6-12m': '6~12개월',
      '12m+': '1년 이후',
    }
    return labels[window]
  }
  const labels = {
    now: 'now',
    '1-3m': '1-3 months',
    '3-6m': '3-6 months',
    '6-12m': '6-12 months',
    '12m+': '12+ months',
  }
  return labels[window]
}

function getWesternElementLabel(
  element: string | undefined,
  lang: 'ko' | 'en'
): string {
  if (!element) return lang === 'ko' ? '미상' : 'unknown'
  const normalized = String(element).trim().toLowerCase()
  const koLabels: Record<string, string> = {
    fire: '불',
    earth: '흙',
    air: '바람',
    water: '물',
    불: '불',
    흙: '흙',
    바람: '바람',
    물: '물',
  }
  const enLabels: Record<string, string> = {
    fire: 'fire',
    earth: 'earth',
    air: 'air',
    water: 'water',
    불: 'fire',
    흙: 'earth',
    바람: 'air',
    물: 'water',
  }
  return lang === 'ko'
    ? koLabels[normalized] || String(element)
    : enLabels[normalized] || String(element)
}

function getElementByStemName(stem: string): string | undefined {
  const mapping: Record<string, string> = {
    갑: '목',
    을: '목',
    병: '화',
    정: '화',
    무: '토',
    기: '토',
    경: '금',
    신: '금',
    임: '수',
    계: '수',
    甲: '목',
    乙: '목',
    丙: '화',
    丁: '화',
    戊: '토',
    己: '토',
    庚: '금',
    辛: '금',
    壬: '수',
    癸: '수',
  }
  return mapping[stem]
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function hasBatchim(text: string | undefined): boolean {
  if (!text) return false
  const last = text.trim().charCodeAt(text.trim().length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

function withSubjectParticle(text: string | undefined): string {
  if (!text) return ''
  return `${text}${hasBatchim(text) ? '이' : '가'}`
}

function localizePlanetName(
  planet: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  lang: 'ko' | 'en'
): string {
  if (lang !== 'ko') return planet
  const labels: Record<string, string> = {
    Sun: '태양',
    Moon: '달',
    Mercury: '수성',
    Venus: '금성',
    Mars: '화성',
    Jupiter: '목성',
    Saturn: '토성',
  }
  return labels[planet] || planet
}

function localizeSignName(sign: string | undefined, lang: 'ko' | 'en'): string {
  if (!sign) return ''
  if (lang !== 'ko') return sign
  const labels: Record<string, string> = {
    Aries: '양자리',
    Taurus: '황소자리',
    Gemini: '쌍둥이자리',
    Cancer: '게자리',
    Leo: '사자자리',
    Virgo: '처녀자리',
    Libra: '천칭자리',
    Scorpio: '전갈자리',
    Sagittarius: '사수자리',
    Capricorn: '염소자리',
    Aquarius: '물병자리',
    Pisces: '물고기자리',
  }
  return labels[String(sign)] || String(sign)
}

type PersonalDaeunWindow = {
  startAge: number
  endAge: number
  element?: string
  ganji?: string
  isCurrent: boolean
}

function extractPersonalDaeunWindows(
  input: MatrixCalculationInput,
  timingData?: TimingData
): PersonalDaeunWindow[] {
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const windows: PersonalDaeunWindow[] = []
  const rawSnapshot = toObjectRecord(input.sajuSnapshot)
  const rawUnse = toObjectRecord(rawSnapshot?.unse)
  const rawDaeun = rawUnse?.daeun
  if (Array.isArray(rawDaeun)) {
    for (const item of rawDaeun) {
      const row = toObjectRecord(item)
      if (!row) continue
      const startAge =
        toFiniteNumber(row.startAge) ??
        toFiniteNumber(row.age) ??
        toFiniteNumber(row.start) ??
        toFiniteNumber(row.beginAge)
      if (startAge === null) continue
      const endAge =
        toFiniteNumber(row.endAge) ??
        toFiniteNumber(row.end) ??
        (Number.isFinite(startAge) ? startAge + 9 : null)
      if (endAge === null) continue
      const heavenlyStem = typeof row.heavenlyStem === 'string' ? row.heavenlyStem : ''
      const earthlyBranch = typeof row.earthlyBranch === 'string' ? row.earthlyBranch : ''
      const ganji =
        typeof row.ganji === 'string' && row.ganji
          ? row.ganji
          : `${heavenlyStem || ''}${earthlyBranch || ''}` || undefined
      const element =
        typeof row.element === 'string'
          ? row.element
          : heavenlyStem
            ? getElementByStemName(heavenlyStem)
            : undefined
      const isCurrent =
        row.current === true ||
        row.isCurrent === true ||
        (age !== null && age >= startAge && age <= endAge)
      windows.push({
        startAge,
        endAge,
        element,
        ganji,
        isCurrent,
      })
    }
  }

  if (windows.length === 0 && timingData?.daeun) {
    windows.push({
      startAge: timingData.daeun.startAge,
      endAge: timingData.daeun.endAge,
      element: timingData.daeun.element,
      ganji: `${timingData.daeun.heavenlyStem}${timingData.daeun.earthlyBranch}`,
      isCurrent: timingData.daeun.isCurrent || (age !== null &&
        age >= timingData.daeun.startAge &&
        age <= timingData.daeun.endAge),
    })
  }

  return windows
    .sort((a, b) => a.startAge - b.startAge)
    .filter((item, index, array) => {
      const prev = array[index - 1]
      return !prev || prev.startAge !== item.startAge || prev.ganji !== item.ganji
    })
}

function buildPersonalLifeTimelineNarrative(
  input: MatrixCalculationInput,
  timingData: TimingData | undefined,
  lang: 'ko' | 'en'
): string {
  const windows = extractPersonalDaeunWindows(input, timingData)
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  if (windows.length === 0) return buildPersonalCycleNarrative(input, lang)
  const currentIndex = Math.max(0, windows.findIndex((item) => item.isCurrent))
  const current = windows[currentIndex] || windows[0]
  const prev = currentIndex > 0 ? windows[currentIndex - 1] : null
  const next = currentIndex < windows.length - 1 ? windows[currentIndex + 1] : null
  const currentLabel = formatCycleLabel(
    current.ganji,
    current.element,
    lang,
    lang === 'ko' ? '현재 대운' : 'current 10-year cycle'
  )
  if (lang !== 'ko') {
    const currentAgeLine =
      age !== null
        ? `At around age ${age}, the active 10-year cycle is ${current.startAge}-${current.endAge} (${currentLabel}).`
        : `The active 10-year cycle is ${current.startAge}-${current.endAge} (${currentLabel}).`
    const prevLine = prev
      ? `The previous ${prev.startAge}-${prev.endAge} cycle set the habits you are now either carrying forward or editing.`
      : ''
    const nextLine = next
      ? `The next ${next.startAge}-${next.endAge} cycle is likely to shift emphasis toward ${formatCycleLabel(
          next.ganji,
          next.element,
          lang,
          'a different operating mode'
        )}, so this period should be used to prepare that handoff.`
      : ''
    return [currentAgeLine, prevLine, nextLine].filter(Boolean).join(' ')
  }

  const currentAgeLine =
    age !== null
      ? `현재 ${age}세 전후의 핵심 장기 흐름은 ${current.startAge}-${current.endAge}세 대운(${currentLabel})입니다. 이 구간이 인생 전체의 큰 기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다.`
      : `${current.startAge}-${current.endAge}세 대운(${currentLabel})이 현재 장기 흐름의 중심입니다. 이 구간이 인생 전체의 큰 기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다.`
  const prevLine = prev
    ? `${prev.startAge}-${prev.endAge}세 구간에서 굳어진 습관과 판단 기준이 지금 흐름의 출발점이 됩니다. 그래서 현재 대운은 새 기회를 여는 동시에, 예전 방식 중 무엇을 유지하고 무엇을 버릴지 다시 고르게 만듭니다.`
    : ''
  const nextLine = next
    ? `다음 ${next.startAge}-${next.endAge}세 대운(${next.ganji || next.element || '다음 장기 흐름'})으로 넘어가기 전까지는, 지금 구간에서 성과를 내는 방식과 다음 구간에 가져갈 기준을 구분해 두는 것이 중요합니다.`
    : ''
  return [currentAgeLine, prevLine, nextLine].filter(Boolean).join(' ')
}

function calculateProfileAge(
  birthDate: string | undefined,
  currentDateIso: string | undefined
): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const current = currentDateIso ? new Date(currentDateIso) : new Date()
  if (Number.isNaN(birth.getTime()) || Number.isNaN(current.getTime())) return null
  let age = current.getUTCFullYear() - birth.getUTCFullYear()
  const currentMonthDay = current.toISOString().slice(5, 10)
  const birthMonthDay = birth.toISOString().slice(5, 10)
  if (currentMonthDay < birthMonthDay) age -= 1
  return age >= 0 ? age : null
}

function formatPlanetPlacement(
  input: MatrixCalculationInput,
  planet: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  lang: 'ko' | 'en'
): string {
  const sign = input.planetSigns?.[planet]
  const house = input.planetHouses?.[planet]
  if (!sign && !house) return ''
  if (lang === 'ko') {
    const planetLabel = localizePlanetName(planet, lang)
    const signLabel = localizeSignName(String(sign || ''), lang)
    if (sign && house) return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${signLabel} ${house}하우스에 놓여 있습니다`
    if (sign) return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${signLabel}에 놓여 있습니다`
    return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${house}하우스에 놓여 있습니다`
  }
  if (sign && house) return `${planet} in ${sign}, house ${house}`
  if (sign) return `${planet} in ${sign}`
  return `${planet} in house ${house}`
}

function buildPersonalCycleNarrative(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData?: TimingData
): string {
  if (lang === 'ko' && timingData?.daeun) {
    return buildPersonalLifeTimelineNarrative(input, timingData, lang)
  }
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const parts = [
    input.currentDaeunElement
      ? lang === 'ko'
        ? `대운 ${input.currentDaeunElement}`
        : `Daeun ${getElementLabel(input.currentDaeunElement, lang)}`
      : '',
    input.currentSaeunElement
      ? lang === 'ko'
        ? `세운 ${input.currentSaeunElement}`
        : `annual cycle ${getElementLabel(input.currentSaeunElement, lang)}`
      : '',
    input.currentWolunElement
      ? lang === 'ko'
        ? `월운 ${input.currentWolunElement}`
        : `monthly cycle ${getElementLabel(input.currentWolunElement, lang)}`
      : '',
    input.currentIljinElement
      ? lang === 'ko'
        ? `일운 ${input.currentIljinElement}`
        : `daily cycle ${getElementLabel(input.currentIljinElement, lang)}`
      : '',
  ].filter(Boolean)
  if (lang === 'ko') {
    const agePart = age !== null ? `현재 ${age}세 전후` : '현재 구간'
    if (parts.length === 0) return `${agePart}는 타이밍 입력은 있으나 겹친 운의 이름이 약하게 포착된 상태입니다.`
    const normalizedParts = parts.map((part) => {
      const [cycle, element] = part.split(' ')
      if (!cycle || !element) return part
      return `${withSubjectParticle(`${cycle} ${element}`)}`
    })
    return `${agePart}는 ${normalizedParts.join(', ')} 겹쳐 작동하는 구간입니다. 큰 기후는 대운이 만들고, 세운과 월운이 실제 체감 강도를 조절합니다.`
  }
  const agePart = age !== null ? `Around age ${age}` : 'At the current phase'
  if (parts.length === 0) return `${agePart}, timing inputs are present but the active cycle names are only weakly captured.`
  return `${agePart}, ${parts.join(', ')} are overlapping. The long climate is set by the larger cycle, and yearly/monthly cycles adjust what becomes tangible.`
}

function buildFocusedCycleLead(
  input: MatrixCalculationInput,
  timingData: TimingData | undefined,
  lang: 'ko' | 'en',
  focus:
    | 'career'
    | 'wealth'
    | 'health'
    | 'lifeMission'
    | 'actionPlan'
    | 'conclusion'
): string {
  const windows = extractPersonalDaeunWindows(input, timingData)
  const current = windows.find((item) => item.isCurrent) || windows[0] || null
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const currentLabel =
    current && (current.ganji || current.element)
      ? `${current.ganji || ''}${current.element ? `(${current.element})` : ''}`
      : lang === 'ko'
        ? '현재 흐름'
        : 'current cycle'

  if (lang !== 'ko') {
    const agePrefix = age !== null ? `Around age ${age}, ` : 'At the current phase, '
    switch (focus) {
      case 'career':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} favors role clarity and priority control over broad expansion.`
      case 'wealth':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} rewards term checks and downside control before chasing upside.`
      case 'health':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} works better when recovery rhythm is protected before intensity.`
      case 'lifeMission':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} is a phase for refining standards you can carry into the next stage.`
      case 'actionPlan':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} is best managed by separating start, review, and commitment.`
      case 'conclusion':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} puts more value on clean sequencing than fast commitment.`
    }
  }

  const agePrefix = age !== null ? `현재 ${age}세 전후는 ` : '지금은 '
  const cycleLabel =
    current !== null ? `${current.startAge}-${current.endAge}세 대운(${currentLabel})` : currentLabel
  switch (focus) {
    case 'career':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 커리어 판단에서도 새 확장보다 역할·우선순위 정리가 먼저입니다.`
    case 'wealth':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 재정 판단에서는 수익 기대보다 조건 검토와 손실 상한 관리가 먼저입니다.`
    case 'health':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 건강 관리에서는 강한 가속보다 회복 리듬을 먼저 세우는 편이 맞습니다.`
    case 'lifeMission':
      return `${agePrefix}${cycleLabel} 흐름은 다음 장기 구간까지 가져갈 기준을 정리하고 반복 가능한 원칙을 남기는 데 의미가 큽니다.`
    case 'actionPlan':
      return `${agePrefix}${cycleLabel} 흐름에서는 실행을 착수-재확인-확정으로 나눌수록 결과 재현성이 올라갑니다.`
    case 'conclusion':
      return `${agePrefix}${cycleLabel} 흐름의 결론은 성급한 확정보다 기준 정리와 순서 설계가 더 큰 차이를 만든다는 점입니다.`
  }
}

function buildPersonalBaseNarrative(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const dayMaster = withSubjectParticle(`일간 ${input.dayMasterElement}`)
    const yongsin = withSubjectParticle(`용신 ${input.yongsin || '미상'}`)
    return `원국 기준으로는 ${dayMaster} 기본 축이고, 격국은 ${input.geokguk || '미상'}, ${yongsin} 작동합니다. 서양 쪽에서는 ${getWesternElementLabel(input.dominantWesternElement, lang)} 원소가 강하게 잡혀 있습니다.`
  }
  return `At the natal level the base axis is day master ${input.dayMasterElement}, geokguk ${input.geokguk || 'unknown'}, yongsin ${input.yongsin || 'unknown'}, with ${getWesternElementLabel(input.dominantWesternElement, lang)} as the dominant western element.`
}

function buildSectionPersonalLead(
  section:
    | 'introduction'
    | 'personalityDeep'
    | 'careerPath'
    | 'relationshipDynamics'
    | 'wealthPotential'
    | 'healthGuidance'
    | 'lifeMission'
    | 'timingAdvice'
    | 'actionPlan'
    | 'conclusion',
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData?: TimingData
): string {
  switch (section) {
    case 'introduction':
      return buildPersonalCycleNarrative(input, lang, timingData)
    case 'personalityDeep':
      return [
        buildPersonalBaseNarrative(input, lang),
        formatPlanetPlacement(input, 'Sun', lang),
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Mercury', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'careerPath':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'career'),
        formatPlanetPlacement(input, 'Jupiter', lang),
        formatPlanetPlacement(input, 'Saturn', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'relationshipDynamics':
      return [
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Venus', lang),
        formatPlanetPlacement(input, 'Mars', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'wealthPotential':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'wealth'),
        formatPlanetPlacement(input, 'Jupiter', lang),
        formatPlanetPlacement(input, 'Venus', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'healthGuidance':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'health'),
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Saturn', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'lifeMission':
      return [
        buildPersonalBaseNarrative(input, lang),
        buildFocusedCycleLead(input, timingData, lang, 'lifeMission'),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? ' ' : ' ')
    case 'timingAdvice':
      return buildPersonalLifeTimelineNarrative(input, timingData, lang)
    case 'actionPlan':
      return buildFocusedCycleLead(input, timingData, lang, 'actionPlan')
    case 'conclusion':
      return [
        buildPersonalBaseNarrative(input, lang),
        buildFocusedCycleLead(input, timingData, lang, 'conclusion'),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? ' ' : ' ')
    default:
      return ''
  }
}

function replaceReportDomainTokens(text: string, lang: 'ko' | 'en'): string {
  const value = String(text || '')
  if (!value || lang !== 'ko') return value
  return value
    .replace(/\bcareer\b/gi, '커리어')
    .replace(/\brelationships?\b/gi, '관계')
    .replace(/\bwealth\b/gi, '재정')
    .replace(/\bhealth\b/gi, '건강')
    .replace(/\bmove(?:ment)?\b/gi, '이동')
    .replace(/\bpersonality\b/gi, '성향')
    .replace(/\bspirituality\b/gi, '장기 방향')
    .replace(/\btiming\b/gi, '타이밍')
}

function normalizeNarrativeCoreText(
  value: string | undefined | null,
  lang: 'ko' | 'en'
): string {
  const cleaned = sanitizeUserFacingNarrative(
    replaceReportDomainTokens(
      String(value || ''),
      lang
    )
      .replace(/commit_now/gi, lang === 'ko' ? '즉시 확정' : 'immediate commitment')
      .replace(/staged_commit/gi, lang === 'ko' ? '단계 실행' : 'staged execution')
      .replace(/\bverify\b/gi, lang === 'ko' ? '확인' : 'review')
      .replace(/\bprepare\b/gi, lang === 'ko' ? '준비 우선' : 'prepare first')
      .replace(/검증/g, '확인')
      .replace(/레이어\s*0/gi, lang === 'ko' ? '핵심 흐름' : 'core flow')
      .replace(/확장 자원 레이어:/g, lang === 'ko' ? '외부 기회와 지원 흐름을 보면' : 'Looking at external opportunity and support,')
      .replace(/십성 역할 레이어:/g, lang === 'ko' ? '행동 습관을 보면' : 'Looking at behavioral patterns,')
      .replace(/충돌 패턴 레이어:/g, lang === 'ko' ? '엇갈리는 지점을 보면' : 'Looking at the tension phase,')
      .replace(/국면 전환 레이어:/g, lang === 'ko' ? '흐름이 바뀌는 지점을 보면' : 'Looking at the transition,')
      .replace(/인생 챕터 흐름:\s*LIFE\s*\([^)]*\)/g, lang === 'ko' ? '인생 전체 흐름을 보면' : 'Across the life arc,')
      .replace(/실행 타이밍 전략:/g, '')
      .replace(/즉시 확정 액션이 차단됩니다\./g, lang === 'ko' ? '성급한 확정은 지금 맞지 않습니다.' : 'Immediate commitment is not suitable right now.')
      .replace(/인생 총운 한 줄 로그라인:/g, lang === 'ko' ? '이 해석의 출발점은' : 'The starting point is')
      .replace(/격국 신호/g, lang === 'ko' ? '사주의 기본 구조' : 'the saju base structure')
      .replace(/긴장 애스펙트/g, lang === 'ko' ? '주의 신호' : 'tension signals')
      .replace(/긴장 신호/g, lang === 'ko' ? '주의 신호' : 'caution signals')
      .replace(/커리어 엔진\(역할 아키타입\):/g, lang === 'ko' ? '잘 맞는 역할을 보면' : 'Role fit:')
      .replace(/성향 엔진\(강점\):/g, lang === 'ko' ? '타고난 강점을 보면' : 'Strengths:')
      .replace(/그림자 패턴\(리스크\):/g, lang === 'ko' ? '반복해서 조심할 패턴을 보면' : 'Risk patterns:')
      .replace(/머니 스타일:/g, lang === 'ko' ? '돈이 움직이는 방식을 보면' : 'Money style:')
      .replace(/경고 신호:/g, lang === 'ko' ? '특히 조심할 흐름은' : 'Caution signals:')
      .replace(/근거 흐름은/gi, lang === 'ko' ? '이번 해석의 중심에는' : 'Grounding centers on')
      .replace(/Relation\s+/gi, lang === 'ko' ? '관계 ' : 'relationship ')
      .replace(/astro progressions/gi, lang === 'ko' ? '점성 진행 흐름' : 'astro progressions')
      .replace(/saju snapshot/gi, lang === 'ko' ? '사주 구조' : 'saju structure')
      .replace(/\bunse\b/gi, lang === 'ko' ? '운 흐름' : 'cycle flow')
      .replace(/Relation\s+three-branch harmony/gi, lang === 'ko' ? '지지삼합' : 'relationship three-branch harmony')
      .replace(/relationship three-branch harmony/gi, lang === 'ko' ? '지지삼합' : 'relationship three-branch harmony')
      .replace(/대운\s*금/gi, lang === 'ko' ? '대운 금' : 'Daeun metal')
      .replace(/대운\s*목/gi, lang === 'ko' ? '대운 목' : 'Daeun wood')
      .replace(/대운\s*수/gi, lang === 'ko' ? '대운 수' : 'Daeun water')
      .replace(/대운\s*화/gi, lang === 'ko' ? '대운 화' : 'Daeun fire')
      .replace(/대운\s*토/gi, lang === 'ko' ? '대운 토' : 'Daeun earth')
      .replace(/\bDaeun\b/gi, lang === 'ko' ? '대운' : 'Daeun')
      .replace(/숨은 지원 흐름/gi, lang === 'ko' ? '숨은 지원 흐름' : 'hidden support')
      .replace(/학습 가속 흐름/gi, lang === 'ko' ? '학습 가속 흐름' : 'learning acceleration')
      .replace(/자산 축적 흐름/gi, lang === 'ko' ? '자산 축적 흐름' : 'asset accumulation')
      .replace(/이동·변화 경계 구간/gi, lang === 'ko' ? '이동·변화 경계 구간' : 'movement guardrail window')
      .replace(/대운/gi, lang === 'ko' ? '대운' : 'Daeun')
      .replace(/세운/gi, lang === 'ko' ? '세운' : 'annual cycle')
      .replace(/월운/gi, lang === 'ko' ? '월운' : 'monthly cycle')
      .replace(/일운/gi, lang === 'ko' ? '일운' : 'daily cycle')
      .replace(/양육/gi, lang === 'ko' ? '양육' : 'nurturing mode')
      .replace(/귀인조력/gi, lang === 'ko' ? '귀인 조력' : 'noble support')
      .replace(/커리어정점/gi, lang === 'ko' ? '커리어 정점' : 'career peak')
      .replace(/극강시너지/gi, lang === 'ko' ? '극강시너지' : 'strong synergy')
      .replace(/극심충돌/gi, lang === 'ko' ? '극심충돌' : 'hard clash')
      .replace(/횡재/gi, lang === 'ko' ? '횡재' : 'windfall signal')
      .replace(/임관/gi, lang === 'ko' ? '임관' : 'authority maturity stage')
      .replace(/최상조화/gi, lang === 'ko' ? '흐름 정렬' : 'peak harmony')
      .replace(/Shinsal\s+천을귀인/gi, lang === 'ko' ? '귀인의 도움 신호' : 'noble support')
      .replace(/천을귀인/gi, lang === 'ko' ? '귀인의 도움 신호' : 'noble support')
      .replace(/지지삼합/gi, lang === 'ko' ? '지지삼합' : 'three-branch harmony')
      .replace(/자산 축적 흐름/gi, lang === 'ko' ? '자산 축적 흐름' : 'asset accumulation')
      .replace(/ëŒ€ìš´/gi, 'Daeun')
      .replace(/ì„¸ìš´/gi, 'annual cycle')
      .replace(/ì›”ìš´/gi, 'monthly cycle')
      .replace(/ì¼ìš´/gi, 'daily cycle')
      .replace(/ë°”ëžŒ/gi, 'air')
      .replace(/ìžì‚° ì¶•ì íë¦„/gi, 'asset accumulation')
      .replace(/ì§€ì§€ì‚¼í•©/gi, 'three-branch harmony')
      .replace(/ìµœìƒì¡°í™”/gi, 'peak harmony')
      .replace(/ì²œì„ê·€ì¸/gi, 'noble support')
      .replace(/íš¡ìž¬/gi, 'windfall signal')
      .replace(/ìž„ê´€/gi, 'authority maturity stage')
      .replace(/Daeun\s*금/gi, 'Daeun metal')
      .replace(/Daeun\s*목/gi, 'Daeun wood')
      .replace(/Daeun\s*수/gi, 'Daeun water')
      .replace(/Daeun\s*화/gi, 'Daeun fire')
      .replace(/Daeun\s*토/gi, 'Daeun earth')
      .replace(/dominant western element\s+바람/gi, 'dominant western element air')
      .replace(/바람/gi, lang === 'ko' ? '바람' : 'air')
      .replace(/frame\s+([a-z]+)\s+frame/gi, '$1 frame')
      .replace(/day master\s+금/gi, 'day master metal')
      .replace(/day master\s+목/gi, 'day master wood')
      .replace(/day master\s+수/gi, 'day master water')
      .replace(/day master\s+화/gi, 'day master fire')
      .replace(/day master\s+토/gi, 'day master earth')
      .replace(/useful element\s+금/gi, 'useful element metal')
      .replace(/useful element\s+목/gi, 'useful element wood')
      .replace(/useful element\s+수/gi, 'useful element water')
      .replace(/useful element\s+화/gi, 'useful element fire')
      .replace(/useful element\s+토/gi, 'useful element earth')
      .trim()
    )
  const ENGINE_NOISE_REGEX =
    /(패턴 근거|시나리오 확률|타이밍 적합도|현재 모드는|resolvedmode|crossagreement|blockedby|signalid|claimid|anchorid|^career\s|^relationship\s|^wealth\s|^health\s|commit_now|staged_commit)/i
  if (ENGINE_NOISE_REGEX.test(cleaned)) return ''
  return cleaned || ''
}

function buildReportCoreLine(
  value: string | undefined | null,
  lang: 'ko' | 'en'
): string {
  const cleaned = normalizeNarrativeCoreText(value, lang)
  if (!cleaned) return ''
  return formatNarrativeParagraphs(cleaned, lang)
}

function collectCleanNarrativeLines(
  lines: Array<string | undefined | null>,
  lang: 'ko' | 'en'
): string[] {
  return [...new Set(lines.map((item) => buildReportCoreLine(item, lang)).filter(Boolean))]
}

function isSameNarrative(a: string | undefined | null, b: string | undefined | null): boolean {
  const left = sentenceKey(String(a || ''))
  const right = sentenceKey(String(b || ''))
  return Boolean(left) && left === right
}

function distinctNarrative(
  candidate: string | undefined | null,
  blocked: Array<string | undefined | null>
): string {
  const value = String(candidate || '').trim()
  if (!value) return ''
  return blocked.some((item) => isSameNarrative(value, item)) ? '' : value
}

function buildNarrativeSectionFromCore(
  primary: Array<string | undefined | null>,
  supporting: Array<string | undefined | null>,
  base: string,
  lang: 'ko' | 'en',
  minChars: number,
  includeBase = false,
  allowBaseFallback = true
): string {
  const primaryLines = collectCleanNarrativeLines(primary, lang)
  const supportingLines = collectCleanNarrativeLines(supporting, lang)
  const baseLine = includeBase ? buildReportCoreLine(base, lang) : ''
  let out = primaryLines.join(' ').trim()

  if (baseLine && !out.includes(baseLine)) {
    out = out ? `${out} ${baseLine}` : baseLine
  }

  out = ensureLongSectionNarrative(out, minChars, supportingLines)
  if (allowBaseFallback && (!out || out.length < Math.floor(minChars * 0.7))) {
    out = ensureLongSectionNarrative(out, minChars, [sanitizeUserFacingNarrative(base)])
  }
  return formatNarrativeParagraphs(sanitizeUserFacingNarrative(out), lang)
}

function buildTimingWindowNarrative(
  domain: string,
  item: NonNullable<ReturnType<typeof findReportCoreTimingWindow>>,
  lang: 'ko' | 'en'
): string {
  const domainLabel = getReportDomainLabel(domain, lang)
  return describeHumanTimingWindowNarrative({
    domainLabel,
    window: item.window,
    whyNow: item.whyNow,
    entryConditions: item.entryConditions,
    abortConditions: item.abortConditions,
    lang,
  })
}

function buildManifestationNarrative(
  item: NonNullable<ReturnType<typeof findReportCoreManifestation>>,
  lang: 'ko' | 'en'
): string {
  const expressions = [...(item.likelyExpressions || []), ...(item.riskExpressions || [])]
  if (lang === 'ko') {
    return [item.baselineThesis, item.activationThesis, item.manifestation, ...expressions]
      .filter(Boolean)
      .join(' ')
  }
  return [item.baselineThesis, item.activationThesis, item.manifestation, ...expressions]
    .filter(Boolean)
    .join(' ')
}

function buildVerdictNarrative(
  item: NonNullable<ReturnType<typeof findReportCoreVerdict>>,
  lang: 'ko' | 'en'
): string {
  const allowed = (item.allowedActionLabels || item.allowedActions || []).filter(Boolean).slice(0, 2).join(', ')
  const blocked = (item.blockedActionLabels || item.blockedActions || []).filter(Boolean).slice(0, 2).join(', ')
  if (lang === 'ko') {
    const parts = [
      item.rationale,
      allowed ? `지금 허용되는 움직임은 ${allowed} 쪽입니다.` : '',
      blocked ? `반대로 ${blocked}는 지금 무리하게 밀지 않는 편이 맞습니다.` : '',
    ]
    return parts.filter(Boolean).join(' ')
  }
  const parts = [
    item.rationale,
    allowed ? `The moves currently allowed are ${allowed}.` : '',
    blocked ? `By contrast, ${blocked} should not be forced right now.` : '',
  ]
  return parts.filter(Boolean).join(' ')
}

function buildPrimaryActionLead(
  action: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(action, lang)
  if (!value) return fallback
  if (/[.!?]|[다요]\s*$|하세요\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}에 힘을 두는 편이 맞습니다.` : `Lean into ${value}.`
}

function buildPrimaryCautionLead(
  caution: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(caution, lang)
  if (!value) return fallback
  if (/[.!?]|[다요]\s*$|하세요\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}은 먼저 막는 편이 맞습니다.` : `Block ${value} first.`
}

function findReportCoreDomainVerdict(
  reportCore: ReportCoreViewModel,
  domain: string
) {
  return reportCore.domainVerdicts.find((item) => item.domain === domain) || null
}

function formatScenarioIdForNarrative(
  scenarioId: string | null | undefined,
  lang: 'ko' | 'en'
): string {
  const value = String(scenarioId || '')
    .replace(/_window$/i, '')
    .replace(/_(main|alt|defensive)$/i, '')
    .trim()
  if (!value) return ''
  if (/(hidden|support|defensive|cluster|fallback|generic|alt|residual|residue)/i.test(value)) {
    return ''
  }

  const entries: Array<[RegExp, string, string]> = [
    [/promotion_review/i, '승진/역할 재검토', 'promotion or role review'],
    [/contract_negotiation/i, '조건 협의', 'contract negotiation'],
    [/manager_track/i, '관리 책임 확장', 'management-track expansion'],
    [/specialist_track/i, '전문성 심화', 'specialist-track deepening'],
    [/entry/i, '새 역할 진입', 'entry into a new role'],
    [/distance_tuning/i, '관계 거리 조정', 'distance tuning'],
    [/boundary_reset/i, '경계 재설정', 'boundary reset'],
    [/commitment_preparation/i, '관계 정의 준비', 'commitment preparation'],
    [/clarify_expectations/i, '기대치 명확화', 'expectation clarification'],
    [/commitment_execution/i, '관계 확정 실행', 'commitment execution'],
    [/cohabitation/i, '생활 결합 점검', 'cohabitation planning'],
    [/family_acceptance/i, '가족 수용 절차', 'family acceptance'],
    [/separation/i, '관계 분리 정리', 'relationship separation'],
    [/capital_allocation/i, '자금 배분 재검토', 'capital allocation review'],
    [/asset_exit/i, '자산 정리', 'asset exit'],
    [/debt_restructure/i, '부채 구조 재정리', 'debt restructuring'],
    [/income_growth/i, '수입 확장', 'income growth'],
    [/liquidity_defense/i, '유동성 방어', 'liquidity defense'],
    [/recovery_reset/i, '회복 리듬 재설정', 'recovery reset'],
    [/routine_lock/i, '루틴 고정', 'routine lock'],
    [/burnout_trigger/i, '번아웃 경고', 'burnout risk'],
    [/sleep_disruption/i, '수면 리듬 흔들림', 'sleep disruption'],
    [/commute_restructure/i, '동선 재설계', 'commute restructure'],
    [/route_recheck/i, '경로 재확인', 'route recheck'],
    [/basecamp_reset/i, '생활 거점 재정비', 'basecamp reset'],
    [/lease_decision/i, '계약 조건 검토', 'lease decision review'],
    [/housing_search/i, '거주 후보지 탐색', 'housing search'],
    [/relocation/i, '이동 결정', 'relocation'],
    [/learning_acceleration/i, '학습/역량 가속', 'learning acceleration'],
    [/deep_partnership_activation/i, '관계 심화 국면', 'deep partnership activation'],
    [/timing_upside/i, '상승 타이밍 집중', 'timing upside cluster'],
    [/timing_risk/i, '타이밍 변동 경계', 'timing risk cluster'],
    [/health_risk/i, '건강 경계 국면', 'health risk cluster'],
  ]

  for (const [pattern, ko, en] of entries) {
    if (pattern.test(value)) return lang === 'ko' ? ko : en
  }

  const normalized = value.replace(/_/g, ' ').trim()
  return lang === 'ko' ? normalized : normalized
}

function getElementLabel(
  element: string | undefined,
  lang: 'ko' | 'en'
): string {
  const normalized = normalizeElementKey(element)
  const map: Record<string, { ko: string; en: string }> = {
    wood: { ko: '목', en: 'wood' },
    fire: { ko: '화', en: 'fire' },
    earth: { ko: '토', en: 'earth' },
    metal: { ko: '금', en: 'metal' },
    water: { ko: '수', en: 'water' },
  }
  return map[normalized]?.[lang] || String(element || '')
}

function capitalizeFirst(text: string | undefined | null): string {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function containsHangul(text: string | undefined | null): boolean {
  return /[가-힣]/.test(String(text || ''))
}

function localizeGeokgukLabel(geokguk: string | undefined, lang: 'ko' | 'en'): string {
  const value = String(geokguk || '').trim()
  if (!value || lang === 'ko') return value
  const map: Record<string, string> = {
    '정재격': 'jeongjae frame',
    '편재격': 'pyeonjae frame',
    '정관격': 'jeonggwan frame',
    '편관격': 'pyeongwan frame',
    '인성격': 'inseong frame',
    '재성격': 'jaeseong frame',
    '식상격': 'siksang frame',
  }
  return map[value] || value
}

function formatCycleLabel(
  ganji: string | undefined,
  element: string | undefined,
  lang: 'ko' | 'en',
  fallback: string
): string {
  const ganjiLabel = String(ganji || '').trim()
  const elementLabel = getElementLabel(element, lang)
  if (ganjiLabel && elementLabel) return `${ganjiLabel} (${elementLabel})`
  if (ganjiLabel) return ganjiLabel
  if (elementLabel) return elementLabel
  return fallback
}

function normalizeElementKey(element: string | undefined): string {
  const raw = String(element || '').trim().toLowerCase()
  const map: Record<string, string> = {
    wood: 'wood',
    '목': 'wood',
    '木': 'wood',
    fire: 'fire',
    '화': 'fire',
    '火': 'fire',
    earth: 'earth',
    '토': 'earth',
    '土': 'earth',
    metal: 'metal',
    '금': 'metal',
    '金': 'metal',
    water: 'water',
    '수': 'water',
    '水': 'water',
  }
  return map[raw] || raw
}

function buildElementMetaphor(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): {
  archetype: string
  environment: string
  edge: string
  risk: string
} {
  const dayMaster = normalizeElementKey(input.dayMasterElement)
  switch (dayMaster) {
    case 'metal':
      return lang === 'ko'
        ? {
            archetype: '잡음을 잘라내는 칼날',
            environment: '복잡한 판에서 군더더기를 걷어내는 장면',
            edge: '정리와 절단력',
            risk: '지나치게 빨리 결론을 내릴 때 날이 무뎌지는 것',
          }
        : {
            archetype: 'a blade that cuts noise away',
            environment: 'a scene where clutter gets stripped from a crowded stage',
            edge: 'clarity and clean cuts',
            risk: 'dulling the edge by deciding too fast',
          }
    case 'wood':
      return lang === 'ko'
        ? {
            archetype: '판을 넓히며 자라는 큰 나무',
            environment: '가지가 퍼지듯 영향권을 넓히는 장면',
            edge: '확장과 성장력',
            risk: '뿌리 정리 없이 가지부터 늘리는 것',
          }
        : {
            archetype: 'a tree that expands by taking more ground',
            environment: 'a scene where influence spreads like branches',
            edge: 'growth and extension',
            risk: 'adding branches before stabilizing the roots',
          }
    case 'water':
      return lang === 'ko'
        ? {
            archetype: '빈틈을 찾아 흐르는 물길',
            environment: '막힌 곳 사이로 길을 만들어내는 장면',
            edge: '유연한 침투력',
            risk: '방향 없이 흘러 판단이 번지는 것',
          }
        : {
            archetype: 'a current that finds the opening',
            environment: 'a scene where a path forms through narrow gaps',
            edge: 'adaptive penetration',
            risk: 'spreading too thin without a fixed direction',
          }
    case 'fire':
      return lang === 'ko'
        ? {
            archetype: '순간에 판을 밝히는 불빛',
            environment: '모두가 망설일 때 장면을 선명하게 드러내는 순간',
            edge: '가시성과 추진력',
            risk: '열이 너무 빨라 번아웃으로 꺼지는 것',
          }
        : {
            archetype: 'a flame that lights the scene at once',
            environment: 'a moment that makes the whole stage visible',
            edge: 'visibility and momentum',
            risk: 'burning too hot and fading early',
          }
    default:
      return lang === 'ko'
        ? {
            archetype: '흔들리는 판을 붙잡는 축대',
            environment: '무너질 장면을 버티게 만드는 버팀목',
            edge: '지속력과 구조',
            risk: '움직일 타이밍까지 지나치게 늦추는 것',
          }
        : {
            archetype: 'a foundation that holds a shifting stage',
            environment: 'a support that keeps collapse from happening',
            edge: 'stability and structure',
            risk: 'delaying movement past the right timing',
          }
  }
}

function buildEvidenceLine(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const dayMaster = getElementLabel(input.dayMasterElement, lang)
  const yongsin = getElementLabel(input.yongsin, lang)
  const western = getWesternElementLabel(input.dominantWesternElement, lang)
  if (lang === 'ko') {
    const parts = [
      dayMaster ? `일간 ${dayMaster}` : '',
      input.geokguk ? `격국 ${input.geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0
      ? `${parts.join(', ')} 흐름이 같은 방향을 밀고 있기 때문에 이런 해석이 나옵니다.`
      : ''
  }
  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    input.geokguk ? `frame ${input.geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  return parts.length > 0
    ? `This reading comes from the same directional push across ${parts.join(', ')}.`
    : ''
}

function buildEvidenceFooter(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const dayMaster = normalizeNarrativeCoreText(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = normalizeNarrativeCoreText(getElementLabel(input.yongsin, lang), lang)
  const western = normalizeNarrativeCoreText(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const safeWestern = lang === 'en' && containsHangul(western) ? 'air' : western
  const geokguk = localizeGeokgukLabel(input.geokguk, lang)

  if (lang === 'ko') {
    const parts = [
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      safeWestern ? `서양 원소 ${safeWestern}` : '',
    ].filter(Boolean)
    return parts.length > 0 ? `핵심 근거는 ${parts.join(', ')}입니다.` : ''
  }

  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    safeWestern ? `dominant western element ${safeWestern}` : '',
  ].filter(Boolean)
  return parts.length > 0 ? normalizeNarrativeCoreText(`Key grounding comes from ${parts.join(', ')}.`, lang) : ''
}

function appendEvidenceFooter(
  body: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const evidence = buildEvidenceFooter(input, lang)
  if (!evidence) return body
  return `${body} ${evidence}`.trim()
}

function sanitizeNarrativeReason(
  value: string | null | undefined,
  lang: 'ko' | 'en',
  fallback = ''
): string {
  const text = String(value || '').trim()
  if (!text) return fallback
  return normalizeNarrativeCoreText(text, lang) || fallback
}

function buildReportTrustNarratives(
  reportCore: ReportCoreViewModel,
  coreQuality: DestinyCoreQuality | undefined,
  lang: 'ko' | 'en'
): { trust: string; provenance: string } {
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)

  return {
    trust: describeDataTrustSummary({
      score: coreQuality?.score,
      grade: coreQuality?.grade,
      missingFields: coreQuality?.dataQuality.missingFields || [],
      derivedFields: coreQuality?.dataQuality.derivedFields || [],
      conflictingFields: coreQuality?.dataQuality.conflictingFields || [],
      confidenceReason: coreQuality?.dataQuality.confidenceReason,
      lang,
    }),
    provenance: describeProvenanceSummary({
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

function attachTrustNarrativeToSections<T extends Record<string, unknown>>(
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

function renderIntroductionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const topDecision = reportCore.topDecisionLabel || reportCore.primaryAction
  const decadeLine = buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang)
  const shortDecadeLine =
    String(decadeLine || '')
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean)[0] || decadeLine
  const timingReason = sanitizeNarrativeReason(focusTiming?.whyNow, lang)
  const safeTimingReason = lang === 'en' && containsHangul(timingReason) ? '' : timingReason
  const metaphor = buildElementMetaphor(matrixInput, lang)
  const conflictNarrative = describeSajuAstroConflictByDomain({
    crossAgreement: reportCore.crossAgreement,
    focusDomainLabel: focusLabel,
    lang,
  })

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `이번 총운의 중심축은 ${focusLabel}입니다. 지금은 크게 벌이기보다 무엇을 먼저 고정할지가 결과를 가르는 구간입니다.`,
          `현재 판단 기준도 ${topDecision} 쪽으로 기울어 있어, 속도보다 순서와 기준 정리가 더 중요하게 작동합니다.`,
          timingReason
            ? `이 흐름이 지금 선명한 이유는 ${timingReason}`
            : `이 구간에서는 ${metaphor.edge}을 한 번에 다 쓰기보다, 어디에 먼저 써야 할지를 아는 쪽이 유리합니다.`,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        `You are at your strongest when the field gets cleaner, not louder. ${capitalizeFirst(metaphor.archetype)} is the right image for this phase.`,
        `The central axis right now is ${focusLabel}, and the operating bias is ${topDecision}.`,
        `${capitalizeFirst(metaphor.environment)} is where your ${metaphor.edge} become visible.`,
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
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderLifeMissionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusVerdict = findReportCoreVerdict(reportCore, reportCore.focusDomain)
  const leadScenarios = reportCore.topScenarioIds
    .slice(0, 3)
    .map((id) => formatScenarioIdForNarrative(id, lang))
    .filter(Boolean)
  const timeline = buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang)
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const metaphor = buildElementMetaphor(matrixInput, lang)
  const cycleLead = buildFocusedCycleLead(matrixInput, undefined, lang, 'lifeMission')
  const timingReason = sanitizeNarrativeReason(focusTiming?.whyNow, lang)
  const safeCycleLead = lang === 'en' && containsHangul(cycleLead) ? '' : cycleLead
  const safeTimingReason = lang === 'en' && containsHangul(timingReason) ? '' : timingReason

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          '이번 인생 구간은 성과 하나를 더 만드는 시기가 아니라, 앞으로 오래 가져갈 기준을 다시 세우는 시기입니다.',
          String(timeline || '')
            .split(/(?<=[.!?])\s+/)
            .map((line) => line.trim())
            .filter(Boolean)[0] || timeline,
          `이번 장기 흐름의 중심축은 ${focusLabel}이며, 지금 배워야 할 과제도 이 축에서 가장 선명하게 드러납니다.`,
          `${focusLabel}에서는 더 많이 쥐는 것보다, 어떤 기준을 반복 선택의 중심에 둘지가 장기 결과를 가릅니다.`,
          leadScenarios.length > 0
            ? `지금 인생 서사를 실제로 앞으로 미는 장면은 ${leadScenarios.join(', ')} 쪽입니다.`
            : '',
          `그래서 이번 10년은 성과를 늘리는 법보다, 다음 구간까지 들고 갈 원칙을 남기는 법을 배우는 쪽에 가깝습니다.`,
          `장기 흐름에서 가장 위험한 지점은 ${metaphor.risk}이 기준 상실이나 과속 확정으로 바뀌는 순간입니다.`,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
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
        normalizeNarrativeCoreText(focusVerdict?.rationale || reportCore.riskControl, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderPersonalityDeepSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const metaphor = buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          focusManifestation?.baselineThesis || '타고난 구조는 기준을 세우고 흐름을 조율하는 쪽에 가깝습니다.',
          `기본 성향의 강점은 ${metaphor.edge}을 빠르게 세우는 데 있고, 약점은 ${metaphor.risk}이 판단 과속으로 바뀔 때 드러납니다.`,
          '그래서 이 성향은 감으로 먼저 밀기보다, 기준 한 줄을 먼저 적고 움직일 때 가장 안정적으로 힘을 냅니다.',
          '핵심은 빠른 결론이 아니라, 결론과 확정의 타이밍을 분리하는 데 있습니다.',
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const safeBaseline = normalizeNarrativeCoreText(focusManifestation?.baselineThesis || '', lang)
    .replace(/\b(Personality Engine|Phase transition layer|Expansion resource layer)\b:?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
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
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderTimingAdviceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const rawSoftChecks = (reportCore.judgmentPolicy.softCheckLabels || reportCore.judgmentPolicy.softChecks || [])
    .filter(Boolean)
    .slice(0, 2)
  const isSafeEnglishTimingCheck = (value: string) =>
    !containsHangul(value) &&
    !/\b(evidence|probability|confidence|abort if|must stay active|should hold|active signals?|timing relevance|support stays latent)\b/i.test(
      value
    )
  const softChecks = rawSoftChecks
    .map((item) => normalizeNarrativeCoreText(item, lang))
    .filter((item) => (lang === 'en' ? isSafeEnglishTimingCheck(item) : true))
    .filter(Boolean)
  const entryChecks = (focusTiming?.entryConditions || [])
    .map((item) => normalizeNarrativeCoreText(item, lang))
    .filter((item) => (lang === 'en' ? isSafeEnglishTimingCheck(item) : true))
    .filter(Boolean)
    .slice(0, 2)
  const abortChecks = (focusTiming?.abortConditions || [])
    .map((item) => normalizeNarrativeCoreText(item, lang))
    .filter((item) => (lang === 'en' ? isSafeEnglishTimingCheck(item) : true))
    .filter(Boolean)
    .slice(0, 1)
  const metaphor = buildElementMetaphor(matrixInput, lang)
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
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          focusTiming
            ? `${focusLabel}에서는 지금 바로 크게 밀어붙이기보다, 검토와 확정을 다른 리듬으로 나눌 때 타이밍이 살아납니다.`
            : `${focusLabel}에서는 지금 한 번에 밀어붙이기보다, 단계를 나눠 움직이는 편이 맞습니다.`,
          `지금 타이밍의 힘은 속도를 올리는 데 있지 않고, ${metaphor.edge}을 언제 꺼내 쓸지 아는 데 있습니다.`,
          koreanTimingExecutionLine,
          '오늘은 결론을 서두르기보다, 한 번 더 확인할 지점을 먼저 문서로 남기는 편이 안전합니다.',
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
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

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        focusTiming
          ? `This is a usable ${getTimingWindowLabel(focusTiming.window, lang).toLowerCase()} window for ${focusLabel}, but only if sequence comes before speed.`
          : `This phase is usable for ${focusLabel}, but it should be handled in stages rather than in one push.`,
        `The timing edge here is not acceleration, but knowing when ${metaphor.edge} should actually be used.`,
        englishTimingExecutionLine,
        'Pause the move when assumptions start replacing direct communication or when scope cannot be verified in writing.',
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return body
}

function renderActionPlanSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const softChecks = (reportCore.judgmentPolicy.softCheckLabels || reportCore.judgmentPolicy.softChecks || [])
    .filter(Boolean)
    .slice(0, 2)
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
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `이번 실행의 우선 행동은 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
          '한 번에 닫으려 하지 말고, 먼저 역할과 범위를 적고 그다음 확인 지점을 끼워 넣으세요.',
          '분위기나 압박이 결정을 대신하게 두면, 지금 구간의 장점이 바로 손실로 바뀝니다.',
          koreanActionCheckLine,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return body
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

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        `The current priority is ${reportCore.topDecisionLabel || reportCore.primaryAction}.`,
        englishExecutionLine,
        'Do not mistake momentum for readiness; if the plan cannot survive one round of review, it is not ready to close.',
        'Before moving, make sure the next step can still be verified, revised, or paused without creating unnecessary damage.',
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return body
}

function renderCareerPathSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const timing = findReportCoreTimingWindow(reportCore, 'career')
  const verdict = findReportCoreVerdict(reportCore, 'career')
  const domainVerdict = findReportCoreDomainVerdict(reportCore, 'career')
  const leadScenario = formatScenarioIdForNarrative(domainVerdict?.leadScenarioId, lang)
  const allowed = (domainVerdict?.allowedActionLabels || domainVerdict?.allowedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const metaphor = buildElementMetaphor(matrixInput, lang)
  const safeTimingReason = lang === 'en' && containsHangul(timing?.whyNow) ? '' : sanitizeNarrativeReason(timing?.whyNow, lang)

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `당신의 커리어는 ${metaphor.archetype}처럼, 복잡한 판을 정리할수록 더 위력이 생깁니다.`,
          `${metaphor.environment}에서 ${metaphor.edge}이 커리어 강점으로 드러납니다.`,
          '핵심은 일을 늘리는 것보다 우선순위와 책임 범위를 먼저 고정하는 데 있습니다.',
          leadScenario ? `실제 커리어 서사는 ${leadScenario} 쪽으로 열려 있습니다.` : '',
          sanitizeNarrativeReason(timing?.whyNow, lang)
            ? `지금 이 장면이 중요한 이유는 ${sanitizeNarrativeReason(timing?.whyNow, lang)}`
            : '',
          `${metaphor.risk}이 커리어 손실로 이어지기 쉬우니, 확정보다 기준 고정이 먼저입니다.`,
          allowed
            ? '지금 커리어에서는 한 번에 닫기보다, 역할을 먼저 고정하고 중간 점검을 끼워 넣는 방식이 맞습니다.'
            : '',
          normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        `Your career gets sharper when the scene gets cleaner. ${capitalizeFirst(metaphor.archetype)} is the right image here.`,
        `${capitalizeFirst(metaphor.environment)} is where your ${metaphor.edge} become visible in work.`,
        'The real edge is not doing more, but deciding what you will be measured by.',
        leadScenario ? `The live career scene is ${leadScenario}.` : '',
        `${capitalizeFirst(metaphor.risk)} is the work risk to watch.`,
        allowed
          ? 'In career, the better move is not a one-shot close but a staged path: lock the role first, then insert a review point before final commitment.'
          : '',
        normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderRelationshipDynamicsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const timing = findReportCoreTimingWindow(reportCore, 'relationship')
  const verdict = findReportCoreVerdict(reportCore, 'relationship')
  const domainVerdict = findReportCoreDomainVerdict(reportCore, 'relationship')
  const leadScenario = formatScenarioIdForNarrative(domainVerdict?.leadScenarioId, lang)
  const blocked = (domainVerdict?.blockedActionLabels || domainVerdict?.blockedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const metaphor = buildElementMetaphor(matrixInput, lang)
  const safeTimingReason = lang === 'en' && containsHangul(timing?.whyNow) ? '' : sanitizeNarrativeReason(timing?.whyNow, lang)

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          '관계는 감정의 크기보다 해석 일치, 기대치 조정, 경계 설정이 맞을 때 훨씬 안정적으로 움직입니다.',
          '이번 관계 흐름은 바로 결론을 내리기보다 거리와 속도를 먼저 맞추는 쪽에 가깝습니다.',
          `${metaphor.archetype} 같은 기질은 관계에서도 선을 먼저 긋고 난 뒤에야 깊이를 허용하는 방식으로 드러납니다.`,
          leadScenario
            ? `지금 관계에서 실제로 반복되는 장면은 ${leadScenario}입니다.`
            : '',
          sanitizeNarrativeReason(timing?.whyNow, lang)
            ? `이 관계 이슈가 지금 떠오르는 이유는 ${sanitizeNarrativeReason(timing?.whyNow, lang)}`
            : '',
          blocked
            ? '특히 결론을 서두르거나 확인 없이 선을 넘는 방식은 오해를 키울 수 있습니다.'
            : '',
          normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryCaution, lang),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        'Relationships improve here when interpretation, boundaries, and pacing line up before commitment pressure rises.',
        'This phase is less about forcing a conclusion and more about matching distance, pace, and expectations.',
        `${capitalizeFirst(metaphor.archetype)} shows up in relationships as the need to draw the line before going deeper.`,
        leadScenario ? `The relationship scene repeating now is ${leadScenario}.` : '',
        blocked
          ? 'Pushing commitment or crossing the line without enough verification is more likely to enlarge misunderstanding.'
          : '',
        normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryCaution, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderWealthPotentialSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const advisory = findReportCoreAdvisory(reportCore, 'wealth')
  const timing = findReportCoreTimingWindow(reportCore, 'wealth')
  const manifestation = findReportCoreManifestation(reportCore, 'wealth')
  const verdict = findReportCoreVerdict(reportCore, 'wealth')
  const metaphor = buildElementMetaphor(matrixInput, lang)
  const safeTimingReason = lang === 'en' ? '' : sanitizeNarrativeReason(timing?.whyNow, lang)

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `재정은 ${metaphor.archetype}처럼 숫자와 조건을 차갑게 가를수록 더 오래 남습니다.`,
          manifestation?.manifestation ||
            '이번 돈의 흐름은 수익을 부풀리는 시기라기보다, 어디로 들어오고 어디서 새는지를 냉정하게 갈라봐야 하는 구간입니다.',
          `${metaphor.environment}처럼 돈도 힘을 줄 자리와 잘라낼 지출을 먼저 가를 때 비로소 속도가 붙습니다.`,
          sanitizeNarrativeReason(timing?.whyNow, lang)
            ? `지금 이 판단이 필요한 이유는 ${sanitizeNarrativeReason(timing?.whyNow, lang)}`
            : '',
          `${metaphor.risk}이 재정에서는 과속 투자, 대충 넘긴 조건, 손실 상한 없는 약속으로 바뀌기 쉽습니다.`,
          '이번 재정의 승부처는 많이 버는 장면이 아니라, 어디까지 잃을 수 있고 무엇까지 책임질지를 먼저 써두는 데 있습니다.',
          '돈이 들어오는 문보다 먼저 점검해야 할 것은 계약 조건, 정산 기준, 손실 상한입니다.',
          normalizeNarrativeCoreText(
            verdict?.rationale || advisory?.caution || reportCore.riskControl,
            lang
          ),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        `Wealth lasts longer when numbers, limits, and terms stay clean. ${capitalizeFirst(metaphor.archetype)} is the right money image here.`,
        capitalizeFirst(
          manifestation?.manifestation ||
            'This is less a phase for inflating upside and more a phase for separating inflow, leakage, and obligation with precision.'
        ),
        `${capitalizeFirst(metaphor.environment)} is where the money decision becomes visible: decide what gets resources and what gets cut before you scale anything.`,
        safeTimingReason
          ? `This matters now because ${safeTimingReason}`
          : '',
        `${capitalizeFirst(metaphor.risk)} tends to show up in money as rushed commitments, vague terms, and downside that was never defined in writing.`,
        'The real money edge now is not bigger upside, but knowing exactly what can leak, what remains negotiable, and where the downside stops.',
        'Before you chase more money, lock the terms, settlement logic, and loss boundary.',
        normalizeNarrativeCoreText(
          verdict?.rationale || advisory?.caution || reportCore.riskControl,
          lang
        ),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderConclusionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const metaphor = buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `이번 총운의 결론은 단순합니다. ${focusLabel} 축에서는 재능보다 운영 순서가 결과를 더 크게 가릅니다.`,
          `지금 차이를 만드는 건 ${metaphor.edge}을 어떤 순서로 쓰느냐입니다.`,
          reportCore.riskControl,
        ].join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        `The conclusion is simple: in ${focusLabel}, the person who sets the standard first usually controls the phase.`,
        `What changes the outcome here is not raw talent, but how ${metaphor.edge} get applied in sequence.`,
        reportCore.riskControl,
      ].join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang)
}

function renderHealthGuidanceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const timing = findReportCoreTimingWindow(reportCore, 'health')
  const verdict = findReportCoreVerdict(reportCore, 'health')
  const metaphor = buildElementMetaphor(matrixInput, lang)

  if (lang === 'ko') {
    const body = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          '건강은 버티는 힘보다 회복 리듬과 과부하 신호를 얼마나 빨리 정리하느냐에서 갈립니다.',
          '이번 건강 흐름은 몰아붙이는 하루보다 반복 가능한 회복 루틴을 먼저 고정하는 쪽이 강합니다.',
          `${metaphor.risk}이 몸에서는 피로 누적과 회복 지연으로 바뀌기 쉽습니다.`,
          sanitizeNarrativeReason(timing?.whyNow, lang)
            ? `지금 몸 상태를 다시 봐야 하는 이유는 ${sanitizeNarrativeReason(timing?.whyNow, lang)}`
            : '',
          normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
        ]
          .filter(Boolean)
          .join(' ')
      ),
      lang
    )
    return appendEvidenceFooter(body, matrixInput, lang)
  }

  const body = formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        'Health depends more on recovery rhythm and overload detection than on endurance alone.',
        'This phase rewards repeatable recovery before intensity.',
        `${capitalizeFirst(metaphor.risk)} often turns into fatigue build-up or delayed recovery in the body.`,
        normalizeNarrativeCoreText(verdict?.rationale || reportCore.primaryAction, lang),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    lang
  )
  return appendEvidenceFooter(body, matrixInput, lang)
}

function shouldForceComprehensiveNarrativeFallback(
  quality: ReportQualityMetrics | undefined
): boolean {
  if (!quality) return false
  return Boolean(
    (quality.crossSectionRepetition || 0) >= 3 ||
      (quality.genericAdviceDensity || 0) >= 0.5 ||
      (quality.internalScenarioLeakCount || 0) > 0
  )
}

function stripGenericEvidenceFooterText(
  text: string,
  lang: 'ko' | 'en'
): string {
  const value = String(text || '').trim()
  if (!value) return value
  const pattern =
    lang === 'ko'
      ? /\s*핵심 근거는\s*[^.!?\n]+입니다\.?\s*$/u
      : /\s*Key grounding comes from\s*[^.!?\n]+\.\s*$/iu
  return value.replace(pattern, '').trim()
}

function stripGenericEvidenceFooters(
  sections: Record<string, unknown>,
  paths: string[],
  lang: 'ko' | 'en'
): Record<string, unknown> {
  for (const path of paths) {
    const text = getPathText(sections, path)
    if (!text) continue
    setPathText(sections, path, stripGenericEvidenceFooterText(text, lang))
  }
  return sections
}

function enforceComprehensiveNarrativeQualityFallback(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): AIPremiumReport['sections'] {
  const next: AIPremiumReport['sections'] = { ...sections }
  next.introduction = renderIntroductionSection(reportCore, matrixInput, lang)
  next.personalityDeep = renderPersonalityDeepSection(reportCore, matrixInput, lang)
  next.lifeMission = renderLifeMissionSection(reportCore, matrixInput, lang)
  next.careerPath = renderCareerPathSection(reportCore, matrixInput, lang)
  next.relationshipDynamics = renderRelationshipDynamicsSection(reportCore, matrixInput, lang)
  next.wealthPotential = renderWealthPotentialSection(reportCore, matrixInput, lang)
  next.healthGuidance = renderHealthGuidanceSection(reportCore, matrixInput, lang)
  next.timingAdvice = renderTimingAdviceSection(reportCore, matrixInput, lang)
  next.actionPlan = renderActionPlanSection(reportCore, matrixInput, lang)
  next.conclusion = renderConclusionSection(reportCore, matrixInput, lang)
  return sanitizeComprehensiveSectionsForUser(
    next as unknown as Record<string, unknown>,
    lang
  ) as AIPremiumReport['sections']
}

function buildTimingSectionHook(
  section: keyof TimingReportSections,
  lang: 'ko' | 'en'
): string {
  if (lang !== 'ko') {
    const hooks: Record<keyof TimingReportSections, string> = {
      overview: 'This is not a day to win by speed. It is a day to win by clean sequencing.',
      energy: 'If you push past your rhythm, recovery cost will rise faster than output.',
      opportunities: 'The real opening sits in closing what is already within reach.',
      cautions: 'The main risk now is not lack of talent, but interpretation drift and rushed confirmation.',
      domains: 'Each domain improves when timing and confirmation are treated as separate decisions.',
      actionPlan: 'Keep the plan brutally simple so execution can actually happen.',
      luckyElements: 'Your edge today comes from order, not from impulse.',
    }
    return hooks[section]
  }
  const hooks: Record<keyof TimingReportSections, string> = {
    overview: '오늘은 빨리 밀어붙여 이기는 날이 아니라, 순서를 잘 나눠서 이기는 날입니다.',
    energy: '컨디션을 무리해서 끌어올리면 성과보다 회복 비용이 먼저 커질 수 있습니다.',
    opportunities: '지금 기회는 새 문을 여러 개 여는 데보다, 이미 열린 문을 정확히 닫는 데 있습니다.',
    cautions: '이번 구간의 리스크는 실력 부족보다 해석 오차와 성급한 확정에서 생기기 쉽습니다.',
    domains: '도메인별로 보면 공통 승부처는 속도가 아니라 확인과 합의의 밀도입니다.',
    actionPlan: '실행 계획은 멋있게 짜는 것보다 끝까지 지킬 수 있게 줄이는 편이 훨씬 강합니다.',
    luckyElements: '오늘의 운은 감각보다 운영 순서에서 갈립니다.',
  }
  return hooks[section]
}

function buildThemedSectionHook(
  theme: ReportTheme,
  section: keyof ThemedReportSections,
  lang: 'ko' | 'en'
): string {
  if (lang !== 'ko') {
    const en: Record<ReportTheme, Partial<Record<keyof ThemedReportSections, string>>> = {
      love: {
        deepAnalysis: 'The relationship theme sharpens around emotional clarity, not emotional volume.',
        compatibility: 'Compatibility improves when emotional tempo and commitment tempo stop fighting each other.',
        spouseProfile: 'The partner profile becomes clearer when steadiness matters more than excitement alone.',
        marriageTiming: 'Commitment timing strengthens when trust and daily fit rise together.',
        timing: 'Relationship timing improves when confirmation catches up with attraction.',
        actionPlan: 'The strongest move here is to slow the conclusion and strengthen the understanding.',
      },
      career: {
        deepAnalysis: 'The career theme turns on whether your standards are visible enough to trust.',
        strategy: 'The win here is not expansion alone, but becoming the person trusted with harder decisions.',
        roleFit: 'The right seat is the one where judgment and coordination matter more than noise.',
        turningPoints: 'Career turning points open when old operating rules are no longer enough.',
        actionPlan: 'Execution improves when role, scope, and deadline are locked before momentum builds.',
      },
      wealth: {
        deepAnalysis: 'The wealth theme rewards controlled upside rather than hurried gain.',
        strategy: 'The strongest financial move is disciplined filtering before commitment.',
        incomeStreams: 'Income grows faster when repeatable structure beats short-lived excitement.',
        riskManagement: 'Financial defense matters most before momentum convinces you that risk is small.',
        actionPlan: 'Protect the downside first, then decide how much upside is worth chasing.',
      },
      health: {
        deepAnalysis: 'The health theme is less about endurance and more about recovery quality.',
        prevention: 'Prevention works best when small signals are handled before they become expensive.',
        riskWindows: 'Risk windows open quietly, usually before the body has to force a stop.',
        recoveryPlan: 'Recovery improves when the plan is sustainable enough to repeat without negotiation.',
        timing: 'Body signals matter most when they appear small enough to ignore.',
        actionPlan: 'Short, repeatable recovery choices will outperform one heroic correction.',
      },
      family: {
        deepAnalysis: 'The family theme stabilizes when interpretation becomes clearer than emotion.',
        dynamics: 'Family dynamics calm down when roles and expectations are clearer than assumptions.',
        communication: 'Communication improves when the message gets shorter and the context gets clearer.',
        legacy: 'What remains in family life is shaped less by intensity than by the patterns repeated over time.',
        actionPlan: 'Reduce friction by shortening the message and clarifying the context first.',
      },
    }
    return en[theme]?.[section] || ''
  }
  const ko: Record<ReportTheme, Partial<Record<keyof ThemedReportSections, string>>> = {
    love: {
      deepAnalysis: '이번 관계 테마의 핵심은 감정의 크기보다 감정이 정확히 전달되는 구조를 만드는 데 있습니다.',
      compatibility: '관계 궁합은 감정의 온도보다 서로의 속도와 약속 방식이 맞아들 때 훨씬 안정됩니다.',
      spouseProfile: '배우자상은 설렘의 강도보다 꾸준함과 생활 적합성이 드러날 때 더 정확해집니다.',
      marriageTiming: '결혼 타이밍은 감정이 커질 때보다 신뢰와 생활 리듬이 함께 맞아들 때 강해집니다.',
      timing: '관계 타이밍은 끌림이 올라오는 순간보다 이해가 맞춰지는 순간에 더 강해집니다.',
      actionPlan: '지금 가장 강한 선택은 결론을 서두르는 것이 아니라, 이해를 먼저 맞추는 것입니다.',
    },
    career: {
      deepAnalysis: '이번 커리어 테마의 승부처는 많이 하는 사람이 아니라, 기준이 선명한 사람으로 보이는 데 있습니다.',
      strategy: '지금 커리어 전략의 승부처는 일을 많이 벌이는 것이 아니라, 더 어려운 결정을 맡겨도 흔들리지 않는 사람으로 보이는 데 있습니다.',
      roleFit: '잘 맞는 자리는 화려한 직함보다 판단과 조율의 무게를 견딜 수 있는 자리입니다.',
      turningPoints: '커리어 전환점은 기회가 몰려올 때보다, 지금 방식으로는 다음 단계에 못 간다는 사실을 인정할 때 열립니다.',
      actionPlan: '실행력은 의욕보다 역할·범위·마감이 먼저 고정될 때 훨씬 강해집니다.',
    },
    wealth: {
      deepAnalysis: '이번 재정 테마는 빨리 버는 흐름보다, 새는 구멍을 먼저 막는 설계에서 힘이 납니다.',
      strategy: '재정 전략의 핵심은 수익을 키우는 것보다 손실 상한을 분명히 정하는 데 있습니다.',
      incomeStreams: '수입 흐름은 한 번 크게 벌리는 시도보다, 반복 가능한 구조를 늘릴 때 더 안정적으로 커집니다.',
      riskManagement: '리스크 관리는 손실이 터진 뒤 수습하는 것이 아니라, 흔들릴 지점을 먼저 줄이는 데서 시작합니다.',
      actionPlan: '조건을 먼저 고정하면 수익은 늦게 보여도 결과는 더 오래 남습니다.',
    },
    health: {
      deepAnalysis: '이번 건강 테마는 버티는 힘보다 회복을 끊기지 않게 이어가는 힘이 더 중요합니다.',
      prevention: '예방의 핵심은 큰 이상을 기다리는 것이 아니라, 작은 무리 신호를 초기에 바로잡는 데 있습니다.',
      riskWindows: '건강 리스크 구간은 갑자기 터지는 듯 보여도, 실제로는 작은 신호를 놓치면서 조용히 열리는 경우가 많습니다.',
      recoveryPlan: '회복 계획은 강한 처방 한 번보다, 반복 가능한 회복 습관이 끊기지 않게 이어질 때 힘을 냅니다.',
      timing: '몸의 타이밍은 큰 경고보다 작은 피로 신호를 어떻게 다루느냐에서 갈립니다.',
      actionPlan: '강한 하루 한 번보다, 지킬 수 있는 회복 루틴 여러 번이 지금은 더 강한 해법입니다.',
    },
    family: {
      deepAnalysis: '이번 가족 테마는 누가 맞는지보다 서로의 해석 차이를 얼마나 줄일 수 있는지가 핵심입니다.',
      dynamics: '가족 관계의 흐름은 감정의 세기보다 역할과 기대가 얼마나 분명한지에 따라 훨씬 크게 달라집니다.',
      communication: '가족 커뮤니케이션은 말을 많이 하는 것보다, 같은 상황을 같은 뜻으로 이해하게 만드는 데서 풀립니다.',
      legacy: '가족에게 남는 것은 한 번의 강한 장면보다 오랫동안 반복된 태도와 방식입니다.',
      actionPlan: '관계 마찰을 줄이는 가장 빠른 방법은 말을 늘리는 게 아니라 맥락을 먼저 맞추는 것입니다.',
    },
  }
  return ko[theme]?.[section] || ''
}

function buildComprehensiveSectionHook(
  section:
    | 'introduction'
    | 'careerPath'
    | 'relationshipDynamics'
    | 'wealthPotential'
    | 'healthGuidance'
    | 'conclusion',
  lang: 'ko' | 'en'
): string {
  if (lang !== 'ko') {
    const hooks = {
      introduction:
        'This is a report about operating leverage, not vague potential, so the first priority is where momentum is actually moving.',
      careerPath:
        'Career moves now favor visible judgment and priority control more than broad expansion.',
      relationshipDynamics:
        'Relationship quality improves fastest when interpretation drift is reduced before emotion escalates.',
      wealthPotential:
        'Financial quality rises when condition checks become stronger than upside excitement.',
      healthGuidance:
        'Health management is decided less by endurance and more by how quickly recovery rhythm is restored.',
      conclusion:
        'The conclusion of this cycle is simple: results improve when speed and verification stop fighting each other.',
    } as const
    return hooks[section]
  }

  const hooks = {
    introduction:
      '이번 종합 리포트의 핵심은 막연한 가능성을 늘어놓는 것이 아니라, 지금 판세를 실제로 움직이는 축을 먼저 선명하게 잡아내는 데 있습니다.',
    careerPath:
      '커리어는 많이 벌이는 사람보다, 우선순위와 판단 기준을 선명하게 보여주는 사람이 이기는 구간입니다.',
    relationshipDynamics:
      '관계의 체감 품질은 감정 표현보다 해석 오차를 얼마나 빨리 줄이느냐에서 먼저 갈립니다.',
    wealthPotential:
      '재정은 기대수익을 키우는 것보다, 조건 검증과 손실 상한을 먼저 다루는 사람이 결국 이깁니다.',
    healthGuidance:
      '건강은 버티는 힘보다 회복 리듬을 얼마나 빨리 되찾는지가 컨디션 격차를 만듭니다.',
    conclusion:
      '이번 흐름의 결론은 재능보다 운영입니다. 밀어붙일 순간과 멈춰 점검할 순간만 정확히 가르면 같은 재능도 전혀 다른 결과를 만듭니다.',
  } as const
  return hooks[section]
}

function reinforceNarrativeSection(
  base: string,
  critical: string[],
  supplemental: string[],
  lang: 'ko' | 'en',
  minChars: number
): string {
  let out = sanitizeUserFacingNarrative(String(base || '').trim())
  const criticalLines = [...new Set(critical.map((item) => buildReportCoreLine(item, lang)).filter(Boolean))]
  for (const line of criticalLines.reverse()) {
    if (out.includes(line)) continue
    out = out ? `${line} ${out}` : line
  }
  out = ensureLongSectionNarrative(out, minChars, supplemental.map((item) => buildReportCoreLine(item, lang)))
  return formatNarrativeParagraphs(sanitizeUserFacingNarrative(out), lang)
}

function findReportCoreAdvisory(
  reportCore: ReportCoreViewModel,
  domain: string
) {
  return reportCore.advisories.find((item) => item.domain === domain) || null
}

function findReportCoreTimingWindow(
  reportCore: ReportCoreViewModel,
  domain: string
) {
  return reportCore.domainTimingWindows.find((item) => item.domain === domain) || null
}

function findReportCoreManifestation(
  reportCore: ReportCoreViewModel,
  domain: string
) {
  return reportCore.manifestations.find((item) => item.domain === domain) || null
}

function findReportCoreVerdict(
  reportCore: ReportCoreViewModel,
  domain: string
) {
  return reportCore.domainVerdicts.find((item) => item.domain === domain) || null
}

function enrichComprehensiveSectionsWithReportCore(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  sectionSupplements: Record<string, string[]> = {},
  timingData?: TimingData
): AIPremiumReport['sections'] {
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const focusDomainLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const rawFocusNarrative =
    focusAdvisory?.thesis || focusManifestation?.manifestation || reportCore.thesis || ''
  const focusNarrativeForIntro =
    lang === 'ko'
      ? rawFocusNarrative.replace(new RegExp(`^${focusDomainLabel}(?:는|은)\\s*`), '')
      : rawFocusNarrative
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const wealthAdvisory = findReportCoreAdvisory(reportCore, 'wealth')
  const healthAdvisory = findReportCoreAdvisory(reportCore, 'health')
  const careerTiming = findReportCoreTimingWindow(reportCore, 'career')
  const relationshipTiming = findReportCoreTimingWindow(reportCore, 'relationship')
  const wealthTiming = findReportCoreTimingWindow(reportCore, 'wealth')
  const healthTiming = findReportCoreTimingWindow(reportCore, 'health')
  const moveTiming = findReportCoreTimingWindow(reportCore, 'move')
  const careerManifestation = findReportCoreManifestation(reportCore, 'career')
  const relationshipManifestation = findReportCoreManifestation(reportCore, 'relationship')
  const wealthManifestation = findReportCoreManifestation(reportCore, 'wealth')
  const healthManifestation = findReportCoreManifestation(reportCore, 'health')
  const moveManifestation = findReportCoreManifestation(reportCore, 'move')
  const careerVerdict = findReportCoreVerdict(reportCore, 'career')
  const relationshipVerdict = findReportCoreVerdict(reportCore, 'relationship')
  const wealthVerdict = findReportCoreVerdict(reportCore, 'wealth')
  const healthVerdict = findReportCoreVerdict(reportCore, 'health')
  const moveVerdict = findReportCoreVerdict(reportCore, 'move')
  const blockedCareerLines = [careerAdvisory?.thesis, careerAdvisory?.action, reportCore.thesis]

  return {
    introduction: buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHook('introduction', lang),
        buildSectionPersonalLead('introduction', matrixInput, lang, timingData),
        lang === 'ko'
          ? `지금 인생 전체 흐름에서 가장 크게 움직이는 축은 ${focusDomainLabel}이고, 현재 국면은 ${focusNarrativeForIntro}`
          : `The strongest axis in your life right now is ${focusDomainLabel}, and the current movement is ${focusNarrativeForIntro}.`,
        buildPrimaryActionLead(
          reportCore.primaryAction,
          reportCore.riskControl,
          lang
        ),
        buildPrimaryCautionLead(
          reportCore.primaryCaution,
          reportCore.riskControl,
          lang
        ),
      ],
      [
        reportCore.gradeReason,
        focusAdvisory?.strategyLine || '',
        focusTiming ? buildTimingWindowNarrative(focusTiming.domain, focusTiming, lang) : '',
        focusManifestation ? buildManifestationNarrative(focusManifestation, lang) : '',
        reportCore.gradeReason,
        reportCore.riskControl,
        ...(sectionSupplements.introduction || []),
      ],
      sections.introduction,
      lang,
      lang === 'ko' ? 1000 : 700,
      false,
      false
    ),
    personalityDeep: buildNarrativeSectionFromCore(
      [
        buildSectionPersonalLead('personalityDeep', matrixInput, lang, timingData),
        lang === 'ko'
          ? '기본 성향에서는 확장 욕구와 확인 본능이 동시에 강하게 작동합니다.'
          : 'At the personality level, expansion drive and verification instinct operate together.',
        lang === 'ko'
          ? '당신의 기본 성향은 빠른 판단보다 기준을 세운 뒤 밀어붙일 때 가장 강합니다.'
          : 'Your baseline style becomes strongest when you define standards before you push.',
      ],
      [
        focusManifestation?.activationThesis || '',
        focusAdvisory?.caution || '',
        reportCore.coherenceAudit.notes[0] || '',
        ...(sectionSupplements.personalityDeep || []),
      ],
      sections.personalityDeep,
      lang,
      lang === 'ko' ? 900 : 650,
      false,
      false
    ),
    careerPath: buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHook('careerPath', lang),
        buildSectionPersonalLead('careerPath', matrixInput, lang, timingData),
        careerAdvisory?.thesis || '',
        careerAdvisory?.action || '',
      ],
      [
        careerAdvisory?.strategyLine || '',
        careerTiming ? buildTimingWindowNarrative('career', careerTiming, lang) : '',
        careerManifestation ? buildManifestationNarrative(careerManifestation, lang) : '',
        careerVerdict ? buildVerdictNarrative(careerVerdict, lang) : '',
        careerAdvisory?.caution || '',
        ...(sectionSupplements.careerPath || []),
      ],
      sections.careerPath,
      lang,
      lang === 'ko' ? 950 : 680,
      false,
      false
    ),
    relationshipDynamics: buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHook('relationshipDynamics', lang),
        buildSectionPersonalLead('relationshipDynamics', matrixInput, lang, timingData),
        distinctNarrative(relationshipAdvisory?.thesis, blockedCareerLines) ||
          (lang === 'ko'
            ? '관계에서는 속도보다 해석의 정확도가 더 중요하게 작동합니다.'
            : 'In relationships, interpretive accuracy matters more than speed.'),
        distinctNarrative(relationshipAdvisory?.action, blockedCareerLines) ||
          (lang === 'ko'
            ? '결론을 던지기 전에 서로 이해한 문장을 짧게 맞춰보는 편이 유리합니다.'
            : 'It is better to align one short sentence of shared understanding before making a conclusion.'),
      ],
      [
        relationshipAdvisory?.strategyLine || '',
        relationshipTiming ? buildTimingWindowNarrative('relationship', relationshipTiming, lang) : '',
        relationshipManifestation ? buildManifestationNarrative(relationshipManifestation, lang) : '',
        relationshipVerdict ? buildVerdictNarrative(relationshipVerdict, lang) : '',
        relationshipAdvisory?.caution || '',
        ...(sectionSupplements.relationshipDynamics || []),
      ],
      sections.relationshipDynamics,
      lang,
      lang === 'ko' ? 950 : 680,
      false,
      false
    ),
    wealthPotential: buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHook('wealthPotential', lang),
        buildSectionPersonalLead('wealthPotential', matrixInput, lang, timingData),
        distinctNarrative(wealthAdvisory?.thesis, blockedCareerLines) || '',
        distinctNarrative(wealthAdvisory?.action, blockedCareerLines) || '',
      ],
      [
        wealthAdvisory?.strategyLine || '',
        wealthTiming ? buildTimingWindowNarrative('wealth', wealthTiming, lang) : '',
        wealthManifestation ? buildManifestationNarrative(wealthManifestation, lang) : '',
        wealthVerdict ? buildVerdictNarrative(wealthVerdict, lang) : '',
        wealthAdvisory?.caution || '',
        ...(sectionSupplements.wealthPotential || []),
      ],
      sections.wealthPotential,
      lang,
      lang === 'ko' ? 950 : 680,
      false,
      false
    ),
    healthGuidance: buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHook('healthGuidance', lang),
        buildSectionPersonalLead('healthGuidance', matrixInput, lang, timingData),
        distinctNarrative(healthAdvisory?.thesis, blockedCareerLines) || '',
        distinctNarrative(healthAdvisory?.action, blockedCareerLines) || '',
      ],
      [
        healthAdvisory?.strategyLine || '',
        healthTiming ? buildTimingWindowNarrative('health', healthTiming, lang) : '',
        healthManifestation ? buildManifestationNarrative(healthManifestation, lang) : '',
        healthVerdict ? buildVerdictNarrative(healthVerdict, lang) : '',
        healthAdvisory?.caution || '',
        ...(sectionSupplements.healthGuidance || []),
      ],
      sections.healthGuidance,
      lang,
      lang === 'ko' ? 900 : 650,
      false,
      false
    ),
    lifeMission: buildNarrativeSectionFromCore(
      [
        buildSectionPersonalLead('lifeMission', matrixInput, lang, timingData),
        lang === 'ko'
          ? '인생 전체 흐름에서 중요한 건 한 번의 큰 선택보다, 반복 가능한 기준을 만드는 일입니다.'
          : 'Across the whole life arc, what matters is building repeatable standards rather than chasing one oversized decision.',
        lang === 'ko'
          ? '장기적으로는 성과보다 기준, 속도보다 누적 가능한 운영 방식이 더 큰 차이를 만듭니다.'
          : 'In the long run, standards and repeatable operation matter more than bursts of speed.',
      ],
      [
        focusManifestation ? buildManifestationNarrative(focusManifestation, lang) : '',
        reportCore.judgmentPolicy.rationale,
        ...(reportCore.coherenceAudit.notes || []),
        ...(sectionSupplements.lifeMission || []),
      ],
      sections.lifeMission,
      lang,
      lang === 'ko' ? 900 : 650,
      false,
      false
    ),
    timingAdvice: ensureLongSectionNarrative(
      renderTimingAdviceSection(reportCore, matrixInput, lang),
      lang === 'ko' ? 950 : 680,
      sectionSupplements.timingAdvice || []
    ),
    actionPlan: ensureLongSectionNarrative(
      renderActionPlanSection(reportCore, matrixInput, lang),
      lang === 'ko' ? 900 : 650,
      sectionSupplements.actionPlan || []
    ),
    conclusion: buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHook('conclusion', lang),
        buildSectionPersonalLead('conclusion', matrixInput, lang, timingData),
        lang === 'ko'
          ? `지금 결론은 ${reportCore.thesis}`
          : `The current conclusion is ${reportCore.thesis}`,
        lang === 'ko'
          ? '이 흐름에서는 성급한 확정보다 기준 정리와 순서 설계가 결과를 더 크게 바꿉니다.'
          : 'In this phase, clarifying standards and sequence matters more than rushing commitment.',
      ],
      [
        reportCore.primaryAction,
        reportCore.primaryCaution,
        reportCore.riskControl,
        moveTiming ? buildTimingWindowNarrative('move', moveTiming, lang) : '',
        moveManifestation ? buildManifestationNarrative(moveManifestation, lang) : '',
        moveVerdict ? buildVerdictNarrative(moveVerdict, lang) : '',
        ...(sectionSupplements.conclusion || []),
      ],
      sections.conclusion,
      lang,
      lang === 'ko' ? 820 : 600,
      false,
      false
    ),
  }
}

function enrichTimingSectionsWithReportCore(
  sections: TimingReportSections,
  reportCore: ReportCoreViewModel,
  lang: 'ko' | 'en'
): TimingReportSections {
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const career = findReportCoreAdvisory(reportCore, 'career')
  const relationship = findReportCoreAdvisory(reportCore, 'relationship')
  const wealth = findReportCoreAdvisory(reportCore, 'wealth')
  const health = findReportCoreAdvisory(reportCore, 'health')
  const wealthVerdict = findReportCoreVerdict(reportCore, 'wealth')
  const allowedActionCopy = [
    ...(reportCore.judgmentPolicy.allowedActionLabels || []),
    ...((wealthVerdict?.allowedActionLabels as string[] | undefined) || []),
  ].filter(Boolean)
  const blockedActionCopy = [
    ...(reportCore.judgmentPolicy.blockedActionLabels || []),
  ].filter(Boolean)
  const softCheckCopy = formatPolicyCheckLabels(
    reportCore.judgmentPolicy.softCheckLabels || reportCore.judgmentPolicy.softChecks
  )
  const hardStopCopy = formatPolicyCheckLabels(
    reportCore.judgmentPolicy.hardStopLabels || reportCore.judgmentPolicy.hardStops
  )

  return {
    ...sections,
    overview: reinforceNarrativeSection(
      sections.overview,
      [
        buildTimingSectionHook('overview', lang),
        reportCore.thesis,
        reportCore.gradeReason,
      ],
      [
        focusAdvisory?.strategyLine || '',
        focusTiming?.whyNow || '',
      ],
      lang,
      lang === 'ko' ? 380 : 260
    ),
    energy: reinforceNarrativeSection(
      sections.energy,
      [
        buildTimingSectionHook('energy', lang),
        focusManifestation?.activationThesis || focusAdvisory?.thesis || reportCore.thesis,
      ],
      [
        focusManifestation?.manifestation || '',
        ...(focusManifestation?.likelyExpressions || []),
      ],
      lang,
      lang === 'ko' ? 360 : 240
    ),
    opportunities: reinforceNarrativeSection(
      sections.opportunities,
      [
        buildTimingSectionHook('opportunities', lang),
        reportCore.primaryAction,
        focusAdvisory?.action || '',
      ],
      [
        ...allowedActionCopy,
      ],
      lang,
      lang === 'ko' ? 360 : 240
    ),
    cautions: reinforceNarrativeSection(
      sections.cautions,
      [
        buildTimingSectionHook('cautions', lang),
        reportCore.primaryCaution,
        reportCore.riskControl,
      ],
      [
        ...blockedActionCopy,
        ...hardStopCopy,
      ],
      lang,
      lang === 'ko' ? 360 : 240
    ),
    domains: {
      career: reinforceNarrativeSection(
        sections.domains.career,
        [buildTimingSectionHook('domains', lang), career?.thesis || '', career?.action || ''],
        [career?.timingHint || '', career?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220
      ),
      love: reinforceNarrativeSection(
        sections.domains.love,
        [buildTimingSectionHook('domains', lang), relationship?.thesis || '', relationship?.action || ''],
        [relationship?.timingHint || '', relationship?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220
      ),
      wealth: reinforceNarrativeSection(
        sections.domains.wealth,
        [buildTimingSectionHook('domains', lang), wealth?.thesis || '', wealth?.action || ''],
        [wealth?.timingHint || '', wealth?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220
      ),
      health: reinforceNarrativeSection(
        sections.domains.health,
        [buildTimingSectionHook('domains', lang), health?.thesis || '', health?.action || ''],
        [health?.timingHint || '', health?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220
      ),
    },
    actionPlan: reinforceNarrativeSection(
      sections.actionPlan,
      [buildTimingSectionHook('actionPlan', lang), reportCore.primaryAction, reportCore.riskControl],
      [
        ...softCheckCopy,
        ...hardStopCopy,
      ],
      lang,
      lang === 'ko' ? 380 : 260
    ),
  }
}

function enrichThemedSectionsWithReportCore(
  sections: ThemedReportSections,
  reportCore: ReportCoreViewModel,
  lang: 'ko' | 'en',
  theme: ReportTheme,
  matrixInput: MatrixCalculationInput,
  timingData?: TimingData
): ThemedReportSections {
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const relationship = findReportCoreAdvisory(reportCore, 'relationship')
  const career = findReportCoreAdvisory(reportCore, 'career')
  const wealth = findReportCoreAdvisory(reportCore, 'wealth')
  const health = findReportCoreAdvisory(reportCore, 'health')
  const relationshipTiming = findReportCoreTimingWindow(reportCore, 'relationship')
  const careerTiming = findReportCoreTimingWindow(reportCore, 'career')
  const wealthTiming = findReportCoreTimingWindow(reportCore, 'wealth')
  const healthTiming = findReportCoreTimingWindow(reportCore, 'health')
  const relationshipManifestation = findReportCoreManifestation(reportCore, 'relationship')
  const careerManifestation = findReportCoreManifestation(reportCore, 'career')
  const wealthManifestation = findReportCoreManifestation(reportCore, 'wealth')
  const healthManifestation = findReportCoreManifestation(reportCore, 'health')

  const themeLeadBySection: Partial<Record<keyof ThemedReportSections, string>> = {
    deepAnalysis:
      theme === 'love'
        ? buildSectionPersonalLead('relationshipDynamics', matrixInput, lang, timingData)
        : theme === 'career'
          ? buildSectionPersonalLead('careerPath', matrixInput, lang, timingData)
          : theme === 'wealth'
            ? buildSectionPersonalLead('wealthPotential', matrixInput, lang, timingData)
            : theme === 'health'
              ? buildSectionPersonalLead('healthGuidance', matrixInput, lang, timingData)
              : buildSectionPersonalLead('personalityDeep', matrixInput, lang, timingData),
    timing:
      theme === 'love'
        ? buildPersonalLifeTimelineNarrative(matrixInput, timingData, lang)
        : buildSectionPersonalLead('timingAdvice', matrixInput, lang, timingData),
    actionPlan: buildSectionPersonalLead('actionPlan', matrixInput, lang, timingData),
  }

  const sectionsWithThemeLead: ThemedReportSections = {
    ...sections,
    deepAnalysis: [themeLeadBySection.deepAnalysis, sections.deepAnalysis].filter(Boolean).join(' '),
    timing: [themeLeadBySection.timing, sections.timing].filter(Boolean).join(' '),
    actionPlan: [themeLeadBySection.actionPlan, sections.actionPlan].filter(Boolean).join(' '),
  }

  const themeSpecificLines: Record<ReportTheme, Partial<Record<keyof ThemedReportSections, string[]>>> = {
    love: {
      compatibility: [
        relationshipManifestation?.manifestation || '',
        relationshipTiming ? buildTimingWindowNarrative('relationship', relationshipTiming, lang) : '',
      ],
      spouseProfile: [
        relationship?.thesis || '',
        relationshipManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
      marriageTiming: [
        relationshipTiming?.whyNow || '',
        relationship?.timingHint || '',
      ],
    },
    career: {
      strategy: [
        careerManifestation?.manifestation || '',
        careerTiming ? buildTimingWindowNarrative('career', careerTiming, lang) : '',
      ],
      roleFit: [
        career?.thesis || '',
        careerManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
      turningPoints: [
        careerTiming?.whyNow || '',
        careerTiming?.entryConditions?.join(', ') || '',
      ],
    },
    wealth: {
      strategy: [
        wealthManifestation?.manifestation || '',
        wealthTiming ? buildTimingWindowNarrative('wealth', wealthTiming, lang) : '',
      ],
      incomeStreams: [
        wealth?.thesis || '',
        wealthManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
      riskManagement: [
        wealth?.caution || '',
        wealthManifestation?.riskExpressions?.slice(0, 2).join(' ') || '',
      ],
    },
    health: {
      prevention: [
        healthManifestation?.manifestation || '',
        healthTiming ? buildTimingWindowNarrative('health', healthTiming, lang) : '',
      ],
      riskWindows: [
        healthTiming?.whyNow || '',
        healthManifestation?.riskExpressions?.slice(0, 2).join(' ') || '',
      ],
      recoveryPlan: [
        health?.action || '',
        healthManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
    },
    family: {
      dynamics: [
        relationshipManifestation?.manifestation || '',
        relationship?.thesis || '',
      ],
      communication: [
        relationship?.caution || '',
        relationshipTiming?.whyNow || '',
      ],
      legacy: [
        buildPersonalLifeTimelineNarrative(matrixInput, timingData, lang),
      ],
    },
  }

  return {
    ...sectionsWithThemeLead,
    deepAnalysis: reinforceNarrativeSection(
      sectionsWithThemeLead.deepAnalysis,
      [buildThemedSectionHook(theme, 'deepAnalysis', lang), reportCore.thesis, focusManifestation?.baselineThesis || ''],
      [
        focusManifestation?.activationThesis || '',
        focusManifestation?.manifestation || '',
      ],
      lang,
      lang === 'ko' ? 420 : 280
    ),
    patterns: reinforceNarrativeSection(
      sectionsWithThemeLead.patterns,
      [buildThemedSectionHook(theme, 'patterns', lang), focusAdvisory?.thesis || reportCore.gradeReason],
      [
        focusAdvisory?.strategyLine || '',
        reportCore.domainVerdicts
          .slice(0, 2)
          .map((item) =>
            lang === 'ko'
              ? `${getReportDomainLabel(item.domain, lang)}의 판정 모드는 ${item.mode}이며, 이유는 ${item.rationale}`
              : `${getReportDomainLabel(item.domain, lang)} runs in ${item.mode} mode because ${item.rationale}`
          )
          .join(' '),
      ],
      lang,
      lang === 'ko' ? 420 : 280
    ),
    timing: reinforceNarrativeSection(
      sectionsWithThemeLead.timing,
      [
        buildThemedSectionHook(theme, 'timing', lang),
        focusTiming
          ? buildTimingWindowNarrative(reportCore.focusDomain, focusTiming, lang)
          : reportCore.gradeReason,
      ],
      [
        ...(focusTiming?.entryConditions || []),
        ...(focusTiming?.abortConditions || []),
      ],
      lang,
      lang === 'ko' ? 420 : 280
    ),
    compatibility: sections.compatibility
      ? reinforceNarrativeSection(
          sections.compatibility,
          [
            buildThemedSectionHook(theme, 'compatibility', lang),
            relationship?.thesis || '',
            ...(themeSpecificLines.love.compatibility || []),
          ],
          [relationship?.caution || '', relationship?.timingHint || ''],
          lang,
          lang === 'ko' ? 360 : 240
        )
      : sections.compatibility,
    spouseProfile: sections.spouseProfile
      ? reinforceNarrativeSection(
          sections.spouseProfile,
          [
            buildThemedSectionHook(theme, 'spouseProfile', lang),
            relationship?.action || focusManifestation?.manifestation || '',
            ...(themeSpecificLines.love.spouseProfile || []),
          ],
          [relationship?.strategyLine || ''],
          lang,
          lang === 'ko' ? 360 : 240
        )
      : sections.spouseProfile,
    marriageTiming: sections.marriageTiming
      ? reinforceNarrativeSection(
          sections.marriageTiming,
          [
            buildThemedSectionHook(theme, 'marriageTiming', lang),
            relationship?.timingHint || '',
            ...(themeSpecificLines.love.marriageTiming || []),
          ],
          [relationshipTiming?.whyNow || ''],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.marriageTiming,
    strategy: sections.strategy
      ? reinforceNarrativeSection(
          sections.strategy,
          [
            buildThemedSectionHook(theme, 'strategy', lang),
            reportCore.primaryAction,
            reportCore.riskControl,
            ...(themeSpecificLines[theme]?.strategy || []),
          ],
          [reportCore.judgmentPolicy.rationale],
          lang,
          lang === 'ko' ? 360 : 240
        )
      : sections.strategy,
    roleFit: sections.roleFit
      ? reinforceNarrativeSection(
          sections.roleFit,
          [
            buildThemedSectionHook(theme, 'roleFit', lang),
            career?.thesis || '',
            career?.action || '',
            ...(themeSpecificLines.career.roleFit || []),
          ],
          [career?.caution || '', career?.timingHint || ''],
          lang,
          lang === 'ko' ? 360 : 240
        )
      : sections.roleFit,
    turningPoints: sections.turningPoints
      ? reinforceNarrativeSection(
          sections.turningPoints,
          [
            buildThemedSectionHook(theme, 'turningPoints', lang),
            careerTiming?.whyNow || '',
            ...(themeSpecificLines.career.turningPoints || []),
          ],
          [(career?.timingHint || '') + ' ' + (career?.strategyLine || '')],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.turningPoints,
    incomeStreams: sections.incomeStreams
      ? reinforceNarrativeSection(
          sections.incomeStreams,
          [
            buildThemedSectionHook(theme, 'incomeStreams', lang),
            wealth?.thesis || '',
            wealth?.action || '',
            ...(themeSpecificLines.wealth.incomeStreams || []),
          ],
          [wealth?.strategyLine || ''],
          lang,
          lang === 'ko' ? 360 : 240
        )
      : sections.incomeStreams,
    riskManagement: sections.riskManagement
      ? reinforceNarrativeSection(
          sections.riskManagement,
          [
            buildThemedSectionHook(theme, 'riskManagement', lang),
            wealth?.caution || reportCore.primaryCaution,
            ...(themeSpecificLines.wealth.riskManagement || []),
          ],
          [reportCore.riskControl],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.riskManagement,
    prevention: sections.prevention
      ? reinforceNarrativeSection(
          sections.prevention,
          [
            buildThemedSectionHook(theme, 'prevention', lang),
            health?.action || '',
            health?.caution || '',
            ...(themeSpecificLines.health.prevention || []),
          ],
          [health?.strategyLine || ''],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.prevention,
    riskWindows: sections.riskWindows
      ? reinforceNarrativeSection(
          sections.riskWindows,
          [
            buildThemedSectionHook(theme, 'riskWindows', lang),
            healthTiming?.whyNow || '',
            ...(themeSpecificLines.health.riskWindows || []),
          ],
          [health?.timingHint || ''],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.riskWindows,
    recoveryPlan: sections.recoveryPlan
      ? reinforceNarrativeSection(
          sections.recoveryPlan,
          [
            buildThemedSectionHook(theme, 'recoveryPlan', lang),
            health?.action || '',
            reportCore.riskControl,
            ...(themeSpecificLines.health.recoveryPlan || []),
          ],
          [...reportCore.judgmentPolicy.softChecks],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.recoveryPlan,
    dynamics: sections.dynamics
      ? reinforceNarrativeSection(
          sections.dynamics,
          [buildThemedSectionHook(theme, 'dynamics', lang), ...(themeSpecificLines.family.dynamics || [])],
          [relationship?.strategyLine || ''],
          lang,
          lang === 'ko' ? 360 : 240
        )
      : sections.dynamics,
    communication: sections.communication
      ? reinforceNarrativeSection(
          sections.communication,
          [
            buildThemedSectionHook(theme, 'communication', lang),
            ...(themeSpecificLines.family.communication || []),
          ],
          [relationship?.timingHint || ''],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.communication,
    legacy: sections.legacy
      ? reinforceNarrativeSection(
          sections.legacy,
          [buildThemedSectionHook(theme, 'legacy', lang), ...(themeSpecificLines.family.legacy || [])],
          [reportCore.judgmentPolicy.rationale],
          lang,
          lang === 'ko' ? 340 : 220
        )
      : sections.legacy,
    recommendations: [
      ...new Set(
        [reportCore.primaryAction, focusAdvisory?.action, focusAdvisory?.caution, ...sections.recommendations]
          .map((item) => sanitizeUserFacingNarrative(String(item || '').trim()))
          .filter(Boolean)
      ),
    ],
    actionPlan: reinforceNarrativeSection(
      sectionsWithThemeLead.actionPlan,
      [
        buildThemedSectionHook(theme, 'actionPlan', lang),
        reportCore.topDecisionLabel || reportCore.primaryAction,
        reportCore.primaryAction,
        reportCore.primaryCaution,
      ],
      [reportCore.riskControl, reportCore.judgmentPolicy.rationale],
      lang,
      lang === 'ko' ? 420 : 280
    ),
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

// Premium reports currently ship as deterministic core + selective AI polish.
// Keep the old rewrite-only generation path disabled unless we intentionally revive it.
const FORCE_REWRITE_ONLY_MODE = false
const FORCE_DETERMINISTIC_CORE_MODE = true

function shouldUseDeterministicOnly(flag?: boolean): boolean {
  if (FORCE_DETERMINISTIC_CORE_MODE) return true
  if (typeof flag === 'boolean') return flag
  const env = String(process.env.DESTINY_REPORT_DETERMINISTIC_ONLY || '')
    .trim()
    .toLowerCase()
  return env === '1' || env === 'true' || env === 'yes' || env === 'on'
}

function shouldUsePremiumSelectivePolish(userPlan?: AIUserPlan): boolean {
  return userPlan === 'premium'
}

function getPremiumPolishPaths(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
}): string[] {
  if (params.reportType === 'comprehensive') {
    return ['timingAdvice']
  }
  if (params.reportType === 'timing') {
    return ['overview', 'opportunities', 'actionPlan']
  }

  const shared = ['deepAnalysis', 'timing', 'actionPlan']
  switch (params.theme) {
    case 'love':
      return [...shared, 'compatibility', 'marriageTiming']
    case 'career':
      return [...shared, 'strategy', 'roleFit', 'turningPoints']
    case 'wealth':
      return [...shared, 'strategy', 'incomeStreams', 'riskManagement']
    case 'health':
      return [...shared, 'prevention', 'recoveryPlan', 'riskWindows']
    case 'family':
      return [...shared, 'communication', 'legacy', 'dynamics']
    default:
      return shared
  }
}

function getPremiumPolishBatchSize(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
}): number {
  if (params.reportType === 'comprehensive') return 2
  if (params.reportType === 'themed') return 3
  return 3
}

function chunkPaths(paths: string[], size: number): string[][] {
  if (size <= 0 || paths.length <= size) return [paths]
  const chunks: string[][] = []
  for (let index = 0; index < paths.length; index += size) {
    chunks.push(paths.slice(index, index + size))
  }
  return chunks
}

function pickSectionEvidenceRefs(
  evidenceRefs: SectionEvidenceRefs,
  sectionPaths: string[]
): SectionEvidenceRefs {
  const picked: SectionEvidenceRefs = {}
  for (const path of sectionPaths) {
    if (evidenceRefs[path]) {
      picked[path] = evidenceRefs[path]
    }
  }
  return picked
}

function pickSectionBlocks(
  blocksBySection: Record<string, DeterministicSectionBlock[]> | undefined,
  sectionPaths: string[]
): Record<string, DeterministicSectionBlock[]> | undefined {
  if (!blocksBySection) return undefined
  const picked: Record<string, DeterministicSectionBlock[]> = {}
  for (const path of sectionPaths) {
    if (blocksBySection[path]) {
      picked[path] = blocksBySection[path]
    }
  }
  return picked
}

async function maybePolishPremiumSections<T extends object>(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  sections: T
  lang: 'ko' | 'en'
  userPlan?: AIUserPlan
  evidenceRefs: SectionEvidenceRefs
  blocksBySection?: Record<string, DeterministicSectionBlock[]>
  minCharsPerSection: number
}): Promise<{ sections: T; modelUsed?: string; tokensUsed?: number }> {
  if (!shouldUsePremiumSelectivePolish(params.userPlan)) {
    return { sections: params.sections }
  }

  const sectionPaths = getPremiumPolishPaths({
    reportType: params.reportType,
    theme: params.theme,
  }).filter((path) => typeof getPathValue(params.sections as Record<string, unknown>, path) === 'string')

  if (sectionPaths.length === 0) {
    return { sections: params.sections }
  }

  const merged = JSON.parse(JSON.stringify(params.sections)) as Record<string, unknown>
  const batchSize = getPremiumPolishBatchSize({
    reportType: params.reportType,
    theme: params.theme,
  })
  const batches = chunkPaths(sectionPaths, batchSize)
  let tokensUsedTotal = 0
  const modelStatuses: string[] = []

  for (const batch of batches) {
    const rewrite = await rewriteSectionsWithFallback<T>({
      lang: params.lang,
      userPlan: params.userPlan,
      draftSections: merged as T,
      evidenceRefs: pickSectionEvidenceRefs(params.evidenceRefs, batch),
      blocksBySection: pickSectionBlocks(params.blocksBySection, batch),
      sectionPaths: batch,
      requiredPaths: batch,
      minCharsPerSection: params.minCharsPerSection,
      validationMode: 'selective_polish',
    })
    tokensUsedTotal += rewrite.tokensUsed || 0
    if (rewrite.modelUsed) {
      modelStatuses.push(rewrite.modelUsed)
    }

    const rewritten = rewrite.sections as Record<string, unknown>
    for (const path of batch) {
      const value = getPathValue(rewritten, path)
      if (typeof value === 'string' && value.trim()) {
        setPathText(merged, path, value)
      }
    }
  }

  const successfulModels = modelStatuses.filter(
    (status) => !status.startsWith('rewrite-fallback')
  )
  const modelUsed = successfulModels[successfulModels.length - 1] || modelStatuses[modelStatuses.length - 1]

  return {
    sections: merged as T,
    modelUsed,
    tokensUsed: tokensUsedTotal,
  }
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
  preferredDomains?: Set<SignalDomain>
): SignalDomain {
  const hints = (domainHints || []).filter(Boolean)
  if (hints.length === 0) return 'personality'
  if (preferredDomains) {
    const direct = hints.find((domain): domain is SignalDomain =>
      preferredDomains.has(domain as SignalDomain)
    )
    if (direct) return direct
  }
  const sorted = [...new Set(hints)].sort((a, b) => {
    const ai = EVIDENCE_DOMAIN_PRIORITY.indexOf(a as (typeof EVIDENCE_DOMAIN_PRIORITY)[number])
    const bi = EVIDENCE_DOMAIN_PRIORITY.indexOf(b as (typeof EVIDENCE_DOMAIN_PRIORITY)[number])
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99)
  })
  return (sorted[0] as SignalDomain | undefined) || 'personality'
}

function toEvidenceRef(
  signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number],
  preferredDomains?: Set<SignalDomain>
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
  const domainSet = new Set(domains as SignalDomain[])
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
    if (
      /(?:핵심 근거는|Key grounding comes from)/i.test(text)
    ) {
      continue
    }
    const refs = (evidenceRefs[path] || []).filter((ref) => Boolean(ref.id))
    if (refs.length === 0) continue
    if (hasEvidenceIdReference(text, refs)) continue
    const top = refs.slice(0, 2)
    const hints = top
      .map((ref) => ref.keyword || ref.rowKey || ref.colKey)
      .filter(Boolean)
      .join(', ')
    const hintLine = buildReportCoreLine(hints || '', lang)
    const footer =
      lang === 'ko'
        ? `핵심 근거는 ${hintLine || '현재 활성 신호'}입니다.`
        : normalizeNarrativeCoreText(`Key grounding comes from ${hintLine || 'current active signals'}.`, lang)
            .replace(/대운\s+metal/gi, 'Daeun metal')
            .replace(/대운\s+wood/gi, 'Daeun wood')
            .replace(/대운\s+water/gi, 'Daeun water')
            .replace(/대운\s+fire/gi, 'Daeun fire')
            .replace(/대운\s+earth/gi, 'Daeun earth')
            .replace(/dominant element\s+바람/gi, 'dominant element air')
            .replace(/dominant western element\s+바람/gi, 'dominant western element air')
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

function normalizeUserFacingArtifacts(text: string): string {
  if (!text || typeof text !== 'string') return ''

  const ORPHAN_HOUSE_SENTENCE_REGEX =
    /^[은는이가를]\s*[가-힣A-Za-z]+\s*\d+하우스에 (?:놓여|위치해) 있습니다\.?$/u

  let normalized = String(text || '')
    .replace(/\bHidden Support Pattern\b/gi, '숨은 지원 흐름')
    .replace(/\bLearning Acceleration Pattern\b/gi, '학습 가속 흐름')
    .replace(/\bMovement Guardrail Window\b/gi, '이동·변화 경계 구간')
    .replace(/\bWealth Accumulation Pattern\b/gi, '자산 축적 흐름')
    .replace(/\bjeonggwan\b/gi, '정관')
    .replace(/\bYongsin\b/gi, '용신')
    .replace(/\bearth\b/gi, '흙')
    .replace(/\bcareer\b(?=\s*영역)/gi, '커리어')
    .replace(/\brelationship\b(?=\s*영역)/gi, '관계')
    .replace(/\bwealth\b(?=\s*영역)/gi, '재정')
    .replace(/\bhealth\b(?=\s*영역)/gi, '건강')
    .replace(/\bnow\s+창\b/gi, '지금 창')
    .replace(/\bStage\s+/g, '')
    .replace(/\bDaeun\b/gi, '대운')
    .replace(/\bGeokguk\b/gi, '격국')
    .replace(/현재 흐름 흐름/g, '현재 흐름')
    .replace(/트랜짓가/g, '트랜짓이')
    .replace(/패턴 패턴/g, '패턴')
    .replace(/(숨은 지원 흐름|학습 가속 흐름|자산 축적 흐름|이동·변화 경계 구간)\s*패턴/g, '$1')
    .replace(/관계\s*Adjustment/gi, '관계 조정')
    .replace(/커리어\s*Expansion/gi, '커리어 확장')
    .replace(/재정\s*타이밍\s*Window/gi, '재정 타이밍 창')
    .replace(/타이밍\s*Window/gi, '타이밍 창')
    .replace(/관계 조정 배우자 아키타입/gi, '배우자 아키타입')
    .replace(/배우자 아키타입\(누구\):/gi, '배우자 아키타입:')
    .replace(/관계 조정 돈이 움직이는 방식을 보면/gi, '돈이 움직이는 방식을 보면')
    .replace(/관계 조정 자산 관리(?:의)?/gi, '자산 관리')
    .replace(/관계 조정 실행 전 확인 절차를/gi, '실행 전 확인 절차를')
    .replace(/관계 조정 확정 전에/gi, '확정 전에')
    .replace(/용신 화 패턴/gi, '용신 화 흐름')
    .replace(/격국 정관 패턴/gi, '격국 정관 흐름')
    .replace(/관계 조정은 우선 차단하는 것이 바람직합니다/gi, '관계에서는 성급한 충돌을 먼저 차단하는 편이 바람직합니다')
    .replace(/관계 조정은 먼저 막는 편이 맞습니다/gi, '관계에서는 성급한 충돌을 먼저 막는 편이 맞습니다')
    .replace(/지금 구간에 대운,\s*세운,\s*이 겹치며/g, '지금 구간에 대운과 세운 흐름이 겹치며')
    .replace(/지금 구간에는 대운,\s*세운,\s*이 겹쳐져/g, '지금 구간에는 대운과 세운 흐름이 겹쳐져')
    .replace(/대운\s+([가-힣A-Za-z]+)가,\s*세운\s+([가-힣A-Za-z]+)이/g, '대운 $1 흐름과 세운 $2 흐름이')
    .replace(/현재 31세 전후는 현재 흐름 안에 있어/g, '현재 31세 전후 흐름은')
    .replace(/현재 31세 전후는 현재 흐름에서는/g, '현재 31세 전후 흐름에서는')
    .replace(/현재 31세 전후는 현재 흐름의 결론은/g, '현재 31세 전후 흐름의 결론은')
    .replace(/현재 31세 전후는 현재 흐름은/g, '현재 31세 전후 흐름은')
    .replace(/지금 결론은\s+([가-힣]+)\s+흐름은/g, '지금 결론은 $1 흐름이')
    .replace(/기준 정리 후 실행(?=\s*[가-힣])/g, '기준을 정리한 뒤 실행하고')
    .replace(/,\s*(?=(?:기준|긴장|결정은|실행 전|주의 신호가|핵심 근거는))/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const sentences = splitSentences(normalized)
    .map((sentence) => String(sentence || '').trim())
    .filter(Boolean)
    .filter((sentence) => !ORPHAN_HOUSE_SENTENCE_REGEX.test(sentence))

  normalized = sentences
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return normalized
}

export function sanitizeSectionNarrative(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  cleaned = stripBannedPhrases(cleaned)
  cleaned = normalizeUserFacingArtifacts(cleaned)
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

function toKoreanDomainLabel(domain: SignalDomain): string {
  const map: Record<SignalDomain, string> = {
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '사명',
    timing: '시기',
    move: '변화',
  }
  return map[domain]
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
  strategyEngine: StrategyEngineResult | undefined,
  reportCore?: ReportCoreViewModel
): GraphRagSummaryPayload {
  const graphSummary = summarizeGraphRAGEvidence(graphRagEvidence)
  const preferredDomains: Set<SignalDomain> | null = reportCore
    ? new Set([
        reportCore.focusDomain as SignalDomain,
        ...reportCore.domainVerdicts.slice(0, 2).map((item) => item.domain as SignalDomain),
      ])
    : null
  const topInsightTitles = uniqueStrings(
    (matrixReport.topInsights || [])
      .filter((item) => !preferredDomains || preferredDomains.has(item.domain))
      .map((item) => item.title),
    5
  )
  const claimFallback = uniqueStrings(
    (signalSynthesis?.claims || [])
      .filter((claim) => !preferredDomains || preferredDomains.has(claim.domain))
      .map((claim) => claim.thesis),
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
    .filter((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      return !preferredDomains || preferredDomains.has(domain)
    })
    .filter((signal) => signal.polarity === 'strength')
    .slice(0, 3)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} 상승 근거: ${signal.keyword || signal.rowKey}`
      }
      return `${domain} upside signal: ${signal.keyword || signal.rowKey}`
    })
  const strategyDrivers = (strategyEngine?.domainStrategies || [])
    .filter((strategy) => !preferredDomains || preferredDomains.has(strategy.domain))
    .slice(0, 3)
    .map((strategy) => {
      const strategyDomain = strategy.domain as SignalDomain
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(strategyDomain)}은 ${describePhaseFlow(
          strategy.phaseLabel,
          'ko'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'ko')}`
      }
      return `${strategy.domain} is in a phase where ${describePhaseFlow(
        strategy.phaseLabel,
        'en'
      ).toLowerCase()} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'en')}`
    })
  const drivers = uniqueStrings(
    [
      ...strengthSignals,
      ...strategyDrivers,
      ...(signalSynthesis?.claims || [])
        .filter((claim) => !preferredDomains || preferredDomains.has(claim.domain))
        .map((claim) => {
          const claimDomain = claim.domain as SignalDomain
          return lang === 'ko'
            ? `${toKoreanDomainLabel(claimDomain)}: ${claim.thesis}`
            : `${claim.domain}: ${claim.thesis}`
        }),
    ],
    6
  )

  const cautionSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      return !preferredDomains || preferredDomains.has(domain)
    })
    .filter((signal) => signal.polarity === 'caution')
    .slice(0, 4)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} 주의: ${signal.keyword || signal.rowKey} 신호는 확정 전 재확인이 필요합니다.`
      }
      return `${domain} caution: ${signal.keyword || signal.rowKey} requires recheck before commitment.`
    })
  const cautionSections = (graphSummary?.cautionSections || []).slice(0, preferredDomains ? 3 : 6)
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
              ? '좋아 보이는 근거가 있어도 지금 흐름과 실행 속도를 함께 보고 움직이는 편이 좋습니다.'
              : 'Use the positive signals together with the current pace and phase before acting.',
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
        `${toKoreanDomainLabel(strategy.domain)}은 ${describePhaseFlow(
          strategy.phaseLabel,
          'ko'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'ko')}`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    } else {
      lines.push(
        `${strategy.domain} is in a phase where ${describePhaseFlow(
          strategy.phaseLabel,
          'en'
        ).toLowerCase()} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'en')}`
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
  reportCore: ReportCoreViewModel | undefined,
  signalSynthesis?: SignalSynthesisResult,
  strategyEngine?: StrategyEngineResult,
  lang: 'ko' | 'en' = 'ko'
): string[] {
  const bullets: string[] = []
  const hasReportCore = Boolean(reportCore)
  if (!hasReportCore && input.dayMasterElement) {
    bullets.push(
      `타고난 구조상 ${input.dayMasterElement} 일간은 방향을 먼저 잡을 때 흔들림이 줄기 쉽습니다.`
    )
  }
  if (!hasReportCore && input.geokguk) {
    bullets.push(
      `타고난 구조상 ${input.geokguk} 성향은 역할과 책임을 분명히 할수록 성과가 올라가기 쉽습니다.`
    )
  }
  if (!hasReportCore && input.yongsin) {
    bullets.push(
      `용신이 ${input.yongsin} 쪽이면 생활 리듬을 그쪽으로 맞출 때 체감이 빨라지기 쉽습니다.`
    )
  }

  const topSets = [...(anchor?.crossEvidenceSets || [])]
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, hasReportCore ? 1 : 2)
  for (const set of topSets) {
    bullets.push(humanizeCrossSetFact(set))
  }

  let addedTimingNarrative = false
  if (reportCore) {
    const sectionDomains = getDomainsForSection(sectionKey)
    for (const domain of sectionDomains) {
      const advisory = findReportCoreAdvisory(reportCore, domain)
      const timing = findReportCoreTimingWindow(reportCore, domain)
      const manifestation = findReportCoreManifestation(reportCore, domain)
      const verdict = findReportCoreVerdict(reportCore, domain)
      if (advisory?.thesis) bullets.push(advisory.thesis)
      if (advisory?.action) bullets.push(advisory.action)
      if (advisory?.caution) bullets.push(advisory.caution)
      if (timing) {
        bullets.push(buildTimingWindowNarrative(domain, timing, lang))
        addedTimingNarrative = true
      }
      if (manifestation) bullets.push(buildManifestationNarrative(manifestation, lang))
      if (verdict) bullets.push(buildVerdictNarrative(verdict, lang))
    }
    bullets.push(reportCore.primaryAction)
    bullets.push(reportCore.primaryCaution)
    bullets.push(reportCore.riskControl)
    bullets.push(reportCore.judgmentPolicy.rationale)
  } else {
    bullets.push(...buildSynthesisFactsForSection(signalSynthesis, sectionKey, lang))
    bullets.push(...buildStrategyFactsForSection(strategyEngine, sectionKey, lang))
    bullets.push(...extractTopMatrixFacts(matrixReport, sectionKey))
  }

  const activeTransits = (input.activeTransits || []).slice(0, 2)
  if (!hasReportCore && activeTransits.length > 0) {
    bullets.push(
      `현재는 ${activeTransits.join(', ')} 영향이 겹쳐 결정 속도를 조절하는 쪽이 낫습니다.`
    )
  }
  if (
    !hasReportCore &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push(
      `대운/세운/월운/일진 신호가 함께 움직이는 구간이라 단기 감정보다 단계별 계획을 우선하는 쪽이 낫습니다.`
    )
  }
  if (
    hasReportCore &&
    !addedTimingNarrative &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push(
      lang === 'ko'
        ? '큰 흐름과 단기 신호가 함께 움직이는 구간이므로, 실행보다 순서와 검증 절차를 먼저 고정하는 편이 맞습니다.'
        : 'Long-cycle and short-cycle signals are moving together, so fix sequencing and verification before commitment.'
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
      ? '성과 확장·완결률 강화'
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
  const normalized = normalizeUserFacingArtifacts(
    String(text || '')
  )
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!normalized) return normalized
  const sentences = splitSentences(normalized)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (sentences.length === 0) return normalized
  const ENGINE_TOKEN_REGEX =
    /\b[a-z]+(?:_[a-z0-9]+){1,}\b|\b(?:career|relationship|wealth|health|move|personality|timing)\(\d+\)\b/i
  const CORRUPTED_MOJIBAKE_REGEX =
    /(?:[ÃÂ][^\s]{1,}|[ìíëê][A-Za-z0-9\u00A1-\u00FF]{1,}|�|í˜|ìž|Ã¬|Ã­|[„”“€™œšž‹›¬€])+/g
  const MIXED_ENGLISH_NOISE_REGEX =
    /(Support stays latent|Overconfidence can dilute|hidden_support_main_window|income_growth_window)/i
  const STRUCTURED_NOISE_REGEX =
    /(메인\/대안 시나리오는 핵심 이벤트 기준으로 업데이트됩니다|리포트 스코프:|체크리스트: 실행 우선순위:|상위 도메인:\s*[A-Za-z]|적합도\s*\d+|Top\d|역할 아키타입:.*[,/].*[,/]|직군\/산업|채널 Top3|알아볼 단서|KPI와 트리거 프로토콜|승부처와 실행 레버|인생 총운 한 줄 로그라인|커리어 엔진|성향 엔진|그림자 패턴|머니 스타일|국면 전환 레이어|확장 자원 레이어)/i
  const filtered = sentences.filter(
    (sentence) =>
      !USER_FACING_NOISE_REGEX.test(sentence) &&
      !ENGINE_TOKEN_REGEX.test(sentence) &&
      !CORRUPTED_MOJIBAKE_REGEX.test(sentence) &&
      !MIXED_ENGLISH_NOISE_REGEX.test(sentence) &&
      !STRUCTURED_NOISE_REGEX.test(sentence)
  )
  const base = filtered.length >= Math.min(3, sentences.length) ? filtered : sentences
  const cleaned = base
    .map((sentence) =>
      sentence
        .replace(USER_FACING_NOISE_REGEX, '')
        .replace(ENGINE_TOKEN_REGEX, '')
        .replace(CORRUPTED_MOJIBAKE_REGEX, '')
        .replace(MIXED_ENGLISH_NOISE_REGEX, '')
        .replace(STRUCTURED_NOISE_REGEX, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join(' ')
    .replace(/(2주 실행 3단계:)\s*\1/g, '$1')
    .replace(/(Main:)\s*(Main:)/g, '$1')
    .replace(/(Alt:)\s*(Alt:)/g, '$1')
    .replace(/\b즉시 확정\b/g, '')
    .replace(/\b일반 모드\b/g, '')
    .replace(/이번 해석의 중심에는[^.!?\n]*가 놓여 있습니다\.?/g, '')
    .replace(/핵심 근거는[^.!?\n]*입니다\.?/g, '')
    .replace(
      /외부 기회와 지원 흐름을 보면\s*외부 기회\/지원 네트워크 활용도를 해석합니다\.?/g,
      '외부 기회와 지원이 실제 성과로 이어질 수 있는지 함께 봅니다.'
    )
    .replace(
      /흐름이 바뀌는 지점을 보면\s*확장 신호와 리셋 신호의 동시성을 해석합니다\.?/g,
      '기회를 넓힐 흐름과 기준을 다시 세울 흐름이 함께 겹칩니다.'
    )
    .replace(
      /사주의 기본 구조를 실행 기준으로 고정하고, 역할\/우선순위 충돌을 먼저 정리하세요\.?/g,
      '기본 기준을 먼저 세우고, 역할과 우선순위가 겹치는 지점을 먼저 정리하세요.'
    )
    .replace(
      /주의 신호는 속도 조절과 확인 루틴을 같이 두어 손실을 줄이세요\.?/g,
      '주의 신호가 강한 구간에서는 속도를 조금 낮추고 확인 순서를 먼저 세우는 편이 안전합니다.'
    )
    .replace(
      /격국 신호를 실행 기준으로 고정하고, 역할\/우선순위 충돌을 먼저 정리하세요\.?/g,
      '사주의 기본 구조를 기준으로 삼고, 역할과 우선순위가 충돌하는 지점을 먼저 정리하세요.'
    )
    .replace(
      /긴장 애스펙트는 속도 조절과 검증 루틴을 같이 두어 손실을 줄이세요\.?/g,
      '긴장이 강한 시기일수록 속도를 조절하고 확인 루틴을 먼저 고정해야 손실을 줄일 수 있습니다.'
    )
    .replace(/미션\s*한\s*줄:\s*/g, '')
    .replace(/결정\s*기준\s*\d*:\s*/g, '중요한 판단 기준은 ')
    .replace(/확장\/축소\s*포인트:\s*\.?/g, '')
    .replace(/승리 조건:[\s\S]*$/g, '')
    .replace(/피해야 할 조건:[\s\S]*$/g, '')
    .replace(/마지막 메시지:[\s\S]*$/g, '')
    .replace(/잘 맞는 역할을 보면\s*/g, '')
    .replace(/분석 직군·국가 적합도 근거:\s*/g, '잘 맞는 환경을 보면 ')
    .replace(/모순.?게이트.?저합의 신호 때문에 준비 중심 판단으로 낮춰야 합니다\.?/g, '지금은 성급하게 확정하기보다 준비와 기준 정리가 더 중요한 구간입니다.')
    .replace(/이 해석의 출발점은 총점 \d+점, 신뢰 \d+% 기준으로 해석을 시작합니다\.?/g, '전체 흐름은 현재 신뢰도와 점수가 모두 안정적으로 받쳐주는 편입니다.')
    .replace(/이번 인생 총운의 중심축은/g, '지금 인생 전체 흐름에서 가장 크게 움직이는 축은')
    .replace(/핵심 판단은/g, '현재 국면은')
    .replace(/커리어 영역은/g, '커리어 흐름은')
    .replace(/관계 영역은/g, '관계 흐름은')
    .replace(/재정 영역은/g, '재정 흐름은')
    .replace(/건강 영역은/g, '건강 흐름은')
    .replace(/핵심 근거는\s*([^.!?\n]+)[.!?]?/gu, '이 흐름을 받쳐주는 바탕은 $1입니다.')
    .replace(/상위 흐름은\s*([^.!?\n]+)[.!?]?/gu, '지금 상대적으로 힘이 실리는 축은 $1입니다.')
    .replace(/í•µì‹¬ ê·¼ê±°ëŠ”\s*([^.!?\n]+)[.!?]?/g, '이 흐름을 받쳐주는 바탕은 $1입니다.')
    .replace(/ìƒìœ„ íë¦„ì€\s*([^.!?\n]+)[.!?]?/g, '지금 상대적으로 힘이 실리는 축은 $1입니다.')
    .replace(/Ã­â€¢ÂµÃ¬â€¹Â¬ ÃªÂ·Â¼ÃªÂ±Â°Ã«Å â€\s*([^.!?\n]+)[.!?]?/g, '이 흐름을 받쳐주는 바탕은 $1입니다.')
    .replace(/Ã¬Æ’ÂÃ¬Å“â€ž Ã­ÂÂÃ«Â¦â€žÃ¬Ââ‚¬\s*([^.!?\n]+)[.!?]?/g, '지금 상대적으로 힘이 실리는 축은 $1입니다.')
    .replace(/(놓여 있습니다|작동합니다|중요합니다|입니다)\s+(핵심 성향은|중요한 판단 기준은|현재|그래서)/g, '$1. $2')
    .replace(/(하우스에 놓여 있습니다|하우스에 위치해 있습니다)\s+(핵심 성향은|기본 성향에서는|주의 신호가|핵심 흐름 신호는|관계에서는|커리어는|재정은|건강은)/g, '$1. $2')
    .replace(/(기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다)\s+(21-\d+세)/g, '$1. $2')
    .replace(/\b커리어\s+영역은\b/g, '커리어 흐름은')
    .replace(/\b관계\s+영역은\b/g, '관계 흐름은')
    .replace(/\b재정\s+영역은\b/g, '재정 흐름은')
    .replace(/\b건강\s+영역은\b/g, '건강 흐름은')
    .replace(/\b이동\s+영역은\b/g, '이동 흐름은')
    .replace(/이번 해석의 중심에는\s*[, ]*/g, '이번 해석의 중심에는 ')
    .replace(/\.\./g, '.')
    .replace(/Alt:\s*/g, '')
    .replace(/Main:\s*/g, '')
    .replace(/(커리어|관계|재정|건강)\s+흐름은\s+지금 창이 열려 있고/gi, '$1 흐름은 지금 열려 있고')
    .replace(/대운과 세운 흐름이 겹치며\s+([가-힣]+)\s*흐름이 활성화됩니다/gi, '대운과 세운 흐름이 겹치며 $1 조짐이 강해집니다')
    .replace(/핵심 근거는\s*임관,\s*대운\s*([가-힣A-Za-z]+)입니다/gi, '핵심 근거는 임관 흐름과 대운 $1입니다')
    .replace(/핵심 근거는\s*횡재,\s*대운\s*([가-힣A-Za-z]+)입니다/gi, '핵심 근거는 횡재 흐름과 대운 $1입니다')
    .replace(/관계 조정은 먼저 막는 것이 바람직합니다/gi, '관계에서는 성급한 충돌을 먼저 막는 편이 바람직합니다')
    .replace(/관계 조정은 먼저 막는 편이 맞습니다/gi, '관계에서는 성급한 충돌을 먼저 막는 편이 맞습니다')
    .replace(/용신 기준으로 과열 영역을 줄이고 보완 루틴을 먼저 (?:설정|배치)하세요/gi, '과열되는 지점을 먼저 줄이고 보완 루틴을 앞쪽에 배치하세요')
    .replace(/관계 조정 배우자 아키타입/gi, '배우자 아키타입')
    .replace(/배우자 아키타입\(누구\):/gi, '배우자 아키타입:')
    .replace(/관계 조정 돈이 움직이는 방식을 보면/gi, '돈이 움직이는 방식을 보면')
    .replace(/관계 조정 자산 관리(?:의)?/gi, '자산 관리')
    .replace(/관계 조정 실행 전 확인 절차를/gi, '실행 전 확인 절차를')
    .replace(/관계 조정 확정 전에/gi, '확정 전에')
    .replace(/용신 화 패턴/gi, '용신 화 흐름')
    .replace(/격국 정관 패턴/gi, '격국 정관 흐름')
    .replace(/[가-힣A-Za-z]+\s*은\s*[가-힣]+자리\s*\d+하우스에\s*(?:놓여 있습니다|위치해 있습니다)\.?\s*/gu, '')
    .replace(/[^\n.]{0,80}\d+í•˜ìš°ìŠ¤ì—[^\n.]{0,80}\.\s*/g, '')
    .replace(/[^\n.]{0,120}10Ã­â€¢ËœÃ¬Å¡Â°Ã¬Å Â¤Ã¬â€”Â[^\n.]{0,120}\.\s*/g, '')
    .replace(/,\s*(?=(?:기준|긴장|결정은|실행 전|주의 신호가|핵심 근거는))/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return dedupeNarrativeSentences(normalizeUserFacingArtifacts(cleaned))
}

function sanitizeThemedSectionsForUser(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  lang: 'ko' | 'en',
  theme?: ReportTheme
): Record<string, unknown> {
  const next = { ...sections }
  for (const key of sectionPaths) {
    const current = String(next[key] || '').trim()
    if (!current) continue
    const cleaned = sanitizeUserFacingNarrative(current)
    next[key] = formatNarrativeParagraphs(cleaned, lang)
  }
  if (lang === 'ko' && theme) {
    return applyPremiumVoiceLayerToThemedSections(next, theme)
  }
  return next
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

function removeCrossSectionNarrativeRepetition(
  sections: Record<string, unknown>,
  sectionOrder: string[],
  lang: 'ko' | 'en'
): Record<string, unknown> {
  const next = { ...sections }
  const seen = new Set<string>()

  for (const key of sectionOrder) {
    const current = String(next[key] || '').trim()
    if (!current) continue

    if (key === 'actionPlan') {
      const preserved = formatNarrativeParagraphs(current, lang)
      next[key] = preserved
      for (const sentence of splitSentences(preserved).map((item) => String(item || '').trim()).filter(Boolean)) {
        seen.add(sentenceKey(sentence))
      }
      continue
    }

    const sentences = splitSentences(current)
      .map((sentence) => String(sentence || '').trim())
      .filter(Boolean)

    if (sentences.length <= 2) {
      for (const sentence of sentences) {
        seen.add(sentenceKey(sentence))
      }
      continue
    }

    const kept: string[] = []
    for (let index = 0; index < sentences.length; index += 1) {
      const sentence = sentences[index]
      const keyValue = sentenceKey(sentence)
      const alreadySeen = seen.has(keyValue)

      if (index === 0 || !alreadySeen) {
        kept.push(sentence)
        seen.add(keyValue)
      }
    }

    const normalized =
      kept.length >= 2
        ? kept.join(' ')
        : sentences.slice(0, Math.min(2, sentences.length)).join(' ')

    next[key] = formatNarrativeParagraphs(normalized, lang)
  }

  return next
}

function cleanRecommendationLine(text: string, lang: 'ko' | 'en'): string {
  const normalized = sanitizeUserFacingNarrative(String(text || '').trim())
    .replace(/,+/g, ',')
    .replace(/,\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return formatNarrativeParagraphs(normalized, lang)
}

function compactComprehensiveNarrative(
  text: string,
  section: 'careerPath' | 'relationshipDynamics' | 'wealthPotential' | 'healthGuidance'
): string {
  let normalized = sanitizeUserFacingNarrative(String(text || '').trim())
    .replace(/[가-힣A-Za-z]+\s*은\s*[가-힣]+자리\s*\d+하우스에\s*(?:놓여 있습니다|위치해 있습니다)\.?\s*/gu, '')
    .replace(/상위 흐름은\s*([^.!?\n]+)[.!?]?/gu, '지금 상대적으로 힘이 실리는 축은 $1입니다.')
    .replace(/핵심 근거는\s*([^.!?\n]+)[.!?]?/gu, '이 흐름을 받쳐주는 바탕은 $1입니다.')
    .replace(/현재\s*\d+세\s*전후\s*흐름은/gu, '지금 흐름은')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (section === 'careerPath') {
    normalized = normalized
      .replace(
        /^커리어(?:에서는| 흐름은)?[^.]+\.\s*/u,
        '커리어는 일을 더 많이 벌이는 사람보다, 무엇을 끝까지 책임질지 분명한 사람이 결국 앞서갑니다. '
      )
      .replace(/지금 상대적으로 힘이 실리는 축은\s*career[^.]*\./giu, '')
      .replace(/커리어 흐름은\s*지금 열려 있고/gu, '커리어 흐름은 지금 분명히 열려 있고')
      .replace(/직군.?국가 적합도 근거:[^.]+(?:\.\s*[^.]+){0,3}\.?/gu, '')
  }

  if (section === 'relationshipDynamics') {
    normalized = normalized
      .replace(/지금 상대적으로 힘이 실리는 축은\s*relationship[^.]*\./giu, '')
      .replace(/관계 흐름은/gu, '관계에서는')
      .replace(/현재 나이\(약\s*\d+세\)\s*기준으로 우선순위를 정리하세요\.?/gu, '')
      .replace(/(?:\d{1,2}-\d{1,2}세|20-34세|25-29세)[^.]+(?:\.\s*[^.]+){0,1}\.?/gu, '')
      .replace(/배우자 아키타입[^.]+(?:\.\s*[^.]+){0,2}\.?/gu, '')
  }

  if (section === 'wealthPotential') {
    normalized = normalized
      .replace(/재정 흐름은/gu, '재정에서는')
      .replace(/수입 밴드(?:\s*및 점프 이벤트 근거는)?[^.]+(?:\.\s*[^.]+){0,3}\.?/gu, '')
  }

  if (section === 'healthGuidance') {
    normalized = normalized
      .replace(
        /^건강(?:은| 흐름은)?[^.]+\.\s*/u,
        '건강은 버티는 힘보다 회복 속도를 어떻게 관리하느냐에서 차이가 크게 벌어집니다. '
      )
      .replace(/건강 흐름은/gu, '건강에서는')
      .replace(/(?:Moon-Saturn square|용신 화)\s*신호를 근거로 판단 강도를 조절합니다\.?/gu, '')
      .replace(/커리어 확장 신호를 근거로 판단 강도를 조절합니다\.?/gu, '')
      .replace(/특히 조심할 흐름은\s*$/gu, '')
  }

  return normalized.replace(/\s{2,}/g, ' ').trim()
}

function applyPremiumVoiceLayerToComprehensiveSections(
  sections: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...sections }

  const introduction = String(next.introduction || '').trim()
  if (introduction) {
    next.introduction = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        introduction
          .replace(
            /^이번 종합 리포트의 핵심은[^.]+\.\s*/u,
            '이번 종합 리포트는 가능성을 길게 나열하지 않고, 지금 실제로 판을 움직이는 축부터 바로 짚습니다. '
          )
          .replace(
            /인생의 흐름에서 가장 크게 작용하는 요소는 재정이며,\s*/u,
            '지금 가장 크게 움직이는 축은 재정이며, '
          )
          .replace(/지금 상대적으로 힘이 실리는 축은[^.]+?\.\s*/gu, '')
          .replace(/지금 상대적으로 힘이 실리는 축은\s*[^.]+입니다입니다\.\s*/gu, '')
      ),
      'ko'
    )
  }

  const conclusion = String(next.conclusion || '').trim()
  if (conclusion) {
    next.conclusion = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        conclusion
          .replace(
            /^이번 흐름의 결론은[^.]+\.\s*/u,
            '이번 흐름의 결론은 분명합니다. 재능보다 운영이 결과를 가릅니다. '
          )
          .replace(
            /지금 결론은\s*([가-힣]+)\s*흐름이/u,
            '지금 결론에서 $1 흐름은'
          )
      ),
      'ko'
    )
  }

  const relationshipDynamics = String(next.relationshipDynamics || '').trim()
  if (relationshipDynamics) {
    next.relationshipDynamics = formatNarrativeParagraphs(
      compactComprehensiveNarrative(
        relationshipDynamics
          .replace(
            /^관계의 체감 품질은[^.]+\.\s*/u,
            '관계는 감정을 더 크게 보여주는 사람이 아니라, 해석 오차를 먼저 줄이는 사람이 결국 이깁니다. '
          )
          .replace(/관계 타임라인:\s*$/u, ''),
        'relationshipDynamics'
      ),
      'ko'
    )
  }

  const careerPath = String(next.careerPath || '').trim()
  if (careerPath) {
    next.careerPath = formatNarrativeParagraphs(
      compactComprehensiveNarrative(careerPath, 'careerPath'),
      'ko'
    )
  }

  const wealthPotential = String(next.wealthPotential || '').trim()
  if (wealthPotential) {
    next.wealthPotential = formatNarrativeParagraphs(
      compactComprehensiveNarrative(wealthPotential, 'wealthPotential'),
      'ko'
    )
  }

  const healthGuidance = String(next.healthGuidance || '').trim()
  if (healthGuidance) {
    next.healthGuidance = formatNarrativeParagraphs(
      compactComprehensiveNarrative(healthGuidance, 'healthGuidance'),
      'ko'
    )
  }

  return next
}

function applyPremiumVoiceLayerToThemedSections(
  sections: Record<string, unknown>,
  theme: ReportTheme
): Record<string, unknown> {
  if (theme !== 'career') return sections

  const next = { ...sections }

  const strategy = String(next.strategy || '').trim()
  if (strategy) {
    next.strategy = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        strategy.replace(
          /^지금 커리어 전략의 승부처는[^.]+\.\s*/u,
          '지금 커리어 전략의 승부처는 일을 더 크게 벌이는 것이 아니라, 더 어려운 결정을 맡겨도 흔들리지 않는 사람으로 보이는 데 있습니다. '
        )
      ),
      'ko'
    )
  }

  const turningPoints = String(next.turningPoints || '').trim()
  if (turningPoints) {
    next.turningPoints = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        turningPoints.replace(
          /^커리어 전환점은[^.]+\.\s*/u,
          '커리어 전환점은 기회가 갑자기 커질 때보다, 지금 방식으로는 다음 단계에 못 간다는 사실을 인정할 때 열립니다. '
        )
      ),
      'ko'
    )
  }

  const recommendations = next.recommendations
  if (typeof recommendations === 'string' && recommendations.trim()) {
    next.recommendations = formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        recommendations.replace(
          /^기준을 정리한 뒤 실행하고/u,
          '추천은 많지 않아도 됩니다. 지금은 기준을 먼저 정리한 뒤 움직이는 편이 훨씬 강합니다. '
        )
      ),
      'ko'
    )
  }

  return next
}

function sanitizeComprehensiveSectionsForUser(
  sections: Record<string, unknown>,
  lang: 'ko' | 'en' = 'ko'
): Record<string, unknown> {
  const next = { ...sections }
  for (const key of COMPREHENSIVE_SECTION_KEYS) {
    const current = String(next[key] || '').trim()
    if (!current) continue
    const cleaned =
      lang === 'ko'
        ? sanitizeUserFacingNarrative(current)
            .replace(/배우자 아키타입:[\s\S]*?(?=(?:현재 나이|관계 타임라인|$))/g, '')
            .replace(/현재 나이\(약\s*\d+세\)\s*기준으로 우선순위를 정렬하세요\.?/g, '')
            .replace(/(?:\/\s*)?\d{1,2}-\d{1,2}세\s*\(\d+%\):[^.]+\./g, '')
            .replace(/변곡점 Top:\s*/g, '')
            .replace(/전체 점수\/신뢰 요약:\s*/g, '')
            .replace(/상위 도메인:\s*/g, '상위 흐름은 ')
            .replace(/관계 타임라인:\s*$/g, '')
            .replace(/검증/g, '확인')
            .replace(/\s{2,}/g, ' ')
            .trim()
        : sanitizeUserFacingNarrative(current)
            .replace(/dominant western element\s+바람/gi, 'dominant western element air')
            .replace(/\bwith\s+바람\s+as\s+the\s+dominant\s+western\s+element\b/gi, 'with air as the dominant western element')
            .replace(/\bdominant element\s+바람\b/gi, 'dominant element air')
            .replace(/격국\s+정재격/gi, 'frame jeongjae')
            .replace(/격국\s+편재격/gi, 'frame pyeonjae')
            .replace(/용신\s+화/gi, 'useful element fire')
            .replace(/용신\s+목/gi, 'useful element wood')
            .replace(/용신\s+수/gi, 'useful element water')
            .replace(/용신\s+금/gi, 'useful element metal')
            .replace(/용신\s+토/gi, 'useful element earth')
            .replace(/대운\s+metal/gi, 'Daeun metal')
            .replace(/대운\s+wood/gi, 'Daeun wood')
            .replace(/대운\s+water/gi, 'Daeun water')
            .replace(/대운\s+fire/gi, 'Daeun fire')
            .replace(/대운\s+earth/gi, 'Daeun earth')
            .replace(/대운/gi, 'Daeun')
            .replace(/세운/gi, 'annual cycle')
            .replace(/월운/gi, 'monthly cycle')
            .replace(/일운/gi, 'daily cycle')
            .replace(/\s{2,}/g, ' ')
            .trim()
    let formatted = formatNarrativeParagraphs(cleaned, lang)
    if (lang === 'en') {
      formatted = formatted
        .replace(/dominant western element\s+바람/gi, 'dominant western element air')
        .replace(/dominant element\s+바람/gi, 'dominant element air')
        .replace(/with\s+바람\s+as\s+the\s+dominant\s+western\s+element/gi, 'with air as the dominant western element')
        .replace(/격국\s+정재격/gi, 'frame jeongjae')
        .replace(/격국\s+편재격/gi, 'frame pyeonjae')
        .replace(/용신\s+화/gi, 'useful element fire')
        .replace(/용신\s+목/gi, 'useful element wood')
        .replace(/용신\s+수/gi, 'useful element water')
        .replace(/용신\s+금/gi, 'useful element metal')
        .replace(/용신\s+토/gi, 'useful element earth')
        .replace(/대운\s+metal/gi, 'Daeun metal')
        .replace(/대운\s+wood/gi, 'Daeun wood')
        .replace(/대운\s+water/gi, 'Daeun water')
        .replace(/대운\s+fire/gi, 'Daeun fire')
        .replace(/대운\s+earth/gi, 'Daeun earth')
        .replace(/\((목)\)/gi, '(wood)')
        .replace(/\((화)\)/gi, '(fire)')
        .replace(/\((수)\)/gi, '(water)')
        .replace(/\((금)\)/gi, '(metal)')
        .replace(/\((토)\)/gi, '(earth)')
        .replace(/Key grounding comes from ([^.]+)\.\s+Key grounding comes from \1\./gi, 'Key grounding comes from $1.')
    }
    next[key] = formatted
  }
  const layered = lang === 'ko' ? applyPremiumVoiceLayerToComprehensiveSections(next) : next
  return removeCrossSectionNarrativeRepetition(layered, [...COMPREHENSIVE_SECTION_KEYS], lang)
}

function applyComprehensiveSectionRoleGuards(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): AIPremiumReport['sections'] {
  if (lang !== 'ko') return sections

  const next: AIPremiumReport['sections'] = { ...sections }
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const blockedLabels = (reportCore.judgmentPolicy.blockedActionLabels || []).slice(0, 2)
  const softChecks = (reportCore.judgmentPolicy.softCheckLabels || reportCore.judgmentPolicy.softChecks || []).slice(0, 2)
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const daeunLead = matrixInput.currentDaeunElement
    ? `현재 장기 흐름의 바탕은 ${matrixInput.currentDaeunElement} 축입니다.`
    : ''
  const focusWindow =
    focusTiming && focusTiming.whyNow
      ? `${getTimingWindowLabel(focusTiming.window, lang)} 구간에서는 ${focusTiming.whyNow}`
      : focusTiming
        ? buildTimingWindowNarrative(reportCore.focusDomain, focusTiming, lang)
        : ''
  const personalityStructure = [
    matrixInput.dayMasterElement ? `원국의 중심은 ${matrixInput.dayMasterElement} 일간입니다.` : '',
    matrixInput.geokguk ? `격국은 ${matrixInput.geokguk}으로 읽힙니다.` : '',
    matrixInput.yongsin ? `용신 축은 ${matrixInput.yongsin}입니다.` : '',
    matrixInput.dominantWesternElement
      ? `서양 쪽에서는 ${matrixInput.dominantWesternElement} 원소가 강하게 작동합니다.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  const finalizeKoSection = (text: string) =>
    formatNarrativeParagraphs(sanitizeUserFacingNarrative(text).replace(/검증/g, '확인'), 'ko')

  next.introduction = finalizeKoSection(
    renderIntroductionSection(reportCore, matrixInput, lang)
  )

  next.personalityDeep = finalizeKoSection(
    [
      personalityStructure,
      `기본 성향의 강점은 구조화와 재정렬이고, 취약점은 해석이 끝나기 전에 확정을 서두를 때 발생합니다.`,
      `그래서 이 사람은 속도로 승부를 보기보다 기준을 짧은 문장으로 먼저 고정하고 움직일 때 판단 품질이 올라갑니다.`,
    ].join(' ')
  )

  next.careerPath = finalizeKoSection(
    renderCareerPathSection(reportCore, matrixInput, lang)
  )

  next.relationshipDynamics = finalizeKoSection(
    renderRelationshipDynamicsSection(reportCore, matrixInput, lang)
  )

  next.wealthPotential = finalizeKoSection(
    renderWealthPotentialSection(reportCore, matrixInput, lang)
  )

  next.healthGuidance = finalizeKoSection(
    renderHealthGuidanceSection(reportCore, matrixInput, lang)
  )

  next.lifeMission = finalizeKoSection(
    renderLifeMissionSection(reportCore, matrixInput, lang)
  )

  next.timingAdvice = finalizeKoSection(
    [
      focusWindow || reportCore.gradeReason,
      `타이밍의 핵심은 빨리 결정하는 것이 아니라, 확정과 검토를 다른 슬롯으로 분리하는 데 있습니다.`,
      softChecks.length > 0
        ? `지금은 문서, 합의, 전달 순서를 먼저 고정하는 편이 안전합니다.`
        : '',
      reportCore.riskControl,
    ]
      .filter(Boolean)
      .join(' ')
  )

  next.actionPlan = finalizeKoSection(
    [
      `우선 행동은 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
      `기본 실행 원칙은 역할·우선순위·기한을 먼저 고정한 뒤 움직이는 것입니다.`,
      blockedLabels.length > 0
        ? `반대로 피해야 할 것은 분위기나 압박에 밀려 바로 확정하는 방식입니다.`
        : '',
      reportCore.riskControl,
      `실행은 착수-재확인-확정으로 나누고, 오늘 먼저 닫을 것과 보류할 것을 분리하세요.`,
    ]
      .filter(Boolean)
      .join(' ')
  )

  next.conclusion = finalizeKoSection(
    renderConclusionSection(reportCore, matrixInput, lang)
  )

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
  const GENERIC_HEADING_REGEX =
    /^(introduction|personalitydeep|careerpath|relationshipdynamics|wealthpotential|healthguidance|lifemission|timingadvice|actionplan|conclusion)$/i
  const chunks: string[] = []
  for (const block of blocks) {
    const heading = normalizeDeterministicLine(String(block.heading || ''))
    const safeHeading =
      heading && !GENERIC_HEADING_REGEX.test(heading) && !NOISY_FRAGMENT_REGEX.test(heading)
        ? heading
        : ''
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
    if (safeHeading) {
      chunks.push(lang === 'ko' ? `${safeHeading}: ${composed}` : `${safeHeading}: ${composed}`)
      continue
    }
    chunks.push(composed)
  }
  return [...new Set(chunks)]
}

function buildNarrativeSupplementsBySection(
  blocksBySection: Record<string, DeterministicSectionBlock[]> | undefined,
  lang: 'ko' | 'en'
): Record<string, string[]> {
  if (!blocksBySection) return {}
  const SECTION_SPECIFIC_NOISE: Partial<Record<string, RegExp>> = {
    personalityDeep: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    careerPath: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    wealthPotential: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    healthGuidance: /(0-19세|20-34세|35-49세|50-64세|65\+|생애 흐름|변곡점 Top7)/,
    relationshipDynamics: /(적합도\s*\d+|직군\/산업|수입 밴드)/,
    lifeMission: /(0-19세|20-34세|35-49세|50-64세|65-84세|65\+|생애 흐름|변곡점 Top7)/,
    timingAdvice:
      /(0-19세|20-34세|35-49세|50-64세|65-84세|65\+|생애 흐름|변곡점 Top7|직군\/산업|배우자 아키타입|알아볼 단서|인생 챕터 흐름|실행 타이밍 전략|\d{4}-\d{2}\s*\(\d+%\)|교차 근거는 월간 실행)/,
  }
  return COMPREHENSIVE_SECTION_KEYS.reduce<Record<string, string[]>>((acc, key) => {
    const sectionNoise = SECTION_SPECIFIC_NOISE[key]
    const supplements = collectNarrativeSupplementsFromBlocks(blocksBySection[key], lang).filter(
      (item) => !sectionNoise || !sectionNoise.test(item)
    )
    if (supplements.length > 0) acc[key] = supplements
    return acc
  }, {})
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
  const minCharsPerSection = lang === 'ko' ? 720 : 950
  for (const key of COMPREHENSIVE_SECTION_KEYS) {
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
  signalSynthesis?: SignalSynthesisResult,
  reportCore?: ReportCoreViewModel
): AIPremiumReport['sections'] {
  if (reportCore) {
    const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
    const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
    if (lang === 'ko') {
      return {
        introduction: renderIntroductionSection(reportCore, input, lang),
        personalityDeep: renderPersonalityDeepSection(reportCore, input, lang),
        careerPath: renderCareerPathSection(reportCore, input, lang),
        relationshipDynamics: renderRelationshipDynamicsSection(reportCore, input, lang),
        wealthPotential: renderWealthPotentialSection(reportCore, input, lang),
        healthGuidance: renderHealthGuidanceSection(reportCore, input, lang),
        lifeMission: renderLifeMissionSection(reportCore, input, lang),
        timingAdvice: renderTimingAdviceSection(reportCore, input, lang),
        actionPlan: renderActionPlanSection(reportCore, input, lang),
        conclusion: renderConclusionSection(reportCore, input, lang),
      }
    }
    return {
      introduction: renderIntroductionSection(reportCore, input, lang),
      personalityDeep: renderPersonalityDeepSection(reportCore, input, lang),
      careerPath: renderCareerPathSection(reportCore, input, lang),
      relationshipDynamics: renderRelationshipDynamicsSection(reportCore, input, lang),
      wealthPotential: renderWealthPotentialSection(reportCore, input, lang),
      healthGuidance: renderHealthGuidanceSection(reportCore, input, lang),
      lifeMission: renderLifeMissionSection(reportCore, input, lang),
      timingAdvice: renderTimingAdviceSection(reportCore, input, lang),
      actionPlan: renderActionPlanSection(reportCore, input, lang),
      conclusion: renderConclusionSection(reportCore, input, lang),
    }
  }
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
  const strengthsLabel =
    lang === 'ko' && strengths === '성과 확장·완결률 강화'
      ? '성과 확장·완결률 강화'
      : strengths
  const cautionsLabel =
    lang === 'ko' && cautions === '성과 확장·완결률 강화'
      ? '조건 확인·커뮤니케이션 재검토'
      : cautions
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
      introduction: `오늘 흐름은 “좋은 카드가 손에 들어왔지만, 내는 순서를 잘 잡아야 이기는 판”에 가깝습니다. 사주 일간 ${input.dayMasterElement} 기운과 점성 핵심 신호를 겹쳐 보면, 밀어도 되는 축은 ${strengthsLabel}, 브레이크를 걸어야 하는 축은 ${cautionsLabel}로 정리됩니다. 한 줄 결론은 단순합니다. 속도로 이기려 하지 말고, 정확한 순서로 이기는 날입니다.`,
      personalityDeep: `당신의 기본 엔진은 빠른 판단력과 구조화 능력입니다. 그래서 시작은 누구보다 빠른데, 가끔은 확인 단계가 짧아져서 “좋은 선택을 아쉽게 마무리”하는 순간이 생깁니다. 오늘은 감으로 먼저 뛰기보다, 결론 1줄과 근거 1줄을 먼저 적고 움직이면 실수 비용이 크게 줄어듭니다.`,
      careerPath: `커리어 상위 지표는 ${topDomains || 'career(평가 중)'}이고, 지금은 “넓게 벌리기”보다 “깊게 닫기”가 이득인 타이밍입니다. 회의가 길어지는 날일수록 새 일 3개보다 완료 1개가 커리어 체급을 올립니다. 특히 협업 건은 역할·마감·책임을 먼저 고정할수록, 다음 기회에서 당신의 협상력이 선명하게 올라갑니다.`,
      relationshipDynamics: `관계에서는 말의 양보다 해석의 정확도가 승부를 냅니다. 같은 문장도 타이밍이 어긋나면 압박으로 들릴 수 있으니, 결론을 던지기 전에 “내가 이해한 게 맞는지” 한 줄로 맞춰보세요. 가까운 관계일수록 이 작은 확인이 감정 소모를 줄이고 신뢰를 빠르게 회복시킵니다.`,
      wealthPotential: `돈 흐름은 기회와 경계가 동시에 켜져 있습니다. 즉, 벌 수 있는 문은 열려 있지만, 조건을 대충 보면 새는 구멍도 함께 커지는 국면입니다. 지출·계약·투자 모두 금액, 기한, 취소 조건만 따로 떼어 확인해도 손실 확률이 눈에 띄게 내려갑니다.`,
      healthGuidance: `에너지는 단거리 스퍼트에 강한 편이라, 몰입 후 회복이 늦어질 때 컨디션 낙폭이 커질 수 있습니다. 오늘은 강한 루틴 하나보다 “짧은 회복 루틴 3번”이 더 효율적입니다. 수면, 수분, 호흡처럼 작지만 반복 가능한 기준을 지키면 집중력의 바닥이 올라갑니다.`,
      lifeMission: `장기적으로 당신의 힘은 한 번의 대박보다 “신뢰가 쌓이는 반복”에서 나옵니다. 기준을 설명할 수 있는 사람은 결국 큰 선택도 맡게 됩니다. 오늘의 작은 일관성이 1년 뒤의 큰 기회로 연결된다는 관점으로 움직이면 방향이 흔들리지 않습니다.`,
      timingAdvice: `결정 코어는 ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict}(${deterministicCore.decision.score}점)` : '일반 모드'}입니다. 강점 신호(${strengthsLabel})가 뜨는 구간은 실행 속도를 높이고, 주의 신호(${cautionsLabel})가 걸린 구간은 확정 전 이중 확인을 넣으세요. 특히 문서·합의·대외 전달은 “초안-검토-확정” 3단계로 쪼개면 결과가 훨씬 안정됩니다.`,
      actionPlan: `오늘 플랜은 세 줄이면 충분합니다. 1) 먼저 닫을 결과물 1개, 2) 외부 전달 전 재확인 1개, 3) 오늘 확정하지 않을 보류 1개. 이 구조만 지켜도 하루가 끝났을 때 “많이 한 느낌”이 아니라 “남는 결과”가 생깁니다.`,
      conclusion: `이번 흐름의 승부 포인트는 재능이 아니라 운영입니다. 밀어야 할 때는 밀고, 확인해야 할 때는 멈추는 리듬만 지켜도 체감 성과가 달라집니다. 같은 패턴을 2주 정도 유지하면 운의 변동이 줄고 결과의 재현성이 올라갑니다.`,
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
        '강도 높은 하루 뒤에는 회복 시간을 일정에 고정해 누적 피로를 끊어내세요.',
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
      introduction: ensureLongSectionNarrative(base.introduction, 720, [
        ...extraBySection.introduction,
      ]),
      personalityDeep: ensureLongSectionNarrative(base.personalityDeep, 520, [
        ...extraBySection.personalityDeep,
      ]),
      careerPath: ensureLongSectionNarrative(base.careerPath, 620, [...extraBySection.careerPath]),
      relationshipDynamics: ensureLongSectionNarrative(base.relationshipDynamics, 520, [
        ...extraBySection.relationshipDynamics,
      ]),
      wealthPotential: ensureLongSectionNarrative(base.wealthPotential, 520, [
        ...extraBySection.wealthPotential,
      ]),
      healthGuidance: ensureLongSectionNarrative(base.healthGuidance, 520, [
        ...extraBySection.healthGuidance,
      ]),
      lifeMission: ensureLongSectionNarrative(base.lifeMission, 520, [
        ...extraBySection.lifeMission,
      ]),
      timingAdvice: ensureLongSectionNarrative(base.timingAdvice, 420, [
        ...extraBySection.timingAdvice,
      ]),
      actionPlan: ensureLongSectionNarrative(base.actionPlan, 420, [...extraBySection.actionPlan]),
      conclusion: ensureLongSectionNarrative(base.conclusion, 420, [...extraBySection.conclusion]),
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
        ? `- 전략 ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'ko')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'ko')} | thesis=${item.thesis}`
        : `- strategy ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'en')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'en')} | thesis=${item.thesis}`
    )
  if (lang === 'ko') {
    return [
      '## Signal Synthesizer (고정 근거)',
      '- 아래 클레임과 근거 ID를 벗어나는 사실 추가 금지',
      '- 같은 도메인에서 상승/주의가 동시에 있으면 반드시 "상승 + 리스크관리"로 통합 서술',
      strategyEngine
        ? `- 전체 흐름: ${describePhaseFlow(strategyEngine.overallPhaseLabel, 'ko')} ${describeExecutionStance(strategyEngine.attackPercent, strategyEngine.defensePercent, 'ko')}`
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
  reportCore: ReportCoreViewModel | undefined,
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en'
): TimingReportSections {
  if (reportCore) {
    const timing = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
    const career = findReportCoreAdvisory(reportCore, 'career')
    const relation = findReportCoreAdvisory(reportCore, 'relationship')
    const wealth = findReportCoreAdvisory(reportCore, 'wealth')
    const health = findReportCoreAdvisory(reportCore, 'health')
    if (lang === 'ko') {
      const coreSections: TimingReportSections = {
        overview: `${reportCore.thesis} ${timing ? buildTimingWindowNarrative(reportCore.focusDomain, timing, lang) : reportCore.gradeReason}`,
        energy: `${health?.thesis || '에너지는 회복 우선 구조로 관리하는 편이 맞습니다.'} ${health?.caution || reportCore.primaryCaution}`,
        opportunities: `${career?.thesis || '기회는 커리어 쪽에서 단계적으로 열립니다.'} ${career?.action || reportCore.primaryAction}`,
        cautions: `${relation?.caution || reportCore.primaryCaution} ${reportCore.riskControl}`,
        domains: {
          career: `${career?.thesis || ''} ${career?.action || reportCore.primaryAction}`.trim(),
          love: `${relation?.thesis || ''} ${relation?.caution || reportCore.primaryCaution}`.trim(),
          wealth: `${wealth?.thesis || ''} ${wealth?.caution || reportCore.riskControl}`.trim(),
          health: `${health?.thesis || ''} ${health?.action || reportCore.primaryAction}`.trim(),
        },
        actionPlan: `${reportCore.primaryAction} ${reportCore.primaryCaution} ${reportCore.riskControl}`,
        luckyElements: reportCore.judgmentPolicy.rationale,
      }
      return {
        overview: ensureLongSectionNarrative(coreSections.overview, 560, [
          '타이밍 해석의 핵심은 속도를 높이는 것이 아니라, 실행과 확정을 분리해 오류 비용을 줄이는 데 있습니다.',
          '지금 구간은 같은 결론도 언제 어떻게 실행하느냐에 따라 결과 편차가 크게 갈릴 수 있습니다.',
        ]),
        energy: ensureLongSectionNarrative(coreSections.energy, 520, [
          '피로 신호를 뒤늦게 다루기보다, 먼저 회복 슬롯을 배치하는 방식이 현재 흐름과 더 잘 맞습니다.',
          '짧은 회복 루틴을 반복하는 쪽이 한 번의 강한 몰입보다 컨디션을 더 안정시킵니다.',
        ]),
        opportunities: ensureLongSectionNarrative(coreSections.opportunities, 520, [
          '기회는 넓게 벌리는 것보다, 이미 열린 문을 단계적으로 확정하는 과정에서 더 선명해집니다.',
          '지금은 시작 자체보다 완료 품질과 조건 합의가 다음 기회를 결정합니다.',
        ]),
        cautions: ensureLongSectionNarrative(coreSections.cautions, 500, [
          '특히 관계와 소통 영역의 주의 신호는 결론보다 확인 절차를 먼저 두라는 뜻으로 읽는 편이 맞습니다.',
          '같은 메시지도 해석 차이가 크면 결과가 달라지므로, 짧은 재확인이 리스크를 크게 줄입니다.',
        ]),
        domains: {
          career: ensureLongSectionNarrative(coreSections.domains.career, 420, [
            '커리어는 새로운 약속보다 기존 역할과 기준을 선명하게 정할수록 결과가 더 안정됩니다.',
          ]),
          love: ensureLongSectionNarrative(coreSections.domains.love, 420, [
            '관계는 감정의 크기보다 해석 일치를 먼저 맞추는 편이 현재 흐름에 더 적합합니다.',
          ]),
          wealth: ensureLongSectionNarrative(coreSections.domains.wealth, 420, [
            '재정은 상승 신호가 있어도 조건 검토가 빠지면 같은 속도로 새는 구멍도 커질 수 있습니다.',
          ]),
          health: ensureLongSectionNarrative(coreSections.domains.health, 420, [
            '건강은 무너지기 전에 리듬을 유지하는 운영이 가장 큰 차이를 만듭니다.',
          ]),
        },
        actionPlan: ensureLongSectionNarrative(coreSections.actionPlan, 520, [
          '실행 기준을 단순하게 유지해야 실제 행동 전환률과 결과 재현성이 함께 올라갑니다.',
          '오늘은 많이 하기보다 중요한 것을 정확히 닫는 구조가 맞습니다.',
        ]),
        luckyElements: ensureLongSectionNarrative(coreSections.luckyElements || '', 360, [
          '행운 요소는 감이 아니라 운영 원칙으로 작동하며, 기준을 지킬수록 체감 품질이 올라갑니다.',
        ]),
      }
    }
    return {
      overview: `${reportCore.thesis} ${timing ? buildTimingWindowNarrative(reportCore.focusDomain, timing, lang) : reportCore.gradeReason}`,
      energy: `${health?.thesis || 'Energy should be managed with recovery-first pacing.'} ${health?.caution || reportCore.primaryCaution}`,
      opportunities: `${career?.thesis || 'Opportunity opens through staged career moves.'} ${career?.action || reportCore.primaryAction}`,
      cautions: `${relation?.caution || reportCore.primaryCaution} ${reportCore.riskControl}`,
      domains: {
        career: `${career?.thesis || ''} ${career?.action || reportCore.primaryAction}`.trim(),
        love: `${relation?.thesis || ''} ${relation?.caution || reportCore.primaryCaution}`.trim(),
        wealth: `${wealth?.thesis || ''} ${wealth?.caution || reportCore.riskControl}`.trim(),
        health: `${health?.thesis || ''} ${health?.action || reportCore.primaryAction}`.trim(),
      },
      actionPlan: `${reportCore.primaryAction} ${reportCore.primaryCaution} ${reportCore.riskControl}`,
      luckyElements: reportCore.judgmentPolicy.rationale,
    }
  }
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
    cleanRecommendationLine(
      ensureLongSectionNarrative(line, 280, [
        `실행 전 체크포인트를 ${idx + 1}개라도 명확히 두면 결과 편차를 줄일 수 있습니다.`,
      ]),
      'ko'
    )
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
  reportCore: ReportCoreViewModel | undefined,
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en'
): ThemedReportSections {
  if (reportCore) {
    const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
    const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
    const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
    const common = {
      deepAnalysis: `${focusManifestation?.baselineThesis || focusAdvisory?.thesis || reportCore.thesis} ${reportCore.riskControl}`,
      patterns: `${focusManifestation?.activationThesis || reportCore.gradeReason} ${reportCore.judgmentPolicy.rationale}`,
      timing: `${focusTiming ? buildTimingWindowNarrative(reportCore.focusDomain, focusTiming, lang) : reportCore.gradeReason}`,
      recommendations: [reportCore.primaryAction, reportCore.primaryCaution, reportCore.riskControl].filter(Boolean),
      actionPlan: `${reportCore.primaryAction} ${reportCore.primaryCaution} ${reportCore.riskControl}`,
    } satisfies ThemedReportSections

    switch (theme) {
      case 'love':
        {
          const loveRelationship = findReportCoreAdvisory(reportCore, 'relationship')
          const loveWealth = findReportCoreAdvisory(reportCore, 'wealth')
          const loveHealth = findReportCoreAdvisory(reportCore, 'health')
          const loveRelationshipTiming = findReportCoreTimingWindow(reportCore, 'relationship')
          const loveWealthTiming = findReportCoreTimingWindow(reportCore, 'wealth')

        return enforceThemedDepth(
          {
            ...common,
            compatibility:
              `${loveRelationship?.thesis || reportCore.thesis} ${
                loveHealth?.caution || reportCore.riskControl
              }`.trim(),
            spouseProfile:
              `${
                findReportCoreManifestation(reportCore, 'relationship')?.manifestation ||
                reportCore.gradeReason
              } ${loveWealth?.thesis || ''}`.trim(),
            marriageTiming:
              loveRelationshipTiming
                ? `${buildTimingWindowNarrative('relationship', loveRelationshipTiming, lang)} ${
                    loveWealthTiming
                      ? buildTimingWindowNarrative('wealth', loveWealthTiming, lang)
                      : reportCore.riskControl
                  }`.trim()
                : reportCore.riskControl,
          },
          theme
        )
        }
      case 'career':
        return enforceThemedDepth(
          {
            ...common,
            strategy: findReportCoreAdvisory(reportCore, 'career')?.thesis || reportCore.thesis,
            roleFit:
              findReportCoreManifestation(reportCore, 'career')?.manifestation || reportCore.gradeReason,
            turningPoints:
              findReportCoreTimingWindow(reportCore, 'career')
                ? buildTimingWindowNarrative('career', findReportCoreTimingWindow(reportCore, 'career')!, lang)
                : reportCore.riskControl,
          },
          theme
        )
      case 'wealth':
        return enforceThemedDepth(
          {
            ...common,
            strategy: findReportCoreAdvisory(reportCore, 'wealth')?.thesis || reportCore.thesis,
            incomeStreams:
              findReportCoreManifestation(reportCore, 'wealth')?.manifestation || reportCore.gradeReason,
            riskManagement:
              findReportCoreAdvisory(reportCore, 'wealth')?.caution || reportCore.riskControl,
          },
          theme
        )
      case 'health':
        return enforceThemedDepth(
          {
            ...common,
            prevention: findReportCoreAdvisory(reportCore, 'health')?.thesis || reportCore.thesis,
            riskWindows:
              findReportCoreTimingWindow(reportCore, 'health')
                ? buildTimingWindowNarrative('health', findReportCoreTimingWindow(reportCore, 'health')!, lang)
                : reportCore.gradeReason,
            recoveryPlan:
              findReportCoreAdvisory(reportCore, 'health')?.action || reportCore.primaryAction,
          },
          theme
        )
      case 'family':
        {
          const familyRelationship = findReportCoreAdvisory(reportCore, 'relationship')
          const familyWealth = findReportCoreAdvisory(reportCore, 'wealth')
          const familyHealth = findReportCoreAdvisory(reportCore, 'health')
          const familyRelationshipTiming = findReportCoreTimingWindow(reportCore, 'relationship')
          const familyHealthTiming = findReportCoreTimingWindow(reportCore, 'health')

        return enforceThemedDepth(
          {
            ...common,
            dynamics:
              `${familyRelationship?.thesis || reportCore.thesis} ${
                familyWealth?.caution || familyHealth?.caution || reportCore.riskControl
              }`.trim(),
            communication:
              `${familyRelationship?.caution || reportCore.primaryCaution} ${
                familyHealth?.action || reportCore.primaryAction
              }`.trim(),
            legacy:
              `${familyWealth?.thesis || reportCore.judgmentPolicy.rationale} ${
                familyRelationshipTiming
                  ? buildTimingWindowNarrative('relationship', familyRelationshipTiming, lang)
                  : familyHealthTiming
                    ? buildTimingWindowNarrative('health', familyHealthTiming, lang)
                    : reportCore.riskControl
              }`.trim(),
          },
          theme
        )
        }
    }
  }
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
            `${relation?.thesis || ''} ${health?.riskControl || ''}`.trim(),
            '관계 궁합은 감정 강도보다 해석 일치와 관계 속도 합이 맞는지가 핵심입니다. 서로의 기대를 문장으로 맞추면 갈등 비용이 줄어듭니다. 좋아하는 마음이 있어도 표현 속도와 확정 속도가 다르면 관계는 쉽게 흔들릴 수 있으니, 감정보다 먼저 속도와 기준을 맞추는 것이 중요합니다.'
          ),
          spouseProfile: merge(
            wealth?.thesis,
            '관계형 파트너와의 조합에서 장점이 커집니다. 다만 확정 속도가 빠르면 오해가 누적되므로 확인 질문 루틴이 필요합니다. 잘 맞는 상대일수록 작은 말실수도 크게 남을 수 있으니, 감정 표현과 사실 확인을 분리하는 대화 습관이 중요합니다. 장기적으로는 설렘만큼 생활 적합도와 책임감의 합이 관계를 지켜주는 순간이 많습니다.'
          ),
          marriageTiming: merge(
            `${timing?.riskControl || ''} ${wealth?.riskControl || ''}`.trim(),
            '중요 확정은 당일보다 24시간 검증 창을 둔 뒤 진행하는 방식이 더 안전합니다. 일정·예산·역할 분담을 문서로 먼저 맞추면 감정 변수에 흔들릴 확률이 낮아집니다. 타이밍이 좋을수록 더 신중하게 기준을 맞추는 것이 실제 만족도를 높이고, 재접근과 결혼 논의는 서로 다른 속도로 운영해야 만족도가 올라갑니다.'
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
            `${relation?.thesis || ''} ${wealth?.riskControl || ''}`.trim(),
            '가족 역학은 표현 속도 차이만이 아니라 책임 배분과 실무 부담에서 오해가 커지기 쉽습니다. 누가 감정 정리와 실무 처리를 동시에 떠안는지 보이지 않으면 가까운 관계일수록 억울함이 누적됩니다. 그래서 결론보다 역할, 비용, 돌봄 범위를 먼저 맞추는 습관이 중요합니다. 작은 불균형을 빠르게 정리하면 장기 갈등을 예방할 수 있습니다.'
          ),
          communication: merge(
            `${relation?.riskControl || ''} ${health?.riskControl || ''}`.trim(),
            '결론 전달 전 상대 해석을 다시 확인하면 갈등 비용을 줄일 수 있습니다. 민감한 주제는 즉시 해결하려 하기보다 합의 가능한 기준부터 정하는 편이 안정적입니다. 특히 부모/형제/자녀마다 받아들이는 속도가 다르기 때문에, 누구와는 설명을 길게 하고 누구와는 경계선을 먼저 세워야 하는지 구분하는 것이 중요합니다.'
          ),
          legacy: merge(
            `${wealth?.thesis || ''} ${health?.thesis || ''}`.trim(),
            '세대 과제는 단기 성과보다 일관된 운영 원칙을 남기는 것입니다. 가족 안에서 반복되는 돈 문제, 돌봄 부담, 감정 노동의 패턴을 먼저 보이는 언어로 바꿔야 합니다. 기준 문서화를 습관화하면 역할/책임/기대치가 선명해지고, 남기는 것은 말이 아니라 반복 가능한 운영 규칙이 됩니다.'
          ),
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
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
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
      signalSynthesis,
      reportCore
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
    const comprehensiveSupplements = buildNarrativeSupplementsBySection(
      unified.blocksBySection,
      lang
    )
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichComprehensiveSectionsWithReportCore(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang,
      comprehensiveSupplements,
      options.timingData
    )
    if (lang === 'ko') {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'comprehensive',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections<AIPremiumReport['sections']>({
      reportType: 'comprehensive',
      sections: sections as AIPremiumReport['sections'],
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 360 : 260,
    })
    sections = polished.sections as unknown as Record<string, unknown>
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
    sections = sanitizeComprehensiveSectionsForUser(sections as Record<string, unknown>, lang)
    sections = applyComprehensiveSectionRoleGuards(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    if (lang === 'en') {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
    }
    sections = {
      ...(sections as Record<string, unknown>),
      timingAdvice: renderTimingAdviceSection(reportCore, normalizedInput, lang),
      actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
    }
    sections = stripGenericEvidenceFooters(sections, sectionPaths, lang)
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)

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
    let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
      sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
      qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
        requiredPaths: sectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      })
    }
    if (lang === 'en') {
      sections = {
        ...(sections as Record<string, unknown>),
        personalityDeep: renderPersonalityDeepSection(reportCore, normalizedInput, lang),
        timingAdvice: renderTimingAdviceSection(reportCore, normalizedInput, lang),
        actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
      }
      sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    }
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('comprehensive', finalModelUsed, qualityMetrics)

    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore),
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
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
    const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const fallbackSections = buildComprehensiveFallbackSections(
      input,
      matrixReport,
      deterministicCore,
      lang,
      signalSynthesis,
      reportCore
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
    const comprehensiveSupplements = buildNarrativeSupplementsBySection(
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
    if (lang === 'ko') {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'comprehensive',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
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
    sections = sanitizeComprehensiveSectionsForUser(sections, lang)
    sections = enrichComprehensiveSectionsWithReportCore(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang,
      comprehensiveSupplements,
      options.timingData
    )
    sections = sanitizeComprehensiveSectionsForUser(sections as Record<string, unknown>, lang)
    sections = applyComprehensiveSectionRoleGuards(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    if (lang === 'en') {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
    }
    sections = {
      ...(sections as Record<string, unknown>),
      timingAdvice: renderTimingAdviceSection(reportCore, normalizedInput, lang),
      actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
    }
    sections = stripGenericEvidenceFooters(sections, sectionPaths, lang)
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)

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
    let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
      sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
      qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
        requiredPaths: sectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      })
    }
    recordReportQualityMetrics('comprehensive', rewrite.modelUsed, qualityMetrics)

    recordRewriteModeMetric('comprehensive', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore),
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
        reportCore,
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
      signalSynthesis,
      reportCore
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
  sections = sanitizeComprehensiveSectionsForUser(sections, lang)
  sections = applyComprehensiveSectionRoleGuards(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  )
  if (lang === 'en') {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    ) as unknown as Record<string, unknown>
  }
  sections = enforceEvidenceRefFooters(
    sections,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )

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
  const comprehensiveSupplements = buildNarrativeSupplementsBySection(
    unified.blocksBySection,
    lang
  )
  sections = enrichComprehensiveSectionsWithReportCore(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang,
    comprehensiveSupplements,
    options.timingData
  )
  sections = sanitizeComprehensiveSectionsForUser(sections as Record<string, unknown>, lang)
  sections = applyComprehensiveSectionRoleGuards(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  )
  if (lang === 'en') {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    ) as unknown as Record<string, unknown>
  }
  sections = enforceEvidenceRefFooters(
    sections as Record<string, unknown>,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )
  let qualityMetrics = buildReportQualityMetrics(
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
  if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    sections = enforceEvidenceRefFooters(
      sections as Record<string, unknown>,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs,
      lang
    ) as AIPremiumReport['sections']
    qualityMetrics = buildReportQualityMetrics(
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
  }
  recordReportQualityMetrics('comprehensive', model, qualityMetrics)

  // 3. ??? ??
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...buildReportOutputCoreFields(reportCore),
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
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
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
    const draftSections = buildTimingFallbackSections(normalizedInput, reportCore, signalSynthesis, lang)
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
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichTimingSectionsWithReportCore(
      sections as unknown as TimingReportSections,
      reportCore,
      lang
    ) as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'timing',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections<TimingReportSections>({
      reportType: 'timing',
      sections: sections as unknown as TimingReportSections,
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 320 : 240,
    })
    sections = polished.sections as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'timing',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
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
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('timing', finalModelUsed, qualityMetrics)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore),
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
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
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
    const draftSections = buildTimingFallbackSections(normalizedInput, reportCore, signalSynthesis, lang)
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
    sections = enrichTimingSectionsWithReportCore(
      sections as unknown as TimingReportSections,
      reportCore,
      lang
    ) as unknown as Record<string, unknown>
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
    : (buildTimingFallbackSections(normalizedInput, reportCore, signalSynthesis, lang) as unknown as Record<
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
  sections = enrichTimingSectionsWithReportCore(
    sections as unknown as TimingReportSections,
    reportCore,
    lang
  ) as unknown as Record<string, unknown>

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
    ...buildReportOutputCoreFields(reportCore),
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
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const draftSections = buildThemedFallbackSections(theme, reportCore, signalSynthesis, lang)
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
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichThemedSectionsWithReportCore(
      sections as unknown as ThemedReportSections,
      reportCore,
      lang,
      theme,
      normalizedInput,
      timingData
    ) as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'themed',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections<ThemedReportSections>({
      reportType: 'themed',
      theme,
      sections: sections as unknown as ThemedReportSections,
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 340 : 260,
    })
    sections = polished.sections as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'themed',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
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
    sections = sanitizeThemedSectionsForUser(sections, sectionPaths, lang, theme)
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    const themeMeta = THEME_META[theme]
    const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)
    const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('themed', finalModelUsed, qualityMetrics)
    return {
      id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore),
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
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const requiredPaths = [...sectionPaths]
    const draftSections = buildThemedFallbackSections(theme, reportCore, signalSynthesis, lang)
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
    sections = enrichThemedSectionsWithReportCore(
      sections as unknown as ThemedReportSections,
      reportCore,
      lang,
      theme,
      normalizedInput,
      timingData
    ) as unknown as Record<string, unknown>
    sections = sanitizeThemedSectionsForUser(sections, sectionPaths, lang, theme)
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
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
      ...buildReportOutputCoreFields(reportCore),
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
    : (buildThemedFallbackSections(theme, reportCore, signalSynthesis, lang) as unknown as Record<
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
  sections = enrichThemedSectionsWithReportCore(
    sections as unknown as ThemedReportSections,
    reportCore,
    lang,
    theme,
    normalizedInput,
    timingData
  ) as unknown as Record<string, unknown>
  sections = sanitizeThemedSectionsForUser(sections, sectionPaths, lang, theme)
  sections = enforceEvidenceRefFooters(sections, sectionPaths, themedEvidenceRefs, lang)

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
    ...buildReportOutputCoreFields(reportCore),
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

