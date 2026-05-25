// Career deep-dive rules. 격국 archetype × Planet dignity × MC house signals.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const careerDeepRules: Rule[] = [
  {
    id: 'career.state.archetype.public-servant',
    layer: 'state',
    domain: 'career',
    meaning: '공직·행정 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 정관격(또는 정재격)과 점성 Saturn dignified 또는 10궁 강조가 함께 — 공직·행정·관리 영역에 평생 적성. 정통 위계 안에서 안정 발휘.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.geokguk.정관격', 'saju.state.geokguk.정재격']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Saturn.domicile',
        'astro.state.dignity.Saturn.exaltation',
        'astro.state.planet.Saturn.house.10',
        'astro.state.stellium.house.10',
      ]),
  },
  {
    id: 'career.state.archetype.judiciary',
    layer: 'state',
    domain: 'career',
    meaning: '법조 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 정관격·관인상생 + 점성 Jupiter dignified 또는 9궁 강조 — 법조·법무·심판 영역의 평생 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.classicalCombo.관인상생', 'saju.state.geokguk.정관격']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Jupiter.domicile',
        'astro.state.dignity.Jupiter.exaltation',
        'astro.state.planet.Jupiter.house.9',
      ]),
  },
  {
    id: 'career.state.archetype.military',
    layer: 'state',
    domain: 'career',
    meaning: '군경·외과 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 양인격·편관 강세와 점성 Mars dignified 또는 angular Mars — 강한 결단·물리적 행동·외과·군경 영역 적성.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.geokguk.양인격',
        'saju.state.classicalCombo.양인합살',
        'saju.state.sibsin.strong.편관',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Mars.domicile',
        'astro.state.dignity.Mars.exaltation',
        'astro.state.planet.Mars.house.1',
        'astro.state.planet.Mars.house.10',
      ]),
  },
  {
    id: 'career.state.archetype.researcher',
    layer: 'state',
    domain: 'career',
    meaning: '연구·학자 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 정인격·인성 강세와 점성 9궁 강조 또는 Mercury dignified — 학습·연구·교육 영역의 평생 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.geokguk.정인격', 'saju.state.sibsinGroup.인성.strong']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Jupiter.house.9',
        'astro.state.planet.Mercury.house.9',
        'astro.state.stellium.house.9',
        'astro.state.dignity.Mercury.exaltation',
      ]),
  },
  {
    id: 'career.state.archetype.creator',
    layer: 'state',
    domain: 'career',
    meaning: '창작·콘텐츠 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 식신격·식상 강세 + 점성 5궁 강조 또는 Venus dignified — 창작·콘텐츠·예술 영역에 평생 적성.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.geokguk.식신격', 'saju.state.sibsinGroup.식상.strong']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Venus.house.5',
        'astro.state.stellium.house.5',
        'astro.state.dignity.Venus.domicile',
        'astro.state.dignity.Venus.exaltation',
      ]),
  },
  {
    id: 'career.state.archetype.merchant',
    layer: 'state',
    domain: 'career',
    meaning: '무역·유통 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 편재격과 점성 Mercury Gemini 또는 3궁 강조 — 이동·교환·유통 영역에서 가장 잘 작동하는 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.geokguk.편재격', 'saju.state.sibsin.strong.편재']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Mercury.sign.Gemini',
        'astro.state.planet.Mercury.sign.쌍둥이자리',
        'astro.state.planet.Mercury.house.3',
        'astro.state.dignity.Mercury.domicile',
      ]),
  },
  {
    id: 'career.state.archetype.entrepreneur',
    layer: 'state',
    domain: 'career',
    meaning: '자영업·창업 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 비겁 강세 또는 종왕격 + 점성 1궁 stellium 또는 Mars angular — 독립·자영·창업이 본인 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.sibsinGroup.비겁.strong',
        'saju.state.geokguk.종왕격',
        'saju.state.geokguk.건록격',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.stellium.house.1',
        'astro.state.planet.Mars.house.1',
        'astro.state.dignity.Mars.domicile',
      ]),
  },
  {
    id: 'career.state.archetype.caregiver',
    layer: 'state',
    domain: 'career',
    meaning: '의료·돌봄 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 인성 + 식상 동시 강 + 점성 Moon angular 또는 6궁/12궁 강조 — 의료·간호·돌봄 영역의 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.sibsinGroup.인성.strong', 'saju.state.sibsinGroup.식상.strong']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Moon.house.4',
        'astro.state.planet.Moon.house.6',
        'astro.state.planet.Moon.house.12',
        'astro.state.stellium.house.6',
      ]),
  },
  {
    id: 'career.state.archetype.communicator',
    layer: 'state',
    domain: 'career',
    meaning: '미디어·교육 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 식상·인성 강세 + 점성 3궁 강조 또는 Mercury angular — 미디어·교육·전달 영역에 평생 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.sibsinGroup.식상.strong', 'saju.state.classicalCombo.관인상생']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Mercury.house.3',
        'astro.state.planet.Mercury.house.1',
        'astro.state.stellium.house.3',
      ]),
  },
  {
    id: 'career.state.archetype.spiritual',
    layer: 'state',
    domain: 'career',
    meaning: '종교·영성 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 화개살 + 편인 + 점성 12궁 강조 또는 Neptune dignified — 영성·종교·치유 영역의 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.shinsal.화개',
        'saju.state.sibsin.strong.편인',
        'saju.state.geokguk.편인격',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Neptune.house.12',
        'astro.state.stellium.house.12',
        'astro.state.planet.Sun.house.12',
      ]),
  },
  {
    id: 'career.state.archetype.finance',
    layer: 'state',
    domain: 'career',
    meaning: '금융·회계 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 정재격·정재 강 + 점성 Mercury domicile/exalt 또는 2궁 강조 — 금융·회계·자산관리 영역의 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.geokguk.정재격', 'saju.state.sibsin.strong.정재']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Mercury.exaltation',
        'astro.state.planet.Mercury.house.2',
        'astro.state.stellium.house.2',
      ]),
  },
  {
    id: 'career.state.archetype.analyst',
    layer: 'state',
    domain: 'career',
    meaning: '분석·IT·과학 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 식상 + 인성 동시 강 + 점성 Mercury angular 또는 Saturn dignified — 분석·논리·기술 영역의 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.sibsinGroup.식상.strong', 'saju.state.sibsinGroup.인성.strong']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Mercury.house.1',
        'astro.state.planet.Mercury.house.10',
        'astro.state.dignity.Saturn.exaltation',
      ]),
  },
  {
    id: 'career.state.archetype.performer',
    layer: 'state',
    domain: 'career',
    meaning: '연예·표현 적성',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주 상관격 + 도화살 + 점성 5궁 strong 또는 Sun-Venus angular — 연예·무대·자기 표현 영역의 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.geokguk.상관격', 'saju.state.shinsal.도화']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.stellium.house.5',
        'astro.state.planet.Sun.house.5',
        'astro.state.planet.Venus.house.1',
      ]),
  },
  {
    id: 'career.state.archetype.reformer',
    layer: 'state',
    domain: 'career',
    meaning: '변혁·심층 영역',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 편관 강세·종살격 + 점성 Pluto angular 또는 8궁 stellium — 변혁·심리치료·연구·심층 영역의 결.',
      conflict: '변혁 신호와 안정 신호가 혼재 — 깊게 들어가는 일과 표면 안정 사이 분기.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.state.sibsin.strong.편관', 'saju.state.geokguk.종살격']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Pluto.house.1',
        'astro.state.planet.Pluto.house.10',
        'astro.state.stellium.house.8',
      ]),
  },

  // 성격(成格)·길신 + 점성 길성이 태양·수성을 도움 = 귀인·후원이 따르는 길.
  {
    id: 'career.state.benefactor-support',
    layer: 'state',
    domain: 'career',
    meaning: '귀인·후원 (보호받는 길)',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '사주가 성격(成格)으로 짜였거나 길성 신살이 받쳐주고 + 점성에서 길성(목성·금성)이 태양·수성을 도와주는 배치 — 결정적 순간에 윗사람·귀인의 도움이 따르는 직업 흐름. 혼자 다 짊어지기보다 도움을 받아들일 때 길이 열려요.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.seonggyeok', 'saju.state.shinsal.lucky.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.bonif.overcoming.benefic.Sun',
        'astro.state.bonif.opposition.benefic.Sun',
        'astro.state.bonif.adherence.benefic.Sun',
        'astro.state.bonif.overcoming.benefic.Mercury',
        'astro.state.bonif.adherence.benefic.Mercury',
        'astro.state.bonified.Sun',
        'astro.state.bonified.Mercury',
      ]),
  },

  // ─── timing — 직업 변동 / 승진 / 발신 ─────────────────────
  {
    id: 'career.timing.year.promotion',
    layer: 'timing',
    scale: 'year',
    domain: 'career',
    meaning: '승진·인정의 해',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '세운 정관 + 점성 Saturn이 10궁/MC 부드럽게 활성 — 외부 인정·직책 상승 호기. 평가·승진 시점 적합.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정관']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Saturn.trine.natal.MC',
        'astro.timing.transit.Saturn.sextile.natal.MC',
        'astro.timing.transit.Jupiter.conjunction.natal.MC',
        'astro.timing.solarReturn.Saturn.house.10',
      ]),
  },
  {
    id: 'career.timing.year.move-job',
    layer: 'timing',
    scale: 'year',
    domain: 'career',
    meaning: '이직 분기점',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '세운 편재·편관 + 점성 Uranus 또는 Node가 10궁/MC 자극 — 직장·역할 변동의 해. 새 자리·구조 변경 가능.',
      conflict: '안정 유지 vs 변동 신호 혼재 — 옮길지 머무를지 한 해 안에 답.',
    },
    sajuPredicate: (s) =>
      hitByPrefix(s, [
        'saju.timing.seun.sibsin.편재',
        'saju.timing.seun.sibsin.편관',
        'saju.timing.event.day.지지충',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.timing.transit.Uranus.', 'astro.timing.transit.True Node.']),
  },
  {
    id: 'career.timing.year.start-business',
    layer: 'timing',
    scale: 'year',
    domain: 'career',
    meaning: '창업·독립 호기',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 비견·식신 + 점성 Mars가 1궁/10궁 활성 — 독립·창업·자기 사업 시작에 유리한 해.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.timing.seun.sibsin.비견', 'saju.timing.seun.sibsin.식신']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Mars.house.1',
        'astro.timing.transit.Jupiter.house.1',
        'astro.timing.transit.Mars.conjunction.natal.MC',
      ]),
  },
  {
    id: 'career.timing.year.certification',
    layer: 'timing',
    scale: 'year',
    domain: 'career',
    meaning: '자격·학습·전문성 강화',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '세운 정인·편인 + 점성 Jupiter가 9궁 강조 또는 9궁 transit — 자격증·학위·전문성 강화의 해.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.timing.seun.sibsin.정인', 'saju.timing.seun.sibsin.편인']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Jupiter.house.9',
        'astro.timing.solarReturn.Jupiter.house.9',
      ]),
  },
  {
    id: 'career.timing.year.publication',
    layer: 'timing',
    scale: 'year',
    domain: 'career',
    meaning: '발신·출판·콘텐츠 호기',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '세운 식신·상관 + 점성 Mercury·Venus가 3궁/5궁 강조 — 글·콘텐츠·발신·출판에 유리한 해.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.timing.seun.sibsin.식신', 'saju.timing.seun.sibsin.상관']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.solarReturn.Mercury.house.3',
        'astro.timing.solarReturn.Venus.house.5',
        'astro.timing.transit.Jupiter.house.3',
      ]),
  },
  {
    id: 'career.timing.event.career-axis-shift',
    layer: 'timing',
    scale: 'event',
    domain: 'career',
    meaning: 'MC 축 변동 — 인생 직업 축 재정의',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '점성 outer planet (Saturn/Uranus/Pluto)이 MC를 직접 자극 + 사주 운이 일주를 충 — 평생 직업 축이 재정의되는 결정적 시기.',
      conflict: 'MC 자극과 사주 안정 신호가 혼재 — 외부 변화에 내부가 천천히 따라가는 형태.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Saturn.conjunction.natal.MC',
        'astro.timing.transit.Saturn.opposition.natal.MC',
        'astro.timing.transit.Uranus.conjunction.natal.MC',
        'astro.timing.transit.Pluto.conjunction.natal.MC',
      ]),
  },
]
