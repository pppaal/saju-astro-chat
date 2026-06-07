/**
 * 점성 신호 흐름(flow) 한 줄 composer.
 *
 * 사주의 ganjiTransitNarrative 와 같은 역할 — 새 사전을 만들지 않고
 * chart-dictionary(astro-aspect-minor / astro-planet-core) 의 정통 해석을
 * 신호 voice("지금 무엇이 흐르는가")로 감싼다.
 *
 * 캘린더 `korean` 필드는 KO 전용(EN 은 name 기호 표기 사용)이지만, date-detail
 * 내러티브 fallback 등에서 EN 도 쓰일 수 있어 lang 인자를 받는다.
 */

import { getAspectMeaning, getPlanetCore, type Lang } from '@/lib/chart-dictionary'
import { iga, waGwa } from '@/lib/i18n/koParticle'

// 행성·앵글·감응점 KO 표기 (사용자 노출 라벨 일관).
const POINT_KO: Record<string, string> = {
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
  Ascendant: '상승점',
  ASC: '상승점',
  Descendant: '하강점',
  DSC: '하강점',
  MC: '천정',
  Midheaven: '천정',
  IC: '천저',
  'True Node': '북교점',
  'Mean Node': '북교점',
  'North Node': '북교점',
  NorthNode: '북교점',
  'South Node': '남교점',
  SouthNode: '남교점',
  Chiron: '카이런',
  Lilith: '릴리스',
}

// planet-core 사전 키 정규화 (교점 표기 통일).
const PLANET_CORE_KEY: Record<string, string> = {
  'True Node': 'NorthNode',
  'Mean Node': 'NorthNode',
  'North Node': 'NorthNode',
  'South Node': 'SouthNode',
  Ascendant: 'Ascendant',
  ASC: 'Ascendant',
  Midheaven: 'MC',
}

// 추출기 aspectType(소문자) → chart-dictionary 키(대문자).
const ASPECT_KEY: Record<string, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  quincunx: 'Quincunx',
  semisextile: 'Semi-sextile',
  'semi-sextile': 'Semi-sextile',
  semisquare: 'Semi-square',
  'semi-square': 'Semi-square',
  sesquiquadrate: 'Sesquiquadrate',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
  'bi-quintile': 'Bi-quintile',
  septile: 'Septile',
  novile: 'Novile',
}

// 어스펙트별 동사구 — 관계의 결을 자연어로.
const ASPECT_VERB: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: '정면으로 겹쳐 드는', en: 'fuses directly with' },
  sextile: { ko: '부드러운 기회로 닿는', en: 'opens a gentle opening with' },
  trine: { ko: '자연스럽게 어우러지는', en: 'flows easily with' },
  square: { ko: '팽팽하게 부딪치는', en: 'tensions against' },
  opposition: { ko: '정반대에서 맞당기는', en: 'pulls opposite to' },
  quincunx: { ko: '어긋나게 맞물리는', en: 'awkwardly adjusts to' },
  semisextile: { ko: '슬며시 스치는', en: 'lightly grazes' },
  semisquare: { ko: '잔잔히 마찰하는', en: 'mildly rubs against' },
  sesquiquadrate: { ko: '은근히 거슬리는', en: 'subtly irritates' },
  quintile: { ko: '재능으로 반짝이는', en: 'sparks a talent with' },
  biquintile: { ko: '창의로 반짝이는', en: 'sparks creativity with' },
}

export function pointKo(name: string): string {
  return POINT_KO[name] ?? name
}

// EN 표기 — 대부분 원문(영문) 그대로, 표기 정규화만.
const POINT_EN: Record<string, string> = {
  ASC: 'Ascendant',
  DSC: 'Descendant',
  Midheaven: 'MC',
  'True Node': 'North Node',
  'Mean Node': 'North Node',
  NorthNode: 'North Node',
  SouthNode: 'South Node',
}

export function pointEn(name: string): string {
  return POINT_EN[name] ?? name
}

/** planet-core 의 한 줄 원리 — 없으면 "". (행성/앵글의 본질 키워드) */
export function pointPrinciple(name: string, lang: Lang = 'ko'): string {
  const key = PLANET_CORE_KEY[name] ?? name
  return getPlanetCore(key, lang)?.principle ?? ''
}

/**
 * 트랜짓/진행/솔라아크 어스펙트 → 흐름 한 줄.
 * 행성·감응점 라벨 + 어스펙트 동사구 + 어스펙트 정통 의미.
 */
export function aspectFlowLine(
  movingPoint: string,
  natalPoint: string,
  aspectType: string,
  lang: Lang = 'ko',
  movingLabel?: string
): string {
  const verb = ASPECT_VERB[aspectType]
  const asp = getAspectMeaning(ASPECT_KEY[aspectType] ?? '', lang)
  if (!verb || !asp) return ''
  if (lang === 'en') {
    const mp = movingLabel ?? pointEn(movingPoint)
    const np = pointEn(natalPoint)
    return `${mp} ${verb.en} natal ${np} — ${asp.meaning}`
  }
  const mp = movingLabel ?? pointKo(movingPoint)
  const np = pointKo(natalPoint)
  return `${mp}${iga(mp)} 본명 ${np}${waGwa(np)} ${verb.ko} 흐름 — ${asp.meaning}`
}
