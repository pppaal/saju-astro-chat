import { describe, it, expect } from 'vitest'
import { isSameBirth, type BirthSubject } from '@/lib/birth/sameBirth'
import type { StoredBirthInfo } from '@/lib/birth/storage'

const SUBJECT: BirthSubject = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  timeUnknown: false,
  gender: 'female',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const stored = (over: Partial<StoredBirthInfo> = {}): StoredBirthInfo => ({
  birthDate: '1997-03-21',
  birthTime: '14:30',
  birthTimeUnknown: false,
  gender: 'female',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  savedAt: '2026-11-01T00:00:00Z',
  ...over,
})

describe('isSameBirth — 화면의 본명 vs 저장된 본명(QA-8)', () => {
  it('같은 날짜 · 시각 · 성별 · 좌표면 같다', () => {
    expect(isSameBirth(SUBJECT, stored())).toBe(true)
    expect(isSameBirth({ ...SUBJECT, birthTime: '14:30' }, stored({ birthTime: '14:30' }))).toBe(
      true
    )
  })

  it('저장된 본명이 없으면 다르다', () => {
    expect(isSameBirth(SUBJECT, null)).toBe(false)
  })

  it('날짜 · 성별 · 시각이 다르면 다르다', () => {
    expect(isSameBirth(SUBJECT, stored({ birthDate: '1997-03-22' }))).toBe(false)
    expect(isSameBirth(SUBJECT, stored({ gender: 'male' }))).toBe(false)
    expect(isSameBirth(SUBJECT, stored({ birthTime: '14:31' }))).toBe(false)
  })

  it('시각 미상 여부가 다르면 다르고, 둘 다 미상이면 앵커 시각은 보지 않는다', () => {
    expect(isSameBirth(SUBJECT, stored({ birthTimeUnknown: true }))).toBe(false)
    const tu: BirthSubject = { ...SUBJECT, birthTime: '12:00', timeUnknown: true }
    expect(isSameBirth(tu, stored({ birthTime: '00:00', birthTimeUnknown: true }))).toBe(true)
    // 레거시(플래그 없음) '00:00' 은 미상 휴리스틱 — 정오 앵커 override 와 같다.
    expect(isSameBirth(tu, stored({ birthTime: '00:00', birthTimeUnknown: undefined }))).toBe(true)
  })

  it('HH:MM 표기 차이(9:05 vs 09:05)는 같은 시각', () => {
    expect(isSameBirth({ ...SUBJECT, birthTime: '09:05' }, stored({ birthTime: '9:05' }))).toBe(
      true
    )
  })

  it('좌표 — 다른 도시면 다르고, 한쪽만 좌표가 있으면 다르다', () => {
    expect(isSameBirth(SUBJECT, stored({ latitude: 35.1796, longitude: 129.0756 }))).toBe(false)
    expect(isSameBirth(SUBJECT, stored({ latitude: undefined, longitude: undefined }))).toBe(false)
    const noCity: BirthSubject = { ...SUBJECT, latitude: undefined, longitude: undefined }
    expect(isSameBirth(noCity, stored())).toBe(false)
  })

  it('둘 다 좌표가 없으면 타임존으로(저장값에 타임존이 없으면 같다고 본다)', () => {
    const noCity: BirthSubject = { ...SUBJECT, latitude: undefined, longitude: undefined }
    const s = { latitude: undefined, longitude: undefined }
    expect(isSameBirth(noCity, stored(s))).toBe(true)
    expect(isSameBirth(noCity, stored({ ...s, timeZone: 'America/New_York' }))).toBe(false)
    expect(isSameBirth(noCity, stored({ ...s, timeZone: undefined }))).toBe(true)
  })
})
