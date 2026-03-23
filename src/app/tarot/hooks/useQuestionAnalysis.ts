import { useState, useEffect, useCallback, useRef } from 'react'
import { checkDangerousQuestion } from '@/lib/Tarot/tarot-recommend'
import type { TarotQuestionAnalysisResult } from '@/lib/Tarot/questionFlow'
import { tarotLogger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import {
  type AnalyzeFallbackReason,
  classifyAnalyzeFallbackReason,
  getAnalyzeFallbackNotice,
  isAnalyzeFallbackReason,
} from '../utils/errorHandling'

export type AIAnalysisResult = TarotQuestionAnalysisResult

interface UseQuestionAnalysisProps {
  question: string
  language: string
  isKo: boolean
  getQuickRecommendation: (
    question: string,
    isKo: boolean
  ) => {
    path: string
    cardCount: number
    spreadTitle: string
    isKeywordMatch: boolean
  }
}

const PREVIEW_ANALYZE_TIMEOUT_MS = 6500
const START_ANALYZE_TIMEOUT_MS = 9000
const QUESTION_ENGINE_ENDPOINT = '/api/tarot/question-engine-v2'

function createTimeoutController(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController()
  let timedOut = false
  let isCleaned = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const onExternalAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  timeoutId = setTimeout(() => {
    timedOut = true
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }, timeoutMs)

  const cleanup = () => {
    if (isCleaned) return
    isCleaned = true
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }

  return {
    signal: controller.signal,
    cleanup,
    didTimeout: () => timedOut,
  }
}

export function useQuestionAnalysis({
  question,
  language,
  isKo,
  getQuickRecommendation,
}: UseQuestionAnalysisProps) {
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [dangerWarning, setDangerWarning] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<AnalyzeFallbackReason | null>(null)
  const gptDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const previewRequestIdRef = useRef(0)
  const previewAbortRef = useRef<AbortController | null>(null)
  const startAnalyzeAbortRef = useRef<AbortController | null>(null)
  const fallbackNotice = fallbackReason ? getAnalyzeFallbackNotice(fallbackReason, isKo) : null

  useEffect(() => {
    return () => {
      if (startAnalyzeAbortRef.current) {
        startAnalyzeAbortRef.current.abort()
        startAnalyzeAbortRef.current = null
      }
    }
  }, [])

  const buildQuestionPath = useCallback((path: string, q: string) => {
    const url = new URL(path, 'https://tarot.local')
    url.searchParams.set('question', q)
    return `${url.pathname}${url.search}`
  }, [])

  const parseQuickPath = useCallback((path: string) => {
    const [pathname] = path.split('?')
    const segments = pathname.split('/').filter(Boolean)
    return {
      themeId: segments[1] || 'general-insight',
      spreadId: segments[2] || 'quick-reading',
    }
  }, [])

  const buildLocalFallbackAnalysis = useCallback(
    (trimmedQuestion: string, _reason: AnalyzeFallbackReason | null = null): AIAnalysisResult => {
      const quickResult = getQuickRecommendation(trimmedQuestion, isKo)
      const { themeId, spreadId } = parseQuickPath(quickResult.path)
      const resolvedPath = buildQuestionPath(quickResult.path, trimmedQuestion)
      const themeTitle = isKo ? '종합 리딩' : 'General reading'

      return {
        themeId,
        spreadId,
        spreadTitle: quickResult.spreadTitle,
        cardCount: quickResult.cardCount,
        userFriendlyExplanation: isKo
          ? '질문의 핵심 의도를 먼저 고정하고, 그에 맞는 스프레드로 바로 연결합니다.'
          : 'The core intent is fixed first, then routed directly to the closest spread.',
        question_summary: isKo
          ? '질문을 가장 가까운 의도와 스프레드로 바로 정렬했습니다.'
          : 'The question was aligned directly to the nearest intent and spread.',
        question_profile: {
          type: {
            code: 'unknown',
            label: isKo ? '전체 흐름을 살피는 질문' : 'A question about the overall flow',
          },
          subject: {
            code: 'overall_flow',
            label: isKo ? '전체 흐름을 보는 질문' : 'The subject is the overall flow',
          },
          focus: {
            code: 'unknown',
            label: isKo ? '현재 국면과 전체 흐름' : 'Current phase and overall flow',
          },
          timeframe: {
            code: 'open',
            label: isKo ? '시간축이 열려 있음' : 'Open-ended timeframe',
          },
          tone: {
            code: 'flow',
            label: isKo ? '흐름 해석 중심' : 'Flow-focused',
          },
        },
        direct_answer: isKo
          ? '지금 질문은 가장 가까운 해석 경로로 바로 연결해도 충분합니다.'
          : 'This question is stable enough to route directly through the closest reading path.',
        intent_label: isKo ? '기본 질문 해석' : 'Default question analysis',
        recommended_spreads: [
          {
            themeId,
            themeTitle,
            spreadId,
            spreadTitle: quickResult.spreadTitle,
            cardCount: quickResult.cardCount,
            reason: isKo
              ? '질문 의도와 가장 가까운 기본 진입으로 연결합니다.'
              : 'Route through the nearest stable entry for this question.',
            matchScore: null,
            path: resolvedPath,
            recommended: true,
          },
        ],
        path: resolvedPath,
        source: 'heuristic',
        fallback_reason: null,
      }
    },
    [buildQuestionPath, getQuickRecommendation, isKo, parseQuickPath]
  )

  const analyzeWithAI = useCallback(
    async (
      q: string,
      options?: { timeoutMs?: number; signal?: AbortSignal }
    ): Promise<{
      result: AIAnalysisResult | null
      fallbackReason: AnalyzeFallbackReason | null
      status?: number
    }> => {
      const timeoutControl = createTimeoutController(
        options?.timeoutMs ?? START_ANALYZE_TIMEOUT_MS,
        options?.signal
      )

      try {
        const response = await apiFetch(QUESTION_ENGINE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, language }),
          signal: timeoutControl.signal,
        })

        if (!response.ok) {
          const reason = classifyAnalyzeFallbackReason(response.status)
          tarotLogger.warn('[tarot/question-engine-v2] Analysis failed, using fallback', {
            reason,
            status: response.status,
            question: q,
          })
          return {
            result: buildLocalFallbackAnalysis(q, reason),
            fallbackReason: null,
            status: response.status,
          }
        }

        try {
          const parsed = (await response.json()) as AIAnalysisResult
          const parsedFallbackReason = isAnalyzeFallbackReason(parsed.fallback_reason)
            ? parsed.fallback_reason
            : null
          const normalized =
            parsed.source === 'fallback'
              ? buildLocalFallbackAnalysis(q, parsedFallbackReason)
              : parsed

          return { result: normalized, fallbackReason: null, status: response.status }
        } catch (parseError) {
          const reason: AnalyzeFallbackReason = 'parse_failed'
          tarotLogger.warn('[tarot/question-engine-v2] Analysis parse failed', {
            reason,
            question: q,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          })
          return {
            result: buildLocalFallbackAnalysis(q, reason),
            fallbackReason: null,
            status: response.status,
          }
        }
      } catch (error) {
        const isAbortError = error instanceof Error && error.name === 'AbortError'
        const isTimeout = timeoutControl.didTimeout()
        if (isAbortError && !isTimeout) {
          return { result: null, fallbackReason: null }
        }

        tarotLogger.error(
          '[tarot/question-engine-v2] Analysis request failed',
          error instanceof Error ? error : new Error(String(error))
        )

        const reason: AnalyzeFallbackReason = isTimeout ? 'server_error' : 'network_error'
        return { result: buildLocalFallbackAnalysis(q, reason), fallbackReason: null }
      } finally {
        timeoutControl.cleanup()
      }
    },
    [buildLocalFallbackAnalysis, language]
  )

  useEffect(() => {
    if (gptDebounceRef.current) {
      clearTimeout(gptDebounceRef.current)
    }
    if (previewAbortRef.current) {
      previewAbortRef.current.abort()
      previewAbortRef.current = null
    }

    const trimmed = question.trim()

    if (trimmed.length <= 3) {
      previewRequestIdRef.current += 1
      setAnalysisResult(null)
      setDangerWarning(null)
      setIsLoadingPreview(false)
      setFallbackReason(null)
      return
    }

    const dangerCheck = checkDangerousQuestion(trimmed)
    if (dangerCheck.isDangerous) {
      setDangerWarning(dangerCheck.message || '')
      setAnalysisResult(null)
      setIsLoadingPreview(false)
      setFallbackReason(null)
      return
    }

    setDangerWarning(null)
    setAnalysisResult(null)
    setFallbackReason(null)
    setIsLoadingPreview(true)

    const requestId = ++previewRequestIdRef.current

    gptDebounceRef.current = setTimeout(async () => {
      const abortController = new AbortController()
      const timeoutControl = createTimeoutController(
        PREVIEW_ANALYZE_TIMEOUT_MS,
        abortController.signal
      )
      previewAbortRef.current = abortController

      try {
        const response = await analyzeWithAI(trimmed, {
          timeoutMs: PREVIEW_ANALYZE_TIMEOUT_MS,
          signal: abortController.signal,
        })

        if (requestId !== previewRequestIdRef.current) {
          return
        }

        if (response.result?.isDangerous) {
          setDangerWarning(response.result.message || '')
          setAnalysisResult(null)
          return
        }

        if (response.result) {
          setFallbackReason(response.fallbackReason)
          setAnalysisResult(response.result)
          return
        }

        setFallbackReason(null)
        setAnalysisResult(response.result || buildLocalFallbackAnalysis(trimmed, null))
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) {
          return
        }

        tarotLogger.error(
          '[tarot/question-engine-v2] Preview request failed',
          error instanceof Error ? error : new Error(String(error))
        )
        setFallbackReason(null)
        setAnalysisResult(buildLocalFallbackAnalysis(trimmed, null))
      } finally {
        timeoutControl.cleanup()
        if (requestId === previewRequestIdRef.current) {
          setIsLoadingPreview(false)
        }
        if (previewAbortRef.current === abortController) {
          previewAbortRef.current = null
        }
      }
    }, 400)

    return () => {
      if (gptDebounceRef.current) {
        clearTimeout(gptDebounceRef.current)
      }
      if (previewAbortRef.current) {
        previewAbortRef.current.abort()
        previewAbortRef.current = null
      }
    }
  }, [question, analyzeWithAI, buildLocalFallbackAnalysis])

  const handleStartReading = useCallback(async () => {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || dangerWarning) {
      return
    }

    if (
      analysisResult &&
      !isLoadingPreview &&
      analysisResult.path.includes(encodeURIComponent(trimmedQuestion)) &&
      !fallbackReason
    ) {
      return
    }

    setIsAnalyzing(true)
    if (startAnalyzeAbortRef.current) {
      startAnalyzeAbortRef.current.abort()
    }

    const startAbortController = new AbortController()
    startAnalyzeAbortRef.current = startAbortController

    try {
      const response = await analyzeWithAI(trimmedQuestion, {
        timeoutMs: START_ANALYZE_TIMEOUT_MS,
        signal: startAbortController.signal,
      })

      if (startAnalyzeAbortRef.current !== startAbortController) {
        return
      }

      if (response.result?.isDangerous) {
        setDangerWarning(response.result.message || '')
        setAnalysisResult(null)
        return
      }

      if (response.result) {
        setFallbackReason(response.fallbackReason)
        setAnalysisResult(response.result)
        return
      }

      setFallbackReason(null)
      setAnalysisResult(response.result || buildLocalFallbackAnalysis(trimmedQuestion, null))
    } catch {
      setFallbackReason(null)
      setAnalysisResult(buildLocalFallbackAnalysis(trimmedQuestion, null))
    } finally {
      if (startAnalyzeAbortRef.current === startAbortController) {
        startAnalyzeAbortRef.current = null
      }
      setIsAnalyzing(false)
    }
  }, [
    question,
    dangerWarning,
    analysisResult,
    isLoadingPreview,
    fallbackReason,
    analyzeWithAI,
    buildLocalFallbackAnalysis,
  ])

  return {
    analysisResult,
    dangerWarning,
    isAnalyzing,
    isLoadingPreview,
    fallbackReason,
    fallbackNotice,
    handleStartReading,
  }
}
