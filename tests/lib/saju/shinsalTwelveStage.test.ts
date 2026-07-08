// tests/lib/saju/shinsalTwelveStage.test.ts
//
// 십이운성(getTwelveStage/…ForPillars)·공망(getGongmang) — 결정적 사주 엔진.
// 유효 입력 → 유효 단계, 미상 간지 → '묘' 폴백, 기둥 전체 매핑을 커버.

import { describe, it, expect } from 'vitest'
import { getTwelveStage, getTwelveStagesForPillars, getGongmang } from '@/lib/saju/shinsal'

// TwelveStage(별칭 포함) — 임관=건록, 왕지=제왕.
const STAGES = [
  '장생',
  '목욕',
  '관대',
  '임관',
  '왕지',
  '쇠',
  '병',
  '사',
  '묘',
  '절',
  '태',
  '양',
  '건록',
  '제왕',
]

describe('getTwelveStage', () => {
  it('유효 일간·지지 → 십이운성 하나', () => {
    expect(STAGES).toContain(getTwelveStage('甲', '子'))
    expect(STAGES).toContain(getTwelveStage('乙', '午')) // 음간 역행 경로
  })

  it('미상 일간/지지 → 묘 폴백', () => {
    expect(getTwelveStage('??', '子')).toBe('묘')
    expect(getTwelveStage('甲', '??')).toBe('묘')
  })
})

describe('getTwelveStagesForPillars', () => {
  it('네 기둥 모두 매핑', () => {
    const p = {
      year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
      month: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
      day: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '午' } },
      time: { heavenlyStem: { name: '戊' }, earthlyBranch: { name: '酉' } },
    } as never
    const out = getTwelveStagesForPillars(p)
    expect(Object.keys(out).sort()).toEqual(['day', 'month', 'time', 'year'])
    for (const v of Object.values(out)) expect(STAGES).toContain(v)
  })
})

describe('getGongmang', () => {
  it('일주(일간+일지)로 공망 지지 배열 반환', () => {
    const g = getGongmang('甲', '子')
    expect(Array.isArray(g)).toBe(true)
  })
})
