'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'
import { localizeStoredCity } from '@/lib/cities/formatter'
import BrandSplash from '@/components/branding/BrandSplash'

/**
 * Report entry — sends the user straight into their free report.
 *
 * Birth info arrives either as URL params (home chips deep-link with
 * birthDate/birthTime/gender/birthCity) or from localStorage (collected
 * once on the home modal). We resolve it, default coords/timezone to
 * Seoul when only a city is known, and forward to the result page so the
 * report renders immediately. With no birth info we bounce to the home
 * modal to collect it, then come back.
 */
export default function ReportPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const { locale } = useI18n()
  const lang = locale === 'en' ? 'en' : 'ko'

  useEffect(() => {
    const get = (k: string) => sp?.get(k)?.trim() || ''

    const goToResult = (info: {
      birthDate: string
      birthTime: string
      city: string
      gender: 'M' | 'F'
      latitude: number
      longitude: number
      timezone: string
    }) => {
      const params = new URLSearchParams()
      params.set('birthDate', info.birthDate)
      params.set('birthTime', info.birthTime)
      params.set('city', info.city)
      params.set('gender', info.gender)
      params.set('latitude', String(info.latitude))
      params.set('longitude', String(info.longitude))
      params.set('userTz', info.timezone)
      params.set('lang', lang)
      params.set('theme', get('theme') || 'focus_love')
      router.replace(`/destiny-map/result?${params.toString()}`)
    }

    const defaultCity = lang === 'ko' ? '서울' : 'Seoul'
    const latParam = get('latitude') || get('lat')
    const lonParam = get('longitude') || get('lon')

    // 1) Birth info passed in the URL (home chip deep-links).
    const urlBirthDate = get('birthDate')
    if (urlBirthDate) {
      const urlGender = get('gender')
      goToResult({
        birthDate: urlBirthDate,
        birthTime: get('birthTime') || '12:00',
        city: get('birthCity') || get('city') || defaultCity,
        gender: urlGender === 'F' || urlGender === 'Female' || urlGender === 'female' ? 'F' : 'M',
        latitude: latParam ? Number(latParam) : 37.5665,
        longitude: lonParam ? Number(lonParam) : 126.978,
        timezone: get('userTz') || get('timezone') || 'Asia/Seoul',
      })
      return
    }

    // 2) Birth info saved once on the home modal.
    const home = getStoredBirthInfo()
    if (home?.birthDate) {
      goToResult({
        birthDate: home.birthDate,
        birthTime: home.birthTime || '12:00',
        city: home.city ? localizeStoredCity(home.city, lang) : defaultCity,
        gender: home.gender === 'female' ? 'F' : 'M',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      })
      return
    }

    // 3) Nothing yet — collect birth info on the home modal, then return.
    router.replace('/?openBirth=1&next=/report')
  }, [sp, router, lang])

  return (
    <BrandSplash message={lang === 'ko' ? '리포트 준비 중…' : 'Preparing your report…'} />
  )
}
