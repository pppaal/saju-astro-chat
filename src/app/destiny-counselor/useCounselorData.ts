'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { normalizeGender } from '@/lib/utils/gender'
import { loadChartData, saveChartData } from '@/lib/cache/chartDataCache'
import type { Lang, ChartData, UserContext, CounselorContextResponse } from '@/types/api'
import { logger } from '@/lib/logger'
import { withSpan } from '@/lib/telemetry'
import { apiFetch } from '@/lib/api'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

type SearchParams = Record<string, string | string[] | undefined>
const DEFAULT_LATITUDE = 37.5665
const DEFAULT_LONGITUDE = 126.978

interface ProfileFallback {
  name?: string
  birthDate?: string
  birthTime?: string
  birthTimeUnknown?: boolean
  gender?: string
  birthCity?: string
  tzId?: string
  // localStorage 폴백이 좌표까지 들고 올 수 있어 추가 — 비로그인 사용자가 홈에서
  // 도시를 골라 저장한 경우 사주/하우스 계산이 서울 기본값으로 안 떨어지게.
  latitude?: number
  longitude?: number
}

export function useCounselorData(sp: SearchParams) {
  const { locale: i18nLocale, setLocale } = useI18n()

  const [chartData, setChartData] = useState<ChartData | null>(null)

  // Premium: User context and chat session for returning users
  const [userContext, setUserContext] = useState<UserContext | undefined>(undefined)
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)

  // Parse search params
  const urlName = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? ''
  const urlBirthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? ''
  const urlBirthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? ''
  const rawBirthTimeUnknown = Array.isArray(sp.birthTimeUnknown)
    ? sp.birthTimeUnknown[0]
    : sp.birthTimeUnknown
  const urlCity = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? ''
  const rawGender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? ''
  // Answer language follows the app i18n toggle (useI18n). An explicit URL
  // ?lang= only seeds it (deep links); without it we mirror the live locale
  // instead of forcing 'ko', so toggling EN/KO actually controls the answer.
  const urlLangRaw = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang
  const urlLang: Lang | null = urlLangRaw === 'en' ? 'en' : urlLangRaw === 'ko' ? 'ko' : null
  const lang: Lang = urlLang ?? i18nLocale
  // 메인페이지 입력 → `&q=...`, destiny-map 경유 → `&initialQuestion=...`.
  // 둘 다 받아서 어느 쪽이든 카운슬러가 첫 질문을 잃지 않도록.
  const rawQ = sp.q ?? sp.initialQuestion
  const initialQuestion = (Array.isArray(rawQ) ? rawQ[0] : rawQ) ?? ''

  // Returning users (e.g. opening a saved session from the sidebar)
  // arrive at /destiny-counselor without birth params on the URL.
  // Fall back to /api/me/profile so the gate stops re-prompting them.
  // Loading is true until either: the URL already has birthDate+
  // birthTime, or the profile fetch resolves.
  const hasUrlBirthInfo = Boolean(urlBirthDate && urlBirthTime)
  // localStorage 에 저장된 생년월일을 동기적으로 시드 — 비로그인 사용자가 홈에서
  // 입력만 해두면(서버 프로필 없음) 운명상담사 진입 시 매번 폼이 뜨던 문제 해소.
  // URL > 서버프로필 > localStorage 우선순위는 아래 병합부에서 보장.
  const [profileFallback, setProfileFallback] = useState<ProfileFallback>(() => {
    if (hasUrlBirthInfo) return {}
    if (typeof window === 'undefined') return {}
    const stored = getStoredBirthInfo()
    if (!stored) return {}
    return {
      name: stored.name,
      birthDate: stored.birthDate,
      birthTime: stored.birthTime,
      gender: stored.gender,
      birthCity: stored.city,
      tzId: stored.timeZone,
      latitude: stored.latitude,
      longitude: stored.longitude,
    }
  })
  const [profileLoading, setProfileLoading] = useState(!hasUrlBirthInfo)

  useEffect(() => {
    if (hasUrlBirthInfo) return
    let cancelled = false
    // Span: profile fetch gates chart compute for users without URL birth
    // info — surfaces how much of the counselor entry waits on it.
    withSpan('counselor.profile', 'http.client', () =>
      fetch('/api/me/profile').then((r) => (r.ok ? r.json() : null))
    )
      .then((data) => {
        if (cancelled) return
        const u = data?.user
        if (u) {
          // 서버 프로필 값이 우선이되, 비어 있는 필드는 localStorage 시드를
          // 보존한다(prev). 서버에 생일이 없는 게스트/부분프로필 사용자가
          // localStorage 로 채운 값을 덮어쓰지 않게.
          setProfileFallback((prev) => ({
            name: u.name ?? prev.name,
            birthDate: u.birthDate ?? prev.birthDate,
            birthTime: u.birthTime ?? prev.birthTime,
            gender: u.gender ?? prev.gender,
            birthCity: u.birthCity ?? prev.birthCity,
            tzId: u.tzId ?? prev.tzId,
            // 서버 프로필 좌표를 우선 사용(없을 때만 localStorage 시드 보존).
            // 이전엔 항상 prev 만 써서 저장된 출생지 좌표가 버려지고 기본
            // 좌표(서울)로 폴백되던 회귀.
            latitude: u.latitude ?? prev.latitude,
            longitude: u.longitude ?? prev.longitude,
          }))
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

  // ── Resume: restore the session's subject (누구 사주였는지) ──────────────
  // 사이드바에서 과거 채팅을 누르거나(?session=) 맨몸 진입 자동 재개는 URL 에
  // 생년월일이 없다. 그대로 두면 로그인 사용자 본인 프로필로 폴백해 "남의 채팅을
  // 내 사주로" 이어보는 버그가 난다. 세션 생성 시 저장해 둔 subject 를 불러와
  // 본인 프로필보다 우선 적용한다. (subject 없는 옛 세션은 본인 폴백 유지.)
  const urlSession = (Array.isArray(sp.session) ? sp.session[0] : sp.session) ?? ''
  const shouldLoadSessionSubject = Boolean(urlSession) && !hasUrlBirthInfo
  const [sessionSubject, setSessionSubject] = useState<ProfileFallback | null>(null)
  const [sessionSubjectLoading, setSessionSubjectLoading] = useState(shouldLoadSessionSubject)

  useEffect(() => {
    if (!shouldLoadSessionSubject) {
      setSessionSubject(null)
      setSessionSubjectLoading(false)
      return
    }
    let cancelled = false
    setSessionSubjectLoading(true)
    apiFetch(`/api/counselor/session/load?sessionId=${encodeURIComponent(urlSession)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const s = data?.session?.meta?.subject as
          | {
              name?: string
              birthDate?: string
              birthTime?: string
              birthTimeUnknown?: boolean
              gender?: string
              latitude?: number
              longitude?: number
              city?: string
              timeZone?: string
            }
          | undefined
        if (s && (s.birthDate || s.name)) {
          setSessionSubject({
            name: s.name,
            birthDate: s.birthDate,
            birthTime: s.birthTime,
            birthTimeUnknown: s.birthTimeUnknown,
            gender: s.gender,
            birthCity: s.city,
            tzId: s.timeZone,
            latitude: s.latitude,
            longitude: s.longitude,
          })
        } else {
          setSessionSubject(null)
        }
      })
      .catch((e) => logger.warn('[useCounselorData] session subject load failed', { e }))
      .finally(() => {
        if (!cancelled) setSessionSubjectLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [shouldLoadSessionSubject, urlSession])

  // 재개 subject 로딩 중엔 본인 프로필로 폴백하지 않는다(잠깐 본인 사주가
  // 깜빡이고 재계산되는 낭비 방지). 로딩이 끝나면: subject 가 있으면 그걸,
  // 없으면(옛 세션) 본인 프로필로 폴백.
  const resolvingSubject = shouldLoadSessionSubject && sessionSubjectLoading
  const birthSource: ProfileFallback = sessionSubject ?? (resolvingSubject ? {} : profileFallback)

  // Merged values — URL params win, then resumed subject, then own profile.
  const name = urlName || birthSource.name || ''
  const birthDate = urlBirthDate || birthSource.birthDate || ''
  const birthTime = urlBirthTime || birthSource.birthTime || ''
  const city = urlCity || birthSource.birthCity || ''
  const effectiveGender = rawGender || birthSource.gender || ''
  const birthTimeUnknown =
    rawBirthTimeUnknown === '1' ||
    rawBirthTimeUnknown === 'true' ||
    Boolean(birthSource.birthTimeUnknown)

  const latStr =
    (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
    (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude)
  const lonStr =
    (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
    (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude)

  const latitude = latStr ? Number(latStr) : NaN
  const longitude = lonStr ? Number(lonStr) : NaN
  // URL 좌표 > localStorage 폴백 좌표 > 서울 기본값.
  const resolvedLatitude = Number.isFinite(latitude)
    ? latitude
    : (birthSource.latitude ?? DEFAULT_LATITUDE)
  const resolvedLongitude = Number.isFinite(longitude)
    ? longitude
    : (birthSource.longitude ?? DEFAULT_LONGITUDE)

  // Honor the birth-place timezone when the home modal forwarded one
  // (URL or server profile). Falling back to the browser's tz is wrong
  // for users who travel — Seoul-born user opening the counselor from
  // Tokyo would get the hour pillar in Asia/Tokyo otherwise.
  const urlTimeZone =
    (Array.isArray(sp.timeZone) ? sp.timeZone[0] : sp.timeZone) ??
    (Array.isArray(sp.tz) ? sp.tz[0] : sp.tz)
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
  const resolvedTimeZone = urlTimeZone || birthSource.tzId || browserTz
  // 'F' / 'Female' / 'female' / 'f' / 'M' / 'Male' 다 처리. 기존
  // `lowercase === 'female'` 패턴은 'F'(한 글자) → 'f' 로 떨어져 매칭 실패
  // → 여자 사용자가 'male' 로 분류돼 대운 순/역행이 거꾸로 가던 회귀.
  const normalizedGender: 'male' | 'female' =
    normalizeGender(effectiveGender) === 'female' ? 'female' : 'male'

  // Seed the app i18n from an explicit URL ?lang= (deep-link intent) only.
  // Never force the default — otherwise landing here would reset the user's
  // chosen app language back to Korean.
  // reload:false 필수 — 운명상담사 진입 URL 은 buildCounselorHref 가 항상 ?lang 을
  // 붙인다. setLocale 의 기본(리로드) 경로를 effect 에서 부르면 ?lang 핀과 맞물려
  // 페이지가 무한 리로드(빈 인사 화면 깜빡임)된다. 진입 페이지는 이미 새로
  // 렌더되므로 리로드 없이 클라 로케일만 맞추면 충분하다.
  useEffect(() => {
    if (urlLang) setLocale(urlLang, { reload: false })
  }, [urlLang, setLocale])

  // Load pre-computed chart data from cache OR compute fresh
  useEffect(() => {
    if (!birthDate || !birthTime) {
      return
    }

    // Guard against stale async writes: if the effect re-runs (birth data /
    // location / locale change) or the component unmounts before a fetch
    // resolves, a late response must NOT overwrite fresh chart data. applyChart
    // drops any write once this run is cancelled.
    let cancelled = false
    // Abort the in-flight network requests on re-run / unmount. The `cancelled`
    // flag + applyChart already drop stale *writes*, but without aborting, the
    // ~12 fetches this effect fires (saju + astro + 9 advanced) keep running to
    // completion on every dep change (locale toggle, birth edit). One shared
    // controller threaded through every fetch tears them all down at once.
    // Matches the AbortController style in useChatApi / useInlineTarotAPI.
    const controller = new AbortController()
    const chartSetter = setChartData
    const applyChart = (next: Parameters<typeof setChartData>[0]) => {
      if (!cancelled) chartSetter(next)
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

    // /api/saju 호출 — calculateSajuData 직접 호출 시엔 advancedAnalysis /
    // table.byPillar / relations / unse / iljin 등 풍부한 필드가 빠짐.
    // PersonaCard / InsightStrip / CrossRefTable / PillarDrawer 가 이 풍부한
    // shape 에 의존하므로 캐시 miss 시 반드시 /api/saju 응답을 받아야 함.
    // 캐시 hit 이어도 cached.saju 가 advancedAnalysis 누락된 옛 shape 일 수 있어,
    // dayMaster + advancedAnalysis 둘 다 있는 경우만 재사용.
    const cachedRich = saju && saju.dayMaster && (saju as Record<string, unknown>).analyses

    // Set initial chartData (may be updated later by async fetches)
    applyChart({
      saju: saju || undefined,
      astro: astro || undefined,
      advancedAstro: advancedAstro || undefined,
    })

    if (!cachedRich) {
      const fetchRichSaju = async () => {
        try {
          const res = await fetch('/api/saju', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
            },
            body: JSON.stringify({
              birthDate,
              birthTime,
              gender: normalizedGender,
              calendarType: 'solar',
              timezone: resolvedTimeZone,
              userTimezone: resolvedTimeZone,
              // 진경도(진태양시) 보정 — 도시 lon 을 같이 보내면 시지 계산이 도시별로 정확.
              // resolvedLongitude 는 URL 에 좌표 없으면 서울 기본값 — 페이지의 다른 차트
              // (astro 등) 와 일관. 캐시 키에도 같이 들어가 도시별 결과 분리.
              latitude: resolvedLatitude,
              longitude: resolvedLongitude,
            }),
            signal: controller.signal,
          })
          if (!res.ok) {
            // /api/saju 실패 시 옛 코드는 client 에서 calculateSajuData 를
            // 직접 호출했음. PersonaCard / InsightStrip 등 풍부한 UI 가
            // 어차피 빈 fallback 으로 떨어져 사용자 체감 효과 0, 반면
            // Swiss Ephemeris + 사주 알고리즘 코드가 client bundle 에
            // 매번 들어가 모든 사용자가 무거운 다운로드 → 첫 로딩 느려짐.
            // 제거 후엔 /api/saju 실패 시 그냥 빈 상태 (옛 fallback 과
            // 사실상 동일한 UX).
            logger.warn('[CounselorPage] /api/saju failed', { status: res.status })
            return
          }
          const json = (await res.json()) as { data?: Record<string, unknown> }
          const richSaju = json?.data
          if (!richSaju) return
          applyChart((prev) => ({
            saju: richSaju,
            astro: prev?.astro,
            advancedAstro: prev?.advancedAstro,
          }))
          try {
            saveChartData(birthDate, birthTime, resolvedLatitude, resolvedLongitude, {
              saju: richSaju,
              astro: (astro as Record<string, unknown>) || undefined,
              advancedAstro: (advancedAstro as Record<string, unknown>) || undefined,
            })
          } catch {
            /* ignore cache write error */
          }
        } catch (err) {
          // An abort (effect re-run / unmount) is expected — don't log it as
          // a failure. The write-guard above also drops any resolved-before-abort write.
          if ((err as { name?: string })?.name === 'AbortError') return
          logger.warn('[CounselorPage] rich saju fetch failed:', err)
        }
      }
      void withSpan('counselor.saju', 'http.client', fetchRichSaju)
    }

    // Base natal chart fetch — `astro`가 캐시에 없으면 NatalChart 위젯이
    // "점성 데이터 없음"으로 뜬다. 이전엔 advanced astro만 fetch하고 base는
    // 캐시 hit만 의존했다. 캐시 miss면 /api/astrology에서 chartData 받아와
    // 즉시 채우자 — advanced fetch보다 빠르고 chart UI에 바로 반영됨.
    if (!astro || !Array.isArray((astro as { planets?: unknown }).planets)) {
      const fetchBaseNatal = async () => {
        try {
          const res = await fetch('/api/astrology', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
            },
            body: JSON.stringify({
              date: birthDate,
              time: birthTime,
              latitude: resolvedLatitude,
              longitude: resolvedLongitude,
              timeZone: resolvedTimeZone,
            }),
            signal: controller.signal,
          })
          if (!res.ok) return
          const json = (await res.json()) as {
            data?: { chartData?: unknown; aspects?: unknown }
          }
          const baseChart = json?.data?.chartData
          if (!baseChart) return
          // aspects 는 chartData 와 별개 필드로 옴 — NatalChart 가 휠 안에 aspect
          // 라인 그리려면 같이 흘려줘야 함. astro 객체에 합쳐서 저장.
          const aspects = json?.data?.aspects
          const astroWithAspects = {
            ...(baseChart as Record<string, unknown>),
            ...(aspects ? { aspects } : {}),
          }
          applyChart((prev) => ({
            saju: prev?.saju,
            astro: astroWithAspects,
            advancedAstro: prev?.advancedAstro,
          }))
          // 캐시에 저장해서 다음 방문 때 즉시 hit
          try {
            saveChartData(birthDate, birthTime, resolvedLatitude, resolvedLongitude, {
              saju: (saju as Record<string, unknown>) || undefined,
              astro: astroWithAspects,
              advancedAstro: (advancedAstro as Record<string, unknown>) || undefined,
            })
          } catch {
            /* ignore cache write error */
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return
          logger.warn('[CounselorPage] base natal fetch failed:', err)
        }
      }
      void withSpan('counselor.astrology', 'http.client', fetchBaseNatal)
    }

    // 고급 점성 9-엔드포인트 fan-out 은 제거됨 — 운명 상담 컨텍스트는 서버
    // (realtime route → buildDestinyContext)가 생년월일에서 사주·점성을 직접
    // 생성하므로 클라가 advancedAstro 를 받아올 필요가 없다(채팅 미사용 +
    // ChartModal 미렌더). 오래 hasAllFields=true 로 죽어 있던 분기라 코드째
    // 삭제 (localStorage 에 남은 옛 advancedAstro 캐시는 위에서 그대로 읽음).

    // Python AI backend was removed — counselor RAG prefetch is now a no-op.
    // The chat itself streams from the Anthropic Messages API (raw HTTP), no init step needed.

    // Cancel stale async writes AND abort in-flight requests on re-run / unmount.
    return () => {
      cancelled = true
      try {
        controller.abort()
      } catch {
        /* AbortController throws if already aborted; ignore. */
      }
    }
  }, [
    birthDate,
    birthTime,
    normalizedGender,
    resolvedLatitude,
    resolvedLongitude,
    resolvedTimeZone,
  ])

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

        // suppressAuthModal: 진입 시 조용한 컨텍스트 prefetch — 비로그인이면 401
        // 이 떨어지는데, 이걸 막지 않으면 apiFetch 가 전역 로그인 모달을 띄워
        // "들어오자마자 로그인하라"는 회귀가 난다. 로그인 유도는 첫 전송 시
        // onSendBlocked 한 곳에서만(page.tsx) 일어나야 한다.
        const res = await withSpan('counselor.chatHistory', 'http.client', () =>
          apiFetch(`/api/counselor/chat-history?limit=3`, { suppressAuthModal: true })
        )
        if (res.ok) {
          const data = (await res.json()) as CounselorContextResponse
          if (data.success) {
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
        // 사이드바 / 헤더 sticky 바에 누구 정보로 본 채팅인지 노출하려고
        // 첫 저장(=신규 세션) 때만 meta 에 profile.name 을 같이 보낸다.
        // 기존 세션 업데이트엔 meta 안 보냄 — 라우트가 update 경로에서 meta 를
        // 안 쓰므로 무시되긴 하지만 깔끔히 분리.
        const body: Record<string, unknown> = {
          sessionId: chatSessionId,
          locale: lang,
          userMessage,
          assistantMessage,
        }
        if (!chatSessionId && name) {
          body.meta = { profile: { name } }
        }
        const res = await apiFetch('/api/counselor/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
    [chatSessionId, lang, name]
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
    timeZone: resolvedTimeZone,
  }

  return {
    chartData,
    userContext,
    chatSessionId,
    handleSaveMessage,
    parsedParams,
    // 재개 subject 로딩 중에도 게이트(생일 폼)를 띄우지 않도록 loading 에 포함.
    profileLoading: profileLoading || resolvingSubject,
  }
}
