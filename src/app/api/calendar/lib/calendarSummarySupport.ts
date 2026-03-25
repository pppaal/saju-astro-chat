import type {
  EventCategory,
  ImportanceGrade,
  ImportantDate,
} from '@/lib/destiny-map/destinyCalendar'
import type { CalendarEvidence } from '@/types/calendar-api'
import { KO_MESSAGES, EN_MESSAGES } from './constants'
import { DISPLAY_SCORE_LABEL_THRESHOLDS, EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'
import { repairMojibakeText } from '@/lib/text/mojibake'
import {
  describePhaseFlow,
  describeSajuAstroRole,
  describeTimingWindowBrief,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import { isAlignedAcrossSystems } from './calendarMatrixTextSupport'

type MessageGroup = string | Record<string, string>

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

function dedupeTexts(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const keys: string[] = []
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (!trimmed) continue
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

function resolveGradeMessage(
  group: MessageGroup | undefined,
  category: EventCategory
): string {
  if (typeof group === 'string') return group
  if (!group) return ''
  return group[category] || group.general || ''
}

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

  if (saju.some((key) => key.toLowerCase().includes('chung'))) {
    return lang === 'ko'
      ? '일진 충(沖)! 갈등과 급변에 주의하세요.'
      : 'Day Clash (沖)! Watch for conflicts.'
  }

  if (saju.some((key) => key.toLowerCase().includes('xing'))) {
    return lang === 'ko'
      ? '형(刑)살! 서류 실수, 법적 문제에 주의하세요.'
      : 'Punishment (刑)! Watch for legal issues.'
  }

  if (saju.includes('shinsal_gongmang')) {
    return lang === 'ko' ? '공망(空亡)! 계획이 무산되기 쉬운 날입니다.' : 'Void Day! Plans may fall through.'
  }

  if (saju.includes('shinsal_backho')) {
    return lang === 'ko' ? '백호살! 사고, 수술에 특히 주의하세요.' : 'White Tiger! Be careful of accidents.'
  }

  if (saju.includes('shinsal_guimungwan')) {
    return lang === 'ko'
      ? '귀문관! 정신적 혼란, 불안감에 주의하세요.'
      : 'Ghost Gate! Watch for mental confusion.'
  }

  if (saju.includes('stemGwansal')) {
    return lang === 'ko'
      ? '관살 기운! 외부 압박과 스트레스가 강합니다.'
      : 'Authority pressure! High stress expected.'
  }

  if (astro.includes('retrogradeMercury')) {
    return lang === 'ko'
      ? '수성 역행 중! 계약/소통에 오류가 생기기 쉬워요.'
      : 'Mercury retrograde! Communication errors likely.'
  }

  if (astro.includes('retrogradeVenus')) {
    return lang === 'ko'
      ? '금성 역행 중! 연애/재정 결정은 미루세요.'
      : 'Venus retrograde! Delay love/money decisions.'
  }

  if (astro.includes('voidOfCourse')) {
    return lang === 'ko'
      ? '달이 공허한 상태! 새 시작은 피하세요.'
      : 'Void of Course Moon! Avoid new starts.'
  }

  if (astro.includes('crossNegative')) {
    return lang === 'ko'
      ? '사주+점성술 모두 부정! 매우 조심하세요.'
      : 'Both Saju & Astro negative! Extra caution!'
  }

  if (astro.includes('conflictElement')) {
    return lang === 'ko' ? '오행 충돌! 에너지가 분산됩니다.' : 'Element clash! Energy scattered.'
  }

  return null
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
  const base = pickBySeed(seed, lang === 'ko' ? ko[category] || ko.general : en[category] || en.general)
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
  const category = categories[0] || 'general'
  const seed = `${dateSeed}|${category}|${score}|${grade}`
  const combinedFactors = [...(sajuFactorKeys || []), ...(astroFactorKeys || [])].map((factor) =>
    factor.toLowerCase()
  )

  const hasPositiveSignal = combinedFactors.some((factor) =>
    ['samhap', 'yukhap', 'cheoneul', 'majorluck', 'blessing', 'harmony', 'growth'].some((key) =>
      factor.includes(key)
    )
  )
  const hasCautionSignal = combinedFactors.some((factor) =>
    ['chung', 'xing', 'retrograde', 'gongmang', 'conflict', 'opposition', 'accident'].some((key) =>
      factor.includes(key)
    )
  )
  const categoryTail = buildCategoryToneTail(category, lang, grade, seed)
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
      base = resolveGradeMessage(KO_MESSAGES.GRADE_0, category)
    } else if (grade === 1) {
      base = resolveGradeMessage(KO_MESSAGES.GRADE_1, category)
    } else if (grade === 2 && score >= DISPLAY_SCORE_LABEL_THRESHOLDS.neutral) {
      base = resolveGradeMessage(KO_MESSAGES.GRADE_2_HIGH, category)
    } else if (grade === 2) {
      base = resolveGradeMessage(KO_MESSAGES.GRADE_2_LOW, category)
    } else if (grade === 3) {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
      base = reason ? `⚠️ ${reason}` : resolveGradeMessage(KO_MESSAGES.GRADE_3, category)
    } else {
      const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
      base = reason ? `🚨 ${reason}` : resolveGradeMessage(KO_MESSAGES.GRADE_4, category)
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
    return repairMojibakeText(
      dedupeTexts([base, categoryTail || '', sourceTail || '', ...tails]).join(' ')
    )
  }

  if (grade === 0) {
    base = resolveGradeMessage(EN_MESSAGES.GRADE_0, category)
  } else if (grade === 1) {
    base = resolveGradeMessage(EN_MESSAGES.GRADE_1, category)
  } else if (grade === 2 && score >= DISPLAY_SCORE_LABEL_THRESHOLDS.neutral) {
    base = resolveGradeMessage(EN_MESSAGES.GRADE_2_HIGH, category)
  } else if (grade === 2) {
    base = resolveGradeMessage(EN_MESSAGES.GRADE_2_LOW, category)
  } else if (grade === 3) {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `⚠️ ${reason}` : resolveGradeMessage(EN_MESSAGES.GRADE_3, category)
  } else {
    const reason = getBadDayReason(sajuFactorKeys, astroFactorKeys, lang)
    base = reason ? `🚨 ${reason}` : resolveGradeMessage(EN_MESSAGES.GRADE_4, category)
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

export function generateBestTimes(
  grade: ImportanceGrade,
  categories: EventCategory[],
  lang: 'ko' | 'en',
  confidence?: number,
  date?: Pick<ImportantDate, 'bestHours'>
): string[] {
  if (grade >= 3) {
    return []
  }

  const signalTimes = date ? buildBestTimesFromBestHours(date, lang) : []
  if (signalTimes.length > 0) {
    return maybeSoftenBestTimes(signalTimes, lang, confidence)
  }

  const category = categories[0] || 'general'

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
    return maybeSoftenBestTimes(times[category] || times.general, lang, confidence).map((item) =>
      repairMojibakeText(item)
    )
  }

  const times: Record<string, string[]> = {
    career: ['🌅 10am-12pm: Best for meetings', '🌆 2-4pm: Good for documents'],
    wealth: ['💰 9-11am: Financial deals', '📈 1-3pm: Investment decisions'],
    love: ['☕ 3-5pm: Perfect for dates', '🌙 7-9pm: Romantic time'],
    health: ['🌄 6-8am: Exercise boost', '🧘 6-8pm: Rest & meditation'],
    study: ['📚 9am-12pm: Peak focus', '🌙 8-10pm: Memory boost'],
    travel: ['✈️ 8-10am: Best departure', '🚗 2-4pm: Safe travel'],
    general: ['🌅 10am-12pm: Important tasks', '🌆 3-5pm: Meetings'],
  }
  return maybeSoftenBestTimes(times[category] || times.general, lang, confidence).map((item) =>
    repairMojibakeText(item)
  )
}

export function buildTimingSignals(input: {
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

  if (keys.some((key) => key.includes('daeun'))) add('대운 반영', 'Daeun active')
  if (keys.some((key) => key.includes('seun') || key.includes('saeun'))) {
    add('세운 반영', 'Annual cycle active')
  }
  if (keys.some((key) => key.includes('wolun'))) add('월운 반영', 'Monthly cycle active')
  if (keys.some((key) => key.includes('iljin') || key.includes('day'))) {
    add('일진 반영', 'Daily cycle active')
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
    add('변수 변화 신호', 'Transit signal')
  }
  if (date.transitSync?.isMajorTransitYear) {
    add('생활 흐름이 크게 바뀌기 쉬운 해', 'Major transit year')
  }
  if (matrixVerdict?.phase) {
    add(
      `현재 흐름: ${describePhaseFlow(matrixVerdict.phase, 'ko')}`,
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
    add('이번 달 특히 힘이 실리는 구간', 'Monthly peak window')
  } else if (peakLevel === 'high') {
    add('이번 달 속도를 올리기 좋은 흐름', 'Monthly rising window')
  }

  return signals.slice(0, 4).map((item) => (lang === 'ko' ? repairMojibakeText(item) : item))
}

export function buildActionSummary(input: {
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
