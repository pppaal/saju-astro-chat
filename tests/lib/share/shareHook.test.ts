// tests/lib/share/shareHook.test.ts
//
// dayShareHook / lifeShareHook — 공유 카드용 도발 후크. 점수/톤/추세에서만
// 뽑고(없는 사실 X), seed 로 결정론적이며, 톤 버킷이 카피와 어긋나지 않는다.

import { describe, it, expect } from 'vitest'
import { dayShareHook, lifeShareHook } from '@/lib/share/shareHook'

describe('dayShareHook', () => {
  it('같은 입력은 같은 후크(결정론)', () => {
    const a = dayShareHook({ tone: 'positive', score: 87, seed: 7, ko: true })
    const b = dayShareHook({ tone: 'positive', score: 87, seed: 7, ko: true })
    expect(a).toEqual(b)
    expect(a.headline.length).toBeGreaterThan(0)
  })

  it('seed 가 다르면 풀 안에서 다른 변형을 고를 수 있다', () => {
    const hooks = new Set(
      [0, 1, 2, 3, 4].map(
        (s) => dayShareHook({ tone: 'positive', score: 90, seed: s, ko: true }).headline
      )
    )
    expect(hooks.size).toBeGreaterThan(1)
  })

  it('daySalt 가 같은 시드에서도 날마다 다른 변형을 만든다(인앱 재방문 신선도)', () => {
    const heads = new Set(
      [1, 2, 3, 4, 5].map(
        (d) => dayShareHook({ tone: 'positive', score: 90, seed: 7, daySalt: d, ko: true }).headline
      )
    )
    expect(heads.size).toBeGreaterThan(1)
    // 여전히 결정적: 같은 (시드, daySalt) → 같은 후크.
    expect(dayShareHook({ tone: 'positive', score: 90, seed: 7, daySalt: 3, ko: true })).toEqual(
      dayShareHook({ tone: 'positive', score: 90, seed: 7, daySalt: 3, ko: true })
    )
  })

  it('caution 톤은 caution 카피 풀에서만 — 도발이라도 단정/과장 아님', () => {
    const h = dayShareHook({ tone: 'caution', score: 30, seed: 1, ko: true })
    // caution 풀의 문구만 나와야 한다.
    expect(['오늘은 한 박자 늦춰.', '지르지 마. 내일이 더 좋아.']).toContain(h.headline)
  })

  it('ko/en 둘 다 비어있지 않다', () => {
    const ko = dayShareHook({ tone: 'mixed', score: 55, seed: 2, ko: true })
    const en = dayShareHook({ tone: 'mixed', score: 55, seed: 2, ko: false })
    expect(ko.headline).not.toBe(en.headline)
    expect(en.headline).toMatch(/[A-Za-z]/)
  })

  it('high 버킷은 score>=72 양수에서만', () => {
    const high = dayShareHook({ tone: 'positive', score: 80, seed: 0, ko: true })
    const good = dayShareHook({ tone: 'positive', score: 64, seed: 0, ko: true })
    expect(high.headline).not.toBe(good.headline)
  })
})

describe('lifeShareHook', () => {
  it('미래 피크면 그 나이대(십)를 후크에 박는다', () => {
    const h = lifeShareHook({
      slope: 'rising',
      nowAge: 31,
      peakAge: 41,
      peakYear: 2035,
      seed: 1994,
      ko: true,
    })
    expect(h.headline).toContain('마흔')
  })

  it('피크가 과거/지금이면 추세 기반 후크', () => {
    const rising = lifeShareHook({ slope: 'rising', nowAge: 60, peakAge: 40, seed: 1, ko: true })
    const falling = lifeShareHook({ slope: 'falling', nowAge: 60, peakAge: 40, seed: 1, ko: true })
    expect(rising.headline).not.toBe(falling.headline)
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    const args = { slope: 'plateau' as const, nowAge: 45, peakAge: 20, seed: 3, ko: false }
    expect(lifeShareHook(args)).toEqual(lifeShareHook(args))
  })
})
