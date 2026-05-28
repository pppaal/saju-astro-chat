'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage';
import { localizeStoredCity } from '@/lib/cities/formatter';
import { normalizeGender } from '@/lib/utils/gender';
import BrandSplash from '@/components/branding/BrandSplash';

// Inlined from the deleted UnifiedBirthForm. This was the only remaining
// reference to that whole folder; keeping it here avoids a 500-line
// re-export shim just to ship a 9-field interface.
interface BirthInfo {
  birthDate: string
  birthTime: string
  gender?: 'M' | 'F' | 'Male' | 'Female'
  birthCity?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

/**
 * Free-report entry — used to render its own birth form, but every
 * other service now collects birth info on the home modal once. This
 * client just forwards to /destiny-map/result with the params it can
 * resolve (URL → home localStorage → home-modal redirect when empty).
 *
 * The result page already handles missing optional fields by erroring;
 * we default coords/timezone to Seoul so guest-flow data without a
 * geocoded city still produces a report instead of a hard error.
 */
export default function ThemeSelectClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { locale } = useI18n();

  const initialBirthInfo = (() => {
    const get = (k: string) => sp?.get(k) || ''
    const lat = get('latitude') || get('lat')
    const lon = get('longitude') || get('lon')
    return {
      birthDate: get('birthDate'),
      birthTime: get('birthTime'),
      birthCity: get('city'),
      latitude: lat ? Number(lat) : undefined,
      longitude: lon ? Number(lon) : undefined,
      timezone: get('userTz') || get('timezone'),
      gender: (get('gender') as 'M' | 'F' | 'Male' | 'Female') || undefined,
    } as Partial<BirthInfo>
  })()

  useEffect(() => {
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
      params.set('lang', locale === 'en' ? 'en' : 'ko')
      params.set('theme', 'focus_love')
      router.replace(`/destiny-map/result?${params.toString()}`)
    }

    if (initialBirthInfo.birthDate) {
      goToResult({
        birthDate: initialBirthInfo.birthDate,
        birthTime: initialBirthInfo.birthTime || '12:00',
        city: initialBirthInfo.birthCity || (locale === 'ko' ? '서울' : 'Seoul'),
        // Route every server/legacy gender shape through the central
        // normalizer so women whose profile was saved after zod
        // normalization (stored as 'female') don't fall back to 'M'.
        gender: normalizeGender(initialBirthInfo.gender) === 'female' ? 'F' : 'M',
        latitude: initialBirthInfo.latitude ?? 37.5665,
        longitude: initialBirthInfo.longitude ?? 126.978,
        timezone: initialBirthInfo.timezone || 'Asia/Seoul',
      })
      return
    }

    const home = getStoredBirthInfo()
    if (home?.birthDate) {
      goToResult({
        birthDate: home.birthDate,
        birthTime: home.birthTime || '12:00',
        city: home.city
          ? localizeStoredCity(home.city, locale === 'ko' ? 'ko' : 'en')
          : locale === 'ko'
            ? '서울'
            : 'Seoul',
        gender: normalizeGender(home.gender) === 'female' ? 'F' : 'M',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      })
      return
    }

    router.replace('/?openBirth=1&next=/destiny-map/theme')
  }, [initialBirthInfo, locale, router])

  return (
    <BrandSplash message={locale === 'ko' ? '무료 리포트 준비 중…' : 'Preparing your free report…'} />
  )
}
