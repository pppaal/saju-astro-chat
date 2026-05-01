import { normalizeReportTheme } from '@/lib/destiny-matrix/ai-report/themeSchema'
import { repairMojibakeText } from '@/lib/text/mojibake'

export type TimelineTone = 'best' | 'caution' | 'neutral'

export const trimList = <T>(items: T[] | undefined, max: number): T[] | undefined => {
  if (!items || items.length === 0) return undefined
  return items.slice(0, max)
}

export const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const extractHoursFromText = (value: string) => {
  if (!value || /년|월/.test(value)) return [] as number[]
  const normalized = value.replace(/\s+/g, '')
  const rangeMatch = normalized.match(/(\d{1,2})(?::\d{2})?[-~](\d{1,2})/)
  if (rangeMatch) {
    const start = Number(rangeMatch[1])
    const end = Number(rangeMatch[2])
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > 23) return []
    const safeEnd = Math.min(24, Math.max(0, end))
    if (safeEnd <= start) return [start]
    return Array.from({ length: safeEnd - start }, (_, idx) => start + idx)
  }
  const singleMatch = normalized.match(/(\d{1,2})(?::\d{2})?/)
  if (!singleMatch) return []
  const hour = Number(singleMatch[1])
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return []
  return [hour]
}

export const cleanGuidanceText = (value: string, maxLength = 96): string => {
  const normalized = repairMojibakeText(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''

  const noEvidenceTail = normalized.replace(/\s*(근거|evidence)\s*:.*/i, '').trim()
  const noHype = noEvidenceTail
    .replace(
      /\b(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)\s*\(([^)]*)\)\s*:?/g,
      ''
    )
    .replace(/\b(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)\b/g, '')
    .replace(/\b(?:Ja|Chuk|In|Myo|Jin|Sa|O|Mi|Shin|Yu|Sul|Hae)-si\b[^:]*:?/gi, '')
    .replace(/인생을 바꿀[^.!\n]*/g, '')
    .replace(/완벽한 날[^.!\n]*/g, '')
    .replace(/1년에 몇 번[^.!\n]*/g, '')
    .replace(/에너지가 도와줘요!?/g, '')
    .replace(/청첩장[^.!\n]*/g, '')
    .replace(/예식장 예약[^.!\n]*/g, '')
    .replace(/핵심 1~2개[^.!\n]*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const cleaned = noHype.replace(/(?:\.\.\.|…|~)+$/g, '').trim()
  if (cleaned.includes('\uFFFD')) return ''
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, Math.max(20, maxLength - 3)).trimEnd()}...`
}

export const pickCrossLineByTone = (lines: string[] | undefined, tone: TimelineTone): string => {
  const list = (lines || []).map((line) => cleanGuidanceText(line, 120)).filter(Boolean)
  if (list.length === 0) return ''

  const hardPattern = /(square|opposition|긴장|충돌|압박|friction|caution|\u26a0)/i
  const softPattern = /(trine|sextile|지원|기회|흐름|support|flow|\u2705)/i

  if (tone === 'caution') {
    return list.find((line) => hardPattern.test(line)) || list[0]
  }
  if (tone === 'best') {
    return list.find((line) => softPattern.test(line)) || list[0]
  }
  return list[0]
}

/**
 * 사주 ↔ 점성 cross 한 줄 — 진짜 weaving (단순 ` + ` join 금지).
 *
 * 우선순위:
 *   1) bridges[]에 이미 만들어진 cross-line이 있으면 그걸 사용 (이미 두 결이 만난 문장)
 *   2) 둘 다 있으면 한 문장으로 묶음 ("X 흐름이 Y와 만나는 시점")
 *   3) 한쪽만 있으면 그쪽만 표기
 */
export const buildCrossReasonText = (
  cross:
    | {
        sajuEvidence?: string
        astroEvidence?: string
        sajuDetails?: string[]
        astroDetails?: string[]
        bridges?: string[]
      }
    | undefined,
  tone: TimelineTone,
  locale: 'ko' | 'en'
): string => {
  if (!cross) return ''
  const prefix = locale === 'ko' ? '근거: ' : 'Evidence: '

  // Priority 1 — bridges already encode saju↔astro as a real cross sentence.
  const bridgeLine = pickCrossLineByTone(cross.bridges, tone) || cross.bridges?.[0]
  if (bridgeLine) {
    return cleanGuidanceText(`${prefix}${bridgeLine}`, 140)
  }

  const astro =
    pickCrossLineByTone(cross.astroDetails, tone) ||
    cleanGuidanceText(cross.astroEvidence || '', 92)
  const saju =
    pickCrossLineByTone(cross.sajuDetails, tone) || cleanGuidanceText(cross.sajuEvidence || '', 80)

  // Priority 2 — both sides present: weave into one sentence so the reader
  // sees the two threads meeting, not two facts placed side by side.
  if (saju && astro) {
    const woven =
      locale === 'ko'
        ? `사주 측면에서는 ${saju}, 점성 측면에서는 ${astro} — 두 결이 함께 흐르는 시점이에요.`
        : `On the saju side, ${saju}; on the astrology side, ${astro} — the two threads run together right now.`
    return cleanGuidanceText(`${prefix}${woven}`, 180)
  }

  // Priority 3 — single side fallback.
  const single = saju || astro
  if (!single) return ''
  return cleanGuidanceText(`${prefix}${single}`, 132)
}

export function getTimeBucket(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

// ─────────────────────────────────────────────────────────────
// 직장인 시간대 — 수면/통근/업무/점심/퇴근/저녁 패턴
// ─────────────────────────────────────────────────────────────
export type OfficeBucket =
  | 'sleep'        // 22-06 (취침)
  | 'wakeup'       // 06-08 (기상·통근)
  | 'amCore'       // 08-12 (오전 핵심 업무)
  | 'lunch'        // 12-13 (점심)
  | 'pmCore'       // 13-18 (오후 업무)
  | 'commute'      // 18-19 (퇴근)
  | 'evening'      // 19-21 (저녁·식사·관계)
  | 'personal'     // 21-22 (개인 시간)

export function getOfficeBucket(hour: number): OfficeBucket {
  if (hour >= 22 || hour < 6) return 'sleep'
  if (hour < 8) return 'wakeup'
  if (hour < 12) return 'amCore'
  if (hour === 12) return 'lunch'
  if (hour < 18) return 'pmCore'
  if (hour < 19) return 'commute'
  if (hour < 21) return 'evening'
  return 'personal'
}

const OFFICE_BUCKET_THEME_KO: Record<OfficeBucket, string> = {
  sleep: '깊은 휴식·수면 시간이에요',
  wakeup: '하루 시동을 거는 기상·통근 시간이에요',
  amCore: '오전 핵심 업무 시간이에요',
  lunch: '점심·관계 대화 시간이에요',
  pmCore: '오후 실행·정리 시간이에요',
  commute: '퇴근하면서 마무리·전환하는 구간이에요',
  evening: '저녁 식사·회복·관계 시간이에요',
  personal: '하루를 정리하는 개인 시간이에요',
}

const OFFICE_BUCKET_DEFAULT_ACTION_KO: Record<OfficeBucket, { best: string; caution: string; neutral: string }> = {
  sleep: {
    best: '내일 일이 잘 풀릴 거니까 오늘 푹 자두세요.',
    caution: '오늘이 좀 무거운 날이라 일찍 자고 컨디션 챙기는 게 좋아요.',
    neutral: '자정 전에 잠드는 게 좋아요.',
  },
  wakeup: {
    best: '오늘 가장 중요한 일 한 가지를 통근길에 미리 정리해두면 출근하자마자 잘 풀려요.',
    caution: '서두르지 마시고 컨디션부터 챙기세요. 통근 중에 오늘 우선순위만 한 번 정리해두면 충분해요.',
    neutral: '평소 아침 루틴 그대로 가시면 돼요. 출근길에 오늘 일정 한 번 훑어보세요.',
  },
  amCore: {
    best: '오늘 가장 중요한 회의·보고·결정은 이 시간에 잡으세요. 잘 풀리는 구간이에요.',
    caution: '큰 결정은 오후로 미루고, 이메일 답신이나 자료 정리 같은 가벼운 일부터 하세요.',
    neutral: '집중 한 블록 잡고 핵심 일 한 가지 처리하세요. 회의는 짧게.',
  },
  lunch: {
    best: '점심 약속·외부 미팅 잡기 좋은 시간이에요. 사람 만나기 좋은 타이밍.',
    caution: '점심은 가볍게 혼자 드시거나 익숙한 사람이랑만. 무거운 대화는 다음으로 미루세요.',
    neutral: '편하게 식사하시고 오후 일정 한 번 정리해두세요.',
  },
  pmCore: {
    best: '결과물 마감·외부 발송·계약 마무리에 좋아요. 오전에 정한 거 실행으로 옮기세요.',
    caution: '새로 일 벌이지 마시고 진행 중인 거 정리·검토에 집중하세요. 큰 결정은 내일로.',
    neutral: '협업이나 문서 정리 같은 일 잘 풀려요. 무리한 일정은 잡지 마세요.',
  },
  commute: {
    best: '퇴근길에 5분만 — 오늘 잘된 일 한 개, 내일 첫 일 한 개 적어두세요. 이게 내일을 갈라요.',
    caution: '퇴근하면서 마음부터 가다듬으세요. 오늘 안 풀린 일은 일단 놔두세요.',
    neutral: '오늘 일정 마무리하고 퇴근. 전환 시간을 가지세요.',
  },
  evening: {
    best: '가족·친구·연인이랑 대화 깊어지기 좋은 시간이에요. 가벼운 운동도 잘 받아요.',
    caution: '예민한 대화는 피하고 그냥 쉬세요. 저녁 산책 정도가 딱 좋아요.',
    neutral: '저녁 챙기시고 가벼운 활동 정도만. 무리한 약속은 잡지 마세요.',
  },
  personal: {
    best: '책 한 챕터, 간단한 일기, 내일 첫 일 정해두기 — 이런 게 잘 되는 시간이에요.',
    caution: '오늘 무거웠으면 그냥 쉬세요. 일찍 잘 준비 하는 게 답이에요.',
    neutral: '내일 우선순위 세 개만 적어두고 폰 끄세요.',
  },
}

export function getOfficeBucketTheme(bucket: OfficeBucket): string {
  return OFFICE_BUCKET_THEME_KO[bucket]
}

export function getOfficeBucketAction(
  bucket: OfficeBucket,
  tone: 'best' | 'caution' | 'neutral'
): string {
  return OFFICE_BUCKET_DEFAULT_ACTION_KO[bucket][tone]
}

export function normalizeActionCategory(category?: string): string {
  if (!category) return 'career'
  const normalized = normalizeReportTheme(category)
  if (normalized) return normalized

  const key = category.trim().toLowerCase()
  if (key === 'money') return 'wealth'
  if (key === 'move') return 'travel'
  if (key === 'general') return 'career'
  return key || 'career'
}

const CATEGORY_FOCUS_HINTS: Record<
  string,
  {
    ko: { morning: string; day: string; evening: string }
    en: { morning: string; day: string; evening: string }
  }
> = {
  career: {
    ko: {
      morning: '중요 업무 1건을 먼저 밀어붙이세요',
      day: '협업/보고는 핵심만 짧게 정리하세요',
      evening: '내일 우선순위를 3개로 압축하세요',
    },
    en: {
      morning: 'Push one high-impact work item first',
      day: 'Keep collaboration and updates concise',
      evening: 'Compress tomorrow into 3 priorities',
    },
  },
  wealth: {
    ko: {
      morning: '지출/투자 기준선을 먼저 확정하세요',
      day: '금전 의사결정은 수치 재확인 후 진행하세요',
      evening: '현금흐름 메모를 5분만 정리하세요',
    },
    en: {
      morning: 'Lock spending and investment guardrails first',
      day: 'Confirm numbers before money decisions',
      evening: 'Do a quick 5-minute cash-flow review',
    },
  },
  love: {
    ko: {
      morning: '감정 표현보다 의도를 먼저 명확히 하세요',
      day: '민감한 대화는 사실 확인부터 시작하세요',
      evening: '관계 대화 20분을 확보하세요',
    },
    en: {
      morning: 'Clarify intent before emotional messaging',
      day: 'Start sensitive talks with facts first',
      evening: 'Reserve 20 minutes for relationship conversation',
    },
  },
  health: {
    ko: {
      morning: '가벼운 운동으로 몸을 먼저 깨우세요',
      day: '과부하를 줄이고 수분/호흡을 챙기세요',
      evening: '수면 준비 루틴을 앞당기세요',
    },
    en: {
      morning: 'Wake your body with light movement',
      day: 'Reduce overload and protect hydration/breathing',
      evening: 'Start your sleep routine earlier',
    },
  },
  travel: {
    ko: {
      morning: '동선과 출발시간을 먼저 재점검하세요',
      day: '이동 중 변수 대비책을 준비하세요',
      evening: '내일 일정 버퍼를 확보하세요',
    },
    en: {
      morning: 'Re-check route and departure timing',
      day: 'Prepare a contingency for travel variables',
      evening: 'Add time buffer for tomorrow',
    },
  },
  study: {
    ko: {
      morning: '집중 학습 블록을 먼저 실행하세요',
      day: '핵심 개념 3개만 고정해서 복습하세요',
      evening: '요약 노트를 짧게 마무리하세요',
    },
    en: {
      morning: 'Run a focused study block first',
      day: 'Review only 3 core concepts',
      evening: 'Close with a short summary note',
    },
  },
  general: {
    ko: {
      morning: '핵심 1가지에 집중하세요',
      day: '자원 분배를 다시 맞추세요',
      evening: '내일 기준선을 짧게 정리하세요',
    },
    en: {
      morning: 'Focus on one core action',
      day: 'Rebalance your resources',
      evening: 'Write down tomorrow\'s baseline briefly',
    },
  },
}

export function getCategoryFocusHint(
  category: string | undefined,
  hour: number,
  locale: 'ko' | 'en'
): string {
  const normalized = normalizeActionCategory(category)
  const hint = CATEGORY_FOCUS_HINTS[normalized]
  if (!hint) return locale === 'ko' ? '핵심 1가지에 집중하세요' : 'Focus on one core action'
  const bucket = getTimeBucket(hour)
  return hint[locale][bucket]
}

export function pickByHour(items: string[] | undefined, hour: number): string | null {
  if (!items || items.length === 0) return null
  const index =
    hour < 10 ? 0 : hour < 16 ? Math.min(1, items.length - 1) : Math.min(2, items.length - 1)
  const value = items[index]
  return value ? value.trim() : null
}

export function pickCategoryByHour(categories: string[] | undefined, hour: number): string {
  if (!categories || categories.length === 0) return 'career'
  const index =
    hour < 10
      ? 0
      : hour < 16
        ? Math.min(1, categories.length - 1)
        : Math.min(2, categories.length - 1)
  return normalizeActionCategory(categories[index] || categories[0] || 'career')
}

export function getHourlyWindowLabel(hour: number, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    if (hour < 6) return '심야 정리 구간: 결정보다 정리/휴식 우선'
    if (hour < 9) return '아침 시동 구간: 핵심 1건 먼저 착수'
    if (hour < 12) return '오전 집중 구간: 복잡한 판단/실행 우선'
    if (hour < 15) return '점심 이후 조정 구간: 협업/정리 작업 적합'
    if (hour < 18) return '오후 실행 구간: 결과물 마감 속도 올리기'
    if (hour < 21) return '저녁 소통 구간: 대화/관계 조율 효율 상승'
    return '야간 회복 구간: 과부하 줄이고 다음 날 준비'
  }

  if (hour < 6) return 'Late-night low-noise window: favor cleanup and recovery'
  if (hour < 9) return 'Morning ramp-up window: start with one core task'
  if (hour < 12) return 'AM focus window: prioritize complex decisions and execution'
  if (hour < 15) return 'Post-lunch adjustment window: good for collaboration and review'
  if (hour < 18) return 'PM execution window: raise closure speed on deliverables'
  if (hour < 21) return 'Evening relationship window: communication quality tends to improve'
  return 'Night recovery window: reduce load and prep for tomorrow'
}

// ─────────────────────────────────────────────────────────────
// 사주 시진(時辰) — 시간 단위 일주(시주) 분석을 슬롯 텍스트에 끌어옴
// ─────────────────────────────────────────────────────────────

const SAJU_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const SAJU_STEM_INDEX: Record<string, number> = Object.fromEntries(
  SAJU_STEMS.map((s, i) => [s, i])
)
const SAJU_STEM_YIN: Record<string, boolean> = {
  甲: false, 乙: true, 丙: false, 丁: true, 戊: false,
  己: true, 庚: false, 辛: true, 壬: false, 癸: true,
}
const SAJU_STEM_TO_KO_ELEMENT: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const HOUR_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 24h → 12지지 매핑 (子: 23-01, 丑: 01-03, ...) */
export function hourBranchOf(hour: number): string {
  const idx = Math.floor(((hour + 1) % 24) / 2)
  return HOUR_BRANCHES[idx]
}

/** 일간 기준 그 시간의 천간 (5운 12지 시간 천간 규칙) */
export function hourStemOf(dayStem: string, hour: number): string {
  const sIdx = SAJU_STEM_INDEX[dayStem]
  if (sIdx === undefined) return SAJU_STEMS[0]
  const baseHourStemIdx = ((sIdx % 5) * 2) % 10 // 子時 시작 천간 idx
  const branchIdx = Math.floor(((hour + 1) % 24) / 2)
  return SAJU_STEMS[(baseHourStemIdx + branchIdx) % 10]
}

/** 일간 vs 시간 십신 — 한국어 라벨 */
export function hourSibsinKo(dayStem: string, hourStem: string): string {
  const dayEl = SAJU_STEM_TO_KO_ELEMENT[dayStem]
  const hEl = SAJU_STEM_TO_KO_ELEMENT[hourStem]
  if (!dayEl || !hEl) return ''
  const elements = ['목', '화', '토', '금', '수']
  const samePolarity = SAJU_STEM_YIN[dayStem] === SAJU_STEM_YIN[hourStem]
  const diff = (elements.indexOf(hEl) - elements.indexOf(dayEl) + 5) % 5
  const labels = [
    ['비견', '겁재'],
    ['식신', '상관'],
    ['편재', '정재'],
    ['편관', '정관'],
    ['편인', '정인'],
  ]
  return labels[diff][samePolarity ? 0 : 1]
}

/** 12 시지 자연 의미 — 사람 말투로 (이중 "시간" 안 나오도록 끝에 시간 단어 X) */
export const HOUR_BRANCH_THEME_KO: Record<string, string> = {
  子: '한밤중이라 깊이 쉬고 잠재의식이 활발해지는 때',
  丑: '새벽이라 머리 정리하고 차분히 묵상하기 좋아요',
  寅: '동트기 전이라 큰 그림 그리고 하루 계획 세우기 좋아요',
  卯: '아침 일어나 하루 시작하는 때',
  辰: '오전 초반 — 핵심 일 한 가지에 집중하기 좋아요',
  巳: '오전 중반 — 발표·미팅·대화가 잘 풀리는 황금 타이밍',
  午: '한낮 — 결정하고 정리할 거 많은 때',
  未: '점심 후 — 천천히 마무리하고 문서 정리하기 좋아요',
  申: '오후 중반 — 결과물 마감 속도가 살아나는 때',
  酉: '해질녘 — 협업이나 마감 잡기 좋아요',
  戌: '저녁 — 식사하고 사람들 만나기 좋아요',
  亥: '늦은 밤 — 깊이 공부하거나 내일 정리하기 좋아요',
}

export const HOUR_BRANCH_THEME_EN: Record<string, string> = {
  子: 'late night — deep rest and subconscious time',
  丑: 'pre-dawn — quiet cleanup and reflection',
  寅: 'before sunrise — big-picture and planning',
  卯: 'morning — start the day',
  辰: 'early AM — focus on one core task',
  巳: 'mid-morning — golden window for talks and meetings',
  午: 'noon — decisions and alignment',
  未: 'after lunch — wrap up and paperwork',
  申: 'mid-afternoon — closure speed picks up',
  酉: 'late afternoon — collaboration and handoff',
  戌: 'evening — meals and people',
  亥: 'late evening — deep study or tomorrow prep',
}

/** 시간 십신 → 사람 말투 행동 풀이 */
export const SIBSIN_HOUR_ACTION_KO: Record<string, string> = {
  비견: '동료들이랑 같이 일하기 좋은 시간',
  겁재: '경쟁이 예민해지니 자기 페이스 지키는 게 좋아요',
  식신: '뭔가 만들고 표현하기 좋은 시간',
  상관: '말빨 살아나는 시간 — 핵심 메시지 던지기 좋아요',
  편재: '외부 미팅·딜이 잘 풀려요',
  정재: '계약·문서·돈 관련 정리에 좋아요',
  편관: '어려운 결정 정면돌파해야 할 때',
  정관: '회의·보고·검토 같은 공식 업무에 잘 맞아요',
  편인: '책상 앞에서 공부하거나 정리하기 좋아요',
  정인: '문서 챙기고 정중하게 답신하기 좋아요',
}

export const SIBSIN_HOUR_ACTION_EN: Record<string, string> = {
  비견: 'good for peer collaboration',
  겁재: 'rivalry edge — keep your own pace',
  식신: 'great for making and expressing',
  상관: 'sharp message window — drop the key point',
  편재: 'external deals and trades flow well',
  정재: 'contracts, paperwork, money cleanup',
  편관: 'time to face hard decisions',
  정관: 'fits formal meetings and reviews',
  편인: 'desk time — study or organize',
  정인: 'paperwork and polite replies',
}

/** 시간 천간/지지가 본명 일주에 어떤 이벤트를 일으키는지 검사 */
const STEM_HAP_PARTNER_LOCAL: Record<string, string> = {
  甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸',
  己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊',
}
const STEM_CHUNG_PAIRS = new Set([
  '甲-庚', '庚-甲', '乙-辛', '辛-乙', '丙-壬', '壬-丙', '丁-癸', '癸-丁',
])
const BRANCH_CHUNG_PARTNER: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
const BRANCH_HAP_PARTNER: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
const BRANCH_HYUNG_TRIO_LOCAL = ['寅', '巳', '申']
const BRANCH_HYUNG_TRIO_LOCAL2 = ['丑', '戌', '未']

export type HourEvent = {
  kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '공망'
  shift: 'lift' | 'press'
  ko: string
  en: string
}

// 같은 이벤트가 종일 반복될 때 단조로움을 줄이기 위한 변형 풀
const HOUR_EVENT_VARIANTS_KO: Record<HourEvent['kind'], string[]> = {
  천간합: [
    '오늘 이 시간엔 사람들이랑 얘기가 잘 통할 거예요',
    '이 시간대는 조율과 합의가 부드럽게 풀려요',
    '말이 잘 떨어지는 시간이라 협업·대화에 유리해요',
  ],
  천간충: [
    '이 시간엔 부딪히기 쉬워요. 큰 결정은 피하세요',
    '톤이 세질 수 있는 시간 — 한 박자 늦추세요',
    '의견 충돌 가능성이 있어요. 결론은 다음 시간으로',
  ],
  지지합: [
    '가까운 사람과 마음이 잘 맞는 시간이에요',
    '편안한 사람들과 같이 있기 좋은 시간이에요',
    '관계가 따뜻하게 풀리는 분위기예요',
  ],
  지지충: [
    '뭔가 흔들릴 수 있는 시간 — 이동이나 변동에 조심하세요',
    '약속이나 동선이 바뀌기 쉬운 시간이에요',
    '환경 변동이 잦은 구간이라 여유 시간 두세요',
  ],
  지지형: [
    '실수 나오기 쉬운 시간이에요. 평소보다 한 번 더 확인하세요',
    '신경전이 일어나기 쉬운 구간 — 톤 낮추세요',
    '오류·마찰이 생길 수 있어요. 두 번 검토하세요',
  ],
  공망: [
    '이 시간엔 뭘 해도 무게가 잘 안 실려요. 큰 결정은 미루세요',
    '결정 무게가 비는 시간 — 확정은 다음으로',
    '약속이 흐려지기 쉬워요. 가벼운 일만 하세요',
  ],
}

const HOUR_EVENT_VARIANTS_EN: Record<HourEvent['kind'], string[]> = {
  천간합: [
    'people and you click well around this hour',
    'a smooth alignment window for talks and agreements',
    'words land cleanly — good for collaboration',
  ],
  천간충: [
    'easy to clash this hour — avoid big calls',
    'tones can sharpen — slow down a beat',
    'disagreement risk — defer conclusions',
  ],
  지지합: [
    'good time with close people',
    'comfortable hour to spend with familiar people',
    'relationships warm up around this window',
  ],
  지지충: [
    'things may shift — be careful with moves and changes',
    'plans and routes can wobble — leave buffer',
    'volatile window for environment changes',
  ],
  지지형: [
    'mistakes slip in this hour — double-check',
    'friction-prone window — keep the tone low',
    'errors and snags more likely — verify twice',
  ],
  공망: [
    'decisions feel weightless here — defer them',
    'commitments lose weight this hour — push later',
    'promises blur easily — keep tasks light',
  ],
}

// 행 결정용 안정 해시 (hour + kind) — 같은 hour에서 같은 변형이 안정적으로 나오도록
function pickEventVariant(kind: HourEvent['kind'], hour: number, locale: 'ko' | 'en'): string {
  const pool = locale === 'ko' ? HOUR_EVENT_VARIANTS_KO[kind] : HOUR_EVENT_VARIANTS_EN[kind]
  if (!pool || pool.length === 0) return ''
  return pool[hour % pool.length]
}

export function detectHourEvent(input: {
  natalDayStem: string
  natalDayBranch: string
  hourStem: string
  hourBranch: string
  gongmangBranches?: string[]
  hour?: number
  locale?: 'ko' | 'en'
}): HourEvent | null {
  const { natalDayStem, natalDayBranch, hourStem, hourBranch, gongmangBranches, hour = 0 } = input
  if (!natalDayStem || !natalDayBranch) return null
  const buildEvent = (kind: HourEvent['kind'], shift: 'lift' | 'press'): HourEvent => ({
    kind,
    shift,
    ko: pickEventVariant(kind, hour, 'ko'),
    en: pickEventVariant(kind, hour, 'en'),
  })
  if (STEM_HAP_PARTNER_LOCAL[natalDayStem] === hourStem && natalDayStem !== hourStem) {
    return buildEvent('천간합', 'lift')
  }
  if (STEM_CHUNG_PAIRS.has(`${natalDayStem}-${hourStem}`)) {
    return buildEvent('천간충', 'press')
  }
  if (BRANCH_HAP_PARTNER[natalDayBranch] === hourBranch && natalDayBranch !== hourBranch) {
    return buildEvent('지지합', 'lift')
  }
  if (BRANCH_CHUNG_PARTNER[natalDayBranch] === hourBranch) {
    return buildEvent('지지충', 'press')
  }
  if (
    (BRANCH_HYUNG_TRIO_LOCAL.includes(natalDayBranch) &&
      BRANCH_HYUNG_TRIO_LOCAL.includes(hourBranch) &&
      natalDayBranch !== hourBranch) ||
    (BRANCH_HYUNG_TRIO_LOCAL2.includes(natalDayBranch) &&
      BRANCH_HYUNG_TRIO_LOCAL2.includes(hourBranch) &&
      natalDayBranch !== hourBranch)
  ) {
    return buildEvent('지지형', 'press')
  }
  if (gongmangBranches?.includes(hourBranch)) {
    return buildEvent('공망', 'press')
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// 점성 행성시간 (Planetary Hours) — 시진과 별개로 그 시간을 지배하는 행성
// ─────────────────────────────────────────────────────────────
import { getPlanetaryHourForDate } from '@/lib/destiny-map/calendar/planetary-hours'

const PLANET_KO_LABEL: Record<string, string> = {
  Sun: '태양', Moon: '달', Mars: '화성', Mercury: '수성',
  Jupiter: '목성', Venus: '금성', Saturn: '토성',
}
const PLANET_KO_ACTION: Record<string, string> = {
  Sun: '리더십 발휘하거나 사람들 앞에 서기 좋은 분위기',
  Moon: '직관이 살고 가족·가까운 사람과 시간 보내기 좋은 분위기',
  Mercury: '문서 정리하고 소통하고 공부하기 좋은 분위기',
  Venus: '관계·예술·돈 관련 일이 잘 풀리는 분위기',
  Mars: '추진력 살아서 운동하거나 결단 내리기 좋은 분위기',
  Jupiter: '큰 그림 그리고 기회 잡기 좋은 분위기',
  Saturn: '구조 잡고 차근차근 장기 계획 세우기 좋은 분위기',
}
const PLANET_EN_ACTION: Record<string, string> = {
  Sun: 'leading and showing up in public',
  Moon: 'intuition, family and close people',
  Mercury: 'paperwork, talks, learning',
  Venus: 'relationships, art, money matters',
  Mars: 'drive, sport, decisive moves',
  Jupiter: 'big-picture thinking and opportunities',
  Saturn: 'structure and long-term planning',
}

export type PlanetaryHourLine = {
  planet: string
  dayRuler: string
  isDay: boolean
  ko: string
  en: string
}

export function buildPlanetaryHourLine(input: {
  date: string
  hour: number
  locale: 'ko' | 'en'
}): PlanetaryHourLine | null {
  const { date, hour, locale } = input
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  const ph = getPlanetaryHourForDate(new Date(y, m - 1, d, hour, 0, 0))
  if (!ph?.planet) return null
  const ko = locale === 'ko' ? PLANET_KO_ACTION[ph.planet] || '' : ''
  const en = locale === 'en' ? PLANET_EN_ACTION[ph.planet] || '' : ''
  return { planet: ph.planet, dayRuler: ph.dayRuler, isDay: ph.isDay, ko, en }
}

// ─────────────────────────────────────────────────────────────
// activityScores → 시간 카테고리 매칭 강조
// ─────────────────────────────────────────────────────────────
const ACTIVITY_TO_CATEGORY: Record<string, string> = {
  marriage: 'love',
  career: 'career',
  investment: 'wealth',
  moving: 'travel',
  surgery: 'health',
  study: 'study',
}
const ACTIVITY_LABEL_KO: Record<string, string> = {
  marriage: '결혼',
  career: '커리어',
  investment: '투자',
  moving: '이사',
  surgery: '수술',
  study: '공부',
}
const ACTIVITY_LABEL_EN: Record<string, string> = {
  marriage: 'marriage',
  career: 'career',
  investment: 'investment',
  moving: 'move',
  surgery: 'surgery',
  study: 'study',
}

/**
 * 슬롯의 카테고리와 그 날의 activityScores가 정렬되면 강조 라인 한 줄
 * 같은 카테고리에서 score >= 65 면 lift, <= 35 면 caution 힌트
 */
export function buildActivityMatchLine(input: {
  category: string
  activityScores?: Record<string, number | undefined>
  locale: 'ko' | 'en'
}): { line: string; shift: 'lift' | 'press' | null } | null {
  const { category, activityScores, locale } = input
  if (!activityScores) return null
  const matchedKey = Object.entries(ACTIVITY_TO_CATEGORY).find(
    ([, cat]) => cat === category
  )?.[0]
  if (!matchedKey) return null
  const score = activityScores[matchedKey]
  if (typeof score !== 'number' || Number.isNaN(score)) return null
  const labelKo = ACTIVITY_LABEL_KO[matchedKey] || matchedKey
  const labelEn = ACTIVITY_LABEL_EN[matchedKey] || matchedKey
  if (score >= 65) {
    return {
      line:
        locale === 'ko'
          ? `오늘은 ${labelKo} 쪽 일이 잘 풀리는 날이라 이쪽으로 가시면 좋아요`
          : `${labelEn} is flowing well today — push this`,
      shift: 'lift',
    }
  }
  if (score <= 35) {
    return {
      line:
        locale === 'ko'
          ? `오늘은 ${labelKo} 쪽 일이 잘 안 풀릴 수 있어요. 무리하지 마세요`
          : `${labelEn} won't flow well today — don't push`,
      shift: 'press',
    }
  }
  return null
}
export function buildHourSajuLine(input: {
  locale: 'ko' | 'en'
  hour: number
  natalDayStem: string
  natalDayBranch?: string
  gongmangBranches?: string[]
}): { sigan: string; sibsin: string; line: string; event: HourEvent | null } {
  const { locale, hour, natalDayStem, natalDayBranch, gongmangBranches } = input
  const branch = hourBranchOf(hour)
  const stem = natalDayStem ? hourStemOf(natalDayStem, hour) : ''
  const sibsin = stem && natalDayStem ? hourSibsinKo(natalDayStem, stem) : ''
  const event =
    natalDayStem && natalDayBranch
      ? detectHourEvent({
          natalDayStem,
          natalDayBranch,
          hourStem: stem,
          hourBranch: branch,
          gongmangBranches,
          hour,
          locale,
        })
      : null

  if (locale === 'ko') {
    const branchTheme = HOUR_BRANCH_THEME_KO[branch] || ''
    const action = sibsin ? SIBSIN_HOUR_ACTION_KO[sibsin] : ''
    const eventPart = event ? ` ${event.ko}.` : ''
    // 한자 시지·천간·십신 라벨 모두 빼고 평어로 합침
    return {
      sigan: branchTheme,
      sibsin,
      event,
      line: action ? `${branchTheme} — ${action}.${eventPart}` : `${branchTheme}.${eventPart}`,
    }
  }
  const branchTheme = HOUR_BRANCH_THEME_EN[branch] || `${branch} hour`
  const action = sibsin ? SIBSIN_HOUR_ACTION_EN[sibsin] : ''
  const eventPart = event ? ` ${event.en}.` : ''
  return {
    sigan: branchTheme,
    sibsin,
    event,
    line: action ? `${branchTheme} — ${action}.${eventPart}` : `${branchTheme}.${eventPart}`,
  }
}
