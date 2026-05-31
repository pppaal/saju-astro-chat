import { describe, it, expect } from 'vitest'
import { getGrade, computeGradeThresholds } from '@/components/calendar/scoreGrade'

describe('scoreGrade — 우리 용어 라벨 + 절대 cutoff', () => {
  it('uses friendly Korean labels (no 길/평/흉 한자 jargon)', () => {
    const hi = getGrade(90)
    const mid = getGrade(50)
    const lo = getGrade(20)
    expect(hi.label).toBe('좋은 날')
    expect(mid.label).toBe('보통')
    expect(lo.label).toBe('조심할 날')
    // 옛 한자 라벨이 남아있지 않아야
    for (const g of [hi, mid, lo]) {
      expect(['길', '평', '흉']).not.toContain(g.label)
    }
  })

  it('grade uses absolute cutoffs aligned with 엔진 scoreToGrade', () => {
    // narrative grade와 같은 cutoff(64/45)라 같은 점수가 yearly/daily 어디서나 같은 라벨.
    // 분포 percentile 기반은 같은 점수가 분포에 따라 다른 라벨이라 카드 안 모순이 났다.
    expect(getGrade(64).key).toBe('lucky')
    expect(getGrade(63).key).toBe('neutral')
    expect(getGrade(46).key).toBe('neutral')
    expect(getGrade(45).key).toBe('unlucky')
    // computeGradeThresholds는 deprecated 하위호환 shim — 항상 같은 절대 cutoff 반환.
    const lowDist = computeGradeThresholds(Array.from({ length: 100 }, () => 30))
    const highDist = computeGradeThresholds(Array.from({ length: 100 }, (_, i) => 50 + (i % 50)))
    expect(lowDist.luckyMin).toBe(highDist.luckyMin)
    expect(lowDist.luckyMin).toBe(64)
    expect(lowDist.unluckyMax).toBe(45)
  })

  it('computeGradeThresholds shim returns absolute cutoffs even with empty input', () => {
    const th = computeGradeThresholds([])
    expect(th.luckyMin).toBe(64)
    expect(th.unluckyMax).toBe(45)
  })
})
