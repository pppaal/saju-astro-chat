// Family deep-dive rules. 월지(부모궁)/시지(자녀궁) × 4궁/IC + Moon + 인성/식상.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const familyDeepRules: Rule[] = [
  // ─── state: 평생 가정 결 ─────────────────────────────────
  {
    id: 'family.state.strong-mother-line',
    layer: 'state', domain: 'family',
    meaning: '모계 자원 강세',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정인 강 + 점성 Moon dignified 또는 Cancer ASC/Moon angular — 어머니 또는 모계로부터의 정서·자원·보호가 평생 자기 결의 기반.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.정인',
      'saju.state.geokguk.정인격',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.dignity.Moon.domicile',
      'astro.state.dignity.Moon.exaltation',
      'astro.state.planet.Moon.house.4',
      'astro.state.planet.Ascendant.sign.Cancer',
    ]),
  },
  {
    id: 'family.state.strong-father-line',
    layer: 'state', domain: 'family',
    meaning: '부계 자원 강세',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정관·편관 강 (부친 십성) + 점성 Sun dignified 또는 10궁/Saturn 강 — 아버지 또는 부계 권위·후원·구조가 본인 결의 기반.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.정관',
      'saju.state.sibsin.strong.편관',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.dignity.Sun.domicile',
      'astro.state.dignity.Sun.exaltation',
      'astro.state.planet.Sun.house.10',
    ]),
  },
  {
    id: 'family.state.early-independence',
    layer: 'state', domain: 'family',
    meaning: '이른 독립',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 월지 충 또는 인성 약 + 점성 4궁 ruler가 12궁 또는 Saturn 4궁 — 가정으로부터 일찍 독립하거나 정서적 거리감을 만드는 결.',
      conflict: '독립 욕구와 가족 의무가 같이 있음 — 거리와 책임의 균형이 평생 과제.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.relation.지지충',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Saturn.house.4',
      'astro.state.stellium.house.4',
    ]),
  },
  {
    id: 'family.state.children-emphasis',
    layer: 'state', domain: 'family',
    meaning: '자녀 영역 강세',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 시지에 식상 + 점성 5궁 강조 또는 Jupiter 5궁 — 자녀·후세·창조 영역이 인생 한 축으로 분명한 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.palace.자녀.sibsin.식신',
      'saju.state.palace.자녀.sibsin.상관',
      'saju.state.sibsinGroup.식상.strong',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.stellium.house.5',
      'astro.state.planet.Jupiter.house.5',
    ]),
  },
  {
    id: 'family.state.delayed-children',
    layer: 'state', domain: 'family',
    meaning: '자녀 영역 늦음·신중',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 시지 공망 또는 식상 약 + 점성 Saturn 5궁 또는 5궁 ruler가 12궁 — 자녀를 갖는 시기가 늦거나 의식적 선택. 양육 깊이는 깊음.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.relation.공망',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Saturn.house.5',
    ]),
  },
  {
    id: 'family.state.sibling-rivalry',
    layer: 'state', domain: 'family',
    meaning: '형제 경쟁·갈등 패턴',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 비겁 강 + 년·월지 충 + 점성 3궁 hard aspect — 형제·또래와의 경쟁·갈등 패턴이 평생 잠재. 의식적 거리 조절 필요.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsinGroup.비겁.strong',
      'saju.state.relation.지지충',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Mars.house.3',
      'astro.relation.aspect.Mercury.square.Mars',
    ]),
  },
  {
    id: 'family.state.elder-care',
    layer: 'state', domain: 'family',
    meaning: '연장자 돌봄 책임',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 인성 + 식상 동시 강 + 점성 4궁 ruler가 6궁 또는 Saturn 4궁 — 부모·연장자 돌봄이 인생 한 축으로 들어옴. 보람과 부담이 같이.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsinGroup.인성.strong',
      'saju.state.sibsinGroup.식상.strong',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Saturn.house.4',
      'astro.state.planet.Saturn.house.6',
    ]),
  },
  {
    id: 'family.state.adopted-or-step',
    layer: 'state', domain: 'family',
    meaning: '비전형 가족 구조',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 편인 강 또는 시주 천간충 + 점성 Uranus 4궁 또는 Moon-Uranus aspect — 입양·재혼·동거·이산 등 비전형 가족 구조 가능성. 다양한 결합 형태.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.sibsin.strong.편인',
      'saju.state.geokguk.편인격',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Uranus.house.4',
      'astro.relation.aspect.Moon.conjunction.Uranus',
      'astro.relation.aspect.Moon.opposition.Uranus',
      'astro.relation.aspect.Moon.square.Uranus',
    ]),
  },
  {
    id: 'family.state.home-builder',
    layer: 'state', domain: 'family',
    meaning: '가정 안정·기반 구축형',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 토 기운 + 정인격 + 점성 4궁 강조 + Moon trine Saturn — 가정·집·기반을 안정적으로 구축하는 결. 정착이 본인 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, [
      'saju.state.elementDominant.earth',
      'saju.state.geokguk.정인격',
    ]),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.stellium.house.4',
      'astro.relation.aspect.Moon.trine.Saturn',
    ]),
  },

  // ─── timing: 가정 시기 ───────────────────────────────────
  {
    id: 'family.timing.year.parent-event',
    layer: 'timing', scale: 'year', domain: 'family',
    meaning: '부모 관련 사건의 해',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운에서 인성 또는 관성 충 발화 + 점성 Saturn·Pluto가 4궁/Moon 자극 — 부모 건강·관계·사건이 표면화되는 시기. 의식적 시간 마련 권장.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.event.day.지지충',
      'saju.timing.seun.activates.천간충',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.house.4',
      'astro.timing.transit.Pluto.house.4',
      'astro.timing.transit.Saturn.square.natal.Moon',
      'astro.timing.transit.Pluto.square.natal.Moon',
    ]),
  },
  {
    id: 'family.timing.year.children-cycle',
    layer: 'timing', scale: 'year', domain: 'family',
    meaning: '자녀 영역 활성',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 식신 + 점성 Jupiter 5궁 또는 Venus 5궁 transit — 자녀·임신·가족 확장 영역이 활성화되는 해.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.식신']),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.timing.transit.Jupiter.house.5',
      'astro.timing.transit.Venus.house.5',
      'astro.timing.solarReturn.Jupiter.house.5',
    ]),
  },
  {
    id: 'family.timing.year.relocation',
    layer: 'timing', scale: 'year', domain: 'family',
    meaning: '이주·이사의 해',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운에서 역마살 또는 월지 충 + 점성 4궁 ruler가 transit으로 자극 — 이사·이주·집 이동이 자연스러운 해. 새 정착지 결정.',
    },
    sajuPredicate: (s) => hitByPrefix(s, [
      'saju.timing.seun.sibsinJi.역마',
      'saju.timing.event.day.지지충',
    ]),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Uranus.house.4',
      'astro.timing.transit.Jupiter.house.4',
    ]),
  },
  {
    id: 'family.timing.year.return-to-roots',
    layer: 'timing', scale: 'year', domain: 'family',
    meaning: '뿌리 회귀의 해',
    polarityHint: 'mixed',
    narrative: {
      confirm: '세운 정인 + 점성 IC/4궁 transit + 사주 월지 활성 — 원가족·고향·뿌리로 돌아가거나 재인식하는 시기.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정인']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Jupiter.conjunction.natal.IC',
      'astro.timing.transit.Saturn.conjunction.natal.IC',
    ]),
  },
  {
    id: 'family.timing.event.home-axis-shift',
    layer: 'timing', scale: 'event', domain: 'family',
    meaning: '가정 축 변동',
    polarityHint: 'mixed',
    narrative: {
      confirm: '점성 outer planet이 IC/4궁 ruler 자극 + 사주 월지 운에 발화 — 평생 가정 축이 재정의되는 결정적 시기. 결혼·이주·가족 변동.',
      conflict: '내적 안정 욕구와 외적 변화가 충돌 — 변화가 깊을수록 핵심 가치는 더 명확해짐.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.conjunction.natal.IC',
      'astro.timing.transit.Pluto.conjunction.natal.IC',
      'astro.timing.transit.Uranus.conjunction.natal.IC',
    ]),
  },
]
