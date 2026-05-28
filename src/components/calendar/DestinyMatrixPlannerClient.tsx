'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BrandSplash from '@/components/branding/BrandSplash'
import DestinyMatrixPlanner from '@/components/calendar/DestinyMatrixPlanner'
import { loadSharedBirthInfo } from '@/components/calendar/sharedBirthInfo'
import { useI18n } from '@/i18n/I18nProvider'
import { getCalLabels } from '@/components/calendar/premium/labels'
import type { BirthInfo, CalendarData } from '@/components/calendar/types'
import { getUserProfile } from '@/lib/userProfile'
import { localizeStoredCity } from '@/lib/cities/formatter'
import { normalizeGender, toLongGender } from '@/lib/utils/gender'
import { logger } from '@/lib/logger'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

// localStorage stale-while-revalidate 캐시 — 재방문 시 즉시 노출 + 백그라운드 refresh.
// TTL 24h: calendar data 는 하루 단위로만 바뀜 (날짜 경계). 그 안에선 stale 안전.
// v4: EN locale leak fix — shinsal/pattern/themeBreakdown 라벨 응답 시점 번역.
// v3 캐시는 EN 모드에서 KO 가 박혀있어 invalidate.
const CACHE_VERSION = 4
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CachedPayload<TYearlyMonthly, TYearlyConvergence> {
  v: typeof CACHE_VERSION
  ts: number
  data: CalendarData
  yearlyMonthly?: TYearlyMonthly[]
  yearlyConvergence?: TYearlyConvergence
}

function cacheKey(info: BirthInfo, year: number, locale: string): string {
  const apiGender = normalizeGender(info.gender) ?? 'male'
  return `cal-cache:${CACHE_VERSION}:${locale}:${info.birthDate}:${info.birthTime}:${info.birthPlace}:${apiGender}:${year}`
}

function readCache<TM, TC>(key: string): CachedPayload<TM, TC> | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload<TM, TC>
    if (parsed.v !== CACHE_VERSION) return null
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache<TM, TC>(key: string, payload: Omit<CachedPayload<TM, TC>, 'v' | 'ts'>): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      key,
      JSON.stringify({ v: CACHE_VERSION, ts: Date.now(), ...payload })
    )
  } catch {
    // quota exceeded / private mode — 무시
  }
}

/**
 * Orchestrator for the DestinyMatrixPlanner UI: handles birth info gating,
 * shared-info hydration, and /api/calendar fetching. Used by both
 * /calendar and /calendar/preview routes.
 */
export default function DestinyMatrixPlannerClient() {
  const router = useRouter()
  const { locale } = useI18n()
  const lang = locale === 'en' ? 'en' : 'ko'
  const tLabels = useMemo(() => getCalLabels(lang), [lang])
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: 'Male',
  })
  const [hasBirthInfo, setHasBirthInfo] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState<CalendarData | null>(null)
  // "올해 큰 날"은 메인 응답에서 분리해 지연 로드 — 달력은 즉시 뜨고 이 카드만 늦게 채워짐.
  type YearlyConvergence = NonNullable<
    NonNullable<CalendarData['allDates']>[number]['monthlyInterpretation']
  >['yearlyConvergence']
  type YearMonthly = {
    month: number
    score: number
    themes: Array<{ theme: 'love' | 'money' | 'career' | 'health' | 'growth'; score: number }>
    tone: 'up' | 'down' | 'flat'
  }
  const [yearlyConvergence, setYearlyConvergence] = useState<YearlyConvergence>(undefined)
  const [yearlyMonthly, setYearlyMonthly] = useState<YearMonthly[] | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // race + timeout 가드 — 사용자가 연도 점프하면 in-flight fetch 가 stale 응답으로
  // 새 데이터 덮어쓰던 회귀 (5차 audit). 각 호출이 AbortController 받고, 새 호출은
  // 이전을 abort. 20s hard timeout 으로 cold engine 행 폭주도 방어.
  const fetchAbortRef = useRef<AbortController | null>(null)
  const FETCH_TIMEOUT_MS = 20_000

  const fetchCalendar = useCallback(
    async (info: BirthInfo, targetYear?: number) => {
      // 이전 in-flight 취소 — main + convergence 모두 같은 controller 라 둘 다 죽음.
      fetchAbortRef.current?.abort()
      const controller = new AbortController()
      fetchAbortRef.current = controller
      // timeout 으로 인한 abort 인지 race 로 인한 abort 인지 분기용 플래그.
      let timedOut = false
      const timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, FETCH_TIMEOUT_MS)

      setError(null)
      const year = targetYear ?? new Date().getFullYear()
      const cKey = cacheKey(info, year, lang)

      // 1) cache hit → 즉시 데이터 노출 (loading 띄우지 않음 — 사용자 perceived 0ms)
      const cached = readCache<YearMonthly, YearlyConvergence>(cKey)
      if (cached) {
        setData(cached.data)
        if (cached.yearlyConvergence) setYearlyConvergence(cached.yearlyConvergence)
        if (cached.yearlyMonthly) setYearlyMonthly(cached.yearlyMonthly)
        setLoading(false) // 화면 보이고 그 위로 백그라운드 refresh
      } else {
        // cache miss → 초기 빈 상태로 loading
        setLoading(true)
        setYearlyConvergence(undefined)
        setYearlyMonthly(undefined)
      }

      try {
        const params = new URLSearchParams({
          year: String(year),
          locale: lang,
          birthDate: info.birthDate,
          birthTime: info.birthTime,
          birthPlace: info.birthPlace,
        })
        const apiGender = normalizeGender(info.gender)
        if (apiGender) params.set('gender', apiGender)

        const res = await fetch(`/api/calendar?${params}`, {
          headers: { 'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '' },
          signal: controller.signal,
        })

        type ApiResponse = Partial<CalendarData> & {
          error?: { message?: string } | string
        }
        let json: ApiResponse | null = null
        try {
          json = (await res.json()) as ApiResponse
        } catch {
          json = null
        }

        // race 가드 — 응답 도착 시점에 더 새로운 fetch 가 시작됐으면 무시.
        if (controller.signal.aborted) return

        const looksUsable =
          !!json &&
          json.success !== false &&
          Array.isArray(json.allDates) &&
          json.allDates.length > 0

        if (!res.ok || !looksUsable) {
          let serverMessage: string | null = null
          const errField: unknown = json?.error
          if (typeof errField === 'string') {
            serverMessage = errField
          } else if (errField && typeof errField === 'object' && 'message' in errField) {
            const msg = (errField as { message?: unknown }).message
            if (typeof msg === 'string') serverMessage = msg
          }
          setError(serverMessage || `엔진 응답 비어있음 (status ${res.status})`)
          return
        }

        const payload = json as CalendarData
        setData(payload)
        // 캐시 일단 main payload 만 — convergence 도착하면 아래에서 다시 write.
        writeCache<YearMonthly, YearlyConvergence>(cKey, { data: payload })
        logger.debug('[CalendarPlanner] payload received', {
          year: payload.year,
          total: payload.allDates?.length ?? 0,
          phase: payload.matrixContract?.overallPhaseLabel,
        })

        // "올해 큰 날"은 1년 풀빌드라 비쌈 — 메인 응답을 막지 않게 지연 로드.
        // 같은 controller signal 공유라 새 fetchCalendar 가 시작되면 자동 취소.
        void (async () => {
          try {
            const cr = await fetch(`/api/calendar/convergence?${params}`, {
              headers: { 'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '' },
              signal: controller.signal,
            })
            if (controller.signal.aborted) return
            if (!cr.ok) return
            const cj = (await cr.json()) as {
              convergence?: YearlyConvergence
              monthly?: YearMonthly[]
              daily?: Array<{ date: string; score: number }>
            }
            if (controller.signal.aborted) return
            if (cj?.convergence) setYearlyConvergence(cj.convergence)
            if (cj?.monthly) setYearlyMonthly(cj.monthly)
            // 캐시 갱신 — convergence + monthly 합쳐서 full payload.
            writeCache<YearMonthly, YearlyConvergence>(cKey, {
              data: payload,
              yearlyConvergence: cj?.convergence,
              yearlyMonthly: cj?.monthly,
            })
          } catch (e) {
            if ((e as { name?: string })?.name === 'AbortError') return
            logger.debug('[CalendarPlanner] convergence lazy-load skipped', e)
          }
        })()
      } catch (err) {
        // AbortError + timedOut: 사용자에게 타임아웃 알림.
        // AbortError + !timedOut: race(새 fetch 시작) — 조용히 무시.
        if ((err as { name?: string })?.name === 'AbortError') {
          if (timedOut) {
            setError(tLabels.fetchTimeout)
          }
          return
        }
        logger.error('[CalendarPreview] fetch failed', err)
        setError(err instanceof Error ? err.message : 'fetch failed')
      } finally {
        clearTimeout(timeoutId)
        // 이 호출이 여전히 latest 일 때만 loading 해제 (race 시 stale 호출이
        // 새 호출의 loading 을 끄는 버그 방지)
        if (fetchAbortRef.current === controller) {
          setLoading(false)
        }
      }
    },
    [lang, tLabels.fetchTimeout]
  )

  // Hydrate from shared storage / user profile / URL params
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    let next: BirthInfo = {
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      gender: 'Male',
    }

    // Calendar's own shared store first, then user profile, then home
    // page localStorage. Whichever has birthDate first wins; URL params
    // override at the end.
    const shared = loadSharedBirthInfo()
    if (shared) next = { ...next, ...shared }

    const profile = getUserProfile()
    if (profile.birthDate) next.birthDate = profile.birthDate
    if (profile.birthTime) next.birthTime = profile.birthTime
    if (profile.gender) {
      const long = toLongGender(profile.gender)
      if (long) next.gender = long
    }
    if (profile.birthCity) {
      next.birthPlace = localizeStoredCity(profile.birthCity, 'ko')
    }

    // Home page localStorage fills in any field the previous sources
    // left blank (the home chat is the canonical entry surface for
    // birth info now).
    if (!next.birthDate) {
      const homeBirth = getStoredBirthInfo()
      if (homeBirth?.birthDate) {
        next.birthDate = homeBirth.birthDate
        if (!next.birthTime && homeBirth.birthTime) next.birthTime = homeBirth.birthTime
        if (!next.gender || next.gender === 'Male') {
          const long = toLongGender(homeBirth.gender)
          if (long) next.gender = long
        }
        if (!next.birthPlace && homeBirth.city) {
          next.birthPlace = localizeStoredCity(homeBirth.city, 'ko')
        }
      }
    }

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const qBirthDate = sp.get('birthDate')
      const qBirthTime = sp.get('birthTime')
      const qGender = sp.get('gender')
      const qBirthCity = sp.get('birthCity') || sp.get('city')
      if (qBirthDate) next.birthDate = qBirthDate
      if (qBirthTime) next.birthTime = qBirthTime
      if (qGender) {
        const long = toLongGender(qGender)
        if (long) next.gender = long
      }
      if (qBirthCity) next.birthPlace = localizeStoredCity(qBirthCity, 'ko')
    }

    setBirthInfo(next)

    // Auto-submit when we already have a usable birth date — skip the form.
    if (next.birthDate) {
      const hasCoords = typeof next.latitude === 'number' && typeof next.longitude === 'number'
      const normalized: BirthInfo = {
        ...next,
        birthTime: next.birthTime || '12:00',
        birthPlace: next.birthPlace || 'Seoul',
        latitude: hasCoords ? next.latitude : 37.5665,
        longitude: hasCoords ? next.longitude : 126.978,
        timezone: next.timezone || 'Asia/Seoul',
      }
      setBirthInfo(normalized)
      setHasBirthInfo(true)
      void fetchCalendar(normalized)
    }
    setHydrated(true)
  }, [fetchCalendar])

  // No birth info available anywhere — redirect to home so the user
  // fills it in the modal there (single source of truth).
  useEffect(() => {
    if (!hydrated || hasBirthInfo) return
    if (typeof window === 'undefined') return
    const back = encodeURIComponent('/calendar')
    router.replace(`/?openBirth=1&next=${back}`)
  }, [hydrated, hasBirthInfo, router])

  const handleRetry = useCallback(() => {
    setError(null)
    setData(null)
    if (birthInfo.birthDate) void fetchCalendar(birthInfo)
  }, [birthInfo, fetchCalendar])

  // 연도 경계 — 사용자가 cached year 밖으로 이동하면 재호출. early return 위에
  // 둬야 React Hooks 순서 보장.
  const handleYearChange = useCallback(
    (newYear: number) => {
      if (!birthInfo.birthDate) return
      if (data?.year === newYear) return
      void fetchCalendar(birthInfo, newYear)
    },
    [birthInfo, data, fetchCalendar]
  )

  if (!hasBirthInfo) {
    return <BrandSplash message={lang === 'ko' ? '홈으로 이동 중…' : 'Redirecting to home…'} />
  }

  if (loading) {
    return (
      <BrandSplash
        message={lang === 'ko' ? '운명 흐름을 계산 중이에요' : 'Reading your destiny flow…'}
        submessage={lang === 'ko' ? '잠시만요…' : 'Just a moment…'}
      />
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-rose-400 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm">
          {tLabels.engineFailedRetry}: {error}
        </p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 text-sm"
        >
          {lang === 'en' ? 'Retry' : '다시 시도'}
        </button>
      </div>
    )
  }

  return (
    <DestinyMatrixPlanner
      data={data}
      birthInfo={birthInfo}
      yearlyConvergence={yearlyConvergence}
      yearlyMonthly={yearlyMonthly}
      onYearChange={handleYearChange}
      locale={lang}
    />
  )
}
