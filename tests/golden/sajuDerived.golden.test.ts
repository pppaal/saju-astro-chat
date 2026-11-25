/**
 * Derived-saju goldens by pillars (engine audit E0, section D; SD-18).
 *
 * Expected values come from tests/golden/engine-golden.json. The generator
 * (scripts/golden/build-engine-golden.mts) derives them from cited classical
 * tables — 三命通會 三合/自刑/太極貴人, 方合, 鬼門關, 桃花 = 年殺, the 天干沖
 * canon, 化氣格 conditions — encoded there, never copied from src/lib/saju.
 * The 용신 cases are invariants of CONVENTIONS §10 (억부), not pinned picks.
 *
 * Known defects: a value that a later engine stage corrects is listed in
 * KNOWN_DEFECTS with that stage id and runs as `it.fails` until the stage lands
 * and deletes the entry. Run with GOLDEN_SHOW_DEFECTS=1 to see the real diffs.
 */
import { describe, it, expect } from 'vitest'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { getShinsalHits } from '@/lib/saju/shinsal'
import { determineGeokguk } from '@/lib/saju/geokguk'
import { determineYongsin } from '@/lib/saju/yongsin'
import { calculateStrengthScore } from '@/lib/saju/strengthScore'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import golden from './engine-golden.json'

/** Engine stage that corrects each value. Delete an entry when its stage lands. */
const KNOWN_DEFECTS: Record<string, string> = {
  'D05 taegeuk': 'E3',
  'D06 taegeuk': 'E3',
  'D07 gwimun': 'E3',
  'D08 gwimun': 'E3',
  'D09 dohwa': 'E3',
  'D10 hwagi': 'E4',
  'Y01 primaryNotSupport': 'E4',
  'Y02 secondaryNotKibsin': 'E4',
  'Y03 primaryNotAvoid': 'E4',
  'Y04 primarySupportOrJohu': 'E4',
  'extreme weak strength score': 'E4',
  'sample 3-class strength label': 'E4',
}

const SHOW_DEFECTS = process.env.GOLDEN_SHOW_DEFECTS === '1'
const usedDefects = new Set<string>()
function golden_it(key: string, fn: () => unknown) {
  const defect = KNOWN_DEFECTS[key]
  if (!defect) return it(key, fn)
  usedDefects.add(key)
  const name = `${key} [knownDefect:${defect}]`
  return SHOW_DEFECTS ? it(name, fn) : it.fails(name, fn)
}

const POS = ['year', 'month', 'day', 'time'] as const
type Pos = (typeof POS)[number]
type Full = Record<Pos, { heavenlyStem: { name: string }; earthlyBranch: { name: string } }>
type Simple = Record<Pos, { stem: string; branch: string }>

function pillarsOf(gz: string) {
  const parts = gz.split(' ')
  const full = Object.fromEntries(
    POS.map((k, i) => [
      k,
      { heavenlyStem: { name: parts[i][0] }, earthlyBranch: { name: parts[i][1] } },
    ])
  ) as Full
  const simple = Object.fromEntries(
    POS.map((k, i) => [k, { stem: parts[i][0], branch: parts[i][1] }])
  ) as Simple
  return { full, simple, branches: parts.map((p) => p[1]) }
}

const BRANCH_CHARS = /[子丑寅卯辰巳午未申酉戌亥]/g
const trioKey = (s: string) => [...new Set(s.match(BRANCH_CHARS) ?? [])].sort().join('')

function relations(gz: string) {
  const { full } = pillarsOf(gz)
  return analyzeRelations(toAnalyzeInputFromSaju(full, full.day.heavenlyStem.name))
}
type ShinsalArg = Parameters<typeof getShinsalHits>[0]
const shinsal = (gz: string, kind: string) =>
  getShinsalHits(pillarsOf(gz).full as unknown as ShinsalArg).filter((h) => h.kind === kind)

type DerivedCase = {
  id: string
  pillars: string
  checks: string[]
  note?: string
  expected: {
    samhap?: Array<{ members: string; element: string }>
    banghap?: Array<{ members: string; element: string }>
    selfPunish?: string[]
    stemClash?: string[]
    taegeuk?: Array<{ pillar: string; branch: string }>
    gwimun?: string[]
    dohwa?: Array<{ pillar: string; branch: string }>
    hwagi?: { formed: boolean } | null
  }
}
const D = golden.sajuDerived
const CASES = D.cases as unknown as DerivedCase[]

const CHECKS: Record<string, (c: DerivedCase) => void> = {
  samhap: (c) => {
    // full 三合 only — 반합 hits share the kind but say '반합'
    const got = relations(c.pillars)
      .filter((h) => h.kind === '지지삼합' && /삼합/.test(h.detail))
      .map((h) => trioKey(h.detail))
    expect(got.sort()).toEqual(c.expected.samhap!.map((x) => trioKey(x.members)).sort())
  },
  banghap: (c) => {
    const got = relations(c.pillars)
      .filter((h) => h.kind === '지지방합')
      .map((h) => trioKey(h.detail))
    expect(got.sort()).toEqual(c.expected.banghap!.map((x) => trioKey(x.members)).sort())
  },
  selfPunish: (c) => {
    // 自刑 only on 辰午酉亥: a doubled branch outside that set is never 형.
    const doubled = pillarsOf(c.pillars).branches.filter((b, i, a) => a.indexOf(b) !== i)
    const got = relations(c.pillars)
      .filter((h) => h.kind === '지지형')
      .map((h) => (h.detail.match(BRANCH_CHARS) ?? []) as string[])
      .filter((bs) => bs.length === 2 && bs[0] === bs[1] && doubled.includes(bs[0]))
      .map((bs) => bs[0])
    expect([...new Set(got)].sort()).toEqual([...c.expected.selfPunish!].sort())
  },
  stemClash: (c) => {
    const norm = (s: string) => [...s.replace(/[^甲乙丙丁戊己庚辛壬癸]/g, '')].sort().join('-')
    const got = relations(c.pillars)
      .filter((h) => h.kind === '천간충')
      .map((h) => norm(h.detail))
    expect([...new Set(got)].sort()).toEqual([...new Set(c.expected.stemClash!.map(norm))].sort())
  },
  taegeuk: (c) => {
    const got = shinsal(c.pillars, '태극귀인').map((h) => `${h.pillars.join('+')}:${h.target}`)
    expect(got.sort()).toEqual(c.expected.taegeuk!.map((x) => `${x.pillar}:${x.branch}`).sort())
  },
  gwimun: (c) => {
    const { full } = pillarsOf(c.pillars)
    const hits = shinsal(c.pillars, '귀문관')
    const expected = c.expected.gwimun!
    if (expected.length === 0) {
      expect(hits.map((h) => `${h.pillars.join('+')}:${h.target}`)).toEqual([])
      return
    }
    // every expected pair is reported, and every hit is one of the expected pairs
    const covers = (h: (typeof hits)[number], pair: string) => {
      const bs = new Set([
        ...h.pillars.map((p) => full[p as Pos].earthlyBranch.name),
        ...(String(h.target ?? '').match(BRANCH_CHARS) ?? []),
      ])
      return pair.split('-').every((b) => bs.has(b))
    }
    for (const pair of expected)
      expect(
        hits.some((h) => covers(h, pair)),
        pair
      ).toBe(true)
    for (const h of hits)
      expect(
        expected.some((pair) => covers(h, pair)),
        String(h.target)
      ).toBe(true)
  },
  dohwa: (c) => {
    const got = shinsal(c.pillars, '도화').map((h) => `${h.pillars.join('+')}:${h.target}`)
    expect(got.sort()).toEqual(c.expected.dohwa!.map((x) => `${x.pillar}:${x.branch}`).sort())
  },
  hwagi: (c) => {
    const g = determineGeokguk(pillarsOf(c.pillars).simple)
    expect(g.category === '화기격국').toBe(!!c.expected.hwagi?.formed)
  },
}

describe('derived saju goldens — cited classical tables (E0 section D)', () => {
  for (const c of CASES) {
    describe(`${c.id} ${c.pillars}`, () => {
      for (const check of c.checks) golden_it(`${c.id} ${check}`, () => CHECKS[check](c))
    })
  }
})

type YongsinCase = {
  id: string
  pillars: string
  strength: 'strong' | 'weak' | null
  check: 'primaryNotSupport' | 'secondaryNotKibsin' | 'primaryNotAvoid' | 'primarySupportOrJohu'
  supportElements: string[]
}

describe('용신 invariants — CONVENTIONS §10 억부 (E0 section D)', () => {
  for (const y of D.yongsin as unknown as YongsinCase[]) {
    golden_it(`${y.id} ${y.check}`, () => {
      const r = determineYongsin(pillarsOf(y.pillars).simple)
      const avoid = [r.kibsin, r.gusin].filter(Boolean)
      switch (y.check) {
        case 'primaryNotSupport':
          expect(
            y.supportElements,
            `${y.pillars} strong: primary ${r.primaryYongsin}`
          ).not.toContain(r.primaryYongsin)
          break
        case 'secondaryNotKibsin':
          expect(r.secondaryYongsin, `${y.pillars}`).not.toBe(r.kibsin)
          break
        case 'primaryNotAvoid':
          expect(avoid, `${y.pillars}: primary ${r.primaryYongsin}`).not.toContain(r.primaryYongsin)
          break
        case 'primarySupportOrJohu':
          expect(
            y.supportElements.includes(r.primaryYongsin) || r.yongsinType === '조후용신',
            `${y.pillars} weak: primary ${r.primaryYongsin} (${r.yongsinType})`
          ).toBe(true)
          break
      }
      // never recommend and avoid the same element
      for (const rec of [r.primaryYongsin, r.secondaryYongsin].filter(Boolean)) {
        expect(avoid, `${y.pillars}: ${rec} both recommended and avoided`).not.toContain(rec)
      }
    })
  }

  golden_it('extreme weak strength score', () => {
    const ew = D.extremeWeak
    const s = calculateStrengthScore(
      pillarsOf(ew.pillars).full as unknown as Parameters<typeof calculateStrengthScore>[0]
    )
    expect(s.total).toBeLessThanOrEqual(ew.maxScore)
  })
})

describe('one 3-class strength label across surfaces (E0 section D)', () => {
  const to3 = (label: string | undefined) => {
    if (!label) return label
    if (/^(strong|medium|weak)$/.test(label)) return label
    if (/극신강|^신강/.test(label)) return 'strong'
    if (/극신약|^신약/.test(label)) return 'weak'
    if (/중화|중강|중약/.test(label)) return 'medium'
    return label
  }
  golden_it('sample 3-class strength label', async () => {
    const s = golden.cross.sample
    const now = new Date('2026-11-24T03:00:00Z')
    const facts = collectSajuFacts({
      birthDate: s.birthDate,
      birthTime: s.birthTime,
      gender: s.gender as 'female',
      timezone: s.timeZone,
      longitude: s.longitude,
      now,
    })
    const p = facts._raw.pillars as unknown as Full
    const simple = Object.fromEntries(
      POS.map((k) => [k, { stem: p[k].heavenlyStem.name, branch: p[k].earthlyBranch.name }])
    ) as Simple
    const natal = await buildNatalContext({
      birthDate: s.birthDate,
      birthTime: s.birthTime,
      gender: s.gender as 'female',
      latitude: s.latitude,
      longitude: s.longitude,
      timeZone: s.timeZone,
    })
    const labels = {
      facts: to3(facts.strength),
      yongsin: to3(determineYongsin(simple).daymasterStrength),
      calendar: to3(natal.saju?.strength as string | undefined),
    }
    expect(labels).toEqual({ facts: 'medium', yongsin: 'medium', calendar: 'medium' })
  })
})

describe('knownDefect bookkeeping', () => {
  it('every KNOWN_DEFECTS key names a test in this file', () => {
    expect(Object.keys(KNOWN_DEFECTS).filter((k) => !usedDefects.has(k))).toEqual([])
  })
})
