import { describe, it, expect } from 'vitest'
import { aggregate } from '@/lib/fortune/cross-rules/aggregator'
import { hitByKeys, hitByPrefix, runRules } from '@/lib/fortune/cross-rules/engine'
import { metaRules } from '@/lib/fortune/cross-rules/metaRules'
import { allRules } from '@/lib/fortune/cross-rules/rules'
import type {
  AstroSignal,
  Rule,
  SajuSignal,
} from '@/lib/fortune/cross-rules/types'

const sig = (
  system: 'saju' | 'astro',
  layer: 'state' | 'relation' | 'timing',
  key: string,
  strength = 1,
  scale?: 'longterm' | 'decade' | 'year' | 'month' | 'day' | 'event',
): SajuSignal | AstroSignal => ({
  system,
  layer,
  scale,
  key,
  fired: true,
  strength,
  evidence: {},
}) as SajuSignal | AstroSignal

describe('engine — polarity decision', () => {
  const rule: Rule = {
    id: 'test.both-fire',
    layer: 'state',
    domain: 'self',
    meaning: 'test',
    polarityHint: 'pos',
    narrative: { confirm: 'both fire' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.x']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.y']),
  }

  it('confirms when both fire', () => {
    const matches = runRules(
      [rule],
      [sig('saju', 'state', 'saju.state.x') as SajuSignal],
      [sig('astro', 'state', 'astro.state.y') as AstroSignal],
    )
    expect(matches[0].polarity).toBe('confirm')
    // state layer prior 0.7 × min(1,1) = 0.7 → 'strong' (>=0.7)
    expect(matches[0].intensity).toBe('strong')
  })

  it('is silent when only saju fires', () => {
    const matches = runRules(
      [rule],
      [sig('saju', 'state', 'saju.state.x') as SajuSignal],
      [],
    )
    expect(matches[0].polarity).toBe('silent')
    expect(matches[0].rawWeight).toBe(0)
  })

  it('is silent when neither fires', () => {
    const matches = runRules([rule], [], [])
    expect(matches[0].polarity).toBe('silent')
  })
})

describe('engine — intensity tier', () => {
  const rule: Rule = {
    id: 'test.intensity',
    layer: 'relation',
    domain: 'love',
    meaning: 'test',
    polarityHint: 'pos',
    narrative: { confirm: '' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.x']),
    astroPredicate: (a) => hitByKeys(a, ['astro.relation.y']),
  }

  it('strong when both predicates return high strength', () => {
    const m = runRules(
      [rule],
      [sig('saju', 'relation', 'saju.relation.x', 0.9) as SajuSignal],
      [sig('astro', 'relation', 'astro.relation.y', 0.9) as AstroSignal],
    )[0]
    expect(m.intensity).toBe('strong') // min(0.9,0.9) × 1.0 = 0.9
  })

  it('weak when bottleneck strength is low', () => {
    const m = runRules(
      [rule],
      [sig('saju', 'relation', 'saju.relation.x', 0.3) as SajuSignal],
      [sig('astro', 'relation', 'astro.relation.y', 0.9) as AstroSignal],
    )[0]
    expect(m.intensity).toBe('weak')
  })
})

describe('engine — scale gating', () => {
  const yearRule: Rule = {
    id: 'test.year-only',
    layer: 'timing',
    scale: 'year',
    domain: 'money',
    meaning: 'test',
    polarityHint: 'pos',
    narrative: { confirm: '' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.x']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.y']),
  }

  it('does not match across scales (day signal vs year rule)', () => {
    const m = runRules(
      [yearRule],
      [sig('saju', 'timing', 'saju.timing.x', 1, 'day') as SajuSignal],
      [sig('astro', 'timing', 'astro.timing.y', 1, 'day') as AstroSignal],
    )[0]
    expect(m.polarity).toBe('silent')
  })

  it('matches when scales align', () => {
    const m = runRules(
      [yearRule],
      [sig('saju', 'timing', 'saju.timing.x', 1, 'year') as SajuSignal],
      [sig('astro', 'timing', 'astro.timing.y', 1, 'year') as AstroSignal],
    )[0]
    expect(m.polarity).toBe('confirm')
  })
})

describe('engine — context-dependent polarity', () => {
  const ruleMixed: Rule = {
    id: 'test.mixed',
    layer: 'state',
    domain: 'self',
    meaning: 'test',
    polarityHint: 'mixed',
    narrative: { confirm: 'c', conflict: 'x' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.x']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.y']),
  }

  it("'mixed' hint → conflict when both fire", () => {
    const m = runRules(
      [ruleMixed],
      [sig('saju', 'state', 'saju.state.x') as SajuSignal],
      [sig('astro', 'state', 'astro.state.y') as AstroSignal],
    )[0]
    expect(m.polarity).toBe('conflict')
  })
})

describe('aggregator — tone & meta', () => {
  const r = (
    domain: 'self' | 'love' | 'money' | 'career' | 'health' | 'family',
    polarityHint: 'pos' | 'neg' = 'pos',
  ): Rule => ({
    id: `r.${domain}.${polarityHint}`,
    layer: 'state',
    domain,
    meaning: '',
    polarityHint,
    narrative: { confirm: '' },
    sajuPredicate: (s) => hitByKeys(s, [`saju.state.${domain}`]),
    astroPredicate: (a) => hitByKeys(a, [`astro.state.${domain}`]),
  })

  it('positive tone when only positive confirms', () => {
    const matches = runRules(
      [r('money', 'pos')],
      [sig('saju', 'state', 'saju.state.money') as SajuSignal],
      [sig('astro', 'state', 'astro.state.money') as AstroSignal],
    )
    const report = aggregate(matches, [])
    expect(report.byDomain.money.tone).toBe('positive')
  })

  it('preserves conflicts (양면성 not discarded)', () => {
    const ruleMixed: Rule = {
      id: 'r.mixed',
      layer: 'state',
      domain: 'love',
      meaning: '',
      polarityHint: 'mixed',
      narrative: { confirm: '', conflict: '' },
      sajuPredicate: (s) => hitByKeys(s, ['saju.state.love']),
      astroPredicate: (a) => hitByKeys(a, ['astro.state.love']),
    }
    const matches = runRules(
      [ruleMixed],
      [sig('saju', 'state', 'saju.state.love') as SajuSignal],
      [sig('astro', 'state', 'astro.state.love') as AstroSignal],
    )
    const report = aggregate(matches, [])
    expect(report.byDomain.love.conflicts).toHaveLength(1)
  })

  it('detects relational-financial-strain meta theme', () => {
    const sajuS: SajuSignal[] = [
      sig('saju', 'state', 'saju.state.love.bad') as SajuSignal,
      sig('saju', 'state', 'saju.state.money.bad') as SajuSignal,
    ]
    const astroS: AstroSignal[] = [
      sig('astro', 'state', 'astro.state.love.bad') as AstroSignal,
      sig('astro', 'state', 'astro.state.money.bad') as AstroSignal,
    ]
    const negLove: Rule = {
      id: 'neg.love',
      layer: 'state',
      domain: 'love',
      meaning: '',
      polarityHint: 'neg',
      narrative: { confirm: '' },
      sajuPredicate: (s) => hitByKeys(s, ['saju.state.love.bad']),
      astroPredicate: (a) => hitByKeys(a, ['astro.state.love.bad']),
    }
    const negMoney: Rule = {
      id: 'neg.money',
      layer: 'state',
      domain: 'money',
      meaning: '',
      polarityHint: 'neg',
      narrative: { confirm: '' },
      sajuPredicate: (s) => hitByKeys(s, ['saju.state.money.bad']),
      astroPredicate: (a) => hitByKeys(a, ['astro.state.money.bad']),
    }
    const matches = runRules([negLove, negMoney], sajuS, astroS)
    const report = aggregate(matches, metaRules)
    const ids = report.themes.map((t) => t.rule.id)
    expect(ids).toContain('theme.relational-financial-strain')
  })
})

describe('rule sanity', () => {
  it('every shipped rule has narrative.confirm', () => {
    for (const rule of allRules) {
      expect(rule.narrative.confirm.length).toBeGreaterThan(0)
    }
  })

  it('mixed/context rules have narrative.conflict', () => {
    for (const rule of allRules) {
      if (rule.polarityHint === 'mixed' || rule.polarityHint === 'context') {
        expect(rule.narrative.conflict, `${rule.id} missing conflict narrative`).toBeTruthy()
      }
    }
  })

  it('timing rules declare a scale', () => {
    for (const rule of allRules) {
      if (rule.layer === 'timing') {
        expect(rule.scale, `${rule.id} timing rule missing scale`).toBeDefined()
      }
    }
  })
})

describe('hitByKeys / hitByPrefix helpers', () => {
  it('hitByKeys returns strongest match', () => {
    const signals: SajuSignal[] = [
      sig('saju', 'state', 'saju.x', 0.4) as SajuSignal,
      sig('saju', 'state', 'saju.x', 0.9) as SajuSignal,
    ]
    expect(hitByKeys(signals, ['saju.x']).strength).toBe(0.9)
  })

  it('hitByPrefix matches by prefix', () => {
    const signals: AstroSignal[] = [
      sig('astro', 'state', 'astro.relation.hard.Mars.Venus', 0.5) as AstroSignal,
    ]
    expect(hitByPrefix(signals, ['astro.relation.hard.']).fired).toBe(true)
    expect(hitByPrefix(signals, ['astro.relation.soft.']).fired).toBe(false)
  })

  it('hitByKeys returns no-hit when no signals match', () => {
    const signals: SajuSignal[] = [sig('saju', 'state', 'saju.a') as SajuSignal]
    expect(hitByKeys(signals, ['saju.zzz']).fired).toBe(false)
  })

  it('hitByPrefix considers multiple prefixes', () => {
    const signals: SajuSignal[] = [
      sig('saju', 'state', 'saju.foo.bar', 0.6) as SajuSignal,
      sig('saju', 'state', 'saju.qux.baz', 0.8) as SajuSignal,
    ]
    expect(hitByPrefix(signals, ['saju.foo.', 'saju.qux.']).strength).toBe(0.8)
  })
})

// ── extended coverage ────────────────────────────────────────
import {
  DEFAULT_META_THRESHOLDS,
  getMetaThresholds,
  resetMetaThresholds,
  setMetaThresholds,
  metaRules,
} from '@/lib/fortune/cross-rules/metaRules'

describe('rule corpus invariants', () => {
  it('has at least 100 rules', () => {
    expect(allRules.length).toBeGreaterThanOrEqual(100)
  })

  it('all rules have unique ids', () => {
    const ids = allRules.map((r) => r.id)
    const dup = ids.find((id, i) => ids.indexOf(id) !== i)
    expect(dup, `duplicate id: ${dup}`).toBeUndefined()
  })

  it('every domain has at least one rule', () => {
    const domains = new Set(allRules.map((r) => r.domain))
    for (const d of ['self', 'love', 'money', 'career', 'health', 'family']) {
      expect(domains.has(d as never), `domain ${d} has no rules`).toBe(true)
    }
  })

  it('every layer has at least one rule', () => {
    const layers = new Set(allRules.map((r) => r.layer))
    expect(layers.has('state')).toBe(true)
    expect(layers.has('relation')).toBe(true)
    expect(layers.has('timing')).toBe(true)
  })

  it('every timing rule has a valid scale', () => {
    const valid = ['longterm', 'decade', 'year', 'month', 'day', 'event']
    for (const r of allRules) {
      if (r.layer === 'timing') {
        expect(valid.includes(r.scale!), `${r.id} has invalid scale ${r.scale}`).toBe(true)
      }
    }
  })

  it('rule narrative.confirm strings are non-trivial', () => {
    for (const r of allRules) {
      expect(r.narrative.confirm.length, `${r.id} narrative too short`).toBeGreaterThan(20)
    }
  })

  it('meta-rules detect functions are pure (deterministic)', () => {
    const empty = {
      self: { domain: 'self', tone: 'neutral', confirms: [], conflicts: [], silents: [] },
      love: { domain: 'love', tone: 'neutral', confirms: [], conflicts: [], silents: [] },
      money: { domain: 'money', tone: 'neutral', confirms: [], conflicts: [], silents: [] },
      career: { domain: 'career', tone: 'neutral', confirms: [], conflicts: [], silents: [] },
      health: { domain: 'health', tone: 'neutral', confirms: [], conflicts: [], silents: [] },
      family: { domain: 'family', tone: 'neutral', confirms: [], conflicts: [], silents: [] },
    } as Parameters<typeof metaRules[number]['detect']>[0]
    for (const m of metaRules) {
      const a = m.detect(empty)
      const b = m.detect(empty)
      expect(a).toBe(b)
      expect(typeof a).toBe('boolean')
    }
  })
})

describe('engine — edge cases', () => {
  it('returns empty array when no rules given', () => {
    expect(runRules([], [], [])).toEqual([])
  })

  it('strength=0 signals do not fire predicates (silent)', () => {
    const r: Rule = {
      id: 't.zero',
      layer: 'state',
      domain: 'self',
      meaning: '',
      polarityHint: 'pos',
      narrative: { confirm: 'x' },
      sajuPredicate: (s) => hitByKeys(s, ['saju.x']),
      astroPredicate: (a) => hitByKeys(a, ['astro.y']),
    }
    const m = runRules(
      [r],
      [{ system: 'saju', layer: 'state', key: 'saju.x', fired: true, strength: 0, evidence: {} }],
      [{ system: 'astro', layer: 'state', key: 'astro.y', fired: true, strength: 0, evidence: {} }],
    )[0]
    // hitByKeys requires strength > 0 to count, so strength=0 doesn't update best.
    // Result: predicate returns no-hit → silent (correct: 0-strength = no real signal).
    expect(m.polarity).toBe('silent')
  })

  it('non-fired signals do not contribute', () => {
    const r: Rule = {
      id: 't.unfired',
      layer: 'relation',
      domain: 'love',
      meaning: '',
      polarityHint: 'pos',
      narrative: { confirm: 'x' },
      sajuPredicate: (s) => hitByKeys(s, ['saju.x']),
      astroPredicate: (a) => hitByKeys(a, ['astro.y']),
    }
    const m = runRules(
      [r],
      [{ system: 'saju', layer: 'relation', key: 'saju.x', fired: false, strength: 0.9, evidence: {} }],
      [{ system: 'astro', layer: 'relation', key: 'astro.y', fired: true, strength: 0.9, evidence: {} }],
    )[0]
    expect(m.polarity).toBe('silent')
  })
})

describe('aggregator — domain & meta interplay', () => {
  it('all 6 domains present with neutral tone if no matches', () => {
    const report = aggregate([], [])
    for (const d of ['self', 'love', 'money', 'career', 'health', 'family']) {
      expect(report.byDomain[d as never]).toBeDefined()
      expect(report.byDomain[d as never].tone).toBe('neutral')
    }
  })

  it('multiple confirms in same domain accumulate', () => {
    const r1 = (
      domain: 'self' | 'love' | 'money' | 'career' | 'health' | 'family',
      id: string,
    ): Rule => ({
      id,
      layer: 'state',
      domain,
      meaning: '',
      polarityHint: 'pos',
      narrative: { confirm: '' },
      sajuPredicate: (s) => hitByKeys(s, [`saju.${id}`]),
      astroPredicate: (a) => hitByKeys(a, [`astro.${id}`]),
    })
    const sajuS: SajuSignal[] = [
      sig('saju', 'state', 'saju.a') as SajuSignal,
      sig('saju', 'state', 'saju.b') as SajuSignal,
    ]
    const astroS: AstroSignal[] = [
      sig('astro', 'state', 'astro.a') as AstroSignal,
      sig('astro', 'state', 'astro.b') as AstroSignal,
    ]
    const matches = runRules([r1('money', 'a'), r1('money', 'b')], sajuS, astroS)
    const r = aggregate(matches, [])
    expect(r.byDomain.money.confirms).toHaveLength(2)
  })
})

describe('meta thresholds — configurable knob', () => {
  beforeEach(() => resetMetaThresholds())
  afterEach(() => resetMetaThresholds())

  it('default thresholds are applied', () => {
    const t = getMetaThresholds()
    expect(t).toEqual(DEFAULT_META_THRESHOLDS)
  })

  it('setMetaThresholds merges partials', () => {
    setMetaThresholds({ strongNegativeMinSignals: 5 })
    expect(getMetaThresholds().strongNegativeMinSignals).toBe(5)
    expect(getMetaThresholds().anyStrongConfirmMin).toBe(DEFAULT_META_THRESHOLDS.anyStrongConfirmMin)
  })

  it('resetMetaThresholds restores defaults', () => {
    setMetaThresholds({ strongNegativeMinSignals: 99 })
    resetMetaThresholds()
    expect(getMetaThresholds()).toEqual(DEFAULT_META_THRESHOLDS)
  })
})

describe('classical patterns sanity', () => {
  const classicalIds = [
    'career.state.classical-bugwi-ssang',
    'career.state.classical-gwanin',
    'money.state.classical-siksin-saengjae',
    'career.state.classical-sarin',
    'career.state.classical-yangin-hapsal',
    'self.state.classical-jongwang',
    'family.state.classical-jonggang',
    'career.state.classical-jongah',
    'money.state.classical-jongjae',
    'career.state.classical-jongsal',
    'self.state.classical-hwagi',
    'self.state.successful-pattern',
    'self.state.broken-pattern',
    'self.state.sangsin-strong',
    'career.state.classical-yangin-hapsal-fine',
  ]
  for (const id of classicalIds) {
    it(`rule "${id}" exists`, () => {
      expect(allRules.find((r) => r.id === id), `missing ${id}`).toBeDefined()
    })
  }
})

describe('Hellenistic-pattern rules sanity', () => {
  const hellenisticIds = [
    'self.state.sect-benefic-strong',
    'self.state.sect-malefic-strong',
    'money.state.fortune-lot',
    'self.timing.year.profection-lord',
    'self.state.planetary-joy',
    'career.state.spirit-lot-vocation',
    'self.timing.event.zr-loosing',
    'career.timing.year.zr-peak',
    'self.timing.year.zr-ruler-active',
    'self.timing.month.zr-l2-active',
    'self.timing.month.zr-l2-peak',
    'self.state.bonif-enclosure-malefic',
    'self.state.bonif-reception',
    'self.state.bonif-overcoming-malefic',
    'self.state.combust-key-planet',
    'self.state.cazimi-power',
  ]
  for (const id of hellenisticIds) {
    it(`rule "${id}" exists`, () => {
      expect(allRules.find((r) => r.id === id), `missing ${id}`).toBeDefined()
    })
  }
})

describe('health rules sanity', () => {
  it('has health rules for at least 5 distinct meanings', () => {
    const healthRules = allRules.filter((r) => r.domain === 'health')
    expect(healthRules.length).toBeGreaterThanOrEqual(5)
    const meanings = new Set(healthRules.map((r) => r.meaning))
    expect(meanings.size).toBeGreaterThanOrEqual(5)
  })

  it('한방 일간×오행 patterns exist for all 5 day-master elements', () => {
    const ids = [
      'health.state.wood-fire-liver-heat',
      'health.state.fire-earth-skin-heat',
      'health.state.earth-water-digestive',
      'health.state.metal-fire-respiratory',
      'health.state.water-earth-kidney',
    ]
    for (const id of ids) {
      expect(allRules.find((r) => r.id === id), `missing ${id}`).toBeDefined()
    }
  })
})

// ── 다양한 출생 조합으로 대운 방향·범위 회귀 ──
//
// 男+양년 = 순행, 男+음년 = 역행
// 女+양년 = 역행, 女+음년 = 순행
//
// year stem yin/yang:
//   1990 = 庚午 (양) / 1991 = 辛未 (음) / 1992 = 壬申 (양) /
//   1993 = 癸酉 (음) / 1994 = 甲戌 (양) / 1995 = 乙亥 (음)
describe('regression: 대운 direction across yin/yang × gender', () => {
  type Case = {
    name: string
    date: string
    time: string
    gender: 'male' | 'female'
    expectedYearGanji: string
    expectedDirection: 'forward' | 'backward'
    expectedDaeunsuRange: [number, number]
  }
  const cases: Case[] = [
    {
      name: '男+양년 → 순행 (1990-05-15 14:30 male)',
      date: '1990-05-15', time: '14:30', gender: 'male',
      expectedYearGanji: '庚午', expectedDirection: 'forward',
      expectedDaeunsuRange: [3, 10],
    },
    {
      name: '女+음년 → 순행 (1991-03-10 03:00 female)',
      date: '1991-03-10', time: '03:00', gender: 'female',
      expectedYearGanji: '辛未', expectedDirection: 'forward',
      expectedDaeunsuRange: [4, 12],
    },
    {
      name: '女+양년 → 역행 (1992-08-20 12:00 female)',
      date: '1992-08-20', time: '12:00', gender: 'female',
      expectedYearGanji: '壬申', expectedDirection: 'backward',
      expectedDaeunsuRange: [3, 8],
    },
    {
      name: '男+음년 → 역행 (1995-02-09 06:40 male)',
      date: '1995-02-09', time: '06:40', gender: 'male',
      expectedYearGanji: '乙亥', expectedDirection: 'backward',
      expectedDaeunsuRange: [1, 4],
    },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      const { calculateSajuData } = await import('@/lib/Saju/saju')
      const r = calculateSajuData(c.date, c.time, c.gender, 'solar', 'Asia/Seoul')
      const yearGanji = `${r.pillars.year.heavenlyStem.name}${r.pillars.year.earthlyBranch.name}`
      expect(yearGanji).toBe(c.expectedYearGanji)
      expect(r.daeWoon.isForward).toBe(c.expectedDirection === 'forward')
      const [lo, hi] = c.expectedDaeunsuRange
      expect(r.daeWoon.startAge).toBeGreaterThanOrEqual(lo)
      expect(r.daeWoon.startAge).toBeLessThanOrEqual(hi)
      // 대운 시퀀스가 10년 간격으로 진행
      for (let i = 1; i < r.daeWoon.list.length; i++) {
        expect(r.daeWoon.list[i].age - r.daeWoon.list[i - 1].age).toBe(10)
      }
    })
  }
})

describe('regression: unified ganji + stem/branch fields', () => {
  it('saju engine fills both ganji AND heavenlyStem/earthlyBranch on annual', async () => {
    const { calculateSajuData } = await import('@/lib/Saju/saju')
    const r = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
    const a2026 = r.unse.annual.find((x) => x.year === 2026)
    expect(a2026?.ganji).toBe('丙午')
    expect(a2026?.heavenlyStem).toBe('丙')
    expect(a2026?.earthlyBranch).toBe('午')
  })

  it('saju engine fills both ganji AND heavenlyStem/earthlyBranch on monthly', async () => {
    const { calculateSajuData } = await import('@/lib/Saju/saju')
    const r = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
    // monthly is "from current month, 12 entries forward" — not tied to birth year.
    // Just verify the first entry has all three fields.
    const m = r.unse.monthly[0]
    expect(m?.ganji).toBeTruthy()
    expect(m?.heavenlyStem).toBeTruthy()
    expect(m?.earthlyBranch).toBeTruthy()
  })
})

describe('solarTimeMode opt-in', () => {
  it('standard mode is default and preserves time', async () => {
    const { correctSolarTime } = await import('@/lib/fortune/cross-rules/adapters/solar-time')
    const r = correctSolarTime('1995-02-09', '06:40', 126.978, 'standard')
    expect(r.date).toBe('1995-02-09')
    expect(r.time).toBe('06:40')
  })

  it('meanSolar mode shifts Seoul time ~32 min earlier', async () => {
    const { correctSolarTime } = await import('@/lib/fortune/cross-rules/adapters/solar-time')
    const r = correctSolarTime('1995-02-09', '06:40', 126.978, 'meanSolar')
    expect(r.date).toBe('1995-02-09')
    // (126.978 - 135) * 4 = -32.088 min → 06:40 - 32 = 06:08
    expect(r.time).toBe('06:08')
  })

  it('trueSolar mode adds equation-of-time correction', async () => {
    const { correctSolarTime } = await import('@/lib/fortune/cross-rules/adapters/solar-time')
    const r = correctSolarTime('1995-02-09', '06:40', 126.978, 'trueSolar')
    expect(r.date).toBe('1995-02-09')
    // Feb 9 EoT ≈ -14 min → 06:40 - 32 - 14 = 05:54 (±1)
    const [hh, mm] = r.time.split(':').map(Number)
    const totalMin = hh * 60 + mm
    expect(totalMin).toBeGreaterThan(5 * 60 + 50)
    expect(totalMin).toBeLessThan(6 * 60 + 0)
  })

  it('time crossing midnight adjusts date', async () => {
    const { correctSolarTime } = await import('@/lib/fortune/cross-rules/adapters/solar-time')
    // 00:10 KST + (-32 min) = -22 min → previous day 23:38
    const r = correctSolarTime('1995-02-09', '00:10', 126.978, 'meanSolar')
    expect(r.date).toBe('1995-02-08')
    expect(r.time).toBe('23:38')
  })
})

describe('regression: 대운 calculation', () => {
  // 1995-02-09 06:40 서울 남자용 8자 + 대운 검증.
  // 이전 saju.ts:346 버그로 역행 대운수 = 11 (정답은 2). 이 테스트는
  // 그 버그가 다시 생기지 않도록 공식 결과(입춘에서 4.76일 ≈ 1.58년 → round 2)를 고정시킨다.
  it('1995-02-09 06:40 male KST → 대운수 = 2 (not 11)', async () => {
    const { calculateSajuData } = await import('@/lib/Saju/saju')
    const r = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
    expect(r.daeWoon.startAge).toBe(2)
    expect(r.daeWoon.isForward).toBe(false)
    // 시퀀스 첫 그룹: 2-11세 = 丁丑
    expect(r.daeWoon.list[0].age).toBe(2)
    expect(r.daeWoon.list[0].heavenlyStem).toBe('丁')
    expect(r.daeWoon.list[0].earthlyBranch).toBe('丑')
    // 22-31세 = 乙亥
    const cycle22 = r.daeWoon.list.find((c) => c.age === 22)
    expect(cycle22?.heavenlyStem).toBe('乙')
    expect(cycle22?.earthlyBranch).toBe('亥')
  })

  // saju 엔진의 unse.annual / unse.monthly는 stem/branch가 아니라 ganji 단일 필드만
  // 채워서, 어댑터가 기존엔 undefined로 받아 운-원국 합충이 모두 누락됐음.
  // 이 테스트는 어댑터의 ganji 분해 로직을 고정시킨다.
  it('1995-02-09 06:40 male / query 2026-04-28 → 세운·월운 stem/branch parsed', async () => {
    const { buildSajuNormalizerInput } = await import('@/lib/fortune/cross-rules/adapters/saju')
    const r = buildSajuNormalizerInput({
      birthDate: '1995-02-09', birthTime: '06:40', gender: 'male',
      timezone: 'Asia/Seoul', queryDate: new Date('2026-04-28T12:00:00+09:00'),
    })
    expect(r.currentDaeun?.heavenlyStem).toBe('乙')
    expect(r.currentDaeun?.earthlyBranch).toBe('亥')
    expect(r.currentSeun?.heavenlyStem).toBe('丙')
    expect(r.currentSeun?.earthlyBranch).toBe('午')
    expect(r.currentWolun?.heavenlyStem).toBe('癸')
    expect(r.currentWolun?.earthlyBranch).toBe('巳')
    expect(r.currentIljin?.heavenlyStem).toBe('壬')
    expect(r.currentIljin?.earthlyBranch).toBe('申')
    // 세운 합충도 잡혀야 함 (이전엔 한 개도 안 잡혔음).
    const seunRelations = (r.unseRelations ?? []).filter((u) => u.source === 'seun')
    expect(seunRelations.length).toBeGreaterThanOrEqual(1)
  })
})

describe('rule predicate purity', () => {
  it('no rule predicate throws on empty signal arrays', () => {
    const ctx = {
      hasSaju: () => false,
      hasAstro: () => false,
      sajuStrength: () => 0,
      astroStrength: () => 0,
      sajuByPrefix: () => [] as SajuSignal[],
      astroByPrefix: () => [] as AstroSignal[],
    }
    for (const rule of allRules) {
      expect(() => rule.sajuPredicate([], ctx), `${rule.id} sajuPredicate threw`).not.toThrow()
      expect(() => rule.astroPredicate([], ctx), `${rule.id} astroPredicate threw`).not.toThrow()
    }
  })
})
