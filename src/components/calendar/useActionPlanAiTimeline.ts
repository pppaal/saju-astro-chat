import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import {
  getActionPlanAiFallbackSummary,
  type ActionPlanCacheEntry,
  type ActionPlanInsights,
  type ActionPlanPrecisionMode,
  type AiTimelineSlot,
} from './CalendarActionPlanAI'
import {
  parseActionPlanAiResponse,
  type ActionPlanAiPayload,
} from './CalendarActionPlanRequest'

type CleanText = (value: string | undefined, fallback?: string) => string

export function useActionPlanAiTimeline(input: {
  enabled: boolean
  hasBaseInfo: boolean
  aiCacheKey: string
  aiPayload: ActionPlanAiPayload
  cleanText: CleanText
  clampConfidence: (value: number) => number
  isKo: boolean
  isSanitizedSlotType: (value: string) => boolean
}) {
  const {
    enabled,
    hasBaseInfo,
    aiCacheKey,
    aiPayload,
    cleanText,
    clampConfidence,
    isKo,
    isSanitizedSlotType,
  } = input
  const [aiTimeline, setAiTimeline] = useState<AiTimelineSlot[] | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiInsights, setAiInsights] = useState<ActionPlanInsights | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [aiPrecisionMode, setAiPrecisionMode] = useState<ActionPlanPrecisionMode>(null)
  const aiCacheRef = useRef<Record<string, ActionPlanCacheEntry>>({})
  const aiAbortRef = useRef<AbortController | null>(null)

  const fetchAiTimeline = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled || !hasBaseInfo) return

      if (!options?.force && aiCacheRef.current[aiCacheKey]) {
        const cached = aiCacheRef.current[aiCacheKey]
        setAiTimeline(cached.timeline)
        setAiSummary(cached.summary)
        setAiInsights(cached.insights)
        setAiPrecisionMode(cached.precisionMode)
        setAiStatus('ready')
        return
      }

      if (aiAbortRef.current) {
        aiAbortRef.current.abort()
      }
      const controller = new AbortController()
      aiAbortRef.current = controller

      setAiStatus('loading')
      setAiPrecisionMode(null)
      setAiInsights(null)

      try {
        const response = await apiFetch('/api/calendar/action-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiPayload),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const json = await response.json()
        const { timeline, summary, insights, precisionMode } = parseActionPlanAiResponse({
          json,
          cleanText,
          clampConfidence,
          isSanitizedSlotType,
        })

        aiCacheRef.current[aiCacheKey] = {
          timeline,
          summary,
          precisionMode,
          insights,
        }
        setAiTimeline(timeline)
        setAiSummary(summary)
        setAiInsights(insights)
        setAiPrecisionMode(precisionMode)
        setAiStatus('ready')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        logger.warn('[ActionPlan] AI timeline failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        setAiTimeline(null)
        setAiSummary(getActionPlanAiFallbackSummary(isKo))
        setAiInsights(null)
        setAiPrecisionMode('rule-fallback')
        setAiStatus('ready')
      }
    },
    [aiCacheKey, aiPayload, clampConfidence, cleanText, enabled, hasBaseInfo, isKo, isSanitizedSlotType]
  )

  useEffect(() => {
    if (!enabled) return
    if (!hasBaseInfo) {
      setAiTimeline(null)
      setAiSummary(null)
      setAiInsights(null)
      setAiStatus('idle')
      setAiPrecisionMode(null)
      return
    }
    void fetchAiTimeline()
    return () => {
      if (aiAbortRef.current) {
        aiAbortRef.current.abort()
      }
    }
  }, [enabled, fetchAiTimeline, hasBaseInfo])

  const refreshAiTimeline = useCallback(() => {
    if (!hasBaseInfo) return
    if (aiCacheRef.current[aiCacheKey]) {
      delete aiCacheRef.current[aiCacheKey]
    }
    void fetchAiTimeline({ force: true })
  }, [aiCacheKey, fetchAiTimeline, hasBaseInfo])

  return {
    aiTimeline,
    aiSummary,
    aiInsights,
    aiStatus,
    aiPrecisionMode,
    refreshAiTimeline,
  }
}
