//src/app/destiny-map/result/page.tsx

'use client'

import { useState, useEffect, useCallback, useMemo, use } from 'react'
import styles from './result.module.css'
import { logger } from '@/lib/logger'
import { analyzeDestiny } from '@/components/destiny-map/Analyzer'
import FreeReport from '@/components/destiny-map/FreeReport'
import AnalyzingLoader from './AnalyzingLoader'
import { useI18n } from '@/i18n/I18nProvider'
import { normalizeGender } from '@/lib/utils/gender'
import BackButton from '@/components/ui/BackButton'
import ShareButton from '@/components/ui/ShareButton'
import { analytics } from '@/components/analytics/GoogleAnalytics'

type Lang = 'ko' | 'en'
type DestinyResult = {
  lang?: string
  themes?: Record<string, unknown>
  profile?: { city?: string }
  analysisDate?: string
  saju?: Record<string, unknown>
  astrology?: Record<string, unknown>
  astro?: Record<string, unknown>
  advancedAstrology?: Record<string, unknown>
  [key: string]: unknown
}

// ✅ searchParams 타입 정의
type SearchParams = Record<string, string | string[] | undefined>

export default function DestinyResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { t } = useI18n()
  // ✅ Next.js 15 동적 API 규칙 — Promise 언래핑
  const sp = use(searchParams)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DestinyResult | null>(null)

  // ------------------------------------------------------------ //
  // 🎯 비즈니스 로직
  // ------------------------------------------------------------ //
  useEffect(() => {
    ;(async () => {
      const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? ''
      const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? ''
      const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? ''
      const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? ''
      const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? ''
      const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? 'ko'
      const reqLang: Lang = rawLang === 'en' ? 'en' : 'ko'
      const latStr =
        (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
        (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude)
      const lonStr =
        (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
        (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude)
      const userTz = (Array.isArray(sp.userTz) ? sp.userTz[0] : sp.userTz) ?? ''
      const themeParam = (Array.isArray(sp.theme) ? sp.theme[0] : sp.theme) ?? 'focus_love'

      const latitude = latStr ? Number(latStr) : NaN
      const longitude = lonStr ? Number(lonStr) : NaN

      if (!birthDate || !birthTime || !city || isNaN(latitude) || isNaN(longitude)) {
        setError(
          t(
            'destinyMap.result.errorMissing',
            'Required fields are missing. (birthDate, birthTime, city, latitude, longitude)'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const themesReq = [themeParam]
        const apiGender = normalizeGender(gender) || 'male'
        const res = await analyzeDestiny({
          name,
          birthDate,
          birthTime,
          city,
          gender: apiGender,
          latitude,
          longitude,
          lang: reqLang,
          themes: themesReq,
          userTimezone: userTz || undefined,
        })
        setResult(res as DestinyResult)
        analytics.freeResultView('destiny-map')

        // Trigger referral reward claim (if user was referred)
        try {
          fetch('/api/referral/claim', { method: 'POST' }).catch(() => {})
        } catch {
          // Silent fail - not critical
        }
      } catch (err: unknown) {
        logger.error('[ResultPage] analyzeDestiny error:', err)
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      } finally {
        setLoading(false)
      }
    })()
  }, [sp, t])

  // Hooks must be called before any conditional returns
  const handleReload = useCallback(() => window.location.reload(), [])

  // Memoize merged astrology data for FreeReport
  const mergedAstro = useMemo(() => {
    const advAstro = result?.advancedAstrology || {}
    return {
      ...(result?.astro || result?.astrology || {}),
      extraPoints: advAstro.extraPoints,
      asteroids: advAstro.asteroids,
      solarReturn: advAstro.solarReturn,
      lunarReturn: advAstro.lunarReturn,
      progressions: advAstro.progressions,
      draconic: advAstro.draconic,
      harmonics: advAstro.harmonics,
      fixedStars: advAstro.fixedStars,
      eclipses: advAstro.eclipses,
      electional: advAstro.electional,
      midpoints: advAstro.midpoints,
    }
  }, [result])

  // ------------------------------------------------------------ //
  // ⏳ 상태별 렌더링
  // ------------------------------------------------------------ //
  if (loading) {
    return <AnalyzingLoader />
  }

  if (error) {
    return (
      <section className={styles.page}>
        <BackButton />
        <section className={styles.card}>
          <div className={styles.errorBox}>⚠️ {error}</div>
          <button
            type="button"
            className={`${styles.submitButton} ${styles.retryButton}`}
            onClick={handleReload}
          >
            {t('destinyMap.result.retry', 'Retry')}
          </button>
        </section>
      </section>
    )
  }

  if (!result) {
    return (
      <section className={styles.page}>
        <BackButton />
        <section className={styles.card}>
          <div className={styles.errorBox}>
            {t('destinyMap.result.errorNoResult', 'Failed to load results.')}
          </div>
          <button
            type="button"
            className={`${styles.submitButton} ${styles.retryButton}`}
            onClick={handleReload}
          >
            {t('destinyMap.result.retry', 'Retry')}
          </button>
        </section>
      </section>
    )
  }

  // ------------------------------------------------------------ //
  // ✅ 결과 렌더링
  // ------------------------------------------------------------ //
  const lang: Lang = result?.lang === 'en' ? 'en' : 'ko'

  // 분석 기준일 포맷팅 - 사용자 위치(도시) 기준으로 표시
  const userCity = result?.profile?.city || ''
  const analysisDate = result?.analysisDate || new Date().toISOString().slice(0, 10)

  const analysisDateDisplay = (
    <div className={styles.analysisDateBadge}>
      <span>📅</span>
      <span>
        {t('destinyMap.result.analysisDate', '분석 기준')}: {analysisDate}
      </span>
      {userCity && <span className={styles.analysisDateCity}>📍 {userCity}</span>}
    </div>
  )

  return (
    <section className={styles.page}>
      <h1 className="sr-only">
        {lang === 'ko' ? '운명 지도 분석 결과' : 'Destiny Map Analysis Result'}
      </h1>
      <BackButton />
      <div className={styles.creditBadgeWrapper}>
        <ShareButton variant="compact" />
      </div>
      <section className={styles.card}>
        {/* Apple-tier Hero */}
        <header className="mb-7 space-y-3 text-center">
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]"
              style={{
                borderColor: 'rgba(148,163,184,0.4)',
                color: '#cbd5e1',
                background: 'rgba(148,163,184,0.1)',
              }}
            >
              Free · 운명 지도 분석 결과
            </span>
          </div>
          <h2
            className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-3xl font-semibold leading-[1.15] text-transparent sm:text-4xl"
            style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            {lang === 'ko'
              ? '본인 사주·점성으로 비춰본 지금의 결'
              : 'Your Saju × Astrology Reading'}
          </h2>
          <div className={styles.analysisDateWrapper}>{analysisDateDisplay}</div>
        </header>

        {/* ✨ 무료 인사이트 — 사주·점성 룰 기반 (성격/연애/커리어/재물/건강/카르마 등) */}
        <FreeReport
          saju={result?.saju}
          astro={mergedAstro}
          lang={lang}
          fusionFragments={
            (result as { fusionFragments?: unknown } | null)?.fusionFragments as Parameters<
              typeof FreeReport
            >[0]['fusionFragments']
          }
          birthInfo={{
            birthDate: (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? '',
            birthTime: (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? '',
            gender: (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? '',
            timezone: (Array.isArray(sp.userTz) ? sp.userTz[0] : sp.userTz) ?? '',
          }}
        />
      </section>
    </section>
  )
}
