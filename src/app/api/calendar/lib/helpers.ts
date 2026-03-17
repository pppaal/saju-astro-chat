/**
 * @file Calendar API helper functions
 * Extracted from route.ts for modularity
 */

import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api/ApiClient'
import type {
  EventCategory,
  ImportanceGrade,
  ImportantDate,
} from '@/lib/destiny-map/destinyCalendar'
import type { CalendarEvidence, TranslationData } from '@/types/calendar-api'
import type { PillarData } from '@/lib/Saju/types'
import type { DomainKey, DomainScore, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type { CounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import type { SajuPillarAccessor, FormattedDate, LocationCoord } from './types'
import { getFactorTranslation } from './translations'
import { KO_MESSAGES, EN_MESSAGES } from './constants'
import {
  GRADE_THRESHOLDS,
  DISPLAY_SCORE_LABEL_THRESHOLDS,
  EVIDENCE_CONFIDENCE_THRESHOLDS,
} from '@/lib/destiny-map/calendar/scoring-config'
import { normalizeMojibakePayload, repairMojibakeText } from '@/lib/text/mojibake'

type MatrixSignal = {
  level: 'high' | 'medium' | 'caution'
  trigger: string
  score: number
}

type MatrixEvidencePacketMap = Record<string, CounselorEvidencePacket>

const IRREVERSIBLE_RECOMMENDATION_KEYS = new Set([
  'majorDecision',
  'bigDecision',
  'wedding',
  'contract',
  'business',
  'reservation',
  'signature',
])

const COMMUNICATION_WARNING_TOKENS = [
  'mercuryretrograde',
  'misunderstanding',
  'confusion',
  'voidofcourse',
  'communication',
  'conflict',
  'opposition',
]

const CROSS_AGREEMENT_ALIGNMENT_THRESHOLD = 60
const CALENDAR_MATRIX_STRICT_MODE = true

const CATEGORY_PACKET_KEY: Record<string, string> = {
  career: 'career',
  study: 'career',
  love: 'love',
  wealth: 'wealth',
  health: 'health',
  travel: 'today',
  general: 'today',
}

const DOMAIN_PACKET_KEY: Record<NonNullable<CalendarEvidence['matrix']['domain']>, string> = {
  career: 'career',
  love: 'love',
  money: 'wealth',
  health: 'health',
  move: 'today',
  general: 'today',
}

const CONFLICT_LABEL_TOKENS = [
  'conflict',
  'mixed',
  'split',
  '\uCDA9\uB3CC',
  '\uD574\uC11D \uAC08\uB9BC',
  '\uAC08\uB9BC',
  '\uAE34\uC7A5+\uACBD\uACC4',
]

const CAUTION_WARNING_TOKENS = [
  ...COMMUNICATION_WARNING_TOKENS,
  'caution',
  'extremecaution',
  'recheck',
  '\uC7AC\uD655\uC778',
  '\uC624\uB958',
]

const HARD_GATE_WARNING_TOKENS = [
  ...COMMUNICATION_WARNING_TOKENS,
  'extremecaution',
  'danger',
  'accident',
  'injury',
  'surgery',
  'legal',
  'dispute',
  'eclipse',
]

const MATRIX_TECHNICAL_PAYLOAD_PATTERN =
  /(pair=|angle=|orb=|allowed=|dayMaster=|geokguk=|yongsin=|sibsin=|daeun=|saeun=|wolun=|iljin=|currentDaeun=|currentSaeun=|currentWolun=|currentIljin=|profile=|matrix=|overlap=|orbFit=|set\s*\d+)/i

const IRREVERSIBLE_RECOMMENDATION_PATTERNS = [
  /\b(sign(?:\s+now)?|finalize|confirm|book(?:ing)?|wedding|invitation|big decision|resign|launch|commit now)\b/i,
  /(contract|signature|reservation|final decision|major decision|big launch)/i,
  /(\uACC4\uC57D|\uC11C\uBA85|\uD655\uC815|\uC608\uC57D|\uACB0\uD63C\uC2DD|\uCCAD\uCCA9\uC7A5|\uC774\uC9C1\s*\uD655\uC815|\uCC3D\uC5C5\s*\uD655\uC815|\uB7F0\uCE6D|\uD070\s*\uACB0\uC815|\uC989\uC2DC\s*\uACB0\uC815)/i,
]

const VERIFICATION_TONE_PATTERNS = [
  /\uC11C\uBA85/g,
  /\uC608\uC57D/g,
  /\uD655\uC815/g,
  /\uACB0\uD63C\uC2DD/g,
  /\uCCAD\uCCA9\uC7A5/g,
  /\uACC4\uC57D/g,
  /\uD070\s*\uACB0\uC815/g,
  /\uC989\uC2DC\s*\uACB0\uC815/g,
  /\uC624\uB298\uB85C\s*\uC7A1\uC73C\uC138\uC694/g,
  /\uCD5C\uC6B0\uC120/g,
]

const RISKY_ACTION_RECOMMENDATION_PATTERNS = [
  /(\uC0AC\uC5C5\s*\uC2DC\uC791|\uC0AC\uC5C5\s*\uD655\uC7A5|\uD504\uB85C\uC81D\uD2B8|\uD30C\uD2B8\uB108\uC2ED|\uACE0\uBC31|\uD504\uB85C\uD3EC\uC988|\uBA74\uC811|\uC2B9\uC9C4|\uD22C\uC790|\uB9E4\uC218|\uC774\uC9C1|\uC774\uC0AC|\uC2DC\uC791|\uCD5C\uC801|\uD655\uC7A5|\uC2DC\uB108\uC9C0|\uD589\uC6B4)/i,
  /\b(start|launch|expand|proposal|promotion|interview|invest|buy|commit|book|wedding)\b/i,
]

const WARNING_TEXT_FALLBACK: Record<'ko' | 'en', Record<string, string>> = {
  ko: {
    surgery:
      '\uC2DC\uC220/\uC218\uC220 \uAD00\uB828 \uC77C\uC815\uC740 \uC7AC\uD655\uC778\uD558\uACE0 \uC2E0\uC911\uD788 \uC9C4\uD589\uD558\uC138\uC694.',
    dispute:
      '\uBD84\uC7C1 \uC18C\uC9C0\uAC00 \uC788\uC73C\uB2C8 \uD575\uC2EC \uC870\uAC74\uC740 \uBB38\uC11C\uB85C \uD655\uC778\uD558\uC138\uC694.',
    legalIssue:
      '\uBC95\uB960/\uC57D\uAD00 \uAD00\uB828 \uC0AC\uC548\uC740 \uC804\uBB38\uAC00 \uAC80\uD1A0 \uD6C4 \uD655\uC815\uD558\uC138\uC694.',
  },
  en: {
    surgery: 'Recheck procedures and medical timing before confirming.',
    dispute: 'Potential dispute risk. Confirm core terms in writing.',
    legalIssue: 'Legal/terms risk. Validate with expert review before committing.',
  },
}

const RECOMMENDATION_TEXT_FALLBACK: Record<'ko' | 'en', string> = {
  ko: '\uC624\uB298\uC740 \uD655\uC815\uBCF4\uB2E4 \uAC80\uD1A0\u00B7\uC7AC\uD655\uC778 \uC6B0\uC120\uC73C\uB85C \uC9C4\uD589\uD558\uC138\uC694.',
  en: 'Prioritize review and verification over final commitment today.',
}

type RecommendationGateInput = {
  recommendations: string[]
  recommendationKeys?: string[]
  warningKeys?: string[]
  warnings?: string[]
  confidence?: number
  grade?: ImportanceGrade
  title?: string
  summary?: string
  lang: 'ko' | 'en'
  forceGate?: boolean
  irreversibleKeyPresent?: boolean
}

function includesToken(value: string, tokens: string[]): boolean {
  const lower = value.toLowerCase()
  return tokens.some((token) => lower.includes(token.toLowerCase()))
}

function isAlignedAcrossSystems(crossAgreementPercent: number | undefined): boolean {
  return (
    typeof crossAgreementPercent === 'number' &&
    Number.isFinite(crossAgreementPercent) &&
    crossAgreementPercent >= CROSS_AGREEMENT_ALIGNMENT_THRESHOLD
  )
}

function isLowCoherenceSignal(
  confidence: number | undefined,
  crossAgreementPercent: number | undefined
): boolean {
  const lowConfidence = (confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const lowAgreement =
    typeof crossAgreementPercent === 'number' &&
    Number.isFinite(crossAgreementPercent) &&
    crossAgreementPercent < CROSS_AGREEMENT_ALIGNMENT_THRESHOLD
  return lowConfidence || lowAgreement
}

function isDefensivePhaseLabel(value: string | undefined): boolean {
  if (!value) return false
  return /(defensive\s*reset|stabilization|ë°©ì–´\/ìž¬ì •ë ¬|ì•ˆì •í™”)/i.test(value)
}

function sanitizeMatrixNarrativeLine(value: string | undefined): string {
  const original = String(value || '').trim()
  if (!original) return ''

  const cleaned = original
    .replace(
      /\bsibsin\s*=\s*.*?(?=,\s*(?:currentDaeun|currentSaeun|currentWolun|currentIljin|dayMaster|geokguk|yongsin|daeun|saeun|wolun|iljin|profile|matrix|overlap|pair|angle|orb|allowed|orbFit)\s*=|\||$)/gi,
      ' '
    )
    .replace(
      /\b(?:pair|angle|orb|allowed|dayMaster|geokguk|yongsin|daeun|saeun|wolun|iljin|currentDaeun|currentSaeun|currentWolun|currentIljin|profile|matrix|overlap|orbFit)\s*=\s*[^,|)\]]+/gi,
      ' '
    )
    .replace(/\b[가-힣A-Za-z]+\(\d+\)\b/g, ' ')
    .replace(/\b(?:birthDate|birthTime)\b\s*[:=]?\s*/gi, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:/\-|]+|[\s,;:/\-|]+$/g, '')

  if (!cleaned) return ''
  if (MATRIX_TECHNICAL_PAYLOAD_PATTERN.test(original) && cleaned.length < 18) return ''
  return cleaned
}

function sanitizeCalendarCopy(value: string | undefined, lang: 'ko' | 'en'): string {
  const repaired = repairMojibakeText(String(value || '')).trim()
  if (!repaired) return ''

  if (lang === 'ko') {
    return repaired
      .replace(/최고의 날|대길일/g, '강한 실행 구간')
      .replace(/좋은 날/g, '활용 흐름이 좋은 구간')
      .replace(/보통 날/g, '운영 중심 구간')
      .replace(/안좋은 날|나쁜 날/g, '검토 우선 구간')
      .replace(/최악의 날/g, '방어 우선 구간')
      .replace(/완벽한 타이밍/g, '검토 후 진행하기 좋은 타이밍')
      .replace(/딱 좋아요/g, '잘 맞습니다')
      .replace(/오늘 해도 괜찮아요/g, '오늘은 검토 후 진행할 수 있습니다')
      .replace(/오늘 시작하면 일이 잘 풀려요/g, '오늘 시작한 일은 흐름을 타기 쉽습니다')
      .replace(/연애운 UP!/g, '관계 에너지가 올라옵니다.')
      .replace(/복권/g, '부수 수입 탐색')
      .replace(/프로포즈/g, '중요한 관계 결정')
      .replace(/계약서 사인/g, '계약 검토')
      .replace(/사인,/g, '검토,')
      .replace(
        /데이트, 쇼핑, 예술 활동에 완벽해요/g,
        '데이트, 쇼핑, 예술 활동은 무리 없이 즐기기 좋습니다'
      )
      .replace(/오랫동안 미뤄왔던 일을 오늘 하세요/g, '미뤄온 일은 우선순위를 정해 진행해 보세요')
  }

  return repaired
    .replace(/\bthe best day\b/gi, 'a strong execution window')
    .replace(/\bbest day\b/gi, 'strong execution window')
    .replace(/\bgood day\b/gi, 'favorable window')
    .replace(/\bnormal day\b/gi, 'operate-first window')
    .replace(/\bbad day\b/gi, 'review-first window')
    .replace(/\bworst day\b/gi, 'protect-first window')
    .replace(/\bperfect timing\b/gi, 'a good time to review and proceed')
    .replace(/\bperfect for\b/gi, 'well suited for')
    .replace(/\bthings started today go well\b/gi, 'things started today can gain traction')
    .replace(/\bromance luck up!?/gi, 'relationship energy rises')
    .replace(/\blottery\b/gi, 'side-income exploration')
    .replace(/\bproposal\b/gi, 'important relationship decision')
    .replace(/\bsigning contracts\b/gi, 'reviewing contracts before commitment')
}

function shouldGateRecommendationSet(input: RecommendationGateInput): boolean {
  if (input.forceGate) {
    return true
  }

  const confidence = input.confidence ?? 100
  const lowConfidence = confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const warningKeyBlob = (input.warningKeys || []).join(' ')
  const warningTextBlob = (input.warnings || []).join(' ')
  const titleBlob = `${input.title || ''} ${input.summary || ''}`

  const hasCommunicationWarning =
    includesToken(warningKeyBlob, COMMUNICATION_WARNING_TOKENS) ||
    includesToken(warningTextBlob, CAUTION_WARNING_TOKENS)

  const hasConflictLabel =
    includesToken(titleBlob, CONFLICT_LABEL_TOKENS) ||
    includesToken(warningTextBlob, CONFLICT_LABEL_TOKENS)

  const hasCautionFlag =
    (typeof input.grade === 'number' && input.grade >= 3) ||
    includesToken(warningKeyBlob, HARD_GATE_WARNING_TOKENS)
  const lowConfidenceOnly =
    lowConfidence && !hasCommunicationWarning && !hasConflictLabel && !hasCautionFlag

  if (lowConfidenceOnly && (input.grade ?? 4) <= 1 && !input.irreversibleKeyPresent) {
    return false
  }

  return lowConfidence || hasCommunicationWarning || hasConflictLabel || hasCautionFlag
}

function softenRecommendationTone(value: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    let softened = value
    for (const pattern of VERIFICATION_TONE_PATTERNS) {
      softened = softened.replace(pattern, '\uAC80\uD1A0')
    }
    return softened
      .replace(/\uC9C0\uAE08\s*\uACB0\uC815/g, '\uC7AC\uD655\uC778 \uD6C4 \uACB0\uC815')
      .replace(
        /\uC644\uBCBD\uD55C\s*\uD0C0\uC774\uBC0D/g,
        '\uAC80\uD1A0 \uD6C4 \uC9C4\uD589\uD558\uAE30 \uC88B\uC740 \uD0C0\uC774\uBC0D'
      )
      .replace(/\uCD5C\uACE0\uC758 \uB0A0/g, '\uC720\uB9AC\uD55C \uD750\uB984')
      .trim()
  }

  return value
    .replace(/\b(sign now|finalize now|decide now|commit now)\b/gi, 'review and verify first')
    .replace(/\b(contract|signature|reservation|wedding|launch|book)\b/gi, 'review')
    .replace(/\btop priority\b/gi, 'review priority')
    .trim()
}

function isIrreversibleRecommendationText(value: string): boolean {
  return IRREVERSIBLE_RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(value))
}

function isVerificationTone(value: string): boolean {
  return /\uAC80\uD1A0|\uC7AC\uD655\uC778|24\uC2DC\uAC04|review|verify|recheck|draft|24 hours/i.test(
    value
  )
}

function isRiskyActionRecommendationText(value: string): boolean {
  return RISKY_ACTION_RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(value))
}

function isConservativeRecommendationTone(value: string): boolean {
  return /(\uAC80\uD1A0|\uC7AC\uD655\uC778|\uBCF4\uB958|\uC2E0\uC911|\uC815\uB9AC|\uC694\uC57D|\uCD08\uC548|24\uC2DC\uAC04|\uD734\uC2DD|\uBC84\uD37C|review|verify|recheck|draft|wait|pause|hold|rest|buffer)/i.test(
    value
  )
}

function resolveWarningTranslation(
  warningKey: string,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string {
  const path = `calendar.warnings.${warningKey}`
  const translated = getTranslation(path, translations)
  if (translated === path || translated.startsWith('calendar.')) {
    return WARNING_TEXT_FALLBACK[lang][warningKey] || WARNING_TEXT_FALLBACK[lang].dispute
  }
  return translated
}

function resolveRecommendationTranslation(
  recommendationKey: string,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string {
  const path = `calendar.recommendations.${recommendationKey}`
  const translated = getTranslation(path, translations)
  if (translated === path || translated.startsWith('calendar.')) {
    return RECOMMENDATION_TEXT_FALLBACK[lang]
  }
  return translated
}

export function gateRecommendations(input: RecommendationGateInput): string[] {
  const shouldGate = shouldGateRecommendationSet(input)
  const candidateLines =
    shouldGate && input.irreversibleKeyPresent ? [] : [...input.recommendations]

  if (!shouldGate) {
    return dedupeTexts(candidateLines).slice(0, 6)
  }

  const filtered = candidateLines
    .filter(
      (line) =>
        !isIrreversibleRecommendationText(line) &&
        !(isRiskyActionRecommendationText(line) && !isVerificationTone(line))
    )
    .map((line) => softenRecommendationTone(line, input.lang))
    .filter(Boolean)
  const conservativeFiltered = filtered.filter(
    (line) => isConservativeRecommendationTone(line) || isVerificationTone(line)
  )

  const fallback =
    input.lang === 'ko'
      ? [
          '\uAC80\uD1A0/\uC7AC\uD655\uC778\uC744 \uC6B0\uC120\uD558\uACE0 \uC9C4\uD589\uD558\uC138\uC694.',
          '\uC870\uAC74 \uC815\uB9AC \uD6C4 \uC694\uC57D \uBA54\uC2DC\uC9C0\uB85C \uD569\uC758 \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uC138\uC694.',
          '\uCD08\uC548\uB9CC \uB9CC\uB4E4\uACE0 \uD655\uC815\uC740 24\uC2DC\uAC04 \uD6C4\uC5D0 \uB2E4\uC2DC \uBCF4\uC138\uC694.',
        ]
      : [
          'Review and reconfirm before committing.',
          'Align terms first, then send a short written summary.',
          'Draft now and revisit final confirmation after 24 hours.',
        ]

  const merged = conservativeFiltered.length > 0 ? conservativeFiltered : fallback
  const hasVerificationCue = merged.some((line) => isVerificationTone(line))

  if (!hasVerificationCue) {
    merged.push(
      input.lang === 'ko'
        ? '\uC694\uC57D \uBA54\uC2DC\uC9C0\uB85C \uD575\uC2EC \uC870\uAC74\uC744 \uD55C \uBC88 \uB354 \uD655\uC778\uD558\uC138\uC694.'
        : 'Send a short summary message and verify core terms once more.'
    )
  }

  return dedupeTexts(merged).slice(0, 6)
}

export type MatrixCalendarContext = {
  calendarSignals?: MatrixSignal[]
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
  domainScores?: Record<DomainKey, DomainScore>
} | null

// Translation helper
export function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split('.')
  let result: unknown = translations
  for (const k of keys) {
    result = (result as Record<string, unknown>)?.[k]
    if (result === undefined) {
      return key
    }
  }
  return typeof result === 'string' ? result : key
}

export function validateBackendUrl(url: string) {
  if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
    logger.warn('[Calendar API] Using non-HTTPS AI backend in production')
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    logger.warn('[Calendar API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL')
  }
}

type AIDatesCircuitState = {
  consecutiveFailures: number
  openUntilMs: number
}

const DEFAULT_AI_DATES_TIMEOUT_MS = 12000
const DEFAULT_AI_DATES_RETRIES = 1
const DEFAULT_AI_DATES_RETRY_DELAY_MS = 400
const DEFAULT_AI_DATES_FAILURE_THRESHOLD = 2
const DEFAULT_AI_DATES_COOLDOWN_MS = 3 * 60 * 1000

const aiDatesCircuitState: AIDatesCircuitState = {
  consecutiveFailures: 0,
  openUntilMs: 0,
}

function parsePositiveInt(
  rawValue: string | undefined,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (!rawValue) return fallback
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.floor(parsed)
  if (rounded < min) return fallback
  if (rounded > max) return max
  return rounded
}

function readAIDatesCircuitConfig() {
  const circuitEnabled =
    process.env.CALENDAR_AI_ENRICHMENT_CIRCUIT_ENABLED === 'true' || process.env.NODE_ENV !== 'test'

  return {
    disabled: process.env.CALENDAR_AI_ENRICHMENT_DISABLED === 'true',
    circuitEnabled,
    timeoutMs: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_TIMEOUT_MS,
      DEFAULT_AI_DATES_TIMEOUT_MS,
      1000,
      60000
    ),
    retries: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_RETRIES,
      DEFAULT_AI_DATES_RETRIES,
      0,
      3
    ),
    retryDelayMs: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_RETRY_DELAY_MS,
      DEFAULT_AI_DATES_RETRY_DELAY_MS,
      100,
      5000
    ),
    failureThreshold: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_FAILURE_THRESHOLD,
      DEFAULT_AI_DATES_FAILURE_THRESHOLD,
      1,
      10
    ),
    cooldownMs: parsePositiveInt(
      process.env.CALENDAR_AI_ENRICHMENT_COOLDOWN_MS,
      DEFAULT_AI_DATES_COOLDOWN_MS,
      1000,
      30 * 60 * 1000
    ),
  }
}

function isAIDatesCircuitOpen(nowMs: number): boolean {
  return aiDatesCircuitState.openUntilMs > nowMs
}

function markAIDatesFailure(nowMs: number, failureThreshold: number, cooldownMs: number): void {
  aiDatesCircuitState.consecutiveFailures += 1
  if (aiDatesCircuitState.consecutiveFailures >= failureThreshold) {
    aiDatesCircuitState.openUntilMs = nowMs + cooldownMs
  }
}

function resetAIDatesFailureState(): void {
  aiDatesCircuitState.consecutiveFailures = 0
  aiDatesCircuitState.openUntilMs = 0
}

export function __resetAIDatesCircuitStateForTests(): void {
  resetAIDatesFailureState()
}

export function getPillarStemName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) {
    return ''
  }
  const p = pillar as SajuPillarAccessor
  // PillarData format (heavenlyStem is object with name)
  if (typeof p.heavenlyStem === 'object' && p.heavenlyStem && 'name' in p.heavenlyStem) {
    return p.heavenlyStem.name || ''
  }
  // Simple format with stem.name
  if (typeof p.stem === 'object' && p.stem && 'name' in p.stem) {
    return p.stem.name || ''
  }
  // String format
  if (typeof p.heavenlyStem === 'string') {
    return p.heavenlyStem
  }
  if (typeof p.stem === 'string') {
    return p.stem
  }
  return ''
}

export function getPillarBranchName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) {
    return ''
  }
  const p = pillar as SajuPillarAccessor
  // PillarData format (earthlyBranch is object with name)
  if (typeof p.earthlyBranch === 'object' && p.earthlyBranch && 'name' in p.earthlyBranch) {
    return p.earthlyBranch.name || ''
  }
  // Simple format with branch.name
  if (typeof p.branch === 'object' && p.branch && 'name' in p.branch) {
    return p.branch.name || ''
  }
  // String format
  if (typeof p.earthlyBranch === 'string') {
    return p.earthlyBranch
  }
  if (typeof p.branch === 'string') {
    return p.branch
  }
  return ''
}

// ==== Date helpers ====
export function parseBirthDate(birthDateParam: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateParam)
  if (!match) {
    return null
  }
  const [, y, m, d] = match
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

// í•œì¤„ ìš”ì•½ ìƒì„±
export function generateSummary(
  grade: ImportanceGrade,
  categories: EventCategory[],
  score: number,
  lang: 'ko' | 'en',
  sajuFactorKeys?: string[],
  astroFactorKeys?: string[],
  crossVerified: boolean = false,
  dateSeed: string = '',
  crossAgreementPercent?: number
): string {
  const cat = categories[0] || 'general'
  const seed = `${dateSeed}|${cat}|${score}|${grade}`
  const combinedFactors = [...(sajuFactorKeys || []), ...(astroFactorKeys || [])].map((f) =>
    f.toLowerCase()
  )

  const hasPositiveSignal = combinedFactors.some((f) =>
    ['samhap', 'yukhap', 'cheoneul', 'majorluck', 'blessing', 'harmony', 'growth'].some((k) =>
      f.includes(k)
    )
  )
  const hasCautionSignal = combinedFactors.some((f) =>
    ['chung', 'xing', 'retrograde', 'gongmang', 'conflict', 'opposition', 'accident'].some((k) =>
      f.includes(k)
    )
  )

  let base = ''
  if (lang === 'ko') {
    if (grade === 0) {
      base = KO_MESSAGES.GRADE_0[cat] || KO_MESSAGES.GRADE_0.general
    } else if (grade === 1) {
      base = KO_MESSAGES.GRADE_1[cat] || KO_MESSAGES.GRADE_1.general
    } else if (grade === 2 && score >= DISPLAY_SCORE_LABEL_THRESHOLDS.neutral) {
      base = KO_MESSAGES.GRADE_2_HIGH[cat] || KO_MESSAGES.GRADE_2_HIGH.general
    } else if (grade === 2) {
      base = KO_MESSAGES.GRADE_2_LOW
    } else if (grade === 3) {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
      base = reason ? `âš ï¸ ${reason}` : KO_MESSAGES.GRADE_3[cat] || KO_MESSAGES.GRADE_3.general
    } else {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
      base = reason ? `ðŸš¨ ${reason}` : KO_MESSAGES.GRADE_4[cat] || KO_MESSAGES.GRADE_4.general
    }

    const tails: string[] = []
    if (crossVerified && isAlignedAcrossSystems(crossAgreementPercent)) {
      tails.push('ì‚¬ì£¼Â·ì ì„± ì‹œê·¸ë„ì´ ê°™ì€ ë°©í–¥ìœ¼ë¡œ ë§žë¬¼ë¦½ë‹ˆë‹¤.')
    } else if (crossVerified) {
      tails.push('ì‹ í˜¸ê°€ ì—‡ê°ˆë¦½ë‹ˆë‹¤. í™•ì • ì „ ìž¬í™•ì¸ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.')
    }
    if (grade <= 2 && hasPositiveSignal) {
      tails.push('ì¢‹ì€ íë¦„ì´ ê²¹ì¹˜ë‹ˆ í•µì‹¬ 1~2ê°œ ëª©í‘œì— ì§‘ì¤‘í•˜ì„¸ìš”.')
    }
    if (grade >= 3 && hasCautionSignal) {
      tails.push('ì†ë„ë³´ë‹¤ ê²€í† ë¥¼ ìš°ì„ í•˜ê³ , í° ê²°ì •ë³´ë‹¤ ë¦¬ìŠ¤í¬ ê´€ë¦¬ê°€ ìœ ë¦¬í•©ë‹ˆë‹¤.')
    }
    if (score >= DISPLAY_SCORE_LABEL_THRESHOLDS.good) {
      tails.push(
        pickBySeed(seed, [
          'ì˜¤ì „ë¶€í„° ì¤‘ìš”í•œ ì¼ì„ ë¨¼ì € ëë‚´ë©´ ì„±ê³¼ê°€ ì»¤ì§‘ë‹ˆë‹¤.',
          'ì˜¤ëŠ˜ì€ ì„ ì œì ìœ¼ë¡œ ì›€ì§ì¼ìˆ˜ë¡ ì²´ê° ì„±ê³¼ê°€ ì»¤ì§‘ë‹ˆë‹¤.',
        ])
      )
    } else if (score <= 35) {
      tails.push(
        pickBySeed(seed, [
          'ë¬´ë¦¬í•œ í™•ìž¥ ëŒ€ì‹  ì¼ì • ì¶•ì†Œê°€ ë” ì¢‹ì€ ê²°ê³¼ë¥¼ ë§Œë“­ë‹ˆë‹¤.',
          'ì¤‘ìš”í•œ ì•½ì†ì€ í™•ì¸ì„ í•œ ë²ˆ ë” í•˜ì„¸ìš”.',
        ])
      )
    }
    return dedupeTexts([base, ...tails]).join(' ')
  }

  if (grade === 0) {
    base = EN_MESSAGES.GRADE_0[cat] || EN_MESSAGES.GRADE_0.general
  } else if (grade === 1) {
    base = EN_MESSAGES.GRADE_1[cat] || EN_MESSAGES.GRADE_1.general
  } else if (grade === 2 && score >= DISPLAY_SCORE_LABEL_THRESHOLDS.neutral) {
    base = EN_MESSAGES.GRADE_2_HIGH[cat] || EN_MESSAGES.GRADE_2_HIGH.general
  } else if (grade === 2) {
    base = EN_MESSAGES.GRADE_2_LOW
  } else if (grade === 3) {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `âš ï¸ ${reason}` : EN_MESSAGES.GRADE_3[cat] || EN_MESSAGES.GRADE_3.general
  } else {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `ðŸš¨ ${reason}` : EN_MESSAGES.GRADE_4[cat] || EN_MESSAGES.GRADE_4.general
  }

  const tails: string[] = []
  if (crossVerified && isAlignedAcrossSystems(crossAgreementPercent)) {
    tails.push('Saju and astrology are aligned in the same direction.')
  } else if (crossVerified) {
    tails.push('Signals are mixed. Re-check before final commitments.')
  }
  if (grade <= 2 && hasPositiveSignal) {
    tails.push('Multiple supportive signals overlap. Focus on 1-2 core priorities.')
  }
  if (grade >= 3 && hasCautionSignal) {
    tails.push('Prioritize verification over speed and avoid major commitments.')
  }
  if (score >= DISPLAY_SCORE_LABEL_THRESHOLDS.good) {
    tails.push(
      pickBySeed(seed, [
        'Front-load your most important task in the morning window.',
        'Proactive moves early in the day are likely to pay off.',
      ])
    )
  } else if (score <= 35) {
    tails.push(
      pickBySeed(seed, [
        'Reduce scope and focus on low-risk execution today.',
        'Double-check schedules and commitments before acting.',
      ])
    )
  }
  return dedupeTexts([base, ...tails]).join(' ')
}

function seedNumber(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickBySeed<T>(seed: string, items: T[]): T {
  if (items.length === 0) {
    throw new Error('pickBySeed requires a non-empty array')
  }
  return items[seedNumber(seed) % items.length]
}

function normalizeTextForDedupe(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeTexts(values: string[]): string[] {
  const out: string[] = []
  const keys: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) {
      continue
    }
    const key = normalizeTextForDedupe(trimmed)
    if (!key) continue
    const hasDuplicate = keys.some((existing) => {
      if (existing === key) return true
      const canCompareInclusion = existing.length >= 16 && key.length >= 16
      return canCompareInclusion && (existing.includes(key) || key.includes(existing))
    })
    if (hasDuplicate) continue
    keys.push(key)
    out.push(trimmed)
  }
  return out
}

/**
 * bad day specific reason
 */
function getBadDayReason(
  sajuFactorKeys?: string[],
  astroFactorKeys?: string[],
  lang: 'ko' | 'en' = 'ko'
): string | null {
  if (!sajuFactorKeys && !astroFactorKeys) {
    return null
  }

  const saju = sajuFactorKeys || []
  const astro = astroFactorKeys || []

  // ì¶©(æ²–) - ê°€ìž¥ ê°•ë ¥í•œ ë¶€ì • ìš”ì†Œ
  if (saju.some((k) => k.toLowerCase().includes('chung'))) {
    return lang === 'ko'
      ? 'ì¼ì§„ ì¶©(æ²–)! ê°ˆë“±ê³¼ ê¸‰ë³€ì— ì£¼ì˜í•˜ì„¸ìš”.'
      : 'Day Clash (Ã¦Â²â€“)! Watch for conflicts.'
  }

  // í˜•(åˆ‘)
  if (saju.some((k) => k.toLowerCase().includes('xing'))) {
    return lang === 'ko'
      ? 'í˜•(åˆ‘)ì‚´! ì„œë¥˜ ì‹¤ìˆ˜, ë²•ì  ë¬¸ì œì— ì£¼ì˜í•˜ì„¸ìš”.'
      : 'Punishment (Ã¥Ë†â€˜)! Watch for legal issues.'
  }

  // ê³µë§
  if (saju.includes('shinsal_gongmang')) {
    return lang === 'ko'
      ? 'ê³µë§(ç©ºäº¡)! ê³„íšì´ ë¬´ì‚°ë˜ê¸° ì‰¬ìš´ ë‚ ìž…ë‹ˆë‹¤.'
      : 'Void Day! Plans may fall through.'
  }

  // ë°±í˜¸
  if (saju.includes('shinsal_backho')) {
    return lang === 'ko'
      ? 'ë°±í˜¸ì‚´! ì‚¬ê³ , ìˆ˜ìˆ ì— íŠ¹ížˆ ì£¼ì˜í•˜ì„¸ìš”.'
      : 'White Tiger! Be careful of accidents.'
  }

  // ê·€ë¬¸ê´€
  if (saju.includes('shinsal_guimungwan')) {
    return lang === 'ko'
      ? 'ê·€ë¬¸ê´€! ì •ì‹ ì  í˜¼ëž€, ë¶ˆì•ˆê°ì— ì£¼ì˜í•˜ì„¸ìš”.'
      : 'Ghost Gate! Watch for mental confusion.'
  }

  // ê´€ì‚´
  if (saju.includes('stemGwansal')) {
    return lang === 'ko'
      ? 'ê´€ì‚´ ê¸°ìš´! ì™¸ë¶€ ì••ë°•ê³¼ ìŠ¤íŠ¸ë ˆìŠ¤ê°€ ê°•í•©ë‹ˆë‹¤.'
      : 'Authority pressure! High stress expected.'
  }

  // ìˆ˜ì„± ì—­í–‰
  if (astro.includes('retrogradeMercury')) {
    return lang === 'ko'
      ? 'ìˆ˜ì„± ì—­í–‰ ì¤‘! ê³„ì•½/ì†Œí†µì— ì˜¤ë¥˜ê°€ ìƒê¸°ê¸° ì‰¬ì›Œìš”.'
      : 'Mercury retrograde! Communication errors likely.'
  }

  // ê¸ˆì„± ì—­í–‰
  if (astro.includes('retrogradeVenus')) {
    return lang === 'ko'
      ? 'ê¸ˆì„± ì—­í–‰ ì¤‘! ì—°ì• /ìž¬ì • ê²°ì •ì€ ë¯¸ë£¨ì„¸ìš”.'
      : 'Venus retrograde! Delay love/money decisions.'
  }

  // ë³´ì´ë“œ ì˜¤ë¸Œ ì½”ìŠ¤
  if (astro.includes('voidOfCourse')) {
    return lang === 'ko'
      ? 'ë‹¬ì´ ê³µí—ˆí•œ ìƒíƒœ! ìƒˆ ì‹œìž‘ì€ í”¼í•˜ì„¸ìš”.'
      : 'Void of Course Moon! Avoid new starts.'
  }

  // êµì°¨ ë¶€ì •
  if (astro.includes('crossNegative')) {
    return lang === 'ko'
      ? 'ì‚¬ì£¼+ì ì„±ìˆ  ëª¨ë‘ ë¶€ì •! ë§¤ìš° ì¡°ì‹¬í•˜ì„¸ìš”.'
      : 'Both Saju & Astro negative! Extra caution!'
  }

  // ì¶©ëŒ ì›ì†Œ
  if (astro.includes('conflictElement')) {
    return lang === 'ko' ? 'ì˜¤í–‰ ì¶©ëŒ! ì—ë„ˆì§€ê°€ ë¶„ì‚°ë©ë‹ˆë‹¤.' : 'Element clash! Energy scattered.'
  }

  return null
}

// ì¶”ì²œ ì‹œê°„ëŒ€ ìƒì„±
export function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: 'ko' | 'en',
  confidence?: number,
  date?: Pick<ImportantDate, 'bestHours'>
): string[] {
  // Grade 3(ì•ˆì¢‹ìŒ), Grade 4(ìµœì•…)ì€ ì‹œê°„ ì¶”ì²œ ì—†ìŒ
  if (grade >= 3) {
    return []
  }

  const signalTimes = date ? buildBestTimesFromBestHours(date, lang) : []
  if (signalTimes.length > 0) {
    return maybeSoftenBestTimes(signalTimes, lang, confidence)
  }

  const cat = categories[0] || 'general'

  if (lang === 'ko') {
    const times: Record<string, string[]> = {
      career: ['ðŸŒ… ì˜¤ì „ 10-12ì‹œ: ë¯¸íŒ…/í˜‘ìƒ ìµœì ', 'ðŸŒ† ì˜¤í›„ 2-4ì‹œ: ì„œë¥˜/ê³„ì•½ ìœ ë¦¬'],
      wealth: ['ðŸ’° ì˜¤ì „ 9-11ì‹œ: ê¸ˆìœµ ê±°ëž˜ ìœ ë¦¬', 'ðŸ“ˆ ì˜¤í›„ 1-3ì‹œ: íˆ¬ìž ê²°ì • ì í•©'],
      love: ['â˜• ì˜¤í›„ 3-5ì‹œ: ë°ì´íŠ¸ ìµœì ', 'ðŸŒ™ ì €ë… 7-9ì‹œ: ë¡œë§¨í‹±í•œ ì‹œê°„'],
      health: ['ðŸŒ„ ì˜¤ì „ 6-8ì‹œ: ìš´ë™ íš¨ê³¼ UP', 'ðŸ§˜ ì €ë… 6-8ì‹œ: íœ´ì‹/ëª…ìƒ ì¶”ì²œ'],
      study: ['ðŸ“š ì˜¤ì „ 9-12ì‹œ: ì§‘ì¤‘ë ¥ ìµœê³ ', 'ðŸŒ™ ì €ë… 8-10ì‹œ: ì•”ê¸°ë ¥ UP'],
      travel: ['âœˆï¸ ì˜¤ì „ 8-10ì‹œ: ì¶œë°œ ì¶”ì²œ', 'ðŸš— ì˜¤í›„ 2-4ì‹œ: ì´ë™ ì•ˆì „'],
      general: ['ðŸŒ… ì˜¤ì „ 10-12ì‹œ: ì¤‘ìš”í•œ ì¼ ì²˜ë¦¬', 'ðŸŒ† ì˜¤í›„ 3-5ì‹œ: ë¯¸íŒ…/ì•½ì†'],
    }
    const selected = times[cat] || times.general
    return maybeSoftenBestTimes(selected, lang, confidence)
  } else {
    const times: Record<string, string[]> = {
      career: ['ðŸŒ… 10am-12pm: Best for meetings', 'ðŸŒ† 2-4pm: Good for documents'],
      wealth: ['ðŸ’° 9-11am: Financial deals', 'ðŸ“ˆ 1-3pm: Investment decisions'],
      love: ['â˜• 3-5pm: Perfect for dates', 'ðŸŒ™ 7-9pm: Romantic time'],
      health: ['ðŸŒ„ 6-8am: Exercise boost', 'ðŸ§˜ 6-8pm: Rest & meditation'],
      study: ['ðŸ“š 9am-12pm: Peak focus', 'ðŸŒ™ 8-10pm: Memory boost'],
      travel: ['âœˆï¸ 8-10am: Best departure', 'ðŸš— 2-4pm: Safe travel'],
      general: ['ðŸŒ… 10am-12pm: Important tasks', 'ðŸŒ† 3-5pm: Meetings'],
    }
    const selected = times[cat] || times.general
    return maybeSoftenBestTimes(selected, lang, confidence)
  }
}

function padHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24
  return String(normalized).padStart(2, '0')
}

function formatHourRange(hour: number): string {
  return `${padHour(hour)}:00-${padHour(hour + 2)}:00`
}

function buildBestTimesFromBestHours(
  date: Pick<ImportantDate, 'bestHours'>,
  lang: 'ko' | 'en'
): string[] {
  const bestHours = Array.isArray(date.bestHours) ? date.bestHours : []
  if (bestHours.length === 0) return []

  const qualityWeight: Record<'excellent' | 'good' | 'neutral' | 'caution', number> = {
    excellent: 4,
    good: 3,
    neutral: 2,
    caution: 1,
  }

  const selected = [...bestHours]
    .filter((slot) => slot && slot.quality !== 'caution')
    .sort((a, b) => (qualityWeight[b.quality] || 0) - (qualityWeight[a.quality] || 0))
    .slice(0, 2)

  if (selected.length === 0) return []

  return selected.map((slot) => {
    const window = formatHourRange(slot.hour)
    if (lang === 'ko') {
      if (slot.quality === 'excellent') return `ðŸŒŸ ${window}: í•µì‹¬ ì‹¤í–‰/ê²°ì • êµ¬ê°„`
      if (slot.quality === 'good') return `âœ… ${window}: ì§„í–‰Â·í˜‘ì˜ì— ìœ ë¦¬`
      return `ðŸ•’ ${window}: ì•ˆì •ì ìœ¼ë¡œ ì²˜ë¦¬í•˜ê¸° ì¢‹ì€ ì‹œê°„`
    }
    if (slot.quality === 'excellent') return `ðŸŒŸ ${window}: best for decisive execution`
    if (slot.quality === 'good') return `âœ… ${window}: favorable for progress and coordination`
    return `ðŸ•’ ${window}: stable block for focused work`
  })
}

function maybeSoftenBestTimes(times: string[], lang: 'ko' | 'en', confidence?: number): string[] {
  const lowConfidence = (confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  if (!lowConfidence) return times

  if (lang === 'ko') {
    return times.map((line) =>
      line
        .replace(/ìµœì /g, 'ê²€í† ì— ë¬´ë‚œ')
        .replace(/ìœ ë¦¬/g, 'ë¬´ë‚œ')
        .replace(/ì í•©/g, 'ë³´ìˆ˜ì  ê²€í† ì— ë¬´ë‚œ')
    )
  }

  return times.map((line) =>
    line
      .replace(/\bBest\b/g, 'Reasonable')
      .replace(/\bGood\b/g, 'Workable')
      .replace(/\bInvestment decisions\b/g, 'Conservative investment review')
  )
}

function buildTimingSignals(input: {
  date: ImportantDate
  lang: 'ko' | 'en'
  matrixVerdict?: CalendarEvidence['matrixVerdict']
  peakLevel?: CalendarEvidence['matrix']['peakLevel']
}): string[] {
  const { date, lang, matrixVerdict, peakLevel } = input
  const keys = [...(date.sajuFactorKeys || []), ...(date.astroFactorKeys || [])]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean)

  const signals: string[] = []
  const add = (ko: string, en: string) => {
    const text = lang === 'ko' ? ko : en
    if (!signals.includes(text)) signals.push(text)
  }

  if (keys.some((key) => key.includes('daeun'))) add('ëŒ€ìš´ í™œì„±', 'Daeun active')
  if (keys.some((key) => key.includes('seun') || key.includes('saeun'))) {
    add('ì„¸ìš´ ë°˜ì˜', 'Annual cycle active')
  }
  if (keys.some((key) => key.includes('wolun'))) add('ì›”ìš´ ë°˜ì˜', 'Monthly cycle active')
  if (keys.some((key) => key.includes('iljin') || key.includes('day'))) {
    add('ì¼ì§„ ë°˜ì˜', 'Daily cycle active')
  }
  if (
    keys.some(
      (key) =>
        key.includes('transit') ||
        key.includes('retrograde') ||
        key.includes('progression') ||
        key.includes('solarreturn') ||
        key.includes('lunarreturn')
    )
  ) {
    add('íŠ¸ëžœì§“ ì‹ í˜¸', 'Transit signal')
  }
  if (date.transitSync?.isMajorTransitYear) add('ê°•í•œ íŠ¸ëžœì§“ í•´', 'Major transit year')
  if (matrixVerdict?.phase) add(`êµ­ë©´: ${matrixVerdict.phase}`, `Phase: ${matrixVerdict.phase}`)

  if (peakLevel === 'peak') {
    add('ì›”ê°„ í”¼í¬ êµ¬ê°„', 'Monthly peak window')
  } else if (peakLevel === 'high') {
    add('ì›”ê°„ ìƒìŠ¹ êµ¬ê°„', 'Monthly rising window')
  }

  return signals.slice(0, 4)
}

function buildActionSummary(input: {
  lang: 'ko' | 'en'
  recommendations: string[]
  warnings: string[]
  bestTimes: string[]
  timingSignals: string[]
}): string {
  const { lang, recommendations, warnings, bestTimes, timingSignals } = input
  const doLine = recommendations[0] || ''
  const cautionLine = warnings[0] || ''
  const timeLine = bestTimes[0] || timingSignals[0] || ''

  if (lang === 'ko') {
    return [doLine ? `ì‹¤í–‰: ${doLine}` : '', cautionLine ? `ì£¼ì˜: ${cautionLine}` : '', timeLine ? `íƒ€ì´ë°: ${timeLine}` : '']
      .filter(Boolean)
      .join(' / ')
  }

  return [doLine ? `Do: ${doLine}` : '', cautionLine ? `Caution: ${cautionLine}` : '', timeLine ? `Timing: ${timeLine}` : '']
    .filter(Boolean)
    .join(' / ')
}

function buildCategoryAction(
  category: EventCategory,
  grade: ImportanceGrade,
  lang: 'ko' | 'en',
  seed: string
): string {
  const ko: Record<EventCategory, string[]> = {
    career: ['í•µì‹¬ ì—…ë¬´ 1ê±´ì„ ì˜¤ì „ì— ì„ ì²˜ë¦¬í•˜ì„¸ìš”.', 'í˜‘ì—…/ë³´ê³ ëŠ” ì§§ê³  ëª…í™•í•˜ê²Œ ì§„í–‰í•˜ì„¸ìš”.'],
    wealth: [
      'ì§€ì¶œÂ·íˆ¬ìž ê¸°ì¤€ì„ ì„ ë¨¼ì € ì •í•˜ê³  ì›€ì§ì´ì„¸ìš”.',
      'ìž‘ì€ ìˆ˜ìµë³´ë‹¤ ë¦¬ìŠ¤í¬ í†µì œë¥¼ ìš°ì„ í•˜ì„¸ìš”.',
    ],
    love: [
      'ê°ì •ë³´ë‹¤ ì˜ë„ë¥¼ ë¶„ëª…ížˆ ë§í•˜ë©´ ì˜¤í•´ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆì–´ìš”.',
      'ê´€ê³„ ëŒ€í™”ëŠ” ì €ë… ì‹œê°„ì— ì§§ê²Œ ì •ë¦¬í•˜ì„¸ìš”.',
    ],
    health: [
      'ìˆ˜ë©´Â·ì‹ì‚¬ ë¦¬ë“¬ì„ ë¨¼ì € ë§žì¶”ë©´ ì»¨ë””ì…˜ì´ íšŒë³µë©ë‹ˆë‹¤.',
      'ë¬´ë¦¬í•œ ê°•ë„ë³´ë‹¤ ê°€ë²¼ìš´ ë£¨í‹´ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.',
    ],
    travel: [
      'ì´ë™ ì „ ì¼ì •ê³¼ ë™ì„ ì„ í•œ ë²ˆ ë” ì ê²€í•˜ì„¸ìš”.',
      'ì¶œë°œ ì‹œê°„ ë²„í¼ë¥¼ ë„‰ë„‰ížˆ ë‘ëŠ” ê²Œ ì¢‹ìŠµë‹ˆë‹¤.',
    ],
    study: ['ì§‘ì¤‘ ë¸”ë¡ 40~60ë¶„ ë‹¨ìœ„ë¡œ í•™ìŠµí•˜ì„¸ìš”.', 'ë³µìŠµ ìš°ì„  ìˆœìœ„ë¥¼ 3ê°œë¡œ ì œí•œí•˜ì„¸ìš”.'],
    general: [
      'ì˜¤ëŠ˜ ëª©í‘œë¥¼ 2ê°œ ì´í•˜ë¡œ ì¤„ì´ë©´ ì„±ê³¼ê°€ ì˜¬ë¼ê°‘ë‹ˆë‹¤.',
      'ì¤‘ìš”í•˜ì§€ ì•Šì€ ìš”ì²­ì€ ê³¼ê°ížˆ ë¯¸ë£¨ì„¸ìš”.',
    ],
  }
  const en: Record<EventCategory, string[]> = {
    career: ['Finish one core work item early.', 'Keep meetings and updates concise.'],
    wealth: ['Set a spending/investment limit first.', 'Prioritize risk control over quick gains.'],
    love: [
      'State intentions clearly to reduce misunderstandings.',
      'Keep relationship talks short and focused.',
    ],
    health: ['Stabilize sleep and meal rhythm first.', 'Choose consistency over intensity.'],
    travel: ['Re-check route and schedule before moving.', 'Add a safe time buffer to departures.'],
    study: ['Work in 40-60 minute focus blocks.', 'Limit review priorities to three topics.'],
    general: ['Cut todayâ€™s priorities down to two.', 'Delay low-impact requests without guilt.'],
  }
  const source = lang === 'ko' ? ko : en
  const base = pickBySeed(seed, source[category])
  if (grade >= 3) {
    return lang === 'ko'
      ? `${base} í° ê²°ì •ì€ í•˜ë£¨ ë¯¸ë¤„ë„ ê´œì°®ìŠµë‹ˆë‹¤.`
      : `${base} Defer major decisions for a day.`
  }
  return base
}

function buildFactorAction(factors: string[], lang: 'ko' | 'en', seed: string): string | null {
  const lower = factors.map((f) => f.toLowerCase())
  if (lower.some((f) => f.includes('retrograde'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          'ê³„ì•½Â·ê²°ì œëŠ” ìž¬í™•ì¸ í›„ ì§„í–‰í•˜ì„¸ìš”.',
          'ë©”ì‹œì§€/ë¬¸ì„œëŠ” ì˜¤íƒˆìž ì ê²€ í›„ ë°œì†¡í•˜ì„¸ìš”.',
        ])
      : pickBySeed(seed, [
          'Double-check contracts and payments.',
          'Proofread messages and documents before sending.',
        ])
  }
  if (lower.some((f) => f.includes('chung') || f.includes('xing') || f.includes('conflict'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          'ì •ë©´ì¶©ëŒë³´ë‹¤ ìš°íšŒì•ˆì„ ì¤€ë¹„í•˜ì„¸ìš”.',
          'ì˜ˆë¯¼í•œ ëŒ€í™”ëŠ” ê²°ë¡ ë³´ë‹¤ ì‚¬ì‹¤ í™•ì¸ë¶€í„° í•˜ì„¸ìš”.',
        ])
      : pickBySeed(seed, [
          'Prepare a fallback path instead of direct confrontation.',
          'Validate facts first in sensitive conversations.',
        ])
  }
  if (lower.some((f) => f.includes('samhap') || f.includes('yukhap') || f.includes('cheoneul'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          'í˜‘ì—… ì œì•ˆÂ·ë„¤íŠ¸ì›Œí‚¹ì— ìœ ë¦¬í•œ íë¦„ìž…ë‹ˆë‹¤.',
          'ë„ì›€ì„ ìš”ì²­í•˜ë©´ ì‘ë‹µì„ ì–»ê¸° ì‰½ìŠµë‹ˆë‹¤.',
        ])
      : pickBySeed(seed, [
          'Good timing for collaboration and networking.',
          'Support requests are likely to get traction.',
        ])
  }
  return null
}

function buildContextWarnings(
  grade: ImportanceGrade,
  factors: string[],
  lang: 'ko' | 'en'
): string[] {
  const lower = factors.map((f) => f.toLowerCase())
  const warnings: string[] = []
  if (grade >= 3) {
    warnings.push(
      lang === 'ko'
        ? 'ì¼ì • ì§€ì—° ê°€ëŠ¥ì„±ì„ ê³ ë ¤í•´ ë²„í¼ë¥¼ í™•ë³´í•˜ì„¸ìš”.'
        : 'Add schedule buffer to absorb delays.'
    )
  }
  if (lower.some((f) => f.includes('retrograde'))) {
    warnings.push(
      lang === 'ko'
        ? 'ì»¤ë®¤ë‹ˆì¼€ì´ì…˜ ì˜¤ë¥˜ ê°€ëŠ¥ì„±ì´ ìžˆì–´ ìž¬í™•ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤.'
        : 'Communication errors are more likely today.'
    )
  }
  if (lower.some((f) => f.includes('gongmang') || f.includes('void'))) {
    warnings.push(
      lang === 'ko'
        ? 'ìƒˆ í”„ë¡œì íŠ¸ì˜ ì¦‰ì‹œ í™•ì •ì€ ì‹ ì¤‘ížˆ ê²€í† í•˜ì„¸ìš”.'
        : 'Avoid locking in new projects impulsively.'
    )
  }
  if (lower.some((f) => f.includes('accident') || f.includes('backho'))) {
    warnings.push(
      lang === 'ko'
        ? 'ì´ë™Â·ìš´ë™ ì‹œ ì•ˆì „ìˆ˜ì¹™ì„ ê°•í™”í•˜ì„¸ìš”.'
        : 'Use extra safety precautions for movement and exercise.'
    )
  }
  return dedupeTexts(warnings)
}

function buildEnhancedRecommendations(
  date: ImportantDate,
  categories: EventCategory[],
  bestTimes: string[],
  translations: TranslationData,
  lang: 'ko' | 'en'
): string[] {
  const lowConfidence = (date.confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const communicationWarning = date.warningKeys.some((key) =>
    COMMUNICATION_WARNING_TOKENS.some((token) => key.toLowerCase().includes(token))
  )
  const shouldGateIrreversible = lowConfidence || communicationWarning
  const gatedRecommendationKeys = shouldGateIrreversible
    ? date.recommendationKeys.filter((key) => !IRREVERSIBLE_RECOMMENDATION_KEYS.has(key))
    : date.recommendationKeys

  const translated = gatedRecommendationKeys.map((key) =>
    resolveRecommendationTranslation(key, translations, lang)
  )
  const seed = `${date.date}|${date.score}|${date.grade}|${categories[0] || 'general'}`
  const categoryAction = buildCategoryAction(categories[0] || 'general', date.grade, lang, seed)
  const factorAction = buildFactorAction(
    [...date.sajuFactorKeys, ...date.astroFactorKeys],
    lang,
    seed
  )
  const timeHint = bestTimes[0]
    ? lang === 'ko'
      ? `ì¶”ì²œ ì‹œê°„ ìš°ì„ : ${bestTimes[0]}`
      : `Prioritize this time window: ${bestTimes[0]}`
    : null

  return gateRecommendations({
    recommendations: [...translated, categoryAction, factorAction || '', timeHint || ''],
    recommendationKeys: gatedRecommendationKeys,
    warningKeys: date.warningKeys,
    confidence: date.confidence,
    grade: date.grade,
    lang,
    forceGate: shouldGateIrreversible,
    irreversibleKeyPresent: date.recommendationKeys.some((key) =>
      IRREVERSIBLE_RECOMMENDATION_KEYS.has(key)
    ),
  })
}

function buildEnhancedWarnings(
  date: ImportantDate,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string[] {
  const severeWarningKeys = new Set([
    'extremeCaution',
    'confusion',
    'accident',
    'injury',
    'legal',
    'danger',
    'surgery',
    'eclipseDay',
    'eclipseNear',
  ])
  const lowConfidence = (date.confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const crossAligned = isAlignedAcrossSystems(date.crossAgreementPercent)
  const warningKeysForGrade =
    date.grade <= 1
      ? date.warningKeys.filter((key) => {
          if (severeWarningKeys.has(key)) return true
          if (key.toLowerCase().includes('retrograde')) return lowConfidence || !crossAligned
          return false
        })
      : date.warningKeys

  const translated = warningKeysForGrade.map((key) =>
    resolveWarningTranslation(key, translations, lang)
  )
  const factors = [...date.sajuFactorKeys, ...date.astroFactorKeys]
  let contextual = buildContextWarnings(date.grade, factors, lang)

  if (date.grade <= 1) {
    const lower = factors.map((f) => f.toLowerCase())
    contextual = []

    // Keep safety-critical cautions even on high-grade days.
    if (lower.some((f) => f.includes('accident') || f.includes('backho'))) {
      contextual.push(
        lang === 'ko'
          ? 'ì´ë™Â·ìš´ë™ ì‹œ ì•ˆì „ìˆ˜ì¹™ì„ ê°•í™”í•˜ì„¸ìš”.'
          : 'Use extra safety precautions for movement and exercise.'
      )
    }

    // Show communication caution on high-grade days only when confidence/alignment is weak.
    if (lower.some((f) => f.includes('retrograde')) && (lowConfidence || !crossAligned)) {
      contextual.push(
        lang === 'ko'
          ? 'ì»¤ë®¤ë‹ˆì¼€ì´ì…˜ ì˜¤ë¥˜ ê°€ëŠ¥ì„±ì´ ìžˆì–´ ìž¬í™•ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤.'
          : 'Communication errors are more likely today.'
      )
    }
  }

  return dedupeTexts([...translated, ...contextual]).slice(0, 6)
}

const CATEGORY_TO_MATRIX_DOMAIN: Partial<Record<EventCategory, DomainKey>> = {
  wealth: 'money',
  career: 'career',
  love: 'love',
  health: 'health',
  travel: 'move',
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function getPreferredDomainByCategory(
  categories: EventCategory[],
  matrixContext: MatrixCalendarContext
): DomainKey | null {
  if (!matrixContext?.domainScores) return null
  for (const category of categories) {
    const mapped = CATEGORY_TO_MATRIX_DOMAIN[category]
    if (mapped && matrixContext.domainScores[mapped]) {
      return mapped
    }
  }
  return null
}

function getDomainWeight(
  domain: DomainKey | null,
  monthPoint: MonthlyOverlapPoint | undefined,
  matrixContext: MatrixCalendarContext
): number {
  if (!domain || !matrixContext?.domainScores) return 0
  const score = matrixContext.domainScores[domain]?.finalScoreAdjusted ?? 5
  const scoreWeight = clamp01((score - 5) / 5)
  const overlapWeight = clamp01(monthPoint?.overlapStrength ?? 0)
  const peakBoost =
    monthPoint?.peakLevel === 'peak' ? 0.22 : monthPoint?.peakLevel === 'high' ? 0.12 : 0
  return clamp01(scoreWeight * 0.55 + overlapWeight * 0.35 + peakBoost)
}

function toEvidenceDomain(domain: DomainKey | null): CalendarEvidence['matrix']['domain'] {
  if (!domain) return 'general'
  return domain
}

type CrossEvidenceBundle = {
  sajuEvidence?: string
  astroEvidence?: string
  sajuDetails?: string[]
  astroDetails?: string[]
  bridges?: string[]
}

type AspectEvidenceLite = {
  key: string
  planetA: string
  planetB: string
  signA: string
  signB: string
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  orb: number
  tone: 'positive' | 'negative' | 'neutral'
  impactScore: number
  context: 'transitToNatalSun' | 'transitToTransit'
}

const ASPECT_SYMBOL: Record<AspectEvidenceLite['aspect'], string> = {
  conjunction: 'â˜Œ',
  sextile: 'âœ¶',
  square: 'â–¡',
  trine: 'â–³',
  opposition: 'â˜',
}

const ASPECT_WORD_EN: Record<AspectEvidenceLite['aspect'], string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'oppose',
}

const PLANET_KO: Record<string, string> = {
  Sun: 'íƒœì–‘',
  Moon: 'ë‹¬',
  Mercury: 'ìˆ˜ì„±',
  Venus: 'ê¸ˆì„±',
  Mars: 'í™”ì„±',
  Jupiter: 'ëª©ì„±',
  Saturn: 'í† ì„±',
  'Natal Sun': 'ë³¸ëª… íƒœì–‘',
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const sentenceCut = normalized.split(/[.!?ã€‚]/)[0]?.trim() || normalized
  if (sentenceCut.length <= maxLength) {
    return sentenceCut
  }
  return `${sentenceCut.slice(0, Math.max(8, maxLength - 1)).trimEnd()}â€¦`
}

function formatOrb(orb: number): string {
  const safe = Number.isFinite(orb) ? Math.max(0, orb) : 0
  let degree = Math.floor(safe)
  let minute = Math.round((safe - degree) * 60)
  if (minute === 60) {
    degree += 1
    minute = 0
  }
  return `${degree}Â°${String(minute).padStart(2, '0')}'`
}

function isNegativeFactorKey(key: string): boolean {
  const lower = key.toLowerCase()
  return [
    'chung',
    'xing',
    'hai',
    'retrograde',
    'gongmang',
    'gwansal',
    'samjae',
    'conflict',
    'void',
    'backho',
    'guimungwan',
  ].some((token) => lower.includes(token))
}

function isPositiveFactorKey(key: string): boolean {
  const lower = key.toLowerCase()
  return [
    'samhap',
    'yukhap',
    'cheoneul',
    'gwiin',
    'harmony',
    'support',
    'growth',
    'jaeseong',
    'inseong',
  ].some((token) => lower.includes(token))
}

function getAspectMeaning(
  aspect: AspectEvidenceLite['aspect'],
  tone: AspectEvidenceLite['tone'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (tone === 'negative') {
      if (aspect === 'square') return 'ê¸´ìž¥Â·íž˜ê²¨ë£¨ê¸° êµ¬ë„'
      if (aspect === 'opposition') return 'ì¶©ëŒÂ·ê´€ê³„ ìž¬ì¡°ì • ì‹ í˜¸'
      return 'ì••ë°•Â·ê²€ì¦ í•„ìš” ì‹ í˜¸'
    }
    if (tone === 'positive') {
      if (aspect === 'trine') return 'íë¦„Â·ì§€ì›ì´ ê°•í•œ êµ¬ë„'
      if (aspect === 'sextile') return 'ê¸°íšŒÂ·í˜‘ë ¥ ì°½êµ¬ í™•ëŒ€'
      return 'ì¶”ì§„ë ¥Â·ì§‘ì¤‘ë ¥ ìƒìŠ¹'
    }
    if (aspect === 'conjunction') return 'ì—ë„ˆì§€ ì¦í­ êµ¬ê°„'
    return 'ì¤‘ë¦½ ì‹ í˜¸'
  }

  if (tone === 'negative') {
    if (aspect === 'square') return 'pressure and power-friction pattern'
    if (aspect === 'opposition') return 'polarity and negotiation pressure'
    return 'high-friction caution signal'
  }
  if (tone === 'positive') {
    if (aspect === 'trine') return 'smooth support flow'
    if (aspect === 'sextile') return 'opportunity and collaboration window'
    return 'momentum and concentration support'
  }
  if (aspect === 'conjunction') return 'amplified focus window'
  return 'neutral signal'
}

function formatAstroEvidenceLine(
  detail: AspectEvidenceLite,
  index: number,
  lang: 'ko' | 'en'
): string {
  const id = `A${index + 1}`
  const icon = detail.tone === 'negative' ? 'âš ï¸' : detail.tone === 'positive' ? 'âœ…' : 'â„¹ï¸'
  const symbol = ASPECT_SYMBOL[detail.aspect]
  const orbText = formatOrb(detail.orb)
  const meaning = getAspectMeaning(detail.aspect, detail.tone, lang)

  if (lang === 'ko') {
    const planetA = PLANET_KO[detail.planetA] || detail.planetA
    const planetB = PLANET_KO[detail.planetB] || detail.planetB
    return `${icon} (${id}) ${planetA}(${detail.signA}) ${symbol} ${planetB}(${detail.signB}) (${orbText}) - ${meaning}`
  }

  const word = ASPECT_WORD_EN[detail.aspect]
  return `${icon} (${id}) ${detail.planetA} in ${detail.signA} ${word} ${detail.planetB} in ${detail.signB} (${orbText}) - ${meaning}`
}

function toAspectEvidenceList(date: ImportantDate): AspectEvidenceLite[] {
  if (!Array.isArray(date.astroAspectEvidence)) {
    return []
  }
  return date.astroAspectEvidence
    .filter((item): item is AspectEvidenceLite =>
      Boolean(item && typeof item === 'object' && item.aspect && item.planetA && item.planetB)
    )
    .slice(0, 3)
}

function buildCrossEvidenceBundle(
  date: ImportantDate,
  lang: 'ko' | 'en',
  orderedSajuFactors: string[],
  orderedAstroFactors: string[],
  crossAgreementPercent: number | undefined
): CrossEvidenceBundle {
  const aspectList = toAspectEvidenceList(date)
  const isAligned = isAlignedAcrossSystems(crossAgreementPercent)
  const astroDetails = aspectList.map((detail, index) =>
    formatAstroEvidenceLine(detail, index, lang)
  )

  const usedSajuKey = new Set<string>()
  const pickSajuKey = (preferNegative: boolean): string | undefined => {
    const keys = date.sajuFactorKeys || []
    const candidates = keys.filter((key) => !usedSajuKey.has(key))
    const prioritized = candidates.find((key) =>
      preferNegative ? isNegativeFactorKey(key) : isPositiveFactorKey(key)
    )
    const selected = prioritized || candidates[0]
    if (selected) {
      usedSajuKey.add(selected)
    }
    return selected
  }

  const sajuDetails: string[] = []
  const bridges: string[] = []

  aspectList.forEach((detail, index) => {
    const sajuKey = pickSajuKey(detail.tone === 'negative')
    const translatedSaju = sajuKey ? getFactorTranslation(sajuKey, lang) || sajuKey : ''
    const sajuText = compactText(
      translatedSaju || orderedSajuFactors[index] || orderedSajuFactors[0] || '',
      72
    )
    if (!sajuText) {
      return
    }
    sajuDetails.push(`(S${index + 1}) ${sajuText}`)
    bridges.push(
      lang === 'ko'
        ? detail.tone === 'negative'
          ? `A${index + 1} â†” S${index + 1}: ì ì„± ê¸´ìž¥ ì‹ í˜¸ì™€ ì‚¬ì£¼ ê²½ê³„ ì‹ í˜¸ê°€ ê²¹ì¹©ë‹ˆë‹¤. ê³„ì•½Â·ì˜ì‚¬ê²°ì •ì€ ìž¬í™•ì¸ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.`
          : isAligned
            ? `A${index + 1} â†” S${index + 1}: ì ì„± í˜¸ì¡°ì™€ ì‚¬ì£¼ ì§€ì› ì‹ í˜¸ê°€ ê²¹ì¹©ë‹ˆë‹¤. í•µì‹¬ ê³¼ì œ 1~2ê°œë¥¼ ë°€ì–´ë¶™ì´ê¸° ì¢‹ìŠµë‹ˆë‹¤.`
            : `A${index + 1} â†” S${index + 1}: ì§€ì§€ ì‹ í˜¸ê°€ ë¶€ë¶„ì ìœ¼ë¡œ ë³´ì´ì§€ë§Œ êµì°¨ ì •í•©ë„ê°€ ë‚®ì•„ í™•ì • ì „ ìž¬í™•ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤.`
        : detail.tone === 'negative'
          ? `A${index + 1} â†” S${index + 1}: Astro friction and Saju caution align. Re-check contracts and key decisions.`
          : isAligned
            ? `A${index + 1} â†” S${index + 1}: Astro support and Saju support align. Push one or two core priorities.`
            : `A${index + 1} â†” S${index + 1}: Support signals exist, but cross-agreement is low. Re-check before final commitments.`
    )
  })

  if (astroDetails.length === 0 && orderedAstroFactors[0]) {
    astroDetails.push(`(A1) ${compactText(orderedAstroFactors[0], 78)}`)
  }
  if (sajuDetails.length === 0 && orderedSajuFactors[0]) {
    sajuDetails.push(`(S1) ${compactText(orderedSajuFactors[0], 78)}`)
  }

  const astroEvidence = compactText(astroDetails[0] || orderedAstroFactors[0] || '', 120)
  const sajuEvidence = compactText(sajuDetails[0] || orderedSajuFactors[0] || '', 120)

  const normalizedBridges =
    bridges.length > 0
      ? bridges
      : astroEvidence && sajuEvidence
        ? [
            lang === 'ko'
              ? isAligned
                ? 'A1 â†” S1: ì ì„±ê³¼ ì‚¬ì£¼ ê·¼ê±°ê°€ ê°™ì€ ë°©í–¥ì„ ì§€ì§€í•©ë‹ˆë‹¤.'
                : 'A1 â†” S1: ì‹ í˜¸ê°€ ì—‡ê°ˆë¦½ë‹ˆë‹¤. í™•ì • ì „ ìž¬í™•ì¸ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.'
              : isAligned
                ? 'A1 â†” S1: Astrology and Saju evidence point in the same direction.'
                : 'A1 â†” S1: Signals are mixed. Re-check before final commitments.',
          ]
        : []

  return {
    sajuEvidence,
    astroEvidence,
    sajuDetails: sajuDetails.slice(0, 3),
    astroDetails: astroDetails.slice(0, 3),
    bridges: normalizedBridges.slice(0, 3),
  }
}

function buildMatrixOverlay(
  dateIso: string,
  matrixContext: MatrixCalendarContext,
  categories: EventCategory[],
  lang: 'ko' | 'en',
  dateGrade: ImportanceGrade,
  dateConfidence: number | undefined,
  crossAgreementPercent: number | undefined,
  cross: {
    sajuEvidence?: string
    astroEvidence?: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  }
): { summary: string; recommendations: string[]; warnings: string[]; evidence: CalendarEvidence } {
  const monthKey = dateIso.slice(0, 7)
  if (!matrixContext) {
    return {
      summary: '',
      recommendations: [],
      warnings: [],
      evidence: {
        matrix: {
          domain: 'general',
          finalScoreAdjusted: 5,
          overlapStrength: 0,
          peakLevel: 'normal',
          monthKey,
        },
        cross: {
          sajuEvidence: cross.sajuEvidence || '',
          astroEvidence: cross.astroEvidence || '',
          sajuDetails: cross.sajuDetails || [],
          astroDetails: cross.astroDetails || [],
          bridges: cross.bridges || [],
        },
        confidence: 0,
        crossAgreementPercent:
          typeof crossAgreementPercent === 'number' && Number.isFinite(crossAgreementPercent)
            ? Math.max(0, Math.min(100, Math.round(crossAgreementPercent)))
            : undefined,
        source: 'rule',
      },
    }
  }

  const monthPoint = (matrixContext.overlapTimeline || []).find((p) => p.month === monthKey)

  const domainPeakCandidates = Object.entries(matrixContext.overlapTimelineByDomain || {})
    .map(([domain, points]) => ({
      domain: domain as DomainKey,
      point: points.find((p) => p.month === monthKey),
    }))
    .filter((entry): entry is { domain: DomainKey; point: MonthlyOverlapPoint } =>
      Boolean(entry.point)
    )
    .filter((entry) => entry.point.peakLevel === 'peak' || entry.point.peakLevel === 'high')
    .sort((a, b) => b.point.overlapStrength - a.point.overlapStrength)

  const topDomain = domainPeakCandidates[0]?.domain
  const cautionSignals = (matrixContext.calendarSignals || []).filter((s) => s.level === 'caution')
  const hasMonthCautionSignal = cautionSignals.some((s) => s.trigger.includes(monthKey))
  const preferredDomain = getPreferredDomainByCategory(categories, matrixContext)

  const koDomainLabel: Record<DomainKey, string> = {
    career: 'ì»¤ë¦¬ì–´',
    love: 'ì—°ì• ',
    money: 'ìž¬ë¬¼',
    health: 'ê±´ê°•',
    move: 'ì´ë™',
  }
  const enDomainLabel: Record<DomainKey, string> = {
    career: 'career',
    love: 'love',
    money: 'money',
    health: 'health',
    move: 'movement',
  }
  const weightedDomain = preferredDomain || topDomain || null
  const domainWeight = getDomainWeight(weightedDomain, monthPoint, matrixContext)
  const overlapStrength = clamp01(monthPoint?.overlapStrength ?? 0)
  const peakBoost =
    monthPoint?.peakLevel === 'peak' ? 0.22 : monthPoint?.peakLevel === 'high' ? 0.12 : 0
  const confidence = Math.round(
    clamp01(domainWeight * 0.5 + overlapStrength * 0.3 + peakBoost * 0.2) * 100
  )
  const score = weightedDomain
    ? (matrixContext.domainScores?.[weightedDomain]?.finalScoreAdjusted ?? 5)
    : 5
  const riskDay = dateGrade >= 3 || isLowCoherenceSignal(dateConfidence, crossAgreementPercent)

  const summaryParts: string[] = []
  const recommendations: string[] = []
  const warnings: string[] = []

  if (!riskDay && monthPoint?.peakLevel === 'peak') {
    summaryParts.push(
      lang === 'ko'
        ? `destiny-matrix í”¼í¬ì›”(${monthKey}) ì˜í–¥ìœ¼ë¡œ íƒ€ì´ë° ì ì¤‘ë„ê°€ ë†’ìŠµë‹ˆë‹¤.`
        : `Destiny-matrix peak month (${monthKey}) boosts timing precision.`
    )
  } else if (!riskDay && monthPoint?.peakLevel === 'high') {
    summaryParts.push(
      lang === 'ko'
        ? `destiny-matrix ê³ ì§‘ì¤‘ì›”(${monthKey}) êµ¬ê°„ìœ¼ë¡œ ì‹¤í–‰ë ¥ì´ ì˜¬ë¼ê°‘ë‹ˆë‹¤.`
        : `Destiny-matrix high-focus month (${monthKey}) supports execution.`
    )
  }

  if (!riskDay && topDomain) {
    if (lang === 'ko') {
      recommendations.push(
        `${koDomainLabel[topDomain]} ë„ë©”ì¸ í”¼í¬ íë¦„ìž…ë‹ˆë‹¤. í•´ë‹¹ ì˜ì—­ ìš°ì„ ìˆœìœ„ë¥¼ ê°€ìž¥ ì•žì— ë‘ì„¸ìš”.`
      )
    } else {
      recommendations.push(`${topDomain} domain is peaking. Put it at the top of your priorities.`)
    }
  }

  if (!riskDay && weightedDomain && domainWeight >= 0.55) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    if (lang === 'ko') {
      recommendations.push(
        domainWeight >= 0.75
          ? `${domainLabel} í…Œë§ˆë¥¼ ì˜¤ëŠ˜ì˜ ìµœìš°ì„  ì‹¤í–‰ê³¼ì œë¡œ ë‘ì„¸ìš”.`
          : `${domainLabel} í…Œë§ˆ ê´€ë ¨ ì¼ì •ì€ ì˜¤ì „ ì‹œê°„ëŒ€ì— ë¨¼ì € ë°°ì¹˜í•˜ì„¸ìš”.`
      )
      summaryParts.push(
        `${domainLabel} í…Œë§ˆì˜ destiny-matrix ê°€ì¤‘ì¹˜ê°€ ë†’ì•„ ì‹¤í–‰ ì ì¤‘ë„ê°€ ì¢‹ì€ ë‚ ìž…ë‹ˆë‹¤.`
      )
    } else {
      recommendations.push(
        domainWeight >= 0.75
          ? `${domainLabel} is your top execution priority today.`
          : `Front-load ${domainLabel} tasks earlier in the day.`
      )
      summaryParts.push(`${domainLabel} has elevated destiny-matrix weighting today.`)
    }
  }

  if (riskDay && weightedDomain) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    summaryParts.push(
      lang === 'ko'
        ? `${domainLabel} í…Œë§ˆëŠ” ë³€ë™ì„±ì´ ìžˆì–´ í™•ì •ë³´ë‹¤ ê²€ì¦ ì¤‘ì‹¬ ìš´ì˜ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.`
        : `${domainLabel} is volatile today; review-first execution is safer than hard commitment.`
    )
  }

  if (cautionSignals.length > 0) {
    warnings.push(
      lang === 'ko'
        ? 'matrix ì£¼ì˜ ì‹œê·¸ë„ì´ ê°ì§€ë˜ì–´ ê²€í†  ë‹¨ê³„ë¥¼ í•œ ë²ˆ ë” ê±°ì¹˜ì„¸ìš”.'
        : 'Matrix caution signals detected. Add an extra verification step.'
    )
  }

  if (hasMonthCautionSignal) {
    warnings.push(
      lang === 'ko'
        ? `ì´ë²ˆ ë‹¬(${monthKey})ì€ ì˜ì‚¬ê²°ì • ì†ë„ë³´ë‹¤ ë¦¬ìŠ¤í¬ ì ê²€ì´ ìœ ë¦¬í•©ë‹ˆë‹¤.`
        : `In ${monthKey}, risk checks are safer than speed in decisions.`
    )
  }

  if (
    weightedDomain &&
    domainWeight >= 0.6 &&
    (hasMonthCautionSignal || cautionSignals.length > 0)
  ) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    warnings.push(
      lang === 'ko'
        ? `${domainLabel} í…Œë§ˆëŠ” í™•ìž¥ ì „ì— ê²€ì¦ ì²´í¬ë¦¬ìŠ¤íŠ¸ë¥¼ ê±°ì¹˜ëŠ” ê²ƒì´ ì•ˆì „í•©ë‹ˆë‹¤.`
        : `For ${domainLabel}, run a verification checklist before expansion.`
    )
  }

  const evidence: CalendarEvidence = {
    matrix: {
      domain: toEvidenceDomain(weightedDomain),
      finalScoreAdjusted: Number(score.toFixed(2)),
      overlapStrength: Number(overlapStrength.toFixed(2)),
      peakLevel:
        monthPoint?.peakLevel === 'peak' || monthPoint?.peakLevel === 'high'
          ? monthPoint.peakLevel
          : 'normal',
      monthKey,
    },
    cross: {
      sajuEvidence: cross.sajuEvidence || '',
      astroEvidence: cross.astroEvidence || '',
      sajuDetails: cross.sajuDetails || [],
      astroDetails: cross.astroDetails || [],
      bridges: cross.bridges || [],
    },
    confidence: Math.max(0, Math.min(100, confidence)),
    crossAgreementPercent:
      typeof crossAgreementPercent === 'number' && Number.isFinite(crossAgreementPercent)
        ? Math.max(0, Math.min(100, Math.round(crossAgreementPercent)))
        : undefined,
    source: 'rule',
  }

  return {
    summary: summaryParts.join(' '),
    recommendations: dedupeTexts(recommendations),
    warnings: dedupeTexts(warnings),
    evidence,
  }
}

function selectMatrixPacketForDate(input: {
  categories: string[]
  evidenceDomain: CalendarEvidence['matrix']['domain']
  packets?: MatrixEvidencePacketMap
}): CounselorEvidencePacket | null {
  const packets = input.packets
  if (!packets) return null

  const byDomain = packets[DOMAIN_PACKET_KEY[input.evidenceDomain]]
  if (byDomain) return byDomain

  for (const category of input.categories) {
    const normalizedCategory = String(category || '')
      .trim()
      .toLowerCase()
    const packetKey = CATEGORY_PACKET_KEY[normalizedCategory]
    if (packetKey && packets[packetKey]) return packets[packetKey]
  }

  return packets.today || packets.general || null
}

function attachMatrixVerdict(
  evidence: CalendarEvidence,
  packet: CounselorEvidencePacket | null
): CalendarEvidence {
  if (!packet) return evidence

  return {
    ...evidence,
    matrixVerdict: {
      focusDomain: packet.focusDomain,
      verdict: sanitizeMatrixNarrativeLine(packet.verdict),
      guardrail: sanitizeMatrixNarrativeLine(packet.guardrail),
      topClaim: sanitizeMatrixNarrativeLine(packet.topClaims[0]?.text || ''),
      topAnchorSummary: sanitizeMatrixNarrativeLine(packet.topAnchorSummary),
      phase: packet.strategyBrief?.overallPhaseLabel,
      attackPercent: packet.strategyBrief?.attackPercent,
      defensePercent: packet.strategyBrief?.defensePercent,
    },
  }
}

function buildMatrixFirstSummary(input: {
  verdict?: string
  topClaim?: string
  topAnchorSummary?: string
  fallbackSummary: string
}): string {
  return dedupeTexts([
    sanitizeMatrixNarrativeLine(input.verdict),
    sanitizeMatrixNarrativeLine(input.topClaim),
    sanitizeMatrixNarrativeLine(input.topAnchorSummary),
    sanitizeMatrixNarrativeLine(input.fallbackSummary),
  ]).join(' ')
}

function buildMatrixFirstDescription(input: {
  topAnchorSummary?: string
  verdict?: string
  topClaim?: string
  overlaySummary?: string
  fallbackDescription: string
}): string {
  const matrixPreferred = dedupeTexts([
    sanitizeMatrixNarrativeLine(input.topAnchorSummary),
    sanitizeMatrixNarrativeLine(input.verdict),
    sanitizeMatrixNarrativeLine(input.topClaim),
    sanitizeMatrixNarrativeLine(input.overlaySummary),
  ]).join(' ')

  return matrixPreferred || sanitizeMatrixNarrativeLine(input.fallbackDescription)
}

function getMatrixDomainLabel(
  domain: CalendarEvidence['matrix']['domain'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (domain === 'career') return 'ì»¤ë¦¬ì–´'
    if (domain === 'love') return 'ì—°ì• '
    if (domain === 'money') return 'ìž¬ì •'
    if (domain === 'health') return 'ê±´ê°•'
    if (domain === 'move') return 'ì´ë™'
    return 'ì „ë°˜'
  }

  if (domain === 'career') return 'career'
  if (domain === 'love') return 'relationship'
  if (domain === 'money') return 'finance'
  if (domain === 'health') return 'health'
  if (domain === 'move') return 'mobility'
  return 'overall'
}

function buildMatrixStrictSummaryFallback(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
}): string {
  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  const confidence = Math.max(0, Math.min(100, input.evidence.confidence ?? 0))
  const peak = input.evidence.matrix?.peakLevel || 'normal'
  const agreement = input.evidence.crossAgreementPercent

  if (input.lang === 'ko') {
    const peakText = peak === 'peak' ? 'í”¼í¬ êµ¬ê°„' : peak === 'high' ? 'ìƒìŠ¹ êµ¬ê°„' : 'ì•ˆì • êµ¬ê°„'
    const confidenceText =
      confidence >= 70
        ? 'ê·¼ê±° ì‹ ë¢°ë„ê°€ ë†’ìŠµë‹ˆë‹¤.'
        : confidence >= 40
          ? 'ê·¼ê±° ì‹ ë¢°ë„ëŠ” ì¤‘ê°„ ìˆ˜ì¤€ìž…ë‹ˆë‹¤.'
          : 'ê·¼ê±° ì‹ ë¢°ë„ê°€ ë‚®ì•„ ê²€í†  ì¤‘ì‹¬ ìš´ì˜ì´ ì•ˆì „í•©ë‹ˆë‹¤.'
    const agreementText =
      typeof agreement === 'number' && Number.isFinite(agreement)
        ? `êµì°¨ ì •í•©ë„ ${agreement}% ê¸°ì¤€ìœ¼ë¡œ íŒë‹¨í•©ë‹ˆë‹¤.`
        : ''
    return dedupeTexts([
      `${domainLabel} ë„ë©”ì¸ì€ ${peakText}ìž…ë‹ˆë‹¤.`,
      confidenceText,
      agreementText,
    ]).join(' ')
  }

  const peakText =
    peak === 'peak' ? 'peak window' : peak === 'high' ? 'rising window' : 'steady window'
  const confidenceText =
    confidence >= 70
      ? 'Evidence confidence is high.'
      : confidence >= 40
        ? 'Evidence confidence is moderate.'
        : 'Evidence confidence is low, so review-first execution is safer.'
  const agreementText =
    typeof agreement === 'number' && Number.isFinite(agreement)
      ? `Cross-agreement reference is ${agreement}%.`
      : ''
  return dedupeTexts([`${domainLabel} is in a ${peakText}.`, confidenceText, agreementText]).join(
    ' '
  )
}

function buildMatrixStrictDescriptionFallback(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  summary: string
  guardrail?: string
}): string {
  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  const confidence = Math.max(0, Math.min(100, input.evidence.confidence ?? 0))
  const baseDetail =
    input.lang === 'ko'
      ? `${domainLabel} ì˜ì—­ì€ ê³µí†µ ë©”íŠ¸ë¦­ìŠ¤ ê¸°ì¤€ìœ¼ë¡œ ì ê²€-ì‹¤í–‰-ìž¬í™•ì¸ ìˆœì„œë¥¼ ìœ ì§€í•˜ì„¸ìš”.`
      : `In ${domainLabel}, follow a verify-execute-recheck sequence based on the shared matrix.`
  const confidenceDetail =
    input.lang === 'ko'
      ? confidence < 40
        ? 'ì‹ ë¢°ë„ê°€ ë‚®ì•„ í™•ì •/ì„œëª…/ê²°ì œëŠ” í•œ ë²ˆ ë” ê²€í† í•˜ëŠ” íŽ¸ì´ ì•ˆì „í•©ë‹ˆë‹¤.'
        : 'ì‹ ë¢°ë„ê°€ í™•ë³´ë˜ì–´ ìš°ì„ ìˆœìœ„ ì‹¤í–‰ì— ì§‘ì¤‘í•  ìˆ˜ ìžˆìŠµë‹ˆë‹¤.'
      : confidence < 40
        ? 'Confidence is low, so recheck before any irreversible commitment.'
        : 'Confidence is sufficient to focus on prioritized execution.'

  return dedupeTexts([input.summary, baseDetail, confidenceDetail, input.guardrail || '']).join(' ')
}

function buildMatrixStrictRecommendations(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  topClaim?: string
  matrixRecommendations: string[]
}): string[] {
  const out = dedupeTexts([input.topClaim || '', ...(input.matrixRecommendations || [])]).slice(
    0,
    6
  )
  if (out.length > 0) return out

  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  return input.lang === 'ko'
    ? [
        `${domainLabel} ê´€ë ¨ í•µì‹¬ ê³¼ì œ 1ê°œë¥¼ ë¨¼ì € ì‹¤í–‰í•˜ì„¸ìš”.`,
        'ê²°ì • ì „ ì²´í¬ë¦¬ìŠ¤íŠ¸ë¥¼ ë¬¸ì„œë¡œ ë‚¨ê¸°ì„¸ìš”.',
      ]
    : [
        `Execute one high-impact ${domainLabel} task first.`,
        'Document a short checklist before committing.',
      ]
}

function buildMatrixStrictWarnings(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  guardrail?: string
  matrixWarnings: string[]
}): string[] {
  const out = dedupeTexts([input.guardrail || '', ...(input.matrixWarnings || [])]).slice(0, 6)
  if (out.length > 0) return out

  return input.lang === 'ko'
    ? ['ê³µí†µ ë©”íŠ¸ë¦­ìŠ¤ ì‹ ë¢°ë„ê°€ ë‚®ìœ¼ë©´ í™•ì • í–‰ë™ ì „ ìž¬ê²€ì¦ì´ í•„ìš”í•©ë‹ˆë‹¤.']
    : ['When shared-matrix confidence is low, re-validate before irreversible actions.']
}

function buildMatrixFirstRecommendations(input: {
  matrixTopClaim?: string
  baseRecommendations: string[]
}): string[] {
  return dedupeTexts([input.matrixTopClaim || '', ...input.baseRecommendations]).slice(0, 6)
}

function buildMatrixFirstWarnings(input: {
  matrixGuardrail?: string
  baseWarnings: string[]
  conservativeWarning?: string
}): string[] {
  return dedupeTexts([
    input.matrixGuardrail || '',
    ...(input.baseWarnings || []),
    input.conservativeWarning || '',
  ]).slice(0, 6)
}

function clampDisplayScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function applyMatrixDisplayScoreBias(input: {
  baseScore: number
  evidence: CalendarEvidence
}): number {
  const matrixScore = input.evidence.matrix?.finalScoreAdjusted ?? 5
  const overlapStrength = input.evidence.matrix?.overlapStrength ?? 0
  const peakLevel = input.evidence.matrix?.peakLevel ?? 'normal'
  const confidence = input.evidence.confidence ?? 0
  const attack = input.evidence.matrixVerdict?.attackPercent ?? 50
  const defense = input.evidence.matrixVerdict?.defensePercent ?? 50

  const matrixBias = (matrixScore - 5) * 3.2
  const overlapBias = (overlapStrength - 0.5) * 10
  const peakBias = peakLevel === 'peak' ? 6 : peakLevel === 'high' ? 3 : 0
  const stanceBias = ((attack - defense) / 100) * 6
  const confidenceWeight =
    confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.medium
      ? 1
      : confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.low
        ? 0.7
        : 0.4

  return clampDisplayScore(
    input.baseScore + (matrixBias + overlapBias + peakBias + stanceBias) * confidenceWeight
  )
}

function getEffectiveGradeFromDisplayScore(score: number): ImportanceGrade {
  if (score >= GRADE_THRESHOLDS.grade0) return 0
  if (score >= GRADE_THRESHOLDS.grade1) return 1
  if (score >= GRADE_THRESHOLDS.grade2) return 2
  if (score >= GRADE_THRESHOLDS.grade3) return 3
  return 4
}

export function applyMatrixPreformatRegrade(
  date: ImportantDate,
  matrixContext?: MatrixCalendarContext,
  matrixEvidencePackets?: MatrixEvidencePacketMap
): ImportantDate {
  if (!matrixContext) return date
  const uniqueCategories = [...new Set(date.categories)]
  const matrixOverlay = buildMatrixOverlay(
    date.date,
    matrixContext || null,
    uniqueCategories,
    'en',
    date.grade,
    date.confidence,
    date.crossAgreementPercent,
    {}
  )
  const matrixPacket = selectMatrixPacketForDate({
    categories: uniqueCategories,
    evidenceDomain: matrixOverlay.evidence.matrix.domain,
    packets: matrixEvidencePackets,
  })
  const evidenceWithVerdict = attachMatrixVerdict(matrixOverlay.evidence, matrixPacket)
  const baseDisplayScore = date.displayScore ?? date.adjustedScore ?? date.score
  const displayScore = applyMatrixDisplayScoreBias({
    baseScore: baseDisplayScore,
    evidence: evidenceWithVerdict,
  })
  const confidence = evidenceWithVerdict.confidence ?? 0
  const peakLevel = evidenceWithVerdict.matrix?.peakLevel ?? 'normal'
  const overlapStrength = evidenceWithVerdict.matrix?.overlapStrength ?? 0
  const shouldRegrade =
    confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.medium ||
    peakLevel === 'peak' ||
    (peakLevel === 'high' && overlapStrength >= 0.6)
  if (!shouldRegrade) return date

  const phaseLabel = evidenceWithVerdict.matrixVerdict?.phase || ''
  const attackPercent = evidenceWithVerdict.matrixVerdict?.attackPercent ?? 50
  let effectiveGrade = getEffectiveGradeFromDisplayScore(displayScore)
  if (effectiveGrade === 0 && date.grade > 0) {
    const strongBestSignal = confidence >= 85 && (peakLevel === 'peak' || overlapStrength >= 0.75)
    if (!strongBestSignal) {
      effectiveGrade = 1
    }
  }
  if (effectiveGrade < date.grade - 1) {
    effectiveGrade = (date.grade - 1) as ImportanceGrade
  } else if (effectiveGrade > date.grade + 1) {
    effectiveGrade = (date.grade + 1) as ImportanceGrade
  }

  const highGradePhaseConflict =
    effectiveGrade <= 1 &&
    isDefensivePhaseLabel(phaseLabel) &&
    attackPercent <= 58 &&
    confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.medium

  if (highGradePhaseConflict) {
    effectiveGrade = 1
  }

  const scoreAfterPhaseAlignment = highGradePhaseConflict
    ? Math.min(displayScore, GRADE_THRESHOLDS.grade0 - 1)
    : displayScore

  return {
    ...date,
    categories: uniqueCategories,
    rawScore: date.rawScore ?? date.score,
    adjustedScore: scoreAfterPhaseAlignment,
    displayScore: scoreAfterPhaseAlignment,
    score: scoreAfterPhaseAlignment,
    grade: effectiveGrade,
  }
}

export function formatDateForResponse(
  date: ImportantDate,
  locale: string,
  koTranslations: TranslationData,
  enTranslations: TranslationData,
  matrixContext?: MatrixCalendarContext,
  matrixEvidencePackets?: MatrixEvidencePacketMap,
  _aiEnrichmentFailed = false
): FormattedDate {
  const translations = locale === 'ko' ? koTranslations : enTranslations
  const lang = locale === 'ko' ? 'ko' : 'en'

  // ì¤‘ë³µ ì¹´í…Œê³ ë¦¬ ì œê±°
  const uniqueCategories = [...new Set(date.categories)]

  // ë²ˆì—­ëœ ìš”ì†Œë§Œ í¬í•¨ (ë²ˆì—­ ì—†ìœ¼ë©´ ì œì™¸)
  const translatedSajuFactors = date.sajuFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)
    .map((text) => sanitizeCalendarCopy(text, lang))

  const translatedAstroFactors = date.astroFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)
    .map((text) => sanitizeCalendarCopy(text, lang))

  // Grade 3 ì´ìƒ(ì•ˆì¢‹ìŒ)ì—ì„œëŠ” ë¶€ì •ì  ìš”ì†Œë¥¼ ë¨¼ì € í‘œì‹œ
  let orderedSajuFactors = translatedSajuFactors
  let orderedAstroFactors = translatedAstroFactors

  if (date.grade >= 3) {
    // ë¶€ì •ì  í‚¤ì›Œë“œê°€ í¬í•¨ëœ ìš”ì†Œë¥¼ ì•žìœ¼ë¡œ
    const negativeKeywords = [
      'ì¶©',
      'í˜•',
      'í•´',
      'ê³µë§',
      'ì—­í–‰',
      'ì£¼ì˜',
      'clash',
      'conflict',
      'retrograde',
      'caution',
    ]
    orderedSajuFactors = [...translatedSajuFactors].sort((a, b) => {
      const aHasNeg = negativeKeywords.some((k) => a.toLowerCase().includes(k) || a.includes(k))
      const bHasNeg = negativeKeywords.some((k) => b.toLowerCase().includes(k) || b.includes(k))
      if (aHasNeg && !bHasNeg) {
        return -1
      }
      if (!aHasNeg && bHasNeg) {
        return 1
      }
      return 0
    })
    orderedAstroFactors = [...translatedAstroFactors].sort((a, b) => {
      const aHasNeg = negativeKeywords.some((k) => a.toLowerCase().includes(k) || a.includes(k))
      const bHasNeg = negativeKeywords.some((k) => b.toLowerCase().includes(k) || b.includes(k))
      if (aHasNeg && !bHasNeg) {
        return -1
      }
      if (!aHasNeg && bHasNeg) {
        return 1
      }
      return 0
    })
  }

  const bestTimes = generateBestTimes(date.grade, uniqueCategories, lang, date.confidence, date)
  const recommendations = buildEnhancedRecommendations(
    date,
    uniqueCategories,
    bestTimes,
    translations,
    lang
  )
  const warnings = buildEnhancedWarnings(date, translations, lang)
  const crossEvidence = buildCrossEvidenceBundle(
    date,
    lang,
    orderedSajuFactors,
    orderedAstroFactors,
    date.crossAgreementPercent
  )
  const matrixOverlay = buildMatrixOverlay(
    date.date,
    matrixContext || null,
    uniqueCategories,
    lang,
    date.grade,
    date.confidence,
    date.crossAgreementPercent,
    crossEvidence
  )
  const matrixPacket = selectMatrixPacketForDate({
    categories: uniqueCategories,
    evidenceDomain: matrixOverlay.evidence.matrix.domain,
    packets: matrixEvidencePackets,
  })
  const evidenceWithVerdict = attachMatrixVerdict(matrixOverlay.evidence, matrixPacket)
  const matrixVerdict = evidenceWithVerdict.matrixVerdict
  const timingSignals = buildTimingSignals({
    date,
    lang,
    matrixVerdict,
    peakLevel: evidenceWithVerdict.matrix?.peakLevel,
  })
  const baseDisplayScore = date.displayScore ?? date.adjustedScore ?? date.score
  const hasPregradedDisplay =
    typeof date.displayScore === 'number' && typeof date.grade === 'number'
  const displayScore = hasPregradedDisplay
    ? clampDisplayScore(date.displayScore ?? date.score)
    : applyMatrixDisplayScoreBias({
        baseScore: baseDisplayScore,
        evidence: evidenceWithVerdict,
      })
  const effectiveGrade = hasPregradedDisplay
    ? (date.grade as ImportanceGrade)
    : getEffectiveGradeFromDisplayScore(displayScore)
  const rawScore = date.rawScore ?? date.score
  const baseSummary = generateSummary(
    date.grade,
    uniqueCategories,
    displayScore,
    lang,
    date.sajuFactorKeys,
    date.astroFactorKeys,
    date.crossVerified,
    date.date,
    date.crossAgreementPercent
  )
  const matrixFallbackSummary = CALENDAR_MATRIX_STRICT_MODE
    ? buildMatrixStrictSummaryFallback({
        lang,
        evidence: evidenceWithVerdict,
      })
    : baseSummary
  const finalSummary = buildMatrixFirstSummary({
    verdict: matrixVerdict?.verdict,
    topClaim: matrixVerdict?.topClaim,
    topAnchorSummary: matrixVerdict?.topAnchorSummary,
    fallbackSummary: matrixOverlay.summary || matrixFallbackSummary,
  })
  const coherenceConfidence = date.confidence ?? evidenceWithVerdict.confidence
  const coherenceAgreement = date.crossAgreementPercent ?? evidenceWithVerdict.crossAgreementPercent
  const lowCoherence = isLowCoherenceSignal(coherenceConfidence, coherenceAgreement)
  const forceConservativeMode = effectiveGrade <= 1 && lowCoherence
  const highGradePhaseConflict =
    effectiveGrade <= 1 &&
    isDefensivePhaseLabel(matrixVerdict?.phase) &&
    (matrixVerdict?.attackPercent ?? 50) <= 58

  const defaultTitle = sanitizeCalendarCopy(getTranslation(date.titleKey, translations), lang)
  const title = forceConservativeMode
    ? lang === 'ko'
      ? 'í•´ì„ ê°ˆë¦¼'
      : 'Mixed signals'
    : highGradePhaseConflict
      ? lang === 'ko'
        ? 'ê²€í†  ìš°ì„ ì˜ ë‚ '
        : 'Review-first day'
      : defaultTitle
  const alignedDisplayScore = highGradePhaseConflict
    ? Math.min(displayScore, GRADE_THRESHOLDS.grade0 - 1)
    : displayScore
  const alignedEffectiveGrade =
    highGradePhaseConflict && effectiveGrade === 0 ? (1 as ImportanceGrade) : effectiveGrade
  const strictWarnings = CALENDAR_MATRIX_STRICT_MODE
    ? buildMatrixStrictWarnings({
        lang,
        evidence: evidenceWithVerdict,
        guardrail: matrixVerdict?.guardrail,
        matrixWarnings: matrixOverlay.warnings,
      })
    : dedupeTexts([...warnings, ...matrixOverlay.warnings]).slice(0, 6)
  const warningsForResponse = buildMatrixFirstWarnings({
    matrixGuardrail: matrixVerdict?.guardrail,
    baseWarnings: strictWarnings,
    conservativeWarning: forceConservativeMode
      ? lang === 'ko'
        ? 'ì»¤ë®¤ë‹ˆì¼€ì´ì…˜ ì˜¤ë¥˜ ê°€ëŠ¥ì„±ì´ ìžˆì–´ ìž¬í™•ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤.'
        : 'Communication errors are more likely today. Re-check before committing.'
      : '',
  })
  const strictRecommendations = CALENDAR_MATRIX_STRICT_MODE
    ? buildMatrixStrictRecommendations({
        lang,
        evidence: evidenceWithVerdict,
        topClaim: matrixVerdict?.topClaim,
        matrixRecommendations: matrixOverlay.recommendations,
      })
    : dedupeTexts([...recommendations, ...matrixOverlay.recommendations]).slice(0, 6)
  const recommendationsForResponse = gateRecommendations({
    recommendations: buildMatrixFirstRecommendations({
      matrixTopClaim: matrixVerdict?.topClaim,
      baseRecommendations: strictRecommendations,
    }),
    recommendationKeys: date.recommendationKeys,
    warningKeys: date.warningKeys,
    warnings: warningsForResponse,
    confidence: evidenceWithVerdict.confidence ?? date.confidence,
    grade: alignedEffectiveGrade,
    title,
    summary: finalSummary,
    lang,
    forceGate: forceConservativeMode,
    irreversibleKeyPresent: date.recommendationKeys.some((key) =>
      IRREVERSIBLE_RECOMMENDATION_KEYS.has(key)
    ),
  })
  const finalDescription = sanitizeCalendarCopy(
    forceConservativeMode
    ? lang === 'ko'
      ? 'ì‹ í˜¸ê°€ ì—‡ê°ˆë¦½ë‹ˆë‹¤. í° ê²°ì •ì€ ìž¬í™•ì¸ í›„ ì§„í–‰í•˜ì„¸ìš”.'
      : 'Signals are mixed. Re-check major decisions before committing.'
    : buildMatrixFirstDescription({
        topAnchorSummary: matrixVerdict?.topAnchorSummary,
        verdict: matrixVerdict?.verdict,
        topClaim: matrixVerdict?.topClaim,
        overlaySummary: matrixOverlay.summary,
        fallbackDescription: CALENDAR_MATRIX_STRICT_MODE
          ? buildMatrixStrictDescriptionFallback({
              lang,
              evidence: evidenceWithVerdict,
              summary: finalSummary,
              guardrail: matrixVerdict?.guardrail,
            })
          : getTranslation(date.descKey, translations),
      }),
    lang
  )
  const summarizedBase = sanitizeCalendarCopy(
    forceConservativeMode
    ? dedupeTexts([
        finalSummary,
        lang === 'ko'
          ? 'í•µì‹¬ ê²°ë¡ : ì‹ ë¢°ë„/êµì°¨ ì •í•©ì´ ë‚®ì•„ ê²€í†  ì¤‘ì‹¬ìœ¼ë¡œ ìš´ì˜í•˜ëŠ” íŽ¸ì´ ì•ˆì „í•©ë‹ˆë‹¤.'
          : 'Core conclusion: low confidence/cross-alignment, so operate in review-first mode.',
      ]).join(' ')
    : finalSummary,
    lang
  )
  const summarized = summarizedBase
  const actionSummary = buildActionSummary({
    lang,
    recommendations: recommendationsForResponse.map((text) => sanitizeCalendarCopy(text, lang)),
    warnings: warningsForResponse.map((text) => sanitizeCalendarCopy(text, lang)),
    bestTimes: bestTimes.map((text) => sanitizeCalendarCopy(text, lang)),
    timingSignals: timingSignals.map((text) => sanitizeCalendarCopy(text, lang)),
  })

  return normalizeMojibakePayload({
    date: date.date,
    grade: alignedEffectiveGrade,
    originalGrade: date.grade,
    score: alignedDisplayScore,
    rawScore,
    adjustedScore: alignedDisplayScore,
    displayScore: alignedDisplayScore,
    displayGrade: alignedEffectiveGrade,
    categories: uniqueCategories,
    title: sanitizeCalendarCopy(title, lang),
    description: finalDescription,
    summary: summarized,
    actionSummary,
    timingSignals: timingSignals.map((text) => sanitizeCalendarCopy(text, lang)),
    bestTimes: bestTimes.map((text) => sanitizeCalendarCopy(text, lang)),
    sajuFactors: orderedSajuFactors,
    astroFactors: orderedAstroFactors,
    recommendations: recommendationsForResponse.map((text) => sanitizeCalendarCopy(text, lang)),
    warnings: warningsForResponse.map((text) => sanitizeCalendarCopy(text, lang)),
    evidence: evidenceWithVerdict,
  })
}

// AI ë°±ì—”ë“œì—ì„œ ì¶”ê°€ ë‚ ì§œ ì •ë³´ ê°€ì ¸ì˜¤ê¸°
export async function fetchAIDates(
  sajuData: Record<string, unknown>,
  astroData: Record<string, unknown>,
  theme: string = 'overall'
): Promise<{
  auspicious: Array<{ date?: string; description?: string; is_auspicious?: boolean }>
  caution: Array<{ date?: string; description?: string; is_auspicious?: boolean }>
} | null> {
  const nowMs = Date.now()
  const config = readAIDatesCircuitConfig()

  if (config.disabled) {
    logger.info('[Calendar] AI enrichment disabled via env flag')
    return null
  }

  if (config.circuitEnabled && isAIDatesCircuitOpen(nowMs)) {
    logger.warn('[Calendar] AI enrichment circuit open, skipping call', {
      retryAfterMs: Math.max(0, aiDatesCircuitState.openUntilMs - nowMs),
      consecutiveFailures: aiDatesCircuitState.consecutiveFailures,
    })
    return null
  }

  try {
    const response = await apiClient.post(
      '/api/theme/important-dates',
      {
        theme,
        saju: sajuData,
        astro: astroData,
      },
      {
        timeout: config.timeoutMs,
        retries: config.retries,
        retryDelay: config.retryDelayMs,
      }
    )

    if (response.ok && response.data) {
      resetAIDatesFailureState()
      const resData = response.data as { auspicious_dates?: string[]; caution_dates?: string[] }
      return {
        auspicious: (resData.auspicious_dates || []).map((date) => ({ date, is_auspicious: true })),
        caution: (resData.caution_dates || []).map((date) => ({ date, is_auspicious: false })),
      }
    }
    if (config.circuitEnabled) {
      markAIDatesFailure(nowMs, config.failureThreshold, config.cooldownMs)
    }
    logger.warn('[Calendar] AI backend returned non-ok response', {
      status: response.status,
      error: response.error,
      consecutiveFailures: aiDatesCircuitState.consecutiveFailures,
      circuitOpenUntilMs: aiDatesCircuitState.openUntilMs,
    })
  } catch (error) {
    if (config.circuitEnabled) {
      markAIDatesFailure(nowMs, config.failureThreshold, config.cooldownMs)
    }
    logger.warn('[Calendar] AI backend not available, using local calculation:', error)
  }
  return null
}

// ìœ„ì¹˜ ì¢Œí‘œ
export const LOCATION_COORDS: Record<string, LocationCoord> = {
  Seoul: { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
  'Seoul, KR': { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
  Busan: { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  'Busan, KR': { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  Tokyo: { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  'Tokyo, JP': { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  'New York': { lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  'New York, US': { lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  'Los Angeles': { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  'Los Angeles, US': { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  London: { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  'London, GB': { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  Paris: { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  'Paris, FR': { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  Beijing: { lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
  'Beijing, CN': { lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
  Shanghai: { lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
  'Shanghai, CN': { lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
}

