// Money deep-dive rules. 재성 × 2궁/8궁 + Lot of Fortune + Jupiter dignity.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const moneyDeepRules: Rule[] = [
  // ─── state: 평생 재물 결 ─────────────────────────────────
  {
    id: 'money.state.steady-accumulator',
    layer: 'state', domain: 'money',
    meaning: '안정 축적형',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정재격 + 토 기운 + 점성 Saturn dignified 또는 2궁 stellium — 천천히 안정적으로 쌓는 형의 재물 결. 단기 변동보다 장기 누적이 본인 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.geokguk.정재격',
      'saju.state.elementDominant.earth',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.dignity.Saturn.exaltation',
      'astro.state.stellium.house.2',
      'astro.state.planet.Saturn.house.2',
    ]),
  },
  {
    id: 'money.state.dynamic-mover',
    layer: 'state', domain: 'money',
    meaning: '큰 변동·기회형',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 편재격 + 점성 Jupiter 8궁 또는 Uranus 2궁 — 큰 변동·외부 자산·투자·중개로 움직이는 결. 보수적 운영보다 기회 포착이 본인 결.',
      conflict: '큰 기회 신호와 안정 신호가 혼재 — 투자 적극성과 안전 자산의 균형이 평생 과제.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.geokguk.편재격',
      'saju.state.sibsin.strong.편재',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Jupiter.house.8',
      'astro.state.planet.Uranus.house.2',
      'astro.state.stellium.house.8',
    ]),
  },
  {
    id: 'money.state.expression-to-wealth',
    layer: 'state', domain: 'money',
    meaning: '표현·재능이 곧 자산',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 식신생재 또는 식상→재성 흐름 + 점성 5궁·2궁 같이 강조 — 본인 표현·창작·재능이 직접 재물로 전환되는 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.classicalCombo.식신생재',
      'saju.state.sibsinGroup.식상.strong',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Venus.house.2',
      'astro.state.planet.Venus.house.5',
      'astro.state.stellium.house.5',
    ]),
  },
  {
    id: 'money.state.inherited-resources',
    layer: 'state', domain: 'money',
    meaning: '상속·기반 자산',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 인성 강 또는 정재격 + 점성 4궁(부모/뿌리) 또는 8궁(상속) 강조 — 가족·부모로부터 물려받는 자산 또는 기반이 인생 한 축.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsinGroup.인성.strong',
      'saju.state.geokguk.정인격',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.stellium.house.4',
      'astro.state.stellium.house.8',
      'astro.state.planet.Jupiter.house.4',
    ]),
  },
  {
    id: 'money.state.partnership-wealth',
    layer: 'state', domain: 'money',
    meaning: '동업·결합 자산',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정재 + 정관 둘 다 살아있음 + 점성 7궁/8궁 강조 — 동업·결혼·동맹을 통한 자산 형성이 본인 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.정재',
      'saju.state.sibsin.strong.정관',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.stellium.house.7',
      'astro.state.stellium.house.8',
      'astro.state.planet.Jupiter.house.7',
    ]),
  },
  {
    id: 'money.state.outflow-pattern',
    layer: 'state', domain: 'money',
    meaning: '지출·소실 패턴',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 비겁 강 + 재성 약 + 점성 2궁 ruler가 12궁 또는 Saturn-Venus hard — 들어오는 만큼 나가는 결. 지출 통제 시스템이 평생 중요.',
    },
    sajuPredicate: (s, ctx) => {
      const bigeop = ctx.hasSaju('saju.state.sibsinGroup.비겁.strong')
      const lowJae = !ctx.hasSaju('saju.state.sibsinGroup.재성.strong')
      if (bigeop && lowJae) return { fired: true, strength: 0.85, evidence: { bigeop: 'strong', jaeseong: 'low' } }
      return { fired: false, strength: 0, evidence: {} }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.relation.aspect.Saturn.square.Venus',
      'astro.relation.aspect.Saturn.opposition.Venus',
    ]),
  },
  {
    id: 'money.state.hidden-wealth',
    layer: 'state', domain: 'money',
    meaning: '잠재 자산',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 지장간에 재성 다수 + 점성 8궁 또는 12궁 강조 — 표면 안 드러난 잠재 자산·기회가 인생 결에 박혀 있음. 적기에 발견·활용.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.jijanggan.']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.stellium.house.8',
      'astro.state.stellium.house.12',
    ]),
  },
  {
    id: 'money.state.creative-wealth',
    layer: 'state', domain: 'money',
    meaning: '창작·콘텐츠 자산',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 식신·상관 강 + 점성 5궁 ruler가 2궁 또는 Venus 강 — 창작·저작권·콘텐츠로 형성되는 자산이 본인 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.식신',
      'saju.state.sibsin.strong.상관',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Venus.house.2',
      'astro.state.dignity.Venus.domicile',
    ]),
  },

  // ─── timing: 재물 시기 ───────────────────────────────────
  {
    id: 'money.timing.year.peak-income',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '수입 정점의 해',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 정재 + 점성 SR Jupiter 2궁 또는 Jupiter trine natal Sun — 수입·재물이 정점에 도달하는 해. 협상·계약에 유리.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정재']),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.solarReturn.Jupiter.house.2',
      'astro.timing.transit.Jupiter.trine.natal.Sun',
      'astro.timing.transit.Jupiter.conjunction.natal.Venus',
    ]),
  },
  {
    id: 'money.timing.year.investment-window',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '투자·확장 호기',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 편재 + 점성 Jupiter가 8궁 또는 11궁 transit — 큰 결정·투자·확장에 적합한 해. 다만 리스크 관리 동반.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편재']),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.transit.Jupiter.house.8',
      'astro.timing.transit.Jupiter.house.11',
    ]),
  },
  {
    id: 'money.timing.year.tightening',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '재정 조이기·긴축',
    polarityHint: 'neg',
    narrative: {
      confirm: '세운에서 비겁 강 또는 재성 충 + 점성 Saturn이 2궁/8궁 hard transit — 재정 압박·지출 증가·긴축 필요한 해.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.seun.sibsin.비견',
      'saju.timing.seun.sibsin.겁재',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.house.2',
      'astro.timing.transit.Saturn.house.8',
      'astro.timing.transit.Saturn.square.natal.Venus',
    ]),
  },
  {
    id: 'money.timing.year.unexpected-income',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '예상 외 수입',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 편재 + 점성 Uranus가 2궁 또는 8궁 자극 — 예상 못 한 수입·기회·상속·갑작스런 변동. 빠른 의사결정 필요.',
      conflict: '예측 불가 변동 — 받아들이고 빠르게 흡수하는 능력이 결과를 가르는 해.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편재']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Uranus.house.2',
      'astro.timing.transit.Uranus.house.8',
      'astro.timing.transit.Uranus.conjunction.natal.Venus',
    ]),
  },
  {
    id: 'money.timing.year.contract-fortune',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '계약·합의 호기',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 정관 + 점성 Jupiter trine natal Saturn 또는 7궁 활성 — 계약·합의·동업으로 자산 형성에 유리한 해.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.timing.seun.sibsin.정관',
      'saju.timing.seun.sibsin.정재',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.transit.Jupiter.trine.natal.Saturn',
      'astro.timing.transit.Jupiter.house.7',
    ]),
  },
  {
    id: 'money.timing.year.transformation',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '재정 구조 재편',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 편관 + 점성 Pluto가 2궁/8궁 hard transit — 재정 구조의 깊은 재편. 큰 정리·재구성을 거쳐 다음 단계로 가는 해.',
      conflict: '재편 신호와 안정 신호가 혼재 — 큰 정리할지 그대로 유지할지 의식적 선택.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편관']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Pluto.house.2',
      'astro.timing.transit.Pluto.house.8',
      'astro.timing.transit.Pluto.square.natal.Venus',
    ]),
  },
  {
    id: 'money.timing.month.cash-flow',
    layer: 'timing', scale: 'month', domain: 'money',
    meaning: '이번 달 현금 흐름',
    polarityHint: 'pos',
    narrative: {
      confirm: '월운 재성 + 점성 Lunar Return Venus 또는 Jupiter 2궁 — 한 달 단위 수입·결제 사이클 활성. 청구·정산에 유리.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.wolun.sibsin.정재',
      'saju.timing.wolun.sibsin.편재',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.lunarReturn.Venus.house.2',
      'astro.timing.lunarReturn.Jupiter.house.2',
    ]),
  },
  {
    id: 'money.timing.event.wealth-axis-shift',
    layer: 'timing', scale: 'event', domain: 'money',
    meaning: '재물 축 변동',
    polarityHint: 'mixed',
    narrative: {
      confirm: '점성 outer planet이 natal 2궁/8궁 ruler 자극 + 사주 운에 재성 충 발화 — 평생 재물 구조의 큰 전환점.',
      conflict: '구조적 재편과 표면 안정이 동시에 — 부분 정리하면서 핵심은 유지하는 균형.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.conjunction.natal.Venus',
      'astro.timing.transit.Pluto.conjunction.natal.Venus',
      'astro.timing.transit.Uranus.conjunction.natal.Venus',
    ]),
  },
]
