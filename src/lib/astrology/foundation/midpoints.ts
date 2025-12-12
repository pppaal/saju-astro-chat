// src/lib/astrology/foundation/midpoints.ts
// 미드포인트 (Midpoints) 계산
// 두 행성 사이의 중간점, 민감한 감응점

import { Chart, PlanetBase, ZodiacKo, AspectType } from "./types";
import { formatLongitude, normalize360, angleDiff } from "./utils";

export interface Midpoint {
  planet1: string;
  planet2: string;
  id: string;           // "Sun/Moon"
  longitude: number;
  sign: ZodiacKo;
  degree: number;
  minute: number;
  formatted: string;
  name_ko: string;      // "영혼의 점"
  keywords: string[];
}

export interface MidpointActivation {
  midpoint: Midpoint;
  activator: string;    // 활성화하는 행성/포인트
  aspectType: "conjunction" | "square" | "opposition";
  orb: number;
  description: string;
}

// 주요 미드포인트 정의
const MIDPOINT_DEFINITIONS: {
  pair: [string, string];
  name_ko: string;
  keywords: string[];
}[] = [
  { pair: ["Sun", "Moon"], name_ko: "영혼의 점", keywords: ["통합된 자아", "내면과 외면의 조화"] },
  { pair: ["Venus", "Mars"], name_ko: "열정의 점", keywords: ["성적 에너지", "로맨틱 끌림", "창조적 열정"] },
  { pair: ["Mercury", "Venus"], name_ko: "사랑 언어의 점", keywords: ["사랑 표현", "아름다운 소통"] },
  { pair: ["Sun", "Venus"], name_ko: "매력의 점", keywords: ["개인적 매력", "자기 가치"] },
  { pair: ["Sun", "Mars"], name_ko: "의지력의 점", keywords: ["행동력", "리더십", "용기"] },
  { pair: ["Moon", "Venus"], name_ko: "감정적 사랑의 점", keywords: ["감정적 조화", "돌봄"] },
  { pair: ["Moon", "Mars"], name_ko: "감정적 행동의 점", keywords: ["감정적 용기", "보호 본능"] },
  { pair: ["Jupiter", "Saturn"], name_ko: "성공의 점", keywords: ["현실화된 성공", "구조화된 성장"] },
  { pair: ["Sun", "Jupiter"], name_ko: "행운의 점", keywords: ["낙관주의", "성공", "명성"] },
  { pair: ["Mars", "Jupiter"], name_ko: "행동적 성공의 점", keywords: ["성공적 행동", "기업가 정신"] },
  { pair: ["Mercury", "Jupiter"], name_ko: "지적 성공의 점", keywords: ["학문적 성공", "출판", "교육"] },
  { pair: ["Venus", "Jupiter"], name_ko: "풍요의 점", keywords: ["사랑의 풍요", "재정적 행운"] },
  { pair: ["Mars", "Saturn"], name_ko: "절제된 행동의 점", keywords: ["좌절", "인내", "훈련"] },
  { pair: ["Sun", "Saturn"], name_ko: "성숙의 점", keywords: ["책임", "성숙", "권위"] },
  { pair: ["Moon", "Saturn"], name_ko: "감정적 성숙의 점", keywords: ["감정 억제", "정서적 성숙"] },
  { pair: ["Venus", "Saturn"], name_ko: "사랑의 시험의 점", keywords: ["사랑의 어려움", "헌신"] },
  { pair: ["Sun", "Pluto"], name_ko: "권력과 변형의 점", keywords: ["변형", "권력", "재탄생"] },
  { pair: ["Moon", "Pluto"], name_ko: "감정적 변형의 점", keywords: ["감정적 강렬함", "심리적 깊이"] },
  { pair: ["Venus", "Pluto"], name_ko: "변형적 사랑의 점", keywords: ["강렬한 사랑", "집착"] },
  { pair: ["Mars", "Pluto"], name_ko: "권력 의지의 점", keywords: ["강렬한 의지", "권력"] },
  { pair: ["Sun", "Uranus"], name_ko: "각성의 점", keywords: ["독립", "혁신", "각성"] },
  { pair: ["Moon", "Uranus"], name_ko: "감정적 독립의 점", keywords: ["감정적 자유", "예측불허"] },
  { pair: ["Venus", "Uranus"], name_ko: "자유로운 사랑의 점", keywords: ["비전통적 사랑", "자유"] },
  { pair: ["Mars", "Uranus"], name_ko: "혁명적 행동의 점", keywords: ["갑작스러운 행동", "혁신"] },
  { pair: ["Sun", "Neptune"], name_ko: "영적 자아의 점", keywords: ["영성", "직관", "예술"] },
  { pair: ["Moon", "Neptune"], name_ko: "직관의 점", keywords: ["직관", "공감", "영적 감수성"] },
  { pair: ["Venus", "Neptune"], name_ko: "이상적 사랑의 점", keywords: ["이상적 사랑", "예술", "로맨스"] },
  { pair: ["Jupiter", "Neptune"], name_ko: "확장된 영성의 점", keywords: ["영적 성장", "비전", "연민"] },
];

/**
 * 두 경도의 미드포인트 계산 (짧은 호)
 */
function getMidpointLongitude(lon1: number, lon2: number): number {
  const a = normalize360(lon1);
  const b = normalize360(lon2);

  let diff = b - a;
  if (diff < 0) diff += 360;

  if (diff > 180) {
    return normalize360(a + diff / 2 + 180);
  }
  return normalize360(a + diff / 2);
}

/**
 * 차트의 모든 미드포인트 계산
 */
export function calculateMidpoints(chart: Chart): Midpoint[] {
  const midpoints: Midpoint[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const def of MIDPOINT_DEFINITIONS) {
    const [name1, name2] = def.pair;
    const p1 = allPoints.find((p) => p.name === name1);
    const p2 = allPoints.find((p) => p.name === name2);

    if (p1 && p2) {
      const mpLon = getMidpointLongitude(p1.longitude, p2.longitude);
      const fmt = formatLongitude(mpLon);

      midpoints.push({
        planet1: name1,
        planet2: name2,
        id: `${name1}/${name2}`,
        longitude: mpLon,
        sign: fmt.sign,
        degree: fmt.degree,
        minute: fmt.minute,
        formatted: fmt.formatted,
        name_ko: def.name_ko,
        keywords: def.keywords,
      });
    }
  }

  return midpoints;
}

/**
 * 미드포인트 활성화 찾기
 * 차트의 행성/포인트가 미드포인트와 합, 스퀘어, 오포지션을 이루는지 확인
 */
export function findMidpointActivations(
  chart: Chart,
  orb: number = 1.5
): MidpointActivation[] {
  const midpoints = calculateMidpoints(chart);
  const activations: MidpointActivation[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const mp of midpoints) {
    for (const point of allPoints) {
      // 미드포인트를 구성하는 행성은 제외
      if (point.name === mp.planet1 || point.name === mp.planet2) {
        continue;
      }

      const diff = angleDiff(point.longitude, mp.longitude);

      // Conjunction (0도)
      if (diff <= orb) {
        activations.push({
          midpoint: mp,
          activator: point.name,
          aspectType: "conjunction",
          orb: diff,
          description: `${point.name}이(가) ${mp.id} 미드포인트를 합으로 활성화`,
        });
      }
      // Opposition (180도)
      else if (Math.abs(diff - 180) <= orb) {
        activations.push({
          midpoint: mp,
          activator: point.name,
          aspectType: "opposition",
          orb: Math.abs(diff - 180),
          description: `${point.name}이(가) ${mp.id} 미드포인트를 충으로 활성화`,
        });
      }
      // Square (90도)
      else if (Math.abs(diff - 90) <= orb) {
        activations.push({
          midpoint: mp,
          activator: point.name,
          aspectType: "square",
          orb: Math.abs(diff - 90),
          description: `${point.name}이(가) ${mp.id} 미드포인트를 사각으로 활성화`,
        });
      }
    }
  }

  return activations.sort((a, b) => a.orb - b.orb);
}

/**
 * 특정 미드포인트 계산 (두 경도값으로)
 */
export function getMidpoint(lon1: number, lon2: number): {
  longitude: number;
  sign: ZodiacKo;
  degree: number;
  minute: number;
  formatted: string;
} {
  const mpLon = getMidpointLongitude(lon1, lon2);
  const fmt = formatLongitude(mpLon);
  return {
    longitude: mpLon,
    sign: fmt.sign,
    degree: fmt.degree,
    minute: fmt.minute,
    formatted: fmt.formatted,
  };
}

/**
 * 두 차트 간 미드포인트 연결 찾기 (시너스트리용)
 * A의 행성이 B의 미드포인트를 활성화하는지 확인
 */
export function findCrossMidpointActivations(
  chartA: Chart,
  chartB: Chart,
  orb: number = 1.5
): MidpointActivation[] {
  const midpointsB = calculateMidpoints(chartB);
  const activations: MidpointActivation[] = [];
  const pointsA = [...chartA.planets, chartA.ascendant, chartA.mc];

  for (const mp of midpointsB) {
    for (const point of pointsA) {
      const diff = angleDiff(point.longitude, mp.longitude);

      if (diff <= orb) {
        activations.push({
          midpoint: mp,
          activator: `A의 ${point.name}`,
          aspectType: "conjunction",
          orb: diff,
          description: `A의 ${point.name}이(가) B의 ${mp.id} 미드포인트를 활성화`,
        });
      } else if (Math.abs(diff - 180) <= orb) {
        activations.push({
          midpoint: mp,
          activator: `A의 ${point.name}`,
          aspectType: "opposition",
          orb: Math.abs(diff - 180),
          description: `A의 ${point.name}이(가) B의 ${mp.id} 미드포인트를 충으로 활성화`,
        });
      } else if (Math.abs(diff - 90) <= orb) {
        activations.push({
          midpoint: mp,
          activator: `A의 ${point.name}`,
          aspectType: "square",
          orb: Math.abs(diff - 90),
          description: `A의 ${point.name}이(가) B의 ${mp.id} 미드포인트를 사각으로 활성화`,
        });
      }
    }
  }

  return activations.sort((a, b) => a.orb - b.orb);
}
