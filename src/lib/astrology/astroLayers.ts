// astrology/astroLayers.ts
// 점성 엔진 — 특정 날짜·시간의 모든 타이밍 layer 를 한 번에 반환.
//
// fusion adapter 가 Swiss Ephemeris raw 함수를 직접 호출하는 대신,
// 이 파일에서 layer 들을 묶어 반환한다. Saju/sajuLayers 와 mirror 구조.

import type { Chart, NatalInput } from './foundation/types'
import { calculateProfection, getProfectionInterpretation } from './foundation/profections'
import { calculateSolarReturn, calculateLunarReturn } from './foundation/returns'
import { calculateTransitChart, findMajorTransits } from './foundation/transit'
import { calculateSecondaryProgressions } from './foundation/progressions'
import { calculateArabicLots, getLotInterpretation } from './foundation/arabicParts'
import { getEclipsesBetween } from './foundation/eclipses'
import { getRetrogradePlanets, checkVoidOfCourse } from './foundation/electional'
import { getDecan } from './foundation/decans'
import { getEgyptianBound } from './foundation/bounds'
import { findFixedStarConjunctions } from './foundation/fixedStars'
import { analyzeYearlyAstro } from './timing/yearly'
import { analyzeMonthlyAstro } from './timing/monthly'
import { analyzeDailyAstro } from './timing/daily'
import { analyzeDecadalAstro } from './timing/decadal'
import { analyzeLifetimeAstro } from './timing/lifetime'
import { analyzeHourlyAstro, type PlanetaryHourPlanet } from './timing/hourly'
import type { AstroTimingAnalysis } from './timing/types'
import type { ProfectionResult } from './foundation/profections'
import type { ReturnChart, AspectHit } from './foundation/types'
import type { Eclipse } from './foundation/eclipses'

// astroScore.ts 가 소비할 raw 데이터 (계산 결과의 원본)
export interface AstroLayersRaw {
  transitChart?: Chart
  transitAspects?: AspectHit[]
  retrogradePlanets?: string[]
  eclipses?: Eclipse[]
  profection?: ProfectionResult
  solarReturn?: ReturnChart
  lunarReturn?: ReturnChart
  lots?: ReturnType<typeof calculateArabicLots>
  planetaryHour?: { planet: PlanetaryHourPlanet; isDay: boolean }
}

const CHALDEAN_ORDER: PlanetaryHourPlanet[] = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon']
const DAY_RULER: PlanetaryHourPlanet[] = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

/** sunrise=06:00 단순 가정 (정확한 일출/일몰 함수 미구현). */
function calcPlanetaryHour(date: Date, hour: number): PlanetaryHourPlanet {
  const dayOfWeek = date.getDay()
  const startPlanet = DAY_RULER[dayOfWeek]
  const startIdx = CHALDEAN_ORDER.indexOf(startPlanet)
  const hoursFromSunrise = (hour - 6 + 24) % 24
  const idx = (startIdx + hoursFromSunrise) % 7
  return CHALDEAN_ORDER[idx]
}

export interface AstroLayersInput {
  natal: Chart
  natalInput?: NatalInput       // SR/LR/transit/Progressions 산출 필요 시
  age?: number                  // Profection·ZR 산출 필요 시
  year: number
  month: number                 // 1-12
  day?: number                  // 1-31, 미지정 시 daily/hourly 미산출
  hour?: number                 // 0-23, 미지정 시 hourly 미산출
}

export interface AstroLayersBundle {
  lifetime?: AstroTimingAnalysis        // Progressions
  lots?: AstroTimingAnalysis            // Arabic Lots (natal 기반, lifetime 분류)
  decadal?: AstroTimingAnalysis         // ZR period
  yearly?: AstroTimingAnalysis[]        // Profection + Solar Return (둘 다)
  monthly?: AstroTimingAnalysis[]       // Lunar Return + Eclipses
  daily?: AstroTimingAnalysis[]         // Daily transit + Electional (Retro/VoC/Decan/Bound/FixedStar)
  hourly?: AstroTimingAnalysis          // Planetary Hour
  /** astroScore.ts 등이 소비할 raw 계산 결과 */
  raw: AstroLayersRaw
}

/**
 * 그 시점의 점성 모든 layer 를 한 번에 반환.
 *
 * 호출 예:
 *   await getAstroLayersForDate({
 *     natal, natalInput, age: 31,
 *     year: 2026, month: 5, day: 15, hour: 12,
 *   })
 */
export async function getAstroLayersForDate(input: AstroLayersInput): Promise<AstroLayersBundle> {
  const bundle: AstroLayersBundle = { raw: {} }
  const { natal, natalInput, age, year, month, day, hour } = input

  // ZR decadal (age 필요)
  if (age != null) {
    try {
      bundle.decadal = analyzeDecadalAstro(natal, { age, yearsToProject: 90 })
    } catch { /* skip */ }
  }

  // Progressions lifetime (natalInput 필요)
  if (natalInput) {
    try {
      const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day ?? 15).padStart(2, '0')}`
      const progressed = await calculateSecondaryProgressions({ natal: natalInput, targetDate })
      bundle.lifetime = analyzeLifetimeAstro(progressed, natal)
    } catch { /* skip */ }
  }

  // Arabic Lots (natal 기반)
  try {
    const sun = natal.planets.find((p) => p.name === 'Sun')
    const isDay = sun ? sun.house >= 7 && sun.house <= 12 : true
    const lots = calculateArabicLots(natal, isDay)
    bundle.raw.lots = lots
    bundle.lots = {
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

  // Yearly: Profection + Solar Return
  const yearlyList: AstroTimingAnalysis[] = []
  if (age != null) {
    try {
      const prof = calculateProfection(natal, age)
      bundle.raw.profection = prof
      yearlyList.push({
        unit: 'yearly',
        periodLabel: `Profection age ${prof.age}`,
        highlights: [{
          source: `Profection age ${prof.age} — house ${prof.activatedHouse}`,
          meaning: getProfectionInterpretation(prof),
          tone: 'neutral',
        }],
        summary: `${prof.activatedHouse}궁 활성, Lord ${prof.lordOfYear}`,
      })
    } catch { /* skip */ }
  }
  if (natalInput) {
    try {
      const sr = await calculateSolarReturn({ natal: natalInput, year })
      bundle.raw.solarReturn = sr
      yearlyList.push(analyzeYearlyAstro(sr))
    } catch { /* skip */ }
  }
  if (yearlyList.length > 0) bundle.yearly = yearlyList

  // Monthly: Lunar Return + Eclipses
  const monthlyList: AstroTimingAnalysis[] = []
  if (natalInput) {
    try {
      const lr = await calculateLunarReturn({ natal: natalInput, year, month })
      bundle.raw.lunarReturn = lr
      monthlyList.push(analyzeMonthlyAstro(lr))
    } catch { /* skip */ }
  }
  try {
    const daysInMonth = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`
    const eclipses = getEclipsesBetween(start, end)
    bundle.raw.eclipses = eclipses
    if (eclipses.length > 0) {
      monthlyList.push({
        unit: 'monthly',
        periodLabel: `Eclipses ${year}-${month}`,
        highlights: eclipses.map((e) => ({
          source: `${e.type} eclipse ${e.date}`,
          meaning: `${e.type} 일·월식 — ${e.sign} 영역 강한 변환점.`,
          tone: 'cautious' as const,
        })),
        summary: `${eclipses.length}개 일·월식`,
      })
    }
  } catch { /* skip */ }
  if (monthlyList.length > 0) bundle.monthly = monthlyList

  // Daily: transit + Electional — day 지정 시
  if (day != null && natalInput) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dailyList: AstroTimingAnalysis[] = []
    try {
      const transitChart = await calculateTransitChart({
        iso: `${date}T12:00:00`,
        latitude: natalInput.latitude,
        longitude: natalInput.longitude,
        timeZone: natalInput.timeZone,
      })
      bundle.raw.transitChart = transitChart
      const aspects = findMajorTransits(transitChart, natal, 1.0)
      bundle.raw.transitAspects = aspects
      bundle.raw.retrogradePlanets = getRetrogradePlanets(transitChart)
      dailyList.push(analyzeDailyAstro({
        isoDate: date,
        transitChart,
        transitToNatalAspects: aspects.map((a) => ({
          from: a.from, to: a.to, type: a.type, orb: a.orb, applying: a.applying, score: a.score,
        })),
      }))

      const retros = bundle.raw.retrogradePlanets ?? []
      const voc = checkVoidOfCourse(transitChart)
      const electHighlights: Array<{ source: string; meaning: string; tone: 'positive' | 'cautious' | 'mixed' | 'neutral' }> = []
      if (retros.length > 0) {
        electHighlights.push({
          source: `역행: ${retros.join(', ')}`,
          meaning: `${retros.join(', ')} 역행 중 — 해당 행성 영역 신중.`,
          tone: 'cautious',
        })
      }
      if (voc.isVoid) {
        electHighlights.push({
          source: 'Void of Course Moon',
          meaning: '보이드 — 새 시작 보류, 마무리 일에 적합.',
          tone: 'cautious',
        })
      }
      for (const planet of transitChart.planets) {
        if (!['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(planet.name)) continue
        const decan = getDecan(planet.longitude)
        const bound = getEgyptianBound(planet.longitude)
        electHighlights.push({
          source: `${planet.name} ${planet.sign} (decan ${decan.ruler}, bound ${bound.ruler})`,
          meaning: `${planet.name} 트랜짓 — decan ruler ${decan.ruler}, bound ruler ${bound.ruler}.`,
          tone: 'neutral',
        })
      }
      try {
        const starHits = findFixedStarConjunctions(transitChart, year, 1.0)
        for (const hit of starHits.slice(0, 3)) {
          const nature = (hit.star as { nature?: string }).nature ?? 'mixed'
          electHighlights.push({
            source: `Fixed Star ${hit.star.name} ↔ ${hit.planet} (orb ${hit.orb.toFixed(2)}°)`,
            meaning: `${hit.star.name} (${nature}) — ${hit.planet} 자극.`,
            tone: nature === 'benefic' ? 'positive' : nature === 'malefic' ? 'cautious' : 'mixed',
          })
        }
      } catch { /* skip */ }
      if (electHighlights.length > 0) {
        dailyList.push({
          unit: 'daily',
          periodLabel: `Electional ${date}`,
          highlights: electHighlights,
          summary: `Retrograde ${retros.length}, VoC=${voc.isVoid}`,
        })
      }
    } catch { /* skip */ }
    if (dailyList.length > 0) bundle.daily = dailyList
  }

  // Hourly: Planetary Hour — hour 지정 시
  if (hour != null && day != null) {
    try {
      const dt = new Date(year, month - 1, day, hour, 0, 0)
      const planet = calcPlanetaryHour(dt, hour)
      const isDay = hour >= 6 && hour < 18
      bundle.raw.planetaryHour = { planet, isDay }
      bundle.hourly = analyzeHourlyAstro({
        isoDateTime: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`,
        planet,
        isDay,
      })
    } catch { /* skip */ }
  }

  return bundle
}

/**
 * 그 달 매일의 daily layer 한 번에 batch (월 캘린더용).
 * Solar/Lunar Return/Profection/Lots 등은 월 단위라 별도로 한 번만 호출.
 */
export async function getAstroMonthDailyLayers(input: {
  natal: Chart
  natalInput: NatalInput
  year: number
  month: number
}): Promise<Map<string, AstroTimingAnalysis[]>> {
  const map = new Map<string, AstroTimingAnalysis[]>()
  const { natal, natalInput, year, month } = input
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const sub = await getAstroLayersForDate({
      natal, natalInput, year, month, day: d,
    })
    if (sub.daily && sub.daily.length > 0) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      map.set(date, sub.daily)
    }
  }
  return map
}
