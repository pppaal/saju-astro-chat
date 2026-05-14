import { tarotThemes } from './tarot-spreads-data'
import {
  complexityKeywords,
  dangerousKeywords,
  directMatches,
  themeKeywords,
} from './tarot-recommend.data'
import type { DirectMatch } from './tarot-recommend.data'
import { Spread, TarotTheme } from './tarot.types'

export interface SpreadRecommendation {
  themeId: string
  theme: TarotTheme
  spreadId: string
  spread: Spread
  reason: string
  reasonKo: string
  matchScore: number
}

type KeywordScore = { term: string; score: number }

type DirectMatchNormalized = Omit<DirectMatch, 'keywords' | 'contextKeywords'> & {
  keywords: string[]
  contextKeywords?: string[]
}

const toLower = (value: string): string => value.toLowerCase()

const themeKeywordScores = Object.fromEntries(
  Object.entries(themeKeywords).map(([themeId, keywords]) => [
    themeId,
    keywords.map((keyword) => {
      const weight = keyword.length >= 3 ? 1.5 : 1.0
      return { term: keyword.toLowerCase(), score: keyword.length * weight }
    }),
  ])
) as Record<string, KeywordScore[]>

const complexityKeywordsLower = {
  simple: complexityKeywords.simple.map(toLower),
  detailed: complexityKeywords.detailed.map(toLower),
}

const directMatchesLower: DirectMatchNormalized[] = directMatches.map((match) => ({
  ...match,
  keywords: match.keywords.map(toLower),
  contextKeywords: match.contextKeywords ? match.contextKeywords.map(toLower) : undefined,
}))

const dangerousKeywordsLower = dangerousKeywords.map(toLower)

// 테마별 키워드 매핑
// 복잡도 키워드
// 예시 질문 프리셋 - 더 구체적이고 실제 고민처럼
function calculateThemeScores(question: string): Record<string, number> {
  const normalizedQuestion = question.toLowerCase()
  const scores: Record<string, number> = {}

  for (const [themeId, keywords] of Object.entries(themeKeywordScores)) {
    let score = 0
    for (const { term, score: keywordScore } of keywords) {
      if (normalizedQuestion.includes(term)) {
        score += keywordScore
      }
    }
    scores[themeId] = score
  }

  return scores
}

function determineComplexity(question: string): 'simple' | 'normal' | 'detailed' {
  const normalizedQuestion = question.toLowerCase()

  for (const keyword of complexityKeywordsLower.simple) {
    if (normalizedQuestion.includes(keyword)) {
      return 'simple'
    }
  }
  for (const keyword of complexityKeywordsLower.detailed) {
    if (normalizedQuestion.includes(keyword)) {
      return 'detailed'
    }
  }

  return 'normal'
}

function getCardCountRange(complexity: 'simple' | 'normal' | 'detailed'): [number, number] {
  switch (complexity) {
    case 'simple':
      return [1, 3]
    case 'detailed':
      return [5, 10]
    default:
      return [2, 5]
  }
}

function getReasonKo(themeId: string, cardCount: number): string {
  const themeReasons: Record<string, string> = {
    'love-relationships': '연애와 관계에 대한 통찰',
    'career-work': '커리어와 직장에 대한 조언',
    'money-finance': '재정과 금전운에 대한 해석',
    'well-being-health': '건강과 웰빙에 대한 메시지',
    'decisions-crossroads': '선택과 결정에 대한 가이드',
    'daily-reading': '오늘 하루에 대한 메시지',
    'self-discovery': '나를 더 깊이 이해하는 리딩',
    'spiritual-growth': '영적 성장에 대한 통찰',
    'general-insight': '전반적인 운세와 흐름',
  }

  const cardCountDesc =
    cardCount === 1 ? '핵심만 간단히' : cardCount <= 3 ? '적절한 깊이로' : '자세하게 분석'
  return `${themeReasons[themeId] || '운세에 대한 통찰'} - ${cardCountDesc}`
}
interface MatchResult {
  match: DirectMatch
  score: number
}

// 위험한 질문 감지 (자해/자살 관련)
function isDangerousQuestion(question: string): boolean {
  const normalizedQuestion = question.toLowerCase()
  return dangerousKeywordsLower.some((keyword) => normalizedQuestion.includes(keyword))
}

// 위험한 질문에 대한 특별 응답
export function checkDangerousQuestion(question: string): {
  isDangerous: boolean
  message?: string
  messageKo?: string
} {
  if (isDangerousQuestion(question)) {
    return {
      isDangerous: true,
      message:
        'I sense you might be going through a difficult time. Please reach out to a professional who can help. Crisis helpline: 1393 (Korea) or your local emergency services.',
      messageKo:
        '힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)',
    }
  }
  return { isDangerous: false }
}

function findDirectMatch(question: string): SpreadRecommendation | null {
  const normalizedQuestion = question.toLowerCase()

  // Strong pre-rule: explicit timing intent should route to timing-window first.
  // But if domain-specific keywords exist (career/love/money/etc.), let domain rules win.
  const timingIntentPattern = /언제|시기|타이밍|때가|when|timing|best time|right time/i
  const timingDomainPattern =
    /이직|취업|직장|승진|career|job|work|연애|사랑|결혼|재회|relationship|love|돈|재정|투자|money|finance|건강|힐링|health|오늘|하루|today|이번\s*주|week/i

  if (
    timingIntentPattern.test(normalizedQuestion) &&
    !timingDomainPattern.test(normalizedQuestion)
  ) {
    const theme = tarotThemes.find((t) => t.id === 'decisions-crossroads')
    const spread = theme?.spreads.find((s) => s.id === 'timing-window')
    if (theme && spread) {
      return {
        themeId: 'decisions-crossroads',
        theme,
        spreadId: 'timing-window',
        spread,
        reason: 'Find the right timing',
        reasonKo: '적절한 타이밍을 봐요',
        matchScore: 125,
      }
    }
  }

  // Strong pre-rule: binary A/B choice phrasing should go to two-paths,
  // even when each clause ends with "~할까" (which would otherwise hit yes-no-why).
  const binaryChoicePattern =
    /([a-z0-9가-힣]+)\s*할까\s*([a-z0-9가-힣]+)\s*할까|(\b[a-z]\b)\s*(vs|or)\s*(\b[a-z]\b)|아니면|둘\s*중|vs/i
  if (binaryChoicePattern.test(normalizedQuestion)) {
    const theme = tarotThemes.find((t) => t.id === 'decisions-crossroads')
    const spread = theme?.spreads.find((s) => s.id === 'two-paths')
    if (theme && spread) {
      return {
        themeId: 'decisions-crossroads',
        theme,
        spreadId: 'two-paths',
        spread,
        reason: 'Compare your options',
        reasonKo: '두 선택지를 비교해봐요',
        matchScore: 120,
      }
    }
  }

  const matchResults: MatchResult[] = []

  for (const match of directMatchesLower) {
    // 메인 키워드 중 하나라도 매칭되는지 확인
    let mainKeywordMatched = false
    for (const keyword of match.keywords) {
      if (normalizedQuestion.includes(keyword)) {
        mainKeywordMatched = true
        break
      }
    }

    if (!mainKeywordMatched) {
      continue
    }

    // contextKeywords가 있는 경우: 둘 다 매칭되어야 함
    if (match.contextKeywords && match.contextKeywords.length > 0) {
      let contextMatched = false
      for (const contextKw of match.contextKeywords) {
        if (normalizedQuestion.includes(contextKw)) {
          contextMatched = true
          break
        }
      }
      // 컨텍스트 키워드가 있는데 매칭 안 되면 스킵
      if (!contextMatched) {
        continue
      }
    }

    // 매칭 성공! 결과에 추가
    matchResults.push({
      match,
      score: match.priority,
    })
  }

  // 우선순위가 가장 높은 매칭 선택
  if (matchResults.length === 0) {
    return null
  }

  matchResults.sort((a, b) => b.score - a.score)
  const bestMatch = matchResults[0].match

  const theme = tarotThemes.find((t) => t.id === bestMatch.themeId)
  const spread = theme?.spreads.find((s) => s.id === bestMatch.spreadId)

  if (theme && spread) {
    return {
      themeId: bestMatch.themeId,
      theme,
      spreadId: bestMatch.spreadId,
      spread,
      reason: bestMatch.reason,
      reasonKo: bestMatch.reasonKo,
      matchScore: bestMatch.priority,
    }
  }

  return null
}

function getDefaultRecommendations(): SpreadRecommendation[] {
  const recommendations: SpreadRecommendation[] = []

  const dailyTheme = tarotThemes.find((t) => t.id === 'daily-reading')
  if (dailyTheme) {
    const dayCard = dailyTheme.spreads.find((s) => s.id === 'day-card')
    if (dayCard) {
      recommendations.push({
        themeId: 'daily-reading',
        theme: dailyTheme,
        spreadId: 'day-card',
        spread: dayCard,
        reason: 'Quick daily guidance',
        reasonKo: '오늘 하루의 메시지를 한 장으로',
        matchScore: 0,
      })
    }
  }

  const generalTheme = tarotThemes.find((t) => t.id === 'general-insight')
  if (generalTheme) {
    const ppf = generalTheme.spreads.find((s) => s.id === 'past-present-future')
    if (ppf) {
      recommendations.push({
        themeId: 'general-insight',
        theme: generalTheme,
        spreadId: 'past-present-future',
        spread: ppf,
        reason: 'Understand your timeline',
        reasonKo: '과거부터 미래까지 흐름 파악',
        matchScore: 0,
      })
    }
    const celtic = generalTheme.spreads.find((s) => s.id === 'celtic-cross')
    if (celtic) {
      recommendations.push({
        themeId: 'general-insight',
        theme: generalTheme,
        spreadId: 'celtic-cross',
        spread: celtic,
        reason: 'Deep comprehensive reading',
        reasonKo: '모든 측면을 깊이 있게 분석',
        matchScore: 0,
      })
    }
  }

  return recommendations
}

export interface RecommendSpreadsResult {
  recommendations: SpreadRecommendation[]
  dangerousWarning?: { message: string; messageKo: string }
}

export function recommendSpreads(question: string, maxResults?: number): SpreadRecommendation[]
export function recommendSpreads(
  question: string,
  maxResults: number,
  options: { checkDangerous: true }
): RecommendSpreadsResult
export function recommendSpreads(
  question: string,
  maxResults?: number,
  options?: { checkDangerous?: boolean }
): SpreadRecommendation[] | RecommendSpreadsResult {
  const limit = maxResults ?? 3
  // CRITICAL: 위험한 질문 체크 (자해/자살 관련)
  if (options?.checkDangerous) {
    const dangerCheck = checkDangerousQuestion(question)
    if (dangerCheck.isDangerous && dangerCheck.message && dangerCheck.messageKo) {
      return {
        recommendations: getDefaultRecommendations().slice(0, limit),
        dangerousWarning: {
          message: dangerCheck.message,
          messageKo: dangerCheck.messageKo,
        },
      }
    }
  }

  if (!question.trim()) {
    const defaults = getDefaultRecommendations()
    return options?.checkDangerous ? { recommendations: defaults } : defaults
  }

  const recommendations: SpreadRecommendation[] = []

  // 1. 직접 매칭 우선 체크
  const directMatch = findDirectMatch(question)
  if (directMatch) {
    recommendations.push(directMatch)
  }

  // 2. 테마 기반 추천
  const themeScores = calculateThemeScores(question)
  const complexity = determineComplexity(question)
  const [minCards, maxCards] = getCardCountRange(complexity)

  const sortedThemes = Object.entries(themeScores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)

  const themesToCheck =
    sortedThemes.length > 0
      ? sortedThemes.slice(0, 3)
      : [['general-insight', 0] as [string, number]]

  for (const [themeId, themeScore] of themesToCheck) {
    const theme = tarotThemes.find((t) => t.id === themeId)
    if (!theme) {
      continue
    }

    const suitableSpreads = theme.spreads
      .filter((spread) => spread.cardCount >= minCards && spread.cardCount <= maxCards)
      .slice(0, 2)

    for (const spread of suitableSpreads) {
      // 이미 직접 매칭으로 추가된 스프레드는 건너뛰기
      if (recommendations.find((r) => r.spreadId === spread.id)) {
        continue
      }

      recommendations.push({
        themeId,
        theme,
        spreadId: spread.id,
        spread,
        reason: `Perfect for ${theme.category.toLowerCase()} questions`,
        reasonKo: getReasonKo(themeId, spread.cardCount),
        matchScore: themeScore,
      })
    }
  }

  const uniqueRecommendations = recommendations
    .filter((rec, index, self) => index === self.findIndex((r) => r.spreadId === rec.spreadId))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)

  if (uniqueRecommendations.length < limit) {
    const defaults = getDefaultRecommendations()
    for (const def of defaults) {
      if (uniqueRecommendations.length >= limit) {
        break
      }
      if (!uniqueRecommendations.find((r) => r.spreadId === def.spreadId)) {
        uniqueRecommendations.push(def)
      }
    }
  }

  return options?.checkDangerous
    ? { recommendations: uniqueRecommendations }
    : uniqueRecommendations
}
