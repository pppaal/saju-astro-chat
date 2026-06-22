import { describe, it, expect } from 'vitest'
import { dayStrength } from '@/lib/calendar-engine/derivers/dayStrength'

describe('dayStrength', () => {
  it('중립(50) 근처는 고요/잔잔, 극단은 아주 강한 날 — 좋/나쁨 무관 (대칭)', () => {
    expect(dayStrength(50)).toMatchObject({ level: 1, ko: '고요한 날' })
    expect(dayStrength(95)).toMatchObject({ level: 5, ko: '아주 강한 날' })
    // 같은 거리면 좋은 쪽(85)과 나쁜 쪽(15)이 같은 세기.
    expect(dayStrength(85).level).toBe(dayStrength(15).level)
    expect(dayStrength(85).level).toBe(5)
  })

  it('막대 단계가 |score-50| 구간을 따른다', () => {
    expect(dayStrength(72).level).toBe(4) // Δ22 ≥20 → 4
    expect(dayStrength(65).level).toBe(3) // Δ15 → 3
    expect(dayStrength(63).level).toBe(3) // Δ13 → 3
    expect(dayStrength(57).level).toBe(2) // Δ7 → 2
    expect(dayStrength(53).level).toBe(1) // Δ3 → 1
  })

  it('범위 밖·비정상 입력은 클램프/폴백', () => {
    expect(dayStrength(120).level).toBe(5)
    expect(dayStrength(-10).level).toBe(5)
    expect(dayStrength(NaN)).toMatchObject({ level: 1 }) // → 50 폴백
  })

  it('결정론 — 같은 점수 같은 출력, EN 동반', () => {
    expect(dayStrength(88)).toEqual(dayStrength(88))
    expect(dayStrength(88).en).toBe('a very strong day')
  })
})
