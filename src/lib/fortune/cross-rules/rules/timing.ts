// Timing-layer rules: 대운/세운/월운/일진 ↔ transit/return/profection.
// Each rule declares its `scale` so the engine matches signals at the
// matching time scale only — 10-year signals don't get crossed with 1-day.

import { hitByKeys, hitByPrefix } from '../engine'
import type { Rule } from '../types'

export const timingRules: Rule[] = [
  // ── decade scale ─────────────────────────────────────────
  {
    id: 'money.timing.decade.expansion',
    layer: 'timing',
    scale: 'decade',
    domain: 'money',
    meaning: '10년 재물 확장 국면',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '대운 재성과 외행성(목성·토성)의 재물 하우스 통과가 함께 — 10년 단위로 재물 기반이 확장되는 국면.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.timing.daeun.sibsin.정재',
        'saju.timing.daeun.sibsin.편재',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.timing.transit.Jupiter.house.2',
        'astro.timing.transit.Jupiter.house.8',
      ]),
  },
  {
    id: 'career.timing.decade.responsibility',
    layer: 'timing',
    scale: 'decade',
    domain: 'career',
    meaning: '책임 강화 10년',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '대운 관성과 토성의 직업 하우스 통과가 함께 — 책임·구조화 압박이 10년 흐름의 중심 테마.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.timing.daeun.sibsin.정관',
        'saju.timing.daeun.sibsin.편관',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.timing.transit.Saturn.house.10',
        'astro.timing.transit.Saturn.house.6',
      ]),
  },

  // ── year scale ───────────────────────────────────────────
  {
    id: 'money.timing.year.stable-income',
    layer: 'timing',
    scale: 'year',
    domain: 'money',
    meaning: '올해 안정 수입',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '세운 정재와 Solar Return의 2궁/Jupiter 강조가 함께 — 안정적 수입 흐름이 올해 강조됨.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.정재']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.solarReturn.Jupiter.house.',
        'astro.timing.solarReturn.Venus.house.2',
      ]),
  },
  {
    id: 'self.timing.year.pressure',
    layer: 'timing',
    scale: 'year',
    domain: 'self',
    meaning: '올해 자아 압박',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '세운 편관과 토성/명왕성의 hard 트랜짓이 함께 — 자아·정체성에 시험·책임 압력이 가중되는 한 해.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.seun.sibsin.편관']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Saturn.',
        'astro.timing.transit.Pluto.',
      ]),
  },
  {
    id: 'love.timing.year.relationship-shift',
    layer: 'timing',
    scale: 'year',
    domain: 'love',
    meaning: '올해 관계 변동',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '세운에 일지·재성 활성과 Solar Return 7궁/Venus 활성이 같이 — 관계 시작·정리·재정의의 해.',
      conflict:
        '관계 신호가 양쪽에서 다르게 잡힘 — 외형적 안정과 내면적 변화가 어긋나는 양면적 한 해.',
    },
    sajuPredicate: (s) =>
      hitByPrefix(s, [
        'saju.timing.seun.sibsin.정재',
        'saju.timing.seun.sibsin.편재',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.solarReturn.Venus.house.7',
        'astro.timing.solarReturn.Venus.house.5',
      ]),
  },

  // ── month scale ──────────────────────────────────────────
  {
    id: 'self.timing.month.tension',
    layer: 'timing',
    scale: 'month',
    domain: 'self',
    meaning: '이번 달 자아 긴장',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '월운 편관과 Lunar Return의 1궁/10궁 Mars 강조가 함께 — 한 달 단위로 압박감이 누적.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.timing.wolun.sibsin.편관']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.timing.lunarReturn.Mars.house.1',
        'astro.timing.lunarReturn.Mars.house.10',
      ]),
  },

  // ── day scale ────────────────────────────────────────────
  {
    id: 'money.timing.day.friction',
    layer: 'timing',
    scale: 'day',
    domain: 'money',
    meaning: '오늘 재정 마찰',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '일진과 일일 트랜짓이 함께 재정 영역을 건드림 — 오늘은 큰 결제·계약을 미루는 게 안전.',
    },
    sajuPredicate: (s) =>
      hitByPrefix(s, [
        'saju.timing.iljin.sibsin.편재',
        'saju.timing.iljin.sibsinJi.편재',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Mars.square.natal.Venus',
        'astro.timing.transit.Saturn.opposition.natal.Venus',
      ]),
  },

  // ── event scale (composite activations) ──────────────────
  {
    id: 'self.timing.event.dormant-activated',
    layer: 'timing',
    scale: 'event',
    domain: 'self',
    meaning: '잠복 약점의 활성화',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '평소 잠잠하던 원국·natal의 약한 자리가 양 시스템에서 동시에 발화 — 표면화되는 시기. 회피 말고 직면 권장.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.event.activate.']),
  },
]
