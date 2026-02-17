import { describe, expect, it } from 'vitest'
import {
  calculatePeriodScore,
  calculateThemeScore,
} from '@/lib/destiny-matrix/ai-report/scoreCalculators'

describe('Destiny matrix AI report score determinism', () => {
  const timingData = {
    daeun: {
      heavenlyStem: '甲',
      earthlyBranch: '子',
      element: '목',
      startAge: 24,
      endAge: 33,
      isCurrent: true,
    },
    seun: {
      year: 2026,
      heavenlyStem: '丙',
      earthlyBranch: '午',
      element: '화',
    },
    wolun: {
      month: 3,
      heavenlyStem: '庚',
      earthlyBranch: '寅',
      element: '목',
    },
    iljin: {
      date: '2026-03-14',
      heavenlyStem: '辛',
      earthlyBranch: '未',
      element: '토',
    },
  } as const

  it('returns identical period scores for identical inputs', () => {
    const a = calculatePeriodScore(timingData, '목')
    const b = calculatePeriodScore(timingData, '목')
    expect(a).toEqual(b)
  })

  it('changes period scores when timing seed changes', () => {
    const a = calculatePeriodScore(timingData, '목')
    const b = calculatePeriodScore(
      {
        ...timingData,
        seun: { ...timingData.seun, year: 2027 },
      },
      '목'
    )
    expect(a).not.toEqual(b)
  })

  it('keeps all period score fields within 0..100', () => {
    const score = calculatePeriodScore(timingData, '목')
    for (const value of Object.values(score)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  it('returns identical theme scores for identical inputs', () => {
    const dist = { 비견: 3, 정관: 2, 정재: 1 }
    const a = calculateThemeScore('career', dist)
    const b = calculateThemeScore('career', dist)
    expect(a).toEqual(b)
  })

  it('changes theme scores when sibsin distribution changes', () => {
    const a = calculateThemeScore('wealth', { 정재: 3, 편재: 2 })
    const b = calculateThemeScore('wealth', { 정재: 1, 편재: 0 })
    expect(a).not.toEqual(b)
  })
})
