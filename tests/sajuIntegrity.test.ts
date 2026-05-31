import {
  STEMS,
  BRANCHES,
  KASI_START_YEAR,
  KASI_END_YEAR,
  KASI_SOLAR_TERMS,
  MONTH_STEM_LOOKUP,
  TIME_STEM_LOOKUP,
  JIJANGGAN,
} from '@/lib/saju/constants'
import { getSupportedTimezones, getOffsetMinutes, formatOffset } from '@/lib/saju/timezone'
import { STEM_LABELS, BRANCH_LABELS } from '@/lib/saju/constants'

describe('Saju constants', () => {
  it('has 10 stems and 12 branches with unique names', () => {
    expect(STEMS).toHaveLength(10)
    expect(BRANCHES).toHaveLength(12)

    const stemNames = new Set(STEMS.map((s) => s.name))
    const branchNames = new Set(BRANCHES.map((b) => b.name))
    expect(stemNames.size).toBe(10)
    expect(branchNames.size).toBe(12)
  })

  it('has solar terms covering start to end year with 12 months each', () => {
    // 입력 검증 범위(1940-2050) 모든 연도가 12개씩 있어야 함.
    for (let y = KASI_START_YEAR; y <= KASI_END_YEAR; y++) {
      const yearData = KASI_SOLAR_TERMS[y]
      expect(yearData, `Missing solar terms for year ${y}`).toBeDefined()
      expect(Object.keys(yearData), `Year ${y} should have 12 terms`).toHaveLength(12)
    }
    // 경계 大運 lookup 보강용 1939/2051 도 (선택적으로) 있다면 12개씩.
    for (const y of [KASI_START_YEAR - 1, KASI_END_YEAR + 1]) {
      const yearData = KASI_SOLAR_TERMS[y]
      if (yearData) expect(Object.keys(yearData)).toHaveLength(12)
    }
  })

  it('month/hour stem lookups cover 10 stems', () => {
    expect(Object.keys(MONTH_STEM_LOOKUP)).toHaveLength(10)
    expect(Object.keys(TIME_STEM_LOOKUP)).toHaveLength(10)
  })

  it('jijanggan maps 12 branches with correct stem entries', () => {
    expect(Object.keys(JIJANGGAN)).toHaveLength(12)
    // 子, 卯, 酉(왕지): 정기만 (1개)
    // 나머지(午·亥 포함): 여기·중기·정기 3개
    const expectedCounts: Record<string, number> = {
      子: 1,
      卯: 1,
      酉: 1,
      午: 3,
      亥: 3,
      丑: 3,
      寅: 3,
      辰: 3,
      巳: 3,
      未: 3,
      申: 3,
      戌: 3,
    }
    for (const [branch, val] of Object.entries(JIJANGGAN)) {
      expect(Object.keys(val)).toHaveLength(expectedCounts[branch])
      expect(val['정기']).toBeDefined() // 정기는 항상 존재
    }
  })

  it('has labels for all stems and branches', () => {
    const stemNames = STEMS.map((s) => s.name)
    const branchNames = BRANCHES.map((b) => b.name)
    expect(Object.keys(STEM_LABELS)).toHaveLength(stemNames.length)
    expect(Object.keys(BRANCH_LABELS)).toHaveLength(branchNames.length)
    stemNames.forEach((n) => expect(STEM_LABELS[n]).toBeDefined())
    branchNames.forEach((n) => expect(BRANCH_LABELS[n]).toBeDefined())
  })
})

describe('Saju timezone helpers', () => {
  it('returns a non-empty supported timezone list', () => {
    const tzs = getSupportedTimezones()
    expect(Array.isArray(tzs)).toBe(true)
    expect(tzs.length).toBeGreaterThan(0)
  })

  it('computes offsets for UTC and Seoul', () => {
    const instant = new Date(Date.UTC(2020, 0, 1, 0, 0, 0))
    expect(getOffsetMinutes(instant, 'UTC')).toBe(0)
    const seoul = getOffsetMinutes(instant, 'Asia/Seoul')
    // KST should be UTC+09:00 (540 minutes)
    expect(seoul).toBe(540)
  })

  it('formats offsets correctly', () => {
    expect(formatOffset(0)).toBe('UTC+00:00')
    expect(formatOffset(540)).toBe('UTC+09:00')
    expect(formatOffset(-300)).toBe('UTC-05:00')
  })
})
