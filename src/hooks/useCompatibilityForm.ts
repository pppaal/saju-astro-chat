import { useState, useEffect, useCallback } from 'react'
import { getUserTimezone } from '@/lib/saju/timezone'
import { formatCityForDropdown, localizeStoredCity } from '@/lib/cities/formatter'
import type { PersonForm, CityItem, Relation } from '@/app/compatibility/lib'
import { makeEmptyPerson, getLatestPair } from '@/app/compatibility/lib'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

export function useCompatibilityForm(initialCount: number = 2, locale: 'ko' | 'en' = 'ko') {
  const [count, setCount] = useState<number>(initialCount)
  const [persons, setPersons] = useState<PersonForm[]>([
    makeEmptyPerson({ name: '' }),
    makeEmptyPerson({ name: '', relation: 'lover' }),
  ])

  // 자동 채움 우선순위: (1) 직전에 본 페어(localStorage) > (2) 홈 birth-info
  // > (3) 빈 상태. 사용자가 카드를 한 번이라도 만졌으면(date 입력) 어떤
  // 자동 채움도 덮어쓰지 않는다.
  //
  // 페어 자동 채움이 우선인 이유: 궁합은 같은 두 사람을 반복해서 보는
  // 케이스가 압도적이라 매번 두 카드 다 다시 입력하는 게 번거롭다는 피드백.
  useEffect(() => {
    const latest = getLatestPair()
    const home = getStoredBirthInfo()
    if (!latest && !home?.birthDate) return

    setPersons((prev) => {
      // 사용자 이미 만진 경우 → 어떤 자동 채움도 X.
      if (prev[0]?.date || prev[1]?.date) return prev

      const next = [...prev]

      // (1) localStorage 페어 — 두 카드 동시에.
      if (latest) {
        const mapRel = (rel?: string): Relation | undefined => {
          if (!rel) return undefined
          if (rel === 'partner' || rel === 'lover') return 'lover'
          if (rel === 'spouse') return 'spouse'
          if (rel === 'family') return 'family'
          if (rel === 'sibling') return 'sibling'
          if (rel === 'friend') return 'friend'
          if (rel === 'colleague') return 'colleague'
          return 'other'
        }
        for (let i = 0; i < 2; i++) {
          const src = latest.persons[i]
          if (!src || !next[i]) continue
          next[i] = {
            ...next[i],
            name: src.name,
            date: src.date,
            time: src.time,
            gender: src.gender,
            cityQuery: src.cityQuery
              ? localizeStoredCity(src.cityQuery, locale)
              : next[i].cityQuery,
            lat: src.lat,
            lon: src.lon,
            timeZone: src.timeZone || getUserTimezone() || 'Asia/Seoul',
            relation: i > 0 ? mapRel(src.relation) : undefined,
            timeUnknown: src.timeUnknown,
          }
        }
        return next
      }

      // (2) home birth-info — person 1 만.
      if (home?.birthDate && next[0]) {
        next[0] = {
          ...next[0],
          name: next[0].name || home.name || '',
          date: home.birthDate,
          time: home.birthTime || '',
          gender: home.gender === 'female' ? 'F' : 'M',
          cityQuery: home.city ? localizeStoredCity(home.city, locale) : next[0].cityQuery,
        }
      }
      return next
    })
  }, [locale])

  // Adjust persons array when count changes
  useEffect(() => {
    setPersons((prev) => {
      const next = [...prev]
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          next.push(makeEmptyPerson({ name: '', relation: 'friend' }))
        }
      } else if (count < prev.length) {
        next.length = count
      }
      return next
    })
  }, [count])

  const updatePerson = useCallback(
    <K extends keyof PersonForm>(i: number, key: K, value: PersonForm[K]) => {
      setPersons((prev) => {
        const next = [...prev]
        next[i] = { ...next[i], [key]: value }
        return next
      })
    },
    []
  )

  const fillFromCircle = useCallback(
    (
      personIdx: number,
      savedPerson: {
        name: string
        birthDate?: string | null
        birthTime?: string | null
        gender?: string | null
        birthCity?: string | null
        latitude?: number | null
        longitude?: number | null
        tzId?: string | null
        relation: string
      }
    ) => {
      setPersons((prev) => {
        const next = [...prev]
        const mapRelation = (rel: string): Relation => {
          // Circle ("내 지인") uses a slightly different vocabulary —
          // most notably 'partner' for what the compat form calls
          // 'lover'. Map known synonyms straight through; anything
          // unfamiliar falls back to 'other' so the freeform
          // relationNote can still carry the detail.
          if (rel === 'partner' || rel === 'lover') return 'lover'
          if (rel === 'spouse') return 'spouse'
          if (rel === 'family') return 'family'
          if (rel === 'sibling') return 'sibling'
          if (rel === 'friend') return 'friend'
          if (rel === 'colleague') return 'colleague'
          return 'other'
        }
        const hasTime = !!(savedPerson.birthTime && savedPerson.birthTime !== '00:00')
        next[personIdx] = {
          ...next[personIdx],
          name: savedPerson.name,
          date: savedPerson.birthDate || '',
          // Force 00:00 when the Circle record has no real birth time so
          // downstream saju calc uses a stable anchor; the timeUnknown
          // flag below tells the counselor route to skip time-dependent
          // signals (siju / 일진 / ASC / MC / houses).
          time: hasTime ? savedPerson.birthTime! : '00:00',
          timeUnknown: !hasTime,
          gender:
            savedPerson.gender?.toLowerCase() === 'female' ||
            savedPerson.gender?.toLowerCase() === 'f'
              ? 'F'
              : 'M',
          cityQuery: savedPerson.birthCity || '',
          lat: savedPerson.latitude || null,
          lon: savedPerson.longitude || null,
          timeZone: savedPerson.tzId || getUserTimezone() || 'Asia/Seoul',
          relation: personIdx > 0 ? mapRelation(savedPerson.relation) : undefined,
        }
        return next
      })
    },
    []
  )

  const onPickCity = useCallback(
    (i: number, item: CityItem) => {
      const cityDisplay =
        locale === 'ko'
          ? item.displayKr || formatCityForDropdown(item.name, item.country, 'ko')
          : item.displayEn || formatCityForDropdown(item.name, item.country, 'en')

      setPersons((prev) => {
        const next = [...prev]
        next[i] = {
          ...next[i],
          cityQuery: cityDisplay,
          lat: item.lat,
          lon: item.lon,
          showDropdown: false,
          suggestions: [],
        }

        // Try to guess timezone
        try {
          const tzLookup = require('tz-lookup')
          const guessed = tzLookup(item.lat, item.lon)
          if (guessed && typeof guessed === 'string') {
            next[i].timeZone = guessed
          }
        } catch {
          /* keep previous timeZone */
        }

        return next
      })
    },
    [locale]
  )

  return {
    count,
    setCount,
    persons,
    setPersons,
    updatePerson,
    fillFromCircle,
    onPickCity,
  }
}
