import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalEvidence } from '../types'
import {
  ASTRO_THEME_MAP,
  SIBSIN_THEME_MAP,
  SHINSAL_THEME_MAP,
  AMHAP_THEME_MAP,
  ELEMENT_THEME_MAP,
  PLANET_BENEFIC_MALEFIC,
  PLANET_THEME_WEIGHT,
} from './featureMap'

export interface TaggedThemes {
  themes: AstroThemeKey[] // 멤버십 (룰/카드용)
  weights: Partial<Record<AstroThemeKey, number>> // 테마별 기여 가중 (themeScore용)
}

// 순서 있는 매핑(첫 항목 = primary)을 가중으로: primary 1.0, 이후 0.5.
const RANK_WEIGHT = (i: number) => (i === 0 ? 1.0 : 0.5)

/**
 * ActiveSignal에 테마 라벨 + 기여 가중을 자동 부여.
 * 추출기가 themes를 비워두면 evidence를 보고 추론. 명시하면 그 위에 보강.
 *
 * weights: 한 신호가 여러 테마를 건드릴 때 "본령 테마"에 더 큰 가중을 줘
 * 변별력 확보. 같은 테마가 여러 소스에서 부여되면 가장 큰 가중 채택(max).
 */
export function tagSignalWithThemes(signal: ActiveSignal): TaggedThemes {
  const weights = new Map<AstroThemeKey, number>()
  const bump = (t: AstroThemeKey, w: number) => weights.set(t, Math.max(weights.get(t) ?? 0, w))

  // 추출기가 명시한 테마 = primary
  for (const t of signal.themes) bump(t, 1.0)
  const ev = signal.evidence

  // 사주 — 십신 (순서대로 primary/secondary)
  if (ev.sibsin) SIBSIN_THEME_MAP[ev.sibsin]?.forEach((t, i) => bump(t, RANK_WEIGHT(i)))

  // 사주 — 신살
  if (ev.shinsalName) {
    const mapped = SHINSAL_THEME_MAP[ev.shinsalName]
    if (mapped) mapped.forEach((t, i) => bump(t, RANK_WEIGHT(i)))
    else bump('growth', 0.5) // 매핑 누락 신살 폴백 (카드는 표시되되 약하게)
  }

  // 사주 — 암합 (지지 안 천간 합) : love 본령 + growth 보조
  if (signal.kind === 'amhap') {
    AMHAP_THEME_MAP.forEach((t, i) => bump(t, RANK_WEIGHT(i)))
  }

  // 사주/점성 공통 — 오행
  if (ev.element) ELEMENT_THEME_MAP[ev.element]?.forEach((t, i) => bump(t, RANK_WEIGHT(i)))

  // 점성 — 행성 (행성별 테마 본령 가중)
  if (ev.planets?.length) {
    for (const planet of ev.planets) {
      const pw = PLANET_THEME_WEIGHT[planet]
      if (pw) for (const [t, w] of Object.entries(pw)) bump(t as AstroThemeKey, w as number)
    }
  }

  // 점성 — 28수 (lunar-mansion): 동양 택일 효능은 건강 사이클·일상 흐름(성장)
  // 이 주요 영역. 강하지 않은 보조 가중으로만 부여(배경 톤).
  if (signal.kind === 'lunar-mansion') {
    bump('health', 0.5)
    bump('growth', 0.4)
  }

  // 점성 — 하우스 (행성보다 덜 specific → secondary 가중)
  if (ev.houses?.length) {
    for (const house of ev.houses) {
      for (const [theme, config] of Object.entries(ASTRO_THEME_MAP)) {
        if (config.houses.includes(house)) bump(theme as AstroThemeKey, 0.6)
      }
    }
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
