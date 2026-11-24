// 결정론 회귀 — calculateSajuData 의 "지금" 주입점.
//
// 배경: 원국(네 기둥)은 birthDate/Time 만으로 결정되지만 대운/세운·월운·만나이는
// "현재 시각"에 의존한다. 예전엔 그 경로가 함수 안에서 new Date() 를 직접 읽어
//   (1) 같은 입력도 날짜가 바뀌면 결과가 달라지고(=결정론 누수),
//   (2) 그 경로를 골든으로 잠글 수 없었다.
// 이제 calculateSajuData(..., now) 로 시각을 주입할 수 있다. 이 테스트가
// 그 계약을 잠근다.

import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

const BIRTH = ['1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul'] as const

describe('calculateSajuData — now 주입 결정론', () => {
  it('같은 입력 + 같은 now 는 byte 동일한 결과를 준다', () => {
    const now = new Date('2026-06-16T00:00:00Z')
    const a = calculateSajuData(...BIRTH, undefined, undefined, now)
    const b = calculateSajuData(...BIRTH, undefined, undefined, now)
    // 캐시 키가 now 의 로컬 날짜를 포함하므로 동일 now 는 동일 결과.
    expect(JSON.stringify(b.unse)).toEqual(JSON.stringify(a.unse))
  })

  it('원국(네 기둥)은 now 가 달라도 불변 — 출생만으로 결정', () => {
    const early = calculateSajuData(
      ...BIRTH,
      undefined,
      undefined,
      new Date('2020-01-01T00:00:00Z')
    )
    const later = calculateSajuData(
      ...BIRTH,
      undefined,
      undefined,
      new Date('2030-12-31T00:00:00Z')
    )
    expect(later.yearPillar).toEqual(early.yearPillar)
    expect(later.monthPillar).toEqual(early.monthPillar)
    expect(later.dayPillar).toEqual(early.dayPillar)
    expect(later.timePillar).toEqual(early.timePillar)
  })

  it('세운(연운)은 now 의 연도를 따라간다 — 시각 의존 경로가 실제로 now 를 쓴다', () => {
    const in2026 = calculateSajuData(
      ...BIRTH,
      undefined,
      undefined,
      new Date('2026-06-16T00:00:00Z')
    )
    const in2030 = calculateSajuData(
      ...BIRTH,
      undefined,
      undefined,
      new Date('2030-06-16T00:00:00Z')
    )
    // 연운은 "현재 연도부터 6년치" — 첫 항목의 연도가 now 의 로컬 연도여야 한다.
    expect(in2026.unse.annual[0]?.year).toBe(2026)
    expect(in2030.unse.annual[0]?.year).toBe(2030)
  })
})
