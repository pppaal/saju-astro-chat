import { describe, it, expect } from 'vitest'
import { parseBirthOverride } from '@/app/calendar/loadTierData'

describe('parseBirthOverride — 쿼리파라미터 → 생일 override (로그인 없이 캘린더/인생흐름)', () => {
  it('date 가 없으면 null (세션/샘플 경로로)', () => {
    expect(parseBirthOverride({})).toBeNull()
    expect(parseBirthOverride({ time: '06:40', gender: 'female' })).toBeNull()
  })

  it('잘못된 date 형식이면 null', () => {
    expect(parseBirthOverride({ date: '1995/02/09' })).toBeNull()
    expect(parseBirthOverride({ date: 'nope' })).toBeNull()
  })

  it('date 만 있으면 나머지는 안전 기본값(정오·서울·남)', () => {
    const o = parseBirthOverride({ date: '1995-02-09' })
    expect(o).toEqual({
      birthDate: '1995-02-09',
      birthTime: '12:00',
      gender: 'male',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      place: undefined,
      name: undefined,
    })
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
      gender: 'female',
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: 'America/New_York',
      name: 'Sam',
      place: 'New York',
    })
  })

  it('숫자가 깨진 좌표는 서울 기본으로 폴백', () => {
    const o = parseBirthOverride({ date: '2000-01-01', lat: 'abc', lng: '' })
    expect(o?.latitude).toBe(37.5665)
    expect(o?.longitude).toBe(126.978)
  })

  it('배열 파라미터(중복 쿼리)는 첫 값을 쓴다', () => {
    const o = parseBirthOverride({ date: ['1995-02-09', '2001-01-01'], gender: ['female'] })
    expect(o?.birthDate).toBe('1995-02-09')
    expect(o?.gender).toBe('female')
  })
})
