import type { TarotFallbackContext } from './fallbackReply'

type SupportedLanguage = 'ko' | 'en'

export interface TarotFallbackQualityResult {
  overallScore: number
  cardGroundingScore: number
  actionabilityScore: number
  clarityScore: number
  issues: string[]
}

const BANNED_AI_PHRASES_EN = ['i believe', 'i suggest', 'i recommend', 'positive mindset']
const BANNED_AI_PHRASES_KO = ['긍정적인 마음가짐', '추천드립니다', '제 생각에는']

function containsAny(input: string, patterns: string[]): boolean {
  const normalized = input.toLowerCase()
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()))
}

function hasCardGrounding(reply: string, context: TarotFallbackContext): boolean {
  if (!context.cards.length) return true
  const cardsToCheck = context.cards.slice(0, 2)
  return cardsToCheck.every((card) => {
    const namePresent = reply.includes(card.name)
    const positionPresent = card.position ? reply.includes(card.position) : true
    return namePresent && positionPresent
  })
}

function hasActionPlan(reply: string, language: SupportedLanguage): boolean {
  const numberedSteps = reply.match(/(^|\n)\d\)/g)?.length || 0
  if (numberedSteps < 2) return false
  if (language === 'ko') {
    return /(오늘|이번 주|7일|다음 7일)/.test(reply)
  }
  return /(Today|This week|Within 7 days|within 7 days)/.test(reply)
}

function hasFollowupQuestion(reply: string, language: SupportedLanguage): boolean {
  if (!reply.includes('?')) return false
  if (language === 'ko') {
    return reply.includes('다음 질문')
  }
  return reply.includes('Next question')
}

export function evaluateTarotFallbackQuality(input: {
  reply: string
  context: TarotFallbackContext
  language: string
}): TarotFallbackQualityResult {
  const language: SupportedLanguage = input.language === 'ko' ? 'ko' : 'en'
  const normalizedReply = input.reply.replace(/\s+/g, ' ').trim()
  const issues: string[] = []

  const cardGroundingOk = hasCardGrounding(normalizedReply, input.context)
  const actionPlanOk = hasActionPlan(input.reply, language)
  const followupOk = hasFollowupQuestion(input.reply, language)

  const bannedPhraseDetected =
    language === 'ko'
      ? containsAny(normalizedReply, BANNED_AI_PHRASES_KO)
      : containsAny(normalizedReply, BANNED_AI_PHRASES_EN)

  let cardGroundingScore = 100
  let actionabilityScore = 100
  let clarityScore = 100

  if (!cardGroundingOk) {
    cardGroundingScore -= 45
    issues.push('Missing card grounding (name/position evidence)')
  }

  if (!actionPlanOk) {
    actionabilityScore -= 45
    issues.push('Missing concrete action steps with time anchor')
  }

  if (!followupOk) {
    clarityScore -= 30
    issues.push('Missing follow-up question')
  }

  if (bannedPhraseDetected) {
    clarityScore -= 30
    issues.push('Contains banned AI-like phrasing')
  }

  if (normalizedReply.length < 140) {
    clarityScore -= 20
    issues.push('Reply too short for robust fallback guidance')
  }

  const overallScore = Math.max(
    0,
    Math.round(cardGroundingScore * 0.4 + actionabilityScore * 0.35 + clarityScore * 0.25)
  )

  return {
    overallScore,
    cardGroundingScore: Math.max(0, cardGroundingScore),
    actionabilityScore: Math.max(0, actionabilityScore),
    clarityScore: Math.max(0, clarityScore),
    issues,
  }
}
