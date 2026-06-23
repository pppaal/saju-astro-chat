// 지지/천간 관계 도그마 SSOT(relationTables.ts) 교차 일치 + 골든 테스트.
//
// 목적: 과거 같은 표(특히 원진)가 여러 파일에 복제돼 한 곳만 고치면 드리프트가
// 나던 버그를 구조적으로 차단한다. 모든 소비 모듈의 (파생) 표가 canon 과 정확히
// 일치함을 강제하므로, 누군가 어느 한 곳에서만 값을 바꾸면 이 테스트가 즉시 깬다.

import { describe, it, expect } from 'vitest'
import * as canon from '@/lib/saju/relationTables'
import { YUKHAP, CHUNG, SAMHAP, XING, HAI, PA } from '@/lib/saju/constants'
import {
  STEM_HAP,
  STEM_CHUNG,
  BRANCH_YUKHAP,
  BRANCH_SAMHAP,
  BRANCH_CHUNG,
  BRANCH_HYEONG,
  BRANCH_HAE,
} from '@/lib/saju/compatibility/constants'
import { BRANCH_HYEONG_PAIR, SELF_HYEONG } from '@/lib/saju/hyeong'
import * as compat from '@/lib/compatibility/sajuSynastryData'
import { CHEONEUL_GWIIN_MAP } from '@/lib/saju/constants'

// 방향 무관 쌍 시그니처(두 글자를 정렬해 합침) 집합.
const sig = (a: string, b: string) => [a, b].sort().join('')
const fromPairs = (pairs: ReadonlyArray<canon.Pair>) => new Set(pairs.map(([a, b]) => sig(a, b)))
const fromRecord = (rec: Record<string, string>) =>
  new Set(Object.entries(rec).map(([a, b]) => sig(a, b)))
const fromPartnerRecord = (rec: Record<string, { partner: string }>) =>
  new Set(Object.entries(rec).map(([a, v]) => sig(a, v.partner)))
// compat 표는 partner 대신 `other` 키를 쓴다.
const fromOtherRecord = (rec: Record<string, { other: string }>) =>
  new Set(Object.entries(rec).map(([a, v]) => sig(a, v.other)))

describe('relationTables — 도그마 골든값', () => {
  it('원진(怨嗔)은 표준 6쌍: 子未 丑午 寅酉 卯申 辰亥 巳戌', () => {
    const expected: canon.Pair[] = [
      ['子', '未'],
      ['丑', '午'],
      ['寅', '酉'],
      ['卯', '申'],
      ['辰', '亥'],
      ['巳', '戌'],
    ]
    expect(fromPairs(canon.RESENTMENT_PAIRS)).toEqual(fromPairs(expected))
  })

  it('원진 ≠ 해(害) — 子未·丑午 두 쌍만 공통, 나머지는 다르다', () => {
    const wonjin = fromPairs(canon.RESENTMENT_PAIRS)
    const hae = fromPairs(canon.HARM_PAIRS)
    expect(wonjin).not.toEqual(hae)
    const shared = [...wonjin].filter((s) => hae.has(s))
    expect(new Set(shared)).toEqual(new Set([sig('子', '未'), sig('丑', '午')]))
    // 회귀 가드: 寅酉=원진/寅巳=해, 卯申=원진/卯辰=해 가 뒤바뀌지 않았는지
    expect(wonjin.has(sig('寅', '酉'))).toBe(true)
    expect(wonjin.has(sig('寅', '巳'))).toBe(false)
    expect(hae.has(sig('寅', '巳'))).toBe(true)
    expect(hae.has(sig('寅', '酉'))).toBe(false)
  })

  it('해(害) 표준 6쌍: 子未 丑午 寅巳 卯辰 申亥 酉戌', () => {
    const expected: canon.Pair[] = [
      ['子', '未'],
      ['丑', '午'],
      ['寅', '巳'],
      ['卯', '辰'],
      ['申', '亥'],
      ['酉', '戌'],
    ]
    expect(fromPairs(canon.HARM_PAIRS)).toEqual(fromPairs(expected))
  })

  it('충(沖) 6쌍 / 파(破) 6쌍 / 육합 6쌍 / 천간합 5쌍', () => {
    expect(fromPairs(canon.BRANCH_CLASH)).toEqual(
      fromPairs([
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ])
    )
    expect(canon.BREAK_PAIRS.length).toBe(6)
    expect(canon.SIX_HARMONY.length).toBe(6)
    expect(canon.STEM_COMBINE.length).toBe(5)
  })
})

describe('relationTables — 어댑터 정확성', () => {
  it('toBidiRecord 는 양방향 Record 를 만든다', () => {
    const r = canon.toBidiRecord([['子', '丑']])
    expect(r['子']).toBe('丑')
    expect(r['丑']).toBe('子')
  })
  it('toPairKeySet 는 양방향 키 Set 을 만든다', () => {
    const s = canon.toPairKeySet([['子', '午']])
    expect(s.has('子-午')).toBe(true)
    expect(s.has('午-子')).toBe(true)
  })
})

describe('relationTables — 소비 모듈 ↔ canon 교차 일치', () => {
  it('constants.ts 의 합충형파해가 canon 과 일치', () => {
    expect(fromRecord(YUKHAP)).toEqual(fromPairs(canon.SIX_HARMONY.map((h) => h.pair)))
    expect(fromRecord(CHUNG)).toEqual(fromPairs(canon.BRANCH_CLASH))
    expect(fromRecord(HAI)).toEqual(fromPairs(canon.HARM_PAIRS))
    expect(fromRecord(PA)).toEqual(fromPairs(canon.BREAK_PAIRS))
    // 삼합: 오행키별 멤버 집합 비교
    for (const t of canon.THREE_HARMONY) {
      expect(new Set(SAMHAP[t.element])).toEqual(new Set(t.members))
    }
    // 형: 자형·상형·삼형이 canon 빌딩블록을 반영
    expect(XING['辰']).toContain('辰')
    expect(new Set(XING['子'])).toEqual(new Set(['卯']))
    expect(new Set(XING['寅'])).toEqual(new Set(['巳', '申']))
  })

  it('compatibility/constants.ts 의 표가 canon 과 일치', () => {
    expect(fromPartnerRecord(STEM_HAP)).toEqual(fromPairs(canon.STEM_COMBINE.map((s) => s.pair)))
    expect(fromRecord(STEM_CHUNG)).toEqual(fromPairs(canon.STEM_CLASH_4))
    expect(fromPartnerRecord(BRANCH_YUKHAP)).toEqual(
      fromPairs(canon.SIX_HARMONY.map((h) => h.pair))
    )
    expect(fromRecord(BRANCH_CHUNG)).toEqual(fromPairs(canon.BRANCH_CLASH))
    expect(fromRecord(BRANCH_HAE)).toEqual(fromPairs(canon.HARM_PAIRS))
    // 삼합 멤버 집합
    const samhapSets = BRANCH_SAMHAP.map((s) => new Set(s.branches))
    for (const t of canon.THREE_HARMONY) {
      expect(samhapSets.some((s) => s.size === 3 && t.members.every((m) => s.has(m)))).toBe(true)
    }
    // 삼형 두 조가 모두 존재
    const hyeongTrios = BRANCH_HYEONG.filter((h) => h.branches.length === 3).map(
      (h) => new Set(h.branches)
    )
    for (const trio of canon.PUNISHMENT_TRIOS) {
      expect(hyeongTrios.some((s) => trio.every((m) => s.has(m)))).toBe(true)
    }
  })

  it('hyeong.ts(엄격 형) 빌딩블록이 canon 과 일치', () => {
    expect(new Set(SELF_HYEONG)).toEqual(new Set(canon.SELF_PUNISHMENT_STRICT))
    expect(fromRecord(BRANCH_HYEONG_PAIR)).toEqual(fromPairs([canon.PUNISHMENT_PAIR]))
  })

  it('compatibility/sajuSynastryData.ts 의 cross 표가 canon 과 일치(드리프트 락)', () => {
    // 궁합 포매터/팩트가 쓰는 합충형해파·삼합·방합 표가 SSOT 와 한 글자라도
    // 어긋나면 깬다. (예전 같은 표가 여러 파일에 복제돼 한 곳만 바뀌던 버그 방지.)
    expect(fromOtherRecord(compat.STEM_HAP)).toEqual(
      fromPairs(canon.STEM_COMBINE.map((s) => s.pair))
    )
    expect(fromRecord(compat.STEM_CHUNG)).toEqual(fromPairs(canon.STEM_CLASH_4))
    expect(fromOtherRecord(compat.BRANCH_HAP)).toEqual(
      fromPairs(canon.SIX_HARMONY.map((h) => h.pair))
    )
    expect(fromRecord(compat.BRANCH_CHUNG)).toEqual(fromPairs(canon.BRANCH_CLASH))
    expect(fromRecord(compat.BRANCH_HAE)).toEqual(fromPairs(canon.HARM_PAIRS))
    expect(fromRecord(compat.BRANCH_PA)).toEqual(fromPairs(canon.BREAK_PAIRS))
    // 천간합 합화오행도 canon 과 일치
    for (const { pair, element } of canon.STEM_COMBINE) {
      expect(compat.STEM_HAP[pair[0]]?.element).toBe(element)
      expect(compat.STEM_HAP[pair[1]]?.element).toBe(element)
    }
    // 삼합/방합 멤버 집합
    for (const t of canon.THREE_HARMONY) {
      expect(
        compat.TRI_HAP.some(
          (x) => new Set(x.branches).size === 3 && t.members.every((m) => x.branches.includes(m))
        )
      ).toBe(true)
    }
    for (const d of canon.DIRECTIONAL_HARMONY) {
      expect(compat.BANG_HAP.some((x) => d.members.every((m) => x.branches.includes(m)))).toBe(true)
    }
  })

  it('compatibility 천을귀인이 CHEONEUL_GWIIN_MAP(SSOT)과 동일 멤버', () => {
    // CHEONULGWIIN 은 이제 SSOT 재사용이라 참조 동일이지만, 회귀로 멤버 집합도 잠근다.
    for (const stem of Object.keys(CHEONEUL_GWIIN_MAP)) {
      expect(new Set(compat.CHEONULGWIIN[stem])).toEqual(new Set(CHEONEUL_GWIIN_MAP[stem]))
    }
  })
})
