/**
 * astrologyFormatter.ts - 점성술 데이터 포맷팅 유틸리티
 */

import type { PlanetData, HouseData, AspectData } from '../prompt-types'
import { zodiacSigns } from '../data/ganjiMappings'

/**
 * 행성 목록을 텍스트로 포맷
 */
export function formatPlanetLines(planets: PlanetData[]): string {
  return planets
    .slice(0, 12)
    .map((p: PlanetData) => `${p.name ?? '?'}: ${p.sign ?? '-'} (H${p.house ?? '-'})`)
    .join('; ')
}

/**
 * 하우스 목록을 텍스트로 포맷 (배열 또는 객체 모두 지원)
 */
export function formatHouseLines(houses: HouseData[] | Record<string, HouseData>): string {
  if (Array.isArray(houses)) {
    return houses
      .slice(0, 12)
      .map((h: HouseData, i: number) => `H${i + 1}: ${h?.sign ?? h?.formatted ?? '-'}`)
      .join('; ')
  }
  return Object.entries(houses ?? {})
    .slice(0, 12)
    .map(([num, val]: [string, HouseData]) => `H${num}: ${val?.sign ?? '-'}`)
    .join('; ')
}

/**
 * 어스펙트 목록을 텍스트로 포맷
 */
export function formatAspectLines(aspects: AspectData[]): string {
  return aspects
    .slice(0, 12)
    .map(
      (a: AspectData) =>
        `${a.planet1?.name ?? a.from?.name ?? '?'}-${a.type ?? a.aspect ?? ''}-${a.planet2?.name ?? a.to?.name ?? '?'}`
    )
    .join('; ')
}

/**
 * 오행 비율을 텍스트로 포맷
 */
export function formatElementRatios(elementRatios: Record<string, number>): string {
  return Object.entries(elementRatios ?? {})
    .map(([k, v]) => `${k}:${v.toFixed?.(1) ?? v}`)
    .join(', ')
}

/**
 * 하우스 커스프에서 사인 계산
 */
export function getSignFromCusp(cusp: number): string {
  return zodiacSigns[Math.floor(cusp / 30)] || '-'
}
