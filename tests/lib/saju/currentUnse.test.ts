// 현재 운(세운·월운·일진) — 운 vs 본명 충/합 감지 회귀.
//
// computeCurrentUnse 의 핵심은 내부 detectUnseRelations: 운의 천간·지지가
// 본명 네 기둥과 이루는 천간충/천간합/지지충/지지육합 판정이다. 상담사
// 현재운 해석의 근거가 되는 함수인데 커버리지 20% 로 무방비였다.
// 고정 본명 + 고정 운 간지로 관계 4종을 모두 골든으로 잠근다.

import { describe, it, expect } from 'vitest'
import { computeCurrentUnse, detectUnseRelations } from '@/lib/saju/currentUnse'
import { pillarsForLocalDate } from '@/lib/calendar-engine/periodPillars'
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

const SEOUL = 'Asia/Seoul'
const JUNE10 = { year: 2026, month: 6, day: 10 }

/** 독립 기대값 — 1984-01-31 = 甲子일 기준 (1900-01-01 = 甲戌일과 같은 만세력) 60갑자 날짜 산술(엔진 코드 밖). */
function dayPillarOf(date: string): { stem: string; branch: string } {
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse('1984-01-31T00:00:00Z')) / 86_400_000
  )
  const k = ((days % 60) + 60) % 60
  return { stem: '甲乙丙丁戊己庚辛壬癸'[k % 10], branch: '子丑寅卯辰巳午未申酉戌亥'[k % 12] }
}
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

describe('computeCurrentUnse — 그날의 세운·월운 = 캘린더 셀 (재감사 G3 · TP-4 · TP-5)', () => {
  // 세운·월운은 호출자가 캘린더와 같은 날짜별 헬퍼(pillarsForLocalDate)로 골라 넘긴다 —
  // computeCurrentUnse 는 그 값을 그대로 싣고(간지만), 본명과의 충/합을 붙인다.
  const raw = makeRaw([], [])

  it('세운은 1/1 이 아니라 입춘에 바뀐다 — 서울 立春 2026 = 02-04 05:02', () => {
    // 입춘 후(6/10) → 2026 丙午. 입춘 전(1/15) → 직전 해 2025 乙巳.
    expect(computeCurrentUnse(raw, JUNE10, pillarsForLocalDate(2026, 6, 10, SEOUL)).seun).toEqual({
      stem: '丙',
      branch: '午',
    })
    const jan15 = { year: 2026, month: 1, day: 15 }
    expect(computeCurrentUnse(raw, jan15, pillarsForLocalDate(2026, 1, 15, SEOUL)).seun).toEqual({
      stem: '乙',
      branch: '巳',
    })
    // 立春 이 든 현지 날(02-04)부터 새 세운 — 그 전날(02-03)은 아직 乙巳.
    const feb3 = { year: 2026, month: 2, day: 3 }
    const feb4 = { year: 2026, month: 2, day: 4 }
    expect(computeCurrentUnse(raw, feb3, pillarsForLocalDate(2026, 2, 3, SEOUL)).seun).toEqual({
      stem: '乙',
      branch: '巳',
    })
    expect(computeCurrentUnse(raw, feb4, pillarsForLocalDate(2026, 2, 4, SEOUL)).seun).toEqual({
      stem: '丙',
      branch: '午',
    })
  })

  it('세운·월운은 넘겨받은 간지만 싣는다(sajuYear·termIndex 같은 부가 필드 없음)', () => {
    const period = pillarsForLocalDate(2026, 6, 10, SEOUL)
    const { seun, wolun } = computeCurrentUnse(raw, JUNE10, period)
    expect(seun).toEqual({ stem: period.year.stem, branch: period.year.branch })
    expect(wolun).toEqual({ stem: period.month.stem, branch: period.month.branch })
  })

  it('raw.unse 배열(옛 寅-first 달력 산술)은 읽지 않는다', () => {
    // 배열에 조회 날짜와 안 맞는 옛 데이터만 있어도 세운·월운은 넘겨받은 날짜 기둥 그대로.
    const stale = makeRaw(
      [{ year: 2020, heavenlyStem: '庚', earthlyBranch: '子' }],
      [{ year: 2026, month: 6, ganji: '己丑' }]
    )
    const { seun, wolun } = computeCurrentUnse(
      stale,
      JUNE10,
      pillarsForLocalDate(2026, 6, 10, SEOUL)
    )
    expect(seun).toEqual({ stem: '丙', branch: '午' })
    expect(wolun).toEqual({ stem: '甲', branch: '午' }) // 芒種(06-05) 뒤 = 甲午월
    expect(wolun).not.toEqual({ stem: '己', branch: '丑' })
  })

  it('월운·세운의 충/합은 본명 기둥과 대조된다 (丙午 세운 ↔ 년주 壬子 천간충·지지충)', () => {
    const { relations } = computeCurrentUnse(raw, JUNE10, pillarsForLocalDate(2026, 6, 10, SEOUL))
    const seunRels = relations.filter((r) => r.source === 'seun').map((r) => r.relation.kind)
    expect(seunRels.sort()).toEqual(['지지충', '천간충'])
  })
})

describe('computeCurrentUnse — 일진', () => {
  it('일진은 현지 날짜의 만세력 간지 — 날짜 산술이라 시각·서버 TZ 무관', () => {
    const raw = makeRaw([], [])
    const { iljin } = computeCurrentUnse(raw, JUNE10, pillarsForLocalDate(2026, 6, 10, SEOUL))
    // 2026-06-10 = 乙卯일.
    expect(iljin).toEqual(dayPillarOf('2026-06-10'))
    // 같은 날짜는 항상 같은 일진 — 결정론.
    const again = computeCurrentUnse(raw, { ...JUNE10 }, pillarsForLocalDate(2026, 6, 10, SEOUL))
    expect(again.iljin).toEqual(iljin)
  })
})
