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
})
