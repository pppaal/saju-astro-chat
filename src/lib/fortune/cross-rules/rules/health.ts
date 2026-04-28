// Health-domain rules.
//
// 전문가 시각:
// - 사주: 일간 강약 + 오행 균형 + 식상/인성 비중 + 6궁(노동) 신살.
// - 점성: 6궁 emphasis, Mars/Saturn dignity, Neptune (만성·심리), Sun/Moon hard.
//
// 건강은 단정적 신호를 만들지 않는다 — "구조적 취약점/안정점"으로만 본다.

import { hitByKeys, hitByPrefix, noHit } from '../engine'
import type { Hit, Rule } from '../types'

export const healthRules: Rule[] = [
  // ─── 평생 골격: state ───────────────────────────────────
  {
    id: 'health.state.balanced-elements',
    layer: 'state',
    domain: 'health',
    meaning: '오행 균형',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 오행 분포가 비교적 고르고 점성 4원소도 한쪽에 쏠리지 않음 — 체질 기반의 균형이 잡힌 결로, 건강의 회복 탄력성이 좋음.',
    },
    // 사주: 어느 원소도 우세하지 않음 (dominant 없음을 추정 — 모든 absent 없음 + 모든 dominant 없음 둘 다 만족 어려워서, 5원소 중 4개 이상 존재하면 균형으로 본다)
    sajuPredicate: (_, ctx) => {
      const present = ['wood', 'fire', 'earth', 'metal', 'water'].filter(
        (e) => ctx.hasSaju(`saju.state.elementCount.${e}`) && !ctx.hasSaju(`saju.state.elementAbsent.${e}`),
      )
      if (present.length >= 4) return { fired: true, strength: present.length / 5, evidence: { present } } as Hit
      return noHit
    },
    // 점성: 어느 mode도 dominant가 아님
    astroPredicate: (_, ctx) => {
      const dominantAny =
        ctx.hasAstro('astro.state.modeDominant.cardinal') ||
        ctx.hasAstro('astro.state.modeDominant.fixed') ||
        ctx.hasAstro('astro.state.modeDominant.mutable')
      if (dominantAny) return noHit
      return { fired: true, strength: 0.7, evidence: { balanced: 'mode' } } as Hit
    },
  },

  {
    id: 'health.state.fire-water-imbalance',
    layer: 'state',
    domain: 'health',
    meaning: '한열 불균형',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 화·수 분포가 한쪽으로 치우침과 점성 fire/water 사인 분포 불균형이 함께 — 한열·면역 균형 관리에 의식적 노력이 필요한 결.',
    },
    sajuPredicate: (_, ctx) => {
      const fireDom = ctx.hasSaju('saju.state.elementDominant.fire')
      const fireAbs = ctx.hasSaju('saju.state.elementAbsent.fire')
      const waterDom = ctx.hasSaju('saju.state.elementDominant.water')
      const waterAbs = ctx.hasSaju('saju.state.elementAbsent.water')
      // 한쪽 우세 + 다른쪽 결핍이면 불균형
      if ((fireDom && waterAbs) || (waterDom && fireAbs)) {
        return { fired: true, strength: 0.85, evidence: { fireDom, waterDom, fireAbs, waterAbs } } as Hit
      }
      return noHit
    },
    astroPredicate: (_, ctx) => {
      const fireRatio = ctx.astroStrength('astro.state.elementCount.fire')
      const waterRatio = ctx.astroStrength('astro.state.elementCount.water')
      const diff = Math.abs(fireRatio - waterRatio)
      if (diff >= 0.3) return { fired: true, strength: Math.min(1, diff * 1.5), evidence: { fireRatio, waterRatio } } as Hit
      return noHit
    },
  },

  {
    id: 'health.state.weak-vitality',
    layer: 'state',
    domain: 'health',
    meaning: '체력 자원 약',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 일간이 약하고 비겁도 부족하며 점성도 Mars detriment/fall 또는 1궁 약 — 체력·즉발력 자원이 얕은 결. 회복·휴식 루틴이 평생 중요.',
    },
    sajuPredicate: (_, ctx) => {
      const weak = ctx.hasSaju('saju.state.dayMaster.strength.weak')
      const noBigeop = !ctx.hasSaju('saju.state.sibsinGroup.비겁.strong')
      if (weak && noBigeop) {
        return { fired: true, strength: ctx.sajuStrength('saju.state.dayMaster.strength.weak'), evidence: { dayMaster: 'weak', bigeop: 'low' } } as Hit
      }
      return noHit
    },
    astroPredicate: (_, ctx) => {
      const weakMars =
        ctx.hasAstro('astro.state.dignity.Mars.detriment') ||
        ctx.hasAstro('astro.state.dignity.Mars.fall')
      if (weakMars) return { fired: true, strength: 0.8, evidence: { mars: 'weak' } } as Hit
      return noHit
    },
  },

  {
    id: 'health.state.digestive-emphasis',
    layer: 'state',
    domain: 'health',
    meaning: '소화·대사 영역',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 식상과 점성 6궁 emphasis가 함께 — 소화·대사·일상 루틴 영역이 건강의 키. 잘 관리하면 자산.',
      conflict: '식상 강한데 6궁 신호와 어긋남 — 활동량과 회복량이 매칭 안 되는 패턴이 있을 수 있음.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.sibsinGroup.식상.strong']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.planet.Sun.house.6', 'astro.state.planet.Mercury.house.6', 'astro.state.stellium.house.6']),
  },

  // ─── 시점: timing ──────────────────────────────────────
  {
    id: 'health.timing.year.stress-load',
    layer: 'timing',
    scale: 'year',
    domain: 'health',
    meaning: '올해 스트레스 부하',
    polarityHint: 'neg',
    narrative: {
      confirm: '세운 편관 또는 일간 충 + 점성 Saturn/Mars hard 트랜짓이 함께 — 신체 부담이 누적되기 쉬운 한 해. 수면·식이 우선.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.timing.seun.sibsin.편관',
        'saju.timing.event.day.지지충',
        'saju.timing.seun.activates.천간충',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.timing.transit.Saturn.', 'astro.timing.transit.Mars.', 'astro.timing.transit.Pluto.']),
  },

  {
    id: 'health.timing.year.recovery-window',
    layer: 'timing',
    scale: 'year',
    domain: 'health',
    meaning: '올해 회복기',
    polarityHint: 'pos',
    narrative: {
      confirm: '세운 인성과 Solar Return의 Jupiter/Moon benefic 위치가 함께 — 회복·치유·휴식의 흐름이 자연스러운 해.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, ['saju.timing.seun.sibsin.정인', 'saju.timing.seun.sibsin.편인']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.solarReturn.Jupiter.house.6',
        'astro.timing.solarReturn.Moon.house.4',
        'astro.timing.solarReturn.Moon.house.6',
      ]),
  },

  {
    id: 'health.timing.event.chronic-trigger',
    layer: 'timing',
    scale: 'event',
    domain: 'health',
    meaning: '만성 패턴 활성화',
    polarityHint: 'neg',
    narrative: {
      confirm: '운이 일주를 발화시키고 점성도 Neptune/Saturn이 natal 약점 자리를 자극 — 평소 잠복하던 만성 패턴이 표면화될 수 있음. 미루던 검진/관리 점검 시기.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.timing.event.activate.', 'astro.timing.transit.Neptune.', 'astro.timing.transit.Saturn.']),
  },
]
