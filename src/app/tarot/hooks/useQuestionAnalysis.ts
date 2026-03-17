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

const PREVIEW_ANALYZE_TIMEOUT_MS = 3500
const START_ANALYZE_TIMEOUT_MS = 5000
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
    (trimmedQuestion: string, reason: AnalyzeFallbackReason | null = null): AIAnalysisResult => {
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
          ? '질문의 핵심을 먼저 읽고, 그다음에 맞는 스프레드를 고르는 흐름이 더 안정적입니다.'
          : 'It is more stable to read the core of the question first and choose the spread after that.',
        question_summary: isKo
          ? '분석이 불안정해서 가장 가까운 기본 스프레드를 먼저 제안합니다.'
          : 'Analysis was unstable, so a nearby default spread is suggested first.',
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
          ? '지금은 세부 예측보다 질문의 큰 흐름을 먼저 읽는 편이 더 안정적입니다.'
          : 'Right now it is more stable to read the overall flow of the question before going into specifics.',
        intent_label: isKo ? '기본 질문 해석' : 'Default question analysis',
        recommended_spreads: [
          {
            themeId,
            themeTitle,
            spreadId,
            spreadTitle: quickResult.spreadTitle,
            cardCount: quickResult.cardCount,
            reason: isKo
              ? '우선 질문의 큰 흐름을 확인하는 쪽이 안전합니다.'
              : 'It is safer to confirm the broader flow of the question first.',
            matchScore: null,
            path: resolvedPath,
            recommended: true,
          },
        ],
        path: resolvedPath,
        source: 'fallback',
        fallback_reason: reason,
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
          return { result: null, fallbackReason: reason, status: response.status }
        }

        try {
          const parsed = (await response.json()) as AIAnalysisResult
          const responseFallbackReason =
            parsed.source === 'fallback' && isAnalyzeFallbackReason(parsed.fallback_reason)
              ? parsed.fallback_reason
              : null

          return { result: parsed, fallbackReason: responseFallbackReason, status: response.status }
        } catch (parseError) {
          const reason: AnalyzeFallbackReason = 'parse_failed'
          tarotLogger.warn('[tarot/question-engine-v2] Analysis parse failed', {
            reason,
            question: q,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          })
          return { result: null, fallbackReason: reason, status: response.status }
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

        return { result: null, fallbackReason: isTimeout ? 'server_error' : 'network_error' }
      } finally {
        timeoutControl.cleanup()
      }
    },
    [language]
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
      const timeoutControl = createTimeoutController(PREVIEW_ANALYZE_TIMEOUT_MS, abortController.signal)
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

        if (response.fallbackReason) {
          setFallbackReason(response.fallbackReason)
        }
        setAnalysisResult(buildLocalFallbackAnalysis(trimmed, response.fallbackReason))
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) {
          return
        }

        tarotLogger.error(
          '[tarot/question-engine-v2] Preview request failed',
          error instanceof Error ? error : new Error(String(error))
        )
        const reason: AnalyzeFallbackReason = 'network_error'
        setFallbackReason(reason)
        setAnalysisResult(buildLocalFallbackAnalysis(trimmed, reason))
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

      if (response.fallbackReason) {
        setFallbackReason(response.fallbackReason)
      }
      setAnalysisResult(buildLocalFallbackAnalysis(trimmedQuestion, response.fallbackReason))
    } catch {
      const reason: AnalyzeFallbackReason = 'network_error'
      setFallbackReason(reason)
      setAnalysisResult(buildLocalFallbackAnalysis(trimmedQuestion, reason))
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
