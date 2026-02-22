type SupportedLanguage = 'ko' | 'en'

export interface TarotInterpretationQualityCard {
  name: string
  position: string
}

export interface TarotInterpretationQualityInsight {
  position: string
  card_name: string
  interpretation: string
}

export interface TarotInterpretationQualityResultPayload {
  overall_message?: string
  card_insights?: TarotInterpretationQualityInsight[]
  guidance?: string | Array<{ title?: string; detail?: string }>
  fallback?: boolean
}

export interface TarotInterpretationQualityResult {
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D'
  structureScore: number
  groundingScore: number
  actionabilityScore: number
  languageScore: number
  clarityScore: number
  issues: string[]
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractGuidanceText(
  guidance: TarotInterpretationQualityResultPayload['guidance']
): string {
  if (!guidance) return ''
  if (typeof guidance === 'string') return guidance

  return guidance
    .map((item) => `${item.title || ''} ${item.detail || ''}`.trim())
    .filter(Boolean)
    .join('\n')
}

function scoreStructure(
  overall: string,
  insights: TarotInterpretationQualityInsight[],
  expectedCards: TarotInterpretationQualityCard[],
  guidanceText: string,
  issues: string[]
): number {
  let score = 0

  if (overall.length >= 80) {
    score += 25
  } else if (overall.length >= 40) {
    score += 12
    issues.push('overall_message is too short for robust guidance')
  } else {
    issues.push('overall_message is missing or extremely short')
  }

  if (expectedCards.length === 0) {
    score += 35
  } else {
    const countRatio = Math.min(insights.length / expectedCards.length, 1)
    score += Math.round(35 * countRatio)
    if (countRatio < 1) {
      issues.push('card_insights count does not match drawn cards')
    }
  }

  if (insights.length > 0) {
    const richInsights = insights.filter((item) => (item.interpretation || '').trim().length >= 30)
    const ratio = richInsights.length / insights.length
    score += Math.round(25 * ratio)
    if (ratio < 0.75) {
      issues.push('many card insights are too short')
    }
  } else {
    issues.push('card_insights missing')
  }

  if (guidanceText.trim().length >= 25) {
    score += 15
  } else {
    issues.push('guidance is missing or too short')
  }

  return Math.min(score, 100)
}

function scoreGrounding(
  insights: TarotInterpretationQualityInsight[],
  expectedCards: TarotInterpretationQualityCard[],
  issues: string[]
): number {
  if (expectedCards.length === 0 || insights.length === 0) return 0

  let nameMatches = 0
  let positionMatches = 0

  for (let i = 0; i < expectedCards.length; i += 1) {
    const expected = expectedCards[i]
    const insight = insights[i]
    if (!insight) continue

    const expectedName = normalize(expected.name)
    const insightName = normalize(insight.card_name || '')
    if (insightName.includes(expectedName) || expectedName.includes(insightName)) {
      nameMatches += 1
    }

    const expectedPosition = normalize(expected.position)
    const insightPosition = normalize(insight.position || '')
    if (insightPosition.includes(expectedPosition) || expectedPosition.includes(insightPosition)) {
      positionMatches += 1
    }
  }

  const nameScore = (nameMatches / expectedCards.length) * 55
  const positionScore = (positionMatches / expectedCards.length) * 45
  const score = Math.round(nameScore + positionScore)

  if (nameMatches < expectedCards.length) {
    issues.push('card_name grounding mismatch')
  }
  if (positionMatches < expectedCards.length) {
    issues.push('position grounding mismatch')
  }

  return Math.min(score, 100)
}

function scoreActionability(guidanceText: string, overall: string, issues: string[]): number {
  const merged = `${guidanceText}\n${overall}`
  if (!merged.trim()) return 0

  let score = 0
  const hasSteps = /(^|\n)\s*\d[\).]/m.test(merged)
  const hasTimeAnchor =
    /(?:today|this week|within 7 days|next week|\uC624\uB298|\uC774\uBC88\s*\uC8FC|\uB2E4\uC74C\s*7\uC77C|\uC774\uBC88\s*\uB2EC)/i.test(
      merged
    )
  const hasActionVerb =
    /(?:write|plan|track|review|start|focus|set|talk|record|\uC815\uB9AC|\uAE30\uB85D|\uC2E4\uD589|\uC9D1\uC911|\uC124\uC815|\uC810\uAC80|\uB300\uD654|\uC2DC\uC791)/i.test(
      merged
    )
  const enoughLength = merged.length >= 120

  if (hasSteps) {
    score += 35
  } else {
    issues.push('missing step-by-step format')
  }

  if (hasTimeAnchor) {
    score += 30
  } else {
    issues.push('missing time anchor')
  }

  if (hasActionVerb) {
    score += 20
  } else {
    issues.push('missing concrete action verbs')
  }

  if (enoughLength) {
    score += 15
  } else {
    issues.push('action guidance is too brief')
  }

  return Math.min(score, 100)
}

function scoreLanguage(language: SupportedLanguage, mergedText: string, issues: string[]): number {
  const mojibake = /(?:\u00C3|\u00E2|\u00F0\u0178|\u00EF\u00B8|\uFFFD)/
  const hasKorean = /[\uAC00-\uD7A3]/.test(mergedText)
  const hasEnglish = /[A-Za-z]/.test(mergedText)

  let score = 100
  if (mojibake.test(mergedText)) {
    score -= 45
    issues.push('contains mojibake/encoding artifacts')
  }

  if (language === 'ko' && !hasKorean) {
    score -= 35
    issues.push('korean response lacks hangul content')
  }

  if (language === 'en' && !hasEnglish) {
    score -= 35
    issues.push('english response lacks english content')
  }

  return Math.max(0, Math.min(score, 100))
}

function scoreClarity(
  overall: string,
  insights: TarotInterpretationQualityInsight[],
  guidanceText: string,
  issues: string[]
): number {
  let score = 100
  const placeholderPattern =
    /\b(heroTitle|heroSub|subtitle|q1|q2|q3|search placeholder|keywords list|destinyMap)\b/i

  if (placeholderPattern.test(`${overall}\n${guidanceText}`)) {
    score -= 35
    issues.push('contains placeholder-like key text')
  }

  if (/listen to the cards\./i.test(guidanceText.trim())) {
    score -= 20
    issues.push('guidance is generic and non-specific')
  }

  if (insights.length >= 2) {
    const normalizedInsights = insights.map((item) => normalize(item.interpretation || ''))
    const uniqueInterpretations = new Set(normalizedInsights)
    if (uniqueInterpretations.size <= Math.ceil(insights.length / 2)) {
      score -= 25
      issues.push('card interpretations are overly repetitive')
    }
  }

  if (overall.trim().length < 60) {
    score -= 20
  }

  return Math.max(0, Math.min(score, 100))
}

function toQualityGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

export function evaluateTarotInterpretationQuality(input: {
  language: string
  cards: TarotInterpretationQualityCard[]
  result: TarotInterpretationQualityResultPayload
}): TarotInterpretationQualityResult {
  const language: SupportedLanguage = input.language === 'ko' ? 'ko' : 'en'
  const overall = (input.result.overall_message || '').trim()
  const insights = Array.isArray(input.result.card_insights) ? input.result.card_insights : []
  const guidanceText = extractGuidanceText(input.result.guidance).trim()
  const issues: string[] = []

  const structureScore = scoreStructure(overall, insights, input.cards, guidanceText, issues)
  const groundingScore = scoreGrounding(insights, input.cards, issues)
  const actionabilityScore = scoreActionability(guidanceText, overall, issues)
  const languageScore = scoreLanguage(
    language,
    `${overall}\n${guidanceText}\n${insights.map((item) => item.interpretation).join('\n')}`,
    issues
  )
  const clarityScore = scoreClarity(overall, insights, guidanceText, issues)

  const overallScore = Math.max(
    0,
    Math.round(
      structureScore * 0.35 +
        groundingScore * 0.25 +
        actionabilityScore * 0.2 +
        languageScore * 0.1 +
        clarityScore * 0.1
    )
  )

  return {
    overallScore,
    grade: toQualityGrade(overallScore),
    structureScore,
    groundingScore,
    actionabilityScore,
    languageScore,
    clarityScore,
    issues: Array.from(new Set(issues)),
  }
}
