// fusion/adapters/forCalendar.ts
// 캘린더용 fusion 어댑터 — 사주·점성 layer 를 받아 18테마 × 시점 교차 후 캘린더 grid 출력.
//
// 계산은 일체 하지 않음. 모든 raw layer 는 Saju/sajuLayers + astrology/astroLayers 에서 받음.

import type { Chart, NatalInput } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars, SajuThemeKey } from '@/lib/Saju/themes/types'
import type { CrossTone, ThemeKey, ThemeTimingCross } from '../crosses/types'
import { crossThemeAtTime } from '../crosses'
import {
  getSajuLayersForDate,
  getSajuMonthDailyLayers,
} from '@/lib/Saju/sajuLayers'
import {
  getAstroLayersForDate,
  getAstroMonthDailyLayers,
} from '@/lib/astrology/astroLayers'
import type { SajuTimingAnalysis } from '@/lib/Saju/timing/types'
import type { AstroTimingAnalysis } from '@/lib/astrology/timing/types'
import type { CalendarDay, CalendarMonth, CalendarDayDetail, DayGrade } from './types'

const CORE_THEMES: ThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
]

const ALL_THEMES: SajuThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
  'study', 'children', 'parents', 'travel', 'social', 'business',
  'reputation', 'spirituality', 'karma', 'crisis', 'creativity', 'legal',
]

// ============================================================
// tone → 0..1 score (back-compat). 새 코드는 crossView.score (0..100) 사용.
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

/** crossView.score (0..100) → 0..1 도메인 점수 */
function score01(cross: { crossView: { score?: number; tone: CrossTone } }): number {
  if (typeof cross.crossView.score === 'number') return cross.crossView.score / 100
  return scoreFromTone(cross.crossView.tone)
}

function aggregateTone(tones: CrossTone[]): CrossTone {
  if (tones.length === 0) return 'neutral'
  const counts: Record<CrossTone, number> = {
    'strong-positive': 0, positive: 0, mixed: 0, neutral: 0, cautious: 0, 'strong-negative': 0,
  }
  for (const t of tones) counts[t] += 1
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
  return LABEL_BY_DOMAIN_TONE[`${topDomain}.${tone}`] ?? `${topDomain} ${tone}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
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
  natalInput?: NatalInput
  iljinByDate?: Record<string, string>
  age?: number
  birthYear?: number
  daeunList?: Array<{ stem: string; branch: string; startAge: number }>
  extraSajuTimings?: SajuTimingAnalysis[]
  extraAstroTimings?: AstroTimingAnalysis[]
  hour?: number
}

/**
 * 월별 캘린더 — 6 핵심 테마 × N일 cross.
 * 계산은 sajuLayers / astroLayers 에 위임.
 */
export async function buildCalendarMonth(
  input: CalendarAdapterInput,
  year: number,
  month: number,
): Promise<CalendarMonth> {
  const daysInMonth = getDaysInMonth(year, month)
  const days: CalendarDay[] = []
  const hour = input.hour ?? 12

  // ============================================================
  // 그 달 한 번만 계산되는 사주 layer (대운/세운/월운)
  // ============================================================
  const monthSaju = getSajuLayersForDate({
    dayMaster: input.saju.day.stem,
    daeunList: input.daeunList,
    birthYear: input.birthYear,
    age: input.age,
    year, month,
  })

  // 일진 30일 batch
  const dailySajuMap = getSajuMonthDailyLayers({
    dayMaster: input.saju.day.stem,
    year, month,
  })

  // ============================================================
  // 그 달 한 번만 계산되는 점성 layer (decadal/lifetime/lots/yearly/monthly)
  // ============================================================
  const monthAstro = await getAstroLayersForDate({
    natal: input.astro,
    natalInput: input.natalInput,
    age: input.age,
    year, month,
  })

  // daily transit 30일 batch
  const dailyAstroMap = input.natalInput
    ? await getAstroMonthDailyLayers({
        natal: input.astro,
        natalInput: input.natalInput,
        year, month,
      })
    : new Map<string, AstroTimingAnalysis[]>()

  // ============================================================
  // 30일 루프 — 그 날에 hourly 추가 + cross
  // ============================================================
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    // 그 날 hourly (정오 또는 input.hour)
    const dayLayers = getSajuLayersForDate({
      dayMaster: input.saju.day.stem,
      year, month, day: d, hour,
    })
    const astroDayLayers = await getAstroLayersForDate({
      natal: input.astro,
      year, month, day: d, hour,
    })

    // 사주 layer 합
    const sajuTimings: SajuTimingAnalysis[] = []
    if (monthSaju.decadal) sajuTimings.push(monthSaju.decadal)
    if (monthSaju.yearly) sajuTimings.push(monthSaju.yearly)
    if (monthSaju.monthly) sajuTimings.push(monthSaju.monthly)
    const dailySaju = dailySajuMap.get(date)
    if (dailySaju) sajuTimings.push(dailySaju.daily)
    if (dayLayers.hourly) sajuTimings.push(dayLayers.hourly)
    if (input.extraSajuTimings) sajuTimings.push(...input.extraSajuTimings)

    // 점성 layer 합
    const astroTimings: AstroTimingAnalysis[] = []
    if (monthAstro.decadal) astroTimings.push(monthAstro.decadal)
    if (monthAstro.lifetime) astroTimings.push(monthAstro.lifetime)
    if (monthAstro.lots) astroTimings.push(monthAstro.lots)
    if (monthAstro.yearly) astroTimings.push(...monthAstro.yearly)
    if (monthAstro.monthly) astroTimings.push(...monthAstro.monthly)
    const dailyAstros = dailyAstroMap.get(date)
    if (dailyAstros) astroTimings.push(...dailyAstros)
    if (astroDayLayers.hourly) astroTimings.push(astroDayLayers.hourly)
    if (input.extraAstroTimings) astroTimings.push(...input.extraAstroTimings)

    // 6 핵심 테마 cross
    const crosses = CORE_THEMES.map((theme) =>
      crossThemeAtTime({
        saju: input.saju,
        astro: input.astro,
        theme,
        timing: { unit: 'daily', periodLabel: date, sajuTimings, astroTimings },
      }),
    )

    const domainScores: Partial<Record<ThemeKey, number>> = {}
    for (const c of crosses) domainScores[c.theme] = score01(c)

    const topEntry = Object.entries(domainScores).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    const topDomain = (topEntry?.[0] ?? null) as ThemeKey | null
    const tone = aggregateTone(crosses.map((c) => c.crossView.tone))
    const label = generateLabel(topDomain, tone)
    // 종합 점수 = 도메인 점수 평균 × 100, grade = 임계값
    const avgScore = Math.round(
      (Object.values(domainScores) as number[]).reduce((a, b) => a + b, 0) / CORE_THEMES.length * 100,
    )
    const grade: DayGrade =
      avgScore >= 70 ? 'auspicious' :
      avgScore >= 58 ? 'good' :
      avgScore >= 42 ? 'normal' :
      avgScore >= 30 ? 'caution' :
      'inauspicious'

    const iljinLabel = input.iljinByDate?.[date]
      ?? (dailySaju ? `${dailySaju.iljinRaw.heavenlyStem}${dailySaju.iljinRaw.earthlyBranch}` : undefined)

    days.push({
      date,
      iljin: iljinLabel,
      domainScores,
      topDomain,
      tone,
      score: avgScore,
      grade,
      label,
      summary: crosses[0]?.crossView.consensus ?? '',
    })
  }

  // 통계
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

  const monthlyDomains: Partial<Record<ThemeKey, number>> = {}
  for (const theme of CORE_THEMES) {
    const scores = days.map((d) => d.domainScores[theme] ?? 0)
    monthlyDomains[theme] = scores.reduce((a, b) => a + b, 0) / scores.length
  }
  const monthScore = (Object.values(monthlyDomains) as number[]).reduce((a, b) => a + b, 0) / CORE_THEMES.length
  const monthTone = aggregateTone(days.map((d) => d.tone))
  const monthNarrative = buildMonthNarrative(monthTone, monthlyDomains, bestDays)

  return {
    year, month, days,
    highlights: { bestDays, cautionDays, auspiciousByDomain },
    monthScore, monthTone, monthlyDomains, monthNarrative,
  }
}

/**
 * 일별 상세 — 18 테마 풀 cross + 조언 + TOP 3 (옵션).
 */
export async function buildCalendarDay(
  input: CalendarAdapterInput & {
    lunarByDate?: Record<string, string>
    isCheoneulGwiinByDate?: Record<string, boolean>
    bestDaysOfMonth?: CalendarDay[]
  },
  date: string,
): Promise<CalendarDayDetail> {
  const [yearStr, monthStr, dayStr] = date.split('-')
  const year = parseInt(yearStr, 10)
  const monthNum = parseInt(monthStr, 10)
  const dayNum = parseInt(dayStr, 10)
  const hour = input.hour ?? 12

  // 사주 layer 전부
  const sajuBundle = getSajuLayersForDate({
    dayMaster: input.saju.day.stem,
    daeunList: input.daeunList,
    birthYear: input.birthYear,
    age: input.age,
    year, month: monthNum, day: dayNum, hour,
  })
  const sajuTimings: SajuTimingAnalysis[] = []
  if (sajuBundle.decadal) sajuTimings.push(sajuBundle.decadal)
  if (sajuBundle.yearly) sajuTimings.push(sajuBundle.yearly)
  if (sajuBundle.monthly) sajuTimings.push(sajuBundle.monthly)
  if (sajuBundle.daily) sajuTimings.push(sajuBundle.daily)
  if (sajuBundle.hourly) sajuTimings.push(sajuBundle.hourly)
  if (input.extraSajuTimings) sajuTimings.push(...input.extraSajuTimings)

  // 점성 layer 전부
  const astroBundle = await getAstroLayersForDate({
    natal: input.astro,
    natalInput: input.natalInput,
    age: input.age,
    year, month: monthNum, day: dayNum, hour,
  })
  const astroTimings: AstroTimingAnalysis[] = []
  if (astroBundle.decadal) astroTimings.push(astroBundle.decadal)
  if (astroBundle.lifetime) astroTimings.push(astroBundle.lifetime)
  if (astroBundle.lots) astroTimings.push(astroBundle.lots)
  if (astroBundle.yearly) astroTimings.push(...astroBundle.yearly)
  if (astroBundle.monthly) astroTimings.push(...astroBundle.monthly)
  if (astroBundle.daily) astroTimings.push(...astroBundle.daily)
  if (astroBundle.hourly) astroTimings.push(astroBundle.hourly)
  if (input.extraAstroTimings) astroTimings.push(...input.extraAstroTimings)

  // 18 테마 cross
  const crosses = ALL_THEMES.map((theme) =>
    crossThemeAtTime({
      saju: input.saju,
      astro: input.astro,
      theme,
      timing: { unit: 'daily', periodLabel: date, sajuTimings, astroTimings },
    }),
  )

  const topInsights = crosses
    .filter((c) => c.crossView.tone !== 'neutral')
    .sort((a, b) => scoreFromTone(b.crossView.tone) - scoreFromTone(a.crossView.tone))
    .slice(0, 7)
    .map((c) => c.crossView.consensus)

  const domainScores: Partial<Record<ThemeKey, number>> = {}
  for (const c of crosses) domainScores[c.theme] = score01(c)

  const advice = generateAdvice(crosses)

  const bestDaysOfMonth = input.bestDaysOfMonth?.slice(0, 3).map((d) => ({
    date: d.date,
    label: d.label,
    score: d.domainScores[d.topDomain ?? 'love'] ?? 0,
  }))

  return {
    date,
    iljin: input.iljinByDate?.[date]
      ?? (sajuBundle.iljinRaw ? `${sajuBundle.iljinRaw.heavenlyStem}${sajuBundle.iljinRaw.earthlyBranch}` : undefined),
    lunar: input.lunarByDate?.[date],
    isCheoneulGwiin: input.isCheoneulGwiinByDate?.[date] ?? sajuBundle.iljinRaw?.isCheoneulGwiin,
    crosses,
    topInsights,
    domainScores,
    advice,
    bestDaysOfMonth,
  }
}
