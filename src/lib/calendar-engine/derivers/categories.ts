/**
 * themeScores → 카테고리(라이프 영역) deriver (v2 소유).
 *
 * v2 일원화 결정: 캘린더 카테고리를 v2 5테마(love·money·career·health·growth)로
 * 축소한다(구 EventCategory 의 wealth/travel/study/general 폐기, wealth→money 통일).
 * 사용자 "도메인 필터"가 이 카테고리로 동작한다.
 *
 * 규칙: 그 날 themeScores 에서 두드러진 테마만 카테고리로 — 최상위 테마는 항상
 * 포함, 그 외엔 최상위와 `LEAD_GAP` 이내이면서 `MIN_SCORE` 이상인 것만. 최대
 * `MAX_CATEGORIES` 개. 약한 테마로 카드가 지저분해지지 않게 한다.
 */
import type { AstroThemeKey } from '@/lib/astrology/themes/types'

export type ThemeCategory = AstroThemeKey // 'love' | 'money' | 'career' | 'health' | 'growth'

const THEME_ORDER: AstroThemeKey[] = ['career', 'money', 'love', 'health', 'growth']
const LEAD_GAP = 10 // 최상위와 이 차이 이내면 동급 카테고리로
const MIN_SCORE = 50 // 비-최상위 테마는 이 점수 이상이어야 포함
const MAX_CATEGORIES = 3

export function themeScoresToCategories(
  themeScores: Partial<Record<AstroThemeKey, number>>
): ThemeCategory[] {
  const entries = THEME_ORDER.map((k) => [k, themeScores[k] ?? 0] as const).filter(
    ([, v]) => v > 0
  )
  if (entries.length === 0) return []

  // 점수 desc 정렬 — 동점이면 THEME_ORDER 순서로 안정 정렬.
  const sorted = [...entries].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return THEME_ORDER.indexOf(a[0]) - THEME_ORDER.indexOf(b[0])
  })

  const [topKey, topScore] = sorted[0]
  const picked: ThemeCategory[] = [topKey]
  for (const [k, v] of sorted.slice(1)) {
    if (picked.length >= MAX_CATEGORIES) break
    if (v >= MIN_SCORE && topScore - v <= LEAD_GAP) picked.push(k)
  }
  return picked
}

// 비-최상위 패턴 테마는 최상위 가중치의 이 비율 이상이면 동급 카테고리로 포함.
const PATTERN_REL_GAP = 0.6

/**
 * 그날 발동한 패턴(matchedPatterns)의 themes → 카테고리 deriver (v2 소유).
 *
 * themeScoresToCategories 는 themeScores(본명-지배적, 일별 거의 정적) 기반이라
 * 카테고리가 매일 같아져 도메인 필터가 무용해진다. 반면 패턴은 그날의 신호 조합으로
 * 발동/소멸하므로 일별로 달라진다 — 패턴 themes 를 strength 가중 합산해 그날 "두드러진
 * 라이프 영역"을 카테고리로 뽑으면 일별 다양성이 살아난다. 발동 패턴이 없는 날은
 * themeScores 폴백.
 */
export function patternsToCategories(
  matchedPatterns: ReadonlyArray<{ themes: readonly AstroThemeKey[]; strength: number }>,
  themeScores: Partial<Record<AstroThemeKey, number>>
): ThemeCategory[] {
  const weight: Partial<Record<AstroThemeKey, number>> = {}
  for (const p of matchedPatterns) {
    const s = typeof p.strength === 'number' && p.strength > 0 ? p.strength : 1
    for (const t of p.themes) weight[t] = (weight[t] ?? 0) + s
  }
  const entries = THEME_ORDER.map((k) => [k, weight[k] ?? 0] as const).filter(([, v]) => v > 0)
  // 발동 패턴 themes 가 없으면 themeScores 폴백 (정적이지만 빈 카테고리보단 낫다).
  if (entries.length === 0) return themeScoresToCategories(themeScores)

  const sorted = [...entries].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return THEME_ORDER.indexOf(a[0]) - THEME_ORDER.indexOf(b[0])
  })
  const [topKey, topScore] = sorted[0]
  const picked: ThemeCategory[] = [topKey]
  for (const [k, v] of sorted.slice(1)) {
    if (picked.length >= MAX_CATEGORIES) break
    if (v >= topScore * PATTERN_REL_GAP) picked.push(k)
  }
  return picked
}
