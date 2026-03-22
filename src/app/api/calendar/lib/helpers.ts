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
import {
  describeCrossAgreement,
  describeCrossEvidenceBridge,
  describeEvidenceConfidence,
  describeExecutionStance,
  describePhaseFlow,
  describeSajuAstroRole,
  describeTimingWindowBrief,
  describeTimingWindowNarrative,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'

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
  return /(defensive\s*reset|stabilization|방어\/재정렬|안정화)/i.test(
    repairMojibakeText(value)
  )
}

function humanizeCalendarEngineText(value: string | undefined): string {
  const repaired = repairMojibakeText(String(value || '')).trim()
  if (!repaired) return ''

  return repaired
    .replace(/레이어\s*0/gi, '핵심 조건')
    .replace(/레이어\s*1/gi, '보조 조건')
    .replace(/공격\s*(\d+(?:\.\d+)?)%\s*\/\s*방어\s*(\d+(?:\.\d+)?)%/gi, '밀어붙일 힘 $1% / 신중하게 볼 부분 $2%')
    .replace(/방어\/재정렬 국면/gi, '서두르기보다 정리와 점검이 중요한 흐름')
    .replace(/공격\/확장 국면/gi, '움직이되 범위를 넓히기보다 핵심을 밀기 좋은 흐름')
    .replace(
      /확장 신호가 우세하여 실행력을 올리기 좋은 구간입니다\.?/gi,
      '움직일 여지는 있지만 판을 크게 벌리기보다 핵심 한두 가지에 집중하는 편이 좋습니다.'
    )
    .replace(
      /레이어\s*0 신호는 해당 구간의 실행 조건을 조정하라는 의미를 가집니다\.?/gi,
      '조건을 한 번 더 맞춘 뒤 들어가라는 뜻입니다.'
    )
    .replace(
      /핵심 흐름의 방향을 좁혀 실행력을 높이세요\.?/gi,
      '할 일을 넓히지 말고 한두 가지에 집중하세요.'
    )
}

function sanitizeMatrixNarrativeLine(value: string | undefined): string {
  const original = humanizeCalendarEngineText(value)
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

  const humanized = cleaned
    .replace(/성향 축에서는/gi, '지금은')
    .replace(/시기 축에서는/gi, '시기상')
    .replace(/통합 레이어:\s*/gi, '')
    .replace(/타이밍 레이어:\s*/gi, '')
    .replace(/전체 패턴을 실행 가능한 전략으로 압축합니다\./gi, '')
    .replace(/대운·세운·월운·일진 활성도를 해석합니다\./gi, '큰 흐름과 당장의 변수를 함께 읽습니다.')
    .replace(/핵심 조건 신호는 해당 구간의 실행 조건을 조정하라는 의미를 가집니다\./gi, '들어갈 때 필요한 조건을 먼저 맞추라는 뜻입니다.')
    .replace(/조건 신호입니다/gi, '조건으로 읽는 편이 맞습니다')
    .replace(/재물 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다\./gi, '돈 문제는 범위를 줄이고 조건을 분명히 할수록 결과가 좋아지기 쉽습니다.')
    .replace(/커리어 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다\./gi, '일은 한 번에 많이 벌리기보다 오늘 끝낼 결과 하나를 분명히 하는 편이 더 유리합니다.')
    .replace(/이동 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다\./gi, '일정 변경이나 이동은 미리 조율해 두면 생각보다 매끄럽게 풀릴 가능성이 큽니다.')
    .replace(/움직일 여지는 있지만 판을 크게 벌리기보다 핵심 한두 가지에 집중하는 편이 좋습니다\./gi, '기회는 있지만 욕심을 넓히기보다 오늘 꼭 끝낼 핵심 한두 가지에 집중하는 편이 좋습니다.')

  if (!humanized) return ''
  if (MATRIX_TECHNICAL_PAYLOAD_PATTERN.test(original) && humanized.length < 18) return ''
  return humanized
}

function sanitizeCalendarCopy(value: string | undefined, lang: 'ko' | 'en'): string {
  const repaired = humanizeCalendarEngineText(value)
  if (!repaired) return ''

  if (lang === 'ko') {
    return repaired
      .replace(/최고의 날|대길일/g, '강한 실행 구간')
      .replace(/좋은 날/g, '활용 흐름이 좋은 구간')
      .replace(/보통 날/g, '운영 중심 구간')
      .replace(/안좋은 날|나쁜 날/g, '검토 우선 구간')
      .replace(/최악의 날/g, '조정 우선 구간')
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
    .replace(/\bworst day\b/gi, 'adjust-first window')
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

// 한줄 요약 생성
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
  const categoryTail = buildCategoryToneTail(cat, lang, grade, seed)
  const sourceTail = buildSourceToneTail(
    sajuFactorKeys || [],
    astroFactorKeys || [],
    crossVerified,
    crossAgreementPercent,
    lang
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
      base = reason ? `⚠️ ${reason}` : KO_MESSAGES.GRADE_3[cat] || KO_MESSAGES.GRADE_3.general
    } else {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
      base = reason ? `🚨 ${reason}` : KO_MESSAGES.GRADE_4[cat] || KO_MESSAGES.GRADE_4.general
    }

    const tails: string[] = []
    if (crossVerified && isAlignedAcrossSystems(crossAgreementPercent)) {
      tails.push('사주·점성 시그널이 같은 방향으로 맞물립니다.')
    } else if (crossVerified) {
      tails.push('신호가 엇갈립니다. 확정 전 재확인이 유리합니다.')
    }
    if (grade <= 2 && hasPositiveSignal) {
      tails.push('좋은 흐름이 겹치니 핵심 1~2개 목표에 집중하세요.')
    }
    if (grade >= 3 && hasCautionSignal) {
      tails.push('속도보다 검토를 우선하고, 큰 결정보다 리스크 관리가 유리합니다.')
    }
    if (score >= DISPLAY_SCORE_LABEL_THRESHOLDS.good) {
      tails.push(
        pickBySeed(seed, [
          '오전부터 중요한 일을 먼저 끝내면 성과가 커집니다.',
          '오늘은 선제적으로 움직일수록 체감 성과가 커집니다.',
        ])
      )
    } else if (score <= 35) {
      tails.push(
        pickBySeed(seed, [
          '무리한 확장 대신 일정 축소가 더 좋은 결과를 만듭니다.',
          '중요한 약속은 확인을 한 번 더 하세요.',
        ])
      )
    }
    return repairMojibakeText(dedupeTexts([base, categoryTail || '', sourceTail || '', ...tails]).join(' '))
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
    base = reason ? `⚠️ ${reason}` : EN_MESSAGES.GRADE_3[cat] || EN_MESSAGES.GRADE_3.general
  } else {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `🚨 ${reason}` : EN_MESSAGES.GRADE_4[cat] || EN_MESSAGES.GRADE_4.general
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
  return dedupeTexts([base, categoryTail || '', sourceTail || '', ...tails]).join(' ')
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

  // 충(沖) - 가장 강력한 부정 요소
  if (saju.some((k) => k.toLowerCase().includes('chung'))) {
    return lang === 'ko'
      ? '일진 충(沖)! 갈등과 급변에 주의하세요.'
      : 'Day Clash (æ²–)! Watch for conflicts.'
  }

  // 형(刑)
  if (saju.some((k) => k.toLowerCase().includes('xing'))) {
    return lang === 'ko'
      ? '형(刑)살! 서류 실수, 법적 문제에 주의하세요.'
      : 'Punishment (刑)! Watch for legal issues.'
  }

  // 공망
  if (saju.includes('shinsal_gongmang')) {
    return lang === 'ko'
      ? '공망(空亡)! 계획이 무산되기 쉬운 날입니다.'
      : 'Void Day! Plans may fall through.'
  }

  // 백호
  if (saju.includes('shinsal_backho')) {
    return lang === 'ko'
      ? '백호살! 사고, 수술에 특히 주의하세요.'
      : 'White Tiger! Be careful of accidents.'
  }

  // 귀문관
  if (saju.includes('shinsal_guimungwan')) {
    return lang === 'ko'
      ? '귀문관! 정신적 혼란, 불안감에 주의하세요.'
      : 'Ghost Gate! Watch for mental confusion.'
  }

  // 관살
  if (saju.includes('stemGwansal')) {
    return lang === 'ko'
      ? '관살 기운! 외부 압박과 스트레스가 강합니다.'
      : 'Authority pressure! High stress expected.'
  }

  // 수성 역행
  if (astro.includes('retrogradeMercury')) {
    return lang === 'ko'
      ? '수성 역행 중! 계약/소통에 오류가 생기기 쉬워요.'
      : 'Mercury retrograde! Communication errors likely.'
  }

  // 금성 역행
  if (astro.includes('retrogradeVenus')) {
    return lang === 'ko'
      ? '금성 역행 중! 연애/재정 결정은 미루세요.'
      : 'Venus retrograde! Delay love/money decisions.'
  }

  // 보이드 오브 코스
  if (astro.includes('voidOfCourse')) {
    return lang === 'ko'
      ? '달이 공허한 상태! 새 시작은 피하세요.'
      : 'Void of Course Moon! Avoid new starts.'
  }

  // 교차 부정
  if (astro.includes('crossNegative')) {
    return lang === 'ko'
      ? '사주+점성술 모두 부정! 매우 조심하세요.'
      : 'Both Saju & Astro negative! Extra caution!'
  }

  // 충돌 원소
  if (astro.includes('conflictElement')) {
    return lang === 'ko' ? '오행 충돌! 에너지가 분산됩니다.' : 'Element clash! Energy scattered.'
  }

  return null
}

// 추천 시간대 생성
export function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: 'ko' | 'en',
  confidence?: number,
  date?: Pick<ImportantDate, 'bestHours'>
): string[] {
  // Grade 3(안좋음), Grade 4(최악)은 시간 추천 없음
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
      career: ['🌅 오전 10-12시: 미팅/협상 최적', '🌆 오후 2-4시: 서류/계약 유리'],
      wealth: ['💰 오전 9-11시: 금융 거래 유리', '📈 오후 1-3시: 투자 결정 적합'],
      love: ['☕ 오후 3-5시: 데이트 최적', '🌙 저녁 7-9시: 로맨틱한 시간'],
      health: ['🌄 오전 6-8시: 운동 효과 UP', '🧘 저녁 6-8시: 휴식/명상 추천'],
      study: ['📚 오전 9-12시: 집중력 최고', '🌙 저녁 8-10시: 암기력 UP'],
      travel: ['✈️ 오전 8-10시: 출발 추천', '🚗 오후 2-4시: 이동 안전'],
      general: ['🌅 오전 10-12시: 중요한 일 처리', '🌆 오후 3-5시: 미팅/약속'],
    }
    const selected = times[cat] || times.general
    return maybeSoftenBestTimes(selected, lang, confidence).map((item) => repairMojibakeText(item))
  } else {
    const times: Record<string, string[]> = {
      career: ['🌅 10am-12pm: Best for meetings', '🌆 2-4pm: Good for documents'],
      wealth: ['💰 9-11am: Financial deals', '📈 1-3pm: Investment decisions'],
      love: ['☕ 3-5pm: Perfect for dates', '🌙 7-9pm: Romantic time'],
      health: ['🌄 6-8am: Exercise boost', '🧘 6-8pm: Rest & meditation'],
      study: ['📚 9am-12pm: Peak focus', '🌙 8-10pm: Memory boost'],
      travel: ['✈️ 8-10am: Best departure', '🚗 2-4pm: Safe travel'],
      general: ['🌅 10am-12pm: Important tasks', '🌆 3-5pm: Meetings'],
    }
    const selected = times[cat] || times.general
    return maybeSoftenBestTimes(selected, lang, confidence).map((item) => repairMojibakeText(item))
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
      if (slot.quality === 'excellent') return `🌟 ${window}: 핵심 실행/결정 구간`
      if (slot.quality === 'good') return `✅ ${window}: 진행·협의에 유리`
      return `🕒 ${window}: 안정적으로 처리하기 좋은 시간`
    }
    if (slot.quality === 'excellent') return `🌟 ${window}: best for decisive execution`
    if (slot.quality === 'good') return `✅ ${window}: favorable for progress and coordination`
    return `🕒 ${window}: stable block for focused work`
  })
}

function maybeSoftenBestTimes(times: string[], lang: 'ko' | 'en', confidence?: number): string[] {
  const lowConfidence = (confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  if (!lowConfidence) return times

  if (lang === 'ko') {
    return times.map((line) =>
      line
        .replace(/최적/g, '검토에 무난')
        .replace(/유리/g, '무난')
        .replace(/적합/g, '보수적 검토에 무난')
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

  if (keys.some((key) => key.includes('daeun'))) add('\uB300\uC6B4 \uBC18\uC601', 'Daeun active')
  if (keys.some((key) => key.includes('seun') || key.includes('saeun'))) {
    add('\uC138\uC6B4 \uBC18\uC601', 'Annual cycle active')
  }
  if (keys.some((key) => key.includes('wolun'))) add('\uC6D4\uC6B4 \uBC18\uC601', 'Monthly cycle active')
  if (keys.some((key) => key.includes('iljin') || key.includes('day'))) {
    add('\uC77C\uC9C4 \uBC18\uC601', 'Daily cycle active')
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
    add('\uBCC0\uC218 \uBCC0\uD654 \uC2E0\uD638', 'Transit signal')
  }
  if (date.transitSync?.isMajorTransitYear) {
    add('\uC0DD\uD65C \uD750\uB984\uC774 \uD06C\uAC8C \uBC14\uB00C\uAE30 \uC26C\uC6B4 \uD574', 'Major transit year')
  }
  if (matrixVerdict?.phase) {
    add(
      `\uD604\uC7AC \uD750\uB984: ${describePhaseFlow(matrixVerdict.phase, 'ko')}`,
      `Current flow: ${describePhaseFlow(matrixVerdict.phase, 'en')}`
    )
  }
  if (matrixVerdict?.timingWindow) {
    add(
      describeTimingWindowBrief({
        window: matrixVerdict.timingWindow,
        whyNow: matrixVerdict.whyNow,
        entryConditions: matrixVerdict.entryConditions,
        abortConditions: matrixVerdict.abortConditions,
        lang: 'ko',
      }),
      describeTimingWindowBrief({
        window: matrixVerdict.timingWindow,
        whyNow: matrixVerdict.whyNow,
        entryConditions: matrixVerdict.entryConditions,
        abortConditions: matrixVerdict.abortConditions,
        lang: 'en',
      })
    )
  }

  if (peakLevel === 'peak') {
    add('\uC774\uBC88 \uB2EC \uD2B9\uD788 \uD798\uC774 \uC2E4\uB9AC\uB294 \uAD6C\uAC04', 'Monthly peak window')
  } else if (peakLevel === 'high') {
    add('\uC774\uBC88 \uB2EC \uC18D\uB3C4\uB97C \uC62C\uB9AC\uAE30 \uC88B\uC740 \uD750\uB984', 'Monthly rising window')
  }

  return signals.slice(0, 4).map((item) => (lang === 'ko' ? repairMojibakeText(item) : item))
}

function buildActionSummary(input: {
  lang: 'ko' | 'en'
  category: EventCategory
  recommendations: string[]
  warnings: string[]
  bestTimes: string[]
  timingSignals: string[]
}): string {
  const { lang, category, recommendations, warnings, bestTimes, timingSignals } = input
  const doLine = recommendations[0] || ''
  const cautionLine = warnings[0] || ''
  const timeLine = bestTimes[0] || timingSignals[0] || ''

  if (lang === 'ko') {
    const leadLabel =
      category === 'career'
        ? '일'
        : category === 'wealth'
          ? '돈'
          : category === 'love'
            ? '관계'
            : category === 'health'
              ? '컨디션'
              : category === 'travel'
                ? '이동'
                : category === 'study'
                  ? '학습'
                  : '실행'
    return repairMojibakeText(
      [
        doLine ? `${leadLabel}: ${doLine}` : '',
        cautionLine ? `주의: ${cautionLine}` : '',
        timeLine ? `타이밍: ${timeLine}` : '',
      ]
        .filter(Boolean)
        .join(' / ')
    )
  }

  return [
    doLine ? `Do: ${doLine}` : '',
    cautionLine ? `Caution: ${cautionLine}` : '',
    timeLine ? `Timing: ${timeLine}` : '',
  ]
    .filter(Boolean)
    .join(' / ')
}

function buildCategoryToneTail(
  category: EventCategory,
  lang: 'ko' | 'en',
  grade: ImportanceGrade,
  seed: string
): string | null {
  const ko: Record<EventCategory, string[]> = {
    career: [
      '일은 많이 벌리기보다 결론 하나를 분명히 내는 쪽이 더 잘 맞습니다.',
      '업무는 속도보다 우선순위 정리가 성과를 가르는 흐름입니다.',
    ],
    wealth: [
      '돈 문제는 감보다 기준선과 한도를 먼저 세우는 쪽이 훨씬 안전합니다.',
      '재정은 수익을 키우는 것보다 새는 구멍을 줄이는 쪽이 먼저입니다.',
    ],
    love: [
      '관계는 감정 표현보다 의도와 거리감을 분명히 하는 쪽이 더 와닿습니다.',
      '연애는 답을 빨리 내기보다 상대 반응을 보며 속도를 맞추는 편이 좋습니다.',
    ],
    health: [
      '컨디션은 강하게 밀기보다 회복 리듬을 안정시키는 쪽이 더 중요합니다.',
      '몸 상태는 하루 강도보다 수면·식사·휴식의 균형이 더 크게 작용합니다.',
    ],
    travel: [
      '이동은 속도보다 동선과 여유 시간을 잡는 쪽이 결과를 좌우합니다.',
      '여행이나 이동은 계획을 촘촘히 짜는 것보다 변수 흡수 여유가 더 중요합니다.',
    ],
    study: [
      '학습은 오래 붙잡는 것보다 집중 구간을 짧게 끊어 반복하는 편이 효율적입니다.',
      '공부는 범위를 넓히기보다 오늘 끝낼 분량을 분명히 하는 쪽이 좋습니다.',
    ],
    general: [
      '오늘은 이것저것 넓히기보다 핵심 한두 가지를 선명하게 가져가는 편이 낫습니다.',
      '전체 흐름은 속도보다 정리와 선택이 체감 차이를 만드는 날에 가깝습니다.',
    ],
  }
  const en: Record<EventCategory, string[]> = {
    career: [
      'Work goes better when you narrow to one clear decision.',
      'Priority order matters more than raw speed today.',
    ],
    wealth: [
      'Money decisions are safer when you set limits first.',
      'Reduce leakage before chasing upside.',
    ],
    love: [
      'Relationships respond better to clear intent than emotional overexplanation.',
      'Match pace before trying to force certainty.',
    ],
    health: [
      'Recovery rhythm matters more than intensity today.',
      'Sleep, meals, and pacing matter more than pushing harder.',
    ],
    travel: [
      'Route clarity and buffer time matter more than speed.',
      'Mobility goes better when you leave room for variables.',
    ],
    study: [
      'Short focused blocks work better than long scattered effort.',
      "Define today's finish line before widening scope.",
    ],
    general: [
      'This is better for narrowing to one or two priorities than widening scope.',
      'Clear selection matters more than raw pace today.',
    ],
  }
  const base = pickBySeed(seed, lang === 'ko' ? ko[category] : en[category])
  if (grade >= 3) {
    return lang === 'ko'
      ? `${base} 큰 결정은 하루 미뤄도 괜찮습니다.`
      : `${base} Delay major commitments for a day.`
  }
  return base
}

function buildSourceToneTail(
  sajuFactorKeys: string[],
  astroFactorKeys: string[],
  crossVerified: boolean,
  crossAgreementPercent: number | undefined,
  lang: 'ko' | 'en'
): string | null {
  return describeSajuAstroRole({
    hasSaju: sajuFactorKeys.length > 0,
    hasAstro: astroFactorKeys.length > 0,
    crossVerified,
    crossAgreementPercent,
    lang,
  })
}

function buildCategoryAction(
  category: EventCategory,
  grade: ImportanceGrade,
  lang: 'ko' | 'en',
  seed: string
): string {
  const ko: Record<EventCategory, string[]> = {
    career: ['핵심 업무 1건을 오전에 선처리하세요.', '협업/보고는 짧고 명확하게 진행하세요.'],
    wealth: [
      '지출·투자 기준선을 먼저 정하고 움직이세요.',
      '작은 수익보다 리스크 통제를 우선하세요.',
    ],
    love: [
      '감정보다 의도를 분명히 말하면 오해를 줄일 수 있어요.',
      '관계 대화는 저녁 시간에 짧게 정리하세요.',
    ],
    health: [
      '수면·식사 리듬을 먼저 맞추면 컨디션이 회복됩니다.',
      '무리한 강도보다 가벼운 루틴이 유리합니다.',
    ],
    travel: [
      '이동 전 일정과 동선을 한 번 더 점검하세요.',
      '출발 시간 버퍼를 넉넉히 두는 게 좋습니다.',
    ],
    study: ['집중 블록 40~60분 단위로 학습하세요.', '복습 우선 순위를 3개로 제한하세요.'],
    general: [
      '오늘 목표를 2개 이하로 줄이면 성과가 올라갑니다.',
      '중요하지 않은 요청은 과감히 미루세요.',
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
    general: ["Cut today's priorities down to two.", 'Delay low-impact requests without guilt.'],
  }
  const source = lang === 'ko' ? ko : en
  const base = pickBySeed(seed, source[category])
  if (grade >= 3) {
    return lang === 'ko'
      ? `${base} 큰 결정은 하루 미뤄도 괜찮습니다.`
      : `${base} Defer major decisions for a day.`
  }
  return base
}

function buildFactorAction(factors: string[], lang: 'ko' | 'en', seed: string): string | null {
  const lower = factors.map((f) => f.toLowerCase())
  if (lower.some((f) => f.includes('retrograde'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          '계약·결제는 재확인 후 진행하세요.',
          '메시지/문서는 오탈자 점검 후 발송하세요.',
        ])
      : pickBySeed(seed, [
          'Double-check contracts and payments.',
          'Proofread messages and documents before sending.',
        ])
  }
  if (lower.some((f) => f.includes('chung') || f.includes('xing') || f.includes('conflict'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          '정면충돌보다 우회안을 준비하세요.',
          '예민한 대화는 결론보다 사실 확인부터 하세요.',
        ])
      : pickBySeed(seed, [
          'Prepare a fallback path instead of direct confrontation.',
          'Validate facts first in sensitive conversations.',
        ])
  }
  if (lower.some((f) => f.includes('samhap') || f.includes('yukhap') || f.includes('cheoneul'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          '협업 제안·네트워킹에 유리한 흐름입니다.',
          '도움을 요청하면 응답을 얻기 쉽습니다.',
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
        ? '일정 지연 가능성을 고려해 버퍼를 확보하세요.'
        : 'Add schedule buffer to absorb delays.'
    )
  }
  if (lower.some((f) => f.includes('retrograde'))) {
    warnings.push(
      lang === 'ko'
        ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
        : 'Communication errors are more likely today.'
    )
  }
  if (lower.some((f) => f.includes('gongmang') || f.includes('void'))) {
    warnings.push(
      lang === 'ko'
        ? '새 프로젝트의 즉시 확정은 신중히 검토하세요.'
        : 'Avoid locking in new projects impulsively.'
    )
  }
  if (lower.some((f) => f.includes('accident') || f.includes('backho'))) {
    warnings.push(
      lang === 'ko'
        ? '이동·운동 시 안전수칙을 강화하세요.'
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
      ? `추천 시간 우선: ${bestTimes[0]}`
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
          ? '이동·운동 시 안전수칙을 강화하세요.'
          : 'Use extra safety precautions for movement and exercise.'
      )
    }

    // Show communication caution on high-grade days only when confidence/alignment is weak.
    if (lower.some((f) => f.includes('retrograde')) && (lowConfidence || !crossAligned)) {
      contextual.push(
        lang === 'ko'
          ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
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
  conjunction: '☌',
  sextile: '✶',
  square: 'â–¡',
  trine: 'â–³',
  opposition: '☍',
}

const ASPECT_WORD_EN: Record<AspectEvidenceLite['aspect'], string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'oppose',
}

const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  'Natal Sun': '본명 태양',
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const sentenceCut = normalized.split(/[.!?。]/)[0]?.trim() || normalized
  if (sentenceCut.length <= maxLength) {
    return sentenceCut
  }
  return `${sentenceCut.slice(0, Math.max(8, maxLength - 1)).trimEnd()}…`
}

function formatOrb(orb: number): string {
  const safe = Number.isFinite(orb) ? Math.max(0, orb) : 0
  let degree = Math.floor(safe)
  let minute = Math.round((safe - degree) * 60)
  if (minute === 60) {
    degree += 1
    minute = 0
  }
  return `${degree}°${String(minute).padStart(2, '0')}'`
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
      if (aspect === 'square') return '긴장·힘겨루기 구도'
      if (aspect === 'opposition') return '충돌·관계 재조정 신호'
      return '압박·검증 필요 신호'
    }
    if (tone === 'positive') {
      if (aspect === 'trine') return '흐름·지원이 강한 구도'
      if (aspect === 'sextile') return '기회·협력 창구 확대'
      return '추진력·집중력 상승'
    }
    if (aspect === 'conjunction') return '에너지 증폭 구간'
    return '중립 신호'
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
  const icon = detail.tone === 'negative' ? '⚠️' : detail.tone === 'positive' ? '✅' : 'ℹ️'
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
    bridges.push(describeCrossEvidenceBridge({ tone: detail.tone, aligned: isAligned, lang }))
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
              ? describeCrossAgreement(isAligned ? 80 : 35, 'ko')
              : isAligned
                ? 'A1 ↔ S1: Astrology and Saju evidence point in the same direction.'
                : 'A1 ↔ S1: Signals are mixed. Re-check before final commitments.',
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
    career: '커리어',
    love: 'ì—°ì• ',
    money: '재물',
    health: 'ê±´ê°•',
    move: '이동',
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
        ? `이번 달(${monthKey})은 타이밍을 잡기 비교적 좋은 흐름입니다.`
        : `This month (${monthKey}) is a relatively good window for timing decisions.`
    )
  } else if (!riskDay && monthPoint?.peakLevel === 'high') {
    summaryParts.push(
      lang === 'ko'
        ? `이번 달(${monthKey})은 힘을 분산하지 않으면 성과를 내기 좋은 흐름입니다.`
        : `This month (${monthKey}) supports focused execution when you keep scope tight.`
    )
  }

  if (!riskDay && topDomain) {
    if (lang === 'ko') {
      recommendations.push(
        `${koDomainLabel[topDomain]} 쪽이 상대적으로 잘 풀리는 구간이라 우선순위를 앞에 두는 편이 좋습니다.`
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
          ? `오늘은 ${domainLabel} 관련 핵심 과제를 가장 먼저 처리하는 편이 좋습니다.`
          : `${domainLabel} 관련 일정은 초반 시간대에 먼저 배치하는 편이 안정적입니다.`
      )
      summaryParts.push(
        `${domainLabel} 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다.`
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
        ? `${domainLabel} 쪽은 변동성이 있어 서두르기보다 확인과 조율을 먼저 하는 편이 좋습니다.`
        : `${domainLabel} is volatile today; review-first execution is safer than hard commitment.`
    )
  }

  if (cautionSignals.length > 0) {
    warnings.push(
      lang === 'ko'
        ? '주의 신호가 보여서 결론을 서두르기보다 한 번 더 검토하는 편이 좋습니다.'
        : 'Matrix caution signals detected. Add an extra verification step.'
    )
  }

  if (hasMonthCautionSignal) {
    warnings.push(
      lang === 'ko'
        ? `이번 달(${monthKey})은 속도보다 리스크 점검을 우선하는 편이 유리합니다.`
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
        ? `${domainLabel} 쪽은 바로 키우기보다 체크리스트로 확인한 뒤 움직이는 편이 안전합니다.`
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
      timingWindow: packet.topTimingWindow?.window,
      whyNow: sanitizeMatrixNarrativeLine(packet.topTimingWindow?.whyNow || ''),
      entryConditions: (packet.topTimingWindow?.entryConditions || [])
        .map((item) => sanitizeMatrixNarrativeLine(item))
        .filter(Boolean),
      abortConditions: (packet.topTimingWindow?.abortConditions || [])
        .map((item) => sanitizeMatrixNarrativeLine(item))
        .filter(Boolean),
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
    sanitizeMatrixNarrativeLine(input.fallbackSummary),
    sanitizeMatrixNarrativeLine(input.verdict),
    sanitizeMatrixNarrativeLine(input.topClaim),
    sanitizeMatrixNarrativeLine(input.topAnchorSummary),
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
    if (domain === 'career') return '커리어'
    if (domain === 'love') return '연애'
    if (domain === 'money') return '재정'
    if (domain === 'health') return '건강'
    if (domain === 'move') return '이동'
    return '전반'
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
    const peakText =
      peak === 'peak'
        ? '지금 밀기 좋은 흐름'
        : peak === 'high'
          ? '조금씩 속도를 올리기 좋은 흐름'
          : '무리 없이 운영하기 좋은 흐름'
    return dedupeTexts([
      `${domainLabel} 이슈는 ${peakText}입니다.`,
      describeEvidenceConfidence(confidence, 'ko'),
      describeCrossAgreement(agreement, 'ko'),
    ]).join(' ')
  }

  const peakText =
    peak === 'peak' ? 'peak window' : peak === 'high' ? 'rising window' : 'steady window'
  return dedupeTexts([
    `${domainLabel} is in a ${peakText}.`,
    describeEvidenceConfidence(confidence, 'en'),
    describeCrossAgreement(agreement, 'en'),
  ]).join(' ')
}


function buildMatrixStrictDescriptionFallback(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  summary: string
  guardrail?: string
}): string {
  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  const confidence = Math.max(0, Math.min(100, input.evidence.confidence ?? 0))
  const matrixVerdict = input.evidence.matrixVerdict
  const baseDetail =
    input.lang === 'ko'
      ? `${domainLabel} 이슈는 ${describePhaseFlow(matrixVerdict?.phase, 'ko')}`
      : `In ${domainLabel}, ${describePhaseFlow(matrixVerdict?.phase, 'en').toLowerCase()}`
  const confidenceDetail =
    input.lang === 'ko'
      ? confidence < 40
        ? '지금은 확정이나 결제처럼 되돌리기 어려운 결정일수록 한 번 더 검토하는 편이 안전합니다.'
        : describeExecutionStance(matrixVerdict?.attackPercent, matrixVerdict?.defensePercent, 'ko')
      : confidence < 40
        ? 'Confidence is low, so recheck before any irreversible commitment.'
        : describeExecutionStance(matrixVerdict?.attackPercent, matrixVerdict?.defensePercent, 'en')

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
        `${domainLabel} 관련해서 가장 중요한 일 한 가지부터 먼저 처리하세요.`,
        '결정 전에 체크리스트를 짧게라도 적어두세요.',
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
    ? ['신호가 약하거나 엇갈릴 때는 확정 전에 한 번 더 재검증하는 편이 안전합니다.']
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

  // 중복 카테고리 제거
  const uniqueCategories = [...new Set(date.categories)]

  // 번역된 요소만 포함 (번역 없으면 제외)
  const translatedSajuFactors = date.sajuFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)
    .map((text) => sanitizeCalendarCopy(text, lang))

  const translatedAstroFactors = date.astroFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)
    .map((text) => sanitizeCalendarCopy(text, lang))

  // Grade 3 이상(안좋음)에서는 부정적 요소를 먼저 표시
  let orderedSajuFactors = translatedSajuFactors
  let orderedAstroFactors = translatedAstroFactors

  if (date.grade >= 3) {
    // 부정적 키워드가 포함된 요소를 앞으로
    const negativeKeywords = [
      'ì¶©',
      '형',
      'í•´',
      '공망',
      'ì—­í–‰',
      '주의',
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
      ? '해석 갈림'
      : 'Mixed signals'
    : highGradePhaseConflict
      ? lang === 'ko'
        ? '검토 우선의 날'
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
        ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
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
      ? '신호가 엇갈립니다. 큰 결정은 재확인 후 진행하세요.'
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
          ? '핵심 결론: 지금은 확정보다 다시 확인하고 범위를 좁혀 움직이는 편이 안전합니다.'
          : 'Core conclusion: low confidence/cross-alignment, so operate in review-first mode.',
      ]).join(' ')
    : finalSummary,
    lang
  )
  const summarized = summarizedBase
  const actionSummaryCategory: EventCategory =
    evidenceWithVerdict.matrix.domain === 'career'
      ? 'career'
      : evidenceWithVerdict.matrix.domain === 'love'
        ? 'love'
        : evidenceWithVerdict.matrix.domain === 'money'
          ? 'wealth'
          : evidenceWithVerdict.matrix.domain === 'health'
            ? 'health'
            : evidenceWithVerdict.matrix.domain === 'move'
              ? 'travel'
              : uniqueCategories[0] || 'general'
  const actionSummary = buildActionSummary({
    lang,
    category: actionSummaryCategory,
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

// AI 백엔드에서 추가 날짜 정보 가져오기
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

// 위치 좌표
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
