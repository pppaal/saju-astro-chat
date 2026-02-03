import { recommendSpreads } from '@/lib/Tarot/tarot-recommend'

/**
 * Get quick recommendation based on keyword matching
 * Returns path, card count, spread title, and whether keyword match succeeded
 */
export function getQuickRecommendation(
  question: string,
  isKo: boolean = true
): { path: string; cardCount: number; spreadTitle: string; isKeywordMatch: boolean } {
  const recommendations = recommendSpreads(question, 1)

  if (recommendations.length > 0 && recommendations[0].matchScore > 0) {
    const rec = recommendations[0]
    return {
      path: `/tarot/${rec.themeId}/${rec.spreadId}?question=${encodeURIComponent(question)}`,
      cardCount: rec.spread.cardCount,
      spreadTitle: isKo ? rec.spread.titleKo || rec.spread.title : rec.spread.title,
      isKeywordMatch: true,
    }
  }

  // Keyword match failed - return default with flag
  return {
    path: `/tarot/general-insight/past-present-future?question=${encodeURIComponent(question)}`,
    cardCount: 3,
    spreadTitle: isKo ? '과거-현재-미래' : 'Past-Present-Future',
    isKeywordMatch: false,
  }
}
