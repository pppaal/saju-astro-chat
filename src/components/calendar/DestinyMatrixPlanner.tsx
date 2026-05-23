'use client'

import React, { useState, useMemo, useCallback, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, Transition } from '@headlessui/react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Heart,
  ScrollText,
  Activity,
  CalendarRange,
  Moon,
  Sun,
  Coins,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Cpu,
  X,
} from 'lucide-react'

import type { BirthInfo, CalendarData, EventCategory, ImportantDate } from './types'
import { ganjiToKorean } from '@/lib/saju/ganjiKo'
import { useDateDetail } from './useDateDetail'
import MatchedPatternsCard from './MatchedPatternsCard'
import MonthHighlightsCard from './MonthHighlightsCard'
import YearHighlightsCard from './YearHighlightsCard'
import MonthlyInterpretationCard from './MonthlyInterpretationCard'
import DailyFlowCard from './DailyFlowCard'
import DailyHourlyChart from './DailyHourlyChart'
import WeeklyTimingChart from './WeeklyTimingChart'
import { getGrade, computeGradeThresholds } from './scoreGrade'
import { branchFromHour, getHourNarrative } from '@/lib/calendar-engine/data/hourBranchNarrative'
import { getHourThemeNarrative } from '@/lib/calendar-engine/data/hourThemeNarrative'

// 그 날 themeScores 중 최고 테마 → 시진별 테마 한 줄 선택용
type HourTheme = 'love' | 'money' | 'career' | 'health' | 'growth'
const HOUR_THEME_KEYS: HourTheme[] = ['love', 'money', 'career', 'health', 'growth']
function topHourTheme(themeScores: Partial<Record<string, number>> | undefined): HourTheme {
  if (!themeScores) return 'growth'
  let best: HourTheme = 'growth'
  let bestV = -Infinity
  for (const k of HOUR_THEME_KEYS) {
    const v = themeScores[k]
    if (typeof v === 'number' && v > bestV) {
      bestV = v
      best = k
    }
  }
  return best
}

interface DestinyMatrixPlannerProps {
  /** Engine payload from /api/calendar. When omitted the component falls back to mock data. */
  data?: CalendarData | null
  /** Birth info used to fetch `data`. Reserved for future real wiring. */
  birthInfo?: BirthInfo | null
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

export default function DestinyMatrixPlanner({ data, birthInfo }: DestinyMatrixPlannerProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [currentDay, setCurrentDay] = useState<number>(() => new Date().getDate())
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)

  // --- View date (state — prev/next month 이동 가능) -------------------
  // 이전엔 today로 하드코딩돼 month 이동 자체가 안 됐음. 우측 상단 모달의
  // "외부 캘린더 연동 추후 추가 예정" 안내도 그래서 무력화돼 있었다.
  // API는 year 단위로 1년치 allDates를 한 번에 받으니 month 전환은 client-only.
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() // 0-indexed

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

  const monthEventSet = useMemo(() => {
    const out = new Set<number>()
    for (const d of monthDates) {
      // 사용자가 보는 배지/색은 displayGrade(displayScore 백분위)이므로
      // 하이라이트 점도 같은 기준으로 — raw grade를 쓰면 배지와 어긋난다.
      const g = d.displayGrade ?? d.grade
      if (g > 1) continue
      out.add(parseInt(d.date.slice(8, 10), 10))
    }
    return out
  }, [monthDates])

  const monthlySummaryText =
    data?.monthSummary?.summary ?? data?.calendarMonthView?.oneLineSummary ?? null

  const monthScore = useMemo(() => {
    if (monthDates.length === 0) return 84 // mock fallback
    return Math.round(avg(monthDates.map(pickFinalScore)))
  }, [monthDates])

  // 사용자 분포 기반 등급 임계값 (1년치 → 상위/하위 20%).
  // allDates 없으면 fallback 임계값으로 자동 폴백.
  const gradeThresholds = useMemo(
    () => computeGradeThresholds((data?.allDates ?? []).map(pickFinalScore)),
    [data?.allDates]
  )

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

  // --- Daily indices: 총점 / 연애 / 재물 / 건강 ------------------------
  // yearly /api/calendar 페이로드에는 activityScores가 들어오지 않는다
  // (date-detail 엔드포인트에서만 계산). 그래서 도메인별 지수는
  //  1) evidence.matrix.domain이 매칭되면 finalScoreAdjusted로 직접
  //  2) 카테고리에 해당 도메인이 들어있으면 그 날의 최종 점수
  //  3) 그 외엔 중립값 50 (없는 신호를 60%로 위장하지 않음)
  // 의 정직한 우선순위로 도출한다.
  const dailyIndices = useMemo(() => {
    // calendar-engine v2 우선 — 신호 기반 점수 + themeScores
    // ImportantDate.engineSignals가 있으면 새 엔진이 작동한 것.
    if (selectedImportantDate?.engineSignals && selectedImportantDate.engineSignals.length > 0) {
      const ts = selectedImportantDate.themeScores ?? {}
      return {
        score: Math.round(selectedImportantDate.displayScore ?? selectedImportantDate.score),
        love: typeof ts.love === 'number' ? Math.round(ts.love) : (fusion?.domainScores.love ?? 50),
        wealth:
          typeof ts.money === 'number' ? Math.round(ts.money) : (fusion?.domainScores.money ?? 50),
        health:
          typeof ts.health === 'number'
            ? Math.round(ts.health)
            : (fusion?.domainScores.health ?? 50),
      }
    }
    // fusion 우선 — 18테마 점수 정밀
    if (fusion) {
      return {
        score: fusion.overallScore,
        love: fusion.domainScores.love ?? 50,
        wealth: fusion.domainScores.money ?? 50,
        health: fusion.domainScores.health ?? 50,
      }
    }
    if (!selectedImportantDate) {
      return { score: 88, love: 65, wealth: 78, health: 60 }
    }
    const d = selectedImportantDate
    const finalScore = Math.round(pickFinalScore(d))
    const cats = new Set(d.categories)
    const matrixDomain = d.evidence?.matrix?.domain
    const matrixScore = d.evidence?.matrix?.finalScoreAdjusted
    const domainScore = (categoryKey: EventCategory, matrixKey: string): number => {
      if (matrixDomain === matrixKey && typeof matrixScore === 'number') {
        return Math.max(0, Math.min(100, Math.round(matrixScore)))
      }
      if (cats.has(categoryKey)) return finalScore
      return 50
    }
    return {
      score: finalScore,
      love: domainScore('love', 'love'),
      wealth: domainScore('wealth', 'money'),
      health: domainScore('health', 'health'),
    }
  }, [fusion, selectedImportantDate])

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

  const formatHour = (h: number): string => {
    if (h === 0) return '자정 12시'
    if (h === 12) return '정오 12시'
    if (h < 12) return `오전 ${h}시`
    return `오후 ${h - 12}시`
  }

  // --- Daily Dos / Donts ----------------------------------------------
  // 엔진이 진짜 advice를 못 만들면 카드 자체를 숨김 (Dos·Donts 모두 빈 배열일 때
  // 렌더 가드). 옛 MOCK_DOS/DONTS는 "충동적인 대규모 지출 금지" 같은 generic
  // 한 줄이라 정직하지 않았음.
  const dailyDos = useMemo(() => {
    if (fusion?.advice?.do && fusion.advice.do.length > 0) return fusion.advice.do.slice(0, 2)
    const recs = selectedImportantDate?.recommendations
    if (recs && recs.length > 0) return recs.slice(0, 2)
    return []
  }, [fusion, selectedImportantDate])

  const dailyDonts = useMemo(() => {
    if (fusion?.advice?.avoid && fusion.advice.avoid.length > 0)
      return fusion.advice.avoid.slice(0, 2)
    const warns = selectedImportantDate?.warnings
    if (warns && warns.length > 0) return warns.slice(0, 2)
    return []
  }, [fusion, selectedImportantDate])

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

  // --- Daily engine self-diagnostic: confidence + cross agreement ------
  const dailyEngineSignal = useMemo(() => {
    // fusion 우선 — agreement + confidence 정밀
    if (fusion) {
      return {
        confidence: fusion.confidence,
        sync: fusion.agreement,
      }
    }
    if (!selectedImportantDate) return null
    const conf = selectedImportantDate.evidence?.confidence
    const sync = selectedImportantDate.evidence?.crossAgreementPercent
    if (conf == null && sync == null) return null
    return {
      confidence: typeof conf === 'number' ? Math.round(conf) : null,
      sync: typeof sync === 'number' ? Math.round(sync) : null,
    }
  }, [fusion, selectedImportantDate])

  // --- Astro identity badge for the header ---------------------------
  // 풀 차트가 들어오면 ASC, 없으면 태양 별자리.
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
    if (id.ascendantSign) {
      const ko = ZODIAC_KO[id.ascendantSign]
      return { label: ko ? `${ko} ASC` : `${id.ascendantSign} ASC`, kind: 'asc' as const }
    }
    if (id.sunSign) {
      const ko = ZODIAC_KO[id.sunSign]
      return { label: ko ? `${ko} ☉` : `${id.sunSign} Sun`, kind: 'sun' as const }
    }
    return null
  }, [data])

  const handlePrevDay = () => setCurrentDay((prev) => (prev > 1 ? prev - 1 : daysInMonth))
  const handleNextDay = () => setCurrentDay((prev) => (prev < daysInMonth ? prev + 1 : 1))

  const handleDayClick = (day: number) => {
    setCurrentDay(day)
    setViewMode('daily')
  }

  // 올해 큰 날에서 날짜 클릭 — 그 달로 이동 후 daily 뷰
  const handleDateClick = (iso: string) => {
    const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10))
    if (!y || !m || !d) return
    setViewDate(new Date(y, m - 1, 1))
    setCurrentDay(d)
    setViewMode('daily')
  }

  const getDayOfWeek = (day: number) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    return days[new Date(viewYear, viewMonth, day).getDay()]
  }

  return (
    <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col shadow-2xl overflow-hidden relative border-x border-zinc-900">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-900/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

      {/* --- Header --- */}
      <div className="px-6 pt-12 pb-4 shrink-0 relative z-20 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-900 bg-amber-500 px-2.5 py-1 rounded-md tracking-wide flex items-center gap-1.5">
                <Sun className="w-3 h-3" /> {ganjiToKorean(natalDayPillar ?? '辛未')} 일주
              </span>
              {astroBadge ? (
                <span className="text-xs font-bold text-zinc-900 bg-cyan-400 px-2.5 py-1 rounded-md tracking-wide flex items-center gap-1.5">
                  <Moon className="w-3 h-3" /> {astroBadge.label}
                </span>
              ) : !data ? (
                <span className="text-xs font-bold text-zinc-900 bg-cyan-400 px-2.5 py-1 rounded-md tracking-wide flex items-center gap-1.5">
                  <Moon className="w-3 h-3" /> 물병자리 ASC
                </span>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => setIsCalendarModalOpen(true)}
            className="p-3 bg-zinc-900/80 rounded-xl border border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all shadow-lg"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-zinc-900/50 rounded-xl p-1.5 border border-white/5 backdrop-blur-sm">
          {(['yearly', 'monthly', 'daily'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize flex items-center justify-center gap-2 ${
                viewMode === mode
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode === 'yearly' && <CalendarRange className="w-4 h-4" />}
              {mode === 'monthly' && <ScrollText className="w-4 h-4" />}
              {mode === 'daily' && <Activity className="w-4 h-4" />}
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 overflow-y-auto relative z-10 pb-10">
        <AnimatePresence mode="wait">
          {/* 0. YEARLY VIEW — 올해 큰 날 (오늘→이달→올해 줌의 가장 바깥) */}
          {viewMode === 'yearly' && (
            <motion.div
              key="yearly"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-6"
            >
              <YearHighlightsCard
                allDates={data?.allDates ?? []}
                year={viewYear}
                onDateClick={handleDateClick}
              />
            </motion.div>
          )}

          {/* 1. MONTHLY VIEW */}
          {viewMode === 'monthly' && (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-6"
            >
              <div className="bg-zinc-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-4 gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="p-2 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-white/5 text-zinc-300 transition shrink-0"
                    aria-label="이전 달"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-black text-zinc-100 tracking-widest flex-1 text-center">
                    {monthLabel}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-white/5 text-zinc-300 transition shrink-0"
                    aria-label="다음 달"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center items-center mb-5 gap-2 flex-wrap">
                  {/* phaseLabel은 engine matrixContract에서 옴 — 없으면 그냥 숨김.
                      이전엔 '甲戌 대운 (32세~)' 하드코딩이 fallback이었는데
                      특정인의 phase라 다른 사용자에게 잘못 노출됐음. */}
                  {phaseLabel && (
                    <span className="text-[12px] font-semibold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Phase · {phaseLabel}
                    </span>
                  )}
                  {!isThisMonth && (
                    <button
                      onClick={goToThisMonth}
                      className="text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30 transition"
                    >
                      오늘로
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
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

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const isSelected = day === currentDay
                    // 이벤트 dot은 engine의 monthEventSet 기준만 — 데이터
                    // 없으면 그냥 점 없음. 이전엔 mock 날짜 6개가 박혀 있어서
                    // 빈 캘린더에도 가짜 dot이 떴음.
                    const hasEvent = monthEventSet.has(day)
                    return (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-500 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/50 border-transparent'
                            : 'text-zinc-300 bg-zinc-950/50 hover:bg-zinc-800 border border-white/5'
                        }`}
                      >
                        {day}
                        {hasEvent && !isSelected && (
                          <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-amber-400 shadow shadow-amber-400/80" />
                        )}
                        {hasEvent && isSelected && (
                          <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white shadow shadow-white/80" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* ── 연애 / 일·돈 날씨 뱃지 (엔진 emit) ── */}
              {(data?.relationshipWeather || data?.workMoneyWeather) && (
                <div className="grid grid-cols-2 gap-3">
                  {data?.relationshipWeather && (
                    <WeatherBadge
                      icon={<Heart className="w-4 h-4 text-rose-400" />}
                      label="연애 날씨"
                      grade={data.relationshipWeather.grade}
                      summary={data.relationshipWeather.summary}
                      tone="rose"
                    />
                  )}
                  {data?.workMoneyWeather && (
                    <WeatherBadge
                      icon={<Coins className="w-4 h-4 text-amber-400" />}
                      label="일·돈 날씨"
                      grade={data.workMoneyWeather.grade}
                      summary={data.workMoneyWeather.summary}
                      tone="amber"
                    />
                  )}
                </div>
              )}

              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 shadow-xl">
                <h3 className="text-base font-bold text-zinc-200 flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-indigo-400" /> 월간 종합 분석 리포트
                </h3>
                {/* 종합은 절대 점수("79/100") 대신 상대 밴드로 — 하루를 한
                    숫자로 단정하지 않고 "그 사람 기준 어느 정도인지"만 보여줌.
                    구체 점수는 영역별 바·근거카드에서 드러남. */}
                <div className="flex items-baseline gap-3 flex-wrap mb-3">
                  <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">
                    이번 달 흐름
                  </span>
                  {(() => {
                    const g = getGrade(monthScore, gradeThresholds)
                    return (
                      <span
                        className={`text-sm font-bold px-2.5 py-1 rounded-full border ${g.colorClass} ${g.borderClass}`}
                      >
                        {g.label} · {g.sub}
                      </span>
                    )
                  })()}
                </div>
                {monthlySummaryText && (
                  <p className="text-sm text-zinc-300 leading-relaxed">{monthlySummaryText}</p>
                )}
              </div>

              {/* ── calendar-engine v2: 월간 narrative 해석 ── */}
              <MonthlyInterpretationCard
                interp={
                  monthDates[0]?.monthlyInterpretation ??
                  selectedImportantDate?.monthlyInterpretation
                }
              />

              {/* ── 주간 타이밍 그래프 (saju × astro) ── */}
              <WeeklyTimingChart monthDates={monthDates} />

              {/* ── calendar-engine v2: 좋은 날/조심할 날 TOP 5 ── */}
              <MonthHighlightsCard
                monthDates={monthDates}
                onDayClick={handleDayClick}
                gradeThresholds={gradeThresholds}
              />
            </motion.div>
          )}

          {/* 2. DAILY VIEW */}
          {viewMode === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                <button
                  onClick={handlePrevDay}
                  className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => setViewMode('monthly')}
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
                </div>
                <button
                  onClick={handleNextDay}
                  className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* One-line summary (engine pre-formatted) */}
              {dailyOneLineSummary && (
                <div className="bg-indigo-900/10 border border-indigo-500/20 px-4 py-3 rounded-xl">
                  <p className="text-sm text-zinc-200 leading-relaxed">{dailyOneLineSummary}</p>
                </div>
              )}

              {(() => {
                const todayGrade = getGrade(dailyIndices.score, gradeThresholds)
                return (
                  <div className="grid grid-cols-5 gap-4">
                    <div
                      className={`col-span-2 p-4 rounded-2xl border flex flex-col items-center justify-center text-center shadow-lg ${todayGrade.bgClass} ${todayGrade.borderClass}`}
                    >
                      <span className="text-[11px] font-bold text-zinc-400 mb-1 tracking-widest">
                        오늘의 흐름
                      </span>
                      <span
                        className={`text-2xl font-black ${todayGrade.colorClass} leading-tight`}
                      >
                        {todayGrade.label}
                      </span>
                      <span className="text-xs text-zinc-400 mt-2">{todayGrade.sub}</span>
                    </div>

                    <div className="col-span-3 bg-zinc-900/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-center space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" /> 연애 지수
                          </span>
                          <span className="text-xs text-rose-400">{dailyIndices.love}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                          <motion.div
                            key={`love-${currentDay}-${dailyIndices.love}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${dailyIndices.love}%` }}
                            className="h-full bg-rose-500 rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-400" /> 재물 지수
                          </span>
                          <span className="text-xs text-amber-400">{dailyIndices.wealth}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                          <motion.div
                            key={`wealth-${currentDay}-${dailyIndices.wealth}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${dailyIndices.wealth}%` }}
                            className="h-full bg-amber-500 rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-emerald-400" /> 건강 지수
                          </span>
                          <span className="text-xs text-emerald-400">{dailyIndices.health}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                          <motion.div
                            key={`health-${currentDay}-${dailyIndices.health}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${dailyIndices.health}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Engine self-diagnostic */}
              {dailyEngineSignal && (
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-zinc-200 tracking-wider uppercase">
                      엔진 자기 진단
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950/60 p-4 rounded-xl border border-indigo-500/10">
                      <div className="text-xs text-zinc-500 mb-1">신뢰도</div>
                      <div className="text-3xl font-black text-indigo-300">
                        {dailyEngineSignal.confidence != null
                          ? `${dailyEngineSignal.confidence}%`
                          : '—'}
                      </div>
                      <p className="text-xs text-zinc-500 mt-2 leading-snug">
                        엔진이 이 예측에 부여한 자체 신뢰도
                      </p>
                    </div>
                    <div className="bg-zinc-950/60 p-4 rounded-xl border border-cyan-500/10">
                      <div className="text-xs text-zinc-500 mb-1">사주↔점성 합치</div>
                      <div className="text-3xl font-black text-cyan-300">
                        {dailyEngineSignal.sync != null ? `${dailyEngineSignal.sync}%` : '—'}
                      </div>
                      <p className="text-xs text-zinc-500 mt-2 leading-snug">
                        두 시스템이 같은 방향을 가리키는 정도
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── calendar-engine v2: 매칭 패턴 카드 (헤드라인+액션) ── */}
              <MatchedPatternsCard patterns={selectedImportantDate?.matchedPatterns} />

              {/* ── calendar-engine v2: 오늘의 활성 흐름 (글로 풀어씀) ── */}
              {/* 기존 ActiveSignalsList 리스트 + 신살 칩 → 단일 narrative 카드로 통합 */}
              <DailyFlowCard importantDate={selectedImportantDate} />

              {/* ── 24h 시간대 교차 그래프 (saju 시진 × 점성 행성시) ── */}
              <DailyHourlyChart importantDate={selectedImportantDate} />

              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
                <h3 className="text-base font-bold text-zinc-200 flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-cyan-400" /> 좋은 시간 · 주의 시간
                </h3>
                {dailyHourlySlots ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-400 mb-2 tracking-wider">
                        ↑ BEST
                      </div>
                      <ul className="space-y-2">
                        {dailyHourlySlots.best.length > 0 ? (
                          dailyHourlySlots.best.slice(0, 4).map((s, i) => {
                            const branch = branchFromHour(s.hour)
                            const narrative = getHourNarrative(branch)
                            const themeLine = getHourThemeNarrative(
                              branch,
                              topHourTheme(selectedImportantDate?.themeScores),
                              'ko'
                            )
                            return (
                              <li
                                key={`best-${i}`}
                                className="bg-emerald-900/10 border border-emerald-500/15 px-3 py-2 rounded-lg"
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-base font-bold text-emerald-200">
                                    {formatHour(s.hour)}
                                  </span>
                                </div>
                                {/* 시진 baseline narrative — 12지지 의미를 한 줄로.
                                  best 슬롯이라 positiveKo 사용. */}
                                <p className="text-xs text-emerald-100/85 mt-1 leading-snug">
                                  {narrative.positiveKo}
                                </p>
                                {themeLine && (
                                  <p className="text-[11px] text-emerald-200/70 mt-1 leading-snug">
                                    {themeLine}
                                  </p>
                                )}
                                {s.reason && (
                                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                                    {s.reason}
                                  </p>
                                )}
                              </li>
                            )
                          })
                        ) : (
                          <li className="text-xs text-zinc-500">신호 없음</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-rose-400 mb-2 tracking-wider">
                        ↓ WORST
                      </div>
                      <ul className="space-y-2">
                        {dailyHourlySlots.worst.length > 0 ? (
                          dailyHourlySlots.worst.slice(0, 2).map((s, i) => {
                            const branch = branchFromHour(s.hour)
                            const narrative = getHourNarrative(branch)
                            return (
                              <li
                                key={`worst-${i}`}
                                className="bg-rose-900/10 border border-rose-500/15 px-3 py-2 rounded-lg"
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-base font-bold text-rose-200">
                                    {formatHour(s.hour)}
                                  </span>
                                </div>
                                {/* worst 슬롯이라 cautionKo 사용 */}
                                <p className="text-xs text-rose-100/85 mt-1 leading-snug">
                                  {narrative.cautionKo}
                                </p>
                                {s.reason && (
                                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                                    {s.reason}
                                  </p>
                                )}
                              </li>
                            )
                          })
                        ) : (
                          <li className="text-xs text-zinc-500">신호 없음</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    이 날의 시간대별 정밀 분석은{' '}
                    <span className="text-zinc-200 font-medium">달력에서 날짜를 탭</span>하면
                    상세보기에 표시됩니다.
                  </p>
                )}
              </div>

              {(dailyDos.length > 0 || dailyDonts.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {dailyDos.length > 0 && (
                    <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-2xl">
                      <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                        <ThumbsUp className="w-4 h-4" /> 권장 행동 패턴
                      </h4>
                      <ul className="space-y-2">
                        {dailyDos.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-emerald-100/80 flex items-start gap-1.5 leading-relaxed"
                          >
                            <span className="text-emerald-500 mt-0.5">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dailyDonts.length > 0 && (
                    <div className="bg-rose-900/10 border border-rose-500/20 p-4 rounded-2xl">
                      <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
                        <ThumbsDown className="w-4 h-4" /> 주의 행동 패턴
                      </h4>
                      <ul className="space-y-2">
                        {dailyDonts.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-rose-100/80 flex items-start gap-1.5 leading-relaxed"
                          >
                            <span className="text-rose-500 mt-0.5">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Headless UI Calendar Modal --- */}
      <Transition appear show={isCalendarModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCalendarModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-700 p-6 text-left align-middle shadow-2xl transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-bold text-white flex items-center gap-2"
                    >
                      <Calendar className="w-5 h-5 text-indigo-400" />월 이동
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCalendarModalOpen(false)}
                      className="text-zinc-400 hover:text-white p-1"
                      aria-label="닫기"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 현재 보고 있는 달 + prev/next */}
                  <div className="bg-zinc-950 rounded-2xl p-5 border border-zinc-800">
                    <div className="flex items-center justify-between mb-5">
                      <button
                        onClick={() => {
                          goToPrevMonth()
                          setIsCalendarModalOpen(false)
                        }}
                        className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-200 transition"
                        aria-label="이전 달"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="text-center">
                        <div className="text-[11px] text-zinc-500 tracking-widest uppercase mb-1">
                          보는 달
                        </div>
                        <div className="text-xl font-black text-white tracking-wide">
                          {monthLabel}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          goToNextMonth()
                          setIsCalendarModalOpen(false)
                        }}
                        className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-200 transition"
                        aria-label="다음 달"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        goToThisMonth()
                        setIsCalendarModalOpen(false)
                      }}
                      disabled={isThisMonth}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-bold transition-colors"
                    >
                      {isThisMonth ? '이번 달입니다' : '이번 달로 가기'}
                    </button>

                    {birthInfo?.birthDate && (
                      <p className="mt-4 text-[11px] text-zinc-500 text-center">
                        기준 생년월일 · {birthInfo.birthDate}
                      </p>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

type WeatherGrade = 'strong' | 'good' | 'neutral' | 'caution'
const WEATHER_LABEL: Record<WeatherGrade, string> = {
  strong: '맑음',
  good: '맑음 한때',
  neutral: '평이',
  caution: '주의',
}
function WeatherBadge({
  icon,
  label,
  grade,
  summary,
  tone,
}: {
  icon: React.ReactNode
  label: string
  grade: WeatherGrade
  summary: string
  tone: 'rose' | 'amber'
}) {
  const accent =
    grade === 'strong'
      ? 'text-emerald-300'
      : grade === 'good'
        ? 'text-emerald-200'
        : grade === 'caution'
          ? 'text-rose-300'
          : 'text-zinc-300'
  const border = tone === 'rose' ? 'border-rose-500/15' : 'border-amber-500/15'
  return (
    <div className={`bg-zinc-900/40 p-4 rounded-2xl border ${border}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase">{label}</span>
        <span className={`ml-auto text-xs font-bold ${accent}`}>{WEATHER_LABEL[grade]}</span>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{summary}</p>
    </div>
  )
}
