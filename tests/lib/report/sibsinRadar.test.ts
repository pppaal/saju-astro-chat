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
