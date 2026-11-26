/**
 * 원진(怨嗔) — 상담사·차트 모달·무료 리포트가 같은 쌍을 같은 태그로 부른다 (재감사 CS-3).
 *
 * 예전엔 formatSajuSynastry(유료 상담사)만 원진을 태그했고 computeSajuSynastryFacts
 * (buildCompatReport → 차트 모달·무료 리포트)는 원진을 몰랐다. 그래서 같은 커플에게
 * 상담사는 "일지 寅 ↔ 일지 酉 원진"(배우자궁)을 짚는데 차트·리포트엔 그 줄이 없었고,
 * 子未·丑午 는 상담사에선 해+원진, 차트에선 해 하나였다.
 *
 * 정본 원진 쌍(독립 표): 子未 丑午 寅酉 卯申 辰亥 巳戌. 子未·丑午 는 六害 이기도 하다.
 * 원진은 해와 같은 'friction' 톤 — 밴드·교차 판정은 bond/clash 만 세므로 점수는 그대로다.
 */
import { describe, it, expect } from 'vitest'
import {
  computeSajuSynastryFacts,
  formatSajuSynastry,
  type SajuPillarInput,
} from '@/lib/compatibility/sajuSynastryFormatter'
import { buildCompatReport } from '@/lib/compatibility/compatReport'
import { buildFreeCompatNarrative } from '@/lib/compatibility/freeReport/buildNarrative'
import { tagLabel } from '@/lib/compatibility/compatChartLabels'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 독립 원진 표 — 엔진 표(relationTables.RESENTMENT_PAIRS)를 쓰지 않는다.
const WONJIN = new Set(['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'])
const isWonjin = (a: string, b: string) => WONJIN.has(a + b) || WONJIN.has(b + a)

const P = (stem: string, branch: string): SajuPillarInput => ({ stem, branch })
const parse = (s: string): SajuPillarInput[] => s.split(' ').map((g) => P(g[0], g[1]))

// 결정론 PRNG (mulberry32) — 시드 고정 sweep.
function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
// 60갑자에서 기둥을 뽑는다(천간·지지 음양이 맞는 실제 간지만).
function randomPillars(next: () => number): SajuPillarInput[] {
  return [0, 1, 2, 3].map(() => {
    const k = Math.floor(next() * 60)
    return P(STEMS[k % 10], BRANCHES[k % 12])
  })
}

const POS_EN: Record<string, string> = { 년: 'Y', 월: 'M', 일: 'D', 시: 'H' }
// 포매터 EN 태그 → facts 정본 태그(합은 facts 에서 '육합').
const EN_TO_FACT: Record<string, string> = {
  union: '육합',
  clash: '충',
  punishment: '형',
  'self-punishment': '자형',
  harm: '해',
  break: '파',
  resentment: '원진',
}

/** 포매터(EN) 지지 줄 → `${aPos}${bPos}` → 태그 집합. */
function formatterBranchTags(out: string): Map<string, string[]> {
  const m = new Map<string, string[]>()
  const re = /^A ([YMDH])-branch (.) ↔ B ([YMDH])-branch (.) — \2\4 (.+)$/
  for (const line of out.split('\n')) {
    const hit = line.match(re)
    if (!hit) continue
    const tags = hit[5]
      .replace(/ combined$/, '')
      .split('+')
      .map((t) => EN_TO_FACT[t] ?? `?${t}`)
    m.set(`${hit[1]}${hit[3]}`, tags.sort())
  }
  return m
}

function factBranchTags(pillarsA: SajuPillarInput[], pillarsB: SajuPillarInput[]) {
  const m = new Map<string, string[]>()
  for (const r of computeSajuSynastryFacts({ pillarsA, pillarsB }).pillarRelations) {
    if (r.layer !== 'branch') continue
    m.set(`${POS_EN[r.aPillar]}${POS_EN[r.bPillar]}`, [...r.tags].sort())
  }
  return m
}

describe('원진 — facts (chart/free report) equal the counselor formatter, cell by cell', () => {
  it('2000 seeded real-ganji pairs: every branch cell carries the same tags on both surfaces', () => {
    const next = rng(20261126)
    const now = new Date('2026-06-01T00:00:00Z')
    let wonjinCells = 0
    for (let n = 0; n < 2000; n++) {
      const A = randomPillars(next)
      const B = randomPillars(next)
      const fmt = formatterBranchTags(
        formatSajuSynastry({ pillarsA: A, pillarsB: B, lang: 'en', now })
      )
      const fac = factBranchTags(A, B)
      expect(Object.fromEntries(fac), `pair ${n}`).toEqual(Object.fromEntries(fmt))
      // 독립 표로도 확인 — 원진 셀마다 facts 가 원진을 단다.
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (!isWonjin(A[i].branch, B[j].branch)) continue
          wonjinCells++
          const key = `${'YMDH'[i]}${'YMDH'[j]}`
          expect(fac.get(key), `pair ${n} cell ${key}`).toContain('원진')
        }
      }
    }
    // 2000쌍 × 16칸 × (1/12) ≈ 2700 — sweep 이 실제로 원진을 많이 밟았는지.
    expect(wonjinCells).toBeGreaterThan(2000)
  })

  it('repro pair: the spouse-palace D寅 ↔ D酉 row is in the facts as 원진 (friction)', () => {
    // 재감사 repro_wonjin: A = 甲子 丙午 戊寅 庚午, B = 丁卯 己亥 辛酉 癸亥.
    const A = parse('甲子 丙午 戊寅 庚午')
    const B = parse('丁卯 己亥 辛酉 癸亥')
    const day = computeSajuSynastryFacts({ pillarsA: A, pillarsB: B }).pillarRelations.find(
      (r) => r.layer === 'branch' && r.aPillar === '일' && r.bPillar === '일'
    )
    expect(day).toMatchObject({
      aChar: '寅',
      bChar: '酉',
      tags: ['원진'],
      tone: 'friction',
      isDayInvolved: true,
    })
    // 상담사 포매터도 같은 칸을 원진으로 부른다.
    expect(formatSajuSynastry({ pillarsA: A, pillarsB: B, lang: 'en' })).toContain(
      'A D-branch 寅 ↔ B D-branch 酉 — 寅酉 resentment'
    )
  })

  it('子未 / 丑午 carry 해+원진 together, in the formatter order', () => {
    // A 子(년)·寅·午(일)·辰, B 丑(년)·申·未(일)·亥 → A年子↔B日未, A日午↔B年丑, A時辰↔B時亥.
    const A = parse('甲子 丙寅 庚午 壬辰')
    const B = parse('己丑 甲申 乙未 丁亥')
    const rels = computeSajuSynastryFacts({ pillarsA: A, pillarsB: B }).pillarRelations
    const cell = (a: string, b: string) =>
      rels.find((r) => r.layer === 'branch' && r.aPillar === a && r.bPillar === b)
    expect(cell('년', '일')?.tags).toEqual(['해', '원진'])
    expect(cell('일', '년')?.tags).toEqual(['해', '원진'])
    expect(cell('시', '시')?.tags).toEqual(['원진'])
    expect(cell('년', '일')?.tone).toBe('friction')
  })

  it('time unknown: no 원진 is read off the fabricated hour pillar', () => {
    const A = parse('甲子 丙寅 庚午 壬辰')
    const B = parse('己丑 甲申 乙未 丁亥')
    const rels = computeSajuSynastryFacts({
      pillarsA: A,
      pillarsB: B,
      timeUnknownA: true,
    }).pillarRelations
    expect(rels.some((r) => r.aPillar === '시')).toBe(false)
    expect(rels.some((r) => r.tags.includes('원진'))).toBe(true) // 子未·丑午 는 남는다
  })
})

describe('원진 — chart labels, compat report and free report', () => {
  const A = parse('甲子 丙午 戊寅 庚午')
  const B = parse('丁卯 己亥 辛酉 癸亥')

  it('chart tag label: KO 원진, EN resentment', () => {
    expect(tagLabel('원진', true)).toBe('원진')
    expect(tagLabel('원진', false)).toBe('resentment')
  })

  it('buildCompatReport lists the 원진 row; band and verdict count only bond/clash', () => {
    const report = buildCompatReport({
      astroA: null,
      astroB: null,
      pillarsA: A,
      pillarsB: B,
      lang: 'en',
    })
    const won = report.pillarRelations.filter((r) => r.tags.includes('원진'))
    expect(won.length).toBeGreaterThan(0)
    expect(won.every((r) => r.tone === 'friction')).toBe(true)
    const clash = report.pillarRelations.filter((r) => r.tone === 'clash').length
    expect(report.band?.eastern_chung).toBe(Math.max(0, 100 - clash * 15))
  })

  it('free report: the knot section names 원진 (KO) / wonjin (EN), EN with no Hangul', () => {
    const report = buildCompatReport({ astroA: null, astroB: null, pillarsA: A, pillarsB: B })
    const ko = buildFreeCompatNarrative(report, { labelA: '준영', labelB: '민지', lang: 'ko' })
    const koText = ko.sections.flatMap((s) => s.paragraphs).join('\n')
    expect(koText).toContain("'원진'")

    const reportEn = buildCompatReport({
      astroA: null,
      astroB: null,
      pillarsA: A,
      pillarsB: B,
      lang: 'en',
    })
    const en = buildFreeCompatNarrative(reportEn, { labelA: 'Jun', labelB: 'Min', lang: 'en' })
    const enParas = en.sections.flatMap((s) => s.paragraphs).filter((p) => p.includes('wonjin'))
    expect(enParas.length).toBeGreaterThan(0)
    for (const p of enParas) expect(p).not.toMatch(/[가-힣]/)
  })
})
