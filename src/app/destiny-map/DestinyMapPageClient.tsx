'use client'

/**
 * destiny-map / destiny-counselor 의 thin redirect-only entry.
 *
 * 이전엔 birth info 폼 UI (~600 라인) 가 있었지만 bootSplash 가 항상 true 라
 * 폼이 한 번도 렌더된 적이 없는 dead UI. useDestinyForm + useDestinyProfile 도
 * 폼 전용 orphan. 모두 제거하고 splash + redirect 만 유지.
 *
 * Flow:
 *   1. URL params (birthDate / birthTime / gender / birthCity) 우선
 *   2. 없으면 localStorage destinypal:birthInfo:v1 폴백
 *   3. 그래도 없으면 home (`/?openBirth=1&next=/destiny-counselor`) 로 bounce
 *   4. birth info 있으면 `/destiny-map/counselor?<params>` 로 즉시 jump
 */

import React, { useEffect, useRef } from 'react'
import BrandSplash from '@/components/branding/BrandSplash'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import type { I18nMessages } from '@/i18n/utils'

type Locale = 'en' | 'ko'

interface DestinyMapPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

const QUICK_MODE_DEFAULT_CITY = {
  displayKr: 'Seoul, KR',
  lat: 37.5665,
  lon: 126.978,
  timezone: 'Asia/Seoul',
}

export default function DestinyMapPageClient({ initialLocale }: DestinyMapPageClientProps) {
  const router = useRouter()
  const { locale: activeLocale } = useI18n()
  const locale = activeLocale || initialLocale
  const autoRedirectRef = useRef(false)

  useEffect(() => {
    if (autoRedirectRef.current) return
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)

    let birthDate = sp.get('birthDate')
    let birthTime = sp.get('birthTime')
    let gParam = sp.get('gender') || ''
    let cityName = sp.get('birthCity') || ''
    if (!birthDate) {
      try {
        const raw = window.localStorage.getItem('destinypal:birthInfo:v1')
        if (raw) {
          const parsed = JSON.parse(raw) as {
            birthDate?: string
            birthTime?: string
            gender?: 'male' | 'female'
            city?: string
          }
          if (parsed?.birthDate) {
            birthDate = parsed.birthDate
            birthTime = birthTime || parsed.birthTime || ''
            gParam = gParam || parsed.gender || ''
            cityName = cityName || parsed.city || ''
          }
        }
      } catch {
        // ignore
      }
    }
    if (!birthDate) {
      autoRedirectRef.current = true
      router.replace('/?openBirth=1&next=/destiny-counselor')
      return
    }

    autoRedirectRef.current = true
    if (!birthTime) birthTime = '12:00'
    const gUpper = gParam.toUpperCase()
    const apiGender = gUpper === 'F' || gUpper === 'FEMALE' ? 'female' : 'male'
    if (!cityName) cityName = QUICK_MODE_DEFAULT_CITY.displayKr
    const initialQuestion = sp.get('initialQuestion') || ''
    const name = sp.get('name') || ''

    const params = new URLSearchParams()
    params.set('name', name)
    params.set('birthDate', birthDate)
    params.set('birthTime', birthTime)
    params.set('city', cityName)
    params.set('gender', apiGender)
    params.set('lang', locale || 'ko')
    params.set('latitude', QUICK_MODE_DEFAULT_CITY.lat.toString())
    params.set('longitude', QUICK_MODE_DEFAULT_CITY.lon.toString())
    params.set('tz', QUICK_MODE_DEFAULT_CITY.timezone)
    params.set('userTz', QUICK_MODE_DEFAULT_CITY.timezone)
    params.set('theme', 'life')
    if (initialQuestion) params.set('initialQuestion', initialQuestion)
    router.replace(`/destiny-map/counselor?${params.toString()}`)
  }, [router, locale])

  return (
    <BrandSplash
      variant="light"
      message={locale === 'ko' ? '운명 상담사 준비 중…' : 'Preparing your counselor…'}
    />
  )
}
