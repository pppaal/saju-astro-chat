// Timing-layer rules: 대운/세운/월운/일진 ↔ transit/return/profection.
// 각 룰의 `scale`로 같은 시간 스케일끼리만 매칭됨.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const timingRules: Rule[] = [
  // ─────────────────────────────────────────────────────────
  // DECADE scale (10년) — 대운 ↔ outer planet cycle
  // ─────────────────────────────────────────────────────────
  {
    id: 'money.timing.decade.expansion',
    layer: 'timing', scale: 'decade', domain: 'money',
    meaning: '10년 재물 확장 국면',
    polarityHint: 'pos',
    narrative: { confirm: '대운 재성과 외행성(목성·토성)의 재물 하우스 통과가 함께 — 10년 단위로 재물 기반이 확장되는 국면.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.daeun.sibsin.정재', 'saju.timing.daeun.sibsin.편재']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.transit.Jupiter.house.2', 'astro.timing.transit.Jupiter.house.8']),
  },
  {
    id: 'career.timing.decade.responsibility',
    layer: 'timing', scale: 'decade', domain: 'career',
    meaning: '책임 강화 10년',
    polarityHint: 'neg',
    narrative: { confirm: '대운 관성과 토성의 직업 하우스 통과가 함께 — 책임·구조화 압박이 10년 흐름의 중심 테마.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.daeun.sibsin.정관', 'saju.timing.daeun.sibsin.편관']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.transit.Saturn.house.10', 'astro.timing.transit.Saturn.house.6']),
  },
  {
    id: 'family.timing.decade.learning',
    layer: 'timing', scale: 'decade', domain: 'family',
    meaning: '확장·학습 10년',
    polarityHint: 'pos',
    narrative: { confirm: '대운 인성과 목성의 9궁/4궁 통과가 함께 — 학습·이주·뿌리 재정의의 10년 흐름.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.daeun.sibsin.정인', 'saju.timing.daeun.sibsin.편인']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.transit.Jupiter.house.9', 'astro.timing.transit.Jupiter.house.4']),
  },
  {
    id: 'self.timing.decade.expression',
    layer: 'timing', scale: 'decade', domain: 'career',
    meaning: '표현·창조 10년',
    polarityHint: 'pos',
    narrative: { confirm: '대운 식상과 Mercury/Venus의 표현 하우스 통과가 함께 — 창작·발신·콘텐츠가 핵심 동력.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.daeun.sibsin.식신', 'saju.timing.daeun.sibsin.상관']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.transit.Mercury.house.5', 'astro.timing.transit.Venus.house.5']),
  },
  {
    id: 'self.timing.decade.self-emphasis',
    layer: 'timing', scale: 'decade', domain: 'self',
    meaning: '자아 강화 10년',
    polarityHint: 'pos',
    narrative: { confirm: '대운 비겁과 Mars의 1궁 통과가 함께 — 자아·독립·주도성이 10년의 키워드.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.daeun.sibsin.비견', 'saju.timing.daeun.sibsin.겁재']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.transit.Mars.house.1']),
  },

  // ─────────────────────────────────────────────────────────
  // YEAR scale (1년) — 세운 ↔ Solar Return / annual transit
  // ─────────────────────────────────────────────────────────
  {
    id: 'money.timing.year.stable-income',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '올해 안정 수입',
    polarityHint: 'pos',
    narrative: { confirm: '세운 정재와 Solar Return의 2궁/Jupiter 강조가 함께 — 안정적 수입 흐름이 올해 강조됨.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정재']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.solarReturn.Jupiter.house.', 'astro.timing.solarReturn.Venus.house.2']),
  },
  {
    id: 'money.timing.year.variable-income',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '올해 변동 재물',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 편재와 Solar Return 8궁 강조 또는 Jupiter 8궁 통과가 함께 — 큰 변동·기회와 동시에 리스크가 강조되는 한 해.',
      conflict: '편재 신호와 보수 신호가 혼재 — 적극적 확장 vs 자산 보호의 양면적 결정 시기.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편재']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.solarReturn.Jupiter.house.8', 'astro.timing.transit.Jupiter.house.8']),
  },
  {
    id: 'career.timing.year.stability',
    layer: 'timing', scale: 'year', domain: 'career',
    meaning: '올해 직업 안정',
    polarityHint: 'pos',
    narrative: { confirm: '세운 정관과 Solar Return 10궁의 benefic 배치가 함께 — 직장·역할 안정과 평판 강화의 해.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정관']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.solarReturn.Saturn.house.10', 'astro.timing.solarReturn.Jupiter.house.10']),
  },
  {
    id: 'self.timing.year.pressure',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '올해 자아 압박',
    polarityHint: 'neg',
    narrative: { confirm: '세운 편관과 토성/명왕성의 hard 트랜짓이 함께 — 자아·정체성에 시험·책임 압력이 가중되는 한 해.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편관']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.transit.Saturn.', 'astro.timing.transit.Pluto.']),
  },
  {
    id: 'family.timing.year.learning-protection',
    layer: 'timing', scale: 'year', domain: 'family',
    meaning: '올해 보호·학습',
    polarityHint: 'pos',
    narrative: { confirm: '세운 정인과 Solar Return 9궁/4궁 강조가 함께 — 학습·정서적 보호·가정 회복의 해.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정인']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.solarReturn.Jupiter.house.9', 'astro.timing.solarReturn.Moon.house.4']),
  },
  {
    id: 'family.timing.year.unconventional-learning',
    layer: 'timing', scale: 'year', domain: 'family',
    meaning: '올해 비정형 학습',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 편인과 Neptune·Uranus의 트랜짓이 함께 — 정통과 다른 방식의 학습·영적 통찰이 들어오는 해.',
      conflict: '학습 신호가 양쪽에서 다르게 잡힘 — 정통 학습 vs 직관적 깨달음의 양면.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편인']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.transit.Neptune.', 'astro.timing.transit.Uranus.']),
  },
  {
    id: 'career.timing.year.pleasant-expression',
    layer: 'timing', scale: 'year', domain: 'career',
    meaning: '올해 즐거운 표현',
    polarityHint: 'pos',
    narrative: { confirm: '세운 식신과 Solar Return 5궁/Venus 강조가 함께 — 표현·창작·즐거움이 자연스러운 해.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.식신']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.solarReturn.Venus.house.5', 'astro.timing.solarReturn.Sun.house.5']),
  },
  {
    id: 'career.timing.year.challenging-expression',
    layer: 'timing', scale: 'year', domain: 'career',
    meaning: '올해 도전적 표현',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 상관과 Mercury/Mars의 hard 트랜짓이 함께 — 발언·창작이 강한 한 해이나 마찰·논쟁 가능성도 큼.',
      conflict: '표현 욕구와 외부 수용성이 어긋남 — 발신 시점과 톤 조절이 핵심.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.상관']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.transit.Mercury.', 'astro.timing.transit.Mars.']),
  },
  {
    id: 'self.timing.year.assertion',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '올해 자기 주장',
    polarityHint: 'pos',
    narrative: { confirm: '세운 비견과 Mars의 1궁 트랜짓이 함께 — 독립·주도·자기 영역 강화의 해.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.비견']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.transit.Mars.house.1']),
  },
  {
    id: 'self.timing.year.competition',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '올해 경쟁·충돌',
    polarityHint: 'neg',
    narrative: { confirm: '세운 겁재와 Mars의 hard 트랜짓이 함께 — 경쟁자·동료 마찰이 두드러지는 해. 협력 구조 점검 필요.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.겁재']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.transit.Mars.']),
  },
  {
    id: 'love.timing.year.relationship-shift',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '올해 관계 변동',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 재성과 Solar Return 7궁/Venus 활성이 같이 — 관계 시작·정리·재정의의 해.',
      conflict: '관계 신호가 양쪽에서 다르게 잡힘 — 외형적 안정과 내면적 변화가 어긋나는 양면적 한 해.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.seun.sibsin.정재', 'saju.timing.seun.sibsin.편재']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.solarReturn.Venus.house.7', 'astro.timing.solarReturn.Venus.house.5']),
  },
  {
    id: 'self.timing.year.profection-active',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '연 활성 하우스',
    polarityHint: 'pos',
    narrative: { confirm: 'Annual profection으로 활성화된 하우스 영역과 사주 세운의 같은 도메인 시그널이 겹침 — 그 영역이 올해 핵심 무대.' },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.seun.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.profection.house.']),
  },

  // ─────────────────────────────────────────────────────────
  // MONTH scale (1달) — 월운 ↔ Lunar Return
  // ─────────────────────────────────────────────────────────
  {
    id: 'self.timing.month.tension',
    layer: 'timing', scale: 'month', domain: 'self',
    meaning: '이번 달 자아 긴장',
    polarityHint: 'neg',
    narrative: { confirm: '월운 편관과 Lunar Return의 1궁/10궁 Mars 강조가 함께 — 한 달 단위로 압박감이 누적.' },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.wolun.sibsin.편관']),
    astroPredicate: (a) => hitByKeys(a, ['astro.timing.lunarReturn.Mars.house.1', 'astro.timing.lunarReturn.Mars.house.10']),
  },
  {
    id: 'money.timing.month.flow',
    layer: 'timing', scale: 'month', domain: 'money',
    meaning: '이번 달 재물 흐름',
    polarityHint: 'pos',
    narrative: { confirm: '월운 재성과 Lunar Return의 2궁/Venus 강조가 함께 — 단기 수입·결제 사이클에 유리.' },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.wolun.sibsin.정재', 'saju.timing.wolun.sibsin.편재']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.lunarReturn.Venus.house.2', 'astro.timing.lunarReturn.Jupiter.house.2']),
  },
  {
    id: 'career.timing.month.expression',
    layer: 'timing', scale: 'month', domain: 'career',
    meaning: '이번 달 발신·발표',
    polarityHint: 'pos',
    narrative: { confirm: '월운 식상과 Lunar Return Mercury 활성이 함께 — 한 달간 발신·콘텐츠·미팅에 유리.' },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.wolun.sibsin.식신', 'saju.timing.wolun.sibsin.상관']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.lunarReturn.Mercury.']),
  },

  // ─────────────────────────────────────────────────────────
  // DAY scale (1일) — 일진 ↔ daily transit
  // ─────────────────────────────────────────────────────────
  {
    id: 'money.timing.day.friction',
    layer: 'timing', scale: 'day', domain: 'money',
    meaning: '오늘 재정 마찰',
    polarityHint: 'neg',
    narrative: { confirm: '일진과 일일 트랜짓이 함께 재정 영역을 건드림 — 오늘은 큰 결제·계약을 미루는 게 안전.' },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.iljin.sibsin.편재', 'saju.timing.iljin.sibsinJi.편재']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Mars.square.natal.Venus',
      'astro.timing.transit.Saturn.opposition.natal.Venus',
    ]),
  },

  // ─────────────────────────────────────────────────────────
  // EVENT scale — composite activations (잠복 → 발화)
  // ─────────────────────────────────────────────────────────
  {
    id: 'self.timing.event.dormant-activated',
    layer: 'timing', scale: 'event', domain: 'self',
    meaning: '잠복 약점 활성화',
    polarityHint: 'neg',
    narrative: { confirm: '평소 잠잠하던 원국·natal의 약한 자리가 양 시스템에서 동시에 발화 — 표면화되는 시기. 회피 말고 직면 권장.' },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.event.activate.']),
  },
  {
    id: 'love.timing.event.spouse-activation',
    layer: 'timing', scale: 'event', domain: 'love',
    meaning: '배우자궁 활성화',
    polarityHint: 'mixed',
    narrative: {
      confirm: '운이 일지(배우자궁)와 합/충 발동, 동시에 transit이 natal Venus 활성 — 관계의 큰 사건이 표면화.',
      conflict: '배우자궁 활성이 합과 충 양쪽으로 잡힘 — 정리와 결합 신호가 같이 들어오는 분기점.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.event.activate.Venus']),
  },
  {
    id: 'career.timing.event.career-activation',
    layer: 'timing', scale: 'event', domain: 'career',
    meaning: '직업 결착 활성화',
    polarityHint: 'mixed',
    narrative: {
      confirm: '운이 원국 관성과 합/충 발동, 동시에 transit이 natal Saturn/MC 활성 — 직업·역할 변동의 결정적 시점.',
      conflict: '안정 신호와 변동 신호가 혼재 — 머무를지 옮길지 분기되는 시점.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.event.activate.Saturn']),
  },
]
