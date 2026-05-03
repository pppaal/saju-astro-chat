'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './DestinyCalendar.module.css'
import { CATEGORY_EMOJI, getGradeLabel as getGradeLabelFromConst, type CalendarLocale } from './constants'
import { parseLocalDate } from './utils'
import type { ImportantDate } from './types'
import { getPeakLabel, resolvePeakLevel } from './peakUtils'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface MonthHighlightsProps {
  allDates: ImportantDate[]
  year: number
  month: number
  onDateSelect: (date: Date, info: ImportantDate) => void
}

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const truncate = (text: string, len = 58) =>
  !text ? '' : text.length > len ? `${text.slice(0, len)}...` : text

const getStrategicGradeTitle = (grade: number, locale: CalendarLocale) =>
  getGradeLabelFromConst(grade, locale).full

export default function MonthHighlights({
  allDates,
  year,
  month,
  onDateSelect,
}: MonthHighlightsProps) {
  const { locale } = useI18n()
  const { data: session, status } = useSession()
  const activeLocale = locale === 'ko' ? 'ko' : 'en'
  const months = activeLocale === 'ko' ? MONTHS_KO : MONTHS_EN

  // Monthly AI narrative state — same pattern as the daily one in
  // SelectedDatePanel: lazy-load on click, premium gate, cached server-
  // side. Reset whenever month or year changes.
  const [monthlyAi, setMonthlyAi] = useState<string>('')
  const [monthlyAiLoading, setMonthlyAiLoading] = useState(false)
  const [monthlyAiError, setMonthlyAiError] = useState<string>('')
  const userPlan = ((session?.user as { plan?: string } | undefined)?.plan || 'free').toLowerCase()
  const isPremiumUser = userPlan !== 'free' && status === 'authenticated'
  useEffect(() => {
    setMonthlyAi('')
    setMonthlyAiError('')
    setMonthlyAiLoading(false)
  }, [year, month])

  const monthDates = allDates.filter((d) => parseLocalDate(d.date).getMonth() === month)
  const strongDates = monthDates
    .filter((d) => d.grade <= 2)
    .sort((a, b) => a.grade - b.grade || b.score - a.score)
    .slice(0, 3)
  const guardedDates = monthDates
    .filter((d) => d.grade >= 3)
    .sort((a, b) => b.grade - a.grade || a.score - b.score)
    .slice(0, 2)

  const highlightDates = [...strongDates, ...guardedDates].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  )

  if (highlightDates.length === 0) return null

  const getGradeClass = (grade: number) => {
    switch (grade) {
      case 0:
        return styles.grade0
      case 1:
        return styles.grade1
      case 2:
        return styles.grade2
      case 3:
        return styles.grade3
      case 4:
        return styles.grade4
      default:
        return styles.grade5
    }
  }

  // Track text we've already shown so each card carries a distinct sentence.
  // Without this every card collapses onto the same template phrase
  // ("커리어 쪽은 변동성이 있어 …") because the upstream signal generator
  // often emits one canned summary per domain — feeling like lazy advice.
  const usedReasons = new Set<string>()
  const usedActions = new Set<string>()
  const pickFresh = (used: Set<string>, candidates: Array<string | undefined | null>): string => {
    for (const raw of candidates) {
      const v = String(raw || '').trim()
      if (!v) continue
      if (used.has(v)) continue
      used.add(v)
      return v
    }
    // Fall back to the first non-empty candidate even if duplicate, so the
    // card never goes empty.
    for (const raw of candidates) {
      const v = String(raw || '').trim()
      if (v) return v
    }
    return ''
  }

  const handleLoadMonthlyAi = async () => {
    setMonthlyAiLoading(true)
    setMonthlyAiError('')
    try {
      const payload = {
        topGoodDays: strongDates.map((d) => ({
          date: d.date,
          grade: d.grade,
          score: d.score,
          summary: d.summary || d.title,
          sajuFactor: d.sajuFactors?.[0],
          astroFactor: d.astroFactors?.[0],
        })),
        topCautionDays: guardedDates.map((d) => ({
          date: d.date,
          grade: d.grade,
          score: d.score,
          summary: d.summary || d.title,
          warning: d.warnings?.[0],
        })),
        monthAverage: Math.round(
          monthDates.reduce((s, d) => s + d.score, 0) / Math.max(monthDates.length, 1)
        ),
        gradeCounts: {
          peak: monthDates.filter((d) => d.grade === 0).length,
          great: monthDates.filter((d) => d.grade === 1).length,
          normal: monthDates.filter((d) => d.grade === 2).length,
          caution: monthDates.filter((d) => d.grade === 3).length,
          hold: monthDates.filter((d) => d.grade === 4).length,
        },
        sample: monthDates.slice(0, 5).map((d) => ({
          date: d.date,
          grade: d.grade,
          longCycleContext: d.longCycleContext,
        })),
      }
      const res = await fetch('/api/calendar/ai-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month: month + 1, payload }),
      })
      const data = await res.json()
      if (!res.ok || !data?.data?.narrative) {
        setMonthlyAiError(
          data?.error?.message ||
            (activeLocale === 'ko' ? '월간 AI 풀이를 불러올 수 없어요.' : 'Monthly AI unavailable.')
        )
      } else {
        setMonthlyAi(String(data.data.narrative).trim())
      }
    } catch {
      setMonthlyAiError(
        activeLocale === 'ko' ? '월간 AI 풀이 요청 실패' : 'Monthly AI request failed'
      )
    } finally {
      setMonthlyAiLoading(false)
    }
  }

  return (
    <div className={styles.monthHighlights}>
      <h2 className={styles.highlightsTitle}>
        🌟 {year} {months[month]} {activeLocale === 'ko' ? '운영 포인트' : 'Operating Highlights'}
      </h2>

      {/* ── Monthly AI 풀이 (premium) ───────────────────── */}
      <div
        style={{
          margin: '8px 0 14px',
          padding: '10px 12px',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 12,
          background: 'rgba(120,90,30,0.08)',
        }}
      >
        <div style={{ fontSize: '0.92em', fontWeight: 600, opacity: 0.9 }}>
          ✨ {activeLocale === 'ko' ? '이 달 AI 풀이' : 'Monthly AI Reading'}
        </div>
        {monthlyAi && (
          <p
            style={{
              marginTop: 6,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: '0.92em',
            }}
          >
            {monthlyAi}
          </p>
        )}
        {!monthlyAi && !monthlyAiLoading && !monthlyAiError && isPremiumUser && (
          <button
            onClick={handleLoadMonthlyAi}
            style={{
              marginTop: 6,
              padding: '7px 12px',
              border: '1px solid rgba(251,191,36,0.5)',
              borderRadius: 10,
              background: 'rgba(251,191,36,0.15)',
              color: '#fbbf24',
              cursor: 'pointer',
              fontSize: '0.88em',
              fontWeight: 600,
            }}
          >
            {activeLocale === 'ko' ? '이 달 풀어 보기' : 'Generate monthly reading'}
          </button>
        )}
        {monthlyAiLoading && (
          <p style={{ marginTop: 6, fontSize: '0.88em', opacity: 0.7 }}>
            {activeLocale === 'ko' ? '한 달 흐름을 풀어내는 중…' : 'Synthesizing the month…'}
          </p>
        )}
        {monthlyAiError && (
          <p style={{ marginTop: 6, fontSize: '0.88em', color: '#fca5a5' }}>{monthlyAiError}</p>
        )}
        {!isPremiumUser && (
          <p style={{ marginTop: 6, fontSize: '0.85em', opacity: 0.75 }}>
            {activeLocale === 'ko'
              ? '프리미엄 플랜에서 한 달 흐름을 한 단락 한국어로 풀어드립니다.'
              : 'Premium plan synthesizes the month into one Korean paragraph.'}
          </p>
        )}
      </div>

      <div className={styles.highlightsList}>
        {highlightDates.map((dateInfo, index) => {
          const peakLevel = resolvePeakLevel(dateInfo.evidence?.matrix?.peakLevel, dateInfo.score)
          const reason = pickFresh(usedReasons, [
            dateInfo.summary,
            dateInfo.evidence?.cross?.sajuEvidence,
            dateInfo.sajuFactors?.[0],
            dateInfo.sajuFactors?.[1],
            dateInfo.astroFactors?.[0],
            dateInfo.astroFactors?.[1],
            dateInfo.evidence?.cross?.astroEvidence,
          ])
          const action =
            dateInfo.grade >= 3
              ? pickFresh(usedActions, [
                  dateInfo.warnings?.[0],
                  dateInfo.warnings?.[1],
                  activeLocale === 'ko'
                    ? '속도를 낮추고 확인 절차를 먼저 거치세요.'
                    : 'Slow down and run checks first.',
                ])
              : pickFresh(usedActions, [
                  dateInfo.recommendations?.[0],
                  dateInfo.recommendations?.[1],
                  dateInfo.recommendations?.[2],
                  activeLocale === 'ko'
                    ? '핵심 과제 1~2개를 앞단에 배치하세요.'
                    : 'Front-load one or two key tasks.',
                ])

          return (
            <div
              key={index}
              className={`${styles.highlightCard} ${getGradeClass(dateInfo.grade)}`}
              onClick={() => onDateSelect(parseLocalDate(dateInfo.date), dateInfo)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onDateSelect(parseLocalDate(dateInfo.date), dateInfo)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${parseLocalDate(dateInfo.date).getDate()}${activeLocale === 'ko' ? '일' : ''} - ${repairMojibakeText(dateInfo.title || getStrategicGradeTitle(dateInfo.grade, activeLocale))}, ${activeLocale === 'ko' ? '점수' : 'score'}: ${dateInfo.score}`}
            >
              <div className={styles.highlightHeader}>
                <span className={styles.highlightDate}>
                  {parseLocalDate(dateInfo.date).getDate()}
                  {activeLocale === 'ko' ? '일' : ''}
                </span>
                <div className={styles.highlightBadges}>
                  {peakLevel && (
                    <span className={styles.highlightPeakBadge}>
                      {getPeakLabel(peakLevel, activeLocale)}
                    </span>
                  )}
                  {((dateInfo.sajuFactors && dateInfo.sajuFactors.length > 0) ||
                    (dateInfo.astroFactors && dateInfo.astroFactors.length > 0)) && (
                    <span
                      className={styles.highlightBadge}
                      title={activeLocale === 'ko' ? '근거 반영됨' : 'Evidence included'}
                    >
                      ✨
                    </span>
                  )}
                </div>
              </div>
              <span className={styles.highlightTitle}>
                {repairMojibakeText(
                  dateInfo.title || getStrategicGradeTitle(dateInfo.grade, activeLocale)
                )}
              </span>
              {dateInfo.categories && dateInfo.categories.length > 0 && (
                <span className={styles.highlightEmojis}>
                  {dateInfo.categories
                    .slice(0, 2)
                    .map((category) => CATEGORY_EMOJI[category] || '')
                    .join(' ')}
                </span>
              )}
              <span className={styles.highlightScore}>
                {activeLocale === 'ko' ? '점수' : 'Score'}: {dateInfo.score}
              </span>
              {reason && (
                <div className={styles.highlightReason}>
                  {truncate(repairMojibakeText(reason), 52)}
                </div>
              )}
              {action && (
                <div className={styles.highlightAction}>
                  {truncate(repairMojibakeText(action), 52)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
