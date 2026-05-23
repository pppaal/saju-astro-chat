import { describe, it, expect } from 'vitest'
import { getGrade, computeGradeThresholds } from '@/components/calendar/scoreGrade'

describe('scoreGrade — 우리 용어 라벨 + 상대 등급', () => {
  it('uses friendly Korean labels (no 길/평/흉 한자 jargon)', () => {
    const hi = getGrade(90, { luckyMin: 60, unluckyMax: 40 })
    const mid = getGrade(50, { luckyMin: 60, unluckyMax: 40 })
    const lo = getGrade(20, { luckyMin: 60, unluckyMax: 40 })
    expect(hi.label).toBe('좋은 날')
    expect(mid.label).toBe('보통')
    expect(lo.label).toBe('조심할 날')
    // 옛 한자 라벨이 남아있지 않아야
    for (const g of [hi, mid, lo]) {
      expect(['길', '평', '흉']).not.toContain(g.label)
    }
  })

  it('grade is relative to the user distribution (percentile thresholds)', () => {
    // 0..100 균등 분포 → 상위 20% cutoff ≈ 80, 하위 20% ≈ 20
    const scores = Array.from({ length: 100 }, (_, i) => i)
    const th = computeGradeThresholds(scores)
    expect(th.luckyMin).toBeGreaterThan(th.unluckyMax)
    // 같은 절대 점수라도 분포가 바뀌면 등급이 달라질 수 있음 (상대성)
    const lowDist = computeGradeThresholds(Array.from({ length: 100 }, () => 30))
    const highDist = computeGradeThresholds(Array.from({ length: 100 }, (_, i) => 50 + (i % 50)))
    // 분포별 임계값이 서로 다름
    expect(lowDist.luckyMin).not.toBe(highDist.luckyMin)
  })

  it('falls back gracefully with too few data points', () => {
    const th = computeGradeThresholds([50, 50])
    expect(typeof th.luckyMin).toBe('number')
    expect(typeof th.unluckyMax).toBe('number')
  })
})
