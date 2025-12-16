// src/lib/astrology/foundation/harmonics.ts
// 하모닉 점성학 - 숨겨진 패턴과 잠재력 분석

import { Chart, PlanetBase, ZodiacKo, AspectHit } from "./types";
import { normalize360, formatLongitude, angleDiff } from "./utils";
import { findAspects } from "./aspects";

export interface HarmonicChart extends Chart {
  harmonicNumber: number;
  chartType: "harmonic";
}

export interface HarmonicAnalysis {
  harmonic: number;
  chart: HarmonicChart;
  strength: number;
  conjunctions: HarmonicConjunction[];
  patterns: HarmonicPattern[];
  interpretation: string;
}

export interface HarmonicConjunction {
  planets: string[];
  averageLongitude: number;
  sign: ZodiacKo;
  orb: number;
  strength: number;
}

export interface HarmonicPattern {
  type: "stellium" | "grand_trine" | "grand_cross" | "t_square" | "yod";
  planets: string[];
  description: string;
}

export interface HarmonicProfile {
  strongestHarmonics: { harmonic: number; strength: number; meaning: string }[];
  weakestHarmonics: { harmonic: number; strength: number; meaning: string }[];
  ageHarmonic: HarmonicAnalysis | null;
  overallInterpretation: string;
}

// 하모닉 의미
const HARMONIC_MEANINGS: Record<number, {
  name: string;
  meaning: string;
  lifeArea: string;
  aspectsEmphasized: string;
  sajuParallel: string;
}> = {
  1: {
    name: "Radical Chart (기본 차트)",
    meaning: "출생 차트 그 자체, 모든 잠재력의 원천",
    lifeArea: "전체적 자아",
    aspectsEmphasized: "모든 애스펙트",
    sajuParallel: "원국(原局)",
  },
  2: {
    name: "Second Harmonic (이중성)",
    meaning: "삶의 이원성, 관계에서의 패턴",
    lifeArea: "파트너십, 대립의 통합",
    aspectsEmphasized: "Opposition (180°)",
    sajuParallel: "충(沖)",
  },
  3: {
    name: "Third Harmonic (창조성)",
    meaning: "기쁨, 창조성, 자기 표현",
    lifeArea: "예술, 즐거움",
    aspectsEmphasized: "Trine (120°)",
    sajuParallel: "삼합(三合)",
  },
  4: {
    name: "Fourth Harmonic (노력과 성취)",
    meaning: "도전, 노력, 물질적 성취",
    lifeArea: "커리어, 야망",
    aspectsEmphasized: "Square (90°)",
    sajuParallel: "형(刑)",
  },
  5: {
    name: "Fifth Harmonic (스타일과 개성)",
    meaning: "개인적 스타일, 창조와 파괴의 힘",
    lifeArea: "권력, 개성 표현",
    aspectsEmphasized: "Quintile (72°)",
    sajuParallel: "오행(五行)",
  },
  7: {
    name: "Seventh Harmonic (영감과 신비)",
    meaning: "영감, 신비적 체험, 직관적 통찰",
    lifeArea: "영성, 비범한 재능",
    aspectsEmphasized: "Septile (51.43°)",
    sajuParallel: "칠살(七殺)",
  },
  8: {
    name: "Eighth Harmonic (변형)",
    meaning: "깊은 변형, 죽음과 재생",
    lifeArea: "위기, 심리적 치유",
    aspectsEmphasized: "Semisquare (45°)",
    sajuParallel: "팔자(八字)",
  },
  9: {
    name: "Ninth Harmonic (지혜와 완성)",
    meaning: "지혜, 완성, 기쁨의 절정",
    lifeArea: "철학, 영적 완성",
    aspectsEmphasized: "Novile (40°)",
    sajuParallel: "구궁(九宮)",
  },
  12: {
    name: "Twelfth Harmonic (희생과 초월)",
    meaning: "희생, 봉사, 카르마 완성",
    lifeArea: "치유, 영적 성장",
    aspectsEmphasized: "Semisextile (30°)",
    sajuParallel: "십이운성",
  },
};

/**
 * 하모닉 차트 계산
 * @param natalChart 출생 차트
 * @param harmonic 하모닉 숫자 (1-144)
 */
export function calculateHarmonicChart(natalChart: Chart, harmonic: number): HarmonicChart {
  if (harmonic < 1 || harmonic > 144) {
    throw new Error("Harmonic must be between 1 and 144");
  }

  // 모든 행성 위치에 하모닉 숫자 곱하기
  const harmonicPlanets: PlanetBase[] = natalChart.planets.map(planet => {
    const harmonicLongitude = normalize360(planet.longitude * harmonic);
    const info = formatLongitude(harmonicLongitude);
    return {
      ...planet,
      longitude: harmonicLongitude,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      formatted: info.formatted,
    };
  });

  // ASC, MC도 변환
  const harmonicASC = normalize360(natalChart.ascendant.longitude * harmonic);
  const ascInfo = formatLongitude(harmonicASC);
  const harmonicAscendant: PlanetBase = {
    ...natalChart.ascendant,
    longitude: harmonicASC,
    sign: ascInfo.sign,
    degree: ascInfo.degree,
    minute: ascInfo.minute,
    formatted: ascInfo.formatted,
  };

  const harmonicMCLon = normalize360(natalChart.mc.longitude * harmonic);
  const mcInfo = formatLongitude(harmonicMCLon);
  const harmonicMC: PlanetBase = {
    ...natalChart.mc,
    longitude: harmonicMCLon,
    sign: mcInfo.sign,
    degree: mcInfo.degree,
    minute: mcInfo.minute,
    formatted: mcInfo.formatted,
  };

  // 하우스 커스프도 변환
  const harmonicHouses = natalChart.houses.map(house => {
    const harmonicCusp = normalize360(house.cusp * harmonic);
    const hInfo = formatLongitude(harmonicCusp);
    return {
      ...house,
      cusp: harmonicCusp,
      sign: hInfo.sign,
      formatted: hInfo.formatted,
    };
  });

  return {
    planets: harmonicPlanets,
    ascendant: harmonicAscendant,
    mc: harmonicMC,
    houses: harmonicHouses,
    harmonicNumber: harmonic,
    chartType: "harmonic",
  };
}

/**
 * 하모닉 차트에서 컨정션 찾기
 */
export function findHarmonicConjunctions(chart: HarmonicChart, orb: number = 10): HarmonicConjunction[] {
  const conjunctions: HarmonicConjunction[] = [];
  const planets = [...chart.planets, chart.ascendant, chart.mc];
  const used = new Set<string>();

  for (let i = 0; i < planets.length; i++) {
    if (used.has(planets[i].name)) continue;

    const group: PlanetBase[] = [planets[i]];
    used.add(planets[i].name);

    for (let j = i + 1; j < planets.length; j++) {
      if (used.has(planets[j].name)) continue;

      const diff = angleDiff(planets[i].longitude, planets[j].longitude);
      if (diff <= orb) {
        group.push(planets[j]);
        used.add(planets[j].name);
      }
    }

    if (group.length >= 2) {
      const avgLongitude = normalize360(
        group.reduce((sum, p) => sum + p.longitude, 0) / group.length
      );
      const info = formatLongitude(avgLongitude);
      const maxOrb = Math.max(
        ...group.map(p => angleDiff(p.longitude, avgLongitude))
      );

      conjunctions.push({
        planets: group.map(p => p.name),
        averageLongitude: avgLongitude,
        sign: info.sign,
        orb: maxOrb,
        strength: 1 - maxOrb / orb,
      });
    }
  }

  return conjunctions.sort((a, b) => b.strength - a.strength);
}

/**
 * 하모닉 차트에서 패턴 찾기
 */
export function findHarmonicPatterns(chart: HarmonicChart): HarmonicPattern[] {
  const patterns: HarmonicPattern[] = [];
  const conjunctions = findHarmonicConjunctions(chart);

  // 스텔리움 (3개 이상 컨정션)
  for (const conj of conjunctions) {
    if (conj.planets.length >= 3) {
      patterns.push({
        type: "stellium",
        planets: conj.planets,
        description: `스텔리움 in ${conj.sign} - 강력한 에너지 집중`,
      });
    }
  }

  // 그랜드 트라인, T-스퀘어 등은 기본 애스펙트 분석 사용
  const aspects = findAspects(chart, chart);

  // 간소화된 패턴 감지 (실제로는 더 복잡한 로직 필요)
  const trines = aspects.filter(a => a.type === "trine");
  const squares = aspects.filter(a => a.type === "square");

  if (trines.length >= 3) {
    const trineGroups = groupAspectsByPlanets(trines);
    for (const group of trineGroups) {
      if (group.length >= 3) {
        const planetNames = [...new Set(group.flatMap(a => [a.from.name, a.to.name]))];
        if (planetNames.length >= 3) {
          patterns.push({
            type: "grand_trine",
            planets: planetNames.slice(0, 3),
            description: "그랜드 트라인 - 재능의 자연스러운 흐름",
          });
        }
      }
    }
  }

  if (squares.length >= 4) {
    const squareGroups = groupAspectsByPlanets(squares);
    for (const group of squareGroups) {
      if (group.length >= 4) {
        const planetNames = [...new Set(group.flatMap(a => [a.from.name, a.to.name]))];
        if (planetNames.length >= 4) {
          patterns.push({
            type: "grand_cross",
            planets: planetNames.slice(0, 4),
            description: "그랜드 크로스 - 강력한 성취 동력과 도전",
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * 하모닉 분석 수행
 */
export function analyzeHarmonic(natalChart: Chart, harmonic: number): HarmonicAnalysis {
  const chart = calculateHarmonicChart(natalChart, harmonic);
  const conjunctions = findHarmonicConjunctions(chart);
  const patterns = findHarmonicPatterns(chart);

  // 강도 계산 (컨정션과 패턴 수 기반)
  const conjunctionStrength = conjunctions.reduce((sum, c) => sum + c.strength * c.planets.length, 0);
  const patternStrength = patterns.length * 2;
  const strength = Math.min(100, (conjunctionStrength + patternStrength) * 10);

  const meaning = HARMONIC_MEANINGS[harmonic] || {
    name: `H${harmonic}`,
    meaning: `하모닉 ${harmonic}`,
    lifeArea: "특수 패턴",
    aspectsEmphasized: "",
    sajuParallel: "",
  };

  let interpretation = `H${harmonic} (${meaning.name}): `;
  if (strength > 70) {
    interpretation += `매우 강함 - ${meaning.meaning}이 인생의 핵심 영역`;
  } else if (strength > 40) {
    interpretation += `보통 - ${meaning.meaning}이 적절히 발현`;
  } else {
    interpretation += `약함 - ${meaning.meaning}의 개발이 필요`;
  }

  if (patterns.length > 0) {
    interpretation += `. 주요 패턴: ${patterns.map(p => p.type).join(", ")}`;
  }

  return {
    harmonic,
    chart,
    strength,
    conjunctions,
    patterns,
    interpretation,
  };
}

/**
 * 나이 하모닉 분석
 * 현재 나이에 해당하는 하모닉 차트 분석
 */
export function analyzeAgeHarmonic(natalChart: Chart, age: number): HarmonicAnalysis {
  return analyzeHarmonic(natalChart, age);
}

/**
 * 전체 하모닉 프로필 생성
 */
export function generateHarmonicProfile(natalChart: Chart, currentAge?: number): HarmonicProfile {
  const primaryHarmonics = [2, 3, 4, 5, 7, 8, 9, 12];
  const analyses = primaryHarmonics.map(h => analyzeHarmonic(natalChart, h));

  // 강도 기준 정렬
  const sortedByStrength = [...analyses].sort((a, b) => b.strength - a.strength);

  const strongestHarmonics = sortedByStrength.slice(0, 3).map(a => ({
    harmonic: a.harmonic,
    strength: a.strength,
    meaning: HARMONIC_MEANINGS[a.harmonic]?.meaning || `H${a.harmonic}`,
  }));

  const weakestHarmonics = sortedByStrength.slice(-3).reverse().map(a => ({
    harmonic: a.harmonic,
    strength: a.strength,
    meaning: HARMONIC_MEANINGS[a.harmonic]?.meaning || `H${a.harmonic}`,
  }));

  const ageHarmonic = currentAge ? analyzeAgeHarmonic(natalChart, currentAge) : null;

  // 전체 해석 생성
  let interpretation = `하모닉 프로필 분석:\n\n`;
  interpretation += `가장 강한 하모닉: H${strongestHarmonics[0].harmonic} (${strongestHarmonics[0].meaning})\n`;
  interpretation += `이 영역에서 타고난 재능과 자연스러운 흐름이 있습니다.\n\n`;
  interpretation += `개발이 필요한 영역: H${weakestHarmonics[0].harmonic} (${weakestHarmonics[0].meaning})\n`;
  interpretation += `의식적인 노력으로 이 영역을 강화할 수 있습니다.\n`;

  if (ageHarmonic) {
    interpretation += `\n현재 나이 하모닉 (H${currentAge}): `;
    interpretation += ageHarmonic.strength > 50 ? "활성화된 해입니다." : "잠재적 성장의 해입니다.";
  }

  return {
    strongestHarmonics,
    weakestHarmonics,
    ageHarmonic,
    overallInterpretation: interpretation,
  };
}

/**
 * 특정 애스펙트 시리즈 하모닉 분석
 * (예: 퀸타일 시리즈 = H5, 셉타일 시리즈 = H7)
 */
export function analyzeAspectSeriesHarmonic(
  natalChart: Chart,
  aspectSeries: "quintile" | "septile" | "novile"
): HarmonicAnalysis {
  const harmonicMap = {
    quintile: 5,
    septile: 7,
    novile: 9,
  };

  return analyzeHarmonic(natalChart, harmonicMap[aspectSeries]);
}

/**
 * 하모닉 의미 가져오기
 */
export function getHarmonicMeaning(harmonic: number): {
  name: string;
  meaning: string;
  lifeArea: string;
  aspectsEmphasized: string;
  sajuParallel: string;
} {
  if (HARMONIC_MEANINGS[harmonic]) {
    return HARMONIC_MEANINGS[harmonic];
  }

  // 복합 하모닉 해석
  const factors = factorize(harmonic);
  if (factors.length > 1) {
    const meanings = factors
      .filter(f => HARMONIC_MEANINGS[f])
      .map(f => HARMONIC_MEANINGS[f].meaning);

    return {
      name: `H${harmonic} (${factors.join("×")})`,
      meaning: meanings.join(" + ") || `복합 하모닉 ${harmonic}`,
      lifeArea: "복합 영역",
      aspectsEmphasized: "",
      sajuParallel: "",
    };
  }

  return {
    name: `H${harmonic}`,
    meaning: `하모닉 ${harmonic}`,
    lifeArea: "특수 패턴",
    aspectsEmphasized: "",
    sajuParallel: "",
  };
}

// --- 헬퍼 함수들 ---

function groupAspectsByPlanets(aspects: AspectHit[]): AspectHit[][] {
  // 간소화된 그룹화 - 실제로는 그래프 알고리즘 필요
  const groups: AspectHit[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < aspects.length; i++) {
    if (used.has(i)) continue;

    const group: AspectHit[] = [aspects[i]];
    used.add(i);

    for (let j = i + 1; j < aspects.length; j++) {
      if (used.has(j)) continue;

      const planets1 = [aspects[i].from.name, aspects[i].to.name];
      const planets2 = [aspects[j].from.name, aspects[j].to.name];

      if (planets1.some(p => planets2.includes(p))) {
        group.push(aspects[j]);
        used.add(j);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

function factorize(n: number): number[] {
  const factors: number[] = [];
  let divisor = 2;

  while (n > 1) {
    while (n % divisor === 0) {
      factors.push(divisor);
      n /= divisor;
    }
    divisor++;
  }

  return factors;
}
