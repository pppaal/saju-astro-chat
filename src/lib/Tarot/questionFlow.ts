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

  if (/(흐름|전반|전체|방향|큰\s*그림|overall|general\s*flow|big\s*picture|direction)/i.test(normalized)) {
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
  const profile = analysis?.question_profile
  const typeCode = profile?.type?.code
  const subjectCode = profile?.subject?.code
  const timeframeCode = profile?.timeframe?.code
  const toneCode = profile?.tone?.code

  if (
    typeCode === 'broad_flow' ||
    timeframeCode === 'current_phase' ||
    toneCode === 'flow' ||
    subjectCode === 'overall_flow'
  ) {
    return { themeId: 'general-insight', spreadId: 'past-present-future' }
  }

  if (typeCode === 'reconciliation') {
    return { themeId: 'love-relationships', spreadId: 'reconciliation' }
  }

  if (typeCode === 'meeting_likelihood') {
    return { themeId: 'decisions-crossroads', spreadId: 'yes-no-why' }
  }

  if (typeCode === 'timing') {
    return { themeId: 'decisions-crossroads', spreadId: 'timing-window' }
  }

  if (typeCode === 'self_decision' || typeCode === 'decision') {
    return { themeId: 'decisions-crossroads', spreadId: 'yes-no-why' }
  }

  if (
    typeCode === 'inner_feelings' ||
    typeCode === 'emotion_read' ||
    typeCode === 'other_person_response' ||
    typeCode === 'other_response'
  ) {
    return { themeId: 'love-relationships', spreadId: 'crush-feelings' }
  }

  if (subjectCode === 'relationship' && toneCode === 'emotion') {
    return { themeId: 'love-relationships', spreadId: 'relationship-check-in' }
  }

  if (subjectCode === 'relationship') {
    return { themeId: 'love-relationships', spreadId: 'relationship-check-in' }
  }

  if (subjectCode === 'other_person') {
    return { themeId: 'love-relationships', spreadId: 'crush-feelings' }
  }

  if (inferIntentFromQuestion(question) === 'flow') {
    return { themeId: 'general-insight', spreadId: 'past-present-future' }
  }

  return { themeId: 'general-insight', spreadId: 'quick-reading' }
}

export function appendQuestionContextToPath(
  path: string,
  question: string,
  analysisKey?: string | null
): string {
  const url = new URL(path, 'https://tarot.local')
  url.searchParams.set('question', normalizeQuestion(question))
  if (analysisKey) {
    url.searchParams.set('analysisKey', analysisKey)
  }
  return `${url.pathname}${url.search}`
}

export function buildStableEntryPath(
  question: string,
  analysis?: TarotQuestionAnalysisSnapshot | null,
  analysisKey?: string | null
): string {
  const entry = resolveStableTarotEntry(question, analysis)
  return appendQuestionContextToPath(
    `/tarot/${entry.themeId}/${entry.spreadId}`,
    question,
    analysisKey
  )
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
