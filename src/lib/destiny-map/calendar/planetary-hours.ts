/**
 * Planetary Hours Module (행성 시간 분석)
 * Module 8 of Destiny Calendar System
 *
 * 행성이 지배하는 시간대를 계산하여 최적의 활동 시간을 제안합니다.
 * 칼데아 순서(Chaldean Order)에 따른 전통적인 행성 시간 계산법을 사용합니다.
 *
 * 주요 기능:
 * - 요일별 지배 행성 계산
 * - 시간대별 행성 시간 계산
 * - 행성별 최적 활동 추천
 * - VoC Moon (Void of Course Moon) 체크
 * - 일/월식 영향 분석
 * - 역행 행성 체크
 *
 * @module planetary-hours
 */

import { getPlanetPosition } from './transit-analysis';

/**
 * 행성 시간 행성 타입
 */
export type PlanetaryHourPlanet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";

/**
 * 행성 시간 정보
 */
export interface PlanetaryHourInfo {
  planet: PlanetaryHourPlanet;
  dayRuler: PlanetaryHourPlanet;
  isDay: boolean;
  goodFor: string[];
}

/**
 * VoC Moon 정보
 */
export interface VoidOfCourseMoonInfo {
  isVoid: boolean;
  moonSign: string;
  hoursRemaining: number;
}

/**
 * 일/월식 데이터
 */
interface EclipseData {
  date: Date;
  type: "solar" | "lunar";
  sign: string;
  degree: number;
}

/**
 * 일/월식 영향 정보
 */
export interface EclipseImpact {
  hasImpact: boolean;
  type: "solar" | "lunar" | null;
  intensity: "strong" | "medium" | "weak" | null;
  sign: string | null;
  daysFromEclipse: number | null;
}

/**
 * 역행 행성 타입
 */
export type RetrogradePlanet = "mercury" | "venus" | "mars" | "jupiter" | "saturn";

/**
 * 칼데아 순서 (Chaldean Order) - 가장 느린 행성부터 빠른 행성까지
 * 토성 → 목성 → 화성 → 태양 → 금성 → 수성 → 달
 */
const PLANETARY_HOUR_SEQUENCE: PlanetaryHourPlanet[] = [
  "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"
];

/**
 * 요일별 지배 행성
 * 0 = Sunday (태양), 1 = Monday (달), ..., 6 = Saturday (토성)
 */
const DAY_RULERS: Record<number, PlanetaryHourPlanet> = {
  0: "Sun",      // Sunday (일요일)
  1: "Moon",     // Monday (월요일)
  2: "Mars",     // Tuesday (화요일)
  3: "Mercury",  // Wednesday (수요일)
  4: "Jupiter",  // Thursday (목요일)
  5: "Venus",    // Friday (금요일)
  6: "Saturn",   // Saturday (토요일)
};

/**
 * 행성별 좋은 활동 목록
 */
const PLANETARY_HOUR_USES: Record<PlanetaryHourPlanet, string[]> = {
  Sun: ["리더십", "권위", "성공", "명예", "건강"],
  Moon: ["가정", "직관", "대중", "부동산", "여행"],
  Mercury: ["커뮤니케이션", "문서", "학습", "거래", "계약"],
  Venus: ["사랑", "예술", "아름다움", "재물", "조화"],
  Mars: ["경쟁", "운동", "수술", "용기", "행동"],
  Jupiter: ["확장", "교육", "법률", "해외", "행운"],
  Saturn: ["구조화", "장기계획", "부동산", "책임", "인내"],
};

/**
 * 현재 행성 시간 계산 (간단 버전 - 고정 일출/일몰 사용)
 *
 * 전통적인 행성 시간 계산법:
 * 1. 낮 시간: 일출부터 일몰까지 12등분
 * 2. 밤 시간: 일몰부터 다음날 일출까지 12등분
 * 3. 각 시간은 요일의 지배 행성부터 시작하여 칼데아 순서로 순환
 *
 * 간단화를 위해 6:00-18:00을 낮으로 가정
 *
 * @param date - 계산할 날짜 및 시간
 * @returns 행성 시간 정보
 */
export function getPlanetaryHourForDate(date: Date): PlanetaryHourInfo {
  const dayOfWeek = date.getDay();
  const dayRuler = DAY_RULERS[dayOfWeek];
  const hour = date.getHours();

  // 간단히 6시-18시를 낮으로 가정
  const isDay = hour >= 6 && hour < 18;

  // 낮/밤 시간에 따른 시간 인덱스
  let hourIndex: number;
  if (isDay) {
    hourIndex = Math.floor((hour - 6) / 1); // 낮 시간
  } else {
    hourIndex = hour >= 18 ? (hour - 18) + 12 : (hour + 6) + 12;
  }
  hourIndex = hourIndex % 24;

  // 행성 시간 계산
  const dayRulerIndex = PLANETARY_HOUR_SEQUENCE.indexOf(dayRuler);
  const planetIndex = (dayRulerIndex + hourIndex) % 7;
  const planet = PLANETARY_HOUR_SEQUENCE[planetIndex];

  return {
    planet,
    dayRuler,
    isDay,
    goodFor: PLANETARY_HOUR_USES[planet],
  };
}

/**
 * Void of Course Moon 체크 (간단 버전)
 *
 * 달이 현재 별자리에서 다른 행성과 주요 어스펙트를 형성하지 않는 상태
 * 새로운 시작에 불리한 시간으로, 중요한 결정이나 계약은 피하는 것이 좋음
 *
 * @param date - 확인할 날짜
 * @returns VoC Moon 정보
 */
export function checkVoidOfCourseMoon(date: Date): VoidOfCourseMoonInfo {
  const moonPos = getPlanetPosition(date, "moon");
  const moonDegree = moonPos.degree;

  // 주요 행성들 위치
  const sunPos = getPlanetPosition(date, "sun");
  const mercuryPos = getPlanetPosition(date, "mercury");
  const venusPos = getPlanetPosition(date, "venus");
  const marsPos = getPlanetPosition(date, "mars");
  const jupiterPos = getPlanetPosition(date, "jupiter");
  const saturnPos = getPlanetPosition(date, "saturn");

  const planets = [sunPos, mercuryPos, venusPos, marsPos, jupiterPos, saturnPos];

  // 달이 현재 별자리를 벗어날 때까지 남은 도수
  const degreesToSignEnd = 30 - moonDegree;

  // 달이 현재 별자리 내에서 다른 행성과 어스펙트를 형성하는지 확인
  let hasUpcomingAspect = false;

  for (const planet of planets) {
    // 같은 별자리에 있으면 합 가능
    if (planet.sign === moonPos.sign && planet.degree > moonDegree) {
      hasUpcomingAspect = true;
      break;
    }

    // 다른 어스펙트 각도 확인 (60, 90, 120, 180)
    const aspectAngles = [60, 90, 120, 180];
    for (const angle of aspectAngles) {
      const targetLon = (moonPos.longitude + angle) % 360;
      const targetSign = Math.floor(targetLon / 30);
      const moonCurrentSign = Math.floor(moonPos.longitude / 30);

      // 달이 현재 별자리 안에서 이 어스펙트에 도달할 수 있는지
      if (targetSign === moonCurrentSign) {
        const targetDegree = targetLon % 30;
        if (targetDegree > moonDegree) {
          // 행성이 이 위치 근처에 있는지 (±3도)
          const diff = Math.abs(planet.longitude - targetLon);
          if (diff <= 3 || diff >= 357) {
            hasUpcomingAspect = true;
            break;
          }
        }
      }
    }
    if (hasUpcomingAspect) break;
  }

  // 달 이동 속도: 약 13도/일 = 약 0.54도/시간
  const hoursRemaining = degreesToSignEnd / 0.54;

  return {
    isVoid: !hasUpcomingAspect,
    moonSign: moonPos.sign,
    hoursRemaining: Math.round(hoursRemaining),
  };
}

/**
 * 2024-2030년 주요 일/월식 데이터
 * 출처: NASA Eclipse Website
 */
const ECLIPSES: EclipseData[] = [
  // 2024
  { date: new Date(2024, 2, 25), type: "lunar", sign: "Libra", degree: 5 },
  { date: new Date(2024, 3, 8), type: "solar", sign: "Aries", degree: 19 },
  { date: new Date(2024, 8, 18), type: "lunar", sign: "Pisces", degree: 25 },
  { date: new Date(2024, 9, 2), type: "solar", sign: "Libra", degree: 10 },
  // 2025
  { date: new Date(2025, 2, 14), type: "lunar", sign: "Virgo", degree: 24 },
  { date: new Date(2025, 2, 29), type: "solar", sign: "Aries", degree: 9 },
  { date: new Date(2025, 8, 7), type: "lunar", sign: "Pisces", degree: 15 },
  { date: new Date(2025, 8, 21), type: "solar", sign: "Virgo", degree: 29 },
  // 2026
  { date: new Date(2026, 2, 3), type: "lunar", sign: "Virgo", degree: 14 },
  { date: new Date(2026, 2, 17), type: "solar", sign: "Pisces", degree: 27 },
  { date: new Date(2026, 7, 28), type: "lunar", sign: "Pisces", degree: 5 },
  { date: new Date(2026, 8, 12), type: "solar", sign: "Virgo", degree: 19 },
  // 2027
  { date: new Date(2027, 1, 6), type: "lunar", sign: "Leo", degree: 18 },
  { date: new Date(2027, 1, 20), type: "solar", sign: "Pisces", degree: 1 },
  { date: new Date(2027, 7, 2), type: "lunar", sign: "Aquarius", degree: 10 },
  { date: new Date(2027, 7, 17), type: "solar", sign: "Leo", degree: 24 },
  // 2028
  { date: new Date(2028, 0, 12), type: "lunar", sign: "Cancer", degree: 22 },
  { date: new Date(2028, 0, 26), type: "solar", sign: "Aquarius", degree: 6 },
  { date: new Date(2028, 6, 6), type: "lunar", sign: "Capricorn", degree: 15 },
  { date: new Date(2028, 6, 22), type: "solar", sign: "Cancer", degree: 29 },
  { date: new Date(2028, 11, 5), type: "lunar", sign: "Gemini", degree: 14 },
  { date: new Date(2028, 11, 31), type: "solar", sign: "Capricorn", degree: 10 },
  // 2029
  { date: new Date(2029, 5, 12), type: "lunar", sign: "Sagittarius", degree: 21 },
  { date: new Date(2029, 5, 26), type: "solar", sign: "Cancer", degree: 5 },
  { date: new Date(2029, 11, 5), type: "lunar", sign: "Gemini", degree: 14 },
  { date: new Date(2029, 11, 20), type: "solar", sign: "Sagittarius", degree: 29 },
  // 2030
  { date: new Date(2030, 5, 1), type: "lunar", sign: "Sagittarius", degree: 11 },
  { date: new Date(2030, 5, 15), type: "solar", sign: "Gemini", degree: 25 },
  { date: new Date(2030, 10, 25), type: "lunar", sign: "Taurus", degree: 3 },
  { date: new Date(2030, 11, 9), type: "solar", sign: "Sagittarius", degree: 18 },
];

/**
 * 주어진 날짜에 일/월식 영향이 있는지 확인
 *
 * 영향 범위:
 * - 일/월식 당일: 강한 영향 (strong)
 * - 전후 3일: 중간 영향 (medium)
 * - 전후 7일: 약한 영향 (weak)
 *
 * 일/월식은 중요한 변화와 전환점을 나타내며,
 * 특히 출생 차트의 주요 포인트와 겹칠 때 강력한 영향을 미칩니다.
 *
 * @param date - 확인할 날짜
 * @returns 일/월식 영향 정보
 */
export function checkEclipseImpact(date: Date): EclipseImpact {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  for (const eclipse of ECLIPSES) {
    const eclipseUtc = Date.UTC(eclipse.date.getFullYear(), eclipse.date.getMonth(), eclipse.date.getDate());
    const diffMs = Math.abs(dateUtc - eclipseUtc);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) {
      return { hasImpact: true, type: eclipse.type, intensity: "strong", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    } else if (diffDays <= 3) {
      return { hasImpact: true, type: eclipse.type, intensity: "medium", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    } else if (diffDays <= 7) {
      return { hasImpact: true, type: eclipse.type, intensity: "weak", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    }
  }

  return { hasImpact: false, type: null, intensity: null, sign: null, daysFromEclipse: null };
}

/**
 * 행성 역행 여부 확인 (근사 계산)
 *
 * 역행 주기:
 * - 수성: 약 3주간, 연 3-4회
 * - 금성: 약 40일간, 18개월마다
 * - 화성: 약 2개월간, 2년마다
 * - 목성: 약 4개월간, 매년
 * - 토성: 약 4.5개월간, 매년
 *
 * @param date - 확인할 날짜
 * @param planet - 확인할 행성
 * @returns 역행 여부
 */
export function isRetrograde(date: Date, planet: RetrogradePlanet): boolean {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  switch (planet) {
    case "mercury":
      // 수성 역행: ~116일 주기 중 약 21일 역행
      const mercuryCycle = daysSinceJ2000 % 116;
      return mercuryCycle >= 0 && mercuryCycle < 21;

    case "venus":
      // 금성 역행: ~584일 주기 중 약 40일 역행
      const venusCycle = daysSinceJ2000 % 584;
      return venusCycle >= 0 && venusCycle < 40;

    case "mars":
      // 화성 역행: ~780일 주기 중 약 72일 역행
      const marsCycle = daysSinceJ2000 % 780;
      return marsCycle >= 0 && marsCycle < 72;

    case "jupiter":
      // 목성 역행: ~399일 주기 중 약 121일 역행
      const jupiterCycle = daysSinceJ2000 % 399;
      return jupiterCycle >= 0 && jupiterCycle < 121;

    case "saturn":
      // 토성 역행: ~378일 주기 중 약 138일 역행
      const saturnCycle = daysSinceJ2000 % 378;
      return saturnCycle >= 0 && saturnCycle < 138;
  }
}

/**
 * 주어진 날짜에 역행 중인 모든 행성 목록 반환
 *
 * @param date - 확인할 날짜
 * @returns 역행 중인 행성 목록
 */
export function getRetrogradePlanetsForDate(date: Date): RetrogradePlanet[] {
  const retrograde: RetrogradePlanet[] = [];
  const planets: RetrogradePlanet[] = ["mercury", "venus", "mars", "jupiter", "saturn"];

  for (const planet of planets) {
    if (isRetrograde(date, planet)) {
      retrograde.push(planet);
    }
  }

  return retrograde;
}

/**
 * 태양 별자리 계산 (간단 버전)
 *
 * @param date - 계산할 날짜
 * @returns 태양 별자리
 */
export function getSunSign(date: Date): string {
  const month = date.getMonth();
  const day = date.getDate();

  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) return "Aries";
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) return "Taurus";
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) return "Gemini";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) return "Cancer";
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) return "Leo";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Virgo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Libra";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) return "Scorpio";
  if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) return "Sagittarius";
  if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) return "Capricorn";
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) return "Aquarius";
  return "Pisces";
}
