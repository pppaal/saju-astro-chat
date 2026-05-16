import { useState, useEffect, useCallback } from 'react'
import { getUserTimezone } from '@/lib/saju/timezone'
import { formatCityForDropdown, localizeStoredCity } from '@/lib/cities/formatter'
import type { PersonForm, CityItem, Relation } from '@/app/compatibility/lib'
import { makeEmptyPerson } from '@/app/compatibility/lib'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

export function useCompatibilityForm(initialCount: number = 2, locale: 'ko' | 'en' = 'ko') {
  const [count, setCount] = useState<number>(initialCount)
  const [persons, setPersons] = useState<PersonForm[]>([
    makeEmptyPerson({ name: '' }),
    makeEmptyPerson({ name: '', relation: 'lover' }),
  ])

  // Auto-fill Person 1 from the home birth-info storage so the user
  // doesn't have to retype info they already entered. Only fills empty
  // fields — never overwrites manual edits.
  useEffect(() => {
    const home = getStoredBirthInfo()
    if (!home?.birthDate) return
    setPersons((prev) => {
      const p1 = prev[0]
      if (p1.date) return prev // already set, don't clobber
      const next = [...prev]
      next[0] = {
        ...p1,
        date: home.birthDate,
        time: home.birthTime || '',
        gender: home.gender === 'female' ? 'F' : 'M',
        cityQuery: home.city ? localizeStoredCity(home.city, locale) : p1.cityQuery,
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
