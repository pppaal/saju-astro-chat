/**
 * 세운(年運)은 1/1 이 아니라 입춘(立春)에 바뀐다.
 *
 * 회귀: calculateSajuData 의 unse.annual base 가 그레고리력 연도(yNowLocal)였다.
 * 1/1 ~ 입춘(~2/4) 구간 사용자에게 세운이 한 해 앞당겨져 뜨던 결함(생일차트·
 * currentUnse 의 입춘-aware convention 과 어긋남). base 를 getSajuYearForDate 로
 * 잡아 바로잡는다. annualStemBranch 와 getYearPillarForDate 는 동일 (year-4)%60
 * 공식이라 라벨(year)과 간지(ganji)가 항상 일치한다.
 */
import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

type AnnualRow = { year: number; ganji: string; heavenlyStem: string; earthlyBranch: string }

function firstAnnual(now: Date): AnnualRow {
  const r = calculateSajuData(
    '1990-05-20',
    '07:30',
    'male',
    'solar',
    'Asia/Seoul',
    undefined,
    undefined,
    now
  ) as unknown as { unse: { annual: AnnualRow[] } }
  return r.unse.annual[0]
}

describe('unse.annual — 입춘 기준 세운', () => {
  it('입춘 이전(1/15)은 직전 사주연도 세운 (2026/1 → 2025 乙巳)', () => {
    // 2026 입춘은 ~2/4. 1/15 KST 는 아직 입춘 전 → 사주연도 2025.
    const now = new Date(Date.UTC(2026, 0, 15, 3, 0, 0)) // 2026-01-15 12:00 KST
    const a = firstAnnual(now)
    expect(a.year).toBe(2025)
    expect(a.ganji).toBe('乙巳')
  })

  it('입춘 이후(6월)는 그 해 사주연도 세운 (2026 丙午)', () => {
    const now = new Date(Date.UTC(2026, 5, 15, 3, 0, 0)) // 2026-06-15 KST
    const a = firstAnnual(now)
    expect(a.year).toBe(2026)
    expect(a.ganji).toBe('丙午')
  })

  it('라벨(year)과 간지(ganji)는 항상 일치한다 (입춘 경계에서도)', () => {
    // 입춘 직전/직후 모두 year 와 ganji 가 어긋나지 않아야 한다.
    for (const now of [
      new Date(Date.UTC(2026, 0, 15, 3, 0, 0)),
      new Date(Date.UTC(2026, 5, 15, 3, 0, 0)),
    ]) {
      const a = firstAnnual(now)
      const idx60 = (a.year - 4 + 6000) % 60
      const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
      const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
      expect(a.ganji).toBe(`${STEMS[idx60 % 10]}${BRANCHES[idx60 % 12]}`)
    }
  })
})
