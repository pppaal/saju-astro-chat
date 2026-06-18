/**
 * 배우자성 성별 도식 — 남성 일간은 재성(정재/편재), 여성 일간은 관성(정관/편관).
 * 성별 미상이면 둘 다 보는 superset 으로 폴백한다. A 일간 丙(화) 기준으로 B 에
 * 금(재성)·수(관성) 천간을 모두 깔아, 성별로 어떤 것만 잡히는지 잠근다.
 */
import { describe, it, expect } from 'vitest'
import { buildCompatReport } from '@/lib/compatibility/compatReport'

const pillars = (p: string[]) => p.map((s) => ({ stem: s[0], branch: s[1] }))

// 천간은 사주 엔진과 동일하게 한자(甲乙丙…). A 일간 = 丙(화).
// 丙 기준: 금=재성(庚辛), 수=관성(壬癸).
const pillarsA = pillars(['甲子', '乙丑', '丙寅', '丁卯'])
// B 에 금(庚·辛)과 수(壬·癸) 천간을 모두 둔다 → 재성·관성 후보가 둘 다 존재.
const pillarsB = pillars(['庚子', '辛丑', '壬寅', '癸卯'])

const JAE = new Set(['정재', '편재'])
const GWAN = new Set(['정관', '편관'])

const aSpouseSibsins = (gender?: 'male' | 'female' | null) => {
  const r = buildCompatReport({ astroA: null, astroB: null, pillarsA, pillarsB, genderA: gender })
  return r.spouseStars.filter((s) => s.from === 'A').map((s) => s.sibsin)
}

describe('compatReport — 배우자성 성별 도식', () => {
  it('남성 일간: 재성(정재/편재)만 배우자성으로 잡힌다', () => {
    const sibsins = aSpouseSibsins('male')
    expect(sibsins.length).toBeGreaterThan(0)
    expect(sibsins.every((s) => JAE.has(s))).toBe(true)
    expect(sibsins.some((s) => GWAN.has(s))).toBe(false)
  })

  it('여성 일간: 관성(정관/편관)만 배우자성으로 잡힌다', () => {
    const sibsins = aSpouseSibsins('female')
    expect(sibsins.length).toBeGreaterThan(0)
    expect(sibsins.every((s) => GWAN.has(s))).toBe(true)
    expect(sibsins.some((s) => JAE.has(s))).toBe(false)
  })

  it('성별 미상: 재성·관성 둘 다 보는 superset 으로 폴백', () => {
    const sibsins = aSpouseSibsins(undefined)
    expect(sibsins.some((s) => JAE.has(s))).toBe(true)
    expect(sibsins.some((s) => GWAN.has(s))).toBe(true)
  })
})
