// tests/app/compatibility/recentPairs.test.ts
//
// recentPairs — compat "최근 본 페어" localStorage 헬퍼. 저장/조회/중복 끌어올림/
// 최대 5개 유지/제거/손상 데이터 방어를 커버. (happy-dom localStorage)

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRecentPairs,
  getLatestPair,
  pushRecentPair,
  removeRecentPair,
  type RecentPairPerson,
} from '@/app/compatibility/lib/recentPairs'

const KEY = 'compat_recent_pairs_v1'

const person = (name: string): RecentPairPerson => ({
  name,
  date: '1990-05-05',
  time: '10:00',
  cityQuery: 'Seoul',
  lat: 37.5,
  lon: 127,
  timeZone: 'Asia/Seoul',
})

const pair = (a: string, b: string): [RecentPairPerson, RecentPairPerson] => [person(a), person(b)]

beforeEach(() => {
  window.localStorage.clear()
})

describe('recentPairs', () => {
  it('빈 저장소면 빈 배열 / 최신은 null', () => {
    expect(getRecentPairs()).toEqual([])
    expect(getLatestPair()).toBeNull()
  })

  it('push 하면 조회되고 최신 = index 0', () => {
    pushRecentPair(pair('준영', '지민'))
    const list = getRecentPairs()
    expect(list).toHaveLength(1)
    expect(list[0].persons[0].name).toBe('준영')
    expect(getLatestPair()?.persons[1].name).toBe('지민')
  })

  it('이름이 비면 저장 안 함', () => {
    pushRecentPair(pair('', '지민'))
    expect(getRecentPairs()).toEqual([])
  })

  it('같은 페어 재입력 시 위로 끌어올림(중복 없음)', () => {
    pushRecentPair(pair('A', 'B'))
    pushRecentPair(pair('C', 'D'))
    pushRecentPair(pair('A', 'B')) // 다시 A·B
    const list = getRecentPairs()
    expect(list).toHaveLength(2)
    expect(list[0].persons[0].name).toBe('A') // 최상단으로
    expect(list[1].persons[0].name).toBe('C')
  })

  it('최대 5개만 유지', () => {
    for (const n of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) pushRecentPair(pair(n, `${n}2`))
    const list = getRecentPairs()
    expect(list).toHaveLength(5)
    expect(list[0].persons[0].name).toBe('g') // 가장 최근
  })

  it('removeRecentPair 로 특정 페어 제거', () => {
    pushRecentPair(pair('A', 'B'))
    pushRecentPair(pair('C', 'D'))
    removeRecentPair(pair('A', 'B'))
    const list = getRecentPairs()
    expect(list).toHaveLength(1)
    expect(list[0].persons[0].name).toBe('C')
  })

  it('손상된 JSON / 배열 아님 / 스키마 불일치는 걸러냄', () => {
    window.localStorage.setItem(KEY, '{not json')
    expect(getRecentPairs()).toEqual([])
    window.localStorage.setItem(KEY, JSON.stringify({ nope: true }))
    expect(getRecentPairs()).toEqual([])
    window.localStorage.setItem(
      KEY,
      JSON.stringify([{ persons: [{ name: '' }, { name: 'x' }], lastUsedAt: 1 }])
    )
    expect(getRecentPairs()).toEqual([])
  })
})
