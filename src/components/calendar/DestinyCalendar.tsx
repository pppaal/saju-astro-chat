'use client'

/**
 * DestinyCalendar - Main Calendar Component (Refactored)
 *
 * This component has been refactored to use modular sub-components and hooks
 * for better maintainability. The main logic is now split into:
 *
 * Sub-components:
 * - BirthInfoForm: Birth info input form with city search
 * - CalendarMainView: Main calendar view with all calendar features
 * - SelectedDatePanel: Selected date detail panel
 * - MonthHighlights: Monthly highlights section
 *
 * Hooks:
 * - useParticleAnimation: Particle background animation
 * - useCalendarData: Calendar data fetching with caching
 * - useSavedDates: Saved dates management
 * - useCitySearch: City search functionality
 * - useProfileLoader: Profile loading from DB
 * - useMonthNavigation: Month navigation logic
 */

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { logger } from '@/lib/logger'
import { normalizeGender, toLongGender } from '@/lib/utils/gender'
import { getUserProfile } from '@/lib/userProfile'
import { localizeStoredCity } from '@/lib/cities/formatter'

// Types
import type { EventCategory, ImportantDate, CalendarData, BirthInfo } from './types'

// Hooks
import { useParticleAnimation } from '@/hooks/calendar/useParticleAnimation'

// Sub-components
import BirthInfoForm from './BirthInfoForm'
import CalendarMainView from './CalendarMainView'
import { loadSharedBirthInfo, saveSharedBirthInfo } from './sharedBirthInfo'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'

// Utils
import { getCacheKey, getCachedData, setCachedData } from './cache-utils'

export default function DestinyCalendar() {
  return <DestinyCalendarContent />
}

const DestinyCalendarContent = memo(function DestinyCalendarContent() {
  const { locale } = useI18n()
  const { status } = useSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Core state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<EventCategory | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // UI state
  const [isDarkTheme] = useState(true)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

  // Birth info state
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: 'Male',
  })
  const [hasBirthInfo, setHasBirthInfo] = useState(false)

  // Save state
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Today memoization
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [today])

  // Particle animation (only when showing birth form)
  useParticleAnimation(canvasRef, { enabled: !hasBirthInfo })

  // Load saved profile on mount
  useEffect(() => {
    const sharedBirthInfo = loadSharedBirthInfo()
    if (sharedBirthInfo) {
      setBirthInfo((prev) => ({
        ...prev,
        ...sharedBirthInfo,
      }))
    }

    const profile = getUserProfile()
    if (profile.birthDate) {
      setBirthInfo((prev) => ({ ...prev, birthDate: profile.birthDate || '' }))
    }
    if (profile.birthTime) {
      setBirthInfo((prev) => ({ ...prev, birthTime: profile.birthTime || '' }))
    }
    if (profile.gender) {
      const longGender = toLongGender(profile.gender)
      if (longGender) {
        setBirthInfo((prev) => ({ ...prev, gender: longGender }))
      }
    }
    if (profile.birthCity) {
      setBirthInfo((prev) => ({
        ...prev,
        birthPlace: localizeStoredCity(profile.birthCity, locale === 'ko' ? 'ko' : 'en'),
      }))
    }
  }, [locale])

  // Load saved dates for authenticated users
  useEffect(() => {
    const loadSavedDates = async () => {
      if (status !== 'authenticated') {
        return
      }
      try {
        const res = await fetch(`/api/calendar/save?year=${year}`)
        if (res.ok) {
          const { savedDates: dates } = await res.json()
          setSavedDates(new Set(dates.map((d: { date: string }) => d.date)))
        }
      } catch (err) {
        logger.error('[DestinyCalendar] Failed to load saved dates:', err)
      }
    }
    loadSavedDates()
  }, [status, year])

  // Calendar data fetching
  const fetchCalendar = useCallback(
    async (birthData: BirthInfo) => {
      setLoading(true)
      setError(null)

      try {
        // Check cache first
        const cacheKey = getCacheKey(birthData, year, activeCategory)
        const cachedData = getCachedData(cacheKey)

        if (cachedData) {
          logger.debug('[Calendar] Cache HIT!', { year, category: activeCategory })
          setData(cachedData)
          setHasBirthInfo(true)
          setLoading(false)
          return
        }

        // Cache miss - fetch from API
        logger.debug('[Calendar] Cache MISS. Fetching from API...', {
          year,
          category: activeCategory,
        })

        const params = new URLSearchParams({ year: String(year), locale })
        if (activeCategory !== 'all') {
          params.set('category', activeCategory)
        }
        params.set('birthDate', birthData.birthDate)
        params.set('birthTime', birthData.birthTime)
        params.set('birthPlace', birthData.birthPlace)
        if (birthData.gender) {
          const apiGender = normalizeGender(birthData.gender)
          if (apiGender) {
            params.set('gender', apiGender)
          }
        }

        const res = await fetch(`/api/calendar?${params}`, {
          headers: {
            'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          },
        })
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || json.message || 'Failed to load calendar')
        } else {
          setData(json)
          setHasBirthInfo(true)
          setCachedData(cacheKey, birthData, year, activeCategory, json)
          logger.debug('[Calendar] Data cached successfully', { year, category: activeCategory })
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading calendar')
      } finally {
        setLoading(false)
      }
    },
    [year, activeCategory, locale]
  )

  // Refetch when year/category changes
  useEffect(() => {
    if (hasBirthInfo && birthInfo.birthDate) {
      fetchCalendar(birthInfo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, activeCategory])

  // Auto-select today after data loads
  useEffect(() => {
    if (data?.allDates && !selectedDay) {
      const todayInfo = data.allDates.find((d) => d.date === todayStr)
      setSelectedDay(today)
      if (todayInfo) {
        setSelectedDate(todayInfo)
      }
    }
  }, [data, selectedDay, today, todayStr])

  // Form submit handler
  const handleBirthInfoSubmit = (submittedInfo: BirthInfo) => {
    if (!submittedInfo.birthDate || !submittedInfo.birthPlace) {
      setError(
        locale === 'ko' ? '생년월일과 출생지를 입력해주세요' : 'Please enter birth date and city'
      )
      return
    }

    const normalizedBirthInfo: BirthInfo = {
      ...submittedInfo,
      birthTime: submittedInfo.birthTime || '12:00',
    }

    setBirthInfo(normalizedBirthInfo)
    saveSharedBirthInfo(normalizedBirthInfo)
    fetchCalendar(normalizedBirthInfo)
  }

  // Date selection handler
  const handleDayClick = useCallback(
    (date: Date | null) => {
      if (!date) {
        return
      }
      setSelectedDay(date)

      if (!data?.allDates) {
        setSelectedDate(null)
        return
      }

      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      const info = data.allDates.find((item) => item.date === dateStr)
      setSelectedDate(info || null)
    },
    [data?.allDates]
  )

  // Month navigation handlers
  const prevMonth = useCallback(() => {
    setSlideDirection('right')
    setCurrentDate(new Date(year, month - 1, 1))
    setTimeout(() => setSlideDirection(null), 300)
  }, [year, month])

  const nextMonth = useCallback(() => {
    setSlideDirection('left')
    setCurrentDate(new Date(year, month + 1, 1))
    setTimeout(() => setSlideDirection(null), 300)
  }, [year, month])

  const goToToday = useCallback(() => {
    if (today.getMonth() > month || today.getFullYear() > year) {
      setSlideDirection('left')
    } else if (today.getMonth() < month || today.getFullYear() < year) {
      setSlideDirection('right')
    }
    setCurrentDate(new Date(today))
    setTimeout(() => setSlideDirection(null), 300)
  }, [today, month, year])

  const changeYear = useCallback(
    (nextYear: number) => {
      if (!Number.isFinite(nextYear)) {
        return
      }

      const clampedYear = Math.min(2100, Math.max(1900, Math.trunc(nextYear)))
      const direction = clampedYear > year ? 'left' : clampedYear < year ? 'right' : null

      if (direction) {
        setSlideDirection(direction)
      }
      setCurrentDate(new Date(clampedYear, month, 1))
      setTimeout(() => setSlideDirection(null), 300)
    },
    [month, year]
  )

  // Save/unsave handlers
  const handleSaveDate = async () => {
    if (!selectedDate || status !== 'authenticated') {
      return
    }

    setSaving(true)
    setSaveMsg(null)

    try {
      const res = await fetch('/api/calendar/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate.date,
          year,
          grade: selectedDate.grade,
          score: selectedDate.score,
          title: selectedDate.title,
          description: selectedDate.description,
          summary: selectedDate.summary,
          categories: selectedDate.categories,
          bestTimes: selectedDate.bestTimes,
          sajuFactors: selectedDate.sajuFactors,
          astroFactors: selectedDate.astroFactors,
          recommendations: selectedDate.recommendations,
          warnings: selectedDate.warnings,
          birthDate: birthInfo.birthDate,
          birthTime: birthInfo.birthTime,
          birthPlace: birthInfo.birthPlace,
          locale,
        }),
      })

      if (res.ok) {
        setSavedDates((prev) => new Set([...prev, selectedDate.date]))
        setSaveMsg(locale === 'ko' ? '저장되었습니다!' : 'Saved!')
      } else {
        const data = await res.json()
        setSaveMsg(data.error || (locale === 'ko' ? '저장 실패' : 'Save failed'))
      }
    } catch (err) {
      logger.error('[DestinyCalendar] Failed to save date:', err)
      setSaveMsg(locale === 'ko' ? '저장 실패' : 'Save failed')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 2000)
    }
  }

  const handleUnsaveDate = async () => {
    if (!selectedDate || status !== 'authenticated') {
      return
    }

    setSaving(true)
    setSaveMsg(null)

    try {
      const res = await fetch(`/api/calendar/save?date=${selectedDate.date}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSavedDates((prev) => {
          const newSet = new Set(prev)
          newSet.delete(selectedDate.date)
          return newSet
        })
        setSaveMsg(locale === 'ko' ? '삭제되었습니다!' : 'Removed!')
      } else {
        setSaveMsg(locale === 'ko' ? '삭제 실패' : 'Remove failed')
      }
    } catch (err) {
      logger.error('[DestinyCalendar] Failed to unsave date:', err)
      setSaveMsg(locale === 'ko' ? '삭제 실패' : 'Remove failed')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 2000)
    }
  }

  // ===== RENDER =====

  // Birth info form (before calendar data is loaded)
  if (!hasBirthInfo) {
    return (
      <BirthInfoForm canvasRef={canvasRef} birthInfo={birthInfo} onSubmit={handleBirthInfoSubmit} />
    )
  }

  // Loading state
  if (loading) {
    return <UnifiedServiceLoading kind="calendar" locale={locale === 'ko' ? 'ko' : 'en'} />
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>😢</div>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => setHasBirthInfo(false)}>
            {locale === 'ko' ? '다시 시도' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  // Main calendar view
  if (!data) {
    return null
  }

  return (
    <CalendarMainView
      data={data}
      birthInfo={birthInfo}
      currentDate={currentDate}
      selectedDay={selectedDay}
      selectedDate={selectedDate}
      activeCategory={activeCategory}
      isDarkTheme={isDarkTheme}
      slideDirection={slideDirection}
      savedDates={savedDates}
      saving={saving}
      saveMsg={saveMsg}
      onCategoryChange={setActiveCategory}
      onDayClick={handleDayClick}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
      onYearChange={changeYear}
      onGoToToday={goToToday}
      onSaveDate={handleSaveDate}
      onUnsaveDate={handleUnsaveDate}
    />
  )
})
