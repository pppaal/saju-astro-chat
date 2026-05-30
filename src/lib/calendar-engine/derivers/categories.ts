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
