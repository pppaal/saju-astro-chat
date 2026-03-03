// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrixâ„¢ - AI Premium Report Generator
// ìœ ë£Œ ê¸°ëŠ¥: AI ê¸°ë°˜ ìƒì„¸ ë‚´ëŸ¬í‹°ë¸Œ ë¦¬í¬íŠ¸ ìƒì„±

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
} from './types'
import { THEME_META } from './types'
import { logger } from '@/lib/logger'
import { buildTimingPrompt } from './prompts/timingPrompts'
import { buildThemedPrompt } from './prompts/themedPrompts'
import { buildGraphRAGEvidence, formatGraphRAGEvidenceForPrompt } from './graphRagEvidence'
import { renderSectionsAsMarkdown, renderSectionsAsText } from './reportRendering'
import { buildDeterministicCore } from './deterministicCore'
import type { DeterministicProfile } from './deterministicCoreConfig'
import { getThemedSectionKeys } from './themeSchema'
import { buildLifeCyclePromptBlock, buildThemeSchemaPromptBlock } from '../interpretationSchema'
import { generateNarrativeSectionsFromSynthesis } from './narrativeGenerator'
import {
  buildSynthesisFactsForSection,
  synthesizeMatrixSignals,
  type SignalSynthesisResult,
  getDomainsForSection,
} from './signalSynthesizer'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import { buildPhaseStrategyEngine, type StrategyEngineResult } from './strategyEngine'

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

const SAJU_REGEX = /사주|오행|십신|대운|일간|격국|용신|신살|saju|five element|sibsin|daeun/i
const ASTRO_REGEX =
  /점성|행성|하우스|트랜짓|별자리|상승궁|천궁도|astrology|planet|house|transit|zodiac/i
const CROSS_REGEX = /교차|융합|통합|cross|integrat|synthesize/i
const ACTION_REGEX =
  /해야|하세요|실행|점검|정리|기록|실천|계획|오늘|이번주|이번 달|today|this week|this month|action|plan|step|execute|schedule/i
const TIMING_REGEX =
  /대운|세운|월운|일진|타이밍|시기|전환점|transit|timing|window|period|daeun|seun|wolun|iljin/i

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

function inferAgeFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const m = now.getMonth() - parsed.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1
  return Number.isFinite(age) && age >= 0 ? age : null
}

function hasCrossInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text)
}

function hasActionInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return ACTION_REGEX.test(text)
}

function hasEvidenceTriplet(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text) && CROSS_REGEX.test(text)
}

function hasTimingInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return TIMING_REGEX.test(text)
}

function hasRepetitiveSentences(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length >= 2) {
    const lineCounts = new Map<string, number>()
    for (const line of lines) {
      const key = line.replace(/\s+/g, ' ')
      lineCounts.set(key, (lineCounts.get(key) || 0) + 1)
    }
    if ([...lineCounts.values()].some((count) => count >= 2)) return true
  }

  const sentenceSplit = text
    .split(/(?<=ë‹¤\.)\s+|(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24)
  if (sentenceSplit.length < 3) return false
  const sentenceCounts = new Map<string, number>()
  for (const sentence of sentenceSplit) {
    const key = sentence.replace(/\s+/g, '').replace(/[^\p{L}\p{N}]/gu, '')
    if (!key) continue
    sentenceCounts.set(key, (sentenceCounts.get(key) || 0) + 1)
  }
  return [...sentenceCounts.values()].some((count) => count >= 2)
}

const LIST_LINE_REGEX = /^\s*(?:[-*•]|\d+[.)]|[A-Za-z][.)]|[가-힣][.)])\s+/m

function hasListLikeStyle(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  const nonEmpty = lines.filter(Boolean)
  if (nonEmpty.length === 0) return false
  const listLike = nonEmpty.filter((line) => LIST_LINE_REGEX.test(line)).length
  return listLike / nonEmpty.length >= 0.25 || listLike >= 3
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

function getMissingCrossKeys(sections: Record<string, unknown>, keys: string[]): string[] {
  const missing: string[] = []
  for (const key of keys) {
    const value = sections[key]
    if (typeof value === 'string') {
      if (!hasCrossInText(value)) missing.push(key)
    }
  }
  return missing
}

function buildCrossRepairInstruction(lang: 'ko' | 'en', missing: string[]): string {
  const list = missing.join(', ')
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: ì•„ëž˜ ì„¹ì…˜ì—ì„œ ì‚¬ì£¼/ì ì„± êµì°¨ ê·¼ê±°ê°€ ëˆ„ë½ë˜ì—ˆìŠµë‹ˆë‹¤.',
      `ëˆ„ë½ ì„¹ì…˜: ${list}`,
      'ê° ëˆ„ë½ ì„¹ì…˜ì— ë°˜ë“œì‹œ í¬í•¨: ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ + ì‹¤ìš© í–‰ë™ 2ë¬¸ìž¥.',
      'ë¬¸ìž¥í˜• ì¡´ëŒ“ë§ë§Œ ì‚¬ìš©í•˜ê³  ë¦¬ìŠ¤íŠ¸/ì´ëª¨ì§€/ì œëª© í‘œê¸°ëŠ” ê¸ˆì§€í•©ë‹ˆë‹¤.',
    ].join('\n')
  }
  return [
    '',
    'IMPORTANT: Cross-basis is missing in the following sections.',
    `Missing sections: ${list}`,
    'Each missing section must include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence + 2 practical action sentences.',
    'Use sentence-form only. No lists, emojis, or headings.',
  ].join('\n')
}

function getPathText(sections: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = sections
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  if (typeof cur === 'string') return cur
  if (Array.isArray(cur)) return cur.map((v) => String(v)).join(' ')
  return ''
}

function hasRequiredSectionPaths(payload: unknown, paths: string[]): boolean {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as Record<string, unknown>
  return paths.every((path) => {
    if (path === 'recommendations') {
      const rec = record.recommendations
      return Array.isArray(rec) && rec.length > 0
    }
    return getPathText(record, path).trim().length > 0
  })
}

function setPathText(sections: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.')
  let cur: Record<string, unknown> = sections
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    const next = cur[part]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cur[part] = {}
    }
    cur = cur[part] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
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

const HIGH_RISK_WEEKDAY_TOKENS = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
  '일요일',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const HIGH_RISK_PLANET_TOKENS = [
  '태양',
  '달',
  '수성',
  '금성',
  '화성',
  '목성',
  '토성',
  '천왕성',
  '해왕성',
  '명왕성',
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]

const HIGH_RISK_ASPECT_TOKENS = [
  '합',
  '충',
  '형',
  'trine',
  'square',
  'opposition',
  'conjunction',
  'sextile',
]

const HIGH_RISK_TRANSIT_TOKENS = [
  '역행',
  'retrograde',
  'solar return',
  'lunar return',
  'progression',
  'progressions',
  'eclipse',
  'eclipses',
  'draconic',
  'harmonic',
  'harmonics',
]

const REWRITE_STOP_WORDS = new Set([
  '그리고',
  '하지만',
  '또한',
  '또는',
  '그러나',
  '따라서',
  '또',
  '이때',
  '현재',
  '오늘',
  '이번',
  '구간',
  '흐름',
  '기준',
  '에서',
  '으로',
  '입니다',
  '합니다',
  'the',
  'and',
  'with',
  'for',
  'this',
  'that',
  'from',
  'into',
  'your',
  'today',
  'phase',
  'strategy',
])

const FORCE_REWRITE_ONLY_MODE = true

function compactToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

function tokenizeEvidenceText(value?: string): string[] {
  if (!value) return []
  return value
    .split(/[^\p{L}\p{N}_:+-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .map((token) => compactToken(token))
    .filter((token) => token.length >= 2 && !EVIDENCE_TOKEN_STOP_WORDS.has(token))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toEvidenceRef(
  signal: NonNullable<SignalSynthesisResult>['selectedSignals'][number]
): ReportEvidenceRef {
  return {
    id: signal.id,
    domain: signal.domainHints[0],
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
  limit = 4
): ReportEvidenceRef[] {
  if (!synthesis) return []
  const domainSet = new Set(domains)
  const pickedSignalIds = synthesis.claims
    .filter((claim) => domainSet.has(claim.domain))
    .flatMap((claim) => claim.evidence)
  const orderedSignals = [
    ...pickedSignalIds.map((id) => synthesis.signalsById[id]).filter(Boolean),
    ...synthesis.selectedSignals,
  ]
  const deduped: ReportEvidenceRef[] = []
  const seen = new Set<string>()
  for (const signal of orderedSignals) {
    if (!signal || seen.has(signal.id)) continue
    seen.add(signal.id)
    deduped.push(toEvidenceRef(signal))
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
  if (theme === 'love') {
    if (path === 'timing') return ['timing', 'relationship']
    return ['relationship', 'personality']
  }
  if (theme === 'career') {
    if (path === 'timing') return ['timing', 'career']
    return ['career', 'wealth']
  }
  if (theme === 'wealth') {
    if (path === 'timing') return ['timing', 'wealth']
    return ['wealth', 'career']
  }
  if (theme === 'health') {
    if (path === 'timing' || path === 'riskWindows') return ['timing', 'health']
    return ['health', 'personality']
  }
  if (path === 'timing') return ['timing', 'relationship']
  return ['relationship', 'personality']
}

function buildComprehensiveEvidenceRefs(
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
    refs[sectionKey] = selectEvidenceRefsByDomains(synthesis, getDomainsForSection(sectionKey), 4)
  }
  return refs
}

function buildTimingEvidenceRefs(
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  for (const path of sectionPaths) {
    refs[path] = selectEvidenceRefsByDomains(synthesis, getTimingPathDomains(path), 4)
  }
  return refs
}

function buildThemedEvidenceRefs(
  theme: ReportTheme,
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  for (const path of sectionPaths) {
    refs[path] = selectEvidenceRefsByDomains(synthesis, getThemedPathDomains(theme, path), 4)
  }
  return refs
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

function buildAllowedHighRiskTokenSet(evidenceRefs: SectionEvidenceRefs): Set<string> {
  const allowed = new Set<string>()
  for (const refs of Object.values(evidenceRefs)) {
    for (const ref of refs || []) {
      for (const token of [
        ...tokenizeEvidenceText(ref.id),
        ...tokenizeEvidenceText(ref.rowKey),
        ...tokenizeEvidenceText(ref.colKey),
        ...tokenizeEvidenceText(ref.keyword),
        ...tokenizeEvidenceText(ref.sajuBasis),
        ...tokenizeEvidenceText(ref.astroBasis),
      ]) {
        allowed.add(token)
      }
    }
  }
  return allowed
}

function findUnsupportedHighRiskTokens(text: string, allowed: Set<string>): string[] {
  const found = new Set<string>()
  const lowered = text.toLowerCase()
  const allRiskTokens = [
    ...HIGH_RISK_WEEKDAY_TOKENS,
    ...HIGH_RISK_PLANET_TOKENS,
    ...HIGH_RISK_ASPECT_TOKENS,
    ...HIGH_RISK_TRANSIT_TOKENS,
  ]
  for (const token of allRiskTokens) {
    const hasToken = /[a-z]/i.test(token)
      ? lowered.includes(token.toLowerCase())
      : text.includes(token)
    if (!hasToken) continue
    const compact = compactToken(token)
    if (!compact) continue
    if (!allowed.has(compact)) {
      found.add(token)
    }
  }
  return [...found]
}

interface EvidenceBindingViolation {
  path: string
  missingBinding: boolean
  unsupportedTokens: string[]
}

function validateEvidenceBinding(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs
): { needsRepair: boolean; violations: EvidenceBindingViolation[] } {
  const allowedHighRisk = buildAllowedHighRiskTokenSet(evidenceRefs)
  const violations: EvidenceBindingViolation[] = []
  for (const path of sectionPaths) {
    const text = getPathText(sections, path)
    if (!text) continue
    const refs = evidenceRefs[path] || []
    const missingBinding = refs.length > 0 && !hasEvidenceSupport(text, refs)
    const unsupportedTokens = findUnsupportedHighRiskTokens(text, allowedHighRisk)
    if (missingBinding || unsupportedTokens.length > 0) {
      violations.push({ path, missingBinding, unsupportedTokens })
    }
  }
  return { needsRepair: violations.length > 0, violations }
}

function buildEvidenceBindingRepairPrompt(
  lang: 'ko' | 'en',
  sections: Record<string, unknown>,
  evidenceRefs: SectionEvidenceRefs,
  violations: EvidenceBindingViolation[]
): string {
  const violationLines = violations.map((violation) => {
    const refs = (evidenceRefs[violation.path] || []).map((ref) => ref.id).join(', ')
    const unsupported = violation.unsupportedTokens.join(', ')
    if (lang === 'ko') {
      return `- ${violation.path}: missingBinding=${violation.missingBinding ? 'yes' : 'no'}, unsupported=[${unsupported || 'none'}], allowedEvidence=[${refs || 'none'}]`
    }
    return `- ${violation.path}: missingBinding=${violation.missingBinding ? 'yes' : 'no'}, unsupported=[${unsupported || 'none'}], allowedEvidence=[${refs || 'none'}]`
  })

  if (lang === 'ko') {
    return [
      '중요: 아래 sections JSON을 근거 고정 규칙에 맞게 리페어하세요.',
      '규칙:',
      '- violation에 표시된 path만 수정하고 나머지 path는 유지합니다.',
      '- evidenceRefs에 없는 고위험 토큰(요일/행성/각/트랜짓)은 제거합니다.',
      '- 각 수정 path에는 allowedEvidence 기준의 근거 키워드를 최소 1개 이상 반영합니다.',
      '- JSON 구조와 키는 절대 변경하지 않습니다.',
      '- JSON만 반환합니다.',
      'violations:',
      ...violationLines,
      'evidenceRefs:',
      JSON.stringify(evidenceRefs, null, 2),
      'sections:',
      JSON.stringify(sections, null, 2),
    ].join('\n')
  }
  return [
    'IMPORTANT: Repair the sections JSON below to satisfy evidence-binding rules.',
    'Rules:',
    '- Modify only violating paths and keep all other paths unchanged.',
    '- Remove unsupported high-risk tokens (weekday/planet/aspect/transit) not in evidenceRefs.',
    '- Each modified path must include at least one keyword grounded by allowedEvidence refs.',
    '- Keep JSON structure and keys exactly intact.',
    '- Return JSON only.',
    'violations:',
    ...violationLines,
    'evidenceRefs:',
    JSON.stringify(evidenceRefs, null, 2),
    'sections:',
    JSON.stringify(sections, null, 2),
  ].join('\n')
}

function enforceEvidenceBindingFallback(
  sections: Record<string, unknown>,
  violations: EvidenceBindingViolation[],
  evidenceRefs: SectionEvidenceRefs,
  lang: 'ko' | 'en'
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(sections)) as Record<string, unknown>
  for (const violation of violations) {
    const current = getPathText(next, violation.path)
    if (!current) continue
    let cleaned = current
    for (const token of violation.unsupportedTokens) {
      const pattern = new RegExp(escapeRegExp(token), /[a-z]/i.test(token) ? 'gi' : 'g')
      cleaned = cleaned
        .replace(pattern, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }
    if (violation.missingBinding) {
      const refs = (evidenceRefs[violation.path] || []).slice(0, 2)
      if (refs.length > 0) {
        const labels = refs
          .map((ref) => ref.keyword || ref.rowKey || ref.id)
          .filter(Boolean)
          .join(', ')
        const groundingSentence =
          lang === 'ko'
            ? `근거 기준은 ${labels} 흐름입니다.`
            : `Grounding evidence follows ${labels} signals.`
        cleaned = `${cleaned} ${groundingSentence}`.trim()
      }
    }
    setPathText(next, violation.path, cleaned)
  }
  return next
}

function tokenizeRewrite(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:_+-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !REWRITE_STOP_WORDS.has(token))
}

function buildAllowedRewriteTokenSet(
  draftSections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs
): Set<string> {
  const allowed = buildAllowedHighRiskTokenSet(evidenceRefs)
  for (const path of sectionPaths) {
    const text = getPathText(draftSections, path)
    for (const token of tokenizeRewrite(text)) {
      allowed.add(token)
    }
    const refs = evidenceRefs[path] || []
    for (const ref of refs) {
      for (const token of [
        ...tokenizeRewrite(ref.id || ''),
        ...tokenizeRewrite(ref.rowKey || ''),
        ...tokenizeRewrite(ref.colKey || ''),
        ...tokenizeRewrite(ref.keyword || ''),
        ...tokenizeRewrite(ref.sajuBasis || ''),
        ...tokenizeRewrite(ref.astroBasis || ''),
      ]) {
        allowed.add(token)
      }
    }
  }
  return allowed
}

function validateRewriteOnlyOutput(
  draftSections: Record<string, unknown>,
  rewrittenSections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = []
  const allowedTokens = buildAllowedRewriteTokenSet(draftSections, sectionPaths, evidenceRefs)
  const evidenceCheck = validateEvidenceBinding(rewrittenSections, sectionPaths, evidenceRefs)
  if (evidenceCheck.needsRepair) {
    reasons.push(
      ...evidenceCheck.violations.map(
        (violation) =>
          `evidence-mismatch:${violation.path}:missing=${violation.missingBinding}:unsupported=${violation.unsupportedTokens.join('|')}`
      )
    )
  }

  for (const path of sectionPaths) {
    const draftText = getPathText(draftSections, path)
    const rewrittenText = getPathText(rewrittenSections, path)
    if (!draftText || !rewrittenText) continue
    const rewrittenTokens = tokenizeRewrite(rewrittenText)
    const newTokens = rewrittenTokens.filter((token) => !allowedTokens.has(token))
    if (newTokens.length > 0) {
      reasons.push(`new-token:${path}:${newTokens.slice(0, 12).join(',')}`)
    }
  }
  return { pass: reasons.length === 0, reasons }
}

function buildRewriteOnlyPrompt(
  lang: 'ko' | 'en',
  draftSections: Record<string, unknown>,
  evidenceRefs: SectionEvidenceRefs,
  sectionPaths: string[],
  minCharsPerSection: number
): string {
  const payload = JSON.stringify(draftSections, null, 2)
  const refs = JSON.stringify(evidenceRefs, null, 2)
  if (lang === 'ko') {
    return [
      '당신은 리라이팅 전용 에디터입니다.',
      '아래 draft JSON을 한국어 문장만 자연스럽게 다듬으세요.',
      '절대 규칙:',
      '- 새 정보/새 해석/새 개념 추가 금지',
      '- 고유명사(십신/신살/행성/하우스/요소)는 원문 그대로 유지',
      '- evidenceRefs에 없는 엔티티/요일/트랜짓/행성/각 추가 금지',
      '- 섹션 키 구조 유지',
      '- 각 섹션 최소 길이 유지',
      `- 최소 길이: ${minCharsPerSection}자`,
      `- 대상 섹션: ${sectionPaths.join(', ')}`,
      'evidenceRefs:',
      refs,
      'draft:',
      payload,
      'JSON만 반환',
    ].join('\n')
  }
  return [
    'You are a rewrite-only editor.',
    'Polish the Korean draft JSON text naturally without changing meaning.',
    'Hard rules:',
    '- No new facts, no new interpretation, no new concepts',
    '- Keep proper entities exactly as in draft',
    '- Do not add entities/weekday/transit/planet/aspect beyond evidenceRefs',
    '- Keep section keys and structure unchanged',
    `- Keep minimum ${minCharsPerSection} chars per section`,
    `- Target sections: ${sectionPaths.join(', ')}`,
    'evidenceRefs:',
    refs,
    'draft:',
    payload,
    'Return JSON only',
  ].join('\n')
}

async function rewriteSectionsWithFallback<T extends object>(args: {
  lang: 'ko' | 'en'
  userPlan?: AIUserPlan
  draftSections: T
  evidenceRefs: SectionEvidenceRefs
  sectionPaths: string[]
  requiredPaths: string[]
  minCharsPerSection: number
}): Promise<{ sections: T; modelUsed: string; tokensUsed: number }> {
  const {
    lang,
    userPlan,
    draftSections,
    evidenceRefs,
    sectionPaths,
    requiredPaths,
    minCharsPerSection,
  } = args
  const prompt = buildRewriteOnlyPrompt(
    lang,
    draftSections as unknown as Record<string, unknown>,
    evidenceRefs,
    sectionPaths,
    minCharsPerSection
  )
  try {
    const rewritten = await callAIBackendGeneric<T>(prompt, lang, {
      userPlan,
      modelOverride: 'gpt-4o-mini',
    })
    const candidate = rewritten.sections as unknown
    if (!hasRequiredSectionPaths(candidate, requiredPaths)) {
      return {
        sections: draftSections,
        modelUsed: 'rewrite-fallback-required-paths',
        tokensUsed: 0,
      }
    }
    const candidateSections = candidate as Record<string, unknown>
    const check = validateRewriteOnlyOutput(
      draftSections as unknown as Record<string, unknown>,
      candidateSections,
      sectionPaths,
      evidenceRefs
    )
    if (!check.pass) {
      return { sections: draftSections, modelUsed: 'rewrite-fallback-validator', tokensUsed: 0 }
    }
    return {
      sections: candidate as T,
      modelUsed: rewritten.model || 'gpt-4o-mini',
      tokensUsed: rewritten.tokensUsed || 0,
    }
  } catch (error) {
    logger.warn('[AI Report] Rewrite-only call failed; using deterministic draft', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { sections: draftSections, modelUsed: 'rewrite-fallback-error', tokensUsed: 0 }
  }
}

function getShortSectionPaths(
  sections: Record<string, unknown>,
  paths: string[],
  minCharsPerSection: number
): string[] {
  const short: string[] = []
  for (const path of paths) {
    const text = getPathText(sections, path)
    if (text && text.length < minCharsPerSection) short.push(path)
  }
  return short
}

function getMissingCrossPaths(sections: Record<string, unknown>, crossPaths: string[]): string[] {
  return crossPaths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !hasCrossInText(text)
  })
}

function getCrossCoverageRatio(sections: Record<string, unknown>, crossPaths: string[]): number {
  const texts = crossPaths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => hasCrossInText(t)).length
  return hit / texts.length
}

function getCoverageRatioByPredicate(
  sections: Record<string, unknown>,
  paths: string[],
  predicate: (text: string) => boolean
): number {
  const texts = paths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => predicate(t)).length
  return hit / texts.length
}

function getMissingPathsByPredicate(
  sections: Record<string, unknown>,
  paths: string[],
  predicate: (text: string) => boolean
): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !predicate(text)
  })
}

function getListStylePaths(sections: Record<string, unknown>, paths: string[]): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && hasListLikeStyle(text)
  })
}

function getRepetitivePaths(sections: Record<string, unknown>, paths: string[]): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && hasRepetitiveSentences(text)
  })
}

function buildNarrativeStyleRepairInstruction(lang: 'ko' | 'en', listStylePaths: string[]): string {
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: í˜„ìž¬ ë¬¸ì²´ê°€ í•­ëª©í˜•/ë¶ˆë¦¿í˜•ìœ¼ë¡œ ê°ì§€ë˜ì—ˆìŠµë‹ˆë‹¤.',
      listStylePaths.length > 0
        ? `ì„œì‚¬í˜•ìœ¼ë¡œ ìž¬ìž‘ì„±í•  ì„¹ì…˜: ${listStylePaths.join(', ')}`
        : '',
      'ë°˜ë“œì‹œ ë¬¸ë‹¨í˜• ì„œì‚¬ë¡œ ìž¬ìž‘ì„±í•˜ì„¸ìš”. ë²ˆí˜¸, ë¶ˆë¦¿, ê¸°í˜¸(1., -, â€¢, âœ… ë“±)ë¥¼ ì‚¬ìš©í•˜ì§€ ë§ˆì„¸ìš”.',
      'ê° ì„¹ì…˜ì€ 6ë¬¸ìž¥ ì´ìƒìœ¼ë¡œ ì—°ê²°ê° ìžˆê²Œ ìž‘ì„±í•˜ê³ , ì‹¤ì œ ìƒí™© ì˜ˆì‹œì™€ ì‹¤í–‰ ë§¥ë½ì„ í•¨ê»˜ ë„£ìœ¼ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    'IMPORTANT: List-like style detected.',
    listStylePaths.length > 0
      ? `Rewrite these sections in narrative prose: ${listStylePaths.join(', ')}`
      : '',
    'Rewrite using paragraph narrative only. Do not use bullets, numbering, or checklist style.',
    'Each section should be at least 6 connected sentences with realistic context and actionable framing.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildAntiRepetitionInstruction(lang: 'ko' | 'en', repetitivePaths: string[]): string {
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: ë°˜ë³µ ë¬¸ìž¥ì´ ê°ì§€ë˜ì—ˆìŠµë‹ˆë‹¤.',
      repetitivePaths.length > 0
        ? `ë°˜ë³µ ì œê±° í•„ìš” ì„¹ì…˜: ${repetitivePaths.join(', ')}`
        : '',
      'ê°™ì€ ë¬¸ìž¥ êµ¬ì¡°/í‘œí˜„ì„ ë°˜ë³µí•˜ì§€ ë§ê³ , ê° ë¬¸ë‹¨ë§ˆë‹¤ ìƒˆë¡œìš´ ê·¼ê±°ì™€ ë‹¤ë¥¸ ì‚¬ë¡€ë¥¼ ì‚¬ìš©í•˜ì„¸ìš”.',
      'â€œì´ êµ¬ê°„ì€ â€¦â€ ê°™ì€ í…œí”Œë¦¿ ë¬¸ìž¥ ë°˜ë³µì„ ê¸ˆì§€í•˜ê³  ìžì—°ìŠ¤ëŸ¬ìš´ ì„œìˆ ë¡œ ë‹¤ì‹œ ìž‘ì„±í•˜ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    'IMPORTANT: Repetitive sentences detected.',
    repetitivePaths.length > 0
      ? `Sections needing dedup rewrite: ${repetitivePaths.join(', ')}`
      : '',
    'Do not repeat sentence templates. Rewrite in natural narrative with new evidence and varied phrasing.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildNarrativeRewritePrompt(
  lang: 'ko' | 'en',
  sections: Record<string, unknown>,
  options: {
    minCharsPerSection: number
    minTotalChars: number
    requiredTimingSections: string[]
  }
): string {
  const json = JSON.stringify(sections, null, 2)
  if (lang === 'ko') {
    return [
      'ë‹¹ì‹ ì€ ìš´ì„¸ ë¦¬í¬íŠ¸ ì—ë””í„°ìž…ë‹ˆë‹¤.',
      'ì•„ëž˜ JSON ì„¹ì…˜ì„ ì˜ë¯¸ëŠ” ìœ ì§€í•˜ê³  ë¬¸ì²´ë§Œ ì‚¬ëžŒ ì¹œí™”ì  ì„œìˆ í˜•ìœ¼ë¡œ ë¦¬ë¼ì´íŠ¸í•˜ì„¸ìš”.',
      'ì¤‘ìš” ê·œì¹™:',
      '- ì„¹ì…˜ í‚¤ëŠ” ì ˆëŒ€ ë³€ê²½í•˜ì§€ ë§ ê²ƒ.',
      '- ë¶ˆë¦¿/ë²ˆí˜¸ ëª©ë¡ ê¸ˆì§€, ìžì—° ë¬¸ë‹¨í˜•ìœ¼ë¡œ ìž‘ì„±.',
      '- ê°™ì€ ë¬¸ìž¥ í…œí”Œë¦¿ ë°˜ë³µ ê¸ˆì§€.',
      `- ê° ì„¹ì…˜ ìµœì†Œ ${options.minCharsPerSection}ìž ìœ ì§€.`,
      `- ì „ì²´ ìµœì†Œ ${options.minTotalChars}ìž ìœ ì§€.`,
      `- ${options.requiredTimingSections.join(', ')} ì„¹ì…˜ì—ëŠ” ëŒ€ìš´Â·ì„¸ìš´Â·ì›”ìš´Â·ì¼ì§„Â·íŠ¸ëžœì§“ íƒ€ì´ë° ë¬¸ìž¥ì„ ìµœì†Œ 1íšŒ í¬í•¨.`,
      '- ê³¼ìž¥/ë‹¨ì •/ê³µí¬ ì¡°ìž¥ í‘œí˜„ ê¸ˆì§€. í˜„ì‹¤ì ì´ê³  êµ¬ì²´ì ì¸ í–‰ë™ ë¬¸ìž¥ í¬í•¨.',
      'ì•„ëž˜ JSONë§Œ ë°˜í™˜:',
      '```json',
      json,
      '```',
    ].join('\n')
  }
  return [
    'You are a narrative editor for astrology reports.',
    'Rewrite the JSON sections below with human-friendly prose while preserving meaning.',
    'Rules:',
    '- Do not change section keys.',
    '- No bullets/numbering; paragraph narrative only.',
    '- Avoid repeated sentence templates.',
    `- Keep at least ${options.minCharsPerSection} chars per section.`,
    `- Keep at least ${options.minTotalChars} chars total.`,
    `- In ${options.requiredTimingSections.join(', ')}, include timing grounding with Daeun/Seun/Wolun/Iljin/transit at least once.`,
    '- Avoid hype and absolute claims; include practical actions.',
    'Return JSON only:',
    '```json',
    json,
    '```',
  ].join('\n')
}

function buildDepthRepairInstruction(
  lang: 'ko' | 'en',
  sectionPaths: string[],
  shortPaths: string[],
  minCharsPerSection: number,
  minTotalChars: number
): string {
  const allPaths = sectionPaths.join(', ')
  const shortList = shortPaths.join(', ')
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: ë¦¬í¬íŠ¸ê°€ ì§§ê±°ë‚˜ ì¼ë°˜ë¡ ì ìž…ë‹ˆë‹¤. ì•„ëž˜ ê¸°ì¤€ì„ ë§Œì¡±í•˜ë„ë¡ ì „ì²´ë¥¼ ë‹¤ì‹œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
      `í•„ìˆ˜ ì„¹ì…˜: ${allPaths}`,
      `ê° ì„¹ì…˜ ìµœì†Œ ê¸¸ì´: ${minCharsPerSection}ìž, ì „ì²´ ìµœì†Œ ê¸¸ì´: ${minTotalChars}ìž`,
      shortPaths.length > 0 ? `íŠ¹ížˆ ë³´ê°•ì´ í•„ìš”í•œ ì„¹ì…˜: ${shortList}` : '',
      'ê° ì„¹ì…˜ì€ ë°˜ë“œì‹œ 1) í•µì‹¬ í•´ì„ 2) ê·¼ê±° 3) ìƒí™œ ì ìš© 4) ì£¼ì˜ í¬ì¸íŠ¸ë¥¼ ë¬¸ìž¥í˜•ìœ¼ë¡œ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ì–´ë ¤ìš´ ìš©ì–´ë¥¼ ì“°ë©´ ë°”ë¡œ ë’¤ì— ì‰¬ìš´ í•œêµ­ì–´ ì„¤ëª…ì„ ë¶™ì—¬ ì£¼ì„¸ìš”.',
      'ë¦¬ìŠ¤íŠ¸ ëŒ€ì‹  ì„œìˆ í˜• ë¬¸ë‹¨ìœ¼ë¡œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    '',
    'IMPORTANT: The report is too short or generic. Rewrite all sections with stronger depth.',
    `Required sections: ${allPaths}`,
    `Minimum length: ${minCharsPerSection} chars per section, ${minTotalChars} chars total`,
    shortPaths.length > 0 ? `Sections needing expansion: ${shortList}` : '',
    'Each section must include: key interpretation, evidence, practical application, and caution point.',
    'If technical terms are used, add plain-language explanations right after them.',
    'Use paragraph-style narrative, not bullet points.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildSecondPassInstruction(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '',
      '2ì°¨ ë³´ê°• ì§€ì‹œ: ì—¬ì „ížˆ ë°€ë„ê°€ ë¶€ì¡±í•˜ë©´ ê° ì„¹ì…˜ì„ ìµœì†Œ 6ë¬¸ìž¥ìœ¼ë¡œ í™•ìž¥í•´ ì£¼ì„¸ìš”.',
      'ê° ì„¹ì…˜ì— ë°˜ë“œì‹œ ì‹¤ì „ ì˜ˆì‹œ 1ê°œì™€ ì‹¤í–‰ ìˆœì„œ(ì˜¤ëŠ˜-ì´ë²ˆì£¼-ì´ë²ˆë‹¬)ë¥¼ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ì¶”ìƒì  ë¯¸ì‚¬ì—¬êµ¬ ëŒ€ì‹  í–‰ë™ ê°€ëŠ¥í•œ ë¬¸ìž¥ìœ¼ë¡œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
    ].join('\n')
  }
  return [
    '',
    'Second-pass rewrite: if depth is still weak, expand each section to at least 6 sentences.',
    'Include one practical example and execution sequence (today-this week-this month) in each section.',
    'Prefer concrete action-oriented language over abstract filler.',
  ].join('\n')
}

function buildActionRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: ì‹¤í–‰ ë¬¸ìž¥ ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°• í•„ìš” ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° í•µì‹¬ ì„¹ì…˜ë§ˆë‹¤ ë°˜ë“œì‹œ ì˜¤ëŠ˜-ì´ë²ˆì£¼-ì´ë²ˆë‹¬ ìˆœì„œì˜ ì‹¤í–‰ ë¬¸ìž¥(í–‰ë™ ì§€ì‹œ) ìµœì†Œ 2ê°œë¥¼ ë„£ìœ¼ì„¸ìš”.',
      'ì¶”ìƒì  ìœ„ë¡œ ë¬¸ìž¥ ëŒ€ì‹  ì‹¤ì œ í–‰ë™ ê°€ëŠ¥í•œ ë¬¸ìž¥ì„ ì‚¬ìš©í•˜ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Actionable sentence coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing action steps: ${missingPaths.join(', ')}` : '',
    'Each core section must include at least 2 concrete action sentences using a today-this week-this month sequence.',
    'Replace abstract comfort with executable guidance.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildEvidenceRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: ê·¼ê±° íŠ¸ë¦¬í”Œ(ì‚¬ì£¼+ì ì„±+êµì°¨) ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°• í•„ìš” ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° í•µì‹¬ ì„¹ì…˜ì—ì„œ ë°˜ë“œì‹œ ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ì„ í¬í•¨í•˜ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Evidence triplet coverage (Saju+Astrology+Cross) is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing evidence triplet: ${missingPaths.join(', ')}` : '',
    'For each core section include 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildCrossCoverageRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: ì‚¬ì£¼+ì ì„± êµì°¨ ì„œìˆ  ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      'ê° í•µì‹¬ ì„¹ì…˜ë§ˆë‹¤ ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ì„ ë°˜ë“œì‹œ í¬í•¨í•˜ì„¸ìš”.',
      'ë‹¨ìˆœ ì¼ë°˜ë¡ ì„ ì¤„ì´ê³ , ê·¼ê±°ì–´(ì‚¬ì£¼/ì ì„±/í•˜ìš°ìŠ¤/ëŒ€ìš´/íŠ¸ëžœì‹¯)ë¥¼ ë¬¸ìž¥ì— ëª…ì‹œí•˜ì„¸ìš”.',
    ].join('\n')
  }
  return [
    '',
    `IMPORTANT: Cross-basis narrative coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    'For each core section include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
    'Avoid generic filler and explicitly mention grounding terms (saju/astrology/house/daeun/transit).',
  ].join('\n')
}

function buildTimingRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: íƒ€ì´ë° ê·¼ê±°(ëŒ€ìš´/ì„¸ìš´/ì›”ìš´/ì¼ì§„/íŠ¸ëžœì§“) ë°˜ì˜ ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°• í•„ìš” ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° ë³´ê°• ì„¹ì…˜ì—ì„œ ë°˜ë“œì‹œ ë‹¤ìŒì„ ëª…ì‹œí•˜ì„¸ìš”: í˜„ìž¬ ëŒ€ìš´ 1ë¬¸ìž¥, ì„¸ìš´/ì›”ìš´/ì¼ì§„ ì¤‘ 2ê°œ ì´ìƒ 1ë¬¸ìž¥, ì ì„± íŠ¸ëžœì§“/í–‰ì„± íƒ€ì´ë° 1ë¬¸ìž¥, ì‹¤ì œ ì‹¤í–‰ ì‹œì  1ë¬¸ìž¥.',
      'íƒ€ì´ë°ì€ ë°˜ë“œì‹œ ì ˆëŒ€ í‘œí˜„ìœ¼ë¡œ ì“°ì„¸ìš”(ì˜¤ëŠ˜/ì´ë²ˆì£¼/ì´ë²ˆë‹¬ + êµ¬ì²´ ì‹œì ).',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Timing grounding coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing timing grounding: ${missingPaths.join(', ')}` : '',
    'For each missing section include: 1 current Daeun sentence, 1 sentence using at least two of Seun/Wolun/Iljin, 1 transit timing sentence, and 1 execution timing sentence.',
    'Use explicit timing language (today/this week/this month + concrete windows).',
  ]
    .filter(Boolean)
    .join('\n')
}

function getMaxRepairPassesByPlan(plan?: AIUserPlan): number {
  switch (plan) {
    case 'premium':
      return 3
    case 'pro':
      return 3
    case 'starter':
      return 2
    case 'free':
    default:
      return 2
  }
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
const BANNED_PHRASES = [
  '격국의 결',
  '긴장 신호',
  '상호작용',
  '시사',
  '결이',
  '프레임',
  '검증',
  '근거 세트',
]
const BANNED_PHRASE_PATTERNS = BANNED_PHRASES.map((phrase) => new RegExp(phrase, 'gi'))
const ADVICE_SENTENCE_REGEX = /(좋습니다|유의하셔야 합니다)/

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
  for (const pattern of BANNED_PHRASE_PATTERNS) {
    result = result.replace(pattern, '')
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
    if (lang === 'ko') {
      lines.push(
        `${toKoreanDomainLabel(strategy.domain)} 국면은 ${strategy.phaseLabel}이며 공격 ${strategy.attackPercent}% / 방어 ${strategy.defensePercent}% 운영이 적합합니다.`
      )
      lines.push(strategy.strategy)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    } else {
      lines.push(
        `${strategy.domain} is in ${strategy.phaseLabel} with offense ${strategy.attackPercent}% / defense ${strategy.defensePercent}%.`
      )
      lines.push(strategy.strategy)
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
  if (input.currentDaeunElement || input.currentSaeunElement) {
    bullets.push(
      `대운과 세운이 함께 움직이는 구간이라 단기 감정보다 중기 계획을 우선하는 쪽이 낫습니다.`
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

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=ë‹¤\.)\s+|(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

function measureSectionNovelty(text: string): number {
  const sentences = splitSentences(text).filter((s) => s.length >= 16)
  const unique = new Set(
    sentences.map((s) =>
      s
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()
    )
  )
  return unique.size
}

function measureSectionSpecificity(text: string): number {
  const concreteRegex =
    /ì˜¤ëŠ˜|ì´ë²ˆì£¼|ì´ë²ˆ ë‹¬|ì´ë²ˆë‹¬|ì´ë²ˆ í•´|ì›”ê°„|ì£¼ê°„|ê³„ì•½|ì¼ì •|ë§ˆê°|íšŒì˜|ì—°ë½|ìˆ˜ë©´|ë‘í†µ|í—ˆë¦¬|ê´€ì ˆ|ì†Œí™”|í”¼ë¡œ/i
  return splitSentences(text).filter((s) => concreteRegex.test(s)).length
}

function countConcreteNounsBySection(
  text: string,
  sectionKey: keyof AIPremiumReport['sections']
): number {
  const nouns = SECTION_CONCRETE_NOUNS[sectionKey] || []
  const lowered = text.toLowerCase()
  const matched = new Set<string>()
  for (const noun of nouns) {
    if (lowered.includes(noun.toLowerCase())) {
      matched.add(noun)
    }
  }
  return matched.size
}

function measureAverageSentenceLength(text: string): number {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return 0
  const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  return total / sentences.length
}

function countAdviceSentences(text: string): number {
  const sentences = splitSentences(text)
  return sentences.filter((sentence) => ADVICE_SENTENCE_REGEX.test(sentence)).length
}

function normalizeFactKeywords(fact: string): string[] {
  const stopWords = new Set([
    'ê·¸ë¦¬ê³ ',
    'í•˜ì§€ë§Œ',
    'ì—ì„œ',
    'ìœ¼ë¡œ',
    'ìž…ë‹ˆë‹¤',
    'í•©ë‹ˆë‹¤',
    'íë¦„',
    'ì¶•',
    'í˜„ìž¬',
    'ê¸°ì§ˆ',
    'ì„±í–¥',
  ])
  return fact
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t))
    .slice(0, 4)
}

function measureEvidenceDensity(text: string, factPack: string[]): number {
  const lowered = text.toLowerCase()
  let reflected = 0
  for (const fact of factPack) {
    const keywords = normalizeFactKeywords(fact)
    if (keywords.some((kw) => lowered.includes(kw.toLowerCase()))) {
      reflected += 1
    }
  }
  return reflected
}

function evaluateSectionGate(
  text: string,
  factPack: string[],
  sectionKey: keyof AIPremiumReport['sections']
) {
  const novelty = measureSectionNovelty(text)
  const specificity = countConcreteNounsBySection(text, sectionKey)
  const genericSpecificity = measureSectionSpecificity(text)
  const evidenceDensity = measureEvidenceDensity(text, factPack)
  const avgSentenceLength = measureAverageSentenceLength(text)
  const banned = containsBannedPhrase(text)
  const adviceCount = countAdviceSentences(text)
  return {
    novelty,
    specificity,
    genericSpecificity,
    evidenceDensity,
    avgSentenceLength,
    banned,
    adviceCount,
    repetitive: hasRepetitiveSentences(text),
    pass:
      novelty >= 3 &&
      specificity >= 2 &&
      evidenceDensity >= 2 &&
      avgSentenceLength <= 40 &&
      !banned &&
      adviceCount <= 2 &&
      !hasRepetitiveSentences(text),
  }
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

function buildComprehensiveFallbackSections(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  lang: 'ko' | 'en',
  signalSynthesis?: SignalSynthesisResult
): AIPremiumReport['sections'] {
  if (signalSynthesis && signalSynthesis.claims.length > 0) {
    return generateNarrativeSectionsFromSynthesis({
      lang,
      matrixInput: input,
      synthesis: signalSynthesis,
    })
  }
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

  if (lang === 'ko') {
    return {
      introduction: `현재 리포트는 규칙 기반 안전 모드로 생성되었습니다. 사주 일간 ${input.dayMasterElement}과 점성 핵심 배치의 공통 분모를 우선 정리해, 오늘 실행 가능한 결론만 남겼습니다. 강점 신호는 ${strengths}, 주의 신호는 ${cautions}로 요약됩니다.`,
      personalityDeep: `기본 성향은 일간 ${input.dayMasterElement}의 의사결정 리듬과 점성의 사고·감정 축이 함께 작동하는 구조입니다. 강점은 빠른 판단과 구조화 능력이고, 약점은 과속 결론과 확인 누락입니다. 중요한 선택일수록 판단 시점과 실행 시점을 분리하면 안정성이 올라갑니다.`,
      careerPath: `커리어 관점의 상위 지표는 ${topDomains || 'career(평가 중)'}입니다. 실행 방식은 한 번에 넓히기보다 핵심 과업 1~2개를 완결하고 다음 단계로 확장하는 전개가 유리합니다. 외부 협업은 역할과 마감 정의를 먼저 고정해야 성과 변동을 줄일 수 있습니다.`,
      relationshipDynamics: `관계 영역에서는 의도 전달보다 해석 오차 관리가 핵심입니다. 표현을 짧게 하고 확인 질문을 추가하면 불필요한 감정 소모를 줄일 수 있습니다. 가까운 관계일수록 결론을 서두르기보다 맥락을 먼저 맞추는 대화 구조가 안정적입니다.`,
      wealthPotential: `재정에서는 기회 신호와 보수 신호가 동시에 존재하므로 수익 기대만으로 확정하지 않는 원칙이 필요합니다. 이번 사이클은 지출 통제·현금흐름 가시화·조건 검증의 3축이 우선입니다. 큰 의사결정은 당일 확정보다 24시간 재검토가 손실 방지에 유리합니다.`,
      healthGuidance: `에너지 패턴은 단기 집중 후 회복이 늦어지는 형태가 반복될 수 있습니다. 무리한 확장보다 수면·수분·리듬 고정이 결과를 지켜줍니다. 일정이 밀리는 날일수록 강도 높은 작업보다 오류 비용이 큰 작업의 검수 우선순위를 올리는 것이 좋습니다.`,
      lifeMission: `장기 방향성은 단기 성과보다 누적 신뢰를 만드는 구조에 맞춰져 있습니다. 본인의 기준을 명확히 설명하고 실행 기록을 남기는 습관이 영향력을 키웁니다. 즉흥적 승부보다 일관된 품질이 운의 변동폭을 줄이는 핵심 레버리지입니다.`,
      timingAdvice: `결정 코어 판정은 ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict}(${deterministicCore.decision.score}점)` : '일반 모드'}입니다. 실행 창을 열 때는 강점 신호(${strengths})를 우선 사용하고, 주의 신호(${cautions})가 걸리는 영역은 확정 전에 이중 확인을 넣어야 합니다. 특히 문서·합의·대외 커뮤니케이션은 체크리스트 기반으로 진행하세요.`,
      actionPlan: `오늘 실행안은 세 단계로 고정하세요. 첫째, 반드시 끝낼 결과물 1개를 정의합니다. 둘째, 외부 전달 전 조건·기한·책임을 한 줄로 재확인합니다. 셋째, 당일 확정이 필요한 안건만 처리하고 나머지는 재검토 슬롯으로 넘겨 리스크를 분리합니다.`,
      conclusion: `이 리포트는 데이터 해석의 일관성을 우선한 안전 모드 결과입니다. 핵심은 강점 구간에서 속도를 내고, 주의 구간에서는 확인 단계를 생략하지 않는 것입니다. 같은 패턴을 2주만 유지해도 성과의 재현성이 분명히 올라갑니다.`,
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
  const timing = pick('timing')
  const career = pick('career')
  const relation = pick('relationship')
  const wealth = pick('wealth')
  const health = pick('health')

  if (lang === 'ko') {
    return {
      overview:
        timing?.thesis ||
        '오늘 흐름은 확정 속도보다 검증 순서가 중요합니다. 결론과 실행 시점을 분리하면 손실 가능성을 줄일 수 있습니다.',
      energy:
        health?.thesis ||
        '에너지는 단기 집중 후 회복 관리가 핵심입니다. 수면·수분·루틴을 먼저 고정한 뒤 업무 볼륨을 늘리세요.',
      opportunities:
        career?.thesis ||
        '기회 구간에서는 핵심 과업 1~2개 완결 전략이 유리합니다. 확장 전에 역할과 책임을 먼저 정리하세요.',
      cautions:
        relation?.riskControl ||
        '커뮤니케이션 오차가 누적되면 성과가 흔들릴 수 있습니다. 대화/문서 전달 전 한 줄 요약 재확인을 넣으세요.',
      domains: {
        career:
          career?.riskControl ||
          '커리어는 일정·우선순위·마감 정의를 먼저 고정하는 운영이 안전합니다.',
        love:
          relation?.riskControl ||
          '관계는 감정 속도보다 해석 일치가 먼저입니다. 확인 질문으로 오차를 줄이세요.',
        wealth:
          wealth?.riskControl || '재정은 금액·기한·취소조건을 체크리스트로 검증한 뒤 확정하세요.',
        health:
          health?.riskControl ||
          '건강은 과속보다 회복 리듬 유지가 우선입니다. 피로 누적 신호를 선제적으로 차단하세요.',
      },
      actionPlan:
        '오늘은 1) 끝낼 결과물 1개 정의 2) 외부 전달 전 조건·기한·책임 재확인 3) 당일 확정이 아닌 항목은 24시간 재검토 슬롯으로 이동의 3단계로 운영하세요.',
      luckyElements: '행운 요소는 속도보다 순서입니다. 먼저 검증하고 이후 확정하세요.',
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

function buildThemedFallbackSections(
  theme: ReportTheme,
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en'
): ThemedReportSections {
  const claims = synthesis?.claims || []
  const pick = (domain: string) => claims.find((claim) => claim.domain === domain)
  const career = pick('career')
  const relation = pick('relationship')
  const wealth = pick('wealth')
  const health = pick('health')
  const personality = pick('personality')
  const timing = pick('timing')

  const baseKo: ThemedReportSections = {
    deepAnalysis:
      personality?.thesis ||
      '핵심 성향은 빠른 판단과 검증 필요가 함께 작동하는 구조입니다. 확정 전 재확인 단계를 고정하면 변동성이 줄어듭니다.',
    patterns:
      '반복 패턴은 상승 신호와 주의 신호가 동시에 나타나는 형태입니다. 따라서 "확장 + 리스크관리"를 하나의 전략으로 묶어 운영하는 것이 유리합니다.',
    timing:
      timing?.thesis ||
      '타이밍 전략은 당일 확정보다 단계적 검증에 강점이 있습니다. 오늘 결론, 내일 확정의 이중 단계가 안정적입니다.',
    recommendations: [
      career?.riskControl || '핵심 과업 1~2개를 먼저 완결하세요.',
      relation?.riskControl || '대화/문서 전달 전 한 줄 요약 재확인을 넣으세요.',
      wealth?.riskControl || '금액·기한·취소조건을 체크리스트로 검증하세요.',
    ],
    actionPlan:
      '실행 순서는 1) 목표 1개 고정 2) 조건 재확인 3) 확정 분할입니다. 이 순서를 2주 유지하면 결과 재현성이 올라갑니다.',
  }

  switch (theme) {
    case 'love':
      return {
        ...baseKo,
        compatibility:
          relation?.thesis ||
          '관계 궁합은 감정 강도보다 해석 일치 여부가 핵심입니다. 서로의 기대를 문장으로 맞추면 갈등 비용이 줄어듭니다.',
        spouseProfile:
          '관계형 파트너와의 조합에서 장점이 커집니다. 다만 확정 속도가 빠르면 오해가 누적되므로 확인 질문 루틴이 필요합니다.',
        marriageTiming:
          timing?.riskControl ||
          '중요 확정은 당일보다 24시간 검증 창을 둔 뒤 진행하는 방식이 더 안전합니다.',
      }
    case 'career':
      return {
        ...baseKo,
        strategy:
          career?.thesis ||
          '커리어 전략은 폭넓은 시도보다 핵심 과업 완결 중심이 유리합니다. 역할·마감·책임의 명확화가 성과를 지킵니다.',
        roleFit:
          '의사결정과 구조화가 필요한 포지션에서 강점이 큽니다. 단, 속도전보다 품질 검증 프로세스가 필수입니다.',
        turningPoints:
          timing?.thesis ||
          '전환점은 상승 신호와 조정 신호가 동시에 들어오는 구간에서 나타납니다. 확장과 재정의를 병행하세요.',
      }
    case 'wealth':
      return {
        ...baseKo,
        strategy:
          wealth?.thesis ||
          '재정 전략은 수익 기대보다 현금흐름 안정과 조건 검증에 우선순위를 둬야 합니다.',
        incomeStreams:
          '수입원 다각화는 가능하지만, 새 채널 확정은 소규모 검증 후 확대가 안전합니다.',
        riskManagement: wealth?.riskControl || '지출 상한과 손절 규칙을 먼저 정하고 실행하세요.',
      }
    case 'health':
      return {
        ...baseKo,
        prevention:
          health?.thesis ||
          '예방의 핵심은 과부하 누적을 차단하는 것입니다. 수면·수분·회복 루틴을 일정에 고정하세요.',
        riskWindows:
          timing?.thesis ||
          '리스크 구간은 일정 밀집과 커뮤니케이션 과부하가 겹칠 때 커집니다. 일정 분할로 충격을 줄이세요.',
        recoveryPlan:
          health?.riskControl ||
          '회복 계획은 강도보다 지속성이 중요합니다. 2주 단위로 재점검하세요.',
      }
    case 'family':
      return {
        ...baseKo,
        dynamics:
          relation?.thesis ||
          '가족 역학은 표현 속도 차이에서 오해가 커지기 쉽습니다. 맥락 정리 후 전달하는 방식이 유리합니다.',
        communication:
          relation?.riskControl ||
          '결론 전달 전 상대 해석을 다시 확인하면 갈등 비용을 줄일 수 있습니다.',
        legacy:
          '세대 과제는 단기 성과보다 일관된 운영 원칙을 남기는 것입니다. 기준 문서화를 습관화하세요.',
      }
  }
}

// ===========================
// ë©”ì¸ ìƒì„± í•¨ìˆ˜
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'

  // 1. í”„ë¡¬í”„íŠ¸ ë¹Œë“œ
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, {
    mode: 'comprehensive',
    focusDomain: options.focusDomain,
  })
  const deterministicCore = buildDeterministicCore({
    matrixInput: input,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const signalSynthesis = synthesizeMatrixSignals({
    lang,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const strategyEngine = buildPhaseStrategyEngine(signalSynthesis, lang, {
    daeunActive: Boolean(input.currentDaeunElement),
    seunActive: Boolean(input.currentSaeunElement),
    activeTransitCount: (input.activeTransits || []).length,
  })

  if (FORCE_REWRITE_ONLY_MODE) {
    const draftSections = buildComprehensiveFallbackSections(
      input,
      matrixReport,
      deterministicCore,
      lang,
      signalSynthesis
    )
    const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const rewrite = await rewriteSectionsWithFallback<AIPremiumReport['sections']>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      sectionPaths,
      requiredPaths: sectionPaths,
      minCharsPerSection: lang === 'ko' ? 280 : 220,
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

    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      lang,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
        geokguk: input.geokguk,
      },
      sections: sections as AIPremiumReport['sections'],
      graphRagEvidence,
      evidenceRefs,
      deterministicCore,
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

      const quality = evaluateSectionGate(sectionText, factPack, sectionKey)
      if (!quality.pass) {
        const repairPrompt = [
          buildSectionPrompt(sectionKey, factPack, lang, sectionText, sectionMinChars),
          lang === 'ko'
            ? `ë³´ê°• ê·œì¹™: ìƒˆ í¬ì¸íŠ¸ë¥¼ ìµœì†Œ ì„¸ ê°œ ë„£ê³ , êµ¬ì²´ ëª…ì‚¬ë¥¼ ìµœì†Œ ë‘ ê°œ ë„£ê³ , ì‚¬ì‹¤ ë¬¶ìŒ ë°˜ì˜ ë¬¸ìž¥ì„ ìµœì†Œ ë‘ ê°œ ë„£ì–´ ì£¼ì„¸ìš”. í‰ê·  ë¬¸ìž¥ ê¸¸ì´ëŠ” 40ìž ì´í•˜ë¡œ ë§žì¶”ê³  ê¸ˆì§€ í‘œí˜„ì€ ì œê±°í•´ ì£¼ì„¸ìš”. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
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

  // 3. ??? ??
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
      geokguk: input.geokguk,
    },

    sections: sections as AIPremiumReport['sections'],
    graphRagEvidence,
    evidenceRefs: comprehensiveEvidenceRefs,
    deterministicCore,
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
    },
  }

  return report
}

// ===========================
// íƒ€ì´ë° ë¦¬í¬íŠ¸ ìƒì„± í•¨ìˆ˜
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
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {}
): Promise<TimingAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, { mode: 'timing', period })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: input,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const signalSynthesis = synthesizeMatrixSignals({
    lang,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const strategyEngine = buildPhaseStrategyEngine(signalSynthesis, lang, {
    daeunActive: Boolean(input.currentDaeunElement),
    seunActive: Boolean(input.currentSaeunElement),
    activeTransitCount: (input.activeTransits || []).length,
  })

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
    const draftSections = buildTimingFallbackSections(input, signalSynthesis, lang)
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    const rewrite = await rewriteSectionsWithFallback<TimingReportSections>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 220 : 180,
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
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      lang,
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
      evidenceRefs,
      deterministicCore,
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
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

  // 1. ë§¤íŠ¸ë¦­ìŠ¤ ìš”ì•½ ë¹Œë“œ
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. í”„ë¡¬í”„íŠ¸ ë¹Œë“œ
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

  // 3. AI ë°±ì—”ë“œ í˜¸ì¶œ + í’ˆì§ˆ ê²Œì´íŠ¸(ê¸¸ì´/êµì°¨ ê·¼ê±°)
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
    : (buildTimingFallbackSections(input, signalSynthesis, lang) as unknown as Record<
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

  // 4. ê¸°ê°„ ë¼ë²¨ ìƒì„±
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. ì ìˆ˜ ê³„ì‚°
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)

  // 6. ë¦¬í¬íŠ¸ ì¡°ë¦½
  const report: TimingAIPremiumReport = {
    id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

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
    evidenceRefs: timingEvidenceRefs,
    deterministicCore,
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
    },
  }

  return report
}

// ===========================
// í…Œë§ˆë³„ ë¦¬í¬íŠ¸ ìƒì„± í•¨ìˆ˜
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
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {}
): Promise<ThemedAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, { mode: 'themed', theme })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: input,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const signalSynthesis = synthesizeMatrixSignals({
    lang,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const strategyEngine = buildPhaseStrategyEngine(signalSynthesis, lang, {
    daeunActive: Boolean(input.currentDaeunElement),
    seunActive: Boolean(input.currentSaeunElement),
    activeTransitCount: (input.activeTransits || []).length,
  })

  if (FORCE_REWRITE_ONLY_MODE) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const requiredPaths = [...sectionPaths]
    const draftSections = buildThemedFallbackSections(theme, signalSynthesis, lang)
    const evidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
    const rewrite = await rewriteSectionsWithFallback<ThemedReportSections>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 220 : 180,
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
    const themeMeta = THEME_META[theme]
    const themeScore = calculateThemeScore(theme, input.sibsinDistribution)
    const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
    return {
      id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      lang,
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
      evidenceRefs,
      deterministicCore,
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

  // 1. ë§¤íŠ¸ë¦­ìŠ¤ ìš”ì•½ ë¹Œë“œ
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. í”„ë¡¬í”„íŠ¸ ë¹Œë“œ
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

  // 3. AI ë°±ì—”ë“œ í˜¸ì¶œ + í’ˆì§ˆ ê²Œì´íŠ¸(ê¸¸ì´/êµì°¨ ê·¼ê±°)
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

  // 4. í…Œë§ˆ ë©”íƒ€ë°ì´í„°
  const themeMeta = THEME_META[theme]

  // 5. ì ìˆ˜ ê³„ì‚°
  const themeScore = calculateThemeScore(theme, input.sibsinDistribution)

  // 6. í‚¤ì›Œë“œ ì¶”ì¶œ
  const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)

  // 7. ë¦¬í¬íŠ¸ ì¡°ë¦½
  const report: ThemedAIPremiumReport = {
    id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

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
    evidenceRefs: themedEvidenceRefs,
    deterministicCore,
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
    },
  }

  return report
}
