/**
 * @file DestinyCalendar cache utilities
 * Extracted from DestinyCalendar.tsx for modularity
 */

import { logger } from '@/lib/logger'
import type { BirthInfo, CalendarData, CachedCalendarData } from './types'

const CACHE_VERSION = 'v4' // v8.0: matrix + graphrag payload refresh
const CACHE_EXPIRY_DAYS = 30 // expires after 30 days

function isCalendarCacheCompatible(data: CalendarData): boolean {
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.allDates)) return false

  // For non-empty yearly payloads, require at least one matrix-linked signal.
  // This invalidates stale cache entries created before matrix/graphrag rollout.
  if (data.allDates.length > 0) {
    const hasDateLevelMatrixEvidence = data.allDates.some(
      (d) =>
        !!d?.evidence?.matrix ||
        !!d?.evidence?.matrixVerdict ||
        typeof d?.displayScore === 'number' ||
        typeof d?.displayGrade === 'number'
    )

    const hasPacketLevelGraphEvidence = !!data.matrixEvidencePackets
      ? Object.values(data.matrixEvidencePackets).some((packet) => {
          const totalAnchors = packet?.graphRagEvidenceSummary?.totalAnchors
          const totalSets = packet?.graphRagEvidenceSummary?.totalSets
          return typeof totalAnchors === 'number' || typeof totalSets === 'number'
        })
      : false

    const hasMatrixContract = !!data.matrixContract?.coreHash

    if (!hasDateLevelMatrixEvidence && !hasPacketLevelGraphEvidence && !hasMatrixContract) {
      return false
    }
  }

  return true
}

export function getCacheKey(birthInfo: BirthInfo, year: number, category: string): string {
  return `calendar_${birthInfo.birthDate}_${birthInfo.birthTime}_${birthInfo.birthPlace}_${year}_${category}`
}

export function getCachedData(cacheKey: string): CalendarData | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      return null
    }

    const parsed: CachedCalendarData = JSON.parse(cached)

    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey)
      return null
    }

    if (!isCalendarCacheCompatible(parsed.data)) {
      localStorage.removeItem(cacheKey)
      return null
    }

    const now = Date.now()
    const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    if (now - parsed.timestamp > expiryMs) {
      localStorage.removeItem(cacheKey)
      return null
    }

    return parsed.data
  } catch (err) {
    logger.error('[Cache] Failed to get cached data:', err)
    return null
  }
}

export function setCachedData(
  cacheKey: string,
  birthInfo: BirthInfo,
  year: number,
  category: string,
  data: CalendarData
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const cacheData: CachedCalendarData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      birthInfo,
      year,
      category,
      data,
    }

    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (err) {
    logger.error('[Cache] Failed to set cached data:', err)
    try {
      clearOldCache()
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          version: CACHE_VERSION,
          timestamp: Date.now(),
          birthInfo,
          year,
          category,
          data,
        })
      )
    } catch (retryErr) {
      logger.error('[Cache] Failed to set cached data after cleanup:', retryErr)
    }
  }
}

export function clearOldCache(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const now = Date.now()
    const keys = Object.keys(localStorage)
    const calendarKeys = keys.filter((k) => k.startsWith('calendar_'))

    calendarKeys.forEach((key) => {
      try {
        const cached = localStorage.getItem(key)
        if (!cached) {
          return
        }

        const parsed: CachedCalendarData = JSON.parse(cached)
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        if (now - parsed.timestamp > expiryMs) {
          localStorage.removeItem(key)
        }
      } catch {
        localStorage.removeItem(key)
      }
    })
  } catch (err) {
    logger.error('[Cache] Failed to clear old cache:', err)
  }
}

/**
 * Clears all calendar cache entries (use when birth profile changes).
 */
export function clearAllCalendarCache(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const keys = Object.keys(localStorage)
    const calendarKeys = keys.filter((k) => k.startsWith('calendar_'))
    calendarKeys.forEach((key) => localStorage.removeItem(key))
  } catch (err) {
    logger.error('[Cache] Failed to clear all calendar cache:', err)
  }
}
