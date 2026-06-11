// 현재 운(세운·월운·일진) — 운 vs 본명 충/합 감지 회귀.
//
// computeCurrentUnse 의 핵심은 내부 detectUnseRelations: 운의 천간·지지가
// 본명 네 기둥과 이루는 천간충/천간합/지지충/지지육합 판정이다. 상담사
// 현재운 해석의 근거가 되는 함수인데 커버리지 20% 로 무방비였다.
// 고정 본명 + 고정 운 간지로 관계 4종을 모두 골든으로 잠근다.

import { describe, it, expect } from 'vitest'
import { computeCurrentUnse } from '@/lib/saju/currentUnse'
import type { CalculateSajuDataResult, PillarData } from '@/lib/saju/types'

function pillar(stem: string, branch: string): PillarData {
  return {
    heavenlyStem: { name: stem, element: '목', yin_yang: '양' },
    earthlyBranch: { name: branch, element: '수', yin_yang: '양' },
    jijanggan: {},
  }
}

// 본명: 년 壬子 / 월 甲寅 / 일 丙午 / 시 己亥 — 운 간지에 따라
// 충·합이 정확히 한두 기둥에서만 나오도록 고른 조합.
function makeRaw(
  annual: CalculateSajuDataResult['unse']['annual'],
  monthly: CalculateSajuDataResult['unse']['monthly']
): CalculateSajuDataResult {
  const pillars = {
    year: pillar('壬', '子'),
    month: pillar('甲', '寅'),
    day: pillar('丙', '午'),
    time: pillar('己', '亥'),
  }
  return {
    pillars,
    unse: { daeun: [], annual, monthly },
    dayMaster: { name: '丙', element: '화', yin_yang: '양' },
  } as unknown as CalculateSajuDataResult
}

const QUERY = new Date(2026, 5, 10) // 2026-06-10

describe('computeCurrentUnse — 세운 충/합 감지', () => {
  it('세운 丙午: 년주 壬子와 천간충(丙-壬) + 지지충(午-子)', () => {
    const raw = makeRaw([{ year: 2026, heavenlyStem: '丙', earthlyBranch: '午' }], [])
    const { seun, relations } = computeCurrentUnse(raw, QUERY)

    expect(seun).toEqual({ stem: '丙', branch: '午' })
    const fromSeun = relations.filter((r) => r.source === 'seun')
    expect(fromSeun.map((r) => `${r.relation.kind}:${r.relation.pillars[0]}`).sort()).toEqual([
      '지지충:year',
      '천간충:year',
    ])
  })

  it('세운 己丑: 월주 甲과 천간합(甲-己) + 년주 子와 지지육합(子-丑)', () => {
    const raw = makeRaw([{ year: 2026, heavenlyStem: '己', earthlyBranch: '丑' }], [])
    const { relations } = computeCurrentUnse(raw, QUERY)

    const fromSeun = relations.filter((r) => r.source === 'seun')
    const kinds = fromSeun.map((r) => `${r.relation.kind}:${r.relation.pillars[0]}`)
    expect(kinds).toContain('천간합:month')
    expect(kinds).toContain('지지육합:year')
    // 시주 己亥 의 己 와 운 己 — 동일 천간은 충도 합도 아니다.
    expect(kinds.filter((k) => k.endsWith(':time'))).toHaveLength(0)
  })

  it('관계없는 세운(戊戌 vs 본명)은 빈 관계 — 오탐 방지', () => {
    // 戊: 壬/甲/丙/己 와 충·합 조합 없음(戊-癸 합만 존재). 戌: 子/寅/午/亥 와
    // 충 없음… 단 卯-戌 합 제외 확인 — 본명에 卯 없음.
    const raw = makeRaw([{ year: 2026, heavenlyStem: '戊', earthlyBranch: '戌' }], [])
    const { relations } = computeCurrentUnse(raw, QUERY)
    expect(relations.filter((r) => r.source === 'seun')).toHaveLength(0)
  })
})

describe('computeCurrentUnse — 월운/일진/누락 처리', () => {
  it('월운은 ganji 문자열 분해 경로로도 동작한다', () => {
    const raw = makeRaw([], [{ year: 2026, month: 6, ganji: '己丑' }])
    const { wolun, relations } = computeCurrentUnse(raw, QUERY)

    expect(wolun).toEqual({ stem: '己', branch: '丑' })
    const fromWolun = relations.filter((r) => r.source === 'wolun')
    const kinds = fromWolun.map((r) => `${r.relation.kind}:${r.relation.pillars[0]}`)
    expect(kinds).toContain('천간합:month')
    expect(kinds).toContain('지지육합:year')
  })

  it('조회 연/월 데이터가 없으면 seun/wolun 은 null (throw 하지 않음)', () => {
    const raw = makeRaw(
      [{ year: 2020, heavenlyStem: '庚', earthlyBranch: '子' }],
      [{ year: 2020, month: 1, ganji: '丁丑' }]
    )
    const { seun, wolun } = computeCurrentUnse(raw, QUERY)
    expect(seun).toBeNull()
    expect(wolun).toBeNull()
  })

  it('일진은 실제 만세력 계산으로 항상 유효한 간지를 돌려준다', () => {
    const raw = makeRaw([], [])
    const { iljin } = computeCurrentUnse(raw, QUERY)
    expect(iljin).not.toBeNull()
    expect(iljin!.stem.length).toBeGreaterThan(0)
    expect(iljin!.branch.length).toBeGreaterThan(0)
    // 같은 날짜는 항상 같은 일진 — 결정론 확인.
    const again = computeCurrentUnse(raw, new Date(2026, 5, 10))
    expect(again.iljin).toEqual(iljin)
  })
})
