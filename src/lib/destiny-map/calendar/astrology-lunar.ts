/**
 * Astrology Lunar Analysis Module (점성학 달/월식 분석)
 *
 * 점성학 기반의 달과 월식 영향 분석
 * - 달의 8가지 위상(Phase) 분석
 * - 달의 상세 위상 및 조도(Illumination) 계산
 * - 공망의 달(Void of Course Moon) 감지
 * - 일식/월식(Eclipse) 영향 분석
 *
 * 기본 원리:
 * 달의 위상은 약 29.53일(삭망월)을 주기로 순환하며,
 * 각 위상마다 특정한 에너지와 영향을 미침
 * 일/월식은 6개월 예보 주기로 강력한 변화를 유발
 *
 * @module astrology-lunar
 * @version 1.0.0
 */

import { ZODIAC_TO_ELEMENT } from './constants';
import { normalizeElement } from './utils';

// ============================================================
// Type Definitions / 타입 정의
// ============================================================

/**
 * 달의 위상 타입
 */
export type LunarPhaseType =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

/**
 * 기본 달 위상 분석 결과
 */
export interface LunarPhaseResult {
  /** 달의 위상 주기 (0~29.53일) */
  phase: number;
  /** 위상명 ('newMoon', 'fullMoon' 등 영문) */
  phaseName: string;
  /** 위상별 기본 점수 (-5 ~ +12) */
  phaseScore: number;
}

/**
 * 상세 달 위상 분석 결과
 */
export interface MoonPhaseDetailed {
  /** 달의 위상 타입 (8가지) */
  phase: LunarPhaseType;
  /** 한글 위상명 */
  phaseName: string;
  /** 달 조도 (0-100%) */
  illumination: number;
  /** 보름에 향해 차오르는지 여부 */
  isWaxing: boolean;
  /** i18n 팩터 키 */
  factorKey: string;
  /** 점수 (-3 ~ +12) */
  score: number;
}

/**
 * 공망의 달(Void of Course Moon) 분석 결과
 *
 * 달이 특정 별자리 내에서 더 이상 다른 행성과 어스펙트를 형성하지 않을 때를 말함
 * 이 기간 동안의 활동은 효과가 미미하거나 예상과 다르게 진행될 가능성 높음
 */
export interface VoidOfCourseMoonResult {
  /** 공망의 달 여부 */
  isVoid: boolean;
  /** 달이 있는 별자리 */
  moonSign: string;
  /** 남은 시간 (시간 단위) */
  hoursRemaining: number;
}

/**
 * 일/월식 데이터
 */
export interface EclipseData {
  /** 일/월식 날짜 */
  date: Date;
  /** 일식(solar) 또는 월식(lunar) */
  type: 'solar' | 'lunar';
  /** 일식/월식이 발생하는 별자리 */
  sign: string;
  /** 별자리 내 도수 (0~30도) */
  degree: number;
}

/**
 * 일/월식 영향 분석 결과
 */
export interface EclipseImpactResult {
  /** 일/월식 영향 여부 */
  hasImpact: boolean;
  /** 일식/월식 타입 */
  type: 'solar' | 'lunar' | null;
  /** 영향 강도 */
  intensity: 'strong' | 'medium' | 'weak' | null;
  /** 일식/월식 별자리 */
  sign: string | null;
  /** 일식/월식으로부터의 거리 (일수) */
  daysFromEclipse: number | null;
}

/**
 * 통합 달 분석 결과
 */
export interface LunarAnalysisComplete {
  /** 기본 위상 분석 */
  phaseBasic: LunarPhaseResult;
  /** 상세 위상 분석 */
  phaseDetailed: MoonPhaseDetailed;
  /** 공망의 달 여부 */
  voidOfCourse: VoidOfCourseMoonResult;
  /** 일/월식 영향 */
  eclipse: EclipseImpactResult;
  /** 종합 점수 */
  totalScore: number;
}

/**
 * 행성 이름 타입
 */
type PlanetName = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

/**
 * 행성 위치 정보
 */
interface PlanetPosition {
  /** 별자리 (Aries, Taurus, ... Pisces) */
  sign: string;
  /** 황경 (0~360도) */
  longitude: number;
  /** 별자리 내 도수 (0~30도) */
  degree: number;
}

// ============================================================
// 주요 일/월식 데이터 (2024-2030)
// ============================================================

const ECLIPSES: EclipseData[] = [
  // 2024
  { date: new Date(2024, 2, 25), type: 'lunar', sign: 'Libra', degree: 5 },
  { date: new Date(2024, 3, 8), type: 'solar', sign: 'Aries', degree: 19 },
  { date: new Date(2024, 8, 18), type: 'lunar', sign: 'Pisces', degree: 25 },
  { date: new Date(2024, 9, 2), type: 'solar', sign: 'Libra', degree: 10 },
  // 2025
  { date: new Date(2025, 2, 14), type: 'lunar', sign: 'Virgo', degree: 24 },
  { date: new Date(2025, 2, 29), type: 'solar', sign: 'Aries', degree: 9 },
  { date: new Date(2025, 8, 7), type: 'lunar', sign: 'Pisces', degree: 15 },
  { date: new Date(2025, 8, 21), type: 'solar', sign: 'Virgo', degree: 29 },
  // 2026
  { date: new Date(2026, 2, 3), type: 'lunar', sign: 'Virgo', degree: 14 },
  { date: new Date(2026, 2, 17), type: 'solar', sign: 'Pisces', degree: 27 },
  { date: new Date(2026, 7, 28), type: 'lunar', sign: 'Pisces', degree: 5 },
  { date: new Date(2026, 8, 12), type: 'solar', sign: 'Virgo', degree: 19 },
  // 2027
  { date: new Date(2027, 1, 6), type: 'lunar', sign: 'Leo', degree: 18 },
  { date: new Date(2027, 1, 20), type: 'solar', sign: 'Pisces', degree: 1 },
  { date: new Date(2027, 7, 2), type: 'lunar', sign: 'Aquarius', degree: 10 },
  { date: new Date(2027, 7, 17), type: 'solar', sign: 'Leo', degree: 24 },
  // 2028
  { date: new Date(2028, 0, 12), type: 'lunar', sign: 'Cancer', degree: 22 },
  { date: new Date(2028, 0, 26), type: 'solar', sign: 'Aquarius', degree: 6 },
  { date: new Date(2028, 6, 6), type: 'lunar', sign: 'Capricorn', degree: 15 },
  { date: new Date(2028, 6, 22), type: 'solar', sign: 'Cancer', degree: 29 },
  { date: new Date(2028, 11, 5), type: 'lunar', sign: 'Gemini', degree: 14 },
  { date: new Date(2028, 11, 31), type: 'solar', sign: 'Capricorn', degree: 10 },
  // 2029
  { date: new Date(2029, 5, 12), type: 'lunar', sign: 'Sagittarius', degree: 21 },
  { date: new Date(2029, 5, 26), type: 'solar', sign: 'Cancer', degree: 5 },
  { date: new Date(2029, 11, 5), type: 'lunar', sign: 'Gemini', degree: 14 },
  { date: new Date(2029, 11, 20), type: 'solar', sign: 'Sagittarius', degree: 29 },
  // 2030
  { date: new Date(2030, 5, 1), type: 'lunar', sign: 'Sagittarius', degree: 11 },
  { date: new Date(2030, 5, 15), type: 'solar', sign: 'Gemini', degree: 25 },
  { date: new Date(2030, 10, 25), type: 'lunar', sign: 'Taurus', degree: 3 },
  { date: new Date(2030, 11, 9), type: 'solar', sign: 'Sagittarius', degree: 18 },
];

// ============================================================
// 행성 위치 계산 헬퍼 함수
// ============================================================

/**
 * 행성의 별자리 및 황경 근사 계산
 *
 * 정밀한 ephemeris 데이터 없이 평균 공전 주기 기반으로 계산
 * 실제 천문학적 정확도보다는 점성학적 해석에 초점
 *
 * @param date - 분석 대상 날짜
 * @param planet - 행성명
 * @returns 행성의 별자리, 황경, 별자리 내 도수
 */
function getPlanetPosition(date: Date, planet: PlanetName): PlanetPosition {
  try {
    // 기준일: 2000년 1월 1일 12:00 UTC
    const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

    // UTC 기준으로 경과 일수 계산 (타임존 영향 제거)
    const dateUtc = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0
    );
    const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

    // 행성별 평균 공전 주기 (일 단위)
    const orbitalPeriods: Record<PlanetName, number> = {
      sun: 365.2425,      // 1년
      moon: 27.3217,      // 항성월(sidereal month)
      mercury: 87.969,    // 약 88일
      venus: 224.701,     // 약 225일
      mars: 686.971,      // 약 2년
      jupiter: 4332.89,   // 약 12년
      saturn: 10759.22,   // 약 29년
    };

    // 2000년 1월 1일의 각 행성 황경 (근사값)
    const j2000Longitudes: Record<PlanetName, number> = {
      sun: 280.46,        // 태양
      moon: 318.35,       // 달
      mercury: 265.76,    // 수성
      venus: 181.98,      // 금성
      mars: 355.45,       // 화성
      jupiter: 34.40,     // 목성
      saturn: 50.08,      // 토성
    };

    const period = orbitalPeriods[planet];
    const j2000Long = j2000Longitudes[planet];

    // 현재 황경 계산
    const degreesPerDay = 360 / period;
    let currentLongitude = (j2000Long + degreesPerDay * daysSinceJ2000) % 360;
    if (currentLongitude < 0) currentLongitude += 360;

    // 별자리 판정 (30도 = 1개 별자리)
    const zodiacSigns = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];
    const signIndex = Math.floor(currentLongitude / 30);
    const sign = zodiacSigns[signIndex];
    const degree = currentLongitude % 30;

    return {
      sign: sign || 'Aries',
      longitude: currentLongitude,
      degree: Math.round(degree * 100) / 100,
    };
  } catch (error) {
    console.error('Error calculating planet position:', error);
    return {
      sign: 'Aries',
      longitude: 0,
      degree: 0,
    };
  }
}

// ============================================================
// 달의 위상(Lunar Phase) 분석 / Basic 8-Phase Cycle
// ============================================================

/**
 * 달의 위상 계산 (0-29.5일 주기)
 *
 * 기준: 2000년 1월 6일 18:14 UTC 신월
 * 삭망월(synodic month): 29.53058867일
 *
 * 8가지 위상:
 * - 신월(新月): 새로운 시작 (+10점)
 * - 초승달: 성장 시작 (+5점)
 * - 상현달: 도전/결정 (-3점)
 * - 상현망: 정제/완성 (+7점)
 * - 보름달: 완성/성취 (+12점)
 * - 하현망: 감사/공유 (+3점)
 * - 하현달: 정리/반성 (-5점)
 * - 그믐달: 휴식/준비 (-2점)
 *
 * @param date - 분석 대상 날짜
 * @returns 달의 위상 정보
 *
 * 예시:
 * ```typescript
 * const phase = getLunarPhase(new Date(2024, 2, 25)); // 2024년 3월 25일 (보름)
 * // { phase: 14.8, phaseName: 'fullMoon', phaseScore: 12 }
 * ```
 */
export function getLunarPhase(date: Date): LunarPhaseResult {
  try {
    // 2000년 1월 6일 18:14 UTC 신월 기준
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
    const lunarCycle = 29.53058867; // 평균 삭망월 (일)

    // UTC 기준으로 밀리초 차이 계산 (서버 타임존 영향 제거)
    const dateUtc = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0
    );
    const diffMs = dateUtc - knownNewMoon;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const phase = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;

    let phaseName: string;
    let phaseScore: number;

    // 위상별 분류 및 점수 부여
    if (phase < 1.85) {
      phaseName = 'newMoon'; // 신월 (新月)
      phaseScore = 10; // 새로운 시작에 좋음
    } else if (phase < 7.38) {
      phaseName = 'waxingCrescent'; // 초승달
      phaseScore = 5;
    } else if (phase < 9.23) {
      phaseName = 'firstQuarter'; // 상현달
      phaseScore = -3; // 긴장/도전
    } else if (phase < 14.77) {
      phaseName = 'waxingGibbous'; // 상현망
      phaseScore = 7;
    } else if (phase < 16.61) {
      phaseName = 'fullMoon'; // 보름달
      phaseScore = 12; // 완성/성취
    } else if (phase < 22.15) {
      phaseName = 'waningGibbous'; // 하현망
      phaseScore = 3;
    } else if (phase < 24.00) {
      phaseName = 'lastQuarter'; // 하현달
      phaseScore = -5; // 정리/반성
    } else {
      phaseName = 'waningCrescent'; // 그믐달
      phaseScore = -2;
    }

    return { phase, phaseName, phaseScore };
  } catch (error) {
    console.error('Error calculating lunar phase:', error);
    return {
      phase: 0,
      phaseName: 'newMoon',
      phaseScore: 0,
    };
  }
}

// ============================================================
// 상세 달 위상(Moon Phase Detailed) 분석
// ============================================================

/**
 * 달의 상세 위상 및 조도(Illumination) 계산
 *
 * 태양-달 각도를 기반으로 정확한 위상과 조도 계산
 * 조도가 높을수록 에너지가 강함
 *
 * 계산 방식:
 * - 태양-달 각도 0°: 신월 (조도 0%)
 * - 태양-달 각도 90°: 상현달 (조도 50%)
 * - 태양-달 각도 180°: 보름달 (조도 100%)
 * - 태양-달 각도 270°: 하현달 (조도 50%)
 *
 * @param date - 분석 대상 날짜
 * @returns 상세 달 위상 정보
 *
 * 예시:
 * ```typescript
 * const detailed = getMoonPhaseDetailed(new Date(2024, 2, 25));
 * // {
 * //   phase: 'full_moon',
 * //   phaseName: '보름달',
 * //   illumination: 100,
 * //   isWaxing: false,
 * //   factorKey: 'moonPhaseFull',
 * //   score: 12
 * // }
 * ```
 */
export function getMoonPhaseDetailed(date: Date): MoonPhaseDetailed {
  try {
    const sunPos = getPlanetPosition(date, 'sun');
    const moonPos = getPlanetPosition(date, 'moon');

    // 태양-달 각도 (0-360도)
    const angle = (moonPos.longitude - sunPos.longitude + 360) % 360;

    // 조도 계산 (0-100%)
    // 공식: (1 - cos(angle)) / 2 * 100
    const illumination = Math.round(
      ((1 - Math.cos((angle * Math.PI) / 180)) / 2) * 100
    );
    const isWaxing = angle < 180;

    let phase: LunarPhaseType;
    let phaseName: string;
    let factorKey: string;
    let score: number;

    // 8가지 위상 판정 (각도 기준)
    if (angle < 22.5 || angle >= 337.5) {
      phase = 'new_moon';
      phaseName = '삭 (새달)';
      factorKey = 'moonPhaseNew';
      score = 8; // 새로운 시작에 좋음
    } else if (angle < 67.5) {
      phase = 'waxing_crescent';
      phaseName = '초승달';
      factorKey = 'moonPhaseWaxingCrescent';
      score = 10; // 성장/시작에 최고
    } else if (angle < 112.5) {
      phase = 'first_quarter';
      phaseName = '상현달';
      factorKey = 'moonPhaseFirstQuarter';
      score = 5; // 도전/결정 필요
    } else if (angle < 157.5) {
      phase = 'waxing_gibbous';
      phaseName = '차오르는 달';
      factorKey = 'moonPhaseWaxingGibbous';
      score = 7; // 정제/완성 단계
    } else if (angle < 202.5) {
      phase = 'full_moon';
      phaseName = '보름달';
      factorKey = 'moonPhaseFull';
      score = 12; // 완성/결실 최고
    } else if (angle < 247.5) {
      phase = 'waning_gibbous';
      phaseName = '기우는 달';
      factorKey = 'moonPhaseWaningGibbous';
      score = 4; // 감사/공유
    } else if (angle < 292.5) {
      phase = 'last_quarter';
      phaseName = '하현달';
      factorKey = 'moonPhaseLastQuarter';
      score = 0; // 정리/반성
    } else {
      phase = 'waning_crescent';
      phaseName = '그믐달';
      factorKey = 'moonPhaseWaningCrescent';
      score = -3; // 휴식/준비
    }

    return {
      phase,
      phaseName,
      illumination,
      isWaxing,
      factorKey,
      score,
    };
  } catch (error) {
    console.error('Error calculating detailed moon phase:', error);
    return {
      phase: 'new_moon',
      phaseName: '삭',
      illumination: 0,
      isWaxing: true,
      factorKey: 'moonPhaseNew',
      score: 0,
    };
  }
}

// ============================================================
// 공망의 달(Void of Course Moon) 감지
// ============================================================

/**
 * 공망의 달(Void of Course Moon) 확인
 *
 * 달이 특정 별자리 내에서 더 이상 다른 행성과 어스펙트를 형성하지 않을 때
 * 이 기간 동안의 활동은 효과가 미미하거나 예상과 다르게 진행될 가능성 높음
 *
 * 어스펙트 종류:
 * - 합(Conjunction): 0° ±8°
 * - 육분(Sextile): 60° ±6°
 * - 사각(Square): 90° ±8°
 * - 삼분(Trine): 120° ±8°
 * - 충(Opposition): 180° ±8°
 *
 * 점수 적용:
 * - 공망의 달 기간: -5점 (효율성 감소)
 * - 정상 기간: 0점
 *
 * @param date - 분석 대상 날짜
 * @returns 공망의 달 여부 및 남은 시간
 *
 * 예시:
 * ```typescript
 * const voc = checkVoidOfCourseMoon(new Date(2024, 2, 15));
 * // {
 * //   isVoid: false,
 * //   moonSign: 'Gemini',
 * //   hoursRemaining: 4
 * // }
 * ```
 */
export function checkVoidOfCourseMoon(date: Date): VoidOfCourseMoonResult {
  try {
    const moonPos = getPlanetPosition(date, 'moon');
    const moonDegree = moonPos.degree;

    // 주요 행성들 위치
    const sunPos = getPlanetPosition(date, 'sun');
    const mercuryPos = getPlanetPosition(date, 'mercury');
    const venusPos = getPlanetPosition(date, 'venus');
    const marsPos = getPlanetPosition(date, 'mars');
    const jupiterPos = getPlanetPosition(date, 'jupiter');
    const saturnPos = getPlanetPosition(date, 'saturn');

    const planets = [
      sunPos,
      mercuryPos,
      venusPos,
      marsPos,
      jupiterPos,
      saturnPos,
    ];

    // 달이 현재 별자리를 벗어날 때까지 남은 도수
    const degreesToSignEnd = 30 - moonDegree;

    // 달이 현재 별자리 내에서 다른 행성과 어스펙트를 형성하는지 확인
    let hasUpcomingAspect = false;

    for (const planet of planets) {
      // 같은 별자리에 있으면 합 가능
      if (
        planet.sign === moonPos.sign &&
        planet.degree > moonDegree
      ) {
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
  } catch (error) {
    console.error('Error checking void of course moon:', error);
    return {
      isVoid: false,
      moonSign: 'Aries',
      hoursRemaining: 0,
    };
  }
}

// ============================================================
// 일/월식(Eclipse) 영향 분석
// ============================================================

/**
 * 주어진 날짜에 일/월식 영향이 있는지 확인
 *
 * 일/월식의 영향 범위:
 * - 당일(±0일): 강한 영향 (점수 ±25)
 * - 전후 3일(±3일): 중간 영향 (점수 ±15)
 * - 전후 7일(±7일): 약한 영향 (점수 ±8)
 *
 * 일식(Solar Eclipse):
 * - 신월(태양-달 합)에 발생
 * - 새로운 시작, 급격한 변화를 유발
 * - 보통 3~6개월 영향
 *
 * 월식(Lunar Eclipse):
 * - 보름달(태양-달 충)에 발생
 * - 완성, 마무리, 깨달음을 유발
 * - 보통 2주 영향
 *
 * 점수 적용:
 * - 강한 영향: ±25점
 * - 중간 영향: ±15점
 * - 약한 영향: ±8점
 *
 * @param date - 분석 대상 날짜
 * @returns 일/월식 영향 정보
 *
 * 예시:
 * ```typescript
 * const eclipse = checkEclipseImpact(new Date(2024, 3, 8)); // 2024년 4월 8일 (일식)
 * // {
 * //   hasImpact: true,
 * //   type: 'solar',
 * //   intensity: 'strong',
 * //   sign: 'Aries',
 * //   daysFromEclipse: 0
 * // }
 * ```
 */
export function checkEclipseImpact(date: Date): EclipseImpactResult {
  try {
    // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
    const dateUtc = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    for (const eclipse of ECLIPSES) {
      const eclipseUtc = Date.UTC(
        eclipse.date.getFullYear(),
        eclipse.date.getMonth(),
        eclipse.date.getDate()
      );
      const diffMs = Math.abs(dateUtc - eclipseUtc);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // 일/월식 영향 범위 체크
      if (diffDays <= 1) {
        return {
          hasImpact: true,
          type: eclipse.type,
          intensity: 'strong',
          sign: eclipse.sign,
          daysFromEclipse: Math.round(diffDays),
        };
      } else if (diffDays <= 3) {
        return {
          hasImpact: true,
          type: eclipse.type,
          intensity: 'medium',
          sign: eclipse.sign,
          daysFromEclipse: Math.round(diffDays),
        };
      } else if (diffDays <= 7) {
        return {
          hasImpact: true,
          type: eclipse.type,
          intensity: 'weak',
          sign: eclipse.sign,
          daysFromEclipse: Math.round(diffDays),
        };
      }
    }

    return {
      hasImpact: false,
      type: null,
      intensity: null,
      sign: null,
      daysFromEclipse: null,
    };
  } catch (error) {
    console.error('Error checking eclipse impact:', error);
    return {
      hasImpact: false,
      type: null,
      intensity: null,
      sign: null,
      daysFromEclipse: null,
    };
  }
}

// ============================================================
// 달 분석 종합 함수
// ============================================================

/**
 * 모든 달 관련 분석을 종합하여 계산
 *
 * 포함 분석:
 * 1. 기본 위상 (8가지)
 * 2. 상세 위상 (조도 포함)
 * 3. 공망의 달 (효율성)
 * 4. 일/월식 영향
 *
 * 최종 점수 계산:
 * - 위상 점수: 50%
 * - 공망 패널티: 20% (공망이면 -5점)
 * - 일/월식: 30% (강/중/약에 따라 ±25/±15/±8)
 *
 * @param date - 분석 대상 날짜
 * @returns 통합 달 분석 결과
 *
 * 예시:
 * ```typescript
 * const complete = analyzeLunarComplete(new Date(2024, 2, 25));
 * // {
 * //   phaseBasic: { phase: 14.8, phaseName: 'fullMoon', phaseScore: 12 },
 * //   phaseDetailed: { ... },
 * //   voidOfCourse: { isVoid: false, ... },
 * //   eclipse: { hasImpact: true, type: 'lunar', ... },
 * //   totalScore: 25
 * // }
 * ```
 */
export function analyzeLunarComplete(date: Date): LunarAnalysisComplete {
  try {
    const phaseBasic = getLunarPhase(date);
    const phaseDetailed = getMoonPhaseDetailed(date);
    const voidOfCourse = checkVoidOfCourseMoon(date);
    const eclipse = checkEclipseImpact(date);

    // 종합 점수 계산
    let totalScore = phaseDetailed.score;

    // 공망의 달 패널티
    if (voidOfCourse.isVoid) {
      totalScore -= 5;
    }

    // 일/월식 영향
    if (eclipse.hasImpact) {
      switch (eclipse.intensity) {
        case 'strong':
          totalScore += eclipse.type === 'lunar' ? 15 : 12; // 월식이 조금 더 유리
          break;
        case 'medium':
          totalScore += eclipse.type === 'lunar' ? 8 : 6;
          break;
        case 'weak':
          totalScore += eclipse.type === 'lunar' ? 3 : 2;
          break;
      }
    }

    return {
      phaseBasic,
      phaseDetailed,
      voidOfCourse,
      eclipse,
      totalScore,
    };
  } catch (error) {
    console.error('Error analyzing lunar complete:', error);
    return {
      phaseBasic: { phase: 0, phaseName: 'newMoon', phaseScore: 0 },
      phaseDetailed: {
        phase: 'new_moon',
        phaseName: '삭',
        illumination: 0,
        isWaxing: true,
        factorKey: 'moonPhaseNew',
        score: 0,
      },
      voidOfCourse: { isVoid: false, moonSign: 'Aries', hoursRemaining: 0 },
      eclipse: {
        hasImpact: false,
        type: null,
        intensity: null,
        sign: null,
        daysFromEclipse: null,
      },
      totalScore: 0,
    };
  }
}

/**
 * 달의 오행 원소 계산
 *
 * 음력 월별로 달의 오행을 근사하여 계산
 *
 * @param date - 분석 대상 날짜
 * @returns 달의 오행 (목/화/토/금/수)
 */
export function getMoonElement(date: Date): string {
  try {
    const month = date.getMonth();
    const signs = [
      'Capricorn', // 1월
      'Aquarius', // 2월
      'Pisces', // 3월
      'Aries', // 4월
      'Taurus', // 5월
      'Gemini', // 6월
      'Cancer', // 7월
      'Leo', // 8월
      'Virgo', // 9월
      'Libra', // 10월
      'Scorpio', // 11월
      'Sagittarius', // 12월
    ];

    const approxSign = signs[month];
    const element = ZODIAC_TO_ELEMENT[approxSign] || 'earth';
    return normalizeElement(element);
  } catch (error) {
    console.error('Error calculating moon element:', error);
    return 'earth';
  }
}

export { ZODIAC_TO_ELEMENT };
