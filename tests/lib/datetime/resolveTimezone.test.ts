/**
 * 타임존 폴백 단일 resolver (F5) — 글로벌 제품에서 'Asia/Seoul' 하드코딩 폴백을 대신한다.
 *   출생 tz  = 명시 출생 tz → 출생 좌표의 tz → CALCULATION_STANDARDS.saju.baseTimezone(+경고)
 *   보는 사람 tz = 요청 기기 tz → 출생 tz(위 규칙) → baseTimezone
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const warn = vi.hoisted(() => vi.fn())
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn, error: vi.fn(), debug: vi.fn() },
}))

import {
  resolveBirthTimezone,
  resolveBirthTimezoneDetailed,
  resolveBirthTimezoneOnDevice,
  resolveBirthTimezoneStrict,
  resolveViewerTimezone,
  resolveViewerTimezoneDetailed,
  timezoneFromCoordinates,
} from '@/lib/datetime/resolveTimezone'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { DEFAULT_TIMEZONE, normalizeTimeZone } from '@/lib/datetime/timezone'

const BASE = CALCULATION_STANDARDS.saju.baseTimezone
const NYC = { latitude: 40.7128, longitude: -74.006 }
const LONDON = { latitude: 51.5074, longitude: -0.1278 }

beforeEach(() => warn.mockReset())

describe('timezoneFromCoordinates', () => {
  it('좌표 → IANA', () => {
    expect(timezoneFromCoordinates(NYC.latitude, NYC.longitude)).toBe('America/New_York')
    expect(timezoneFromCoordinates(37.5665, 126.978)).toBe('Asia/Seoul')
    expect(timezoneFromCoordinates(-33.8688, 151.2093)).toBe('Australia/Sydney')
  })
  it('없음·비유한·범위 밖 → null', () => {
    expect(timezoneFromCoordinates(undefined, 10)).toBeNull()
    expect(timezoneFromCoordinates(Number.NaN, 10)).toBeNull()
    expect(timezoneFromCoordinates(95, 10)).toBeNull()
    expect(timezoneFromCoordinates(10, 200)).toBeNull()
  })
})

describe('resolveBirthTimezone', () => {
  it('유효한 명시 tz 는 그대로(좌표가 다른 곳이어도) — tz 를 실은 요청은 동작 불변', () => {
    expect(resolveBirthTimezoneDetailed({ timezone: 'Asia/Seoul', ...NYC })).toEqual({
      timeZone: 'Asia/Seoul',
      source: 'explicit',
    })
    expect(resolveBirthTimezone({ timezone: 'Europe/Paris' })).toBe('Europe/Paris')
    expect(warn).not.toHaveBeenCalled()
  })

  it('tz 가 없거나 잘못되면 출생 좌표의 tz', () => {
    expect(resolveBirthTimezoneDetailed({ ...NYC })).toEqual({
      timeZone: 'America/New_York',
      source: 'coordinates',
    })
    expect(resolveBirthTimezone({ timezone: '', ...LONDON })).toBe('Europe/London')
    expect(resolveBirthTimezone({ timezone: 'Not/A_Zone', ...LONDON })).toBe('Europe/London')
    expect(warn).not.toHaveBeenCalled()
  })

  it('tz·좌표 모두 없으면 기준 존 + logger.warn (개인정보 없이)', () => {
    expect(resolveBirthTimezoneDetailed({}, { context: 'test' })).toEqual({
      timeZone: BASE,
      source: 'base',
    })
    expect(warn).toHaveBeenCalledTimes(1)
    const [, meta] = warn.mock.calls[0]
    expect(meta).toEqual({ base: BASE, context: 'test', invalidTimezone: false })
  })
})

describe('resolveViewerTimezone', () => {
  it('요청 기기 tz 가 최우선', () => {
    expect(
      resolveViewerTimezoneDetailed({
        viewerTimezone: 'Asia/Tokyo',
        birth: { timezone: 'America/New_York' },
      })
    ).toEqual({ timeZone: 'Asia/Tokyo', source: 'viewer' })
  })

  it('기기 tz 가 없거나 잘못되면 출생 tz — 뉴욕 출생은 서울이 아니라 뉴욕', () => {
    expect(resolveViewerTimezone({ birth: { timezone: 'America/New_York' } })).toBe(
      'America/New_York'
    )
    expect(resolveViewerTimezone({ viewerTimezone: 'junk', birth: { ...NYC } })).toBe(
      'America/New_York'
    )
  })

  it('아무 단서도 없으면 기준 존', () => {
    expect(resolveViewerTimezoneDetailed({})).toEqual({ timeZone: BASE, source: 'base' })
  })
})

describe('datetime/timezone 기본값도 같은 기준 존', () => {
  it('DEFAULT_TIMEZONE·normalizeTimeZone 폴백 = baseTimezone', () => {
    expect(DEFAULT_TIMEZONE).toBe(BASE)
    expect(normalizeTimeZone('bogus')).toBe(BASE)
    expect(normalizeTimeZone('America/Chicago')).toBe('America/Chicago')
  })
})

describe('resolveBirthTimezoneStrict — 서버 계산용(서울 폴백 없음, G13)', () => {
  it('명시 tz → 좌표 tz', () => {
    expect(resolveBirthTimezoneStrict({ timezone: 'Europe/Paris', ...NYC })).toEqual({
      timeZone: 'Europe/Paris',
      source: 'explicit',
    })
    expect(resolveBirthTimezoneStrict({ timezone: 'Not/AZone', ...LONDON })).toEqual({
      timeZone: 'Europe/London',
      source: 'coordinates',
    })
  })
  it('tz 도 좌표도 없으면 null — baseTimezone 으로 떨어지지 않고 경고도 없다', () => {
    expect(resolveBirthTimezoneStrict({})).toBeNull()
    expect(resolveBirthTimezoneStrict({ timezone: '', latitude: null, longitude: null })).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('resolveBirthTimezoneOnDevice — 클라이언트 폼용(저장 tz → 도시 → 기기 tz, G13)', () => {
  it('저장 tz 가 먼저, 다음은 출생 도시 좌표', () => {
    expect(resolveBirthTimezoneOnDevice({ timezone: 'Asia/Tokyo', ...NYC }, 'Europe/Berlin')).toBe(
      'Asia/Tokyo'
    )
    expect(resolveBirthTimezoneOnDevice({ ...NYC }, 'Europe/Berlin')).toBe('America/New_York')
  })
  it('둘 다 없으면 보는 사람 기기 tz — 서울이 아니다', () => {
    expect(resolveBirthTimezoneOnDevice({}, 'America/Chicago')).toBe('America/Chicago')
    expect(resolveBirthTimezoneOnDevice({}, undefined)).toBe('UTC')
    expect(resolveBirthTimezoneOnDevice({}, 'garbage')).toBe('UTC')
  })
})
