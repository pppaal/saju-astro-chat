// tests/lib/share/shareHook.test.ts
//
// dayShareHook / monthShareHook — 공유 카드용 도발 후크. 점수/톤에서만
// 뽑고(없는 사실 X), seed 로 결정론적이며, 톤 버킷이 카피와 어긋나지 않는다.

import { describe, it, expect } from 'vitest'
import { dayShareHook, monthShareHook } from '@/lib/share/shareHook'

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
    // caution 풀은 절제 신호(참아/미뤄/늦춰/사려/하지 마/아냐)를 담는다 — 밀어붙임 아님.
    expect(h.headline).toMatch(/참아|미뤄|늦춰|사려|하지 마|아냐/)
  })

  it('ko/en 둘 다 비어있지 않다', () => {
    const ko = dayShareHook({ tone: 'mixed', score: 55, seed: 2, ko: true })
    const en = dayShareHook({ tone: 'mixed', score: 55, seed: 2, ko: false })
    expect(ko.headline).not.toBe(en.headline)
    expect(en.headline).toMatch(/[A-Za-z]/)
  })

  it('도박 비유(판·테이블) 후크가 없다 — 같은 자리를 교체해 풀 길이·회전은 그대로', () => {
    const inputs = [
      { tone: 'positive' as const, score: 90 },
      { tone: 'positive' as const, score: 64 },
      { tone: 'mixed' as const, score: 55 },
      { tone: 'caution' as const, score: 30 },
    ]
    for (const { tone, score } of inputs) {
      const heads = new Set<string>()
      for (let seed = 0; seed < 64; seed++) {
        for (const ko of [true, false]) {
          const h = dayShareHook({ tone, score, seed, ko })
          const line = `${h.headline} ${h.subline ?? ''}`
          expect(line).not.toMatch(/tables you can win|Spectate/i)
          expect(line).not.toMatch(/이길 판|구경만/)
          if (ko) heads.add(h.headline)
        }
      }
      if (tone === 'mixed') {
        // mixed 풀 = 10 변형(교체 전과 동일) — 64 시드 회전으로 전부 드러난다.
        expect(heads.size).toBe(10)
        // 회전 주기도 그대로: seed 와 seed+10 은 같은 변형.
        expect(dayShareHook({ tone, score, seed: 3, ko: true })).toEqual(
          dayShareHook({ tone, score, seed: 13, ko: true })
        )
      }
    }
    // 교체된 자리(mixed 9번째 = index 8)는 새 비도박 문구.
    expect(dayShareHook({ tone: 'mixed', score: 55, seed: 8, ko: false }).headline).toBe(
      'Only take on what you can finish today. That’s the skill.'
    )
    expect(dayShareHook({ tone: 'mixed', score: 55, seed: 8, ko: true }).headline).toBe(
      '오늘은 끝낼 수 있는 것만 골라 잡아. 그게 실력이야.'
    )
  })

  it('high 버킷은 score>=72 양수에서만', () => {
    const high = dayShareHook({ tone: 'positive', score: 80, seed: 0, ko: true })
    const good = dayShareHook({ tone: 'positive', score: 64, seed: 0, ko: true })
    expect(high.headline).not.toBe(good.headline)
  })
})

describe('monthShareHook', () => {
  it('톤별로 다른 풀에서 뽑고 ko/en 둘 다 비어있지 않다', () => {
    const bright = monthShareHook({ tone: 'bright', seed: 3, ko: true })
    const careful = monthShareHook({ tone: 'careful', seed: 3, ko: true })
    const mixed = monthShareHook({ tone: 'mixed', seed: 3, ko: true })
    expect(new Set([bright.headline, careful.headline, mixed.headline]).size).toBe(3)
    const en = monthShareHook({ tone: 'bright', seed: 3, ko: false })
    expect(en.headline).toMatch(/[A-Za-z]/)
    expect(bright.headline).toContain('이번 달')
  })

  it('monthSalt 로 달마다 다른 변형(결정적)', () => {
    const heads = new Set(
      [1, 2, 3, 4].map(
        (m) => monthShareHook({ tone: 'bright', seed: 5, monthSalt: m, ko: true }).headline
      )
    )
    expect(heads.size).toBeGreaterThan(1)
    expect(monthShareHook({ tone: 'bright', seed: 5, monthSalt: 2, ko: true })).toEqual(
      monthShareHook({ tone: 'bright', seed: 5, monthSalt: 2, ko: true })
    )
  })
})

describe('dayShareHook — 오늘이 아닌 날(isToday: false)은 날짜 중립 풀(QA COPY-1)', () => {
  const DATE_WORD = /오늘|내일|어제|\btoday\b|\btomorrow\b|\byesterday\b/i
  it('어떤 톤·시드에도 상대 날짜 말이 없다(ko/en)', () => {
    for (const [tone, score] of [
      ['positive', 90],
      ['positive', 64],
      ['mixed', 55],
      ['caution', 30],
    ] as const) {
      for (let seed = 0; seed < 40; seed++) {
        for (const ko of [true, false]) {
          const h = dayShareHook({ tone, score, seed, daySalt: 24, isToday: false, ko })
          expect(`${h.headline} ${h.subline ?? ''}`).not.toMatch(DATE_WORD)
        }
      }
    }
  })

  it('같은 입력은 같은 후크, 기본(isToday 생략)은 오늘 풀 그대로', () => {
    const a = dayShareHook({ tone: 'caution', score: 30, seed: 3, isToday: false, ko: true })
    expect(dayShareHook({ tone: 'caution', score: 30, seed: 3, isToday: false, ko: true })).toEqual(
      a
    )
    expect(dayShareHook({ tone: 'caution', score: 30, seed: 3, ko: true })).toEqual(
      dayShareHook({ tone: 'caution', score: 30, seed: 3, isToday: true, ko: true })
    )
  })

  it('EN 풀의 아포스트로피는 한 가지(’) — 곧은 따옴표 없음(QA COPY-12)', () => {
    for (const isToday of [true, false]) {
      for (const [tone, score] of [
        ['positive', 90],
        ['positive', 64],
        ['mixed', 55],
        ['caution', 30],
      ] as const) {
        for (let seed = 0; seed < 40; seed++) {
          const h = dayShareHook({ tone, score, seed, isToday, ko: false })
          expect(`${h.headline} ${h.subline ?? ''}`).not.toContain("'")
        }
      }
    }
    for (const tone of ['bright', 'careful', 'mixed', 'steady'] as const) {
      for (let seed = 0; seed < 40; seed++) {
        const h = monthShareHook({ tone, seed, ko: false })
        expect(`${h.headline} ${h.subline ?? ''}`).not.toContain("'")
      }
    }
  })
})
