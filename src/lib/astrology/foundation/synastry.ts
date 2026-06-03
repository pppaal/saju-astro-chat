// src/lib/astrology/foundation/synastry.ts
// 시너스트리 (두 차트 비교) 계산

import { Chart, PlanetBase, AspectHit, AspectType, ZodiacKo } from "./types";
import { shortestAngle, normalize360 } from "./utils";
import { evaluateAspect, AspectEngineConfig } from "./aspectCore";

export interface SynastryInput {
  chartA: Chart;
  chartB: Chart;
}

export interface HouseOverlay {
  planet: string;
  planetSign: ZodiacKo;
  inHouse: number;
  description: string;
}

export interface SynastryResult {
  aspects: AspectHit[];
  houseOverlaysAtoB: HouseOverlay[];  // A의 행성이 B의 하우스에
  houseOverlaysBtoA: HouseOverlay[];  // B의 행성이 A의 하우스에
  score: {
    harmony: number;    // 조화로운 애스펙트 점수
    tension: number;    // 긴장 애스펙트 점수
    total: number;      // 총점
  };
}

const ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  semisextile: 30,
  quincunx: 150,
  quintile: 72,
  biquintile: 144,
  sesquiquadrate: 135,
};

const ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 5,
  quincunx: 3,
  semisextile: 2,
  quintile: 2,
  biquintile: 2,
  sesquiquadrate: 2,
};

const HARMONY_ASPECTS: AspectType[] = ["conjunction", "trine", "sextile"];
const TENSION_ASPECTS: AspectType[] = ["square", "opposition", "quincunx"];

// 시너스트리(두 차트 비교) 엔진 config — 코어 evaluateAspect 에 주입할
// *시너스트리 고유* 산술. 이전엔 findAspectBetween 이 "최단 분리각 → orb 테스트
// → score" 로직을 aspects.ts/transit.ts 와 무관하게 세 번째로 따로 구현하고
// 있었다. 이제 그 *알고리즘* 만 aspectCore 로 통합한다 (orb 테이블 ASPECT_ORBS
// 와 score 식 같은 *튜닝 상수* 는 시너스트리 전용으로 유지 — natal/transit 과
// 병합하지 않음).
//
// CONSOLIDATION 보존 포인트 (출력 바이트 단위 동일):
//  - targetAngle : ASPECT_ANGLES[aspect]  (기존과 동일 테이블)
//  - orb         : |diff - target|, diff = shortestAngle(lonA, lonB) (0..180)
//  - limit       : ASPECT_ORBS[aspect]    (시너스트리 전용 orb 테이블)
//  - accepted    : orb <= limit
//  - score       : 1 - orb/limit          (기존 1 - orb/maxOrb 와 동일)
//  - applying    : 시너스트리는 부호 있는 속도 정보를 쓰지 않으므로 의미 없음.
//                  코어는 항상 applying 을 계산하지만 시너스트리는 그 값을
//                  *무시* 하고 AspectHit 에 applying 필드를 넣지 않는다 →
//                  기존 출력(orb/score/type/from/to 만)과 정확히 일치.
const SYNASTRY_ASPECT_CONFIG: AspectEngineConfig = {
  desiredAngle: (a) => ASPECT_ANGLES[a],
  computeOrb: (sep, target) => Math.abs(sep - target),
  computeLimit: (_aName, _bName, aspect) => ASPECT_ORBS[aspect],
  // 시너스트리는 applying/separating 을 보고하지 않는다. 코어가 호출은 하지만
  // 결과를 버리므로 부작용 없는 false 를 반환한다.
  isApplying: () => false,
  computeScore: ({ orb, limit }) => 1 - orb / limit,
};

function findAspectBetween(
  pA: PlanetBase,
  pB: PlanetBase,
  // Quincunx (150°) 는 synastry 에서 "조정 필요" 핵심 신호 — major 5 와
  // 함께 default 에 포함. orb 는 ASPECT_ORBS 에서 별도(기본 ~3°) 로 묶임.
  aspects: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition", "quincunx"]
): AspectHit | null {
  const diff = shortestAngle(pA.longitude, pB.longitude);

  for (const aspectType of aspects) {
    // relSpeed 슬롯은 시너스트리에서 미사용(applying 을 보고하지 않음) → 0.
    const evalResult = evaluateAspect(
      pA.name,
      pA.longitude,
      pB.name,
      pB.longitude,
      diff,
      0,
      aspectType,
      SYNASTRY_ASPECT_CONFIG
    );

    if (evalResult.accepted) {
      return {
        from: {
          name: pA.name,
          kind: "natal",
          house: pA.house,
          sign: pA.sign,
          longitude: pA.longitude,
        },
        to: {
          name: pB.name,
          kind: "natal",
          house: pB.house,
          sign: pB.sign,
          longitude: pB.longitude,
        },
        type: aspectType,
        orb: evalResult.orb,
        score: evalResult.score,
      };
    }
  }
  return null;
}

function getHouseForLongitude(longitude: number, houses: { cusp: number }[]): number {
  const norm = normalize360(longitude);
  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12;
    const cusp = houses[i].cusp;
    let nextCusp = houses[nextI].cusp;

    if (nextCusp < cusp) {nextCusp += 360;}
    let testLon = norm;
    if (testLon < cusp) {testLon += 360;}

    if (testLon >= cusp && testLon < nextCusp) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * 시너스트리 계산
 * 두 차트 간의 애스펙트와 하우스 오버레이를 분석합니다.
 */
export function calculateSynastry(input: SynastryInput): SynastryResult {
  const { chartA, chartB } = input;
  const aspects: AspectHit[] = [];
  const houseOverlaysAtoB: HouseOverlay[] = [];
  const houseOverlaysBtoA: HouseOverlay[] = [];

  // 1. 행성 간 애스펙트 찾기
  const planetsA = [...chartA.planets, chartA.ascendant, chartA.mc];
  const planetsB = [...chartB.planets, chartB.ascendant, chartB.mc];

  for (const pA of planetsA) {
    for (const pB of planetsB) {
      const aspect = findAspectBetween(pA, pB);
      if (aspect) {
        aspect.from.kind = "natal";
        aspect.to.kind = "natal";
        aspects.push(aspect);
      }
    }
  }

  // 2. 하우스 오버레이 계산: A의 행성이 B의 하우스에
  for (const pA of chartA.planets) {
    const houseInB = getHouseForLongitude(
      pA.longitude,
      chartB.houses.map((h) => ({ cusp: h.cusp }))
    );
    houseOverlaysAtoB.push({
      planet: pA.name,
      planetSign: pA.sign,
      inHouse: houseInB,
      description: `A의 ${pA.name} → B의 ${houseInB}하우스에 위치`,
    });
  }

  // 3. 하우스 오버레이 계산: B의 행성이 A의 하우스에
  for (const pB of chartB.planets) {
    const houseInA = getHouseForLongitude(
      pB.longitude,
      chartA.houses.map((h) => ({ cusp: h.cusp }))
    );
    houseOverlaysBtoA.push({
      planet: pB.name,
      planetSign: pB.sign,
      inHouse: houseInA,
      description: `B의 ${pB.name} → A의 ${houseInA}하우스에 위치`,
    });
  }

  // 4. 점수 계산
  let harmony = 0;
  let tension = 0;

  for (const aspect of aspects) {
    const weight = aspect.score ?? 0.5;
    if (HARMONY_ASPECTS.includes(aspect.type)) {
      harmony += weight;
    } else if (TENSION_ASPECTS.includes(aspect.type)) {
      tension += weight;
    }
  }

  return {
    aspects: aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    houseOverlaysAtoB,
    houseOverlaysBtoA,
    score: {
      harmony: Math.round(harmony * 10) / 10,
      tension: Math.round(tension * 10) / 10,
      total: Math.round((harmony - tension * 0.5 + 10) * 10) / 10,
    },
  };
}

/**
 * 시너스트리 애스펙트만 찾기 (간단 버전)
 */
export function findSynastryAspects(
  chartA: Chart,
  chartB: Chart,
  aspectTypes?: AspectType[]
): AspectHit[] {
  const result = calculateSynastry({ chartA, chartB });
  if (aspectTypes) {
    return result.aspects.filter((a) => aspectTypes.includes(a.type));
  }
  return result.aspects;
}
