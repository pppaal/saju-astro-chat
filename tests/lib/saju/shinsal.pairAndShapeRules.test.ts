/**
 * 신살 규칙 교정 (G4) — 천라지망 짝 규칙(SDR-03), 괴강 위치(SDR-04), 현침 글자 규칙(SDR-05).
 * 기대값은 엔진 표가 아니라 각 규칙의 정의에서 독립적으로 만든다 (CONVENTIONS §8).
 *
 *  - 천라지망: 戌+亥 = 천라(天羅), 辰+巳 = 지망(地網). 보이는 기둥에 짝이 함께 있을 때만,
 *    짝을 이룬 기둥마다 hit. 지지 하나(또는 같은 지지 둘)는 아니다.
 *  - 괴강: 일주 학파 — 일주가 庚辰·庚戌·壬辰·壬戌·戊戌 일 때 일주 한 칸만.
 *  - 현침: 일간이 甲·辛 이고 보이는 지지에 卯·午·申 이 있으면 그 기둥마다. ('your' = 未 추가)
 */
import { describe, it, expect } from 'vitest'
import {
  getShinsalHits,
  getShinsalHitsForDailyTarget,
  cheonraJimangPartner,
  type ShinsalPillarsInput,
} from '@/lib/saju/shinsal'
import type { FiveElement } from '@/lib/saju/types'

const EL: FiveElement = '목'
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const GANJI60 = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12])
const KINDS = ['year', 'month', 'day', 'time'] as const

const pillar = (gj: string) => ({
  heavenlyStem: { name: gj[0], element: EL },
  earthlyBranch: { name: gj[1], element: EL },
})
function chart(y: string, m: string, d: string, t: string | null): ShinsalPillarsInput {
  return {
    year: pillar(y),
    month: pillar(m),
    day: pillar(d),
    ...(t ? { time: pillar(t) } : { time: null }),
  } as unknown as ShinsalPillarsInput
}
const hitsOf = (c: ShinsalPillarsInput, kind: string) =>
  getShinsalHits(c).filter((h) => h.kind === kind)
const pillarsOf = (c: ShinsalPillarsInput, kind: string) =>
  hitsOf(c, kind)
    .flatMap((h) => h.pillars)
    .sort()

// 결정론 표본 — 60갑자에서 LCG 로 고른 4기둥 차트 (시간 미상 1/6).
function sampleCharts(n: number): Array<[string, string, string, string | null]> {
  let seed = 20261125
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
  const out: Array<[string, string, string, string | null]> = []
  for (let i = 0; i < n; i++) {
    const g = () => GANJI60[Math.floor(next() / 65536) % 60]
    const y = g()
    const m = g()
    const d = g()
    const t = Math.floor(next() / 65536) % 6 === 0 ? null : g()
    out.push([y, m, d, t])
  }
  return out
}

describe('천라지망 — 짝(戌亥 천라 · 辰巳 지망)이 있어야 성립 (SDR-03)', () => {
  it('repro charts with a lone 戌 / 巳 get no 천라지망', () => {
    // 1997-03-21 14:30 Seoul F, 1990-01-09 10:00 Seoul M
    expect(hitsOf(chart('丁丑', '癸卯', '壬戌', '丁未'), '천라지망')).toEqual([])
    expect(hitsOf(chart('己巳', '丁丑', '甲戌', '己巳'), '천라지망')).toEqual([])
  })

  it('戌 + 亥 → 천라 on exactly the two pillars; 辰 + 巳 → 지망', () => {
    const cr = hitsOf(chart('甲戌', '丙寅', '乙亥', '丙子'), '천라지망')
    expect(cr.map((h) => h.pillars[0]).sort()).toEqual(['day', 'year'])
    expect(cr.every((h) => h.detail?.startsWith('천라'))).toBe(true)
    const jm = hitsOf(chart('丙子', '甲辰', '丙寅', '己巳'), '천라지망')
    expect(jm.map((h) => h.pillars[0]).sort()).toEqual(['month', 'time'])
    expect(jm.every((h) => h.detail?.startsWith('지망'))).toBe(true)
  })

  it('the same branch twice (戌·戌) is not a pair', () => {
    expect(hitsOf(chart('甲戌', '丙戌', '乙丑', '丙子'), '천라지망')).toEqual([])
  })

  it('time unknown: a partner that only the hour pillar would hold does not count', () => {
    expect(hitsOf(chart('甲戌', '丙寅', '乙丑', null), '천라지망')).toEqual([])
  })

  it('property (3,000 charts): a hit iff a pair is present, only on pair-holding pillars', () => {
    let withPair = 0
    for (const [y, m, d, t] of sampleCharts(3000)) {
      const c = chart(y, m, d, t)
      const present = [y, m, d, t]
        .map((gj, i) => (gj ? ([KINDS[i], gj[1]] as const) : null))
        .filter((x): x is readonly [(typeof KINDS)[number], string] => x !== null)
      const branches = new Set(present.map(([, b]) => b))
      const want = present
        .filter(([, b]) => {
          const partner = { 戌: '亥', 亥: '戌', 辰: '巳', 巳: '辰' }[b as '戌']
          return partner !== undefined && branches.has(partner)
        })
        .map(([k]) => k)
        .sort()
      if (want.length) withPair++
      expect(pillarsOf(c, '천라지망'), `${y} ${m} ${d} ${t}`).toEqual(want)
    }
    // 짝 규칙이면 천라지망은 소수 차트에만 — 지지 하나 규칙(~80%)이 아니다.
    expect(withPair / 3000).toBeLessThan(0.2)
    expect(withPair).toBeGreaterThan(0)
  })

  it('cheonraJimangPartner maps 戌↔亥, 辰↔巳 and nothing else', () => {
    const got = Object.fromEntries(BRANCHES.map((b) => [b, cheonraJimangPartner(b)]))
    expect(got).toEqual({
      子: null,
      丑: null,
      寅: null,
      卯: null,
      辰: '巳',
      巳: '辰',
      午: null,
      未: null,
      申: null,
      酉: null,
      戌: '亥',
      亥: '戌',
    })
  })
})

describe('괴강 — 일주 학파: 괴강 일주의 일주 한 칸에만 (SDR-04)', () => {
  const GWAEGANG = new Set(['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'])

  it.each([
    [['丙辰', '壬辰', '庚辰', '甲申'], ['day']],
    [['戊辰', '丙辰', '壬辰', '乙巳'], ['day']],
    [['甲戌', '丙戌', '壬戌', '庚戌'], ['day']],
    [['庚戌', '丙戌', '甲子', '丙寅'], []],
    [['甲辰', '丙寅', '戊戌', '丙辰'], ['day']],
  ])('%j → 괴강 on %j', (gj, want) => {
    expect(pillarsOf(chart(gj[0], gj[1], gj[2], gj[3]), '괴강')).toEqual(want)
  })

  it('all 60 day pillars × other pillars sharing the day branch: only the day pillar', () => {
    for (const day of GANJI60) {
      // 같은 지지를 가진 비괴강 기둥으로 둘러싼다.
      const other = GANJI60.find((g) => g[1] === day[1] && !GWAEGANG.has(g)) ?? day
      const got = pillarsOf(chart(other, other, day, other), '괴강')
      expect(got, day).toEqual(GWAEGANG.has(day) ? ['day'] : [])
    }
  })
})

describe('현침 — 글자 모양 규칙: 甲·辛 일간 × 卯·午·申 지지 (SDR-05)', () => {
  const NEEDLE_STEM = new Set(['甲', '辛'])
  const NEEDLE_BRANCH = new Set(['卯', '午', '申'])

  it('no needle character anywhere → no 현침 (old table fired on 酉/子)', () => {
    expect(hitsOf(chart('丙子', '丁酉', '乙丑', '丙子'), '현침')).toEqual([])
    expect(hitsOf(chart('壬子', '壬子', '丁亥', '庚子'), '현침')).toEqual([])
  })

  it.each([
    ['丙子', '戊戌', '甲申', '甲子'],
    ['壬子', '壬子', '辛卯', '戊子'],
    ['丙子', '庚子', '甲午', '丙寅'],
  ])('needle day pillar %s %s %s %s always carries 현침 on the day pillar', (y, m, d, t) => {
    expect(pillarsOf(chart(y, m, d, t), '현침')).toEqual(['day'])
  })

  it('property (3,000 charts): 현침 on exactly the pillars whose branch is 卯/午/申, iff day stem is 甲/辛', () => {
    for (const [y, m, d, t] of sampleCharts(3000)) {
      const want = NEEDLE_STEM.has(d[0])
        ? [y, m, d, t]
            .map((gj, i) => (gj && NEEDLE_BRANCH.has(gj[1]) ? KINDS[i] : null))
            .filter((k): k is (typeof KINDS)[number] => k !== null)
            .sort()
        : []
      expect(pillarsOf(chart(y, m, d, t), '현침'), `${y} ${m} ${d} ${t}`).toEqual(want)
    }
  })

  // 오너 결정 18 (G12): 현침은 글자 모양 규칙 하나 — 未 학파 없음. 예전 'your' 룰셋(/api/saju)만
  // 未 를 더해 사주 화면에만 辛未 일주의 현침이 떴고, G13 에서 룰셋 옵션 자체를 지웠다.
  it('辛未 day pillar has no 현침 (no 未 school, no ruleSet option)', () => {
    const c = chart('丙子', '丙子', '辛未', '丙子')
    expect(getShinsalHits(c).filter((h) => h.kind === '현침')).toEqual([])
  })

  it('property (3,000 charts): 현침 does not depend on the other annotate options', () => {
    const hyeon = (hits: ReturnType<typeof getShinsalHits>) => hits.filter((h) => h.kind === '현침')
    for (const [y, m, d, t] of sampleCharts(3000)) {
      const c = chart(y, m, d, t)
      expect(hyeon(getShinsalHits(c, { includeTwelveAll: false })), `${y} ${m} ${d} ${t}`).toEqual(
        hyeon(getShinsalHits(c))
      )
    }
  })

  it('daily: 10 day stems × 12 day branches fire iff stem ∈ {甲,辛} and branch ∈ {卯,午,申}', () => {
    for (const stem of STEMS) {
      for (const br of BRANCHES) {
        const fired = getShinsalHitsForDailyTarget(stem, '子', br, '子', '甲').some(
          (h) => h.kind === '현침'
        )
        expect(fired, `${stem} ${br}`).toBe(NEEDLE_STEM.has(stem) && NEEDLE_BRANCH.has(br))
      }
    }
  })
})
