/**
 * Destiny Calendar Cache
 * 동일 날짜/프로필 반복 계산 방지를 위한 캐싱 레이어
 */

import type { ImportantDate, DailyFortuneResult, MonthlyThemeResult, WeeklyThemeResult } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DestinyCalendarCache {
  private analysisCache = new Map<string, CacheEntry<ImportantDate | null>>();
  private dailyFortuneCache = new Map<string, CacheEntry<DailyFortuneResult>>();
  private monthlyThemeCache = new Map<string, CacheEntry<MonthlyThemeResult>>();
  private weeklyThemeCache = new Map<string, CacheEntry<WeeklyThemeResult>>();

  private static readonly TTL = 60 * 60 * 1000; // 1시간 TTL
  private static readonly MAX_CACHE_SIZE = 500; // 최대 캐시 항목 수

  private generateKey(prefix: string, ...parts: (string | number | Date | undefined)[]): string {
    const normalizedParts = parts.map(p => {
      if (p instanceof Date) {
        return `${p.getFullYear()}-${p.getMonth() + 1}-${p.getDate()}`;
      }
      return String(p ?? "");
    });
    return `${prefix}:${normalizedParts.join(":")}`;
  }

  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > DestinyCalendarCache.TTL;
  }

  private cleanup<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size > DestinyCalendarCache.MAX_CACHE_SIZE) {
      // 가장 오래된 항목 절반 삭제
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const deleteCount = Math.floor(cache.size / 2);
      for (let i = 0; i < deleteCount; i++) {
        cache.delete(entries[i][0]);
      }
    }
  }

  getAnalysis(date: Date, sajuProfileKey: string, astroProfileKey: string): ImportantDate | null | undefined {
    const key = this.generateKey("analysis", date, sajuProfileKey, astroProfileKey);
    const entry = this.analysisCache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    return undefined;
  }

  setAnalysis(date: Date, sajuProfileKey: string, astroProfileKey: string, data: ImportantDate | null): void {
    const key = this.generateKey("analysis", date, sajuProfileKey, astroProfileKey);
    this.analysisCache.set(key, { data, timestamp: Date.now() });
    this.cleanup(this.analysisCache);
  }

  getDailyFortune(birthDate: Date, targetDate: Date): DailyFortuneResult | undefined {
    const key = this.generateKey("daily", birthDate, targetDate);
    const entry = this.dailyFortuneCache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    return undefined;
  }

  setDailyFortune(birthDate: Date, targetDate: Date, data: DailyFortuneResult): void {
    const key = this.generateKey("daily", birthDate, targetDate);
    this.dailyFortuneCache.set(key, { data, timestamp: Date.now() });
    this.cleanup(this.dailyFortuneCache);
  }

  getMonthlyTheme(year: number, month: number, sajuKey: string): MonthlyThemeResult | undefined {
    const key = this.generateKey("monthly", year, month, sajuKey);
    const entry = this.monthlyThemeCache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    return undefined;
  }

  setMonthlyTheme(year: number, month: number, sajuKey: string, data: MonthlyThemeResult): void {
    const key = this.generateKey("monthly", year, month, sajuKey);
    this.monthlyThemeCache.set(key, { data, timestamp: Date.now() });
    this.cleanup(this.monthlyThemeCache);
  }

  getWeeklyTheme(startDate: Date, sajuKey: string): WeeklyThemeResult | undefined {
    const key = this.generateKey("weekly", startDate, sajuKey);
    const entry = this.weeklyThemeCache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    return undefined;
  }

  setWeeklyTheme(startDate: Date, sajuKey: string, data: WeeklyThemeResult): void {
    const key = this.generateKey("weekly", startDate, sajuKey);
    this.weeklyThemeCache.set(key, { data, timestamp: Date.now() });
    this.cleanup(this.weeklyThemeCache);
  }

  // 캐시 초기화
  clear(): void {
    this.analysisCache.clear();
    this.dailyFortuneCache.clear();
    this.monthlyThemeCache.clear();
    this.weeklyThemeCache.clear();
  }

  // 캐시 통계
  getStats(): { analysis: number; daily: number; monthly: number; weekly: number } {
    return {
      analysis: this.analysisCache.size,
      daily: this.dailyFortuneCache.size,
      monthly: this.monthlyThemeCache.size,
      weekly: this.weeklyThemeCache.size,
    };
  }
}

// 싱글톤 캐시 인스턴스
export const destinyCache = new DestinyCalendarCache();
