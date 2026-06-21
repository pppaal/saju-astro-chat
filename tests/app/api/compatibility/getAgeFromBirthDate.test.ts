/**
 * 궁합 getAgeFromBirthDate — 만 나이 SSOT(currentManAge) 위임 회귀.
 *
 * 회귀: 예전엔 `new Date(date)`(=UTC 자정)와 서버-로컬 `new Date()` 필드를 섞어,
 * 생일·연말 경계에서 ±1 어긋날 수 있었고 상담사/대운 화면의 만나이와 기준이
 * 갈렸다. 이제 currentManAge 에 위임 — birthTimeZone 기준으로 일관 계산.
 *
 * getAgeFromBirthDate 는 모듈 내부 함수라, 동일 입력으로 SSOT currentManAge 와
 * 결과가 일치하는지(=위임됐는지)를 export 된 SSOT 로 간접 검증한다.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { currentManAge } from '@/lib/datetime/currentAge'
import { getAgeFromBirthDate } from '@/app/api/compatibility/counselor/routeSupport'

afterEach(() => vi.useRealTimers())

describe('getAgeFromBirthDate — currentManAge SSOT 위임', () => {
  it('생일 통과 여부를 출생 시간대 기준으로 본다', () => {
    // 2026-06-21 KST 기준 1990-08-10생: 아직 생일 전 → 만 35.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T03:00:00Z'))
    const age = getAgeFromBirthDate('1990-08-10', 'Asia/Seoul')
    expect(age).toBe(
      currentManAge({ birthYear: 1990, birthMonth: 8, birthDate: 10, birthTimeZone: 'Asia/Seoul' })
    )
    expect(age).toBe(35)
  })

  it('생일 지난 뒤엔 +1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T03:00:00Z'))
    expect(getAgeFromBirthDate('1990-03-01', 'Asia/Seoul')).toBe(36)
  })

  it('잘못된/빈 날짜는 30 폴백', () => {
    expect(getAgeFromBirthDate(undefined)).toBe(30)
    expect(getAgeFromBirthDate('not-a-date')).toBe(30)
  })

  it('tz 미지정이면 Asia/Seoul 기본', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T03:00:00Z'))
    expect(getAgeFromBirthDate('2000-01-01')).toBe(
      currentManAge({ birthYear: 2000, birthMonth: 1, birthDate: 1, birthTimeZone: 'Asia/Seoul' })
    )
  })
})
