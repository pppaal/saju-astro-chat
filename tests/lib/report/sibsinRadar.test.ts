// tests/lib/report/sibsinRadar.test.ts
//
// 능력치 레이더 — 정직성 계약: 값은 십성 categoryCount 에서만 나오고(가짜 없음),
// 최강 축=100 상대 강도, 근거 0이면 null(레이더 안 그림).

import { describe, it, expect } from 'vitest'
import { buildSibsinRadar, dominantAxis } from '@/lib/report/sibsinRadar'
import type { SibsinCategoryCount } from '@/lib/saju/sibsinAnalysis'

const cc = (p: Partial<SibsinCategoryCount>): SibsinCategoryCount => ({
  비겁: 0,
  식상: 0,
  재성: 0,
  관성: 0,
  인성: 0,
  ...p,
})

describe('buildSibsinRadar', () => {
  it('null/전부 0 이면 null (가짜 레이더 안 그림)', () => {
    expect(buildSibsinRadar(null)).toBeNull()
    expect(buildSibsinRadar(undefined)).toBeNull()
    expect(buildSibsinRadar(cc({}))).toBeNull()
  })

  it('5축을 고정 순서(재물·명예·인복·재능·추진력)로 낸다', () => {
    const r = buildSibsinRadar(cc({ 재성: 2 }))!
    expect(r.map((a) => a.category)).toEqual(['재성', '관성', '인성', '식상', '비겁'])
    expect(r.map((a) => a.labelKo)).toEqual([
      '재물운',
      '명예·직장',
      '배움·인복',
      '재능·표현',
      '추진력·자립',
    ])
  })

  it('최강 축은 100, 나머지는 상대 강도', () => {
    const r = buildSibsinRadar(cc({ 재성: 4, 식상: 2, 관성: 1 }))!
    const jae = r.find((a) => a.category === '재성')!
    const sik = r.find((a) => a.category === '식상')!
    const gwan = r.find((a) => a.category === '관성')!
    expect(jae.value).toBe(100) // 최강
    expect(sik.value).toBe(50) // 2/4
    expect(gwan.value).toBe(25) // 1/4
  })

  it('0인 축은 바닥값(8)로 — 데이터(count)는 0 유지', () => {
    const r = buildSibsinRadar(cc({ 재성: 3 }))!
    const empty = r.find((a) => a.category === '비겁')!
    expect(empty.count).toBe(0) // 사실은 0
    expect(empty.value).toBe(8) // 시각 바닥
  })

  it('count 는 원본 개수를 그대로 — 정직성 근거', () => {
    const r = buildSibsinRadar(cc({ 재성: 3, 인성: 1 }))!
    expect(r.find((a) => a.category === '재성')!.count).toBe(3)
    expect(r.find((a) => a.category === '인성')!.count).toBe(1)
  })

  it('dominantAxis 는 개수 최다 축', () => {
    const r = buildSibsinRadar(cc({ 재성: 2, 식상: 5, 관성: 1 }))
    expect(dominantAxis(r)!.category).toBe('식상')
    expect(dominantAxis(null)).toBeNull()
  })
})

describe('buildSibsinRadar — 원국 글자(chars, A4)', () => {
  // 壬 일간: 丁丑 · 癸卯 · 壬戌 · 丁未 (샘플 1997-03-21 14:30).
  const P = (s: string, ss: string, b: string, bs: string) => ({
    heavenlyStem: { name: s, sibsin: ss },
    earthlyBranch: { name: b, sibsin: bs },
  })
  const pillars = {
    year: P('丁', '정재', '丑', '정관'),
    month: P('癸', '겁재', '卯', '상관'),
    day: P('壬', '비견', '戌', '편관'),
    time: P('丁', '정재', '未', '정관'),
  }

  it('묶음마다 글자 — 연 → 시, 일간 제외, 개수 = categoryCount', () => {
    const r = buildSibsinRadar(cc({ 재성: 2, 관성: 3, 식상: 1, 비겁: 1 }), pillars)!
    const by = Object.fromEntries(r.map((a) => [a.labelEn, a.chars]))
    expect(by.Wealth).toEqual([
      { ch: '丁', el: 'fire', pillar: 'year', part: 'stem' },
      { ch: '丁', el: 'fire', pillar: 'hour', part: 'stem' },
    ])
    expect(by.Status?.map((c) => c.ch)).toEqual(['丑', '戌', '未'])
    expect(by.Support).toEqual([])
    expect(by.Creativity?.map((c) => c.ch)).toEqual(['卯'])
    expect(by.Drive?.map((c) => `${c.ch}:${c.el}`)).toEqual(['癸:water'])
    for (const a of r) expect(a.chars?.length).toBe(a.count)
    expect(r.some((a) => a.estimated)).toBe(false)
  })

  it('시주 없음(시간 미상) → 시주 글자 빼고 estimated', () => {
    const { time: _t, ...three } = pillars
    const r = buildSibsinRadar(cc({ 재성: 1, 관성: 2, 식상: 1, 비겁: 1 }), three)!
    expect(r.flatMap((a) => a.chars ?? []).some((c) => c.pillar === 'hour')).toBe(false)
    expect(r.every((a) => a.estimated === true)).toBe(true)
  })

  it('기둥을 넘기지 않으면 chars 없음(예전 모양 그대로)', () => {
    const r = buildSibsinRadar(cc({ 재성: 1 }))!
    expect(r[0].chars).toBeUndefined()
    expect(r[0].estimated).toBeUndefined()
  })
})
