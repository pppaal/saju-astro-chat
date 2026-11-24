/**
 * core/sibsin 도메인 계약 — saju.ts 와 unse.ts 가 동일한 정기 매핑/십신 룰을
 * 쓰는지 보장. PR #1011 이 saju.ts 의 子 정기를 壬→癸 로 fix 했지만 unse.ts 가
 * 별도 sibsin 함수 + branch 직접 호출 패턴이라 같은 fix 가 안 들어갔던
 * 잠재 회귀 (S3) 를 잠근다.
 *
 * 이 계약이 깨지면 = 호출자가 core/sibsin 우회해서 자체 정기 매핑/sibseong
 * 함수 다시 짰다는 뜻. 그건 곧 같은 버그 재발.
 */

import { describe, it, expect } from 'vitest'
import {
  BRANCH_MAIN_QI,
  getBranchMainStem,
  getSibseong,
  getBranchSibsin,
} from '@/lib/saju/core/sibsin'
import { calculateSajuData } from '@/lib/saju/saju'
import { getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/saju/unse'

describe('core/sibsin — 정기 매핑 단일 source', () => {
  it('한국 정통 명리: 12지지 정기 매핑', () => {
    expect(BRANCH_MAIN_QI).toEqual({
      子: '癸',
      丑: '己',
      寅: '甲',
      卯: '乙',
      辰: '戊',
      巳: '丙',
      午: '丁',
      未: '己',
      申: '庚',
      酉: '辛',
      戌: '戊',
      亥: '壬',
    })
  })

  it('子 정기는 癸 음수 (한국 정통). saju.ts 의 옛 子=壬 버그 회귀 보호.', () => {
    const s = getBranchMainStem('子')
    expect(s?.name).toBe('癸')
    expect(s?.yin_yang).toBe('음')
    expect(s?.element).toBe('수')
  })
})

describe('core/sibsin — 십신 계산 룰', () => {
  it('일간 戊양토 + 정기 癸음수(=子) → 정재 (음양 다름)', () => {
    expect(getBranchSibsin({ element: '토', yin_yang: '양' }, '子')).toBe('정재')
  })

  it('일간 戊양토 + 정기 壬양수(=亥) → 편재 (음양 같음)', () => {
    expect(getBranchSibsin({ element: '토', yin_yang: '양' }, '亥')).toBe('편재')
  })

  it('일간 甲양목 + 甲양목 → 비견', () => {
    expect(getSibseong({ element: '목', yin_yang: '양' }, { element: '목', yin_yang: '양' })).toBe(
      '비견'
    )
  })

  it('일간 甲양목 + 乙음목 → 겁재', () => {
    expect(getSibseong({ element: '목', yin_yang: '양' }, { element: '목', yin_yang: '음' })).toBe(
      '겁재'
    )
  })
})

describe('saju.ts ↔ unse.ts 십신 일관성 (S3 회귀)', () => {
  it('일주 戊子 출생자의 일지 子 십신 = 정재 (saju.ts)', () => {
    const r = calculateSajuData('1990-01-23', '12:00', 'male', 'solar', 'Asia/Seoul')
    expect(r.dayPillar.heavenlyStem.name).toBe('戊')
    expect(r.dayPillar.earthlyBranch.name).toBe('子')
    expect((r.dayPillar.earthlyBranch as any).sibsin).toBe('정재')
  })

  it('연운 庚子년 (2020) — 戊 일간 기준 지지(子) 십신 = 정재 (unse.ts)', () => {
    const yeonun = getAnnualCycles(2018, 5, { name: '戊', element: '토', yin_yang: '양' } as any)
    const y2020 = yeonun.find((y) => y.year === 2020)
    expect(y2020?.heavenlyStem).toBe('庚')
    expect(y2020?.earthlyBranch).toBe('子')
    expect((y2020 as any)?.sibsin?.ji).toBe('정재')
  })

  it('월운: 子월 — 戊 일간 기준 지지 십신 = 정재 (unse.ts)', () => {
    const wolun = getMonthlyCycles(2024, { name: '戊', element: '토', yin_yang: '양' } as any)
    const zi = wolun.find((m) => m.earthlyBranch === '子')
    expect(zi).toBeDefined()
    expect((zi as any)?.sibsin?.ji).toBe('정재')
  })

  it('일진: 子일 — 戊 일간 기준 지지 십신 = 정재 (unse.ts)', () => {
    // 2020-02-04 ~ 30 어딘가에 子일 있음. 한 달치 scan 해서 첫 子일 찾기.
    const iljin = getIljinCalendar(2020, 2, { name: '戊', element: '토', yin_yang: '양' } as any)
    const zi = iljin.find((d) => d.earthlyBranch === '子')
    expect(zi).toBeDefined()
    expect((zi as any)?.sibsin?.ji).toBe('정재')
  })
})
