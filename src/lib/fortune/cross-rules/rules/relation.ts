// Relation-layer rules: 원국 합/충/형 ↔ natal aspects (정적 사건 구조).

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const relationRules: Rule[] = [
  {
    id: 'love.relation.partner-conflict',
    layer: 'relation',
    domain: 'love',
    meaning: '배우자궁 흔들림 — 관계 스트레스 잠재',
    polarityHint: 'neg',
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.day.지지충', 'saju.relation.day.지지형']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.relation.hard.Venus.',
        'astro.relation.hard.Mars.Venus',
      ]),
  },
  {
    id: 'self.relation.harmony',
    layer: 'relation',
    domain: 'self',
    meaning: '내적 통합·자기 일치성',
    polarityHint: 'pos',
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.지지육합', 'saju.relation.지지삼합']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.soft.Sun.']),
  },
]
