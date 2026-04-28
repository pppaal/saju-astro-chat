// 종격(從格) 운로 fine-grain rules.
//
// 자평진전: 종격은 일반 격국과 운로 적용이 반대 — 본 일간을 떠나 합세한
// 그룹을 따라 흐르므로, 그 그룹·생하는 그룹의 운에 형통, 그 그룹을 거스르는
// 운에 위기.
//
//   종왕격(從旺格): 비겁·인성 운 → 형통,   재성·관성·식상 운 → 위기
//   종강격(從强格): 인성·비겁 운 → 형통,   재성·관성 운 → 위기
//   종아격(從兒格): 식상·재성 운 → 형통,   인성·관성 운 → 위기
//   종재격(從財格): 재성·식상 운 → 형통,   비겁·인성 운 → 위기
//   종살격(從殺格): 관성·재성 운 → 형통,   비겁·식상 운 → 위기

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const jonggyeokFineRules: Rule[] = [
  // ─── 종왕격 ───────────────────────────────────────────────
  {
    id: 'self.timing.year.jongwang-favorable',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '종왕격 운로 형통',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 종왕격이고 세운에 비겁·인성이 들어옴 + 점성 1궁 transit 활성 — 본 일간 그룹이 더 강해지는 형통 흐름. 자기 영역 확장에 적기.',
    },
    sajuPredicate: (s, ctx) => {
      const isJongwang = ctx.hasSaju('saju.state.geokguk.종왕격')
      if (!isJongwang) return { fired: false, strength: 0, evidence: {} }
      const goodRun = ['비견','겁재','정인','편인'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!goodRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.9, evidence: { geokguk: '종왕격', favorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Mars.house.1',
      'astro.timing.transit.Jupiter.house.1',
    ]),
  },
  {
    id: 'self.timing.year.jongwang-unfavorable',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '종왕격 거스르는 운',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 종왕격에 식상·재성·관성 운이 들어옴 + 점성 outer planet hard — 본 그룹을 거스르는 흐름. 외부 도전·압박 누적, 일시 후퇴 권장.',
    },
    sajuPredicate: (s, ctx) => {
      const isJongwang = ctx.hasSaju('saju.state.geokguk.종왕격')
      if (!isJongwang) return { fired: false, strength: 0, evidence: {} }
      const badRun = ['식신','상관','정재','편재','정관','편관'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!badRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.85, evidence: { geokguk: '종왕격', unfavorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.',
      'astro.timing.transit.Pluto.',
    ]),
  },

  // ─── 종강격 ───────────────────────────────────────────────
  {
    id: 'self.timing.year.jonggang-favorable',
    layer: 'timing', scale: 'year', domain: 'self',
    meaning: '종강격 운로 형통',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 종강격에 인성·비겁 운 + 점성 9궁 transit 또는 Jupiter angular — 학습·정통·인정으로 형통하는 시기.',
    },
    sajuPredicate: (s, ctx) => {
      const isJonggang = ctx.hasSaju('saju.state.geokguk.종강격')
      if (!isJonggang) return { fired: false, strength: 0, evidence: {} }
      const goodRun = ['정인','편인','비견','겁재'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!goodRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.9, evidence: { geokguk: '종강격', favorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Jupiter.house.9',
      'astro.timing.solarReturn.Jupiter.house.9',
    ]),
  },

  // ─── 종아격 ───────────────────────────────────────────────
  {
    id: 'career.timing.year.jongah-favorable',
    layer: 'timing', scale: 'year', domain: 'career',
    meaning: '종아격 운로 형통',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 종아격에 식상·재성 운 + 점성 5궁 ruler 활성 — 창작·표현·재능이 가장 잘 발휘되는 시기. 발신·작품 발표 호기.',
    },
    sajuPredicate: (s, ctx) => {
      const isJongah = ctx.hasSaju('saju.state.geokguk.종아격')
      if (!isJongah) return { fired: false, strength: 0, evidence: {} }
      const goodRun = ['식신','상관','정재','편재'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!goodRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.9, evidence: { geokguk: '종아격', favorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Venus.house.5',
      'astro.timing.transit.Jupiter.house.5',
    ]),
  },

  // ─── 종재격 ───────────────────────────────────────────────
  {
    id: 'money.timing.year.jongjae-favorable',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '종재격 운로 형통',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 종재격에 재성·식상 운 + 점성 2궁/8궁 transit 활성 — 자산·수입 정점에 도달할 수 있는 시기.',
    },
    sajuPredicate: (s, ctx) => {
      const isJongjae = ctx.hasSaju('saju.state.geokguk.종재격')
      if (!isJongjae) return { fired: false, strength: 0, evidence: {} }
      const goodRun = ['정재','편재','식신','상관'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!goodRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.95, evidence: { geokguk: '종재격', favorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Jupiter.house.2',
      'astro.timing.transit.Jupiter.house.8',
    ]),
  },
  {
    id: 'money.timing.year.jongjae-unfavorable',
    layer: 'timing', scale: 'year', domain: 'money',
    meaning: '종재격 거스르는 운',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 종재격에 비겁·인성 운 + 점성 Saturn 2궁 hard — 가장 위험한 시기. 손재 누적 가능, 보수적 운영 필수.',
    },
    sajuPredicate: (s, ctx) => {
      const isJongjae = ctx.hasSaju('saju.state.geokguk.종재격')
      if (!isJongjae) return { fired: false, strength: 0, evidence: {} }
      const badRun = ['비견','겁재','정인','편인'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!badRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.9, evidence: { geokguk: '종재격', unfavorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.house.2',
      'astro.timing.transit.Saturn.square.natal.Venus',
    ]),
  },

  // ─── 종살격 ───────────────────────────────────────────────
  {
    id: 'career.timing.year.jongsal-favorable',
    layer: 'timing', scale: 'year', domain: 'career',
    meaning: '종살격 운로 형통',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 종살격에 관성·재성 운 + 점성 10궁/MC 강 transit — 권력·직책·외부 인정이 정점에 도달하는 시기.',
    },
    sajuPredicate: (s, ctx) => {
      const isJongsal = ctx.hasSaju('saju.state.geokguk.종살격')
      if (!isJongsal) return { fired: false, strength: 0, evidence: {} }
      const goodRun = ['정관','편관','정재','편재'].some((sb) =>
        ctx.hasSaju(`saju.timing.seun.sibsin.${sb}`),
      )
      if (!goodRun) return { fired: false, strength: 0, evidence: {} }
      return { fired: true, strength: 0.95, evidence: { geokguk: '종살격', favorableRun: true } }
    },
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.timing.transit.Saturn.conjunction.natal.MC',
      'astro.timing.transit.Saturn.house.10',
      'astro.timing.transit.Pluto.house.10',
    ]),
  },

  // ─── 양인합살 fine-grain (직업 색별) ──────────────────────
  {
    id: 'career.state.yangin-hapsal-military',
    layer: 'state', domain: 'career',
    meaning: '양인합살 — 무관·격투 정밀',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 양인합살 + 점성 Mars 1궁/10궁 또는 Aries Sun — 군경·외과·격투·소방·구조 등 강한 결단·물리 영역의 정밀 패턴.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.양인합살']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Mars.house.1',
      'astro.state.planet.Mars.house.10',
      'astro.state.planet.Sun.sign.Aries',
    ]),
  },
  {
    id: 'career.state.yangin-hapsal-political',
    layer: 'state', domain: 'career',
    meaning: '양인합살 — 정치·권력 정밀',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 양인합살 + 점성 Sun 10궁 또는 Pluto angular — 정치·고위 권력·CEO·결단 리더십 영역의 정밀 패턴.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.양인합살']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Sun.house.10',
      'astro.state.planet.Pluto.house.1',
      'astro.state.planet.Pluto.house.10',
    ]),
  },
  {
    id: 'career.state.yangin-hapsal-judicial',
    layer: 'state', domain: 'career',
    meaning: '양인합살 — 법조·심판 정밀',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 양인합살 + 점성 Jupiter 9궁 또는 Saturn dignified — 법조·검사·심판·집행 등 강한 결단을 정통 안에서 행사하는 영역.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.양인합살']),
    astroPredicate: (a) => hitByKeys(a, [
      'astro.state.planet.Jupiter.house.9',
      'astro.state.dignity.Saturn.domicile',
      'astro.state.dignity.Saturn.exaltation',
    ]),
  },

  // ─── 식신제살 fine-grain ─────────────────────────────────
  {
    id: 'career.state.siksin-jesal-active-leader',
    layer: 'state', domain: 'career',
    meaning: '식신제살 — 능동적 리더 정밀',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 식신제살(편관격+식상용신) + 점성 Mercury angular 또는 5궁 강 — 압박을 능동적 표현으로 다루는 결. 콘텐츠·미디어·스포츠 코치·교육자 등.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.classicalCombo.식신제살']),
    astroPredicate: (a) => hitByPrefix(a, [
      'astro.state.planet.Mercury.house.1',
      'astro.state.planet.Mercury.house.10',
      'astro.state.stellium.house.5',
    ]),
  },
]
