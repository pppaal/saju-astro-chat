/**
 * Astrology Planets Module
 * 점성학 행성 위치 계산 모듈
 *
 * 주요 기능:
 * - 행성 황경(Longitude) 계산
 * - 행성 별자리 위치 결정
 * - 행성 역행(Retrograde) 상태 확인
 * - 태양 별자리(Sun Sign) 직접 계산
 *
 * 근사값 기반 계산으로 정밀 ephemeris 없이 사용 가능
 * 평균 공전 주기를 바탕으로 각 행성의 위치를 추정합니다.
 *
 * @module astrology-planets
 * @example
 * const sunPos = getPlanetPosition(new Date(2025, 0, 1), "sun");
 * // { sign: "Capricorn", longitude: 280.5, degree: 10.5 }
 *
 * const isRet = isRetrograde(new Date(2025, 3, 1), "mercury");
 * // true or false depending on date
 */

import { ZODIAC_TO_ELEMENT } from './constants';
import { normalizeElement } from './utils';

/**
 * 행성 이름 타입
 */
type PlanetName = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

/**
 * 역행 행성 타입
 */
type RetrogradePlanet = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

/**
 * 행성 위치 정보
 */
export interface PlanetPosition {
  sign: string;
  longitude: number;
  degree: number;
}

/**
 * 역행 상태 정보
 */
export interface RetrogradInfo {
  isRetrograde: boolean;
  planet: string;
  phase: string;
}

/**
 * 행성 별자리 및 황경 근사 계산
 *
 * J2000 기준점(2000년 1월 1일)으로부터의 일수를 계산하여
 * 각 행성의 평균 공전 속도에 따라 현재 위치를 추정합니다.
 *
 * **주의**: 이는 근사값입니다. 정밀한 계산이 필요하면 ephemeris를 사용하세요.
 *
 * @param date - 계산 대상 날짜
 * @param planet - 행성명 ('sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn')
 * @returns 행성의 별자리, 황경, 그리고 해당 별자리 내 도수(0-30도)
 *
 * @example
 * // 태양 위치 계산
 * const sun = getPlanetPosition(new Date(2025, 0, 1), 'sun');
 * // { sign: 'Capricorn', longitude: 280.5, degree: 10.5 }
 *
 * @example
 * // 달 위치 계산 (빠르게 변함)
 * const moon = getPlanetPosition(new Date(2025, 6, 15), 'moon');
 * // { sign: 'Aquarius', longitude: 310, degree: 10 }
 *
 * @example
 * // 목성 위치 (12년 주기)
 * const jupiter = getPlanetPosition(new Date(2025, 0, 1), 'jupiter');
 * // { sign: 'Gemini', longitude: 60, degree: 0 }
 */
export function getPlanetPosition(date: Date, planet: PlanetName): PlanetPosition {
  // J2000 기준점: 2000년 1월 1일 정오 (UTC)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

  // 입력 날짜를 UTC로 변환 (타임존 영향 제거)
  const dateUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0
  );

  // J2000 이후 경과 일수
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  let longitude: number;

  switch (planet) {
    case 'sun':
      // 태양: 1년(365.25일) 공전
      // 근점황경(Longitude of Perihelion) = 280.46°
      // 평균 운동(Mean Motion) = 0.9856474°/일
      longitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
      break;

    case 'moon':
      // 달: 27.3일 공전 (매우 빠른 이동)
      // 근점황경 = 218.32°
      // 평균 운동 = 13.176396°/일
      longitude = (218.32 + 13.176396 * daysSinceJ2000) % 360;
      break;

    case 'mercury':
      // 수성: 88일 공전 (태양 주변을 빠르게 회전)
      // 태양과 유사한 기본 위치에서 시작
      // 수성 고유 주기를 sine 함수로 모델링
      longitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
      longitude = (longitude + Math.sin(daysSinceJ2000 * 0.0712) * 23) % 360;
      break;

    case 'venus':
      // 금성: 225일 공전
      // 근점황경 = 181.98°
      // 평균 운동 = 1.6021°/일
      longitude = (181.98 + 1.6021 * daysSinceJ2000) % 360;
      break;

    case 'mars':
      // 화성: 687일 공전 (~2년)
      // 근점황경 = 355.43°
      // 평균 운동 = 0.5240°/일
      longitude = (355.43 + 0.5240 * daysSinceJ2000) % 360;
      break;

    case 'jupiter':
      // 목성: 4332일 공전 (~12년) - 년운 분석에 매우 중요!
      // 근점황경 = 34.35°
      // 평균 운동 = 0.0831°/일
      // 목성 회귀(Jupiter Return): 약 12년마다 같은 위치로 돌아옴
      longitude = (34.35 + 0.0831 * daysSinceJ2000) % 360;
      break;

    case 'saturn':
      // 토성: 10759일 공전 (~29년) - 시련과 성장
      // 근점황경 = 49.94°
      // 평균 운동 = 0.0335°/일
      // 토성 회귀(Saturn Return): 약 29년마다 같은 위치로 돌아옴
      longitude = (49.94 + 0.0335 * daysSinceJ2000) % 360;
      break;
  }

  // 음수 값 보정
  if (longitude < 0) {
    longitude += 360;
  }

  // 황도 12궁 (Zodiac Signs)
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  // 각 궁은 30도씩
  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = longitude % 30;

  return {
    sign: signs[signIndex],
    longitude,
    degree,
  };
}

/**
 * 행성이 위치한 별자리(Sign) 반환
 *
 * getPlanetPosition()의 간편 래퍼 함수입니다.
 * 별자리 정보만 필요할 때 사용하면 됩니다.
 *
 * @param date - 계산 대상 날짜
 * @param planet - 행성명 ('mercury', 'venus', 'mars')
 * @returns 행성이 위치한 별자리 ('Aries', 'Taurus', ... 'Pisces')
 *
 * @example
 * const mercurySign = getPlanetSign(new Date(2025, 0, 1), 'mercury');
 * // 'Gemini'
 *
 * @example
 * const venusSign = getPlanetSign(new Date(2025, 6, 15), 'venus');
 * // 'Cancer'
 */
export function getPlanetSign(
  date: Date,
  planet: 'mercury' | 'venus' | 'mars'
): string {
  return getPlanetPosition(date, planet).sign;
}

/**
 * 행성 역행(Retrograde) 여부 확인
 *
 * 역행은 지구 관점에서 행성이 역방향으로 움직이는 것처럼 보이는 현상입니다.
 * 각 행성마다 역행 주기와 지속 기간이 다릅니다.
 *
 * **역행의 의미**:
 * - 메시지 전달 오류, 의사소통 혼란
 * - 과거 재검토, 내면 성찰
 * - 기술 문제, 약속 연기
 * - 새로운 시작에는 부적절한 시간
 *
 * @param date - 확인 대상 날짜
 * @param planet - 행성명 ('mercury', 'venus', 'mars', 'jupiter', 'saturn')
 * @returns true면 역행 상태, false면 직행 상태
 *
 * @example
 * // 수성 역행 확인
 * if (isRetrograde(new Date(2025, 3, 15), 'mercury')) {
 *   console.log('Mercury is retrograde - avoid signing contracts');
 * }
 *
 * @example
 * // 금성 역행 확인
 * if (isRetrograde(new Date(2025, 5, 1), 'venus')) {
 *   console.log('Venus is retrograde - review relationships');
 * }
 *
 * @example
 * // 토성 역행 확인 (장기적 영향)
 * if (isRetrograde(new Date(2025, 9, 1), 'saturn')) {
 *   console.log('Saturn is retrograde - internal discipline focus');
 * }
 */
export function isRetrograde(date: Date, planet: RetrogradePlanet): boolean {
  // J2000 기준점
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

  // 입력 날짜를 UTC로 변환
  const dateUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0
  );

  // J2000 이후 경과 일수
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  switch (planet) {
    case 'mercury':
      // 수성 역행: 약 116일 주기 중 21일 역행
      // 연 3-4회 발생, 약 3주간 지속
      const mercuryCycle = daysSinceJ2000 % 116;
      return mercuryCycle >= 0 && mercuryCycle < 21;

    case 'venus':
      // 금성 역행: 약 584일 주기 중 40일 역행
      // 18개월마다 1회, 약 6주간 지속
      const venusCycle = daysSinceJ2000 % 584;
      return venusCycle >= 0 && venusCycle < 40;

    case 'mars':
      // 화성 역행: 약 780일 주기 중 72일 역행
      // 약 2년마다 1회, 약 2.5개월 지속
      const marsCycle = daysSinceJ2000 % 780;
      return marsCycle >= 0 && marsCycle < 72;

    case 'jupiter':
      // 목성 역행: 약 399일 주기 중 121일 역행
      // 매년 약 4개월간 역행
      const jupiterCycle = daysSinceJ2000 % 399;
      return jupiterCycle >= 0 && jupiterCycle < 121;

    case 'saturn':
      // 토성 역행: 약 378일 주기 중 138일 역행
      // 매년 약 4.5개월간 역행
      const saturnCycle = daysSinceJ2000 % 378;
      return saturnCycle >= 0 && saturnCycle < 138;
  }
}

/**
 * 태양 별자리(Sun Sign) 직접 계산
 *
 * 출생 날짜의 월과 일을 기반으로 태양이 위치한 별자리를 계산합니다.
 * 이는 점성학에서 가장 기본이 되는 정보입니다.
 *
 * **참고**: 별자리 경계 날짜는 해마다 1-2일 정도 변할 수 있습니다.
 * 정확한 계산이 필요하면 정확한 출생 시간과 ephemeris가 필요합니다.
 *
 * @param date - 계산 대상 날짜
 * @returns 태양이 위치한 별자리 ('Aries' ~ 'Pisces')
 *
 * @example
 * // 1월 1일 - 염소자리(Capricorn)
 * const sign1 = getSunSign(new Date(2025, 0, 1));
 * // 'Capricorn'
 *
 * @example
 * // 7월 15일 - 암자리(Cancer)
 * const sign2 = getSunSign(new Date(2025, 6, 15));
 * // 'Cancer'
 *
 * @example
 * // 12월 25일 - 염소자리(Capricorn)
 * const sign3 = getSunSign(new Date(2025, 11, 25));
 * // 'Capricorn'
 */
export function getSunSign(date: Date): string {
  const month = date.getMonth(); // 0=Jan, 11=Dec
  const day = date.getDate();

  // 황도 12궁과 날짜 범위 (근사값)
  // 각 궁은 약 30일씩 차지합니다

  // 양자리 (Aries) - 3월 21일 ~ 4월 19일
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) {
    return 'Aries';
  }

  // 황소자리 (Taurus) - 4월 20일 ~ 5월 20일
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) {
    return 'Taurus';
  }

  // 쌍둥이자리 (Gemini) - 5월 21일 ~ 6월 20일
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) {
    return 'Gemini';
  }

  // 게자리 (Cancer) - 6월 21일 ~ 7월 22일
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) {
    return 'Cancer';
  }

  // 사자리 (Leo) - 7월 23일 ~ 8월 22일
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) {
    return 'Leo';
  }

  // 처녀자리 (Virgo) - 8월 23일 ~ 9월 22일
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return 'Virgo';
  }

  // 천칭자리 (Libra) - 9월 23일 ~ 10월 21일
  if ((month === 8 && day >= 23) || (month === 9 && day <= 21)) {
    return 'Libra';
  }

  // 전갈자리 (Scorpio) - 10월 22일 ~ 11월 21일
  if ((month === 9 && day >= 22) || (month === 10 && day <= 21)) {
    return 'Scorpio';
  }

  // 궁수자리 (Sagittarius) - 11월 22일 ~ 12월 21일
  if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) {
    return 'Sagittarius';
  }

  // 염소자리 (Capricorn) - 12월 22일 ~ 1월 19일
  if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) {
    return 'Capricorn';
  }

  // 물병자리 (Aquarius) - 1월 20일 ~ 2월 18일
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) {
    return 'Aquarius';
  }

  // 물고기자리 (Pisces) - 2월 19일 ~ 3월 20일
  return 'Pisces';
}

/**
 * 별자리에서 오행 요소 추출 헬퍼 함수
 *
 * 주어진 별자리의 오행 요소를 반환합니다.
 * 'air'는 'metal'로 정규화됩니다.
 *
 * @param sign - 별자리명
 * @returns 오행 요소 ('fire', 'earth', 'air'/'metal', 'water')
 *
 * @example
 * getSignElement('Aries');
 * // 'fire'
 *
 * @example
 * getSignElement('Aquarius');
 * // 'metal' (원래는 'air')
 */
export function getSignElement(sign: string): string {
  return normalizeElement(ZODIAC_TO_ELEMENT[sign] || 'fire');
}
