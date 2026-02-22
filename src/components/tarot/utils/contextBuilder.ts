/**
 * Context building and merging utilities
 * Extracted from TarotChat.tsx lines 463-498
 */

import type { DrawnCard } from '@/lib/Tarot/tarot.types'
import type { InterpretationResult, ReadingResponse } from '../types'
import type { PersistedContext, PersistedCard } from '../types/storage'

const MAX_FOLLOWUP_CONTEXT_CARDS = 8

/**
 * Build context from reading result and interpretation
 *
 * @param readingResult - The tarot reading result
 * @param interpretation - AI interpretation (optional)
 * @param categoryName - Category name
 * @param persistedContext - Previously persisted context for merging
 * @param language - Language code for card data
 * @returns Built context object
 */
export function buildContext(
  readingResult: ReadingResponse,
  interpretation: InterpretationResult | null,
  categoryName: string,
  persistedContext: PersistedContext | null,
  _language: 'ko' | 'en'
): PersistedContext {
  const cards = readingResult.drawnCards.map((dc, idx) => ({
    position: readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
    name: dc.card.name,
    is_reversed: dc.isReversed, // snake_case for backend compatibility
    meaning: dc.isReversed ? dc.card.reversed.meaning : dc.card.upright.meaning,
    keywords: dc.isReversed
      ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords
      : dc.card.upright.keywordsKo || dc.card.upright.keywords,
  }))

  const base: PersistedContext = {
    spread_title: readingResult.spread.title,
    category: categoryName,
    cards,
    overall_message: interpretation?.overall_message || '',
    guidance: interpretation?.guidance || '',
  }

  // If we have a persisted context with cards, merge to keep continuity
  const persistedCards = persistedContext?.cards
  if (persistedCards && persistedCards.length) {
    const merged = [...persistedCards]
    for (const c of cards) {
      const dup = merged.find(
        (p) => p.name === c.name && (p.position === c.position || !p.position || !c.position)
      )
      if (!dup) {
        merged.push(c)
      }
    }
    return { ...base, cards: merged }
  }

  return base
}

/**
 * Build context with a newly drawn card added to the existing context
 *
 * @param baseContext - Base context to extend
 * @param newCard - Newly drawn card
 * @param language - Language code for card data
 * @returns Context with new card prepended
 */
export function buildContextWithNewCard(
  baseContext: PersistedContext,
  newCard: DrawnCard,
  language: 'ko' | 'en'
): PersistedContext {
  const newCardData: PersistedCard = {
    position: language === 'ko' ? '이번 질문에 대한 카드' : 'Card for this question',
    name: language === 'ko' ? newCard.card.nameKo || newCard.card.name : newCard.card.name,
    is_reversed: newCard.isReversed,
    meaning: newCard.isReversed
      ? language === 'ko'
        ? newCard.card.reversed.meaningKo || newCard.card.reversed.meaning
        : newCard.card.reversed.meaning
      : language === 'ko'
        ? newCard.card.upright.meaningKo || newCard.card.upright.meaning
        : newCard.card.upright.meaning,
    keywords: newCard.isReversed
      ? language === 'ko'
        ? newCard.card.reversed.keywordsKo || newCard.card.reversed.keywords
        : newCard.card.reversed.keywords
      : language === 'ko'
        ? newCard.card.upright.keywordsKo || newCard.card.upright.keywords
        : newCard.card.upright.keywords,
  }

  const merged = [newCardData, ...(baseContext.cards || [])]
  const deduped: PersistedCard[] = []
  const seen = new Set<string>()

  for (const card of merged) {
    const key = `${card.position}|${card.name}|${card.is_reversed ? 'R' : 'U'}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(card)
    if (deduped.length >= MAX_FOLLOWUP_CONTEXT_CARDS) break
  }

  return {
    ...baseContext,
    cards: deduped,
  }
}
