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
import type { SajuPillarAccessor, FormattedDate, LocationCoord } from './types'
import { getFactorTranslation } from './translations'
import { KO_MESSAGES, EN_MESSAGES } from './constants'
import {
  DISPLAY_SCORE_LABEL_THRESHOLDS,
  EVIDENCE_CONFIDENCE_THRESHOLDS,
} from '@/lib/destiny-map/calendar/scoring-config'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'

type MatrixSignal = {
  level: 'high' | 'medium' | 'caution'
  trigger: string
  score: number
}

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
    includesToken(warningKeyBlob, CAUTION_WARNING_TOKENS)

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

export function gateRecommendations(input: RecommendationGateInput): string[] {
  const shouldGate = shouldGateRecommendationSet(input)
  const candidateLines =
    shouldGate && input.irreversibleKeyPresent ? [] : [...input.recommendations]

  if (!shouldGate) {
    return dedupeTexts(candidateLines).slice(0, 6)
  }

  const filtered = candidateLines
    .filter((line) => !isIrreversibleRecommendationText(line))
    .map((line) => softenRecommendationTone(line, input.lang))
    .filter(Boolean)

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

  const merged = filtered.length > 0 ? filtered : fallback
  const hasVerificationCue = merged.some((line) =>
    /\uAC80\uD1A0|\uC7AC\uD655\uC778|24\uC2DC\uAC04|review|verify|recheck|draft|24 hours/i.test(
      line
    )
  )

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
    return dedupeTexts([base, ...tails]).join(' ')
  }

  if (grade === 0) {
    base = EN_MESSAGES.GRADE_0[cat] || EN_MESSAGES.GRADE_0.general
  } else if (grade === 1) {
    base = EN_MESSAGES.GRADE_1[cat] || EN_MESSAGES.GRADE_1.general
  } else if (grade === 2 && score >= DISPLAY_SCORE_LABEL_THRESHOLDS.neutral) {
    base = EN_MESSAGES.GRADE_2_HIGH
  } else if (grade === 2) {
    base = EN_MESSAGES.GRADE_2_LOW
  } else if (grade === 3) {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `⚠️ ${reason}` : EN_MESSAGES.GRADE_3
  } else {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `🚨 ${reason}` : EN_MESSAGES.GRADE_4
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

function dedupeTexts(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }
    seen.add(trimmed)
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
      : 'Punishment (åˆ‘)! Watch for legal issues.'
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
  lang: 'ko' | 'en'
): string[] {
  // Grade 3(안좋음), Grade 4(최악)은 시간 추천 없음
  if (grade >= 3) {
    return []
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
    return times[cat] || times.general
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
    return times[cat] || times.general
  }
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
    general: ['Cut today’s priorities down to two.', 'Delay low-impact requests without guilt.'],
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
    getTranslation(`calendar.recommendations.${key}`, translations)
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
    getTranslation(`calendar.warnings.${key}`, translations)
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
  square: '□',
  trine: '△',
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
    bridges.push(
      lang === 'ko'
        ? detail.tone === 'negative'
          ? `A${index + 1} ↔ S${index + 1}: 점성 긴장 신호와 사주 경계 신호가 겹칩니다. 계약·의사결정은 재확인이 유리합니다.`
          : isAligned
            ? `A${index + 1} ↔ S${index + 1}: 점성 호조와 사주 지원 신호가 겹칩니다. 핵심 과제 1~2개를 밀어붙이기 좋습니다.`
            : `A${index + 1} ↔ S${index + 1}: 지지 신호가 부분적으로 보이지만 교차 정합도가 낮아 확정 전 재확인이 필요합니다.`
        : detail.tone === 'negative'
          ? `A${index + 1} ↔ S${index + 1}: Astro friction and Saju caution align. Re-check contracts and key decisions.`
          : isAligned
            ? `A${index + 1} ↔ S${index + 1}: Astro support and Saju support align. Push one or two core priorities.`
            : `A${index + 1} ↔ S${index + 1}: Support signals exist, but cross-agreement is low. Re-check before final commitments.`
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
                ? 'A1 ↔ S1: 점성과 사주 근거가 같은 방향을 지지합니다.'
                : 'A1 ↔ S1: 신호가 엇갈립니다. 확정 전 재확인이 유리합니다.'
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
    love: '연애',
    money: '재물',
    health: '건강',
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

  const summaryParts: string[] = []
  const recommendations: string[] = []
  const warnings: string[] = []

  if (monthPoint?.peakLevel === 'peak') {
    summaryParts.push(
      lang === 'ko'
        ? `destiny-matrix 피크월(${monthKey}) 영향으로 타이밍 적중도가 높습니다.`
        : `Destiny-matrix peak month (${monthKey}) boosts timing precision.`
    )
  } else if (monthPoint?.peakLevel === 'high') {
    summaryParts.push(
      lang === 'ko'
        ? `destiny-matrix 고집중월(${monthKey}) 구간으로 실행력이 올라갑니다.`
        : `Destiny-matrix high-focus month (${monthKey}) supports execution.`
    )
  }

  if (topDomain) {
    if (lang === 'ko') {
      recommendations.push(
        `${koDomainLabel[topDomain]} 도메인 피크 흐름입니다. 해당 영역 우선순위를 가장 앞에 두세요.`
      )
    } else {
      recommendations.push(`${topDomain} domain is peaking. Put it at the top of your priorities.`)
    }
  }

  if (weightedDomain && domainWeight >= 0.55) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    if (lang === 'ko') {
      recommendations.push(
        domainWeight >= 0.75
          ? `${domainLabel} 테마를 오늘의 최우선 실행과제로 두세요.`
          : `${domainLabel} 테마 관련 일정은 오전 시간대에 먼저 배치하세요.`
      )
      summaryParts.push(
        `${domainLabel} 테마의 destiny-matrix 가중치가 높아 실행 적중도가 좋은 날입니다.`
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

  if (cautionSignals.length > 0) {
    warnings.push(
      lang === 'ko'
        ? 'matrix 주의 시그널이 감지되어 검토 단계를 한 번 더 거치세요.'
        : 'Matrix caution signals detected. Add an extra verification step.'
    )
  }

  if (hasMonthCautionSignal) {
    warnings.push(
      lang === 'ko'
        ? `이번 달(${monthKey})은 의사결정 속도보다 리스크 점검이 유리합니다.`
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
        ? `${domainLabel} 테마는 확장 전에 검증 체크리스트를 거치는 것이 안전합니다.`
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

export function formatDateForResponse(
  date: ImportantDate,
  locale: string,
  koTranslations: TranslationData,
  enTranslations: TranslationData,
  matrixContext?: MatrixCalendarContext
): FormattedDate {
  const translations = locale === 'ko' ? koTranslations : enTranslations
  const lang = locale === 'ko' ? 'ko' : 'en'

  // 중복 카테고리 제거
  const uniqueCategories = [...new Set(date.categories)]

  // 번역된 요소만 포함 (번역 없으면 제외)
  const translatedSajuFactors = date.sajuFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)

  const translatedAstroFactors = date.astroFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)

  // Grade 3 이상(안좋음)에서는 부정적 요소를 먼저 표시
  let orderedSajuFactors = translatedSajuFactors
  let orderedAstroFactors = translatedAstroFactors

  if (date.grade >= 3) {
    // 부정적 키워드가 포함된 요소를 앞으로
    const negativeKeywords = [
      '충',
      '형',
      '해',
      '공망',
      '역행',
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

  const bestTimes = generateBestTimes(date.grade, uniqueCategories, lang)
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
    date.crossAgreementPercent,
    crossEvidence
  )
  const displayScore = date.displayScore ?? date.adjustedScore ?? date.score
  const rawScore = date.rawScore ?? date.score
  const adjustedScore = date.adjustedScore ?? displayScore
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
  const finalSummary = matrixOverlay.summary
    ? dedupeTexts([matrixOverlay.summary, baseSummary]).join(' ')
    : baseSummary
  const coherenceConfidence = date.confidence ?? matrixOverlay.evidence.confidence
  const coherenceAgreement =
    date.crossAgreementPercent ?? matrixOverlay.evidence.crossAgreementPercent
  const lowCoherence = isLowCoherenceSignal(coherenceConfidence, coherenceAgreement)
  const forceConservativeMode = date.grade <= 1 && lowCoherence

  const defaultTitle = getTranslation(date.titleKey, translations)
  const title = forceConservativeMode
    ? lang === 'ko'
      ? '해석 갈림'
      : 'Mixed signals'
    : defaultTitle
  const warningsForResponseBase = dedupeTexts([...warnings, ...matrixOverlay.warnings]).slice(0, 6)
  const warningsForResponse = forceConservativeMode
    ? dedupeTexts([
        ...warningsForResponseBase,
        lang === 'ko'
          ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
          : 'Communication errors are more likely today. Re-check before committing.',
      ]).slice(0, 6)
    : warningsForResponseBase
  const recommendationsForResponse = gateRecommendations({
    recommendations: dedupeTexts([...recommendations, ...matrixOverlay.recommendations]).slice(
      0,
      6
    ),
    recommendationKeys: date.recommendationKeys,
    warningKeys: date.warningKeys,
    warnings: warningsForResponse,
    confidence: matrixOverlay.evidence.confidence ?? date.confidence,
    grade: date.grade,
    title,
    summary: finalSummary,
    lang,
    forceGate: forceConservativeMode,
    irreversibleKeyPresent: date.recommendationKeys.some((key) =>
      IRREVERSIBLE_RECOMMENDATION_KEYS.has(key)
    ),
  })
  const finalDescription = forceConservativeMode
    ? lang === 'ko'
      ? '신호가 엇갈립니다. 큰 결정은 재확인 후 진행하세요.'
      : 'Signals are mixed. Re-check major decisions before committing.'
    : getTranslation(date.descKey, translations)
  const summarized = forceConservativeMode
    ? dedupeTexts([
        finalSummary,
        lang === 'ko'
          ? '핵심 결론: 신뢰도/교차 정합이 낮아 검토 중심으로 운영하는 편이 안전합니다.'
          : 'Core conclusion: low confidence/cross-alignment, so operate in review-first mode.',
      ]).join(' ')
    : finalSummary

  return normalizeMojibakePayload({
    date: date.date,
    grade: date.grade,
    score: displayScore,
    rawScore,
    adjustedScore,
    displayScore,
    categories: uniqueCategories,
    title,
    description: finalDescription,
    summary: summarized,
    bestTimes,
    sajuFactors: orderedSajuFactors,
    astroFactors: orderedAstroFactors,
    recommendations: recommendationsForResponse,
    warnings: warningsForResponse,
    evidence: matrixOverlay.evidence,
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
  try {
    const response = await apiClient.post(
      '/api/theme/important-dates',
      {
        theme,
        saju: sajuData,
        astro: astroData,
      },
      { timeout: 20000, retries: 2, retryDelay: 800 }
    )

    if (response.ok && response.data) {
      const resData = response.data as { auspicious_dates?: string[]; caution_dates?: string[] }
      return {
        auspicious: (resData.auspicious_dates || []).map((date) => ({ date, is_auspicious: true })),
        caution: (resData.caution_dates || []).map((date) => ({ date, is_auspicious: false })),
      }
    }
    logger.warn('[Calendar] AI backend returned non-ok response', {
      status: response.status,
      error: response.error,
    })
  } catch (error) {
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
