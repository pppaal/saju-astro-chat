// src/lib/astrology/foundation/eclipses.ts
// 이클립스 (Eclipse) 영향 계산

import { Chart, PlanetBase, ZodiacKo } from "./types";
import { normalize360, angleDiff, formatLongitude, ZODIAC_SIGNS } from "./utils";

export interface Eclipse {
  type: "solar" | "lunar";
  date: string;           // ISO date
  longitude: number;      // 이클립스 발생 경도
  sign: ZodiacKo;
  degree: number;
  description: string;
}

export interface EclipseImpact {
  eclipse: Eclipse;
  affectedPoint: string;  // 영향받는 행성/포인트
  aspectType: "conjunction" | "opposition" | "square";
  orb: number;
  house: number;          // 이클립스가 떨어지는 하우스
  interpretation: string;
}

// 2020-2030 이클립스 데이터 (주요 이클립스)
const ECLIPSES: Eclipse[] = [
  // 2020
  { type: "lunar", date: "2020-01-10", longitude: 290.08, sign: "Capricorn", degree: 20, description: "2020년 1월 반영월식" },
  { type: "lunar", date: "2020-06-05", longitude: 255.68, sign: "Sagittarius", degree: 15, description: "2020년 6월 반영월식" },
  { type: "solar", date: "2020-06-21", longitude: 90.22, sign: "Cancer", degree: 0, description: "2020년 6월 금환일식" },
  { type: "lunar", date: "2020-07-05", longitude: 283.53, sign: "Capricorn", degree: 13, description: "2020년 7월 반영월식" },
  { type: "lunar", date: "2020-11-30", longitude: 68.28, sign: "Gemini", degree: 8, description: "2020년 11월 반영월식" },
  { type: "solar", date: "2020-12-14", longitude: 263.34, sign: "Sagittarius", degree: 23, description: "2020년 12월 개기일식" },
  // 2021
  { type: "lunar", date: "2021-05-26", longitude: 65.14, sign: "Sagittarius", degree: 5, description: "2021년 5월 개기월식" },
  { type: "solar", date: "2021-06-10", longitude: 79.64, sign: "Gemini", degree: 19, description: "2021년 6월 금환일식" },
  { type: "lunar", date: "2021-11-19", longitude: 57.22, sign: "Taurus", degree: 27, description: "2021년 11월 부분월식" },
  { type: "solar", date: "2021-12-04", longitude: 252.17, sign: "Sagittarius", degree: 12, description: "2021년 12월 개기일식" },
  // 2022
  { type: "solar", date: "2022-04-30", longitude: 40.17, sign: "Taurus", degree: 10, description: "2022년 4월 부분일식" },
  { type: "lunar", date: "2022-05-16", longitude: 235.70, sign: "Scorpio", degree: 25, description: "2022년 5월 개기월식" },
  { type: "solar", date: "2022-10-25", longitude: 212.00, sign: "Scorpio", degree: 2, description: "2022년 10월 부분일식" },
  { type: "lunar", date: "2022-11-08", longitude: 46.02, sign: "Taurus", degree: 16, description: "2022년 11월 개기월식" },
  // 2023
  { type: "solar", date: "2023-04-20", longitude: 29.88, sign: "Aries", degree: 29, description: "2023년 4월 혼성일식" },
  { type: "lunar", date: "2023-05-05", longitude: 224.59, sign: "Scorpio", degree: 14, description: "2023년 5월 반영월식" },
  { type: "solar", date: "2023-10-14", longitude: 201.08, sign: "Libra", degree: 21, description: "2023년 10월 금환일식" },
  { type: "lunar", date: "2023-10-28", longitude: 35.07, sign: "Taurus", degree: 5, description: "2023년 10월 부분월식" },
  // 2024
  { type: "lunar", date: "2024-03-25", longitude: 185.07, sign: "Libra", degree: 5, description: "2024년 3월 반영월식" },
  { type: "solar", date: "2024-04-08", longitude: 19.22, sign: "Aries", degree: 19, description: "2024년 4월 개기일식" },
  { type: "lunar", date: "2024-09-18", longitude: 355.59, sign: "Pisces", degree: 25, description: "2024년 9월 부분월식" },
  { type: "solar", date: "2024-10-02", longitude: 190.13, sign: "Libra", degree: 10, description: "2024년 10월 금환일식" },
  // 2025
  { type: "lunar", date: "2025-03-14", longitude: 173.88, sign: "Virgo", degree: 24, description: "2025년 3월 개기월식" },
  { type: "solar", date: "2025-03-29", longitude: 9.00, sign: "Aries", degree: 9, description: "2025년 3월 부분일식" },
  { type: "lunar", date: "2025-09-07", longitude: 345.25, sign: "Pisces", degree: 15, description: "2025년 9월 개기월식" },
  { type: "solar", date: "2025-09-21", longitude: 178.62, sign: "Virgo", degree: 29, description: "2025년 9월 부분일식" },
  // 2026
  { type: "lunar", date: "2026-03-03", longitude: 162.77, sign: "Virgo", degree: 13, description: "2026년 3월 개기월식" },
  { type: "solar", date: "2026-03-17", longitude: 357.12, sign: "Pisces", degree: 27, description: "2026년 3월 부분일식" },
  { type: "solar", date: "2026-08-12", longitude: 139.95, sign: "Leo", degree: 20, description: "2026년 8월 개기일식" },
  { type: "lunar", date: "2026-08-28", longitude: 334.72, sign: "Pisces", degree: 5, description: "2026년 8월 부분월식" },
  // 2027
  { type: "lunar", date: "2027-02-20", longitude: 152.33, sign: "Leo", degree: 2, description: "2027년 2월 반영월식" },
  { type: "solar", date: "2027-02-06", longitude: 317.65, sign: "Aquarius", degree: 17, description: "2027년 2월 금환일식" },
  { type: "solar", date: "2027-08-02", longitude: 130.12, sign: "Leo", degree: 10, description: "2027년 8월 개기일식" },
  { type: "lunar", date: "2027-08-17", longitude: 324.48, sign: "Aquarius", degree: 24, description: "2027년 8월 부분월식" },
  // 2028
  { type: "solar", date: "2028-01-26", longitude: 306.88, sign: "Aquarius", degree: 6, description: "2028년 1월 금환일식" },
  { type: "lunar", date: "2028-02-11", longitude: 142.12, sign: "Leo", degree: 22, description: "2028년 2월 반영월식" },
  { type: "solar", date: "2028-07-22", longitude: 119.97, sign: "Cancer", degree: 29, description: "2028년 7월 개기일식" },
  { type: "lunar", date: "2028-08-06", longitude: 313.65, sign: "Aquarius", degree: 13, description: "2028년 8월 부분월식" },
  { type: "lunar", date: "2028-12-31", longitude: 100.55, sign: "Cancer", degree: 10, description: "2028년 12월 개기월식" },
  // 2029
  { type: "solar", date: "2029-01-14", longitude: 294.52, sign: "Capricorn", degree: 24, description: "2029년 1월 부분일식" },
  { type: "lunar", date: "2029-06-26", longitude: 275.18, sign: "Capricorn", degree: 5, description: "2029년 6월 개기월식" },
  { type: "solar", date: "2029-07-11", longitude: 109.25, sign: "Cancer", degree: 19, description: "2029년 7월 부분일식" },
  { type: "lunar", date: "2029-12-20", longitude: 89.08, sign: "Gemini", degree: 29, description: "2029년 12월 개기월식" },
  // 2030
  { type: "solar", date: "2030-01-01", longitude: 280.82, sign: "Capricorn", degree: 10, description: "2030년 1월 부분일식" },
  { type: "solar", date: "2030-06-01", longitude: 71.12, sign: "Gemini", degree: 11, description: "2030년 6월 금환일식" },
  { type: "lunar", date: "2030-06-15", longitude: 264.33, sign: "Sagittarius", degree: 24, description: "2030년 6월 부분월식" },
  { type: "solar", date: "2030-11-25", longitude: 243.67, sign: "Sagittarius", degree: 3, description: "2030년 11월 개기일식" },
  { type: "lunar", date: "2030-12-09", longitude: 77.55, sign: "Gemini", degree: 17, description: "2030년 12월 반영월식" },
];

/**
 * 이클립스가 차트에 미치는 영향 찾기
 */
export function findEclipseImpact(
  chart: Chart,
  eclipses: Eclipse[] = ECLIPSES,
  orb: number = 3.0
): EclipseImpact[] {
  const impacts: EclipseImpact[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const eclipse of eclipses) {
    // 이클립스가 떨어지는 하우스 찾기
    let eclipseHouse = 1;
    for (let i = 0; i < 12; i++) {
      const nextI = (i + 1) % 12;
      let cusp = chart.houses[i].cusp;
      let nextCusp = chart.houses[nextI].cusp;

      if (nextCusp < cusp) nextCusp += 360;
      let testLon = eclipse.longitude;
      if (testLon < cusp) testLon += 360;

      if (testLon >= cusp && testLon < nextCusp) {
        eclipseHouse = i + 1;
        break;
      }
    }

    for (const point of allPoints) {
      const diff = angleDiff(point.longitude, eclipse.longitude);

      // Conjunction
      if (diff <= orb) {
        impacts.push({
          eclipse,
          affectedPoint: point.name,
          aspectType: "conjunction",
          orb: diff,
          house: eclipseHouse,
          interpretation: getEclipseInterpretation(eclipse, point.name, "conjunction", eclipseHouse),
        });
      }
      // Opposition
      else if (Math.abs(diff - 180) <= orb) {
        impacts.push({
          eclipse,
          affectedPoint: point.name,
          aspectType: "opposition",
          orb: Math.abs(diff - 180),
          house: eclipseHouse,
          interpretation: getEclipseInterpretation(eclipse, point.name, "opposition", eclipseHouse),
        });
      }
      // Square
      else if (Math.abs(diff - 90) <= orb) {
        impacts.push({
          eclipse,
          affectedPoint: point.name,
          aspectType: "square",
          orb: Math.abs(diff - 90),
          house: eclipseHouse,
          interpretation: getEclipseInterpretation(eclipse, point.name, "square", eclipseHouse),
        });
      }
    }
  }

  return impacts.sort((a, b) => a.orb - b.orb);
}

/**
 * 이클립스 해석 생성
 */
function getEclipseInterpretation(
  eclipse: Eclipse,
  planet: string,
  aspect: "conjunction" | "opposition" | "square",
  house: number
): string {
  const eclipseType = eclipse.type === "solar" ? "일식" : "월식";
  const aspectKo = aspect === "conjunction" ? "합" : aspect === "opposition" ? "충" : "사각";

  const baseInterpretation = `${eclipse.date}의 ${eclipseType}이 ${house}하우스에서 ${planet}와(과) ${aspectKo}을 이룹니다.`;

  const planetMeanings: Record<string, string> = {
    Sun: "정체성과 자아의식에 중요한 변화의 시기",
    Moon: "감정과 내면 세계에 깊은 변형의 시기",
    Mercury: "소통, 학습, 이동에 관한 중요한 사건",
    Venus: "사랑, 관계, 가치관에 관한 전환점",
    Mars: "에너지, 야망, 행동력에 관한 중요한 시기",
    Jupiter: "확장, 성장, 기회에 관한 중요한 문",
    Saturn: "책임, 구조, 장기 목표에 관한 전환점",
    Uranus: "갑작스러운 변화와 혁명적 전환",
    Neptune: "영적 각성 또는 혼란의 시기",
    Pluto: "깊은 변형과 재탄생의 시기",
    Ascendant: "자아 이미지와 삶의 방향에 중요한 변화",
    MC: "커리어와 사회적 위치에 중요한 전환점",
    "True Node": "운명적 전환점, 삶의 방향에 관한 중요한 시기",
  };

  const meaning = planetMeanings[planet] || "중요한 변화의 시기";

  return `${baseInterpretation} ${meaning}.`;
}

/**
 * 특정 기간의 이클립스 가져오기
 */
export function getEclipsesBetween(
  startDate: string,
  endDate: string
): Eclipse[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return ECLIPSES.filter((eclipse) => {
    const eclipseDate = new Date(eclipse.date);
    return eclipseDate >= start && eclipseDate <= end;
  });
}

/**
 * 다가오는 이클립스 가져오기
 */
export function getUpcomingEclipses(
  count: number = 4,
  fromDate: Date = new Date()
): Eclipse[] {
  return ECLIPSES.filter((eclipse) => new Date(eclipse.date) >= fromDate)
    .slice(0, count);
}

/**
 * 특정 사인의 이클립스 가져오기
 */
export function getEclipsesInSign(sign: ZodiacKo): Eclipse[] {
  return ECLIPSES.filter((eclipse) => eclipse.sign === sign);
}

/**
 * 이클립스 축(Eclipse Axis) 분석
 * 이클립스는 항상 반대 사인 축에서 발생합니다.
 */
export function getEclipseAxis(eclipse: Eclipse): {
  primary: ZodiacKo;
  opposite: ZodiacKo;
} {
  const signIndex = ZODIAC_SIGNS.indexOf(eclipse.sign);
  const oppositeIndex = (signIndex + 6) % 12;

  return {
    primary: eclipse.sign,
    opposite: ZODIAC_SIGNS[oppositeIndex],
  };
}

/**
 * 차트에서 이클립스 시즌 민감도 확인
 * 노드 축 근처에 행성이 있으면 이클립스에 더 민감합니다.
 */
export function checkEclipseSensitivity(
  chart: Chart,
  orb: number = 5
): {
  sensitive: boolean;
  sensitivePoints: string[];
  nodeSign: ZodiacKo | null;
} {
  const node = chart.planets.find((p) => p.name === "True Node");
  if (!node) {
    return { sensitive: false, sensitivePoints: [], nodeSign: null };
  }

  const sensitivePoints: string[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const point of allPoints) {
    if (point.name === "True Node") continue;

    const diff = angleDiff(point.longitude, node.longitude);
    // 노드와 합 또는 충
    if (diff <= orb || Math.abs(diff - 180) <= orb) {
      sensitivePoints.push(point.name);
    }
  }

  return {
    sensitive: sensitivePoints.length > 0,
    sensitivePoints,
    nodeSign: node.sign,
  };
}

/**
 * 모든 이클립스 데이터 가져오기
 */
export function getAllEclipses(): Eclipse[] {
  return [...ECLIPSES];
}
