// fusion/adapters/forCalendar.ts
// 캘린더용 fusion 어댑터 — 월별 grid 데이터 + 일별 상세.

import type { Chart } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars, SajuThemeKey } from '@/lib/Saju/themes/types'
import type { CrossTone, ThemeKey, ThemeTimingCross } from '../crosses/types'
import { crossThemeAtTime } from '../crosses'
import { getIljinCalendar } from '@/lib/Saju/foundation/unse'
import { analyzeDailySaju } from '@/lib/Saju/timing/daily'
import { STEMS } from '@/lib/Saju/foundation/constants'
import type { DayMaster, IljinData } from '@/lib/Saju/foundation/types'
import type { SajuTimingAnalysis } from '@/lib/Saju/timing/types'
import type { CalendarDay, CalendarMonth, CalendarDayDetail } from './types'

const CORE_THEMES: ThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
]

const ALL_THEMES: SajuThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
  'study', 'children', 'parents', 'travel', 'social', 'business',
  'reputation', 'spirituality', 'karma', 'crisis', 'creativity', 'legal',
]

// ============================================================
// 헬퍼
// ============================================================

const TONE_TO_SCORE: Record<CrossTone, number> = {
  'strong-positive': 1.0,
  positive:          0.7,
  mixed:             0.5,
  neutral:           0.4,
  cautious:          0.25,
  'strong-negative': 0.0,
}

function scoreFromTone(tone: CrossTone): number {
  return TONE_TO_SCORE[tone] ?? 0.4
}

function aggregateTone(tones: CrossTone[]): CrossTone {
  if (tones.length === 0) return 'neutral'
  const counts: Record<CrossTone, number> = {
    'strong-positive': 0, positive: 0, mixed: 0, neutral: 0, cautious: 0, 'strong-negative': 0,
  }
  for (const t of tones) counts[t] += 1
  // 우선순위 결정 — strong이 있으면 우선
  if (counts['strong-positive'] >= 2) return 'strong-positive'
  if (counts['strong-negative'] >= 2) return 'strong-negative'
  if (counts.positive > counts.cautious) return 'positive'
  if (counts.cautious > counts.positive) return 'cautious'
  if (counts.mixed > 0) return 'mixed'
  return 'neutral'
}

const LABEL_BY_DOMAIN_TONE: Record<string, string> = {
  'love.strong-positive':   '결혼·연애 길일',
  'love.positive':          '연애 좋음',
  'love.cautious':          '관계 조심',
  'money.strong-positive':  '투자·계약 길일',
  'money.positive':         '재물 좋음',
  'money.cautious':         '큰 지출 조심',
  'career.strong-positive': '승진·면접 길일',
  'career.positive':        '직업 좋음',
  'career.cautious':        '직장 분쟁 조심',
  'family.strong-positive': '가족 모임 좋음',
  'family.positive':        '가정 좋음',
  'family.cautious':        '가족 갈등 조심',
  'health.strong-positive': '건강 회복 좋음',
  'health.positive':        '건강 좋음',
  'health.cautious':        '건강 주의',
}

function generateLabel(topDomain: ThemeKey | null, tone: CrossTone): string {
  if (!topDomain) return '평이한 날'
  const key = `${topDomain}.${tone}`
  return LABEL_BY_DOMAIN_TONE[key] ?? `${topDomain} ${tone}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 사주 일간 stem (예: '甲') → DayMaster 객체.
 */
function getDayMaster(stemName: string): DayMaster | null {
  const found = STEMS.find((s) => s.name === stemName)
  return found ? (found as DayMaster) : null
}

/**
 * 일진 list → date 키 map.
 */
function indexIljinByDate(iljins: IljinData[]): Record<string, IljinData> {
  const map: Record<string, IljinData> = {}
  for (const i of iljins) {
    const date = `${i.year}-${String(i.month).padStart(2, '0')}-${String(i.day).padStart(2, '0')}`
    map[date] = i
  }
  return map
}

const DOMAIN_ADVICE_DO: Record<string, string[]> = {
  'love.strong-positive':   ['결혼·약혼 결정', '고백·청혼', '연애 시작'],
  'love.positive':          ['데이트', '관계 정리', '솔직한 대화'],
  'money.strong-positive':  ['투자·계약 서명', '큰 거래 마무리', '재산 매입'],
  'money.positive':         ['저축', '소액 투자', '재정 점검'],
  'career.strong-positive': ['면접·승진 시도', '이직 결정', '발표·미팅'],
  'career.positive':        ['중요 미팅', '업무 마무리', '협업 시작'],
  'family.strong-positive': ['가족 모임', '가족 결정', '부모 방문'],
  'family.positive':        ['가족과 시간', '소통'],
  'health.strong-positive': ['건강검진', '운동 시작', '시술'],
  'health.positive':        ['휴식', '명상', '식단 정리'],
}

const DOMAIN_ADVICE_AVOID: Record<string, string[]> = {
  'love.cautious':          ['큰 다툼', '이별 결정', '조급한 결정'],
  'love.strong-negative':   ['관계 파탄 결정', '돌이킬 수 없는 선택'],
  'money.cautious':         ['큰 지출', '도박', '대출'],
  'money.strong-negative':  ['큰 투자', '부동산 매매', '서명 미루기'],
  'career.cautious':        ['직장 분쟁', '사표', '거친 발언'],
  'career.strong-negative': ['중요 결정', '협상 강행'],
  'family.cautious':        ['가족 갈등 회피', '큰 결정 보류'],
  'family.strong-negative': ['가족 분쟁 격화'],
  'health.cautious':        ['무리한 운동', '음주·과식', '수면 부족'],
  'health.strong-negative': ['수술·시술 보류', '극단적 다이어트'],
}

function generateAdvice(crosses: ThemeTimingCross[]): { do: string[]; avoid: string[] } {
  const doList: string[] = []
  const avoidList: string[] = []
  for (const c of crosses) {
    const key = `${c.theme}.${c.crossView.tone}`
    if (DOMAIN_ADVICE_DO[key]) doList.push(...DOMAIN_ADVICE_DO[key])
    if (DOMAIN_ADVICE_AVOID[key]) avoidList.push(...DOMAIN_ADVICE_AVOID[key])
  }
  // 중복 제거 + 최대 5개
  return {
    do: Array.from(new Set(doList)).slice(0, 5),
    avoid: Array.from(new Set(avoidList)).slice(0, 5),
  }
}

function buildMonthNarrative(
  monthTone: CrossTone,
  monthlyDomains: Partial<Record<ThemeKey, number>>,
  bestDays: CalendarDay[],
): string {
  const sorted = Object.entries(monthlyDomains)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  const top = sorted[0]
  const weak = sorted[sorted.length - 1]
  const toneText =
    monthTone === 'strong-positive' ? '활발한 흐름'
    : monthTone === 'positive'      ? '우호적'
    : monthTone === 'mixed'         ? '양면성'
    : monthTone === 'cautious'      ? '신중'
    : monthTone === 'strong-negative' ? '주의 필요'
    : '평이'
  const bestText = bestDays.length > 0
    ? ` 강한 날: ${bestDays.slice(0, 3).map((d) => `${d.date.slice(8)}일(${d.label})`).join(', ')}.`
    : ''
  return `이 달은 ${toneText} — ${top?.[0]} 영역 활성, ${weak?.[0]} 영역 약함.${bestText}`
}

// ============================================================
// 메인 어댑터
// ============================================================

export interface CalendarAdapterInput {
  saju: SimpleSajuPillars
  astro: Chart
  iljinByDate?: Record<string, string>     // '2027-05-15' → '갑자' (외부 계산)
}

/**
 * 월별 캘린더 — 6 핵심 테마 × 30일 cross.
 */
export function buildCalendarMonth(
  input: CalendarAdapterInput,
  year: number,
  month: number,
): CalendarMonth {
  const daysInMonth = getDaysInMonth(year, month)
  const days: CalendarDay[] = []

  // 일진 매일 계산 (KASI 기반, 사주 일간 기준)
  const dayMaster = getDayMaster(input.saju.day.stem)
  const iljins: IljinData[] = dayMaster
    ? getIljinCalendar(year, month, dayMaster)
    : []
  const iljinMap = indexIljinByDate(iljins)

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    // 그 날 사주 일진 분석 → SajuTimingAnalysis
    let sajuTiming: SajuTimingAnalysis | undefined
    const iljin = iljinMap[date]
    if (iljin) {
      sajuTiming = analyzeDailySaju({ iljin, dayMaster: input.saju.day.stem })
    }

    const crosses = CORE_THEMES.map((theme) =>
      crossThemeAtTime({
        saju: input.saju,
        astro: input.astro,
        theme,
        timing: { unit: 'daily', periodLabel: date, sajuTiming },
      }),
    )

    const domainScores: Partial<Record<ThemeKey, number>> = {}
    for (const c of crosses) {
      domainScores[c.theme] = scoreFromTone(c.crossView.tone)
    }

    const topEntry = Object.entries(domainScores).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    const topDomain = (topEntry?.[0] ?? null) as ThemeKey | null
    const tone = aggregateTone(crosses.map((c) => c.crossView.tone))
    const label = generateLabel(topDomain, tone)

    // 일진 자동 표시 (input.iljinByDate 우선, 없으면 계산값)
    const iljinLabel = input.iljinByDate?.[date]
      ?? (iljin ? `${iljin.heavenlyStem}${iljin.earthlyBranch}` : undefined)

    days.push({
      date,
      iljin: iljinLabel,
      domainScores,
      topDomain,
      tone,
      label,
      summary: crosses[0]?.crossView.consensus ?? '',
    })
  }

  // Highlights
  const sortedByScore = [...days].sort(
    (a, b) => (b.domainScores[b.topDomain!] ?? 0) - (a.domainScores[a.topDomain!] ?? 0),
  )
  const bestDays = sortedByScore.slice(0, 5)
  const cautionDays = days.filter((d) => d.tone === 'cautious' || d.tone === 'strong-negative')

  const auspiciousByDomain: Partial<Record<ThemeKey, CalendarDay[]>> = {}
  for (const theme of CORE_THEMES) {
    auspiciousByDomain[theme] = days
      .filter((d) => (d.domainScores[theme] ?? 0) >= 0.7)
      .sort((a, b) => (b.domainScores[theme] ?? 0) - (a.domainScores[theme] ?? 0))
      .slice(0, 5)
  }

  // 월 통계
  const monthlyDomains: Partial<Record<ThemeKey, number>> = {}
  for (const theme of CORE_THEMES) {
    const scores = days.map((d) => d.domainScores[theme] ?? 0)
    monthlyDomains[theme] = scores.reduce((a, b) => a + b, 0) / scores.length
  }
  const monthScore = (Object.values(monthlyDomains) as number[]).reduce((a, b) => a + b, 0) / CORE_THEMES.length
  const monthTone = aggregateTone(days.map((d) => d.tone))
  const monthNarrative = buildMonthNarrative(monthTone, monthlyDomains, bestDays)

  return {
    year,
    month,
    days,
    highlights: { bestDays, cautionDays, auspiciousByDomain },
    monthScore,
    monthTone,
    monthlyDomains,
    monthNarrative,
  }
}

/**
 * 일별 상세 — 18 테마 풀 cross + 조언 + TOP 3 (옵션).
 */
export function buildCalendarDay(
  input: CalendarAdapterInput & {
    lunarByDate?: Record<string, string>
    isCheoneulGwiinByDate?: Record<string, boolean>
    bestDaysOfMonth?: CalendarDay[]
  },
  date: string,
): CalendarDayDetail {
  // 그 날 사주 일진 자동 계산
  const [yearStr, monthStr, dayStr] = date.split('-')
  const year = parseInt(yearStr, 10)
  const monthNum = parseInt(monthStr, 10)
  const dayNum = parseInt(dayStr, 10)
  const dayMaster = getDayMaster(input.saju.day.stem)
  let sajuTiming: SajuTimingAnalysis | undefined
  let computedIljin: IljinData | undefined
  let computedIsCheoneul: boolean | undefined
  if (dayMaster) {
    const iljins = getIljinCalendar(year, monthNum, dayMaster)
    computedIljin = iljins.find((i) => i.day === dayNum)
    if (computedIljin) {
      sajuTiming = analyzeDailySaju({ iljin: computedIljin, dayMaster: input.saju.day.stem })
      computedIsCheoneul = computedIljin.isCheoneulGwiin
    }
  }

  const crosses = ALL_THEMES.map((theme) =>
    crossThemeAtTime({
      saju: input.saju,
      astro: input.astro,
      theme,
      timing: { unit: 'daily', periodLabel: date, sajuTiming },
    }),
  )

  const topInsights = crosses
    .filter((c) => c.crossView.tone !== 'neutral')
    .sort((a, b) => scoreFromTone(b.crossView.tone) - scoreFromTone(a.crossView.tone))
    .slice(0, 7)
    .map((c) => c.crossView.consensus)

  // 도메인 점수 (numeric)
  const domainScores: Partial<Record<ThemeKey, number>> = {}
  for (const c of crosses) {
    domainScores[c.theme] = scoreFromTone(c.crossView.tone)
  }

  // 조언
  const advice = generateAdvice(crosses)

  // TOP 3 of month (옵션)
  const bestDaysOfMonth = input.bestDaysOfMonth?.slice(0, 3).map((d) => ({
    date: d.date,
    label: d.label,
    score: d.domainScores[d.topDomain ?? 'love'] ?? 0,
  }))

  return {
    date,
    iljin: input.iljinByDate?.[date]
      ?? (computedIljin ? `${computedIljin.heavenlyStem}${computedIljin.earthlyBranch}` : undefined),
    lunar: input.lunarByDate?.[date],
    isCheoneulGwiin: input.isCheoneulGwiinByDate?.[date] ?? computedIsCheoneul,
    crosses,
    topInsights,
    domainScores,
    advice,
    bestDaysOfMonth,
  }
}
