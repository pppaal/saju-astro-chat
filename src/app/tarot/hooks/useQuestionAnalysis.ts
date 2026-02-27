import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkDangerousQuestion } from '@/lib/Tarot/tarot-recommend'
import { tarotLogger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import {
  type AnalyzeFallbackReason,
  classifyAnalyzeFallbackReason,
  getAnalyzeFallbackNotice,
  isAnalyzeFallbackReason,
} from '../utils/errorHandling'

export interface AIAnalysisResult {
  isDangerous?: boolean
  message?: string
  themeId: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  userFriendlyExplanation: string
  path: string
  source?: 'pattern' | 'llm' | 'fallback'
  fallback_reason?: AnalyzeFallbackReason | null
}

interface PreviewInfo {
  cardCount: number
  spreadTitle: string
  path?: string
  source: 'quick' | 'ai'
}

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

/**
 * Hook to handle question analysis with debounced preview and AI analysis
 */
export function useQuestionAnalysis({
  question,
  language,
  isKo,
  getQuickRecommendation,
}: UseQuestionAnalysisProps) {
  const router = useRouter()
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null)
  const [dangerWarning, setDangerWarning] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<AnalyzeFallbackReason | null>(null)
  const gptDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const previewRequestIdRef = useRef(0)
  const previewAbortRef = useRef<AbortController | null>(null)
  const fallbackNotice = fallbackReason ? getAnalyzeFallbackNotice(fallbackReason, isKo) : null

  // Debounced preview logic
  useEffect(() => {
    if (gptDebounceRef.current) {
      clearTimeout(gptDebounceRef.current)
    }
    if (previewAbortRef.current) {
      previewAbortRef.current.abort()
      previewAbortRef.current = null
    }

    const trimmed = question.trim()

    if (trimmed.length > 3) {
      // Check for dangerous questions first
      const dangerCheck = checkDangerousQuestion(trimmed)
      if (dangerCheck.isDangerous) {
        setDangerWarning(dangerCheck.message || '')
        setPreviewInfo(null)
        setIsLoadingPreview(false)
        setFallbackReason(null)
        return
      }

      setDangerWarning(null)
      setAiExplanation(null)
      setFallbackReason(null)

      // Quick keyword-based recommendation as fallback
      const fallbackResult = getQuickRecommendation(trimmed, isKo)
      const shouldShowLoading = !fallbackResult.isKeywordMatch

      // If keyword match succeeded, show immediately
      if (fallbackResult.isKeywordMatch) {
        setPreviewInfo({
          cardCount: fallbackResult.cardCount,
          spreadTitle: fallbackResult.spreadTitle,
          path: fallbackResult.path,
          source: 'quick',
        })
        setIsLoadingPreview(false)
      } else {
        setPreviewInfo(null)
        setIsLoadingPreview(true)
      }

      // GPT analysis with debounce
      const requestId = ++previewRequestIdRef.current
      gptDebounceRef.current = setTimeout(async () => {
        const abortController = new AbortController()
        previewAbortRef.current = abortController

        try {
          const response = await apiFetch('/api/tarot/analyze-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: trimmed, language }),
            signal: abortController.signal,
          })

          if (requestId !== previewRequestIdRef.current) {
            return
          }

          if (response.ok) {
            let data: AIAnalysisResult
            try {
              data = await response.json()
            } catch (parseError) {
              const reason: AnalyzeFallbackReason = 'parse_failed'
              setFallbackReason(reason)
              tarotLogger.warn(
                '[tarot/analyze-question] Preview parse failed, using quick fallback',
                {
                  reason,
                  question: trimmed,
                  parseError: parseError instanceof Error ? parseError.message : String(parseError),
                }
              )
              if (!fallbackResult.isKeywordMatch) {
                setPreviewInfo({
                  cardCount: fallbackResult.cardCount,
                  spreadTitle: fallbackResult.spreadTitle,
                  path: fallbackResult.path,
                  source: 'quick',
                })
              }
              return
            }
            const responseFallbackReason =
              data.source === 'fallback' && isAnalyzeFallbackReason(data.fallback_reason)
                ? data.fallback_reason
                : null
            setFallbackReason(responseFallbackReason)
            if (responseFallbackReason) {
              tarotLogger.warn(
                '[tarot/analyze-question] Preview returned fallback result from server',
                {
                  reason: responseFallbackReason,
                  question: trimmed,
                }
              )
            }
            if (data.isDangerous) {
              setDangerWarning(data.message || '')
              setPreviewInfo(null)
            } else {
              setPreviewInfo({
                cardCount: data.cardCount,
                spreadTitle: data.spreadTitle,
                path: data.path,
                source: 'ai',
              })
              setAiExplanation(data.userFriendlyExplanation)
            }
          } else {
            const reason = classifyAnalyzeFallbackReason(response.status)
            setFallbackReason(reason)
            tarotLogger.warn('[tarot/analyze-question] Preview failed, using quick fallback', {
              reason,
              status: response.status,
              question: trimmed,
            })
            // API failure - use keyword fallback
            if (!fallbackResult.isKeywordMatch) {
              setPreviewInfo({
                cardCount: fallbackResult.cardCount,
                spreadTitle: fallbackResult.spreadTitle,
                path: fallbackResult.path,
                source: 'quick',
              })
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }
          if (requestId !== previewRequestIdRef.current) {
            return
          }
          tarotLogger.error(
            'GPT analysis failed:',
            error instanceof Error ? error : new Error(String(error))
          )
          setFallbackReason('network_error')
          // Failure - use keyword fallback only if quick preview wasn't already shown
          if (!fallbackResult.isKeywordMatch) {
            setPreviewInfo({
              cardCount: fallbackResult.cardCount,
              spreadTitle: fallbackResult.spreadTitle,
              path: fallbackResult.path,
              source: 'quick',
            })
          }
        } finally {
          if (requestId === previewRequestIdRef.current && shouldShowLoading) {
            setIsLoadingPreview(false)
          }
          if (previewAbortRef.current === abortController) {
            previewAbortRef.current = null
          }
        }
      }, 400) // 400ms debounce
    } else {
      previewRequestIdRef.current += 1
      setPreviewInfo(null)
      setDangerWarning(null)
      setAiExplanation(null)
      setIsLoadingPreview(false)
      setFallbackReason(null)
    }

    return () => {
      if (gptDebounceRef.current) {
        clearTimeout(gptDebounceRef.current)
      }
      if (previewAbortRef.current) {
        previewAbortRef.current.abort()
        previewAbortRef.current = null
      }
    }
  }, [question, isKo, language, getQuickRecommendation])

  // AI analysis for start reading
  const analyzeWithAI = useCallback(
    async (
      q: string
    ): Promise<{
      result: AIAnalysisResult | null
      fallbackReason: AnalyzeFallbackReason | null
      status?: number
    }> => {
      try {
        const response = await apiFetch('/api/tarot/analyze-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, language }),
        })

        if (!response.ok) {
          const reason = classifyAnalyzeFallbackReason(response.status)
          tarotLogger.warn('[tarot/analyze-question] Start reading failed, using quick fallback', {
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
          tarotLogger.warn('[tarot/analyze-question] Start reading parse failed', {
            reason,
            question: q,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          })
          return { result: null, fallbackReason: reason, status: response.status }
        }
      } catch (error) {
        tarotLogger.error(
          'AI analysis failed:',
          error instanceof Error ? error : new Error(String(error))
        )
        return { result: null, fallbackReason: 'network_error' }
      }
    },
    [language]
  )

  // Start reading handler
  const handleStartReading = useCallback(async () => {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || dangerWarning) return

    // AI-verified preview can be used directly.
    if (previewInfo?.path && previewInfo.source === 'ai') {
      setFallbackReason(null)
      router.push(previewInfo.path)
      return
    }

    // Otherwise, run AI analysis
    setIsAnalyzing(true)

    try {
      const analysisResult = await analyzeWithAI(trimmedQuestion)
      const aiResult = analysisResult.result

      if (aiResult?.isDangerous) {
        setDangerWarning(aiResult.message || '')
        setIsAnalyzing(false)
        return
      }

      if (aiResult) {
        setFallbackReason(analysisResult.fallbackReason)
        setAiExplanation(aiResult.userFriendlyExplanation)
        setTimeout(() => {
          router.push(aiResult.path)
        }, 500)
      } else {
        if (analysisResult.fallbackReason) {
          setFallbackReason(analysisResult.fallbackReason)
        }
        // AI failed - use keyword fallback
        const result = getQuickRecommendation(trimmedQuestion, isKo)
        router.push(result.path)
      }
    } catch {
      setFallbackReason('network_error')
      // Error - use keyword fallback
      const result = getQuickRecommendation(trimmedQuestion, isKo)
      router.push(result.path)
    } finally {
      setIsAnalyzing(false)
    }
  }, [question, dangerWarning, previewInfo, router, analyzeWithAI, getQuickRecommendation, isKo])

  return {
    previewInfo,
    dangerWarning,
    isAnalyzing,
    aiExplanation,
    isLoadingPreview,
    fallbackReason,
    fallbackNotice,
    handleStartReading,
  }
}
