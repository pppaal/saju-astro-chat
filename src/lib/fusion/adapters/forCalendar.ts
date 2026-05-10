// fusion/adapters/forCalendar.ts
// 캘린더용 fusion 어댑터 — 월별 grid 데이터 + 일별 상세.

import type { Chart, NatalInput } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars, SajuThemeKey } from '@/lib/Saju/themes/types'
import type { CrossTone, ThemeKey, ThemeTimingCross } from '../crosses/types'
import { crossThemeAtTime } from '../crosses'
import { getIljinCalendar, getMonthlyCycles } from '@/lib/Saju/foundation/unse'
import { analyzeDailySaju } from '@/lib/Saju/timing/daily'
import { analyzeMonthlySaju } from '@/lib/Saju/timing/monthly'
import { calculateProfection, getProfectionInterpretation } from '@/lib/astrology/foundation/profections'
import { calculateSolarReturn, calculateLunarReturn } from '@/lib/astrology/foundation/returns'
import { calculateTransitChart, findMajorTransits } from '@/lib/astrology/foundation/transit'
import { analyzeYearlyAstro } from '@/lib/astrology/timing/yearly'
import { analyzeMonthlyAstro } from '@/lib/astrology/timing/monthly'
import { analyzeDailyAstro } from '@/lib/astrology/timing/daily'
import { analyzeDecadalAstro } from '@/lib/astrology/timing/decadal'
import { analyzeLifetimeAstro } from '@/lib/astrology/timing/lifetime'
import { getRetrogradePlanets, checkVoidOfCourse } from '@/lib/astrology/foundation/electional'
import { getEclipsesBetween } from '@/lib/astrology/foundation/eclipses'
import { getDecan } from '@/lib/astrology/foundation/decans'
import { getEgyptianBound } from '@/lib/astrology/foundation/bounds'
import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import { calculateArabicLots, getLotInterpretation } from '@/lib/astrology/foundation/arabicParts'
import { calculateSecondaryProgressions } from '@/lib/astrology/foundation/progressions'
import { analyzeHourlySaju } from '@/lib/Saju/timing/hourly'
import { analyzeHourlyAstro, type PlanetaryHourPlanet } from '@/lib/astrology/timing/hourly'
import { STEMS, TIME_STEM_LOOKUP } from '@/lib/Saju/foundation/constants'
import { getTimeBranchFromHour } from '@/lib/Saju/foundation/validation'
import { getYearPillarForDate } from '@/lib/Saju/foundation/datePillars'
import type { DayMaster, IljinData, WolunData } from '@/lib/Saju/foundation/types'
import type { SajuTimingAnalysis } from '@/lib/Saju/timing/types'
import type { AstroTimingAnalysis } from '@/lib/astrology/timing/types'
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

// ============================================================
// 시진(時辰) 계산 — Saju 엔진의 foundation 함수 재사용
// (saju.ts:295~325 와 동일 로직: TIME_STEM_LOOKUP + getTimeBranchFromHour)
// ============================================================
const STEM_NAMES = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCH_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

function calcHourPillar(dayStem: string, hour: number): { stem: string; branch: string } | null {
  const firstHourStem = TIME_STEM_LOOKUP[dayStem]
  if (!firstHourStem) return null
  const branch = getTimeBranchFromHour(hour)   // 23시=子 정확 매핑
  const branchIdx = BRANCH_NAMES.indexOf(branch)
  const stemStartIdx = STEM_NAMES.indexOf(firstHourStem)
  if (stemStartIdx < 0 || branchIdx < 0) return null
  const stemIdx = (stemStartIdx + branchIdx) % 10
  return { stem: STEM_NAMES[stemIdx], branch }
}

// ============================================================
// 행성시 (Planetary Hour) — Chaldean order, 단순 (sunrise 06:00 가정)
// ============================================================
const CHALDEAN_ORDER: PlanetaryHourPlanet[] = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon']
// 요일별 첫 행성시 (sunday=Sun, ...)
const DAY_RULER: PlanetaryHourPlanet[] = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

function calcPlanetaryHour(date: Date, hour: number): PlanetaryHourPlanet {
  const dayOfWeek = date.getDay()
  const startPlanet = DAY_RULER[dayOfWeek]
  const startIdx = CHALDEAN_ORDER.indexOf(startPlanet)
  // 06:00 부터 1시간씩 Chaldean 역순으로 진행
  const hoursFromSunrise = (hour - 6 + 24) % 24
  const idx = (startIdx + hoursFromSunrise) % 7
  return CHALDEAN_ORDER[idx]
}

/**
 * 시진 layer (사주 + 점성 행성시) 빌드. hour=0~23.
 * 둘 다 hourly 분석 반환 — 실패 시 null.
 */
function buildHourlyLayers(
  date: string,
  hour: number,
  dayStem: string,
): { saju?: SajuTimingAnalysis; astro?: AstroTimingAnalysis } {
  const result: { saju?: SajuTimingAnalysis; astro?: AstroTimingAnalysis } = {}
  const dt = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`)
  if (isNaN(dt.getTime())) return result

  // 사주 시진
  try {
    const hourPillar = calcHourPillar(dayStem, hour)
    if (hourPillar) {
      result.saju = analyzeHourlySaju({ date: dt, hourPillar, dayMaster: dayStem })
    }
  } catch { /* skip */ }

  // 점성 행성시
  try {
    const planet = calcPlanetaryHour(dt, hour)
    const isDay = hour >= 6 && hour < 18
    result.astro = analyzeHourlyAstro({
      isoDateTime: `${date}T${String(hour).padStart(2, '0')}:00:00`,
      planet,
      isDay,
    })
  } catch { /* skip */ }

  return result
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
  natalInput?: NatalInput                  // Solar/Lunar Return + daily transit 산출용 (옵션)
  iljinByDate?: Record<string, string>     // '2027-05-15' → '갑자' (외부 계산)
  age?: number                             // 점성 Profection 용 (옵션)
  // 사주 세운/대운 wire 용 (caller 가 calculateSajuData 결과에서 추출해 넘김)
  birthYear?: number
  daeunList?: Array<{ stem: string; branch: string; startAge: number }>
  // 추가 사주·점성 layer (caller 가 미리 계산해 넘김 — 세운·일진 형충회합 등)
  extraSajuTimings?: SajuTimingAnalysis[]
  extraAstroTimings?: AstroTimingAnalysis[]
  // 시진(時辰) layer — 일별 상세 시 0~23 hour 지정. month build 시 정오(12) 기준 자동 적용.
  hour?: number
}

/**
 * 월별 캘린더 — 6 핵심 테마 × 30일 cross.
 */
export async function buildCalendarMonth(
  input: CalendarAdapterInput,
  year: number,
  month: number,
): Promise<CalendarMonth> {
  const daysInMonth = getDaysInMonth(year, month)
  const days: CalendarDay[] = []

  // ============================================================
  // Layer 1: 사주 일진 매일 (KASI)
  // ============================================================
  const dayMaster = getDayMaster(input.saju.day.stem)
  const iljins: IljinData[] = dayMaster
    ? getIljinCalendar(year, month, dayMaster)
    : []
  const iljinMap = indexIljinByDate(iljins)

  // ============================================================
  // Layer 2: 사주 월운 (그 달 1개)
  // ============================================================
  let sajuMonthly: SajuTimingAnalysis | undefined
  if (dayMaster) {
    const monthCycles = getMonthlyCycles(year, dayMaster) as WolunData[]
    const thisMonth = monthCycles.find((m) => m.month === month)
    if (thisMonth) {
      sajuMonthly = analyzeMonthlySaju({ month: thisMonth, dayMaster: input.saju.day.stem })
    }
  }

  // ============================================================
  // Layer 2b: 사주 세운 (그 해 1개) — birthYear + daeunList 제공 시
  // ============================================================
  let sajuYearly: SajuTimingAnalysis | undefined
  if (input.birthYear != null && input.daeunList && input.daeunList.length > 0) {
    try {
      // 입춘(절기) 기준 정확한 세운 — 월 중간(15일)을 샘플로 사용해
      // 1~2월 초의 입춘 전/후 경계도 정확히 반영.
      const sampleDate = new Date(year, month - 1, 15)
      const yearPillar = getYearPillarForDate(sampleDate)
      sajuYearly = {
        unit: 'yearly',
        periodLabel: `세운 ${year} ${yearPillar.stem}${yearPillar.branch}`,
        highlights: [{
          source: `세운 ${yearPillar.stem}${yearPillar.branch}`,
          meaning: `${year}년 천간 ${yearPillar.stem}, 지지 ${yearPillar.branch} — 본명과 작용.`,
          tone: 'neutral',
        }],
        summary: `${year} 세운 ${yearPillar.stem}${yearPillar.branch}`,
      }
    } catch { /* skip */ }
  }

  // ============================================================
  // Layer 2c: 사주 대운 (활성 period) — daeunList 제공 시
  // ============================================================
  let sajuDecadal: SajuTimingAnalysis | undefined
  if (input.daeunList && input.age != null) {
    const active = input.daeunList.find((d) => input.age! >= d.startAge && input.age! < d.startAge + 10)
    if (active) {
      sajuDecadal = {
        unit: 'decadal',
        periodLabel: `대운 ${active.stem}${active.branch} (age ${active.startAge}-${active.startAge + 9})`,
        highlights: [{
          source: `대운 ${active.stem}${active.branch}`,
          meaning: `${active.startAge}-${active.startAge + 9}세 대운 — ${active.stem}${active.branch} 10년 backdrop.`,
          tone: 'neutral',
        }],
        summary: `대운 ${active.stem}${active.branch}`,
      }
    }
  }

  // ============================================================
  // Layer 3: 점성 Profection (그 해 1개) — age 제공 시
  // ============================================================
  let astroYearly: AstroTimingAnalysis | undefined
  if (input.age != null) {
    try {
      const prof = calculateProfection(input.astro, input.age)
      astroYearly = {
        unit: 'yearly',
        periodLabel: `Profection age ${prof.age}`,
        highlights: [{
          source: `Profection age ${prof.age} — house ${prof.activatedHouse}`,
          meaning: getProfectionInterpretation(prof),
          tone: 'neutral',
        }],
        summary: `${prof.activatedHouse}궁 활성, Lord ${prof.lordOfYear}`,
      }
    } catch { /* skip */ }
  }

  // ============================================================
  // Layer 4: 점성 Solar Return (그 해 1번) + Lunar Return (그 달 1번)
  // — natalInput 제공 시 Swiss Ephemeris 호출
  // ============================================================
  let astroSolarReturn: AstroTimingAnalysis | undefined
  let astroLunarReturn: AstroTimingAnalysis | undefined
  if (input.natalInput) {
    try {
      const sr = await calculateSolarReturn({ natal: input.natalInput, year })
      astroSolarReturn = analyzeYearlyAstro(sr)
    } catch { /* skip */ }
    try {
      const lr = await calculateLunarReturn({ natal: input.natalInput, year, month })
      astroLunarReturn = analyzeMonthlyAstro(lr)
    } catch { /* skip */ }
  }

  // ============================================================
  // Layer 5: 점성 ZR period (장기, 1번)
  // ============================================================
  let astroDecadal: AstroTimingAnalysis | undefined
  if (input.age != null) {
    try {
      astroDecadal = analyzeDecadalAstro(input.astro, { age: input.age, yearsToProject: 90 })
    } catch { /* skip */ }
  }

  // ============================================================
  // Layer 5b: 점성 Progressions (lifetime, 1번)
  // ============================================================
  let astroLifetime: AstroTimingAnalysis | undefined
  if (input.natalInput) {
    try {
      const targetDate = `${year}-${String(month).padStart(2, '0')}-15`
      const progressed = await calculateSecondaryProgressions({
        natal: input.natalInput,
        targetDate,
      })
      astroLifetime = analyzeLifetimeAstro(progressed, input.astro)
    } catch { /* skip */ }
  }

  // ============================================================
  // Layer 5c: 점성 Arabic Lots (1번, chart 기반)
  // ============================================================
  let astroLots: AstroTimingAnalysis | undefined
  try {
    const sun = input.astro.planets.find((p) => p.name === 'Sun')
    const isDay = sun ? sun.house >= 7 && sun.house <= 12 : true
    const lots = calculateArabicLots(input.astro, isDay)
    astroLots = {
      unit: 'lifetime',
      periodLabel: 'Arabic Lots (natal)',
      highlights: lots.map((l) => ({
        source: `Lot of ${l.name} in ${l.sign}`,
        meaning: getLotInterpretation(l),
        tone: 'neutral' as const,
      })),
      summary: `${lots.length}개 lots`,
    }
  } catch { /* skip */ }

  // ============================================================
  // Layer 6: 점성 Eclipses (그 달 일·월식)
  // ============================================================
  let astroEclipses: AstroTimingAnalysis | undefined
  try {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`
    const eclipses = getEclipsesBetween(start, end)
    if (eclipses.length > 0) {
      astroEclipses = {
        unit: 'monthly',
        periodLabel: `Eclipses ${year}-${month}`,
        highlights: eclipses.map((e) => ({
          source: `${e.type} eclipse ${e.date}`,
          meaning: `${e.type} 일·월식 — ${e.sign} 영역 강한 변환점.`,
          tone: 'cautious',
        })),
        summary: `${eclipses.length}개 일·월식`,
      }
    }
  } catch { /* skip */ }

  // ============================================================
  // Layer 7: 점성 daily transit + Retrograde + VoC + Decan/Bound (매일)
  // ============================================================
  const dailyAstroByDate = new Map<string, AstroTimingAnalysis[]>()
  if (input.natalInput) {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      try {
        const transitChart = await calculateTransitChart({
          iso: `${date}T12:00:00`,
          latitude: input.natalInput.latitude,
          longitude: input.natalInput.longitude,
          timeZone: input.natalInput.timeZone,
        })
        const aspects = findMajorTransits(transitChart, input.astro, 1.0)
        const dayAnalyses: AstroTimingAnalysis[] = []
        // 7a. transit aspects
        dayAnalyses.push(analyzeDailyAstro({
          isoDate: date,
          transitChart,
          transitToNatalAspects: aspects.map(a => ({
            from: a.from, to: a.to, type: a.type, orb: a.orb, applying: a.applying, score: a.score,
          })),
        }))
        // 7b. Retrograde + VoC (electional 보조)
        const retros = getRetrogradePlanets(transitChart)
        const voc = checkVoidOfCourse(transitChart)
        const electHighlights = []
        if (retros.length > 0) {
          electHighlights.push({
            source: `역행: ${retros.join(', ')}`,
            meaning: `${retros.join(', ')} 역행 중 — 해당 행성 영역 신중.`,
            tone: 'cautious' as const,
          })
        }
        if (voc.isVoid) {
          electHighlights.push({
            source: 'Void of Course Moon',
            meaning: '보이드 — 새 시작 보류, 마무리 일에 적합.',
            tone: 'cautious' as const,
          })
        }
        // 7c. Decan/Bound transit (Sun·Moon·Venus 위주)
        for (const planet of transitChart.planets) {
          if (!['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(planet.name)) continue
          const decan = getDecan(planet.longitude)
          const bound = getEgyptianBound(planet.longitude)
          electHighlights.push({
            source: `${planet.name} ${planet.sign} (decan ${decan.ruler}, bound ${bound.ruler})`,
            meaning: `${planet.name} 트랜짓 — decan ruler ${decan.ruler}, bound ruler ${bound.ruler}.`,
            tone: 'neutral' as const,
          })
        }
        // 7d. Fixed Star transits (트랜짓 행성이 항성 conjunction)
        try {
          const starHits = findFixedStarConjunctions(transitChart, year, 1.0)
          for (const hit of starHits.slice(0, 3)) {
            const nature = (hit.star as { nature?: string }).nature ?? 'mixed'
            electHighlights.push({
              source: `Fixed Star ${hit.star.name} ↔ ${hit.planet} (orb ${hit.orb.toFixed(2)}°)`,
              meaning: `${hit.star.name} (${nature}) — ${hit.planet} 자극.`,
              tone: (nature === 'benefic' ? 'positive'
                  : nature === 'malefic' ? 'cautious'
                  : 'mixed') as 'positive' | 'cautious' | 'mixed',
            })
          }
        } catch { /* skip */ }
        if (electHighlights.length > 0) {
          dayAnalyses.push({
            unit: 'daily',
            periodLabel: `Electional ${date}`,
            highlights: electHighlights,
            summary: `Retrograde ${retros.length}, VoC=${voc.isVoid}`,
          })
        }
        dailyAstroByDate.set(date, dayAnalyses)
      } catch { /* skip */ }
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    // ============================================================
    // Layer 4: 사주 일진 (그 날)
    // ============================================================
    const sajuTimings: SajuTimingAnalysis[] = []
    if (sajuDecadal) sajuTimings.push(sajuDecadal)
    if (sajuYearly) sajuTimings.push(sajuYearly)
    if (sajuMonthly) sajuTimings.push(sajuMonthly)
    const iljin = iljinMap[date]
    if (iljin) {
      sajuTimings.push(analyzeDailySaju({ iljin, dayMaster: input.saju.day.stem }))
    }
    if (input.extraSajuTimings) sajuTimings.push(...input.extraSajuTimings)

    // ============================================================
    // Layer 4b: 사주 시진 + 점성 행성시 (hour 지정 시, 미지정 시 정오)
    // ============================================================
    const hour = input.hour ?? 12
    const hourly = buildHourlyLayers(date, hour, input.saju.day.stem)
    if (hourly.saju) sajuTimings.push(hourly.saju)

    // ============================================================
    // 점성 layer 합 (decadal ZR + lifetime Progressions + lots + Profection + SR + LR + Eclipses + daily + hourly)
    // ============================================================
    const astroTimings: AstroTimingAnalysis[] = []
    if (hourly.astro) astroTimings.push(hourly.astro)
    if (astroDecadal) astroTimings.push(astroDecadal)
    if (astroLifetime) astroTimings.push(astroLifetime)
    if (astroLots) astroTimings.push(astroLots)
    if (astroYearly) astroTimings.push(astroYearly)
    if (astroSolarReturn) astroTimings.push(astroSolarReturn)
    if (astroLunarReturn) astroTimings.push(astroLunarReturn)
    if (astroEclipses) astroTimings.push(astroEclipses)
    const dailyAstros = dailyAstroByDate.get(date)
    if (dailyAstros) astroTimings.push(...dailyAstros)
    if (input.extraAstroTimings) astroTimings.push(...input.extraAstroTimings)

    const crosses = CORE_THEMES.map((theme) =>
      crossThemeAtTime({
        saju: input.saju,
        astro: input.astro,
        theme,
        timing: { unit: 'daily', periodLabel: date, sajuTimings, astroTimings },
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
export async function buildCalendarDay(
  input: CalendarAdapterInput & {
    lunarByDate?: Record<string, string>
    isCheoneulGwiinByDate?: Record<string, boolean>
    bestDaysOfMonth?: CalendarDay[]
  },
  date: string,
): Promise<CalendarDayDetail> {
  // 그 날 사주 일진 자동 계산
  const [yearStr, monthStr, dayStr] = date.split('-')
  const year = parseInt(yearStr, 10)
  const monthNum = parseInt(monthStr, 10)
  const dayNum = parseInt(dayStr, 10)
  const dayMaster = getDayMaster(input.saju.day.stem)
  const sajuTimings: SajuTimingAnalysis[] = []
  let computedIljin: IljinData | undefined
  let computedIsCheoneul: boolean | undefined
  // 대운 (decadal layer) — daeunList 제공 시
  if (input.daeunList && input.age != null) {
    const active = input.daeunList.find((d) => input.age! >= d.startAge && input.age! < d.startAge + 10)
    if (active) {
      sajuTimings.push({
        unit: 'decadal',
        periodLabel: `대운 ${active.stem}${active.branch}`,
        highlights: [{
          source: `대운 ${active.stem}${active.branch}`,
          meaning: `${active.startAge}-${active.startAge + 9}세 backdrop.`,
          tone: 'neutral',
        }],
        summary: `대운 ${active.stem}${active.branch}`,
      })
    }
  }
  // 세운 (yearly layer) — 입춘 경계 정확 반영 (그 날짜 기준)
  if (input.birthYear != null && input.daeunList && input.daeunList.length > 0) {
    try {
      const yearPillar = getYearPillarForDate(new Date(year, monthNum - 1, dayNum))
      sajuTimings.push({
        unit: 'yearly',
        periodLabel: `세운 ${year} ${yearPillar.stem}${yearPillar.branch}`,
        highlights: [{
          source: `세운 ${yearPillar.stem}${yearPillar.branch}`,
          meaning: `${year}년 천간 ${yearPillar.stem}, 지지 ${yearPillar.branch}.`,
          tone: 'neutral',
        }],
        summary: `${year} 세운 ${yearPillar.stem}${yearPillar.branch}`,
      })
    } catch { /* skip */ }
  }
  if (dayMaster) {
    // 월운 (월 layer)
    const monthCycles = getMonthlyCycles(year, dayMaster) as WolunData[]
    const thisMonth = monthCycles.find((m) => m.month === monthNum)
    if (thisMonth) {
      sajuTimings.push(analyzeMonthlySaju({ month: thisMonth, dayMaster: input.saju.day.stem }))
    }
    // 일진 (일 layer)
    const iljins = getIljinCalendar(year, monthNum, dayMaster)
    computedIljin = iljins.find((i) => i.day === dayNum)
    if (computedIljin) {
      sajuTimings.push(analyzeDailySaju({ iljin: computedIljin, dayMaster: input.saju.day.stem }))
      computedIsCheoneul = computedIljin.isCheoneulGwiin
    }
  }
  if (input.extraSajuTimings) sajuTimings.push(...input.extraSajuTimings)

  // 시진 layer (input.hour 제공 시 — 미지정 시 정오 12)
  const hour = input.hour ?? 12
  const hourly = buildHourlyLayers(date, hour, input.saju.day.stem)
  if (hourly.saju) sajuTimings.push(hourly.saju)

  // 점성 layers (Decadal ZR + Profection + SR + LR + Eclipses + Daily transit + Retrograde + VoC + Decan/Bound + Hourly)
  const astroTimings: AstroTimingAnalysis[] = []
  if (hourly.astro) astroTimings.push(hourly.astro)
  if (input.age != null) {
    try {
      astroTimings.push(analyzeDecadalAstro(input.astro, { age: input.age }))
    } catch { /* skip */ }
    try {
      const prof = calculateProfection(input.astro, input.age)
      astroTimings.push({
        unit: 'yearly',
        periodLabel: `Profection age ${prof.age}`,
        highlights: [{
          source: `Profection ${prof.activatedHouse}궁`,
          meaning: getProfectionInterpretation(prof),
          tone: 'neutral',
        }],
        summary: `${prof.activatedHouse}궁 활성, Lord ${prof.lordOfYear}`,
      })
    } catch { /* skip */ }
  }
  // Eclipses 그 달
  try {
    const start = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const lastDay = new Date(year, monthNum, 0).getDate()
    const end = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`
    const eclipses = getEclipsesBetween(start, end)
    if (eclipses.length > 0) {
      astroTimings.push({
        unit: 'monthly',
        periodLabel: `Eclipses ${year}-${monthNum}`,
        highlights: eclipses.map((e) => ({
          source: `${e.type} eclipse ${e.date}`,
          meaning: `${e.type} 일·월식 — ${e.sign} 영역 변환점.`,
          tone: 'cautious' as const,
        })),
        summary: `${eclipses.length}개 일·월식`,
      })
    }
  } catch { /* skip */ }
  if (input.natalInput) {
    try {
      const sr = await calculateSolarReturn({ natal: input.natalInput, year })
      astroTimings.push(analyzeYearlyAstro(sr))
    } catch { /* skip */ }
    try {
      const lr = await calculateLunarReturn({ natal: input.natalInput, year, month: monthNum })
      astroTimings.push(analyzeMonthlyAstro(lr))
    } catch { /* skip */ }
    try {
      const transitChart = await calculateTransitChart({
        iso: `${date}T12:00:00`,
        latitude: input.natalInput.latitude,
        longitude: input.natalInput.longitude,
        timeZone: input.natalInput.timeZone,
      })
      const aspects = findMajorTransits(transitChart, input.astro, 1.0)
      astroTimings.push(analyzeDailyAstro({
        isoDate: date,
        transitChart,
        transitToNatalAspects: aspects.map(a => ({
          from: a.from, to: a.to, type: a.type, orb: a.orb, applying: a.applying, score: a.score,
        })),
      }))
      // Retrograde + VoC + Decan/Bound transit
      const retros = getRetrogradePlanets(transitChart)
      const voc = checkVoidOfCourse(transitChart)
      const electHighlights = []
      if (retros.length > 0) {
        electHighlights.push({
          source: `역행: ${retros.join(', ')}`,
          meaning: `${retros.join(', ')} 역행 — 신중.`,
          tone: 'cautious' as const,
        })
      }
      if (voc.isVoid) {
        electHighlights.push({
          source: 'Void of Course Moon',
          meaning: '보이드 — 새 시작 보류.',
          tone: 'cautious' as const,
        })
      }
      for (const planet of transitChart.planets) {
        if (!['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(planet.name)) continue
        const decan = getDecan(planet.longitude)
        const bound = getEgyptianBound(planet.longitude)
        electHighlights.push({
          source: `${planet.name} ${planet.sign} (decan ${decan.ruler}, bound ${bound.ruler})`,
          meaning: `${planet.name} — decan ${decan.ruler}, bound ${bound.ruler}.`,
          tone: 'neutral' as const,
        })
      }
      if (electHighlights.length > 0) {
        astroTimings.push({
          unit: 'daily',
          periodLabel: `Electional ${date}`,
          highlights: electHighlights,
          summary: `역행 ${retros.length}, VoC=${voc.isVoid}`,
        })
      }
    } catch { /* skip */ }
  }

  if (input.extraAstroTimings) astroTimings.push(...input.extraAstroTimings)

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
