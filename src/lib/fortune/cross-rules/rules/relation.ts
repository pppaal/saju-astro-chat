// Relation-layer rules: 원국 합/충/형/파/해/생극 ↔ natal aspects.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const relationRules: Rule[] = [
  // ── 충 / opposition ─────────────────────────────────────
  {
    id: 'love.relation.partner-conflict',
    layer: 'relation',
    domain: 'love',
    meaning: '배우자궁 흔들림',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 일지의 충/형과 점성 Venus의 hard aspect가 함께 — 관계 안에 구조적 마찰점이 박혀 있음.',
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
    id: 'family.relation.root-tension',
    layer: 'relation',
    domain: 'family',
    meaning: '가정·뿌리 긴장',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 월지의 충/형과 점성 Moon의 hard aspect가 함께 — 원가족·정서 기반에 구조적 긴장이 잠복.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.지지충', 'saju.relation.지지형']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.hard.Moon.']),
  },
  {
    id: 'self.relation.identity-clash',
    layer: 'relation',
    domain: 'self',
    meaning: '자아 충돌 구조',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 천간충과 점성 Sun의 hard aspect가 함께 — 정체성 안에 두 힘이 부딪치는 내적 구조.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.천간충']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.hard.Sun.']),
  },
  {
    id: 'career.relation.authority-friction',
    layer: 'relation',
    domain: 'career',
    meaning: '권위·책임 마찰',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 관성 위치의 형충과 점성 Saturn의 hard aspect가 함께 — 권위·시스템과의 갈등이 구조적으로 박혀 있음.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.지지충', 'saju.relation.지지형']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.hard.Saturn.']),
  },

  // ── 합 / soft aspects ───────────────────────────────────
  {
    id: 'self.relation.harmony',
    layer: 'relation',
    domain: 'self',
    meaning: '내적 통합',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주의 육합·삼합과 점성 태양의 부드러운 aspect가 함께 — 자기 일치성이 높고 내적 갈등이 적은 구조.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.지지육합', 'saju.relation.지지삼합']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.soft.Sun.']),
  },
  {
    id: 'love.relation.bond-formation',
    layer: 'relation',
    domain: 'love',
    meaning: '관계 결합 흐름',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 천간합·일지 합과 점성 Venus의 부드러운 aspect 또는 Venus-Moon 합이 함께 — 관계 결합·유대 형성이 자연스러운 구조.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.천간합', 'saju.relation.지지육합']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.soft.Venus.']),
  },
  {
    id: 'family.relation.flow',
    layer: 'relation',
    domain: 'family',
    meaning: '가정 자원 흐름',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 지지삼합과 점성 Moon의 부드러운 aspect가 함께 — 정서·가정 자원이 잘 순환하는 구조.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.지지삼합']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.soft.Moon.']),
  },
  {
    id: 'money.relation.gain-flow',
    layer: 'relation',
    domain: 'money',
    meaning: '재물 자원 흐름',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 천간합·지지합과 점성 Jupiter 또는 Venus의 trine/sextile이 함께 — 재물·자원의 자연스런 유입 구조.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.천간합', 'saju.relation.지지육합']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.relation.soft.Jupiter.', 'astro.relation.soft.Venus.']),
  },

  // ── 형 / T-square ───────────────────────────────────────
  {
    id: 'self.relation.three-way-pressure',
    layer: 'relation',
    domain: 'self',
    meaning: '3자 압박 구조',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 지지형(인사신/축술미/자묘)과 점성 T-square 패턴이 함께 — 3자 갈등이 인생 구조에 박혀 있어 자아 표현에 압박.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.지지형']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.hard.']),
  },

  // ── 파 / 해 / 원진 → minor hard ─────────────────────────
  {
    id: 'self.relation.minor-friction',
    layer: 'relation',
    domain: 'self',
    meaning: '미세 균열·어긋남',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 파/해/원진과 점성 quincunx/semi-square 패턴이 함께 — 큰 충돌은 아니나 지속적 어긋남이 잠재.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.relation.지지파', 'saju.relation.지지해', 'saju.relation.원진']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.aspect.']),
  },
]
