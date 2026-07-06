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
import { after } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { buildNatalContext, type BuildContextInput } from './context/build'
import { buildCalendar, makeOptionsKey } from './index'
import { encodeBlob, decodeBlob } from './blobCodec'
import type { NatalContext } from './context/types'
import type { CalendarCell, CalendarBuildOptions, CalendarRange } from './types'

/**
 * 캐시 write 를 응답 임계 경로에서 뺀다. 콜드(첫) 로드는 build 결과를 곧바로
 * 반환하고, blob 압축(encodeBlob)+DB upsert 는 응답이 나간 *뒤* 돌린다.
 *
 * 왜: 캐시 write 는 read 정합성에 필요 없다(다음 방문 최적화일 뿐). 그런데
 * 예전엔 세 write(natal·월·포커스일)가 전부 응답 전에 await 됐고, 특히 natal
 * write 는 월/포커스 build 가 시작되기도 전에 끼어 DB 왕복만큼 첫 로드를 늦췄다.
 *
 * 방식: Next 요청 스코프면 after()로 응답 후 실행(서버리스에서 함수가 그때까지
 * 살아 있음을 런타임이 보장 — 단순 fire-and-forget 과 달리 write 유실 없음).
 * 스코프 밖(단위 테스트·스크립트)에선 after()가 throw 하므로 즉시 실행으로 폴백.
 * 어느 쪽이든 write 실패는 warn 만 하고 삼킨다(fail-soft — 캐시는 최적화).
 */
function deferPersist(label: string, write: () => Promise<void>): void {
  const run = () =>
    write().catch((err) =>
      logger.warn(`[calendar-cache] ${label} write failed — continuing uncached`, err)
    )
  try {
    after(run)
  } catch {
    void run()
  }
}

/**
 * 사주/점성 엔진 버전 시그니처. extractor·deriver 산식이 출력에 영향 주게
 * 바뀌면 bump → birthKey 가 달라져 모든 캐시가 무효화된다.
 */
// v3: cross-activation 산식 변경(profection/zodiacal-releasing 상징 지배성 교차
//     제외, 도화살/역마살 죽은 매핑 제거). 이 로직은 buildCalendar 안에서 돌아
//     캐시 blob 에 구워지므로, 웜 캐시가 옛 교차 신호를 계속 내보내지 않도록 bump.
// v4: 대운 커버리지 확장 매핑(정재×토성·식신×목성·비견×토성·겁재×명왕성) 추가.
//     cross-activation 추출기가 빌드 시 셀에 구우므로, 웜 캐시도 새 교차를 얻도록 bump.
// v5: 일/월 근거 커버리지 확장 — 교차 매핑 31→57쌍(달 5·태양 5·수성 5·금성 3·
//     화성 7·천을귀인×목성). 웜 캐시가 새 교차 근거를 얻도록 bump.
// v6: ZR 정통화(감사 A-1·A-2) — ① 나이 앵커를 출생년 1/1 → 실제 생일로(12월생
//     경계 최대 ~12개월 조기 발화 교정), ② Loosing-of-the-Bond 를 "7번째 사인"
//     오정의에서 Valens 점프(한 바퀴 후 반대편 진입) 규칙으로 재구현. ZR 신호
//     창·이벤트가 셀에 구워지므로 웜 캐시가 옛 경계를 계속 내보내지 않게 bump.
// v7: 자시(子時) 이중계상 교정(감사 C2) — 자시가 자정을 넘겨(23~01시) 두 날 셀에
//     걸려, 매일 셀이 자기 자시 + 전날 자시 새벽 꼬리(다른 時柱 천간) 두 개를 갖고
//     hourly 층을 이중 계상해 일점수를 부풀렸다. 각 셀은 그날 생성 시진만 남기도록
//     dedup — 점수 골격이 이동하므로 웜 캐시가 옛 점수를 계속 내보내지 않게 bump.
// (export — dataRetention 스윕이 옛 버전 NatalContextCache 고아 행을 지우는 기준.)
export const CALENDAR_ENGINE_VERSION = 'v7'

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
      return decodeBlob<NatalContext>(row.data)
    }
  } catch (err) {
    logger.warn('[calendar-cache] natal read failed — building fresh', err)
  }

  const natal = await buildNatalContext(input)

  // write 는 응답 후로 미룬다 — 월/포커스 build 가 natal write 왕복을 기다리지 않게.
  deferPersist('natal', async () => {
    const data = encodeBlob(natal)
    await prisma.natalContextCache.upsert({
      where: { birthKey },
      create: { birthKey, engineSignature: CALENDAR_ENGINE_VERSION, data },
      update: { engineSignature: CALENDAR_ENGINE_VERSION, data, builtAt: new Date() },
    })
  })

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
    if (row) return decodeBlob<CalendarCell[]>(row.data)
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

  deferPersist('month cells', async () => {
    const data = encodeBlob(cells)
    await prisma.calendarBuildCache.upsert({
      where: { birthKey_monthKey: { birthKey, monthKey } },
      create: { birthKey, monthKey, data },
      update: { data, builtAt: new Date() },
    })
  })

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
      const cached = decodeBlob<CalendarCell[]>(row.data)
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
    deferPersist('focus-day', async () => {
      const data = encodeBlob(cells)
      await prisma.calendarBuildCache.upsert({
        where: { birthKey_monthKey: { birthKey, monthKey } },
        create: { birthKey, monthKey, data },
        update: { data, builtAt: new Date() },
      })
    })
    return cells.find((c) => c.datetime.slice(0, 10) === dateIso) ?? cells[0] ?? null
  } catch (err) {
    logger.warn('[calendar] focus-day build failed — evidence card may be sparse', err)
    return null
  }
}
