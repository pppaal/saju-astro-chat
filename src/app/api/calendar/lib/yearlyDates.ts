import type {
  DomainKey,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from '@/lib/destiny-matrix/types'
import type { EventCategory, ImportanceGrade } from '@/lib/destiny-map/calendar/types'
import type { UserAstroProfile, UserSajuProfile } from '@/lib/destiny-map/calendar/types'
import { getJohuYongsin, MONTH_CLIMATE } from '@/lib/saju/johuYongsin'
import { calculateDailyPillar } from '@/lib/timing/ultra-precision-daily'
import { elementOfBranch, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { getShinsalHitsForDailyTarget } from '@/lib/saju/shinsal'
import { calculateUltraPrecisionScore } from '@/lib/timing/ultraPrecisionEngine'
import type { UltraPrecisionScore } from '@/lib/timing/ultra-precision-types'
import { getPlanetaryHourPlanet } from '@/lib/timing/ultra-precision-helpers'
import { getLunarMansion } from '@/lib/timing/modules/lunarMansions'

// Day-of-week planetary ruler theme. Cheap to compute (one lookup) and
// gives the user one-glance sense of the day's character before reading
// the full saju + astro stack.
const DAY_RULER_THEMES: Record<string, { planetKo: string; themeKo: string; themeEn: string }> = {
  Sun: {
    planetKo: '태양',
    themeKo: '결정·리더십·드러남에 힘이 실리는 날',
    themeEn: 'leadership / decisions / visibility',
  },
  Moon: {
    planetKo: '달',
    themeKo: '감정·관계·돌봄이 짙어지는 날',
    themeEn: 'emotion / relationships / care',
  },
  Mars: {
    planetKo: '화성',
    themeKo: '실행·추진·경쟁의 에너지가 강한 날',
    themeEn: 'execution / push / competition',
  },
  Mercury: {
    planetKo: '수성',
    themeKo: '소통·계약·이동·정보의 흐름이 빠른 날',
    themeEn: 'comms / contracts / travel / info',
  },
  Jupiter: {
    planetKo: '목성',
    themeKo: '확장·학습·기회의 호흡이 큰 날',
    themeEn: 'expansion / learning / opportunity',
  },
  Venus: {
    planetKo: '금성',
    themeKo: '재물·관계·미적 감각이 살아나는 날',
    themeEn: 'wealth / relationships / aesthetics',
  },
  Saturn: {
    planetKo: '토성',
    themeKo: '점검·책임·구조 다지기 좋은 날',
    themeEn: 'review / responsibility / structure',
  },
}

// Compose a single human-readable narrative line from the cycle
// interaction list. The cycleInteractions array can balloon to 7-9 hits
// per day; the panel shows only the top 4. The narrative folds the same
// information into one sentence so the user reads "오늘은 본명-세운이
// 합·합으로 묶이지만 본명-대운은 충" instead of parsing a bullet list.
function summarizeCycleInteractions(
  hits: Array<{ pair: string; kind: string; blurb: string }>
): string {
  if (!hits.length) return ''
  const uniquePairs = (list: Array<{ pair: string; kind: string }>): string[] =>
    Array.from(new Set(list.map((h) => h.pair))).slice(0, 3)
  const supportive = hits.filter((h) => h.kind === '천간합' || h.kind === '지지합')
  const challenging = hits.filter(
    (h) => h.kind === '천간충' || h.kind === '지지충' || h.kind === '지지형'
  )
  const minor = hits.filter((h) => h.kind === '지지해' || h.kind === '지지파' || h.kind === '자형')
  const parts: string[] = []
  if (supportive.length > 0) {
    parts.push(`${uniquePairs(supportive).join(', ')} 묶임`)
  }
  if (challenging.length > 0) {
    parts.push(`${uniquePairs(challenging).join(', ')} 충돌`)
  }
  if (parts.length === 0 && minor.length > 0) {
    parts.push(`${uniquePairs(minor).join(', ')} 작은 어긋남`)
  }
  if (parts.length === 0) return ''
  return parts.join(' / ') + ' 흐름이 동시에 작동하는 날.'
}

type CalendarLocale = 'ko' | 'en'

type YearlyMatrixCalendarContext = {
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

export interface YearlyImportantDate {
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
  /** 본문에 등장한 사주·점성 용어 → 한 줄 풀이 (프런트 툴팁용) */
  glossary?: Record<string, string>
  /** 사주 ↔ 점성 교차 확인 한 줄 + 신뢰도 % */
  crossCheck?: { line: string; agreementPercent: number }
  /** 대운 / 세운 / 월운 / 일운 — 본명 일간 기준 십신까지 박은 풀 흐름 컨텍스트 */
  longCycleContext?: {
    daeun?: {
      ganji: string
      ageStart: number
      ageEnd: number
      sibsinStem?: string
      /** Years remaining until next 대운 (fractional) */
      yearsToNext?: number
      /** True when within 1 year of next 대운 boundary */
      transitionImminent?: boolean
      /** 다음 대운 ganji + sibsin (전환 임박 시 같이 보여주려고) */
      nextGanji?: string
      nextSibsinStem?: string
    }
    sewoon?: { ganji: string; year: number; sibsinStem?: string }
    wolwoon?: { ganji: string; sibsinStem?: string }
    iljin?: { ganji: string; sibsinStem?: string; sibsinBranch?: string }
  }
  /** 운끼리의 충/합/형 — 대운·세운·월운·일운 사이 + 본명 일주 vs 각 운 */
  cycleInteractions?: Array<{
    pair: string
    kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지해' | '지지파' | '자형'
    blurb: string
  }>
  /** 운끼리 충/합 흐름을 한 줄로 종합한 자연어 요약 */
  cycleNarrative?: string
  /** 그날의 행성 지배 (요일 기반) */
  dayRuler?: {
    planet: string // 'Sun', 'Moon', ...
    planetKo: string
    themeKo: string
    themeEn: string
  }
  /** 점수 산출 분해 — 7축 weighted blend 투명성 */
  scoreBreakdown?: {
    engine: number // 0-100, saju daily (sibsin/신살/공망/12운성/energy)
    matrix: number // 0-100, long-cycle domain weighting
    cycle: number // 0-100, 운끼리 충/합/형 balance
    cross: number // 0-100, 사주↔점성 일치도
    yongsin: number // 0-100, 용신 정렬
    transit?: number // 0-100, real astrology transit aspect score
    lunarRetro?: number // 0-100, 28수 길흉 + retrograde penalties combined
    dailyShift: number // event bonus (+/-)
    weakPenalty: number // signal weakness penalty
    peakBoost: number // peak window bonus
    finalScore: number // 2-99
    sajuAxis?: number // 0-100
    astroAxis?: number // 0-100
    axisAgreement?: 'aligned' | 'mixed' | 'opposed'
  }
}

type YearlyOptions = {
  category?: EventCategory
  limit?: number
  minGrade?: ImportanceGrade
  locale?: CalendarLocale
  matrixContext?: YearlyMatrixCalendarContext | null
  /** ISO date string ("1995-02-09") or birth year. Used to resolve which
   *  10-year 대운 cycle the user is currently in when sajuProfile lacks a
   *  birthYear field. */
  birthDate?: string
  birthYear?: number
  /** Pre-computed transit aspect score per date (0-100). Keyed by
   *  YYYY-MM-DD. When present, engine folds this into the score
   *  blend as a real astrology axis. */
  dailyTransitScores?: Record<string, number>
  dailyTransitTightest?: Record<
    string,
    Array<{ transitPlanet: string; natalPoint: string; aspect: string; orb: number }>
  >
  /** Per-date list of currently-retrograde planet names (Mercury, Venus, …). */
  dailyRetrograde?: Record<string, string[]>
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
  // Recalibrated for the full-engine 7-axis blend (post 365-day
  // transit integration). Empirical 1460-date sample across 4 birth
  // charts shows percentiles p5=34, p20=41, p50=49, p80=57, p95=63
  // with mean ~48. These thresholds hit the target 5 / 15 / 50 / 25 / 5
  // distribution practitioners describe as a healthy life calendar:
  //   ≥63 최고      (top 5%)   — push, decide, ship
  //   ≥57 좋음      (next 15%) — favorable wind
  //   ≥44 평범      (middle 50%) — normal flow
  //   ≥34 조심      (next 25%) — extra check
  //    <34 지키기   (bottom 5%) — protect, defer
  if (score >= 63) return 0
  if (score >= 57) return 1
  if (score >= 44) return 2
  if (score >= 34) return 3
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
  甲: 'wood',
  乙: 'wood',
  丙: 'fire',
  丁: 'fire',
  戊: 'earth',
  己: 'earth',
  庚: 'metal',
  辛: 'metal',
  壬: 'water',
  癸: 'water',
}

const ELEMENT_LABEL_EN: Record<string, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
}

const ELEMENT_LABEL_KO: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

function relationLabelKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same':
      return '같은 결'
    case 'support':
      return '받쳐주는'
    case 'drain':
      return '에너지를 빼가는'
    case 'control':
      return '제동을 거는'
    case 'controlled':
      return '점검을 요구하는'
  }
}

function seasonElement(month: number): 'wood' | 'fire' | 'earth' | 'metal' | 'water' {
  if (month >= 3 && month <= 5) return 'wood'
  if (month >= 6 && month <= 8) return 'fire'
  if (month === 9) return 'earth'
  if (month >= 10 && month <= 11) return 'metal'
  return 'water'
}

// seasonElementOfBranch lives in @/lib/saju/datePillars (elementOfBranch)
// so saju engine + calendar engine share one mapping.

const ELEMENT_RELATIONS: Record<
  string,
  Record<string, 'same' | 'support' | 'drain' | 'control' | 'controlled'>
> = {
  wood: { wood: 'same', fire: 'drain', earth: 'control', metal: 'controlled', water: 'support' },
  fire: { fire: 'same', earth: 'drain', metal: 'control', water: 'controlled', wood: 'support' },
  earth: { earth: 'same', metal: 'drain', water: 'control', wood: 'controlled', fire: 'support' },
  metal: { metal: 'same', water: 'drain', wood: 'control', fire: 'controlled', earth: 'support' },
  water: { water: 'same', wood: 'drain', fire: 'control', earth: 'controlled', metal: 'support' },
}

// 천간 (year-stem index 0..9 = 甲乙丙丁戊己庚辛壬癸)
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const STEM_INDEX: Record<string, number> = Object.fromEntries(STEMS.map((s, i) => [s, i]))
const STEM_YIN: Record<string, boolean> = {
  甲: false,
  乙: true,
  丙: false,
  丁: true,
  戊: false,
  己: true,
  庚: false,
  辛: true,
  壬: false,
  癸: true,
}
const STEM_TO_KO_ELEMENT: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}
const ELEMENT_KO_TO_EN_MAP: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
// Branches in standard 60갑자 order (子=0 … 亥=11). Used for index math
// in 60갑자 / 공망 lookups only — solar-term-correct month branch for
// a given DATE comes from @/lib/saju/datePillars.getMonthPillarForDate.
const BRANCHES_BY_INDEX = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// Saju 月支/月干 are bound by 절기 (solar terms), not calendar months.
// The shared helper at @/lib/saju/datePillars handles the boundary
// lookup against the same KASI 절기 table the main saju engine uses —
// callers go through getMonthPillarForDate(date).

// 십신 (day-master vs target stem)
function getSibsinKo(dayStem: string, targetStem: string): string {
  const dayEl = STEM_TO_KO_ELEMENT[dayStem]
  const tEl = STEM_TO_KO_ELEMENT[targetStem]
  if (!dayEl || !tEl) return ''
  const elements = ['목', '화', '토', '금', '수']
  const samePolarity = STEM_YIN[dayStem] === STEM_YIN[targetStem]
  const dayIdx = elements.indexOf(dayEl)
  const tIdx = elements.indexOf(tEl)
  const diff = (tIdx - dayIdx + 5) % 5
  // diff 0 same el, 1 day produces target (식상), 2 day controls target (재성),
  // 3 target controls day (관성), 4 target produces day (인성)
  const labels = [
    ['비견', '겁재'], // 0
    ['식신', '상관'], // 1
    ['편재', '정재'], // 2
    ['편관', '정관'], // 3
    ['편인', '정인'], // 4
  ]
  return labels[diff][samePolarity ? 0 : 1]
}

const SIBSIN_THEME_KO: Record<string, string> = {
  비견: '동료·동료성 협업',
  겁재: '경쟁·자원 분배 신경전',
  식신: '꾸준한 표현·생산 활동',
  상관: '강한 발산·표현·창작',
  편재: '유동적인 돈 흐름·외부 거래',
  정재: '고정 수입·계약 안정',
  편관: '도전적 책임·압박 업무',
  정관: '공식 직책·규칙 안의 일',
  편인: '학습·내적 정리 시간',
  정인: '돌봄·문서·인정의 흐름',
}

const SIBSIN_THEME_EN: Record<string, string> = {
  비견: 'peer collaboration, even-keeled work',
  겁재: 'rivalry, contested resources',
  식신: 'steady output and craft',
  상관: 'strong expression and bold moves',
  편재: 'fluid money flow and external deals',
  정재: 'stable income and contract work',
  편관: 'pressing responsibility and high-stakes tasks',
  정관: 'official roles within rules',
  편인: 'learning and inner reset',
  정인: 'caregiving, paperwork, recognition',
}

// 12신살 핵심 4종 — 일지 三合 그룹별 트리거 월지
const SAMHAP_GROUP: Record<string, '寅午戌' | '申子辰' | '巳酉丑' | '亥卯未'> = {
  寅: '寅午戌',
  午: '寅午戌',
  戌: '寅午戌',
  申: '申子辰',
  子: '申子辰',
  辰: '申子辰',
  巳: '巳酉丑',
  酉: '巳酉丑',
  丑: '巳酉丑',
  亥: '亥卯未',
  卯: '亥卯未',
  未: '亥卯未',
}
const SHINSAL_TRIGGERS: Record<
  '寅午戌' | '申子辰' | '巳酉丑' | '亥卯未',
  { 역마: string; 도화: string; 화개: string; 망신: string }
> = {
  寅午戌: { 역마: '申', 도화: '卯', 화개: '戌', 망신: '巳' },
  申子辰: { 역마: '寅', 도화: '酉', 화개: '辰', 망신: '亥' },
  巳酉丑: { 역마: '亥', 도화: '午', 화개: '丑', 망신: '申' },
  亥卯未: { 역마: '巳', 도화: '子', 화개: '未', 망신: '寅' },
}
function activeSinsals(dayBranch: string, transitBranch: string): string[] {
  const grp = SAMHAP_GROUP[dayBranch]
  if (!grp) return []
  const trig = SHINSAL_TRIGGERS[grp]
  const out: string[] = []
  if (trig.역마 === transitBranch) out.push('역마')
  if (trig.도화 === transitBranch) out.push('도화')
  if (trig.화개 === transitBranch) out.push('화개')
  if (trig.망신 === transitBranch) out.push('망신')
  return out
}
const SINSAL_BLURB_KO: Record<string, string> = {
  역마: '환경 이동·출장·전직 신호',
  도화: '관계 끌림·매력·공개 자리',
  화개: '내적 정리·예술·고요',
  망신: '체면 흔들림 주의·실수 점검',
}

const SINSAL_BLURB_EN: Record<string, string> = {
  역마: 'movement / travel / job-change signal',
  도화: 'attraction / charm / public spotlight',
  화개: 'introspection / art / quiet',
  망신: 'face-loss caution / check for slips',
}

const SINSAL_LABEL_EN: Record<string, string> = {
  역마: 'Yeokma',
  도화: 'Dohwa',
  화개: 'Hwagae',
  망신: 'Mangshin',
}

// ───── 일진(오늘의 일주) × 본명 일주 상호작용 ─────
const STEM_HAP_PARTNER: Record<string, { partner: string; transform: string }> = {
  甲: { partner: '己', transform: '토' },
  乙: { partner: '庚', transform: '금' },
  丙: { partner: '辛', transform: '수' },
  丁: { partner: '壬', transform: '목' },
  戊: { partner: '癸', transform: '화' },
  己: { partner: '甲', transform: '토' },
  庚: { partner: '乙', transform: '금' },
  辛: { partner: '丙', transform: '수' },
  壬: { partner: '丁', transform: '목' },
  癸: { partner: '戊', transform: '화' },
}
const STEM_CHUNG_SET = new Set([
  '甲-庚',
  '庚-甲',
  '乙-辛',
  '辛-乙',
  '丙-壬',
  '壬-丙',
  '丁-癸',
  '癸-丁',
])
const BRANCH_HAP_PARTNER: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}
const BRANCH_CHUNG_PARTNER: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}
const BRANCH_HAE_PAIRS = new Set([
  '子-未',
  '未-子',
  '丑-午',
  '午-丑',
  '寅-巳',
  '巳-寅',
  '卯-辰',
  '辰-卯',
  '申-亥',
  '亥-申',
  '酉-戌',
  '戌-酉',
])
const BRANCH_PA_PAIRS = new Set([
  '子-酉',
  '酉-子',
  '丑-辰',
  '辰-丑',
  '寅-亥',
  '亥-寅',
  '卯-午',
  '午-卯',
  '申-巳',
  '巳-申',
  '未-戌',
  '戌-未',
])
const BRANCH_HYUNG_TRIO = ['寅', '巳', '申']
const BRANCH_HYUNG_TRIO2 = ['丑', '戌', '未']
const BRANCH_HYUNG_PAIR = new Set(['子-卯', '卯-子'])

// 삼합 — 3-branch combination. When all three are present across the
// natal+cycle slots, the saju framework treats it as a strong unified
// flow producing the leader element.
const BRANCH_TRIPLES_SAMHAP: Array<{ members: string[]; result: string; label: string }> = [
  { members: ['亥', '卯', '未'], result: '목', label: '亥卯未 목 삼합' },
  { members: ['寅', '午', '戌'], result: '화', label: '寅午戌 화 삼합' },
  { members: ['巳', '酉', '丑'], result: '금', label: '巳酉丑 금 삼합' },
  { members: ['申', '子', '辰'], result: '수', label: '申子辰 수 삼합' },
]
// 방합 — 3-branch seasonal alignment. Same idea as 삼합 but quarter-of-year.
const BRANCH_TRIPLES_BANGHAP: Array<{ members: string[]; result: string; label: string }> = [
  { members: ['寅', '卯', '辰'], result: '목', label: '寅卯辰 봄 방합' },
  { members: ['巳', '午', '未'], result: '화', label: '巳午未 여름 방합' },
  { members: ['申', '酉', '戌'], result: '금', label: '申酉戌 가을 방합' },
  { members: ['亥', '子', '丑'], result: '수', label: '亥子丑 겨울 방합' },
]
// 원진 — 6 paired branches that don't get along (relational friction).
const BRANCH_WONJIN_PAIRS = new Set([
  '子-未',
  '未-子',
  '丑-午',
  '午-丑',
  '寅-酉',
  '酉-寅',
  '卯-申',
  '申-卯',
  '辰-亥',
  '亥-辰',
  '巳-戌',
  '戌-巳',
])

type DailyEvent = {
  kind:
    | '천간합'
    | '천간충'
    | '지지합'
    | '지지충'
    | '지지형'
    | '지지해'
    | '지지파'
    | '자형'
    | '공망'
    | '평이'
    | '12신살'
    | '도화'
    | '천을귀인'
    | '양인'
    | '현침'
  label: string
  labelEn: string
  blurb: string
  blurbEn: string
  scoreShift: number
  warningWeight?: number
}

// Per-date shinsal blurbs. Speaks to "today is your X day" energy in
// plain Korean — no hanja jargon on the user-facing surface.
const TWELVE_SHINSAL_BLURB_KO: Record<string, string> = {
  장성: '오늘은 추진력·결단력이 살아나는 장성일 — 핵심 의사결정 한 번에 묶어 처리하기 좋아요.',
  반안: '안정감·체면이 받쳐주는 반안일 — 자리를 정리하거나 공식적인 자리에 좋아요.',
  역마: '환경 이동·출장·전직 신호가 강한 역마일 — 멀리 움직이거나 외부 미팅 잡기 좋아요.',
  육해: '자질구레한 마찰·소모 신호가 잦은 육해일 — 결정보다 정리·점검 우선.',
  화개: '내적 정리·예술·고독한 시간이 깊어지는 화개일 — 글쓰기·복기에 좋아요.',
  겁살: '뺏기거나 휘둘리기 쉬운 겁살일 — 큰 약속·서명은 한 박자 늦추세요.',
  재살: '관재·다툼 신호가 짙은 재살일 — 갈등 라인은 오늘 피하세요.',
  천살: '예상 밖 변수가 들어오는 천살일 — 플랜B 챙기고 무리한 일정 피하세요.',
  지살: '활동·이동·외부 자극이 늘어나는 지살일 — 짧은 외출이나 답사에 좋아요.',
  년살: '관계 끌림·매력이 살아나는 년살일(도화) — 새로운 만남·발표에 좋아요.',
  월살: '자원·체력 소모가 큰 월살일 — 무리하지 말고 회복 시간 확보.',
  망신: '체면 흔들림·실수 노출 가능성이 있는 망신일 — 큰 자리·SNS는 조용히.',
}
const TWELVE_SHINSAL_BLURB_EN: Record<string, string> = {
  장성: 'Strong drive and decisive energy — bundle key decisions today.',
  반안: 'Stability and reputation back you up — good for formal/admin moves.',
  역마: 'Movement / travel / role-change signal — schedule away-meetings or trips.',
  육해: 'Petty friction and drain — favor cleanup over commitments.',
  화개: 'Inner-work / art / solitude deepens — write, reflect, revisit.',
  겁살: 'Easy to get pulled or robbed — defer big signatures one beat.',
  재살: 'Dispute / friction signal — avoid conflict-prone lanes today.',
  천살: 'Unexpected variables — keep a plan B, don’t overschedule.',
  지살: 'External stimulation rises — short trips and field visits work well.',
  년살: 'Attraction / charm runs high — favorable for meetings and reveals.',
  월살: 'Resource / energy drain — protect recovery time.',
  망신: 'Reputation can wobble — keep a low profile on public stages.',
}
const TWELVE_SHINSAL_SCORE: Record<string, number> = {
  장성: 1.6,
  반안: 1.0,
  역마: 0.6,
  육해: -0.8,
  화개: 0.4,
  겁살: -1.4,
  재살: -1.6,
  천살: -1.2,
  지살: 0.6,
  년살: 0.8,
  월살: -1.0,
  망신: -1.3,
}
const TWELVE_SHINSAL_WARN: Record<string, number> = {
  겁살: 1,
  재살: 2,
  천살: 1,
  월살: 1,
  망신: 1,
}

function gongmangBranches(natalStem: string, natalBranch: string): [string, string] | null {
  const sIdx = STEM_INDEX[natalStem]
  const bIdx = BRANCHES_BY_INDEX.indexOf(natalBranch)
  if (sIdx < 0 || bIdx < 0) return null
  // 60갑자 인덱스: i % 10 === sIdx, i % 12 === bIdx 인 i (0..59)
  let cycleIdx = -1
  for (let i = 0; i < 60; i++) {
    if (i % 10 === sIdx && i % 12 === bIdx) {
      cycleIdx = i
      break
    }
  }
  if (cycleIdx < 0) return null
  const groupStart = cycleIdx - (cycleIdx % 10) // 갑X일 시작 인덱스
  const firstBranchIdx = groupStart % 12
  return [
    BRANCHES_BY_INDEX[(firstBranchIdx + 10) % 12],
    BRANCHES_BY_INDEX[(firstBranchIdx + 11) % 12],
  ]
}

function analyzeDailyPillarEvents(
  natalStem: string,
  natalBranch: string,
  dailyStem: string,
  dailyBranch: string
): DailyEvent[] {
  const events: DailyEvent[] = []
  if (!natalStem || !natalBranch) return events
  // 천간합
  if (STEM_HAP_PARTNER[natalStem]?.partner === dailyStem) {
    const transform = STEM_HAP_PARTNER[natalStem].transform
    const transformEn = ELEMENT_LABEL_EN[ELEMENT_KO_TO_EN_MAP[transform]] || transform
    events.push({
      kind: '천간합',
      label: `${natalStem}-${dailyStem} 천간합(${transform})`,
      labelEn: `${natalStem}-${dailyStem} stem combine (${transformEn})`,
      blurb: '본인 사주 흐름과 부드럽게 맞물려서 협의·동의가 잘 떨어지는 날',
      blurbEn: 'binds with the natal day-master — collaboration and agreement land cleanly',
      scoreShift: 2.5,
    })
  }
  // 천간충
  if (STEM_CHUNG_SET.has(`${natalStem}-${dailyStem}`)) {
    events.push({
      kind: '천간충',
      label: `${natalStem}-${dailyStem} 천간충`,
      labelEn: `${natalStem}-${dailyStem} stem clash`,
      blurb: '본인 사주를 누르는 압박이 들어오는 날 — 갈등·긴장 주의',
      blurbEn: 'presses against the natal day-master — friction and conflict are likely',
      scoreShift: -2.5,
      warningWeight: 1,
    })
  }
  // 지지합
  if (BRANCH_HAP_PARTNER[natalBranch] === dailyBranch && natalBranch !== dailyBranch) {
    events.push({
      kind: '지지합',
      label: `${natalBranch}-${dailyBranch} 지지육합`,
      labelEn: `${natalBranch}-${dailyBranch} branch combine`,
      blurb: '가까운 관계·일상이 단단해지는 시기',
      blurbEn: 'close relationships and daily ties consolidate',
      scoreShift: 2,
    })
  }
  // 지지충
  if (BRANCH_CHUNG_PARTNER[natalBranch] === dailyBranch) {
    events.push({
      kind: '지지충',
      label: `${natalBranch}-${dailyBranch} 지지충`,
      labelEn: `${natalBranch}-${dailyBranch} branch clash`,
      blurb: '환경·이동·관계의 변동이 잦은 시기',
      blurbEn: 'environment / movement / relationships shift more than usual',
      scoreShift: -2,
      warningWeight: 1,
    })
  }
  // 지지형 (삼형 + 子卯형 + 자형)
  const inTrio = (set: string[]) =>
    set.includes(natalBranch) && set.includes(dailyBranch) && natalBranch !== dailyBranch
  if (
    inTrio(BRANCH_HYUNG_TRIO) ||
    inTrio(BRANCH_HYUNG_TRIO2) ||
    BRANCH_HYUNG_PAIR.has(`${natalBranch}-${dailyBranch}`)
  ) {
    events.push({
      kind: '지지형',
      label: `${natalBranch}-${dailyBranch} 형`,
      labelEn: `${natalBranch}-${dailyBranch} punish`,
      blurb: '마찰·실수 노출·구설 가능성',
      blurbEn: 'friction / exposed mistakes / harsh words are more likely',
      scoreShift: -3,
      warningWeight: 2,
    })
  } else if (natalBranch === dailyBranch) {
    events.push({
      kind: '자형',
      label: `${natalBranch} 자형`,
      labelEn: `${natalBranch} self-punish`,
      blurb: '내적 마찰·과로·신경전이 일어나기 쉬움',
      blurbEn: 'inner friction / overwork / nerves run high',
      scoreShift: -1.2,
    })
  }
  // 지지해
  if (BRANCH_HAE_PAIRS.has(`${natalBranch}-${dailyBranch}`)) {
    events.push({
      kind: '지지해',
      label: `${natalBranch}-${dailyBranch} 해`,
      labelEn: `${natalBranch}-${dailyBranch} harm`,
      blurb: '오해·어긋남·관계 균열 가능성',
      blurbEn: 'misunderstandings / drift / relationship cracks may surface',
      scoreShift: -1.5,
      warningWeight: 1,
    })
  }
  // 지지파
  if (BRANCH_PA_PAIRS.has(`${natalBranch}-${dailyBranch}`)) {
    events.push({
      kind: '지지파',
      label: `${natalBranch}-${dailyBranch} 파`,
      labelEn: `${natalBranch}-${dailyBranch} break`,
      blurb: '진행 중인 일이 살짝 틀어질 수 있어요',
      blurbEn: 'in-progress work can drift slightly off course',
      scoreShift: -1,
    })
  }
  // 공망
  const gongmang = gongmangBranches(natalStem, natalBranch)
  if (gongmang && gongmang.includes(dailyBranch)) {
    events.push({
      kind: '공망',
      label: `${dailyBranch} 공망일`,
      labelEn: `${dailyBranch} void day`,
      blurb: '결정·확정의 무게가 가벼운 날 — 새 일은 미루는 편',
      blurbEn: 'commitments lose weight today — defer new starts',
      scoreShift: -1.8,
      warningWeight: 1,
    })
  }

  // Engine-grade shinsal scan: which natal-driven sinsals fire when
  // today's day branch lands on the target. This is what users actually
  // expect from a saju calendar — "오늘은 너의 도화일/역마일/…".
  for (const hit of getShinsalHitsForDailyTarget(natalStem, natalBranch, dailyBranch)) {
    const k = hit.kind as string
    // 12신살 — anchor blurb pool above. Treat anything matching as a
    // 12신살 event with the original kind name kept in label.
    const twelveBlurb = TWELVE_SHINSAL_BLURB_KO[k]
    if (twelveBlurb) {
      events.push({
        kind: '12신살',
        label: `${k}일`,
        labelEn: `${k} day`,
        blurb: twelveBlurb,
        blurbEn: TWELVE_SHINSAL_BLURB_EN[k] || twelveBlurb,
        scoreShift: TWELVE_SHINSAL_SCORE[k] ?? 0,
        warningWeight: TWELVE_SHINSAL_WARN[k],
      })
      continue
    }
    if (k === '도화') {
      events.push({
        kind: '도화',
        label: '도화일',
        labelEn: '도화 day',
        blurb: '관계 끌림·매력·노출이 살아나는 도화일 — 미팅·소개·발표에 유리.',
        blurbEn: 'Charm and attraction surface — meetings, intros, reveals favored.',
        scoreShift: 1.0,
      })
    } else if (k === '천을귀인') {
      events.push({
        kind: '천을귀인',
        label: '천을귀인일',
        labelEn: '천을귀인 day',
        blurb: '결정적인 순간에 도움 주는 사람이 가까이 있는 날 — 자문·부탁 던져 보세요.',
        blurbEn: 'A helpful figure is near — ask for advice or favors today.',
        scoreShift: 1.8,
      })
    } else if (k === '양인') {
      events.push({
        kind: '양인',
        label: '양인일',
        labelEn: '양인 day',
        blurb: '추진력은 강하지만 과격해질 수 있는 양인일 — 결단은 좋되 말투·태도 한 번 더 점검.',
        blurbEn: 'Strong drive but sharp edges — decisive yet check tone & posture.',
        scoreShift: 0.6,
        warningWeight: 1,
      })
    } else if (k === '현침') {
      events.push({
        kind: '현침',
        label: '현침일',
        labelEn: '현침 day',
        blurb: '말·문서·인쇄 영역에서 날카로운 표현이 살아나는 현침일 — 정밀한 글/계약에 유리.',
        blurbEn: 'Sharp phrasing and precision land well — good for writing/contracts.',
        scoreShift: 0.5,
      })
    }
  }

  return events
}

function getSibsinDailyKo(dayStem: string, dailyStem: string): string {
  return getSibsinKo(dayStem, dailyStem)
}

const GLOSSARY_KO: Record<string, string> = {
  // 십신
  비견: '나와 같은 오행·성별 — 동료, 동등한 협업 흐름',
  겁재: '나와 같은 오행·반대 성별 — 경쟁자, 자원을 나누는 관계',
  식신: '내가 만들어내는 부드러운 산출 — 꾸준한 표현·생산',
  상관: '내가 만들어내는 강한 발산 — 창의·도전·말발',
  편재: '내가 통제할 자원·외부 거래 — 유동적인 돈 흐름',
  정재: '내가 안정적으로 거두는 자원 — 고정 수입·계약',
  편관: '나를 누르는 강한 책임 — 도전적·압박형 업무',
  정관: '나를 다스리는 정식 직책 — 공식·규칙 안의 일',
  편인: '나를 키우는 비주류 인성 — 학습·내적 재정비',
  정인: '나를 키우는 정식 인성 — 돌봄·문서·인정',
  // 신살
  역마: '이동·출장·전직 같은 환경 변동 신호',
  도화: '관계 끌림·매력·공개적인 자리에 서기 좋은 흐름',
  화개: '내적 정리·예술·고독한 시간이 깊어지는 흐름',
  망신: '체면 흔들림·실수 노출에 조심해야 하는 흐름',
  // 사주 기본 어휘
  일간: '내 사주의 기준 천간(태어난 날의 위 글자) — 본인 그 자체',
  일지: '태어난 날의 아래 글자(地支) — 배우자 자리·내 일상의 분위기',
  월간: '태어난 달의 위 글자(천간) — 사회·직장·환경의 분위기',
  월지: '태어난 달의 아래 글자(지지) — 시기·계절·격국의 뿌리',
  대운: '10년 단위의 큰 운 흐름',
  세운: '한 해의 운 흐름',
  격국: '사주가 어떤 틀에 가까운지(정관격·정재격 등) — 본명의 큰 성격',
  조후용신: '계절(月)에 비춰 본명을 살리는 핵심 오행',
  // 오행
  목: '나무 — 자라남·계획·시작',
  화: '불 — 표현·확장·열정',
  토: '흙 — 중재·신뢰·축적',
  금: '쇠 — 결단·구조·정리',
  수: '물 — 지혜·휴식·흐름',
  // 점성
  네이탈: '태어난 순간의 천체 위치(본명 차트)',
  트랜짓: '오늘 하늘에 떠 있는 행성과 본명의 만남',
  '환절기 트랜짓': '계절이 바뀌는 구간(3·9월 등)에 일어나는 외부 신호',
  // 분석 용어
  교차: '사주와 점성이 같은 방향을 가리키는지 확인하는 cross-check',
}

const GLOSSARY_EN: Record<string, string> = {
  // 십신 (sibsin)
  비견: 'Bigyeon — same element & polarity: a peer, even-keeled collaboration',
  겁재: 'Geopjae — same element opposite polarity: rivalry, resources are split',
  식신: 'Sikshin — soft output you produce: steady expression and craft',
  상관: 'Sanggwan — strong output you radiate: creativity, daring, sharp speech',
  편재: 'Pyeonjae — moving wealth you handle externally: fluid money flow',
  정재: 'Jeongjae — stable wealth you collect: fixed income, contracts',
  편관: 'Pyeongwan — pressing responsibility: high-stakes / pressured work',
  정관: 'Jeonggwan — formal authority over you: official roles within rules',
  편인: 'Pyeonin — non-mainstream nurture: learning, inner reset',
  정인: 'Jeongin — formal nurture: care, paperwork, recognition',
  // 신살 (sinsal)
  역마: 'Yeokma — movement / travel / job-change signal',
  도화: 'Dohwa — attraction / charm / public spotlight',
  화개: 'Hwagae — inner cleanup / art / solitude deepens',
  망신: 'Mangshin — caution against face-loss / exposed slips',
  // 사주 기본
  일간: 'Day-master (top character of birth day): the self',
  일지: 'Day-branch (bottom character of birth day): spouse-seat / daily texture',
  월간: 'Month-stem (top of birth month): social / work environment',
  월지: 'Month-branch (bottom of birth month): season / root of the geokguk',
  대운: 'Daeun — 10-year major luck cycle',
  세운: 'Seun — single-year luck flow',
  격국: 'Geokguk — chart structure (정관격, 정재격 …): the natal frame',
  조후용신: 'Johu-yongsin — season-balancing element that keeps the chart healthy',
  // 오행
  목: 'Wood — growing, planning, beginnings',
  화: 'Fire — expression, expansion, passion',
  토: 'Earth — mediation, trust, accumulation',
  금: 'Metal — decision, structure, cleanup',
  수: 'Water — wisdom, rest, flow',
  // 점성
  네이탈: 'Natal — planetary positions at the moment of birth',
  트랜짓: 'Transit — current sky planets meeting your natal chart',
  '환절기 트랜짓':
    'Shoulder-season transits (around March / September equinoxes etc.) — external prompts',
  // 분석 용어
  교차: 'Cross-check — verifying that saju and astrology point the same way',
}

function pickGlossaryTerms(text: string): string[] {
  const out: string[] = []
  for (const term of Object.keys(GLOSSARY_KO)) {
    if (text.includes(term)) out.push(term)
  }
  return out
}

function buildCrossCheckLineKo(percent: number): string {
  if (percent >= 75) {
    return `사주 신호와 점성 신호가 ${percent}%로 같은 방향을 가리킵니다. 둘이 동시에 받쳐줘 결정의 신뢰도가 높습니다.`
  }
  if (percent >= 55) {
    return `사주·점성 교차 일치도 ${percent}% — 큰 줄기는 같지만 세부에서 갈리니 핵심만 잡고 나머지는 미루는 편이 안전합니다.`
  }
  return `사주·점성 교차 일치도 ${percent}%로 낮습니다. 한쪽 신호만 보고 움직이지 말고 다른 축에서 다시 확인하세요.`
}

function buildCrossCheckLineEn(percent: number): string {
  if (percent >= 75) {
    return `Saju and astrology align at ${percent}% — both axes back the same direction, so confidence is high.`
  }
  if (percent >= 55) {
    return `Cross-check ${percent}% — broad direction holds but details diverge; keep the core moves and defer the rest.`
  }
  return `Cross-check ${percent}% — signals diverge. Don't move on a single axis; verify on the other before committing.`
}

function hasFinalConsonant(ko: string): boolean {
  if (!ko) return false
  const ch = ko.charCodeAt(ko.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 !== 0
}

function objectMarkerKo(label: string): string {
  return hasFinalConsonant(label) ? '을' : '를'
}

function subjectMarkerKo(label: string): string {
  return hasFinalConsonant(label) ? '이' : '가'
}

function topicMarkerKo(label: string): string {
  return hasFinalConsonant(label) ? '은' : '는'
}

const MOON_GRAIN_KO: Record<DomainKey, string> = {
  career: '실행 동기',
  love: '감정 흐름',
  money: '결정 흐름',
  health: '리듬',
  move: '의지 흐름',
}

const SIGN_KO_LABEL: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}
function sunSignKoLabel(sign: string | undefined): string {
  if (!sign) return '태양'
  return SIGN_KO_LABEL[sign] || sign
}
const SIGN_DOMAIN_FLAVOR_KO: Record<string, Partial<Record<DomainKey, string>>> = {
  Aries: {
    career: '주도형 추진력',
    love: '직진형 표현',
    money: '빠른 결단',
    health: '활동형 회복',
    move: '단발적 이동',
  },
  Taurus: {
    career: '꾸준한 누적',
    love: '안정 지향',
    money: '자산·실물 관리',
    health: '리듬 누적',
    move: '계획적 이동',
  },
  Gemini: {
    career: '커뮤니케이션·다중 라인',
    love: '대화 중심',
    money: '단기 거래',
    health: '두뇌·호흡',
    move: '잦은 이동',
  },
  Cancer: {
    career: '돌봄·기반 다지기',
    love: '정서 결속',
    money: '생활 자금',
    health: '정서 회복',
    move: '귀가·홈베이스',
  },
  Leo: {
    career: '주목·발표',
    love: '표현·로맨스',
    money: '대담한 베팅',
    health: '심장·체력',
    move: '공식 자리',
  },
  Virgo: {
    career: '디테일·운영',
    love: '세심한 배려',
    money: '예산 정리',
    health: '식습관·점검',
    move: '점검형 이동',
  },
  Libra: {
    career: '협상·중재',
    love: '관계 균형',
    money: '공동 결제',
    health: '균형·자세',
    move: '동행 이동',
  },
  Scorpio: {
    career: '집중·재구성',
    love: '깊은 결속',
    money: '레버리지·차입',
    health: '대사·해독',
    move: '비공개 이동',
  },
  Sagittarius: {
    career: '확장·기획',
    love: '오픈 마인드',
    money: '큰 그림 투자',
    health: '하체·간',
    move: '장거리 이동',
  },
  Capricorn: {
    career: '구조·책임',
    love: '진중한 약속',
    money: '장기 자산',
    health: '뼈·관절',
    move: '업무 출장',
  },
  Aquarius: {
    career: '혁신·네트워크',
    love: '거리 있는 우정형',
    money: '신기술 투자',
    health: '신경계',
    move: '돌발 이동',
  },
  Pisces: {
    career: '창작·직관',
    love: '교감·헌신',
    money: '감정 소비',
    health: '면역·수면',
    move: '내면 여행',
  },
}
function signHouseFlavorKo(sign: string | undefined, domain: DomainKey): string {
  if (!sign) return '본인 축의 색을 드러내는 시기'
  return SIGN_DOMAIN_FLAVOR_KO[sign]?.[domain] || `${sunSignKoLabel(sign)} 색이 흐름에 묻어납니다`
}

const MOON_GRAIN_EN: Record<DomainKey, string> = {
  career: 'execution drive',
  love: 'emotional grain',
  money: 'decision flow',
  health: 'rhythm',
  move: 'momentum',
}

function getMonthStrength(rows: MonthlyOverlapPoint[] | undefined, month: string): number {
  if (!rows?.length) return 0
  return rows
    .filter((item) => item.month === month)
    .reduce((max, item) => Math.max(max, item.overlapStrength || 0), 0)
}

function getDomainBase(
  matrixContext: YearlyMatrixCalendarContext | null | undefined,
  domain: DomainKey
): number {
  const raw = matrixContext?.domainScores?.[domain]?.finalScoreAdjusted
  if (!Number.isFinite(raw)) return 0.52
  return clamp(Number(raw) / 10, 0, 1)
}

function pickTopDomains(
  matrixContext: YearlyMatrixCalendarContext | null | undefined,
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
    rising: ['일이 잘 풀리는 날', '결단 내리기 좋은 날', '커리어가 한 걸음 나아가는 날'],
    aligned: ['일이 가지런히 정리되는 날', '우선순위가 잘 잡히는 날', '무리 없이 진도 나가는 날'],
    wavering: ['일을 한 번 점검할 날', '속도를 늦추고 가야 할 날', '조정이 필요한 날'],
    guarded: ['크게 벌이지 말아야 할 날', '한 발 물러서야 할 날', '오늘은 자제하는 게 좋아요'],
  },
  love: {
    rising: ['관계가 따뜻해지는 날', '대화가 잘 풀리는 날', '마음이 통하는 날'],
    aligned: ['감정 정리하기 좋은 날', '관계 한 걸음 다가설 날', '분위기가 잘 맞는 날'],
    wavering: ['관계 거리 조정이 필요한 날', '대화 톤을 낮춰야 할 날', '마음이 살짝 엇갈리는 날'],
    guarded: ['관계 충돌을 피해야 할 날', '말 아껴야 할 날', '오늘은 표현 자제하세요'],
  },
  money: {
    rising: ['돈 결정이 가벼워지는 날', '재정이 잘 풀리는 날', '돈 흐름이 살아나는 날'],
    aligned: ['예산 정리하기 좋은 날', '수입과 지출 균형 잡기 좋은 날', '재정 정돈하기 좋은 날'],
    wavering: ['재정을 점검할 날', '큰 지출을 미룰 날', '돈 결정 흐릿한 날'],
    guarded: ['큰 결제 자제할 날', '돈 잘 챙겨야 할 날', '재정 보호 우선의 날'],
  },
  health: {
    rising: ['컨디션 회복이 빠른 날', '루틴 잡기 좋은 날', '몸이 가벼운 날'],
    aligned: ['건강 점검에 좋은 날', '체력 채우기 좋은 날', '리듬 잡기 무난한 날'],
    wavering: ['몸 무리하지 말 날', '컨디션 점검이 필요한 날', '회복 우선의 날'],
    guarded: ['몸 사려야 할 날', '체력 비축할 날', '쉬는 게 우선인 날'],
  },
  move: {
    rising: ['이동·추진이 가벼운 날', '환경 바꾸기 좋은 날', '이동 결정 매끄러운 날'],
    aligned: ['이동 일정 정리할 날', '동선 점검에 좋은 날', '환경 조정 좋은 날'],
    wavering: ['이동 점검이 필요한 날', '동선 변경 자제할 날', '이동 결정 미룰 날'],
    guarded: ['큰 이동 자제할 날', '환경 변화 신중히 갈 날', '오늘은 자리 지키는 게 좋아요'],
  },
}

const TITLE_POOL_EN: Record<DomainKey, Record<StrengthTier, string[]>> = {
  career: {
    rising: ['Career momentum day', 'Strong push for career calls', 'Career-decision-friendly day'],
    aligned: [
      'Career flow lines up well',
      'Career priorities settle cleanly',
      'Smooth career execution day',
    ],
    wavering: ['Career review day', 'Slow down career pace', 'Career adjustment day'],
    guarded: ['Conservative career day', 'Hold career bets today', 'Career step-back day'],
  },
  love: {
    rising: ['Warm relationship day', 'Conversations open up', 'Clear relationship signals'],
    aligned: [
      'Relationship alignment day',
      'Good for emotional reset',
      'Relationship step-forward day',
    ],
    wavering: [
      'Relationship distance review',
      'Mixed relationship signals',
      'Lower the conversation tone',
    ],
    guarded: [
      'Conservative relationship day',
      'Avoid relationship friction',
      'Hold expressions today',
    ],
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

function pickTopDailyEvent(events: DailyEvent[]): DailyEvent | null {
  if (!events.length) return null
  // 강도 큰 이벤트 우선 (충/형/공망 > 합 > 해/파 > 자형)
  const sorted = [...events].sort((a, b) => Math.abs(b.scoreShift) - Math.abs(a.scoreShift))
  return sorted[0]
}

const DAILY_EVENT_BADGE_KO: Record<DailyEvent['kind'], string> = {
  천간합: '결속의 날',
  천간충: '압박 주의',
  지지합: '관계 결속',
  지지충: '변동 주의',
  지지형: '마찰 주의',
  지지해: '오해 주의',
  지지파: '틀어짐 주의',
  자형: '내적 마찰',
  공망: '결정 비는 날',
  평이: '',
  '12신살': '신살 발동',
  도화: '도화 발동',
  천을귀인: '귀인일',
  양인: '양인일',
  현침: '현침일',
}

const DAILY_EVENT_BADGE_EN: Record<DailyEvent['kind'], string> = {
  천간합: 'Bonding',
  천간충: 'Pressure',
  지지합: 'Closeness',
  지지충: 'Shift risk',
  지지형: 'Friction',
  지지해: 'Misread risk',
  지지파: 'Drift risk',
  자형: 'Inner friction',
  공망: 'Hollow day',
  평이: '',
  '12신살': 'Sinsal active',
  도화: 'Charm active',
  천을귀인: 'Helper day',
  양인: 'Yangin day',
  현침: 'Sharp-edge day',
}

function buildTitle(
  locale: CalendarLocale,
  domain: DomainKey,
  tier: StrengthTier,
  sibsin: string,
  dailyEvents: DailyEvent[],
  seed: string
): string {
  const pool = (locale === 'ko' ? TITLE_POOL_KO : TITLE_POOL_EN)[domain][tier]
  const base = pickBySeed(seed, pool)

  // 충/형/공망/천간합 같이 점수 변동이 큰 이벤트는 캘린더 한눈에 보이도록 배지로 prepend
  const top = pickTopDailyEvent(dailyEvents)
  const HEAVY: DailyEvent['kind'][] = ['천간충', '지지충', '지지형', '공망', '천간합', '지지합']
  const showBadge = top && Math.abs(top.scoreShift) >= 2 && HEAVY.includes(top.kind)
  const badge = showBadge
    ? locale === 'ko'
      ? DAILY_EVENT_BADGE_KO[top.kind]
      : DAILY_EVENT_BADGE_EN[top.kind]
    : ''

  // 십신 라벨(편인/정관 등) prefix 빼고 본문만. 이벤트 배지만 평어로 prepend.
  if (badge) {
    return `[${badge}] ${base}`
  }
  return base
}

/**
 * 같은 grade·도메인의 다른 날들이 똑같은 description으로 떨어지지 않게,
 * 일주 이벤트(충/합/형/공망)와 점수 밴드를 활용한 day-specific suffix 한 줄을 만듭니다.
 */
function buildDayDescriptionSuffixKo(input: {
  dailyEvents?: DailyEvent[]
  score?: number
  label: string
}): string {
  const { dailyEvents, score, label } = input
  const labelTopic = `${label}${topicMarkerKo(label)}`
  // 1) 일주 이벤트 우선 — 강도 큰 것부터 (이미 score 절댓값 기준 정렬돼서 들어옴)
  const top = dailyEvents && dailyEvents.length > 0 ? dailyEvents[0] : null
  if (top) {
    const eventLine: Partial<Record<DailyEvent['kind'], string>> = {
      천간합: `오늘은 본명과 부드럽게 맞물려 ${label} 결정이 가벼워지는 날이에요.`,
      천간충: `오늘은 본명을 누르는 압박이 들어오니 ${label} 큰 결정은 한 번 더 보고 정하세요.`,
      지지합: `가까운 관계와 호흡이 맞아 ${label} 협의·동의가 잘 떨어지는 날이에요.`,
      지지충: `환경 변동이 잦은 날이라 ${labelTopic} 일정·동선부터 다시 점검하세요.`,
      지지형: `마찰·실수가 노출되기 쉬운 날이라 ${labelTopic} 평소보다 한 번 더 확인하세요.`,
      자형: `내적 마찰과 과로가 쌓이기 쉬운 날이라 ${labelTopic} 무리한 일정은 줄이세요.`,
      지지해: `오해가 쌓이기 쉬운 날이라 ${labelTopic} 결론보다 해석 일치 확인이 먼저예요.`,
      지지파: `진행 중인 일이 살짝 틀어지기 쉬운 날이라 ${labelTopic} 마감 여유를 두세요.`,
      공망: `결정 무게가 가벼운 날이라 ${label} 새 일은 다음 흐름으로 미루세요.`,
    }
    const line = eventLine[top.kind]
    if (line) return line
  }
  // 2) 점수 밴드별 카운슬링 — 같은 grade에서도 점수 차이를 텍스트에 반영
  if (typeof score === 'number') {
    if (score >= 90)
      return `흐름이 가장 강한 구간이라 ${label} 핵심 결정은 오늘 안에 마무리해도 됩니다.`
    if (score >= 80) return `안정적인 흐름이라 ${labelTopic} 평소 속도로 진행해도 무리가 없습니다.`
    if (score >= 70) return `${labelTopic} 한 번 점검하고 진행하면 결과가 안정적입니다.`
    if (score >= 60) return `${labelTopic} 큰 결정보다 정리·재확인 작업에 어울리는 날이에요.`
    if (score >= 50) return `${labelTopic} 새 일 벌이지 말고 진행 중인 거 마무리에 집중하세요.`
    if (score >= 40) return `${labelTopic} 일정·범위를 좁혀서 가는 편이 안전한 날입니다.`
    return `${label} 추진력이 약한 날이라 큰 결정은 다음 흐름까지 미루는 게 좋습니다.`
  }
  return ''
}

function buildDescription(
  locale: CalendarLocale,
  domain: DomainKey,
  tier: StrengthTier,
  dominanceGap: number,
  crossAgreementPercent: number,
  pack: MonthlyCounselorPack | undefined,
  seed: string,
  /** 그 날 일주 이벤트 (충/합/형/공망 등) — description에 day-specific 라인 합성 */
  dailyEvents?: DailyEvent[],
  /** 그 날 점수 (2-99) — 점수 밴드별로 서로 다른 카운슬링 한 줄 덧붙임 */
  score?: number
): string {
  const label = DOMAIN_LABELS[locale][domain]
  const om = locale === 'ko' ? objectMarkerKo(label) : ''
  const focusKo = dominanceGap >= 0.18 ? `${label} 단일 축에` : `${label}${om} 중심으로 보조 축까지`
  const focusEn =
    dominanceGap >= 0.18 ? `solely on ${label}` : `${label} with a secondary axis in support`
  const aligned = crossAgreementPercent >= 70
  const conflicted = crossAgreementPercent < 50
  const crossPhraseKo = aligned
    ? '사주·점성 신호가 같은 방향을 가리킵니다'
    : conflicted
      ? '신호가 엇갈립니다'
      : '큰 줄기는 맞지만 세부 신호가 갈립니다'
  const crossPhraseEn = aligned
    ? 'saju and astrology point the same way'
    : conflicted
      ? 'signals are mixed'
      : 'the broad direction holds but details diverge'

  const corePoolKo: Record<StrengthTier, string[]> = {
    rising: [
      `오늘은 ${label} 쪽 일이 잘 풀려요. ${focusKo} 우선순위를 좁혀서 밀어붙이세요.`,
      `${label} 결정 내려도 무리 없는 날이에요. 작은 일은 뒤로 미루고 핵심에 집중하세요.`,
      aligned
        ? `${label} 흐름이 또렷하고, 두 축(사주·점성)이 같은 방향이라 결과까지 끌고 갈 수 있어요.`
        : `${label} 흐름은 좋은데 ${crossPhraseKo}. 한 번 더 확인하고 가세요.`,
    ],
    aligned: [
      `${label} 흐름이 가지런해서 ${focusKo} 일정·우선순위 정리하기 좋아요.`,
      `${label} 쪽이 안정적이라 무리수 없이 진도 빼는 게 효율적이에요.`,
      `${label} 흐름이 가지런해서 작은 결정 여러 개 묶어 처리할 수 있어요.`,
    ],
    wavering: [
      conflicted
        ? `${label} 흐름은 있지만 ${crossPhraseKo}. 실행보다 조건 확인부터 하세요.`
        : `${label} 흐름은 있는데 무게 싣기엔 이른 날이에요. 일단 조건부터 확인하세요.`,
      `${label} 쪽이 좀 흔들려요. 범위 좁히고 결정은 다음 날로 미뤄도 돼요.`,
      aligned
        ? `${label} 흐름은 안정적인데 추진력이 약해요. 새 결정보단 점검 정리하기 좋은 날이에요.`
        : `${label} 흐름은 보이는데 확신 갖기엔 일러요.`,
    ],
    guarded: [
      `${label} 쪽에 제약이 커요. 무리하게 확정 짓지 마시고 리스크부터 줄이세요.`,
      `${label} 추진력이 약한 날이라 큰 결정은 다음 흐름까지 미루는 게 안전해요.`,
      conflicted
        ? `${label} 흐름이 약하고 ${crossPhraseKo}. 새 일 벌이지 마시고 기존 흐름 정리하세요.`
        : `${label} 흐름이 약해요. 새 일 벌이지 마시고 진행 중인 거 정리하세요.`,
    ],
  }

  const corePoolEn: Record<StrengthTier, string[]> = {
    rising: [
      `${label} momentum is clear; lean ${focusEn} and tighten priorities to push real outcomes.`,
      `${label} carries enough weight today to make decisive moves while smaller tasks can wait.`,
      aligned
        ? `${label} signals are sharp and ${crossPhraseEn}, so follow through to a clean outcome.`
        : `${label} signals are sharp, but ${crossPhraseEn}; keep one verification step.`,
    ],
    aligned: [
      `${label} flow is steady; focus ${focusEn} and clean up the schedule.`,
      `${label} is stable enough for batch progress without aggressive moves.`,
      `${label} alignment lets you bundle small decisions efficiently.`,
    ],
    wavering: [
      conflicted
        ? `${label} is active but ${crossPhraseEn}; verify conditions before executing.`
        : `${label} is active but the weight isn't there yet. Verify conditions first.`,
      `${label} signals wobble; narrow the scope and delay binding decisions by one day.`,
      aligned
        ? `${label} flow is steady but momentum is thin; clean up checklists rather than commit new work.`
        : `${label} is visible but not clean enough for a hard commitment today.`,
    ],
    guarded: [
      `${label} faces stronger constraints than momentum; reduce risk rather than push.`,
      `${label} pull is weak today; defer large decisions to the next cycle.`,
      conflicted
        ? `${label} signals are thin and ${crossPhraseEn}; consolidate existing work instead of starting new.`
        : `${label} signals are thin; consolidate existing work instead of starting new.`,
    ],
  }

  const pool = locale === 'ko' ? corePoolKo[tier] : corePoolEn[tier]
  const core = pickBySeed(seed, pool)
  if (!pack) return core
  if (locale === 'ko') {
    const prefixCandidates: string[] = []
    if (pack.sibsin) {
      prefixCandidates.push(
        `이번 달은 ${pack.sibsinTheme}${subjectMarkerKo(pack.sibsinTheme)} 자연스러운 흐름이에요.`
      )
    }
    if (pack.sinsals.length) {
      const s = pack.sinsals[0]
      const blurb = SINSAL_BLURB_KO[s]
      prefixCandidates.push(
        `본명에 ${s}${subjectMarkerKo(s)} 활성화돼 ${blurb}${subjectMarkerKo(blurb)} 함께 옵니다.`
      )
    }
    if (pack.yongsinPrimary && pack.yongsinAlign !== 'neutral') {
      prefixCandidates.push(
        pack.yongsinAlign === 'support'
          ? `조후용신 ${pack.yongsinPrimary}${subjectMarkerKo(pack.yongsinPrimary)} 본명을 받쳐줍니다.`
          : `조후용신 ${pack.yongsinPrimary}${subjectMarkerKo(pack.yongsinPrimary)} 본명 흐름과 어긋납니다.`
      )
    }
    // day-specific suffix: 그 날 일주 충/합/형 이벤트 + 점수 밴드별 카운슬링
    const suffix = buildDayDescriptionSuffixKo({ dailyEvents, score, label })
    const prefix = prefixCandidates.length ? pickBySeed(`${seed}|p`, prefixCandidates) : ''
    return [prefix, core, suffix].filter(Boolean).join(' ')
  }
  const prefixCandidates: string[] = []
  if (pack.sibsin) {
    prefixCandidates.push(
      `This month leans on ${SIBSIN_THEME_EN[pack.sibsin] || 'a steady grain'}.`
    )
  }
  if (pack.sinsals.length) {
    const sname = pack.sinsals[0]
    prefixCandidates.push(
      `Sinsal ${SINSAL_LABEL_EN[sname] || sname} is active — ${SINSAL_BLURB_EN[sname] || 'a notable signal'}.`
    )
  }
  if (pack.yongsinPrimary && pack.yongsinAlign !== 'neutral') {
    prefixCandidates.push(
      pack.yongsinAlign === 'support'
        ? `Johu yongsin ${pack.yongsinPrimary} backs the natal frame.`
        : `Johu yongsin ${pack.yongsinPrimary} pulls against the natal frame.`
    )
  }
  if (!prefixCandidates.length) return core
  return `${pickBySeed(`${seed}|p`, prefixCandidates)} ${core}`
}

type MonthlyCounselorPack = {
  monthStem: string
  monthBranch: string
  sibsin: string // 십신 라벨
  sibsinTheme: string // 한국어 한 줄
  sinsals: string[] // 활성 신살
  yongsinAlign: 'support' | 'neutral' | 'conflict' // 용신과의 호환
  yongsinPrimary?: string // 한글 오행 라벨
  climate?: string // 月支 기후 라벨
  season?: string
}

function buildPackForBranchStem(
  ms: string,
  mb: string,
  profile: UserSajuProfile
): MonthlyCounselorPack {
  const dayStem = profile.dayMaster || profile.pillars?.day?.stem || ''
  const dayBranch = profile.dayBranch || profile.pillars?.day?.branch || ''
  const yongsin = profile.yongsin?.primary
  const sibsin = dayStem ? getSibsinKo(dayStem, ms) : ''
  const sinsals = dayBranch ? activeSinsals(dayBranch, mb) : []
  const johu = dayStem ? getJohuYongsin(dayStem, mb) : null
  const climate = MONTH_CLIMATE[mb]?.climate
  const season = MONTH_CLIMATE[mb]?.season
  let yongsinAlign: MonthlyCounselorPack['yongsinAlign'] = 'neutral'
  const yongsinPrimary: string | undefined = johu?.primaryYongsin
  if (yongsin && yongsinPrimary) {
    const userYongsinKo = ELEMENT_KO_TO_EN_MAP[yongsin]
      ? yongsin
      : Object.entries(ELEMENT_KO_TO_EN_MAP).find(([_, en]) => en === yongsin)?.[0]
    yongsinAlign =
      userYongsinKo === yongsinPrimary ? 'support' : userYongsinKo ? 'conflict' : 'neutral'
  }
  return {
    monthStem: ms,
    monthBranch: mb,
    sibsin,
    sibsinTheme: sibsin ? SIBSIN_THEME_KO[sibsin] || '' : '',
    sinsals,
    yongsinAlign,
    yongsinPrimary,
    climate,
    season,
  }
}

// Build a per-date pack using solar-term-aware month branch + stem so a
// date like 2026-05-03 (still 辰月) doesn't get labelled with 巳月
// (초여름) data the way the naive Gregorian-month mapping did.
function getPackForDate(
  date: Date,
  profile: UserSajuProfile,
  cache: Map<string, MonthlyCounselorPack>
): MonthlyCounselorPack {
  const { stem: ms, branch: mb } = getMonthPillarForDate(date)
  const key = `${ms}|${mb}`
  const cached = cache.get(key)
  if (cached) return cached
  const pack = buildPackForBranchStem(ms, mb, profile)
  cache.set(key, pack)
  return pack
}

function buildSajuFactorsWithDaily(
  locale: CalendarLocale,
  profile: UserSajuProfile,
  domain: DomainKey,
  month: number,
  pack: MonthlyCounselorPack,
  daily: { stem: string; branch: string },
  dailySibsin: string,
  dailyEvents: DailyEvent[],
  seed: string,
  engineScore: UltraPrecisionScore | null = null
): string[] {
  const monthly = buildSajuFactors(locale, profile, domain, month, pack, seed)
  // monthly returns [sibsinLine, secondPoolPick, branchLine]:
  //   - monthly[0] = "이번 달은 …" (월 십신 — same every day of month)
  //   - monthly[1] = seed-picked from 신살/용신/격국 pool (varies)
  //   - monthly[2] = branchLine "오늘 하루 분위기는 …" (mostly month-driven)
  // The panel only renders 3 bullets, so we push the monthly[0] line
  // (most repeating) to the bottom — when there's a daily event it gets
  // sliced off, leaving 3 user-specific daily lines on the surface.
  // Sort events by importance (abs scoreShift). To make sure the user
  // actually sees the *shinsal* line on every day — not just 충/형/합 —
  // pick the top heavy event AND the top shinsal-class event when they
  // differ. Saju calendars are about "오늘 발동되는 신살" so this should
  // be visible in the 3 main bullets.
  const sorted = [...dailyEvents].sort((a, b) => Math.abs(b.scoreShift) - Math.abs(a.scoreShift))
  const SHINSAL_KIND: ReadonlySet<DailyEvent['kind']> = new Set([
    '12신살',
    '도화',
    '천을귀인',
    '양인',
    '현침',
  ])
  const heavy = sorted.find((e) => !SHINSAL_KIND.has(e.kind))
  const shinsal = sorted.find((e) => SHINSAL_KIND.has(e.kind))

  if (locale !== 'ko') {
    const dailyTheme = dailySibsin ? SIBSIN_THEME_EN[dailySibsin] : ''
    const dailyLine = dailyTheme
      ? `Today leans toward ${dailyTheme}.`
      : `Today carries a steady frame.`
    const heavyLine = heavy ? `${heavy.blurbEn}.` : ''
    const shinsalLine = shinsal && shinsal !== heavy ? `${shinsal.blurbEn}` : ''
    const [sibsinLine, secondLine, branchLine] = monthly
    const ordered = [
      dailyLine,
      ...(heavyLine ? [heavyLine] : []),
      ...(shinsalLine ? [shinsalLine] : []),
      secondLine,
      branchLine,
      sibsinLine,
    ].filter(Boolean) as string[]
    return ordered
  }
  const dailyTheme = dailySibsin ? SIBSIN_THEME_KO[dailySibsin] : ''
  const dailyLine = dailyTheme
    ? `오늘은 ${dailyTheme}${subjectMarkerKo(dailyTheme)} 자연스럽게 살아나는 분위기예요.`
    : `오늘은 큰 변동 없이 무난하게 흘러가는 날이에요.`
  const heavyLine = heavy ? `${heavy.blurb}.` : ''
  // Shinsal blurbs already end with full punctuation — don't double-dot.
  const shinsalLine = shinsal && shinsal !== heavy ? `${shinsal.blurb}` : ''
  // Engine-grade additions: 12운성 (life phase) + gongmang status if active.
  // These are pulled from the same ultraPrecisionEngine the rest of the
  // app uses, so the calendar reading lines up with the precision daily
  // analysis on saju surfaces.
  const stageLine: string = (() => {
    const stage = engineScore?.dailyPillar?.twelveStage
    if (!stage) return ''
    const phase =
      typeof stage === 'object' && 'lifePhase' in stage
        ? String(stage.lifePhase || '')
        : String(stage || '')
    const stageLabel =
      typeof stage === 'object' && 'stage' in stage ? String(stage.stage || '') : ''
    if (!phase && !stageLabel) return ''
    if (phase && stageLabel) return `12운성 흐름은 ${stageLabel} — ${phase}.`
    return `12운성 흐름은 ${stageLabel || phase}.`
  })()
  const gongmangLine: string = engineScore?.gongmang?.isToday空
    ? `오늘은 공망일 — ${(engineScore?.gongmang?.affectedAreas || []).slice(0, 2).join('·')} 영역의 무게가 비는 날이라 큰 결정은 내일로 미루는 게 안전.`
    : ''
  const [sibsinLine, secondLine, branchLine] = monthly
  const ordered = [
    dailyLine,
    ...(heavyLine ? [heavyLine] : []),
    ...(shinsalLine ? [shinsalLine] : []),
    ...(stageLine ? [stageLine] : []),
    ...(gongmangLine ? [gongmangLine] : []),
    secondLine,
    branchLine,
    sibsinLine,
  ].filter(Boolean) as string[]
  return ordered
}

function buildSajuFactors(
  locale: CalendarLocale,
  profile: UserSajuProfile,
  domain: DomainKey,
  month: number,
  pack: MonthlyCounselorPack,
  seed: string
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const dayMaster = profile.dayMaster || profile.pillars?.day?.stem || ''
  const dayElement = (profile.dayMasterElement as string) || STEM_TO_ELEMENT[dayMaster] || 'earth'
  // Use the saju month branch (solar-term correct) for the season →
  // element mapping. Fall back to Gregorian-month mapping only when the
  // pack didn't carry a branch (shouldn't happen with current callers).
  const seasonEl = pack.monthBranch ? elementOfBranch(pack.monthBranch) : seasonElement(month)
  const relation = ELEMENT_RELATIONS[dayElement]?.[seasonEl] || 'same'

  if (locale === 'ko') {
    const seasonKo = pack.season || ''
    // 1) 이번 달의 결 한 줄 — 한자/십신 라벨 빼고 평어로
    const sibsinLine = pack.sibsinTheme
      ? `이번 달은 ${pack.sibsinTheme}${subjectMarkerKo(pack.sibsinTheme)} 자연스럽게 살아나는 시기예요.`
      : `이번 달은 큰 변동 없이 안정적인 흐름입니다.`
    // 2) 신살 / 용신 / 격국 중 하나를 seed로 골라서 두 번째 줄
    const secondPool: string[] = []
    if (pack.sinsals.length) {
      const s = pickBySeed(`${seed}|sl`, pack.sinsals)
      const blurb = SINSAL_BLURB_KO[s]
      secondPool.push(`${blurb}${subjectMarkerKo(blurb)} ${label} 쪽 흐름에 자연스럽게 끼어듭니다.`)
    }
    if (pack.yongsinPrimary) {
      const dmEl = ELEMENT_LABEL_KO[dayElement] || ''
      const seasonElKo = ELEMENT_LABEL_KO[seasonEl] || ''
      const dmTag = dayMaster ? `${dayMaster}일주(${dmEl}) ` : ''
      const yongsinAction =
        pack.yongsinAlign === 'support'
          ? `용신 ${pack.yongsinPrimary}이(가) ${dmTag}흐름을 받쳐주는 시기라 결정이 가벼워집니다.`
          : pack.yongsinAlign === 'conflict'
            ? `용신 ${pack.yongsinPrimary}이(가) ${dmTag}흐름과 어긋나는 구간이라 한 박자 늦추는 편이 안전합니다.`
            : `${dmTag ? `${dmTag}` : ''}본명과 ${seasonKo} 계절(${seasonElKo}) 사이가 ${relationLabelKo(relation)} 결이라 큰 충돌 없이 흘러갑니다.`
      secondPool.push(yongsinAction)
    }
    if (profile.geokguk?.type) {
      const strengthHint =
        profile.geokguk.strength === '신강'
          ? '본명이 강한 편이라'
          : profile.geokguk.strength === '신약'
            ? '본명이 약한 편이라'
            : ''
      secondPool.push(
        `${strengthHint ? `${strengthHint} ` : ''}${label} 결정은 ${pack.yongsinAlign === 'conflict' ? '범위를 좁혀' : '꾸준한 호흡으로'} 다루는 게 본인 사주 흐름에 맞아요.`
      )
    }
    if (!secondPool.length) {
      secondPool.push(
        `장기 운 흐름이 ${label}${objectMarkerKo(label)} 한 번에 넓히기보다 단계로 다루도록 지지하고 있어요.`
      )
    }
    const branchLine = `오늘 하루 분위기는 ${label} 쪽 결정에 ${relationCycleSignalKo(relation)}.`
    const second = pickBySeed(`${seed}|s2`, secondPool)
    return [sibsinLine, second, branchLine]
  }

  const dayElEn = ELEMENT_LABEL_EN[dayElement]
  const monthElEn =
    ELEMENT_LABEL_EN[ELEMENT_KO_TO_EN_MAP[STEM_TO_KO_ELEMENT[pack.monthStem]] || seasonEl]
  const sibsinLine = pack.sibsin
    ? `This month, day-master ${dayMaster} (${dayElEn}) meets month-stem ${pack.monthStem} (${monthElEn}) as ${pack.sibsin}; the ${label} axis carries that flavour.`
    : `This month's month frame meets day-master ${dayMaster} (${dayElEn}) as a ${relationLabelEn(relation)} pairing.`
  const secondPool: string[] = []
  if (pack.sinsals.length) {
    const s = pickBySeed(`${seed}|sl`, pack.sinsals)
    secondPool.push(
      `Day-branch ${profile.dayBranch || ''} activates ${s} this month, adding a ${s === '역마' ? 'movement' : s === '도화' ? 'attraction' : s === '화개' ? 'introspection' : 'caution'} signal to ${label}.`
    )
  }
  if (pack.yongsinPrimary) {
    const alignText =
      pack.yongsinAlign === 'support'
        ? 'aligns with the natal yongsin, easing decisions'
        : pack.yongsinAlign === 'conflict'
          ? 'misaligns with the natal yongsin; slow the pace'
          : 'sits in a neutral band against the natal yongsin'
    secondPool.push(`The month's johu yongsin is ${pack.yongsinPrimary}, which ${alignText}.`)
  }
  if (!secondPool.length) {
    secondPool.push(
      `Long-cycle structure prefers handling ${label} step-by-step rather than expanding all at once.`
    )
  }
  const branchLine = profile.dayBranch
    ? `Day-branch ${profile.dayBranch} against month-branch ${pack.monthBranch} produces a ${relation === 'support' ? 'push' : relation === 'control' ? 'brake' : 'check'} signal for ${label}.`
    : ''
  const second = pickBySeed(`${seed}|s2`, secondPool)
  return branchLine ? [sibsinLine, second, branchLine] : [sibsinLine, second]
}

function relationCycleSignalKo(
  rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'
): string {
  switch (rel) {
    case 'same':
    case 'support':
      return '힘을 실어줘요'
    case 'drain':
      return '범위를 넓혀줘요'
    case 'control':
      return '제동을 걸어요'
    case 'controlled':
      return '한 번 점검하라고 해요'
  }
}

function relationLabelEn(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same':
      return 'reinforcing'
    case 'support':
      return 'supportive'
    case 'drain':
      return 'draining'
    case 'control':
      return 'controlling'
    case 'controlled':
      return 'restrained'
  }
}

function buildAstroFactors(
  locale: CalendarLocale,
  astroProfile: UserAstroProfile,
  domain: DomainKey,
  month: number,
  crossAgreementPercent: number,
  tier: StrengthTier,
  seed: string
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const sunSign = astroProfile.sunSign || (locale === 'ko' ? '태양' : 'Sun')
  const moonSign = astroProfile.moonSign
  const isWinter = month <= 2 || month === 12
  const isSummer = month >= 6 && month <= 8
  const dayIsStrong = tier === 'rising' || tier === 'aligned'
  const strongTrigger = crossAgreementPercent >= 70 && dayIsStrong
  const weakTrigger = crossAgreementPercent < 50 || tier === 'guarded'

  if (locale === 'ko') {
    const grainKo = MOON_GRAIN_KO[domain]
    const sunHouseFlavor = signHouseFlavorKo(sunSign, domain)
    const seasonalKo = isWinter
      ? '겨울이라 깊이 있는 결정에 무게가 실리는 시기'
      : isSummer
        ? '여름이라 외부 활동과 표현이 잘 풀리는 시기'
        : '환절기라 우선순위 재배치가 자연스러운 시기'
    const sunLine = `본인 별자리는 ${sunSignKoLabel(sunSign)}라서 ${sunHouseFlavor} 분위기예요. 지금은 ${seasonalKo}.`
    const moonLine = moonSign
      ? `${sunSignKoLabel(moonSign)} 달 영향으로 ${label} 쪽 ${grainKo}${objectMarkerKo(grainKo)} ${crossAgreementPercent >= 60 ? '받쳐주는 분위기예요' : '흩트리는 분위기예요'}.`
      : `달 흐름은 ${label} 결정의 ${crossAgreementPercent >= 60 ? '실행 신호' : '재확인 신호'}로 작용합니다.`
    const closerPool = strongTrigger
      ? [
          `점성 흐름도 ${label} 쪽으로 또렷한 신호를 보태고 있어요.`,
          `짧은 호흡으로 진도 빼기 좋은 흐름이에요.`,
          `흐름 정렬이 좋으니 결정 후 실행까지 같은 날 묶어도 됩니다.`,
        ]
      : weakTrigger
        ? [
            `점성 흐름이 약하니 큰 결정 전에 한 박자 두세요.`,
            `신호가 흐릿해 즉답보다 자료를 한 번 더 보세요.`,
            `흐름이 흩어져 있어 무리한 일정은 미루는 편이 안전합니다.`,
          ]
        : [
            `짧은 흐름은 살아 있어도 지속성은 따로 확인하세요.`,
            `점성 흐름이 ${label} 쪽으로 작은 신호를 보탭니다.`,
            `흐름이 안정 구간에 있어 큰 변동 없이 진도 빼기 좋습니다.`,
          ]
    // Order: seed-varied closer first → moon (varies by tier/agreement) →
    // sun (static for the month). The panel slices to 3, so on busy days
    // the static sun line drops off and the user sees fresh daily-feel
    // lines. Without this swap every day in May read as
    // "본인 별자리는 물병자리라서 혁신·네트워크 분위기예요. …" first.
    return [pickBySeed(seed, closerPool), moonLine, sunLine]
  }
  const grainEn = MOON_GRAIN_EN[domain]
  const seasonalEn = isWinter
    ? 'winter transits add weight to deep decisions'
    : isSummer
      ? 'summer transits expand outward action and expression'
      : 'shoulder-season transits drive a re-prioritization'
  const sunLine = `Around ${sunSign}, ${seasonalEn}.`
  const moonLine = moonSign
    ? `The ${moonSign} Moon signal ${crossAgreementPercent >= 60 ? 'supports' : 'scatters'} ${grainEn} on ${label}.`
    : `Lunar transit acts as ${crossAgreementPercent >= 60 ? 'an execution cue' : 'a re-check cue'} for ${label} decisions.`
  const closerPool = strongTrigger
    ? [
        `Planetary aspects add a clear spark toward ${label}.`,
        `Short-term triggers are alive; bundle decision and execution today.`,
        `Transit alignment is strong; tighten the loop and ship.`,
      ]
    : weakTrigger
      ? [
          `Transit alignment is thin; pause one beat before large decisions.`,
          `Short-term triggers are faint; review notes once more before answering.`,
          `Planetary aspects are scattered; defer aggressive scheduling.`,
        ]
      : [
          `Short-term triggers may be alive, but verify durability separately.`,
          `Planetary aspects add a small spark toward ${label}.`,
          `Transit sits in a stable band; carry the flow without forcing changes.`,
        ]
  return [pickBySeed(seed, closerPool), moonLine, sunLine]
}

function buildRecommendations(grade: ImportanceGrade, domain: DomainKey, seed: string): string[] {
  // Pick 2 i18n recommendation keys per day from a domain-flavoured pool,
  // varied by seed so consecutive days don't surface the same canned line.
  // Keys must exist in src/i18n/locales/{ko,en}/calendar.json under
  // calendar.recommendations.
  const generalAnchorTier1 = [
    'confidence',
    'achievement',
    'creative',
    'newBeginning',
    'celebration',
    'luck',
  ]
  if (grade <= 1) {
    const anchorPool: Record<DomainKey, string[]> = {
      career: ['business', 'bigDecision', 'majorDecision', 'expression', 'authority', 'promotion'],
      love: ['love', 'meeting', 'dating', 'reconciliation', 'charm', 'selfExpression'],
      money: ['investment', 'finance', 'shopping', 'speculation', 'stableWealth', 'windfall'],
      health: ['discipline', 'achievement', 'newBeginning', 'meditation', 'beauty', 'rest'],
      move: ['moving', 'travel', 'change', 'expansion', 'newBeginning', 'celebration'],
    }
    const support = ['confidence', 'expression', 'collaboration', 'synergy', 'growth', 'harmony']
    return [
      pickBySeed(`${seed}|rec0`, anchorPool[domain] || generalAnchorTier1),
      pickBySeed(`${seed}|rec1`, support),
    ]
  }
  if (grade === 2) {
    const anchorPool = ['planning', 'completion', 'reflection', 'release', 'discipline', 'learning']
    const support = ['careful', 'meditation', 'mentor', 'documents', 'study']
    return [pickBySeed(`${seed}|rec0`, anchorPool), pickBySeed(`${seed}|rec1`, support)]
  }
  // Caution / Hold tier — slow down, protect.
  const anchorPool = ['careful', 'rest', 'lowProfile', 'postpone', 'meditation']
  const support = ['reflection', 'mentor', 'release']
  return [pickBySeed(`${seed}|rec0`, anchorPool), pickBySeed(`${seed}|rec1`, support)]
}

function buildWarnings(
  grade: ImportanceGrade,
  crossAgreementPercent: number,
  domain: DomainKey,
  seed: string
): string[] {
  if (grade < 2 && crossAgreementPercent >= 60) return []
  const domainWarnings: Record<DomainKey, string[]> = {
    career: ['authority', 'competition', 'opposition', 'rivalry', 'tension'],
    love: ['conflict', 'misunderstanding', 'betrayal', 'tension'],
    money: ['finance', 'loss', 'riskManagement', 'speculation'],
    health: ['health', 'accident', 'injury', 'stress'],
    move: ['travel', 'change', 'avoidTravel', 'instability'],
  }
  const general = ['confusion', 'caution', 'stress', 'tension', 'misunderstanding']
  if (grade >= 3) {
    return [
      pickBySeed(`${seed}|warn0`, domainWarnings[domain] || general),
      pickBySeed(`${seed}|warn1`, general),
    ]
  }
  return [pickBySeed(`${seed}|warn0`, general)]
}

export function calculateYearlyImportantDates(
  year: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  options?: YearlyOptions
): YearlyImportantDate[] {
  const locale = options?.locale || 'ko'
  const results: YearlyImportantDate[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const reliability = clamp(
    options?.matrixContext?.timingCalibration?.reliabilityScore || 0.58,
    0,
    1
  )
  // Solar-term-aware per-date pack: every factor builder pulls from
  // `getPackForDate(date, …)` so May 3 (still 辰月) doesn't get tagged
  // with 巳月 (초여름) data the way the old monthly index did.
  const dailyPackCache = new Map<string, MonthlyCounselorPack>()

  // ── Long-cycle context (대운/세운/월운) ──
  // These layers come from the same engine the rest of the saju app
  // uses. Cheap to compute up-front: 대운 is constant for the year (or
  // flips once mid-year if the user crosses a 10-year boundary), 세운
  // is constant for the saju year, 월운 we compute per saju month from
  // the dailyPack the loop already builds. Iljin (일운) lives in the
  // daily pillar and gets attached per date inside the loop.
  const natalDayMaster = sajuProfile.dayMaster || sajuProfile.pillars?.day?.stem || ''
  const resolvedBirthYear = (() => {
    if (typeof sajuProfile.birthYear === 'number' && Number.isFinite(sajuProfile.birthYear))
      return sajuProfile.birthYear
    if (typeof options?.birthYear === 'number' && Number.isFinite(options.birthYear))
      return options.birthYear
    if (typeof options?.birthDate === 'string' && options.birthDate) {
      const parsed = new Date(options.birthDate)
      if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear()
    }
    return null
  })()
  const findDaeunForDate = (d: Date) => {
    const cycles = sajuProfile.daeunCycles
    if (!cycles?.length || resolvedBirthYear == null) return null
    // Approximate age at `d` using birth year. Daeun age ranges are
    // [age, age+10) sorted ascending. We compute fractional age using
    // the date's day-of-year so transition-imminent detection (within 1
    // year of next boundary) is meaningful, not just a Jan-1 step.
    const yearStart = new Date(d.getFullYear(), 0, 1).getTime()
    const yearEnd = new Date(d.getFullYear() + 1, 0, 1).getTime()
    const fractionalYear = d.getFullYear() + (d.getTime() - yearStart) / (yearEnd - yearStart)
    const ageAtDate = fractionalYear - resolvedBirthYear
    let activeIdx = 0
    for (let i = 0; i < cycles.length; i++) {
      if (cycles[i].age <= Math.floor(ageAtDate)) activeIdx = i
      else break
    }
    const active = cycles[activeIdx]
    if (!active) return null
    const next = cycles[activeIdx + 1] || null
    const daeunStem = active.heavenlyStem || ''
    const sibsinStem = natalDayMaster && daeunStem ? getSibsinKo(natalDayMaster, daeunStem) : ''
    const nextStem = next?.heavenlyStem || ''
    const nextSibsinStem = natalDayMaster && nextStem ? getSibsinKo(natalDayMaster, nextStem) : ''
    const yearsToNext = next ? Math.max(0, next.age - ageAtDate) : Infinity
    return {
      ganji: `${daeunStem}${active.earthlyBranch}`,
      ageStart: active.age,
      ageEnd: active.age + 10,
      sibsinStem,
      yearsToNext: next ? Number(yearsToNext.toFixed(2)) : undefined,
      transitionImminent: next ? yearsToNext <= 1 : false,
      nextGanji: next ? `${next.heavenlyStem}${next.earthlyBranch}` : undefined,
      nextSibsinStem: next ? nextSibsinStem : undefined,
    }
  }
  const sewoonForYear = (yr: number) => {
    const idx60 = (yr - 4 + 6000) % 60
    const stem = STEMS[idx60 % 10]
    const branch = BRANCHES_BY_INDEX[idx60 % 12]
    const sibsinStem = natalDayMaster && stem ? getSibsinKo(natalDayMaster, stem) : ''
    return { ganji: `${stem}${branch}`, year: yr, sibsinStem }
  }
  const wolwoonForPack = (pack: MonthlyCounselorPack) => {
    const stem = pack.monthStem
    const sibsinStem = natalDayMaster && stem ? getSibsinKo(natalDayMaster, stem) : ''
    return { ganji: `${stem}${pack.monthBranch}`, sibsinStem }
  }

  // ── Cycle ↔ cycle clash detector ──
  // Pairwise 충/합/형 between (natal-day, 대운, 세운, 월운, 일운). Saju
  // calendar gold: "대운 세운이 충하는 해" / "월운이 일운과 합하는 날" —
  // these are the moments practitioners flag. We surface them so the user
  // doesn't have to read the ganji and run the comparison themselves.
  type CycleSlot = { id: string; label: string; stem: string; branch: string }
  const interactionFor = (a: CycleSlot, b: CycleSlot): YearlyImportantDate['cycleInteractions'] => {
    const out: NonNullable<YearlyImportantDate['cycleInteractions']> = []
    const pair = `${a.label}↔${b.label}`
    if (a.stem && b.stem && STEM_HAP_PARTNER[a.stem]?.partner === b.stem) {
      out.push({
        pair,
        kind: '천간합',
        blurb: `${a.label}(${a.stem})과 ${b.label}(${b.stem})이 천간합 — 두 흐름이 부드럽게 묶입니다.`,
      })
    }
    if (a.stem && b.stem && STEM_CHUNG_SET.has(`${a.stem}-${b.stem}`)) {
      out.push({
        pair,
        kind: '천간충',
        blurb: `${a.label}(${a.stem})과 ${b.label}(${b.stem})이 천간충 — 결정 압박이 크게 들어옵니다.`,
      })
    }
    if (
      a.branch &&
      b.branch &&
      BRANCH_HAP_PARTNER[a.branch] === b.branch &&
      a.branch !== b.branch
    ) {
      out.push({
        pair,
        kind: '지지합',
        blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 지지합 — 환경이 손발 맞춰 돕습니다.`,
      })
    }
    if (a.branch && b.branch && BRANCH_CHUNG_PARTNER[a.branch] === b.branch) {
      out.push({
        pair,
        kind: '지지충',
        blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 지지충 — 환경 변동·이동·교체 신호.`,
      })
    }
    const inTrio = (set: string[]) =>
      set.includes(a.branch) && set.includes(b.branch) && a.branch !== b.branch
    if (
      a.branch &&
      b.branch &&
      (inTrio(BRANCH_HYUNG_TRIO) ||
        inTrio(BRANCH_HYUNG_TRIO2) ||
        BRANCH_HYUNG_PAIR.has(`${a.branch}-${b.branch}`))
    ) {
      out.push({
        pair,
        kind: '지지형',
        blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 형 — 마찰·구설·실수 노출 주의.`,
      })
    }
    if (a.branch && b.branch && BRANCH_HAE_PAIRS.has(`${a.branch}-${b.branch}`)) {
      out.push({
        pair,
        kind: '지지해',
        blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 해 — 오해·관계 균열 주의.`,
      })
    }
    if (a.branch && b.branch && BRANCH_PA_PAIRS.has(`${a.branch}-${b.branch}`)) {
      out.push({
        pair,
        kind: '지지파',
        blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 파 — 진행 중인 일이 살짝 어긋날 수 있어요.`,
      })
    }
    return out
  }
  const buildCycleInteractions = (
    natalDayBranch: string,
    daeun: { ganji: string } | null,
    sewoon: { ganji: string },
    wolwoon: { ganji: string },
    iljin: { ganji: string }
  ): YearlyImportantDate['cycleInteractions'] => {
    const split = (g: string): { stem: string; branch: string } => ({
      stem: g.charAt(0) || '',
      branch: g.charAt(1) || '',
    })
    const slots: CycleSlot[] = [
      { id: 'natal', label: '본명', stem: natalDayMaster, branch: natalDayBranch },
      ...(daeun ? [{ id: 'daeun', label: '대운', ...split(daeun.ganji) }] : []),
      { id: 'sewoon', label: '세운', ...split(sewoon.ganji) },
      { id: 'wolwoon', label: '월운', ...split(wolwoon.ganji) },
      { id: 'iljin', label: '일운', ...split(iljin.ganji) },
    ]
    const out: NonNullable<YearlyImportantDate['cycleInteractions']> = []
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const hits = interactionFor(slots[i], slots[j]) || []
        out.push(...hits)
      }
      // 원진 (6 pairs of 6년 차이 branches that grate). Same loop.
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i],
          b = slots[j]
        if (a.branch && b.branch && BRANCH_WONJIN_PAIRS.has(`${a.branch}-${b.branch}`)) {
          out.push({
            pair: `${a.label}↔${b.label}`,
            kind: '지지해', // 원진은 의미상 해와 비슷한 마찰 — UI는 같은 카드로
            blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 원진 — 감정적 거리·미묘한 신경전.`,
          })
        }
      }
    }
    // 三合 / 방합 — needs all three branches present across the slots.
    const allBranches = slots.map((s) => s.branch).filter(Boolean)
    for (const trio of [...BRANCH_TRIPLES_SAMHAP, ...BRANCH_TRIPLES_BANGHAP]) {
      const present = trio.members.filter((m) => allBranches.includes(m))
      if (present.length === 3) {
        const involved = slots
          .filter((s) => trio.members.includes(s.branch))
          .map((s) => s.label)
          .join(', ')
        const isSamhap = BRANCH_TRIPLES_SAMHAP.includes(trio)
        out.push({
          pair: involved,
          kind: '지지합',
          blurb: `${trio.label} 완성 (${involved}) — ${trio.result} 기운으로 강하게 묶이는 ${isSamhap ? '삼합' : '방합'} 흐름.`,
        })
      }
    }
    return out.length > 0 ? out : undefined
  }

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dailyPack = getPackForDate(date, sajuProfile, dailyPackCache)
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
    // (Legacy weakPenalty / peakBoost computations removed — both were
    // tied to primaryStrength scalar in the old matrix-heavy formula
    // and are no longer used by the 5-axis blend.)
    // 일진(오늘의 일주) × 본명 일주 이벤트
    const natalDayStem = sajuProfile.dayMaster || sajuProfile.pillars?.day?.stem || ''
    const natalDayBranch = sajuProfile.dayBranch || sajuProfile.pillars?.day?.branch || ''
    const dailyPillar = calculateDailyPillar(date)
    const dailyEvents = analyzeDailyPillarEvents(
      natalDayStem,
      natalDayBranch,
      dailyPillar.stem,
      dailyPillar.branch
    )
    const dailyShift = dailyEvents.reduce((sum, e) => sum + e.scoreShift, 0)
    const dailySibsin = natalDayStem ? getSibsinDailyKo(natalDayStem, dailyPillar.stem) : ''

    // ── Engine-grade per-date analysis ──
    // Pull the full ultraPrecisionEngine output for this date so saju
    // factors can show 12운성 (장생/관대/제왕/쇠/병/사…), the engine's
    // shinsal hit list, gongmang status, and energy-flow themes.
    // Score formula stays matrix-driven (preserves destiny-matrix
    // weighting); the engine just enriches the *narrative* surface so
    // the user actually sees their natal-chart-grounded reading.
    const natalAllStems = [
      sajuProfile.pillars?.year?.stem || '',
      sajuProfile.pillars?.month?.stem || '',
      sajuProfile.pillars?.day?.stem || '',
      sajuProfile.pillars?.time?.stem || '',
    ].filter(Boolean)
    const natalAllBranches = [
      sajuProfile.pillars?.year?.branch || '',
      sajuProfile.pillars?.month?.branch || '',
      sajuProfile.pillars?.day?.branch || '',
      sajuProfile.pillars?.time?.branch || '',
    ].filter(Boolean)
    let engineScore: UltraPrecisionScore | null = null
    if (natalDayStem && natalDayBranch) {
      try {
        engineScore = calculateUltraPrecisionScore({
          date,
          dayStem: natalDayStem,
          dayBranch: natalDayBranch,
          monthBranch: sajuProfile.pillars?.month?.branch || '',
          yearBranch: sajuProfile.pillars?.year?.branch || '',
          allStems: natalAllStems,
          allBranches: natalAllBranches,
        })
      } catch {
        engineScore = null
      }
    }

    // 용신 multiplier — 용신은 의미 해석엔 이미 반영되지만 점수에 곱셈으로 가중
    // support: 1.06배 (이번 달 용신이 본명 받쳐줌), conflict: 0.94배, neutral: 1.0
    // Use dailyPack (solar-term-correct) so dates that span term boundaries
    // get scored against the right month.
    const monthPack = dailyPack
    // (Note: prior multiplicative yongsinMul folded into the 0.10 weight
    // of the new 5-axis blend below; no longer applied as a multiplier.)

    // ─────────────────────────────────────────────────────────
    // 사주↔점성 클레임-레벨 교차 일치도
    // 이전: 단순 distance 계산이라 매일 100% 가까이 떨어졌음.
    // 현재: 사주 측 polarity (일주 이벤트 + 용신) ↔ 점성 측 polarity
    //   (월간 트랜짓 강도) 가 같은 방향인지 부호로 비교.
    // ─────────────────────────────────────────────────────────
    const sajuClaim: 1 | 0 | -1 = (() => {
      let signal = 0
      if (dailyShift >= 1) signal += 1
      else if (dailyShift <= -1) signal -= 1
      if (monthPack?.yongsinAlign === 'support') signal += 1
      else if (monthPack?.yongsinAlign === 'conflict') signal -= 1
      return signal > 0 ? 1 : signal < 0 ? -1 : 0
    })()
    const astroClaim: 1 | 0 | -1 =
      primaryMonthStrength >= 0.6 ? 1 : primaryMonthStrength < 0.4 ? -1 : 0
    const crossAgreementPercent = (() => {
      // 둘 다 같은 방향 (둘 다 긍정 or 둘 다 부정) → 80~92
      if (sajuClaim !== 0 && astroClaim !== 0 && sajuClaim === astroClaim) {
        return Math.round(82 + reliability * 10)
      }
      // 한 쪽만 강하고 한 쪽 중립 → 60~72
      if ((sajuClaim !== 0 && astroClaim === 0) || (astroClaim !== 0 && sajuClaim === 0)) {
        return Math.round(62 + reliability * 10)
      }
      // 둘 다 중립 → 50~58 (확실한 신호 없음)
      if (sajuClaim === 0 && astroClaim === 0) {
        return Math.round(50 + reliability * 8)
      }
      // 부호가 반대 → 28~40 (충돌)
      return Math.round(30 + reliability * 10)
    })()

    // ── 새 점수 시스템 ──
    // 5 축을 weighted blend. 각 축은 0-100으로 정규화.
    //   0.40 engine (saju daily — sibsin / 신살 / 공망 / 12운성 / energy)
    //   0.20 matrix (long-cycle domain weighting + reliability)
    //   0.15 cycle (충/합/형/원진/삼합 balance over 5 slots)
    //   0.10 cross (사주 ↔ 점성 일치도)
    //   0.10 yongsin (용신 정렬: support / neutral / conflict)
    // dailyShift (event blurb sum) added on top, weakPenalty subtracted.
    // The matrix sub still feeds in so existing destiny-matrix continuity
    // is preserved; engine sub is what fixes "오늘은 별것 없다" days.
    const engineSub = (() => {
      if (engineScore && Number.isFinite(engineScore.totalScore)) {
        return clamp(engineScore.totalScore, 0, 100)
      }
      return 50
    })()
    const matrixSub = clamp(
      primaryStrength * 70 +
        primaryMonthStrength * 20 +
        secondaryMonthStrength * 5 +
        dominanceGap * 5,
      0,
      100
    )
    const cycleSub = (() => {
      const hits =
        buildCycleInteractions(
          sajuProfile.dayBranch || sajuProfile.pillars?.day?.branch || '',
          findDaeunForDate(date),
          sewoonForYear(date.getFullYear()),
          wolwoonForPack(dailyPack),
          { ganji: `${dailyPillar.stem}${dailyPillar.branch}` }
        ) || []
      let net = 50
      for (const h of hits) {
        if (h.kind === '천간합') net += 5
        else if (h.kind === '지지합') {
          // 삼합/방합 라벨은 더 큰 가중
          if (/삼합/.test(h.blurb)) net += 15
          else if (/방합/.test(h.blurb)) net += 10
          else net += 5
        } else if (h.kind === '천간충') net -= 8
        else if (h.kind === '지지충') net -= 8
        else if (h.kind === '지지형') net -= 10
        else if (h.kind === '지지해') {
          if (/원진/.test(h.blurb)) net -= 5
          else net -= 3
        } else if (h.kind === '지지파') net -= 3
        else if (h.kind === '자형') net -= 4
      }
      return clamp(net, 0, 100)
    })()
    const crossSub = clamp(crossAgreementPercent, 0, 100)
    const yongsinSub =
      monthPack?.yongsinAlign === 'support' ? 75 : monthPack?.yongsinAlign === 'conflict' ? 25 : 50

    // 2-axis score split: 사주 측 vs 점성 측. Users want to see "사주만
    // 좋은 날" / "점성만 좋은 날" separately to choose which axis to
    // trust. Compute proxies from the same subscores at hand:
    //   사주 측 = 0.55 engine + 0.30 cycle + 0.15 yongsin
    //   점성 측 = 50 ± astroClaim sign + cross-agreement weight + matrix month
    const sajuAxisScore = clamp(
      Math.round(0.55 * engineSub + 0.3 * cycleSub + 0.15 * yongsinSub),
      0,
      100
    )
    const astroAxisScore = clamp(
      Math.round(
        50 +
          (astroClaim === 1 ? 18 : astroClaim === -1 ? -18 : 0) +
          (crossSub - 50) * 0.4 +
          (primaryMonthStrength - 0.5) * 30
      ),
      0,
      100
    )
    const axisAgreement: 'aligned' | 'mixed' | 'opposed' =
      Math.abs(sajuAxisScore - astroAxisScore) <= 12
        ? 'aligned'
        : Math.abs(sajuAxisScore - astroAxisScore) <= 28
          ? 'mixed'
          : 'opposed'

    // Engine subscore (per-date 사주 일진/신살/공망/12운성/energy) is the
    // strongest single signal — weight it 0.55. Matrix kept at 0.15 for
    // destiny-matrix continuity; users without a matrixContext still
    // get a reasonable distribution because engine + cycle dominate.
    // Fall back matrixSub to a neutral 50 when matrix context is sparse
    // (otherwise primaryStrength drags everyone to grade 3).
    const matrixSubAdj = matrixSub < 30 ? 50 : matrixSub
    // Real astrology transit score (longitude-based aspects to natal),
    // pre-computed in the route. Falls back to neutral 50 when natal
    // chart wasn't built (no birthplace coords).
    const dateKey = isoDate(year, month, day)
    const transitSub = (() => {
      const v = options?.dailyTransitScores?.[dateKey]
      return typeof v === 'number' ? clamp(v, 0, 100) : 50
    })()
    // 28수 길흉 + 역행 행성 페널티 → 0-100 axis. Replaces the previous
    // reserved 0.05 slot with real engine data.
    //   28수 길수 +12, 흉수 -12, 중립 0
    //   역행: 수성/금성/화성 -6 each (사용자 일정에 직접 영향),
    //        Jupiter/Saturn -3 each, outer planets -1 each.
    const lunarRetroSub = (() => {
      let v = 50
      try {
        const lm = getLunarMansion(date)
        v += lm.isAuspicious ? 12 : -12
      } catch {
        // 28수 lookup failed — keep neutral 50.
      }
      const rxs = options?.dailyRetrograde?.[dateKey] || []
      for (const planet of rxs) {
        if (planet === 'Mercury' || planet === 'Venus' || planet === 'Mars') v -= 6
        else if (planet === 'Jupiter' || planet === 'Saturn') v -= 3
        else v -= 1 // outer planets (Uranus/Neptune/Pluto/Chiron) — almost always retrograde, mild penalty
      }
      return clamp(v, 0, 100)
    })()
    // Full-engine blend. Saju gets 50% (engine 30 + cycle 20 — saju
    // practitioners weight 충합 highly), astrology gets 25% (real
    // transit aspect score), cross-agreement 10%, yongsin 5%, matrix
    // 5%, dailyShift event bonus on top.
    const blendedRaw =
      0.3 * engineSub +
      0.2 * cycleSub +
      0.25 * transitSub +
      0.1 * crossSub +
      0.05 * yongsinSub +
      0.05 * matrixSubAdj +
      0.05 * lunarRetroSub +
      dailyShift
    const score = Math.round(clamp(blendedRaw, 2, 99))
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
      titleKey: buildTitle(
        locale,
        primary.domain,
        tier,
        dailyPack?.sibsin || '',
        dailyEvents,
        `${seed}|t`
      ),
      descKey: buildDescription(
        locale,
        primary.domain,
        tier,
        dominanceGap,
        crossAgreementPercent,
        dailyPack,
        `${seed}|d`,
        dailyEvents,
        score
      ),
      ganzhi: `${dailyPillar.stem}${dailyPillar.branch}`,
      crossVerified: crossAgreementPercent >= 60,
      transitSunSign: astroProfile.sunSign || '',
      sajuFactorKeys: buildSajuFactorsWithDaily(
        locale,
        sajuProfile,
        primary.domain,
        month,
        dailyPack,
        dailyPillar,
        dailySibsin,
        dailyEvents,
        `${seed}|s`,
        engineScore
      ),
      astroFactorKeys: [
        // The cross-agreement % has its own dedicated section in
        // SelectedDatePanel (✅ 교차 합의), so dropping the meta line that
        // used to lead the astro factors. It read as "사주↔점성 교차 일치도
        // 68% — …" right next to the same number in another section,
        // which felt redundant and meta rather than user-facing astro
        // evidence.
        ...buildAstroFactors(
          locale,
          astroProfile,
          primary.domain,
          month,
          crossAgreementPercent,
          tier,
          `${seed}|a`
        ),
      ],
      recommendationKeys: buildRecommendations(grade, primary.domain, `${seed}|rec`),
      warningKeys: (() => {
        const base = buildWarnings(grade, crossAgreementPercent, primary.domain, `${seed}|warn`)
        const heavyEvent = dailyEvents.find((e) => (e.warningWeight || 0) >= 1)
        if (heavyEvent && !base.includes('confusion')) base.push('confusion')
        return base
      })(),
      confidence: Math.round(clamp(primaryStrength * 100, 0, 100)),
      confidenceNote: locale === 'ko' ? '캘린더 스코어링 기준' : 'Calendar scoring baseline',
      crossAgreementPercent,
      glossary: (() => {
        // 본문에 등장한 한글 용어를 골라 풀이를 첨부 (KO/EN 둘 다 지원 — EN도 한글 용어가 본문에 박힐 수 있음)
        const surface = [
          dailyPack?.sibsin || '',
          ...(dailyPack?.sinsals || []),
          ...buildSajuFactors(locale, sajuProfile, primary.domain, month, dailyPack, `${seed}|s`),
        ].join(' ')
        const terms = pickGlossaryTerms(surface)
        if (!terms.length) return undefined
        const dict = locale === 'ko' ? GLOSSARY_KO : GLOSSARY_EN
        const map: Record<string, string> = {}
        for (const t of terms) map[t] = dict[t] || GLOSSARY_KO[t]
        return map
      })(),
      crossCheck: {
        line:
          locale === 'ko'
            ? buildCrossCheckLineKo(crossAgreementPercent)
            : buildCrossCheckLineEn(crossAgreementPercent),
        agreementPercent: crossAgreementPercent,
      },
      scoreBreakdown: {
        engine: Math.round(engineSub),
        matrix: Math.round(matrixSubAdj),
        cycle: Math.round(cycleSub),
        cross: Math.round(crossSub),
        yongsin: Math.round(yongsinSub),
        transit: Math.round(transitSub),
        lunarRetro: Math.round(lunarRetroSub),
        dailyShift: Math.round(dailyShift),
        weakPenalty: 0,
        peakBoost: 0,
        finalScore: score,
        sajuAxis: sajuAxisScore,
        astroAxis: astroAxisScore,
        axisAgreement,
      },
      longCycleContext: {
        daeun: findDaeunForDate(date) || undefined,
        sewoon: sewoonForYear(date.getFullYear()),
        wolwoon: wolwoonForPack(dailyPack),
        iljin: {
          ganji: `${dailyPillar.stem}${dailyPillar.branch}`,
          sibsinStem: dailySibsin,
          sibsinBranch:
            natalDayMaster && dailyPillar.branch
              ? getSibsinKo(natalDayMaster, dailyPillar.branch)
              : undefined,
        },
      },
      cycleInteractions: buildCycleInteractions(
        sajuProfile.dayBranch || sajuProfile.pillars?.day?.branch || '',
        findDaeunForDate(date),
        sewoonForYear(date.getFullYear()),
        wolwoonForPack(dailyPack),
        { ganji: `${dailyPillar.stem}${dailyPillar.branch}` }
      ),
      cycleNarrative: summarizeCycleInteractions(
        buildCycleInteractions(
          sajuProfile.dayBranch || sajuProfile.pillars?.day?.branch || '',
          findDaeunForDate(date),
          sewoonForYear(date.getFullYear()),
          wolwoonForPack(dailyPack),
          { ganji: `${dailyPillar.stem}${dailyPillar.branch}` }
        ) || []
      ),
      dayRuler: (() => {
        const planet = getPlanetaryHourPlanet(date)
        const theme = DAY_RULER_THEMES[planet]
        if (!theme) return undefined
        return {
          planet,
          planetKo: theme.planetKo,
          themeKo: theme.themeKo,
          themeEn: theme.themeEn,
        }
      })(),
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
