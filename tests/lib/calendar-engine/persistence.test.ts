import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BuildContextInput } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell, CalendarBuildOptions } from '@/lib/calendar-engine/types'

/**
 * persistence.ts — DB 캐시 wiring. prisma/build/index/logger 를 mock 해
 * cache-hit / cache-miss / fail-soft (read·write 실패) 경로를 검증한다.
 * 실제 네트워크/DB 없음.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
const natalFindUnique = vi.fn()
const natalUpsert = vi.fn()
const cellsFindUnique = vi.fn()
const cellsUpsert = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    natalContextCache: {
      findUnique: (...a: unknown[]) => natalFindUnique(...a),
      upsert: (...a: unknown[]) => natalUpsert(...a),
    },
    calendarBuildCache: {
      findUnique: (...a: unknown[]) => cellsFindUnique(...a),
      upsert: (...a: unknown[]) => cellsUpsert(...a),
    },
  },
  Prisma: {},
}))

const warn = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: { warn: (...a: unknown[]) => warn(...a), info: vi.fn(), error: vi.fn() },
}))

const buildNatalContext = vi.fn()
vi.mock('@/lib/calendar-engine/context/build', () => ({
  buildNatalContext: (...a: unknown[]) => buildNatalContext(...a),
}))

const buildCalendar = vi.fn()
vi.mock('@/lib/calendar-engine/index', () => ({
  buildCalendar: (...a: unknown[]) => buildCalendar(...a),
  // real-ish stable key — only needs to be deterministic for these tests.
  makeOptionsKey: (opts: CalendarBuildOptions = {}) => JSON.stringify(opts),
}))

// Import AFTER mocks are registered.
import {
  getOrBuildNatalContext,
  getOrBuildMonthCells,
  getFocusDayCell,
  CALENDAR_ENGINE_VERSION,
} from '@/lib/calendar-engine/persistence'

const INPUT: BuildContextInput = {
  birthDate: '1990-05-15',
  birthTime: '08:30',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const FAKE_NATAL = { saju: { tag: 'natal' } } as unknown as NatalContext

function cell(dateIso: string): CalendarCell {
  return { datetime: `${dateIso}T00:00:00.000Z` } as unknown as CalendarCell
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getOrBuildNatalContext', () => {
  it('cache hit: engineSignature 일치 row 면 빌드 없이 캐시 data 반환', async () => {
    natalFindUnique.mockResolvedValue({
      engineSignature: CALENDAR_ENGINE_VERSION,
      data: FAKE_NATAL,
    })
    const res = await getOrBuildNatalContext(INPUT)
    expect(res).toBe(FAKE_NATAL)
    expect(buildNatalContext).not.toHaveBeenCalled()
    expect(natalUpsert).not.toHaveBeenCalled()
  })

  it('engineSignature 불일치 row 면 빌드 후 upsert', async () => {
    natalFindUnique.mockResolvedValue({ engineSignature: 'v1', data: { stale: true } })
    buildNatalContext.mockResolvedValue(FAKE_NATAL)
    natalUpsert.mockResolvedValue({})
    const res = await getOrBuildNatalContext(INPUT)
    expect(res).toBe(FAKE_NATAL)
    expect(buildNatalContext).toHaveBeenCalledWith(INPUT)
    expect(natalUpsert).toHaveBeenCalledTimes(1)
    const arg = natalUpsert.mock.calls[0][0]
    expect(arg.create.engineSignature).toBe(CALENDAR_ENGINE_VERSION)
  })

  it('cache miss(null row): 빌드 후 upsert', async () => {
    natalFindUnique.mockResolvedValue(null)
    buildNatalContext.mockResolvedValue(FAKE_NATAL)
    natalUpsert.mockResolvedValue({})
    const res = await getOrBuildNatalContext(INPUT)
    expect(res).toBe(FAKE_NATAL)
    expect(natalUpsert).toHaveBeenCalledTimes(1)
  })

  it('read 실패는 fail-soft: warn 후 빌드 진행', async () => {
    natalFindUnique.mockRejectedValue(new Error('db down'))
    buildNatalContext.mockResolvedValue(FAKE_NATAL)
    natalUpsert.mockResolvedValue({})
    const res = await getOrBuildNatalContext(INPUT)
    expect(res).toBe(FAKE_NATAL)
    expect(warn).toHaveBeenCalled()
    expect(buildNatalContext).toHaveBeenCalled()
  })

  it('write 실패는 fail-soft: warn 후에도 빌드 결과 반환', async () => {
    natalFindUnique.mockResolvedValue(null)
    buildNatalContext.mockResolvedValue(FAKE_NATAL)
    natalUpsert.mockRejectedValue(new Error('write fail'))
    const res = await getOrBuildNatalContext(INPUT)
    expect(res).toBe(FAKE_NATAL)
    expect(warn).toHaveBeenCalled()
  })

  it('birthKey 가 입력에 결정적이다(같은 입력→같은 where.birthKey)', async () => {
    natalFindUnique.mockResolvedValue({
      engineSignature: CALENDAR_ENGINE_VERSION,
      data: FAKE_NATAL,
    })
    await getOrBuildNatalContext(INPUT)
    await getOrBuildNatalContext(INPUT)
    const k1 = natalFindUnique.mock.calls[0][0].where.birthKey
    const k2 = natalFindUnique.mock.calls[1][0].where.birthKey
    expect(k1).toBe(k2)
    expect(k1).toMatch(/^[0-9a-f]{32}$/)
  })

  it('다른 입력은 다른 birthKey 를 만든다', async () => {
    natalFindUnique.mockResolvedValue({
      engineSignature: CALENDAR_ENGINE_VERSION,
      data: FAKE_NATAL,
    })
    await getOrBuildNatalContext(INPUT)
    await getOrBuildNatalContext({ ...INPUT, gender: 'female' })
    const k1 = natalFindUnique.mock.calls[0][0].where.birthKey
    const k2 = natalFindUnique.mock.calls[1][0].where.birthKey
    expect(k1).not.toBe(k2)
  })

  it('lunar/leap 옵션도 birthKey 에 반영된다', async () => {
    natalFindUnique.mockResolvedValue({
      engineSignature: CALENDAR_ENGINE_VERSION,
      data: FAKE_NATAL,
    })
    await getOrBuildNatalContext({ ...INPUT, calendarType: 'lunar', lunarLeap: true })
    await getOrBuildNatalContext({ ...INPUT, calendarType: 'lunar', lunarLeap: false })
    const k1 = natalFindUnique.mock.calls[0][0].where.birthKey
    const k2 = natalFindUnique.mock.calls[1][0].where.birthKey
    expect(k1).not.toBe(k2)
  })
})

describe('getOrBuildMonthCells', () => {
  const CELLS = [cell('2026-02-10')]

  it('cache hit 반환', async () => {
    cellsFindUnique.mockResolvedValue({ data: CELLS })
    const res = await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2026, 2)
    expect(res).toBe(CELLS)
    expect(buildCalendar).not.toHaveBeenCalled()
  })

  it('cache miss: 그 달 범위(말일 계산)로 빌드', async () => {
    cellsFindUnique.mockResolvedValue(null)
    buildCalendar.mockResolvedValue(CELLS)
    cellsUpsert.mockResolvedValue({})
    await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2026, 2)
    const range = buildCalendar.mock.calls[0][1]
    // 2026-02 는 28일.
    expect(range.start).toBe('2026-02-01T00:00:00.000Z')
    expect(range.end).toBe('2026-02-28T23:59:59.999Z')
  })

  it('윤년 2월 말일(29일)을 정확히 계산한다', async () => {
    cellsFindUnique.mockResolvedValue(null)
    buildCalendar.mockResolvedValue(CELLS)
    cellsUpsert.mockResolvedValue({})
    await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2024, 2)
    expect(buildCalendar.mock.calls[0][1].end).toBe('2024-02-29T23:59:59.999Z')
  })

  it('12월 말일(31일)을 계산하고 monthKey 를 zero-pad 한다', async () => {
    cellsFindUnique.mockResolvedValue(null)
    buildCalendar.mockResolvedValue(CELLS)
    cellsUpsert.mockResolvedValue({})
    await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2026, 12)
    const range = buildCalendar.mock.calls[0][1]
    expect(range.start).toBe('2026-12-01T00:00:00.000Z')
    expect(range.end).toBe('2026-12-31T23:59:59.999Z')
    const mk = cellsUpsert.mock.calls[0][0].where.birthKey_monthKey.monthKey
    expect(mk.startsWith('2026-12:')).toBe(true)
  })

  it('한 자리 월은 monthKey 에서 zero-pad 된다(2026-03)', async () => {
    cellsFindUnique.mockResolvedValue({ data: CELLS })
    await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2026, 3)
    const mk = cellsFindUnique.mock.calls[0][0].where.birthKey_monthKey.monthKey
    expect(mk.startsWith('2026-03:')).toBe(true)
  })

  it('기본 옵션은 includeEvidence:false', async () => {
    cellsFindUnique.mockResolvedValue(null)
    buildCalendar.mockResolvedValue(CELLS)
    cellsUpsert.mockResolvedValue({})
    await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2026, 5)
    expect(buildCalendar.mock.calls[0][2]).toEqual({ includeEvidence: false })
  })

  it('read/write 실패 fail-soft', async () => {
    cellsFindUnique.mockRejectedValue(new Error('r'))
    buildCalendar.mockResolvedValue(CELLS)
    cellsUpsert.mockRejectedValue(new Error('w'))
    const res = await getOrBuildMonthCells(INPUT, FAKE_NATAL, 2026, 5)
    expect(res).toBe(CELLS)
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('getFocusDayCell', () => {
  const ISO = '2026-06-21'

  it('cache hit: 캐시 cells 에서 해당 날짜 셀을 찾아 반환', async () => {
    const cached = [cell('2026-06-20'), cell('2026-06-21')]
    cellsFindUnique.mockResolvedValue({ data: cached })
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBe(cached[1])
    expect(buildCalendar).not.toHaveBeenCalled()
  })

  it('cache hit 인데 날짜가 안 맞으면 첫 셀로 폴백', async () => {
    const cached = [cell('2026-06-19')]
    cellsFindUnique.mockResolvedValue({ data: cached })
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBe(cached[0])
  })

  it('cache hit 인데 빈 배열이면 null', async () => {
    cellsFindUnique.mockResolvedValue({ data: [] })
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBeNull()
  })

  it('cache miss: 1일 범위 evidence 포함 빌드 후 해당 셀 반환 + 캐시 저장', async () => {
    cellsFindUnique.mockResolvedValue(null)
    const built = [cell('2026-06-21')]
    buildCalendar.mockResolvedValue(built)
    cellsUpsert.mockResolvedValue({})
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBe(built[0])
    const range = buildCalendar.mock.calls[0][1]
    expect(range.start).toBe('2026-06-21T00:00:00.000Z')
    expect(range.end).toBe('2026-06-21T23:59:59.999Z')
    expect(buildCalendar.mock.calls[0][2]).toEqual({ includeEvidence: true })
    expect(cellsUpsert).toHaveBeenCalledTimes(1)
    // monthKey 는 day: 접두.
    expect(cellsUpsert.mock.calls[0][0].where.birthKey_monthKey.monthKey.startsWith('day:')).toBe(
      true
    )
  })

  it('cache miss build 결과가 빈 배열이면 null', async () => {
    cellsFindUnique.mockResolvedValue(null)
    buildCalendar.mockResolvedValue([])
    cellsUpsert.mockResolvedValue({})
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBeNull()
  })

  it('read 실패는 fail-soft → 빌드 진행', async () => {
    cellsFindUnique.mockRejectedValue(new Error('read fail'))
    const built = [cell('2026-06-21')]
    buildCalendar.mockResolvedValue(built)
    cellsUpsert.mockResolvedValue({})
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBe(built[0])
    expect(warn).toHaveBeenCalled()
  })

  it('write 실패는 fail-soft → 그래도 셀 반환', async () => {
    cellsFindUnique.mockResolvedValue(null)
    const built = [cell('2026-06-21')]
    buildCalendar.mockResolvedValue(built)
    cellsUpsert.mockRejectedValue(new Error('write fail'))
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBe(built[0])
    expect(warn).toHaveBeenCalled()
  })

  it('build 자체가 throw 하면 null 반환(상위 try/catch)', async () => {
    cellsFindUnique.mockResolvedValue(null)
    buildCalendar.mockRejectedValue(new Error('build fail'))
    const res = await getFocusDayCell(INPUT, FAKE_NATAL, ISO)
    expect(res).toBeNull()
    expect(warn).toHaveBeenCalled()
  })
})
