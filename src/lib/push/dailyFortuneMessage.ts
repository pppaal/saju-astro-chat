/**
 * "매일 아침 오늘의 운세 한 줄" 메시지 생성 — 순수/결정론.
 *
 * cron(/api/cron/daily-fortune)에서 구독자 수만큼 호출되므로 가장 싼
 * 결정론 경로만 쓴다: 생년월일 → 일간(日干, canonical `computeDayPillarIndices`)
 * + 오늘 일진(日辰) → 십신(十神) 관계 + 일지 충/합 판정. Swiss Ephemeris·
 * LLM·DB 호출 없음 — 같은 입력이면 항상 같은 한 줄 (단위 테스트로 고정).
 *
 * 프로필(생년월일)이 없으면 오늘 일진의 오행으로 일반 문구를 만든다.
 */

import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { STEM_NAMES, BRANCH_NAMES } from '@/lib/saju/constants'
import { SIPSIN_RELATIONS, CHUNG, YUKHAP } from '@/lib/calendar/constants'

export type PushLocale = 'ko' | 'en'

export interface DailyFortuneMessage {
  title: string
  body: string
}

const TITLES: Record<PushLocale, string> = {
  ko: '오늘의 운세',
  en: "Today's Fortune",
}

// 십신 → (분위기, 기본 조언, 이모지 1개). 이모지는 메시지당 1개만 허용.
const SIPSIN_LINES: Record<
  string,
  {
    emoji: string
    ko: { mood: string; advice: string }
    en: { mood: string; advice: string }
  }
> = {
  비견: {
    emoji: '🤝',
    ko: { mood: '내 페이스를 지키기 좋은', advice: '비교 대신 내 속도에 집중해 보세요' },
    en: { mood: 'steady and self-assured', advice: 'keep your own pace instead of comparing' },
  },
  겁재: {
    emoji: '⚖️',
    ko: { mood: '경쟁심이 살아나는', advice: '욕심보다 협력이 더 큰 몫을 가져옵니다' },
    en: { mood: 'charged with rivalry', advice: 'cooperation wins more than competition today' },
  },
  식신: {
    emoji: '🌱',
    ko: { mood: '여유와 창의가 피어나는', advice: '좋아하는 일에 시간을 조금 떼어 두세요' },
    en: { mood: 'easygoing and creative', advice: 'set aside time for what you enjoy' },
  },
  상관: {
    emoji: '💬',
    ko: { mood: '표현욕이 솟는', advice: '말이 앞서기 쉬우니 한 박자 쉬고 전하세요' },
    en: { mood: 'expressive and bold', advice: 'pause a beat before you speak your mind' },
  },
  편재: {
    emoji: '🎲',
    ko: { mood: '기회가 스치는', advice: '작은 시도는 좋지만 큰 지출은 미루세요' },
    en: { mood: 'full of passing chances', advice: 'try small bets, postpone big spending' },
  },
  정재: {
    emoji: '🪙',
    ko: { mood: '꾸준함이 빛나는', advice: '계획한 일을 차근차근 마무리해 보세요' },
    en: { mood: 'rewarding steadiness', advice: 'finish what you planned, step by step' },
  },
  편관: {
    emoji: '🛡️',
    ko: { mood: '긴장감이 도는', advice: '무리한 약속은 피하고 체력을 아끼세요' },
    en: { mood: 'tense but bracing', advice: 'avoid overcommitting and save your energy' },
  },
  정관: {
    emoji: '🎯',
    ko: { mood: '신뢰가 쌓이는', advice: '원칙대로 처리하면 평판이 올라갑니다' },
    en: { mood: 'good for earning trust', advice: 'play it by the book and reputation grows' },
  },
  편인: {
    emoji: '🌙',
    ko: { mood: '직감이 예민해지는', advice: '혼자 생각할 조용한 시간을 가져 보세요' },
    en: { mood: 'intuitive and inward', advice: 'give yourself quiet time to think' },
  },
  정인: {
    emoji: '📖',
    ko: { mood: '배움이 잘 붙는', advice: '미뤄둔 공부나 정리를 시작하기 좋습니다' },
    en: { mood: 'ripe for learning', advice: 'a good day to study or organize' },
  },
}

// 일지 충(冲) — 기본 조언 대신 주의 조언으로 교체.
const CLASH_ADVICE: Record<PushLocale, string> = {
  ko: '변수가 많은 날이니 중요한 결정은 하루 미루세요',
  en: 'expect surprises, so push big decisions to tomorrow',
}

// 일지 육합(六合) — 관계운 보너스 조언으로 교체.
const HARMONY_ADVICE: Record<PushLocale, string> = {
  ko: '인연이 부드럽게 이어지니 먼저 연락해 보세요',
  en: 'connections flow smoothly, so reach out first',
}

// 프로필 없음 — 오늘 일진의 오행(천간 인덱스 >> 1)별 일반 문구.
const GENERIC_LINES: Array<{ emoji: string; ko: string; en: string }> = [
  {
    emoji: '🌿',
    ko: '오늘은 새 기운이 움트는 날 — 작게라도 시작해 보세요',
    en: 'Fresh energy is sprouting today — start something, even small',
  },
  {
    emoji: '🔥',
    ko: '오늘은 활기가 도는 날 — 미뤄둔 일을 움직여 보세요',
    en: 'Momentum is on your side today — move that task you postponed',
  },
  {
    emoji: '⛰️',
    ko: '오늘은 중심을 잡기 좋은 날 — 기본부터 차분히 다지세요',
    en: 'A grounding day — settle the basics calmly',
  },
  {
    emoji: '🔔',
    ko: '오늘은 정리가 잘 되는 날 — 불필요한 것을 덜어내 보세요',
    en: 'A day for clarity — cut away what you no longer need',
  },
  {
    emoji: '🌊',
    ko: '오늘은 흐름에 맡기기 좋은 날 — 유연하게 움직여 보세요',
    en: 'Go with the flow today — stay flexible',
  },
]

const BIRTH_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseBirthDate(birthDate: string | null | undefined): {
  year: number
  month: number
  day: number
} | null {
  if (!birthDate) return null
  const m = BIRTH_DATE_RE.exec(birthDate.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (year < 1850 || year > 2200) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return { year, month, day }
}

/**
 * 생년월일(YYYY-MM-DD, 없으면 일반 문구) + 날짜 → ko/en 한 줄 운세.
 * `date` 는 UTC 달력 기준으로 읽는다 (cron 이 KST 아침에 돌 때
 * `new Date()` 의 UTC 날짜가 곧 발송 당일이 되도록 호출부에서 보정).
 */
export function buildDailyFortuneMessage(options: {
  birthDate?: string | null
  date: Date
  locale: PushLocale
}): DailyFortuneMessage {
  const { date, locale } = options
  const title = TITLES[locale]

  const today = computeDayPillarIndices(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
  const todayStem = STEM_NAMES[today.stemIndex]
  const todayBranch = BRANCH_NAMES[today.branchIndex]

  const birth = parseBirthDate(options.birthDate)
  if (!birth) {
    const generic = GENERIC_LINES[today.stemIndex >> 1]
    return { title, body: `${generic[locale]} ${generic.emoji}` }
  }

  const natal = computeDayPillarIndices(birth.year, birth.month, birth.day)
  const dayMaster = STEM_NAMES[natal.stemIndex]
  const natalBranch = BRANCH_NAMES[natal.branchIndex]

  const sipsin = SIPSIN_RELATIONS[dayMaster]?.[todayStem] ?? '비견'
  const line = SIPSIN_LINES[sipsin] ?? SIPSIN_LINES['비견']

  const isClash = CHUNG[natalBranch] === todayBranch
  const isHarmony = YUKHAP[natalBranch] === todayBranch
  const advice = isClash
    ? CLASH_ADVICE[locale]
    : isHarmony
      ? HARMONY_ADVICE[locale]
      : line[locale].advice

  const body =
    locale === 'ko'
      ? `오늘은 ${line.ko.mood} 날 ${line.emoji} — ${advice}`
      : `Today feels ${line.en.mood} ${line.emoji} — ${advice}`

  return { title, body }
}
