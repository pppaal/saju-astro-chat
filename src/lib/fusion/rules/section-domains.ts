// Cross-rules for the report sections that previously had no fusion domain:
// children(자녀) / wisdom(학업·지혜) / creativity(창작) / spirituality(영성).
// These give those sections a saju×astro "both systems agree" layer.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const sectionDomainRules: Rule[] = [
  // ── children (자녀) ─────────────────────────────────────
  {
    id: 'children.state.bright-creative-bond',
    layer: 'state',
    domain: 'children',
    meaning: '밝고 창조적인 자녀 인연',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 식상 또는 자녀궁(시지) 식신·상관 + 점성 5궁(창조)에 목성·달 — 자녀·후세와 밝고 창조적으로 이어지는 결. 함께 만들고 노는 시간이 인연을 키워요.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.sibsinGroup.식상.strong',
        'saju.state.palace.자녀.sibsin.식신',
        'saju.state.palace.자녀.sibsin.상관',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Jupiter.house.5',
        'astro.state.planet.Moon.house.5',
        'astro.state.stellium.house.5',
      ]),
  },
  {
    id: 'children.state.devoted-careful',
    layer: 'state',
    domain: 'children',
    meaning: '늦거나 적되 깊은 자녀 인연',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 자녀 자리 공망 + 점성 토성 5궁 — 자녀 인연이 늦거나 수가 적은 대신 깊은 헌신으로 이어지는 결.',
      conflict: '자녀를 향한 갈망과 신중함이 함께 — 시기와 준비도의 균형이 과제.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.공망']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.planet.Saturn.house.5']),
  },

  // ── wisdom (학업·지혜) ──────────────────────────────────
  {
    id: 'wisdom.state.scholar-path',
    layer: 'state',
    domain: 'wisdom',
    meaning: '배움·연구가 평생 자산',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 인성 강 또는 정인격 + 점성 9궁(확장·학문)에 목성·수성 — 배움·연구·가르침이 평생 자산이 되는 결. 깊이 파고들수록 길이 열려요.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.sibsinGroup.인성.strong', 'saju.state.geokguk.정인격']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Jupiter.house.9',
        'astro.state.planet.Mercury.house.9',
        'astro.state.stellium.house.9',
      ]),
  },
  {
    id: 'wisdom.state.intuitive-insight',
    layer: 'state',
    domain: 'wisdom',
    meaning: '직관·통찰형 앎',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 편인 + 점성 수성 내면(12궁) 또는 해왕성 학문(9궁) 자극 — 자료를 넘어 직관·통찰로 알아채는 결. 남다른 각도의 이해가 강점.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.sibsin.strong.편인']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Mercury.house.12',
        'astro.state.planet.Neptune.house.9',
        'astro.state.stellium.house.9',
      ]),
  },

  // ── creativity (창작) ──────────────────────────────────
  {
    id: 'creativity.state.expressive-gift',
    layer: 'state',
    domain: 'creativity',
    meaning: '표현·창작 재능',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 상관 강 또는 식신격 + 점성 5궁 금성 — 표현·창작 재능이 또렷하게 드러나는 결. 만든 것을 내보일수록 빛나요.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.sibsin.strong.상관', 'saju.state.geokguk.식신격']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.planet.Venus.house.5', 'astro.state.stellium.house.5']),
  },
  {
    id: 'creativity.state.solitary-art',
    layer: 'state',
    domain: 'creativity',
    meaning: '고독 속에서 익는 예술성',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 화개 + 점성 해왕성 5궁 또는 5궁 강조 — 혼자 깊이 들어가는 시간이 작품의 색을 만드는 결.',
      conflict: '몰입과 고립의 경계 — 세상과 연결되는 통로를 하나 두는 게 균형.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.shinsal.화개']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.planet.Neptune.house.5', 'astro.state.stellium.house.5']),
  },

  // ── spirituality (영성) ────────────────────────────────
  {
    id: 'spirituality.state.mystic-bent',
    layer: 'state',
    domain: 'spirituality',
    meaning: '영적·신비 지향',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 화개 또는 편인 + 점성 해왕성 12궁 또는 12궁(내면) 강조 — 영적·신비 지향이 평생 주제가 되는 결. 혼자 사유하는 시간이 길이 돼요.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.shinsal.화개', 'saju.state.sibsin.strong.편인']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Neptune.house.12',
        'astro.state.planet.Sun.house.12',
        'astro.state.stellium.house.12',
      ]),
  },
  {
    id: 'spirituality.state.empty-gate',
    layer: 'state',
    domain: 'spirituality',
    meaning: '비움이 영적 출구',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 공망 + 점성 12궁(내면) 강조 — 채워지지 않는 빈자리가 오히려 영적 출구가 되는 결.',
      conflict: '비움의 평온과 공허감이 함께 — 그 빈자리를 사유로 채우는 게 과제.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.공망']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.stellium.house.12', 'astro.state.planet.Neptune.house.12']),
  },
]
