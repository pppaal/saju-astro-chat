import { calculateTransitChart } from '@/lib/astrology/foundation/transit'
import type { Chart } from '@/lib/astrology/foundation/types'
import { cacheOrCalculate, CACHE_TTL } from '@/lib/cache/redis-cache'
import type { ExtractorCache } from './types'

/**
 * 트랜짓 차트 — 2단 캐시.
 *
 *   1. ExtractorCache (InMemory, 요청 단위)
 *      같은 요청 내 여러 추출기가 동일 (date, location) 차트 공유.
 *      모든 점성 추출기 (transit, dignity, moon-nodes, fixed-star,
 *      arabic-part, planetary-hour 등 6+)가 같은 노출 시점 차트 사용.
 *
 *   2. Redis (영구적·전역)
 *      트랜짓 차트는 (date, hour, lat, lng) 키로 완전 결정적.
 *      한 번 계산된 행성 위치는 영원히 동일 → TTL 길게(30일+) OK.
 *      모든 사용자가 같은 위치(서울 등)면 같은 캐시 키 공유.
 *
 * 미스 시: Swiss Ephemeris 직접 호출 → 두 캐시 모두 저장.
 *
 * 효과: 같은 위치 다른 사용자라도 두 번째부터 무한 캐시 hit.
 */
export async function getCachedTransitChart(args: {
  iso: string
  latitude: number
  longitude: number
  timeZone: string
  inMemoryCache: ExtractorCache
}): Promise<Chart> {
  const { iso, latitude, longitude, timeZone, inMemoryCache } = args
  // timeZone 은 키의 일부여야 한다 — iso 가 tz 없는 wall-clock 문자열이라
  // calculateTransitChart(iso, timeZone) 가 tz 로 JD(행성 위치)를 정한다. 빼면
  // 같은 iso+좌표·다른 tz 가 키 충돌 → 남의 tz 로 계산된 차트가 서빙됐다
  // (natalChart 키는 이미 timeZone 포함으로 고쳐졌던 동일 버그 클래스).
  const localKey = `transit-chart:${iso}:${latitude}:${longitude}:${timeZone}`

  // 1) InMemoryCache (요청 단위) — resolved Chart 또는 *in-flight* Promise<Chart>.
  //    buildCalendar 는 모든 추출기를 Promise.all 로 동시 실행한다. 값만 캐시하면
  //    (옛 동작) 동시 요청들이 await 완료 *전*엔 전부 미스라, 점성 추출기 8개가
  //    같은 30개 차트를 각자 계산했다(실측 240회 = 8.0× 중복). 프로미스를 즉시
  //    캐시해 동시 요청이 한 계산을 공유하게 한다.
  const memHit = inMemoryCache.get<Chart | Promise<Chart>>(localKey)
  if (memHit) return memHit

  // 2) Redis (전역·영구)
  // 같은 위치의 같은 시각 차트는 영원히 결정적.
  // TRANSIT_CHART TTL은 1시간(짧음) — 우리는 결정적 데이터라 NATAL_CHART TTL(30일) 사용.
  // v2: timeZone 추가(위 버그 수정). 기존 tz-less Redis 엔트리는 키가 달라 자연 폐기.
  const redisKey = `ephe:transit:v2:${iso}:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${timeZone}`
  const chartPromise = cacheOrCalculate(
    redisKey,
    async () => {
      return calculateTransitChart({
        iso,
        latitude,
        longitude,
        timeZone,
      })
    },
    CACHE_TTL.NATAL_CHART
  )
  // in-flight 프로미스를 즉시 저장 — 동시 요청이 같은 프로미스를 공유(중복 계산 제거).
  inMemoryCache.set(localKey, chartPromise)
  try {
    const chart = await chartPromise
    inMemoryCache.set(localKey, chart) // resolved 값으로 교체 — 이후 요청은 동기 hit.
    return chart
  } catch (err) {
    // 실패한 프로미스를 캐시에 남기면 이후 요청까지 같은 거부로 오염된다.
    // delete 가 없는 인터페이스라 undefined 로 무효화(get → undefined → 미스 → 재계산).
    inMemoryCache.set(localKey, undefined)
    throw err
  }
}
