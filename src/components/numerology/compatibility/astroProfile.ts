// src/components/numerology/compatibility/astroProfile.ts
// 클라이언트용 간단한 점성 프로필 계산

import type { SimpleAstroProfile } from './types';

const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
] as const;

const ELEMENT_MAP: Record<string, string> = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};

function getElement(sign: string): string {
  return ELEMENT_MAP[sign] || 'fire';
}

// 태양 별자리 계산
function getSunSign(month: number, day: number): string {
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) {return 'aries';}
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) {return 'taurus';}
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) {return 'gemini';}
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) {return 'cancer';}
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) {return 'leo';}
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {return 'virgo';}
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {return 'libra';}
  if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) {return 'scorpio';}
  if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) {return 'sagittarius';}
  if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) {return 'capricorn';}
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) {return 'aquarius';}
  return 'pisces';
}

// 달 별자리 추정 (실제로는 출생 시간과 위치 기반 정밀 계산 필요)
function getMoonSign(sunIndex: number, day: number): string {
  const offset = day % 12;
  return ZODIAC_SIGNS[(sunIndex + offset) % 12];
}

// 금성 별자리 추정 (태양에서 ±2칸 이내)
function getVenusSign(sunIndex: number, month: number, day: number): string {
  const offset = ((month + day) % 5) - 2;
  return ZODIAC_SIGNS[(sunIndex + offset + 12) % 12];
}

// 화성 별자리 추정
function getMarsSign(sunIndex: number, year: number): string {
  const offset = year % 12;
  return ZODIAC_SIGNS[(sunIndex + offset) % 12];
}

// 수성 별자리 추정 (태양에서 ±1칸 이내)
function getMercurySign(sunIndex: number, day: number): string {
  const offset = (day % 3) - 1;
  return ZODIAC_SIGNS[(sunIndex + offset + 12) % 12];
}

// 상승궁 추정 (출생 시간 기반)
function getAscendant(sunIndex: number, hours: number): string {
  const ascIndex = Math.floor(hours / 2) % 12;
  return ZODIAC_SIGNS[(sunIndex + ascIndex) % 12];
}

// 목성 별자리 (년도 기반)
function getJupiterSign(year: number): string {
  return ZODIAC_SIGNS[year % 12];
}

// 토성 별자리 (년도 기반, 약 2.5년 주기)
function getSaturnSign(year: number): string {
  const saturnSigns = ['capricorn', 'aquarius', 'pisces', 'aries', 'taurus', 'gemini',
                       'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius'] as const;
  return saturnSigns[Math.floor(year / 2.5) % 12];
}

/**
 * 클라이언트용 간단한 점성 프로필 계산
 * (실제 천문학적 계산이 아닌 근사치)
 */
export function calculateSimpleAstroProfile(birthDate: string, birthTime: string): SimpleAstroProfile {
  const date = new Date(birthDate);
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();
  const [hours] = (birthTime || '12:00').split(':').map(Number);

  const sunSign = getSunSign(month, day);
  const sunIndex = ZODIAC_SIGNS.indexOf(sunSign as typeof ZODIAC_SIGNS[number]);

  const moonSign = getMoonSign(sunIndex, day);
  const venusSign = getVenusSign(sunIndex, month, day);
  const marsSign = getMarsSign(sunIndex, year);
  const mercurySign = getMercurySign(sunIndex, day);
  const ascendant = getAscendant(sunIndex, hours);
  const jupiterSign = getJupiterSign(year);
  const saturnSign = getSaturnSign(year);

  return {
    sun: { sign: sunSign, element: getElement(sunSign) },
    moon: { sign: moonSign, element: getElement(moonSign) },
    venus: { sign: venusSign, element: getElement(venusSign) },
    mars: { sign: marsSign, element: getElement(marsSign) },
    mercury: { sign: mercurySign, element: getElement(mercurySign) },
    ascendant: { sign: ascendant, element: getElement(ascendant) },
    jupiter: { sign: jupiterSign, element: getElement(jupiterSign) },
    saturn: { sign: saturnSign, element: getElement(saturnSign) },
  };
}
