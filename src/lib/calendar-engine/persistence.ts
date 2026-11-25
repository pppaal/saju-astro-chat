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
import { CALENDAR_ENGINE_VERSION } from '@/lib/cache/engineVersions'

// 사주/점성 엔진 버전 시그니처 — 정의와 bump 이력은 @/lib/cache/engineVersions(leaf).
// extractor·deriver 산식이 출력에 영향 주게 바뀌면 거기서 bump → birthKey 가 달라져
// 모든 캐시가 무효화된다. 운명상담사 컨텍스트 키도 같은 값을 접는다(ENGINE_VERSION_TAG).
// (re-export — dataRetention 스윕이 옛 버전 NatalContextCache 고아 행을 지우는 기준.)
export { CALENDAR_ENGINE_VERSION }

/**
 * 본명 입력 → 안정적 캐시 키. 위치는 4자리(≈11m)로 라운딩해 부동소수 잡음으로
 * 키가 흔들리지 않게 한다. 엔진 버전을 포함해 산식 변경 시 자동 무효화.
 */
function birthKeyFor(input: BuildContextInput): string {
  const canonical = [
    input.birthDate,
    input.birthTime,
    input.latitude.toFixed(4),
    input.longitude.toFixed(4),
    input.timeZone,
    input.gender,
    input.calendarType ?? 'solar',
    input.lunarLeap ? 'leap' : '',
    input.birthTimeUnknown ? 'tu' : '',
    input.birthCityUnknown ? 'cu' : '',
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
 * 그 달만 cells — DB 캐시 우선, miss 면 빌드 후 저장.
 *
 * 캘린더(월/일)는 1년을 굽지 않고 *보고 있는 그 달*(~30일)만 계산한다
 * (연 7.8s → 월 ~0.3s). 점수·salience 는 그 달 모집단 대비로 정규화된다
 * ("그 달 기준"). monthKey 는 `${year}-MM:${optionsHash}` (스키마 주석의
 * YYYY-MM 의미 그대로). (10년·1년 티어 제거로 연 풀빌드 경로는 삭제됨.)
 */
export async function getOrBuildMonthCells(
  input: BuildContextInput,
  natal: NatalContext,
  year: number,
  month: number,
  options: CalendarBuildOptions = { includeEvidence: false }
): Promise<CalendarCell[]> {
  const birthKey = birthKeyFor(input)
  const mm = String(month).padStart(2, '0')
  const monthKey = `${year}-${mm}:${makeOptionsKey(options)}`

  try {
    const row = await prisma.calendarBuildCache.findUnique({
      where: { birthKey_monthKey: { birthKey, monthKey } },
    })
    if (row) return row.data as unknown as CalendarCell[]
  } catch (err) {
    logger.warn('[calendar-cache] month cells read failed — building fresh', err)
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const range: CalendarRange = {
    start: `${year}-${mm}-01T00:00:00.000Z`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`,
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
    logger.warn('[calendar-cache] month cells write failed — continuing uncached', err)
  }

  return cells
}

/**
 * 포커스된 하루만 evidence 포함으로 빌드 — DB 캐시 우선.
 *
 * 월 캐시(getOrBuildMonthCells)는 evidence 를 빼고 저장한다 — 셀당 수백 신호 ×
 * 원시 evidence 는 큰 블롭이라 캐시 읽기/쓰기·직렬화가 느려지는데, 정작 evidence
 * 를 쓰는 건 *포커스된 그 하루*(근거카드·교차·시진)뿐이다. 그래서 그 하루만 1일
 * 범위로 evidence 포함 빌드한다. (점수는 월 layered map 에서 오므로 이 1일 빌드의
 * 점수는 쓰지 않는다.)
 *
 * 1일 범위로 빌드해도 그날 셀의 신호·교차는 월 빌드의 그날 셀과 같다 — 엔진이 범위
 * 불변이다(트랜짓·품위·달 위상 창을 범위 밖까지 잇고, 子時는 민용일 안에서 나누고,
 * 교차는 셀 단위로 dedup; 엔진 감사 X1·E9, tests/lib/calendar-engine/rangeInvariance).
 * 다른 것은 셀 묶음 모집단에 대한 상대값(derivedScore·salience)뿐이다. 그래서 일 화면
 * 교차·인생 화면 10년 교차가 월 리드아웃과 같은 사실을 말한다.
 *
 * 이 하루(보통 '오늘')는 같은 유저가 반복 방문하므로, 1일치 evidence(작은 블롭)는
 * `day:${dateIso}` 키로 따로 캐싱한다 — 매 방문 Swiss Ephemeris 재계산 방지.
 */
export async function getFocusDayCell(
  input: BuildContextInput,
  natal: NatalContext,
  dateIso: string
): Promise<CalendarCell | null> {
  const birthKey = birthKeyFor(input)
  const monthKey = `day:${dateIso}:${makeOptionsKey({ includeEvidence: true })}`

  try {
    const row = await prisma.calendarBuildCache.findUnique({
      where: { birthKey_monthKey: { birthKey, monthKey } },
    })
    if (row) {
      const cached = row.data as unknown as CalendarCell[]
      return cached.find((c) => c.datetime.slice(0, 10) === dateIso) ?? cached[0] ?? null
    }
  } catch (err) {
    logger.warn('[calendar-cache] focus-day read failed — building fresh', err)
  }

  const range: CalendarRange = {
    start: `${dateIso}T00:00:00.000Z`,
    end: `${dateIso}T23:59:59.999Z`,
    granularity: 'day',
  }
  try {
    const cells = await buildCalendar(natal, range, { includeEvidence: true })
    try {
      const data = cells as unknown as Prisma.InputJsonValue
      await prisma.calendarBuildCache.upsert({
        where: { birthKey_monthKey: { birthKey, monthKey } },
        create: { birthKey, monthKey, data },
        update: { data, builtAt: new Date() },
      })
    } catch (err) {
      logger.warn('[calendar-cache] focus-day write failed — continuing uncached', err)
    }
    return cells.find((c) => c.datetime.slice(0, 10) === dateIso) ?? cells[0] ?? null
  } catch (err) {
    logger.warn('[calendar] focus-day build failed — evidence card may be sparse', err)
    return null
  }
}
