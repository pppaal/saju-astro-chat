/**
 * timeToState — 폼 상태 변환의 tri-state 회귀.
 *
 * 배경: 앱 저장 규약상 '00:00' 은 오랫동안 "시간 모름" 표기였는데, 실제 자정
 * 출생자도 같이 미상으로 오분류됐다. birthTimeUnknown 명시 플래그(DB/URL/폼)가
 * 저장되면서 timeToState 도 tri-state — 플래그가 boolean 이면 신뢰하고,
 * 미지정(레거시)이면 기존 휴리스틱('00:00'/빈값 = 미상)으로 폴백한다.
 */
import { describe, it, expect } from 'vitest'
import { timeToState } from '@/app/(main)/birthInfoStorage'

describe('timeToState — tri-state', () => {
  it("레거시(플래그 미지정): 빈값/'00:00' 은 미상", () => {
    expect(timeToState('')).toEqual({ birthTime: '', timeUnknown: true })
    expect(timeToState(undefined)).toEqual({ birthTime: '', timeUnknown: true })
    expect(timeToState('00:00')).toEqual({ birthTime: '', timeUnknown: true })
    expect(timeToState('06:40')).toEqual({ birthTime: '06:40', timeUnknown: false })
  })

  it("명시 플래그 false: '00:00' 을 실제 자정 출생으로 유지", () => {
    expect(timeToState('00:00', false)).toEqual({ birthTime: '00:00', timeUnknown: false })
  })

  it('명시 플래그 true: 시각이 남아 있어도 미상 우선', () => {
    expect(timeToState('08:30', true)).toEqual({ birthTime: '', timeUnknown: true })
  })

  it('플래그 false 여도 빈 시각은 미상 (계산할 시각이 없다)', () => {
    expect(timeToState('', false)).toEqual({ birthTime: '', timeUnknown: true })
  })

  it('null 플래그(레거시 DB 행) = 미지정 → 휴리스틱', () => {
    expect(timeToState('00:00', null)).toEqual({ birthTime: '', timeUnknown: true })
  })
})
