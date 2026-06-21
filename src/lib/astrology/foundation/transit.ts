// src/lib/astrology/foundation/transit.ts
import { Chart, TransitInput, HouseSystem } from './types'
import { formatLongitude } from './utils'
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from './houses'
import { getSwisseph } from './ephe'
import {
  getPlanetList,
  isoToJD,
  throwIfSwissEphError,
  extractLongitudeSpeed,
  extractSwissLongitude,
} from './shared'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

export async function calculateTransitChart(
  input: TransitInput,
  system: HouseSystem = CALCULATION_STANDARDS.astrology.houseSystem
): Promise<Chart> {
  const swisseph = getSwisseph()
  const PLANET_LIST = getPlanetList()
  const SW_FLAGS = swisseph.SEFLG_SPEED

  const ut_jd = isoToJD(input.iso, input.timeZone)

  const housesRes = calcHouses(ut_jd, input.latitude, input.longitude, system)
  const ascendantInfo = formatLongitude(housesRes.ascendant)
  const mcInfo = formatLongitude(housesRes.mc)

  const planets = Object.entries(PLANET_LIST).map(([name, id]) => {
    const res = swisseph.swe_calc_ut(ut_jd, id, SW_FLAGS)
    if ('error' in res) {
      throw new Error(`swe_calc_ut(${name}): ${res.error}`)
    }
    const longitude = extractSwissLongitude(res)
    const info = formatLongitude(longitude)
    const house = inferHouseOf(longitude, housesRes.house)
    const speed = extractLongitudeSpeed(res)
    const retrograde = typeof speed === 'number' ? speed < 0 : undefined
    return { name, longitude, ...info, house, speed, retrograde }
  })

  return {
    planets,
    ascendant: { name: 'Ascendant', longitude: housesRes.ascendant, ...ascendantInfo, house: 1 },
    mc: { name: 'MC', longitude: housesRes.mc, ...mcInfo, house: 10 },
    houses: mapHouseCupsFormatted(housesRes.house),
    meta: {
      jdUT: ut_jd,
      isoUTC: input.iso,
      timeZone: input.timeZone,
      latitude: input.latitude,
      longitude: input.longitude,
      // 극권 폴백 시 실제 사용된 system(WholeSign)을 기록. calcHouses 가 미보고/
      // 모킹된 경우엔 요청값(system)으로 폴백 — 기존 동작 보존.
      houseSystem: housesRes.houseSystem ?? system,
    },
  }
}

// ======================================================
// Transit Aspects 계산
// ======================================================

import { ASPECT_ANGLES, AspectHit, AspectType, PlanetBase } from './types'
import { angleDiff } from './utils'
import { evaluateAspect, AspectEngineConfig } from './aspectCore'

export interface TransitAspect extends AspectHit {
  transitPlanet: string
  natalPoint: string
  isApplying: boolean // 접근 중인지 분리 중인지
}

// 어스펙트 각도는 공용 SSOT(ASPECT_ANGLES, foundation/types) 사용.
const TRANSIT_ASPECT_ANGLES = ASPECT_ANGLES

// 트랜짓은 더 타이트한 오브 사용. 마이너 어스펙트(5종)는 1.5° 안쪽으로 묶어
// 메이저와의 오브 오버랩으로 인한 신호 중복을 줄인다 (calendar-engine 추출기는
// 추가로 orbMultiplier 로 더 좁힐 수 있음).
const TRANSIT_ORBS: Record<AspectType, number> = {
  conjunction: 6,
  opposition: 6,
  trine: 5,
  square: 5,
  sextile: 4,
  quincunx: 1.5,
  semisextile: 1.5,
  quintile: 1.5,
  biquintile: 1.5,
  sesquiquadrate: 1.5,
}

// 행성별 오브 가중치 (외행성은 느리므로 더 큰 오브 허용)
const PLANET_ORB_MULTIPLIER: Record<string, number> = {
  Sun: 1.0,
  Moon: 1.2,
  Mercury: 0.9,
  Venus: 0.9,
  Mars: 1.0,
  Jupiter: 1.1,
  Saturn: 1.2,
  Uranus: 1.3,
  Neptune: 1.3,
  Pluto: 1.4,
  'True Node': 1.0,
}

/**
 * 트랜짓 차트와 네이탈 차트 간의 애스펙트 찾기
 * @param transitChart 트랜짓 (현재) 차트
 * @param natalChart 네이탈 (출생) 차트
 * @param aspectTypes 찾을 애스펙트 타입들 (기본: 주요 5가지)
 * @param orbMultiplier 오브 배율 (1.0 = 기본, 0.5 = 타이트)
 */
export function findTransitAspects(
  transitChart: Chart,
  natalChart: Chart,
  aspectTypes: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
  orbMultiplier: number = 1.0
): TransitAspect[] {
  const aspects: TransitAspect[] = []

  const transitPlanets = transitChart.planets
  const natalPoints = [...natalChart.planets, natalChart.ascendant, natalChart.mc]

  // 트랜짓 엔진 config — 코어 evaluateAspect 에 주입할 *트랜짓 고유* 산술.
  // 기존 인라인 구현과 1:1 로 동일하게 동작하도록 작성했다 (calendar-engine 이
  // 소비하므로 orb/score/applying 출력이 바이트 단위로 보존돼야 함).
  //
  // 핵심 보존 포인트:
  //  - orb 계산: `|sep - target|`. (옛 orbAlt 제거 — no-op, 아래 reasoning.)
  //  - limit: TRANSIT_ORBS[aspect] * PLANET_ORB_MULTIPLIER[transit 이름] * orbMultiplier.
  //           transit(=from, 즉 aName) 행성 배율만 쓰고 natal 쪽은 안 본다.
  //  - applying: determineApplying — transit speed(=relSpeed 슬롯) 만 사용.
  //  - score: `1 - orb/limit`.
  const config: AspectEngineConfig = {
    desiredAngle: (a) => TRANSIT_ASPECT_ANGLES[a],
    // orbAlt 제거 근거: angleDiff() 는 이미 0..180 최단각을 돌려준다. 따라서
    //   orb    = |sep - target|
    //   orbAlt = |360 - sep - target|  (= 360 - sep - target, sep+target ≤ 360 이므로)
    // 이고 Math.min(orb, orbAlt) 가 orb 와 달라지는 경우는 오직 target=180 일 때
    // 인데, 그때 orb = 180 - sep, orbAlt = 360 - sep - 180 = 180 - sep 로 *수학적
    // 으로 동일* 하다. accepted window (opposition 은 sep≈[171.6,180]) 안에서는
    // 두 값이 부동소수점까지 비트 동일(orb===orbAlt)이라 min 이 orb 를 그대로
    // 돌려준다. ~2.8e-14 의 fp 차이는 sep 가 작을 때(orb≈180)만 나타나는데 그건
    // 어떤 orb 한도(<=8.4°)보다도 커서 항상 reject 되므로 기록값에 영향 없음.
    computeOrb: (sep, target) => Math.abs(sep - target),
    computeLimit: (aName, _bName, aspect) => {
      const baseOrb = TRANSIT_ORBS[aspect]
      const planetMultiplier = PLANET_ORB_MULTIPLIER[aName] ?? 1.0
      return baseOrb * planetMultiplier * orbMultiplier
    },
    // relSpeed 슬롯에 transitSpeed 를 흘려준다 (트랜짓은 transit 행성 속도만 사용).
    isApplying: (lonA, lonB, transitSpeed, targetAngle) =>
      determineApplying(lonA, lonB, transitSpeed, targetAngle),
    computeScore: ({ orb, limit }) => 1 - orb / limit,
  }

  for (const transit of transitPlanets) {
    for (const natal of natalPoints) {
      const diff = angleDiff(transit.longitude, natal.longitude)
      const transitSpeed = transit.speed ?? 0

      for (const aspectType of aspectTypes) {
        const evalResult = evaluateAspect(
          transit.name,
          transit.longitude,
          natal.name,
          natal.longitude,
          diff,
          // 트랜짓 엔진은 transit 행성 속도만 보므로 relSpeed 슬롯에 그대로 전달.
          transitSpeed,
          aspectType,
          config
        )

        if (evalResult.accepted) {
          aspects.push({
            from: {
              name: transit.name,
              kind: 'transit',
              house: transit.house,
              sign: transit.sign,
              longitude: transit.longitude,
            },
            to: {
              name: natal.name,
              kind: 'natal',
              house: natal.house,
              sign: natal.sign,
              longitude: natal.longitude,
            },
            type: aspectType,
            orb: evalResult.orb,
            score: evalResult.score,
            transitPlanet: transit.name,
            natalPoint: natal.name,
            isApplying: evalResult.applying,
          })
        }
      }
    }
  }

  // 점수순 정렬 (높은 것이 더 중요)
  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

/**
 * 접근/분리 판단 — transit 행성이 정확한 aspect 위치(natal ± targetAngle) 로
 * 향하고 있는지(applying) 멀어지고 있는지(separating) 판단.
 *
 * 이전 구현 회귀: `targetAngle` 파라미터를 받아만 두고 안 써서 모든 aspect
 * 타입에서 "natal 방향으로 가는지" 만 봤음 → conjunction 만 맞고 square/
 * sextile/trine/opposition 은 applying/separating 라벨이 잘못 나오던 회귀.
 *
 * 올바른 공식: aspect 의 exact point 가 두 개(natal+target, natal-target).
 * transit 에서 가까운 쪽까지의 부호 있는 거리(전진 방향이 +)를 보고,
 * speed 부호와 같으면 applying(가까워지는 중), 다르면 separating.
 */
function determineApplying(
  transitLon: number,
  natalLon: number,
  transitSpeed: number,
  targetAngle: number
): boolean {
  if (transitSpeed === 0) return false

  const norm = (x: number) => ((x % 360) + 360) % 360
  // 정확한 aspect 위치 두 개 (conjunction 은 둘 다 natalLon 으로 일치).
  const t1 = norm(natalLon + targetAngle)
  const t2 = norm(natalLon - targetAngle)

  // 부호 있는 최단 거리 (-180, 180]. 양수 = 전진해야 도달.
  const signedDist = (to: number) => {
    const d = ((to - transitLon + 540) % 360) - 180
    return d
  }
  const d1 = signedDist(t1)
  const d2 = signedDist(t2)
  // |d| 더 작은 쪽 (현재 더 가까운 exact aspect 점) 으로 이동 여부 판단.
  const d = Math.abs(d1) <= Math.abs(d2) ? d1 : d2

  // applying = transit speed 방향이 target 방향과 일치.
  return (d > 0 && transitSpeed > 0) || (d < 0 && transitSpeed < 0)
}

/**
 * 중요한 트랜짓만 필터링
 * 외행성(Jupiter~Pluto)의 내행성(Sun~Mars, ASC, MC) 트랜짓
 */
export function findMajorTransits(
  transitChart: Chart,
  natalChart: Chart,
  orbMultiplier: number = 1.0
): TransitAspect[] {
  const outerPlanets = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  const innerPoints = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant', 'MC']

  const allAspects = findTransitAspects(
    transitChart,
    natalChart,
    ['conjunction', 'square', 'opposition', 'trine', 'sextile'],
    orbMultiplier
  )

  return allAspects.filter(
    (a) => outerPlanets.includes(a.transitPlanet) && innerPoints.includes(a.natalPoint)
  )
}

/**
 * 특정 날짜 범위의 트랜짓 이벤트 예측
 * (간단 버전 - 외부에서 여러 날짜의 차트를 생성해서 사용)
 */
export interface TransitEvent {
  date: string
  aspect: TransitAspect
  exactDate?: string // 정확한 애스펙트 날짜 (계산 가능 시)
}
