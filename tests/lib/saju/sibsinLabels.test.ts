// tests/lib/saju/sibsinLabels.test.ts — 십신 라벨 표: 영문(SIBSIN_EN)과 한자(SIBSIN_HANJA)가 같은 10키.

import { describe, it, expect } from 'vitest'
import { SIBSIN_EN, SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'

describe('SIBSIN_HANJA', () => {
  it('SIBSIN_EN 과 같은 10개 키', () => {
    expect(Object.keys(SIBSIN_HANJA).sort()).toEqual(Object.keys(SIBSIN_EN).sort())
    expect(Object.keys(SIBSIN_HANJA)).toHaveLength(10)
  })

  it('정본 한자', () => {
    expect(SIBSIN_HANJA).toEqual({
      비견: '比肩',
      겁재: '劫財',
      식신: '食神',
      상관: '傷官',
      편재: '偏財',
      정재: '正財',
      편관: '偏官',
      정관: '正官',
      편인: '偏印',
      정인: '正印',
    })
  })
})
