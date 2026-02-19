'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { calculateSajuData } from '@/lib/Saju/saju'
import { loadChartData, saveChartData } from '@/lib/cache/chartDataCache'
import type {
  Lang,
  ChartData,
  UserContext,
  CounselorInitResponse,
  CounselorContextResponse,
} from '@/types/api'
import { logger } from '@/lib/logger'
import { getPublicBackendUrl } from '@/lib/backend-url'

type SearchParams = Record<string, string | string[] | undefined>

export function useCounselorData(sp: SearchParams) {
  const { t, setLocale } = useI18n()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [prefetchStatus, setPrefetchStatus] = useState<{
    done: boolean
    timeMs?: number
    graphNodes?: number
    corpusQuotes?: number
  }>({ done: false })
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Premium: User context and chat session for returning users
  const [userContext, setUserContext] = useState<UserContext | undefined>(undefined)
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)

  // Parse search params
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? ''
  const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? ''
  const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? ''
  const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? ''
  const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? ''
  const theme = (Array.isArray(sp.theme) ? sp.theme[0] : sp.theme) ?? 'life'
  const langParam = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? 'ko'
  const lang: Lang = langParam === 'en' ? 'en' : 'ko'
  const initialQuestion = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? ''

  const latStr =
    (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
    (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude)
  const lonStr =
    (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
    (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude)

  const latitude = latStr ? Number(latStr) : NaN
  const longitude = lonStr ? Number(lonStr) : NaN

  // Theme selection state (can be changed by user)
  const [selectedTheme, setSelectedTheme] = useState(theme)

  // Available themes with labels
  const themeOptions = useMemo<Array<{ key: string; icon: string; label: string }>>(
    () => [
      { key: 'life', icon: '🌌', label: t('destinyMap.counselor.theme.life', '인생 전체') },
      { key: 'love', icon: '💞', label: t('destinyMap.counselor.theme.love', '연애') },
      { key: 'career', icon: '💼', label: t('destinyMap.counselor.theme.career', '직업') },
      { key: 'wealth', icon: '💰', label: t('destinyMap.counselor.theme.wealth', '재물') },
      { key: 'health', icon: '🩺', label: t('destinyMap.counselor.theme.health', '건강') },
      { key: 'family', icon: '🏠', label: t('destinyMap.counselor.theme.family', '가족') },
    ],
    [t]
  )

  const loadingMessages = useMemo(
    () => [
      t('destinyMap.counselor.loading1', 'Connecting with counselor...'),
      t('destinyMap.counselor.loading2', 'Analyzing your profile...'),
      t('destinyMap.counselor.loading3', 'Preparing data...'),
      t('destinyMap.counselor.loading4', 'Ready to start!'),
    ],
    [t]
  )

  // Set locale from URL parameter
  useEffect(() => {
    if (lang && (lang === 'en' || lang === 'ko')) {
      setLocale(lang)
    }
  }, [lang, setLocale])

  // Load pre-computed chart data from cache OR compute fresh
  useEffect(() => {
    if (!birthDate || !birthTime || isNaN(latitude) || isNaN(longitude)) {
      return
    }

    let saju: Record<string, unknown> | null = null
    let astro: Record<string, unknown> | null = null
    let advancedAstro: Record<string, unknown> | null = null

    // Try to load from cache with birth data validation
    const cached = loadChartData(birthDate, birthTime, latitude, longitude)
    if (cached) {
      logger.warn('[CounselorPage] Using cached chart data')
      saju = cached.saju ?? null
      astro = cached.astro ?? null
      advancedAstro = cached.advancedAstro ?? null
    }

    // If no cached saju data, compute fresh from birth info
    if (!saju || !saju.dayMaster) {
      try {
        logger.warn('[CounselorPage] Computing fresh saju data...')
        const genderVal = gender === 'Male' || gender === 'male' ? 'male' : 'female'
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
        const computed = calculateSajuData(birthDate, birthTime, genderVal, 'solar', userTz)
        saju = computed as unknown as Record<string, unknown>

        logger.warn('[CounselorPage] Fresh saju computed:', {
          dayMaster: computed.dayMaster?.name,
          yearPillar: computed.yearPillar?.heavenlyStem?.name,
        })
      } catch (e: unknown) {
        logger.warn('[CounselorPage] Failed to compute saju:', e)
      }
    }

    // Set initial chartData (may be updated later by async advanced astro fetch)
    setChartData({
      saju: saju || undefined,
      astro: astro || undefined,
      advancedAstro: advancedAstro || undefined,
    })

    // Always fetch advanced astro to ensure all fields are present
    // Check if cache has all required fields
    const hasAllFields =
      advancedAstro &&
      'fixedStars' in advancedAstro &&
      'eclipses' in advancedAstro &&
      'midpoints' in advancedAstro

    logger.warn('[CounselorPage] Cache check:', {
      hasAdvancedAstro: !!advancedAstro,
      hasFixedStars: advancedAstro ? 'fixedStars' in advancedAstro : false,
      hasEclipses: advancedAstro ? 'eclipses' in advancedAstro : false,
      hasMidpoints: advancedAstro ? 'midpoints' in advancedAstro : false,
      hasAllFields,
    })

    if (!hasAllFields) {
      logger.warn('[CounselorPage] Fetching advanced astrology data...', {
        reason: !advancedAstro ? 'no cache' : 'missing fields',
      })
      const fetchAdvancedAstro = async () => {
        try {
          const requestBody = {
            date: birthDate,
            time: birthTime,
            latitude,
            longitude,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
          }

          // Fetch ALL advanced astrology features in parallel
          // Note: electional and rectification APIs require additional params (eventType, events)
          // so they are not called here - transits are computed in chat-stream instead
          const advancedHeaders = {
            'Content-Type': 'application/json',
            'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          }
          const [
            asteroidsRes,
            draconicRes,
            harmonicsRes,
            solarReturnRes,
            lunarReturnRes,
            progressionsRes,
            fixedStarsRes,
            eclipsesRes,
            midpointsRes,
          ] = await Promise.all([
            fetch(`/api/astrology/advanced/asteroids`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            fetch(`/api/astrology/advanced/draconic`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            fetch(`/api/astrology/advanced/harmonics`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            // Solar Return (현재 연도)
            fetch(`/api/astrology/advanced/solar-return`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            // Lunar Return (현재 월)
            fetch(`/api/astrology/advanced/lunar-return`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            // Progressions (현재 날짜)
            fetch(`/api/astrology/advanced/progressions`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            // Fixed Stars (항성)
            fetch(`/api/astrology/advanced/fixed-stars`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            // Eclipses (이클립스)
            fetch(`/api/astrology/advanced/eclipses`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
            // Midpoints (미드포인트)
            fetch(`/api/astrology/advanced/midpoints`, {
              method: 'POST',
              headers: advancedHeaders,
              body: JSON.stringify(requestBody),
            }).catch(() => null),
          ])

          const advanced: Record<string, unknown> = {}

          if (asteroidsRes?.ok) {
            const data = await asteroidsRes.json()
            advanced.asteroids = data.asteroids
            advanced.extraPoints = data.extraPoints
          }

          if (draconicRes?.ok) {
            advanced.draconic = await draconicRes.json()
          }

          if (harmonicsRes?.ok) {
            advanced.harmonics = await harmonicsRes.json()
          }

          if (solarReturnRes?.ok) {
            advanced.solarReturn = await solarReturnRes.json()
          }

          if (lunarReturnRes?.ok) {
            advanced.lunarReturn = await lunarReturnRes.json()
          }

          if (progressionsRes?.ok) {
            advanced.progressions = await progressionsRes.json()
          }

          if (fixedStarsRes?.ok) {
            advanced.fixedStars = await fixedStarsRes.json()
          }

          if (eclipsesRes?.ok) {
            advanced.eclipses = await eclipsesRes.json()
          }

          if (midpointsRes?.ok) {
            advanced.midpoints = await midpointsRes.json()
          }

          logger.warn('[CounselorPage] ✅ Advanced astrology fetched:', Object.keys(advanced))

          // Update chartData with advanced astrology
          setChartData((prev) => ({
            ...prev,
            advancedAstro: advanced,
          }))

          // Save to cache
          saveChartData(birthDate, birthTime, latitude, longitude, {
            saju: saju || undefined,
            astro: astro || undefined,
            advancedAstro: advanced,
          })
        } catch (e) {
          logger.warn('[CounselorPage] Failed to fetch advanced astrology:', e)
        }
      }

      fetchAdvancedAstro()
    }

    // Prefetch RAG data in background
    // Always call prefetchRAG - backend will compute saju/astro from birth data if needed
    const prefetchRAG = async () => {
      try {
        const backendUrl = getPublicBackendUrl()
        const res = await fetch(`${backendUrl}/counselor/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            saju,
            astro,
            advancedAstro, // Include advanced astrology data
            theme: selectedTheme,
            // Always send birth data so backend can compute if saju/astro missing
            birth: {
              date: birthDate,
              time: birthTime,
              gender: gender === 'Male' || gender === 'male' ? 'male' : 'female',
              latitude,
              longitude,
            },
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as CounselorInitResponse
          if (data.status === 'success') {
            if (data.session_id) {
              setSessionId(data.session_id)
            }
            setPrefetchStatus({
              done: true,
              timeMs: data.prefetch_time_ms,
              graphNodes: data.data_summary?.graph_nodes,
              corpusQuotes: data.data_summary?.corpus_quotes,
            })
            logger.warn(`[Counselor] RAG prefetch done: ${data.prefetch_time_ms ?? 0}ms`)
          }
        }
      } catch (e: unknown) {
        logger.warn('[CounselorPage] RAG prefetch failed:', e)
        setPrefetchStatus({ done: true }) // Continue anyway
      }
    }
    prefetchRAG()
  }, [selectedTheme, birthDate, birthTime, gender, latitude, longitude])

  // Premium: Load user context (persona + recent sessions) for returning users
  useEffect(() => {
    const loadUserContext = async () => {
      try {
        // Build user context
        const context: UserContext = {}

        // Load personality type from localStorage (from personality quiz)
        try {
          const storedPersonality = localStorage.getItem('personaResult')
          if (storedPersonality) {
            const personalityData = JSON.parse(storedPersonality) as {
              typeCode?: string
              personaName?: string
            }
            if (personalityData.typeCode) {
              context.personalityType = {
                typeCode: personalityData.typeCode,
                personaName: personalityData.personaName || '',
              }
              logger.warn('[Counselor] Personality type loaded:', personalityData.typeCode)
            }
          }
        } catch {
          // Ignore localStorage errors
        }

        const res = await fetch(`/api/counselor/chat-history?theme=${selectedTheme}&limit=3`)
        if (res.ok) {
          const data = (await res.json()) as CounselorContextResponse
          if (data.success) {
            // Add persona memory if available
            if (data.persona) {
              context.persona = {
                sessionCount: data.persona.sessionCount,
                lastTopics: data.persona.lastTopics,
                emotionalTone: data.persona.emotionalTone,
                recurringIssues: data.persona.recurringIssues,
              }
            }

            // Add recent session summaries
            const sessions = Array.isArray(data.sessions) ? data.sessions : []
            if (sessions.length > 0) {
              context.recentSessions = sessions.map((s) => ({
                id: s.id,
                summary: s.summary,
                keyTopics: s.keyTopics,
                lastMessageAt: s.lastMessageAt,
              }))

              // If continuing the same theme, use the most recent session
              const recentThemeSession = sessions.find((s) => s.theme === selectedTheme)
              if (recentThemeSession) {
                setChatSessionId(recentThemeSession.id)
              }
            }

            setUserContext(context)
            logger.warn('[Counselor] User context loaded:', {
              isReturningUser: data.isReturningUser,
              sessionCount: context.persona?.sessionCount,
              recentSessions: context.recentSessions?.length || 0,
            })
          }
        }
      } catch {
        // Not logged in or error - continue without user context
        logger.warn('[Counselor] No user context available (guest user)')
      }
    }

    loadUserContext()
  }, [selectedTheme])

  // Premium: Save message callback
  const handleSaveMessage = useCallback(
    async (userMessage: string, assistantMessage: string) => {
      try {
        const res = await fetch('/api/counselor/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: chatSessionId, // Will create new if undefined
            theme: selectedTheme,
            locale: lang,
            userMessage,
            assistantMessage,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && !chatSessionId) {
            // Set session ID for subsequent messages
            setChatSessionId(data.session.id)
            logger.warn('[Counselor] New chat session created:', data.session.id)
          }
        }
      } catch (e: unknown) {
        logger.warn('[Counselor] Failed to save message:', e)
      }
    },
    [chatSessionId, selectedTheme, lang]
  )

  // Loading animation
  useEffect(() => {
    if (!birthDate || !birthTime || isNaN(latitude) || isNaN(longitude)) {
      router.push('/destiny-map')
      return
    }

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 800)

    // Wait for either: 3.2s OR prefetch complete (whichever is later, min 2s)
    const minLoadTime = 2000
    const startTime = Date.now()

    const checkReady = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed >= minLoadTime && (prefetchStatus.done || elapsed >= 5000)) {
        setIsLoading(false)
        setTimeout(() => setShowChat(true), 300)
        clearInterval(checkReady)
      }
    }, 100)

    return () => {
      clearInterval(stepInterval)
      clearInterval(checkReady)
    }
  }, [
    birthDate,
    birthTime,
    latitude,
    longitude,
    router,
    loadingMessages.length,
    prefetchStatus.done,
  ])

  const parsedParams = {
    name,
    birthDate,
    birthTime,
    city,
    gender,
    theme: selectedTheme,
    lang,
    initialQuestion,
    latitude,
    longitude,
    selectedTheme,
    setSelectedTheme,
    themeOptions,
  }

  return {
    chartData,
    prefetchStatus,
    sessionId,
    userContext,
    chatSessionId,
    handleSaveMessage,
    isLoading,
    showChat,
    loadingStep,
    loadingMessages,
    parsedParams,
  }
}
