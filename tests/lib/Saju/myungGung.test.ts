// tests/lib/saju/myungGung.test.ts
import { describe, it, expect } from 'vitest'
import { computeMyungGung } from '@/lib/saju/myungGung'

describe('computeMyungGung — 명궁 계산', () => {
  it('월=寅, 시=寅 → 합 6, 14-6=8 → 未', () => {
    // 寅=3, 寅=3, sum=6, 14-6=8 → 未(8)
    expect(computeMyungGung('寅', '寅')).toEqual({
      branch: '未',
      index: 8,
      branchKo: '미',
    })
  })

  it('월=卯, 시=辰 → 합 9, 14-9=5 → 辰', () => {
    // 卯=4, 辰=5, sum=9, 14-9=5 → 辰(5)
    expect(computeMyungGung('卯', '辰')).toEqual({
      branch: '辰',
      index: 5,
      branchKo: '진',
    })
  })

  it('합이 14 초과 시 26-합 분기 — 월=亥, 시=亥 (12+12=24, 26-24=2 → 丑)', () => {
    expect(computeMyungGung('亥', '亥')).toEqual({
      branch: '丑',
      index: 2,
      branchKo: '축',
    })
  })

  it('합 = 14 경계 — 월=子, 시=丑 (1+2=3 안 됨) 다시: 월=未, 시=未 (8+8=16, 26-16=10 → 酉)', () => {
    expect(computeMyungGung('未', '未')).toEqual({
      branch: '酉',
      index: 10,
      branchKo: '유',
    })
  })

  it('월=子, 시=子 → 합 2, 14-2=12 → 亥', () => {
    expect(computeMyungGung('子', '子')).toEqual({
      branch: '亥',
      index: 12,
      branchKo: '해',
    })
  })

  it('잘못된 입력 → null', () => {
    expect(computeMyungGung(undefined, '子')).toBeNull()
    expect(computeMyungGung('卯', undefined)).toBeNull()
    expect(computeMyungGung('XX', '子')).toBeNull()
    expect(computeMyungGung('子', 'YY')).toBeNull()
  })

  it('결과 지지가 항상 12지지 중 하나', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    for (const m of branches) {
      for (const h of branches) {
        const r = computeMyungGung(m, h)
        expect(r).not.toBeNull()
        expect(branches).toContain(r!.branch)
        expect(r!.index).toBeGreaterThanOrEqual(1)
        expect(r!.index).toBeLessThanOrEqual(12)
      }
    }
  })
})
