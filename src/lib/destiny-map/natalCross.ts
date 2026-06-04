/**
 * 원국(natal) 교차 평가기 — 사주의 고정 정체성과 점성의 고정 정체성을
 * "같은 대응 지식"으로 교차해 도메인별 판정을 낸다.
 *
 * 캘린더의 cross-activation 엔진은 "같은 날 두 신호가 동시에 켜질 때"
 * 발화하는 시간(흐름) 기반이라, 날짜가 없는 원국 정체성에는 그대로 못 쓴다.
 * 이 모듈은 그 엔진과 같은 지식(오행 생극 + 17 A급 십신/신살↔행성 매핑 +
 * essential dignity)을 정적 정체성 교차에 적용한다.
 *
 * 출력: 도메인별 { tone, reason } + 전체 종합 한 문장.
 * tone — resonant(동조) · complement(보완) · tension(상충) · neutral(중립).
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

// ── 라벨 사전 ─────────────────────────────────────────────────────────────
const EL_KO: Record<SajuElement, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}
const EL_EN: Record<SajuElement, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
}
const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  Uranus: '천왕성',
  Neptune: '해왕성',
  Pluto: '명왕성',
}

// 점성 sign 한↔영 정규화 (dignityOf 는 영문 sign 만 인식).
const SIGN_KO_TO_EN: Record<string, string> = {
  양자리: 'Aries',
  황소자리: 'Taurus',
  쌍둥이자리: 'Gemini',
  게자리: 'Cancer',
  사자자리: 'Leo',
  처녀자리: 'Virgo',
  천칭자리: 'Libra',
  전갈자리: 'Scorpio',
  사수자리: 'Sagittarius',
  염소자리: 'Capricorn',
  물병자리: 'Aquarius',
  물고기자리: 'Pisces',
}
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

/** 점성 sign → 사주 5원소. air 는 4원소→5원소 무손실 대응이 없어 목(확장·움직임)으로 근사. */
export function signToSajuElement(sign: string | undefined): SajuElement | undefined {
  if (!sign) return undefined
  const a = SIGN_TO_ASTRO_ELEMENT[sign]
  if (!a) return undefined
  return a === 'air' ? 'wood' : a
}

export type ElementRelation =
  | 'same'
  | 'aGenB' // a 가 b 를 생함
  | 'bGenA'
  | 'aCtrlB' // a 가 b 를 극함
  | 'bCtrlA'
  | 'none'

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

// ── 도메인 평가기 ──────────────────────────────────────────────────────────

/** 정체성: 일간 오행 ↔ 태양 별자리. 5원소 생극으로 동조/보완/상충 판정. */
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
    genKo: () => '타고난 본바탕과 드러나는 자아는 결이 다르지만 서로 잘 받쳐줘요 — 안과 밖이 균형 잡힌 타입.',
    genEn: () => 'Your inner nature and outer self differ but support each other — well balanced.',
    ctrlKo: () => '타고난 본바탕과 드러나는 자아가 다른 방향이라, 가끔 "내가 진짜 원하는 게 뭐지?" 싶을 수 있어요.',
    ctrlEn: () => 'Inner nature and outer self pull different ways — you may question what you really want.',
  })
}

/** 필요·욕망: 용신 오행 ↔ 달 별자리. 달이 '필요 원소'를 채워주는가. */
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

/** 사회 역할: 격국 ↔ MC. 격국의 대표 십신을 행성으로 환원해 MC sign 에서의 위신으로 판정. */
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
        en: 'Your nature and the role society expects don’t quite match — work can raise “is this really me?” doubts.',
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
  // 매핑된 첫 신살을 대표로. (도화/역마/양인/건록 — A급 4종)
  let mapping: CrossMapping | undefined
  let name: string | undefined
  for (const s of shinsal) {
    const m = sajuKeyMapping(s)
    if (m) {
      mapping = m
      name = s
      break
    }
  }
  if (!mapping || !name) return null
  if (mapping.polarity < 0)
    return {
      tone: 'tension',
      reason: {
        ko: '추진력·승부욕을 세게 타고났어요. 큰 무기지만, 욱하거나 과속하지 않게만 조심하면 좋아요.',
        en: 'You’re born with strong drive and a competitive edge — a real asset, just watch the temper and the gas pedal.',
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
  const sajuHarmony = hap - chung // >0 조화 우세
  const astroHarmony = harmonious - hard
  if (sajuHarmony > 0 && astroHarmony > 0)
    return {
      tone: 'resonant',
      reason: {
        ko: '사람들과 잘 어울리고 관계가 매끄럽게 풀리는 편 — 동·서양 둘 다 그렇게 봐요.',
        en: 'You get along easily and relationships flow — both systems agree on this.',
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
  if (sajuStrong && astroStrong) {
    return {
      tone: 'resonant',
      reason: {
        ko: '타고난 힘이 가장 셀 자리에 있고 별자리 쪽 강점도 겹쳐요 — 자기 분야에서 두각 내기 좋은 사람.',
        en: 'Your power sits at its strongest, and your chart’s strength stacks on top — built to stand out in your field.',
      },
    }
  }
  if (astroStrong) {
    return {
      tone: 'complement',
      reason: {
        ko: '별자리 쪽에 뚜렷한 강점이 하나 있어요 — 그 분야에서 힘을 발휘하기 좋아요.',
        en: 'There’s one clear strength in your chart — a place you can really deliver.',
      },
    }
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

/** 오행 카운트(한/영 키 혼용)에서 가장 강한 원소. 동률이면 먼저 나온 것. */
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
    genKo: () => '사주가 보는 성향과 별자리가 보는 성향이 서로 잘 맞물려서 받쳐줘요.',
    genEn: () => 'Your two strongest traits interlock and support each other.',
    ctrlKo: () => '사주가 보는 주된 성향과 별자리가 보는 성향이 서로 당겨요 — 안에 다른 두 기운이 같이 있는 셈.',
    ctrlEn: () => 'Your two main traits pull against each other — two different energies living side by side.',
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
const SIBSIN_GROUP_THEME: Record<string, { ko: string; en: string }> = {
  관성: { ko: '책임·구조·통제', en: 'duty/structure' },
  재성: { ko: '자원·실리·관계', en: 'resources/value' },
  인성: { ko: '학습·수용·돌봄', en: 'learning/care' },
  식상: { ko: '표현·창의·산출', en: 'expression/output' },
  비겁: { ko: '자아·경쟁·주체', en: 'self/drive' },
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
  if (matched.length > 0) {
    return {
      tone: 'resonant',
      reason: {
        ko: `타고나길 '${theme.ko}'을(를) 가장 중요하게 여기는데, 별자리도 같은 쪽을 가리켜요 — 에너지가 한 방향으로 모인 사람.`,
        en: `You most value '${theme.en}', and your chart points the same way — energy gathered in one direction.`,
      },
    }
  }
  return {
    tone: 'complement',
    reason: {
      ko: `타고나길 '${theme.ko}'이(가) 강한데, 별자리는 그 힘을 다른 통로로 풀어줘요 — 한 가지를 여러 방식으로 쓰는 타입.`,
      en: `You lean strongly toward '${theme.en}', and your chart channels it through other routes.`,
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
    sameKo: `타고난 본질(${EL_KO[a]})과 남에게 비치는 첫인상이 같은 결 — 안과 밖이 일치하는 정체성.`,
    sameEn: `Your core (${EL_EN[a]}) and outward impression match — inside and outside align.`,
    genKo: (g, r) =>
      `${EL_KO[g]}이(가) ${EL_KO[r]}을(를) 길러줘요 — 본질과 첫인상이 서로 받쳐주는 보완.`,
    genEn: (g, r) => `${EL_EN[g]} feeds ${EL_EN[r]} — core and persona support each other.`,
    ctrlKo: (c, t) =>
      `${EL_KO[c]}이(가) ${EL_KO[t]}을(를) 눌러요 — 속마음과 겉모습이 달라 보일 수 있는 긴장.`,
    ctrlEn: (c, t) => `${EL_EN[c]} controls ${EL_EN[t]} — your inner self and outer image can read differently.`,
  })
}

// ── 종합 ──────────────────────────────────────────────────────────────────

/**
 * 도메인 판정들을 모아 전체 정체성 한 문장 생성.
 * sharedElement — 일간/태양이 같은 원소면 그 축을 핵심으로 명시.
 */
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
  // 전체 톤 — 가장 많은 범주. 동률이면 resonant > complement > tension > neutral.
  let tone: CrossTone = 'neutral'
  if (resonant >= complement && resonant >= tension && resonant > 0) tone = 'resonant'
  else if (complement >= tension && complement > 0) tone = 'complement'
  else if (tension > 0) tone = 'tension'

  const labelKo =
    tone === 'resonant'
      ? '동·서가 한 방향으로 강하게 모이는'
      : tone === 'complement'
        ? '동·서가 서로 부족을 메워주는 보완적'
        : tone === 'tension'
          ? '동·서가 서로 당기며 단련시키는'
          : '뚜렷한 쏠림 없이 고른'
  const labelEn =
    tone === 'resonant'
      ? 'strongly converging'
      : tone === 'complement'
        ? 'mutually complementary'
        : tone === 'tension'
          ? 'creatively tense'
          : 'evenly balanced'

  const axisKo = sharedElement ? ` 핵심 축은 ${EL_KO[sharedElement]} 기운이에요.` : ''
  const axisEn = sharedElement ? ` The core axis is ${EL_EN[sharedElement]}.` : ''

  return {
    tone,
    text: {
      ko: `${verdicts.length}개 영역 중 동조 ${resonant} · 보완 ${complement} · 긴장 ${tension} — ${labelKo} 정체성이에요.${axisKo}`,
      en: `Across ${verdicts.length} areas: ${resonant} resonant · ${complement} complement · ${tension} tension — a ${labelEn} identity.${axisEn}`,
    },
  }
}

// ── 내부 헬퍼 ──────────────────────────────────────────────────────────────
function digKo(status: string): string {
  switch (status) {
    case 'domicile':
      return '입궁(가장 강함)'
    case 'exaltation':
      return '고양(매우 강함)'
    case 'detriment':
      return '손상(약함)'
    case 'fall':
      return '추락(가장 약함)'
    default:
      return status
  }
}

function elementVerdict(
  a: SajuElement,
  b: SajuElement,
  msg: {
    sameKo: string
    sameEn: string
    genKo: (gen: SajuElement, recv: SajuElement) => string
    genEn: (gen: SajuElement, recv: SajuElement) => string
    ctrlKo: (ctrl: SajuElement, target: SajuElement) => string
    ctrlEn: (ctrl: SajuElement, target: SajuElement) => string
  },
): CrossVerdict {
  const rel = elementRelation(a, b)
  switch (rel) {
    case 'same':
      return { tone: 'resonant', reason: { ko: msg.sameKo, en: msg.sameEn } }
    case 'aGenB':
      return { tone: 'complement', reason: { ko: msg.genKo(a, b), en: msg.genEn(a, b) } }
    case 'bGenA':
      return { tone: 'complement', reason: { ko: msg.genKo(b, a), en: msg.genEn(b, a) } }
    case 'aCtrlB':
      return { tone: 'tension', reason: { ko: msg.ctrlKo(a, b), en: msg.ctrlEn(a, b) } }
    case 'bCtrlA':
      return { tone: 'tension', reason: { ko: msg.ctrlKo(b, a), en: msg.ctrlEn(b, a) } }
    default:
      return {
        tone: 'neutral',
        reason: {
          ko: `${EL_KO[a]}과(와) ${EL_KO[b]}은(는) 직접 생극 관계가 아니에요 — 독립적인 두 결.`,
          en: `${EL_EN[a]} and ${EL_EN[b]} have no direct generate/control tie — two independent strands.`,
        },
      }
  }
}
