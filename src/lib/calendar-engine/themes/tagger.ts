import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalEvidence } from '../types'
import {
  ASTRO_THEME_MAP,
  SIBSIN_THEME_MAP,
  SHINSAL_THEME_MAP,
  ELEMENT_THEME_MAP,
  PLANET_BENEFIC_MALEFIC,
} from './featureMap'

/**
 * ActiveSignal에 테마 라벨을 자동 부여.
 * 추출기가 themes를 비워두면 evidence를 보고 추론.
 * 추출기가 themes를 명시하면 그 위에 보강만 함 (중복 제거).
 */
export function tagSignalWithThemes(signal: ActiveSignal): AstroThemeKey[] {
  const themes = new Set<AstroThemeKey>(signal.themes)
  const ev = signal.evidence

  // 사주 — 십신
  if (ev.sibsin) {
    SIBSIN_THEME_MAP[ev.sibsin]?.forEach((t) => themes.add(t))
  }

  // 사주 — 신살
  if (ev.shinsalName) {
    const mapped = SHINSAL_THEME_MAP[ev.shinsalName]
    if (mapped) {
      mapped.forEach((t) => themes.add(t))
    } else {
      // 매핑 누락 신살은 일단 personality로 폴백 (UI에서 카드는 표시됨)
      themes.add('personality')
    }
  }

  // 사주/점성 공통 — 오행
  if (ev.element) {
    ELEMENT_THEME_MAP[ev.element]?.forEach((t) => themes.add(t))
  }

  // 점성 — 행성 (어떤 행성이 관여했는지로 테마 결정)
  if (ev.planets?.length) {
    for (const planet of ev.planets) {
      for (const [theme, config] of Object.entries(ASTRO_THEME_MAP)) {
        if (config.planets.includes(planet)) {
          themes.add(theme as AstroThemeKey)
        }
      }
    }
  }

  // 점성 — 하우스
  if (ev.houses?.length) {
    for (const house of ev.houses) {
      for (const [theme, config] of Object.entries(ASTRO_THEME_MAP)) {
        if (config.houses.includes(house)) {
          themes.add(theme as AstroThemeKey)
        }
      }
    }
  }

  return Array.from(themes)
}

/**
 * 어스펙트 + 행성 조합으로 polarity 추정.
 * 추출기에서 사용 — 모든 추출기가 같은 규칙 쓰도록 한 곳에 집중.
 */
export function inferAspectPolarity(
  aspectType: string,
  planetA: string,
  planetB: string,
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
    if (bothMalefic) return 0   // 흉성 트라인은 완화
    return 1
  }
  if (tense) {
    if (bothMalefic) return -3
    if (oneMalefic) return -2
    if (bothBenefic) return 0   // 길성 스퀘어는 완화
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
