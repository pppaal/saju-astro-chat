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

import { toChart, type NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import { cachedCalculateNatalChart } from '@/lib/astrology/cached'
import { cacheOrCalculate, CACHE_TTL } from '@/lib/cache/redis-cache'
import { HELLENISTIC_CACHE_VERSION } from '@/lib/cache/engineVersions'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import {
  dignityOf,
  dignityTiers,
  dignityScore,
  triplicityOf,
} from '@/lib/astrology/foundation/dignities'
import { calculateProfection } from '@/lib/astrology/foundation/profections'
import {
  calculateChiron,
  calculateLilith,
  isDiurnalChart,
  sunTrueAltitude,
} from '@/lib/astrology/foundation/extraPoints'
import { natalToJD, matchHouseForCusps, UNKNOWN_HOUSE } from '@/lib/astrology/foundation/shared'
import { calculateZodiacalReleasing } from '@/lib/astrology/foundation/zodiacalReleasing'
import { calculateArabicLots, type ArabicLot } from '@/lib/astrology/foundation/arabicParts'
import { parseHourMinute } from '@/lib/saju/timeParse'
import { astroAnchorTime } from '@/lib/saju/birthTimeAnchor'
import { isPlaceDependentPoint, isPlaceUnreliable } from '@/lib/astrology/foundation/placeMask'
import {
  calculateAlmutenFiguris,
  type AlmutenFigurisResult,
} from '@/lib/astrology/foundation/almutenFiguris'
import { currentManAge } from '@/lib/datetime/currentAge'
import { resolveBirthTimezone } from '@/lib/datetime/resolveTimezone'
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
   * 하우스 배치 — ASC 의존. placeUnreliable(출생시각/출생지 미상) 시 미상 앵커
   * (정오) 폴백 ASC 로 계산된 "그럴듯하지만 틀린" 하우스가 새어나가지 않도록 null.
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
     * 캘린더 등)는 미상 앵커 폴백 ASC 에 절대 노출되지 않는다.
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
    /**
     * 활성 하우스·사인·연주(Lord of the Year) — whole-sign 이라 ASC 사인에서 센다.
     * placeUnreliable(출생시각/출생지 미상)이면 ASC 가 정오 앵커·기본 좌표 폴백이라
     * 셋 다 null(OD-5 — 정오 앵커로 아무것도 지어내지 않는다). 소비자(상담사·캘린더·
     * 리포트)는 null 이면 프로펙션 줄을 생략한다.
     */
    activatedHouse: number | null
    activatedSign: string | null
    lordOfYear: string | null
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
  /**
   * 섹트 — 태양 고도(isDiurnalChart) 기반 day/night (sect-aware 계산 입력).
   * null = 섹트를 정할 수 없음(OD-5): 출생시각 미상이면 정오 앵커의 산물이라 언제나 null,
   * 출생지만 미상이면 존 기준점의 태양 고도가 |고도| < SECT_HORIZON_MARGIN_DEG 일 때 null.
   * null 이면 삼분성은 섹트와 무관한 참여 지배성만 센다(dignities), lot·ZR·Almuten 은 비운다.
   */
  sect: 'day' | 'night' | null
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
  // 시간 미상(birthTimeUnknown 또는 빈 값)이면 넘어온 시각 문자열이 아니라 정오 앵커 —
  // 사주(collectSajuFacts)와 같은 규칙이라 '03:00' 같은 남은 시각이 행성 위치·차트 날짜를
  // 움직이지 않는다(CONVENTIONS §5). 자정 폴백은 tz 변환에서 행성 위치가 전날로 밀릴 수 있다.
  const birthTime = astroAnchorTime(input.birthTime, input.birthTimeUnknown)
  const { h, m: mi } = parseHourMinute(birthTime)

  // 잘못된 IANA 타임존이면 natalToJD 의 tz 변환이 throw → 여기서 null 반환 →
  // buildNatalContext 가 하드 throw → 리포트·캘린더·운명이 모두 죽는다.
  // 유효하지 않으면 출생 타임존 resolver(명시 tz → 출생 좌표의 tz → 사주 기준 존)로
  // 떨궈 차트는 계산되게 한다.
  const safeTz = resolveBirthTimezone({
    timezone: input.timezone,
    latitude: input.latitude,
    longitude: input.longitude,
  })
  // 본명 차트는 출생정보가 같으면 불변 — Redis 30일 캐시(cachedCalculateNatalChart)
  // 를 거쳐 리포트·캘린더·운명이 매 로드마다 Swiss Ephemeris 풀계산(~500ms)을
  // 반복하지 않게 한다. 캐시 없거나 미스면 cacheOrCalculate 가 그대로 계산(graceful).
  let natal: NatalChartData
  try {
    natal = await cachedCalculateNatalChart({
      year: Y,
      month: M,
      date: D,
      hour: h,
      minute: mi,
      latitude: input.latitude,
      longitude: input.longitude,
      timeZone: safeTz,
    })
  } catch {
    return null
  }
  const chart = toChart(natal)
  const placeUnreliable = isPlaceUnreliable({
    timeUnknown: input.birthTimeUnknown,
    cityUnknown: input.birthCityUnknown,
  })

  // 행성 — sign / house / dignity 평탄화.
  // house 는 ASC 의존 → placeUnreliable 면 null (미상 앵커 폴백 하우스 누출 차단).
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

  // Profection — 만 나이 기반 활성 하우스 + 군주 행성. whole-sign 이라 활성 사인·연주는
  // ASC 사인에서 세고, 활성 하우스의 뜻도 그 사인 위에 선다 → placeUnreliable 면 셋 다 null
  // (나이만 남김, OD-5). 군주 행성 placement 도 ASC 의존 → placeUnreliable 면 null.
  let profection: AstroFacts['profection'] = null
  try {
    // 주입된 now 를 그대로 넘긴다 — 예전엔 void now 로 버려 currentManAge 가
    // 자기 new Date() 를 읽어 profection 나이가 비결정적이고, [Age today] 앵커와
    // 생일 경계에서 1년 어긋날 수 있었다.
    const manAge = currentManAge({
      birthYear: Y,
      birthMonth: M,
      birthDate: D,
      birthTimeZone: safeTz,
      now,
    })
    const prof = calculateProfection(chart, manAge)
    // whole-sign 프로펙션은 ASC 사인에서 센다 — placeUnreliable 이면 ASC 가 폴백 각이라
    // 활성 하우스·사인·연주 모두 날조다(OD-5). 나이만 남긴다.
    const lordPlanet = placeUnreliable
      ? null
      : (chart.planets.find((p) => p.name === prof.lordOfYear) as
          | { sign?: string; house?: number }
          | undefined)
    profection = {
      age: prof.age,
      activatedHouse: placeUnreliable ? null : prof.activatedHouse,
      activatedSign: placeUnreliable ? null : prof.activatedSign,
      lordOfYear: placeUnreliable ? null : prof.lordOfYear,
      lordPlacement: lordPlanet?.sign ? { sign: lordPlanet.sign, house: lordPlanet.house } : null,
    }
  } catch {
    profection = null
  }

  // ─── Hellenistic (option 켜야 계산, default 비용 0) ──────────────────────
  // 본명 불변이라 결과도 출생정보의 결정함수 — 통합 리포트가 force-dynamic 로
  // 매 요청 ZR×2·Almuten·7 Arabic Lots·행성별 5단계 존엄을 재계산하던 것을
  // Redis 30일 캐시로 막는다(미스/Redis 없으면 graceful 재계산). 결과는 순수
  // 데이터라 JSON 직렬화 안전.
  // placeUnreliable 이면 캐시에서 꺼낸 뒤 ASC·하우스 의존 항목을 가린다(단일 출처 —
  // 리포트·캘린더 컨텍스트가 각자 가리지 않아도 된다). 캐시 값 자체는 출생정보만의
  // 함수라 키·버전은 그대로.
  const hellenisticRaw = input.includeHellenistic
    ? await cacheOrCalculate(
        `hellenistic:v${HELLENISTIC_CACHE_VERSION}:${input.birthDate}:${birthTime}:${input.latitude.toFixed(2)}:${input.longitude.toFixed(2)}:${safeTz}`,
        async () =>
          buildHellenistic(chart, natal, {
            Y,
            M,
            D,
            h,
            mi,
            lat: input.latitude,
            lon: input.longitude,
            tz: safeTz,
          }),
        CACHE_TTL.NATAL_CHART
      )
    : undefined
  // 섹트도 같은 방식(캐시 뒤 마스킹)으로 — 시간 미상이면 정오 앵커의 산물, 출생지만
  // 미상이면 존 기준점의 태양이 지평선 근처일 때 좌표 오차로 뒤집힐 수 있다(OD-5).
  let hellenistic = hellenisticRaw
  if (hellenistic && placeUnreliable) hellenistic = maskPlaceDependentHellenistic(hellenistic)
  if (hellenistic && sectUnreliable(input, natal.meta?.jdUT)) {
    hellenistic = maskSectDependentHellenistic(hellenistic)
  }

  return {
    natal: {
      planets,
      // ASC/MC 도 ASC 의존 → placeUnreliable 면 null. 엔진이 미상 앵커 폴백 각을
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

/**
 * 출생시각/출생지 미상(placeUnreliable) — ASC·하우스가 정오 앵커·기본 좌표 폴백이라
 * 그에 기대는 Hellenistic 항목을 가린다(엔진 감사 F1, CONVENTIONS §5):
 *  - lots(7 Arabic Parts — ASC 기준식)·ZR(Spirit/Fortune lot 시작)·Almuten(ASC hyleg) → 비움
 *  - natalAspects 는 행성-행성만 남기고(앵글·앵글 파생점 대상은 제거 — placeMask 단일 판정)
 *    끝점의 house 를 지운다
 *  - Chiron·Lilith 의 house 는 UNKNOWN_HOUSE(0)
 * 섹트·존엄(삼분성)은 ASC·하우스 항목이 아니라 여기서 두고, 섹트를 믿을 수 없을 때
 * maskSectDependentHellenistic 이 따로 가린다.
 */
export function maskPlaceDependentHellenistic(h: AstroHellenisticFacts): AstroHellenisticFacts {
  const dropHouse = <T extends { house?: number }>(end: T): Omit<T, 'house'> => {
    const { house: _house, ...rest } = end
    void _house
    return rest
  }
  return {
    ...h,
    extraPoints: h.extraPoints?.map((p) => ({ ...p, house: UNKNOWN_HOUSE })),
    natalAspects: h.natalAspects
      .filter((a) => !isPlaceDependentPoint(a.from.name) && !isPlaceDependentPoint(a.to.name))
      .map((a) => ({ ...a, from: dropHouse(a.from), to: dropHouse(a.to) })),
    lots: [],
    zodiacalReleasing: { spirit: null, fortune: null },
    almutenFiguris: null,
  }
}

/**
 * 출생지만 미상일 때 섹트를 믿는 태양 고도 여유(°). 존 기준점과 실제 출생지는 경도·위도가
 * 수 도 어긋날 수 있어, 지평선에서 이보다 가까운 태양은 낮/밤이 뒤집힐 수 있다.
 */
export const SECT_HORIZON_MARGIN_DEG = 3

/**
 * 섹트를 정할 수 없는가(OD-5 — 정오 앵커·기본 좌표로 아무것도 지어내지 않는다).
 *  - 출생시각 미상 → 언제나 true (정오 앵커의 태양은 거의 늘 낮).
 *  - 출생지만 미상(시각은 앎) → 넘겨받은 좌표(존 기준점)의 태양 참고도가
 *    |고도| < SECT_HORIZON_MARGIN_DEG 이거나 고도를 구할 수 없으면 true.
 *  - 둘 다 앎 → false.
 */
export function sectUnreliable(
  input: Pick<AstroFactsInput, 'birthTimeUnknown' | 'birthCityUnknown' | 'latitude' | 'longitude'>,
  jdUT: number | undefined
): boolean {
  if (input.birthTimeUnknown) return true
  if (!input.birthCityUnknown) return false
  const alt =
    typeof jdUT === 'number' ? sunTrueAltitude(jdUT, input.latitude, input.longitude) : null
  return alt === null || Math.abs(alt) < SECT_HORIZON_MARGIN_DEG
}

/**
 * 섹트를 정할 수 없을 때(sectUnreliable) 섹트에 기대는 Hellenistic 항목을 가린다:
 *  - sect → null
 *  - dignities 의 삼분성은 섹트와 무관한 참여(participating) 지배성만 다시 센다(점수 재계산)
 *  - lots(낮/밤 공식)·ZR(Spirit/Fortune lot 시작)·Almuten(섹트 가중) → 비움
 */
export function maskSectDependentHellenistic(h: AstroHellenisticFacts): AstroHellenisticFacts {
  return {
    ...h,
    sect: null,
    dignities: h.dignities.map((d) => {
      const tiers = { ...d.tiers, triplicity: triplicityOf(d.planet, d.sign, null) !== null }
      return { ...d, tiers, score: dignityScore(tiers) }
    }),
    lots: [],
    zodiacalReleasing: { spirit: null, fortune: null },
    almutenFiguris: null,
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
  // 출생 순간(UT JD) — 섹트(태양 고도)와 Chiron·Lilith 가 쓴다.
  let utJd: number | undefined = natal.meta?.jdUT
  if (utJd === undefined) {
    try {
      utJd = natalToJD({
        year: meta.Y,
        month: meta.M,
        date: meta.D,
        hour: meta.h,
        minute: meta.mi,
        latitude: meta.lat,
        longitude: meta.lon,
        timeZone: meta.tz,
      })
    } catch {
      utJd = undefined
    }
  }

  // 섹트 — 태양이 지평선 위(참고도 > 0°)면 day (isDiurnalChart SSOT). 극권 Whole Sign
  // 폴백에서 하우스 번호로 정하던 섹트가 ~25% 뒤집혔다(엔진 감사 ASTRO-10).
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const sect: 'day' | 'night' = isDiurnalChart({
    jdUT: utJd,
    latitude: meta.lat,
    longitude: meta.lon,
    sunHouse: sun?.house,
    sunLongitude: sun?.longitude,
    ascLongitude: chart.ascendant?.longitude,
  })
    ? 'day'
    : 'night'

  // Chiron + Lilith — 차트 planets 에 없는 천체(seas_18.se1 소행성 파일). 실패하면 빠지되
  // 조용히 삼키지 않는다 — 배포에서 public/ephe 가 빠지면 리포트·트랜짓에서 Chiron 이
  // 소리 없이 사라졌다(엔진 감사 ASTRO-12).
  let extraPoints: ReturnType<typeof calculateChiron>[] | undefined
  try {
    if (utJd === undefined) throw new Error('natal instant unavailable')
    const houseCusps = chart.houses.map((h) => h.cusp)
    extraPoints = [calculateChiron(utJd, houseCusps), calculateLilith(utJd, houseCusps)]
  } catch (err) {
    logger.warn('[astroFacts] Chiron/Lilith calc failed — extra points omitted', {
      err: err instanceof Error ? err.message : String(err),
    })
    extraPoints = undefined
  }

  // 본명 aspects (Hellenistic major only, orb 3°). chart 깨져있어도 안전하게 빈 배열.
  let natalAspects: AspectHit[]
  try {
    natalAspects = findNatalAspects(chart)
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
