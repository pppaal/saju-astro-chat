// astrology/themes/types.ts
// Kept only for AstroThemeKey — the calendar-engine extractors tag
// every signal with one of these 18 keys. The richer factor/analysis
// types that used to live here were tied to the wrapper analyzers
// (love.ts, money.ts, ...) that were deleted.

export type AstroThemeKey =
  | 'love' | 'money' | 'career' | 'family' | 'health' | 'personality'
  | 'study' | 'children' | 'parents' | 'travel' | 'social' | 'business'
  | 'reputation' | 'spirituality' | 'karma' | 'crisis' | 'creativity' | 'legal'
