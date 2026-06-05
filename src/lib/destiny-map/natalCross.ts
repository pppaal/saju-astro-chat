/**
 * 원국(natal) 교차 평가기 — 사주의 고정 정체성과 점성의 고정 정체성을
 * "같은 대응 지식"으로 교차해 도메인별 판정을 낸다.
 *
 * 캘린더의 cross-activation 엔진은 "같은 날 두 신호가 동시에 켜질 때"
 * 발화하는 시간(흐름) 기반이라, 날짜가 없는 원국 정체성에는 그대로 못 쓴다.
 * 이 모듈은 그 엔진과 같은 지식(오행 생극 + 17 A급 십신/신살↔행성 매핑 +
 * essential dignity)을 정적 정체성 교차에 적용한다.
 *
 * 사용자에게 보이는 reason 문구는 전문용어 없이 일상어로 쓴다
 * (예: "정관격↔토성" 같은 표현 금지 → "타고난 성향이 사회생활에서도 강점").
 *
 * DB·네트워크 의존 없음 — 이미 계산된 사주/점성 객체만으로 동작.
 */

import {
  GENERATES,
  CONTROLS,
  KO_TO_SAJU_ELEMENT,
  SIGN_TO_ASTRO_ELEMENT,
  type SajuElement,
} from '@/lib/fusion/bridges/element'
import {
  SAJU_ASTRO_MAPPINGS,
  type CrossMapping,
} from '@/lib/calendar-engine/data/saju-astro-mapping'
import { dignityOf } from '@/lib/astrology/foundation/dignities'
import { SIGN_KO_TO_EN, PLANET_LABEL, ELEMENT_LABEL } from './chartLabels'

export type CrossTone = 'resonant' | 'complement' | 'tension' | 'neutral'
export type Lang = 'ko' | 'en'

export interface CrossVerdict {
  tone: CrossTone
  reason: { ko: string; en: string }
}

export interface NatalSynthesis {
  tone: CrossTone
  text: { ko: string; en: string }
}

// ── 라벨 사전 (공용 chartLabels 에서 파생 — 단일 소스) ──────────────────────
const EL_KO: Record<SajuElement, string> = {
  wood: ELEMENT_LABEL.wood.ko,
  fire: ELEMENT_LABEL.fire.ko,
  earth: ELEMENT_LABEL.earth.ko,
  metal: ELEMENT_LABEL.metal.ko,
  water: ELEMENT_LABEL.water.ko,
}
const EL_EN: Record<SajuElement, string> = {
  wood: ELEMENT_LABEL.wood.en,
  fire: ELEMENT_LABEL.fire.en,
  earth: ELEMENT_LABEL.earth.en,
  metal: ELEMENT_LABEL.metal.en,
  water: ELEMENT_LABEL.water.en,
}

// dignityOf 는 영문 sign 만 인식 → 한국어면 영문으로 정규화.
const EN_SIGNS = new Set(Object.values(SIGN_KO_TO_EN))

function toEnSign(sign: string | undefined): string | undefined {
  if (!sign) return undefined
  if (EN_SIGNS.has(sign)) return sign
  return SIGN_KO_TO_EN[sign]
}

// ── 원소 정규화 / 관계 ─────────────────────────────────────────────────────
const SAJU_ELS: SajuElement[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** '금'·'metal'·'Metal' 등을 SajuElement 로 정규화. */
export function normSajuElement(x: string | undefined): SajuElement | undefined {
  if (!x) return undefined
  if (x in KO_TO_SAJU_ELEMENT) return KO_TO_SAJU_ELEMENT[x]
  const lower = x.toLowerCase()
  return (SAJU_ELS as string[]).includes(lower) ? (lower as SajuElement) : undefined
}

/** 점성 sign → 사주 5원소. air 는 무손실 대응이 없어 목(확장·움직임)으로 근사. */
export function signToSajuElement(sign: string | undefined): SajuElement | undefined {
  if (!sign) return undefined
  const a = SIGN_TO_ASTRO_ELEMENT[sign]
  if (!a) return undefined
  return a === 'air' ? 'wood' : a
}

export type ElementRelation = 'same' | 'aGenB' | 'bGenA' | 'aCtrlB' | 'bCtrlA' | 'none'

export function elementRelation(a: SajuElement, b: SajuElement): ElementRelation {
  if (a === b) return 'same'
  if (GENERATES[a] === b) return 'aGenB'
  if (GENERATES[b] === a) return 'bGenA'
  if (CONTROLS[a] === b) return 'aCtrlB'
  if (CONTROLS[b] === a) return 'bCtrlA'
  return 'none'
}

// ── 십신/신살 → 행성 매핑 (A급 17개 재사용, saju 키 기준 첫 매핑) ──────────
const SAJU_TO_MAPPING = new Map<string, CrossMapping>()
for (const m of SAJU_ASTRO_MAPPINGS) {
  if (!SAJU_TO_MAPPING.has(m.saju)) SAJU_TO_MAPPING.set(m.saju, m)
}

export function sajuKeyMapping(key: string | undefined): CrossMapping | undefined {
  if (!key) return undefined
  return SAJU_TO_MAPPING.get(key)
}

// ── 도메인 평가기 (단일 포인트) ────────────────────────────────────────────

/** 정체성: 일간 오행 ↔ 태양 별자리. */
export function evalIdentity(
  dayMasterEl: string | undefined,
  sunSign: string | undefined,
): CrossVerdict | null {
  const a = normSajuElement(dayMasterEl)
  const b = signToSajuElement(sunSign)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    sameKo: '속마음과 겉으로 보이는 모습이 같은 방향이에요 — "생긴 대로, 나답게" 살 때 가장 편한 사람.',
    sameEn: 'Your inner and outer selves point the same way — you feel best just being yourself.',
    genKo: '타고난 본바탕과 드러나는 자아는 결이 다르지만 서로 잘 받쳐줘요 — 안과 밖이 균형 잡힌 타입.',
    genEn: 'Your inner nature and outer self differ but support each other — well balanced.',
    ctrlKo: '타고난 본바탕과 드러나는 자아가 다른 방향이라, 가끔 "내가 진짜 원하는 게 뭐지?" 싶을 수 있어요.',
    ctrlEn: 'Inner nature and outer self pull different ways — you may question what you really want.',
  })
}

/** 필요·욕망: 용신 오행 ↔ 달 별자리. */
export function evalNeeds(
  yongsinEl: string | undefined,
  moonSign: string | undefined,
): CrossVerdict | null {
  const need = normSajuElement(yongsinEl)
  const moon = signToSajuElement(moonSign)
  if (!need || !moon) return null
  if (moon === need)
    return {
      tone: 'resonant',
      reason: {
        ko: '마음이 진짜 필요로 하는 것과 평소 끌리는 것이 딱 맞아요 — 자기를 잘 챙기는 편.',
        en: 'What you truly need and what you’re drawn to line up — you take good care of yourself.',
      },
    }
  if (GENERATES[moon] === need)
    return {
      tone: 'complement',
      reason: {
        ko: '평소 마음이 끌리는 쪽이, 정작 필요한 걸 자연스럽게 채워줘요.',
        en: 'What you’re naturally drawn to ends up supplying what you need.',
      },
    }
  if (CONTROLS[moon] === need)
    return {
      tone: 'tension',
      reason: {
        ko: '평소 끌리는 것과 정작 필요한 게 어긋나서, 원하는 것만 좇다 중요한 걸 놓칠 수 있어요.',
        en: 'What you crave and what you need pull apart — chasing wants can crowd out needs.',
      },
    }
  return {
    tone: 'neutral',
    reason: {
      ko: '마음의 필요와 평소 끌림이 따로 노는 편 — 의식적으로 챙겨주면 좋아요.',
      en: 'Your needs and your pulls run on separate tracks — worth tending on purpose.',
    },
  }
}

/** 사회 역할: 격국 ↔ MC. 격국 대표 십신을 행성으로 환원해 MC 위신으로 판정. */
export function evalSocialRole(
  geokguk: string | undefined,
  mcSign: string | undefined,
): CrossVerdict | null {
  if (!geokguk || !mcSign) return null
  const sibsin = geokguk.replace(/격$/, '')
  const mapping = sajuKeyMapping(sibsin)
  const planet = mapping?.astro
  if (!planet) return null
  const en = toEnSign(mcSign)
  const dig = en ? dignityOf(planet, en) : 'peregrine'
  if (dig === 'domicile' || dig === 'exaltation')
    return {
      tone: 'resonant',
      reason: {
        ko: '타고난 성향이 직업·사회적 위치에서도 그대로 강점으로 드러나요 — 일에서 신뢰받기 좋은 사람.',
        en: 'Your natural bent shows up as a strength in work and status — easy to be trusted on the job.',
      },
    }
  if (dig === 'detriment' || dig === 'fall')
    return {
      tone: 'tension',
      reason: {
        ko: '타고난 성향과 사회가 기대하는 역할이 살짝 어긋나서, 직업에서 "이게 맞나" 고민이 생길 수 있어요.',
        en: 'Your nature and the role society expects don’t quite match — work can raise doubts.',
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: '타고난 성향을 사회생활이 다른 방식으로 넓혀줘요 — 일하면서 새로운 면이 열리는 타입.',
      en: 'Work and status stretch your nature in a new direction — fresh sides open up on the job.',
    },
  }
}

/** 길흉: 일주 신살 ↔ 대응 행성. A급 매핑 polarity 로 길(동조)·흉(주의) 판정. */
export function evalFortune(shinsal: string[] | undefined): CrossVerdict | null {
  if (!shinsal || shinsal.length === 0) return null
  let mapping: CrossMapping | undefined
  for (const s of shinsal) {
    const m = sajuKeyMapping(s)
    if (m) {
      mapping = m
      break
    }
  }
  if (!mapping) return null
  if (mapping.polarity < 0)
    return {
      tone: 'tension',
      reason: {
        ko: '추진력·승부욕을 세게 타고났어요. 큰 무기지만, 욱하거나 과속하지 않게만 조심하면 좋아요.',
        en: 'You’re born with strong drive — a real asset, just watch the temper and the gas pedal.',
      },
    }
  return {
    tone: 'resonant',
    reason: {
      ko: '사람을 끌거나 복이 되는 좋은 기운을 타고났어요 — 동·서양 풀이가 똑같이 강점으로 봐요.',
      en: 'You carry a natural charm/luck that both systems read as a clear strength.',
    },
  }
}

/** 관계: 사주 합/충 ↔ 점성 조화각/긴장각의 우세 방향. */
export function evalRelations(
  hap: number,
  chung: number,
  harmonious: number,
  hard: number,
): CrossVerdict | null {
  if (hap + chung + harmonious + hard === 0) return null
  const sajuHarmony = hap - chung
  const astroHarmony = harmonious - hard
  if (sajuHarmony > 0 && astroHarmony > 0)
    return {
      tone: 'resonant',
      reason: {
        ko: '사람들과 잘 어울리고 관계가 매끄럽게 풀리는 편 — 동·서양 둘 다 그렇게 봐요.',
        en: 'You get along easily and relationships flow — both systems agree.',
      },
    }
  if (sajuHarmony < 0 && astroHarmony < 0)
    return {
      tone: 'tension',
      reason: {
        ko: '관계에서 부딪힘이 좀 있는 편인데, 그 마찰을 통해 오히려 더 단단해지는 타입이에요.',
        en: 'Relationships bring some friction — but you grow tougher through it.',
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: '어떤 관계는 매끄럽고 어떤 관계는 부딪혀요 — 상황 따라 두 모습이 다 나오는 균형형.',
      en: 'Some ties flow, some clash — you show both sides depending on the situation.',
    },
  }
}

/** 강점: 12운성(일주) ↔ 차트에서 가장 위신 높은 행성. */
const STRONG_STAGES = new Set(['장생', '관대', '건록', '제왕'])
const WEAK_STAGES = new Set(['병', '사', '묘', '절'])

export function evalStrength(
  twelveStage: string | undefined,
  topDignity: { planet: string; status: string } | null,
): CrossVerdict | null {
  if (!twelveStage && !topDignity) return null
  const sajuStrong = twelveStage ? STRONG_STAGES.has(twelveStage) : false
  const sajuWeak = twelveStage ? WEAK_STAGES.has(twelveStage) : false
  const astroStrong = !!topDignity
  if (sajuStrong && astroStrong)
    return {
      tone: 'resonant',
      reason: {
        ko: '타고난 힘이 가장 셀 자리에 있고 별자리 쪽 강점도 겹쳐요 — 자기 분야에서 두각 내기 좋은 사람.',
        en: 'Your power sits at its strongest and your chart’s strength stacks on top — built to stand out.',
      },
    }
  if (astroStrong)
    return {
      tone: 'complement',
      reason: {
        ko: '별자리 쪽에 뚜렷한 강점이 하나 있어요 — 그 분야에서 힘을 발휘하기 좋아요.',
        en: 'There’s one clear strength in your chart — a place you can really deliver.',
      },
    }
  if (sajuStrong)
    return {
      tone: 'complement',
      reason: {
        ko: '타고난 힘이 안정적으로 받쳐주는 자리예요 — 자기 자리를 잡는 데 강한 편.',
        en: 'Your foundation is solid — you’re strong at claiming your own ground.',
      },
    }
  if (sajuWeak)
    return {
      tone: 'neutral',
      reason: {
        ko: '지금은 힘을 비축하는 단계 — 무리하게 밀어붙이기보다 충전하며 가면 좋아요.',
        en: 'A recharging phase — better to refill than to push hard right now.',
      },
    }
  return {
    tone: 'neutral',
    reason: {
      ko: '특정 분야에 확 쏠리기보다 여러 면이 고르게 퍼진 균형형이에요.',
      en: 'No single spike — your strengths are spread evenly.',
    },
  }
}

// ── 분포·전체급 교차 (차트의 모든 글자/행성을 집계) ────────────────────────

/** 오행 카운트(한/영 키 혼용)에서 가장 강한 원소. */
export function dominantSajuElement(
  counts: Record<string, number> | undefined,
): SajuElement | undefined {
  if (!counts) return undefined
  const agg: Record<SajuElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const [k, v] of Object.entries(counts)) {
    const el = normSajuElement(k)
    if (el && typeof v === 'number') agg[el] += v
  }
  let best: SajuElement | undefined
  let bestN = -1
  for (const el of SAJU_ELS) {
    if (agg[el] > bestN) {
      bestN = agg[el]
      best = el
    }
  }
  return bestN > 0 ? best : undefined
}

/** 점성 sign 배열에서 가장 강한 원소(5원소 공간). */
export function dominantAstroElement(signs: string[] | undefined): SajuElement | undefined {
  if (!signs || signs.length === 0) return undefined
  const agg: Record<SajuElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const s of signs) {
    const el = signToSajuElement(s)
    if (el) agg[el] += 1
  }
  let best: SajuElement | undefined
  let bestN = -1
  for (const el of SAJU_ELS) {
    if (agg[el] > bestN) {
      bestN = agg[el]
      best = el
    }
  }
  return bestN > 0 ? best : undefined
}

/** 기질: 사주 오행 분포 ↔ 점성 원소 분포 — 차트 전체의 우세 기운을 교차. */
export function evalTemperament(
  sajuCounts: Record<string, number> | undefined,
  astroSigns: string[] | undefined,
): CrossVerdict | null {
  const a = dominantSajuElement(sajuCounts)
  const b = dominantAstroElement(astroSigns)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    sameKo: '사주로 봐도 별자리로 봐도 같은 성향이 제일 강해요 — 한 가지 색이 또렷한 사람.',
    sameEn: 'Both systems agree on your strongest trait — one clear, defined color.',
    genKo: '사주가 보는 성향과 별자리가 보는 성향이 서로 잘 맞물려서 받쳐줘요.',
    genEn: 'Your two strongest traits interlock and support each other.',
    ctrlKo: '사주가 보는 주된 성향과 별자리가 보는 성향이 서로 당겨요 — 안에 다른 두 기운이 같이 있는 셈.',
    ctrlEn: 'Your two main traits pull against each other — two different energies side by side.',
  })
}

// 십신 5그룹 → 대표 행성 (A급 매핑 방향과 일치).
const SIBSIN_GROUP_PLANETS: Record<string, string[]> = {
  관성: ['Saturn', 'Mars'],
  재성: ['Venus', 'Mercury'],
  인성: ['Jupiter', 'Moon'],
  식상: ['Mercury'],
  비겁: ['Sun', 'Mars'],
}
// 그룹별 "쉬운 말" 테마.
const SIBSIN_GROUP_THEME: Record<string, { ko: string; en: string }> = {
  관성: { ko: '책임감·체계', en: 'duty and structure' },
  재성: { ko: '실리·현실 감각', en: 'practicality and value' },
  인성: { ko: '배움·돌봄', en: 'learning and care' },
  식상: { ko: '표현·창의', en: 'expression and creativity' },
  비겁: { ko: '주체성·승부욕', en: 'independence and drive' },
}
const SIBSIN_GROUPS = ['비겁', '식상', '재성', '관성', '인성']

/** 십신 그룹 카운트에서 가장 강한 그룹. */
export function dominantSibsinGroup(
  details: Record<string, number> | undefined,
): string | undefined {
  if (!details) return undefined
  let best: string | undefined
  let bestN = -1
  for (const g of SIBSIN_GROUPS) {
    const n = details[g] ?? 0
    if (n > bestN) {
      bestN = n
      best = g
    }
  }
  return bestN > 0 ? best : undefined
}

/** 에너지 방향: 십신 우세 그룹 ↔ 그 그룹의 대표 행성이 차트에서 강조됐는가. */
export function evalEnergyDirection(
  details: Record<string, number> | undefined,
  emphasizedPlanets: Set<string>,
): CrossVerdict | null {
  const group = dominantSibsinGroup(details)
  if (!group) return null
  const planets = SIBSIN_GROUP_PLANETS[group] ?? []
  const theme = SIBSIN_GROUP_THEME[group]
  const matched = planets.filter((p) => emphasizedPlanets.has(p))
  if (matched.length > 0)
    return {
      tone: 'resonant',
      reason: {
        ko: `타고나길 가장 중요하게 여기는 게 '${theme.ko}'인데, 별자리도 같은 쪽을 가리켜요 — 에너지가 한 방향으로 모인 사람.`,
        en: `You most value ${theme.en}, and your chart points the same way — energy gathered in one direction.`,
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: `타고나길 '${theme.ko}' 쪽이 강한데, 별자리는 그 힘을 다른 통로로 풀어줘요 — 한 가지를 여러 방식으로 쓰는 타입.`,
      en: `You lean strongly toward ${theme.en}, and your chart channels it through other routes.`,
    },
  }
}

/** 드러나는 나: 일간(본질) ↔ ASC(첫인상·외적 자아). */
export function evalPersona(
  dayMasterEl: string | undefined,
  ascSign: string | undefined,
): CrossVerdict | null {
  const a = normSajuElement(dayMasterEl)
  const b = signToSajuElement(ascSign)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    sameKo: '속 모습과 남에게 비치는 첫인상이 같아요 — "보이는 그대로인 사람"이라 신뢰 주기 쉬워요.',
    sameEn: 'Your inner self and first impression match — what people see is what they get.',
    genKo: '속 모습과 첫인상이 결은 다르지만 서로 잘 받쳐줘요.',
    genEn: 'Your inner self and first impression differ but back each other up.',
    ctrlKo: '속마음과 겉으로 비치는 첫인상이 달라서, 처음엔 오해받다 알고 보면 반전 있는 타입.',
    ctrlEn: 'Inner self and first impression differ — easily misread at first, a pleasant surprise later.',
  })
}

/** 추진력: 신강약(사주) ↔ 자기주장 행성(태양·화성) 강조 여부. */
export function evalDrive(
  strengthLevel: string | undefined,
  selfEmphasized: boolean,
): CrossVerdict | null {
  if (!strengthLevel) return null
  const s = strengthLevel.toLowerCase()
  const strong = /강|strong/.test(s) && !/약/.test(strengthLevel)
  const weak = /약|weak/.test(s)
  if (strong)
    return selfEmphasized
      ? {
          tone: 'resonant',
          reason: {
            ko: '타고나길 자기 주도로 밀어붙이는 힘이 강하고, 별자리도 앞에 나서는 기질을 받쳐줘요 — 리더·행동파.',
            en: 'You’re wired to drive things yourself, and your chart backs that up — a leader/doer.',
          },
        }
      : {
          tone: 'complement',
          reason: {
            ko: '타고난 추진력은 센데, 별자리는 그 힘을 부드럽게 다듬어줘요 — 세지만 거칠지 않은 타입.',
            en: 'Strong inner drive, softened by your chart — forceful but not rough.',
          },
        }
  if (weak)
    return selfEmphasized
      ? {
          tone: 'tension',
          reason: {
            ko: '타고나길 받쳐주고 조율하는 쪽인데 별자리는 앞에 나서라 부추겨요 — 속도와 무대가 엇갈릴 수 있어요.',
            en: 'You’re built to support, but your chart pushes you forward — pace and stage can clash.',
          },
        }
      : {
          tone: 'resonant',
          reason: {
            ko: '타고나길 혼자 밀어붙이기보다 받쳐주고 조율하는 데 강한데, 별자리도 같은 결 — 든든한 조력자형.',
            en: 'You shine at supporting and harmonizing rather than forcing — your chart agrees.',
          },
        }
  return {
    tone: 'neutral',
    reason: {
      ko: '주도와 조율 사이에서 균형 잡힌 편 — 상황에 따라 앞에 서기도, 받쳐주기도 해요.',
      en: 'Balanced between leading and supporting — you do both as the moment calls.',
    },
  }
}

// 행성 쌍 → 의미·테마(쉬운 말). 키는 알파벳순 "A|B".
const PERSONAL_PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'])
const MAJOR_ASPECTS = new Set(['conjunction', 'sextile', 'square', 'trine', 'opposition'])
const ASPECT_PAIR_THEME: Record<string, { ko: string; en: string; group: string }> = {
  'Jupiter|Sun': { ko: '타고난 낙천과 자신감 — 기회를 크게 보고 사람을 끌어요.', en: 'Born optimism and confidence — you think big and draw people in.', group: '인성' },
  'Mars|Sun': { ko: '에너지가 넘치고 앞장서는 행동파예요.', en: 'High energy, first to act — a doer.', group: '비겁' },
  'Saturn|Sun': { ko: '일찍 철든 책임감형 — 인정은 늦게 와도 단단하게 쌓여요.', en: 'Mature and responsible early — recognition comes slow but solid.', group: '관성' },
  'Moon|Venus': { ko: '정 많고 사람을 끄는 다정한 매력형이에요.', en: 'Warm and magnetic — people feel at ease with you.', group: '재성' },
  'Moon|Saturn': { ko: '감정을 안으로 삭이는 진중하고 어른스러운 타입이에요.', en: 'You hold feelings in — steady and grown-up.', group: '인성' },
  'Mars|Moon': { ko: '감정이 솔직하고 열정적 — 가끔 욱하지만 뒤끝은 없어요.', en: 'Honest, passionate feelings — quick to flare, quick to let go.', group: '비겁' },
  'Mercury|Saturn': { ko: '말과 생각이 신중하고 논리적인 편이에요.', en: 'Careful, logical in thought and speech.', group: '관성' },
  'Mars|Venus': { ko: '관계·연애에 적극적이고 매력을 잘 드러내요.', en: 'Forward in love and quick to show your charm.', group: '재성' },
  'Saturn|Venus': { ko: '관계에 신중하고 진지 — 한번 정하면 오래가요.', en: 'Careful and serious in love — once you commit, it lasts.', group: '관성' },
  'Mars|Saturn': { ko: '참을성 있게 끝까지 밀어붙이는 인내형이에요.', en: 'Patient, you push through to the end.', group: '관성' },
  'Moon|Sun': { ko: '속과 겉이 한 방향 — 자기 자신과 잘 합의된 사람.', en: 'Inner and outer in sync — at peace with yourself.', group: '비겁' },
  'Jupiter|Mercury': { ko: '배우고 가르치는 데 강하고 시야가 넓어요.', en: 'Strong at learning and teaching, with a wide view.', group: '인성' },
  'Jupiter|Moon': { ko: '정서가 넉넉하고 낙천적이라 사람들이 편하게 느껴요.', en: 'Generous, easygoing feelings — others relax around you.', group: '인성' },
  'Mercury|Venus': { ko: '말·글·미적 감각이 좋은 표현형이에요.', en: 'A natural communicator with good taste.', group: '식상' },
  'Mercury|Sun': { ko: '생각이 또렷하고 자기 표현이 분명한 편이에요.', en: 'Clear-minded and articulate about who you are.', group: '식상' },
}
interface AspectLike {
  from?: { name?: string }
  to?: { name?: string }
  type?: string
  orb?: number
}

/** 핵심 각: 가장 강한(orb 작은) 주요 행성 각 1개의 의미 ↔ 사주 우세 십신. */
export function evalKeyAspect(
  aspects: AspectLike[] | undefined,
  sajuDominantGroup: string | undefined,
): CrossVerdict | null {
  if (!aspects || aspects.length === 0) return null
  let best: { key: string; pairKo: string; orb: number } | null = null
  for (const a of aspects) {
    const p1 = a.from?.name
    const p2 = a.to?.name
    const type = String(a.type ?? '').toLowerCase()
    if (!p1 || !p2 || !PERSONAL_PLANETS.has(p1) || !PERSONAL_PLANETS.has(p2)) continue
    if (!MAJOR_ASPECTS.has(type)) continue
    const key = [p1, p2].sort().join('|')
    if (!ASPECT_PAIR_THEME[key]) continue
    const orb = typeof a.orb === 'number' ? Math.abs(a.orb) : 99
    if (!best || orb < best.orb) {
      const pairKo = `${PLANET_LABEL[p1]?.ko ?? p1}·${PLANET_LABEL[p2]?.ko ?? p2}`
      best = { key, pairKo, orb }
    }
  }
  if (!best) return null
  const theme = ASPECT_PAIR_THEME[best.key]
  const matches = sajuDominantGroup === theme.group
  return {
    tone: matches ? 'resonant' : 'complement',
    reason: {
      ko: `${best.pairKo} 각이 두드러져요 — ${theme.ko}${matches ? ' 사주에서도 같은 결이라 이 면이 특히 도드라져요.' : ''}`,
      en: `A standout aspect: ${theme.en}${matches ? ' Saju echoes it, so this stands out.' : ''}`,
    },
  }
}

/**
 * 공망 × South Node — 둘 다 "이번 생에 자연스럽게 만들어지지 않는 영역"을
 * 가리키는 표상. 사주의 공망 지지(허虛한 자리)와 점성의 사우스노드 sign(과거
 * 카르마/익숙해서 자동으로 떨어지는 지점) 이 같은 오행을 가리키면 두 시스템이
 * 같은 카르마를 같은 방향으로 짚는 셈 — tension 으로 강하게 발현. 다른 오행을
 * 가리키면 카르마가 두 갈래로 흩어진 neutral.
 *
 * 지지 본기 오행 매핑 (子=水, 丑=土, 寅卯=木, 辰=土, 巳午=火, 未=土, 申酉=金,
 * 戌=土, 亥=水) — 인라인 상수로 두어 외부 의존 없음.
 */
const BRANCH_TO_ELEMENT: Record<string, SajuElement> = {
  '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood', '辰': 'earth',
  '巳': 'fire', '午': 'fire', '未': 'earth', '申': 'metal', '酉': 'metal',
  '戌': 'earth', '亥': 'water',
}

export function evalVoid(
  gongmangBranches: string[] | undefined,
  southNodeSign: string | undefined,
): CrossVerdict | null {
  if (!gongmangBranches?.length || !southNodeSign) return null

  const branches = gongmangBranches.slice(0, 2).join('·')
  const branchEl = BRANCH_TO_ELEMENT[gongmangBranches[0]]
  const enSign = toEnSign(southNodeSign) ?? southNodeSign
  const astroEl = SIGN_TO_ASTRO_ELEMENT[enSign]
  // 4원소(air) → 사주(wood/metal) 대응 시 둘 중 하나라도 일치하면 매치로 본다.
  const sajuFromAstro: SajuElement[] | undefined =
    astroEl === 'fire' ? ['fire']
      : astroEl === 'earth' ? ['earth']
        : astroEl === 'water' ? ['water']
          : astroEl === 'air' ? ['wood', 'metal']
            : undefined
  const matches = !!branchEl && !!sajuFromAstro && sajuFromAstro.includes(branchEl)

  if (matches) {
    return {
      tone: 'tension',
      reason: {
        ko: `공망(${branches})과 사우스노드(${southNodeSign})가 같은 ${EL_KO[branchEl]} 결을 가리켜요 — 동·서양 둘 다 같은 자리에서 "이번 생엔 자동으로 안 풀린다"고 말하는 셈. 의식적으로 만들어가야 하는 평생 과제예요.`,
        en: `Gongmang (${branches}) and South Node (${southNodeSign}) both point to the ${EL_EN[branchEl]} domain — both systems flag the same area as "won't manifest on its own this life". A lifelong task requiring conscious effort.`,
      },
    }
  }
  return {
    tone: 'neutral',
    reason: {
      ko: `공망(${branches})과 사우스노드(${southNodeSign})가 서로 다른 영역의 비어있음을 가리켜요 — 풀어내야 할 과제가 두 갈래로 흩어져 있음. 한 번에 하나씩 다루는 게 안전해요.`,
      en: `Gongmang (${branches}) and South Node (${southNodeSign}) point to different empty domains — karmic work is spread across two threads. Better to address one at a time.`,
    },
  }
}

// ── 종합 ──────────────────────────────────────────────────────────────────

/** 도메인 판정들을 모아 전체 정체성 한 문장 생성. */
export function synthesize(
  verdicts: CrossVerdict[],
  sharedElement?: SajuElement,
): NatalSynthesis | null {
  if (verdicts.length === 0) return null
  let resonant = 0
  let complement = 0
  let tension = 0
  for (const v of verdicts) {
    if (v.tone === 'resonant') resonant++
    else if (v.tone === 'complement') complement++
    else if (v.tone === 'tension') tension++
  }
  let tone: CrossTone = 'neutral'
  if (resonant >= complement && resonant >= tension && resonant > 0) tone = 'resonant'
  else if (complement >= tension && complement > 0) tone = 'complement'
  else if (tension > 0) tone = 'tension'

  const labelKo =
    tone === 'resonant'
      ? '사주와 별자리가 한 방향으로 강하게 모이는'
      : tone === 'complement'
        ? '사주와 별자리가 서로 부족을 채워주는'
        : tone === 'tension'
          ? '사주와 별자리가 서로 당기며 단련시키는'
          : '뚜렷한 쏠림 없이 고른'
  const labelEn =
    tone === 'resonant'
      ? 'strongly converging'
      : tone === 'complement'
        ? 'mutually complementary'
        : tone === 'tension'
          ? 'creatively tense'
          : 'evenly balanced'

  const axisKo = sharedElement ? ` 가장 두드러진 기운은 ${EL_KO[sharedElement]}이에요.` : ''
  const axisEn = sharedElement ? ` The strongest thread is ${EL_EN[sharedElement]}.` : ''

  return {
    tone,
    text: {
      ko: `잘 맞는 게 ${resonant}개, 서로 채워주는 게 ${complement}개, 부딪히는 게 ${tension}개 — ${labelKo} 사람이에요.${axisKo}`,
      en: `${resonant} match · ${complement} fill-in · ${tension} clash — a ${labelEn} identity.${axisEn}`,
    },
  }
}

// ── 내부 헬퍼 ──────────────────────────────────────────────────────────────
function elementVerdict(
  a: SajuElement,
  b: SajuElement,
  msg: {
    sameKo: string
    sameEn: string
    genKo: string
    genEn: string
    ctrlKo: string
    ctrlEn: string
  },
): CrossVerdict {
  const rel = elementRelation(a, b)
  switch (rel) {
    case 'same':
      return { tone: 'resonant', reason: { ko: msg.sameKo, en: msg.sameEn } }
    case 'aGenB':
    case 'bGenA':
      return { tone: 'complement', reason: { ko: msg.genKo, en: msg.genEn } }
    case 'aCtrlB':
    case 'bCtrlA':
      return { tone: 'tension', reason: { ko: msg.ctrlKo, en: msg.ctrlEn } }
    default:
      return {
        tone: 'neutral',
        reason: {
          ko: '두 성향이 직접 부딪히거나 돕는 관계는 아니에요 — 따로 도는 별개의 결.',
          en: 'The two traits neither clash nor help directly — independent strands.',
        },
      }
  }
}
