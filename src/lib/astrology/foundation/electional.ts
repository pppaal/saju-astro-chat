// src/lib/astrology/foundation/electional.ts
// 택일 점성학 - 최적의 시간 선택을 위한 규칙 엔진

import { Chart, PlanetBase, ZodiacKo, AspectType } from "./types";
import { normalize360, shortestAngle } from "./utils";
import { findAspects } from "./aspects";

export type MoonPhase =
  | "new_moon"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full_moon"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export type ElectionalEventType =
  | "business_start"
  | "signing_contracts"
  | "marriage"
  | "engagement"
  | "first_date"
  | "surgery"
  | "dental"
  | "start_treatment"
  | "long_journey"
  | "moving_house"
  | "investment"
  | "buying_property"
  | "major_purchase"
  | "creative_start"
  | "publishing"
  | "starting_studies"
  | "exam"
  | "lawsuit"
  | "court_appearance";

export interface VoidOfCourseInfo {
  isVoid: boolean;
  moonSign: ZodiacKo;
  lastAspect: { planet: string; type: AspectType; exactTime?: Date } | null;
  voidStartTime?: Date;
  voidEndTime?: Date;
  hoursRemaining?: number;
  description: string;
}

export interface PlanetaryHour {
  planet: string;
  dayRuler: string;
  startTime: Date;
  endTime: Date;
  isDay: boolean;
  goodFor: string[];
}

export interface ElectionalScore {
  total: number;
  moonFactors: number;
  planetaryAspects: number;
  retrogradeIssues: number;
  specialConsiderations: number;
  breakdown: {
    moonPhaseAppropriate: number;
    moonSignAppropriate: number;
    moonNotVoid: number;
    beneficAspectsPresent: number;
    noMajorAfflictions: number;
    mercuryDirect: number;
    otherPlanetsDirect: number;
    planetaryHourMatch: number;
    noEclipse: number;
  };
  interpretation: string;
}

export interface ElectionalAnalysis {
  dateTime: Date;
  eventType: ElectionalEventType;
  score: ElectionalScore;
  moonPhase: MoonPhase;
  moonSign: ZodiacKo;
  voidOfCourse: VoidOfCourseInfo;
  currentHour: PlanetaryHour;
  retrogradePlanets: string[];
  beneficAspects: string[];
  maleficAspects: string[];
  recommendations: string[];
  warnings: string[];
}

// 각 이벤트 유형에 대한 최적 조건
const EVENT_REQUIREMENTS: Record<ElectionalEventType, {
  bestMoonPhases: MoonPhase[];
  bestMoonSigns: ZodiacKo[];
  avoidMoonSigns?: ZodiacKo[];
  avoidRetrogrades: string[];
  beneficPlanets: string[];
  bestDays?: string[];
  bodyPartSigns?: ZodiacKo[];
}> = {
  business_start: {
    bestMoonPhases: ["waxing_crescent", "first_quarter", "waxing_gibbous"],
    bestMoonSigns: ["Taurus", "Leo", "Capricorn"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Jupiter", "Sun"],
    bestDays: ["Thursday", "Sunday"],
  },
  signing_contracts: {
    bestMoonPhases: ["waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Gemini", "Virgo", "Libra", "Capricorn"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Mercury", "Saturn", "Jupiter"],
    bestDays: ["Wednesday"],
  },
  marriage: {
    bestMoonPhases: ["first_quarter", "waxing_gibbous", "full_moon"],
    bestMoonSigns: ["Taurus", "Cancer", "Libra", "Pisces"],
    avoidRetrogrades: ["Venus", "Mercury"],
    beneficPlanets: ["Venus", "Jupiter", "Moon"],
    bestDays: ["Friday", "Monday"],
  },
  engagement: {
    bestMoonPhases: ["waxing_crescent", "first_quarter", "waxing_gibbous"],
    bestMoonSigns: ["Libra", "Taurus", "Leo"],
    avoidRetrogrades: ["Venus", "Mercury"],
    beneficPlanets: ["Venus", "Jupiter"],
    bestDays: ["Friday"],
  },
  first_date: {
    bestMoonPhases: ["waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Taurus", "Libra", "Leo", "Pisces"],
    avoidRetrogrades: ["Venus"],
    beneficPlanets: ["Venus", "Mars"],
    bestDays: ["Friday"],
  },
  surgery: {
    bestMoonPhases: ["waning_gibbous", "last_quarter", "waning_crescent"],
    bestMoonSigns: ["Virgo", "Capricorn", "Aquarius"],
    avoidMoonSigns: ["Aries", "Taurus", "Cancer", "Leo", "Scorpio"],
    avoidRetrogrades: ["Mars", "Mercury"],
    beneficPlanets: ["Mars", "Saturn"],
    bestDays: ["Tuesday", "Saturday"],
  },
  dental: {
    bestMoonPhases: ["waning_gibbous", "last_quarter", "waning_crescent"],
    bestMoonSigns: ["Virgo", "Capricorn", "Sagittarius"],
    avoidMoonSigns: ["Taurus", "Aries"],
    avoidRetrogrades: ["Mars"],
    beneficPlanets: ["Saturn"],
    bestDays: ["Saturday"],
  },
  start_treatment: {
    bestMoonPhases: ["new_moon", "waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Virgo", "Scorpio", "Pisces"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Jupiter", "Neptune"],
  },
  long_journey: {
    bestMoonPhases: ["waxing_crescent", "first_quarter", "waxing_gibbous"],
    bestMoonSigns: ["Sagittarius", "Gemini", "Aquarius"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Jupiter", "Mercury"],
    bestDays: ["Thursday"],
  },
  moving_house: {
    bestMoonPhases: ["waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Cancer", "Taurus", "Virgo"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Moon", "Venus"],
    bestDays: ["Monday"],
  },
  investment: {
    bestMoonPhases: ["waxing_crescent", "first_quarter", "waxing_gibbous"],
    bestMoonSigns: ["Taurus", "Capricorn", "Scorpio"],
    avoidRetrogrades: ["Mercury", "Jupiter"],
    beneficPlanets: ["Jupiter", "Venus"],
    bestDays: ["Thursday"],
  },
  buying_property: {
    bestMoonPhases: ["waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Taurus", "Cancer", "Capricorn"],
    avoidRetrogrades: ["Mercury", "Venus"],
    beneficPlanets: ["Saturn", "Jupiter", "Moon"],
    bestDays: ["Saturday", "Monday"],
  },
  major_purchase: {
    bestMoonPhases: ["waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Taurus", "Leo", "Libra"],
    avoidRetrogrades: ["Venus", "Mercury"],
    beneficPlanets: ["Venus", "Jupiter"],
    bestDays: ["Friday"],
  },
  creative_start: {
    bestMoonPhases: ["new_moon", "waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Pisces", "Leo", "Libra", "Aquarius"],
    avoidRetrogrades: ["Mercury", "Neptune"],
    beneficPlanets: ["Neptune", "Venus"],
    bestDays: ["Friday", "Monday"],
  },
  publishing: {
    bestMoonPhases: ["full_moon", "waxing_gibbous"],
    bestMoonSigns: ["Sagittarius", "Leo", "Gemini"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Mercury", "Jupiter"],
    bestDays: ["Wednesday", "Thursday"],
  },
  starting_studies: {
    bestMoonPhases: ["new_moon", "waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Gemini", "Virgo", "Sagittarius", "Aquarius"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Mercury", "Jupiter"],
    bestDays: ["Wednesday"],
  },
  exam: {
    bestMoonPhases: ["first_quarter", "waxing_gibbous"],
    bestMoonSigns: ["Gemini", "Virgo", "Sagittarius", "Capricorn"],
    avoidMoonSigns: ["Pisces", "Scorpio"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Mercury", "Jupiter"],
    bestDays: ["Wednesday"],
  },
  lawsuit: {
    bestMoonPhases: ["waxing_crescent", "first_quarter"],
    bestMoonSigns: ["Aries", "Libra", "Capricorn"],
    avoidRetrogrades: ["Mercury", "Jupiter"],
    beneficPlanets: ["Mars", "Jupiter", "Saturn"],
    bestDays: ["Tuesday", "Thursday"],
  },
  court_appearance: {
    bestMoonPhases: ["first_quarter", "waxing_gibbous"],
    bestMoonSigns: ["Libra", "Capricorn", "Sagittarius"],
    avoidRetrogrades: ["Mercury"],
    beneficPlanets: ["Mercury", "Jupiter"],
  },
};

// 행성 시간 순서
const PLANETARY_HOUR_SEQUENCE = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
const DAY_RULERS: Record<number, string> = {
  0: "Sun", // Sunday
  1: "Moon",
  2: "Mars",
  3: "Mercury",
  4: "Jupiter",
  5: "Venus",
  6: "Saturn",
};

const PLANETARY_HOUR_USES: Record<string, string[]> = {
  Sun: ["리더십", "권위", "성공", "명예"],
  Moon: ["가정", "직관", "대중", "부동산"],
  Mercury: ["커뮤니케이션", "문서", "학습", "거래"],
  Venus: ["사랑", "예술", "아름다움", "재물"],
  Mars: ["경쟁", "운동", "수술", "용기"],
  Jupiter: ["확장", "교육", "법률", "해외"],
  Saturn: ["구조화", "장기 계획", "부동산", "제한"],
};

/**
 * 현재 문페이즈 계산
 */
export function getMoonPhase(sunLongitude: number, moonLongitude: number): MoonPhase {
  const angle = normalize360(moonLongitude - sunLongitude);

  if (angle < 45) return "new_moon";
  if (angle < 90) return "waxing_crescent";
  if (angle < 135) return "first_quarter";
  if (angle < 180) return "waxing_gibbous";
  if (angle < 225) return "full_moon";
  if (angle < 270) return "waning_gibbous";
  if (angle < 315) return "last_quarter";
  return "waning_crescent";
}

/**
 * 문페이즈 한글 이름
 */
export function getMoonPhaseName(phase: MoonPhase): string {
  const names: Record<MoonPhase, string> = {
    new_moon: "삭 (새달)",
    waxing_crescent: "초승달",
    first_quarter: "상현달",
    waxing_gibbous: "차오르는 달",
    full_moon: "보름달",
    waning_gibbous: "기우는 달",
    last_quarter: "하현달",
    waning_crescent: "그믐달",
  };
  return names[phase];
}

/**
 * Void of Course Moon 확인
 * 달이 현재 사인에서 마지막 주요 애스펙트 이후 상태인지 확인
 */
export function checkVoidOfCourse(chart: Chart): VoidOfCourseInfo {
  const moon = chart.planets.find(p => p.name === "Moon");
  if (!moon) {
    return {
      isVoid: false,
      moonSign: "Aries",
      lastAspect: null,
      hoursRemaining: 0,
      description: "달 정보 없음",
    };
  }

  const moonSign = moon.sign;
  const moonLongitude = moon.longitude;
  const moonSpeed = moon.speed || 13; // 평균 달 속도 (도/일)

  // 달이 현재 사인을 벗어날 때까지 남은 도수 계산
  const signStart = Math.floor(moonLongitude / 30) * 30;
  const signEnd = signStart + 30;
  const degreesToSignEnd = signEnd - moonLongitude;
  const hoursToSignChange = (degreesToSignEnd / moonSpeed) * 24;

  // 다른 행성들과의 주요 애스펙트 확인
  const majorAspects: { angle: number; type: AspectType }[] = [
    { angle: 0, type: "conjunction" },
    { angle: 60, type: "sextile" },
    { angle: 90, type: "square" },
    { angle: 120, type: "trine" },
    { angle: 180, type: "opposition" },
  ];
  const otherPlanets = chart.planets.filter(p => p.name !== "Moon");

  let closestFutureAspect: { planet: string; degrees: number; type: AspectType } | null = null;

  for (const planet of otherPlanets) {
    for (const { angle: aspectAngle, type: aspectType } of majorAspects) {
      // 달이 이동하면서 이 행성과 애스펙트를 형성할 도수 계산
      const targetLon = normalize360(planet.longitude + aspectAngle);
      const targetLon2 = normalize360(planet.longitude - aspectAngle);

      for (const target of [targetLon, targetLon2]) {
        // 같은 사인 내에서 애스펙트가 형성되는지 확인
        if (target >= signStart && target < signEnd && target > moonLongitude) {
          const degreesToAspect = target - moonLongitude;
          if (!closestFutureAspect || degreesToAspect < closestFutureAspect.degrees) {
            closestFutureAspect = { planet: planet.name, degrees: degreesToAspect, type: aspectType };
          }
        }
      }
    }
  }

  const isVoid = closestFutureAspect === null;

  return {
    isVoid,
    moonSign,
    lastAspect: closestFutureAspect ? { planet: closestFutureAspect.planet, type: closestFutureAspect.type } : null,
    hoursRemaining: Number(hoursToSignChange.toFixed(2)),
    description: isVoid
      ? `달이 ${moonSign}에서 공전 중 (Void of Course) - ${Math.round(hoursToSignChange)}시간 후 사인 변경`
      : `달이 ${moonSign}에서 활성 - ${closestFutureAspect?.planet}과 애스펙트 예정`,
  };
}

/**
 * 현재 행성 시간 계산
 */
export function calculatePlanetaryHour(
  date: Date,
  latitude: number,
  sunriseTime: Date,
  sunsetTime: Date
): PlanetaryHour {
  const dayOfWeek = date.getDay();
  const dayRuler = DAY_RULERS[dayOfWeek];

  // 낮/밤 시간 계산
  const dayLength = sunsetTime.getTime() - sunriseTime.getTime();
  const nightLength = 24 * 60 * 60 * 1000 - dayLength;

  const dayHourLength = dayLength / 12;
  const nightHourLength = nightLength / 12;

  const isDay = date.getTime() >= sunriseTime.getTime() && date.getTime() < sunsetTime.getTime();

  let hourIndex: number;
  let hourStartTime: Date;
  let hourEndTime: Date;

  if (isDay) {
    const msSinceSunrise = date.getTime() - sunriseTime.getTime();
    hourIndex = Math.floor(msSinceSunrise / dayHourLength);
    hourStartTime = new Date(sunriseTime.getTime() + hourIndex * dayHourLength);
    hourEndTime = new Date(hourStartTime.getTime() + dayHourLength);
  } else {
    const prevSunset = date.getTime() >= sunsetTime.getTime()
      ? sunsetTime
      : new Date(sunsetTime.getTime() - 24 * 60 * 60 * 1000);
    const msSinceSunset = date.getTime() - prevSunset.getTime();
    hourIndex = Math.floor(msSinceSunset / nightHourLength) + 12;
    hourStartTime = new Date(prevSunset.getTime() + (hourIndex - 12) * nightHourLength);
    hourEndTime = new Date(hourStartTime.getTime() + nightHourLength);
  }

  // 행성 시간 찾기
  const dayRulerIndex = PLANETARY_HOUR_SEQUENCE.indexOf(dayRuler);
  const planetIndex = (dayRulerIndex + hourIndex) % 7;
  const planet = PLANETARY_HOUR_SEQUENCE[planetIndex];

  return {
    planet,
    dayRuler,
    startTime: hourStartTime,
    endTime: hourEndTime,
    isDay,
    goodFor: PLANETARY_HOUR_USES[planet] || [],
  };
}

/**
 * 역행 행성 확인
 */
export function getRetrogradePlanets(chart: Chart): string[] {
  return chart.planets
    .filter(p => p.retrograde === true)
    .map(p => p.name);
}

/**
 * 길한/흉한 애스펙트 분류
 */
export function classifyAspects(chart: Chart): { benefic: string[]; malefic: string[] } {
  const aspects = findAspects(chart, chart);
  const benefic: string[] = [];
  const malefic: string[] = [];

  const beneficPlanets = ["Venus", "Jupiter"];
  const maleficPlanets = ["Mars", "Saturn", "Uranus", "Neptune", "Pluto"];
  const beneficAspects: AspectType[] = ["trine", "sextile"];
  const maleficAspects: AspectType[] = ["square", "opposition"];

  for (const aspect of aspects) {
    const description = `${aspect.from.name} ${aspect.type} ${aspect.to.name}`;

    // 길성이 길한 애스펙트
    if (
      (beneficPlanets.includes(aspect.from.name) || beneficPlanets.includes(aspect.to.name)) &&
      beneficAspects.includes(aspect.type)
    ) {
      benefic.push(description);
    }

    // 흉성이 흉한 애스펙트
    if (
      (maleficPlanets.includes(aspect.from.name) || maleficPlanets.includes(aspect.to.name)) &&
      maleficAspects.includes(aspect.type)
    ) {
      malefic.push(description);
    }

    // 컨정션은 행성에 따라 분류
    if (aspect.type === "conjunction") {
      if (beneficPlanets.includes(aspect.from.name) || beneficPlanets.includes(aspect.to.name)) {
        benefic.push(description);
      }
      if (maleficPlanets.includes(aspect.from.name) && maleficPlanets.includes(aspect.to.name)) {
        malefic.push(description);
      }
    }
  }

  return { benefic, malefic };
}

/**
 * 택일 분석 실행
 */
export function analyzeElection(
  chart: Chart,
  eventType: ElectionalEventType,
  dateTime: Date,
  sunriseTime?: Date,
  sunsetTime?: Date
): ElectionalAnalysis {
  const requirements = EVENT_REQUIREMENTS[eventType];

  const sun = chart.planets.find(p => p.name === "Sun")!;
  const moon = chart.planets.find(p => p.name === "Moon")!;

  const moonPhase = getMoonPhase(sun.longitude, moon.longitude);
  const moonSign = moon.sign;
  const voidOfCourse = checkVoidOfCourse(chart);
  const retrogradePlanets = getRetrogradePlanets(chart);
  const { benefic, malefic } = classifyAspects(chart);

  // 기본 일출/일몰 시간 (제공되지 않은 경우)
  const sunrise = sunriseTime || new Date(dateTime.setHours(6, 0, 0));
  const sunset = sunsetTime || new Date(dateTime.setHours(18, 0, 0));
  const currentHour = calculatePlanetaryHour(dateTime, 0, sunrise, sunset);

  // 점수 계산
  const breakdown = {
    moonPhaseAppropriate: requirements.bestMoonPhases.includes(moonPhase) ? 10 : 3,
    moonSignAppropriate: requirements.bestMoonSigns.includes(moonSign) ? 10 :
      (requirements.avoidMoonSigns?.includes(moonSign) ? 0 : 5),
    moonNotVoid: voidOfCourse.isVoid ? 0 : 5,
    beneficAspectsPresent: Math.min(benefic.length * 3, 15),
    noMajorAfflictions: Math.max(0, 10 - malefic.length * 2),
    mercuryDirect: retrogradePlanets.includes("Mercury") && requirements.avoidRetrogrades.includes("Mercury") ? 0 : 7,
    otherPlanetsDirect: requirements.avoidRetrogrades.filter(p => retrogradePlanets.includes(p) && p !== "Mercury").length === 0 ? 8 : 3,
    planetaryHourMatch: requirements.beneficPlanets.includes(currentHour.planet) ? 5 : 2,
    noEclipse: 5, // 이클립스 체크는 별도 로직 필요
  };

  const moonFactors = breakdown.moonPhaseAppropriate + breakdown.moonSignAppropriate + breakdown.moonNotVoid;
  const planetaryAspects = breakdown.beneficAspectsPresent + breakdown.noMajorAfflictions;
  const retrogradeIssues = breakdown.mercuryDirect + breakdown.otherPlanetsDirect;
  const specialConsiderations = breakdown.planetaryHourMatch + breakdown.noEclipse;

  const total = moonFactors + planetaryAspects + retrogradeIssues + specialConsiderations;

  let interpretation: string;
  if (total >= 90) interpretation = "최적의 택일 - 적극 추천";
  else if (total >= 75) interpretation = "좋은 택일 - 추천";
  else if (total >= 60) interpretation = "무난한 택일 - 가능";
  else if (total >= 45) interpretation = "주의 필요 - 대안 검토 권장";
  else interpretation = "비추천 - 다른 날짜 선택 권장";

  // 권장사항과 경고 생성
  const recommendations: string[] = [];
  const warnings: string[] = [];

  if (requirements.bestMoonPhases.includes(moonPhase)) {
    recommendations.push(`${getMoonPhaseName(moonPhase)}은 이 활동에 적합합니다.`);
  }
  if (requirements.bestMoonSigns.includes(moonSign)) {
    recommendations.push(`달이 ${moonSign}에 있어 이 활동에 유리합니다.`);
  }
  if (benefic.length > 0) {
    recommendations.push(`길한 애스펙트: ${benefic.slice(0, 3).join(", ")}`);
  }

  if (voidOfCourse.isVoid) {
    warnings.push("달이 공전 중 (Void of Course) - 시작한 일이 결과를 맺지 못할 수 있음");
  }
  if (retrogradePlanets.some(p => requirements.avoidRetrogrades.includes(p))) {
    warnings.push(`역행 중인 행성 주의: ${retrogradePlanets.filter(p => requirements.avoidRetrogrades.includes(p)).join(", ")}`);
  }
  if (requirements.avoidMoonSigns?.includes(moonSign)) {
    warnings.push(`달이 ${moonSign}에 있어 이 활동에 불리합니다.`);
  }
  if (malefic.length > 0) {
    warnings.push(`주의 애스펙트: ${malefic.slice(0, 3).join(", ")}`);
  }

  return {
    dateTime,
    eventType,
    score: {
      total,
      moonFactors,
      planetaryAspects,
      retrogradeIssues,
      specialConsiderations,
      breakdown,
      interpretation,
    },
    moonPhase,
    moonSign,
    voidOfCourse,
    currentHour,
    retrogradePlanets,
    beneficAspects: benefic,
    maleficAspects: malefic,
    recommendations,
    warnings,
  };
}

/**
 * 특정 기간 내 최적의 날짜 찾기 (간소화된 버전)
 */
export function findBestDates(
  eventType: ElectionalEventType,
  startDate: Date,
  endDate: Date,
  charts: { date: Date; chart: Chart }[]
): { date: Date; score: number; interpretation: string }[] {
  const results = charts.map(({ date, chart }) => {
    const analysis = analyzeElection(chart, eventType, date);
    return {
      date,
      score: analysis.score.total,
      interpretation: analysis.score.interpretation,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * 이벤트 유형에 대한 일반 가이드라인
 */
export function getElectionalGuidelines(eventType: ElectionalEventType): {
  bestMoonPhases: string[];
  bestMoonSigns: string[];
  avoidMoonSigns?: string[];
  avoidRetrogrades: string[];
  bestDays?: string[];
  tips: string[];
} {
  const req = EVENT_REQUIREMENTS[eventType];

  const tips: string[] = [];

  if (eventType === "surgery") {
    tips.push("달이 수술 부위에 해당하는 사인에 있을 때 피하세요");
    tips.push("하현달 이후가 출혈과 부기 감소에 유리합니다");
  }
  if (eventType === "marriage") {
    tips.push("금성 역행 기간은 반드시 피하세요");
    tips.push("달과 금성의 좋은 애스펙트를 확인하세요");
  }
  if (eventType === "signing_contracts") {
    tips.push("수성 역행 기간은 계약 오류가 발생할 수 있습니다");
    tips.push("달이 공전 중(Void of Course)일 때 피하세요");
  }

  return {
    bestMoonPhases: req.bestMoonPhases.map(getMoonPhaseName),
    bestMoonSigns: req.bestMoonSigns,
    avoidMoonSigns: req.avoidMoonSigns,
    avoidRetrogrades: req.avoidRetrogrades,
    bestDays: req.bestDays,
    tips,
  };
}


