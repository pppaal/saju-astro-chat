/**
 * Cached wrapper for calculateNatalChart — Redis 30일 캐시.
 *
 * 사주/점성 계산 자체는 immutable 이라 같은 입력이면 같은 출력. 캐시 키는
 * (birthDate + birthTime + lat + lon) 기준. 9 개 advanced astrology route +
 * 궁합 counselor 등이 매 요청 ~500ms Swiss Ephemeris × 10 행성을 캐시 X
 * 로 돌리던 비용 제거.
 *
 * cacheOrCalculate 가 graceful — Redis 없거나 미스 시 그대로 계산.
 */

import { calculateNatalChart } from './foundation/astrologyService'
import type { NatalChartInput, NatalChartData } from './foundation/astrologyService'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'

const pad = (v: number) => String(v).padStart(2, '0')

export async function cachedCalculateNatalChart(
  input: NatalChartInput
): Promise<NatalChartData> {
  const dateStr = `${input.year}-${pad(input.month)}-${pad(input.date)}`
  const timeStr = `${pad(input.hour)}:${pad(input.minute)}`
  return cacheOrCalculate(
    CacheKeys.natalChart(dateStr, timeStr, input.latitude, input.longitude, input.timeZone),
    async () => calculateNatalChart(input),
    CACHE_TTL.NATAL_CHART
  )
}
