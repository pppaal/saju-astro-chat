// tests/lib/report/lifeStrategy.test.ts
//
// "운을 내 편으로" 데이터 — 정직성 계약: 전부 엔진 값에서(가짜 없음), 근거 없는
// 타일은 undefined, 전부 없으면 null. 천을귀인은 일간→귀인 지지 SSOT 그대로.

import { describe, it, expect } from 'vitest'
import { buildLifeStrategy } from '@/lib/report/lifeStrategy'
import type { SibsinCategoryCount } from '@/lib/saju/sibsinAnalysis'

const cc = (p: Partial<SibsinCategoryCount>): SibsinCategoryCount => ({
  비겁: 0,
  식상: 0,
  재성: 0,
  관성: 0,
  인성: 0,
  ...p,
})

describe('buildLifeStrategy', () => {
  it('근거 전무면 null', () => {
    expect(buildLifeStrategy({})).toBeNull()
  })

  it('행운 요소는 엔진 값 그대로(수동 매핑 없음)', () => {
    const s = buildLifeStrategy({
      yongsin: {
        luckyColors: ['네이비', '블랙', '남색', '군청'],
        luckyDirection: '북쪽',
        luckyNumbers: [1, 6, 9, 4, 7],
      },
    })!
    expect(s.lucky!.colors).toEqual(['네이비', '블랙', '남색']) // 3개 컷
    expect(s.lucky!.direction).toBe('북쪽')
    expect(s.lucky!.numbers).toEqual([1, 6, 9, 4]) // 4개 컷
  })

  it('귀인 띠 — 천을귀인 SSOT(辛 → 寅·午 → 호랑이·말)', () => {
    const s = buildLifeStrategy({ dayStemHanja: '辛' })!
    expect(s.guin!.animals).toEqual(['호랑이띠', '말띠'])
  })

  it('귀인 — 甲 → 丑·未 → 소·양', () => {
    const s = buildLifeStrategy({ dayStemHanja: '甲' })!
    expect(s.guin!.animals).toEqual(['소띠', '양띠'])
  })

  it('귀인 — 한글 일간도 정규화(신 → 辛 → 호랑이·말)', () => {
    const s = buildLifeStrategy({ dayStemHanja: '신' })!
    expect(s.guin!.animals).toEqual(['호랑이띠', '말띠'])
  })

  it('일간 없으면 귀인 타일 생략', () => {
    const s = buildLifeStrategy({ sibsinCount: cc({ 재성: 3 }) })!
    expect(s.guin).toBeUndefined()
  })

  it('주의 구간 — 엔진 저점 미래 우선(과거 저점 제외)', () => {
    const troughs = [
      { age: 30, year: 2025, value: 38 }, // 저점(과거)
      { age: 50, year: 2045, value: 32 }, // 저점(미래)
    ]
    const s = buildLifeStrategy({ curveTroughs: troughs, nowAge: 35 })!
    // 미래(35 이후)만 → 50세
    expect(s.caution!.years).toEqual([{ year: 2045, age: 50 }])
  })

  it('주의 구간 — 미래 저점 여럿이면 깊은 순 2개, 표시는 시간순', () => {
    const troughs = [
      { age: 40, year: 2035, value: 40 },
      { age: 50, year: 2045, value: 20 }, // 가장 깊음
      { age: 60, year: 2055, value: 30 },
    ]
    const s = buildLifeStrategy({ curveTroughs: troughs, nowAge: 35 })!
    // 깊은 2개(50·60세) → 시간순
    expect(s.caution!.years).toEqual([
      { year: 2045, age: 50 },
      { year: 2055, age: 60 },
    ])
  })

  it('엔진 저점이 없으면(완만) 주의 타일 생략', () => {
    expect(buildLifeStrategy({ curveTroughs: [], nowAge: 25 })).toBeNull()
  })

  it('재물 방식 — 재성 3+이면 재물 감각', () => {
    const s = buildLifeStrategy({ sibsinCount: cc({ 재성: 3 }) })!
    expect(s.wealth!.styleKo).toContain('재물 감각')
  })

  it('재물 방식 — 식상 우세면 재능형', () => {
    const s = buildLifeStrategy({ sibsinCount: cc({ 식상: 4, 재성: 1 }) })!
    expect(s.wealth!.styleKo).toContain('재능')
  })
})
