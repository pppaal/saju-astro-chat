export interface RecommendedSpreadOption {
  themeId: string
  themeTitle: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  reason: string
  matchScore?: number | null
  path: string
  recommended?: boolean
}

export interface QuestionProfileField {
  code: string
  label: string
}

export interface QuestionProfile {
  type: QuestionProfileField
  subject: QuestionProfileField
  focus: QuestionProfileField
  timeframe: QuestionProfileField
  tone: QuestionProfileField
}

export interface TarotQuestionAnalysisResult {
  isDangerous?: boolean
  message?: string
  themeId: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  userFriendlyExplanation: string
  question_summary?: string
  question_profile?: QuestionProfile
  direct_answer?: string
  intent?: string
  intent_label?: string
  recommended_spreads?: RecommendedSpreadOption[]
  path: string
  source?: 'pattern' | 'llm' | 'heuristic' | 'fallback'
  fallback_reason?: string | null
  confidence?: 'high' | 'medium' | 'low'
  assumption?: string | null
  requires_confirmation?: boolean
}

export interface TarotQuestionAnalysisSnapshot {
  question_summary?: string
  question_profile?: QuestionProfile
  direct_answer?: string
  intent?: string
  intent_label?: string
}

export type TarotQuestionIntent = 'yesNo' | 'flow' | 'open'

type StableEntry = {
  themeId: string
  spreadId: string
}

const ANALYSIS_STORAGE_PREFIX = 'tarot-question-analysis:'

function normalizeQuestion(text: string): string {
  return (text || '').trim()
}

function inferIntentFromQuestion(question: string): TarotQuestionIntent {
  const normalized = question.toLowerCase().trim()
  if (!normalized) return 'open'

  if (
    /(흐름|전반|전체|방향|큰\s*그림|overall|general\s*flow|big\s*picture|direction)/i.test(
      normalized
    )
  ) {
    return 'flow'
  }

  if (/(할까|될까|인가|일까|가능성|should i|will i|is it|can i|\?)/i.test(normalized)) {
    return 'yesNo'
  }

  return 'open'
}

export function getQuestionIntent(
  question: string,
  analysis?: TarotQuestionAnalysisSnapshot | null
): TarotQuestionIntent {
  const profile = analysis?.question_profile
  const typeCode = profile?.type?.code
  const subjectCode = profile?.subject?.code
  const timeframeCode = profile?.timeframe?.code
  const toneCode = profile?.tone?.code

  if (
    typeCode === 'broad_flow' ||
    toneCode === 'flow' ||
    timeframeCode === 'current_phase' ||
    subjectCode === 'overall_flow'
  ) {
    return 'flow'
  }

  if (
    typeCode === 'decision' ||
    typeCode === 'other_response' ||
    typeCode === 'self_decision' ||
    typeCode === 'other_person_response' ||
    typeCode === 'meeting_likelihood' ||
    typeCode === 'near_term_outcome' ||
    typeCode === 'timing'
  ) {
    return 'yesNo'
  }

  if (toneCode === 'prediction' && /[?？]/.test(question)) {
    return 'yesNo'
  }

  return inferIntentFromQuestion(question)
}

export function resolveStableTarotEntry(
  question: string,
  analysis?: TarotQuestionAnalysisSnapshot | null
): StableEntry {
  // 4 스프레드만 남은 뒤로는 도메인이 아닌 *깊이* 만 본다.
  // 도메인은 LLM 이 해석 단계에서 알아서 추출 (분리된 라우팅 불필요).
  const profile = analysis?.question_profile
  const typeCode = profile?.type?.code
  const subjectCode = profile?.subject?.code
  const timeframeCode = profile?.timeframe?.code
  const toneCode = profile?.tone?.code

  // 흐름 질문 = 3장
  if (
    typeCode === 'broad_flow' ||
    timeframeCode === 'current_phase' ||
    toneCode === 'flow' ||
    subjectCode === 'overall_flow'
  ) {
    return { themeId: 'general-insight', spreadId: 'past-present-future' }
  }

  const q = (question || '').trim()
  // 인생급 질문 = 10장
  if (/(인생|평생|운명|진로|소명|왜 ?사|어떻게 ?살|삶의 ?의미)/i.test(q) || q.length >= 80) {
    return { themeId: 'general-insight', spreadId: 'celtic-cross' }
  }
  // 본격 결정·관계·재정 등 = 5장
  if (q.length >= 40 || /(어떻게|왜|이직|결혼|헤어|선택|결정|투자)/i.test(q)) {
    return { themeId: 'general-insight', spreadId: 'general-cross' }
  }
  // 가벼운 단답 = 1장
  if (q.length <= 10) {
    return { themeId: 'general-insight', spreadId: 'quick-reading' }
  }
  // 기본 = 3장
  return { themeId: 'general-insight', spreadId: 'past-present-future' }
}

export function toAnalysisSnapshot(
  analysis?: TarotQuestionAnalysisResult | null
): TarotQuestionAnalysisSnapshot | null {
  if (!analysis) return null
  return {
    question_summary: analysis.question_summary,
    question_profile: analysis.question_profile,
    direct_answer: analysis.direct_answer,
    intent: analysis.intent,
    intent_label: analysis.intent_label,
  }
}

export function storeQuestionAnalysisSnapshot(
  question: string,
  analysis?: TarotQuestionAnalysisResult | null
): string | null {
  if (typeof window === 'undefined') return null

  const trimmedQuestion = normalizeQuestion(question)
  const snapshot = toAnalysisSnapshot(analysis)
  if (!trimmedQuestion || !snapshot) return null

  const key = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

  try {
    window.sessionStorage.setItem(
      `${ANALYSIS_STORAGE_PREFIX}${key}`,
      JSON.stringify({
        question: trimmedQuestion,
        snapshot,
        savedAt: Date.now(),
      })
    )
    return key
  } catch {
    return null
  }
}

export function loadQuestionAnalysisSnapshot(
  analysisKey?: string | null,
  question?: string | null
): TarotQuestionAnalysisSnapshot | null {
  if (typeof window === 'undefined' || !analysisKey) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(`${ANALYSIS_STORAGE_PREFIX}${analysisKey}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as {
      question?: string
      snapshot?: TarotQuestionAnalysisSnapshot
    }

    const storedQuestion = normalizeQuestion(parsed.question || '')
    const currentQuestion = normalizeQuestion(question || '')
    if (storedQuestion && currentQuestion && storedQuestion !== currentQuestion) {
      return null
    }

    return parsed.snapshot || null
  } catch {
    return null
  }
}

export function buildQuestionContextPrompt(
  question: string,
  analysis: TarotQuestionAnalysisSnapshot | null | undefined,
  language: 'ko' | 'en'
): string {
  const trimmedQuestion = normalizeQuestion(question)
  if (!analysis) {
    return trimmedQuestion
  }

  const lines: string[] = []
  if (trimmedQuestion) {
    lines.push(trimmedQuestion)
  }

  const typeLabel = analysis.question_profile?.type?.label?.trim()
  const subjectLabel = analysis.question_profile?.subject?.label?.trim()
  const focusLabel = analysis.question_profile?.focus?.label?.trim()
  const timeframeLabel = analysis.question_profile?.timeframe?.label?.trim()
  const toneLabel = analysis.question_profile?.tone?.label?.trim()
  const directAnswer = analysis.direct_answer?.trim()
  const questionSummary = analysis.question_summary?.trim()

  if (language === 'ko') {
    if (questionSummary) lines.push(`[질문 요약] ${questionSummary}`)
    if (typeLabel) lines.push(`[질문 종류] ${typeLabel}`)
    if (subjectLabel) lines.push(`[주체] ${subjectLabel}`)
    if (focusLabel) lines.push(`[핵심 포커스] ${focusLabel}`)
    if (timeframeLabel) lines.push(`[시간축] ${timeframeLabel}`)
    if (toneLabel) lines.push(`[질문 톤] ${toneLabel}`)
    if (directAnswer) lines.push(`[질문 선해석] ${directAnswer}`)
  } else {
    if (questionSummary) lines.push(`[Question Summary] ${questionSummary}`)
    if (typeLabel) lines.push(`[Question Type] ${typeLabel}`)
    if (subjectLabel) lines.push(`[Subject] ${subjectLabel}`)
    if (focusLabel) lines.push(`[Core Focus] ${focusLabel}`)
    if (timeframeLabel) lines.push(`[Timeframe] ${timeframeLabel}`)
    if (toneLabel) lines.push(`[Tone] ${toneLabel}`)
    if (directAnswer) lines.push(`[Pre-read Answer] ${directAnswer}`)
  }

  return lines.join('\n')
}
