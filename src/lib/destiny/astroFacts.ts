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

import { calculateNatalChart, toChart, type NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { dignityOf } from '@/lib/astrology/foundation/dignities'
import { calculateProfection } from '@/lib/astrology/foundation/profections'
import { currentManAge } from '@/lib/datetime/currentAge'
import type { Chart } from '@/lib/astrology/foundation/types'

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
}

export interface PlanetFact {
  name: string
  sign: string
  house: number
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
    ascendant: { sign: string; longitude: number }
    mc: { sign: string; longitude: number }
    /**
     * 출생 시각·출생지 미상 여부 — ASC/MC/하우스 표시 자체를 막아야 하는지
     * 호출처가 결정. 안 막으면 엔진은 자정/서울 폴백으로 "그럴듯하지만 틀린"
     * 하우스/각을 만들어낸다. defense-in-depth 의 source 플래그.
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
  now: Date = new Date(),
): Promise<AstroFacts | null> {
  const [Y, M, D] = input.birthDate.split('-').map(Number)
  const [h, mi] = (input.birthTime || '00:00').split(':').map(Number)

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

  // 행성 — sign / house / dignity 평탄화
  const planets: PlanetFact[] = natal.planets.map((p) => ({
    name: p.name,
    sign: p.sign,
    house: p.house,
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
    const manAge = currentManAge({
      birthYear: Y,
      birthMonth: M,
      birthDate: D,
      birthTimeZone: input.timezone,
    })
    void now // currentManAge 가 자기 now 사용. 시그너처 안정성용.
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
      lordPlacement: lordPlanet?.sign
        ? { sign: lordPlanet.sign, house: lordPlanet.house }
        : null,
    }
  } catch {
    profection = null
  }

  return {
    natal: {
      planets,
      ascendant: { sign: natal.ascendant.sign, longitude: natal.ascendant.longitude },
      mc: { sign: natal.mc.sign, longitude: natal.mc.longitude },
      placeUnreliable,
    },
    aspects: { strong, mid },
    profection,
    _chart: chart,
    _natalRaw: natal,
  }
}
