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
  const astro =
    pickCrossLineByTone(cross.astroDetails, tone) ||
    cleanGuidanceText(cross.astroEvidence || '', 92)
  const saju =
    pickCrossLineByTone(cross.sajuDetails, tone) || cleanGuidanceText(cross.sajuEvidence || '', 80)
  if (!astro && !saju) return ''
  const merged = [astro, saju].filter(Boolean).join(' + ')
  const prefix = locale === 'ko' ? '근거: ' : 'Evidence: '
  return cleanGuidanceText(`${prefix}${merged}`, 132)
}

export function getTimeBucket(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
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

/** 12 시지 자연 의미 — 한자 빼고 평어로 (단, 데이터에는 한자 유지) */
export const HOUR_BRANCH_THEME_KO: Record<string, string> = {
  子: '23-01시는 깊은 휴식·잠재의식이 살아나는 시간',
  丑: '1-3시는 새벽 정리·내면 묵상의 시간',
  寅: '3-5시는 큰 그림 시동·기획이 잘되는 시간',
  卯: '5-7시는 활동 시작·아침 결정에 우호적인 시간',
  辰: '7-9시는 아침 집중·핵심 1건에 좋은 시간',
  巳: '9-11시는 표현·발표·미팅이 풀리는 황금 시간',
  午: '11-13시는 결단·정렬의 정점',
  未: '13-15시는 마무리·정리·문서의 시간',
  申: '15-17시는 결과물 마감 속도가 살아나는 시간',
  酉: '17-19시는 매듭·협력 마감의 시간',
  戌: '19-21시는 회복·식사·관계의 시간',
  亥: '21-23시는 깊은 학습·내면 정리의 시간',
}

export const HOUR_BRANCH_THEME_EN: Record<string, string> = {
  子: '23–01 — deep rest, subconscious surfaces',
  丑: '01–03 — pre-dawn cleanup, inner reflection',
  寅: '03–05 — big-picture ignition, planning',
  卯: '05–07 — activity onset, morning calls',
  辰: '07–09 — morning focus, one core task',
  巳: '09–11 — golden window for expression and meetings',
  午: '11–13 — decision peak and alignment',
  未: '13–15 — wrap-up, cleanup, paperwork',
  申: '15–17 — closure speed on deliverables',
  酉: '17–19 — handoff, collaborative finish',
  戌: '19–21 — recovery, meals, relationships',
  亥: '21–23 — deep study, inner cleanup',
}

/** 시간 십신 → 행동 풀이. 십신 라벨 빼고 행동만. */
export const SIBSIN_HOUR_ACTION_KO: Record<string, string> = {
  비견: '동료·동등 협업이 자연스러운 결 — 같은 결의 사람과 함께 가세요',
  겁재: '경쟁·자원 분배가 예민한 결 — 비교 말고 본인 페이스 유지',
  식신: '표현·발표·창작이 가벼운 결 — 미팅·발표 잡기 좋음',
  상관: '강한 발산·설득의 결 — 핵심 메시지를 던지기 좋음',
  편재: '외부 거래·유동 자금이 살아나는 결 — 미팅·딜 좋음',
  정재: '안정 자금·계약 정리에 우호적인 결 — 문서·서명 다듬기',
  편관: '책임감 있게 압박을 다룰 결 — 어려운 결정 정면 돌파',
  정관: '공식 직책·규칙 안의 일에 적합한 결 — 회의·보고·검토',
  편인: '학습·내적 재정비의 결 — 책상 앞에 앉기 좋음',
  정인: '돌봄·문서·인정의 결 — 정리·기록·정중한 답신',
}

export const SIBSIN_HOUR_ACTION_EN: Record<string, string> = {
  비견: 'natural for peer-level collaboration — go alongside same-tier folks',
  겁재: 'rivalry and resource-split tension — keep your own pace',
  식신: 'expression and craft flow easily — book talks and meetings',
  상관: 'sharp persuasion window — drop the core message',
  편재: 'external deals and fluid money flow open up — pitch and trade',
  정재: 'stable income and contract cleanup — sign documents',
  편관: 'handle pressure with responsibility — face hard decisions',
  정관: 'formal roles and review work — meetings, reports',
  편인: 'learning and inner reset — desk time is productive',
  정인: 'caregiving, paperwork, recognition — organize and reply',
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

export function detectHourEvent(input: {
  natalDayStem: string
  natalDayBranch: string
  hourStem: string
  hourBranch: string
  gongmangBranches?: string[]
}): HourEvent | null {
  const { natalDayStem, natalDayBranch, hourStem, hourBranch, gongmangBranches } = input
  if (!natalDayStem || !natalDayBranch) return null
  // 천간 합 — 평어
  if (STEM_HAP_PARTNER_LOCAL[natalDayStem] === hourStem && natalDayStem !== hourStem) {
    return {
      kind: '천간합',
      shift: 'lift',
      ko: '본인 사주 흐름과 부드럽게 맞물리는 순간 — 협의·동의가 잘 맺히는 시간',
      en: 'aligns gently with your natal flow — agreements land cleanly',
    }
  }
  // 천간 충
  if (STEM_CHUNG_PAIRS.has(`${natalDayStem}-${hourStem}`)) {
    return {
      kind: '천간충',
      shift: 'press',
      ko: '본인 사주를 누르는 압박 시간 — 갈등·긴장이 일어나기 쉬움',
      en: 'a pressure window against your natal flow — friction is more likely',
    }
  }
  // 지지 합
  if (BRANCH_HAP_PARTNER[natalDayBranch] === hourBranch && natalDayBranch !== hourBranch) {
    return {
      kind: '지지합',
      shift: 'lift',
      ko: '가까운 사람·일상 결속이 단단해지는 시간',
      en: 'closeness with people and daily ties consolidates',
    }
  }
  // 지지 충
  if (BRANCH_CHUNG_PARTNER[natalDayBranch] === hourBranch) {
    return {
      kind: '지지충',
      shift: 'press',
      ko: '환경·이동·관계의 변동이 일어나기 쉬운 시간',
      en: 'environment / movement / relationships may shift',
    }
  }
  // 지지 형 (삼형)
  if (
    (BRANCH_HYUNG_TRIO_LOCAL.includes(natalDayBranch) &&
      BRANCH_HYUNG_TRIO_LOCAL.includes(hourBranch) &&
      natalDayBranch !== hourBranch) ||
    (BRANCH_HYUNG_TRIO_LOCAL2.includes(natalDayBranch) &&
      BRANCH_HYUNG_TRIO_LOCAL2.includes(hourBranch) &&
      natalDayBranch !== hourBranch)
  ) {
    return {
      kind: '지지형',
      shift: 'press',
      ko: '마찰·실수 노출이 잦은 시간 — 신중하게 가세요',
      en: 'friction / exposed mistakes are more likely — proceed carefully',
    }
  }
  // 공망
  if (gongmangBranches?.includes(hourBranch)) {
    return {
      kind: '공망',
      shift: 'press',
      ko: '결정·확정의 무게가 비는 시간 — 새 일은 미루세요',
      en: 'decisions lose weight here — defer new starts',
    }
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
  Sun: '리더십·권위·성공의 시간',
  Moon: '직관·돌봄·가정의 시간',
  Mercury: '문서·소통·학습의 시간',
  Venus: '관계·예술·재물의 시간',
  Mars: '추진력·운동·결단의 시간',
  Jupiter: '확장·교육·기회의 시간',
  Saturn: '구조화·인내·장기계획의 시간',
}
const PLANET_EN_ACTION: Record<string, string> = {
  Sun: 'leadership / authority / wins',
  Moon: 'intuition / care / home',
  Mercury: 'documents / talks / learning',
  Venus: 'relationships / art / money beauty',
  Mars: 'drive / sport / decisive moves',
  Jupiter: 'expansion / education / opportunity',
  Saturn: 'structure / patience / long-term planning',
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
  // "행성시간 / 요일주" 라벨 빼고 의미만 풀어서
  const ko = locale === 'ko'
    ? `점성 흐름은 ${PLANET_KO_ACTION[ph.planet] || ''}`
    : ''
  const en = locale === 'en'
    ? `astro window favors ${PLANET_EN_ACTION[ph.planet] || ''}`
    : ''
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
          ? `오늘 ${labelKo} 활동 점수 ${score} — 이 카테고리는 강하게 밀어도 좋음`
          : `${labelEn} activity score ${score} — push this category confidently`,
      shift: 'lift',
    }
  }
  if (score <= 35) {
    return {
      line:
        locale === 'ko'
          ? `오늘 ${labelKo} 활동 점수 ${score} — 이 카테고리는 가볍게 가는 편이 안전`
          : `${labelEn} activity score ${score} — go light on this category today`,
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
