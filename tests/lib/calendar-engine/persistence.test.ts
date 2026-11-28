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
    // now 를 한 번 읽어 키와 빌드가 같은 순간을 쓴다(G12) — 입력 + now.
    expect(buildNatalContext).toHaveBeenCalledWith({ ...INPUT, now: expect.any(Date) })
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

  // G12 — 본명 컨텍스트에서 now 에 기대는 건 대운 목록 길이뿐(최소 10칸, 만 나이가 첫 대운
  // + 100 을 넘으면 지금 칸까지). 키는 now 가 아니라 그 길이를 정하는 값을 접는다:
  // 만 99세 이하는 예전 birthKey 그대로(월 셀 키와 같음), 만 100세+ 는 만 나이별.
  describe('now 주입 + 대운 목록 길이 키 (G12)', () => {
    const OLD: BuildContextInput = {
      birthDate: '1925-03-30',
      birthTime: '08:44',
      gender: 'female',
      latitude: 40.4812,
      longitude: -73.8248,
      timeZone: 'America/New_York',
    }
    const keyAt = async (input: BuildContextInput, iso: string) => {
      natalFindUnique.mockClear()
      await getOrBuildNatalContext({ ...input, now: new Date(iso) })
      return natalFindUnique.mock.calls[0][0].where.birthKey as string
    }
    const monthKey = async (input: BuildContextInput) => {
      cellsFindUnique.mockClear()
      cellsFindUnique.mockResolvedValue({ data: [] })
      await getOrBuildMonthCells(input, FAKE_NATAL, 2026, 11)
      return cellsFindUnique.mock.calls[0][0].where.birthKey_monthKey.birthKey as string
    }
    beforeEach(() => {
      natalFindUnique.mockResolvedValue({
        engineSignature: CALENDAR_ENGINE_VERSION,
        data: FAKE_NATAL,
      })
    })

    it('만 99세 이하: now 가 달라도 키가 같고, 월 셀의 birthKey 와 같다', async () => {
      const a = await keyAt(INPUT, '2000-01-01T00:00:00Z')
      const b = await keyAt(INPUT, '2026-11-26T00:00:00Z')
      expect(a).toBe(b)
      expect(a).toBe(await monthKey(INPUT))
      // 1925 출생도 만 99세(2024-11-25)까지는 예전 키 그대로.
      expect(await keyAt(OLD, '2024-11-25T15:00:00Z')).toBe(await monthKey(OLD))
    })

    it('만 100세+: 만 나이마다 키가 갈리고, 같은 나이 안에서는 같다 (출생 tz 생일 기준)', async () => {
      const age99 = await keyAt(OLD, '2025-03-30T03:00:00Z') // 뉴욕 03-29 23:00 — 아직 99
      const age100 = await keyAt(OLD, '2025-03-30T05:00:00Z') // 뉴욕 03-30 01:00 — 100
      const age101a = await keyAt(OLD, '2026-11-25T03:00:00Z')
      const age101b = await keyAt(OLD, '2027-01-15T12:00:00Z')
      expect(age99).toBe(await monthKey(OLD))
      expect(age100).not.toBe(age99)
      expect(age101a).not.toBe(age100)
      expect(age101a).toBe(age101b)
      expect(age101a).toMatch(/^[0-9a-f]{32}$/)
    })

    it('주입된 now 그대로 빌드에 넘긴다 (miss 경로)', async () => {
      natalFindUnique.mockResolvedValue(null)
      buildNatalContext.mockResolvedValue(FAKE_NATAL)
      natalUpsert.mockResolvedValue({})
      const now = new Date('2026-11-25T03:00:00Z')
      await getOrBuildNatalContext({ ...OLD, now })
      expect(buildNatalContext).toHaveBeenCalledWith({ ...OLD, now })
    })
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
