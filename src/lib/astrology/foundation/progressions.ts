// src/lib/astrology/foundation/progressions.ts
// Secondary Progressions & Solar Arc Directions 계산

import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const swisseph = require("swisseph");

import { ProgressedChart, ProgressionInput, NatalInput, PlanetBase, House } from "./types";
import { formatLongitude, normalize360 } from "./utils";
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from "./houses";

const PLANET_LIST = {
  Sun: swisseph.SE_SUN,
  Moon: swisseph.SE_MOON,
  Mercury: swisseph.SE_MERCURY,
  Venus: swisseph.SE_VENUS,
  Mars: swisseph.SE_MARS,
  Jupiter: swisseph.SE_JUPITER,
  Saturn: swisseph.SE_SATURN,
  Uranus: swisseph.SE_URANUS,
  Neptune: swisseph.SE_NEPTUNE,
  Pluto: swisseph.SE_PLUTO,
  "True Node": swisseph.SE_TRUE_NODE,
};

const SW_FLAGS = swisseph.SEFLG_SPEED;

let EPHE_PATH_SET = false;
function ensureEphePath() {
  if (!EPHE_PATH_SET) {
    const ephePath = path.join(process.cwd(), "public", "ephe");
    swisseph.swe_set_ephe_path(ephePath);
    EPHE_PATH_SET = true;
  }
}

/**
 * 출생일시를 Julian Day로 변환
 */
function natalToJD(natal: NatalInput): number {
  const pad = (v: number) => String(v).padStart(2, "0");
  const local = dayjs.tz(
    `${natal.year}-${pad(natal.month)}-${pad(natal.date)}T${pad(natal.hour)}:${pad(natal.minute)}:00`,
    natal.timeZone
  );
  if (!local.isValid()) throw new Error("Invalid natal datetime");
  const utcDate = local.utc().toDate();

  const jdResult = swisseph.swe_utc_to_jd(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
    swisseph.SE_GREG_CAL
  );

  if ("error" in jdResult) throw new Error(`JD conversion error: ${jdResult.error}`);
  return jdResult.julianDayUT;
}

/**
 * Secondary Progressions (2차 진행법)
 * 1일 = 1년 원리
 * 출생 후 N년 = 출생일로부터 N일 후의 차트
 */
export async function calculateSecondaryProgressions(
  input: ProgressionInput
): Promise<ProgressedChart> {
  ensureEphePath();

  const { natal, targetDate } = input;

  // 출생일과 목표일 사이의 년수 계산
  const natalDate = dayjs.tz(
    `${natal.year}-${String(natal.month).padStart(2, "0")}-${String(natal.date).padStart(2, "0")}`,
    natal.timeZone
  );
  const target = dayjs(targetDate);
  const yearsProgressed = target.diff(natalDate, "year", true);

  // 1년 = 1일이므로, 진행된 년수 = 진행된 일수
  const daysProgressed = yearsProgressed;

  // 출생 JD + 진행된 일수
  const natalJD = natalToJD(natal);
  const progressedJD = natalJD + daysProgressed;

  // 진행된 날짜의 하우스 계산 (출생지 기준)
  const housesRes = calcHouses(progressedJD, natal.latitude, natal.longitude, "Placidus");
  const ascendantInfo = formatLongitude(housesRes.ascendant);
  const mcInfo = formatLongitude(housesRes.mc);

  // 진행된 행성 위치 계산
  const planets: PlanetBase[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const res = swisseph.swe_calc_ut(progressedJD, planetId, SW_FLAGS);
    if ("error" in res) throw new Error(`Progression calc error for ${name}: ${res.error}`);

    const longitude = res.longitude;
    const info = formatLongitude(longitude);
    const house = inferHouseOf(longitude, housesRes.house);
    const speed = res.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;

    return { name, longitude, ...info, house, speed, retrograde };
  });

  // 진행된 날짜 계산
  const progressedDate = natalDate.add(daysProgressed, "day").format("YYYY-MM-DD");

  return {
    planets,
    ascendant: {
      name: "Ascendant",
      longitude: housesRes.ascendant,
      ...ascendantInfo,
      house: 1,
    },
    mc: {
      name: "MC",
      longitude: housesRes.mc,
      ...mcInfo,
      house: 10,
    },
    houses: mapHouseCupsFormatted(housesRes.house),
    progressionType: "secondary",
    yearsProgressed: Number(yearsProgressed.toFixed(2)),
    progressedDate,
  };
}

/**
 * Solar Arc Directions (태양호 진행법)
 * 모든 행성이 태양의 진행 속도만큼 이동
 * 태양이 1년에 약 1도 이동 → 모든 행성도 1도씩 이동
 */
export async function calculateSolarArcDirections(
  input: ProgressionInput
): Promise<ProgressedChart> {
  ensureEphePath();

  const { natal, targetDate } = input;

  // 출생일과 목표일 사이의 년수
  const natalDate = dayjs.tz(
    `${natal.year}-${String(natal.month).padStart(2, "0")}-${String(natal.date).padStart(2, "0")}`,
    natal.timeZone
  );
  const target = dayjs(targetDate);
  const yearsProgressed = target.diff(natalDate, "year", true);

  // 출생 차트의 태양 위치 구하기
  const natalJD = natalToJD(natal);

  // Secondary Progression으로 태양의 진행 위치 계산
  const progressedJD = natalJD + yearsProgressed; // 1일 = 1년
  const progressedSunRes = swisseph.swe_calc_ut(progressedJD, swisseph.SE_SUN, SW_FLAGS);
  if ("error" in progressedSunRes) throw new Error(`Solar Arc Sun error: ${progressedSunRes.error}`);

  const natalSunRes = swisseph.swe_calc_ut(natalJD, swisseph.SE_SUN, SW_FLAGS);
  if ("error" in natalSunRes) throw new Error(`Natal Sun error: ${natalSunRes.error}`);

  // Solar Arc = 진행된 태양 - 출생 태양
  const solarArc = normalize360(progressedSunRes.longitude - natalSunRes.longitude);

  // 출생 하우스 (출생지 기준)
  const housesRes = calcHouses(natalJD, natal.latitude, natal.longitude, "Placidus");

  // 모든 행성에 Solar Arc 적용
  const planets: PlanetBase[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const natalRes = swisseph.swe_calc_ut(natalJD, planetId, SW_FLAGS);
    if ("error" in natalRes) throw new Error(`Solar Arc calc error for ${name}: ${natalRes.error}`);

    // Solar Arc Direction: 출생 위치 + Solar Arc
    const directedLon = normalize360(natalRes.longitude + solarArc);
    const info = formatLongitude(directedLon);
    const house = inferHouseOf(directedLon, housesRes.house);
    const speed = natalRes.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;

    return { name, longitude: directedLon, ...info, house, speed, retrograde };
  });

  // ASC와 MC도 Solar Arc 적용
  const directedAsc = normalize360(housesRes.ascendant + solarArc);
  const directedMC = normalize360(housesRes.mc + solarArc);
  const ascInfo = formatLongitude(directedAsc);
  const mcInfo = formatLongitude(directedMC);

  return {
    planets,
    ascendant: {
      name: "Ascendant",
      longitude: directedAsc,
      ...ascInfo,
      house: 1,
    },
    mc: {
      name: "MC",
      longitude: directedMC,
      ...mcInfo,
      house: 10,
    },
    houses: mapHouseCupsFormatted(housesRes.house),
    progressionType: "solarArc",
    yearsProgressed: Number(yearsProgressed.toFixed(2)),
    progressedDate: targetDate,
  };
}

/**
 * 진행된 달의 위상 (Progressed Moon Phase)
 * 진행 차트에서 가장 중요한 요소 중 하나
 */
export function getProgressedMoonPhase(
  progressedSunLon: number,
  progressedMoonLon: number
): {
  phase: string;
  angle: number;
  description: string;
} {
  const angle = normalize360(progressedMoonLon - progressedSunLon);

  if (angle < 45) {
    return {
      phase: "New Moon",
      angle,
      description: "새로운 시작의 시기. 새로운 프로젝트, 관계, 방향을 시작하기 좋은 때."
    };
  } else if (angle < 90) {
    return {
      phase: "Crescent",
      angle,
      description: "성장과 도전의 시기. 장애물을 극복하며 전진해야 할 때."
    };
  } else if (angle < 135) {
    return {
      phase: "First Quarter",
      angle,
      description: "행동과 결단의 시기. 위기를 통해 성장하는 때."
    };
  } else if (angle < 180) {
    return {
      phase: "Gibbous",
      angle,
      description: "개선과 분석의 시기. 세부사항을 다듬고 완성도를 높이는 때."
    };
  } else if (angle < 225) {
    return {
      phase: "Full Moon",
      angle,
      description: "결실과 인식의 시기. 성취를 경험하고 관계에서 통찰을 얻는 때."
    };
  } else if (angle < 270) {
    return {
      phase: "Disseminating",
      angle,
      description: "나눔과 전파의 시기. 배운 것을 다른 이들과 나누는 때."
    };
  } else if (angle < 315) {
    return {
      phase: "Last Quarter",
      angle,
      description: "재평가와 전환의 시기. 오래된 것을 버리고 새로운 의식으로 나아가는 때."
    };
  } else {
    return {
      phase: "Balsamic",
      angle,
      description: "휴식과 성찰의 시기. 한 사이클이 끝나고 새 사이클을 준비하는 때."
    };
  }
}

/**
 * 진행 차트 요약 정보
 */
export function getProgressionSummary(progressedChart: ProgressedChart): {
  type: string;
  years: number;
  keySigns: { sun: string; moon: string; asc: string };
  moonPhase?: ReturnType<typeof getProgressedMoonPhase>;
} {
  const sun = progressedChart.planets.find(p => p.name === "Sun");
  const moon = progressedChart.planets.find(p => p.name === "Moon");

  const summary = {
    type: progressedChart.progressionType === "secondary" ? "2차 진행법" : "태양호 진행법",
    years: progressedChart.yearsProgressed,
    keySigns: {
      sun: sun?.sign || "Unknown",
      moon: moon?.sign || "Unknown",
      asc: progressedChart.ascendant.sign,
    },
    moonPhase: sun && moon
      ? getProgressedMoonPhase(sun.longitude, moon.longitude)
      : undefined,
  };

  return summary;
}

// ======================================================
// Progressed Aspects 계산
// ======================================================

import { AspectHit, AspectType, Chart } from "./types";
import { angleDiff } from "./utils";

export interface ProgressedAspect extends AspectHit {
  progressedPlanet: string;
  natalPoint: string;
  aspectNature: "harmonious" | "challenging" | "neutral";
}

const PROGRESSED_ASPECT_ANGLES: Record<AspectType, number> = {
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

// 진행 애스펙트는 매우 타이트한 오브 (1도 = 1년)
const PROGRESSED_ORBS: Record<AspectType, number> = {
  conjunction: 1.5,
  opposition: 1.5,
  trine: 1.0,
  square: 1.0,
  sextile: 1.0,
  quincunx: 0.5,
  semisextile: 0.5,
  quintile: 0.5,
  biquintile: 0.5,
};

const HARMONIOUS_ASPECTS: AspectType[] = ["trine", "sextile", "quintile", "biquintile"];
const CHALLENGING_ASPECTS: AspectType[] = ["square", "opposition", "quincunx"];

/**
 * 진행 차트와 네이탈 차트 간의 애스펙트 찾기
 * @param progressedChart 진행 차트
 * @param natalChart 네이탈 (출생) 차트
 * @param aspectTypes 찾을 애스펙트 타입들
 * @param orbMultiplier 오브 배율 (1.0 = 기본)
 */
export function findProgressedToNatalAspects(
  progressedChart: ProgressedChart,
  natalChart: Chart,
  aspectTypes: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"],
  orbMultiplier: number = 1.0
): ProgressedAspect[] {
  const aspects: ProgressedAspect[] = [];

  const progressedPlanets = progressedChart.planets;
  const natalPoints = [
    ...natalChart.planets,
    natalChart.ascendant,
    natalChart.mc,
  ];

  for (const progressed of progressedPlanets) {
    for (const natal of natalPoints) {
      // 같은 행성끼리는 제외 (자기 자신과의 애스펙트)
      if (progressed.name === natal.name) continue;

      const diff = angleDiff(progressed.longitude, natal.longitude);

      for (const aspectType of aspectTypes) {
        const targetAngle = PROGRESSED_ASPECT_ANGLES[aspectType];
        const maxOrb = PROGRESSED_ORBS[aspectType] * orbMultiplier;

        const orb = Math.abs(diff - targetAngle);
        const orbAlt = Math.abs(360 - diff - targetAngle);
        const actualOrb = Math.min(orb, orbAlt);

        if (actualOrb <= maxOrb) {
          let aspectNature: "harmonious" | "challenging" | "neutral" = "neutral";
          if (HARMONIOUS_ASPECTS.includes(aspectType)) aspectNature = "harmonious";
          if (CHALLENGING_ASPECTS.includes(aspectType)) aspectNature = "challenging";

          aspects.push({
            from: {
              name: progressed.name,
              kind: "progressed",
              house: progressed.house,
              sign: progressed.sign,
              longitude: progressed.longitude,
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
            progressedPlanet: progressed.name,
            natalPoint: natal.name,
            aspectNature,
          });
        }
      }
    }
  }

  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * 진행 차트 내부의 애스펙트 찾기 (진행 행성 간)
 */
export function findProgressedInternalAspects(
  progressedChart: ProgressedChart,
  aspectTypes: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"],
  orbMultiplier: number = 1.0
): ProgressedAspect[] {
  const aspects: ProgressedAspect[] = [];
  const planets = progressedChart.planets;

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      const diff = angleDiff(p1.longitude, p2.longitude);

      for (const aspectType of aspectTypes) {
        const targetAngle = PROGRESSED_ASPECT_ANGLES[aspectType];
        const maxOrb = PROGRESSED_ORBS[aspectType] * orbMultiplier;

        const orb = Math.abs(diff - targetAngle);
        const orbAlt = Math.abs(360 - diff - targetAngle);
        const actualOrb = Math.min(orb, orbAlt);

        if (actualOrb <= maxOrb) {
          let aspectNature: "harmonious" | "challenging" | "neutral" = "neutral";
          if (HARMONIOUS_ASPECTS.includes(aspectType)) aspectNature = "harmonious";
          if (CHALLENGING_ASPECTS.includes(aspectType)) aspectNature = "challenging";

          aspects.push({
            from: {
              name: p1.name,
              kind: "progressed",
              house: p1.house,
              sign: p1.sign,
              longitude: p1.longitude,
            },
            to: {
              name: p2.name,
              kind: "progressed",
              house: p2.house,
              sign: p2.sign,
              longitude: p2.longitude,
            },
            type: aspectType,
            orb: actualOrb,
            score: 1 - actualOrb / maxOrb,
            progressedPlanet: p1.name,
            natalPoint: p2.name,
            aspectNature,
          });
        }
      }
    }
  }

  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * 진행 달의 중요한 애스펙트 찾기
 * 진행 달은 가장 빠르게 움직이므로 (약 1도/월) 가장 활발한 트리거
 */
export function findProgressedMoonAspects(
  progressedChart: ProgressedChart,
  natalChart: Chart,
  orbMultiplier: number = 1.0
): ProgressedAspect[] {
  const progressedMoon = progressedChart.planets.find(p => p.name === "Moon");
  if (!progressedMoon) return [];

  const aspects: ProgressedAspect[] = [];
  const natalPoints = [
    ...natalChart.planets,
    natalChart.ascendant,
    natalChart.mc,
  ];

  const aspectTypes: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

  for (const natal of natalPoints) {
    const diff = angleDiff(progressedMoon.longitude, natal.longitude);

    for (const aspectType of aspectTypes) {
      const targetAngle = PROGRESSED_ASPECT_ANGLES[aspectType];
      const maxOrb = PROGRESSED_ORBS[aspectType] * orbMultiplier * 1.5; // 달은 약간 넓은 오브

      const orb = Math.abs(diff - targetAngle);
      const orbAlt = Math.abs(360 - diff - targetAngle);
      const actualOrb = Math.min(orb, orbAlt);

      if (actualOrb <= maxOrb) {
        let aspectNature: "harmonious" | "challenging" | "neutral" = "neutral";
        if (HARMONIOUS_ASPECTS.includes(aspectType)) aspectNature = "harmonious";
        if (CHALLENGING_ASPECTS.includes(aspectType)) aspectNature = "challenging";

        aspects.push({
          from: {
            name: "Moon",
            kind: "progressed",
            house: progressedMoon.house,
            sign: progressedMoon.sign,
            longitude: progressedMoon.longitude,
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
          progressedPlanet: "Moon",
          natalPoint: natal.name,
          aspectNature,
        });
      }
    }
  }

  return aspects.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * 진행 애스펙트 해석 키워드
 */
export function getProgressedAspectKeywords(aspect: ProgressedAspect): {
  theme: string;
  keywords: string[];
  timing: string;
} {
  const progressedThemes: Record<string, Record<string, { theme: string; keywords: string[] }>> = {
    Sun: {
      Moon: { theme: "자아와 감정의 통합", keywords: ["정체성", "감정적 성숙", "새로운 시작"] },
      Venus: { theme: "사랑과 가치의 발현", keywords: ["로맨스", "자기 가치", "창조성"] },
      Mars: { theme: "의지와 행동의 조화", keywords: ["동기부여", "용기", "자기 주장"] },
      Jupiter: { theme: "성장과 확장", keywords: ["기회", "낙관", "성공"] },
      Saturn: { theme: "책임과 성숙", keywords: ["업적", "구조화", "현실화"] },
      Ascendant: { theme: "자아 정체성 변화", keywords: ["이미지", "인생 방향", "자기 발견"] },
      MC: { theme: "커리어 발전", keywords: ["목표", "인정", "성취"] },
    },
    Moon: {
      Sun: { theme: "감정과 의지의 통합", keywords: ["조화", "완성", "균형"] },
      Venus: { theme: "감정적 사랑", keywords: ["정서적 충족", "관계 변화", "돌봄"] },
      Mars: { theme: "감정적 행동", keywords: ["용기", "보호 본능", "주장"] },
      Saturn: { theme: "감정적 성숙", keywords: ["책임", "억제", "내면 성장"] },
      Ascendant: { theme: "삶의 전환점", keywords: ["가정", "환경 변화", "내면 인식"] },
      MC: { theme: "공적 영역과 사적 영역", keywords: ["가정과 일", "감정적 목표"] },
    },
    Venus: {
      Mars: { theme: "사랑과 열정", keywords: ["로맨스", "창조적 열정", "매력"] },
      Jupiter: { theme: "풍요로운 사랑", keywords: ["행운", "축복", "관계 확장"] },
      Saturn: { theme: "사랑의 시험", keywords: ["헌신", "책임", "장기적 관계"] },
    },
    Mars: {
      Jupiter: { theme: "성공적 행동", keywords: ["기업가 정신", "용기", "확장"] },
      Saturn: { theme: "절제된 행동", keywords: ["인내", "전략", "장기적 노력"] },
    },
  };

  const timing = aspect.progressedPlanet === "Moon" ? "약 1개월" :
                 aspect.progressedPlanet === "Sun" ? "약 1년" :
                 aspect.progressedPlanet === "Mercury" || aspect.progressedPlanet === "Venus" ? "약 1-2년" :
                 "약 2-3년";

  const data = progressedThemes[aspect.progressedPlanet]?.[aspect.natalPoint];

  return {
    theme: data?.theme ?? `${aspect.progressedPlanet} → ${aspect.natalPoint}`,
    keywords: data?.keywords ?? [],
    timing,
  };
}
