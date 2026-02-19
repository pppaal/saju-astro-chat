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
import { SCORE_THRESHOLDS } from '@/constants/scoring'

type MatrixSignal = {
  level: 'high' | 'medium' | 'caution'
  trigger: string
  score: number
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

// í•œì¤„ ìš”ì•½ ìƒì„±
export function generateSummary(
  grade: ImportanceGrade,
  categories: EventCategory[],
  score: number,
  lang: 'ko' | 'en',
  sajuFactorKeys?: string[],
  astroFactorKeys?: string[],
  crossVerified: boolean = false,
  dateSeed: string = ''
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
    } else if (grade === 2 && score >= SCORE_THRESHOLDS.AVERAGE) {
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
    if (crossVerified) {
      tails.push('사주·점성 시그널이 같은 방향으로 맞물립니다.')
    }
    if (grade <= 2 && hasPositiveSignal) {
      tails.push('좋은 흐름이 겹치니 핵심 1~2개 목표에 집중하세요.')
    }
    if (grade >= 3 && hasCautionSignal) {
      tails.push('속도보다 검토를 우선하고, 큰 결정보다 리스크 관리가 유리합니다.')
    }
    if (score >= 70) {
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
  } else if (grade === 2 && score >= SCORE_THRESHOLDS.AVERAGE) {
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
  if (crossVerified) {
    tails.push('Saju and astrology are aligned in the same direction.')
  }
  if (grade <= 2 && hasPositiveSignal) {
    tails.push('Multiple supportive signals overlap. Focus on 1-2 core priorities.')
  }
  if (grade >= 3 && hasCautionSignal) {
    tails.push('Prioritize verification over speed and avoid major commitments.')
  }
  if (score >= 70) {
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

  // ì¶©(æ²–) - ê°€ìž¥ ê°•ë ¥í•œ ë¶€ì • ìš”ì†Œ
  if (saju.some((k) => k.toLowerCase().includes('chung'))) {
    return lang === 'ko'
      ? 'ì¼ì§„ ì¶©(æ²–)! ê°ˆë“±ê³¼ ê¸‰ë³€ì— ì£¼ì˜í•˜ì„¸ìš”.'
      : 'Day Clash (æ²–)! Watch for conflicts.'
  }

  // í˜•(åˆ‘)
  if (saju.some((k) => k.toLowerCase().includes('xing'))) {
    return lang === 'ko'
      ? 'í˜•(åˆ‘)ì‚´! ì„œë¥˜ ì‹¤ìˆ˜, ë²•ì  ë¬¸ì œì— ì£¼ì˜í•˜ì„¸ìš”.'
      : 'Punishment (åˆ‘)! Watch for legal issues.'
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
    return lang === 'ko'
      ? 'ì˜¤í–‰ ì¶©ëŒ! ì—ë„ˆì§€ê°€ ë¶„ì‚°ë©ë‹ˆë‹¤.'
      : 'Element clash! Energy scattered.'
  }

  return null
}

// ì¶”ì²œ ì‹œê°„ëŒ€ ìƒì„±
export function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: 'ko' | 'en'
): string[] {
  // Grade 3(ë³´í†µ), Grade 4(ë‚˜ìœ ë‚ )ëŠ” ì‹œê°„ ì¶”ì²œ ì—†ìŒ
  if (grade >= 3) {
    return []
  }

  const cat = categories[0] || 'general'

  if (lang === 'ko') {
    const times: Record<string, string[]> = {
      career: [
        'ðŸŒ… ì˜¤ì „ 10-12ì‹œ: ë¯¸íŒ…/í˜‘ìƒ ìµœì ',
        'ðŸŒ† ì˜¤í›„ 2-4ì‹œ: ì„œë¥˜/ê³„ì•½ ìœ ë¦¬',
      ],
      wealth: [
        'ðŸ’° ì˜¤ì „ 9-11ì‹œ: ê¸ˆìœµ ê±°ëž˜ ìœ ë¦¬',
        'ðŸ“ˆ ì˜¤í›„ 1-3ì‹œ: íˆ¬ìž ê²°ì • ì í•©',
      ],
      love: ['â˜• ì˜¤í›„ 3-5ì‹œ: ë°ì´íŠ¸ ìµœì ', 'ðŸŒ™ ì €ë… 7-9ì‹œ: ë¡œë§¨í‹±í•œ ì‹œê°„'],
      health: ['ðŸŒ„ ì˜¤ì „ 6-8ì‹œ: ìš´ë™ íš¨ê³¼ UP', 'ðŸ§˜ ì €ë… 6-8ì‹œ: íœ´ì‹/ëª…ìƒ ì¶”ì²œ'],
      study: ['ðŸ“š ì˜¤ì „ 9-12ì‹œ: ì§‘ì¤‘ë ¥ ìµœê³ ', 'ðŸŒ™ ì €ë… 8-10ì‹œ: ì•”ê¸°ë ¥ UP'],
      travel: ['âœˆï¸ ì˜¤ì „ 8-10ì‹œ: ì¶œë°œ ì¶”ì²œ', 'ðŸš— ì˜¤í›„ 2-4ì‹œ: ì´ë™ ì•ˆì „'],
      general: ['ðŸŒ… ì˜¤ì „ 10-12ì‹œ: ì¤‘ìš”í•œ ì¼ ì²˜ë¦¬', 'ðŸŒ† ì˜¤í›„ 3-5ì‹œ: ë¯¸íŒ…/ì•½ì†'],
    }
    return times[cat] || times.general
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
  const translated = date.recommendationKeys.map((key) =>
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
  return dedupeTexts([...translated, categoryAction, factorAction || '', timeHint || '']).slice(
    0,
    6
  )
}

function buildEnhancedWarnings(
  date: ImportantDate,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string[] {
  const translated = date.warningKeys.map((key) =>
    getTranslation(`calendar.warnings.${key}`, translations)
  )
  const contextual = buildContextWarnings(
    date.grade,
    [...date.sajuFactorKeys, ...date.astroFactorKeys],
    lang
  )
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

function buildMatrixOverlay(
  dateIso: string,
  matrixContext: MatrixCalendarContext,
  categories: EventCategory[],
  lang: 'ko' | 'en',
  cross: { sajuEvidence?: string; astroEvidence?: string }
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
        },
        confidence: 0,
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
    },
    confidence: Math.max(0, Math.min(100, confidence)),
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

  // ì¤‘ë³µ ì¹´í…Œê³ ë¦¬ ì œê±°
  const uniqueCategories = [...new Set(date.categories)]

  // ë²ˆì—­ëœ ìš”ì†Œë§Œ í¬í•¨ (ë²ˆì—­ ì—†ìœ¼ë©´ ì œì™¸)
  const translatedSajuFactors = date.sajuFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)

  const translatedAstroFactors = date.astroFactorKeys
    .map((key) => getFactorTranslation(key, lang))
    .filter((t): t is string => t !== null)

  // Grade 3 ì´ìƒ(ë‚˜ìœ ë‚ )ì—ì„œëŠ” ë¶€ì •ì  ìš”ì†Œë¥¼ ë¨¼ì € ë³´ì—¬ì£¼ê¸°
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

  const bestTimes = generateBestTimes(date.grade, uniqueCategories, lang)
  const recommendations = buildEnhancedRecommendations(
    date,
    uniqueCategories,
    bestTimes,
    translations,
    lang
  )
  const warnings = buildEnhancedWarnings(date, translations, lang)
  const matrixOverlay = buildMatrixOverlay(
    date.date,
    matrixContext || null,
    uniqueCategories,
    lang,
    {
      sajuEvidence: orderedSajuFactors[0],
      astroEvidence: orderedAstroFactors[0],
    }
  )
  const baseSummary = generateSummary(
    date.grade,
    uniqueCategories,
    date.score,
    lang,
    date.sajuFactorKeys,
    date.astroFactorKeys,
    date.crossVerified,
    date.date
  )
  const finalSummary = matrixOverlay.summary
    ? dedupeTexts([matrixOverlay.summary, baseSummary]).join(' ')
    : baseSummary

  return {
    date: date.date,
    grade: date.grade,
    score: date.score,
    categories: uniqueCategories,
    title: getTranslation(date.titleKey, translations),
    description: getTranslation(date.descKey, translations),
    summary: finalSummary,
    bestTimes,
    sajuFactors: orderedSajuFactors,
    astroFactors: orderedAstroFactors,
    recommendations: dedupeTexts([...recommendations, ...matrixOverlay.recommendations]).slice(
      0,
      6
    ),
    warnings: dedupeTexts([...warnings, ...matrixOverlay.warnings]).slice(0, 6),
    evidence: matrixOverlay.evidence,
  }
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
  try {
    const response = await apiClient.post(
      '/api/theme/important-dates',
      {
        theme,
        saju: sajuData,
        astro: astroData,
      },
      { timeout: 20000 }
    )

    if (response.ok && response.data) {
      const resData = response.data as { auspicious_dates?: string[]; caution_dates?: string[] }
      return {
        auspicious: (resData.auspicious_dates || []).map((date) => ({ date, is_auspicious: true })),
        caution: (resData.caution_dates || []).map((date) => ({ date, is_auspicious: false })),
      }
    }
  } catch (error) {
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
