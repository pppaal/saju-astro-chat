// tests/lib/saju/hyeongchung.test.ts
//
// analyzeHyeongchung/calculateInteractionScore/analyzeUnseInteraction —
// 지지 육합 작용 분석·상호작용 점수·밸런스 라벨을 커버(결정적).

import { describe, it, expect } from 'vitest'
import {
  analyzeHyeongchung,
  calculateInteractionScore,
  analyzeUnseInteraction,
} from '@/lib/saju/hyeongchung'

const pillars = (year: string, month: string, day: string, hour?: string) => ({
  year: { stem: '甲', branch: year },
  month: { stem: '丙', branch: month },
  day: { stem: '戊', branch: day },
  ...(hour ? { hour: { stem: '庚', branch: hour } } : {}),
})

describe('analyzeHyeongchung', () => {
  it('분석 결과는 interactions·summary·warnings 형태', () => {
    const r = analyzeHyeongchung(pillars('子', '丑', '午', '未') as never) // 子丑·午未 육합
    expect(Array.isArray(r.interactions)).toBe(true)
    expect(r.summary).toHaveProperty('netEffect')
    expect(Array.isArray(r.warnings)).toBe(true)
  })

  it('hour 없이도 동작(3주)', () => {
    const r = analyzeHyeongchung(pillars('寅', '卯', '辰') as never)
    expect(r.summary).toHaveProperty('totalPositive')
  })
})

describe('calculateInteractionScore', () => {
  it('밸런스 라벨은 overall 부호/크기로 결정', () => {
    const mk = (pos: number, neg: number) =>
      calculateInteractionScore({
        interactions: [],
        summary: {
          totalPositive: pos,
          totalNegative: neg,
          dominantInteraction: null,
          netEffect: '중립',
        },
        warnings: [],
      } as never)
    expect(mk(30, 0).balance).toBe('매우 길함')
    expect(mk(10, 0).balance).toBe('길함')
    expect(mk(0, 0).balance).toBe('중립')
    expect(mk(0, 10).balance).toBe('흉함')
    expect(mk(0, 30).balance).toBe('매우 흉함')
    expect(mk(5, 2).overall).toBe(3)
  })
})

describe('analyzeUnseInteraction', () => {
  it('배열을 반환(현재 간략 구현)', () => {
    expect(Array.isArray(analyzeUnseInteraction(['子'], ['丑']))).toBe(true)
  })
})
