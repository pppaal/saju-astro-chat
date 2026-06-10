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
} from '@/lib/saju/elementBridge'
import {
  SAJU_ASTRO_MAPPINGS,
  type CrossMapping,
} from '@/lib/calendar-engine/data/saju-astro-mapping'
import { dignityOf } from '@/lib/astrology/foundation/dignities'
import { SIGN_KO_TO_EN, PLANET_LABEL, ELEMENT_LABEL } from './chartLabels'
import { iga, eulReul, eunNeun, waGwa } from '@/lib/i18n/koParticle'
import { getPlanetCore } from '@/lib/chart-dictionary'

/** 행성의 쉬운 말 결(원리) — 예: 토성 '한계·책임·구조'. 없으면 행성명 폴백.
 * EN: principle 이 'Expansion · Faith · Luck' 같은 대문자 명사나열이라 문장 중간에
 * 박으면 비문 → 소문자 + 쉼표로 풀어 'expansion, faith, luck' 형태로. */
function planetTheme(planet: string, lang: Lang): string {
  const p = getPlanetCore(planet, lang)?.principle ?? PLANET_LABEL[planet]?.[lang] ?? planet
  if (lang !== 'en') return p
  const parts = p
    .toLowerCase()
    .split(/\s*·\s*/)
    .filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? p
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

export type CrossTone = 'resonant' | 'complement' | 'tension' | 'neutral'
export type Lang = 'ko' | 'en'

export interface CrossVerdict {
  tone: CrossTone
  reason: { ko: string; en: string }
  /** 교차 그림용 — 사주(동양) 측 값 / 점성(서양) 측 값. */
  left?: { ko: string; en: string }
  right?: { ko: string; en: string }
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
  sunSign: string | undefined
): CrossVerdict | null {
  const a = normSajuElement(dayMasterEl)
  const b = signToSajuElement(sunSign)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    aKo: '타고난 속마음',
    aEn: 'inner nature',
    bKo: '드러나는 자아',
    bEn: 'outer self',
  })
}

/** 필요·욕망: 용신 오행 ↔ 달 별자리. */
export function evalNeeds(
  yongsinEl: string | undefined,
  moonSign: string | undefined
): CrossVerdict | null {
  const need = normSajuElement(yongsinEl)
  const moon = signToSajuElement(moonSign)
  if (!need || !moon) return null
  const tNeed = ELEMENT_TRAIT[need]
  const tCrave = ELEMENT_TRAIT[moon]
  if (moon === need)
    return {
      tone: 'resonant',
      reason: {
        ko: `진짜 필요한 ${tNeed.ko} 기운과 평소 끌리는 게 딱 맞아요 — 자기를 잘 챙기는 편.`,
        en: `What you truly need (${tNeed.en} energy) matches what you’re drawn to — you tend yourself well.`,
      },
    }
  if (GENERATES[moon] === need)
    return {
      tone: 'complement',
      reason: {
        ko: `평소 ${tCrave.ko} 쪽에 끌리는데, 그게 정작 필요한 ${tNeed.ko} 기운을 자연스럽게 채워줘요.`,
        en: `You’re drawn to the ${tCrave.en}, and it naturally supplies the ${tNeed.en} energy you need.`,
      },
    }
  if (CONTROLS[moon] === need)
    return {
      tone: 'tension',
      reason: {
        ko: `평소 ${tCrave.ko} 쪽에 끌리는데 정작 필요한 건 ${tNeed.ko} 기운이라 어긋나요 — 원하는 것만 좇다 중요한 걸 놓칠 수 있어요.`,
        en: `You crave the ${tCrave.en} but actually need the ${tNeed.en} — chasing wants can crowd out needs.`,
      },
    }
  return {
    tone: 'neutral',
    reason: {
      ko: `필요한 ${tNeed.ko} 기운과 평소 끌리는 ${tCrave.ko} 쪽이 따로 노는 편 — 의식적으로 챙기면 좋아요.`,
      en: `Your needed ${tNeed.en} energy and your ${tCrave.en} pulls run on separate tracks — worth tending on purpose.`,
    },
  }
}

/** 사회 역할: 격국 ↔ MC. 격국 대표 십신을 행성으로 환원해 MC 위신으로 판정. */
export function evalSocialRole(
  geokguk: string | undefined,
  mcSign: string | undefined
): CrossVerdict | null {
  if (!geokguk || !mcSign) return null
  const sibsin = geokguk.replace(/격$/, '')
  const mapping = sajuKeyMapping(sibsin)
  const planet = mapping?.astro
  if (!planet) return null
  const en = toEnSign(mcSign)
  const dig = en ? dignityOf(planet, en) : 'peregrine'
  const tk = planetTheme(planet, 'ko')
  const te = planetTheme(planet, 'en')
  if (dig === 'domicile' || dig === 'exaltation')
    return {
      tone: 'resonant',
      reason: {
        ko: `타고난 ${tk} 성향이 직업·사회 자리에서 그대로 강점으로 드러나요 — 일에서 신뢰받기 좋아요.`,
        en: `Your natural ${te} bent shows up as a strength in work and status — easy to be trusted.`,
      },
    }
  if (dig === 'detriment' || dig === 'fall')
    return {
      tone: 'tension',
      reason: {
        ko: `타고난 ${tk} 성향과 사회가 기대하는 역할이 살짝 어긋나, 직업에서 "이게 맞나" 고민이 생길 수 있어요.`,
        en: `Your ${te} nature and the role society expects don’t quite match — work can raise doubts.`,
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: `타고난 ${tk} 성향을 사회생활이 다른 방식으로 넓혀줘요 — 일하며 새 면이 열리는 타입.`,
      en: `Work stretches your ${te} nature in a new direction — fresh sides open up on the job.`,
    },
  }
}

/**
 * 길흉: 일주 신살 ↔ *그 신살에 대응하는 행성이 내 차트에서 실제로 강조됐는가*.
 * (예전엔 신살만 보고 매핑 polarity 만 썼음 — 진짜 교차가 아니었다.)
 * 신살의 대응 행성(mapping.astro)이 emphasizedPlanets 에 있으면 동·서양이 같은
 * 기운을 동시에 키운 셈 → 길신은 강한 복(resonant), 흉신은 그 압력이 증폭
 * (tension). 대응 행성이 차트에서 약하면 한쪽만 작동(complement) 으로 약화.
 */
export function evalFortune(
  shinsal: string[] | undefined,
  emphasizedPlanets: Set<string> = new Set()
): CrossVerdict | null {
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
  const planetEmphasized = emphasizedPlanets.has(mapping.astro)
  const tk = planetTheme(mapping.astro, 'ko')
  const te = planetTheme(mapping.astro, 'en')
  const benefic = mapping.polarity >= 0
  if (benefic) {
    return planetEmphasized
      ? {
          tone: 'resonant',
          reason: {
            ko: `복이 되는 좋은 기운을 타고났는데, 별자리에서도 ${tk} 쪽이 힘 있어 — 동·서양이 똑같이 강점으로 봐요.`,
            en: `You carry a natural blessing, and your chart's ${te} side is strong too — both systems read it as a clear strength.`,
          },
        }
      : {
          tone: 'complement',
          reason: {
            ko: `사주엔 복이 되는 좋은 기운이 있어요 — 별자리 ${tk} 쪽은 잔잔해서, 의식적으로 살리면 더 빛나요.`,
            en: `Saju carries a fortunate streak; your chart's ${te} side is quieter — lean into it on purpose to make it shine.`,
          },
        }
  }
  return planetEmphasized
    ? {
        tone: 'tension',
        reason: {
          ko: `추진력·승부욕을 세게 타고났는데 별자리에서도 ${tk} 쪽이 도드라져 — 힘이 두 배라 욱하거나 과속하지 않게 조심.`,
          en: `You're born with strong drive, and your chart's ${te} side is pronounced too — double the force, so watch the temper and the gas pedal.`,
        },
      }
    : {
        tone: 'complement',
        reason: {
          ko: `추진력·승부욕을 세게 타고났어요 — 다만 별자리 ${tk} 쪽은 약해서, 그 거친 기운이 차트에선 한결 눌려요.`,
          en: `You carry strong drive, but your chart's ${te} side is weak — that rough edge is tempered in your chart.`,
        },
      }
}

/** 관계: 사주 합/충 ↔ 점성 조화각/긴장각의 우세 방향. */
export function evalRelations(
  hap: number,
  chung: number,
  harmonious: number,
  hard: number
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
  topDignity: { planet: string; status: string } | null
): CrossVerdict | null {
  if (!twelveStage && !topDignity) return null
  const sajuStrong = twelveStage ? STRONG_STAGES.has(twelveStage) : false
  const sajuWeak = twelveStage ? WEAK_STAGES.has(twelveStage) : false
  const astroStrong = !!topDignity
  const stk = topDignity ? planetTheme(topDignity.planet, 'ko') : ''
  const ste = topDignity ? planetTheme(topDignity.planet, 'en') : ''
  if (sajuStrong && astroStrong)
    return {
      tone: 'resonant',
      reason: {
        ko: `타고난 힘이 가장 셀 자리에 있고, 별자리에선 ${stk} 쪽이 특히 강해요 — 그 분야에서 두각 내기 좋은 사람.`,
        en: `Your power sits at its strongest, and in your chart the ${ste} side is especially strong — built to stand out there.`,
      },
    }
  if (astroStrong)
    return {
      tone: 'complement',
      reason: {
        ko: `별자리에서 ${stk} 쪽이 가장 힘 있는 자리예요 — 그 분야에서 힘을 발휘하기 좋아요.`,
        en: `In your chart the ${ste} side is your strongest placement — a place you can really deliver.`,
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
  counts: Record<string, number> | undefined
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
  astroSigns: string[] | undefined
): CrossVerdict | null {
  const a = dominantSajuElement(sajuCounts)
  const b = dominantAstroElement(astroSigns)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    aKo: '사주가 본 성향',
    aEn: 'Saju-read side',
    bKo: '별자리가 본 성향',
    bEn: 'astrology-read side',
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
  재성: { ko: '실리·현실 감각', en: 'practicality and realism' },
  인성: { ko: '배움·돌봄', en: 'learning and care' },
  식상: { ko: '표현·창의', en: 'expression and creativity' },
  비겁: { ko: '주체성·승부욕', en: 'independence and drive' },
}
const SIBSIN_GROUPS = ['비겁', '식상', '재성', '관성', '인성']

/** 십신 그룹 카운트에서 가장 강한 그룹. */
export function dominantSibsinGroup(
  details: Record<string, number> | undefined
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
  emphasizedPlanets: Set<string>
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
  ascSign: string | undefined
): CrossVerdict | null {
  const a = normSajuElement(dayMasterEl)
  const b = signToSajuElement(ascSign)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    aKo: '속 모습',
    aEn: 'inner self',
    bKo: '남에게 비치는 첫인상',
    bEn: 'first impression',
    tailKo:
      '첫인상과 진짜 속이 다른 만큼, 처음엔 가볍게 다가가되 시간을 두고 진짜 결을 보여주면 신뢰가 더 깊어져요.',
    tailEn:
      'Since your first impression differs from your true self, let people in gradually — the deeper grain earns lasting trust.',
  })
}

/** 추진력: 신강약(사주) ↔ 자기주장 행성(태양·화성) 강조 여부. */
export function evalDrive(
  strengthLevel: string | undefined,
  selfEmphasized: boolean
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
            en: 'You’re built to support, but your chart pushes you forward — pace and visibility can clash.',
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
  'Jupiter|Sun': {
    ko: '타고난 낙천과 자신감 — 기회를 크게 보고 사람을 끌어요.',
    en: 'Born optimism and confidence — you think big and draw people in.',
    group: '인성',
  },
  'Mars|Sun': {
    ko: '에너지가 넘치고 앞장서는 행동파예요.',
    en: 'High energy, first to act — a doer.',
    group: '비겁',
  },
  'Saturn|Sun': {
    ko: '일찍 철든 책임감형 — 인정은 늦게 와도 단단하게 쌓여요.',
    en: 'Mature and responsible early — recognition comes slow but solid.',
    group: '관성',
  },
  'Moon|Venus': {
    ko: '정 많고 사람을 끄는 다정한 매력형이에요.',
    en: 'Warm and magnetic — people feel at ease with you.',
    group: '재성',
  },
  'Moon|Saturn': {
    ko: '감정을 안으로 삭이는 진중하고 어른스러운 타입이에요.',
    en: 'You hold feelings in — steady and grown-up.',
    group: '인성',
  },
  'Mars|Moon': {
    ko: '감정이 솔직하고 열정적 — 가끔 욱하지만 뒤끝은 없어요.',
    en: 'Honest, passionate feelings — quick to flare, quick to let go.',
    group: '비겁',
  },
  'Mercury|Saturn': {
    ko: '말과 생각이 신중하고 논리적인 편이에요.',
    en: 'Careful, logical in thought and speech.',
    group: '관성',
  },
  'Mars|Venus': {
    ko: '관계·연애에 적극적이고 매력을 잘 드러내요.',
    en: 'Forward in love and quick to show your charm.',
    group: '재성',
  },
  'Saturn|Venus': {
    ko: '관계에 신중하고 진지 — 한번 정하면 오래가요.',
    en: 'Careful and serious in love — once you commit, it lasts.',
    group: '관성',
  },
  'Mars|Saturn': {
    ko: '참을성 있게 끝까지 밀어붙이는 인내형이에요.',
    en: 'Patient, you push through to the end.',
    group: '관성',
  },
  'Moon|Sun': {
    ko: '속과 겉이 한 방향 — 자기 자신과 잘 합의된 사람.',
    en: 'Inner and outer in sync — at peace with yourself.',
    group: '비겁',
  },
  'Jupiter|Mercury': {
    ko: '배우고 가르치는 데 강하고 시야가 넓어요.',
    en: 'Strong at learning and teaching, with a wide view.',
    group: '인성',
  },
  'Jupiter|Moon': {
    ko: '정서가 넉넉하고 낙천적이라 사람들이 편하게 느껴요.',
    en: 'Generous, easygoing feelings — others relax around you.',
    group: '인성',
  },
  'Mercury|Venus': {
    ko: '말·글·미적 감각이 좋은 표현형이에요.',
    en: 'A natural communicator with good taste.',
    group: '식상',
  },
  'Mercury|Sun': {
    ko: '생각이 또렷하고 자기 표현이 분명한 편이에요.',
    en: 'Clear-minded and articulate about who you are.',
    group: '식상',
  },
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
  sajuDominantGroup: string | undefined
): CrossVerdict | null {
  if (!aspects || aspects.length === 0) return null
  let best: { key: string; pairKo: string; pairEn: string; orb: number } | null = null
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
      const pairEn = `${PLANET_LABEL[p1]?.en ?? p1}–${PLANET_LABEL[p2]?.en ?? p2}`
      best = { key, pairKo, pairEn, orb }
    }
  }
  if (!best) return null
  const theme = ASPECT_PAIR_THEME[best.key]
  const matches = sajuDominantGroup === theme.group
  return {
    tone: matches ? 'resonant' : 'complement',
    reason: {
      ko: `${best.pairKo} 각이 두드러져요 — ${theme.ko}${matches ? ' 사주에서도 같은 결이라 이 면이 특히 도드라져요.' : ''}`,
      en: `A standout ${best.pairEn} aspect — ${theme.en.charAt(0).toLowerCase()}${theme.en.slice(1)}${matches ? '. Saju echoes it, so this stands out.' : ''}`,
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
  子: 'water',
  丑: 'earth',
  寅: 'wood',
  卯: 'wood',
  辰: 'earth',
  巳: 'fire',
  午: 'fire',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  戌: 'earth',
  亥: 'water',
}

export function evalVoid(
  gongmangBranches: string[] | undefined,
  southNodeSign: string | undefined
): CrossVerdict | null {
  if (!gongmangBranches?.length || !southNodeSign) return null

  const branches = gongmangBranches.slice(0, 2).join('·')
  const branchEl = BRANCH_TO_ELEMENT[gongmangBranches[0]]
  const enSign = toEnSign(southNodeSign) ?? southNodeSign
  const astroEl = SIGN_TO_ASTRO_ELEMENT[enSign]
  // 4원소(air) → 사주(wood/metal) 대응 시 둘 중 하나라도 일치하면 매치로 본다.
  const sajuFromAstro: SajuElement[] | undefined =
    astroEl === 'fire'
      ? ['fire']
      : astroEl === 'earth'
        ? ['earth']
        : astroEl === 'water'
          ? ['water']
          : astroEl === 'air'
            ? ['wood', 'metal']
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

/** 오행 카운트에서 가장 부족한(결핍) 원소 — 이번 생에 키워야 할 결. */
export function weakestSajuElement(
  counts: Record<string, number> | undefined
): SajuElement | undefined {
  if (!counts) return undefined
  const agg: Record<SajuElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const [k, v] of Object.entries(counts)) {
    const el = normSajuElement(k)
    if (el && typeof v === 'number') agg[el] += v
  }
  let best: SajuElement | undefined
  let min = Infinity
  for (const el of SAJU_ELS) {
    if (agg[el] < min) {
      min = agg[el]
      best = el
    }
  }
  return best
}

/**
 * 성장 방향: 노스노드(이번 생 키워야 할 방향) ↔ 사주에서 가장 부족한 오행
 * (결핍 = 채워야 할 것). 둘 다 "이번 생에 새로 키워가는 것"을 가리키는 표상이라,
 * 같은 오행을 가리키면 동·서양이 한 성장 방향을 또렷이 짚는 셈. evalVoid(공망 ×
 * 사우스노드 = 비움·과거)의 양(陽)짝.
 */
export function evalNorthNode(
  sajuCounts: Record<string, number> | undefined,
  northNodeSign: string | undefined
): CrossVerdict | null {
  const weak = weakestSajuElement(sajuCounts)
  const nn = signToSajuElement(northNodeSign)
  if (!weak || !nn || !northNodeSign) return null
  const tw = ELEMENT_TRAIT[weak]
  const tn = ELEMENT_TRAIT[nn]
  if (nn === weak)
    return {
      tone: 'resonant',
      reason: {
        ko: `이번 생 키워야 할 방향을 동·서양이 둘 다 ${tw.ko} 쪽으로 짚어요 — 그걸 채우는 게 이번 생 과제로 또렷해요.`,
        en: `Both systems point your growth the same way — toward the ${tw.en} — making it a clear life task.`,
      },
    }
  if (GENERATES[weak] === nn || GENERATES[nn] === weak)
    return {
      tone: 'complement',
      reason: {
        ko: `사주가 채우라는 ${tw.ko} 결과 별자리(노스노드)가 가리키는 ${tn.ko} 방향이 서로 이어져요 — 한쪽을 키우면 다른 쪽도 따라 자라요.`,
        en: `The ${tw.en} your Saju asks you to fill and the ${tn.en} your North Node points to feed each other — grow one and the other follows.`,
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: `사주는 ${tw.ko} 기운을 채우라 하고, 별자리(노스노드)는 ${tn.ko} 방향을 가리켜요 — 성장 축이 둘이라 번갈아 키우면 좋아요.`,
      en: `Saju asks you to build ${tw.en} energy while your North Node points to ${tn.en} — two growth axes to develop in turn.`,
    },
  }
}

/** 음양 리듬: 일간 음양(陽발산·외향 / 陰수용·내향) ↔ 출생 sect(주간=바깥 무대 / 야간=안 무대). */
export function evalYinYang(
  dayMasterYy: string | undefined,
  sect: string | undefined
): CrossVerdict | null {
  const yy = dayMasterYy === '陽' ? 'yang' : dayMasterYy === '陰' ? 'yin' : undefined
  const s = sect === 'day' ? 'day' : sect === 'night' ? 'night' : undefined
  if (!yy || !s) return null
  const match = (yy === 'yang' && s === 'day') || (yy === 'yin' && s === 'night')
  if (match) {
    return yy === 'yang'
      ? {
          tone: 'resonant',
          reason: {
            ko: '타고난 기질이 양(발산·외향)인데 낮에 태어나 무대도 바깥을 향해요 — 드러내고 추진하는 결이 한 방향으로 또렷해요. 쉴 줄 아는 리듬만 챙기면 돼요.',
            en: 'Your nature is yang (outward, expressive) and you were born by day, so your stage faces outward too — a clear, consistent drive to show up and push. Just build in time to rest.',
          },
        }
      : {
          tone: 'resonant',
          reason: {
            ko: '타고난 기질이 음(수용·내향)인데 밤에 태어나 무대도 안을 향해요 — 깊이 사고하고 받아들이는 결이 일관돼요. 가끔 먼저 드러내는 연습이 도움이 돼요.',
            en: 'Your nature is yin (receptive, inward) and you were born by night, so your stage faces inward too — consistent depth and receptivity. Practicing speaking up first helps now and then.',
          },
        }
  }
  return yy === 'yang'
    ? {
        tone: 'complement',
        reason: {
          ko: '타고난 기질은 양(발산·외향)인데 밤에 태어나 무대는 안을 향해요 — 낮에 다 못 쓴 에너지를 밤의 깊이로 돌리는, 폭이 넓은 사람이에요.',
          en: 'Your nature is yang (outward) yet you were born by night, turning toward inner depth — a wide range that channels daytime drive into nighttime depth.',
        },
      }
    : {
        tone: 'complement',
        reason: {
          ko: '타고난 기질은 음(수용·내향)인데 낮에 태어나 무대는 밖을 향해요 — 안의 깊이를 바깥으로 꺼내 보여주는, 폭이 넓은 사람이에요.',
          en: 'Your nature is yin (receptive) yet you were born by day, with an outward stage — a wide range that brings inner depth out into the open.',
        },
      }
}

// ── 종합 ──────────────────────────────────────────────────────────────────

/** 도메인 판정들을 모아 전체 정체성 한 문장 생성. */
export function synthesize(
  verdicts: CrossVerdict[],
  sharedElement?: SajuElement
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

  // 톤별 해석 한 단락 — 전체 패턴이 삶에서 어떻게 작동하는지.
  const elabKo =
    tone === 'resonant'
      ? ' 동양(사주)과 서양(별자리)이 대체로 같은 방향을 가리켜, 자기 색이 또렷하고 추진력이 강점이에요. 다만 한쪽으로 쏠리기 쉬우니, 가끔 반대 결도 의식하면 균형이 좋아져요.'
      : tone === 'complement'
        ? ' 두 시스템이 서로 다른 얘기를 하지만, 그게 오히려 빈자리를 메워줘요. 겉과 속, 타고난 결과 드러나는 모습이 달라 상황마다 여러 모습을 꺼내 쓰는 폭넓은 사람이에요.'
        : tone === 'tension'
          ? ' 사주와 별자리가 서로 당기는 자리가 많아, 안에서 두 결의 갈등을 느낄 때가 있어요. 하지만 그 긴장이 깊이와 성장의 동력이 됩니다 — 한쪽을 누르기보다 둘을 번갈아 쓰는 리듬을 만들면 강점이 돼요.'
          : ' 어느 한쪽으로 크게 쏠리지 않아 균형 감각이 좋아요. 상황에 따라 다른 면을 자연스럽게 꺼내 쓰는 유연함이 있어요.'
  const elabEn =
    tone === 'resonant'
      ? ' East (Saju) and West (astrology) mostly point the same way, so your sense of self is clear and your drive is a strength. Just watch for one-sidedness — touch the opposite grain now and then.'
      : tone === 'complement'
        ? ' The two systems say different things, yet they fill each other’s gaps. Inner and outer differ, giving you a wide range to draw on depending on the situation.'
        : tone === 'tension'
          ? ' Saju and astrology pull against each other in several places, so you may feel inner friction — but that tension fuels depth and growth. Alternate between the two rather than suppressing one.'
          : ' No strong lean either way gives you good balance, and you can switch between different sides as the situation calls.'

  return {
    tone,
    text: {
      ko: `잘 맞는 게 ${resonant}개, 서로 채워주는 게 ${complement}개, 부딪히는 게 ${tension}개 — ${labelKo} 사람이에요.${axisKo}${elabKo}`,
      en: `${resonant} aligned · ${complement} complementary · ${tension} in tension — a ${labelEn} identity.${axisEn}${elabEn}`,
    },
  }
}

// ── 내부 헬퍼 ──────────────────────────────────────────────────────────────

// 오행별 "쉬운 말" 결 — 전문용어 없이 그 기운의 성향을 한 마디로.
const ELEMENT_TRAIT: Record<SajuElement, { ko: string; en: string }> = {
  wood: { ko: '뻗어나가 키우는', en: 'growing and expansive' },
  fire: { ko: '드러내고 타오르는', en: 'expressive and fiery' },
  earth: { ko: '안정되고 믿음직한', en: 'steady and grounded' },
  metal: { ko: '예리하고 결단하는', en: 'sharp and decisive' },
  water: { ko: '깊고 유연한', en: 'deep and adaptable' },
}

/** 두 축의 도메인 라벨(쉬운 말). 예: 정체성 → '본바탕' / '드러나는 자아'. */
interface DomainCtx {
  aKo: string
  aEn: string
  bKo: string
  bEn: string
  /** 긴장(극) 케이스 조언 문구 override — 도메인별로 달라 중복 방지. */
  tailKo?: string
  tailEn?: string
}

/**
 * 오행 교차 판정 — 두 축의 *실제 오행*을 쉬운 말 결로 풀어 그 사람 고유의
 * 문장을 만든다. (예전엔 관계별 고정 문장 3개라 누구나 같은 결과였음.)
 * 생(生) 관계는 방향(누가 누구를 키우나)까지 구분.
 */
function elementVerdict(a: SajuElement, b: SajuElement, d: DomainCtx): CrossVerdict {
  const ta = ELEMENT_TRAIT[a]
  const tb = ELEMENT_TRAIT[b]
  const rel = elementRelation(a, b)
  const left = { ko: `${EL_KO[a]} · ${ta.ko}`, en: `${EL_EN[a]} · ${ta.en}` }
  const right = { ko: `${EL_KO[b]} · ${tb.ko}`, en: `${EL_EN[b]} · ${tb.en}` }
  const base: CrossVerdict = (() => {
    switch (rel) {
      case 'same':
        return {
          tone: 'resonant',
          reason: {
            ko: `${d.aKo}${waGwa(d.aKo)} ${d.bKo}${iga(d.bKo)} 둘 다 ${ta.ko} 결이라, 한 방향으로 또렷한 사람이에요. 힘이 모이는 만큼 한쪽으로 치우치기도 쉬우니, 가끔 반대 결도 의식하면 균형이 좋아져요.`,
            en: `Your ${d.aEn} and ${d.bEn} are both ${ta.en} — one clear, consistent direction. That focus is a strength, but it can tip into one-sidedness, so touch the opposite grain now and then.`,
          },
        }
      case 'aGenB':
        return {
          tone: 'complement',
          reason: {
            ko: `${ta.ko} ${d.aKo}${iga(d.aKo)} ${tb.ko} ${d.bKo}${eulReul(d.bKo)} 자연스럽게 키워줘요 — 안에서 밖으로 잘 이어지는 타입. 꾸준히 쌓을수록 결실이 점점 커지는 구조라, 조급해하지 않는 게 핵심이에요.`,
            en: `Your ${ta.en} ${d.aEn} naturally feeds your ${tb.en} ${d.bEn} — inner flows outward. Steady effort compounds here, so patience is the key.`,
          },
        }
      case 'bGenA':
        return {
          tone: 'complement',
          reason: {
            ko: `${tb.ko} ${d.bKo}${iga(d.bKo)} ${ta.ko} ${d.aKo}${eulReul(d.aKo)} 받쳐줘요 — 밖이 안을 채워주는 타입. 어떤 환경·사람을 곁에 두는지가 특히 중요해요.`,
            en: `Your ${tb.en} ${d.bEn} feeds your ${ta.en} ${d.aEn} — outer replenishes inner. The environment and people you keep around you matter a lot.`,
          },
        }
      case 'aCtrlB':
      case 'bCtrlA':
        return {
          tone: 'tension',
          reason: {
            ko: `${d.aKo}${eunNeun(d.aKo)} ${ta.ko} 쪽인데 ${d.bKo}${eunNeun(d.bKo)} ${tb.ko} 쪽이라 서로 당겨요 — 한 사람 안에 다른 두 결이 같이 있는 셈이에요. ${d.tailKo ?? '부딪힐 땐 한쪽을 누르기보다 상황에 따라 번갈아 쓰는 리듬을 만들면 오히려 강점이 돼요.'}`,
            en: `Your ${d.aEn} is ${ta.en} while your ${d.bEn} is ${tb.en} — two different grains pulling within one person. ${d.tailEn ?? 'When they clash, alternate between them by context instead of suppressing one — that turns friction into range.'}`,
          },
        }
      default:
        return {
          tone: 'neutral',
          reason: {
            ko: `${ta.ko} ${d.aKo}${waGwa(d.aKo)} ${tb.ko} ${d.bKo}${iga(d.bKo)} 직접 엮이진 않고 따로 작동해요. 서로 독립적이라 상황에 따라 다른 면을 꺼내 쓰는 유연함이 있어요.`,
            en: `Your ${ta.en} ${d.aEn} and ${tb.en} ${d.bEn} run independently. Being separate, you can switch between them as the situation calls.`,
          },
        }
    }
  })()
  return { ...base, left, right }
}
