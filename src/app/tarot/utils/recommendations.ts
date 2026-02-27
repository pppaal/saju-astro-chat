import { recommendSpreads } from '@/lib/Tarot/tarot-recommend'

const DEFAULT_QUICK_THEME_ID = 'general-insight'
const DEFAULT_QUICK_SPREAD_ID = 'quick-reading'

/**
 * Get quick recommendation based on keyword matching
 * Returns path, card count, spread title, and whether keyword match succeeded
 */
export function getQuickRecommendation(
  question: string,
  isKo: boolean = true
): { path: string; cardCount: number; spreadTitle: string; isKeywordMatch: boolean } {
  const recommendations = recommendSpreads(question, 1)

  if (recommendations.length > 0) {
    const rec = recommendations[0]
    const isDefaultPpfFallback =
      rec.themeId === 'general-insight' &&
      rec.spreadId === 'past-present-future' &&
      rec.matchScore <= 1

    if (rec.matchScore > 0 && !isDefaultPpfFallback) {
      return {
        path: `/tarot/${rec.themeId}/${rec.spreadId}?question=${encodeURIComponent(question)}`,
        cardCount: rec.spread.cardCount,
        spreadTitle: isKo ? rec.spread.titleKo || rec.spread.title : rec.spread.title,
        isKeywordMatch: true,
      }
    }
  }

  const defaultRecommendation = recommendations.find(
    (rec) => rec.themeId === DEFAULT_QUICK_THEME_ID && rec.spreadId === DEFAULT_QUICK_SPREAD_ID
  )

  if (defaultRecommendation) {
    return {
      path: `/tarot/${defaultRecommendation.themeId}/${defaultRecommendation.spreadId}?question=${encodeURIComponent(question)}`,
      cardCount: defaultRecommendation.spread.cardCount,
      spreadTitle: isKo
        ? defaultRecommendation.spread.titleKo || defaultRecommendation.spread.title
        : defaultRecommendation.spread.title,
      isKeywordMatch: false,
    }
  }

  // Keyword match failed - fallback to non-PPF default
  return {
    path: `/tarot/general-insight/quick-reading?question=${encodeURIComponent(question)}`,
    cardCount: 1,
    spreadTitle: isKo ? '빠른 리딩' : 'Quick Reading',
    isKeywordMatch: false,
  }
}
