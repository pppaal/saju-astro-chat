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

  // Debounced preview logic
  useEffect(() => {
    if (gptDebounceRef.current) {
      clearTimeout(gptDebounceRef.current)
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
      setIsLoadingPreview(true)

      // Quick keyword-based recommendation as fallback
      const fallbackResult = getQuickRecommendation(trimmed, isKo)

      // If keyword match succeeded, show immediately
      if (fallbackResult.isKeywordMatch) {
        setPreviewInfo({
          cardCount: fallbackResult.cardCount,
          spreadTitle: fallbackResult.spreadTitle,
          path: fallbackResult.path,
        })
        setIsLoadingPreview(false)
        return
      }

      // GPT analysis with debounce
      gptDebounceRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/tarot/analyze-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: trimmed, language }),
          })

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
              })
              setAiExplanation(data.userFriendlyExplanation)
            }
          } else {
            // API failure - use keyword fallback
            setPreviewInfo({
              cardCount: fallbackResult.cardCount,
              spreadTitle: fallbackResult.spreadTitle,
              path: fallbackResult.path,
            })
          }
        } catch (error) {
          tarotLogger.error(
            'GPT analysis failed:',
            error instanceof Error ? error : new Error(String(error))
          )
          // Failure - use keyword fallback
          setPreviewInfo({
            cardCount: fallbackResult.cardCount,
            spreadTitle: fallbackResult.spreadTitle,
            path: fallbackResult.path,
          })
        } finally {
          setIsLoadingPreview(false)
        }
      }, 400) // 400ms debounce
    } else {
      setPreviewInfo(null)
      setDangerWarning(null)
      setAiExplanation(null)
      setIsLoadingPreview(false)
    }

    return () => {
      if (gptDebounceRef.current) {
        clearTimeout(gptDebounceRef.current)
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
    if (!question.trim() || dangerWarning || isLoadingPreview) return

    // If preview already has path, use it directly
    if (previewInfo?.path) {
      router.push(previewInfo.path)
      return
    }

    // Otherwise, run AI analysis
    setIsAnalyzing(true)

    try {
      const aiResult = await analyzeWithAI(question)

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
        const result = getQuickRecommendation(question, isKo)
        router.push(result.path)
      }
    } catch {
      // Error - use keyword fallback
      const result = getQuickRecommendation(question, isKo)
      router.push(result.path)
    } finally {
      setIsAnalyzing(false)
    }
  }, [
    question,
    dangerWarning,
    isLoadingPreview,
    previewInfo,
    router,
    analyzeWithAI,
    getQuickRecommendation,
    isKo,
  ])

  return {
    previewInfo,
    dangerWarning,
    isAnalyzing,
    aiExplanation,
    isLoadingPreview,
    handleStartReading,
  }
}
