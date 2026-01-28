/**
 * 생년월일 변경 시 클라이언트 캐시를 일괄 무효화한다.
 *
 * - sessionStorage: chart data (destinyChartData_*)
 * - localStorage: saju LRU cache, calendar cache, user profile
 * - in-memory: saju/daeun/compatibility LRU caches
 */

import { clearChartCache } from '@/lib/chartDataCache';
import { clearChartCache as clearChartCacheClient } from '@/lib/cache/chart-cache-client';
import { clearAllCaches as clearSajuCaches } from '@/lib/Saju/sajuCache';
import { clearAllCalendarCache } from '@/components/calendar/cache-utils';
import { logger } from '@/lib/logger';

export async function invalidateClientCaches(): Promise<void> {
  try {
    // 1. sessionStorage chart data (동기)
    clearChartCache();

    // 2. sessionStorage + Redis chart data (비동기)
    await clearChartCacheClient();

    // 3. in-memory + localStorage saju LRU caches
    clearSajuCaches();

    // 4. localStorage calendar caches
    clearAllCalendarCache();

    logger.info('[invalidateClientCaches] All client caches cleared after birth info change');
  } catch (error) {
    logger.warn('[invalidateClientCaches] Partial failure:', error);
  }
}
