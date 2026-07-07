// tests/lib/compatibility/freeCompatShareCopy.test.ts
//
// freeCompatShareCopy + shareGrade — 공유카드 자극적 카피(등급·펀치·강조)를
// 점수·톤으로 결정적 선택. 톤별 등급 래더(일반 SHARE_GRADE vs neutral 전용
// SHARE_GRADE_CALM)와 점수 밴드 경계를 커버.

import { describe, it, expect } from 'vitest'
import { freeCompatShareCopy } from '@/lib/compatibility/freeReport/buildNarrative'
import type { CompatReport } from '@/lib/compatibility/compatReport'

// coupleSeed 는 null 필드를 방어하므로 최소 리포트로 충분(결정적 선택만 확인).
const minimalReport = (): CompatReport =>
  ({
    synView: null,
    dayMaster: null,
    spouseStars: [],
    pillarRelations: [],
    branchCombos: [],
    band: { synastry_harmonic: 70, synastry_tension: 30, eastern_hap: 60, eastern_chung: 80 },
  }) as unknown as CompatReport

const TONES = ['aligned', 'mixed', 'tension', 'neutral'] as const

describe('freeCompatShareCopy', () => {
  it('모든 톤 × 점수에서 grade·punch 를 비어있지 않게 반환', () => {
    for (const tone of TONES) {
      for (const score of [90, 82, 74, 66, 58, 40]) {
        const c = freeCompatShareCopy(minimalReport(), 'ko', score, tone)
        expect(c.grade.length).toBeGreaterThan(0)
        expect(c.punch.length).toBeGreaterThan(0)
        expect(typeof c.accent).toBe('string')
      }
    }
  })

  it('일반 톤(aligned)은 점수 밴드별로 등급이 갈린다', () => {
    const grades = [90, 82, 74, 66, 58, 40].map(
      (s) => freeCompatShareCopy(minimalReport(), 'ko', s, 'aligned').grade
    )
    // 6개 밴드 → 서로 다른 등급 6종
    expect(new Set(grades).size).toBe(6)
  })

  it('neutral 톤은 잔잔한 전용 래더(CALM)를 써 일반 톤과 등급이 다르다', () => {
    const calm = freeCompatShareCopy(minimalReport(), 'ko', 82, 'neutral').grade
    const hot = freeCompatShareCopy(minimalReport(), 'ko', 82, 'aligned').grade
    expect(calm).not.toBe(hot)
    // CALM 최상단은 "불꽃/위험" 언어가 아님
    expect(calm).not.toMatch(/위험|불꽃/)
  })

  it('영문도 grade·punch 반환', () => {
    const c = freeCompatShareCopy(minimalReport(), 'en', 74, 'tension')
    expect(c.grade.length).toBeGreaterThan(0)
    expect(c.punch.length).toBeGreaterThan(0)
  })

  it('결정적 — 같은 (리포트,톤,점수)면 같은 결과', () => {
    const a = freeCompatShareCopy(minimalReport(), 'ko', 74, 'mixed')
    const b = freeCompatShareCopy(minimalReport(), 'ko', 74, 'mixed')
    expect(a).toEqual(b)
  })
})
