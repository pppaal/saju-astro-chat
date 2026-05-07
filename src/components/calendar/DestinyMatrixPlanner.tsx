'use client'

import React, { useState, useMemo, useCallback, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, Transition } from '@headlessui/react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Heart,
  Sparkles,
  ScrollText,
  Activity,
  Moon,
  Sun,
  Coins,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Target,
  Cpu,
  TrendingUp,
  X,
  Layers,
} from 'lucide-react'
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'

import type { BirthInfo, CalendarData, EventCategory, ImportantDate } from './types'

interface DestinyMatrixPlannerProps {
  /** Engine payload from /api/calendar. When omitted the component falls back to mock data. */
  data?: CalendarData | null
  /** Birth info used to fetch `data`. Reserved for future real wiring. */
  birthInfo?: BirthInfo | null
}

type ViewMode = 'monthly' | 'daily' | 'stats'

// --- Mock Data (used only when `data` is null) ---
const MOCK_TIMING = [
  { week: '1주차', saju: 55, astro: 40 },
  { week: '2주차', saju: 65, astro: 60 },
  { week: '3주차', saju: 90, astro: 85 },
  { week: '4주차', saju: 70, astro: 65 },
  { week: '5주차', saju: 60, astro: 75 },
]

const MOCK_DOMAIN_RADAR = [
  { subject: '재물', saju: 90, astro: 85 },
  { subject: '직업', saju: 80, astro: 85 },
  { subject: '학업', saju: 75, astro: 65 },
  { subject: '건강', saju: 60, astro: 70 },
  { subject: '연애', saju: 45, astro: 30 },
]

const DOMAIN_RADAR_TARGETS: Array<{ key: EventCategory; label: string }> = [
  { key: 'wealth', label: '재물' },
  { key: 'career', label: '직업' },
  { key: 'study', label: '학업' },
  { key: 'health', label: '건강' },
  { key: 'love', label: '연애' },
]

const MOCK_DOS = [
  '새로운 인연이나 모임에 참석하기',
  '밀린 업무나 서류 작업 마무리하기',
]
const MOCK_DONTS = [
  '가까운 사람과의 말다툼 피하기',
  '충동적인 대규모 지출 금지',
]

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
}: DestinyMatrixPlannerProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [currentDay, setCurrentDay] = useState<number>(() => new Date().getDate())
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)

  // --- View date (current real month) ---------------------------------
  const today = useMemo(() => new Date(), [])
  const viewYear = today.getFullYear()
  const viewMonth = today.getMonth() // 0-indexed

  const monthLabel = useMemo(() => {
    const labels = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ]
    return `${labels[viewMonth]} ${viewYear}`
  }, [viewMonth, viewYear])

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth],
  )
  const leadingBlanks = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth],
  )

  // --- Engine-derived: natal day pillar (header badge) ----------------
  const natalSaju = useMemo(
    () => data?.allDates?.find((d) => d.natalSaju)?.natalSaju ?? null,
    [data],
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
      if (d.grade > 1) continue
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

  const phaseLabel =
    data?.matrixContract?.overallPhaseLabel ?? data?.matrixContract?.overallPhase ?? null

  // --- Engine-derived: selected day -----------------------------------
  const selectedDateStr = useMemo(
    () =>
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`,
    [viewYear, viewMonth, currentDay],
  )

  const selectedImportantDate = useMemo(() => {
    if (!data?.allDates) return null
    return data.allDates.find((d) => d.date === selectedDateStr) ?? null
  }, [data, selectedDateStr])

  // --- Daily indices: 총점 / 연애 / 재물 / 건강 ------------------------
  // yearly /api/calendar 페이로드에는 activityScores가 들어오지 않는다
  // (date-detail 엔드포인트에서만 계산). 그래서 도메인별 지수는
  //  1) evidence.matrix.domain이 매칭되면 finalScoreAdjusted로 직접
  //  2) 카테고리에 해당 도메인이 들어있으면 그 날의 최종 점수
  //  3) 그 외엔 중립값 50 (없는 신호를 60%로 위장하지 않음)
  // 의 정직한 우선순위로 도출한다.
  const dailyIndices = useMemo(() => {
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
  }, [selectedImportantDate])

  // --- Daily best/worst hours (engine-precise, 24-hour analysis) -------
  // 엔진은 selectedDate가 *오늘*일 때만 시간대 분석을 yearly 응답에 끼워
  // 보낸다 (`todayHourlyTimeSlots`). 다른 날짜는 자체 hourlyTimeSlots
  // 필드가 차 있을 때만 노출 — 그 외엔 placeholder로 정직하게 비운다.
  const dailyHourlySlots = useMemo(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isToday = selectedDateStr === todayStr
    const perDay = selectedImportantDate?.hourlyTimeSlots
    if (perDay && (perDay.best.length > 0 || perDay.worst.length > 0)) {
      return perDay
    }
    if (isToday && data?.todayHourlyTimeSlots) {
      return data.todayHourlyTimeSlots
    }
    return null
  }, [today, selectedDateStr, selectedImportantDate, data])

  const formatHour = (h: number): string => {
    if (h === 0) return '자정 12시'
    if (h === 12) return '정오 12시'
    if (h < 12) return `오전 ${h}시`
    return `오후 ${h - 12}시`
  }

  // --- Daily Dos / Donts ----------------------------------------------
  const dailyDos = useMemo(() => {
    const recs = selectedImportantDate?.recommendations
    if (recs && recs.length > 0) return recs.slice(0, 2)
    return MOCK_DOS
  }, [selectedImportantDate])

  const dailyDonts = useMemo(() => {
    const warns = selectedImportantDate?.warnings
    if (warns && warns.length > 0) return warns.slice(0, 2)
    return MOCK_DONTS
  }, [selectedImportantDate])

  // --- Daily one-line summary (engine pre-formatted, when available) ---
  const dailyOneLineSummary = useMemo(() => {
    if (
      data?.calendarDailyView &&
      data.calendarDailyView.date === selectedDateStr &&
      data.calendarDailyView.oneLineSummary
    ) {
      return data.calendarDailyView.oneLineSummary
    }
    return selectedImportantDate?.summary ?? null
  }, [data, selectedDateStr, selectedImportantDate])

  // --- Daily engine self-diagnostic: confidence + cross agreement ------
  const dailyEngineSignal = useMemo(() => {
    if (!selectedImportantDate) return null
    const conf = selectedImportantDate.evidence?.confidence
    const sync = selectedImportantDate.evidence?.crossAgreementPercent
    if (conf == null && sync == null) return null
    return {
      confidence: typeof conf === 'number' ? Math.round(conf) : null,
      sync: typeof sync === 'number' ? Math.round(sync) : null,
    }
  }, [selectedImportantDate])

  // --- Daily active 신살 (역마, 도화, 화개 등) -------------------------
  const dailyShinsal = useMemo(() => {
    const list = selectedImportantDate?.shinsalActive ?? []
    return list.slice(0, 6)
  }, [selectedImportantDate])

  // --- Stats: natal context (강약 / 격국 / 용신) -----------------------
  const natalContextSummary = useMemo(() => {
    if (!data?.allDates) return null
    const found = data.allDates.find((d) => d.natalContext?.summary)
    return found?.natalContext ?? null
  }, [data])

  // --- Stats: yongsin activation top 5 (next 60 days) ------------------
  const yongsinTop = useMemo(() => {
    return data?.yongsinActivations ?? null
  }, [data])

  const formatDateKo = (dateStr: string): string => {
    // 'YYYY-MM-DD' → 'M월 D일'
    const m = parseInt(dateStr.slice(5, 7), 10)
    const d = parseInt(dateStr.slice(8, 10), 10)
    return `${m}월 ${d}일`
  }

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

  // --- Stats: domain sync radar ---------------------------------------
  // sajuAxis / astroAxis는 엔진의 모든 일자에 항상 들어옴 (yearlyDates.ts).
  const domainSyncData = useMemo(() => {
    if (!data?.allDates || data.allDates.length === 0) return null
    return DOMAIN_RADAR_TARGETS.map(({ key, label }) => {
      const matched = data.allDates!.filter((d) => d.categories.includes(key))
      if (matched.length === 0) {
        return { subject: label, saju: 50, astro: 50 }
      }
      const sajuAvg = avg(matched.map((d) => d.scoreBreakdown?.sajuAxis ?? 50))
      const astroAvg = avg(matched.map((d) => d.scoreBreakdown?.astroAxis ?? 50))
      return {
        subject: label,
        saju: Math.round(sajuAvg),
        astro: Math.round(astroAvg),
      }
    })
  }, [data])

  const domainExtremes = useMemo(() => {
    const radar = domainSyncData
    if (!radar || radar.length === 0) return null
    const sorted = [...radar].sort((a, b) => b.saju + b.astro - (a.saju + a.astro))
    return { synergy: sorted[0], conflict: sorted[sorted.length - 1] }
  }, [domainSyncData])

  // --- Stats: weekly cross timing -------------------------------------
  // 캘린더 주차 (일요일 시작) 기준으로 버킷팅. 옛 단순 7일 그룹팅
  // (1-7 / 8-14 / 15-21 / 22-28 / 29+) 은 실제 주와 어긋나서 1주차에
  // 화·수·목·금·토만 들어가는 식이었다. 이제 그 달의 1일이 무슨 요일인지
  // 보고 leadingBlanks를 더해 진짜 주차로 정렬.
  const weeklyTimingData = useMemo(() => {
    if (monthDates.length === 0) return null
    const buckets: Array<{ saju: number[]; astro: number[] }> = []
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      // leadingBlanks = 그 달 1일 직전 빈 칸 수 (= 1일의 요일 인덱스, 일=0).
      // 같은 식을 적용하면 day가 그 달 캘린더 표에서 몇 번째 주에 들어가는지 나옴.
      const weekIdx = Math.floor((day - 1 + leadingBlanks) / 7)
      if (!buckets[weekIdx]) buckets[weekIdx] = { saju: [], astro: [] }
      buckets[weekIdx].saju.push(d.scoreBreakdown?.sajuAxis ?? 50)
      buckets[weekIdx].astro.push(d.scoreBreakdown?.astroAxis ?? 50)
    }
    return buckets.map((b, i) => ({
      week: `${i + 1}주차`,
      saju: b.saju.length > 0 ? Math.round(avg(b.saju)) : 50,
      astro: b.astro.length > 0 ? Math.round(avg(b.astro)) : 50,
    }))
  }, [monthDates, leadingBlanks])

  // --- Stats: super-timing (week with strongest cross signal) ---------
  // 캘린더 주차 (일~토) 기준이라 1주차는 그 달 1일이 시작하는 요일에서
  // 그 주의 토요일까지. 즉 dayStart = 1, dayEnd = 7 - leadingBlanks.
  // 그 다음부터는 7일씩 흘러간다.
  const weekRange = useCallback(
    (weekIdx: number) => {
      const dayStart = weekIdx === 0 ? 1 : weekIdx * 7 - leadingBlanks + 1
      const dayEnd = Math.min(weekIdx * 7 - leadingBlanks + 7, daysInMonth)
      return { dayStart, dayEnd }
    },
    [leadingBlanks, daysInMonth],
  )

  const superTiming = useMemo(() => {
    const weeks = weeklyTimingData
    if (!weeks || weeks.length === 0) return null
    let best = weeks[0]
    let bestSum = best.saju + best.astro
    for (const w of weeks) {
      if (w.saju + w.astro > bestSum) {
        best = w
        bestSum = w.saju + w.astro
      }
    }
    const weekIdx = parseInt(best.week, 10) - 1
    const { dayStart, dayEnd } = weekRange(weekIdx)
    return { week: best.week, dayStart, dayEnd, sajuScore: best.saju, astroScore: best.astro }
  }, [weeklyTimingData, weekRange])

  // --- Engine reasons for the super-timing card -----------------------
  const superTimingReasons = useMemo(() => {
    if (!data || !superTiming || monthDates.length === 0) {
      return {
        saju: '재물을 뜻하는 기운이 들어와 결실을 맺기 좋은 시기로 분석했습니다.',
        astro: '금성(Venus)이 커리어를 상징하는 위치에 자리하여 성과가 두드러지는 시기로 분석했습니다.',
      }
    }
    const weekIdx = parseInt(superTiming.week, 10) - 1
    const { dayStart, dayEnd } = weekRange(weekIdx)
    const weekDates = monthDates.filter((d) => {
      const day = parseInt(d.date.slice(8, 10), 10)
      return day >= dayStart && day <= dayEnd
    })
    if (weekDates.length === 0) {
      return {
        saju: data.matrixContract?.topClaim ?? '사주 흐름이 강하게 받쳐주는 구간으로 분석되었습니다.',
        astro: '점성 트랜짓이 동시에 우호적으로 정렬되어 신호가 증폭됩니다.',
      }
    }
    const topDay = weekDates.reduce((best, d) => (pickFinalScore(d) > pickFinalScore(best) ? d : best))
    const sajuFactor = topDay.sajuFactors?.[0] ?? topDay.title
    const astroFactor = topDay.astroFactors?.[0] ?? topDay.evidence?.cross?.astroEvidence ?? '점성 트랜짓이 동시에 받쳐주는 구간입니다.'
    return { saju: sajuFactor, astro: astroFactor }
  }, [data, superTiming, monthDates, weekRange])

  const handlePrevDay = () => setCurrentDay((prev) => (prev > 1 ? prev - 1 : daysInMonth))
  const handleNextDay = () => setCurrentDay((prev) => (prev < daysInMonth ? prev + 1 : 1))

  const handleDayClick = (day: number) => {
    setCurrentDay(day)
    setViewMode('daily')
  }

  const getDayOfWeek = (day: number) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    return days[new Date(viewYear, viewMonth, day).getDay()]
  }

  const radarData = data && domainSyncData ? domainSyncData : MOCK_DOMAIN_RADAR
  const lineData = data && weeklyTimingData ? weeklyTimingData : MOCK_TIMING

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
                <Sun className="w-3 h-3" /> {natalDayPillar ?? '辛未'} 일주
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
          {(['monthly', 'daily', 'stats'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize flex items-center justify-center gap-2 ${
                viewMode === mode
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode === 'monthly' && <ScrollText className="w-4 h-4" />}
              {mode === 'daily' && <Activity className="w-4 h-4" />}
              {mode === 'stats' && <Cpu className="w-4 h-4" />}
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 overflow-y-auto relative z-10 pb-10">
        <AnimatePresence mode="wait">
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
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-zinc-100 tracking-widest">{monthLabel}</h2>
                  <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    {phaseLabel ? `Phase: ${phaseLabel}` : '甲戌 대운 (32세~)'}
                  </span>
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
                    const hasEvent = data
                      ? monthEventSet.has(day)
                      : [3, 9, 12, 15, 22, 28].includes(day)
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

              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 shadow-xl">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-indigo-400" /> 월간 종합 분석 리포트
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center bg-zinc-950/80 p-4 rounded-xl border border-indigo-500/20 min-w-[80px]">
                    <span className="text-[10px] text-zinc-500 font-bold mb-1">월 평균</span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                      {monthScore}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {data && monthlySummaryText ? (
                      monthlySummaryText
                    ) : (
                      <>
                        사주 명리의{' '}
                        <span className="text-indigo-300 font-bold">목(木) 기운 발현</span>과 점성학의{' '}
                        <span className="text-cyan-300 font-bold">수성(Mercury) 순행</span>이 강한
                        동기화를 이루는 시기입니다. 두 엔진의 교차 검증 결과, 지적 활동과 커뮤니케이션
                        영역에서 높은 성과 지표가 예측됩니다.
                      </>
                    )}
                  </p>
                </div>
              </div>
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
                  <p className="text-xs text-zinc-300 leading-relaxed">{dailyOneLineSummary}</p>
                </div>
              )}

              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2 bg-gradient-to-br from-indigo-900/40 to-cyan-900/20 p-4 rounded-2xl border border-indigo-500/30 flex flex-col items-center justify-center text-center shadow-lg">
                  <span className="text-xs font-bold text-indigo-300 mb-1">오늘의 총점</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">{dailyIndices.score}</span>
                    <span className="text-sm text-zinc-400">점</span>
                  </div>
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

              {/* Engine self-diagnostic */}
              {dailyEngineSignal && (
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase">
                      엔진 자기 진단
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-indigo-500/10">
                      <div className="text-[10px] text-zinc-500 mb-1">신뢰도 (Confidence)</div>
                      <div className="text-2xl font-black text-indigo-300">
                        {dailyEngineSignal.confidence != null
                          ? `${dailyEngineSignal.confidence}%`
                          : '—'}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        엔진이 이 예측에 부여한 자체 신뢰도
                      </p>
                    </div>
                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-cyan-500/10">
                      <div className="text-[10px] text-zinc-500 mb-1">사주↔점성 합치</div>
                      <div className="text-2xl font-black text-cyan-300">
                        {dailyEngineSignal.sync != null ? `${dailyEngineSignal.sync}%` : '—'}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        두 시스템이 같은 방향을 가리키는 정도
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Active 신살 chips */}
              {dailyShinsal.length > 0 && (
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                  <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 발동 중인 신살
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {dailyShinsal.map((s, i) => {
                      const tone =
                        s.type === 'lucky'
                          ? 'border-emerald-500/30 text-emerald-300 bg-emerald-900/20'
                          : s.type === 'unlucky'
                            ? 'border-rose-500/30 text-rose-300 bg-rose-900/20'
                            : 'border-amber-500/30 text-amber-300 bg-amber-900/20'
                      return (
                        <span
                          key={`${s.name}-${i}`}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${tone}`}
                          title={`${s.affectedArea ?? ''} 영역`}
                        >
                          {s.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-cyan-400" /> 좋은 시간 · 주의 시간
                </h3>
                {dailyHourlySlots ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 mb-2 tracking-wider">
                        ↑ BEST
                      </div>
                      <ul className="space-y-1.5">
                        {dailyHourlySlots.best.length > 0 ? (
                          dailyHourlySlots.best.slice(0, 4).map((s, i) => (
                            <li
                              key={`best-${i}`}
                              className="bg-emerald-900/10 border border-emerald-500/15 px-2.5 py-1.5 rounded-md"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-bold text-emerald-200">
                                  {formatHour(s.hour)}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-400">
                                  {Math.round(s.score)}점
                                </span>
                              </div>
                              {s.reason && (
                                <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                                  {s.reason}
                                </p>
                              )}
                            </li>
                          ))
                        ) : (
                          <li className="text-[11px] text-zinc-500">신호 없음</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-rose-400 mb-2 tracking-wider">
                        ↓ WORST
                      </div>
                      <ul className="space-y-1.5">
                        {dailyHourlySlots.worst.length > 0 ? (
                          dailyHourlySlots.worst.slice(0, 2).map((s, i) => (
                            <li
                              key={`worst-${i}`}
                              className="bg-rose-900/10 border border-rose-500/15 px-2.5 py-1.5 rounded-md"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-bold text-rose-200">
                                  {formatHour(s.hour)}
                                </span>
                                <span className="text-[10px] font-bold text-rose-400">
                                  {Math.round(s.score)}점
                                </span>
                              </div>
                              {s.reason && (
                                <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                                  {s.reason}
                                </p>
                              )}
                            </li>
                          ))
                        ) : (
                          <li className="text-[11px] text-zinc-500">신호 없음</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    이 날의 시간대별 정밀 분석은{' '}
                    <span className="text-zinc-400 font-medium">달력에서 날짜를 탭</span>하면
                    상세보기에 표시됩니다.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </motion.div>
          )}

          {/* 3. STATS VIEW */}
          {viewMode === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-6"
            >
              {/* 분석 대상자 프로필 */}
              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-zinc-950 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <Cpu className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      분석 대상자 프로필
                    </h2>
                    <p className="text-sm text-zinc-400 flex flex-wrap items-center gap-2 mt-1">
                      {!data && (
                        <span className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700 rounded text-[11px] text-indigo-300">
                          ASC 물병자리
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700 rounded text-[11px] text-amber-300">
                        {natalDayPillar ?? '辛未(신미)'} 일주
                      </span>
                      {natalContextSummary?.strength && (
                        <span className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700 rounded text-[11px] text-zinc-300">
                          {natalContextSummary.strength}
                        </span>
                      )}
                      {natalContextSummary?.geokguk && (
                        <span className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700 rounded text-[11px] text-zinc-300">
                          {natalContextSummary.geokguk}
                        </span>
                      )}
                      {natalContextSummary?.yongsin?.primary && (
                        <span className="px-2 py-0.5 bg-amber-900/30 border border-amber-500/30 rounded text-[11px] text-amber-200">
                          용신 {natalContextSummary.yongsin.primary}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {natalContextSummary?.summary && (
                  <p className="text-[11px] text-zinc-500 mt-3 pt-3 border-t border-white/5 leading-relaxed">
                    {natalContextSummary.summary}
                  </p>
                )}
              </div>

              {/* 용신 활성 top 5 (향후 60일) */}
              {yongsinTop && yongsinTop.top.length > 0 && (
                <div className="bg-gradient-to-br from-amber-900/15 to-zinc-900/40 border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                    <Sparkles className="w-16 h-16 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-200">
                      용신 {yongsinTop.yongsin} 활성 — 향후 60일 슈퍼 데이 top {yongsinTop.top.length}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-4 relative z-10 leading-relaxed">
                    본명 용신({yongsinTop.yongsin})이 가장 강하게 받쳐주는 날 — 큰 결정·계약·시작에 추천.
                  </p>
                  <div className="space-y-2 relative z-10">
                    {yongsinTop.top.map((d, i) => (
                      <div
                        key={d.date}
                        className="flex items-start gap-3 bg-zinc-950/70 p-3 rounded-xl border border-amber-500/10"
                      >
                        <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r border-amber-500/10 pr-2">
                          <span className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">
                            #{i + 1}
                          </span>
                          <span className="text-xl font-black text-amber-300 leading-none mt-0.5">
                            {Math.round(d.score)}
                          </span>
                          <span className="text-[9px] text-zinc-500 mt-0.5">{d.level}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white mb-1">
                            {formatDateKo(d.date)}{' '}
                            <span className="text-zinc-500 text-[10px] font-normal">
                              ({d.date})
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{d.advice}</p>
                          {d.sources && d.sources.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {d.sources.slice(0, 4).map((src, si) => (
                                <span
                                  key={si}
                                  className="px-1.5 py-0.5 text-[9px] bg-zinc-900 border border-zinc-700 rounded text-zinc-400"
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 운세 영역별 동기화 분석 */}
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> 운세 영역별 동기화 분석
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-500 mb-4">
                  사주와 점성술이 가리키는 삶의 영역별 일치도를 분석합니다.
                </p>

                <div className="flex flex-col gap-5">
                  <div className="h-56 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="#3f3f46" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#d4d4d8', fontSize: 11, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="사주 예측"
                          dataKey="saju"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="#6366f1"
                          fillOpacity={0.35}
                        />
                        <Radar
                          name="점성술 예측"
                          dataKey="astro"
                          stroke="#22d3ee"
                          strokeWidth={2}
                          fill="#22d3ee"
                          fillOpacity={0.35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-900/20 border border-indigo-500/30 p-3.5 rounded-xl">
                      <span className="text-[10px] text-indigo-400 font-bold mb-1.5 block tracking-wider">
                        최대 시너지 영역
                      </span>
                      <div className="text-sm font-black text-white mb-1.5 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />{' '}
                        {data && domainExtremes ? domainExtremes.synergy.subject : '재물 & 직업'}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {data && domainExtremes ? (
                          <>
                            사주 평균{' '}
                            <strong className="text-indigo-300 font-medium">
                              {domainExtremes.synergy.saju}점
                            </strong>{' '}
                            + 점성{' '}
                            <strong className="text-cyan-300 font-medium">
                              {domainExtremes.synergy.astro}점
                            </strong>
                            로 두 엔진이 모두 강하게 받쳐주는 영역입니다.
                          </>
                        ) : (
                          <>
                            사주의{' '}
                            <strong className="text-indigo-300 font-medium">정재(正財)</strong>{' '}
                            기운과 점성술의{' '}
                            <strong className="text-cyan-300 font-medium">2하우스(소유)</strong>{' '}
                            확장이 완벽히 일치하여 강한 성과를 냅니다.
                          </>
                        )}
                      </p>
                    </div>
                    <div className="bg-rose-900/20 border border-rose-500/30 p-3.5 rounded-xl">
                      <span className="text-[10px] text-rose-400 font-bold mb-1.5 block tracking-wider">
                        주의 및 상충 영역
                      </span>
                      <div className="text-sm font-black text-white mb-1.5 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />{' '}
                        {data && domainExtremes ? domainExtremes.conflict.subject : '연애 & 대인관계'}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {data && domainExtremes ? (
                          <>
                            사주{' '}
                            <strong className="text-rose-300 font-medium">
                              {domainExtremes.conflict.saju}점
                            </strong>{' '}
                            / 점성{' '}
                            <strong className="text-rose-300 font-medium">
                              {domainExtremes.conflict.astro}점
                            </strong>
                            으로 두 엔진 모두 약한 신호를 보내는 구간입니다.
                          </>
                        ) : (
                          <>
                            사주의{' '}
                            <strong className="text-rose-300 font-medium">원진살</strong>과 금성(Venus)의{' '}
                            <strong className="text-rose-300 font-medium">흉각</strong>이 겹치는 시기로,
                            오해나 갈등이 발생하기 쉽습니다.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 주차별 크로스 타이밍 */}
              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" /> 주차별 크로스 타이밍
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      두 학문이 공통으로 가리키는 '슈퍼 타이밍'을 찾습니다.
                    </p>
                  </div>
                </div>

                <div className="h-48 w-full -ml-4 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="week" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={
                          ((value: number, name: string) => [
                            `${value}점`,
                            name === 'saju' ? '사주 흐름' : '점성술 흐름',
                          ]) as never
                        }
                      />
                      {superTiming && (
                        <ReferenceArea
                          x1={`${Math.max(1, parseInt(superTiming.week, 10) - 1)}주차`}
                          x2={`${Math.min(5, parseInt(superTiming.week, 10) + 1)}주차`}
                          fill="#6366f1"
                          fillOpacity={0.1}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="saju"
                        name="saju"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#6366f1' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="astro"
                        name="astro"
                        stroke="#22d3ee"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#22d3ee' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-center gap-6 mt-4 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" />
                    <span className="text-xs text-zinc-400 font-medium">사주 (동양)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
                    <span className="text-xs text-zinc-400 font-medium">점성술 (서양)</span>
                  </div>
                </div>
              </div>

              {/* 슈퍼 타이밍 카드 */}
              <div className="bg-zinc-900/60 border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <TrendingUp className="w-16 h-16 text-indigo-400" />
                </div>
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-3 relative z-10">
                  <Sparkles className="w-4 h-4 text-amber-300" /> 엔진이 발견한 이번 달의 슈퍼 타이밍
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed relative z-10">
                  이번 달은{' '}
                  <span className="text-white font-bold bg-indigo-500/30 px-1.5 py-0.5 rounded text-xs mx-1">
                    {superTiming
                      ? `${superTiming.week}(${superTiming.dayStart}일~${superTiming.dayEnd}일)`
                      : '3주차(15일~21일)'}
                  </span>
                  에 두 엔진의 예측이 가장 강하게 교차합니다.
                </p>
                <div className="mt-4 space-y-3 relative z-10">
                  <div className="flex items-start gap-3 bg-zinc-950/80 p-3 rounded-xl border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      <strong className="text-indigo-300 font-medium">사주 엔진:</strong>{' '}
                      {superTimingReasons.saju}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 bg-zinc-950/80 p-3 rounded-xl border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      <strong className="text-cyan-300 font-medium">점성술 엔진:</strong>{' '}
                      {superTimingReasons.astro}
                    </p>
                  </div>
                </div>
                <div className="mt-4 relative z-10 bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/10 text-center">
                  <p className="text-xs text-emerald-400/90 font-medium leading-relaxed">
                    💡 동서양의 운세가 공통으로 긍정적인 신호를 보내는 이 시기에
                    <br />
                    중요한 계약이나 계획을 실행하는 것을 강력히 추천합니다.
                  </p>
                </div>
              </div>
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
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      일정 선택
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCalendarModalOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-center text-zinc-400 text-sm">
                    {birthInfo?.birthDate ? (
                      <>
                        <p className="mb-2">기준 생년월일: {birthInfo.birthDate}</p>
                        <p>외부 캘린더 연동, 연/월 이동은 추후 추가 예정.</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2">구글 캘린더 등 외부 캘린더 연동이나</p>
                        <p>연/월 단위 이동 기능을 추가할 수 있습니다.</p>
                      </>
                    )}
                    <button
                      onClick={() => setIsCalendarModalOpen(false)}
                      className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors"
                    >
                      확인
                    </button>
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
