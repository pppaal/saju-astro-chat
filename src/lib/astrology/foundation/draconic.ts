// src/lib/astrology/foundation/draconic.ts
// 드라코닉 차트 - 영혼 차트, 전생과 카르마 분석

import { Chart, PlanetBase, ZodiacKo, AspectHit } from "./types";
import { normalize360, formatLongitude, shortestAngle } from "./utils";
import { findAspects } from "./aspects";

export interface DraconicChart extends Chart {
  chartType: "draconic";
  natalNorthNode: number;
  offsetDegrees: number;
}

export interface DraconicComparison {
  draconicChart: DraconicChart;
  natalChart: Chart;
  alignments: DraconicAlignment[];
  tensions: DraconicTension[];
  summary: DraconicSummary;
}

export interface DraconicAlignment {
  draconicPlanet: string;
  natalPlanet: string;
  orb: number;
  meaning: string;
}

export interface DraconicTension {
  draconicPlanet: string;
  natalPlanet: string;
  aspectType: string;
  orb: number;
  meaning: string;
}

export interface DraconicSummary {
  soulIdentity: string;
  soulNeeds: string;
  soulPurpose: string;
  karmicLessons: string;
  alignmentScore: number;
}

const ZODIAC_SOUL_MEANINGS: Record<ZodiacKo, { archetype: string; pastLife: string; needs: string }> = {
  Aries: { archetype: "개척자 영혼", pastLife: "전사, 지도자", needs: "자율성, 용기" },
  Taurus: { archetype: "건설자 영혼", pastLife: "예술가, 농부", needs: "안정, 감각적 즐거움" },
  Gemini: { archetype: "메신저 영혼", pastLife: "상인, 작가", needs: "소통, 다양한 경험" },
  Cancer: { archetype: "양육자 영혼", pastLife: "어머니, 치유자", needs: "정서적 연결, 돌봄" },
  Leo: { archetype: "창조자 영혼", pastLife: "왕, 예술가", needs: "인정, 창조적 표현" },
  Virgo: { archetype: "치유자 영혼", pastLife: "의사, 장인", needs: "유용함, 개선" },
  Libra: { archetype: "조화자 영혼", pastLife: "외교관, 파트너", needs: "관계, 균형" },
  Scorpio: { archetype: "변형자 영혼", pastLife: "샤먼, 심리학자", needs: "깊이, 변형" },
  Sagittarius: { archetype: "탐험가 영혼", pastLife: "철학자, 탐험가", needs: "의미, 자유" },
  Capricorn: { archetype: "성취자 영혼", pastLife: "통치자, 건축가", needs: "성취, 유산" },
  Aquarius: { archetype: "혁신가 영혼", pastLife: "과학자, 혁명가", needs: "독창성, 진보" },
  Pisces: { archetype: "신비주의자 영혼", pastLife: "영매, 예술가", needs: "영적 연결, 초월" },
};

/**
 * 드라코닉 차트 계산
 * 북교점(North Node)을 0° 양자리로 설정하고 모든 행성을 재배치
 */
export function calculateDraconicChart(natalChart: Chart): DraconicChart {
  // 북교점 찾기
  const northNode = natalChart.planets.find(p => p.name === "True Node");
  if (!northNode) {
    throw new Error("North Node (True Node) not found in natal chart");
  }

  const nodeOffset = northNode.longitude;

  // 모든 행성 위치에서 북교점 위치 빼기
  const draconicPlanets: PlanetBase[] = natalChart.planets.map(planet => {
    const draconicLongitude = normalize360(planet.longitude - nodeOffset);
    const info = formatLongitude(draconicLongitude);
    return {
      ...planet,
      longitude: draconicLongitude,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      formatted: info.formatted,
    };
  });

  // ASC, MC도 변환
  const draconicASC = normalize360(natalChart.ascendant.longitude - nodeOffset);
  const ascInfo = formatLongitude(draconicASC);
  const draconicAscendant: PlanetBase = {
    ...natalChart.ascendant,
    longitude: draconicASC,
    sign: ascInfo.sign,
    degree: ascInfo.degree,
    minute: ascInfo.minute,
    formatted: ascInfo.formatted,
  };

  const draconicMCLon = normalize360(natalChart.mc.longitude - nodeOffset);
  const mcInfo = formatLongitude(draconicMCLon);
  const draconicMC: PlanetBase = {
    ...natalChart.mc,
    longitude: draconicMCLon,
    sign: mcInfo.sign,
    degree: mcInfo.degree,
    minute: mcInfo.minute,
    formatted: mcInfo.formatted,
  };

  // 하우스 커스프도 변환
  const draconicHouses = natalChart.houses.map(house => {
    const draconicCusp = normalize360(house.cusp - nodeOffset);
    const hInfo = formatLongitude(draconicCusp);
    return {
      ...house,
      cusp: draconicCusp,
      sign: hInfo.sign,
      formatted: hInfo.formatted,
    };
  });

  return {
    planets: draconicPlanets,
    ascendant: draconicAscendant,
    mc: draconicMC,
    houses: draconicHouses,
    chartType: "draconic",
    natalNorthNode: nodeOffset,
    offsetDegrees: nodeOffset,
  };
}

/**
 * 드라코닉-출생 차트 비교 분석
 */
export function compareDraconicToNatal(natalChart: Chart): DraconicComparison {
  const draconicChart = calculateDraconicChart(natalChart);

  const alignments: DraconicAlignment[] = [];
  const tensions: DraconicTension[] = [];

  const orb = 8; // 컨정션 오브
  const tensionOrb = 7; // 스퀘어/오포지션 오브

  // 드라코닉 행성과 출생 행성 비교
  for (const dPlanet of draconicChart.planets) {
    for (const nPlanet of natalChart.planets) {
      const diff = shortestAngle(dPlanet.longitude, nPlanet.longitude);

      // 컨정션 (일치)
      if (diff <= orb) {
        alignments.push({
          draconicPlanet: dPlanet.name,
          natalPlanet: nPlanet.name,
          orb: diff,
          meaning: getAlignmentMeaning(dPlanet.name, nPlanet.name),
        });
      }

      // 스퀘어 (긴장)
      if (Math.abs(diff - 90) <= tensionOrb) {
        tensions.push({
          draconicPlanet: dPlanet.name,
          natalPlanet: nPlanet.name,
          aspectType: "square",
          orb: Math.abs(diff - 90),
          meaning: getTensionMeaning(dPlanet.name, nPlanet.name, "square"),
        });
      }

      // 오포지션 (긴장)
      if (Math.abs(diff - 180) <= tensionOrb) {
        tensions.push({
          draconicPlanet: dPlanet.name,
          natalPlanet: nPlanet.name,
          aspectType: "opposition",
          orb: Math.abs(diff - 180),
          meaning: getTensionMeaning(dPlanet.name, nPlanet.name, "opposition"),
        });
      }
    }
  }

  // 요약 생성
  const summary = generateDraconicSummary(draconicChart, alignments.length, tensions.length);

  return {
    draconicChart,
    natalChart,
    alignments: alignments.sort((a, b) => a.orb - b.orb),
    tensions: tensions.sort((a, b) => a.orb - b.orb),
    summary,
  };
}

/**
 * 드라코닉 차트 내부 애스펙트 찾기
 */
export function findDraconicAspects(draconicChart: DraconicChart): AspectHit[] {
  return findAspects(draconicChart, draconicChart);
}

/**
 * 드라코닉 시나스트리 - 두 사람의 영혼 연결 분석
 */
export function calculateDraconicSynastry(
  chartA: Chart,
  chartB: Chart
): {
  draconicA: DraconicChart;
  draconicB: DraconicChart;
  soulConnections: AspectHit[];
  draconicToNatalAB: AspectHit[];
  draconicToNatalBA: AspectHit[];
} {
  const draconicA = calculateDraconicChart(chartA);
  const draconicB = calculateDraconicChart(chartB);

  // 드라코닉 대 드라코닉 (영혼 대 영혼)
  const soulConnections = findCrossChartAspects(draconicA, draconicB);

  // A의 드라코닉 대 B의 출생 (A의 영혼이 B를 어떻게 돕는가)
  const draconicToNatalAB = findCrossChartAspects(draconicA, chartB);

  // B의 드라코닉 대 A의 출생
  const draconicToNatalBA = findCrossChartAspects(draconicB, chartA);

  return {
    draconicA,
    draconicB,
    soulConnections,
    draconicToNatalAB,
    draconicToNatalBA,
  };
}

/**
 * 트랜짓이 드라코닉 포인트를 건드리는지 확인
 */
export function findDraconicTransits(
  draconicChart: DraconicChart,
  transitChart: Chart
): AspectHit[] {
  return findCrossChartAspects(transitChart, draconicChart);
}

/**
 * 드라코닉 행성 해석 가져오기
 */
export function getDraconicPlanetMeaning(
  planetName: string,
  sign: ZodiacKo
): { meaning: string; archetype: string; pastLife: string } {
  const signInfo = ZODIAC_SOUL_MEANINGS[sign];

  const planetMeanings: Record<string, string> = {
    Sun: "영혼의 본질적 정체성",
    Moon: "전생의 감정 패턴, 영혼의 기억",
    Mercury: "영혼의 학습 스타일, 전생 지식",
    Venus: "영혼이 추구하는 사랑의 형태",
    Mars: "영혼의 원동력, 전생의 투쟁 패턴",
    Jupiter: "영혼의 확장 방향, 전생의 지혜",
    Saturn: "전생 카르마, 영혼이 배워야 할 교훈",
    Uranus: "영혼의 혁신 에너지",
    Neptune: "영혼의 신비적 연결",
    Pluto: "영혼의 심층 변형",
    Ascendant: "영혼이 세상에 나타내고자 하는 방식",
    MC: "영혼의 사명",
    "True Node": "영혼의 진화 방향 (항상 0° Aries)",
  };

  return {
    meaning: planetMeanings[planetName] || `${planetName}의 영혼적 의미`,
    archetype: signInfo.archetype,
    pastLife: signInfo.pastLife,
  };
}

// --- 헬퍼 함수들 ---

function findCrossChartAspects(chartA: Chart, chartB: Chart): AspectHit[] {
  const aspects: AspectHit[] = [];
  const aspectAngles = [
    { type: "conjunction" as const, angle: 0, orb: 8 },
    { type: "trine" as const, angle: 120, orb: 7 },
    { type: "sextile" as const, angle: 60, orb: 5 },
    { type: "square" as const, angle: 90, orb: 7 },
    { type: "opposition" as const, angle: 180, orb: 8 },
  ];

  const planetsA = [...chartA.planets, chartA.ascendant, chartA.mc];
  const planetsB = [...chartB.planets, chartB.ascendant, chartB.mc];

  for (const pA of planetsA) {
    for (const pB of planetsB) {
      const diff = shortestAngle(pA.longitude, pB.longitude);

      for (const { type, angle, orb } of aspectAngles) {
        const aspectOrb = Math.abs(diff - angle);
        if (aspectOrb <= orb) {
          aspects.push({
            from: { name: pA.name, kind: "natal", longitude: pA.longitude, sign: pA.sign, house: pA.house },
            to: { name: pB.name, kind: "natal", longitude: pB.longitude, sign: pB.sign, house: pB.house },
            type,
            orb: aspectOrb,
            score: 1 - aspectOrb / orb,
          });
        }
      }
    }
  }

  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function getAlignmentMeaning(draconicPlanet: string, natalPlanet: string): string {
  const meanings: Record<string, Record<string, string>> = {
    Sun: {
      Sun: "영혼 정체성과 현재 자아가 완전히 일치 - 진정한 자기 표현",
      Moon: "영혼 본질이 감정적 욕구와 조화 - 자연스러운 감정 흐름",
      Ascendant: "영혼이 외부로 자연스럽게 표현됨",
    },
    Moon: {
      Moon: "영혼의 감정 기억이 현재와 일치 - 깊은 정서적 안정",
      Venus: "영혼의 감정 패턴이 사랑 표현과 조화",
    },
    Saturn: {
      Saturn: "전생 카르마가 현재 책임과 일치 - 카르마 청산 중",
      Sun: "영혼의 교훈이 자아 발전에 통합됨",
    },
  };

  return meanings[draconicPlanet]?.[natalPlanet] ||
    `드라코닉 ${draconicPlanet}과 출생 ${natalPlanet}의 일치 - 영혼과 현실의 조화`;
}

function getTensionMeaning(draconicPlanet: string, natalPlanet: string, aspectType: string): string {
  const aspect = aspectType === "square" ? "스퀘어" : "오포지션";
  return `드라코닉 ${draconicPlanet}과 출생 ${natalPlanet}의 ${aspect} - 영혼의 의도와 현실 사이의 성장 압력`;
}

function generateDraconicSummary(
  draconicChart: DraconicChart,
  alignmentCount: number,
  tensionCount: number
): DraconicSummary {
  const sunPlanet = draconicChart.planets.find(p => p.name === "Sun");
  const moonPlanet = draconicChart.planets.find(p => p.name === "Moon");
  const saturnPlanet = draconicChart.planets.find(p => p.name === "Saturn");

  // 기본값 제공 (행성을 찾지 못한 경우)
  const sunSign: ZodiacKo = (sunPlanet?.sign as ZodiacKo) ?? "Aries";
  const moonSign: ZodiacKo = (moonPlanet?.sign as ZodiacKo) ?? "Cancer";
  const saturnSign: ZodiacKo = (saturnPlanet?.sign as ZodiacKo) ?? "Capricorn";
  const mcSign: ZodiacKo = (draconicChart.mc.sign as ZodiacKo) ?? "Capricorn";

  const sunInfo = ZODIAC_SOUL_MEANINGS[sunSign];
  const moonInfo = ZODIAC_SOUL_MEANINGS[moonSign];
  const saturnInfo = ZODIAC_SOUL_MEANINGS[saturnSign];
  const mcInfo = ZODIAC_SOUL_MEANINGS[mcSign];

  const alignmentScore = Math.round((alignmentCount / (alignmentCount + tensionCount + 1)) * 100);

  return {
    soulIdentity: `${sunInfo.archetype} - ${sunInfo.pastLife}로서의 전생 경험`,
    soulNeeds: `${moonInfo.needs} - 영혼이 진정으로 필요로 하는 것`,
    soulPurpose: `${mcInfo.archetype}의 사명 - ${mcInfo.needs}를 통한 성취`,
    karmicLessons: `${saturnInfo.pastLife}에서의 미완성 과제 - ${saturnInfo.needs}의 성숙`,
    alignmentScore,
  };
}
