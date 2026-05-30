import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { scoreToGrade } from '@/lib/calendar-engine/derivers/grade'
import { themeScoresToCategories } from '@/lib/calendar-engine/derivers/categories'

describe('scoreToGrade (v2 deriver)', () => {
  it('matches the calibrated thresholds', () => {
    expect(scoreToGrade(70)).toBe(0)
    expect(scoreToGrade(63)).toBe(0)
    expect(scoreToGrade(62)).toBe(1)
    expect(scoreToGrade(57)).toBe(1)
    expect(scoreToGrade(56)).toBe(2)
    expect(scoreToGrade(44)).toBe(2)
    expect(scoreToGrade(43)).toBe(3)
    expect(scoreToGrade(34)).toBe(3)
    expect(scoreToGrade(33)).toBe(4)
    expect(scoreToGrade(0)).toBe(4)
  })

  // 단계 0 골든이 있으면, grade === scoreToGrade(displayScore) 가 전 날짜·전 프로필
  // 에서 성립함을 재확인 — 어댑터가 등급을 정확 재현할 수 있다는 보증.
  it('reproduces every grade in the migration golden from displayScore', () => {
    const goldenPath = join(
      __dirname,
      '../../../app/api/calendar/__golden__/migration-baseline.json'
    )
    if (!existsSync(goldenPath)) return // 골든 미생성 환경에선 skip
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as Record<
      string,
      { dates: Record<string, [number, number, number, number, string]> }
    >
    let total = 0
    for (const profile of Object.values(golden)) {
      for (const [grade, displayScore] of Object.values(profile.dates)) {
        expect(scoreToGrade(displayScore)).toBe(grade)
        total++
      }
    }
    expect(total).toBeGreaterThan(1000) // 3 프로필 × 365
  })
})

describe('themeScoresToCategories (v2 deriver)', () => {
  it('always includes the single strongest theme', () => {
    expect(themeScoresToCategories({ love: 80, money: 20, career: 10 })).toEqual(['love'])
  })

  it('includes near-tied leaders within the gap, above the floor', () => {
    // career 72 / money 68 (gap 4, both ≥50) → 둘 다
    expect(themeScoresToCategories({ career: 72, money: 68, love: 30 })).toEqual(['career', 'money'])
  })

  it('drops weak themes even if within gap when below floor', () => {
    // career 48 top, money 45 — gap 3 이지만 둘 다 floor(50) 미만 → top 만
    expect(themeScoresToCategories({ career: 48, money: 45 })).toEqual(['career'])
  })

  it('caps at MAX_CATEGORIES and returns a subset of the 5 themes', () => {
    const cats = themeScoresToCategories({
      career: 90,
      money: 88,
      love: 85,
      health: 84,
      growth: 83,
    })
    expect(cats.length).toBeLessThanOrEqual(3)
    for (const c of cats) expect(['love', 'money', 'career', 'health', 'growth']).toContain(c)
  })

  it('is deterministic and stable on ties', () => {
    const a = themeScoresToCategories({ career: 60, money: 60, love: 60 })
    const b = themeScoresToCategories({ love: 60, money: 60, career: 60 })
    expect(a).toEqual(b) // 입력 순서 무관
  })

  it('returns empty for all-zero themes', () => {
    expect(themeScoresToCategories({})).toEqual([])
    expect(themeScoresToCategories({ love: 0, money: 0 })).toEqual([])
  })
})
