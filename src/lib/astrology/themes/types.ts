// astrology/themes/types.ts
// 테마별 해석 wrapper 공통 타입.
// Saju/familyLineage, Saju/healthCareer, Saju/sibsinAnalysis 의 테마 분석과 mirror.

export type AstroThemeKey = 'love' | 'money' | 'career' | 'family' | 'health' | 'personality'

export type AstroThemeTone = 'positive' | 'mixed' | 'cautious' | 'neutral'

export interface AstroThemeFactor {
  source: string         // "Venus in Leo (5궁)" 등 출처
  meaning: string        // 합성된 해석 텍스트
  tone: AstroThemeTone
}

export interface AstroThemeAnalysis {
  theme: AstroThemeKey
  factors: AstroThemeFactor[]
  summary: string        // 전체 narrative 한 줄
}
