// src/lib/destiny-matrix/compatibility/narrativeTypes.ts
//
// LLM-authored narrative layer that sits on top of the deterministic
// `analyzeThreeLayerCompatibility()` output. The 3-layer engine produces
// hard facts (scores, signals, level); this narrative wraps those facts
// in a magazine-style read so the result page has a story arc instead of
// raw numbers.

export type CompatibilityNarrativeIcon =
  | 'sparkles'
  | 'flame'
  | 'message'
  | 'heart'
  | 'compass'
  | 'star'
  | 'shield'
  | 'target'

export interface CompatibilityNarrativeInsight {
  id: string
  title: string
  iconKey: CompatibilityNarrativeIcon
  /** 정확히 2개 문단. */
  content: string[]
  /** 짧은 행동 처방 한두 문장. */
  advice: string
}

export interface CompatibilityNarrativeKeyMoment {
  /** "첫 만남" / "안정기" / "갈등 시기" / "장기 흐름" 등. */
  phase: string
  headline: string
  desc: string
}

export interface CompatibilityNarrative {
  theme: string
  subTheme: string
  /** 4문단 종합 요약. */
  summary: string[]
  /** 정확히 4개의 영역별 분석. */
  insights: CompatibilityNarrativeInsight[]
  dosAndDonts: { dos: string[]; donts: string[] }
  keyMoments: CompatibilityNarrativeKeyMoment[]
}

export const COMPATIBILITY_NARRATIVE_VERSION = '1.0.0'
