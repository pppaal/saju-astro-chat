import { describe, it, expect } from 'vitest'
import { performAnalyses, type SimplePillars, type PillarsWithHour } from '@/lib/saju/analyses'

// Real (deterministic) engine functions are exercised — no mocks needed.
const simplePillars: SimplePillars = {
  year: { stem: '甲', branch: '寅' },
  month: { stem: '丙', branch: '午' },
  day: { stem: '戊', branch: '辰' },
  time: { stem: '庚', branch: '申' },
  hour: { stem: '庚', branch: '申' },
}

const pillarsWithHour: PillarsWithHour = {
  year: { stem: '甲', branch: '寅' },
  month: { stem: '丙', branch: '午' },
  day: { stem: '戊', branch: '辰' },
  hour: { stem: '庚', branch: '申' },
}

describe('performAnalyses', () => {
  it('모든 분석 슬롯을 채운다 (정상 입력)', () => {
    const result = performAnalyses(simplePillars, pillarsWithHour, '戊', '午')

    expect(result).toBeTruthy()
    // All analyses should succeed for valid pillars
    expect(result.geokguk).not.toBeNull()
    expect(result.yongsin).not.toBeNull()
    expect(result.hyeongchung).not.toBeNull()
    expect(result.tonggeun).not.toBeNull()
    expect(result.deukryeong).not.toBeNull()
    expect(result.sibsin).not.toBeNull()
  })

  it('yongsin 결과에 description/lucky 정보가 부착된다', () => {
    const result = performAnalyses(simplePillars, pillarsWithHour, '戊', '午')
    const y = result.yongsin!
    expect(typeof y.description).toBe('string')
    expect(Array.isArray(y.luckyColors)).toBe(true)
    expect(typeof y.luckyDirection).toBe('string')
    expect(Array.isArray(y.luckyNumbers)).toBe(true)
    expect(y.primaryYongsin).toBeTruthy()
  })

  it('deukryeong은 일간과 월지를 반영한다', () => {
    const result = performAnalyses(simplePillars, pillarsWithHour, '戊', '午')
    const d = result.deukryeong!
    // calculateDeukryeong returns an object describing month-branch support
    expect(d).toBeTruthy()
    expect(typeof d).toBe('object')
  })

  it('결과 객체는 항상 6개의 키를 가진다', () => {
    const result = performAnalyses(simplePillars, pillarsWithHour, '戊', '午')
    expect(Object.keys(result).sort()).toEqual(
      ['deukryeong', 'geokguk', 'hyeongchung', 'sibsin', 'tonggeun', 'yongsin'].sort()
    )
  })

  it('다른 사주 입력도 처리한다', () => {
    const sp: SimplePillars = {
      year: { stem: '癸', branch: '亥' },
      month: { stem: '乙', branch: '卯' },
      day: { stem: '辛', branch: '酉' },
      time: { stem: '己', branch: '丑' },
      hour: { stem: '己', branch: '丑' },
    }
    const pwh: PillarsWithHour = {
      year: sp.year,
      month: sp.month,
      day: sp.day,
      hour: sp.hour,
    }
    const result = performAnalyses(sp, pwh, '辛', '卯')
    expect(result.geokguk).not.toBeNull()
    expect(result.yongsin).not.toBeNull()
    expect(result.tonggeun).not.toBeNull()
  })

  it('잘못된 일간/월지여도 throw하지 않고 부분 결과 반환', () => {
    // Engine functions are defensive; invalid stems should not crash performAnalyses
    expect(() => performAnalyses(simplePillars, pillarsWithHour, '???', '???')).not.toThrow()
    const result = performAnalyses(simplePillars, pillarsWithHour, '???', '???')
    // geokguk/yongsin/hyeongchung/sibsin don't depend on the dayMaster arg
    expect(result.geokguk).not.toBeNull()
  })
})
