// 스프레드 4개만 남은 뒤의 슬림 question-engine.
// 깊이 기반 추천기에 위임 — 옛 헬퍼 (Heuristics/Helpers/Support) 의존 제거.

import { recommendSpreads } from './tarot-recommend'
import { isDangerousQuestion } from './safety'

export type QuestionEngineV2FallbackReason =
  | 'auth_failed'
  | 'server_error'
  | 'network_error'
  | 'parse_failed'
  | 'no_candidate'

export type EngineLanguage = 'ko' | 'en'

export interface EngineSpreadOption {
  themeId: string
  themeTitle: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  reason: string
  matchScore: number | null
  path: string
  recommended: boolean
}

export interface QuestionEngineV2Result {
  isDangerous: boolean
  message?: string
  themeId: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  userFriendlyExplanation: string
  question_summary: string
  question_profile: null
  direct_answer: string
  intent: string
  intent_label: string
  recommended_spreads: EngineSpreadOption[]
  path: string
  source: 'heuristic'
  fallback_reason: QuestionEngineV2FallbackReason | null
}

function buildPath(themeId: string, spreadId: string, question: string) {
  return `/tarot/${themeId}/${spreadId}?question=${encodeURIComponent(question)}`
}

export async function analyzeTarotQuestionV2(input: {
  question: string
  language: EngineLanguage
}): Promise<QuestionEngineV2Result> {
  const { question, language } = input
  const trimmed = question.trim()
  const isKo = language === 'ko'

  if (isDangerousQuestion(trimmed)) {
    return {
      isDangerous: true,
      message: isKo
        ? '지금 많이 힘드시면 1393(자살예방상담전화)로 연락해 주세요.'
        : 'If you are in crisis, please reach out to a crisis line (US: 988).',
      themeId: 'general-insight',
      spreadId: 'quick-reading',
      spreadTitle: isKo ? '한 장 리딩' : 'Quick Reading',
      cardCount: 1,
      userFriendlyExplanation: '',
      question_summary: trimmed,
      question_profile: null,
      direct_answer: '',
      intent: 'safety',
      intent_label: '',
      recommended_spreads: [],
      path: buildPath('general-insight', 'quick-reading', trimmed),
      source: 'heuristic',
      fallback_reason: null,
    }
  }

  const recs = recommendSpreads(trimmed, 4)
  const primary = recs[0]

  const recommended_spreads: EngineSpreadOption[] = recs.map((r, i) => ({
    themeId: r.themeId,
    themeTitle: r.theme.categoryKo || r.theme.category,
    spreadId: r.spreadId,
    spreadTitle: r.spread.titleKo || r.spread.title,
    cardCount: r.spread.cardCount,
    reason: isKo ? r.reasonKo : r.reason,
    matchScore: r.matchScore,
    path: buildPath(r.themeId, r.spreadId, trimmed),
    recommended: i === 0,
  }))

  return {
    isDangerous: false,
    themeId: primary?.themeId ?? 'general-insight',
    spreadId: primary?.spreadId ?? 'past-present-future',
    spreadTitle: primary
      ? primary.spread.titleKo || primary.spread.title
      : isKo
        ? '과거 · 현재 · 미래'
        : 'Past, Present, Future',
    cardCount: primary?.spread.cardCount ?? 3,
    userFriendlyExplanation: primary ? (isKo ? primary.reasonKo : primary.reason) : '',
    question_summary: trimmed,
    question_profile: null,
    direct_answer: '',
    intent: 'general',
    intent_label: isKo ? '일반 질문' : 'General',
    recommended_spreads,
    path: buildPath(
      primary?.themeId ?? 'general-insight',
      primary?.spreadId ?? 'past-present-future',
      trimmed
    ),
    source: 'heuristic',
    fallback_reason: null,
  }
}
