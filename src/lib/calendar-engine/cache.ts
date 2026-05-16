import type { ExtractorCache } from './types'

/**
 * 인메모리 캐시 (사용자 세션 단위).
 * Swiss Ephemeris 호출 결과(트랜짓 위치 등)를 (date, hour) 키로 저장해
 * 한 사용자 365일치 빌드 동안 재계산 안 하도록.
 *
 * 본명 차트는 사용자 단위라 별도 캐시 불필요 — NatalContext가 빌드 입력으로 1회 전달됨.
 *
 * TODO(prod): Redis/DB-backed 캐시로 교체. 행성 위치는 사용자 무관이라 전역 공유 가능.
 */
export class InMemoryCache implements ExtractorCache {
  private store = new Map<string, unknown>()

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value)
  }

  size(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }
}

export function createCache(): ExtractorCache {
  return new InMemoryCache()
}
