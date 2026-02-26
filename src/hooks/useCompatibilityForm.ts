import { useState, useEffect, useCallback } from 'react'
import { getUserTimezone } from '@/lib/Saju/timezone'
import { formatCityForDropdown } from '@/lib/cities/formatter'
import type { PersonForm, CityItem, Relation } from '@/app/compatibility/lib'
import { makeEmptyPerson } from '@/app/compatibility/lib'

export function useCompatibilityForm(initialCount: number = 2, locale: 'ko' | 'en' = 'ko') {
  const [count, setCount] = useState<number>(initialCount)
  const [persons, setPersons] = useState<PersonForm[]>([
    makeEmptyPerson({ name: '' }),
    makeEmptyPerson({ name: '', relation: 'lover' }),
  ])

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
          if (rel === 'partner') {
            return 'lover'
          }
          if (rel === 'friend') {
            return 'friend'
          }
          return 'other'
        }
        next[personIdx] = {
          ...next[personIdx],
          name: savedPerson.name,
          date: savedPerson.birthDate || '',
          time: savedPerson.birthTime || '',
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
