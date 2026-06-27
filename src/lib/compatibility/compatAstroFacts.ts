// src/lib/compatibility/compatAstroFacts.ts
//
// 궁합 "재료 준비실 (점성편)" — 두 사람의 natal chart 를 한 번에 모아
// 정제된 facts 페어로. compatSajuFacts 의 점성 짝.
//
// 옛 코드는 route.ts 안에서 `calculateNatalChart` 를 두 번 await + `toChart`
// 두 번 + 결과를 `formatAstroSynastry` / `formatCompositeChart` 입력으로
// 분배했다. 라우트가 (a) Swiss Ephemeris 호출 보일러, (b) 위·경도 dup
// 전달, (c) 시각 파싱(`Y/M/D/h/mi`) 까지 떠안고 있어 두 formatter 가
// raw 엔진 입력 shape 에 그대로 묶여 있었다. 본 모듈이 그걸 흡수.
//
// 본 모듈은 **포매팅 0**. text 0. chart 인스턴스 + meta 만 반환.

import { toChart, type NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import { cachedCalculateNatalChart } from '@/lib/astrology/cached'
import type { Chart } from '@/lib/astrology/foundation/types'
import { logger } from '@/lib/logger'

export interface CompatAstroPersonInput {
  birthDate: string // 'YYYY-MM-DD'
  birthTime: string // 'HH:MM'
  latitude: number
  longitude: number
  timezone: string
}

export interface PersonCompatAstroFacts {
  /** formatAstroSynastry / formatCompositeChart 가 받는 chart 인스턴스. */
  chart: Chart
  /** Swiss Ephemeris raw — 옛 인터페이스 호환용 escape hatch. */
  natalRaw: NatalChartData
  /** 위·경도 — formatAstroSynastry 가 같이 받음 (house overlay 계산). */
  latitude: number
  longitude: number
}

export interface CompatAstroFacts {
  a: PersonCompatAstroFacts
  b: PersonCompatAstroFacts
}

/**
 * 두 사람 natal chart 를 병렬로 계산해 facts 페어 반환.
 * 어느 한 쪽이라도 실패하면 null — 호출자는 점성 블록 전체를 건너뜀.
 * (옛 route.ts 의 try/catch 동작과 동일.)
 */
export async function collectCompatAstroFacts(
  seedA: CompatAstroPersonInput,
  seedB: CompatAstroPersonInput
): Promise<CompatAstroFacts | null> {
  try {
    if (!isValidSeed(seedA) || !isValidSeed(seedB)) return null
    const [a, b] = await Promise.all([collectOne(seedA), collectOne(seedB)])
    return { a, b }
  } catch (err) {
    logger.warn('[compatAstroFacts] collect failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

function isValidSeed(seed: CompatAstroPersonInput): boolean {
  const [Y, M, D] = seed.birthDate.split('-').map(Number)
  const [h, mi] = (seed.birthTime || '00:00').split(':').map(Number)
  return [Y, M, D, h, mi].every(Number.isFinite)
}

async function collectOne(seed: CompatAstroPersonInput): Promise<PersonCompatAstroFacts> {
  const [Y, M, D] = seed.birthDate.split('-').map(Number)
  const [h, mi] = (seed.birthTime || '00:00').split(':').map(Number)
  // 본명 차트 불변 → Redis 30일 캐시. 궁합은 두 사람치를 매번 풀계산하던
  // 가장 무거운 경로라 캐시 효과가 제일 크다(캐시 없으면 graceful 재계산).
  const natalRaw = await cachedCalculateNatalChart({
    year: Y,
    month: M,
    date: D,
    hour: h,
    minute: mi,
    latitude: seed.latitude,
    longitude: seed.longitude,
    timeZone: seed.timezone,
  })
  const chart = toChart(natalRaw)
  return {
    chart,
    natalRaw,
    latitude: seed.latitude,
    longitude: seed.longitude,
  }
}
