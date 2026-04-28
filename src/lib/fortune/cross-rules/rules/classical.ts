// Classical pattern rules — Hellenistic 점성 + 자평진전 사주 고전 결합.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const classicalRules: Rule[] = [
  // ─── Sect-aware benefic strong (Hellenistic) ────────────
  {
    id: 'self.state.sect-benefic-strong',
    layer: 'state',
    domain: 'self',
    meaning: 'sect 길성 강세',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 sect 길성(낮차트=목성, 밤차트=금성)이 dignity 강하고 사주 길성 신살이 함께 — 본인 sect 색의 길성 자원이 평생 자기 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.shinsal.lucky.']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.sectBenefic.greater.Jupiter',
        'astro.state.sectBenefic.greater.Venus',
      ]),
  },
  {
    id: 'self.state.sect-malefic-strong',
    layer: 'state',
    domain: 'self',
    meaning: 'sect 흉성 강세',
    polarityHint: 'neg',
    narrative: {
      confirm: '점성 sect 흉성(낮차트=화성, 밤차트=토성)이 강하고 사주 흉성 신살이 함께 — sect 흉성 영역의 도전이 인생 패턴으로 들어옴.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.shinsal.unlucky.']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.sectMalefic.greater.Mars',
        'astro.state.sectMalefic.greater.Saturn',
      ]),
  },

  // ─── Lot of Fortune × 재물 ───────────────────────────────
  {
    id: 'money.state.fortune-lot',
    layer: 'state',
    domain: 'money',
    meaning: 'Lot of Fortune × 재성 자리',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 Lot of Fortune이 2궁/8궁/11궁 등 재물 라인에 들어와 있고 사주 재성 그룹도 강세 — 평생 재물 자리가 또렷하게 그려진 결.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.sibsinGroup.재성.strong',
        'saju.state.sibsinGroup.dominant.재성',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.lotOfFortune.house.2',
        'astro.state.lotOfFortune.house.8',
        'astro.state.lotOfFortune.house.11',
      ]),
  },

  // ─── Profection time-lord ───────────────────────────────
  {
    id: 'self.timing.year.profection-lord',
    layer: 'timing',
    scale: 'year',
    domain: 'self',
    meaning: '연 통치자 활성',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 annual profection ruler가 어느 하우스에 있는지에 따라 그 영역이 올해 핵심. 사주 세운에서도 같은 영역의 십성이 활성화되어 있음.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.seun.sibsin.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.profectionLord.']),
  },

  // ─── 자평진전 classical 조합 (사주 단독 — 강한 시그널) ───
  {
    id: 'career.state.classical-bugwi-ssang',
    layer: 'state',
    domain: 'career',
    meaning: '부귀쌍전 (정관격+재성용신)',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정관격 + 재성용신의 부귀쌍전 구조가 잡혔고 점성 MC 또는 2궁/10궁 강세가 함께 — 명예와 부가 양립 가능한 평생 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.부귀쌍전']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Sun.house.10',
        'astro.state.planet.Jupiter.house.10',
        'astro.state.planet.Venus.house.2',
        'astro.state.planet.Jupiter.house.2',
      ]),
  },
  {
    id: 'career.state.classical-gwanin',
    layer: 'state',
    domain: 'career',
    meaning: '관인상생 (정관격+인성용신)',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 관인상생(정관격+인성용신) 학자형 구조 + 점성 9궁/3궁 또는 Jupiter 강조 — 학문과 명예가 자연스럽게 연결되는 평생 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.관인상생']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Jupiter.house.9',
        'astro.state.planet.Mercury.house.9',
        'astro.state.planet.Mercury.house.3',
      ]),
  },
  {
    id: 'money.state.classical-siksin-saengjae',
    layer: 'state',
    domain: 'money',
    meaning: '식신생재 (식신격+재성용신)',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 식신생재 구조 + 점성 5궁/2궁 강조 — 표현·창작이 직접 재물로 연결되는 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.식신생재']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Venus.house.5',
        'astro.state.planet.Venus.house.2',
        'astro.state.planet.Jupiter.house.2',
      ]),
  },
  {
    id: 'career.state.classical-sarin',
    layer: 'state',
    domain: 'career',
    meaning: '살인상생 (편관격+인성용신)',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 살인상생(편관을 인성으로 화) 권력자 구조 + 점성 Saturn dignity 또는 10궁 — 큰 압박을 지혜로 다루는 권력 패턴.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.살인상생']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Saturn.domicile',
        'astro.state.dignity.Saturn.exaltation',
        'astro.state.planet.Saturn.house.10',
      ]),
  },
  {
    id: 'career.state.classical-yangin-hapsal',
    layer: 'state',
    domain: 'career',
    meaning: '양인합살 (양인격+칠살용신)',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 양인합살 구조 + 점성 Mars dignity 또는 angular Mars — 무관·정치·결단력 직업의 평생 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.양인합살']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Mars.domicile',
        'astro.state.dignity.Mars.exaltation',
        'astro.state.planet.Mars.house.1',
        'astro.state.planet.Mars.house.10',
      ]),
  },

  // ─── 공망(空亡) ──────────────────────────────────────────
  {
    id: 'self.state.gongmang-day',
    layer: 'state',
    domain: 'self',
    meaning: '일주 공망',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 일주가 공망에 든 위치 + 점성 12궁 행성 강조 — 자아 영역에 비어있음·내적 영역의 비중. 영성·내면 작업이 자기 결과 잘 맞음.',
      conflict: '공망은 비움인데 점성 12궁이 비활성 — 안과 밖이 다른 메시지. 의식적으로 내면 시간 마련 필요.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.공망', 'saju.relation.day.공망']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Sun.house.12',
        'astro.state.planet.Moon.house.12',
        'astro.state.stellium.house.12',
      ]),
  },
  {
    id: 'family.state.gongmang-spouse',
    layer: 'state',
    domain: 'love',
    meaning: '배우자궁 공망',
    polarityHint: 'mixed',
    narrative: {
      confirm: '일지가 공망 위치 + 점성 7궁 비활성 또는 Neptune 7궁 — 관계 영역에 "잡히지 않는" 결. 늦게 만나거나 영적·이상적 결합 패턴.',
      conflict: '공망의 비움과 7궁 활성이 어긋남 — 외형적 관계는 활성인데 내적 안정감은 잡히지 않는 양면.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.day.공망']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.state.planet.Neptune.house.7']),
  },

  // ─── 성격(成格) × Bonification ───────────────────────────
  {
    id: 'self.state.successful-pattern',
    layer: 'state',
    domain: 'self',
    meaning: '성격(成格) × bonified key planet',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 격국이 상신과 함께 성격(成格)으로 완성됨 + 점성도 핵심 행성이 길성에 의해 bonified — 평생 자기 길이 양 시스템 모두에서 또렷하게 받쳐주는 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.seonggyeok']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.bonified.Sun',
        'astro.state.bonified.Moon',
        'astro.state.bonified.Mercury',
      ]),
  },

  // ─── 파격(破格) × Maltreatment ───────────────────────────
  {
    id: 'self.state.broken-pattern',
    layer: 'state',
    domain: 'self',
    meaning: '파격(破格) × maltreated key planet',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 격국이 상신을 잃어 파격(破格)으로 흔들림 + 점성도 핵심 행성이 흉성에 의해 maltreated — 평생 자기 길에 구조적 누락이 박혀 있어 의식적 보강이 필요한 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.pagyeok']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.maltreated.Sun',
        'astro.state.maltreated.Moon',
        'astro.state.maltreated.Mercury',
      ]),
  },

  // ─── 상신(相神) 흐름 강함 ─────────────────────────────────
  {
    id: 'self.state.sangsin-strong',
    layer: 'state',
    domain: 'self',
    meaning: '상신 강세 — 격국 보좌 흐름',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 격국의 상신(보좌하는 십성 그룹)이 살아있고 점성 길성(sect 길성 또는 dignified Jupiter/Venus)도 강세 — 평생 격국이 흐름을 받아 자기 길을 자연스럽게 펼치는 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.sangsin.']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.sectBenefic.greater.Jupiter',
        'astro.state.sectBenefic.greater.Venus',
        'astro.state.dignity.Jupiter.domicile',
        'astro.state.dignity.Venus.domicile',
      ]),
  },

  // ─── Planetary Joys × 신살 길성 ──────────────────────────
  {
    id: 'self.state.planetary-joy',
    layer: 'state',
    domain: 'self',
    meaning: 'Planetary Joy × 길성 신살',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 행성이 자기 기쁨의 자리(joy)에 있고 사주 길성 신살이 함께 — 평생 본인 결이 자연스럽게 받쳐지는 자리. 행운·보호의 자원이 박혀 있는 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.shinsal.lucky.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.state.planetaryJoy.']),
  },

  // ─── Lot of Spirit × 격국 ────────────────────────────────
  {
    id: 'career.state.spirit-lot-vocation',
    layer: 'state',
    domain: 'career',
    meaning: 'Lot of Spirit × 격국 — 직업 소명',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 Lot of Spirit이 직업·소명 라인(10/9/3궁 등)에 들어와 있고 사주 격국도 또렷하게 잡힘 — 평생 직업·소명이 양 시스템에서 같은 방향을 가리키는 결.',
    },
    sajuPredicate: (s) =>
      hitByPrefix(s, [
        'saju.state.geokguk.category.정격',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.lotOfSpirit.house.10',
        'astro.state.lotOfSpirit.house.9',
        'astro.state.lotOfSpirit.house.3',
        'astro.state.lotOfSpirit.house.1',
      ]),
  },

  // ─── 성중유패 (Success Containing Failure) — 운에서 발화 ─
  {
    id: 'self.timing.event.seong-jung-yu-pae',
    layer: 'timing',
    scale: 'event',
    domain: 'self',
    meaning: '성중유패 — 성격이 운에서 흔들림',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 성격(成格)이었던 사람의 상신·용신이 운에서 충/형으로 약화됨 + 점성 outer planet이 natal benefic을 hard로 자극 — 본래 잘 짜인 인생 구조가 일시적으로 흔들리는 시기. 그러나 본 격국이 살아있어 회복 가능.',
    },
    sajuPredicate: (s, ctx) => {
      const isSuccess = ctx.hasSaju('saju.state.seonggyeok')
      if (!isSuccess) return { fired: false, strength: 0, evidence: {} }
      const eventActivation = ctx.sajuByPrefix('saju.timing.event.day.')[0]
      if (!eventActivation) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: eventActivation.strength, evidence: { isSuccess, activation: eventActivation.evidence } }
    },
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.timing.transit.Saturn.', 'astro.timing.transit.Pluto.', 'astro.timing.transit.Neptune.']),
  },
]
