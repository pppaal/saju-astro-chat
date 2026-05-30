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

  // 자동 채움 우선순위:
  //   - Person 1 (= 본인): 홈 birth-info 가 있으면 항상 우선. 없으면 직전
  //     페어[0]. 둘 다 없으면 빈 상태.
  //   - Person 2 (= 상대): 항상 빈 상태로 시작.
  //
  // 이전엔 Person 2 를 직전 페어[1] 로 자동 채웠는데, 사용자 피드백
  // "궁합폼에서 옛날 정보가 아직도 남음" — 폼을 다시 열 때마다 직전에 본
  // 상대 정보가 그대로 박혀 있어 매번 지우고 새로 입력해야 했다. 내 정보만
  // 살리고 상대는 비워서, 새 사람으로 보려는 흐름이 깔끔하게 시작되도록.
  // (직전 페어로 다시 보고 싶으면 채팅 화면 sticky 바의 "최근 본 관계" 에서
  // 한 번에 전환 가능 — localStorage 기록 자체는 그대로 유지된다.)
  //
  // Person 1 자동 채움도 사용자가 카드를 한 번이라도 만졌으면 (date 입력)
  // 덮어쓰지 않는다.
  useEffect(() => {
    const latest = getLatestPair()
    const home = getStoredBirthInfo()
    if (!latest && !home?.birthDate) return

    setPersons((prev) => {
      if (prev[0]?.date || prev[1]?.date) return prev

      const next = [...prev]

      // Person 1 — 홈 birth-info 우선, 없으면 페어[0].
      if (home?.birthDate && next[0]) {
        next[0] = {
          ...next[0],
          name: next[0].name || home.name || '',
          date: home.birthDate,
          time: home.birthTime || '',
          gender: home.gender === 'female' ? 'F' : 'M',
          cityQuery: home.city ? localizeStoredCity(home.city, locale) : next[0].cityQuery,
          lat: home.latitude ?? null,
          lon: home.longitude ?? null,
          timeZone: home.timeZone || getUserTimezone() || 'Asia/Seoul',
          timeUnknown: home.birthTimeUnknown,
        }
      } else if (latest?.persons[0] && next[0]) {
        const src = latest.persons[0]
        next[0] = {
          ...next[0],
          name: src.name,
          date: src.date,
          time: src.time,
          gender: src.gender,
          cityQuery: src.cityQuery
            ? localizeStoredCity(src.cityQuery, locale)
            : next[0].cityQuery,
          lat: src.lat,
          lon: src.lon,
          timeZone: src.timeZone || getUserTimezone() || 'Asia/Seoul',
          timeUnknown: src.timeUnknown,
        }
      }

      // Person 2 (= 상대) 는 의도적으로 자동 채움 안 함 — 항상 빈 칸으로 시작.

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
