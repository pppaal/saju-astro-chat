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
      confirm:
        '사주 오행 분포가 비교적 고르고 점성 4원소도 한쪽에 쏠리지 않음 — 체질 기반의 균형이 잡힌 결로, 건강의 회복 탄력성이 좋음.',
    },
    // 사주: 어느 원소도 우세하지 않음 (dominant 없음을 추정 — 모든 absent 없음 + 모든 dominant 없음 둘 다 만족 어려워서, 5원소 중 4개 이상 존재하면 균형으로 본다)
    sajuPredicate: (_, ctx) => {
      const present = ['wood', 'fire', 'earth', 'metal', 'water'].filter(
        (e) =>
          ctx.hasSaju(`saju.state.elementCount.${e}`) &&
          !ctx.hasSaju(`saju.state.elementAbsent.${e}`)
      )
      if (present.length >= 4)
        return { fired: true, strength: present.length / 5, evidence: { present } } as Hit
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
      confirm:
        '사주 화·수 분포가 한쪽으로 치우침과 점성 fire/water 사인 분포 불균형이 함께 — 한열·면역 균형 관리에 의식적 노력이 필요한 결.',
    },
    sajuPredicate: (_, ctx) => {
      const fireDom = ctx.hasSaju('saju.state.elementDominant.fire')
      const fireAbs = ctx.hasSaju('saju.state.elementAbsent.fire')
      const waterDom = ctx.hasSaju('saju.state.elementDominant.water')
      const waterAbs = ctx.hasSaju('saju.state.elementAbsent.water')
      // 한쪽 우세 + 다른쪽 결핍이면 불균형
      if ((fireDom && waterAbs) || (waterDom && fireAbs)) {
        return {
          fired: true,
          strength: 0.85,
          evidence: { fireDom, waterDom, fireAbs, waterAbs },
        } as Hit
      }
      return noHit
    },
    astroPredicate: (_, ctx) => {
      const fireRatio = ctx.astroStrength('astro.state.elementCount.fire')
      const waterRatio = ctx.astroStrength('astro.state.elementCount.water')
      const diff = Math.abs(fireRatio - waterRatio)
      if (diff >= 0.3)
        return {
          fired: true,
          strength: Math.min(1, diff * 1.5),
          evidence: { fireRatio, waterRatio },
        } as Hit
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
      confirm:
        '사주 일간이 약하고 비겁도 부족하며 점성도 Mars detriment/fall 또는 1궁 약 — 체력·즉발력 자원이 얕은 결. 회복·휴식 루틴이 평생 중요.',
    },
    sajuPredicate: (_, ctx) => {
      const weak = ctx.hasSaju('saju.state.dayMaster.strength.weak')
      const noBigeop = !ctx.hasSaju('saju.state.sibsinGroup.비겁.strong')
      if (weak && noBigeop) {
        return {
          fired: true,
          strength: ctx.sajuStrength('saju.state.dayMaster.strength.weak'),
          evidence: { dayMaster: 'weak', bigeop: 'low' },
        } as Hit
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
      confirm:
        '사주 식상과 점성 6궁 emphasis가 함께 — 소화·대사·일상 루틴 영역이 건강의 키. 잘 관리하면 자산.',
      conflict:
        '식상 강한데 6궁 신호와 어긋남 — 활동량과 회복량이 매칭 안 되는 패턴이 있을 수 있음.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.sibsinGroup.식상.strong']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Sun.house.6',
        'astro.state.planet.Mercury.house.6',
        'astro.state.stellium.house.6',
      ]),
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
      confirm:
        '세운 편관 또는 일간 충 + 점성 Saturn/Mars hard 트랜짓이 함께 — 신체 부담이 누적되기 쉬운 한 해. 수면·식이 우선.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.timing.seun.sibsin.편관',
        'saju.timing.event.day.지지충',
        'saju.timing.seun.activates.천간충',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.transit.Saturn.',
        'astro.timing.transit.Mars.',
        'astro.timing.transit.Pluto.',
      ]),
  },

  {
    id: 'health.timing.year.recovery-window',
    layer: 'timing',
    scale: 'year',
    domain: 'health',
    meaning: '올해 회복기',
    polarityHint: 'pos',
    narrative: {
      confirm:
        '세운 인성과 Solar Return의 Jupiter/Moon benefic 위치가 함께 — 회복·치유·휴식의 흐름이 자연스러운 해.',
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
      confirm:
        '운이 일주를 발화시키고 점성도 Neptune/Saturn이 natal 약점 자리를 자극 — 평소 잠복하던 만성 패턴이 표면화될 수 있음. 미루던 검진/관리 점검 시기.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.event.day.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.timing.event.activate.',
        'astro.timing.transit.Neptune.',
        'astro.timing.transit.Saturn.',
      ]),
  },

  // ─── 한방(韓方) 일간 × 오행 불균형 패턴 ──────────────────
  // 갑·을(목) — 간/담 / 병·정(화) — 심/소장 / 무·기(토) — 비/위
  // 경·신(금) — 폐/대장 / 임·계(수) — 신/방광
  // 일간이 강한 element + 그 element를 극하는 다른 element 강 = 부담

  {
    id: 'health.state.wood-fire-liver-heat',
    layer: 'state',
    domain: 'health',
    meaning: '간열 패턴 (목 일간 + 화 강)',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일간이 갑·을(목)이고 화 기운이 강함 + 점성 fire 사인 강세 또는 Mars hard aspect — 한방 관점의 간열·두통·분노 누적 패턴이 평생 잠재. 정서 발산·휴식 루틴 중요.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.wood')
      const fireDom = ctx.hasSaju('saju.state.elementDominant.fire')
      if (dmEl && fireDom)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'wood', fire: 'dominant' } }
      return { fired: false, strength: 0, evidence: {} }
    },
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.elementDominant.fire', 'astro.relation.hard.Mars.']),
  },

  {
    id: 'health.state.fire-earth-skin-heat',
    layer: 'state',
    domain: 'health',
    meaning: '화토상관 패턴 (화 일간 + 토 강)',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 일간이 병·정(화)이고 토 기운이 강함 + 점성 earth 강세 — 한방의 화토상관·피부·소화 부담 패턴. 단 식상 표현이 잘 되면 외부 발산으로 균형.',
      conflict: '화 일간의 표현 욕구와 토의 안정 욕구가 부딪힘 — 외향과 내향의 균형이 건강의 키.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.fire')
      const earthDom = ctx.hasSaju('saju.state.elementDominant.earth')
      if (dmEl && earthDom)
        return { fired: true, strength: 0.8, evidence: { dayMaster: 'fire', earth: 'dominant' } }
      return { fired: false, strength: 0, evidence: {} }
    },
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.earth']),
  },

  {
    id: 'health.state.earth-water-digestive',
    layer: 'state',
    domain: 'health',
    meaning: '토류 패턴 (토 일간 + 수 강)',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일간이 무·기(토)이고 수 기운이 강함 + 점성 water 강세 — 한방의 토류(土流)·소화기 약화 패턴. 따뜻한 식이·규칙적 식사가 평생 중요.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.earth')
      const waterDom = ctx.hasSaju('saju.state.elementDominant.water')
      if (dmEl && waterDom)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'earth', water: 'dominant' } }
      return { fired: false, strength: 0, evidence: {} }
    },
    astroPredicate: (a) => hitByKeys(a, ['astro.state.elementDominant.water']),
  },

  {
    id: 'health.state.metal-fire-respiratory',
    layer: 'state',
    domain: 'health',
    meaning: '폐열 패턴 (금 일간 + 화 강)',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일간이 경·신(금)이고 화 기운이 강함 + 점성 fire 강세 또는 Mars hard 6궁 — 한방의 폐열·호흡기·대장 부담 패턴. 호흡 운동·맑은 공기 중요.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.metal')
      const fireDom = ctx.hasSaju('saju.state.elementDominant.fire')
      if (dmEl && fireDom)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'metal', fire: 'dominant' } }
      return { fired: false, strength: 0, evidence: {} }
    },
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.elementDominant.fire', 'astro.state.planet.Mars.house.6']),
  },

  {
    id: 'health.state.water-earth-kidney',
    layer: 'state',
    domain: 'health',
    meaning: '신장 부담 (수 일간 + 토 강)',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일간이 임·계(수)이고 토 기운이 강함 + 점성 Saturn 6궁 또는 Capricorn 강세 — 한방의 신장·방광·뼈 부담 패턴. 수분·휴식·따뜻함 우선.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.water')
      const earthDom = ctx.hasSaju('saju.state.elementDominant.earth')
      if (dmEl && earthDom)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'water', earth: 'dominant' } }
      return { fired: false, strength: 0, evidence: {} }
    },
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.planet.Saturn.house.6',
        'astro.state.planet.Saturn.sign.Capricorn',
        'astro.state.planet.Saturn.sign.염소자리',
      ]),
  },

  // ─── 만성·정신 영역 ────────────────────────────────────
  {
    id: 'health.state.chronic-foundation',
    layer: 'state',
    domain: 'health',
    meaning: '만성·잠복 영역',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일주 12운성이 휴면(쇠/병/사/묘/절)이고 점성 Saturn이 6궁에 자리 — 만성 컨디션 영역의 평생 잠재. 단기 회복보다 장기 관리·예방이 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.twelveStage.dormant.day']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.planet.Saturn.house.6']),
  },

  {
    id: 'health.state.psychosomatic',
    layer: 'state',
    domain: 'health',
    meaning: '심신 연결 — 정서가 신체로',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 인성이 강하고 점성 Moon-Neptune 또는 12궁 emphasis — 정서·무의식이 신체에 직접 영향을 주는 결. 마음 관리가 곧 건강 관리.',
      conflict:
        '내면 작업과 신체 활동의 우선순위가 바뀌는 시기 — 스트레스가 몸으로 가거나, 몸 상태가 정서를 좌우함.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.sibsinGroup.인성.strong']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Moon.house.12',
        'astro.relation.aspect.Moon.conjunction.Neptune',
        'astro.relation.aspect.Moon.opposition.Neptune',
        'astro.relation.aspect.Moon.square.Neptune',
      ]),
  },

  // ─── 추가 한방 상극 패턴 + 강체질 ───────────────────────
  {
    id: 'health.state.wood-metal-tension',
    layer: 'state',
    domain: 'health',
    meaning: '근육·신경 긴장 (목 일간 + 금 강)',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일간이 갑·을(목)인데 금 기운이 강해 금극목으로 눌림 + 점성 토성의 압박 신호 — 근육·신경·간담이 긴장으로 굳기 쉬운 패턴. 스트레칭·이완 루틴이 평생 보약.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.wood')
      const metalDom = ctx.hasSaju('saju.state.elementDominant.metal')
      if (dmEl && metalDom)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'wood', metal: 'dominant' } }
      return noHit
    },
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.relation.hard.Saturn.',
        'astro.state.planet.Saturn.house.6',
        'astro.state.elementDominant.air',
      ]),
  },

  {
    id: 'health.state.earth-wood-stomach',
    layer: 'state',
    domain: 'health',
    meaning: '소화·위장 부담 (토 일간 + 목 강)',
    polarityHint: 'neg',
    narrative: {
      confirm:
        '사주 일간이 무·기(토)인데 목 기운이 강해 목극토로 눌림 + 점성 6궁 화성/수성 자극 — 스트레스가 위장으로 가는 소화 부담 패턴. 천천히 먹고 마음을 가볍게 두는 게 키.',
    },
    sajuPredicate: (_, ctx) => {
      const dmEl = ctx.hasSaju('saju.state.dayMaster.element.earth')
      const woodDom = ctx.hasSaju('saju.state.elementDominant.wood')
      if (dmEl && woodDom)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'earth', wood: 'dominant' } }
      return noHit
    },
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Mars.house.6',
        'astro.relation.hard.Mars.',
        'astro.state.planet.Mercury.house.6',
      ]),
  },

  {
    id: 'health.state.excess-vitality',
    layer: 'state',
    domain: 'health',
    meaning: '강체질 — 에너지 과잉',
    polarityHint: 'mixed',
    narrative: {
      confirm:
        '사주 일간이 강하고 비겁도 두터운데 점성 화성도 힘이 셈 — 에너지가 넘치는 강체질. 잘 쓰면 정력적이지만 과로·염증·번아웃은 평생 관리 포인트.',
      conflict: '넘치는 추진력과 쉼의 균형이 평생 과제 — 멈추는 법을 익혀야 몸이 길게 가요.',
    },
    sajuPredicate: (_, ctx) => {
      const strong = ctx.hasSaju('saju.state.dayMaster.strength.strong')
      const bigeop = ctx.hasSaju('saju.state.sibsinGroup.비겁.strong')
      if (strong && bigeop)
        return { fired: true, strength: 0.85, evidence: { dayMaster: 'strong', bigeop: 'strong' } }
      return noHit
    },
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.accidental.Mars.strong',
        'astro.state.accidental.Mars.very_strong',
        'astro.state.dignity.Mars.domicile',
        'astro.state.dignity.Mars.exaltation',
        'astro.state.accidental.Sun.strong',
      ]),
  },
]
