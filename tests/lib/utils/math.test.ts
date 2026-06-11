import { describe, it, expect } from 'vitest'
import {
  clamp,
  clamp01,
  round1,
  round2,
  round3,
  clampScore0to100,
  clampScore1to10,
  average,
} from '@/lib/utils/math'

describe('clamp', () => {
  it('범위 안의 값은 그대로 반환한다', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('범위 밖의 값은 경계로 자른다', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('NaN/±Infinity 는 0 으로 collapse 한다 (min 이 아니라 0)', () => {
    expect(clamp(NaN, 2, 10)).toBe(0)
    expect(clamp(Infinity, 2, 10)).toBe(0)
    expect(clamp(-Infinity, 2, 10)).toBe(0)
  })

  it('음수 범위도 지원한다', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(0, -10, -1)).toBe(-1)
  })
})

describe('clamp01', () => {
  it('[0, 1] 로 clamp 한다', () => {
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(-0.1)).toBe(0)
    expect(clamp01(1.5)).toBe(1)
  })

  it('NaN 은 0 이 된다 (점수 NaN 전파 차단)', () => {
    expect(clamp01(NaN)).toBe(0)
  })
})

describe('round1 / round2 / round3', () => {
  it('각 자릿수로 반올림한다', () => {
    expect(round1(1.24)).toBe(1.2)
    expect(round1(1.25)).toBe(1.3)
    expect(round2(3.14159)).toBe(3.14)
    expect(round2(3.145)).toBe(3.15)
    expect(round3(2.71828)).toBe(2.718)
    expect(round3(2.7185)).toBe(2.719)
  })

  it('정수와 0 은 변하지 않는다', () => {
    expect(round1(5)).toBe(5)
    expect(round2(0)).toBe(0)
    expect(round3(-3)).toBe(-3)
  })

  it('음수도 반올림한다', () => {
    expect(round2(-1.234)).toBe(-1.23)
  })
})

describe('clampScore0to100', () => {
  it('범위 안 점수는 정수로 반올림한다', () => {
    expect(clampScore0to100(72.4)).toBe(72)
    expect(clampScore0to100(72.5)).toBe(73)
    expect(clampScore0to100(0)).toBe(0)
    expect(clampScore0to100(100)).toBe(100)
  })

  it('범위 밖 점수는 [0, 100] 으로 자른다', () => {
    expect(clampScore0to100(-5)).toBe(0)
    expect(clampScore0to100(150)).toBe(100)
  })

  it('undefined / NaN / Infinity 는 중립값 50 으로 폴백한다 ("NaN%" 배지 방지)', () => {
    expect(clampScore0to100(undefined)).toBe(50)
    expect(clampScore0to100(NaN)).toBe(50)
    expect(clampScore0to100(Infinity)).toBe(50)
  })
})

describe('clampScore1to10', () => {
  it('범위 안 점수는 정수로 반올림한다', () => {
    expect(clampScore1to10(7.6)).toBe(8)
    expect(clampScore1to10(1)).toBe(1)
    expect(clampScore1to10(10)).toBe(10)
  })

  it('하한은 1 이다 (0 점도 1 로)', () => {
    expect(clampScore1to10(0)).toBe(1)
    expect(clampScore1to10(-3)).toBe(1)
  })

  it('상한은 10 이다', () => {
    expect(clampScore1to10(42)).toBe(10)
  })

  it('undefined / NaN 은 중립값 5 로 폴백한다', () => {
    expect(clampScore1to10(undefined)).toBe(5)
    expect(clampScore1to10(NaN)).toBe(5)
  })
})

describe('average', () => {
  it('산술 평균을 계산한다', () => {
    expect(average([1, 2, 3, 4])).toBe(2.5)
    expect(average([10])).toBe(10)
  })

  it('빈 배열은 NaN 이 아닌 0 을 반환한다', () => {
    expect(average([])).toBe(0)
  })

  it('음수 혼합도 처리한다', () => {
    expect(average([-2, 2])).toBe(0)
  })
})
