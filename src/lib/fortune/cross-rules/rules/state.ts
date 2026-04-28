// State-layer rules: 원국·natal 정적 구조 교차.
// 같은 layer끼리만 교차 — 의미가 흐려지지 않게.

import { hitByKeys, hitByPrefix, noHit } from '../engine'
import type { Rule } from '../types'

export const stateRules: Rule[] = [
  {
    id: 'self.state.fire-dominant',
    layer: 'state',
    domain: 'self',
    meaning: '에너지 과다',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 화 기운과 점성 fire 사인이 함께 강해, 추진력은 강하지만 소진되기 쉬움.',
      conflict:
        '사주는 화 과다인데 점성 fire는 약하거나 그 반대 — 외향 추진과 내적 동력의 불일치.',
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
      confirm:
        '사주 수 결핍과 점성 water 약세가 겹쳐, 감정·직관 자원이 얕음. 회복 시간을 따로 마련해야 함.',
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
    id: 'self.state.day-master-strength',
    layer: 'state',
    domain: 'self',
    // Context-dependent: same Sun position means different things by 일간 강약.
    polarityHint: 'context',
    meaning: '자아 강도 — 사주·점성 일치 여부',
    narrative: {
      confirm:
        '사주 일간의 강약과 점성 태양의 dignity가 같은 방향을 가리킴. 자기 표현이 환경과 잘 맞음.',
      conflict:
        '사주에서는 자아가 강한데 점성 태양은 위축됐거나(또는 그 반대) — 내·외 자기 평가가 어긋나는 구조.',
    },
    sajuPredicate: (s, ctx) => {
      const strong = ctx.hasSaju('saju.state.dayMaster.strength.strong')
      const weak = ctx.hasSaju('saju.state.dayMaster.strength.weak')
      if (strong)
        return {
          fired: true,
          strength: ctx.sajuStrength('saju.state.dayMaster.strength.strong'),
          polarity: 'pos',
          evidence: { dayMaster: 'strong' },
        }
      if (weak)
        return {
          fired: true,
          strength: ctx.sajuStrength('saju.state.dayMaster.strength.weak'),
          polarity: 'neg',
          evidence: { dayMaster: 'weak' },
        }
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
      if (strongSun)
        return { fired: true, strength: 0.8, polarity: 'pos', evidence: { sun: 'strong' } }
      if (weakSun)
        return { fired: true, strength: 0.7, polarity: 'neg', evidence: { sun: 'weak' } }
      return noHit
    },
  },
  {
    id: 'love.state.venus-relational-emphasis',
    layer: 'state',
    domain: 'love',
    meaning: '관계 본질 비중',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주의 일지·재성 비중과 점성 Venus의 자기 별자리/관계 하우스 위치가 함께 — 관계가 인생 중심 테마.',
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
    id: 'money.state.earth-anchor',
    layer: 'state',
    domain: 'money',
    meaning: '재물 안정 본성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 토 기운과 점성 earth 사인이 함께 — 천천히 쌓는 형태의 재물 안정성. 단기 투기보다 장기 축적이 자기 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementDominant.earth']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.earth']),
  },
]
