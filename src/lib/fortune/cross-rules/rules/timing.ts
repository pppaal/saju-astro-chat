// Timing-layer rules: 대운/세운 ↔ transit (시점 활성화 사건).

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const timingRules: Rule[] = [
  {
    id: 'money.timing.expansion',
    layer: 'timing',
    domain: 'money',
    meaning: '재물 확장기 — 수입·기회 증가',
    polarityHint: 'pos',
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.timing.daeun.sibsin.정재',
        'saju.timing.daeun.sibsin.편재',
        'saju.timing.seun.sibsin.정재',
        'saju.timing.seun.sibsin.편재',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.timing.transit.Jupiter.house.2',
        'astro.timing.transit.Jupiter.house.8',
      ]),
  },
  {
    id: 'self.timing.pressure',
    layer: 'timing',
    domain: 'self',
    meaning: '자아·정체성 압박 — 책임·시험기',
    polarityHint: 'neg',
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.timing.daeun.sibsin.편관',
        'saju.timing.seun.sibsin.편관',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.timing.transit.Saturn.', 'astro.timing.transit.Pluto.']),
  },
]
