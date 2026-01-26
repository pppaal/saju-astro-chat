// src/lib/astrology/foundation/transit.ts
import { Chart, TransitInput, HouseSystem } from "./types";
import { formatLongitude } from "./utils";
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from "./houses";
import { getSwisseph } from "./ephe";
import { getPlanetList, isoToJD, throwIfSwissEphError } from "./shared";

export async function calculateTransitChart(input: TransitInput, system: HouseSystem = "Placidus"): Promise<Chart> {
  const swisseph = getSwisseph();
  const PLANET_LIST = getPlanetList();
  const SW_FLAGS = swisseph.SEFLG_SPEED;

  const ut_jd = isoToJD(input.iso, input.timeZone);

  const housesRes = calcHouses(ut_jd, input.latitude, input.longitude, system);
  const ascendantInfo = formatLongitude(housesRes.ascendant);
  const mcInfo = formatLongitude(housesRes.mc);

  const planets = Object.entries(PLANET_LIST).map(([name, id]) => {
    const res = swisseph.swe_calc_ut(ut_jd, id, SW_FLAGS);
    if ("error" in res) {throw new Error(`swe_calc_ut(${name}): ${res.error}`);}
    const info = formatLongitude(res.longitude);
    const house = inferHouseOf(res.longitude, housesRes.house);
    const speed = res.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;
    return { name, longitude: res.longitude, ...info, house, speed, retrograde };
  });

  return {
    planets,
    ascendant: { name: "Ascendant", longitude: housesRes.ascendant, ...ascendantInfo, house: 1 },
    mc:        { name: "MC",        longitude: housesRes.mc,        ...mcInfo,        house: 10 },
    houses: mapHouseCupsFormatted(housesRes.house),
    meta: {
      jdUT: ut_jd,
      isoUTC: input.iso,
      timeZone: input.timeZone,
      latitude: input.latitude,
      longitude: input.longitude,
      houseSystem: system,
    },
  };
}

// ======================================================
// Transit Aspects 계산
// ======================================================

import { AspectHit, AspectType, PlanetBase } from "./types";
import { angleDiff } from "./utils";

export interface TransitAspect extends AspectHit {
  transitPlanet: string;
  natalPoint: string;
  isApplying: boolean;  // 접근 중인지 분리 중인지
}

const TRANSIT_ASPECT_ANGLES: Record<AspectType, number> = {
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

// 트랜짓은 더 타이트한 오브 사용
const TRANSIT_ORBS: Record<AspectType, number> = {
  conjunction: 6,
  opposition: 6,
  trine: 5,
  square: 5,
  sextile: 4,
  quincunx: 2,
  semisextile: 2,
  quintile: 1.5,
  biquintile: 1.5,
};

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
  "True Node": 1.0,
};

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
  aspectTypes: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"],
  orbMultiplier: number = 1.0
): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  const transitPlanets = transitChart.planets;
  const natalPoints = [
    ...natalChart.planets,
    natalChart.ascendant,
    natalChart.mc,
  ];

  for (const transit of transitPlanets) {
    for (const natal of natalPoints) {
      const diff = angleDiff(transit.longitude, natal.longitude);

      for (const aspectType of aspectTypes) {
        const targetAngle = TRANSIT_ASPECT_ANGLES[aspectType];
        const baseOrb = TRANSIT_ORBS[aspectType];
        const planetMultiplier = PLANET_ORB_MULTIPLIER[transit.name] ?? 1.0;
        const maxOrb = baseOrb * planetMultiplier * orbMultiplier;

        const orb = Math.abs(diff - targetAngle);
        // 180도 근처에서 다른 방향 체크
        const orbAlt = Math.abs(360 - diff - targetAngle);
        const actualOrb = Math.min(orb, orbAlt);

        if (actualOrb <= maxOrb) {
          // 접근/분리 판단 (속도 기반)
          const transitSpeed = transit.speed ?? 0;
          const isApplying = determineApplying(
            transit.longitude,
            natal.longitude,
            transitSpeed,
            targetAngle
          );

          aspects.push({
            from: {
              name: transit.name,
              kind: "transit",
              house: transit.house,
              sign: transit.sign,
              longitude: transit.longitude,
            },
            to: {
              name: natal.name,
              kind: "natal",
              house: natal.house,
              sign: natal.sign,
              longitude: natal.longitude,
            },
            type: aspectType,
            orb: actualOrb,
            score: 1 - actualOrb / maxOrb,
            transitPlanet: transit.name,
            natalPoint: natal.name,
            isApplying,
          });
        }
      }
    }
  }

  // 점수순 정렬 (높은 것이 더 중요)
  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * 접근/분리 판단
 */
function determineApplying(
  transitLon: number,
  natalLon: number,
  transitSpeed: number,
  targetAngle: number
): boolean {
  // 정적 트랜짓 또는 역행
  if (transitSpeed === 0) {return false;}

  const diff = (natalLon - transitLon + 360) % 360;

  if (transitSpeed > 0) {
    // 순행: 트랜짓이 네이탈 방향으로 이동 중이면 접근
    return diff > 0 && diff < 180;
  } else {
    // 역행: 반대 방향으로 이동
    return diff > 180;
  }
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
  const outerPlanets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const innerPoints = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant", "MC"];

  const allAspects = findTransitAspects(
    transitChart,
    natalChart,
    ["conjunction", "square", "opposition", "trine", "sextile"],
    orbMultiplier
  );

  return allAspects.filter(
    (a) =>
      outerPlanets.includes(a.transitPlanet) &&
      innerPoints.includes(a.natalPoint)
  );
}

/**
 * 특정 날짜 범위의 트랜짓 이벤트 예측
 * (간단 버전 - 외부에서 여러 날짜의 차트를 생성해서 사용)
 */
export interface TransitEvent {
  date: string;
  aspect: TransitAspect;
  exactDate?: string;  // 정확한 애스펙트 날짜 (계산 가능 시)
}

/**
 * 현재 활성화된 트랜짓 해석 키워드 반환
 */
export function getTransitKeywords(aspect: TransitAspect): {
  theme: string;
  keywords: string[];
  duration: string;
} {
  const transitThemes: Record<string, Record<string, { theme: string; keywords: string[] }>> = {
    Saturn: {
      Sun: { theme: "책임과 성숙", keywords: ["제한", "책임", "현실", "성취"] },
      Moon: { theme: "감정적 책임", keywords: ["억압", "성숙", "내면 정리"] },
      Mercury: { theme: "사고의 구조화", keywords: ["집중", "계획", "진지한 대화"] },
      Venus: { theme: "관계의 시험", keywords: ["헌신", "책임있는 사랑", "가치 재평가"] },
      Mars: { theme: "행동의 제한", keywords: ["좌절", "인내", "전략적 행동"] },
      Ascendant: { theme: "자아 이미지 재정립", keywords: ["성숙", "책임감", "진지함"] },
      MC: { theme: "커리어 전환점", keywords: ["승진", "책임 증가", "평가"] },
    },
    Uranus: {
      Sun: { theme: "급격한 변화", keywords: ["각성", "자유", "돌파구"] },
      Moon: { theme: "감정적 해방", keywords: ["불안정", "직관", "독립"] },
      Venus: { theme: "관계의 혁명", keywords: ["자유로운 사랑", "갑작스러운 끌림", "변화"] },
      Mars: { theme: "행동의 혁신", keywords: ["충동", "용기", "반항"] },
      Ascendant: { theme: "자아 혁명", keywords: ["이미지 변화", "독립", "개성"] },
      MC: { theme: "커리어 변혁", keywords: ["직업 변화", "독립", "혁신"] },
    },
    Neptune: {
      Sun: { theme: "영적 탐색", keywords: ["혼란", "영성", "예술", "꿈"] },
      Moon: { theme: "감정적 민감성", keywords: ["직관", "공감", "모호함"] },
      Venus: { theme: "이상적 사랑", keywords: ["로맨스", "환상", "예술적 사랑"] },
      Ascendant: { theme: "정체성 모호함", keywords: ["카멜레온", "민감", "영적"] },
      MC: { theme: "커리어 비전", keywords: ["예술", "봉사", "이상"] },
    },
    Pluto: {
      Sun: { theme: "근본적 변형", keywords: ["권력", "재탄생", "죽음과 부활"] },
      Moon: { theme: "감정적 정화", keywords: ["강렬함", "집착", "치유"] },
      Venus: { theme: "변형적 사랑", keywords: ["집착", "파괴와 재건", "깊은 사랑"] },
      Mars: { theme: "권력 투쟁", keywords: ["힘", "폭발", "변형적 행동"] },
      Ascendant: { theme: "자아 변형", keywords: ["권력", "카리스마", "재탄생"] },
      MC: { theme: "커리어 변형", keywords: ["권력", "성공/실패", "완전한 변화"] },
    },
    Jupiter: {
      Sun: { theme: "확장과 성공", keywords: ["행운", "성장", "낙관"] },
      Moon: { theme: "감정적 풍요", keywords: ["행복", "관대함", "편안함"] },
      Venus: { theme: "사랑의 축복", keywords: ["로맨스", "풍요", "행운"] },
      Mars: { theme: "행동의 확장", keywords: ["열정", "모험", "성공"] },
      Ascendant: { theme: "자아 확장", keywords: ["자신감", "인기", "성장"] },
      MC: { theme: "커리어 성공", keywords: ["승진", "인정", "기회"] },
    },
  };

  const durations: Record<string, string> = {
    Jupiter: "약 1년",
    Saturn: "약 2-3년",
    Uranus: "약 7년",
    Neptune: "약 14년",
    Pluto: "약 12-20년",
  };

  const transitData = transitThemes[aspect.transitPlanet]?.[aspect.natalPoint];

  return {
    theme: transitData?.theme ?? `${aspect.transitPlanet} → ${aspect.natalPoint}`,
    keywords: transitData?.keywords ?? [],
    duration: durations[aspect.transitPlanet] ?? "가변적",
  };
}
