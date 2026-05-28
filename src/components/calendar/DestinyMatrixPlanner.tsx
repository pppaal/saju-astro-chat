'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ScrollText,
  Activity,
  CalendarRange,
  Moon,
  Sun,
} from 'lucide-react'

import type { BirthInfo, CalendarData, ImportantDate } from './types'
import { ganjiToKorean } from '@/lib/saju/ganjiKo'
import { useDateDetail } from './useDateDetail'
import YearHighlightsCard from './YearHighlightsCard'
import YearDashboard from './premium/YearDashboard'
import MonthDashboard from './premium/MonthDashboard'
import DayInsights from './premium/shared/DayInsights'
import { tabVariants } from './premium/shared/motionVariants'
import { getGrade } from './scoreGrade'
import { getCalLabels, type CalLocale } from './premium/labels'

interface DestinyMatrixPlannerProps {
  /** Engine payload from /api/calendar. 없으면 카드들 자체 스킵 — fake 데이터 노출 X. */
  data?: CalendarData | null
  /** Birth info used to fetch `data`. Reserved for future real wiring. */
  birthInfo?: BirthInfo | null
  /** "올해 큰 날" — 메인 응답에서 분리해 지연 로드한 연간 수렴. */
  yearlyConvergence?: NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  /** 월별 요약(v2) — 연간 수렴과 함께 지연 로드. yearly 뷰 흐름·이유에 사용. */
  yearlyMonthly?: YearMonthly[]
  /** 사용자가 캐시된 연도 밖으로 이동했을 때 parent 가 재호출하도록 신호.
   *  Dec → 다음 달이 다음 해 1월이라 빈 그리드만 보이던 회귀 차단. */
  onYearChange?: (year: number) => void
  /** UI 라벨 locale */
  locale?: CalLocale
}

export type YearMonthly = {
  month: number
  score: number
  themes: Array<{ theme: 'love' | 'money' | 'career' | 'health' | 'growth'; score: number }>
  tone: 'up' | 'down' | 'flat'
}

type ViewMode = 'yearly' | 'monthly' | 'daily'

// --- Helpers ---
function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function pickFinalScore(d: ImportantDate): number {
  return d.displayScore ?? d.score
}

export default function DestinyMatrixPlanner({
  data,
  birthInfo,
  yearlyConvergence,
  yearlyMonthly,
  onYearChange,
  locale,
}: DestinyMatrixPlannerProps = {}) {
  const t = getCalLabels(locale)
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  // tab 전환 방향 — drill-down(년→달→일) 이면 'in' (zoom 1.06→1), 반대는 'out'.
  // setViewMode wrap 으로 비교 후 갱신.
  const [viewDirection, setViewDirection] = useState<'in' | 'out'>('in')
  const changeViewMode = useCallback((next: ViewMode) => {
    setViewMode((prev) => {
      const order: Record<ViewMode, number> = { yearly: 0, monthly: 1, daily: 2 }
      setViewDirection(order[next] >= order[prev] ? 'in' : 'out')
      return next
    })
  }, [])
  const [currentDay, setCurrentDay] = useState<number>(() => new Date().getDate())

  // --- View date (state — prev/next month 이동 가능) -------------------
  // API는 year 단위로 1년치 allDates를 한 번에 받으니 month 전환은 client-only.
  //
  // `today` 는 자정 롤오버를 따라가기 위해 1분 주기로 갱신 (5차 audit).
  // 이전엔 useMemo([], []) 라 컴포넌트 mount 시점에 락 → 자정 지나면 어제 점수가
  // "오늘" hero 에 박혀 있던 회귀.
  const [today, setToday] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const [viewDate, setViewDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() // 0-indexed

  // 연도 경계 — 사용자가 cached year (data.year) 밖으로 이동하면 parent 에
  // 새 연도 fetch 신호. 이전엔 Dec → 다음 달 가면 빈 그리드만 보이던 dead-end.
  useEffect(() => {
    if (data && data.year !== viewYear && onYearChange) {
      onYearChange(viewYear)
    }
  }, [viewYear, data, onYearChange])

  // ── "오늘" hero — 헤더 고정. 어느 뷰를 보든 항상 사용자가 "지금 무슨 날인지" 알 수 있게.
  //    탭하면 daily 뷰로 점프(currentDay/viewDate 동기). 데이터 없으면 hero 숨김.
  const todayStr = useMemo(() => {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [today])
  const todayWeekday = useMemo(() => {
    return t.weekdayShort[today.getDay()]
  }, [today, t])
  const todayHero = useMemo(() => {
    const d = data?.allDates?.find((x) => x.date === todayStr)
    if (!d) return null
    const score = Math.round(pickFinalScore(d))
    const grade = getGrade(score)
    const oneLine =
      data?.calendarDailyView?.date === todayStr
        ? (data.calendarDailyView.oneLineSummary ?? null)
        : (d.summary ?? null)
    return { score, grade, oneLine }
  }, [data, todayStr])
  const handleHeroClick = useCallback(() => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setCurrentDay(now.getDate())
    changeViewMode('daily')
  }, [changeViewMode])

  const goToPrevMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    setCurrentDay(1)
  }, [])
  const goToNextMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    setCurrentDay(1)
  }, [])
  const goToThisMonth = useCallback(() => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setCurrentDay(now.getDate())
  }, [])
  const isThisMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const monthLabel = useMemo(() => {
    const labels = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    return `${labels[viewMonth]} ${viewYear}`
  }, [viewMonth, viewYear])

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth]
  )
  const leadingBlanks = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth]
  )

  // --- Engine-derived: natal day pillar (header badge) ----------------
  const natalSaju = useMemo(
    () => data?.allDates?.find((d) => d.natalSaju)?.natalSaju ?? null,
    [data]
  )
  const natalDayPillar = useMemo(() => {
    if (!natalSaju) return null
    return `${natalSaju.dayStem}${natalSaju.dayBranch}`
  }, [natalSaju])

  // --- Engine-derived: this month's dates -----------------------------
  const monthDates = useMemo<ImportantDate[]>(() => {
    if (!data?.allDates) return []
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`
    return data.allDates.filter((d) => d.date.startsWith(prefix))
  }, [data, viewYear, viewMonth])

  // 일자 → 등급 키 룩업 — 셀 히트맵 배경에 사용. 같은 cutoff(getGrade,
  // 절대 57/43, scoreGrade.ts)라 MonthHighlightsCard/Daily 라벨과 색 의미 일관.
  const dayGradeMap = useMemo(() => {
    const out = new Map<number, 'lucky' | 'neutral' | 'unlucky'>()
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      out.set(day, getGrade(pickFinalScore(d)).key)
    }
    return out
  }, [monthDates])

  const monthlySummaryText =
    data?.monthSummary?.summary ?? data?.calendarMonthView?.oneLineSummary ?? null

  const monthScore = useMemo(() => {
    if (monthDates.length === 0) return null
    return Math.round(avg(monthDates.map(pickFinalScore)))
  }, [monthDates])

  const phaseLabel =
    data?.matrixContract?.overallPhaseLabel ?? data?.matrixContract?.overallPhase ?? null

  // --- Engine-derived: selected day -----------------------------------
  const selectedDateStr = useMemo(
    () =>
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`,
    [viewYear, viewMonth, currentDay]
  )

  const selectedImportantDate = useMemo(() => {
    if (!data?.allDates) return null
    return data.allDates.find((d) => d.date === selectedDateStr) ?? null
  }, [data, selectedDateStr])

  // ── fusion 엔진 (date-detail) — 선택 날짜 1번만 호출 ──
  const selectedDayDate = useMemo(
    () => new Date(viewYear, viewMonth, currentDay),
    [viewYear, viewMonth, currentDay]
  )
  const { detail: dateDetail } = useDateDetail({
    selectedDay: selectedDayDate,
    birthInfo: birthInfo ?? { birthDate: '', birthTime: '', birthPlace: '', gender: 'Male' },
  })
  const fusion = dateDetail?.fusion

  // dailyIndices (총점·연애·재물·건강 3-bar 백킹) 는 day tier ThemeRadar 도입으로
  // 사용처 사라져 제거. 점수는 sticky today hero 가, 도메인 분포는 ThemeRadar 가 표시.

  // --- Daily best/worst hours (engine-precise, 24-hour analysis) -------
  // 엔진은 selectedDate가 *오늘*일 때만 시간대 분석을 yearly 응답에 끼워
  // 보낸다 (`todayHourlyTimeSlots`). 다른 날짜는 자체 hourlyTimeSlots
  // 필드가 차 있을 때만 노출 — 그 외엔 placeholder로 정직하게 비운다.
  const dailyHourlySlots = useMemo(() => {
    // fusion 우선 — 24슬롯 정밀 분석
    if (fusion?.hourly) {
      return {
        best: fusion.hourly.bestHours.slice(0, 4).map((s) => ({
          hour: s.hour,
          score: s.score,
          reason: [
            s.topDomain ?? '',
            s.hourPillar ? `시주 ${s.hourPillar}` : '',
            s.planetaryHour ?? '',
          ]
            .filter(Boolean)
            .join(' · '),
        })),
        worst: fusion.hourly.worstHours.slice(0, 2).map((s) => ({
          hour: s.hour,
          score: s.score,
          reason: [s.hourPillar ? `시주 ${s.hourPillar}` : '', s.planetaryHour ?? '']
            .filter(Boolean)
            .join(' · '),
        })),
      }
    }
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isToday = selectedDateStr === todayStr
    if (isToday && data?.todayHourlyTimeSlots) {
      return data.todayHourlyTimeSlots
    }
    return null
  }, [fusion, today, selectedDateStr, data])

  // Day tier ThemeRadar — 5 도메인. year/month 와 같은 축 순서로 통일해
  // 미니멀 모드: day radar / day highlights / dailyDos / dailyDonts memo 제거.
  // 사용자 cut 요청 — 본질만 (sticky hero + one-line + 추진/보류 chip + 24h chart +
  // best/worst hour 2-카드) 만 유지.

  // --- Daily one-line summary (engine pre-formatted, when available) ---
  const dailyOneLineSummary = useMemo(() => {
    if (
      data?.calendarDailyView &&
      data.calendarDailyView.date === selectedDateStr &&
      data.calendarDailyView.oneLineSummary
    ) {
      return data.calendarDailyView.oneLineSummary
    }
    // fusion 사람말 신호 (legacy 없을 때만 fallback — 이미 다른 곳에 narrative 있으면 중복 피함)
    if (fusion && !selectedImportantDate?.summary) {
      const { agreement, confidence, overallScore } = fusion
      if (agreement < 55)
        return confidence > 40 ? '사주와 점성이 갈리는 날 — 분별 필요' : '신호가 흐릿한 날'
      if (overallScore >= 70 && confidence >= 45) return '아주 좋은 날 — 사주·점성 모두 우호'
      if (overallScore >= 60) return '잔잔하게 우호적인 흐름'
      if (overallScore <= 30 && confidence >= 45) return '주의일 — 사주·점성 모두 신중'
      if (overallScore <= 40) return '조금 부담되는 결'
      return '평이한 흐름'
    }
    return selectedImportantDate?.summary ?? null
  }, [fusion, data, selectedDateStr, selectedImportantDate])

  // --- Astro identity badge for the header ---------------------------
  // 풀 차트가 들어오면 ASC, 없으면 태양 별자리. ko 시 한글 별자리명, en 시 영어 원문.
  const astroBadge = useMemo(() => {
    const id = data?.astroIdentity
    if (!id) return null
    const ZODIAC_KO: Record<string, string> = {
      Aries: '양자리',
      Taurus: '황소자리',
      Gemini: '쌍둥이자리',
      Cancer: '게자리',
      Leo: '사자자리',
      Virgo: '처녀자리',
      Libra: '천칭자리',
      Scorpio: '전갈자리',
      Sagittarius: '사수자리',
      Capricorn: '염소자리',
      Aquarius: '물병자리',
      Pisces: '물고기자리',
    }
    const localized = (sign: string) => (locale === 'en' ? sign : (ZODIAC_KO[sign] ?? sign))
    if (id.ascendantSign) {
      return { label: `${localized(id.ascendantSign)} ASC`, kind: 'asc' as const }
    }
    if (id.sunSign) {
      const suffix = locale === 'en' ? 'Sun' : '☉'
      return { label: `${localized(id.sunSign)} ${suffix}`, kind: 'sun' as const }
    }
    return null
  }, [data, locale])

  const handlePrevDay = () => setCurrentDay((prev) => (prev > 1 ? prev - 1 : daysInMonth))
  const handleNextDay = () => setCurrentDay((prev) => (prev < daysInMonth ? prev + 1 : 1))

  const handleDayClick = (day: number) => {
    setCurrentDay(day)
    changeViewMode('daily')
  }

  // 올해 큰 날에서 날짜 클릭 — 그 달로 이동 후 daily 뷰
  const handleDateClick = (iso: string) => {
    const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10))
    if (!y || !m || !d) return
    setViewDate(new Date(y, m - 1, 1))
    setCurrentDay(d)
    changeViewMode('daily')
  }

  const getDayOfWeek = (day: number) => t.weekdayFull[new Date(viewYear, viewMonth, day).getDay()]

  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col shadow-2xl overflow-hidden relative border-x border-zinc-900">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-900/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

      {/* --- Header --- */}
      <div className="px-6 pt-12 pb-4 shrink-0 relative z-20 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          {/* 사주 일주/점성 자리 — 데이터 있을 때만 표시. fake fallback '辛未'
              제거 (예전엔 특정인 사주를 모두에게 노출하던 회귀). */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium flex-wrap min-w-0">
            {natalDayPillar && (
              <span className="inline-flex items-center gap-1 text-amber-300/85">
                <Sun className="w-3 h-3" />
                {locale === 'en'
                  ? `${natalDayPillar} pillar`
                  : `${ganjiToKorean(natalDayPillar)} 일주`}
              </span>
            )}
            {natalDayPillar && astroBadge && <span className="text-zinc-700">·</span>}
            {astroBadge && (
              <span className="inline-flex items-center gap-1 text-cyan-300/85">
                <Moon className="w-3 h-3" />
                {astroBadge.label}
              </span>
            )}
          </div>

          <button
            onClick={() => changeViewMode('monthly')}
            className="px-3 py-2 bg-zinc-900/80 rounded-xl border border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all shadow-lg flex items-center gap-1.5 text-sm font-bold"
            aria-label={t.calendarTabAria}
          >
            <Calendar className="w-4 h-4" />
            캘린더
          </button>
        </div>

        {/* "오늘" Hero — 헤더 sticky, 모든 뷰 위. 디자인 시스템 토큰(heroBgClass +
            heroShadowClass + emoji)으로 시각 임팩트 풀로. 점수는 text-5xl 큰 글자. */}
        {todayHero && (
          <button
            onClick={handleHeroClick}
            className={`w-full text-left mb-3 rounded-2xl border ${todayHero.grade.borderClass} ${todayHero.grade.heroBgClass} ${todayHero.grade.heroShadowClass} px-4 py-3.5 flex items-center gap-4 hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
            aria-label={t.heroAria}
          >
            <span className="text-4xl shrink-0 leading-none" aria-hidden>
              {todayHero.grade.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <span
                  className={`text-4xl sm:text-5xl font-black tabular-nums ${todayHero.grade.colorClass}`}
                >
                  {todayHero.score}
                </span>
                <span className={`text-base font-black ${todayHero.grade.colorClass}`}>
                  {todayHero.grade.label}
                </span>
              </div>
              {todayHero.oneLine && (
                <p className="text-xs text-zinc-200 mt-1.5 line-clamp-1 leading-snug">
                  {todayHero.oneLine}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0 leading-none">
              <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                {t.today}
              </span>
              <span className="text-sm font-black text-zinc-100 mt-0.5">
                {today.getMonth() + 1}.{today.getDate()}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">{todayWeekday}</span>
              <ChevronRight className="w-4 h-4 text-zinc-500 mt-1.5" />
            </div>
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex bg-zinc-900/50 rounded-xl p-1.5 border border-white/5 backdrop-blur-sm">
          {(['yearly', 'monthly', 'daily'] as const).map((mode) => {
            const label = mode === 'yearly' ? t.tabYear : mode === 'monthly' ? t.tabMonth : t.tabDay
            return (
              <button
                key={mode}
                type="button"
                onClick={() => changeViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'yearly' && <CalendarRange className="w-4 h-4" />}
                {mode === 'monthly' && <ScrollText className="w-4 h-4" />}
                {mode === 'daily' && <Activity className="w-4 h-4" />}
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 overflow-y-auto relative z-10 pb-10">
        <AnimatePresence mode="wait">
          {/* 0. YEARLY VIEW — 올해 큰 날 (오늘→이달→올해 줌의 가장 바깥) */}
          {viewMode === 'yearly' && (
            <motion.div
              key="yearly"
              variants={tabVariants(viewDirection)}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-5 space-y-4"
            >
              <YearDashboard
                year={viewYear}
                allDates={data?.allDates ?? []}
                yearlyMonthly={yearlyMonthly}
                yearlyConvergence={yearlyConvergence}
                lifetimePivots={data?.monthlyInterpretation?.lifetimePivots}
                birthDate={birthInfo?.birthDate}
                currentPhaseLabel={phaseLabel}
                locale={locale}
                onMonthClick={(monthIdx) => {
                  const lastDay = new Date(viewYear, monthIdx + 1, 0).getDate()
                  setViewDate(new Date(viewYear, monthIdx, 1))
                  setCurrentDay((d) => Math.min(d, lastDay))
                  changeViewMode('monthly')
                }}
              />
              {!yearlyMonthly && (
                <YearHighlightsCard
                  allDates={data?.allDates ?? []}
                  year={viewYear}
                  onDateClick={handleDateClick}
                />
              )}
            </motion.div>
          )}

          {/* 1. MONTHLY VIEW */}
          {viewMode === 'monthly' && (
            <motion.div
              key="monthly"
              variants={tabVariants(viewDirection)}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-5 space-y-4"
            >
              {/* Premium Dashboard — Hero + Radar + Flow + Highlights.
                  같은 데이터 모델(monthDates, themeScores, keyEvents)을 4개
                  시각화로 분배. */}
              {monthScore !== null && (
                <MonthDashboard
                  year={viewYear}
                  month={viewMonth}
                  monthLabel={monthLabel}
                  monthDates={monthDates}
                  monthScore={monthScore}
                  monthSummary={monthlySummaryText}
                  monthInterp={data?.monthlyInterpretation ?? null}
                  locale={locale}
                  onDayClick={handleDayClick}
                />
              )}

              {/* 달력 그리드 — actionable surface. 대시보드 highlights 와 함께
                  사용자가 일자 탭으로 daily 뷰 진입. */}
              <div className="bg-zinc-900/60 p-4 sm:p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-4 gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="p-2 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-white/5 text-zinc-300 transition shrink-0"
                    aria-label={t.prevMonth}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-black text-zinc-100 tracking-widest flex-1 text-center">
                    {monthLabel}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-white/5 text-zinc-300 transition shrink-0"
                    aria-label={t.nextMonth}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center items-center mb-5 gap-2 flex-wrap">
                  {!isThisMonth && (
                    <button
                      onClick={goToThisMonth}
                      className="text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30 transition"
                    >
                      {t.goToToday}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mb-4">
                  {t.weekdayShort.map((day, i) => (
                    <span
                      key={i}
                      className={`text-xs font-bold ${
                        i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-400' : 'text-zinc-500'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const isSelected = day === currentDay
                    // 셀 히트맵: 등급별 채도 낮은 톤으로 칠해 캘린더만 봐도
                    // 이달 흐름이 보이게. MonthlyDailyChart 색 코드와 통일.
                    const grade = dayGradeMap.get(day)
                    let gradeClass =
                      'text-zinc-300 bg-zinc-950/50 hover:bg-zinc-800 border border-white/5'
                    let gradeKey: 'lucky' | 'neutral' | 'unlucky' | null = null
                    if (grade === 'lucky') {
                      gradeClass =
                        'text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30'
                      gradeKey = 'lucky'
                    } else if (grade === 'unlucky') {
                      gradeClass =
                        'text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30'
                      gradeKey = 'unlucky'
                    } else if (grade === 'neutral') {
                      gradeClass =
                        'text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5'
                      gradeKey = 'neutral'
                    }
                    return (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={day}
                        onClick={() => handleDayClick(day)}
                        aria-label={t.dayCellAria(
                          viewMonth + 1,
                          day,
                          gradeKey ? t.gradeLabel(gradeKey) : '',
                          isSelected
                        )}
                        aria-current={isSelected ? 'date' : undefined}
                        className={`aspect-square min-h-[40px] flex flex-col items-center justify-center rounded-xl text-sm relative transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-500 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/50 border-transparent'
                            : gradeClass
                        }`}
                      >
                        {day}
                      </motion.button>
                    )
                  })}
                </div>

                {/* 색 범례 — 캘린더가 히트맵으로 바뀌었으니 의미 한 줄로. */}
                <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400/40" />
                    {t.legendGood}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800/70 border border-white/10" />
                    {t.legendNeutral}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-400/40" />
                    {t.legendCaution}
                  </span>
                </div>
              </div>

              {/* MonthlyInterpretationCard 제거 — 사용자 cut 요청.
                  13 sub-sections + WhyCard + Convergence + KeyEvents 가 너무 깊어 사용자
                  학습 부담 큼. Hero verdict + Flow chart + 그리드 만으로 본질 충분. */}
            </motion.div>
          )}

          {/* 2. DAILY VIEW */}
          {viewMode === 'daily' && (
            <motion.div
              key="daily"
              variants={tabVariants(viewDirection)}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-5 space-y-4"
            >
              <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                <button
                  onClick={handlePrevDay}
                  className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeViewMode('monthly')}
                  aria-label={t.dailyHeaderAria(monthLabel, currentDay, getDayOfWeek(currentDay))}
                  className="flex flex-col items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl px-2"
                >
                  <span className="text-xs font-bold text-indigo-500/80 mb-1 tracking-widest">
                    {monthLabel}
                  </span>
                  <h2 className="text-3xl font-black text-zinc-100 tracking-tighter flex items-baseline gap-1">
                    {currentDay}
                    <span className="text-lg font-medium text-zinc-500">
                      {getDayOfWeek(currentDay)}
                    </span>
                  </h2>
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {selectedImportantDate &&
                (() => {
                  const rawScore = selectedImportantDate.displayScore ?? selectedImportantDate.score
                  // 점수 없는 일자는 엔진 게이트 미통과 — 카드 자체 렌더 X.
                  if (typeof rawScore !== 'number') return null
                  const dayScore = Math.round(rawScore)
                  return (
                    <DayInsights
                      importantDate={selectedImportantDate}
                      dateStr={selectedDateStr}
                      grade={getGrade(dayScore)}
                      score={dayScore}
                      oneLine={dailyOneLineSummary}
                      frontDomain={
                        data?.calendarDailyView?.date === selectedDateStr
                          ? (data.calendarDailyView.frontDomainLabel ?? null)
                          : null
                      }
                      advice={fusion?.advice}
                      hourlySlots={dailyHourlySlots}
                      locale={locale}
                    />
                  )
                })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* dead "월 이동" 모달 제거 (audit 4차) — setIsCalendarModalOpen(true) 호출이
          어디에도 없어 영원히 unreachable 했음. 100+ LOC + Headless UI Dialog tree
          가 번들에 포함돼 a11y 와 무관하게 무용. 헤더 "캘린더" 버튼은 monthly 탭으로
          이동 (기존 동작) 으로 충분. */}
    </div>
  )
}
