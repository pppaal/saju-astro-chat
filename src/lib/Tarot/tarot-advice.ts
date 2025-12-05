import { Card } from "./tarot.types";
import { getCardAdviceLocalized } from "./tarot-card-advice";

// Returns concise advice for the given card/orientation with locale fallback.
export function getCardAdvice(card: Card, isReversed: boolean, locale: string = "en"): string {
  // 1) Use advice encoded on the card itself if present.
  const meaningBlock = isReversed ? card.reversed : card.upright;
  if (meaningBlock.advice) {
    return meaningBlock.advice;
  }

  // 2) Use curated lookup (supports locale fallback).
  const curated = getCardAdviceLocalized(card, isReversed, locale);
  if (curated) {
    return curated;
  }

  // 3) Derive a succinct action from keywords + leading meaning sentence.
  const primaryKeywords = meaningBlock.keywords.slice(0, 2).join(", ");
  const firstSentence = (meaningBlock.meaning.split(".")[0] || meaningBlock.meaning).trim();
  const base = firstSentence || `Focus on ${primaryKeywords || "clarity and balance"}`;

  return `${base}. Act with one small, practical step today.`.replace(/\s+/g, " ").trim();
}
