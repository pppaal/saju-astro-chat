/**
 * natalCross 공유 기반 — 원소 정규화/관계, 라벨 사전, 십신·신살↔행성 매핑,
 * 행성 결(테마) 헬퍼. evaluators / verdict / synthesize 가 공통으로 의존하는
 * leaf 유틸만 모은다. DB·네트워크 의존 없음.
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
import { SIGN_KO_TO_EN, PLANET_LABEL, ELEMENT_LABEL } from './chartLabels'
import { getPlanetCore } from '@/lib/chart-dictionary'

/** 행성의 쉬운 말 결(원리) — 예: 토성 '한계·책임·구조'. 없으면 행성명 폴백.
 * EN: principle 이 'Expansion · Faith · Luck' 같은 대문자 명사나열이라 문장 중간에
 * 박으면 비문 → 소문자 + 쉼표로 풀어 'expansion, faith, luck' 형태로. */
export function planetTheme(planet: string, lang: Lang): string {
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
  /**
   * 공망/카르마(결핍 축) 표식 — 두 시스템이 '같은 빈자리를 짚는다'는 합의(resonant
   * 톤)이지만, 그건 강점 수렴이 아니라 '평생 숙제'다. '잘 맞아요/aligns well' 집계에
   * 섞이면 막대그래프가 결핍 축을 강점으로 오인하게 하므로, 톤은 유지하되 이 플래그로
   * 집계에서만 분리한다. 별도의 '숙제' 처방 라우팅은 그대로 둔다.
   */
  karmaAxis?: boolean
}

export interface NatalSynthesis {
  tone: CrossTone
  text: { ko: string; en: string }
}

// ── 라벨 사전 (공용 chartLabels 에서 파생 — 단일 소스) ──────────────────────
export const EL_KO: Record<SajuElement, string> = {
  wood: ELEMENT_LABEL.wood.ko,
  fire: ELEMENT_LABEL.fire.ko,
  earth: ELEMENT_LABEL.earth.ko,
  metal: ELEMENT_LABEL.metal.ko,
  water: ELEMENT_LABEL.water.ko,
}
export const EL_EN: Record<SajuElement, string> = {
  wood: ELEMENT_LABEL.wood.en,
  fire: ELEMENT_LABEL.fire.en,
  earth: ELEMENT_LABEL.earth.en,
  metal: ELEMENT_LABEL.metal.en,
  water: ELEMENT_LABEL.water.en,
}

// dignityOf 는 영문 sign 만 인식 → 한국어면 영문으로 정규화.
const EN_SIGNS = new Set(Object.values(SIGN_KO_TO_EN))

export function toEnSign(sign: string | undefined): string | undefined {
  if (!sign) return undefined
  if (EN_SIGNS.has(sign)) return sign
  return SIGN_KO_TO_EN[sign]
}

// ── 원소 정규화 / 관계 ─────────────────────────────────────────────────────
export const SAJU_ELS: SajuElement[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** '금'·'metal'·'Metal' 등을 SajuElement 로 정규화. */
export function normSajuElement(x: string | undefined): SajuElement | undefined {
  if (!x) return undefined
  if (x in KO_TO_SAJU_ELEMENT) return KO_TO_SAJU_ELEMENT[x]
  const lower = x.toLowerCase()
  return (SAJU_ELS as string[]).includes(lower) ? (lower as SajuElement) : undefined
}

/**
 * 점성 sign → 사주 5원소. air 는 무손실 대응이 없어 목(木, 확장·움직임)으로 근사.
 *
 * air→오행 근사 계약(SSOT, 단일값): air→'wood'. 이 단일값 계약이 cross 평가기 전체의
 * 기준이며 evalVoid 도 같은 단일값으로 맞춘다 — 같은 공기 별자리가 평가기마다 다른 판정을
 * 내지 않도록(ENGINE-AUDIT E7). elementBridge 의 ASTRO_TO_SAJU(air→[wood,metal])는
 * 더 넓은 후보 집합이지만, cross 판정은 이 단일값 계약을 정본으로 쓴다.
 */
export function signToSajuElement(sign: string | undefined): SajuElement | undefined {
  if (!sign) return undefined
  const a = SIGN_TO_ASTRO_ELEMENT[sign]
  if (!a) return undefined
  return a === 'air' ? 'wood' : a
}

// 공기(air) 별자리는 생극 계산상 木으로 대응하지만, 묘사를 木의 결("뻗어나가
// 키우는")로 쓰면 물병·쌍둥이·천칭이 "확장·성장형"으로 잘못 읽힌다. 공기 별자리에서
// 온 트레잇은 공기 본연의 결로 표기 — 생극 매핑(木)은 그대로 두고 문구만 교정.
// (분포 우세 평가기 evalTemperament 도 air-우세일 때 이 상수를 재사용한다.)
export const AIR_TRAIT_OVERRIDE = { ko: '퍼뜨리고 연결하는', en: 'circulating and connecting' }
// 공기 별자리는 원소명도 '木' 대신 '공기'로 표기 — 木(사주)과 헷갈리지 않도록.
export const AIR_ELEMENT_LABEL = { ko: '공기', en: 'Air' }
export function signTraitOverride(
  sign: string | undefined
): { ko: string; en: string } | undefined {
  return sign && SIGN_TO_ASTRO_ELEMENT[sign] === 'air' ? AIR_TRAIT_OVERRIDE : undefined
}
// 공기 별자리는 원소명도 '木' 대신 '공기'로 표기 — 木(사주)과 헷갈리지 않도록.
export function signElementLabel(sign: string | undefined): { ko: string; en: string } | undefined {
  return sign && SIGN_TO_ASTRO_ELEMENT[sign] === 'air' ? AIR_ELEMENT_LABEL : undefined
}
// 공기 별자리인가 — air 는 사주 5원소에 무손실 대응이 없어 木으로 근사한다.
// 이 근사에서 나온 '같은 결(same)' 판정은 거짓 수렴일 수 있어 헤지가 필요하다.
export function isAirSign(sign: string | undefined): boolean {
  return !!sign && SIGN_TO_ASTRO_ELEMENT[sign] === 'air'
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

// ── 십신/신살 → 행성 매핑 (saju 키 기준 대표 1개) ──────────────────────────
// 한 saju 키가 데이터에 여러 번 나오면(현재 8개 중복) 배열 '순서'로 첫 행을 채택하던
// 숨은 의존이 있었다 — 파일을 재정렬하면 행성·길흉이 조용히 바뀐다(ENGINE-AUDIT).
// 이제 명시적 우선순위로 고른다: ① 등급(A>B>C) ② |polarity| 큰(신호가 더 결정적인)
// 쪽 ③ 그래도 같으면 먼저 선언된 행. 데이터가 어떤 순서로 놓여도 결과가 같다.
const GRADE_RANK: Record<string, number> = { A: 3, B: 2, C: 1 }
function preferMapping(a: CrossMapping, b: CrossMapping): CrossMapping {
  const ga = GRADE_RANK[a.grade] ?? 0
  const gb = GRADE_RANK[b.grade] ?? 0
  if (ga !== gb) return ga > gb ? a : b
  if (Math.abs(a.polarity) !== Math.abs(b.polarity))
    return Math.abs(a.polarity) > Math.abs(b.polarity) ? a : b
  return a // 동률이면 먼저 선언된 쪽 유지(결정론)
}
const SAJU_TO_MAPPING = new Map<string, CrossMapping>()
for (const m of SAJU_ASTRO_MAPPINGS) {
  const cur = SAJU_TO_MAPPING.get(m.saju)
  SAJU_TO_MAPPING.set(m.saju, cur ? preferMapping(cur, m) : m)
}

export function sajuKeyMapping(key: string | undefined): CrossMapping | undefined {
  if (!key) return undefined
  return SAJU_TO_MAPPING.get(key)
}
