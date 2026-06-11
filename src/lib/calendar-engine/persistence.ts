/* ============================================================
   캘린더 엔진 — DB 영속 캐시 wiring
   ───────────────────────────────────────────────────────────
   schema.prisma 의 NatalContextCache / CalendarBuildCache 모델을 *실제로*
   사용하는 레이어. 직전까지 두 모델은 정의만 되고 어떤 코드도 읽고/쓰지 않아
   /calendar 매 방문마다 buildNatalContext(Swiss Ephemeris 본명) + 1년치
   buildCalendar(365일 × ~30 extractor) 를 처음부터 재계산했다.

   계층:
     · NatalContextCache  — 본명차트(사주+점성). birthKey 단위 영구. 입력+엔진
       버전만의 순수 함수라 round-trip 출력 동일.
     · CalendarBuildCache — 그 해 파생 cells. (birthKey, year:options) 단위.
       buildCalendar 결과를 그대로 보존 → salience(연 단위 base-rate) 포함 출력 동일.

   무효화: birthKey 에 CALENDAR_ENGINE_VERSION 을 접어, 엔진 산식이 바뀌어
   버전을 bump 하면 키가 달라져 자동으로 cache-miss → 재계산·재저장된다.
   캐시 읽기/쓰기 실패는 전부 fail-soft (로그만, 계산은 진행) — 캐시는
   최적화이지 정합성 의존이 아니다.
   ============================================================ */

import { createHash } from 'node:crypto'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { buildNatalContext, type BuildContextInput } from './context/build'
import { buildCalendar, makeOptionsKey } from './index'
import type { NatalContext } from './context/types'
import type { CalendarCell, CalendarBuildOptions, CalendarRange } from './types'

/**
 * 사주/점성 엔진 버전 시그니처. extractor·deriver 산식이 출력에 영향 주게
 * 바뀌면 bump → birthKey 가 달라져 모든 캐시가 무효화된다.
 */
export const CALENDAR_ENGINE_VERSION = 'v2'

/**
 * 본명 입력 → 안정적 캐시 키. 위치는 4자리(≈11m)로 라운딩해 부동소수 잡음으로
 * 키가 흔들리지 않게 한다. 엔진 버전을 포함해 산식 변경 시 자동 무효화.
 */
export function birthKeyFor(input: BuildContextInput): string {
  const canonical = [
    input.birthDate,
    input.birthTime,
    input.latitude.toFixed(4),
    input.longitude.toFixed(4),
    input.timeZone,
    input.gender,
    input.calendarType ?? 'solar',
    input.lunarLeap ? 'leap' : '',
    CALENDAR_ENGINE_VERSION,
  ].join('|')
  return createHash('sha1').update(canonical).digest('hex').slice(0, 32)
}

/**
 * 본명 컨텍스트 — DB 캐시 우선, miss 면 빌드 후 영구 저장.
 * NatalContext 는 Date 필드가 없어 JSON round-trip 안전 (context/types.ts).
 */
export async function getOrBuildNatalContext(input: BuildContextInput): Promise<NatalContext> {
  const birthKey = birthKeyFor(input)

  try {
    const row = await prisma.natalContextCache.findUnique({ where: { birthKey } })
    // birthKey 에 이미 버전이 접혀 있어 engineSignature 불일치 row 는 사실상 안
    // 나오지만, 방어적으로 한 번 더 검증한다.
    if (row && row.engineSignature === CALENDAR_ENGINE_VERSION) {
      return row.data as unknown as NatalContext
    }
  } catch (err) {
    logger.warn('[calendar-cache] natal read failed — building fresh', err)
  }

  const natal = await buildNatalContext(input)

  try {
    const data = natal as unknown as Prisma.InputJsonValue
    await prisma.natalContextCache.upsert({
      where: { birthKey },
      create: { birthKey, engineSignature: CALENDAR_ENGINE_VERSION, data },
      update: { engineSignature: CALENDAR_ENGINE_VERSION, data, builtAt: new Date() },
    })
  } catch (err) {
    logger.warn('[calendar-cache] natal write failed — continuing uncached', err)
  }

  return natal
}

/**
 * 그 해 전체 cells — DB 캐시 우선, miss 면 빌드 후 저장.
 *
 * monthKey 는 `${year}:${optionsHash}` 형태(year-full sentinel). 스키마 주석은
 * 'YYYY-MM' 을 상정하지만 페이지는 salience 를 *연 단위 모집단*으로 계산하므로
 * (index.ts groupIntoCells) 연을 통째로 캐싱해야 출력이 보존된다. 옵션
 * 해시(includeEvidence/enablePatterns/enabledExtractors)를 키에 접어 옵션이
 * 다른 caller 가 잘못된 cell 을 받는 잠복 충돌을 막는다.
 */
export async function getOrBuildYearCells(
  input: BuildContextInput,
  natal: NatalContext,
  year: number,
  options: CalendarBuildOptions = { includeEvidence: true }
): Promise<CalendarCell[]> {
  const birthKey = birthKeyFor(input)
  const monthKey = `${year}:${makeOptionsKey(options)}`

  try {
    const row = await prisma.calendarBuildCache.findUnique({
      where: { birthKey_monthKey: { birthKey, monthKey } },
    })
    if (row) return row.data as unknown as CalendarCell[]
  } catch (err) {
    logger.warn('[calendar-cache] cells read failed — building fresh', err)
  }

  const range: CalendarRange = {
    start: `${year}-01-01T00:00:00.000Z`,
    end: `${year}-12-31T23:59:59.999Z`,
    granularity: 'day',
  }
  const cells = await buildCalendar(natal, range, options)

  try {
    const data = cells as unknown as Prisma.InputJsonValue
    await prisma.calendarBuildCache.upsert({
      where: { birthKey_monthKey: { birthKey, monthKey } },
      create: { birthKey, monthKey, data },
      update: { data, builtAt: new Date() },
    })
  } catch (err) {
    logger.warn('[calendar-cache] cells write failed — continuing uncached', err)
  }

  return cells
}
