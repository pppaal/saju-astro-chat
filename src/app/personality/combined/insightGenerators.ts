import type { ICPAnalysis } from '@/lib/icp/types'
import type { PersonaAnalysis } from '@/lib/persona/types'
import { buildHybridNarrative } from '@/lib/persona/hybridNarrative'

export interface CombinedInsightCard {
  title: string
  content: string
  icon: string
}

export function generateCombinedInsights(
  icpResult: ICPAnalysis | null,
  personaResult: PersonaAnalysis | null,
  isKo: boolean
): CombinedInsightCard[] {
  if (!icpResult || !personaResult) return []

  const narrative = buildHybridNarrative({
    icp: icpResult,
    persona: personaResult,
    locale: isKo ? 'ko' : 'en',
  })

  return narrative.insights.map((insight, index) => ({
    icon: `${index + 1}`,
    title: insight.name,
    content: [
      insight.evidence,
      insight.strengthWhen,
      insight.riskAndAdjustment,
      insight.quickAction,
    ]
      .join(' ')
      .trim(),
  }))
}
