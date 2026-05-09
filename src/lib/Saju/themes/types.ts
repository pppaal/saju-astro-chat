// Saju/themes/types.ts
// 테마별 해석 wrapper 공통 타입. astrology/themes 와 동일 형태.

// 단순 4기둥 입력 — sibsinAnalysis 등 내부 함수가 기대하는 {stem, branch} 형태와 일치.
export interface SimplePillar { stem: string; branch: string }

export interface SimpleSajuPillars {
  year: SimplePillar
  month: SimplePillar
  day: SimplePillar
  hour: SimplePillar  // sibsinAnalysis 의 SajuPillars 와 mirror (hour 키)
}

export type SajuThemeKey = 'love' | 'money' | 'career' | 'family' | 'health' | 'personality'

export type SajuThemeTone = 'positive' | 'mixed' | 'cautious' | 'neutral'

export interface SajuThemeFactor {
  source: string
  meaning: string
  tone: SajuThemeTone
}

export interface SajuThemeAnalysis {
  theme: SajuThemeKey
  factors: SajuThemeFactor[]
  summary: string
}
