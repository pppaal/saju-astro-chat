// src/lib/astrology/interpretations.ts
//
// 점성 타입 + 교점(노드) 보조 1종만 남은 경량 모듈.
//
// 과거엔 Planet×Sign / Planet×House / Aspect-pair 정적 해석 그리드(~1800줄)를
// 담았으나, 프로덕션 점성 해석은 모두 chart-dictionary/astro-*.json + foundation/*
// 로 이전됐고 이 그리드는 어떤 prod 경로에서도 소비되지 않아 제거(2026-06).
// 남은 라이브 export: ZodiacName / AstroPlanetName 타입(캘린더 타입·ZR·프로펙션
// 에서 사용), getSouthNodeOppositeSign(리포트 adapter 에서 사용).

export type ZodiacName =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'

export type AstroPlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Ascendant'

export type AspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

/** 북교점 사인 → 남교점(정반대) 사인. */
export function getSouthNodeOppositeSign(north: ZodiacName): ZodiacName {
  const opposite: Record<ZodiacName, ZodiacName> = {
    Aries: 'Libra',
    Taurus: 'Scorpio',
    Gemini: 'Sagittarius',
    Cancer: 'Capricorn',
    Leo: 'Aquarius',
    Virgo: 'Pisces',
    Libra: 'Aries',
    Scorpio: 'Taurus',
    Sagittarius: 'Gemini',
    Capricorn: 'Cancer',
    Aquarius: 'Leo',
    Pisces: 'Virgo',
  }
  return opposite[north]
}
