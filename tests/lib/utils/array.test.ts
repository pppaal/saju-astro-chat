import { describe, it, expect, vi, afterEach } from 'vitest'
import { shuffle, shuffleInPlace } from '@/lib/utils/array'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shuffleInPlace', () => {
  it('같은 배열 참조를 그대로 반환한다 (제자리 셔플)', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffleInPlace(arr)).toBe(arr)
  })

  it('원소를 추가/삭제하지 않는다 (순열 보존)', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6]
    const sortedBefore = [...arr].sort()
    shuffleInPlace(arr)
    expect([...arr].sort()).toEqual(sortedBefore)
  })

  it('빈 배열과 단일 원소 배열은 그대로다', () => {
    expect(shuffleInPlace([])).toEqual([])
    expect(shuffleInPlace([7])).toEqual([7])
  })

  it('Fisher–Yates: Math.random 을 고정하면 결정적 순열이 나온다', () => {
    // random=0 → 매 스텝 j=0 → [1,2,3,4] 는 [2,3,4,1] 이 된다.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(shuffleInPlace([1, 2, 3, 4])).toEqual([2, 3, 4, 1])
  })

  it('random 이 1 에 근접하면 j=i (자기 교환) 로 원순서가 유지된다', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    expect(shuffleInPlace([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
  })
})

describe('shuffle', () => {
  it('새 배열을 반환하고 입력은 변형하지 않는다', () => {
    const input = [1, 2, 3, 4, 5]
    const snapshot = [...input]
    const result = shuffle(input)

    expect(result).not.toBe(input)
    expect(input).toEqual(snapshot)
  })

  it('입력과 동일한 원소 multiset 을 가진다', () => {
    const input = ['a', 'b', 'c', 'a']
    expect([...shuffle(input)].sort()).toEqual([...input].sort())
  })

  it('readonly 입력도 받는다 (타입 계약)', () => {
    const frozen = Object.freeze(['x', 'y', 'z']) as readonly string[]
    expect(() => shuffle(frozen)).not.toThrow()
    expect([...shuffle(frozen)].sort()).toEqual(['x', 'y', 'z'])
  })

  it('충분한 반복에서 모든 위치에 모든 원소가 등장한다 (편향 스모크 체크)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const result = shuffle([1, 2, 3])
      result.forEach((value, idx) => seen.add(`${idx}:${value}`))
    }
    // 3개 원소 × 3개 위치 = 9가지 조합 전부 관측되어야 함
    expect(seen.size).toBe(9)
  })
})
