// src/lib/astrology/foundation/synastry.ts
// 시너스트리 (두 차트 비교) 계산

import { Chart, PlanetBase, AspectHit, AspectType, ZodiacKo } from "./types";
import { angleDiff, normalize360 } from "./utils";

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
};

const HARMONY_ASPECTS: AspectType[] = ["conjunction", "trine", "sextile"];
const TENSION_ASPECTS: AspectType[] = ["square", "opposition", "quincunx"];

function findAspectBetween(
  pA: PlanetBase,
  pB: PlanetBase,
  aspects: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"]
): AspectHit | null {
  const diff = angleDiff(pA.longitude, pB.longitude);

  for (const aspectType of aspects) {
    const targetAngle = ASPECT_ANGLES[aspectType];
    const orb = Math.abs(diff - targetAngle);
    const maxOrb = ASPECT_ORBS[aspectType];

    if (orb <= maxOrb) {
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
        orb,
        score: 1 - orb / maxOrb,
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

    if (nextCusp < cusp) nextCusp += 360;
    let testLon = norm;
    if (testLon < cusp) testLon += 360;

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
      description: `A의 ${pA.name}이(가) B의 ${houseInB}하우스에 위치`,
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
      description: `B의 ${pB.name}이(가) A의 ${houseInA}하우스에 위치`,
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
