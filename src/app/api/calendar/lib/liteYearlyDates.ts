import type {
  DomainKey,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from '@/lib/destiny-matrix/types'
import type { EventCategory, ImportanceGrade } from '@/lib/destiny-map/calendar/types'
import type { UserAstroProfile, UserSajuProfile } from '@/lib/destiny-map/calendar/types'

type CalendarLocale = 'ko' | 'en'

type LiteMatrixCalendarContext = {
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Partial<Record<DomainKey, MonthlyOverlapPoint[]>>
  timingCalibration?: TimingCalibrationSummary
  domainScores?: Partial<
    Record<
      DomainKey,
      {
        finalScoreAdjusted?: number
      }
    >
  >
}

export interface LiteImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  titleKey: string
  descKey: string
  ganzhi: string
  crossVerified: boolean
  transitSunSign: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
  recommendationKeys: string[]
  warningKeys: string[]
  confidence?: number
  confidenceNote?: string
  crossAgreementPercent?: number
}

type LiteOptions = {
  category?: EventCategory
  limit?: number
  minGrade?: ImportanceGrade
  locale?: CalendarLocale
  matrixContext?: LiteMatrixCalendarContext | null
}

const DOMAIN_TO_CATEGORY: Record<DomainKey, EventCategory> = {
  career: 'career',
  love: 'love',
  money: 'wealth',
  health: 'health',
  move: 'travel',
}

const DOMAIN_LABELS: Record<CalendarLocale, Record<DomainKey, string>> = {
  ko: {
    career: '커리어',
    love: '관계',
    money: '재정',
    health: '건강',
    move: '이동',
  },
  en: {
    career: 'career',
    love: 'relationship',
    money: 'finance',
    health: 'health',
    move: 'movement',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`
}

function categoryMatchesFilter(categories: EventCategory[], filter?: EventCategory): boolean {
  return !filter || categories.includes(filter)
}

function scoreToGrade(score: number): ImportanceGrade {
  if (score >= 86) return 0
  if (score >= 72) return 1
  if (score >= 56) return 2
  if (score >= 38) return 3
  return 4
}

type StrengthTier = 'rising' | 'aligned' | 'wavering' | 'guarded'

function tierFromStrength(strength: number): StrengthTier {
  if (strength >= 0.78) return 'rising'
  if (strength >= 0.6) return 'aligned'
  if (strength >= 0.42) return 'wavering'
  return 'guarded'
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickBySeed<T>(seed: string, list: readonly T[]): T {
  if (!list.length) return undefined as unknown as T
  return list[hashSeed(seed) % list.length]
}

const STEM_TO_ELEMENT: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  甲: 'wood', 乙: 'wood',
  丙: 'fire', 丁: 'fire',
  戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal',
  壬: 'water', 癸: 'water',
}

const ELEMENT_LABEL_KO: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
}

const ELEMENT_LABEL_EN: Record<string, string> = {
  wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water',
}

function seasonElement(month: number): 'wood' | 'fire' | 'earth' | 'metal' | 'water' {
  if (month >= 3 && month <= 5) return 'wood'
  if (month >= 6 && month <= 8) return 'fire'
  if (month === 9) return 'earth'
  if (month >= 10 && month <= 11) return 'metal'
  return 'water'
}

const ELEMENT_RELATIONS: Record<string, Record<string, 'same' | 'support' | 'drain' | 'control' | 'controlled'>> = {
  wood: { wood: 'same', fire: 'drain', earth: 'control', metal: 'controlled', water: 'support' },
  fire: { fire: 'same', earth: 'drain', metal: 'control', water: 'controlled', wood: 'support' },
  earth: { earth: 'same', metal: 'drain', water: 'control', wood: 'controlled', fire: 'support' },
  metal: { metal: 'same', water: 'drain', wood: 'control', fire: 'controlled', earth: 'support' },
  water: { water: 'same', wood: 'drain', fire: 'control', earth: 'controlled', metal: 'support' },
}

function getMonthStrength(rows: MonthlyOverlapPoint[] | undefined, month: string): number {
  if (!rows?.length) return 0
  return rows
    .filter((item) => item.month === month)
    .reduce((max, item) => Math.max(max, item.overlapStrength || 0), 0)
}

function getDomainBase(
  matrixContext: LiteMatrixCalendarContext | null | undefined,
  domain: DomainKey
): number {
  const raw = matrixContext?.domainScores?.[domain]?.finalScoreAdjusted
  if (!Number.isFinite(raw)) return 0.52
  return clamp(Number(raw) / 10, 0, 1)
}

function pickTopDomains(
  matrixContext: LiteMatrixCalendarContext | null | undefined,
  currentMonthKey: string
): Array<{ domain: DomainKey; score: number }> {
  const domains: DomainKey[] = ['career', 'love', 'money', 'health', 'move']
  return domains
    .map((domain) => {
      const monthStrength = getMonthStrength(
        matrixContext?.overlapTimelineByDomain?.[domain],
        currentMonthKey
      )
      const score = getDomainBase(matrixContext, domain) * 0.55 + monthStrength * 0.45
      return { domain, score: clamp(score, 0, 1) }
    })
    .sort((left, right) => right.score - left.score)
}

const TITLE_POOL_KO: Record<DomainKey, Record<StrengthTier, string[]>> = {
  career: {
    rising: ['커리어 추진력이 살아나는 날', '커리어 결단을 가져갈 만한 날', '커리어 점화가 강한 날'],
    aligned: ['커리어 흐름이 가지런해지는 날', '커리어 우선순위가 잘 잡히는 날', '커리어 실행에 무리가 없는 날'],
    wavering: ['커리어 점검이 필요한 날', '커리어 속도를 한 호흡 늦출 날', '커리어 조정이 들어갈 날'],
    guarded: ['커리어 보수 운영이 필요한 날', '커리어 무리수를 막아둘 날', '커리어 잠시 물러설 날'],
  },
  love: {
    rising: ['관계의 온도가 오르는 날', '대화가 풀리는 관계의 날', '관계 신호가 또렷한 날'],
    aligned: ['관계 결이 맞아드는 날', '감정 정리에 좋은 날', '관계 한 걸음 다가설 날'],
    wavering: ['관계 거리 조정이 필요한 날', '관계 신호가 엇갈리는 날', '대화 톤을 낮출 날'],
    guarded: ['관계 보수 운영의 날', '관계 충돌을 피해갈 날', '관계 표현 자제가 좋은 날'],
  },
  money: {
    rising: ['재정 결정이 가벼워지는 날', '돈 흐름에 활기가 있는 날', '재정 실행이 살아나는 날'],
    aligned: ['재정 점검과 정렬에 좋은 날', '예산을 다듬기 좋은 날', '소비-수입 균형의 날'],
    wavering: ['재정 점검이 우선인 날', '큰 지출을 미룰 날', '재정 신호가 흐릿한 날'],
    guarded: ['재정 보수 운영의 날', '큰 결제 자제할 날', '재정 보호 우선의 날'],
  },
  health: {
    rising: ['컨디션 회복이 빠른 날', '루틴 회복에 좋은 날', '몸 신호가 또렷한 날'],
    aligned: ['건강 점검에 좋은 날', '체력 정렬의 날', '리듬 잡기에 무난한 날'],
    wavering: ['건강 무리를 피할 날', '몸 신호 점검이 필요한 날', '회복 우선의 날'],
    guarded: ['건강 보수 운영의 날', '체력 비축이 우선인 날', '몸 사릴 날'],
  },
  move: {
    rising: ['이동·추진이 가벼운 날', '환경 전환에 좋은 날', '이동 결정이 매끄러운 날'],
    aligned: ['이동 일정 정리의 날', '동선 점검에 좋은 날', '환경 조정의 날'],
    wavering: ['이동 점검이 필요한 날', '동선 변경 자제할 날', '이동 결정 미룰 날'],
    guarded: ['이동 보수 운영의 날', '큰 이동 자제할 날', '환경 변화 신중히 갈 날'],
  },
}

const TITLE_POOL_EN: Record<DomainKey, Record<StrengthTier, string[]>> = {
  career: {
    rising: ['Career momentum day', 'Strong push for career calls', 'Career-decision-friendly day'],
    aligned: ['Career flow lines up well', 'Career priorities settle cleanly', 'Smooth career execution day'],
    wavering: ['Career review day', 'Slow down career pace', 'Career adjustment day'],
    guarded: ['Conservative career day', 'Hold career bets today', 'Career step-back day'],
  },
  love: {
    rising: ['Warm relationship day', 'Conversations open up', 'Clear relationship signals'],
    aligned: ['Relationship alignment day', 'Good for emotional reset', 'Relationship step-forward day'],
    wavering: ['Relationship distance review', 'Mixed relationship signals', 'Lower the conversation tone'],
    guarded: ['Conservative relationship day', 'Avoid relationship friction', 'Hold expressions today'],
  },
  money: {
    rising: ['Money decisions feel light', 'Active money flow day', 'Finance execution day'],
    aligned: ['Good for finance review', 'Budget alignment day', 'Income-spend balance day'],
    wavering: ['Finance review day', 'Defer large spending', 'Finance signals are fuzzy'],
    guarded: ['Conservative finance day', 'Hold large payments', 'Finance protection day'],
  },
  health: {
    rising: ['Quick recovery day', 'Good for routine reset', 'Clear body signals'],
    aligned: ['Health review day', 'Body alignment day', 'Rhythm-building day'],
    wavering: ['Avoid health strain today', 'Check body signals', 'Recovery-first day'],
    guarded: ['Conservative health day', 'Save energy day', 'Health step-back day'],
  },
  move: {
    rising: ['Smooth movement day', 'Environment-shift day', 'Move decisions feel light'],
    aligned: ['Schedule cleanup day', 'Route check day', 'Environment adjustment day'],
    wavering: ['Movement review day', 'Hold route changes', 'Defer move decisions'],
    guarded: ['Conservative movement day', 'Avoid major moves', 'Tread cautiously'],
  },
}

function buildTitle(
  locale: CalendarLocale,
  domain: DomainKey,
  tier: StrengthTier,
  seed: string
): string {
  const pool = (locale === 'ko' ? TITLE_POOL_KO : TITLE_POOL_EN)[domain][tier]
  return pickBySeed(seed, pool)
}

function buildDescription(
  locale: CalendarLocale,
  domain: DomainKey,
  tier: StrengthTier,
  dominanceGap: number,
  crossAgreementPercent: number,
  seed: string
): string {
  const label = DOMAIN_LABELS[locale][domain]
  const focusKo =
    dominanceGap >= 0.18 ? `${label} 단일 축에` : `${label}을 중심으로 보조 축까지`
  const focusEn =
    dominanceGap >= 0.18 ? `solely on ${label}` : `${label} with a secondary axis in support`
  const crossPhraseKo =
    crossAgreementPercent >= 70
      ? '사주·점성 신호가 같은 방향을 가리킵니다'
      : crossAgreementPercent >= 50
        ? '큰 줄기는 맞지만 세부 신호가 갈립니다'
        : '신호가 엇갈립니다'
  const crossPhraseEn =
    crossAgreementPercent >= 70
      ? 'saju and astrology point the same way'
      : crossAgreementPercent >= 50
        ? 'the broad direction holds but details diverge'
        : 'signals are mixed'

  const corePoolKo: Record<StrengthTier, string[]> = {
    rising: [
      `${label} 추진력이 분명히 살아 있어 ${focusKo} 우선순위를 좁혀 실행하기 좋습니다.`,
      `${label} 결단의 무게를 가져갈 만큼 흐름이 받쳐주는 날이라 작은 일은 뒤로 미뤄도 됩니다.`,
      `${label} 신호가 또렷해 결과까지 끌고 갈 수 있는 날입니다. ${crossPhraseKo}.`,
    ],
    aligned: [
      `${label} 흐름이 가지런해 ${focusKo} 일정과 우선순위를 정리하기 좋습니다.`,
      `${label} 축이 안정적이라 큰 무리수보다 가볍게 진도 빼는 편이 효율적입니다.`,
      `${label} 결이 맞아들어 작은 결정 여러 개를 묶어 처리할 수 있습니다.`,
    ],
    wavering: [
      `${label} 축은 살아 있지만 ${crossPhraseKo}. 실행보다 조건 확인이 먼저입니다.`,
      `${label} 신호가 흔들리니 범위를 좁히고 결정 기한을 다음 날로 미뤄도 됩니다.`,
      `${label} 흐름은 보이지만 확신을 크게 싣기엔 이른 날입니다.`,
    ],
    guarded: [
      `${label} 축에 제약이 큰 날입니다. ${crossPhraseKo}. 무리하게 확정하지 말고 리스크를 줄이세요.`,
      `${label} 추진력이 약한 날이라 큰 결정은 다음 흐름까지 보류하는 편이 안전합니다.`,
      `${label} 신호가 약하니 새 일을 벌이기보다 기존 흐름을 정리해 두세요.`,
    ],
  }

  const corePoolEn: Record<StrengthTier, string[]> = {
    rising: [
      `${label} momentum is clear; lean ${focusEn} and tighten priorities to push real outcomes.`,
      `${label} carries enough weight today to make decisive moves while smaller tasks can wait.`,
      `${label} signals are sharp; ${crossPhraseEn}, so follow through to a clean outcome.`,
    ],
    aligned: [
      `${label} flow is steady; focus ${focusEn} and clean up the schedule.`,
      `${label} is stable enough for batch progress without aggressive moves.`,
      `${label} alignment lets you bundle small decisions efficiently.`,
    ],
    wavering: [
      `${label} is active but ${crossPhraseEn}; verify conditions before executing.`,
      `${label} signals wobble; narrow the scope and delay binding decisions by one day.`,
      `${label} is visible but not clean enough for a hard commitment today.`,
    ],
    guarded: [
      `${label} faces stronger constraints than momentum. ${crossPhraseEn}; reduce risk rather than push.`,
      `${label} pull is weak today; defer large decisions to the next cycle.`,
      `${label} signals are thin; consolidate existing work instead of starting new.`,
    ],
  }

  const pool = locale === 'ko' ? corePoolKo[tier] : corePoolEn[tier]
  return pickBySeed(seed, pool)
}

function buildSajuFactors(
  locale: CalendarLocale,
  profile: UserSajuProfile,
  domain: DomainKey,
  month: number,
  seed: string
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const dayMaster = profile.dayMaster || ''
  const dayElement = (profile.dayMasterElement as string) || STEM_TO_ELEMENT[dayMaster] || 'earth'
  const seasonEl = seasonElement(month)
  const relation = ELEMENT_RELATIONS[dayElement]?.[seasonEl] || 'same'
  const elLabel = (locale === 'ko' ? ELEMENT_LABEL_KO : ELEMENT_LABEL_EN)[seasonEl]

  if (locale === 'ko') {
    const dayLine = dayMaster
      ? `일간 ${dayMaster}(${ELEMENT_LABEL_KO[dayElement]})은 이번 ${elLabel} 기운과 ${relationLabelKo(relation)} 관계라 ${label} 쪽으로 ${relationActionKo(relation)}.`
      : `일간 흐름은 이번 ${elLabel} 기운과 만나 ${label} 축의 ${relationActionKo(relation)}.`
    const cycleLines = [
      `대운·세운의 기본 구조는 ${label} 판단을 한 번에 넓히기보다 단계로 다루기를 지지합니다.`,
      `이번 달 사주 결은 ${label} 축의 우선순위를 ${relation === 'support' || relation === 'same' ? '올립니다' : relation === 'control' ? '눌러둡니다' : '잠시 흐트러뜨립니다'}.`,
      `${profile.dayBranch ? `일지 ${profile.dayBranch}` : '일지'}와 월령 사이의 결이 ${label} 쪽 결정의 ${relation === 'support' ? '추진' : '점검'} 신호를 만듭니다.`,
    ]
    return [dayLine, pickBySeed(seed, cycleLines)]
  }
  const dayLine = dayMaster
    ? `Day-master ${dayMaster} (${ELEMENT_LABEL_EN[dayElement]}) meets the current ${elLabel} season as a ${relationLabelEn(relation)} pairing, ${relationActionEn(relation)} ${label}.`
    : `The day-master frame meets ${elLabel} season and ${relationActionEn(relation)} ${label}.`
  const cycleLines = [
    `Long-cycle structure prefers handling ${label} step-by-step rather than expanding all at once.`,
    `This month's saju lift on ${label} is ${relation === 'support' || relation === 'same' ? 'positive' : relation === 'control' ? 'restrained' : 'slightly scattered'}.`,
    `${profile.dayBranch ? `Day-branch ${profile.dayBranch}` : 'The day-branch'} interaction with the month adds a ${relation === 'support' ? 'push' : 'check'} signal for ${label}.`,
  ]
  return [dayLine, pickBySeed(seed, cycleLines)]
}

function relationLabelKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return '동기'
    case 'support': return '상생'
    case 'drain': return '설기'
    case 'control': return '극'
    case 'controlled': return '제'
  }
}

function relationActionKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return '추진력이 두꺼워집니다'
    case 'support': return '받쳐주는 힘이 들어옵니다'
    case 'drain': return '에너지를 흘려보내기 쉽습니다'
    case 'control': return '제동이 걸리기 쉽습니다'
    case 'controlled': return '한 박자 늦춰야 안전합니다'
  }
}

function relationLabelEn(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return 'reinforcing'
    case 'support': return 'supportive'
    case 'drain': return 'draining'
    case 'control': return 'controlling'
    case 'controlled': return 'restrained'
  }
}

function relationActionEn(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return 'thickening momentum on'
    case 'support': return 'adding lift to'
    case 'drain': return 'leaking energy from'
    case 'control': return 'putting brakes on'
    case 'controlled': return 'asking you to slow on'
  }
}

function buildAstroFactors(
  locale: CalendarLocale,
  astroProfile: UserAstroProfile,
  domain: DomainKey,
  month: number,
  crossAgreementPercent: number,
  seed: string
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const sunSign = astroProfile.sunSign || (locale === 'ko' ? '태양' : 'Sun')
  const moonSign = astroProfile.moonSign
  const isWinter = month <= 2 || month === 12
  const isSummer = month >= 6 && month <= 8

  if (locale === 'ko') {
    const seasonalKo = isWinter
      ? '겨울 트랜짓이 깊이 있는 결정에 무게를 더합니다'
      : isSummer
        ? '여름 트랜짓이 외부 활동과 표현을 키웁니다'
        : '환절기 트랜짓이 우선순위 재배치를 유도합니다'
    const sunLine = `${sunSign} 기준 트랜짓은 ${seasonalKo}.`
    const moonLine = moonSign
      ? `${moonSign} 달 신호는 ${label} 쪽 감정 결을 ${crossAgreementPercent >= 60 ? '받쳐줍니다' : '흩트립니다'}.`
      : `달 트랜짓은 ${label} 결정의 ${crossAgreementPercent >= 60 ? '실행 신호' : '재확인 신호'}로 작용합니다.`
    const closer = pickBySeed(seed, [
      `단기 트리거는 살아 있어도 지속성은 따로 확인하세요.`,
      `행성 어스펙트가 ${label} 쪽으로 작은 점화를 보탭니다.`,
      `트랜짓 정렬이 약하니 큰 결정 전에 한 박자 두세요.`,
    ])
    return [sunLine, moonLine, closer]
  }
  const seasonalEn = isWinter
    ? 'winter transits add weight to deep decisions'
    : isSummer
      ? 'summer transits expand outward action and expression'
      : 'shoulder-season transits drive a re-prioritization'
  const sunLine = `Around ${sunSign}, ${seasonalEn}.`
  const moonLine = moonSign
    ? `The ${moonSign} Moon signal ${crossAgreementPercent >= 60 ? 'supports' : 'scatters'} the emotional grain on ${label}.`
    : `Lunar transit acts as ${crossAgreementPercent >= 60 ? 'an execution cue' : 'a re-check cue'} for ${label} decisions.`
  const closer = pickBySeed(seed, [
    `Short-term triggers may be alive, but verify durability separately.`,
    `Planetary aspects add a small spark toward ${label}.`,
    `Transit alignment is thin; pause one beat before large decisions.`,
  ])
  return [sunLine, moonLine, closer]
}

function buildRecommendations(grade: ImportanceGrade): string[] {
  if (grade <= 1) return ['confidence']
  if (grade === 2) return ['planning']
  return []
}

function buildWarnings(grade: ImportanceGrade, crossAgreementPercent: number): string[] {
  if (grade >= 3 || crossAgreementPercent < 58) return ['confusion']
  return []
}

export function calculateYearlyImportantDatesLite(
  year: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  options?: LiteOptions
): LiteImportantDate[] {
  const locale = options?.locale || 'ko'
  const results: LiteImportantDate[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const reliability = clamp(
    options?.matrixContext?.timingCalibration?.reliabilityScore || 0.58,
    0,
    1
  )

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const currentMonthKey = monthKey(year, month)
    const domainRanking = pickTopDomains(options?.matrixContext, currentMonthKey)
    const primary = domainRanking[0] || { domain: 'career' as DomainKey, score: 0.52 }
    const secondary = domainRanking[1] || { domain: 'love' as DomainKey, score: 0.48 }
    const seasonalPulse = (Math.sin((day / 31) * Math.PI) + 1) / 2
    const dailyWave = (Math.sin((day / 31) * Math.PI * 2 - Math.PI / 2) + 1) / 2
    const weekday = date.getDay()
    const weekdayBoost =
      weekday === 1 || weekday === 4 ? 0.04 : weekday === 0 || weekday === 6 ? -0.03 : 0
    const primaryMonthStrength = getMonthStrength(
      options?.matrixContext?.overlapTimelineByDomain?.[primary.domain],
      currentMonthKey
    )
    const secondaryMonthStrength = getMonthStrength(
      options?.matrixContext?.overlapTimelineByDomain?.[secondary.domain],
      currentMonthKey
    )
    const dominanceGap = clamp(primary.score - secondary.score, 0, 1)
    const primaryStrength = clamp(
      primary.score * 0.52 +
        primaryMonthStrength * 0.18 +
        dailyWave * 0.12 +
        seasonalPulse * 0.08 +
        reliability * 0.08 +
        dominanceGap * 0.08 +
        weekdayBoost,
      0,
      1
    )
    const crossAgreementPercent = Math.round(
      clamp(primary.score * 55 + secondary.score * 20 + reliability * 25, 0, 1) * 100
    )
    const weakPenalty =
      primaryStrength < 0.5
        ? clamp((0.4 - primaryMonthStrength) * 32 + (0.6 - reliability) * 14, 0, 28)
        : 0
    const peakBoost = primaryStrength >= 0.8 && primaryMonthStrength >= 0.7 ? 4 : 0
    const score = Math.round(
      clamp(
        8 +
          primaryStrength * 64 +
          primaryMonthStrength * 18 +
          secondaryMonthStrength * 5 +
          secondary.score * 6 +
          dominanceGap * 6 +
          peakBoost -
          weakPenalty,
        2,
        99
      )
    )
    const grade = scoreToGrade(score)
    const baseTier = tierFromStrength(primaryStrength)
    const tier: StrengthTier =
      grade === 0
        ? 'rising'
        : grade === 4
          ? 'guarded'
          : grade === 3 && baseTier !== 'guarded'
            ? 'wavering'
            : grade === 1 && baseTier === 'wavering'
              ? 'aligned'
              : baseTier
    const seed = `${year}-${pad2(month)}-${pad2(day)}|${primary.domain}|${grade}`
    if (typeof options?.minGrade === 'number' && grade > options.minGrade) {
      continue
    }

    const categories: EventCategory[] = [DOMAIN_TO_CATEGORY[primary.domain], 'general']
    if (secondary.score >= 0.62) {
      const secondaryCategory = DOMAIN_TO_CATEGORY[secondary.domain]
      if (!categories.includes(secondaryCategory)) categories.unshift(secondaryCategory)
    }
    if (!categoryMatchesFilter(categories, options?.category)) {
      continue
    }

    results.push({
      date: isoDate(year, month, day),
      grade,
      score,
      rawScore: score,
      adjustedScore: score,
      displayScore: score,
      categories,
      titleKey: buildTitle(locale, primary.domain, tier, `${seed}|t`),
      descKey: buildDescription(
        locale,
        primary.domain,
        tier,
        dominanceGap,
        crossAgreementPercent,
        `${seed}|d`
      ),
      ganzhi: '',
      crossVerified: crossAgreementPercent >= 60,
      transitSunSign: astroProfile.sunSign || '',
      sajuFactorKeys: buildSajuFactors(locale, sajuProfile, primary.domain, month, `${seed}|s`),
      astroFactorKeys: buildAstroFactors(
        locale,
        astroProfile,
        primary.domain,
        month,
        crossAgreementPercent,
        `${seed}|a`
      ),
      recommendationKeys: buildRecommendations(grade),
      warningKeys: buildWarnings(grade, crossAgreementPercent),
      confidence: Math.round(clamp(primaryStrength * 100, 0, 100)),
      confidenceNote:
        locale === 'ko' ? '캘린더 경량 스코어링 기준' : 'Calendar lite scoring baseline',
      crossAgreementPercent,
    })
  }

  results.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade
    return (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  })

  if (options?.limit) {
    return results.slice(0, options.limit)
  }
  return results
}
