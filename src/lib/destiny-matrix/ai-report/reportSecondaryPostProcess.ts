import type { MatrixCalculationInput } from '../types'
import type { ReportTheme } from './types'

type Lang = 'ko' | 'en'

export interface SecondaryPostProcessDeps {
  sanitizeUserFacingNarrative: (text: string) => string
  formatNarrativeParagraphs: (text: string, lang: Lang) => string
}

function applyPremiumVoiceLayerToThemedSections(
  sections: Record<string, unknown>,
  theme: ReportTheme,
  deps: SecondaryPostProcessDeps
): Record<string, unknown> {
  if (theme !== 'career') return sections

  const next = { ...sections }

  const strategy = String(next.strategy || '').trim()
  if (strategy) {
    next.strategy = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        strategy.replace(
          /^지금 커리어 전략의 승부처는[^.]+\.\s*/u,
          '지금 커리어 전략의 승부처는 일을 더 크게 벌이는 것이 아니라, 더 어려운 결정을 맡겨도 흔들리지 않는 사람으로 보이는 데 있습니다. '
        )
      ),
      'ko'
    )
  }

  const turningPoints = String(next.turningPoints || '').trim()
  if (turningPoints) {
    next.turningPoints = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        turningPoints.replace(
          /^커리어 전환점은[^.]+\.\s*/u,
          '커리어 전환점은 기회가 갑자기 커질 때보다, 지금 방식으로는 다음 단계에 못 간다는 사실을 인정할 때 열립니다. '
        )
      ),
      'ko'
    )
  }

  const recommendations = next.recommendations
  if (typeof recommendations === 'string' && recommendations.trim()) {
    next.recommendations = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        recommendations.replace(
          /^기준을 정리한 뒤 실행하고/u,
          '추천은 많지 않아도 됩니다. 지금은 기준을 먼저 정리한 뒤 움직이는 편이 훨씬 강합니다. '
        )
      ),
      'ko'
    )
  }

  return next
}

export function sanitizeThemedSectionsForUser(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  lang: Lang,
  deps: SecondaryPostProcessDeps,
  theme?: ReportTheme
): Record<string, unknown> {
  const next = { ...sections }
  for (const key of sectionPaths) {
    const current = String(next[key] || '').trim()
    if (!current) continue
    const cleaned = deps.sanitizeUserFacingNarrative(current)
    next[key] = deps.formatNarrativeParagraphs(cleaned, lang)
  }
  if (lang === 'ko' && theme) {
    return applyPremiumVoiceLayerToThemedSections(next, theme, deps)
  }
  return next
}

export function sanitizeTimingContradictions(text: string, input: MatrixCalculationInput): string {
  if (!text) return text
  let out = text
  if (input.currentSaeunElement && /세운\s*미입력/gi.test(out)) {
    out = out.replace(/세운\s*미입력/gi, '세운 흐름 반영')
  }
  if (input.currentDaeunElement && /대운\s*미입력/gi.test(out)) {
    out = out.replace(/대운\s*미입력/gi, '대운 흐름 반영')
  }
  if (input.currentWolunElement && /월운\s*미입력/gi.test(out)) {
    out = out.replace(/월운\s*미입력/gi, '월운 흐름 반영')
  }
  if ((input.currentIljinElement || input.currentIljinDate) && /일진\s*미입력/gi.test(out)) {
    out = out.replace(/일진\s*미입력/gi, '일진 흐름 반영')
  }
  return out
}
