// Love deep-dive rules. 일지(배우자궁) × 7궁/Venus + 십성·신살·dignity.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const loveDeepRules: Rule[] = [
  // ─── state: 평생 관계 결 ─────────────────────────────────
  {
    id: 'love.state.spouse-element-match',
    layer: 'state', domain: 'love',
    meaning: '배우자 오행과 본인 일간 상생',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 일지(배우자궁) 오행이 일간을 생하거나 일간이 생하는 관계 + 점성 Venus가 ASC sign과 친화 사인 — 본인을 도울 배우자상이 평생에 박힘.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.palace.배우자.element.']),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.dignity.Venus.domicile',
      'astro.state.dignity.Venus.exaltation',
    ]),
  },
  {
    id: 'love.state.early-marriage',
    layer: 'state', domain: 'love',
    meaning: '이른 결합 결',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정재 천간 투출 + 일지 합·삼합 + 점성 Venus angular(1·4·7·10궁) — 비교적 이른 시기에 안정 결합 가능한 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.정재',
      'saju.state.palace.배우자.sibsin.정재',
      'saju.state.palace.배우자.sibsin.정관',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Venus.house.1',
      'astro.state.planet.Venus.house.4',
      'astro.state.planet.Venus.house.7',
      'astro.state.planet.Venus.house.10',
    ]),
  },
  {
    id: 'love.state.late-marriage',
    layer: 'state', domain: 'love',
    meaning: '늦은 결합 결',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 일지 공망 또는 화개·관성 부재 + 점성 Saturn 7궁 또는 Venus retrograde — 결합이 늦거나 의식적 시점 선택이 필요한 결. 깊이는 갖춤.',
      conflict: '늦은 결합 신호와 조기 결합 신호가 혼재 — 결혼 시기에 대한 외부·내부 기대가 충돌 가능.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.relation.day.공망',
      'saju.state.shinsal.화개',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Saturn.house.7',
      'astro.state.retrograde.Venus',
    ]),
  },
  {
    id: 'love.state.romantic-magnetism',
    layer: 'state', domain: 'love',
    meaning: '관계 자성 — 끌어당기는 결',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 도화살 또는 홍염 + 점성 Venus·Mars 합 또는 5궁 강조 — 관계에서 끌어당기는 자성이 평생 강한 결. 다만 선택권을 가지는 입장.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.shinsal.도화',
      'saju.state.shinsal.홍염',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.relation.aspect.Venus.conjunction.Mars',
      'astro.state.stellium.house.5',
      'astro.state.planet.Venus.house.5',
    ]),
  },
  {
    id: 'love.state.partnership-orientation',
    layer: 'state', domain: 'love',
    meaning: '파트너십 지향',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정관 강 + 점성 Libra ASC 또는 7궁 ruler가 angular — 둘이 함께 만드는 결을 선호. 혼자보다 동반자와의 시너지가 본인 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.정관',
      'saju.state.geokguk.정관격',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Ascendant.sign.Libra',
      'astro.state.stellium.house.7',
    ]),
  },
  {
    id: 'love.state.independence-in-love',
    layer: 'state', domain: 'love',
    meaning: '관계 안에서의 독립',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 비겁·식상 강 + 점성 Mars 7궁 또는 Uranus 7궁 — 깊은 관계 안에서도 독립·자유 영역 보존이 본인에게 중요한 결.',
      conflict: '독립 욕구와 관계 헌신 욕구가 같이 있음 — 거리감 조절이 평생 과제.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.state.sibsinGroup.비겁.strong',
      'saju.state.sibsinGroup.식상.strong',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Mars.house.7',
      'astro.state.planet.Uranus.house.7',
    ]),
  },
  {
    id: 'love.state.idealization-pattern',
    layer: 'state', domain: 'love',
    meaning: '이상화 패턴',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 인성 강 + 점성 Neptune 7궁 또는 Venus-Neptune aspect — 상대를 이상화하는 결. 깊은 사랑 가능하나 현실 인식이 늦게 옴.',
      conflict: '이상과 현실의 간극 — 환상이 깊을수록 실망도 큼. 영감과 자기기만의 양면.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.sibsinGroup.인성.strong']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Neptune.house.7',
      'astro.relation.aspect.Venus.conjunction.Neptune',
      'astro.relation.aspect.Venus.opposition.Neptune',
      'astro.relation.aspect.Venus.square.Neptune',
    ]),
  },
  {
    id: 'love.state.power-dynamics',
    layer: 'state', domain: 'love',
    meaning: '관계 권력 구조',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 편관 강 또는 양인격 + 점성 Pluto 7궁 또는 Mars-Venus square — 깊고 강렬한 관계. 권력·의존·재생의 테마가 평생 결.',
      conflict: '강렬함과 안정의 균형 — 한쪽이 압도하면 분리, 균형이면 깊이.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.편관',
      'saju.state.geokguk.양인격',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Pluto.house.7',
      'astro.relation.aspect.Mars.square.Venus',
      'astro.relation.aspect.Mars.opposition.Venus',
    ]),
  },
  {
    id: 'love.state.communication-bond',
    layer: 'state', domain: 'love',
    meaning: '소통 기반 결합',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 식상 + 인성 균형 + 점성 Mercury 7궁 또는 Venus-Mercury 합 — 대화·이해를 통한 깊은 유대가 본인 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsinGroup.식상.strong',
      'saju.state.classicalCombo.관인상생',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Mercury.house.7',
      'astro.relation.aspect.Venus.conjunction.Mercury',
    ]),
  },

  // ─── timing: 관계 시기 ───────────────────────────────────
  {
    id: 'love.timing.year.encounter',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '새 만남의 해',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 정재·편재·식상 + 점성 Solar Return Venus 5궁/7궁 또는 Jupiter 5궁/7궁 — 새로운 만남·관계 시작이 자연스러운 해.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.seun.sibsin.정재',
      'saju.timing.seun.sibsin.편재',
      'saju.timing.seun.sibsin.식신',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.solarReturn.Venus.house.5',
      'astro.timing.solarReturn.Venus.house.7',
      'astro.timing.solarReturn.Jupiter.house.5',
      'astro.timing.solarReturn.Jupiter.house.7',
    ]),
  },
  {
    id: 'love.timing.year.commitment',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '약속·결혼의 해',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 정관·정재 + 점성 Saturn 7궁 transit 또는 Jupiter 7궁 — 관계 공식화·결혼·약혼에 적합한 해.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.timing.seun.sibsin.정관',
      'saju.timing.seun.sibsin.정재',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.transit.Saturn.house.7',
      'astro.timing.transit.Jupiter.house.7',
    ]),
  },
  {
    id: 'love.timing.year.crisis',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '관계 위기의 해',
    polarityHint: 'neg',
    narrative: {
      confirm: '세운에서 일지 충 발화 + 점성 Saturn·Pluto가 Venus·7궁을 hard로 자극 — 관계 위기·갈등 표면화. 심층 정리 시기.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.event.day.지지충',
      'saju.timing.event.day.지지형',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.square.natal.Venus',
      'astro.timing.transit.Saturn.opposition.natal.Venus',
      'astro.timing.transit.Pluto.square.natal.Venus',
      'astro.timing.transit.Pluto.opposition.natal.Venus',
    ]),
  },
  {
    id: 'love.timing.year.reconciliation',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '재결합·화해의 해',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운에서 일지 합·삼합 발화 + 점성 Venus 7궁 trine·sextile transit — 갈등 후 재결합 또는 깊어지는 화해의 해.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.event.day.지지육합',
      'saju.timing.event.day.지지삼합',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Venus.trine.natal.Venus',
      'astro.timing.transit.Jupiter.trine.natal.Venus',
    ]),
  },
  {
    id: 'love.timing.year.passionate',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '강렬한 감정의 해',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 도화·식상 + 점성 Mars-Venus 합 transit — 강렬한 감정·매혹·열정의 해. 결정의 강도 큼.',
      conflict: '열정과 안정의 균형 — 빠른 끌림이 깊이 있는 결합으로 갈지, 일시적 격동으로 그칠지 분기.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.timing.seun.sibsin.상관',
      'saju.timing.seun.sibsinJi.도화',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Mars.conjunction.natal.Venus',
      'astro.timing.transit.Venus.conjunction.natal.Mars',
    ]),
  },
  {
    id: 'love.timing.year.spiritual-bond',
    layer: 'timing', scale: 'year', domain: 'love',
    meaning: '영적·이상적 결합',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 인성·편인 + 점성 Neptune이 Venus 또는 7궁 자극 — 영적·이상적 결합 또는 환상에서 깨어나는 시기. 분별이 중요.',
      conflict: '영적 끌림과 현실 검증의 충돌 — 신비함이 깊어질수록 실체 확인이 늦어질 수 있음.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.timing.seun.sibsin.정인',
      'saju.timing.seun.sibsin.편인',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Neptune.conjunction.natal.Venus',
      'astro.timing.transit.Neptune.square.natal.Venus',
      'astro.timing.transit.Neptune.opposition.natal.Venus',
    ]),
  },
  {
    id: 'love.timing.month.relationship-pulse',
    layer: 'timing', scale: 'month', domain: 'love',
    meaning: '이번 달 관계 활성',
    polarityHint: 'pos',
    narrative: {
      confirm: '월운 재성·식상 + 점성 Lunar Return Venus 5궁/7궁 — 한 달 단위로 관계·만남이 활성화되는 시기.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.wolun.sibsin.정재',
      'saju.timing.wolun.sibsin.편재',
      'saju.timing.wolun.sibsin.식신',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.lunarReturn.Venus.house.5',
      'astro.timing.lunarReturn.Venus.house.7',
    ]),
  },
  {
    id: 'love.timing.event.spouse-axis-activation',
    layer: 'timing', scale: 'event', domain: 'love',
    meaning: '배우자 축 활성화',
    polarityHint: 'mixed',
    narrative: {
      confirm: '점성 outer planet (Saturn/Pluto/Uranus)이 natal Venus 또는 DSC를 자극 + 사주 일지 운에 발화 — 평생 관계 축이 재정의되는 결정적 시기.',
      conflict: '관계 외부 변화와 내적 안정이 어긋남 — 변화에 휩쓸릴지, 핵심을 지킬지 의식적 선택 필요.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.conjunction.natal.Venus',
      'astro.timing.transit.Pluto.conjunction.natal.Venus',
      'astro.timing.transit.Uranus.conjunction.natal.Venus',
    ]),
  },
]
