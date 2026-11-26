import { describe, it, expect } from 'vitest'
import { parseBirthOverride, parseBirthOverrideQuery } from '@/app/calendar/loadTierData'

describe('parseBirthOverride — 쿼리파라미터 → 생일 override (로그인 없이 캘린더/인생흐름)', () => {
  it('date 가 없으면 null (세션/샘플 경로로)', () => {
    expect(parseBirthOverride({})).toBeNull()
    expect(parseBirthOverride({ time: '06:40', gender: 'female' })).toBeNull()
  })

  it('잘못된 date 형식이면 null', () => {
    expect(parseBirthOverride({ date: '1995/02/09' })).toBeNull()
    expect(parseBirthOverride({ date: 'nope' })).toBeNull()
  })

  it('date 만 있으면 나머지는 안전 기본값(정오·서울·남) + 시간·출생지 미상 플래그', () => {
    const o = parseBirthOverride({ date: '1995-02-09' })
    expect(o).toEqual({
      birthDate: '1995-02-09',
      birthTime: '12:00',
      timeUnknown: true,
      // 좌표가 없으면 서울 기본값 — 캘린더가 ASC·하우스 의존 신호를 막도록 표시(E7).
      cityUnknown: true,
      gender: 'male',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      place: undefined,
      name: undefined,
    })
  })

  it('레거시 링크의 time=00:00(저장 규약상 미상)도 정오 앵커로 — 자정 앵커는 진태양시 보정으로 일주가 전날로 밀린다', () => {
    const o = parseBirthOverride({ date: '1995-02-09', time: '00:00' })
    expect(o?.birthTime).toBe('12:00')
    expect(o?.timeUnknown).toBe(true)
  })

  it('tu=0 명시 플래그면 time=00:00 을 실제 자정 출생으로 신뢰 (tri-state)', () => {
    const o = parseBirthOverride({ date: '1995-02-09', time: '00:00', tu: '0' })
    expect(o?.birthTime).toBe('00:00')
    expect(o?.timeUnknown).toBe(false)
  })

  it('tu=1 명시 미상이면 실제 시각이 있어도 정오 앵커 + 미상', () => {
    const o = parseBirthOverride({ date: '1995-02-09', time: '08:30', tu: '1' })
    expect(o?.birthTime).toBe('12:00')
    expect(o?.timeUnknown).toBe(true)
  })

  it('전체 파라미터를 그대로 싣는다 (female/좌표/타임존/이름/장소)', () => {
    const o = parseBirthOverride({
      date: '1988-12-01',
      time: '23:15',
      gender: 'female',
      lat: '40.7128',
      lng: '-74.006',
      tz: 'America/New_York',
      name: 'Sam',
      place: 'New York',
    })
    expect(o).toMatchObject({
      birthDate: '1988-12-01',
      birthTime: '23:15',
      timeUnknown: false,
      gender: 'female',
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: 'America/New_York',
      name: 'Sam',
      place: 'New York',
      cityUnknown: false,
    })
  })

  it('빈 좌표는 출생지 미상 — 서울 기본으로 폴백', () => {
    const o = parseBirthOverride({ date: '2000-01-01', lat: '', lng: '' })
    expect(o?.latitude).toBe(37.5665)
    expect(o?.longitude).toBe(126.978)
    expect(o?.cityUnknown).toBe(true)
    // 한쪽만 있어도 미상(좌표는 쌍으로만 쓴다).
    expect(parseBirthOverride({ date: '2000-01-01', lat: '40.7' })?.cityUnknown).toBe(true)
  })

  it('검사에 걸린 override 는 null — 페이지는 세션/입력 게이트로(크래시 없음, QA PMS-4)', () => {
    // 공용 zod 스키마: 1900..올해 · 위도 ±90 · 경도 ±180 · IANA tz · HH:MM · 길이 제한.
    expect(parseBirthOverride({ date: '1850-01-01' })).toBeNull()
    expect(parseBirthOverride({ date: '1995-02-30' })).toBeNull()
    expect(parseBirthOverride({ date: '2000-01-01', lat: 'abc', lng: '126.9' })).toBeNull()
    expect(parseBirthOverride({ date: '2000-01-01', lat: '999', lng: '999' })).toBeNull()
    expect(parseBirthOverride({ date: '2000-01-01', tz: 'Not/AZone' })).toBeNull()
    expect(parseBirthOverride({ date: '2000-01-01', time: '7pm' })).toBeNull()
    expect(parseBirthOverride({ date: '2000-01-01', name: 'n'.repeat(41) })).toBeNull()
  })

  it('parseBirthOverrideQuery — none · invalid(이슈 경로) · ok 를 가른다', () => {
    expect(parseBirthOverrideQuery({})).toEqual({ kind: 'none' })
    expect(parseBirthOverrideQuery({ date: '' })).toEqual({ kind: 'none' })
    const bad = parseBirthOverrideQuery({ date: '1850-01-01', lat: '999', lng: '1' })
    expect(bad.kind).toBe('invalid')
    if (bad.kind === 'invalid') {
      expect(bad.issues.map((i) => i.path).sort()).toEqual(['date', 'lat'])
    }
    const ok = parseBirthOverrideQuery({ date: '1995-02-09', lat: '37.5', lng: '127' })
    expect(ok.kind).toBe('ok')
  })

  it('배열 파라미터(중복 쿼리)는 첫 값을 쓴다', () => {
    const o = parseBirthOverride({ date: ['1995-02-09', '2001-01-01'], gender: ['female'] })
    expect(o?.birthDate).toBe('1995-02-09')
    expect(o?.gender).toBe('female')
  })
})
