// Rules that consume the extras pulled by the adapters:
// 신살, 12운성, 격국, 용신, 지장간 (saju side)
// dignity, mode, retrograde, stellium, mutual reception, fixed stars (astro side)

import { hitByKeys, hitByPrefix, noHit } from '../engine'
import type { Hit, Rule } from '../types'

export const extraRules: Rule[] = [
  // ─── 신살 × dignity / fixed stars ────────────────────────
  {
    id: 'self.state.lucky-shinsal-cross-benefic',
    layer: 'state',
    domain: 'self',
    meaning: '길성×benefic 조응',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 길성 신살(천을귀인 등)과 점성 benefic(목성·금성)의 dignity가 함께 — 위기 상황에서 도움이 들어오는 구조.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.shinsal.lucky.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.dignity.Jupiter.domicile',
        'astro.state.dignity.Jupiter.exaltation',
        'astro.state.dignity.Venus.domicile',
        'astro.state.dignity.Venus.exaltation',
      ]),
  },
  {
    id: 'self.state.unlucky-shinsal-cross-malefic',
    layer: 'state',
    domain: 'self',
    meaning: '흉성×malefic 조응',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 흉성 신살(망신·겁살 등)과 점성 malefic(화성·토성)의 hard 또는 detriment/fall이 함께 — 결정적 시기에 마찰이 누적되는 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.shinsal.unlucky.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.dignity.Mars.detriment',
        'astro.state.dignity.Mars.fall',
        'astro.state.dignity.Saturn.detriment',
        'astro.state.dignity.Saturn.fall',
      ]),
  },
  {
    id: 'love.state.dohwa-venus-emphasis',
    layer: 'state',
    domain: 'love',
    meaning: '도화 × Venus 강조',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 도화살과 점성 Venus의 강한 dignity 또는 자기 별자리 위치가 함께 — 매력·인기·관계 시작 본성.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.shinsal.도화', 'saju.state.shinsal.도화살']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.dignity.Venus.domicile',
        'astro.state.dignity.Venus.exaltation',
        'astro.state.planet.Venus.house.5',
        'astro.state.planet.Venus.house.7',
      ]),
  },
  {
    id: 'career.state.yeokma-mercury-emphasis',
    layer: 'state',
    domain: 'career',
    meaning: '역마 × 변동 행성',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 역마살과 점성 Mercury 또는 가변 mode 우세가 함께 — 이동·여행·변화 적응이 자기 강점.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.shinsal.역마']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.modeDominant.mutable',
        'astro.state.dignity.Mercury.domicile',
        'astro.state.dignity.Mercury.exaltation',
      ]),
  },
  {
    id: 'self.state.hwagae-spiritual',
    layer: 'state',
    domain: 'self',
    meaning: '화개 × 영성',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 화개살과 점성 Neptune 강조 또는 12궁 행성 강세가 함께 — 영성·고독·예술 영역에 끌림.',
      conflict: '영적 끌림과 현실 책임이 동시에 — 안과 밖이 다른 시기를 살아갈 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.shinsal.화개']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Neptune.house.',
        'astro.state.planet.Sun.house.12',
        'astro.state.planet.Moon.house.12',
      ]),
  },

  // ─── 12운성 × dignity ────────────────────────────────────
  {
    id: 'self.state.day-stage-active',
    layer: 'state',
    domain: 'self',
    meaning: '일주 활성 × Sun 강세',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 일주 12운성이 활성 단계(장생·임관·왕지 등)이고 점성 Sun이 dignity가 강함 — 자기 표현이 외부 환경에 잘 받쳐지는 구조.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.twelveStage.active.day']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Sun.domicile',
        'astro.state.dignity.Sun.exaltation',
      ]),
  },
  {
    id: 'self.state.day-stage-dormant',
    layer: 'state',
    domain: 'self',
    meaning: '일주 휴면 × Sun 약세',
    polarityHint: 'neg',
    narrative: {
      confirm: '사주 일주 12운성이 휴면 단계(쇠·병·사·묘·절)이고 점성 Sun도 detriment/fall 또는 12·6궁 — 자기 표현이 위축되기 쉬운 결.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.state.twelveStage.dormant.day']),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.dignity.Sun.detriment',
        'astro.state.dignity.Sun.fall',
        'astro.state.planet.Sun.house.12',
        'astro.state.planet.Sun.house.6',
      ]),
  },

  // ─── 격국 × house emphasis / chart shape ─────────────────
  {
    id: 'career.state.geokguk-formal-vs-mc',
    layer: 'state',
    domain: 'career',
    meaning: '정통 격국 × MC 강세',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 정격(정관격·정인격·재격 등)과 점성 MC/10궁 강조가 함께 — 사회적 정통 경로가 자기 길.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.geokguk.정관격',
        'saju.state.geokguk.정재격',
        'saju.state.geokguk.정인격',
        'saju.state.geokguk.category.정격',
      ]),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Sun.house.10',
        'astro.state.planet.Saturn.house.10',
        'astro.state.planet.Jupiter.house.10',
      ]),
  },
  {
    id: 'self.state.geokguk-extreme-vs-stellium',
    layer: 'state',
    domain: 'self',
    meaning: '특수격 × stellium',
    polarityHint: 'mixed',
    narrative: {
      confirm: '사주 특수격(종격·화기격국 등)과 점성 stellium(한 사인 또는 한 하우스에 행성 집중)이 함께 — 일반 해석이 안 통하는 특수한 자기 패턴. 한 영역에 인생이 쏠리는 결.',
      conflict: '특수격은 한 방향, 스텔리움은 다른 영역에 집중 — 사주와 점성이 가리키는 인생 무대가 다름. 우선순위 정립 필요.',
    },
    sajuPredicate: (s) =>
      hitByPrefix(s, ['saju.state.geokguk.category.종격', 'saju.state.geokguk.category.화기격국', 'saju.state.geokguk.category.특수격국']),
    astroPredicate: (a) =>
      hitByPrefix(a, ['astro.state.stellium.house.', 'astro.state.stellium.sign.']),
  },

  // ─── 용신 × dignity (context) ────────────────────────────
  {
    id: 'self.state.yongsin-flow-fit',
    layer: 'state',
    domain: 'self',
    polarityHint: 'context',
    meaning: '용신 흐름 × 자기 상태',
    narrative: {
      confirm: '사주 용신 오행이 점성 dignity 강한 행성 영역과 일치 — 평생 운영 방향이 외부 환경과 맞는 결.',
      conflict: '용신이 가리키는 방향과 점성 강한 영역이 어긋남 — 균형을 잡으려면 의식적 노력이 필요한 구조.',
    },
    sajuPredicate: (_, ctx) => {
      const yongsin =
        ctx.sajuByPrefix('saju.state.yongsin.primary.')[0]
      if (!yongsin) return noHit
      return { fired: true, strength: yongsin.strength, polarity: 'pos', evidence: yongsin.evidence } as Hit
    },
    astroPredicate: (_, ctx) => {
      const dignified =
        ctx.astroByPrefix('astro.state.dignity.').filter((s) =>
          s.key.endsWith('.domicile') || s.key.endsWith('.exaltation')
        )
      if (dignified.length === 0) return { fired: true, strength: 0.4, polarity: 'neg', evidence: { dignified: 0 } } as Hit
      return { fired: true, strength: Math.min(1, dignified.length / 4), polarity: 'pos', evidence: { dignifiedCount: dignified.length } } as Hit
    },
  },

  // ─── Mode dominance ──────────────────────────────────────
  {
    id: 'self.state.fixed-stability',
    layer: 'state',
    domain: 'self',
    meaning: '고정 안정 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 fixed mode 우세와 사주 토 강세 또는 격국 정격이 함께 — 일관·끈기·고정 영역에서 안정 발휘.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.elementDominant.earth',
        'saju.state.geokguk.category.정격',
      ]),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.modeDominant.fixed']),
  },
  {
    id: 'self.state.cardinal-initiative',
    layer: 'state',
    domain: 'self',
    meaning: '주도·시작 본성',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 cardinal mode 우세와 사주 비겁 또는 식상 강세가 함께 — 새 시작·주도가 자기 동력.',
    },
    sajuPredicate: (s) =>
      hitByPrefix(s, ['saju.state.elementDominant.fire', 'saju.state.elementDominant.wood']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.modeDominant.cardinal']),
  },

  // ─── Retrograde × 신약/내성 ──────────────────────────────
  {
    id: 'self.state.retrograde-introspection',
    layer: 'state',
    domain: 'self',
    meaning: '역행 × 내향 본성',
    polarityHint: 'mixed',
    narrative: {
      confirm: '점성 역행 행성이 다수 + 사주 일간 약 또는 인성 강세 — 외부 발신보다 내적 정리가 자기 결.',
      conflict: '역행 신호와 외향 신호가 혼재 — 시기에 따라 방향을 다르게 가져가야 하는 구조.',
    },
    sajuPredicate: (s, ctx) => {
      const weak = ctx.hasSaju('saju.state.dayMaster.strength.weak')
      if (weak) return { fired: true, strength: 0.7, evidence: { dayMaster: 'weak' } }
      return noHit
    },
    astroPredicate: (a) => hitByPrefix(a, ['astro.state.retrograde.']),
  },

  // ─── Mutual reception × 합 ───────────────────────────────
  {
    id: 'self.relation.mutual-support',
    layer: 'relation',
    domain: 'self',
    meaning: '상호 지지 구조',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 mutual reception(서로의 도미사일에 위치)과 사주 천간합·삼합이 함께 — 인생 영역들이 서로를 보강하는 구조.',
    },
    sajuPredicate: (s) => hitByKeys(s, ['saju.relation.천간합', 'saju.relation.지지삼합']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.relation.mutualReception.']),
  },

  // ─── Stellium × 격국 ────────────────────────────────────
  {
    id: 'career.state.stellium-tenth-vs-officer',
    layer: 'state',
    domain: 'career',
    meaning: '10궁 stellium × 관격',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 10궁(직업) 또는 6궁(노동)에 stellium + 사주 관성격이 함께 — 직업·역할이 인생 핵심 무대.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.geokguk.정관격',
        'saju.state.geokguk.편관격',
      ]),
    astroPredicate: (a) =>
      hitByKeys(a, [
        'astro.state.stellium.house.10',
        'astro.state.stellium.house.6',
      ]),
  },
  {
    id: 'love.state.stellium-seventh-vs-spouse',
    layer: 'state',
    domain: 'love',
    meaning: '7궁 stellium × 일지 활성',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 7궁(파트너십)에 stellium + 사주 일지(배우자궁) 합/삼합 활성 — 관계가 인생 메인 테마.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.relation.day.']),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.stellium.house.7']),
  },
  {
    id: 'family.state.fourth-house-stellium',
    layer: 'state',
    domain: 'family',
    meaning: '4궁 stellium × 인성',
    polarityHint: 'pos',
    narrative: {
      confirm: '점성 4궁(가정·뿌리)에 stellium + 사주 인성격 또는 월지 활성 — 가정·정서 기반이 인생 핵심.',
    },
    sajuPredicate: (s) =>
      hitByKeys(s, [
        'saju.state.geokguk.정인격',
        'saju.state.geokguk.편인격',
      ]),
    astroPredicate: (a) => hitByKeys(a, ['astro.state.stellium.house.4']),
  },

  // ─── 일진 × daily transit ────────────────────────────────
  {
    id: 'self.timing.day.iljin-active',
    layer: 'timing',
    scale: 'day',
    domain: 'self',
    meaning: '오늘 일진 활성',
    polarityHint: 'mixed',
    narrative: {
      confirm: '오늘 일진 시그널과 일일 transit이 같은 영역을 가리킴 — 컨디션·기분이 외부 흐름과 맞물리는 날.',
      conflict: '일진과 transit이 다른 영역을 가리킴 — 컨디션과 외부 일정이 어긋날 가능성, 페이스 조절 필요.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.iljin.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.transit.']),
  },

  // ─── Progression × 세운 ─────────────────────────────────
  {
    id: 'self.timing.year.progression-vs-seun',
    layer: 'timing',
    scale: 'year',
    domain: 'self',
    meaning: '점성 progression × 세운',
    polarityHint: 'mixed',
    narrative: {
      confirm: '점성 secondary progression의 natal aspect 활성과 사주 세운 십성이 함께 — 인생의 점진적 변화 흐름이 올해 표면화.',
      conflict: '진행 별과 운의 방향이 어긋남 — 내적 진화와 외적 사건이 다른 속도로 가는 시기.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.timing.seun.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.timing.progression.']),
  },

  // ─── Fixed stars × 신살 ─────────────────────────────────
  {
    id: 'self.state.fixed-star-fated',
    layer: 'state',
    domain: 'self',
    meaning: '항성 결합 × 신살',
    polarityHint: 'mixed',
    narrative: {
      confirm: '점성 fixed star가 natal 행성과 1° 내 합 + 사주 길성/흉성 신살 — 평생 단위로 운명적 색깔이 강한 결.',
      conflict: '항성과 신살의 색이 다름(길성-흉성 항성 또는 그 반대) — 같은 사람 안에 양면적 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.shinsal.']),
    astroPredicate: (a) => hitByPrefix(a, ['astro.state.fixedStar.']),
  },

  // ─── 지장간 × hidden / mutual ────────────────────────────
  {
    id: 'self.state.hidden-resource',
    layer: 'state',
    domain: 'self',
    meaning: '잠재 자원 활용',
    polarityHint: 'pos',
    narrative: {
      confirm: '사주 지장간(지지 안의 숨은 천간)이 다양 + 점성 12궁 행성 또는 mutual reception — 표면에 안 드러난 자원을 활용 가능한 결.',
    },
    sajuPredicate: (s) => hitByPrefix(s, ['saju.state.jijanggan.']),
    astroPredicate: (a) =>
      hitByPrefix(a, [
        'astro.state.planet.Sun.house.12',
        'astro.state.planet.Moon.house.12',
        'astro.relation.mutualReception.',
      ]),
  },
]
