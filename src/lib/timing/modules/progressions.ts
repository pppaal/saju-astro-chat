// src/lib/prediction/modules/progressions.ts
// 진행법 (Progressions) 계산 모듈

import type { ProgressionResult } from './types'

// ============================================================
// 진행법 계산 함수
// ============================================================

/**
 * 2차 진행법 계산 (1일 = 1년)
 */
export function calculateSecondaryProgression(
  birthDate: Date,
  targetDate: Date
): ProgressionResult['secondaryProgression'] {
  // UTC 기준으로 연수 계산 (서버 타임존 영향 제거)
  const birthUtc = Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  const yearsDiff = (targetUtc - birthUtc) / (1000 * 60 * 60 * 24 * 365.25)
  const progressedDate = new Date(birthDate.getTime() + yearsDiff * 24 * 60 * 60 * 1000)

  // 태양 위치 계산 (간단한 근사)
  const sunLongitude = (progressedDate.getMonth() + progressedDate.getDate() / 30) * 30
  const sunSign = getZodiacSign(sunLongitude)

  // 달 위치 계산 (하루에 약 13도 이동)
  const moonLongitude = (sunLongitude + yearsDiff * 13) % 360
  const moonSign = getZodiacSign(moonLongitude)
  const moonPhase = getMoonPhaseFromLongitude(sunLongitude, moonLongitude)

  return {
    sun: { sign: sunSign, degree: sunLongitude % 30, house: Math.floor(sunLongitude / 30) + 1 },
    moon: {
      sign: moonSign,
      degree: moonLongitude % 30,
      house: Math.floor(moonLongitude / 30) + 1,
      phase: moonPhase,
    },
    mercury: { sign: sunSign, degree: (sunLongitude + 5) % 30 }, // 근사값
    venus: { sign: sunSign, degree: (sunLongitude + 10) % 30 }, // 근사값
    mars: { sign: getZodiacSign(sunLongitude + 30), degree: (sunLongitude + 30) % 30 }, // 근사값
  }
}

function getZodiacSign(longitude: number): string {
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
  ]
  return signs[Math.floor(longitude / 30) % 12]
}

function getMoonPhaseFromLongitude(sunLon: number, moonLon: number): string {
  const diff = (moonLon - sunLon + 360) % 360
  if (diff < 45) {
    return 'New'
  }
  if (diff < 90) {
    return 'Crescent'
  }
  if (diff < 135) {
    return 'First Quarter'
  }
  if (diff < 180) {
    return 'Gibbous'
  }
  if (diff < 225) {
    return 'Full'
  }
  if (diff < 270) {
    return 'Disseminating'
  }
  if (diff < 315) {
    return 'Last Quarter'
  }
  return 'Balsamic'
}
