'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import BirthInfoForm from '../BirthInfoForm'
import type { BirthInfo } from '../types'
import styles from '../DestinyCalendar.module.css'
import { loadSharedBirthInfo, saveSharedBirthInfo } from '../sharedBirthInfo'
import { matrixSummaryToCalendarEvents, type CalendarEvent } from './matrixToCalendarEvents'
import type { DomainKey, DomainScore, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'

type MatrixSummaryResponse = {
  domainScores?: Record<DomainKey, DomainScore>
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
  calendarSignals?: Array<{
    level: 'high' | 'medium' | 'caution'
    trigger: string
    score: number
  }>
  confidenceScore?: number
  drivers?: string[]
  cautions?: string[]
  alignmentScore?: number
  timeOverlapWeight?: number
}

type MatrixApiResponse = {
  success?: boolean
  error?: string
  summary?: MatrixSummaryResponse
}

function toApiGender(gender: BirthInfo['gender']): 'male' | 'female' {
  return gender === 'Female' ? 'female' : 'male'
}

function monthLabel(month: string): string {
  const [year, mm] = month.split('-')
  return `${year}-${mm}`
}

export default function MatrixPeaksCalendar() {
  const { locale } = useI18n()
  const [birthInfo, setBirthInfo] = useState<BirthInfo>(() => {
    const shared = loadSharedBirthInfo()
    if (shared) {
      return shared
    }
    return {
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      gender: 'Male',
      timezone: undefined,
    }
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<MatrixSummaryResponse | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const hasAutoSubmitted = useRef(false)

  const groupedByMonth = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const list = grouped.get(event.month) || []
      list.push(event)
      grouped.set(event.month, list)
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [events])

  const handleSubmit = useCallback(
    async (info: BirthInfo) => {
      setBirthInfo(info)
      saveSharedBirthInfo(info)
      setSubmitted(true)
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/destiny-matrix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            birthDate: info.birthDate,
            birthTime: info.birthTime || '12:00',
            gender: toApiGender(info.gender),
            timezone: info.timezone || 'Asia/Seoul',
            lang: locale === 'ko' ? 'ko' : 'en',
          }),
        })

        const payload = (await res.json()) as MatrixApiResponse
        if (!res.ok || !payload.summary) {
          setError(payload.error || 'Failed to load matrix peaks.')
          setSummary(null)
          setEvents([])
          return
        }

        const nextEvents = matrixSummaryToCalendarEvents(
          payload.summary,
          undefined,
          locale === 'ko' ? 'ko' : 'en'
        )
        setSummary(payload.summary)
        setEvents(nextEvents)
      } catch (err) {
        setSummary(null)
        setEvents([])
        setError(err instanceof Error ? err.message : 'Request failed.')
      } finally {
        setLoading(false)
      }
    },
    [locale]
  )

  useEffect(() => {
    if (submitted || hasAutoSubmitted.current) {
      return
    }
    if (!birthInfo.birthDate || !birthInfo.birthPlace) {
      return
    }
    hasAutoSubmitted.current = true
    void handleSubmit(birthInfo)
  }, [birthInfo, handleSubmit, submitted])

  if (!submitted) {
    return <BirthInfoForm birthInfo={birthInfo} onSubmit={handleSubmit} />
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{locale === 'ko' ? '피크 구간 계산 중...' : 'Calculating matrix peaks...'}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => setSubmitted(false)}>
            {locale === 'ko' ? '다시 시도' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.matrixPeaksWrap}>
        <div className={styles.matrixPeaksHeaderRow}>
          <div>
            <h2 className={styles.matrixPeaksTitle}>Matrix Peaks</h2>
            <p className={styles.matrixPeaksSubtitle}>
              {locale === 'ko'
                ? '앞으로 12개월의 7일 피크 구간을 보여줍니다. (데일리 입력 정보와 연동)'
                : 'Shows 7-day windows for the next 12 months. (Reuses your daily input)'}
            </p>
          </div>
          <button className={styles.retryBtn} onClick={() => setSubmitted(false)}>
            {locale === 'ko' ? '출생정보 수정' : 'Edit birth info'}
          </button>
        </div>

        {summary && (
          <div className={styles.matrixPeaksMeta}>
            <span>
              {locale === 'ko' ? '신뢰도' : 'Confidence'}{' '}
              {(summary.confidenceScore ?? 0).toFixed(2)}
            </span>
            <span>
              {locale === 'ko' ? '핵심 요인' : 'Drivers'}{' '}
              {(summary.drivers || []).slice(0, 2).join(' | ') || '-'}
            </span>
            <span>
              {locale === 'ko' ? '주의 요인' : 'Cautions'}{' '}
              {(summary.cautions || []).slice(0, 1).join(' | ') || '-'}
            </span>
          </div>
        )}

        {groupedByMonth.length === 0 ? (
          <div className={styles.emptyState}>
            {locale === 'ko'
              ? '피크 구간을 찾지 못했습니다. 다른 입력으로 다시 시도해보세요.'
              : 'No peak windows found. Try another input.'}
          </div>
        ) : (
          <div className={styles.matrixMonthList}>
            {groupedByMonth.map(([month, monthEvents]) => (
              <section key={month} className={styles.matrixMonthSection}>
                <h3 className={styles.matrixMonthTitle}>{monthLabel(month)}</h3>
                <div className={styles.matrixEventList}>
                  {monthEvents.map((event) => (
                    <article key={event.id} className={styles.matrixEventCard}>
                      <div className={styles.matrixEventTitleRow}>
                        <h4 className={styles.matrixEventTitle}>{event.title}</h4>
                        <span className={styles.matrixEventBadge}>{event.level.toUpperCase()}</span>
                      </div>
                      <p className={styles.matrixEventSubtitle}>{event.subtitle}</p>
                      <ul className={styles.matrixEventNotes}>
                        {event.notes.map((note) => (
                          <li key={`${event.id}-${note}`}>{note}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
