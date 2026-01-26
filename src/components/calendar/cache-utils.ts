/**
 * @file DestinyCalendar cache utilities
 * Extracted from DestinyCalendar.tsx for modularity
 */

import { logger } from "@/lib/logger";
import type { BirthInfo, CalendarData, CachedCalendarData } from './types';

const CACHE_VERSION = 'v2'; // v7.1: 날짜 필터링 로직 수정으로 캐시 무효화
const CACHE_EXPIRY_DAYS = 30; // 30일 후 만료

export function getCacheKey(birthInfo: BirthInfo, year: number, category: string): string {
  // 생년월일+시간+장소+연도+카테고리로 고유 키 생성
  return `calendar_${birthInfo.birthDate}_${birthInfo.birthTime}_${birthInfo.birthPlace}_${year}_${category}`;
}

export function getCachedData(cacheKey: string): CalendarData | null {
  if (typeof window === 'undefined') {return null;}

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {return null;}

    const parsed: CachedCalendarData = JSON.parse(cached);

    // 버전 체크
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // 만료 체크 (30일)
    const now = Date.now();
    const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (now - parsed.timestamp > expiryMs) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (err) {
    logger.error('[Cache] Failed to get cached data:', err);
    return null;
  }
}

export function setCachedData(
  cacheKey: string,
  birthInfo: BirthInfo,
  year: number,
  category: string,
  data: CalendarData
): void {
  if (typeof window === 'undefined') {return;}

  try {
    const cacheData: CachedCalendarData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      birthInfo,
      year,
      category,
      data,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (err) {
    logger.error('[Cache] Failed to set cached data:', err);
    // localStorage quota exceeded - 오래된 캐시 삭제
    try {
      clearOldCache();
      localStorage.setItem(cacheKey, JSON.stringify({
        version: CACHE_VERSION,
        timestamp: Date.now(),
        birthInfo,
        year,
        category,
        data,
      }));
    } catch (retryErr) {
      logger.error('[Cache] Failed to set cached data after cleanup:', retryErr);
    }
  }
}

export function clearOldCache(): void {
  if (typeof window === 'undefined') {return;}

  try {
    const now = Date.now();
    const keys = Object.keys(localStorage);
    const calendarKeys = keys.filter(k => k.startsWith('calendar_'));

    // 만료된 캐시 삭제
    calendarKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) {return;}

        const parsed: CachedCalendarData = JSON.parse(cached);
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (now - parsed.timestamp > expiryMs) {
          localStorage.removeItem(key);
        }
      } catch {
        // 파싱 실패한 캐시는 삭제
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    logger.error('[Cache] Failed to clear old cache:', err);
  }
}
