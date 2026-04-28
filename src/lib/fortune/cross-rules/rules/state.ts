// State-layer rules: 원국·natal 정적 구조 교차.
// 같은 layer끼리만 교차 — 의미가 흐려지지 않게.

import { hitByKeys, hitByPrefix, noHit } from '../engine'
import type { Hit, Rule } from '../types'

// ── helpers ─────────────────────────────────────────────────
function elementCount(strength: number, threshold = 0.4): boolean {
  return strength >= threshold
}

export const stateRules: Rule[] = [
  // ── 원소 분포 (5 saju × 4 astro) ────────────────────────
  {
    id: 'self.state.fire-dominant',
    layer: 'state',
    domain: 'self',
    meaning: '에너지 과다',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 화 기운과 점성 fire 사인이 함께 강해, 추진력은 강하지만 소진되기 쉬움.',
      conflict: '사주 화는 강한데 점성 fire는 약하거나 그 반대 — 추진력의 외부 표현과 내적 동력이 어긋남.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementDominant.fire']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.fire']),
  },
  {
    id: 'self.state.water-deficient',
    layer: 'state',
    domain: 'self',
    meaning: '감정 자원 부족',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 수 결핍과 점성 water 약세가 겹쳐 감정·직관 자원이 얕음. 회복 시간을 따로 마련해야 함.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementAbsent.water']),
    astroPredicate: (a) => {
      const h = hitByKeys(a, ['astro.state.elementCount.water'])
      return h.fired && h.strength < 0.25
        ? { fired: true, strength: 1 - h.strength, evidence: h.evidence }
        : noHit
    },
  },
  {
    id: 'money.state.earth-anchor',
    layer: 'state',
    domain: 'money',
    meaning: '재물 안정 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 토 기운과 점성 earth 사인이 함께 — 천천히 쌓는 형태의 재물 안정성. 단기 투기보다 장기 축적이 자기 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementDominant.earth']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.earth']),
  },
  {
    id: 'self.state.wood-growth',
    layer: 'state',
    domain: 'self',
    meaning: '성장·시작 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 목 기운과 점성 air 사인이 함께 — 새 시작·확장·움직임에 적성. 장기 인내보다 변화 흡수에 강점.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementDominant.wood']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.air']),
  },
  {
    id: 'career.state.metal-discipline',
    layer: 'state',
    domain: 'career',
    meaning: '결단·구조화 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 금 기운과 점성 air 사인이 함께 — 분석·결단·정제. 책임 영역에서 성과 가능성 큰 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementDominant.metal']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.air']),
  },
  {
    id: 'self.state.fire-deficient',
    layer: 'state',
    domain: 'self',
    meaning: '추진력 부족',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 화 결핍과 점성 fire 약세가 겹침 — 의지·실행력 자원이 약함. 외부 자극·동기부여가 필요한 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementAbsent.fire']),
    astroPredicate: (a) => {
      const h = hitByKeys(a, ['astro.state.elementCount.fire'])
      return h.fired && h.strength < 0.2
        ? { fired: true, strength: 1 - h.strength, evidence: h.evidence }
        : noHit
    },
  },

  // ── 일간 강약 × Sun dignity (context) ───────────────────
  {
    id: 'self.state.day-master-strength',
    layer: 'state',
    domain: 'self',
    polarityHint: 'context',
    meaning: '자아 강도 — 사주·점성 일치 여부',
    narrative: {
      confirm: '사주 일간의 강약과 점성 태양의 dignity가 같은 방향을 가리킴. 자기 표현이 환경과 잘 맞음.',
      conflict: '사주에서는 자아가 강한데 점성 태양은 위축됐거나(또는 그 반대) — 내·외 자기 평가가 어긋나는 구조.',
    },
    sajuPredicate: (_, ctx) => {
      const strong = ctx.hasSaju('saju.state.dayMaster.strength.strong')
      const weak = ctx.hasSaju('saju.state.dayMaster.strength.weak')
      if (strong) return { fired: true, strength: ctx.sajuStrength('saju.state.dayMaster.strength.strong'), polarity: 'pos', evidence: { dayMaster: 'strong' } } as Hit
      if (weak) return { fired: true, strength: ctx.sajuStrength('saju.state.dayMaster.strength.weak'), polarity: 'neg', evidence: { dayMaster: 'weak' } } as Hit
      return noHit
    },
    astroPredicate: (_, ctx) => {
      const strongSun =
        ctx.hasAstro('astro.state.planet.Sun.sign.Aries') ||
        ctx.hasAstro('astro.state.planet.Sun.sign.Leo') ||
        ctx.hasAstro('astro.state.planet.Sun.house.1') ||
        ctx.hasAstro('astro.state.planet.Sun.house.10')
      const weakSun =
        ctx.hasAstro('astro.state.planet.Sun.sign.Aquarius') ||
        ctx.hasAstro('astro.state.planet.Sun.sign.Libra') ||
        ctx.hasAstro('astro.state.planet.Sun.house.12') ||
        ctx.hasAstro('astro.state.planet.Sun.house.6')
      if (strongSun) return { fired: true, strength: 0.8, polarity: 'pos', evidence: { sun: 'strong' } } as Hit
      if (weakSun) return { fired: true, strength: 0.7, polarity: 'neg', evidence: { sun: 'weak' } } as Hit
      return noHit
    },
  },

  // ── 일지 / 월지 / 시지 (궁) ─────────────────────────────
  {
    id: 'love.state.spouse-palace-emphasis',
    layer: 'state',
    domain: 'love',
    meaning: '관계 영역 본질 비중',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 일지(배우자궁)의 활성과 점성 Venus 또는 7궁 강조가 함께 — 관계가 인생 중심 테마.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Venus.house.5',
        'astro.state.planet.Venus.house.7',
        'astro.state.planet.Venus.sign.Taurus',
        'astro.state.planet.Venus.sign.Libra',
        'astro.state.planet.Venus.sign.황소자리',
        'astro.state.planet.Venus.sign.천칭자리',
      ]),
  },
  {
    id: 'family.state.parental-palace',
    layer: 'state',
    domain: 'family',
    meaning: '부모·뿌리 영역 비중',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 월지(부모·사회궁)의 활성과 점성 IC/4궁 또는 Moon의 강한 위치가 함께 — 가정·뿌리가 정체성에 큰 비중.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Moon.house.4',
        'astro.state.planet.Moon.sign.Cancer',
        'astro.state.planet.Moon.sign.게자리',
      ]),
  },
  {
    id: 'family.state.children-palace',
    layer: 'state',
    domain: 'family',
    meaning: '자녀·창조 영역',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 시지(자녀궁)의 활성과 점성 5궁 강조가 함께 — 자녀·창조 표현이 인생의 한 축.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Sun.house.5',
        'astro.state.planet.Venus.house.5',
        'astro.state.planet.Jupiter.house.5',
      ]),
  },

  // ── 십성 분포 (사주) ↔ 행성·하우스 강조 (점성) ──────────
  {
    id: 'career.state.officer-emphasis',
    layer: 'state',
    domain: 'career',
    meaning: '책임·관성 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 관성(정관/편관) 비중과 점성 Saturn dignity 또는 10궁 강조가 함께 — 책임 구조 안에서 성취가 자기 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Saturn.house.10',
        'astro.state.planet.Saturn.sign.Capricorn',
        'astro.state.planet.Saturn.sign.염소자리',
      ]),
  },
  {
    id: 'self.state.expression-strength',
    layer: 'state',
    domain: 'self',
    meaning: '표현·창조 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 식상(식신/상관) 비중과 점성 Mercury 또는 3궁/5궁 강조가 함께 — 표현·창조가 자기 발산 통로.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Mercury.house.3',
        'astro.state.planet.Mercury.house.5',
      ]),
  },
  {
    id: 'family.state.scholar-emphasis',
    layer: 'state',
    domain: 'family',
    meaning: '학습·보호 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 인성(정인/편인) 비중과 점성 Jupiter 또는 9궁 강조가 함께 — 학습·전통·보호가 인생 자원.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Jupiter.house.9',
        'astro.state.planet.Moon.house.9',
      ]),
  },
]
