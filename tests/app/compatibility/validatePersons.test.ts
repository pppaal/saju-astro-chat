// tests/app/compatibility/validatePersons.test.ts
//
// validatePersons — 궁합 페이지 폼 검증(순수). 사람 수 범위·필수 필드(생일·성별)·
// 상세모드 추가 필드(시간·도시 좌표·타임존·관계·기타 메모) 분기를 전부 커버.

import { describe, it, expect } from 'vitest'
import { validatePersons } from '@/app/compatibility/validatePersons'
import type { PersonForm } from '@/app/compatibility/lib'

// 키를 그대로 돌려주는 t — 어떤 분기가 걸렸는지 반환 문자열로 식별.
const t = (key: string, _fallback: string): string => key

const base = (over: Partial<PersonForm> = {}): PersonForm =>
  ({
    name: '',
    date: '1990-01-01',
    time: '12:00',
    gender: 'M',
    isDetailedMode: false,
    lat: 37.5,
    lon: 127,
    timeZone: 'Asia/Seoul',
    relation: 'friend',
    relationNote: '',
    ...over,
  }) as unknown as PersonForm

describe('validatePersons', () => {
  it('사람 수가 2 미만이면 인원 추가 에러', () => {
    expect(validatePersons([base()], 1, t)).toBe('compatibilityPage.errorAddPeople')
  })

  it('사람 수가 4 초과면 인원 추가 에러', () => {
    const five = Array.from({ length: 5 }, () => base())
    expect(validatePersons(five, 5, t)).toBe('compatibilityPage.errorAddPeople')
  })

  it('생일이 없으면 날짜/시간 필수 에러 (1-index prefix)', () => {
    const r = validatePersons([base({ date: '' }), base()], 2, t)
    expect(r).toBe('1: compatibilityPage.errorDateTimeRequired')
  })

  it('성별이 없으면 성별 필수 에러', () => {
    const r = validatePersons([base(), base({ gender: undefined })], 2, t)
    expect(r).toBe('2: compatibilityPage.errorGenderRequired')
  })

  it('상세모드에서 시간이 없으면 날짜/시간 필수 에러', () => {
    const r = validatePersons([base({ isDetailedMode: true, time: '' }), base()], 2, t)
    expect(r).toBe('1: compatibilityPage.errorDateTimeRequired')
  })

  it('상세모드에서 좌표가 없으면 도시 선택 에러', () => {
    const r = validatePersons([base({ isDetailedMode: true, lat: null }), base()], 2, t)
    expect(r).toBe('1: compatibilityPage.errorSelectCity')
  })

  it('상세모드에서 타임존이 없으면 타임존 필수 에러', () => {
    const r = validatePersons([base({ isDetailedMode: true, timeZone: '' }), base()], 2, t)
    expect(r).toBe('1: compatibilityPage.errorTimezoneRequired')
  })

  it('두 번째 사람 이후 상세모드에서 관계가 없으면 관계 필수 에러', () => {
    const r = validatePersons([base(), base({ isDetailedMode: true, relation: undefined })], 2, t)
    expect(r).toBe('2: compatibilityPage.errorRelationRequired')
  })

  it("관계가 'other'인데 메모가 없으면 기타 메모 에러", () => {
    const r = validatePersons(
      [base(), base({ isDetailedMode: true, relation: 'other', relationNote: '   ' })],
      2,
      t
    )
    expect(r).toBe('2: compatibilityPage.errorOtherNote')
  })

  it('모두 유효하면 null (간단모드)', () => {
    expect(validatePersons([base(), base()], 2, t)).toBeNull()
  })

  it('모두 유효하면 null (상세모드 + other 메모 존재)', () => {
    const r = validatePersons(
      [
        base({ isDetailedMode: true }),
        base({ isDetailedMode: true, relation: 'other', relationNote: '동료' }),
      ],
      2,
      t
    )
    expect(r).toBeNull()
  })
})
