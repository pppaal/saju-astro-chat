import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { buildCalendar, makeOptionsKey } from './index'
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

// 엔진 시그니처 — 본명 차트에 들어가는 천체/점 셋이 바뀔 때 bump.
// v3-chironlilith: 본명 카이런·릴리스를 트랜짓 어스펙트 대상에 추가 (PR #560).
// v4-tz-bucketing: 타임존 day-bucketing 수정으로 convergence peak 계산·셀 점수가
// 바뀜 — bump 안 하면 기존 캐시된 사용자가 옛 점수를 계속 받음.
const ENGINE_SIGNATURE = 'v4-tz-bucketing'
export function makeBirthKey(input: BirthKeyInput): string {
  return createHash('sha1')
    .update(
      `${input.birthDate}|${input.birthTime}|${input.birthPlace}|${input.gender}|${ENGINE_SIGNATURE}`
    )
    .digest('hex')
    .slice(0, 24)
}

// Process-level in-memory cache — DB(Prisma) layer 앞단.
// 한 요청 안에서 prescore(점수만)와 augment(셀 전체)가 같은 (birthKey, monthKey)를
// 두 번 빌드하던 비용을 0으로. 또 같은 process가 살아 있는 한 prev/next 페이지
// 이동·중복 사용자 요청을 즉시 처리.
// LRU 단순화: 삽입 순서 Map의 가장 오래된 키부터 evict. 200 entry × ~30 cells × ~4KB
// ≈ 24MB 상한, Vercel function 메모리 1GB 대비 안전.
const memCache = new Map<string, CalendarCell[]>()
const MEM_CACHE_MAX = 200

function memCacheGet(key: string): CalendarCell[] | undefined {
  const hit = memCache.get(key)
  if (!hit) return undefined
  // LRU touch — 재삽입으로 가장 최근 위치로 이동.
  memCache.delete(key)
  memCache.set(key, hit)
  return hit
}

function memCacheSet(key: string, cells: CalendarCell[]): void {
  memCache.set(key, cells)
  if (memCache.size > MEM_CACHE_MAX) {
    const oldest = memCache.keys().next().value
    if (oldest !== undefined) memCache.delete(oldest)
  }
}

export async function getOrBuildMonth(args: {
  birthKey: string
  monthKey: string
  natal: NatalContext
  range: CalendarRange
  options?: CalendarBuildOptions
}): Promise<{ cells: CalendarCell[]; cached: boolean }> {
  const { birthKey, monthKey, natal, range, options } = args

  // 빌드된 cells 는 옵션(includeEvidence/enablePatterns/enabledExtractors/
  // focusThemes)에 따라 달라지므로 옵션 해시를 캐시 키에 접는다. 안 그러면
  // 다른 옵션을 넘기는 caller 가 잘못된 캐시 cell 을 받는다.
  // DB 는 (birthKey, monthKey) 복합 unique 만 있어 스키마를 못 바꾸므로,
  // 옵션 해시를 monthKey 에 접미해 DB 키에도 반영한다. (monthKey 는 캐시
  // 판별자일 뿐 — 표시용이 아니다.) 기존 단일 옵션 형태에선 해시가 고정이라
  // 동작/캐시 무효화가 발생하지 않는다.
  const optionsKey = makeOptionsKey(options)
  const dbMonthKey = `${monthKey}#${optionsKey}`
  const memKey = `${birthKey}:${dbMonthKey}`

  // 0. In-memory hit — DB 호출조차 안 함 (가장 빠른 path).
  const memHit = memCacheGet(memKey)
  if (memHit) {
    return { cells: memHit, cached: true }
  }

  // 1. DB 캐시 lookup
  try {
    const hit = await prisma.calendarBuildCache.findUnique({
      where: { birthKey_monthKey: { birthKey, monthKey: dbMonthKey } },
    })
    if (hit) {
      const cells = hit.data as unknown as CalendarCell[]
      memCacheSet(memKey, cells)
      return { cells, cached: true }
    }
  } catch (err) {
    logger.warn?.('[cell-cache] lookup failed:', err instanceof Error ? err.message : String(err))
  }

  // 2. 미스 — 빌드
  const cells = await buildCalendar(natal, range, options)
  memCacheSet(memKey, cells)

  // 3. fire-and-forget 저장.
  // DATABASE_URL 미설정 시 prisma 게터가 동기 throw(Proxy) → .catch() 로는 못 잡으므로
  // try 로 감싼다. 캐시는 옵셔널이라 저장 실패해도 빌드된 cells 는 그대로 반환.
  try {
    prisma.calendarBuildCache
      .create({
        data: {
          birthKey,
          monthKey: dbMonthKey,
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
