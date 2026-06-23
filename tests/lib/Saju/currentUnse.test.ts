// 현재 운(세운·월운·일진) — 운 vs 본명 충/합 감지 회귀.
//
// computeCurrentUnse 의 핵심은 내부 detectUnseRelations: 운의 천간·지지가
// 본명 네 기둥과 이루는 천간충/천간합/지지충/지지육합 판정이다. 상담사
// 현재운 해석의 근거가 되는 함수인데 커버리지 20% 로 무방비였다.
// 고정 본명 + 고정 운 간지로 관계 4종을 모두 골든으로 잠근다.

import { describe, it, expect } from 'vitest'
import { computeCurrentUnse, detectUnseRelations } from '@/lib/saju/currentUnse'
import { getMonthPillarForDate, getYearPillarForDate } from '@/lib/saju/datePillars'
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
// 본명 4기둥(壬子/甲寅/丙午/己亥) — 운 간지 vs 본명 충/합 단언용.
const NATAL = makeRaw([], []).pillars

describe('detectUnseRelations — 운 간지 vs 본명 충/합', () => {
  // 세운/월운/일진 공통 충·합 판정. 직전엔 raw.unse.annual 에 합성 간지를 주입해
  // pickSeun 경유로 테스트했지만, 이제 세운은 절기로 직접 산출하므로(주입 불가)
  // 판정 함수를 직접 단언한다 — 커버리지(천간충/지지충/천간합/지지육합/없음) 동일.
  it('丙午: 년주 壬子와 천간충(丙-壬) + 지지충(午-子)', () => {
    const rels = detectUnseRelations(NATAL, '丙', '午')
    expect(rels.map((r) => `${r.kind}:${r.pillars[0]}`).sort()).toEqual([
      '지지충:year',
      '천간충:year',
    ])
  })

  it('己丑: 월주 甲과 천간합(甲-己) + 년주 子와 지지육합(子-丑)', () => {
    const kinds = detectUnseRelations(NATAL, '己', '丑').map((r) => `${r.kind}:${r.pillars[0]}`)
    expect(kinds).toContain('천간합:month')
    expect(kinds).toContain('지지육합:year')
    // 시주 己亥 의 己 와 운 己 — 동일 천간은 충도 합도 아니다.
    expect(kinds.filter((k) => k.endsWith(':time'))).toHaveLength(0)
  })

  it('관계없는 운(戊戌 vs 본명)은 빈 관계 — 오탐 방지', () => {
    expect(detectUnseRelations(NATAL, '戊', '戌')).toHaveLength(0)
  })
})

describe('computeCurrentUnse — 세운 입춘 경계', () => {
  it('세운은 1/1 이 아니라 입춘에 바뀐다(절기 기준)', () => {
    const raw = makeRaw([], [])
    // 입춘 후(6/10) → 그 해 2026 丙午.
    const afterIpchun = computeCurrentUnse(raw, new Date(2026, 5, 10)).seun
    expect(afterIpchun).toEqual(getYearPillarForDate(new Date(2026, 5, 10)))
    expect(afterIpchun).toEqual({ stem: '丙', branch: '午' })
    // 입춘 전(1/15) → 직전 해 2025 乙巳. getFullYear()(1/1 경계)였다면 잘못된
    // 丙午 가 떴을 구간.
    const beforeIpchun = computeCurrentUnse(raw, new Date(2026, 0, 15)).seun
    expect(beforeIpchun).toEqual(getYearPillarForDate(new Date(2026, 0, 15)))
    expect(beforeIpchun).toEqual({ stem: '乙', branch: '巳' })
  })
})

describe('computeCurrentUnse — 월운/일진/누락 처리', () => {
  it('월운은 절기 기준 현재 사주월(getMonthPillarForDate)로 산출 — raw.unse.monthly 무시', () => {
    // raw.unse.monthly(寅-first 달력 산술 배열)는 "달력월=사주월"로 퉁쳐 한 칸
    // 밀린 값(己丑)을 담고 있다. pickWolun 은 이걸 읽지 않고 절기로 직접 계산해야
    // 한다 — 생일 차트/캘린더/일진과 동일 convention.
    const raw = makeRaw([], [{ year: 2026, month: 6, ganji: '己丑' }])
    const { wolun } = computeCurrentUnse(raw, QUERY)

    expect(wolun).toEqual(getMonthPillarForDate(QUERY))
    // 배열의 한 칸 밀린 己丑 을 더 이상 쓰지 않음을 명시(회귀 방지).
    expect(wolun).not.toEqual({ stem: '己', branch: '丑' })
  })

  it('세운·월운은 raw.unse 배열과 무관하게 절기로 산출(엉뚱한 배열 무시, throw X)', () => {
    // 배열에 조회 시점과 안 맞는 옛 데이터만 있어도, 세운/월운은 절기 기준으로
    // 늘 정확히 나온다(배열 lookup 의존 제거).
    const raw = makeRaw(
      [{ year: 2020, heavenlyStem: '庚', earthlyBranch: '子' }],
      [{ year: 2020, month: 1, ganji: '丁丑' }]
    )
    const { seun, wolun } = computeCurrentUnse(raw, QUERY)
    expect(seun).toEqual(getYearPillarForDate(QUERY))
    expect(wolun).toEqual(getMonthPillarForDate(QUERY))
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
