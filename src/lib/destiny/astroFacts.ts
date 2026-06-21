// src/lib/destiny/astroFacts.ts
//
// 점성 "재료 준비실" — astroFacts 는 sajuFacts 의 점성 짝.
// counselorContext.ts 의 astro 인라인 블록이 raw 호출(calculateNatalChart /
// findNatalAspects / dignityOf / calculateProfection) + 포매팅을 한자리에
// 했던 것을 분리. 다른 서비스(통합 리포트 / 운흐름 / 캘린더) 도 같은
// facts 를 받아 자기 포매팅 자기가 한다.
//
// 본 모듈은 **포매팅 0**. locale 무관. text 0. JSON-able 객체만 반환.
// transit / solar return / progression 은 formatAstroSelf 가 별도로 책임지므로
// 본 facts 는 본명(natal) + profection 만 다룬다.

import {
  calculateNatalChart,
  toChart,
  type NatalChartData,
} from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { dignityOf, dignityTiers, dignityScore } from '@/lib/astrology/foundation/dignities'
import { calculateProfection } from '@/lib/astrology/foundation/profections'
import { calculateChiron, calculateLilith } from '@/lib/astrology/foundation/extraPoints'
import { natalToJD, matchHouseForCusps, UNKNOWN_HOUSE } from '@/lib/astrology/foundation/shared'
import { calculateZodiacalReleasing } from '@/lib/astrology/foundation/zodiacalReleasing'
import { calculateArabicLots, type ArabicLot } from '@/lib/astrology/foundation/arabicParts'
import { parseHourMinute } from '@/lib/saju/timeParse'
import {
  calculateAlmutenFiguris,
  type AlmutenFigurisResult,
} from '@/lib/astrology/foundation/almutenFiguris'
import { currentManAge } from '@/lib/datetime/currentAge'
import { logger } from '@/lib/logger'
import type { Chart, AspectHit, ZodiacKo } from '@/lib/astrology/foundation/types'
import type {
  NatalArabicLot,
  ZodiacalReleasingResult,
  DignityResult,
  NatalDignityEntry,
} from '@/lib/calendar-engine/context/types'

export interface AstroFactsInput {
  birthDate: string // 'YYYY-MM-DD'
  birthTime: string // 'HH:MM'
  latitude: number
  longitude: number
  timezone: string
  /** 출생 시간 미상 — ASC/MC/하우스 무효 처리. */
  birthTimeUnknown?: boolean
  /** 출생지 미상 — ASC/MC/하우스 무효 처리. */
  birthCityUnknown?: boolean
  /**
   * Hellenistic 본명 기법 (Chiron·Lilith / Arabic Lots / Zodiacal Releasing /
   * dignity 5-tier / Almuten Figuris / minor aspect) 도 같이 계산. 옛
   * buildNatalContext 가 만들던 풍부 데이터셋 — 통합 리포트 / 캘린더 /
   * 운흐름이 사용. 운명상담사·궁합은 안 씀 (default false 로 비용 0).
   */
  includeHellenistic?: boolean
}

export interface PlanetFact {
  name: string
  sign: string
  /**
   * 하우스 배치 — ASC 의존. placeUnreliable(출생시각/출생지 미상) 시 자정 폴백
   * ASC 로 계산된 "그럴듯하지만 틀린" 하우스가 새어나가지 않도록 null.
   */
  house: number | null
  longitude: number
  retrograde: boolean
  /** dignity tier — 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine' 등. */
  dignity: string
}

export interface AspectFact {
  from: string
  to: string
  type: string
  orb: number
}

export interface AstroFacts {
  natal: {
    planets: PlanetFact[]
    /**
     * 상승점 — ASC 의존이라 placeUnreliable(출생시각/출생지 미상) 시 null.
     * 엔진이 스스로 가려, _chart 가 아닌 facts.natal 을 읽는 호출처(상담사·
     * 캘린더 등)는 자정 폴백 ASC 에 절대 노출되지 않는다.
     */
    ascendant: { sign: string; longitude: number } | null
    /** 중천점 — ASC 와 동일하게 placeUnreliable 시 null. */
    mc: { sign: string; longitude: number } | null
    /**
     * 출생 시각·출생지 미상 여부 — ASC/MC/하우스 표시 자체를 막아야 하는지
     * 호출처가 결정. 안 막으면 엔진은 자정/서울 폴백으로 "그럴듯하지만 틀린"
     * 하우스/각을 만들어낸다. defense-in-depth 의 source 플래그.
     * placeUnreliable 시 facts 의 ascendant/mc/planet.house 는 이미 null —
     * 호출처가 플래그를 잊어도 엔진 출력 자체가 자기보호적.
     */
    placeUnreliable: boolean
  }
  aspects: {
    /** orb 0-2° (가장 강한). */
    strong: AspectFact[]
    /** orb 2-5° (보조). */
    mid: AspectFact[]
  }
  profection: {
    age: number
    activatedHouse: number
    activatedSign: string
    lordOfYear: string
    /** 군주 행성의 현재 위치 (placeUnreliable 시 null). */
    lordPlacement: { sign: string; house?: number } | null
  } | null
  /**
   * 옛 raw natal chart 객체 (Swiss Ephemeris 결과) — formatAstroSelf 처럼
   * chart 인스턴스 자체가 필요한 함수가 별도 calculateNatalChart 호출을
   * 피할 수 있게 노출. 평탄화된 facts 만으론 chart 형식의 메서드/관계 같은
   * 게 빠지므로 같은 입력으로 재계산하는 비용/코드중복을 피하려고 escape
   * hatch 로 둠. 신규 호출자는 정제된 natal 필드부터 시도, 안 되면 _chart.
   */
  _chart: Chart
  /**
   * 옛 raw natal data (toChart 전 NatalChartData) — formatAstroSelf 의
   * 옛 인터페이스가 그대로 받음. _chart 와 같은 escape hatch.
   */
  _natalRaw: NatalChartData
  /**
   * Hellenistic 본명 기법 (input.includeHellenistic === true 일 때만 채움).
   * buildNatalContext.astro 의 hellenistic 부분과 1:1 호환 shape — 옛
   * 가공소가 직접 계산하던 코드를 facts 로 흡수. 운명상담사·궁합은 안 씀.
   */
  hellenistic?: AstroHellenisticFacts
}

export interface AstroHellenisticFacts {
  /** Sun 의 하우스 기반 day/night 분기 (sect-aware 계산 입력). */
  sect: 'day' | 'night'
  /** Chiron + Lilith — 차트 planets 에 없는 천체 (트랜짓 입력용). */
  extraPoints?: ReturnType<typeof calculateChiron>[]
  /** 본명 aspects (major + minor, orb 3°). */
  natalAspects: AspectHit[]
  /** 7 Arabic Lots (sect-aware) + house 매핑. */
  lots: NatalArabicLot[]
  /** Zodiacal Releasing L1 — Spirit / Fortune 시작점. */
  zodiacalReleasing: ZodiacalReleasingResult
  /** 본명 5-tier dignities (per planet). */
  dignities: DignityResult
  /** Almuten Figuris (Sun/Moon/ASC[/Fortune]). */
  almutenFiguris: AlmutenFigurisResult | null
}

const MAJOR_TYPES = new Set(['conjunction', 'sextile', 'square', 'trine', 'opposition'])
const ANG_DEGREES: Array<{ deg: number; t: string }> = [
  { deg: 0, t: 'conjunction' },
  { deg: 60, t: 'sextile' },
  { deg: 90, t: 'square' },
  { deg: 120, t: 'trine' },
  { deg: 180, t: 'opposition' },
]

/**
 * birth 정보로 점성 본명 + profection 한 번에 채워 반환.
 * 운명 LLM context, 통합 리포트 등 어디서나 이 facts 받아 자기 포매팅만 하면 됨.
 *
 * @param now - profection 기준 시각 (보통 "오늘"). 없으면 호출 시점.
 */
export async function collectAstroFacts(
  input: AstroFactsInput,
  now: Date = new Date()
): Promise<AstroFacts | null> {
  const [Y, M, D] = input.birthDate.split('-').map(Number)
  // AM/PM('11:30 PM') 정확히 24h 정규화 — 직접 split(':') 하면 PM 이 12h 빠지고
  // 분이 NaN 이 돼 자연차트(ASC/MC/하우스)가 어긋났다. 사주와 동일 파서 사용.
  const { h, m: mi } = parseHourMinute(input.birthTime || '00:00')

  let natal: Awaited<ReturnType<typeof calculateNatalChart>>
  try {
    natal = await calculateNatalChart({
      year: Y,
      month: M,
      date: D,
      hour: h,
      minute: mi,
      latitude: input.latitude,
      longitude: input.longitude,
      timeZone: input.timezone,
    })
  } catch {
    return null
  }
  const chart = toChart(natal)
  const placeUnreliable = !!input.birthTimeUnknown || !!input.birthCityUnknown

  // 행성 — sign / house / dignity 평탄화.
  // house 는 ASC 의존 → placeUnreliable 면 null (자정 폴백 하우스 누출 차단).
  const planets: PlanetFact[] = natal.planets.map((p) => ({
    name: p.name,
    sign: p.sign,
    house: placeUnreliable ? null : p.house,
    longitude: p.longitude,
    retrograde: !!p.retrograde,
    dignity: dignityOf(p.name, p.sign) ?? 'peregrine',
  }))

  // 어스펙트 수집 — 행성-행성 (엔진) + 행성↔ASC/MC (placeUnreliable 면 skip).
  // orb < 5 만 살리고 strong (0-2) / mid (2-5) 로 분할.
  const allAspects: AspectFact[] = []
  for (const a of findNatalAspects(chart)) {
    if (MAJOR_TYPES.has(a.type) && a.orb < 5) {
      allAspects.push({ from: a.from.name, to: a.to.name, type: a.type, orb: a.orb })
    }
  }
  if (!placeUnreliable) {
    for (const ang of [natal.ascendant, natal.mc]) {
      for (const p of natal.planets) {
        let dd = Math.abs(ang.longitude - p.longitude)
        if (dd > 180) dd = 360 - dd
        for (const a of ANG_DEGREES) {
          const orb = Math.abs(dd - a.deg)
          if (orb < 5) {
            allAspects.push({ from: p.name, to: ang.name, type: a.t, orb })
            break
          }
        }
      }
    }
  }
  const strong = allAspects.filter((a) => a.orb <= 2).sort((x, y) => x.orb - y.orb)
  const mid = allAspects.filter((a) => a.orb > 2 && a.orb < 5).sort((x, y) => x.orb - y.orb)

  // Profection — 만 나이 기반 활성 하우스 + 군주 행성.
  // activatedHouse 는 나이만으로 결정 → 항상 신뢰 가능.
  // 군주 행성 placement 는 ASC 의존 → placeUnreliable 면 null.
  let profection: AstroFacts['profection'] = null
  try {
    // 주입된 now 를 그대로 넘긴다 — 예전엔 void now 로 버려 currentManAge 가
    // 자기 new Date() 를 읽어 profection 나이가 비결정적이고, [Age today] 앵커와
    // 생일 경계에서 1년 어긋날 수 있었다.
    const manAge = currentManAge({
      birthYear: Y,
      birthMonth: M,
      birthDate: D,
      birthTimeZone: input.timezone,
      now,
    })
    const prof = calculateProfection(chart, manAge)
    const lordPlanet = placeUnreliable
      ? null
      : (chart.planets.find((p) => p.name === prof.lordOfYear) as
          | { sign?: string; house?: number }
          | undefined)
    profection = {
      age: prof.age,
      activatedHouse: prof.activatedHouse,
      activatedSign: prof.activatedSign,
      lordOfYear: prof.lordOfYear,
      lordPlacement: lordPlanet?.sign ? { sign: lordPlanet.sign, house: lordPlanet.house } : null,
    }
  } catch {
    profection = null
  }

  // ─── Hellenistic (option 켜야 계산, default 비용 0) ──────────────────────
  const hellenistic = input.includeHellenistic
    ? buildHellenistic(chart, natal, {
        Y,
        M,
        D,
        h,
        mi,
        lat: input.latitude,
        lon: input.longitude,
        tz: input.timezone,
      })
    : undefined

  return {
    natal: {
      planets,
      // ASC/MC 도 ASC 의존 → placeUnreliable 면 null. 엔진이 자정 폴백 각을
      // 스스로 가려 facts.natal 을 읽는 비-LLM 소비자(리포트 등)도 안전.
      ascendant: placeUnreliable
        ? null
        : { sign: natal.ascendant.sign, longitude: natal.ascendant.longitude },
      mc: placeUnreliable ? null : { sign: natal.mc.sign, longitude: natal.mc.longitude },
      placeUnreliable,
    },
    aspects: { strong, mid },
    profection,
    _chart: chart,
    _natalRaw: natal,
    ...(hellenistic ? { hellenistic } : {}),
  }
}

interface HellenisticInput {
  Y: number
  M: number
  D: number
  h: number
  mi: number
  lat: number
  lon: number
  tz: string
}

function buildHellenistic(
  chart: Chart,
  natal: NatalChartData,
  meta: HellenisticInput
): AstroHellenisticFacts {
  // 섹트 결정 — Sun 이 7~12궁 (지평선 위) 이면 day, 아니면 night.
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const sect: 'day' | 'night' = sun && sun.house >= 7 ? 'day' : 'night'

  // Chiron + Lilith — 차트 planets 에 없는 천체. 실패해도 무시.
  let extraPoints: ReturnType<typeof calculateChiron>[] | undefined
  try {
    const utJd = natalToJD({
      year: meta.Y,
      month: meta.M,
      date: meta.D,
      hour: meta.h,
      minute: meta.mi,
      latitude: meta.lat,
      longitude: meta.lon,
      timeZone: meta.tz,
    })
    const houseCusps = chart.houses.map((h) => h.cusp)
    extraPoints = [calculateChiron(utJd, houseCusps), calculateLilith(utJd, houseCusps)]
  } catch {
    extraPoints = undefined
  }

  // 본명 aspects (major + minor, orb 3°). chart 깨져있어도 안전하게 빈 배열.
  let natalAspects: AspectHit[]
  try {
    natalAspects = findNatalAspects(chart, { includeMinor: true })
  } catch (err) {
    logger.warn('[astroFacts] findNatalAspects failed, defaulting to []', {
      err: err instanceof Error ? err.message : String(err),
    })
    natalAspects = []
  }

  // 7 Arabic Lots (sect-aware) — Fortune / Spirit / Eros / Necessity /
  // Courage / Victory / Nemesis. 한 lot 이라도 결손 → throw → 빈 배열.
  let lots: ArabicLot[] = []
  try {
    lots = calculateArabicLots(chart, sect === 'day')
  } catch (err) {
    logger.warn('[astroFacts] Arabic lots calc failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    lots = []
  }

  // lot → house 매핑 (UI 표시용)
  const houseCuspsForLots = chart.houses.map((h) => h.cusp)
  const lotsWithHouse: NatalArabicLot[] = lots.map((l) => ({
    ...l,
    house: matchHouseForCusps(l.longitude, houseCuspsForLots) ?? UNKNOWN_HOUSE,
  }))

  // Zodiacal Releasing L1 — Spirit / Fortune 시작점.
  const zodiacalReleasing: ZodiacalReleasingResult = { spirit: null, fortune: null }
  const spiritLot = lots.find((l) => l.name === 'Spirit')
  const fortuneLot = lots.find((l) => l.name === 'Fortune')
  if (spiritLot) {
    try {
      zodiacalReleasing.spirit = {
        startSign: spiritLot.sign,
        periods: calculateZodiacalReleasing(spiritLot.sign as ZodiacKo, 90),
      }
    } catch (err) {
      logger.warn('[astroFacts] ZR Spirit calc failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
  if (fortuneLot) {
    try {
      zodiacalReleasing.fortune = {
        startSign: fortuneLot.sign,
        periods: calculateZodiacalReleasing(fortuneLot.sign as ZodiacKo, 90),
      }
    } catch (err) {
      logger.warn('[astroFacts] ZR Fortune calc failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // 본명 5-tier dignities (per planet)
  const dignities: DignityResult = []
  for (const p of chart.planets) {
    if (!p.sign) continue
    try {
      const tiers = dignityTiers(p.name, p.sign, p.degree, sect)
      const score = dignityScore(tiers)
      const entry: NatalDignityEntry = {
        planet: p.name,
        sign: p.sign,
        degree: p.degree,
        tiers,
        score,
      }
      dignities.push(entry)
    } catch (err) {
      logger.warn('[astroFacts] dignityTiers failed for planet', {
        planet: p.name,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Almuten Figuris — 4-point (Sun/Moon/ASC/Fortune). fortune 없으면 3-point.
  let almutenFiguris: AlmutenFigurisResult | null = null
  try {
    almutenFiguris = calculateAlmutenFiguris({
      chart,
      sect,
      fortune: fortuneLot ? { longitude: fortuneLot.longitude } : undefined,
    })
  } catch (err) {
    logger.warn('[astroFacts] Almuten Figuris calc failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    almutenFiguris = null
  }

  return {
    sect,
    extraPoints,
    natalAspects,
    lots: lotsWithHouse,
    zodiacalReleasing,
    dignities,
    almutenFiguris,
  }
}
