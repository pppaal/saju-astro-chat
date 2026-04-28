// State-layer rules: 원국·natal 정적 구조 교차.
// 같은 layer끼리만 교차 — 의미가 흐려지지 않게.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const stateRules: Rule[] = [
  {
    id: 'self.state.fire-dominant',
    layer: 'state',
    domain: 'self',
    meaning: '에너지·자기표현 과다 — 추진력 강하나 소진 위험',
    polarityHint: 'mixed',
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementCount.fire']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementCount.fire']),
  },
  {
    id: 'self.state.water-deficient',
    layer: 'state',
    domain: 'self',
    meaning: '감정·직관 자원 부족 — 회복·휴식 필요',
    polarityHint: 'neg',
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.elementAbsent.water']),
    astroPredicate: (a) => {
      const h = hitByKeys(a, ['astro.state.elementCount.water'])
      // 수 원소 사인이 25% 미만이면 결핍으로 간주
      return h.fired && h.strength < 0.25
        ? { fired: true, strength: 1 - h.strength, evidence: h.evidence }
        : { fired: false, strength: 0, evidence: {} }
    },
  },
  {
    id: 'love.state.venus-relational-emphasis',
    layer: 'state',
    domain: 'love',
    meaning: '관계·사랑 영역에 본질적 비중',
    polarityHint: 'pos',
    // 사주 측: 일간 기준 정재/편재의 존재(투출)를 근사
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.dayMaster.element.']),
    // 점성 측: Venus가 7th/5th 하우스 또는 자기 별자리(Taurus/Libra)
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
]
