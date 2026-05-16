// src/lib/astrology/advancedInterpretations.ts
//
// Interpretive layer for the advanced engines: Eclipses, Midpoint
// activations, Draconic alignments/tensions, Fixed-star + planet
// combinations. Generic per-axis / per-pattern lines (KO + EN) used
// where the engine's own description is too thin.

import type { AstroPlanetName } from './interpretations'

export type AspectKindLike =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'

interface Line {
  ko: string
  en: string
}

// ============================================================
// Eclipse — what a hit on each angle/luminary means.
// ============================================================

const ECLIPSE_AXIS: Record<string, Line> = {
  Sun: {
    ko: '핵심 정체성·생명력의 전환점. 자기 표현 방식이 재편됨.',
    en: 'Turning point in core identity and vitality; self-expression rebuilds.',
  },
  Moon: {
    ko: '정서적 기반·돌봄 패턴의 전환. 깊이 묻혀 있던 감정이 표면으로.',
    en: 'Emotional foundation shifts; buried feelings surface to be addressed.',
  },
  Mercury: {
    ko: '사고·소통 회로의 전환. 새로운 학습/정보 환경.',
    en: 'Mind and communication channels rewire; new learning environment.',
  },
  Venus: {
    ko: '관계·가치·자기 사랑의 전환. 누구를·무엇을 사랑할지 다시 정함.',
    en: 'Relationships and values reset; redefine who and what you love.',
  },
  Mars: {
    ko: '추진력·욕망·분노의 전환. 어디에 에너지를 쓸지 다시 결정.',
    en: 'Drive and desire reset; choose where to spend your energy.',
  },
  Jupiter: {
    ko: '신념·확장의 전환. 무엇을 진리로 여길지 다시 정렬.',
    en: 'Belief and expansion reset; realign with personal truth.',
  },
  Saturn: {
    ko: '구조·책임·권위의 전환. 무엇을 짓고 무엇을 끊을지 결정.',
    en: 'Structure, responsibility, authority reset; choose what to build and what to drop.',
  },
  Uranus: {
    ko: '갑작스러운 자유의 충동. 묶여 있던 무엇을 끊어냄.',
    en: 'Sudden urge to free oneself; what was tied gets cut.',
  },
  Neptune: {
    ko: '경계·환상·꿈의 전환. 환상에서 깨어나거나 더 깊이 들어감.',
    en: 'Boundaries and illusions reset; either wake from a fantasy or sink deeper.',
  },
  Pluto: {
    ko: '권력·심층 변용의 전환. 죽고 다시 태어나는 감각.',
    en: 'Power and deep transformation reset; a small death and rebirth.',
  },
  Ascendant: {
    ko: '자아 이미지·외부 페르소나의 전환점.',
    en: 'Self-image and outer persona shift markedly.',
  },
  MC: {
    ko: '커리어·사회상·공적 정체성의 전환점.',
    en: 'Career and public identity reach a turning point.',
  },
}

const ECLIPSE_ASPECT: Record<AspectKindLike, Line> = {
  conjunction: { ko: '직접 합 — 가장 즉각적이고 결정적 영향', en: 'Direct conjunction — most immediate and decisive impact' },
  opposition: { ko: '충 — 관계·외부와의 마찰을 통해 드러남', en: 'Opposition — surfaces through external friction and relationships' },
  square: { ko: '사각 — 강제된 행동을 요구하는 마찰', en: 'Square — forced action through friction' },
  trine: { ko: '삼각 — 자연스럽게 흐르는 변화의 기회', en: 'Trine — naturally flowing window of change' },
  sextile: { ko: '육각 — 의식적 활용이 필요한 기회', en: 'Sextile — opportunity that needs conscious use' },
}

export function getEclipseInterpretation(opts: {
  aspect: AspectKindLike
  axis: string
  house: number | null
  language?: 'ko' | 'en'
}): string {
  const lang = opts.language ?? 'ko'
  const axis = ECLIPSE_AXIS[opts.axis] || {
    ko: `${opts.axis} 영역의 전환`,
    en: `Turning point in the ${opts.axis} area`,
  }
  const aspect = ECLIPSE_ASPECT[opts.aspect] || ECLIPSE_ASPECT.conjunction
  const houseTag = opts.house ? (lang === 'ko' ? ` · ${opts.house}하우스` : ` · House ${opts.house}`) : ''
  return lang === 'ko'
    ? `${aspect.ko}${houseTag}. ${axis.ko}`
    : `${aspect.en}${houseTag}. ${axis.en}`
}

// ============================================================
// Midpoint activation — what the activator does to a midpoint.
// ============================================================

const MIDPOINT_ACTIVATOR_TONE: Record<AstroPlanetName, Line> = {
  Sun: { ko: '의식·정체성으로 점화', en: 'Ignites through identity and vitality' },
  Moon: { ko: '정서·습관·필요로 점화', en: 'Ignites through feeling, habit, need' },
  Mercury: { ko: '사고·말·계약으로 점화', en: 'Ignites through thought, speech, contracts' },
  Venus: { ko: '애정·미·가치로 점화', en: 'Ignites through love, beauty, value' },
  Mars: { ko: '추진·갈등·욕망으로 점화', en: 'Ignites through drive, conflict, desire' },
  Jupiter: { ko: '확장·축복·과잉으로 점화', en: 'Ignites through expansion, blessing, excess' },
  Saturn: { ko: '구조·시험·억제로 점화', en: 'Ignites through structure, testing, restriction' },
  Uranus: { ko: '단절·각성·돌발로 점화', en: 'Ignites through rupture, awakening, surprise' },
  Neptune: { ko: '몽환·이상화·해체로 점화', en: 'Ignites through dream, idealisation, dissolution' },
  Pluto: { ko: '강박·변용·권력으로 점화', en: 'Ignites through compulsion, transformation, power' },
  Ascendant: { ko: '자아 이미지로 점화', en: 'Ignites through self-image' },
}

const MIDPOINT_ASPECT: Record<AspectKindLike, Line> = {
  conjunction: { ko: '합 — 직접적 융합', en: 'conjunction — direct fusion' },
  opposition: { ko: '충 — 양극 사이의 압력', en: 'opposition — polar pressure' },
  square: { ko: '사각 — 마찰을 통한 활성', en: 'square — activation through friction' },
  trine: { ko: '삼각 — 자연스러운 흐름', en: 'trine — natural flow' },
  sextile: { ko: '육각 — 의식적 활용 기회', en: 'sextile — conscious-use opportunity' },
}

export function getMidpointActivationInterpretation(opts: {
  midpointNameKo: string
  midpointKeywords: string[]
  activator: AstroPlanetName
  aspect: AspectKindLike
  language?: 'ko' | 'en'
}): string {
  const lang = opts.language ?? 'ko'
  const tone = MIDPOINT_ACTIVATOR_TONE[opts.activator] || {
    ko: `${opts.activator}으로 점화`,
    en: `Ignites through ${opts.activator}`,
  }
  const aspect = MIDPOINT_ASPECT[opts.aspect] || MIDPOINT_ASPECT.conjunction
  const kws = opts.midpointKeywords.slice(0, 3).join('·')
  if (lang === 'ko') {
    return `${opts.midpointNameKo}(${kws})을(를) ${tone.ko} — ${aspect.ko}.`
  }
  return `Activator pattern over the ${opts.midpointNameKo} midpoint (${kws}) — ${tone.en}; ${aspect.en}.`
}

// ============================================================
// Draconic — soul-level alignments and tensions.
// ============================================================

const DRACONIC_ALIGNMENT_TONE: Record<string, Line> = {
  identity: {
    ko: '영혼 정체성과 이번 생 자아가 한 방향으로 정렬 — 핵심 사명에 자연스럽게 끌림',
    en: 'Soul identity and present-life self align — natural pull toward core mission',
  },
  emotion: {
    ko: '영혼의 감정 패턴과 이번 생 정서가 서로 강화 — 감정이 영적 진실을 담음',
    en: 'Soul emotional pattern reinforces present-life feeling — emotion carries spiritual truth',
  },
  mind: {
    ko: '영혼의 사고 패턴과 이번 생 사고가 일치 — 직관이 곧 진실로 작동',
    en: 'Soul mind aligns with present-life mind — intuition reads as truth',
  },
  love: {
    ko: '영혼의 사랑 방식과 이번 생 애정이 일치 — 끌림에 운명적 무게',
    en: 'Soul love-pattern aligns with present-life affection — fated weight in attraction',
  },
  drive: {
    ko: '영혼의 추진력과 이번 생 행동이 일치 — 행동이 영적 사명을 수행',
    en: 'Soul drive aligns with present-life action — action enacts the soul mission',
  },
}

const DRACONIC_TENSION_TONE: Record<string, Line> = {
  identity: {
    ko: '영혼의 사명과 이번 생 자아가 어긋남 — 자기 자신이 낯설게 느껴지는 이유',
    en: 'Soul mission and present-life self diverge — why "myself" can feel foreign',
  },
  emotion: {
    ko: '영혼의 정서 기반과 이번 생 감정 환경이 어긋남 — 정서적 외로움의 원형',
    en: 'Soul emotional ground diverges from present feelings — archetype of emotional loneliness',
  },
  mind: {
    ko: '영혼의 진실과 이번 생 사고가 어긋남 — "머리로 아는 것과 진짜 아는 것"의 간격',
    en: 'Soul truth diverges from present mind — gap between "what I think" and "what I know"',
  },
  love: {
    ko: '영혼의 사랑 패턴과 이번 생 애정 패턴이 어긋남 — 친밀의 학습 곡선',
    en: 'Soul love pattern diverges from present affection — intimacy as a learning curve',
  },
  drive: {
    ko: '영혼의 사명과 이번 생 행동이 어긋남 — 추진하는 일이 자꾸 공허하게 느껴짐',
    en: 'Soul mission diverges from present action — drive can feel hollow',
  },
}

export function getDraconicAlignmentTone(theme: string, language: 'ko' | 'en' = 'ko'): string {
  const e = DRACONIC_ALIGNMENT_TONE[theme] || DRACONIC_ALIGNMENT_TONE.identity
  return language === 'ko' ? e.ko : e.en
}

export function getDraconicTensionTone(theme: string, language: 'ko' | 'en' = 'ko'): string {
  const e = DRACONIC_TENSION_TONE[theme] || DRACONIC_TENSION_TONE.identity
  return language === 'ko' ? e.ko : e.en
}

// ============================================================
// Fixed star + planet — extra emphasis layer.
// ============================================================

const FIXED_STAR_PLANET_TONE: Record<AstroPlanetName, Line> = {
  Sun: { ko: '핵심 정체성에 별의 결을 새김', en: 'Star quality stamped onto core identity' },
  Moon: { ko: '정서·삶의 분위기에 별의 결을 새김', en: 'Star quality stamped onto feeling and life-mood' },
  Mercury: { ko: '말·생각에 별의 결을 새김', en: 'Star quality stamped onto thought and speech' },
  Venus: { ko: '애정·미적 감각에 별의 결을 새김', en: 'Star quality stamped onto love and aesthetic' },
  Mars: { ko: '추진·욕망에 별의 결을 새김', en: 'Star quality stamped onto drive and desire' },
  Jupiter: { ko: '확장·믿음에 별의 결을 새김', en: 'Star quality stamped onto belief and expansion' },
  Saturn: { ko: '구조·운명에 별의 결을 새김', en: 'Star quality stamped onto structure and destiny' },
  Uranus: { ko: '갑작스러운 변화에 별의 결을 새김', en: 'Star quality stamped onto sudden change' },
  Neptune: { ko: '꿈·영성에 별의 결을 새김', en: 'Star quality stamped onto dream and spirit' },
  Pluto: { ko: '권력·변용에 별의 결을 새김', en: 'Star quality stamped onto power and transformation' },
  Ascendant: { ko: '외부에 비치는 첫인상에 별의 결을 새김', en: 'Star quality marks the outer first impression' },
}

export function getFixedStarPlanetTone(planet: AstroPlanetName, language: 'ko' | 'en' = 'ko'): string {
  const e = FIXED_STAR_PLANET_TONE[planet] || FIXED_STAR_PLANET_TONE.Sun
  return language === 'ko' ? e.ko : e.en
}
