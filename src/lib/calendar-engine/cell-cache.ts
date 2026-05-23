import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { buildCalendar } from './index'
import type { NatalContext } from './context/types'
import type { CalendarCell, CalendarRange, CalendarBuildOptions } from './types'

/**
 * CalendarCell 1 월치 DB 캐시.
 *
 * 키: (birthKey hash, monthKey 'YYYY-MM')
 * 본명 입력 + 월이 같으면 결과 동일 → 영구 캐시 가능.
 *
 * 미스 시 buildCalendar() 호출, 결과 DB에 fire-and-forget 저장.
 * DB 실패해도 정상 동작 (캐시는 옵셔널).
 */
export interface BirthKeyInput {
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: string
}

export function makeBirthKey(input: BirthKeyInput): string {
  return createHash('sha1')
    .update(`${input.birthDate}|${input.birthTime}|${input.birthPlace}|${input.gender}|v2`)
    .digest('hex')
    .slice(0, 24)
}

export async function getOrBuildMonth(args: {
  birthKey: string
  monthKey: string
  natal: NatalContext
  range: CalendarRange
  options?: CalendarBuildOptions
}): Promise<{ cells: CalendarCell[]; cached: boolean }> {
  const { birthKey, monthKey, natal, range, options } = args

  // 1. DB 캐시 lookup
  try {
    const hit = await prisma.calendarBuildCache.findUnique({
      where: { birthKey_monthKey: { birthKey, monthKey } },
    })
    if (hit) {
      return { cells: hit.data as unknown as CalendarCell[], cached: true }
    }
  } catch (err) {
    logger.warn?.('[cell-cache] lookup failed:', err instanceof Error ? err.message : String(err))
  }

  // 2. 미스 — 빌드
  const cells = await buildCalendar(natal, range, options)

  // 3. fire-and-forget 저장.
  // DATABASE_URL 미설정 시 prisma 게터가 동기 throw(Proxy) → .catch() 로는 못 잡으므로
  // try 로 감싼다. 캐시는 옵셔널이라 저장 실패해도 빌드된 cells 는 그대로 반환.
  try {
    prisma.calendarBuildCache
      .create({
        data: {
          birthKey,
          monthKey,
          data: cells as unknown as object,
        },
      })
      .catch((err) => {
        logger.warn?.('[cell-cache] save failed:', err instanceof Error ? err.message : String(err))
      })
  } catch (err) {
    logger.warn?.('[cell-cache] save skipped:', err instanceof Error ? err.message : String(err))
  }

  return { cells, cached: false }
}
