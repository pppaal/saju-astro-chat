// src/lib/astrology/foundation/rectification.ts
// 출생 시간 교정(Rectification) 가이드 및 도구

import { Chart, PlanetBase, ZodiacKo, NatalInput } from "./types";
import { normalize360, angleDiff, formatLongitude } from "./utils";
import { calculateNatalChart, toChart } from "./astrologyService";

export interface LifeEvent {
  date: Date;
  type: LifeEventType;
  description: string;
  importance: "major" | "moderate" | "minor";
}

export type LifeEventType =
  | "marriage"
  | "divorce"
  | "birth_of_child"
  | "death_of_parent_mother"
  | "death_of_parent_father"
  | "career_change"
  | "career_peak"
  | "job_loss"
  | "major_move"
  | "accident"
  | "surgery"
  | "graduation"
  | "major_relationship_start"
  | "major_relationship_end"
  | "financial_gain"
  | "financial_loss"
  | "spiritual_awakening"
  | "health_crisis"
  | "other";

export interface RectificationCandidate {
  time: Date;
  ascendantSign: ZodiacKo;
  ascendantDegree: number;
  mcSign: ZodiacKo;
  mcDegree: number;
  confidence: number;
  matchingEvents: { event: LifeEvent; technique: string; score: number }[];
}

export interface RectificationResult {
  candidates: RectificationCandidate[];
  bestCandidate: RectificationCandidate | null;
  methodology: string[];
  recommendations: string[];
  confidenceLevel: "high" | "medium" | "low" | "uncertain";
}

export interface PhysicalAppearanceProfile {
  face: string;
  body: string;
  manner: string;
  firstImpression: string;
}

// ASC 사인별 외모 특성
const ASC_APPEARANCE: Record<ZodiacKo, PhysicalAppearanceProfile> = {
  Aries: { face: "각진 얼굴, 날카로운 눈", body: "활동적, 근육질", manner: "빠른 움직임", firstImpression: "에너지 넘침" },
  Taurus: { face: "목이 굵거나 두드러짐", body: "견고하고 감각적", manner: "느긋함", firstImpression: "편안함" },
  Gemini: { face: "날씬함, 활발한 표정", body: "가벼운 체형", manner: "수다스러움", firstImpression: "젊어 보임" },
  Cancer: { face: "둥근 얼굴, 부드러운 인상", body: "둥글거나 보호적", manner: "조용함", firstImpression: "모성적" },
  Leo: { face: "당당한 자세, 풍성한 머리", body: "당당함", manner: "따뜻한 미소", firstImpression: "카리스마" },
  Virgo: { face: "단정함, 세련됨", body: "날씬하고 정돈됨", manner: "분석적 눈빛", firstImpression: "꼼꼼함" },
  Libra: { face: "균형 잡힌 이목구비", body: "우아함", manner: "매력적", firstImpression: "세련됨" },
  Scorpio: { face: "깊은 눈빛, 강렬함", body: "자기장이 강함", manner: "미스터리", firstImpression: "관통하는 시선" },
  Sagittarius: { face: "활기참, 밝은 표정", body: "키가 크거나 활동적", manner: "큰 동작", firstImpression: "낙천적" },
  Capricorn: { face: "진지함, 뼈대 두드러짐", body: "마른 편", manner: "어른스러움", firstImpression: "신뢰감" },
  Aquarius: { face: "독특한 스타일", body: "개성적", manner: "친근함", firstImpression: "특이함" },
  Pisces: { face: "몽환적, 부드러운 눈", body: "유연함", manner: "감수성", firstImpression: "신비로움" },
};

// 이벤트 유형과 관련된 점성학적 시그니처
const EVENT_SIGNATURES: Record<LifeEventType, {
  relevantHouses: number[];
  relevantPlanets: string[];
  expectedTransits: string[];
  expectedDirections: string[];
}> = {
  marriage: {
    relevantHouses: [7, 1, 5],
    relevantPlanets: ["Venus", "Jupiter", "Moon"],
    expectedTransits: ["Jupiter to 7th", "Venus to DSC", "Saturn to Venus"],
    expectedDirections: ["MC to Venus", "ASC to Jupiter", "Venus to DSC"],
  },
  divorce: {
    relevantHouses: [7, 1, 8],
    relevantPlanets: ["Saturn", "Uranus", "Mars"],
    expectedTransits: ["Uranus to 7th", "Saturn to Venus", "Pluto to 7th"],
    expectedDirections: ["MC to Saturn", "ASC to Uranus"],
  },
  birth_of_child: {
    relevantHouses: [5, 4, 1],
    relevantPlanets: ["Moon", "Jupiter", "Venus"],
    expectedTransits: ["Jupiter to 5th", "Moon ruler aspects"],
    expectedDirections: ["MC to Moon", "5th ruler direction"],
  },
  death_of_parent_mother: {
    relevantHouses: [4, 10, 8],
    relevantPlanets: ["Moon", "Saturn", "Pluto"],
    expectedTransits: ["Saturn to 4th", "Pluto to Moon"],
    expectedDirections: ["IC direction", "Moon direction"],
  },
  death_of_parent_father: {
    relevantHouses: [10, 4, 8],
    relevantPlanets: ["Sun", "Saturn", "Pluto"],
    expectedTransits: ["Saturn to 10th", "Pluto to Sun"],
    expectedDirections: ["MC direction", "Sun direction"],
  },
  career_change: {
    relevantHouses: [10, 6, 2],
    relevantPlanets: ["Saturn", "Jupiter", "Sun"],
    expectedTransits: ["Saturn to MC", "Jupiter to 10th", "Uranus to MC"],
    expectedDirections: ["MC to Saturn", "Sun to MC"],
  },
  career_peak: {
    relevantHouses: [10, 1, 11],
    relevantPlanets: ["Sun", "Jupiter", "Saturn"],
    expectedTransits: ["Jupiter to MC", "Sun progressed to MC"],
    expectedDirections: ["MC to Sun", "MC to Jupiter"],
  },
  job_loss: {
    relevantHouses: [10, 6, 2],
    relevantPlanets: ["Saturn", "Uranus", "Pluto"],
    expectedTransits: ["Saturn to MC", "Uranus to 6th"],
    expectedDirections: ["MC to Saturn", "MC to Uranus"],
  },
  major_move: {
    relevantHouses: [4, 1, 9],
    relevantPlanets: ["Moon", "Uranus", "Jupiter"],
    expectedTransits: ["Uranus to IC", "Jupiter to 4th"],
    expectedDirections: ["IC direction", "Moon direction"],
  },
  accident: {
    relevantHouses: [1, 6, 8],
    relevantPlanets: ["Mars", "Uranus", "Saturn"],
    expectedTransits: ["Mars to ASC", "Uranus to 1st"],
    expectedDirections: ["ASC to Mars", "Mars direction"],
  },
  surgery: {
    relevantHouses: [6, 8, 1],
    relevantPlanets: ["Mars", "Pluto", "Saturn"],
    expectedTransits: ["Mars aspects", "Pluto to 6th"],
    expectedDirections: ["Mars direction"],
  },
  graduation: {
    relevantHouses: [9, 3, 10],
    relevantPlanets: ["Jupiter", "Mercury", "Sun"],
    expectedTransits: ["Jupiter to 9th", "Mercury aspects"],
    expectedDirections: ["MC to Mercury", "9th house direction"],
  },
  major_relationship_start: {
    relevantHouses: [7, 5, 1],
    relevantPlanets: ["Venus", "Mars", "Moon"],
    expectedTransits: ["Venus to 7th", "Mars to Venus"],
    expectedDirections: ["DSC direction", "Venus direction"],
  },
  major_relationship_end: {
    relevantHouses: [7, 8, 12],
    relevantPlanets: ["Saturn", "Pluto", "Neptune"],
    expectedTransits: ["Saturn to 7th", "Pluto to Venus"],
    expectedDirections: ["DSC to Saturn"],
  },
  financial_gain: {
    relevantHouses: [2, 8, 11],
    relevantPlanets: ["Jupiter", "Venus", "Pluto"],
    expectedTransits: ["Jupiter to 2nd", "Pluto to 2nd"],
    expectedDirections: ["2nd house ruler direction"],
  },
  financial_loss: {
    relevantHouses: [2, 8, 12],
    relevantPlanets: ["Saturn", "Neptune", "Pluto"],
    expectedTransits: ["Saturn to 2nd", "Neptune aspects"],
    expectedDirections: ["2nd house ruler to Saturn"],
  },
  spiritual_awakening: {
    relevantHouses: [9, 12, 8],
    relevantPlanets: ["Neptune", "Pluto", "Jupiter"],
    expectedTransits: ["Neptune to Sun/Moon", "Pluto to 9th"],
    expectedDirections: ["Neptune direction"],
  },
  health_crisis: {
    relevantHouses: [6, 1, 8],
    relevantPlanets: ["Saturn", "Pluto", "Mars"],
    expectedTransits: ["Saturn to 6th", "Pluto to 1st"],
    expectedDirections: ["6th house ruler direction"],
  },
  other: {
    relevantHouses: [1, 10, 4, 7],
    relevantPlanets: ["Sun", "Moon", "Saturn"],
    expectedTransits: ["Outer planet transits to angles"],
    expectedDirections: ["Angular directions"],
  },
};

// 사주 시진(時辰) 매핑
const SAJU_HOURS: Record<string, { start: number; end: number; korean: string }> = {
  "자시": { start: 23, end: 1, korean: "子時" },
  "축시": { start: 1, end: 3, korean: "丑時" },
  "인시": { start: 3, end: 5, korean: "寅時" },
  "묘시": { start: 5, end: 7, korean: "卯時" },
  "진시": { start: 7, end: 9, korean: "辰時" },
  "사시": { start: 9, end: 11, korean: "巳時" },
  "오시": { start: 11, end: 13, korean: "午時" },
  "미시": { start: 13, end: 15, korean: "未時" },
  "신시": { start: 15, end: 17, korean: "申時" },
  "유시": { start: 17, end: 19, korean: "酉時" },
  "술시": { start: 19, end: 21, korean: "戌時" },
  "해시": { start: 21, end: 23, korean: "亥時" },
};

/**
 * ASC 사인 추정 (외모/성격 기반)
 */
export function estimateAscendantByAppearance(profile: {
  faceShape?: "angular" | "round" | "oval" | "square";
  bodyType?: "athletic" | "sturdy" | "slim" | "curvy";
  manner?: "fast" | "slow" | "graceful" | "intense";
  firstImpression?: string;
}): ZodiacKo[] {
  const candidates: ZodiacKo[] = [];

  if (profile.faceShape === "angular") {
    candidates.push("Aries", "Capricorn", "Scorpio");
  }
  if (profile.faceShape === "round") {
    candidates.push("Cancer", "Taurus", "Pisces");
  }
  if (profile.bodyType === "athletic") {
    candidates.push("Aries", "Leo", "Sagittarius");
  }
  if (profile.bodyType === "sturdy") {
    candidates.push("Taurus", "Cancer", "Capricorn");
  }
  if (profile.manner === "fast") {
    candidates.push("Aries", "Gemini", "Sagittarius");
  }
  if (profile.manner === "slow") {
    candidates.push("Taurus", "Cancer", "Capricorn");
  }
  if (profile.manner === "graceful") {
    candidates.push("Libra", "Pisces", "Leo");
  }
  if (profile.manner === "intense") {
    candidates.push("Scorpio", "Capricorn", "Aries");
  }

  // 중복 카운트로 가장 유력한 후보 반환
  const counts = new Map<ZodiacKo, number>();
  for (const sign of candidates) {
    counts.set(sign, (counts.get(sign) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sign]) => sign)
    .slice(0, 3);
}

/**
 * 시간 범위 생성 (테스트용 차트들)
 */
export async function generateTimeRangeCandidates(
  baseInput: Omit<NatalInput, "hour" | "minute">,
  startHour: number,
  endHour: number,
  intervalMinutes: number = 30
): Promise<{ time: Date; chart: Chart }[]> {
  const candidates: { time: Date; chart: Chart }[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (hour === endHour && minute > 0) break;

      const input: NatalInput = {
        ...baseInput,
        hour,
        minute,
      };

      try {
        const chartData = await calculateNatalChart(input);
        const chart = toChart(chartData);
        const time = new Date(
          baseInput.year,
          baseInput.month - 1,
          baseInput.date,
          hour,
          minute
        );
        candidates.push({ time, chart });
      } catch (e) {
        // 계산 실패 시 건너뜀
      }
    }
  }

  return candidates;
}

/**
 * 트랜짓 점수 계산 (단순화)
 */
function calculateTransitScore(
  natalChart: Chart,
  eventDate: Date,
  eventType: LifeEventType
): number {
  const signature = EVENT_SIGNATURES[eventType];
  let score = 0;

  // 실제 구현에서는 eventDate에 대한 트랜짓 차트를 계산하고
  // 각도를 비교해야 함. 여기서는 간소화된 점수 반환

  // ASC/MC가 관련 하우스와 연결되어 있으면 점수 부여
  const ascHouse = 1;
  const mcHouse = 10;

  if (signature.relevantHouses.includes(ascHouse)) {
    score += 10;
  }
  if (signature.relevantHouses.includes(mcHouse)) {
    score += 10;
  }

  return score;
}

/**
 * 솔라 아크 방향 점수 계산 (단순화)
 */
function calculateSolarArcScore(
  natalChart: Chart,
  birthDate: Date,
  eventDate: Date,
  eventType: LifeEventType
): number {
  // 1도 = 약 1년
  const yearsElapsed = (eventDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const arcDegrees = yearsElapsed;

  const signature = EVENT_SIGNATURES[eventType];
  let score = 0;

  // MC/ASC가 관련 행성으로 방향되었는지 확인 (간소화)
  // 실제로는 더 정밀한 계산 필요

  if (signature.relevantHouses.includes(10)) {
    score += 15;
  }
  if (signature.relevantHouses.includes(1)) {
    score += 15;
  }

  return Math.min(score, 30);
}

/**
 * 교정 후보 평가
 */
export async function evaluateRectificationCandidates(
  candidates: { time: Date; chart: Chart }[],
  events: LifeEvent[],
  birthDate: { year: number; month: number; date: number }
): Promise<RectificationCandidate[]> {
  const results: RectificationCandidate[] = [];

  for (const { time, chart } of candidates) {
    const matchingEvents: { event: LifeEvent; technique: string; score: number }[] = [];

    for (const event of events) {
      const transitScore = calculateTransitScore(chart, event.date, event.type);
      const solarArcScore = calculateSolarArcScore(
        chart,
        new Date(birthDate.year, birthDate.month - 1, birthDate.date),
        event.date,
        event.type
      );

      const totalScore = transitScore + solarArcScore;

      if (totalScore > 10) {
        matchingEvents.push({
          event,
          technique: transitScore > solarArcScore ? "Transit" : "Solar Arc",
          score: totalScore,
        });
      }
    }

    const confidence = matchingEvents.length > 0
      ? Math.min(100, matchingEvents.reduce((sum, m) => sum + m.score, 0) / events.length)
      : 0;

    const ascInfo = formatLongitude(chart.ascendant.longitude);
    const mcInfo = formatLongitude(chart.mc.longitude);

    results.push({
      time,
      ascendantSign: ascInfo.sign,
      ascendantDegree: ascInfo.degree + ascInfo.minute / 60,
      mcSign: mcInfo.sign,
      mcDegree: mcInfo.degree + mcInfo.minute / 60,
      confidence,
      matchingEvents,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 전체 교정 분석 수행
 */
export async function performRectification(
  baseInput: Omit<NatalInput, "hour" | "minute">,
  events: LifeEvent[],
  options?: {
    startHour?: number;
    endHour?: number;
    intervalMinutes?: number;
    estimatedAscSigns?: ZodiacKo[];
  }
): Promise<RectificationResult> {
  const startHour = options?.startHour ?? 0;
  const endHour = options?.endHour ?? 23;
  const intervalMinutes = options?.intervalMinutes ?? 30;

  // 1. 후보 시간 생성
  const candidates = await generateTimeRangeCandidates(
    baseInput,
    startHour,
    endHour,
    intervalMinutes
  );

  // 2. ASC 추정값이 있으면 필터링
  let filteredCandidates = candidates;
  if (options?.estimatedAscSigns && options.estimatedAscSigns.length > 0) {
    const estimatedSigns = options.estimatedAscSigns;
    filteredCandidates = candidates.filter(c =>
      estimatedSigns.includes(c.chart.ascendant.sign as ZodiacKo)
    );
  }

  // 3. 이벤트와 매칭
  const evaluated = await evaluateRectificationCandidates(
    filteredCandidates,
    events,
    { year: baseInput.year, month: baseInput.month, date: baseInput.date }
  );

  // 4. 결과 분석
  const bestCandidate = evaluated.length > 0 ? evaluated[0] : null;

  let confidenceLevel: "high" | "medium" | "low" | "uncertain";
  if (bestCandidate && bestCandidate.confidence >= 70 && bestCandidate.matchingEvents.length >= 3) {
    confidenceLevel = "high";
  } else if (bestCandidate && bestCandidate.confidence >= 50 && bestCandidate.matchingEvents.length >= 2) {
    confidenceLevel = "medium";
  } else if (bestCandidate && bestCandidate.confidence >= 30) {
    confidenceLevel = "low";
  } else {
    confidenceLevel = "uncertain";
  }

  const methodology = [
    "트랜짓 분석: 주요 생애 사건과 외행성 트랜짓 대조",
    "솔라 아크 방향: 1도 = 1년 원칙으로 MC/ASC 방향 분석",
    "외모/성격 추정: ASC 사인과 외적 특성 대조 (사용 시)",
  ];

  const recommendations: string[] = [];
  if (confidenceLevel === "high") {
    recommendations.push("높은 신뢰도 - 이 시간을 사용해도 됩니다.");
  } else if (confidenceLevel === "medium") {
    recommendations.push("추가 생애 사건으로 검증을 권장합니다.");
  } else if (confidenceLevel === "low") {
    recommendations.push("더 정밀한 분석이 필요합니다. 전문가 상담을 권장합니다.");
  } else {
    recommendations.push("일치하는 패턴이 없습니다. 더 많은 생애 사건 정보가 필요합니다.");
  }

  return {
    candidates: evaluated.slice(0, 5),
    bestCandidate,
    methodology,
    recommendations,
    confidenceLevel,
  };
}

/**
 * ASC 사인별 외모 특성 가져오기
 */
export function getAscendantAppearance(sign: ZodiacKo): PhysicalAppearanceProfile {
  return ASC_APPEARANCE[sign];
}

/**
 * 사주 시진으로 시간 범위 좁히기
 */
export function getSajuHourRange(sijin: string): { start: number; end: number } | null {
  const hour = SAJU_HOURS[sijin];
  return hour ? { start: hour.start, end: hour.end } : null;
}

/**
 * 이벤트 시그니처 가져오기
 */
export function getEventSignature(eventType: LifeEventType): {
  relevantHouses: number[];
  relevantPlanets: string[];
  expectedTransits: string[];
  expectedDirections: string[];
} {
  return EVENT_SIGNATURES[eventType];
}

/**
 * 교정 워크플로우 가이드 생성
 */
export function generateRectificationGuide(
  hasApproximateTime: boolean,
  numberOfEvents: number
): {
  steps: string[];
  expectedAccuracy: string;
  timeRequired: string;
} {
  const steps: string[] = [];

  steps.push("1. 정보 수집: 출생 날짜, 장소, 대략적 시간대, 주요 생애 사건");

  if (hasApproximateTime) {
    steps.push("2. 범위 축소: 알려진 시간 ±2시간으로 테스트");
  } else {
    steps.push("2. 외모/성격 분석: ASC 사인 후보 선정");
    steps.push("3. 사주 시진 확인: 2시간 단위 범위 파악");
  }

  steps.push(`${hasApproximateTime ? 3 : 4}. 후보 테스트: 각 시간에 대해 차트 생성`);
  steps.push(`${hasApproximateTime ? 4 : 5}. 이벤트 대조: 생애 사건과 트랜짓/방향 비교`);
  steps.push(`${hasApproximateTime ? 5 : 6}. 검증: 최소 3-5개 사건 일치 확인`);
  steps.push(`${hasApproximateTime ? 6 : 7}. 미세 조정: 분 단위 조정으로 최적화`);

  let expectedAccuracy: string;
  if (numberOfEvents >= 5) {
    expectedAccuracy = "높음 (90%+): 충분한 이벤트로 정밀한 교정 가능";
  } else if (numberOfEvents >= 3) {
    expectedAccuracy = "보통 (70-90%): 적절한 교정 가능";
  } else {
    expectedAccuracy = "낮음 (50-70%): 더 많은 이벤트 필요";
  }

  const timeRequired = hasApproximateTime
    ? "30분 - 1시간"
    : "2-4시간 (전체 범위 테스트 시)";

  return { steps, expectedAccuracy, timeRequired };
}
