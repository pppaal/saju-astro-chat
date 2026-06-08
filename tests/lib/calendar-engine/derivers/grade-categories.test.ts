import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { scoreToGrade } from '@/lib/calendar-engine/derivers/grade'

describe('scoreToGrade (v2 deriver)', () => {
  it('matches the calibrated thresholds (74/64/46/33)', () => {
    expect(scoreToGrade(74)).toBe(0)
    expect(scoreToGrade(73)).toBe(1)
    expect(scoreToGrade(64)).toBe(1)
    expect(scoreToGrade(63)).toBe(2)
    expect(scoreToGrade(46)).toBe(2)
    expect(scoreToGrade(45)).toBe(3)
    expect(scoreToGrade(33)).toBe(3)
    expect(scoreToGrade(32)).toBe(4)
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
