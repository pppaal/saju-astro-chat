import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalEvidence } from '../types'
import {
  SIBSIN_THEME_WEIGHT,
  SHINSAL_THEME_WEIGHT,
  ELEMENT_THEME_WEIGHT,
  HOUSE_THEME_WEIGHT,
  PLANET_BENEFIC_MALEFIC,
  PLANET_THEME_WEIGHT,
} from './featureMap'

export interface TaggedThemes {
  themes: AstroThemeKey[] // 멤버십 (룰/카드용)
  weights: Partial<Record<AstroThemeKey, number>> // 테마별 기여 가중 (themeScore용)
}

/**
 * ActiveSignal에 테마 라벨 + 기여 가중을 자동 부여.
 * 추출기가 themes를 비워두면 evidence를 보고 추론. 명시하면 그 위에 보강.
 *
 * weights: 한 신호가 여러 테마를 건드릴 때 "본령 테마"에 더 큰 가중을 줘
 * 변별력 확보. 같은 테마가 여러 소스에서 부여되면 가장 큰 가중 채택(max).
 */
export function tagSignalWithThemes(
  signal: ActiveSignal,
  gender?: 'male' | 'female'
): TaggedThemes {
  const weights = new Map<AstroThemeKey, number>()
  const bump = (t: AstroThemeKey, w: number) => weights.set(t, Math.max(weights.get(t) ?? 0, w))
  const bumpTable = (tbl?: Partial<Record<AstroThemeKey, number>>) => {
    if (tbl) for (const [t, w] of Object.entries(tbl)) bump(t as AstroThemeKey, w as number)
  }

  // 추출기가 명시한 테마 = primary
  for (const t of signal.themes) bump(t, 1.0)
  const ev = signal.evidence

  // 사주 — 십신 (명시 가중표)
  if (ev.sibsin) bumpTable(SIBSIN_THEME_WEIGHT[ev.sibsin])

  // 사주 — 연애(배우자성)는 성별로 다르다: 남명=재성(처), 여명=관성(부).
  // 가중표는 성중립이라 love를 빼두고 여기서 성별로 부여(본령<1, 랭킹 보존).
  if (ev.sibsin) {
    if (gender === 'female') {
      if (ev.sibsin === '정관') bump('love', 0.6)
      else if (ev.sibsin === '편관') bump('love', 0.4)
    } else {
      if (ev.sibsin === '정재') bump('love', 0.6)
      else if (ev.sibsin === '편재') bump('love', 0.4)
    }
  }

  // 사주 — 신살 (명시 가중표; 누락 신살은 growth 약하게 폴백)
  if (ev.shinsalName) {
    const tbl = SHINSAL_THEME_WEIGHT[ev.shinsalName]
    if (tbl) bumpTable(tbl)
    else bump('growth', 0.5)
  }

  // 사주/점성 공통 — 오행 (명시 가중표, 보조)
  if (ev.element) bumpTable(ELEMENT_THEME_WEIGHT[ev.element])

  // 점성 — 행성 (행성별 테마 본령 가중)
  if (ev.planets?.length) {
    for (const planet of ev.planets) bumpTable(PLANET_THEME_WEIGHT[planet])
  }

  // 점성 — 하우스 (하우스별 본령 가중표)
  if (ev.houses?.length) {
    for (const house of ev.houses) bumpTable(HOUSE_THEME_WEIGHT[house])
  }

  return { themes: Array.from(weights.keys()), weights: Object.fromEntries(weights) }
}

/**
 * 어스펙트 + 행성 조합으로 polarity 추정.
 * 추출기에서 사용 — 모든 추출기가 같은 규칙 쓰도록 한 곳에 집중.
 */
export function inferAspectPolarity(
  aspectType: string,
  planetA: string,
  planetB: string
): -3 | -2 | -1 | 0 | 1 | 2 | 3 {
  const benefic = (p: string) => PLANET_BENEFIC_MALEFIC[p] === 'benefic'
  const malefic = (p: string) => PLANET_BENEFIC_MALEFIC[p] === 'malefic'

  const harmonious = aspectType === 'trine' || aspectType === 'sextile'
  const tense = aspectType === 'square' || aspectType === 'opposition' || aspectType === 'quincunx'
  const conj = aspectType === 'conjunction'

  const bothBenefic = benefic(planetA) && benefic(planetB)
  const bothMalefic = malefic(planetA) && malefic(planetB)
  const oneBenefic = benefic(planetA) || benefic(planetB)
  const oneMalefic = malefic(planetA) || malefic(planetB)

  if (harmonious) {
    if (bothBenefic) return 3
    if (oneBenefic) return 2
    if (bothMalefic) return 0 // 흉성 트라인은 완화
    return 1
  }
  if (tense) {
    if (bothMalefic) return -3
    if (oneMalefic) return -2
    if (bothBenefic) return 0 // 길성 스퀘어는 완화
    return -1
  }
  if (conj) {
    if (bothBenefic) return 2
    if (bothMalefic) return -2
    if (oneBenefic && !oneMalefic) return 1
    if (oneMalefic && !oneBenefic) return -1
    return 0
  }
  return 0
}
