import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkDangerousQuestion } from '@/lib/Tarot/tarot-recommend'
import { tarotLogger } from '@/lib/logger'

export interface AIAnalysisResult {
  isDangerous?: boolean
  message?: string
  themeId: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  userFriendlyExplanation: string
  path: string
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
  const gptDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const previewRequestIdRef = useRef(0)
  const previewAbortRef = useRef<AbortController | null>(null)

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
        return
      }

      setDangerWarning(null)
      setAiExplanation(null)

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
          const response = await fetch('/api/tarot/analyze-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: trimmed, language }),
            signal: abortController.signal,
          })

          if (requestId !== previewRequestIdRef.current) {
            return
          }

          if (response.ok) {
            const data = await response.json()
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
          } else if (!fallbackResult.isKeywordMatch) {
            // API failure - use keyword fallback
            setPreviewInfo({
              cardCount: fallbackResult.cardCount,
              spreadTitle: fallbackResult.spreadTitle,
              path: fallbackResult.path,
              source: 'quick',
            })
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
    async (q: string): Promise<AIAnalysisResult | null> => {
      try {
        const response = await fetch('/api/tarot/analyze-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, language }),
        })

        if (!response.ok) return null

        return await response.json()
      } catch (error) {
        tarotLogger.error(
          'AI analysis failed:',
          error instanceof Error ? error : new Error(String(error))
        )
        return null
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
      router.push(previewInfo.path)
      return
    }

    // Otherwise, run AI analysis
    setIsAnalyzing(true)

    try {
      const aiResult = await analyzeWithAI(trimmedQuestion)

      if (aiResult?.isDangerous) {
        setDangerWarning(aiResult.message || '')
        setIsAnalyzing(false)
        return
      }

      if (aiResult) {
        setAiExplanation(aiResult.userFriendlyExplanation)
        setTimeout(() => {
          router.push(aiResult.path)
        }, 500)
      } else {
        // AI failed - use keyword fallback
        const result = getQuickRecommendation(trimmedQuestion, isKo)
        router.push(result.path)
      }
    } catch {
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
    handleStartReading,
  }
}
