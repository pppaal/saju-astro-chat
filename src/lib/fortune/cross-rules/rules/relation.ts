// Relation-layer rules: 원국 합/충/형 ↔ natal aspects (정적 사건 구조).

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const relationRules: Rule[] = [
  {
    id: 'love.relation.partner-conflict',
    layer: 'relation',
    domain: 'love',
    meaning: '배우자궁 흔들림',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일지의 충/형과 점성 Venus의 hard aspect가 함께 — 관계 안에 구조적 마찰점이 박혀 있음.',
    },
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
    meaning: '내적 통합',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주의 육합·삼합과 점성 태양의 부드러운 aspect가 함께 — 자기 일치성이 높고 내적 갈등이 적은 구조.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.지지육합', 'saju.relation.지지삼합']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.soft.Sun.']),
  },
  {
    id: 'family.relation.root-tension',
    layer: 'relation',
    domain: 'family',
    meaning: '가정·뿌리의 잠재 긴장',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 월지의 형충과 점성 Moon의 hard aspect가 함께 — 원가족·정서 기반에 구조적 긴장이 잠복.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.지지충', 'saju.relation.지지형']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.hard.Moon.']),
  },
]
