/**
 * LRUCache.ts - LRU 캐시 구현
 */

import { logger } from "@/lib/logger";
import type { CacheConfig, CacheEntry, CacheStats } from './types';

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: { hits: number; misses: number; totalAccessTime: number };
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttlMs: 3600000, // 1 hour
      cleanupIntervalMs: 300000, // 5 minutes
      enableCompression: false,
      persistToStorage: false,
      storageKey: 'saju_cache',
      ...config
    };

    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0 };

    // 자동 정리 시작
    this.startCleanup();

    // 저장소에서 복원
    if (this.config.persistToStorage) {
      this.restoreFromStorage();
    }
  }

  /**
   * 캐시에서 값 조회
   */
  get(key: string): T | undefined {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // TTL 체크
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 접근 정보 업데이트
    entry.accessedAt = Date.now();
    entry.accessCount++;

    // LRU: 최근 접근 항목을 끝으로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    this.stats.totalAccessTime += performance.now() - startTime;

    return entry.value;
  }

  /**
   * 캐시에 값 저장
   */
  set(key: string, value: T): void {
    // 크기 제한 체크
    if (this.cache.size >= this.config.maxSize) {
      // LRU: 가장 오래된 항목 제거 (Map의 첫 번째 항목)
      const keys = Array.from(this.cache.keys());
      if (keys.length > 0) {
        this.cache.delete(keys[0]);
      }
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 1,
      size: this.estimateSize(value),
      compressed: false
    };

    this.cache.set(key, entry);

    // 저장소에 저장
    if (this.config.persistToStorage) {
      this.persistToStorage();
    }
  }

  /**
   * 캐시에서 값 삭제
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0 };

    if (this.config.persistToStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * 캐시 존재 여부 확인
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) { return false; }

    // TTL 체크
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 캐시 통계
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const timestamps = entries.map(e => e.createdAt);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitCount: this.stats.hits,
      missCount: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      averageAccessTime: this.stats.totalAccessTime / (this.stats.hits || 1),
      oldestEntry: Math.min(...timestamps, Date.now()),
      newestEntry: Math.max(...timestamps, 0)
    };
  }

  /**
   * 만료된 항목 정리
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.createdAt > this.config.ttlMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * 자동 정리 시작
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * 정리 중지
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 크기 추정
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 추정
    } catch {
      return 1000; // 기본값
    }
  }

  /**
   * 저장소에 저장
   */
  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') { return; }

    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (e) {
      // 저장소 용량 초과 등
      logger.warn('Cache persist failed:', e);
    }
  }

  /**
   * 저장소에서 복원
   */
  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') { return; }

    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        const entries: [string, CacheEntry<T>][] = JSON.parse(data);
        const now = Date.now();

        for (const [key, entry] of entries) {
          // TTL이 아직 유효한 항목만 복원
          if (now - entry.createdAt <= this.config.ttlMs) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (e) {
      logger.warn('Cache restore failed:', e);
    }
  }
}
