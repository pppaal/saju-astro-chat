'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { calculateSajuData } from '@/lib/saju/saju'
import { loadChartData, saveChartData } from '@/lib/cache/chartDataCache'
import type { Lang, ChartData, UserContext, CounselorContextResponse } from '@/types/api'
import { logger } from '@/lib/logger'

type SearchParams = Record<string, string | string[] | undefined>
const DEFAULT_LATITUDE = 37.5665
const DEFAULT_LONGITUDE = 126.978

interface ProfileFallback {
  birthDate?: string
  birthTime?: string
  gender?: string
  birthCity?: string
}

export function useCounselorData(sp: SearchParams) {
  const { setLocale } = useI18n()

  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [sessionId] = useState<string | null>(null)

  // Premium: User context and chat session for returning users
  const [userContext, setUserContext] = useState<UserContext | undefined>(undefined)
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)

  // Parse search params
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? ''
  const urlBirthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? ''
  const urlBirthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? ''
  const rawBirthTimeUnknown = Array.isArray(sp.birthTimeUnknown)
    ? sp.birthTimeUnknown[0]
    : sp.birthTimeUnknown
  const urlCity = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? ''
  const rawGender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? ''
  const langParam = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? 'ko'
  const lang: Lang = langParam === 'en' ? 'en' : 'ko'
  const initialQuestion = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? ''

  // Returning users (e.g. opening a saved session from the sidebar)
  // arrive at /destiny-map/counselor without birth params on the URL.
  // Fall back to /api/me/profile so the gate stops re-prompting them.
  // Loading is true until either: the URL already has birthDate+
  // birthTime, or the profile fetch resolves.
  const hasUrlBirthInfo = Boolean(urlBirthDate && urlBirthTime)
  const [profileFallback, setProfileFallback] = useState<ProfileFallback>({})
  const [profileLoading, setProfileLoading] = useState(!hasUrlBirthInfo)

  useEffect(() => {
    if (hasUrlBirthInfo) return
    let cancelled = false
    fetch('/api/me/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const u = data?.user
        if (u) {
          setProfileFallback({
            birthDate: u.birthDate ?? undefined,
            birthTime: u.birthTime ?? undefined,
            gender: u.gender ?? undefined,
            birthCity: u.birthCity ?? undefined,
          })
        }
      })
      .catch((e) => logger.warn('[useCounselorData] profile fallback failed', { e }))
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasUrlBirthInfo])

  // Merged values — URL params win, profile fills in.
  const birthDate = urlBirthDate || profileFallback.birthDate || ''
  const birthTime = urlBirthTime || profileFallback.birthTime || ''
  const city = urlCity || profileFallback.birthCity || ''
  const effectiveGender = rawGender || profileFallback.gender || ''
  const birthTimeUnknown =
    rawBirthTimeUnknown === '1' || rawBirthTimeUnknown === 'true'

  const latStr =
    (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
    (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude)
  const lonStr =
    (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
    (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude)

  const latitude = latStr ? Number(latStr) : NaN
  const longitude = lonStr ? Number(lonStr) : NaN
  const resolvedLatitude = Number.isFinite(latitude) ? latitude : DEFAULT_LATITUDE
  const resolvedLongitude = Number.isFinite(longitude) ? longitude : DEFAULT_LONGITUDE
  const normalizedGender = String(effectiveGender).toLowerCase() === 'female' ? 'female' : 'male'

  // Set locale from URL parameter
  useEffect(() => {
    if (lang && (lang === 'en' || lang === 'ko')) {
      setLocale(lang)
    }
  }, [lang, setLocale])

  // Load pre-computed chart data from cache OR compute fresh
  useEffect(() => {
    if (!birthDate || !birthTime) {
      return
    }

    let saju: Record<string, unknown> | null = null
    let astro: Record<string, unknown> | null = null
    let advancedAstro: Record<string, unknown> | null = null

    // Try to load from cache with birth data validation
    const cached = loadChartData(birthDate, birthTime, resolvedLatitude, resolvedLongitude)
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
        const genderVal = normalizedGender
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

    logger.warn('[CounselorPage] Cache check:', {
      hasAdvancedAstro: !!advancedAstro,
      hasFixedStars: advancedAstro ? 'fixedStars' in advancedAstro : false,
      hasEclipses: advancedAstro ? 'eclipses' in advancedAstro : false,
      hasMidpoints: advancedAstro ? 'midpoints' in advancedAstro : false,
    })

    // Determine whether the cached advancedAstro covers everything we need
    // for the saju⊗astro cross-reference. The previous `hasAllFields = true`
    // hard-code disabled this fetch entirely, so users without a fully
    // primed cache reached the counselor with astro = null and the model
    // could only answer from saju — which is exactly the "사주만 보고
    // 점성은 못 본다" symptom we were seeing.
    const hasAllFields = Boolean(
      advancedAstro &&
      'fixedStars' in advancedAstro &&
      'eclipses' in advancedAstro &&
      'midpoints' in advancedAstro
    )

    if (!hasAllFields) {
      logger.warn('[CounselorPage] Fetching advanced astrology data...', {
        reason: !advancedAstro ? 'no cache' : 'missing fields',
      })
      const fetchAdvancedAstro = async () => {
        try {
          const requestBody = {
            date: birthDate,
            time: birthTime,
            latitude: resolvedLatitude,
            longitude: resolvedLongitude,
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
          saveChartData(birthDate, birthTime, resolvedLatitude, resolvedLongitude, {
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

    // Python AI backend was removed — counselor RAG prefetch is now a no-op.
    // The chat itself runs through @anthropic-ai/sdk directly, no init step needed.
  }, [birthDate, birthTime, normalizedGender, resolvedLatitude, resolvedLongitude])

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

        const res = await fetch(`/api/counselor/chat-history?limit=3`)
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

              // Resume the most recent session
              const recentSession = sessions[0]
              if (recentSession) {
                setChatSessionId(recentSession.id)
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
  }, [])

  // Premium: Save message callback
  const handleSaveMessage = useCallback(
    async (userMessage: string, assistantMessage: string) => {
      try {
        const res = await fetch('/api/counselor/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: chatSessionId, // Will create new if undefined
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
    [chatSessionId, lang]
  )

  const parsedParams = {
    name,
    birthDate,
    birthTime,
    birthTimeUnknown,
    city,
    gender: normalizedGender,
    lang,
    initialQuestion,
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
  }

  return {
    chartData,
    sessionId,
    userContext,
    chatSessionId,
    handleSaveMessage,
    parsedParams,
    profileLoading,
  }
}
