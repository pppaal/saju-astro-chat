// src/lib/astrology/foundation/asteroids.ts
// 4대 소행성 (Ceres, Pallas, Juno, Vesta) 계산 및 해석

import { ZodiacKo, PlanetBase, Chart, AspectHit, AspectType } from "./types";
import { formatLongitude, normalize360, angleDiff } from "./utils";
import { inferHouseOf } from "./houses";
import { getSwisseph } from "./ephe";

export type AsteroidName = "Ceres" | "Pallas" | "Juno" | "Vesta";

export interface Asteroid {
  name: AsteroidName;
  longitude: number;
  sign: ZodiacKo;
  degree: number;
  minute: number;
  formatted: string;
  house: number;
  speed?: number;
  retrograde?: boolean;
}

export interface AsteroidInterpretation {
  asteroid: AsteroidName;
  sign: ZodiacKo;
  house: number;
  themes: string[];
  nurturingStyle?: string;      // Ceres
  intelligenceStyle?: string;   // Pallas
  partnerNeed?: string;         // Juno
  devotionFocus?: string;       // Vesta
  shadow: string;
  healing?: string;
}

export interface ExtendedChartWithAsteroids extends Chart {
  ceres?: Asteroid;
  pallas?: Asteroid;
  juno?: Asteroid;
  vesta?: Asteroid;
}

// Swiss Ephemeris 소행성 ID (lazy)
const getAsteroidIds = (() => {
  let cache: Record<AsteroidName, number> | null = null;
  return () => {
    if (cache) return cache;
    const swisseph = getSwisseph();
    cache = {
      Ceres: swisseph.SE_CERES,
      Pallas: swisseph.SE_PALLAS,
      Juno: swisseph.SE_JUNO,
      Vesta: swisseph.SE_VESTA,
    };
    return cache;
  };
})();

// 소행성 기본 테마
const ASTEROID_THEMES: Record<AsteroidName, {
  korean: string;
  symbol: string;
  themes: string[];
  sajuElement: string;
  sajuSipsin: string;
}> = {
  Ceres: {
    korean: "세레스",
    symbol: "⚳",
    themes: ["양육", "돌봄", "음식", "모성", "상실과 재회"],
    sajuElement: "土",
    sajuSipsin: "정인",
  },
  Pallas: {
    korean: "팔라스 아테나",
    symbol: "⚴",
    themes: ["지혜", "전략", "패턴 인식", "창조적 지성", "정의"],
    sajuElement: "金",
    sajuSipsin: "상관",
  },
  Juno: {
    korean: "주노",
    symbol: "⚵",
    themes: ["결혼", "헌신", "파트너십", "평등", "계약"],
    sajuElement: "土/金",
    sajuSipsin: "정관",
  },
  Vesta: {
    korean: "베스타",
    symbol: "⚶",
    themes: ["헌신", "집중", "순수성", "성스러움", "일"],
    sajuElement: "火",
    sajuSipsin: "식신",
  },
};

// 사인별 해석 데이터
const CERES_SIGNS: Record<ZodiacKo, { nurturing: string; food: string; wound: string; healing: string }> = {
  Aries: { nurturing: "독립적 양육, 자립심 강조", food: "빠르게 먹음, 에너지 음식", wound: "버림받음의 두려움", healing: "도움 요청해도 괜찮다는 것 배우기" },
  Taurus: { nurturing: "물질적 안정 제공, 감각적 돌봄", food: "미식가, 요리 재능", wound: "소유욕으로 변질된 사랑", healing: "사랑과 물질의 분리" },
  Gemini: { nurturing: "대화와 정보로 돌봄", food: "먹으면서 대화, 다양한 음식", wound: "감정보다 논리로 접근", healing: "감정적 연결 허용" },
  Cancer: { nurturing: "전통적 모성, 가정 중심", food: "집밥, 가족 식사", wound: "과보호, 분리 불안", healing: "건강한 경계 설정" },
  Leo: { nurturing: "칭찬과 인정으로 돌봄", food: "화려한 식사, 파티", wound: "관심 중심이어야 돌봄 느낌", healing: "조용한 사랑도 사랑" },
  Virgo: { nurturing: "실용적 돌봄, 건강 관리", food: "건강식, 영양 분석", wound: "비판으로 변질된 돌봄", healing: "완벽하지 않아도 충분함" },
  Libra: { nurturing: "공정하고 균형잡힌 돌봄", food: "아름다운 테이블 세팅", wound: "자기 희생적 돌봄", healing: "자기 돌봄 우선" },
  Scorpio: { nurturing: "깊은 정서적 유대", food: "음식과 감정 연결", wound: "통제로 변질된 사랑", healing: "신뢰와 놓아주기" },
  Sagittarius: { nurturing: "자유와 탐험 격려", food: "세계 음식, 문화 체험", wound: "책임 회피로 보임", healing: "현재에 머무르는 돌봄" },
  Capricorn: { nurturing: "구조와 규율 제공", food: "절제된 식사, 전통", wound: "감정 억압된 돌봄", healing: "부드러움 허용" },
  Aquarius: { nurturing: "독특한 양육, 개성 존중", food: "실험적 음식", wound: "거리두기로 느껴짐", healing: "개인적 친밀함 연습" },
  Pisces: { nurturing: "무조건적 사랑, 영적 돌봄", food: "직관적 식사", wound: "경계 없는 희생", healing: "건강한 경계 = 사랑" },
};

const PALLAS_SIGNS: Record<ZodiacKo, { intelligence: string; pattern: string; creative: string; justice: string }> = {
  Aries: { intelligence: "빠른 전략, 선제 공격", pattern: "즉각적 패턴 파악", creative: "개척적 예술", justice: "직접 행동" },
  Taurus: { intelligence: "실용적 지혜, 점진적 전략", pattern: "물질적 패턴, 가치 분석", creative: "공예, 촉각 예술", justice: "자원 공정 분배" },
  Gemini: { intelligence: "언어 전략, 다각도 분석", pattern: "언어/소통 패턴", creative: "글쓰기, 디자인", justice: "논리적 토론" },
  Cancer: { intelligence: "감정 지능, 보호 전략", pattern: "감정/가족 패턴", creative: "가정 예술", justice: "돌봄 정의" },
  Leo: { intelligence: "창조적 전략, 드라마틱 지혜", pattern: "자기 표현 패턴", creative: "공연 예술", justice: "공정한 인정" },
  Virgo: { intelligence: "분석적 지혜, 세부 전략", pattern: "시스템/건강 패턴", creative: "치유 예술, 공예", justice: "실용적 해결" },
  Libra: { intelligence: "외교 전략, 균형 지혜", pattern: "관계/조화 패턴", creative: "미술, 디자인", justice: "법적 정의" },
  Scorpio: { intelligence: "심층 전략, 심리 지혜", pattern: "숨겨진 패턴, 동기", creative: "변형 예술", justice: "근본 변혁" },
  Sagittarius: { intelligence: "철학적 지혜, 큰 그림", pattern: "의미/진실 패턴", creative: "교육 예술", justice: "도덕적 정의" },
  Capricorn: { intelligence: "구조적 전략, 장기 계획", pattern: "권력/체계 패턴", creative: "건축, 조직", justice: "제도적 정의" },
  Aquarius: { intelligence: "혁신 전략, 미래 지혜", pattern: "사회/기술 패턴", creative: "첨단 예술", justice: "사회 정의" },
  Pisces: { intelligence: "직관 지혜, 영적 전략", pattern: "영적/상징 패턴", creative: "영감 예술", justice: "연민 정의" },
};

const JUNO_SIGNS: Record<ZodiacKo, { partnerNeed: string; commitment: string; shadow: string; ideal: string }> = {
  Aries: { partnerNeed: "독립적이고 활동적인 파트너", commitment: "열정적, 선구적", shadow: "경쟁, 주도권 다툼", ideal: "함께 모험하는 관계" },
  Taurus: { partnerNeed: "안정적이고 감각적인 파트너", commitment: "충실하고 지속적", shadow: "소유욕, 변화 거부", ideal: "물질적 안정 공유" },
  Gemini: { partnerNeed: "지적이고 소통 잘하는 파트너", commitment: "유연하고 다양", shadow: "가벼움, 불안정", ideal: "끊임없는 대화" },
  Cancer: { partnerNeed: "돌봐주고 가정적인 파트너", commitment: "보호적, 감정적", shadow: "의존, 과거 집착", ideal: "가정 중심 파트너십" },
  Leo: { partnerNeed: "존경해주고 빛나게 해주는 파트너", commitment: "로맨틱, 드라마틱", shadow: "관심 경쟁", ideal: "서로 빛나게 함" },
  Virgo: { partnerNeed: "실용적이고 성장 지향적 파트너", commitment: "헌신적, 서비스 지향", shadow: "비판, 완벽주의", ideal: "함께 성장" },
  Libra: { partnerNeed: "균형잡히고 공정한 파트너", commitment: "조화롭고 우아", shadow: "우유부단, 갈등 회피", ideal: "평등한 파트너십" },
  Scorpio: { partnerNeed: "깊이 있고 변형적인 파트너", commitment: "강렬하고 충성스러움", shadow: "질투, 통제", ideal: "영혼 수준의 결합" },
  Sagittarius: { partnerNeed: "자유롭고 철학적인 파트너", commitment: "모험적, 성장 지향", shadow: "속박 거부", ideal: "함께 성장하는 여정" },
  Capricorn: { partnerNeed: "야망 있고 책임감 있는 파트너", commitment: "전통적, 장기적", shadow: "일 우선, 감정 억압", ideal: "파워 커플" },
  Aquarius: { partnerNeed: "독특하고 친구 같은 파트너", commitment: "비전통적, 자유로움", shadow: "거리두기", ideal: "우정 기반 결합" },
  Pisces: { partnerNeed: "영적이고 연민 깊은 파트너", commitment: "무조건적, 영적", shadow: "환상, 경계 상실", ideal: "영혼의 합일" },
};

const VESTA_SIGNS: Record<ZodiacKo, { devotion: string; fire: string; work: string; shadow: string }> = {
  Aries: { devotion: "선구적 프로젝트", fire: "행동의 열정", work: "독립적, 개척적", shadow: "소진, 자기 희생" },
  Taurus: { devotion: "물질적 안정, 자연", fire: "감각적 즐거움", work: "꾸준하고 실용적", shadow: "과도한 물질 집착" },
  Gemini: { devotion: "학습, 소통, 글쓰기", fire: "지적 호기심", work: "다재다능, 유연", shadow: "분산, 깊이 부족" },
  Cancer: { devotion: "가정, 가족 돌봄", fire: "가정의 온기", work: "보호적, 양육적", shadow: "자기 희생" },
  Leo: { devotion: "창조적 표현, 자녀", fire: "창조의 빛", work: "열정적, 드라마틱", shadow: "관심 필요" },
  Virgo: { devotion: "서비스, 치유, 완벽", fire: "치유의 불", work: "세심하고 헌신적", shadow: "완벽주의 소진" },
  Libra: { devotion: "관계, 아름다움, 정의", fire: "조화의 불", work: "협력적, 외교적", shadow: "자기 상실" },
  Scorpio: { devotion: "변형, 치유, 신비", fire: "변형의 불", work: "강렬하고 깊이 있음", shadow: "집착, 통제" },
  Sagittarius: { devotion: "진실, 탐험, 교육", fire: "진실의 불", work: "열정적, 이상주의", shadow: "현실 도피" },
  Capricorn: { devotion: "커리어, 전통, 구조", fire: "성취의 불", work: "근면하고 책임감", shadow: "일 중독" },
  Aquarius: { devotion: "인류, 혁신, 커뮤니티", fire: "혁명의 불", work: "독특하고 진보적", shadow: "개인 관계 소홀" },
  Pisces: { devotion: "영성, 예술, 자비", fire: "영적 불", work: "직관적, 창조적", shadow: "경계 상실" },
};

/**
 * 단일 소행성 계산
 */
export function calculateAsteroid(
  jdUT: number,
  asteroidName: AsteroidName,
  houseCusps: number[]
): Asteroid {
  const swisseph = getSwisseph();
  const asteroidId = getAsteroidIds()[asteroidName];
  const result = swisseph.swe_calc_ut(jdUT, asteroidId, swisseph.SEFLG_SPEED);

  if ("error" in result) {
    throw new Error(`Swiss Ephemeris Error for ${asteroidName}: ${result.error}`);
  }

  const longitude = result.longitude;
  const info = formatLongitude(longitude);
  const house = inferHouseOf(longitude, houseCusps);
  const speed = result.speed;
  const retrograde = typeof speed === "number" ? speed < 0 : undefined;

  return {
    name: asteroidName,
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    speed,
    retrograde,
  };
}

/**
 * 모든 4대 소행성 계산
 */
export function calculateAllAsteroids(
  jdUT: number,
  houseCusps: number[]
): Record<AsteroidName, Asteroid> {
  return {
    Ceres: calculateAsteroid(jdUT, "Ceres", houseCusps),
    Pallas: calculateAsteroid(jdUT, "Pallas", houseCusps),
    Juno: calculateAsteroid(jdUT, "Juno", houseCusps),
    Vesta: calculateAsteroid(jdUT, "Vesta", houseCusps),
  };
}

/**
 * 차트에 소행성 추가
 */
export function extendChartWithAsteroids(
  chart: Chart,
  jdUT: number
): ExtendedChartWithAsteroids {
  const houseCusps = chart.houses.map(h => h.cusp);
  const asteroids = calculateAllAsteroids(jdUT, houseCusps);

  return {
    ...chart,
    ceres: asteroids.Ceres,
    pallas: asteroids.Pallas,
    juno: asteroids.Juno,
    vesta: asteroids.Vesta,
  };
}

/**
 * 소행성 해석 생성
 */
export function interpretAsteroid(asteroid: Asteroid): AsteroidInterpretation {
  const { name, sign, house } = asteroid;
  const baseThemes = ASTEROID_THEMES[name].themes;

  const result: AsteroidInterpretation = {
    asteroid: name,
    sign,
    house,
    themes: baseThemes,
    shadow: "",
  };

  switch (name) {
    case "Ceres": {
      const data = CERES_SIGNS[sign];
      result.nurturingStyle = data.nurturing;
      result.shadow = data.wound;
      result.healing = data.healing;
      break;
    }
    case "Pallas": {
      const data = PALLAS_SIGNS[sign];
      result.intelligenceStyle = data.intelligence;
      result.shadow = "패턴에 갇힘";
      break;
    }
    case "Juno": {
      const data = JUNO_SIGNS[sign];
      result.partnerNeed = data.partnerNeed;
      result.shadow = data.shadow;
      break;
    }
    case "Vesta": {
      const data = VESTA_SIGNS[sign];
      result.devotionFocus = data.devotion;
      result.shadow = data.shadow;
      break;
    }
  }

  return result;
}

/**
 * 소행성과 행성 간 애스펙트 찾기
 */
export function findAsteroidAspects(
  asteroid: Asteroid,
  planets: PlanetBase[],
  orbs?: Partial<Record<AspectType, number>>
): AspectHit[] {
  const defaultOrbs: Record<AspectType, number> = {
    conjunction: 6,
    opposition: 6,
    trine: 5,
    square: 5,
    sextile: 4,
    quincunx: 2,
    semisextile: 2,
    quintile: 1,
    biquintile: 1,
  };

  const aspectAngles: Record<AspectType, number> = {
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

  const aspects: AspectHit[] = [];
  const aspectTypes: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

  for (const planet of planets) {
    const diff = angleDiff(asteroid.longitude, planet.longitude);

    for (const aspectType of aspectTypes) {
      const targetAngle = aspectAngles[aspectType];
      const orb = orbs?.[aspectType] ?? defaultOrbs[aspectType];
      const aspectOrb = Math.abs(diff - targetAngle);

      if (aspectOrb <= orb) {
        aspects.push({
          from: {
            name: asteroid.name,
            kind: "natal",
            longitude: asteroid.longitude,
            sign: asteroid.sign,
            house: asteroid.house,
          },
          to: {
            name: planet.name,
            kind: "natal",
            longitude: planet.longitude,
            sign: planet.sign,
            house: planet.house,
          },
          type: aspectType,
          orb: aspectOrb,
          score: 1 - aspectOrb / orb,
        });
      }
    }
  }

  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * 모든 소행성 애스펙트 찾기
 */
export function findAllAsteroidAspects(
  asteroids: Record<AsteroidName, Asteroid>,
  planets: PlanetBase[]
): Record<AsteroidName, AspectHit[]> {
  return {
    Ceres: findAsteroidAspects(asteroids.Ceres, planets),
    Pallas: findAsteroidAspects(asteroids.Pallas, planets),
    Juno: findAsteroidAspects(asteroids.Juno, planets),
    Vesta: findAsteroidAspects(asteroids.Vesta, planets),
  };
}

/**
 * 소행성 기본 정보 가져오기
 */
export function getAsteroidInfo(name: AsteroidName): {
  korean: string;
  symbol: string;
  themes: string[];
  sajuElement: string;
  sajuSipsin: string;
} {
  return ASTEROID_THEMES[name];
}

/**
 * 소행성 시나스트리 분석
 * 두 차트의 소행성 간 애스펙트 분석
 */
export function analyzeAsteroidSynastry(
  asteroidsA: Record<AsteroidName, Asteroid>,
  asteroidsB: Record<AsteroidName, Asteroid>,
  planetsA: PlanetBase[],
  planetsB: PlanetBase[]
): {
  junoConnections: AspectHit[];
  ceresConnections: AspectHit[];
  interpretation: string;
} {
  // Juno 연결 (결혼/파트너십 지표)
  const junoConnections: AspectHit[] = [
    ...findAsteroidAspects(asteroidsA.Juno, planetsB),
    ...findAsteroidAspects(asteroidsB.Juno, planetsA),
  ];

  // Ceres 연결 (양육/돌봄 패턴)
  const ceresConnections: AspectHit[] = [
    ...findAsteroidAspects(asteroidsA.Ceres, planetsB),
    ...findAsteroidAspects(asteroidsB.Ceres, planetsA),
  ];

  let interpretation = "";

  if (junoConnections.some(a => a.type === "conjunction" || a.type === "trine")) {
    interpretation += "강한 결혼/파트너십 연결이 있습니다. ";
  }

  if (ceresConnections.some(a => a.type === "conjunction" || a.type === "trine")) {
    interpretation += "상호 양육과 돌봄의 조화가 있습니다. ";
  }

  if (!interpretation) {
    interpretation = "소행성 시나스트리에서 특별한 연결이 감지되지 않았습니다.";
  }

  return {
    junoConnections: junoConnections.filter(a => a.score && a.score > 0.5),
    ceresConnections: ceresConnections.filter(a => a.score && a.score > 0.5),
    interpretation,
  };
}

/**
 * 소행성 트랜짓 분석
 */
export function analyzeAsteroidTransit(
  natalAsteroids: Record<AsteroidName, Asteroid>,
  transitPlanets: PlanetBase[]
): {
  activeTransits: AspectHit[];
  interpretation: string;
} {
  const allTransits: AspectHit[] = [];

  for (const [name, asteroid] of Object.entries(natalAsteroids)) {
    const transits = findAsteroidAspects(asteroid as Asteroid, transitPlanets);
    allTransits.push(...transits);
  }

  const activeTransits = allTransits.filter(a => a.score && a.score > 0.7);

  let interpretation = "";
  for (const transit of activeTransits.slice(0, 3)) {
    interpretation += `${transit.to.name}이 ${transit.from.name}에 ${transit.type}. `;
  }

  if (!interpretation) {
    interpretation = "현재 활성화된 소행성 트랜짓이 없습니다.";
  }

  return { activeTransits, interpretation };
}
